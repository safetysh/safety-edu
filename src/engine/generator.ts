import {
  AccidentCase,
  GeneratedMaterial,
  HazardType,
  IndustryType,
  LAYOUT_LABELS,
  LayoutStyleId,
  OXComparisonPair,
  PERSPECTIVE_LABELS,
  PerspectiveMode,
  SAFETY_THEMES,
  SafetyThemeConfig,
  SafetyThemeId,
  SifMetadata,
  SourceFilterTab,
  SourceType,
  TimelineStep,
  VariationOption,
} from '../types/safety';
import { isStandardModelCase } from '../utils/textFit';

export interface GenerationHistoryState {
  version: number;
  lastMode?: PerspectiveMode;
  lastThemeId?: SafetyThemeId;
  lastLayoutId?: LayoutStyleId;
  lastPrimaryCaseId?: string;
  lastPrimaryTitle?: string;
  lastRelatedCaseId?: string;
  recentPrimaryIds?: string[];
  recentPrimaryTitles?: string[];
  recentRelatedIds?: string[];
}

const MECHANISM_GROUPS: Array<{ name: string; keywords: string[] }> = [
  {
    name: '고소·추락 메커니즘',
    keywords: ['비계', '사다리', '고소', '지붕', '철골', '조명', '고소작업대', '추락', '떨어짐'],
  },
  {
    name: '회전체·압축 끼임 메커니즘',
    keywords: ['컨베이어', '회전체', '프레스', '절곡', '전단', '파쇄', '압축기', '끼임', '협착', '절단', '조리'],
  },
  {
    name: '차량·양중 충돌·맞음 메커니즘',
    keywords: [
      '지게차',
      '물류',
      '상하차',
      '하역',
      '도크',
      '배달',
      '이륜차',
      '운행',
      '부딪힘',
      '충돌',
      '타워크레인',
      '양중',
      '맞음',
      '낙하',
      '깔림',
      '뒤집힘',
    ],
  },
  {
    name: '밀폐·유해가스 질식·감전·화재 메커니즘',
    keywords: ['밀폐', '양생', '화학', '탱크', '질식', '중독', '감전', '화재', '폭발', '화상'],
  },
  {
    name: '굴착·지반 붕괴 메커니즘',
    keywords: ['굴착', '가시설', '토목', '붕괴', '무너짐', '매몰', '양중', '크레인'],
  },
];

const ALL_MODES: PerspectiveMode[] = [
  'reconstruction',
  'ox_compare',
  'kyt_quiz',
  'tbm_practice',
];

const ALL_LAYOUTS: LayoutStyleId[] = [
  'poster_grid',
  'timeline_focus',
  'tbm_briefing',
];

const ALL_THEMES: SafetyThemeId[] = [
  'safety_orange',
  'hazard_amber',
  'impact_crimson',
  'confined_blue',
];

export function getNativeThemeForHazard(hazard: HazardType, sourceType?: SourceType): SafetyThemeId {
  if (sourceType === 'FATALITY') {
    return 'impact_crimson';
  }
  if (sourceType === 'SIF') {
    return 'hazard_amber';
  }
  const h = (hazard || '').trim();
  if (/질식|중독|감전|누전|산소|화학/.test(h)) {
    return 'confined_blue';
  }
  if (/끼임|협착|말림|깔림|뒤집힘|전도/.test(h)) {
    return 'hazard_amber';
  }
  if (/부딪힘|충돌|맞음|낙하|비래|붕괴|무너짐|매몰/.test(h)) {
    return 'impact_crimson';
  }
  if (/떨어짐|추락|화재|폭발|화상/.test(h)) {
    return 'safety_orange';
  }
  return 'safety_orange';
}

const caseMaskCache = new WeakMap<AccidentCase, number>();
const caseCrossMaskCache = new WeakMap<AccidentCase, number>();

function getMechanismMask(text: string): number {
  let mask = 0;
  for (let i = 0; i < MECHANISM_GROUPS.length; i++) {
    const kws = MECHANISM_GROUPS[i].keywords;
    for (let j = 0; j < kws.length; j++) {
      if (text.includes(kws[j])) {
        mask |= 1 << i;
        break;
      }
    }
  }
  return mask;
}

function getCaseFullMask(c: AccidentCase): number {
  let mask = caseMaskCache.get(c);
  if (mask === undefined) {
    mask = getMechanismMask(
      `${c.work_type} ${c.equipment} ${c.hazard_type} ${c.related_work_types.join(' ')}`
    );
    caseMaskCache.set(c, mask);
  }
  return mask;
}

function getCaseWorkHazardMask(c: AccidentCase): number {
  let mask = caseCrossMaskCache.get(c);
  if (mask === undefined) {
    mask = getMechanismMask(`${c.work_type} ${c.hazard_type}`);
    caseCrossMaskCache.set(c, mask);
  }
  return mask;
}

function countBits5(mask: number): number {
  let n = mask;
  let c = 0;
  while (n) {
    c += n & 1;
    n >>= 1;
  }
  return c;
}

function firstGroupNameFromMask(mask: number): string {
  for (let i = 0; i < MECHANISM_GROUPS.length; i++) {
    if (mask & (1 << i)) return MECHANISM_GROUPS[i].name;
  }
  return '핵심 재해 메커니즘 유사 공정';
}

function tokenizeKorean(text: string): string[] {
  return text
    .replace(/[·/(),\-]/g, ' ')
    .split(/\s+/)
    .map((t) => t.trim())
    .filter((t) => t.length >= 2);
}

interface ScoredCase {
  item: AccidentCase;
  score: number;
  isExact: boolean;
  reason: string;
}

function scoreCaseMatchFast(
  candidate: AccidentCase,
  industry: IndustryType,
  workType: string,
  targetMask: number,
  targetTokens: string[]
): ScoredCase {
  if (candidate.work_type === workType) {
    return {
      item: candidate,
      score: candidate.industry === industry ? 120 : 100,
      isExact: true,
      reason: '선택 작업유형 정확 일치',
    };
  }

  let score = 0;
  let reason = '';

  if (candidate.related_work_types.includes(workType)) {
    score += 72;
    reason = '유사공정 교차매핑 등록';
  }

  const sharedMask = targetMask & getCaseFullMask(candidate);
  if (sharedMask !== 0) {
    score += countBits5(sharedMask) * 28;
    const gName = firstGroupNameFromMask(sharedMask);
    reason = reason ? `${reason} · ${gName}` : gName;
  }

  if (targetTokens.length > 0) {
    const hay = `${candidate.work_type} ${candidate.equipment} ${candidate.hazard_type}`;
    let tokenHits = 0;
    for (let i = 0; i < targetTokens.length; i++) {
      if (hay.includes(targetTokens[i])) tokenHits++;
    }
    if (tokenHits > 0) {
      score += tokenHits * 10;
    }
  }

  if (candidate.industry === industry) {
    score += 8;
  }

  return {
    item: candidate,
    score,
    isExact: false,
    reason: reason || '핵심 재해 메커니즘 유사 공정',
  };
}

export function scoreCaseMatch(
  candidate: AccidentCase,
  industry: IndustryType,
  workType: string
): ScoredCase {
  return scoreCaseMatchFast(
    candidate,
    industry,
    workType,
    getMechanismMask(workType),
    tokenizeKorean(workType)
  );
}

function compareNewestFirst(a: AccidentCase, b: AccidentCase): number {
  const ad = a.occurred_date || '';
  const bd = b.occurred_date || '';
  if (bd !== ad) return bd > ad ? 1 : -1;
  const at = a.sort_ts || '';
  const bt = b.sort_ts || '';
  if (bt !== at) return bt > at ? 1 : -1;
  return 0;
}

interface CachedPrimaryPools {
  exactPool: ScoredCase[];
  similarPool: ScoredCase[];
  sameIndustryFallback: ScoredCase[];
}

interface AllCasesIndex {
  byId: Map<string, AccidentCase>;
  apiByIndustrySource: Map<string, AccidentCase[]>;
  apiBySource: Record<SourceFilterTab, AccidentCase[]>;
  fallbackByIndustry: Record<IndustryType, AccidentCase[]>;
  otherIndustryApi: Record<IndustryType, AccidentCase[]>;
  otherIndustryFallback: Record<IndustryType, AccidentCase[]>;
  primaryPools: Map<string, CachedPrimaryPools>;
  crossPools: Map<string, AccidentCase[]>;
}

const allCasesIndexCache = new WeakMap<AccidentCase[], AllCasesIndex>();

function getOrCreateCasesIndex(allCases: AccidentCase[]): AllCasesIndex {
  let idx = allCasesIndexCache.get(allCases);
  if (!idx) {
    const byId = new Map<string, AccidentCase>();
    const apiByIndustrySource = new Map<string, AccidentCase[]>();
    const apiBySource: Record<SourceFilterTab, AccidentCase[]> = {
      ALL: [],
      FATALITY: [],
      SIF: [],
    };
    const fallbackByIndustry: Record<IndustryType, AccidentCase[]> = {
      건설현장: [],
      제조업: [],
      서비스업: [],
    };
    const apiByIndustry: Record<IndustryType, AccidentCase[]> = {
      건설현장: [],
      제조업: [],
      서비스업: [],
    };

    const pushMap = (key: string, c: AccidentCase) => {
      let arr = apiByIndustrySource.get(key);
      if (!arr) {
        arr = [];
        apiByIndustrySource.set(key, arr);
      }
      arr.push(c);
    };

    for (let i = 0; i < allCases.length; i++) {
      const c = allCases[i];
      byId.set(c.id, c);
      const isStd = isStandardModelCase(c);
      if (isStd) {
        fallbackByIndustry[c.industry].push(c);
      } else {
        apiByIndustry[c.industry].push(c);
        apiBySource.ALL.push(c);
        pushMap(`${c.industry}|ALL`, c);
        const st = c.source_type || 'CASE';
        if (st === 'FATALITY') {
          apiBySource.FATALITY.push(c);
          pushMap(`${c.industry}|FATALITY`, c);
        } else if (st === 'SIF') {
          apiBySource.SIF.push(c);
          pushMap(`${c.industry}|SIF`, c);
        }
      }
    }

    const otherIndustryApi: Record<IndustryType, AccidentCase[]> = {
      건설현장: [...apiByIndustry['제조업'], ...apiByIndustry['서비스업']],
      제조업: [...apiByIndustry['건설현장'], ...apiByIndustry['서비스업']],
      서비스업: [...apiByIndustry['건설현장'], ...apiByIndustry['제조업']],
    };
    const otherIndustryFallback: Record<IndustryType, AccidentCase[]> = {
      건설현장: [...fallbackByIndustry['제조업'], ...fallbackByIndustry['서비스업']],
      제조업: [...fallbackByIndustry['건설현장'], ...fallbackByIndustry['서비스업']],
      서비스업: [...fallbackByIndustry['건설현장'], ...fallbackByIndustry['제조업']],
    };

    idx = {
      byId,
      apiByIndustrySource,
      apiBySource,
      fallbackByIndustry,
      otherIndustryApi,
      otherIndustryFallback,
      primaryPools: new Map(),
      crossPools: new Map(),
    };
    allCasesIndexCache.set(allCases, idx);
  }
  return idx;
}

function getCachedPrimaryPools(
  allCases: AccidentCase[],
  index: AllCasesIndex,
  industry: IndustryType,
  workType: string,
  sourceFilter: SourceFilterTab
): CachedPrimaryPools {
  const cacheKey = `${industry}|${workType}|${sourceFilter}`;
  const hit = index.primaryPools.get(cacheKey);
  if (hit) return hit;

  // Fast O(bucket) lookup instead of scanning all 7,555 cases across every industry
  const sameIndApi = index.apiByIndustrySource.get(`${industry}|${sourceFilter}`) ?? [];
  const exactSameIndApi: ScoredCase[] = [];
  for (let i = 0; i < sameIndApi.length; i++) {
    const c = sameIndApi[i];
    if (c.work_type === workType) {
      exactSameIndApi.push({
        item: c,
        score: 120,
        isExact: true,
        reason: '선택 작업유형 정확 일치',
      });
    }
  }

  let exactPool: ScoredCase[] = exactSameIndApi;

  // Only check other-industry API cases or built-in fallback models when same-industry exact matches are empty
  if (exactPool.length === 0) {
    const allApiForSource = index.apiBySource[sourceFilter];
    const exactOtherIndApi: ScoredCase[] = [];
    for (let i = 0; i < allApiForSource.length; i++) {
      const c = allApiForSource[i];
      if (c.industry !== industry && c.work_type === workType) {
        exactOtherIndApi.push({
          item: c,
          score: 100,
          isExact: true,
          reason: '선택 작업유형 정확 일치',
        });
      }
    }
    if (exactOtherIndApi.length > 0) {
      exactPool = exactOtherIndApi;
    } else if (sameIndApi.length === 0 && allApiForSource.length === 0) {
      // Strictly fallback to built-in standard models only when 0 API cases exist for this filter
      const sameIndFb = index.fallbackByIndustry[industry];
      const exactSameFb: ScoredCase[] = [];
      for (let i = 0; i < sameIndFb.length; i++) {
        const c = sameIndFb[i];
        if (c.work_type === workType) {
          exactSameFb.push({
            item: c,
            score: 120,
            isExact: true,
            reason: '선택 작업유형 정확 일치',
          });
        }
      }
      exactPool = exactSameFb;
    }
  }

  if (exactPool.length > 1) {
    exactPool.sort((a, b) => compareNewestFirst(a.item, b.item));
  }

  const sameIndustryList =
    sameIndApi.length > 0 ? sameIndApi : index.fallbackByIndustry[industry];

  let similarPool: ScoredCase[] = [];
  let sameIndustryFallback: ScoredCase[] = [];

  // Only perform similarity scoring when exactPool has < 2 entries, scoped to same-industry bucket first
  if (exactPool.length < 2) {
    const targetMask = getMechanismMask(workType);
    const targetTokens = tokenizeKorean(workType);

    const scoringInput =
      sameIndApi.length > 0
        ? sameIndApi
        : index.apiBySource[sourceFilter].length > 0
          ? index.apiBySource[sourceFilter]
          : index.fallbackByIndustry[industry].length > 0
            ? index.fallbackByIndustry[industry]
            : allCases;

    const scoredAll = new Array<ScoredCase>(scoringInput.length);
    for (let i = 0; i < scoringInput.length; i++) {
      scoredAll[i] = scoreCaseMatchFast(
        scoringInput[i],
        industry,
        workType,
        targetMask,
        targetTokens
      );
    }
    scoredAll.sort((a, b) => {
      if (b.score !== a.score) return b.score - a.score;
      return compareNewestFirst(a.item, b.item);
    });

    const bestScore = scoredAll[0]?.score ?? 0;
    const minScore = Math.max(bestScore - 20, 10);
    similarPool = scoredAll.filter((s) => s.score >= minScore);
    if (sourceFilter === 'FATALITY' && similarPool.length > 1) {
      similarPool.sort((a, b) => compareNewestFirst(a.item, b.item));
    }
    sameIndustryFallback = scoredAll.filter((s) => s.item.industry === industry);
  } else {
    // Lightweight fallback list only used if exactPool ever collapses on regenerate
    const cap = Math.min(sameIndustryList.length, 60);
    sameIndustryFallback = new Array<ScoredCase>(cap);
    for (let i = 0; i < cap; i++) {
      const c = sameIndustryList[i];
      const isExact = c.work_type === workType;
      sameIndustryFallback[i] = {
        item: c,
        score: isExact ? 120 : 40,
        isExact,
        reason: isExact ? '선택 작업유형 정확 일치' : '동일 업종 유사 위험 사례',
      };
    }
  }

  const entry: CachedPrimaryPools = {
    exactPool,
    similarPool,
    sameIndustryFallback,
  };
  index.primaryPools.set(cacheKey, entry);
  return entry;
}

function findCrossProcessCase(
  allCases: AccidentCase[],
  index: AllCasesIndex,
  primary: AccidentCase,
  seed: number,
  recentRelatedIds: string[] = []
): AccidentCase | null {
  if (allCases.length <= 1) return null;

  const crossKey = `${primary.industry}|${primary.work_type}|${primary.hazard_type}`;
  let topPool = index.crossPools.get(crossKey);

  if (!topPool) {
    const pMask = getCaseWorkHazardMask(primary);
    const pRelated = primary.related_work_types;

    // Prioritize real KOSHA API cases from OTHER industries; fallback to built-in cross-industry templates only before other shards load
    const otherApi = index.otherIndustryApi[primary.industry];
    const searchPool =
      otherApi.length > 0
        ? otherApi
        : index.otherIndustryFallback[primary.industry].length > 0
          ? index.otherIndustryFallback[primary.industry]
          : allCases;

    let topScore = -1;
    const scores = new Int16Array(searchPool.length);

    for (let i = 0; i < searchPool.length; i++) {
      const c = searchPool[i];
      let score = 45; // Already guaranteed cross-industry when using otherApi/otherFallback
      if (c.industry === primary.industry) score = 0;
      if (c.hazard_type === primary.hazard_type) score += 40;
      if (
        pRelated.includes(c.work_type) ||
        c.related_work_types.includes(primary.work_type)
      ) {
        score += 35;
      }
      const overlap = countBits5(pMask & getCaseWorkHazardMask(c));
      if (overlap > 0) score += overlap * 18;
      scores[i] = score;
      if (score > topScore) topScore = score;
    }

    const threshold = Math.max(topScore - 18, 25);
    const collected: AccidentCase[] = [];
    for (let i = 0; i < searchPool.length; i++) {
      if (scores[i] >= threshold) {
        collected.push(searchPool[i]);
      }
    }

    topPool = collected.length > 0 ? collected : searchPool.slice(0, 30);
    index.crossPools.set(crossKey, topPool);
  }

  const recentSet = recentRelatedIds.length > 0 ? new Set(recentRelatedIds) : null;

  const len = topPool.length;
  const startIdx = Math.abs(seed) % len;
  let fallback: AccidentCase | null = null;

  for (let offset = 0; offset < len; offset++) {
    const cand = topPool[(startIdx + offset) % len];
    if (cand.id === primary.id) continue;
    if (!fallback) fallback = cand;
    if (!recentSet || !recentSet.has(cand.id)) {
      return cand;
    }
  }

  return fallback;
}

function pickNextNonRepeating<T>(
  pool: T[],
  previous: T | undefined,
  seed: number
): T {
  const filtered =
    previous !== undefined && pool.length > 1
      ? pool.filter((item) => item !== previous)
      : pool;
  return filtered[Math.abs(seed) % filtered.length];
}

function pickCaseFromPool(
  pool: ScoredCase[],
  recentIds: string[],
  recentTitles: string[],
  lastId: string | undefined,
  lastTitle: string | undefined,
  isRegenerate: boolean,
  seed: number,
  regenNonce: number
): ScoredCase {
  if (pool.length <= 1) return pool[0];
  if (!isRegenerate) return pool[0];

  const len = pool.length;
  const entropy = regenNonce > 0 ? regenNonce : seed;
  const startIdx = Math.abs(seed * 73 + entropy * 131 + len * 17) % len;

  const recentIdSet = new Set(recentIds);
  const recentTitleSet = new Set(recentTitles.map((t) => t.trim()).filter(Boolean));
  const normLastTitle = (lastTitle || '').trim();

  // Fast single-pass priority probe starting from mixed index:
  // Priority 1: unseen ID + unseen title (instant return on first hit — usually 1~3 iterations!)
  // Priority 2: unseen ID + not last title
  // Priority 3: unseen ID
  // Priority 4: not last ID
  let fallbackP2: ScoredCase | null = null;
  let fallbackP3: ScoredCase | null = null;
  let fallbackP4: ScoredCase | null = null;

  for (let offset = 0; offset < len; offset++) {
    const cand = pool[(startIdx + offset) % len];
    const id = cand.item.id;
    if (id === lastId) continue;

    if (!fallbackP4) fallbackP4 = cand;

    if (!recentIdSet.has(id)) {
      if (!fallbackP3) fallbackP3 = cand;
      const t = cand.item.title.trim();
      if (t !== normLastTitle) {
        if (!fallbackP2) fallbackP2 = cand;
        if (!recentTitleSet.has(t)) {
          return cand;
        }
      }
    }
  }

  return fallbackP2 ?? fallbackP3 ?? fallbackP4 ?? pool[0];
}

export function generateEducationMaterial(params: {
  allCases: AccidentCase[];
  industry: IndustryType;
  workType: string;
  sourceFilter?: SourceFilterTab;
  pinnedCaseId?: string | null;
  variationOption: VariationOption;
  includeCrossProcess: boolean;
  history: GenerationHistoryState;
  isRegenerate: boolean;
  preservePrimaryCase?: boolean;
  regenNonce?: number;
}): { material: GeneratedMaterial; nextHistory: GenerationHistoryState } {
  const {
    allCases,
    industry,
    workType,
    sourceFilter = 'ALL',
    pinnedCaseId = null,
    variationOption,
    includeCrossProcess,
    history,
    isRegenerate,
    preservePrimaryCase = false,
    regenNonce = 0,
  } = params;

  const shouldPreserve = preservePrimaryCase && !isRegenerate;
  const nextVersion =
    shouldPreserve && history.version > 0 ? history.version : history.version + 1;
  const seedHash =
    nextVersion * 37 + workType.length * 13 + industry.length * 7 + (regenNonce % 997);

  const index = getOrCreateCasesIndex(allCases);
  const pools = getCachedPrimaryPools(allCases, index, industry, workType, sourceFilter);

  const recentPrimary =
    history.recentPrimaryIds ?? (history.lastPrimaryCaseId ? [history.lastPrimaryCaseId] : []);
  const recentPrimaryTitles =
    history.recentPrimaryTitles ?? (history.lastPrimaryTitle ? [history.lastPrimaryTitle] : []);
  const recentRelated =
    history.recentRelatedIds ?? (history.lastRelatedCaseId ? [history.lastRelatedCaseId] : []);

  const pinnedMatch =
    !isRegenerate && pinnedCaseId
      ? index.byId.get(pinnedCaseId)
      : undefined;

  const preservedItem =
    !pinnedMatch && shouldPreserve && history.lastPrimaryCaseId
      ? index.byId.get(history.lastPrimaryCaseId)
      : undefined;
  const preservedValidForSource =
    preservedItem &&
    (sourceFilter === 'ALL' || (preservedItem.source_type || 'CASE') === sourceFilter);

  const widenPoolIfSingleOnRegen = (initialPool: ScoredCase[]): ScoredCase[] => {
    if (!isRegenerate) return initialPool;
    if (initialPool.length > 1) return initialPool;
    if (initialPool.length === 1 && initialPool[0].item.id !== history.lastPrimaryCaseId) {
      return initialPool;
    }

    if (pools.sameIndustryFallback.some((s) => s.item.id !== history.lastPrimaryCaseId)) {
      return pools.sameIndustryFallback;
    }
    if (pools.similarPool.some((s) => s.item.id !== history.lastPrimaryCaseId)) {
      return pools.similarPool;
    }
    // Widen to same-source or allCases fallback
    const wide = allCases.slice(0, 60).map((c) => scoreCaseMatch(c, industry, workType));
    return wide.length > 0 ? wide : initialPool;
  };

  let chosen: ScoredCase;

  if (pinnedMatch) {
    const sc = scoreCaseMatch(pinnedMatch, industry, workType);
    chosen = {
      ...sc,
      isExact: sc.isExact || pinnedMatch.industry === industry,
      reason: '사용자 직접 검색·선택 고정 사례',
    };
  } else if (preservedValidForSource && preservedItem) {
    chosen = scoreCaseMatch(preservedItem, industry, workType);
  } else if (pools.exactPool.length > 0) {
    const primaryPool = widenPoolIfSingleOnRegen(pools.exactPool);
    chosen = pickCaseFromPool(
      primaryPool,
      recentPrimary,
      recentPrimaryTitles,
      history.lastPrimaryCaseId,
      history.lastPrimaryTitle,
      isRegenerate,
      seedHash,
      regenNonce
    );
  } else {
    const topSimilar = widenPoolIfSingleOnRegen(pools.similarPool);
    chosen = pickCaseFromPool(
      topSimilar,
      recentPrimary,
      recentPrimaryTitles,
      history.lastPrimaryCaseId,
      history.lastPrimaryTitle,
      isRegenerate,
      seedHash,
      regenNonce
    );
  }

  // 2. Perspective mode
  let perspectiveMode: PerspectiveMode;
  if (variationOption === 'auto') {
    perspectiveMode =
      shouldPreserve && history.lastMode
        ? history.lastMode
        : pickNextNonRepeating(ALL_MODES, history.lastMode, seedHash);
  } else {
    perspectiveMode = variationOption;
  }

  // 3. Header/Visual style
  const layoutStyle: LayoutStyleId =
    shouldPreserve && history.lastLayoutId
      ? history.lastLayoutId
      : pickNextNonRepeating(
          ALL_LAYOUTS,
          isRegenerate ? history.lastLayoutId : undefined,
          seedHash + 1
        );

  // 4. Safety color theme
  const nativeThemeId = getNativeThemeForHazard(chosen.item.hazard_type, chosen.item.source_type);
  let themeId: SafetyThemeId;
  if (shouldPreserve && history.lastThemeId) {
    themeId = history.lastThemeId;
  } else if (!isRegenerate) {
    themeId = nativeThemeId;
  } else {
    const orderedPool: SafetyThemeId[] = [
      nativeThemeId,
      ...ALL_THEMES.filter((t) => t !== nativeThemeId),
    ];
    themeId = pickNextNonRepeating(orderedPool, history.lastThemeId, nextVersion);
  }

  const theme: SafetyThemeConfig = SAFETY_THEMES[themeId];

  // 5. Cross-process related case
  let relatedCase: AccidentCase | null = null;
  if (includeCrossProcess) {
    const preservedRelatedCandidate =
      shouldPreserve && history.lastRelatedCaseId
        ? index.byId.get(history.lastRelatedCaseId)
        : undefined;
    const preservedRelated =
      preservedRelatedCandidate && preservedRelatedCandidate.id !== chosen.item.id
        ? preservedRelatedCandidate
        : null;
    relatedCase =
      preservedRelated ??
      findCrossProcessCase(
        allCases,
        index,
        chosen.item,
        seedHash + nextVersion * 11,
        isRegenerate ? recentRelated : []
      );
  }

  const nextRecentPrimary =
    recentPrimary[recentPrimary.length - 1] === chosen.item.id
      ? recentPrimary
      : [...recentPrimary.slice(-30), chosen.item.id];
  const nextRecentTitles =
    recentPrimaryTitles[recentPrimaryTitles.length - 1] === chosen.item.title
      ? recentPrimaryTitles
      : [...recentPrimaryTitles.slice(-30), chosen.item.title];
  const nextRecentRelated =
    relatedCase && recentRelated[recentRelated.length - 1] !== relatedCase.id
      ? [...recentRelated.slice(-24), relatedCase.id]
      : recentRelated;

  const material: GeneratedMaterial = {
    version: nextVersion,
    selectedIndustry: industry,
    selectedWorkType: workType,
    primaryCase: chosen.item,
    relatedCase,
    isExactMatch: chosen.isExact,
    matchScore: chosen.score,
    matchReason: chosen.reason,
    perspectiveMode,
    perspectiveLabel: PERSPECTIVE_LABELS[perspectiveMode],
    theme,
    layoutStyle,
    layoutLabel: LAYOUT_LABELS[layoutStyle],
    generatedAt: new Date().toISOString(),
    seedHash,
  };

  return {
    material,
    nextHistory: {
      version: nextVersion,
      lastMode: perspectiveMode,
      lastThemeId: themeId,
      lastLayoutId: layoutStyle,
      lastPrimaryCaseId: chosen.item.id,
      lastPrimaryTitle: chosen.item.title,
      lastRelatedCaseId: relatedCase?.id,
      recentPrimaryIds: nextRecentPrimary,
      recentPrimaryTitles: nextRecentTitles,
      recentRelatedIds: nextRecentRelated,
    },
  };
}

function pickStringArray(primaryVal: unknown, fallbackVal: unknown): string[] {
  if (Array.isArray(primaryVal) && primaryVal.length > 0) {
    const cleaned = primaryVal.map((v) => String(v ?? '').trim()).filter(Boolean);
    if (cleaned.length > 0) return cleaned;
  }
  if (Array.isArray(fallbackVal) && fallbackVal.length > 0) {
    return fallbackVal.map((v) => String(v ?? '').trim()).filter(Boolean);
  }
  return [];
}

function pickString(primaryVal: unknown, fallbackVal: unknown, defaultVal: string): string {
  if (typeof primaryVal === 'string' && primaryVal.trim()) return primaryVal.trim();
  if (typeof fallbackVal === 'string' && fallbackVal.trim()) return fallbackVal.trim();
  return defaultVal;
}

function normalizeOxPair(raw: unknown): OXComparisonPair {
  if (Array.isArray(raw)) {
    return {
      wrong: String(raw[0] ?? '편의 위주로 안전절차를 생략하고 작업한다.').trim(),
      right: String(raw[1] ?? '사전 안전점검과 방호조치 완료 후 작업을 시작한다.').trim(),
      note: String(raw[2] ?? '안전수칙 생략은 중대재해로 직결됩니다.').trim(),
    };
  }
  const obj = (raw && typeof raw === 'object' ? raw : {}) as Record<string, unknown>;
  return {
    wrong: String(
      obj.wrong ?? obj.x ?? obj.practice ?? '편의 위주로 안전절차를 생략하고 작업한다.'
    ).trim(),
    right: String(
      obj.right ?? obj.o ?? obj.principle ?? '사전 안전점검과 방호조치 완료 후 작업을 시작한다.'
    ).trim(),
    note: String(
      obj.note ?? obj.reason ?? '안전수칙 생략은 중대재해로 직결됩니다.'
    ).trim(),
  };
}

const CLAUSE_LOC_RE =
  /^(.+?소재\s+[^\s]+(?:\s+[^\s]+){0,3}(?:에서|내에서|현장에서|공장에서|창고에서|사업장에서|야적장에서|농장에서|적재장에서|공사장에서))[,]?\s*(.+)$/;
const CLAUSE_ACTION_RE =
  /^(.+?(?:작업\s*중|이동\s*중|운반\s*중|운전\s*중|과정에서|순간|하던\s*중|하다가|되어|되면서))[,]?\s*(.+)$/;

const DEFAULT_PREVENTIVE_MEASURES = [
  '작업 전 설비·방호장치 이상 유무 필수 점검 및 보완',
  '위험구역 출입 통제 및 2인 1조 안전작업 실시',
  '작업 특성에 맞는 개인보호구 올바른 착용 확인',
  '작업 중 이상 징후 발견 시 즉시 작업중지 및 보고',
];

const DEFAULT_TBM_CHECKLIST = [
  '작업 전 위험요인과 안전대책을 팀원 모두가 공유했는가?',
  '방호장치·안전설비·출입통제 조치가 완료되었는가?',
  '필수 개인보호구를 올바르게 착용했는가?',
  '비상정지장치 및 응급 대피 경로를 확인했는가?',
  '이상 발생 시 즉시 작업을 멈추고 보고할 체계가 확인되었는가?',
];

const DEFAULT_ROOT_CAUSES: [string, string] = [
  '작업 전 위험성평가 및 작업계획서 현장 이행 확인 미흡',
  '비정형·고위험 작업 관리감독 및 작업 전 TBM 교육 부족',
];

const DEFAULT_OX_PAIR: [OXComparisonPair, OXComparisonPair] = [
  normalizeOxPair(undefined),
  normalizeOxPair(undefined),
];

function splitVerbatimClausesFast(
  txt: string,
  title: string,
  workType: string
): [string, string, string] {
  if (!txt) {
    return [
      `${workType} 수행 중 위험요인 노출로 사고가 발생함.`,
      '사전 안전조치 및 방호설비 확인이 요구됨.',
      '동종 재해 예방을 위해 핵심 안전수칙 준수가 필수적임.',
    ];
  }
  if (txt.includes('소재')) {
    const m = CLAUSE_LOC_RE.exec(txt);
    if (m) {
      const p1 = m[1].trim();
      const rest = m[2].trim();
      const m2 = CLAUSE_ACTION_RE.exec(rest);
      if (m2 && m2[1].length >= 8 && m2[2].length >= 6) {
        return [p1, m2[1].trim(), m2[2].trim()];
      }
      return [p1, rest, `${title} 재해 발생`];
    }
  }
  return [txt, `사고유형: ${title}`, '작업 전 위험요인 점검 및 핵심 방호조치 필수'];
}

interface PreNormalizedTemplate {
  raw: Record<string, unknown>;
  preventive_measures: string[];
  tbm_checklist: string[];
  root_causes: [string, string];
  ox_comparison: [OXComparisonPair, OXComparisonPair];
  related_work_types: string[];
  worker_slogan: string;
  legal_ref: string;
}

/**
 * Hydrates `kosha-shard-v2`, `kosha-lite-v1`, AND standard JSON arrays into
 * normalized AccidentCase records while preserving 100% of factual KOSHA fields.
 */
export function parseCasesData(
  parsed: unknown,
  source: 'builtin' | 'custom' = 'custom'
): { cases: AccidentCase[]; error?: string; isLiteFormat: boolean } {
  const rootObj =
    parsed && typeof parsed === 'object' && !Array.isArray(parsed)
      ? (parsed as Record<string, unknown>)
      : null;

  const isV3Format = Boolean(rootObj && rootObj.format === 'kosha-shard-v3');
  const isLiteFormat = Boolean(
    rootObj &&
      (isV3Format ||
        rootObj.format === 'kosha-shard-v2' ||
        rootObj.format === 'kosha-lite-v1' ||
        (rootObj.templates && typeof rootObj.templates === 'object' && Array.isArray(rootObj.cases)))
  );

  const sDict: string[] =
    isV3Format && Array.isArray(rootObj?.s_dict) ? (rootObj.s_dict as string[]) : [];
  const mDict: string[] =
    isV3Format && Array.isArray(rootObj?.m_dict) ? (rootObj.m_dict as string[]) : [];
  const rootIndustryDefault =
    typeof rootObj?.industry === 'string' && rootObj.industry.trim()
      ? rootObj.industry.trim()
      : '건설현장';

  const lookupDictString = (val: unknown): string => {
    if (typeof val === 'number' && val >= 0 && val < sDict.length) {
      return sDict[val];
    }
    return typeof val === 'string' ? val.trim() : '';
  };

  const templatesMap: Record<string, Record<string, unknown>> =
    rootObj && rootObj.templates && typeof rootObj.templates === 'object'
      ? (rootObj.templates as Record<string, Record<string, unknown>>)
      : {};

  // Pre-normalize each shared template ONCE instead of per-record (4,000+ times)
  const normalizedTemplates: Record<string, PreNormalizedTemplate> = {};
  for (const [tid, rawTpl] of Object.entries(templatesMap)) {
    if (!rawTpl || typeof rawTpl !== 'object') continue;
    const prev = pickStringArray(rawTpl.preventive_measures, undefined);
    const tbm = pickStringArray(rawTpl.tbm_checklist, undefined);
    const root = pickStringArray(rawTpl.root_causes, undefined);
    const oxRaw = Array.isArray(rawTpl.ox_comparison) ? rawTpl.ox_comparison : [];
    normalizedTemplates[tid] = {
      raw: rawTpl,
      preventive_measures: prev.length > 0 ? prev : DEFAULT_PREVENTIVE_MEASURES,
      tbm_checklist: tbm.length > 0 ? tbm : DEFAULT_TBM_CHECKLIST,
      root_causes: [
        root[0] || DEFAULT_ROOT_CAUSES[0],
        root[1] || DEFAULT_ROOT_CAUSES[1],
      ],
      ox_comparison:
        oxRaw.length > 0
          ? [normalizeOxPair(oxRaw[0]), normalizeOxPair(oxRaw[1] ?? oxRaw[0])]
          : DEFAULT_OX_PAIR,
      related_work_types: pickStringArray(rawTpl.related_work_types, undefined),
      worker_slogan: pickString(
        rawTpl.worker_slogan,
        undefined,
        '안전조치 확인 전 작업 시작 금지! 원칙이 생명을 지킨다!'
      ),
      legal_ref: pickString(
        rawTpl.legal_ref,
        undefined,
        '산업안전보건기준에 관한 규칙 관련 조항 준수'
      ),
    };
  }

  const list: unknown[] = Array.isArray(parsed)
    ? parsed
    : Array.isArray(rootObj?.cases)
      ? (rootObj.cases as unknown[])
      : rootObj
        ? [rootObj]
        : [];

  if (!list.length) {
    return {
      cases: [],
      error: 'JSON 파일에 사고사례 데이터가 비어 있습니다.',
      isLiteFormat,
    };
  }

  const validIndustries = new Set<string>(['건설현장', '제조업', '서비스업']);
  const validSourceTypes = new Set<string>(['FATALITY', 'SIF', 'CASE']);
  const v3SourceMap: Record<string, SourceType> = {
    F: 'FATALITY',
    S: 'SIF',
    C: 'CASE',
  };
  const normalized: AccidentCase[] = [];

  for (let i = 0; i < list.length; i++) {
    const entry = list[i] as Record<string, unknown>;
    if (!entry || typeof entry !== 'object') continue;

    const tplKeyRaw = entry.t ?? entry.template ?? entry.template_key;
    const preTpl =
      tplKeyRaw !== undefined && tplKeyRaw !== null
        ? normalizedTemplates[String(tplKeyRaw)]
        : undefined;
    const tpl: Record<string, unknown> = preTpl ? preTpl.raw : {};

    const title = isV3Format
      ? pickString(entry.ti, entry.title, '')
      : pickString(entry.title, tpl.title, '');
    const workType = isV3Format
      ? lookupDictString(entry.w) || pickString(entry.work_type, tpl.work_type, '')
      : pickString(entry.work_type, tpl.work_type, '');
    if (!title || !workType) continue;

    const rawIndustry = isV3Format
      ? pickString(entry.industry, rootIndustryDefault, '건설현장')
      : pickString(entry.industry, tpl.industry, rootIndustryDefault);
    const industry: IndustryType = validIndustries.has(rawIndustry)
      ? (rawIndustry as IndustryType)
      : '건설현장';

    const rawSrcType = isV3Format
      ? (v3SourceMap[String(entry.st ?? '')] ?? pickString(entry.source_type, undefined, 'CASE'))
      : pickString(entry.source_type, tpl.source_type, 'CASE');
    const sourceType: SourceType = validSourceTypes.has(rawSrcType)
      ? (rawSrcType as SourceType)
      : 'CASE';

    const hazardType: HazardType = isV3Format
      ? lookupDictString(entry.h) || pickString(entry.hazard_type, tpl.hazard_type, '중대재해')
      : pickString(entry.hazard_type, tpl.hazard_type, '중대재해');

    const rawSummarySrc = isV3Format ? (entry.s3 ?? entry.summary_3lines) : entry.summary_3lines;
    const entrySummaryRaw = Array.isArray(rawSummarySrc)
      ? pickStringArray(rawSummarySrc, undefined)
      : [];
    const overviewVerbatim = pickString(
      isV3Format ? (entry.ov ?? entry.overview_raw) : entry.overview_raw,
      undefined,
      entrySummaryRaw.join(' ').trim()
    );

    const equipmentVal = isV3Format
      ? lookupDictString(entry.e) || pickString(entry.equipment, tpl.equipment, '현장 작업 설비 및 기구')
      : pickString(entry.equipment, tpl.equipment, '현장 작업 설비 및 기구');
    const processVal = isV3Format
      ? lookupDictString(entry.pr) || pickString(entry.process, undefined, '')
      : pickString(entry.process, undefined, '');
    const highRiskWorkVal = isV3Format
      ? lookupDictString(entry.hw) || pickString(entry.high_risk_work, undefined, '')
      : pickString(entry.high_risk_work, undefined, '');
    const hazardFactorVal = pickString(
      isV3Format ? (entry.hf ?? entry.hazard_factor) : entry.hazard_factor,
      undefined,
      ''
    );

    let summary_3lines: [string, string, string];
    if (entrySummaryRaw.length >= 3) {
      summary_3lines = [entrySummaryRaw[0], entrySummaryRaw[1], entrySummaryRaw[2]];
    } else if (sourceType === 'SIF' && overviewVerbatim) {
      summary_3lines = [
        overviewVerbatim,
        highRiskWorkVal || `기인물: ${equipmentVal}`,
        hazardFactorVal || `${hazardType} 사망·중대재해 위험`,
      ];
    } else {
      const fallback3 = splitVerbatimClausesFast(overviewVerbatim, title, workType);
      summary_3lines = [
        entrySummaryRaw[0] || fallback3[0],
        entrySummaryRaw[1] || fallback3[1],
        entrySummaryRaw[2] || fallback3[2],
      ];
    }

    const directRaw = Array.isArray(entry.direct_causes)
      ? pickStringArray(entry.direct_causes, undefined)
      : [];
    const root_causes: [string, string] = Array.isArray(entry.root_causes)
      ? (() => {
          const r = pickStringArray(entry.root_causes, undefined);
          return [r[0] || DEFAULT_ROOT_CAUSES[0], r[1] || DEFAULT_ROOT_CAUSES[1]];
        })()
      : preTpl
        ? preTpl.root_causes
        : DEFAULT_ROOT_CAUSES;

    let preventive_measures: string[];
    if (isV3Format && Array.isArray(entry.pm) && entry.pm.length > 0) {
      const decodedPm: string[] = [];
      for (let mIdx = 0; mIdx < entry.pm.length; mIdx++) {
        const ref = entry.pm[mIdx];
        const sentence =
          typeof ref === 'number' && ref >= 0 && ref < mDict.length
            ? mDict[ref]
            : String(ref ?? '').trim();
        if (sentence) decodedPm.push(sentence);
      }
      preventive_measures =
        decodedPm.length > 0
          ? decodedPm
          : preTpl
            ? preTpl.preventive_measures
            : DEFAULT_PREVENTIVE_MEASURES;
    } else if (Array.isArray(entry.preventive_measures)) {
      const p = pickStringArray(entry.preventive_measures, undefined);
      preventive_measures =
        p.length > 0 ? p : preTpl ? preTpl.preventive_measures : DEFAULT_PREVENTIVE_MEASURES;
    } else {
      preventive_measures = preTpl ? preTpl.preventive_measures : DEFAULT_PREVENTIVE_MEASURES;
    }

    const tbm_checklist: string[] = Array.isArray(entry.tbm_checklist)
      ? (() => {
          const t = pickStringArray(entry.tbm_checklist, undefined);
          return t.length > 0 ? t : preTpl ? preTpl.tbm_checklist : DEFAULT_TBM_CHECKLIST;
        })()
      : preTpl
        ? preTpl.tbm_checklist
        : DEFAULT_TBM_CHECKLIST;

    const direct_causes: [string, string, string] =
      directRaw.length >= 3
        ? [directRaw[0], directRaw[1], directRaw[2]]
        : sourceType === 'SIF'
          ? [
              directRaw[0] || hazardFactorVal || overviewVerbatim,
              directRaw[1] || (highRiskWorkVal ? `고위험작업·상황: ${highRiskWorkVal}` : `기인물: ${equipmentVal}`),
              directRaw[2] || (processVal ? `업종·공종 분류: ${processVal}` : `재해유형: ${hazardType}`),
            ]
          : sourceType === 'FATALITY'
            ? [
                directRaw[0] || `[속보 확인] ${title}`,
                directRaw[1] || `기인물(${equipmentVal}) 관련 ${hazardType} 위험 통제 필요`,
                directRaw[2] || '세부 발생원인은 공단·관계기관 조사 결과에 따름',
              ]
            : [
                directRaw[0] || `기인물(${equipmentVal}) 관련 ${hazardType} 방호조치 확인 필요`,
                directRaw[1] || '작업 전 위험요인 사전 점검 및 표준 안전작업절차 준수 필요',
                directRaw[2] || '위험구역 출입 통제 및 작업 특성별 개인보호구 착용 철저',
              ];

    const rawTimeline =
      Array.isArray(entry.timeline) && entry.timeline.length > 0
        ? entry.timeline
        : Array.isArray(tpl.timeline) && tpl.timeline.length > 0
          ? tpl.timeline
          : null;

    let timeline: [TimelineStep, TimelineStep, TimelineStep, TimelineStep];
    if (rawTimeline) {
      const defaultLabels = ['작업 상황', '위험 요인', '사고 발생', '골든타임 예방'];
      const makeStep = (idx: number): TimelineStep => {
        const raw = rawTimeline[idx];
        if (raw && typeof raw === 'object') {
          const obj = raw as Record<string, unknown>;
          return {
            step: String(obj.step || `${idx + 1}단계`).trim(),
            label: String(obj.label || defaultLabels[idx]).trim(),
            detail: String(
              obj.detail || (idx < 3 ? summary_3lines[idx] : preventive_measures[0])
            ).trim(),
          };
        }
        return {
          step: `${idx + 1}단계`,
          label: defaultLabels[idx],
          detail:
            typeof raw === 'string' && raw.trim()
              ? raw.trim()
              : idx < 3
                ? summary_3lines[idx]
                : preventive_measures[0],
        };
      };
      timeline = [makeStep(0), makeStep(1), makeStep(2), makeStep(3)];
    } else if (sourceType === 'SIF') {
      timeline = [
        { step: '1단계', label: '고위험 작업', detail: highRiskWorkVal || workType },
        { step: '2단계', label: '재해유발요인', detail: hazardFactorVal || summary_3lines[1] },
        { step: '3단계', label: '재해 결과', detail: `${hazardType} 사망·중대재해 위험` },
        { step: '4단계', label: '핵심 감소대책', detail: preventive_measures[0] },
      ];
    } else {
      timeline = [
        { step: '1단계', label: '작업 상황', detail: summary_3lines[0] },
        { step: '2단계', label: '위험 경위', detail: summary_3lines[1] },
        { step: '3단계', label: '재해 발생', detail: summary_3lines[2] },
        { step: '4단계', label: '골든타임 예방', detail: preventive_measures[0] },
      ];
    }

    const ox_comparison: [OXComparisonPair, OXComparisonPair] =
      Array.isArray(entry.ox_comparison) && entry.ox_comparison.length > 0
        ? [
            normalizeOxPair(entry.ox_comparison[0]),
            normalizeOxPair(entry.ox_comparison[1] ?? entry.ox_comparison[0]),
          ]
        : preTpl
          ? preTpl.ox_comparison
          : DEFAULT_OX_PAIR;

    const rawKyt =
      entry.kyt_quiz && typeof entry.kyt_quiz === 'object'
        ? (entry.kyt_quiz as Record<string, unknown>)
        : tpl.kyt_quiz && typeof tpl.kyt_quiz === 'object'
          ? (tpl.kyt_quiz as Record<string, unknown>)
          : null;

    const rawKytAns =
      rawKyt && Array.isArray(rawKyt.answers)
        ? rawKyt.answers.map((a) => String(a ?? '').trim()).filter(Boolean)
        : [];

    const kytQuestion =
      rawKyt && typeof rawKyt.question === 'string' && rawKyt.question.trim()
        ? rawKyt.question.trim()
        : `“${title}” 유사 작업 시작 전, 반드시 점검해야 할 핵심 안전조치 3가지는?`;

    const kyt_quiz = {
      question: kytQuestion,
      answers: [
        rawKytAns[0] || preventive_measures[0] || '작업 전 핵심 방호장치 확인',
        rawKytAns[1] || preventive_measures[1] || preventive_measures[0] || '위험구역 출입 통제',
        rawKytAns[2] || preventive_measures[2] || '필수 개인보호구 착용 점검',
      ] as [string, string, string],
    };

    const relatedWorkTypes = Array.isArray(entry.related_work_types)
      ? pickStringArray(entry.related_work_types, undefined)
      : preTpl
        ? preTpl.related_work_types
        : [];
    const idVal = String(entry.id || `KOSHA-${i + 1}`);
    const boardnoRaw = isV3Format ? (entry.bn ?? entry.boardno) : entry.boardno;
    const boardnoVal = typeof boardnoRaw === 'string' && boardnoRaw ? boardnoRaw : undefined;
    const atcflcntRaw = isV3Format ? (entry.af ?? entry.atcflcnt) : entry.atcflcnt;

    const defaultSourceRef =
      sourceType === 'SIF'
        ? '한국산업안전보건공단 사망사고 고위험요인(SIF) 아카이브'
        : sourceType === 'FATALITY'
          ? `한국산업안전보건공단 사고사망 속보 (${idVal.replace(/^FATAL-/, '')})`
          : boardnoVal
            ? `한국산업안전보건공단 국내재해사례 (${boardnoVal})`
            : '';

    const defaultDisclaimer =
      sourceType === 'FATALITY'
        ? '※ 위 내용은 신고 및 현재 파악된 내용으로 조사결과에 따라 변경될 수 있습니다.'
        : '';

    const regionVal = isV3Format
      ? lookupDictString(entry.rg) || pickString(entry.region, undefined, '')
      : pickString(entry.region, undefined, '');

    const imgRaw = isV3Format ? (entry.img ?? entry.source_image_url) : entry.source_image_url;

    normalized.push({
      id: idVal,
      source_type: sourceType,
      facts_locked: entry.facts_locked !== undefined ? Boolean(entry.facts_locked) : source === 'builtin',
      boardno: boardnoVal,
      atcflcnt: typeof atcflcntRaw === 'number' ? atcflcntRaw : undefined,
      occurred_date: pickString(isV3Format ? (entry.od ?? entry.occurred_date) : entry.occurred_date, undefined, ''),
      sort_ts: pickString(isV3Format ? (entry.ts ?? entry.sort_ts) : entry.sort_ts, undefined, ''),
      region: regionVal,
      industry,
      process: processVal,
      work_type: workType,
      equipment: equipmentVal,
      hazard_type: hazardType,
      season_tag: pickString(isV3Format ? (entry.sn ?? entry.season_tag) : entry.season_tag, undefined, '상시'),
      severity: pickString(isV3Format ? (entry.sv ?? entry.severity) : entry.severity, undefined, isV3Format ? '사망' : '중대재해'),
      title,
      overview_raw: overviewVerbatim || undefined,
      high_risk_work: highRiskWorkVal || undefined,
      hazard_factor: hazardFactorVal || undefined,
      sif_meta:
        entry.sif_meta && typeof entry.sif_meta === 'object'
          ? (entry.sif_meta as SifMetadata)
          : undefined,
      summary_3lines,
      timeline,
      direct_causes,
      root_causes,
      preventive_measures,
      tbm_checklist,
      ox_comparison,
      kyt_quiz,
      worker_slogan:
        typeof entry.worker_slogan === 'string' && entry.worker_slogan.trim()
          ? entry.worker_slogan.trim()
          : preTpl
            ? preTpl.worker_slogan
            : '안전조치 확인 전 작업 시작 금지! 원칙이 생명을 지킨다!',
      legal_ref:
        typeof entry.legal_ref === 'string' && entry.legal_ref.trim()
          ? entry.legal_ref.trim()
          : preTpl
            ? preTpl.legal_ref
            : '산업안전보건기준에 관한 규칙 관련 조항 준수',
      related_work_types: relatedWorkTypes,
      source_ref: pickString(isV3Format ? (entry.sr ?? entry.source_ref) : entry.source_ref, undefined, defaultSourceRef),
      source_image_url: typeof imgRaw === 'string' && imgRaw ? imgRaw : null,
      disclaimer:
        pickString(isV3Format ? (entry.dc ?? entry.disclaimer) : entry.disclaimer, undefined, defaultDisclaimer) ||
        undefined,
      source,
    });
  }

  if (normalized.length === 0) {
    return {
      cases: [],
      error: '유효한 사고사례 항목을 찾지 못했습니다. title, work_type 필드를 확인해 주세요.',
      isLiteFormat,
    };
  }

  return { cases: normalized, isLiteFormat };
}

export function parseUploadedCasesJson(
  rawText: string,
  source: 'builtin' | 'custom' = 'custom'
): {
  cases: AccidentCase[];
  error?: string;
  isLiteFormat?: boolean;
} {
  try {
    const parsed = JSON.parse(rawText);
    return parseCasesData(parsed, source);
  } catch {
    return {
      cases: [],
      error: 'JSON 형식이 올바르지 않습니다. UTF-8 JSON 파일인지 확인해 주세요.',
    };
  }
}
