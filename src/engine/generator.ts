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
  TimelineStep,
  VariationOption,
} from '../types/safety';

export interface GenerationHistoryState {
  version: number;
  lastMode?: PerspectiveMode;
  lastThemeId?: SafetyThemeId;
  lastLayoutId?: LayoutStyleId;
  lastPrimaryCaseId?: string;
  lastRelatedCaseId?: string;
  recentPrimaryIds?: string[];
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

export function getNativeThemeForHazard(hazard: HazardType): SafetyThemeId {
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

function getMatchingMechanismGroups(text: string): string[] {
  const matched: string[] = [];
  for (const group of MECHANISM_GROUPS) {
    if (group.keywords.some((kw) => text.includes(kw))) {
      matched.push(group.name);
    }
  }
  return matched;
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

export function scoreCaseMatch(
  candidate: AccidentCase,
  industry: IndustryType,
  workType: string
): ScoredCase {
  let score = 0;
  let isExact = false;
  const reasons: string[] = [];

  if (candidate.work_type === workType) {
    score += 100;
    isExact = true;
    reasons.push('선택 작업유형 정확 일치');
    if (candidate.industry === industry) {
      score += 20;
    }
  } else {
    if (candidate.related_work_types.includes(workType)) {
      score += 72;
      reasons.push('유사공정 교차매핑 등록');
    }

    const targetGroups = getMatchingMechanismGroups(workType);
    const candidateText = `${candidate.work_type} ${candidate.equipment} ${candidate.hazard_type} ${candidate.related_work_types.join(' ')}`;
    const candidateGroups = getMatchingMechanismGroups(candidateText);
    const sharedGroups = targetGroups.filter((g) => candidateGroups.includes(g));

    if (sharedGroups.length > 0) {
      score += sharedGroups.length * 28;
      reasons.push(sharedGroups[0]);
    }

    const targetTokens = tokenizeKorean(workType);
    const candidateTokens = tokenizeKorean(candidateText);
    const tokenHits = targetTokens.filter((tok) =>
      candidateTokens.some((ct) => ct.includes(tok) || tok.includes(ct))
    );
    if (tokenHits.length > 0) {
      score += tokenHits.length * 10;
    }

    if (candidate.industry === industry) {
      score += 8;
    }
  }

  return {
    item: candidate,
    score,
    isExact,
    reason: reasons.length > 0 ? reasons.join(' · ') : '핵심 재해 메커니즘 유사 공정',
  };
}

function findCrossProcessCase(
  allCases: AccidentCase[],
  primary: AccidentCase,
  seed: number,
  recentRelatedIds: string[] = []
): AccidentCase | null {
  const candidates = allCases.filter((c) => c.id !== primary.id);
  if (candidates.length === 0) return null;

  const pGroups = getMatchingMechanismGroups(`${primary.work_type} ${primary.hazard_type}`);

  const scored = candidates.map((c) => {
    let score = 0;
    if (c.industry !== primary.industry) {
      score += 45;
    }
    if (c.hazard_type === primary.hazard_type) {
      score += 40;
    }
    if (
      primary.related_work_types.includes(c.work_type) ||
      c.related_work_types.includes(primary.work_type)
    ) {
      score += 35;
    }
    const cGroups = getMatchingMechanismGroups(`${c.work_type} ${c.hazard_type}`);
    const overlap = pGroups.filter((g) => cGroups.includes(g)).length;
    score += overlap * 18;

    return { item: c, score };
  });

  scored.sort((a, b) => b.score - a.score);
  const topScore = scored[0].score;
  const topPool = scored.filter((s) => s.score >= Math.max(topScore - 18, 25));

  if (topPool.length > 1) {
    const recentSet = new Set(recentRelatedIds);
    const freshPool = topPool.filter((s) => !recentSet.has(s.item.id));
    const pool = freshPool.length > 0 ? freshPool : topPool;
    return pool[Math.abs(seed) % pool.length].item;
  }

  return scored[0].item;
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
  isRegenerate: boolean,
  seed: number
): ScoredCase {
  if (pool.length <= 1) return pool[0];
  if (!isRegenerate) return pool[0];

  const recentSet = new Set(recentIds);
  const unseen = pool.filter((s) => !recentSet.has(s.item.id));
  const candidates = unseen.length > 0 ? unseen : pool.filter((s) => s.item.id !== recentIds[recentIds.length - 1]);
  const activePool = candidates.length > 0 ? candidates : pool;

  // Spread selection nicely across large DB pools (e.g. 1,000+ KOSHA cases)
  const mixedIndex = Math.abs(seed * 73 + activePool.length * 19) % activePool.length;
  return activePool[mixedIndex];
}

export function generateEducationMaterial(params: {
  allCases: AccidentCase[];
  industry: IndustryType;
  workType: string;
  variationOption: VariationOption;
  includeCrossProcess: boolean;
  history: GenerationHistoryState;
  isRegenerate: boolean;
  preservePrimaryCase?: boolean;
}): { material: GeneratedMaterial; nextHistory: GenerationHistoryState } {
  const {
    allCases,
    industry,
    workType,
    variationOption,
    includeCrossProcess,
    history,
    isRegenerate,
    preservePrimaryCase = false,
  } = params;

  const shouldPreserve = preservePrimaryCase && !isRegenerate;
  const nextVersion =
    shouldPreserve && history.version > 0 ? history.version : history.version + 1;
  const seedHash = nextVersion * 37 + workType.length * 13 + industry.length * 7;

  // 1. Score all cases across the full loaded DB
  const scored = allCases
    .map((c) => scoreCaseMatch(c, industry, workType))
    .sort((a, b) => b.score - a.score);

  const exactMatches = scored.filter((s) => s.isExact);
  const recentPrimary =
    history.recentPrimaryIds ?? (history.lastPrimaryCaseId ? [history.lastPrimaryCaseId] : []);
  const recentRelated =
    history.recentRelatedIds ?? (history.lastRelatedCaseId ? [history.lastRelatedCaseId] : []);

  const preservedPrimary =
    shouldPreserve && history.lastPrimaryCaseId
      ? scored.find((s) => s.item.id === history.lastPrimaryCaseId)
      : undefined;

  let chosen: ScoredCase;

  if (preservedPrimary) {
    chosen = preservedPrimary;
  } else if (exactMatches.length > 0) {
    // Prefer exact industry + work_type matches first when available
    const exactSameIndustry = exactMatches.filter((s) => s.item.industry === industry);
    const primaryPool = exactSameIndustry.length > 0 ? exactSameIndustry : exactMatches;
    chosen = pickCaseFromPool(primaryPool, recentPrimary, isRegenerate, seedHash);
  } else {
    const bestScore = scored[0]?.score ?? 0;
    const topSimilar = scored.filter((s) => s.score >= Math.max(bestScore - 20, 10));
    chosen = pickCaseFromPool(topSimilar, recentPrimary, isRegenerate, seedHash);
  }

  // 2. Perspective mode (Section 02 content mode)
  let perspectiveMode: PerspectiveMode;
  if (variationOption === 'auto') {
    perspectiveMode =
      shouldPreserve && history.lastMode
        ? history.lastMode
        : pickNextNonRepeating(ALL_MODES, history.lastMode, seedHash);
  } else {
    perspectiveMode = variationOption;
  }

  // 3. Header/Visual style (never scrambles 01-02-03-04 section order)
  const layoutStyle: LayoutStyleId =
    shouldPreserve && history.lastLayoutId
      ? history.lastLayoutId
      : pickNextNonRepeating(
          ALL_LAYOUTS,
          isRegenerate ? history.lastLayoutId : undefined,
          seedHash + 1
        );

  // 4. Safety color theme
  const nativeThemeId = getNativeThemeForHazard(chosen.item.hazard_type);
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
    const preservedRelated =
      shouldPreserve && history.lastRelatedCaseId
        ? allCases.find(
            (c) => c.id === history.lastRelatedCaseId && c.id !== chosen.item.id
          ) ?? null
        : null;
    relatedCase =
      preservedRelated ??
      findCrossProcessCase(
        allCases,
        chosen.item,
        seedHash + nextVersion * 11,
        isRegenerate ? recentRelated : []
      );
  }

  const nextRecentPrimary =
    recentPrimary[recentPrimary.length - 1] === chosen.item.id
      ? recentPrimary
      : [...recentPrimary.slice(-24), chosen.item.id];
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
      lastRelatedCaseId: relatedCase?.id,
      recentPrimaryIds: nextRecentPrimary,
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

/**
 * Hydrates both `kosha-lite-v1` template-compressed DB payloads
 * (`{ format: "kosha-lite-v1", templates: {...}, cases: [...] }`)
 * AND standard JSON arrays (`[...]`) into normalized AccidentCase records.
 * Preserves exact `hazard_type` strings verbatim without overwriting.
 */
export function parseCasesData(
  parsed: unknown,
  source: 'builtin' | 'custom' = 'custom'
): { cases: AccidentCase[]; error?: string; isLiteFormat: boolean } {
  const rootObj =
    parsed && typeof parsed === 'object' && !Array.isArray(parsed)
      ? (parsed as Record<string, unknown>)
      : null;

  const isLiteFormat = Boolean(
    rootObj &&
      (rootObj.format === 'kosha-lite-v1' ||
        (rootObj.templates && typeof rootObj.templates === 'object' && Array.isArray(rootObj.cases)))
  );

  const templatesMap: Record<string, Record<string, unknown>> =
    rootObj && rootObj.templates && typeof rootObj.templates === 'object'
      ? (rootObj.templates as Record<string, Record<string, unknown>>)
      : {};

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

  const validIndustries: IndustryType[] = ['건설현장', '제조업', '서비스업'];
  const normalized: AccidentCase[] = [];

  for (let i = 0; i < list.length; i++) {
    const entry = list[i] as Record<string, unknown>;
    if (!entry || typeof entry !== 'object') continue;

    // Resolve kosha-lite-v1 template by `t` key (or template / template_key)
    const tplKeyRaw = entry.t ?? entry.template ?? entry.template_key;
    const tpl: Record<string, unknown> =
      tplKeyRaw !== undefined && tplKeyRaw !== null && templatesMap[String(tplKeyRaw)]
        ? templatesMap[String(tplKeyRaw)]
        : {};

    const title = pickString(entry.title, tpl.title, '');
    const workType = pickString(entry.work_type, tpl.work_type, '');
    if (!title || !workType) continue;

    const rawIndustry = pickString(entry.industry, tpl.industry, '건설현장');
    const industry: IndustryType = validIndustries.includes(rawIndustry as IndustryType)
      ? (rawIndustry as IndustryType)
      : '건설현장';

    // Preserve exact hazard_type string verbatim (never overwrite with '떨어짐')
    const hazardType: HazardType = pickString(entry.hazard_type, tpl.hazard_type, '중대재해');

    const summaryRaw = pickStringArray(entry.summary_3lines, tpl.summary_3lines);
    const summary_3lines: [string, string, string] = [
      summaryRaw[0] || `${workType} 수행 중 위험요인 노출로 사고가 발생함.`,
      summaryRaw[1] || '사전 안전조치 및 방호설비 미비 상태에서 작업이 진행됨.',
      summaryRaw[2] || '동종 재해 예방을 위해 핵심 안전수칙 준수가 필수적임.',
    ];

    const directRaw = pickStringArray(entry.direct_causes, tpl.direct_causes);
    const rootRaw = pickStringArray(entry.root_causes, tpl.root_causes);
    const prevRaw = pickStringArray(entry.preventive_measures, tpl.preventive_measures);
    const tbmRaw = pickStringArray(entry.tbm_checklist, tpl.tbm_checklist);

    const preventive_measures: [string, string, string, string] = [
      prevRaw[0] || '작업 전 설비·방호장치 이상 유무 필수 점검 및 보완',
      prevRaw[1] || '위험구역 출입 통제 및 2인 1조 안전작업 실시',
      prevRaw[2] || '작업 특성에 맞는 개인보호구 올바른 착용 확인',
      prevRaw[3] || '작업 중 이상 징후 발견 시 즉시 작업중지 및 보고',
    ];

    // Hydrate timeline: if empty, auto-build 4-stage timeline from summary_3lines + preventive_measures[0]
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
    } else {
      timeline = [
        { step: '1단계', label: '작업 상황', detail: summary_3lines[0] },
        { step: '2단계', label: '위험 요인', detail: summary_3lines[1] },
        { step: '3단계', label: '사고 발생', detail: summary_3lines[2] },
        { step: '4단계', label: '골든타임 예방', detail: preventive_measures[0] },
      ];
    }

    // Hydrate O/X comparisons (merge from template if case omits)
    const oxRaw =
      Array.isArray(entry.ox_comparison) && entry.ox_comparison.length > 0
        ? entry.ox_comparison
        : Array.isArray(tpl.ox_comparison) && tpl.ox_comparison.length > 0
          ? tpl.ox_comparison
          : [];

    const ox_comparison: [OXComparisonPair, OXComparisonPair] = [
      normalizeOxPair(oxRaw[0]),
      normalizeOxPair(oxRaw[1] ?? oxRaw[0]),
    ];

    // Hydrate KYT quiz: if empty, auto-build in memory from title + top 3 preventive measures
    const rawKyt =
      entry.kyt_quiz && typeof entry.kyt_quiz === 'object'
        ? (entry.kyt_quiz as Record<string, unknown>)
        : tpl.kyt_quiz && typeof tpl.kyt_quiz === 'object'
          ? (tpl.kyt_quiz as Record<string, unknown>)
          : null;

    const rawKytAns = rawKyt && Array.isArray(rawKyt.answers)
      ? rawKyt.answers.map((a) => String(a ?? '').trim()).filter(Boolean)
      : [];

    const kytQuestion =
      rawKyt && typeof rawKyt.question === 'string' && rawKyt.question.trim()
        ? rawKyt.question.trim()
        : `“${title}” 유사 작업 시작 전, 반드시 점검해야 할 핵심 안전조치 3가지는?`;

    const kyt_quiz = {
      question: kytQuestion,
      answers: [
        rawKytAns[0] || preventive_measures[0],
        rawKytAns[1] || preventive_measures[1],
        rawKytAns[2] || preventive_measures[2],
      ] as [string, string, string],
    };

    const relatedWorkTypes = pickStringArray(entry.related_work_types, tpl.related_work_types);

    normalized.push({
      id: String(entry.id || `KOSHA-${i + 1}`),
      industry,
      work_type: workType,
      equipment: pickString(entry.equipment, tpl.equipment, '현장 작업 설비 및 기구'),
      hazard_type: hazardType,
      title,
      summary_3lines,
      timeline,
      direct_causes: [
        directRaw[0] || '작업 전 핵심 방호장치 및 안전설비 미설치',
        directRaw[1] || '표준 안전작업절차 미준수 및 위험구역 접근',
        directRaw[2] || '필수 개인보호구 미착용 또는 체결 불량',
      ],
      root_causes: [
        rootRaw[0] || '작업 전 위험성평가 및 작업계획서 현장 이행 확인 미흡',
        rootRaw[1] || '비정형·고위험 작업 관리감독 및 작업 전 TBM 교육 부족',
      ],
      preventive_measures,
      tbm_checklist: [
        tbmRaw[0] || '작업 전 위험요인과 안전대책을 팀원 모두가 공유했는가?',
        tbmRaw[1] || '방호장치·안전설비·출입통제 조치가 완료되었는가?',
        tbmRaw[2] || '필수 개인보호구를 올바르게 착용했는가?',
        tbmRaw[3] || '비상정지장치 및 응급 대피 경로를 확인했는가?',
        tbmRaw[4] || '이상 발생 시 즉시 작업을 멈추고 보고할 체계가 확인되었는가?',
      ],
      ox_comparison,
      kyt_quiz,
      worker_slogan: pickString(
        entry.worker_slogan,
        tpl.worker_slogan,
        '안전조치 확인 전 작업 시작 금지! 원칙이 생명을 지킨다!'
      ),
      legal_ref: pickString(
        entry.legal_ref,
        tpl.legal_ref,
        '산업안전보건기준에 관한 규칙 관련 조항 준수'
      ),
      related_work_types: relatedWorkTypes,
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

/**
 * Safely parses raw JSON text from user upload or static DB fetch.
 */
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
