import {
  AccidentCase,
  ForeignLanguageCode,
  KoshaMediaItem,
  LegalNoticeItem,
  LegalRuleItem,
  MediaLangCode,
  RefsLegalData,
  RefsMediaI18nData,
  ResolvedKoshaGuide,
  ResolvedLegalReference,
} from '../types/safety';

let cachedLegalDb: RefsLegalData | null = null;
let inflightLegalDb: Promise<RefsLegalData | null> | null = null;

let cachedMediaI18nDb: RefsMediaI18nData | null = null;
let inflightMediaI18nDb: Promise<RefsMediaI18nData | null> | null = null;

function getCandidateUrls(fileName: string): string[] {
  const candidates: string[] = [`${import.meta.env.BASE_URL}data/${fileName}`];

  if (typeof window !== 'undefined' && window.location?.pathname) {
    const cleanPath = window.location.pathname
      .replace(/\/index\.html$/i, '')
      .replace(/\/+$/, '');
    const pathRelative = `${cleanPath}/data/${fileName}`;
    if (!candidates.includes(pathRelative)) {
      candidates.push(pathRelative);
    }
    const rootRelative = `/data/${fileName}`;
    if (!candidates.includes(rootRelative)) {
      candidates.push(rootRelative);
    }
  }

  return candidates;
}

async function fetchStaticJson<T>(fileName: string, signal?: AbortSignal): Promise<T | null> {
  const urls = getCandidateUrls(fileName);
  for (const url of urls) {
    try {
      const res = await fetch(url, { cache: 'default', signal });
      if (!res.ok) continue;
      const ct = (res.headers.get('content-type') || '').toLowerCase();
      if (ct.includes('text/html')) continue;
      const parsed = ct.includes('json')
        ? await res.json()
        : JSON.parse(await res.text());
      if (parsed && typeof parsed === 'object') {
        return parsed as T;
      }
    } catch (err) {
      if (signal?.aborted) throw err;
    }
  }
  return null;
}

/**
 * Lazily fetches and caches `public/data/refs_legal.json` from static hosting
 * with zero external API calls.
 */
export async function loadRefsLegalDb(signal?: AbortSignal): Promise<RefsLegalData | null> {
  if (cachedLegalDb) return cachedLegalDb;
  if (inflightLegalDb) return inflightLegalDb;

  inflightLegalDb = (async () => {
    const parsed = await fetchStaticJson<RefsLegalData>('refs_legal.json', signal);
    if (parsed && parsed.groups) {
      cachedLegalDb = parsed;
      return cachedLegalDb;
    }
    return null;
  })();

  try {
    return await inflightLegalDb;
  } finally {
    inflightLegalDb = null;
  }
}

/**
 * Lazily fetches and caches `public/data/refs_media_i18n.json` ONLY when foreign-language
 * bilingual mode is active (keeps Korean-only initial load completely unaffected).
 */
export async function loadRefsMediaI18n(
  signal?: AbortSignal
): Promise<RefsMediaI18nData | null> {
  if (cachedMediaI18nDb) return cachedMediaI18nDb;
  if (inflightMediaI18nDb) return inflightMediaI18nDb;

  inflightMediaI18nDb = (async () => {
    const parsed = await fetchStaticJson<RefsMediaI18nData>('refs_media_i18n.json', signal);
    if (parsed && parsed.groups) {
      cachedMediaI18nDb = parsed;
      return cachedMediaI18nDb;
    }
    return null;
  })();

  try {
    return await inflightMediaI18nDb;
  } finally {
    inflightMediaI18nDb = null;
  }
}

export function getCachedRefsMediaI18n(): RefsMediaI18nData | null {
  return cachedMediaI18nDb;
}

// =========================================================================
// Client-side Defense-in-Depth Media Language Classifier, Dedup & Selection
// (Single source of truth shared by Page 2 Appendix, Reference Drawer, PPTX)
// =========================================================================

const CLIENT_LANG_PATTERNS: Array<[Exclude<MediaLangCode, 'ko' | 'multi' | 'other_foreign'>, RegExp]> = [
  ['en', /(?:^|[^가-힣])(?:영어|영문)(?:$|[^가-힣])|\benglish\b/i],
  ['vi', /베트남어?|vietnam(?:ese)?/i],
  ['zh', /중국어?|중문|chinese/i],
  ['th', /태국어?|\bthai\b/i],
  ['km', /캄보디아어?|크메르어?|khmer|cambodia/i],
  ['uz', /우즈베키스탄|우즈베크어?|우즈벡어?|uzbek/i],
];

const CLIENT_MULTI_RE = /\d+\s*개국어|다국어|논버벌|non-?verbal/i;

const CLIENT_OTHER_FOREIGN_RE =
  /필리핀어?|타갈로그|키르기스스탄|키르기스어?|파키스탄어?|우르두어?|인도네시아어?|네팔어?|미얀마어?|스리랑카어?|싱할라어?|몽골어?|방글라데시어?|벵골어?|동티모르어?|라오스어?|러시아어?|카자흐스탄|카자흐어?|일본어|일어판|\b(?:tagalog|kyrgyz|pakistan|urdu|indonesia|nepal|myanmar|sri\s*lanka|mongol|bangladesh|timor|laos|russian|kazakh)\b/i;

export function inferMediaLang(item: KoshaMediaItem): MediaLangCode {
  if (item.lang) return item.lang;
  const t = (item.title || '').trim();
  for (const [code, re] of CLIENT_LANG_PATTERNS) {
    if (re.test(t)) return code;
  }
  if (CLIENT_MULTI_RE.test(t)) return 'multi';
  if (CLIENT_OTHER_FOREIGN_RE.test(t)) return 'other_foreign';
  return 'ko';
}

function getMediaStyleGroup(style: string): string {
  switch (style) {
    case '동영상':
    case '애니메이션':
      return 'video';
    case 'OPS':
      return 'ops';
    case '포스터':
      return 'poster';
    case '리플릿':
      return 'leaflet';
    case '교안(PPT)':
      return 'ppt';
    case '책자':
      return 'book';
    default:
      return style;
  }
}

function normalizeMediaTitleForDedup(title: string): string {
  return (title || '')
    .trim()
    .replace(/,\s*[A-Za-z][A-Za-z0-9\s()\-/:.,'"&]+$/, '')
    .replace(/\(\s*\d+\s*개국어\s*\)/g, '')
    .replace(
      /^\s*[([](?:동영상|OPS|OPL|포스터|리플릿|리플렛|애니메이션|근로자용|논버벌|안전보건포스터|중대재해사례\s*OPL|Quick\s*Message|한\s*눈에\s*보는|이지애의\s*안전있수다|이수지의\s*괜찮으시겠어요\?|[^)\]]*(?:어|스탄|필리핀|베트남|중국|태국|캄보디아|우즈벡|네팔|몽골|미얀마|라오스|러시아|인도네시아|스리랑카|방글라데시|동티모르|영문|영어))[^)\]]*[)\]]\s*/i,
      ''
    )
    .replace(/\(\s*(?:네팔어|베트남어|중국어|태국어|영어|우즈벡어|캄보디아어|리플릿|리플렛|포스터|동영상)\s*\)\s*$/i, '')
    .replace(/[\s·\-_/()[\]『』「」'",.:!?]+/g, '')
    .toLowerCase();
}

const COMPACT_STYLE_LABELS: Record<string, string> = {
  동영상: '영상',
  애니메이션: '애니',
  OPS: 'OPS',
  포스터: '포스터',
  리플릿: '리플릿',
  '교안(PPT)': 'PPT',
  책자: '책자',
};

const COMPACT_LANG_LABELS: Record<MediaLangCode, string> = {
  ko: '한국어',
  en: '영어',
  vi: '베트남',
  zh: '중국',
  th: '태국',
  km: '캄보디아',
  uz: '우즈벡',
  multi: '다국어',
  other_foreign: '외국어',
};

/**
 * Formats QR card top badge strictly as 1 single line (`whitespace-nowrap` safe):
 * - Korean-only mode (`none`): preserves original clean `공단 동영상`, `공단 OPS` style.
 * - Foreign bilingual mode: compact `영상 · 베트남`, `애니 · 우즈벡`, `OPS · 한국어`, `영상 · 다국어`.
 */
export function formatMediaQrBadgeLabel(
  item: KoshaMediaItem,
  foreignLanguage: ForeignLanguageCode
): string {
  if (foreignLanguage === 'none') {
    return `공단 ${item.media_style}`;
  }
  const styleShort = COMPACT_STYLE_LABELS[item.media_style] || item.media_style;
  const langShort = COMPACT_LANG_LABELS[inferMediaLang(item)] || '한국어';
  return `${styleShort} · ${langShort}`;
}

export function getForeignMediaSectionTitle(foreignLanguage: ForeignLanguageCode): string {
  if (foreignLanguage === 'none') return '';
  const langShort = COMPACT_LANG_LABELS[foreignLanguage] || foreignLanguage;
  return `선택 외국어(${langShort}) · 다국어 공단 공식 자료`;
}

export interface SelectedDisplayMedia {
  /** Final ordered QR items (length up to `maxCount`, 0 foreign in Korean-only mode, foreign-first in bilingual mode). */
  qrItems: KoshaMediaItem[];
  /** Foreign/multi items for Reference Drawer dedicated foreign section. */
  foreignItems: KoshaMediaItem[];
  /** Korean-only QR items for Reference Drawer main Korean section. */
  koItems: KoshaMediaItem[];
}

/**
 * Unified media selector shared by Page 2 Appendix (maxCount=4), PPTX Slide 6 (maxCount=3),
 * and Legal Reference Drawer.
 * - Korean-only (`none`): strictly `lang === 'ko'`, auto-supplemented by same-industry Korean fallbacks.
 * - Foreign bilingual (`en|vi|zh|th|km|uz`): prioritizes up to `min(2, maxCount - 1)` items in `selectedLang`
 *   (falling back to same-group `multi` packs if needed) + guarantees remaining slots filled with `ko`
 *   (e.g., maxCount=4 -> up to 2 foreign + >=2 Korean; maxCount=3 -> up to 2 foreign + >=1 Korean).
 * - Deduplicates clones by `(normalizedTitle + styleGroup + lang)` while preserving diverse formats.
 */
export function selectDisplayMediaForLanguage(
  legalRef: ResolvedLegalReference | null,
  mediaI18nDb: RefsMediaI18nData | null,
  foreignLanguage: ForeignLanguageCode,
  maxCount = 4
): SelectedDisplayMedia {
  if (!legalRef) {
    return { qrItems: [], foreignItems: [], koItems: [] };
  }

  const dedupPush = (
    target: KoshaMediaItem[],
    seenUrls: Set<string>,
    seenKeys: Set<string>,
    candidates: KoshaMediaItem[],
    limit: number,
    allowedLangs: Set<MediaLangCode>
  ) => {
    for (let i = 0; i < candidates.length; i++) {
      if (target.length >= limit) break;
      const item = candidates[i];
      if (!item || !item.url || seenUrls.has(item.url)) continue;
      const lang = inferMediaLang(item);
      if (!allowedLangs.has(lang)) continue;
      const normTitle = normalizeMediaTitleForDedup(item.title) || item.url;
      const dkey = `${normTitle}::${getMediaStyleGroup(item.media_style)}::${lang}`;
      if (seenKeys.has(dkey)) continue;
      seenUrls.add(item.url);
      seenKeys.add(dkey);
      target.push({ ...item, lang });
    }
  };

  // 1. Build clean Korean-only pool (group primary + same-industry fallback)
  const koList: KoshaMediaItem[] = [];
  const koSeenUrls = new Set<string>();
  const koSeenKeys = new Set<string>();
  const koAllowed = new Set<MediaLangCode>(['ko']);

  dedupPush(koList, koSeenUrls, koSeenKeys, legalRef.qrMedia || [], Math.max(4, maxCount), koAllowed);
  if (koList.length < Math.max(4, maxCount)) {
    dedupPush(
      koList,
      koSeenUrls,
      koSeenKeys,
      legalRef.industryFallbackKoMedia || [],
      Math.max(4, maxCount),
      koAllowed
    );
  }

  // Korean-only mode: strictly `lang === 'ko'` (0 foreign items)
  if (foreignLanguage === 'none') {
    return {
      qrItems: koList.slice(0, maxCount),
      foreignItems: [],
      koItems: koList,
    };
  }

  // 2. Foreign bilingual mode: collect selectedLang first, then same-group `multi` (16개국어/논버벌)
  const groupI18n = mediaI18nDb?.groups?.[legalRef.matchedGroupKey];
  const exactForeign = groupI18n?.[foreignLanguage] || [];
  const multiForeign = groupI18n?.multi || [];

  const foreignList: KoshaMediaItem[] = [];
  const fgSeenUrls = new Set<string>();
  const fgSeenKeys = new Set<string>();

  dedupPush(
    foreignList,
    fgSeenUrls,
    fgSeenKeys,
    exactForeign,
    3,
    new Set<MediaLangCode>([foreignLanguage])
  );
  if (foreignList.length < 2) {
    dedupPush(
      foreignList,
      fgSeenUrls,
      fgSeenKeys,
      multiForeign,
      3,
      new Set<MediaLangCode>(['multi'])
    );
  }

  // Reserve up to min(2, maxCount - 1) foreign slots so at least 1 Korean slot (2 on 4-slot Page 2) is guaranteed
  const maxForeignSlots = Math.min(2, Math.max(1, maxCount - 1));
  const combined: KoshaMediaItem[] = [];
  const combinedUrls = new Set<string>();

  for (const fItem of foreignList) {
    if (combined.length >= maxForeignSlots) break;
    if (!combinedUrls.has(fItem.url)) {
      combined.push(fItem);
      combinedUrls.add(fItem.url);
    }
  }

  for (const kItem of koList) {
    if (combined.length >= maxCount) break;
    if (!combinedUrls.has(kItem.url)) {
      combined.push(kItem);
      combinedUrls.add(kItem.url);
    }
  }

  return {
    qrItems: combined,
    foreignItems: foreignList,
    koItems: koList,
  };
}

/**
 * 2-Tier Dynamic Legal/Guide/Media Matcher:
 * - Priority 1: Active case equipment (`orgtNm` / `equipment`), hazard, title, high-risk work keyword match
 *               (guarantees 100% alignment even when user pins a different work-type case via Case Search)
 * - Priority 2: Case work_type or currently selected sidebar work_type fallback
 */
export function resolveLegalReferenceForCase(
  legalDb: RefsLegalData | null,
  primaryCase: AccidentCase,
  selectedWorkType: string
): ResolvedLegalReference | null {
  if (!legalDb || !legalDb.groups) return null;

  const groupKeys = Object.keys(legalDb.groups);
  if (groupKeys.length === 0) return null;

  const equipText = `${primaryCase.sif_meta?.orgtNm || ''} ${primaryCase.equipment || ''}`.toLowerCase();
  const titleHazardText = `${primaryCase.title || ''} ${primaryCase.hazard_type || ''} ${primaryCase.high_risk_work || ''}`.toLowerCase();

  let bestKey: string | null = null;
  let bestScore = 0;

  for (let i = 0; i < groupKeys.length; i++) {
    const key = groupKeys[i];
    const g = legalDb.groups[key];
    let score = 0;

    for (let k = 0; k < g.match_keywords.length; k++) {
      const kw = g.match_keywords[k].toLowerCase();
      if (!kw) continue;
      if (equipText.includes(kw)) {
        // Equipment / orgtNm match carries highest precision weight
        score += 36;
      } else if (titleHazardText.includes(kw)) {
        score += 18;
      }
    }

    if (score > 0 && g.industry === primaryCase.industry) {
      score += 8;
    }
    if (score > 0 && key === primaryCase.work_type) {
      score += 10;
    }

    if (score > bestScore) {
      bestScore = score;
      bestKey = key;
    }
  }

  let matchedBy: ResolvedLegalReference['matchedBy'] = 'case_keyword';

  if (!bestKey || bestScore < 18) {
    if (legalDb.groups[primaryCase.work_type]) {
      bestKey = primaryCase.work_type;
      matchedBy = 'case_worktype';
    } else if (legalDb.groups[selectedWorkType]) {
      bestKey = selectedWorkType;
      matchedBy = 'selected_worktype';
    } else {
      bestKey = groupKeys[0];
      matchedBy = 'selected_worktype';
    }
  }

  const group = legalDb.groups[bestKey];
  if (!group) return null;

  // Enforce strict 3-tier hierarchy: 1. Mandatory Rules (cat 4) > 2. Notices (cat 5) > 3. KOSHA GUIDE (voluntary)
  const laws: LegalRuleItem[] = group.law_ids
    .map((id) => legalDb.laws_by_id[id])
    .filter((item): item is LegalRuleItem => Boolean(item));

  const notices: LegalNoticeItem[] = group.notice_ids
    .map((id) => legalDb.notices_by_id[id])
    .filter((item): item is LegalNoticeItem => Boolean(item));

  const guides: ResolvedKoshaGuide[] = group.guides
    .map((ref) => {
      const base = legalDb.guides_by_no[ref.no];
      if (!base) return null;
      return {
        ...base,
        staleness_level: ref.staleness_level,
        staleness_note: ref.staleness_note,
      };
    })
    .filter((item): item is ResolvedKoshaGuide => Boolean(item));

  const latestAmendedDate = laws.reduce((acc, item) => {
    if (item.latest_amended_date && item.latest_amended_date > acc) {
      return item.latest_amended_date;
    }
    return acc;
  }, '');

  const primaryLawShort =
    laws.length >= 2
      ? `${laws[0].short_label} · ${laws[1].article_no}`
      : laws.length === 1
        ? laws[0].short_label
        : primaryCase.legal_ref;

  // Build same-industry Korean fallback pool (then cross-industry fallback) so sparse groups always fill 4 Korean QR slots
  const sameIndustryKo: KoshaMediaItem[] = [];
  const otherIndustryKo: KoshaMediaItem[] = [];
  for (let i = 0; i < groupKeys.length; i++) {
    const k = groupKeys[i];
    if (k === bestKey) continue;
    const otherGroup = legalDb.groups[k];
    const targetArr = otherGroup.industry === group.industry ? sameIndustryKo : otherIndustryKo;
    for (const m of otherGroup.qr_media || []) {
      if (inferMediaLang(m) === 'ko') {
        targetArr.push(m);
      }
    }
  }

  return {
    matchedGroupKey: bestKey,
    matchedIndustry: group.industry,
    matchedBy,
    syncedAt: legalDb.synced_at,
    lawPortalUrl: legalDb.law_portal_url,
    hierarchyNotice: legalDb.hierarchy_notice,
    laws,
    notices,
    blockedConflicts: group.blocked_conflicts || [],
    guides,
    qrMedia: (group.qr_media || []).filter((m) => inferMediaLang(m) === 'ko'),
    auxMedia: (group.aux_media || []).filter((m) => inferMediaLang(m) === 'ko'),
    industryFallbackKoMedia: [...sameIndustryKo, ...otherIndustryKo],
    primaryLawShort,
    primaryGuideNo: guides[0]?.no ?? null,
    latestAmendedDate,
  };
}
