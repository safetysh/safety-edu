import {
  AccidentCase,
  GeneratedMaterial,
  HazardType,
  IndustryType,
  LAYOUT_LABELS,
  LayoutStyleId,
  PERSPECTIVE_LABELS,
  PerspectiveMode,
  SAFETY_THEMES,
  SafetyThemeConfig,
  SafetyThemeId,
  VariationOption,
} from '../types/safety';

export interface GenerationHistoryState {
  version: number;
  lastMode?: PerspectiveMode;
  lastThemeId?: SafetyThemeId;
  lastLayoutId?: LayoutStyleId;
  lastPrimaryCaseId?: string;
  lastRelatedCaseId?: string;
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
  lastRelatedId?: string
): AccidentCase | null {
  const candidates = allCases.filter((c) => c.id !== primary.id);
  if (candidates.length === 0) return null;

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
    const pGroups = getMatchingMechanismGroups(`${primary.work_type} ${primary.hazard_type}`);
    const cGroups = getMatchingMechanismGroups(`${c.work_type} ${c.hazard_type}`);
    const overlap = pGroups.filter((g) => cGroups.includes(g)).length;
    score += overlap * 18;

    return { item: c, score };
  });

  scored.sort((a, b) => b.score - a.score);
  const topScore = scored[0].score;
  const topPool = scored.filter((s) => s.score >= Math.max(topScore - 18, 25));

  if (topPool.length > 1 && lastRelatedId) {
    const nonRepeating = topPool.filter((s) => s.item.id !== lastRelatedId);
    if (nonRepeating.length > 0) {
      return nonRepeating[0].item;
    }
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

export function generateEducationMaterial(params: {
  allCases: AccidentCase[];
  industry: IndustryType;
  workType: string;
  variationOption: VariationOption;
  includeCrossProcess: boolean;
  history: GenerationHistoryState;
  isRegenerate: boolean;
}): { material: GeneratedMaterial; nextHistory: GenerationHistoryState } {
  const {
    allCases,
    industry,
    workType,
    variationOption,
    includeCrossProcess,
    history,
    isRegenerate,
  } = params;

  const nextVersion = history.version + 1;
  const seedHash = nextVersion * 37 + workType.length * 13 + industry.length * 7;

  // 1. Score all cases
  const scored = allCases
    .map((c) => scoreCaseMatch(c, industry, workType))
    .sort((a, b) => b.score - a.score);

  const exactMatches = scored.filter((s) => s.isExact);
  let chosen: ScoredCase;

  if (exactMatches.length > 0) {
    if (exactMatches.length > 1 && isRegenerate && history.lastPrimaryCaseId) {
      const others = exactMatches.filter((s) => s.item.id !== history.lastPrimaryCaseId);
      chosen = others[seedHash % others.length] ?? exactMatches[0];
    } else {
      chosen = exactMatches[0];
    }
  } else {
    const bestScore = scored[0]?.score ?? 0;
    const topSimilar = scored.filter((s) => s.score >= Math.max(bestScore - 20, 10));
    if (topSimilar.length > 1 && isRegenerate && history.lastPrimaryCaseId) {
      const others = topSimilar.filter((s) => s.item.id !== history.lastPrimaryCaseId);
      chosen = others[seedHash % others.length] ?? topSimilar[0];
    } else {
      chosen = scored[0];
    }
  }

  // 2. Perspective mode (Section 02 content mode)
  let perspectiveMode: PerspectiveMode;
  if (variationOption === 'auto') {
    perspectiveMode = pickNextNonRepeating(ALL_MODES, history.lastMode, seedHash);
  } else {
    perspectiveMode = variationOption;
  }

  // 3. Header/Visual style (never scrambles 01-02-03 section order)
  const layoutStyle = pickNextNonRepeating(
    ALL_LAYOUTS,
    isRegenerate ? history.lastLayoutId : undefined,
    seedHash + 1
  );

  // 4. Safety color theme
  const nativeThemeId = getNativeThemeForHazard(chosen.item.hazard_type);
  let themeId: SafetyThemeId;
  if (!isRegenerate) {
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
  const relatedCase = includeCrossProcess
    ? findCrossProcessCase(allCases, chosen.item, isRegenerate ? history.lastRelatedCaseId : undefined)
    : null;

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
    },
  };
}

/**
 * Safely parses and normalizes user-uploaded JSON accident cases.
 * Preserves the exact `hazard_type` string verbatim without overwriting unrecognized values.
 */
export function parseUploadedCasesJson(rawText: string): {
  cases: AccidentCase[];
  error?: string;
} {
  try {
    const parsed = JSON.parse(rawText);
    const list: unknown[] = Array.isArray(parsed)
      ? parsed
      : Array.isArray(parsed?.cases)
        ? parsed.cases
        : [parsed];

    if (!list.length) {
      return { cases: [], error: 'JSON 파일에 사고사례 데이터가 비어 있습니다.' };
    }

    const validIndustries: IndustryType[] = ['건설현장', '제조업', '서비스업'];

    const normalized: AccidentCase[] = [];

    for (let i = 0; i < list.length; i++) {
      const entry = list[i] as Record<string, unknown>;
      if (!entry || typeof entry !== 'object') continue;
      if (typeof entry.title !== 'string' || !entry.title.trim()) continue;
      if (typeof entry.work_type !== 'string' || !entry.work_type.trim()) continue;

      const industry: IndustryType = validIndustries.includes(entry.industry as IndustryType)
        ? (entry.industry as IndustryType)
        : '건설현장';

      // Preserve exact hazard_type string from JSON DB verbatim (never overwrite with '떨어짐')
      const rawHazard = typeof entry.hazard_type === 'string' ? entry.hazard_type.trim() : '';
      const hazardType: HazardType = rawHazard || '중대재해';

      const summaryRaw = Array.isArray(entry.summary_3lines)
        ? entry.summary_3lines.map((s) => String(s).trim()).filter(Boolean)
        : [];
      const summary_3lines: [string, string, string] = [
        summaryRaw[0] || `${entry.work_type} 수행 중 위험요인 노출로 사고가 발생함.`,
        summaryRaw[1] || '사전 안전조치 및 방호설비 미비 상태에서 작업이 진행됨.',
        summaryRaw[2] || '동종 재해 예방을 위해 핵심 안전수칙 준수가 필수적임.',
      ];

      const timelineRaw = Array.isArray(entry.timeline) ? entry.timeline : [];
      const makeStep = (idx: number) => {
        const raw = timelineRaw[idx];
        if (raw && typeof raw === 'object') {
          const obj = raw as Record<string, unknown>;
          return {
            step: String(obj.step || `${idx + 1}단계`),
            label: String(
              obj.label || ['작업 준비', '위험 노출', '사고 발생', '골든타임 예방'][idx]
            ),
            detail: String(obj.detail || ''),
          };
        }
        return {
          step: `${idx + 1}단계`,
          label: ['작업 준비', '위험 노출', '사고 발생', '골든타임 예방'][idx],
          detail: typeof raw === 'string' ? raw : summary_3lines[Math.min(idx, 2)],
        };
      };

      const directRaw = Array.isArray(entry.direct_causes) ? entry.direct_causes.map(String) : [];
      const rootRaw = Array.isArray(entry.root_causes) ? entry.root_causes.map(String) : [];
      const prevRaw = Array.isArray(entry.preventive_measures) ? entry.preventive_measures.map(String) : [];
      const tbmRaw = Array.isArray(entry.tbm_checklist) ? entry.tbm_checklist.map(String) : [];

      const oxRaw = Array.isArray(entry.ox_comparison) ? entry.ox_comparison : [];
      const makeOx = (idx: number) => {
        const raw = oxRaw[idx] as Record<string, unknown> | undefined;
        return {
          wrong: String(raw?.wrong || raw?.x || raw?.practice || '편의 위주로 안전절차를 생략하고 작업한다.'),
          right: String(raw?.right || raw?.o || raw?.principle || '사전 안전점검과 방호조치 완료 후 작업을 시작한다.'),
          note: String(raw?.note || raw?.reason || '안전수칙 생략은 중대재해로 직결됩니다.'),
        };
      };

      const kytObj = (entry.kyt_quiz && typeof entry.kyt_quiz === 'object'
        ? entry.kyt_quiz
        : {}) as Record<string, unknown>;
      const kytAns = Array.isArray(kytObj.answers) ? kytObj.answers.map(String) : [];

      normalized.push({
        id: String(entry.id || `USR-${Date.now()}-${i + 1}`),
        industry,
        work_type: entry.work_type.trim(),
        equipment: String(entry.equipment || '현장 작업 설비 및 기구'),
        hazard_type: hazardType,
        title: entry.title.trim(),
        summary_3lines,
        timeline: [makeStep(0), makeStep(1), makeStep(2), makeStep(3)],
        direct_causes: [
          directRaw[0] || '작업 전 핵심 방호장치 및 안전설비 미설치',
          directRaw[1] || '표준 안전작업절차 미준수 및 위험구역 접근',
          directRaw[2] || '필수 개인보호구 미착용 또는 체결 불량',
        ],
        root_causes: [
          rootRaw[0] || '작업 전 위험성평가 및 작업계획서 현장 이행 확인 미흡',
          rootRaw[1] || '비정형·고위험 작업 관리감독 및 작업 전 TBM 교육 부족',
        ],
        preventive_measures: [
          prevRaw[0] || '작업 전 설비·방호장치 이상 유무 필수 점검 및 보완',
          prevRaw[1] || '위험구역 출입 통제 및 2인 1조 안전작업 실시',
          prevRaw[2] || '작업 특성에 맞는 개인보호구 올바른 착용 확인',
          prevRaw[3] || '작업 중 이상 징후 발견 시 즉시 작업중지 및 보고',
        ],
        tbm_checklist: [
          tbmRaw[0] || '작업 전 위험요인과 안전대책을 팀원 모두가 공유했는가?',
          tbmRaw[1] || '방호장치·안전설비·출입통제 조치가 완료되었는가?',
          tbmRaw[2] || '필수 개인보호구를 올바르게 착용했는가?',
          tbmRaw[3] || '비상정지장치 및 응급 대피 경로를 확인했는가?',
          tbmRaw[4] || '이상 발생 시 즉시 작업을 멈추고 보고할 체계가 확인되었는가?',
        ],
        ox_comparison: [makeOx(0), makeOx(1)],
        kyt_quiz: {
          question: String(
            kytObj.question || `${entry.work_type} 시작 전 반드시 확인해야 할 핵심 안전조치 3가지는?`
          ),
          answers: [
            kytAns[0] || prevRaw[0] || '방호장치 및 안전설비 정상 작동 여부 확인',
            kytAns[1] || prevRaw[1] || '위험구역 통제 및 표준 작업절차 준수',
            kytAns[2] || prevRaw[2] || '필수 개인보호구 착용 및 2인 1조 점검',
          ],
        },
        worker_slogan: String(
          entry.worker_slogan || '안전조치 확인 전 작업 시작 금지! 원칙이 생명을 지킨다!'
        ),
        legal_ref: String(
          entry.legal_ref || '산업안전보건기준에 관한 규칙 관련 조항 준수'
        ),
        related_work_types: Array.isArray(entry.related_work_types)
          ? entry.related_work_types.map(String)
          : [],
        source: 'custom',
      });
    }

    if (normalized.length === 0) {
      return {
        cases: [],
        error: '유효한 사고사례 항목을 찾지 못했습니다. title, work_type 필드를 확인해 주세요.',
      };
    }

    return { cases: normalized };
  } catch {
    return {
      cases: [],
      error: 'JSON 형식이 올바르지 않습니다. UTF-8 JSON 파일인지 확인해 주세요.',
    };
  }
}
