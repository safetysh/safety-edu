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

interface EquipmentPriorityGuide {
  id: string;
  equipRe: RegExp;
  titleRe?: RegExp;
  workTypeRe?: RegExp;
  preventive_measures: string[];
  tbm_checklist: string[];
  ox_comparison: [OXComparisonPair, OXComparisonPair];
  worker_slogan: string;
}

const EQUIPMENT_PRIORITY_GUIDES: EquipmentPriorityGuide[] = [
  {
    id: 'mobile_scaffold',
    equipRe: /이동식\s*비계|B\/?T\s*비계/i,
    titleRe: /이동식\s*비계|B\/?T\s*비계/i,
    workTypeRe: /이동식\s*비계/,
    preventive_measures: [
      '이동식 비계 바퀴 브레이크·쐐기 완전 잠금 및 아웃트리거(전도방지 지지대) 설치·구조물 고정',
      '비계 최상부 작업발판 수평 고정 및 상부·중간 안전난간·발끝막이판 빠짐없이 설치',
      '작업발판 위 받침대·사다리 추가 사용 및 안전난간 딛고 작업 절대 금지',
      '승강용 전용 사다리 이용, 작업자 탑승 상태 이동 금지 및 최대적재하중(250kg) 준수',
    ],
    tbm_checklist: [
      '이동식 비계 바퀴 브레이크·쐐기 잠금 및 아웃트리거 전개·고정 상태를 확인했는가?',
      '최상부 작업발판 안전난간(상부·중간난간) 및 발판 이탈방지 고정을 점검했는가?',
      '작업발판 위에서 사다리·받침대를 올려 쓰거나 난간을 딛지 않도록 주지했는가?',
      '전용 승강 사다리를 사용하고 비계 이동 시 작업자 완전 하차 원칙을 준수하는가?',
      '안전모 턱끈 체결 및 높이 2m 이상 작업 시 안전대 착용·부착설비 체결 준비가 되었는가?',
    ],
    ox_comparison: [
      {
        wrong: '“작업발판 높이가 조금 모자라니 비계 위에 사다리를 올려놓고 작업하자.”',
        right: '비계 발판 위 사다리·받침대 사용을 엄금하고 규정 높이로 비계를 조립한다.',
        note: '안전보건규칙 제68조는 작업발판 위 사다리·받침대 사용 및 난간 딛기를 명시적으로 금지합니다.',
      },
      {
        wrong: '“잠깐 옆으로 옮길 건데 위에서 내리지 말고 그대로 밀고 이동하자.”',
        right: '이동식 비계 이동 전 작업자는 반드시 하차하고 이동 후 바퀴·아웃트리거를 재고정한다.',
        note: '탑승 이동 중 바퀴 걸림·바닥 단차로 비계가 전도되어 치명적 추락으로 이어집니다.',
      },
    ],
    worker_slogan: '바퀴 잠금! 아웃트리거 고정! 비계 위 사다리·탑승 이동 절대 금지!',
  },
  {
    id: 'hanging_scaffold',
    equipRe: /달비계|곤돌라/,
    titleRe: /달비계|곤돌라|외벽\s*로프/,
    preventive_measures: [
      '작업용 로프와 별도로 독립 고정점에 결속된 수직 구명줄(안전대 부착설비) 필수 설치',
      '로프 마모·절단 상태 점검 및 건물 모서리·돌출부 접촉 구간 마모방지 보호대 설치',
      '작업자 안전대 추락방지대(로프그랩) 수직 구명줄 체결 및 안전모 턱끈 고정 철저',
      '작업 하부 통행 금지 구역 설정 및 강풍·강우 등 악천후 시 즉시 작업 중지',
    ],
    tbm_checklist: [
      '작업용 로프와 별도의 수직 구명줄을 서로 다른 견고한 고정점에 결속했는가?',
      '로프 풀림·마모 여부와 건물 모서리 보호대(패드) 설치 상태를 확인했는가?',
      '안전대와 추락방지대(로프그랩)를 수직 구명줄에 올바르게 체결했는가?',
      '작업대(의자) 결속 상태 및 공구 낙하방지 끈 체결을 확인했는가?',
      '하부 보행자 출입 통제 및 기상(풍속·우천) 이상 유무를 확인했는가?',
    ],
    ox_comparison: [
      {
        wrong: '“작업용 로프가 튼튼하니 수직 구명줄 없이 작업 로프에만 걸고 내려가자.”',
        right: '반드시 작업용 로프와 독립된 고정점에 별도 수직 구명줄을 설치해 추락방지대를 체결한다.',
        note: '작업 로프 파단·풀림 시 독립 구명줄만이 추락 사망을 막을 수 있습니다.',
      },
      {
        wrong: '“난간 모서리에 로프가 조금 닿아도 금방 끝나니 보호대 없이 진행하자.”',
        right: '로프가 구조물 모서리에 닿는 모든 지점에 마모방지 보호대를 반드시 설치한다.',
        note: '콘크리트·철재 모서리 마찰은 하중이 걸린 로프를 수 분 만에 절단시킵니다.',
      },
    ],
    worker_slogan: '독립 구명줄 필수! 모서리 보호대 확인! 추락방지대 체결 후 하강!',
  },
  {
    id: 'system_scaffold',
    equipRe: /시스템\s*비계|강관\s*비계|외부\s*비계|비계/,
    titleRe: /시스템\s*비계|강관\s*비계|비계\s*(?:조립|해체|발판)/,
    preventive_measures: [
      '비계 조립·해체 작업계획서 작성 및 관리감독자 지휘 하에 순서 준수(임의 선해체 금지)',
      '작업발판 틈새 3cm 이하 밀착 고정 및 상부·중간 안전난간·발끝막이판 설치 확인',
      '벽이음(벽체 연결철물) 규정 간격 유지 및 해체 작업 전 임의 제거 절대 금지',
      '안전대 부착설비 확보, 안전고리 2중 걸이 상시 체결 및 하부 출입통제 구역 설정',
    ],
    tbm_checklist: [
      '비계 조립·해체 순서와 관리감독자 배치 여부를 작업자 전원이 숙지했는가?',
      '작업발판 이탈·뒤집힘 방지 고정 상태 및 안전난간 설치 여부를 확인했는가?',
      '벽이음·가새 등 구조 보강재가 임의로 해체되지 않고 정상 고정되어 있는가?',
      '안전모 턱끈 체결 및 안전대 부착설비(고리 상시 체결) 상태를 점검했는가?',
      '비계 자재 낙하 방지용 하부 출입통제선 및 신호수 배치가 완료되었는가?',
    ],
    ox_comparison: [
      {
        wrong: '“해체 속도를 높이려고 벽이음과 난간부터 미리 떼어내고 발판을 철거하자.”',
        right: '비계 해체는 상부에서 하부로 순서대로 진행하며 벽이음·난간은 해당 단 해체 직전 제거한다.',
        note: '벽이음·난간 선해체는 비계 도괴 및 고소 추락 사망사고의 주요 원인입니다.',
      },
      {
        wrong: '“비계 위에서 이동할 때 거추장스러우니 안전고리를 풀고 걸어가자.”',
        right: '비계 이동·해체 전 구간에서 안전고리를 부착설비에 상시 체결(2중 고리 교대)한다.',
        note: '단 1초의 발 헛디딤·발판 이탈도 고소 추락으로 직결됩니다.',
      },
    ],
    worker_slogan: '벽이음 임의 해체 금지! 발판 고정·안전고리 상시 체결!',
  },
  {
    id: 'ladder',
    equipRe: /사다리/,
    titleRe: /사다리/,
    preventive_measures: [
      '평탄·견고하고 미끄럽지 않은 바닥에 설치하고 바닥면 높이 3.5m 이하 경작업에만 제한 사용',
      '전도 방지를 위해 견고한 시설물 고정·아웃트리거 설치 또는 2인 1조(보조자 지지) 필수',
      '이동식 사다리 최상부 발판 및 그 하단 디딤대 올라서기 금지(최대사용하중 준수)',
      '안전모 필수 착용 및 작업 높이 2m 이상 시 안전모·안전대 동시 착용·체결(제42조 ④항)',
    ],
    tbm_checklist: [
      '사다리 설치 바닥이 평탄·미끄럽지 않으며 작업 높이가 3.5m 이하인지 확인했는가?',
      '시설물 고정·아웃트리거 설치 또는 2인 1조 보조자 지지 조치가 완료되었는가?',
      '사다리 최상부 발판 및 바로 아래 디딤대에 올라서지 않도록 교육했는가?',
      '사다리 변형·파손·미끄럼방지 고무패드·펼침방지 철물 이상 유무를 점검했는가?',
      '안전모 턱끈 체결 및 높이 2m 이상 작업 시 안전대 동시 착용·체결을 확인했는가?',
    ],
    ox_comparison: [
      {
        wrong: '“간단한 교체 작업이니 혼자 A형 사다리 맨 꼭대기에 올라가서 처리하자.”',
        right: '최상부·차상부 디딤대 탑승을 금지하고 2인 1조 지지 또는 아웃트리거 고정 후 작업한다.',
        note: '2024.06.28 신설 안전보건규칙 제42조 ④항은 3.5m 이하 제한·전도방지·최상부 탑승금지를 의무화합니다.',
      },
      {
        wrong: '“사다리 높이가 2m 남짓이니 안전모만 쓰고 안전대는 생략하자.”',
        right: '작업 높이 2m 이상 사다리 작업 시 안전모와 안전대를 반드시 함께 착용·체결한다.',
        note: '2~3m 높이 추락도 머리 충격으로 사망사고가 빈번히 발생합니다.',
      },
    ],
    worker_slogan: '3.5m 이하 경작업만! 2인 1조·아웃트리거 고정! 최상부 탑승 금지!',
  },
  {
    id: 'awp',
    equipRe: /고소작업대|시저형|굴절식|스카이/,
    titleRe: /고소작업대|시저형|스카이/,
    workTypeRe: /고소작업대/,
    preventive_measures: [
      '작업 전 평탄 지반 확인·아웃트리거 완전 전개 및 과상승방지장치·비상정지장치 정상 점검',
      '작업대 붐대 상승 상태에서 탑승자 작업대 이탈 금지(불가피 시 안전대 부착설비 체결)',
      '상부 구조물·전로(전선) 근접 구간 작업감시자 배치 및 끼임·감전 위험 사전 확인',
      '정격하중 초과 적재·조작스위치 임의 고정 금지 및 탑승자 전원 안전모·안전대 착용',
    ],
    tbm_checklist: [
      '설치 바닥의 평탄·지반 침하 여부 및 아웃트리거 완전 전개 상태를 확인했는가?',
      '과상승방지장치(압착방지바)·비상정지장치·경보음이 정상 작동하는지 시험했는가?',
      '상부 구조물(보·배관) 끼임 위험과 주변 전로(전선) 이격거리를 사전 확인했는가?',
      '정격하중 준수 및 붐대 상승 중 작업대 밖 이탈 금지 수칙을 공유했는가?',
      '탑승자 전원이 안전모 턱끈 및 안전대 고리를 작업대 전용 고리에 체결했는가?',
    ],
    ox_comparison: [
      {
        wrong: '“작업대가 구조물에 살짝 안 닿으니 난간을 밟고 철골 위로 넘어가자.”',
        right: '붐대 상승 중 작업대 이탈 및 난간 밟기를 엄금하고 안전 위치로 장비를 재조정한다.',
        note: '안전보건규칙 제186조는 작업대 이탈 금지(예외 시 안전대 부착설비 체결)를 규정합니다.',
      },
      {
        wrong: '“과상승방지장치가 천장에 자주 걸려 불편하니 묶어두고 상승시키자.”',
        right: '과상승방지장치·전환스위치 임의 고정을 절대 금지하고 상부 장애물을 상시 확인한다.',
        note: '방호장치 무력화는 작업대 난간과 상부 구조물 사이 치명적 협착 사망으로 이어집니다.',
      },
    ],
    worker_slogan: '과상승방지 정상 작동! 작업대 이탈 금지! 안전고리 전용 고리 체결!',
  },
  {
    id: 'roof_skylight',
    equipRe: /채광창|선라이트|슬레이트|지붕/,
    titleRe: /채광창|선라이트|슬레이트|지붕/,
    preventive_measures: [
      '지붕 채광창(선라이트)·슬레이트 상부 견고한 덮개 설치 및 폭 30cm 이상 안전발판 확보',
      '지붕 단부 안전난간 설치 또는 하부 추락방호망 설치 후 안전대 부착설비(구명줄) 체결',
      '취약 지붕재 직접 밟기 엄금 및 지정된 보행용 안전발판·통로로만 이동 준수',
      '우천·강풍·결로 등 미끄럼 위험 기상 시 지붕 작업 즉시 중지 및 2인 1조 작업',
    ],
    tbm_checklist: [
      '채광창·슬레이트 등 취약 부재에 견고한 덮개 또는 폭 30cm 이상 발판을 설치했는가?',
      '지붕 단부 안전난간 또는 하부 추락방호망 설치 상태를 확인했는가?',
      '안전대 부착설비(수평 구명줄) 설치 및 안전고리 상시 체결 준비가 되었는가?',
      '지붕 위 자재 이동 시 취약 부재를 밟지 않도록 지정 이동통로를 확인했는가?',
      '안전모 턱끈 체결 및 미끄럼 방지 안전화를 착용했는가?',
    ],
    ox_comparison: [
      {
        wrong: '“채광창 가장자리 쪽으로 살살 밟고 지나가면 깨지지 않을 것이다.”',
        right: '채광창·슬레이트는 절대 밟지 않고 덮개·폭 30cm 이상 안전발판 위로만 이동한다.',
        note: '노후 채광창과 슬레이트는 사람 체중을 견디지 못하고 예고 없이 즉시 파손됩니다.',
      },
      {
        wrong: '“지붕 누수만 잠깐 확인하고 내려올 건데 안전고리는 생략하자.”',
        right: '단시간 지붕 점검이라도 구명줄·안전고리 체결 및 하부 방호조치 후 올라간다.',
        note: '지붕 추락 사망사고의 상당수가 10분 이내 단시간 보수·점검 중 발생합니다.',
      },
    ],
    worker_slogan: '채광창 밟기 엄금! 폭 30cm 발판·덮개 확보 및 안전고리 체결!',
  },
  {
    id: 'edge_opening',
    equipRe: /개구부|데크플레이트|단부|피트|승강기/,
    titleRe: /개구부|단부|피트|데크플레이트|바닥\s*구멍|승강기\s*통로/,
    preventive_measures: [
      '개구부·피트·작업발판 단부에 견고한 안전난간 또는 이탈방지 고정 덮개(위험표지) 우선 설치',
      '덮개·안전난간 일시 해체 시 관리감독자 승인 하에 안전대 부착설비 확보 및 안전고리 체결',
      '작업 종료 및 중단 시 해체한 개구부 덮개·안전난간 즉시 원상복구 확인',
      '어두운 피트·통로 적정 조도 확보, 단부 접근 경계표시 및 안전모 턱끈 착용 철저',
    ],
    tbm_checklist: [
      '작업구간 주변 모든 단부·개구부에 안전난간 또는 고정형 덮개가 설치되어 있는가?',
      '개구부 덮개가 뒤집히거나 밀리지 않도록 고정되고 ‘추락주의’ 표지가 부착되었는가?',
      '단부 근접 작업 시 안전대 부착설비 설치 및 안전고리 체결 상태를 확인했는가?',
      '작업 중 일시 해체한 난간·덮개의 즉시 복구 책임자가 지정되어 있는가?',
      '작업장 적정 조도 확보 및 안전모 턱끈·안전화 착용 상태를 점검했는가?',
    ],
    ox_comparison: [
      {
        wrong: '“잠시 자재를 내리려고 개구부 덮개를 열어두었는데 끝난 뒤 한꺼번에 닫자.”',
        right: '개구부·단부 방호시설은 작업 중단 즉시 복구하고 개방 중에는 감시자·안전고리를 필수 적용한다.',
        note: '미복구·미고정 개구부는 뒷걸음질이나 자재 운반 중 추락 사망으로 직결됩니다.',
      },
      {
        wrong: '“피트 가장자리에서 잠깐 철물만 고정할 건데 안전고리 없이 조심해서 하자.”',
        right: '단부·피트 주변 작업 시 반드시 안전난간을 확보하거나 안전대 고리를 체결한다.',
        note: '2~4m 높이의 피트·단부 추락도 바닥 구조물 충격으로 치명적 사망사고를 유발합니다.',
      },
    ],
    worker_slogan: '단부 안전난간·개구부 덮개 완전 고정! 안전고리 체결 후 작업!',
  },
  {
    id: 'forklift',
    equipRe: /지게차/,
    titleRe: /지게차/,
    workTypeRe: /지게차/,
    preventive_measures: [
      '지게차 작업구역과 보행자 통로 물리적 분리, 작업반경 출입 통제 및 유도자 배치',
      '지게차 포크 위 근로자 탑승·작업 및 상승된 포크·화물 하부 출입 절대 금지',
      '운전자 좌석 안전띠 필수 착용, 제한속도 준수 및 후진 경보음·후방감지기 정상 작동 확인',
      '적재 화물 편하중·과적 방지, 시야 가림 시 후진 주행 또는 유도자 신호에 따라 서행',
    ],
    tbm_checklist: [
      '지게차 작업구역 내 보행자 통로 분리 및 출입통제 조치가 되어 있는가?',
      '지게차 후진 경보음·경광등·후방감지기·제동장치가 정상 작동하는가?',
      '운전자 자격 확인 및 좌석 안전띠 착용·제한속도 준수 원칙을 확인했는가?',
      '포크 위 탑승 금지 및 화물 하부 접근 금지 원칙을 전원 숙지했는가?',
      '적재물 높이로 시야가 가릴 때 유도자 배치 또는 후진 서행 수칙을 확인했는가?',
    ],
    ox_comparison: [
      {
        wrong: '“높은 선반 물건만 잠깐 내릴 건데 지게차 포크(팔레트) 위에 올라타서 작업하자.”',
        right: '지게차 포크 탑승을 절대 금지하고 전용 고소작업대 또는 안전한 작업발판을 사용한다.',
        note: '포크·팔레트 위 탑승 작업은 지게차 추락·협착 중대재해의 대표적 원인입니다.',
      },
      {
        wrong: '“지게차가 지나갈 때 옆으로 비켜 서 있으면 부딪히지 않을 것이다.”',
        right: '지게차 작업반경 내 보행자 진입을 통제하고 운전자와 눈 맞춤·정지 확인 후 이동한다.',
        note: '적재물 사각지대와 후륜 조향 회전반경 때문에 보행자 충돌·깔림 사고가 빈번합니다.',
      },
    ],
    worker_slogan: '보행자 통로 분리! 포크 탑승 금지! 사각지대 유도자·서행 필수!',
  },
  {
    id: 'crane',
    equipRe: /크레인|호이스트|섬유로프|슬링벨트|와이어로프/,
    titleRe: /크레인|호이스트|섬유로프|슬링벨트|인양물|줄걸이/,
    workTypeRe: /크레인|양중/,
    preventive_measures: [
      '인양 전 와이어로프·섬유로프·슬링벨트·샤클 손상·파단 위험 및 정격하중·안전계수 점검',
      '인양물 하부 출입금지 구역 설정, 신호수 배치 및 운전자·신호수 간 표준 신호체계 통일',
      '훅 해지장치(이탈방지) 정상 작동 확인 및 중량물 2점 이상 균형 줄걸이·모서리 보호대 설치',
      '인양 중 급정지·급선회 금지 및 인양물 손으로 직접 잡기 금지(보조 유도 로프 사용)',
    ],
    tbm_checklist: [
      '와이어로프·섬유로프·슬링벨트의 마모·절단·변형 여부와 정격하중을 점검했는가?',
      '크레인 훅 해지장치·권과방지장치·비상정지장치가 정상 작동하는가?',
      '인양물 이동 경로 및 하부에 작업자 출입금지 통제선을 설정했는가?',
      '지정 신호수를 배치하고 운전자와 표준 수신호·무선통신을 통일했는가?',
      '인양물 유도 시 맨손 접촉 대신 보조 로프를 사용하고 급선회를 금지했는가?',
    ],
    ox_comparison: [
      {
        wrong: '“섬유로프가 조금 닳았지만 가벼운 철거물이니 한 번만 더 인양하자.”',
        right: '손상·마모된 섬유로프·와이어로프는 즉시 폐기하고 안전계수 충족 줄걸이만 사용한다.',
        note: '손상된 줄걸이 파단은 인양물 낙하로 하부 작업자 즉사 사고로 이어집니다.',
      },
      {
        wrong: '“인양물이 흔들리니 아래에서 손으로 직접 붙잡아 방향을 맞추자.”',
        right: '인양물 하부 접근을 엄금하고 안전거리 밖에서 보조 유도 로프로 방향을 제어한다.',
        note: '중량물 흔들림·클램프 이탈 시 회피할 시간 없이 맞음·깔림 재해가 발생합니다.',
      },
    ],
    worker_slogan: '줄걸이 손상 사전 폐기! 인양물 하부 출입 금지! 신호수 통일 신호!',
  },
  {
    id: 'heavy_vehicle',
    equipRe: /굴착기|롤러|로더|덤프|불도저|항타기|레미콘|트레일러|화물자동차|화물차|암롤/,
    titleRe: /굴착기|롤러|레미콘|덤프|트레일러|화물차|후진하는\s*차량/,
    preventive_measures: [
      '차량계 건설기계·하역차량 작업계획서 작성 및 작업반경 내 근로자 출입 통제·유도자 배치',
      '후진 경보장치·후방카메라·제동장치 정상 작동 확인 및 사각지대 보행·휴식 절대 금지',
      '굴착기 퀵커플러 안전핀 체결 확인 및 버킷·붐대 용도 외 사용(인양·탑승) 금지',
      '경사지·연약지반 전도 방지 지반 보강 및 주정차 시 시동 정지·브레이크·바퀴 고임목 설치',
    ],
    tbm_checklist: [
      '차량·건설기계 작업반경 내 근로자 출입 통제선과 전담 유도자가 배치되었는가?',
      '장비 후진 경보음·후방카메라·브레이크 및 회전 경고등이 정상 작동하는가?',
      '굴착기 퀵커플러 잠금핀 체결 상태 및 장비 이동 지반의 안전성을 점검했는가?',
      '장비 사각지대 접근 금지 및 작업자 휴식 구역 분리를 전원 주지했는가?',
      '운전자 이탈·주정차 시 원동기 정지·주차브레이크·고임목 설치 원칙을 준수하는가?',
    ],
    ox_comparison: [
      {
        wrong: '“장비 작업 반경이 좁으니 유도자 없이 운전자 백미러만 보고 후진하자.”',
        right: '차량·건설기계 후진 및 선회 시 반드시 작업반경 출입을 통제하고 유도자를 배치한다.',
        note: '롤러·굴착기·레미콘 후진 사각지대는 부딪힘·깔림 사망사고의 최다 발생 지점입니다.',
      },
      {
        wrong: '“굴착기 버킷을 잠깐 들어 올려 자재를 매달거나 이동 발판으로 쓰자.”',
        right: '건설기계의 주용도 외 사용을 금지하고 정격 인양장비·작업발판을 사용한다.',
        note: '안전보건규칙 제200조는 차량계 건설기계의 주용도 외 사용을 엄격히 제한합니다.',
      },
    ],
    worker_slogan: '장비 작업반경 출입 금지! 후진 시 유도자 필수! 사각지대 접근 엄금!',
  },
  {
    id: 'press',
    equipRe: /프레스|절곡|전단/,
    titleRe: /프레스|절곡기|전단기/,
    workTypeRe: /프레스|절곡|전단기/,
    preventive_measures: [
      '광전자식·양수조작식 방호장치 상시 정상 작동 유지 및 임의 해제·우회 엄격 금지',
      '금형 점검·청소·교체 시 주전원 차단(LOTO) 후 안전블록(Safety Block) 반드시 삽입',
      '금형 내부 이물질 제거 시 맨손 진입 절대 금지 및 전용 긴 집게·에어건 사용',
      '풋스위치(발판) 오조작 방지 견고한 덮개 설치 및 양수조작 모드 우선 적용',
    ],
    tbm_checklist: [
      '광전자식·양수조작식 방호장치가 정상 작동하는지 작업 전 시험 확인했는가?',
      '금형 점검·조치용 안전블록이 설비 옆 지정 위치에 비치·사용되고 있는가?',
      '스크랩·이물질 제거용 전용 긴 집게와 수공구가 준비되어 있는가?',
      '풋스위치 오조작 방지 덮개가 파손 없이 견고히 고정되어 있는가?',
      '금형 내 손 진입 절대 금지 원칙을 작업자 전원이 숙지했는가?',
    ],
    ox_comparison: [
      {
        wrong: '“센서가 자주 걸려 작업 속도가 느리니 방호장치를 끄고 작업하자.”',
        right: '방호장치 정상 작동 없이 프레스를 가동하지 않으며 이상 시 즉시 관리자에게 보고한다.',
        note: '방호장치 해제는 프레스 협착·절단 중대재해의 1순위 직접 원인입니다.',
      },
      {
        wrong: '“금형에 낀 조각만 손으로 재빨리 꺼내고 다시 페달을 밟자.”',
        right: '설비 정지·안전블록 삽입 후 반드시 전용 집게 등 수공구로 이물질을 제거한다.',
        note: '슬라이드 하강 속도는 사람의 손 회피 반응속도보다 훨씬 빠릅니다.',
      },
    ],
    worker_slogan: '방호장치 해제 금지! 금형 안엔 손 대신 집게와 안전블록!',
  },
  {
    id: 'conveyor_rotary',
    equipRe: /컨베이어|배합기|혼합기|파쇄기|분쇄기|압축기|선반|절단기|회전체/,
    titleRe: /컨베이어|배합기|혼합기|파쇄기|분쇄기|압축기|회전체/,
    workTypeRe: /컨베이어|회전체|파쇄·압축기/,
    preventive_measures: [
      '정비·청소·이물질 제거·점검 전 반드시 설비 운전 정지 및 주전원 차단·LOTO 잠금 부착',
      '회전축·벨트·물림점 덮개·울 및 덮개 개방 시 자동정지 연동장치(인터록) 정상 유지',
      '비상정지 스위치(풀코드 등) 위치·작동 확인 및 설비 가동 중 신체 접근·손 진입 엄금',
      '회전체 말림 위험 면장갑·느슨한 작업복 착용 금지 및 전용 수공구 사용 철저',
    ],
    tbm_checklist: [
      '정비·청소·이물질 제거 전 설비 정지 및 전원 차단·LOTO(잠금·표지) 절차를 확인했는가?',
      '회전부·물림점 덮개·울 및 연동장치(인터록)가 임의 해제 없이 정상 작동하는가?',
      '비상정지장치(스위치·풀코드) 위치와 정상 작동 상태를 작업 전 점검했는가?',
      '가동 중 설비 내부 진입 금지 및 전용 수공구 사용 원칙을 공유했는가?',
      '회전체 말림 우려 장갑·옷소매 단속 등 복장 상태를 확인했는가?',
    ],
    ox_comparison: [
      {
        wrong: '“컨베이어·배합기를 세우면 재가동이 번거로우니 돌린 채로 이물질만 털어내자.”',
        right: '정비·청소·이물질 제거 시 반드시 운전을 정지하고 전원 차단·LOTO를 체결한다.',
        note: '안전보건규칙 제92조·제87조는 정비 시 운전정지 및 분쇄기·혼합기 연동장치를 의무화합니다.',
      },
      {
        wrong: '“점검 덮개를 자주 열어야 하니 인터록 센서를 테이프로 고정해두자.”',
        right: '덮개 연동장치·감응형 방호장치는 절대 무력화하지 않고 정상 작동 상태를 유지한다.',
        note: '연동장치 해제는 타인의 오조작·자동 재가동 시 끼임 사망으로 직결됩니다.',
      },
    ],
    worker_slogan: '정비·청소 전 무조건 운전정지! 전원 차단·LOTO 확인 후 진입!',
  },
  {
    id: 'excavation_shoring',
    equipRe: /굴착\s*사면|가시설|흙막이|거푸집|동바리|석축|옹벽/,
    titleRe: /토사가\s*무너|굴착면|터파기|석축이\s*무너|거푸집|동바리|붕괴/,
    workTypeRe: /굴착·가시설/,
    preventive_measures: [
      '굴착 깊이 1.5m 이상 시 지질에 맞는 굴착면 기울기 준수 또는 흙막이 지보공 우선 설치',
      '작업 시작 전 및 우천·해빙 후 굴착면 균열·용수·지반 이완 상태 관리감독자 사전 점검',
      '굴착면 상부 가장자리 토사·장비·중량물 적재 금지 및 가시설 부재 임의 해체 엄금',
      '거푸집·동바리 조립도 준수·수평연결재 고정 및 콘크리트 타설 시 편심하중 방지',
    ],
    tbm_checklist: [
      '굴착면 기울기 확보 또는 흙막이 지보공·버팀대 설치 상태를 확인했는가?',
      '작업 전 굴착 사면의 균열·누수·토사 흘러내림 등 붕괴 징후를 점검했는가?',
      '굴착면 상부 가장자리에 굴착 토사·자재·장비가 근접 적재되지 않았는가?',
      '거푸집·동바리 수직도·수평연결재 고정 및 임의 해체 금지 원칙을 확인했는가?',
      '지반 이상·붕괴 징후 발견 시 즉시 대피 경로와 작업중지 신호를 공유했는가?',
    ],
    ox_comparison: [
      {
        wrong: '“터파기 구간이 깊지 않고 금방 관로만 확인하고 나올 거니 지보공 없이 들어가자.”',
        right: '깊이 1.5m 이상 굴착 시 기울기 확보 또는 간이 흙막이 설치 후에만 작업자가 진입한다.',
        note: '수직 굴착면 토사는 예고 없이 한순간에 무너져 매몰·질식 사망을 유발합니다.',
      },
      {
        wrong: '“파낸 흙을 바로 옆 굴착면 가장자리에 쌓아두어야 되메우기가 편하다.”',
        right: '굴착 토사와 중량물은 굴착면 상부에서 충분한 안전거리 밖으로 이격 적재한다.',
        note: '상부 적재 하중은 사면 토압을 급증시켜 붕괴의 직접 원인이 됩니다.',
      },
    ],
    worker_slogan: '기울기·흙막이 확보 전 굴착면 진입 금지! 상부 적재 엄금!',
  },
  {
    id: 'confined_space',
    equipRe: /밀폐공간|저장탱크|맨홀|정화조|집수정|양생|갈탄|오폐수/,
    titleRe: /밀폐공간|질식|산소\s*결핍|유해가스|갈탄|양생|저장탱크\s*내부/,
    workTypeRe: /밀폐공간|화학물질·밀폐탱크/,
    preventive_measures: [
      '밀폐공간(탱크·맨홀·정화조·양생장) 출입 전 지정 측정자가 산소(18~23.5%)·유해가스 농도 측정',
      '작업 전·작업 중 강제 급·배기 환기장치 지속 가동 및 적정공기 유지 상태 실시간 모니터링',
      '유해가스 잔류·환기 곤란 시 공기호흡기·송기마스크 필수 착용(방독마스크 대체 금지)',
      '외부 감시인 상시 배치, 출입 인원 점검 및 이상 발생 시 보호구 없이 단독 구조 진입 엄금',
    ],
    tbm_checklist: [
      '작업 시작 전 지정 측정자가 산소·황화수소·일산화탄소 등 가스 농도를 측정했는가?',
      '급·배기 환기팬이 작업 전부터 종료 시까지 연속 가동되도록 설치되었는가?',
      '공기호흡기·송기마스크 및 구명줄·비상연락장비가 현장 입구에 비치되었는가?',
      '외부 감시인이 배치되어 출입 인원과 내부 작업자 상태를 상시 확인하는가?',
      '내부 쓰러짐 발생 시 호흡보호구 미착용 구조 진입 금지 수칙을 전원 숙지했는가?',
    ],
    ox_comparison: [
      {
        wrong: '“어제도 들어갔던 탱크·맨홀이니 냄새가 안 나면 측정 없이 바로 들어가자.”',
        right: '일시 중단 후 재진입 포함 매 작업 전 산소·유해가스 농도를 반드시 측정·평가한다.',
        note: '일산화탄소·질소·산소결핍은 무색·무취로 단 한 번의 호흡만으로 의식을 잃습니다.',
      },
      {
        wrong: '“동료가 안에서 쓰러졌으니 빨리 맨몸으로 뛰어들어 구해내자.”',
        right: '즉시 119 신고 및 환기를 가동하고 공기호흡기 착용 구조대가 안전하게 구조한다.',
        note: '보호구 없는 2차 구조 진입은 동반 질식 사망으로 이어지는 최악의 패턴입니다.',
      },
    ],
    worker_slogan: '출입 전 농도 측정! 연속 환기! 공기호흡기 없이 구조 진입 금지!',
  },
  {
    id: 'electrical',
    equipRe: /전로|배전반|분전반|변압기|케이블|전기(?!로|톱|자전거)/,
    titleRe: /감전|활선|충전부|배전반|전로|변압기/,
    preventive_measures: [
      '전기설비 점검·보수 전 전원 차단, 개폐기 잠금장치(LOTO)·통전금지 표지판 및 검전기 무전압 확인',
      '충전부 근접 작업 시 절연용 방호구 설치 및 해당 전압 정격 절연장갑·절연화·절연모 착용',
      '단락접지기구 설치로 잔류전하 방전 및 유자격자 외 고압 충전부 접근한계거리 엄수',
      '젖은 손·습윤 장소 전기기계기구 취급 금지 및 누전차단기·접지 상태 작업 전 점검',
    ],
    tbm_checklist: [
      '작업 대상 전로의 전원 차단 및 개폐기 잠금(LOTO)·표지판 부착을 완료했는가?',
      '검전기로 충전 여부를 직접 확인(무전압 확인)하고 잔류전하를 방전했는가?',
      '정격 절연장갑·절연화·절연용 방호구 등 전기 보호구 손상 유무를 점검했는가?',
      '충전전로 인근 접근한계거리 유지 및 작업감시자 배치가 완료되었는가?',
      '이동형 전동기구 외함 접지 및 누전차단기 정상 작동 상태를 확인했는가?',
    ],
    ox_comparison: [
      {
        wrong: '“차단기를 내렸으니 검전기 확인 없이 바로 전선 작업을 시작하자.”',
        right: '차단기 개방·잠금(LOTO) 후 반드시 검전기로 무전압을 직접 확인하고 작업한다.',
        note: '회로 오인·역전압·잔류전하로 인해 차단 후에도 감전 사망사고가 발생합니다.',
      },
      {
        wrong: '“저압 배전반이라 괜찮으니 일반 면장갑을 끼고 단자를 조이자.”',
        right: '전원 차단 원칙을 준수하며 불가피한 충전부 근접 시 정격 절연장갑·절연공구를 사용한다.',
        note: '220V/380V 저압 전로도 습기·땀이 있을 경우 치명적 심실세동 감전을 유발합니다.',
      },
    ],
    worker_slogan: '전원 차단! LOTO 잠금! 검전기 무전압 확인 전 접촉 절대 금지!',
  },
];

function matchEquipmentPriorityGuide(
  equipment: string,
  title: string,
  workType: string,
  hazardType: string
): EquipmentPriorityGuide | null {
  const eq = (equipment || '').trim();
  const ti = (title || '').trim();
  const wt = (workType || '').trim();
  const hz = (hazardType || '').trim();

  // Special disambiguation: confined-space structure (e.g. 정화조 피트) where the actual accident is falling off an edge/opening
  if (/떨어짐|추락/.test(hz) && /단부|개구부|피트/.test(`${eq} ${ti}`) && !/채광창|지붕|사다리|비계|고소작업대/.test(`${eq} ${ti}`)) {
    const edgeGuide = EQUIPMENT_PRIORITY_GUIDES.find((g) => g.id === 'edge_opening');
    if (edgeGuide) return edgeGuide;
  }

  // Priority 1: Exact Equipment (기인물) match
  if (eq) {
    for (let i = 0; i < EQUIPMENT_PRIORITY_GUIDES.length; i++) {
      const g = EQUIPMENT_PRIORITY_GUIDES[i];
      if (g.equipRe.test(eq)) {
        // Avoid mapping confined-space guide when hazard is clearly falling from scaffold/ladder/edge
        if (g.id === 'confined_space' && /떨어짐|추락/.test(hz)) continue;
        return g;
      }
    }
  }

  // Priority 2: Case Title (사고 제목 내 기인물·작업 키워드) match
  if (ti) {
    for (let i = 0; i < EQUIPMENT_PRIORITY_GUIDES.length; i++) {
      const g = EQUIPMENT_PRIORITY_GUIDES[i];
      if (g.titleRe && g.titleRe.test(ti)) {
        if (g.id === 'confined_space' && /떨어짐|추락/.test(hz)) continue;
        return g;
      }
    }
  }

  // Priority 3: Work Type (작업유형) match
  if (wt) {
    for (let i = 0; i < EQUIPMENT_PRIORITY_GUIDES.length; i++) {
      const g = EQUIPMENT_PRIORITY_GUIDES[i];
      if (g.workTypeRe && g.workTypeRe.test(wt)) {
        if (g.id === 'confined_space' && /떨어짐|추락/.test(hz)) continue;
        return g;
      }
    }
  }

  return null;
}

const FATALITY_LOC_PRIMARY_RE = /^(.+?소[재개]\s+.{1,45}?(?:에서|내에서))\s*(.+)$/;
const FATALITY_LOC_SECONDARY_RE =
  /^(.+?(?:경|시|군|구)\s+.{1,45}?(?:현장에서|사업장에서|공장에서|창고에서|야적장에서|적재장에서|작업장에서|시에서|군에서|구에서|현장(?=\s*재해자)))\s*(.+)$/;
const FATALITY_VICTIM_PAREN_RE = /\(([^()]*(?:사망|부상|중상|경상)[^()]*)\)/;
const FATALITY_HEIGHT_PAREN_RE = /\((\s*(?:높이[:\s]*)?\d+(?:\.\d+)?\s*m\s*)\)/i;

function buildFatalityTimeline(params: {
  overviewVerbatim: string;
  occurredDate: string;
  region: string;
  title: string;
  equipment: string;
  hazardType: string;
  firstMeasure: string;
}): [TimelineStep, TimelineStep, TimelineStep, TimelineStep] {
  const { overviewVerbatim, occurredDate, region, title, equipment, hazardType, firstMeasure } =
    params;
  const raw = (overviewVerbatim || '').trim();

  // Strip optional trailing KOSHA footnote (*용어설명...) from step text (overview_raw itself stays untouched)
  const withoutFootnote = raw.replace(/\s*\*[^*]+$/, '').trim();

  // Extract victim & optional separate height parentheticals
  const victimMatch = FATALITY_VICTIM_PAREN_RE.exec(withoutFootnote);
  let victimNote = victimMatch ? victimMatch[1].replace(/\s*:\s*/g, ' ').trim() : '';

  let body = withoutFootnote
    .replace(/\s*\([^()]*(?:사망|부상|중상|경상)[^()]*\)\s*/g, ' ')
    .trim();

  if (victimNote && !/높이|\dm/i.test(victimNote)) {
    const heightMatch = FATALITY_HEIGHT_PAREN_RE.exec(body);
    if (heightMatch) {
      const hVal = heightMatch[1].trim();
      victimNote = `${victimNote}, ${/^높이/.test(hVal) ? hVal : `높이 ${hVal}`}`;
      body = body.replace(heightMatch[0], '').trim();
    }
  }

  // Split into [1단계: 발생 일시·장소] and [2단계: 작업·사고 경위]
  let step1Detail = '';
  let step2Detail = '';

  const m1 = FATALITY_LOC_PRIMARY_RE.exec(body);
  if (m1 && m1[2].trim().length >= 6) {
    step1Detail = m1[1].trim().replace(/(?:내에서|에서)$/, '').trim();
    step2Detail = m1[2].trim();
  } else {
    const m2 = FATALITY_LOC_SECONDARY_RE.exec(body);
    if (m2 && m2[2].trim().length >= 6) {
      step1Detail = m2[1].trim().replace(/(?:내에서|에서)$/, '').trim();
      step2Detail = m2[2].trim();
    } else {
      step1Detail =
        [occurredDate, region].filter(Boolean).join(' · ') || '중대재해 발생 현장';
      step2Detail = body || title;
    }
  }

  // Clean trailing punctuation noise in step 2
  step2Detail = step2Detail.replace(/[,.\s]+$/, '').trim();
  if (!step2Detail) step2Detail = title;

  // Compose rich, self-contained [3단계: 피해·위험 결과] — never a dangling "(사망 1명)" alone
  const equipClean = (equipment || '').trim();
  const equipSuffix =
    equipClean && equipClean !== '현장 작업 설비 및 기구'
      ? ` · 기인물: ${equipClean}`
      : '';
  const step3Detail = victimNote
    ? `${hazardType} 중대재해 (${victimNote})${equipSuffix}`
    : `${hazardType} 사망·중대재해 발생${equipSuffix}`;

  return [
    { step: '1단계', label: '발생 일시·장소', detail: step1Detail },
    { step: '2단계', label: '작업·사고 경위', detail: step2Detail },
    { step: '3단계', label: '피해·위험 결과', detail: step3Detail },
    { step: '4단계', label: '골든타임 예방', detail: firstMeasure },
  ];
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

    const eqPriorityGuide = matchEquipmentPriorityGuide(
      equipmentVal,
      title,
      workType,
      hazardType
    );

    const occurredDateVal = pickString(
      isV3Format ? (entry.od ?? entry.occurred_date) : entry.occurred_date,
      undefined,
      ''
    );
    const regionVal = isV3Format
      ? lookupDictString(entry.rg) || pickString(entry.region, undefined, '')
      : pickString(entry.region, undefined, '');

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
          : eqPriorityGuide
            ? eqPriorityGuide.preventive_measures
            : preTpl
              ? preTpl.preventive_measures
              : DEFAULT_PREVENTIVE_MEASURES;
    } else if (Array.isArray(entry.preventive_measures)) {
      const p = pickStringArray(entry.preventive_measures, undefined);
      preventive_measures =
        p.length > 0
          ? p
          : eqPriorityGuide
            ? eqPriorityGuide.preventive_measures
            : preTpl
              ? preTpl.preventive_measures
              : DEFAULT_PREVENTIVE_MEASURES;
    } else {
      preventive_measures = eqPriorityGuide
        ? eqPriorityGuide.preventive_measures
        : preTpl
          ? preTpl.preventive_measures
          : DEFAULT_PREVENTIVE_MEASURES;
    }

    const tbm_checklist: string[] = Array.isArray(entry.tbm_checklist)
      ? (() => {
          const t = pickStringArray(entry.tbm_checklist, undefined);
          return t.length > 0
            ? t
            : eqPriorityGuide
              ? eqPriorityGuide.tbm_checklist
              : preTpl
                ? preTpl.tbm_checklist
                : DEFAULT_TBM_CHECKLIST;
        })()
      : eqPriorityGuide
        ? eqPriorityGuide.tbm_checklist
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
    } else if (sourceType === 'FATALITY') {
      timeline = buildFatalityTimeline({
        overviewVerbatim,
        occurredDate: occurredDateVal,
        region: regionVal,
        title,
        equipment: equipmentVal,
        hazardType,
        firstMeasure: preventive_measures[0],
      });
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
        : eqPriorityGuide
          ? eqPriorityGuide.ox_comparison
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

    const imgRaw = isV3Format ? (entry.img ?? entry.source_image_url) : entry.source_image_url;

    normalized.push({
      id: idVal,
      source_type: sourceType,
      facts_locked: entry.facts_locked !== undefined ? Boolean(entry.facts_locked) : source === 'builtin',
      boardno: boardnoVal,
      atcflcnt: typeof atcflcntRaw === 'number' ? atcflcntRaw : undefined,
      occurred_date: occurredDateVal,
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
          : eqPriorityGuide
            ? eqPriorityGuide.worker_slogan
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
