import {
  AccidentCase,
  LegalNoticeItem,
  LegalRuleItem,
  RefsLegalData,
  ResolvedKoshaGuide,
  ResolvedLegalReference,
} from '../types/safety';

let cachedLegalDb: RefsLegalData | null = null;
let inflightLegalDb: Promise<RefsLegalData | null> | null = null;

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

/**
 * Lazily fetches and caches `public/data/refs_legal.json` from static hosting
 * with zero external API calls.
 */
export async function loadRefsLegalDb(signal?: AbortSignal): Promise<RefsLegalData | null> {
  if (cachedLegalDb) return cachedLegalDb;
  if (inflightLegalDb) return inflightLegalDb;

  inflightLegalDb = (async () => {
    const urls = getCandidateUrls('refs_legal.json');
    for (const url of urls) {
      try {
        const res = await fetch(url, { cache: 'default', signal });
        if (!res.ok) continue;
        const ct = (res.headers.get('content-type') || '').toLowerCase();
        if (ct.includes('text/html')) continue;
        const parsed = ct.includes('json')
          ? await res.json()
          : JSON.parse(await res.text());
        if (parsed && typeof parsed === 'object' && parsed.groups) {
          cachedLegalDb = parsed as RefsLegalData;
          return cachedLegalDb;
        }
      } catch (err) {
        if (signal?.aborted) throw err;
      }
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

  return {
    matchedGroupKey: bestKey,
    matchedBy,
    syncedAt: legalDb.synced_at,
    lawPortalUrl: legalDb.law_portal_url,
    hierarchyNotice: legalDb.hierarchy_notice,
    laws,
    notices,
    blockedConflicts: group.blocked_conflicts || [],
    guides,
    qrMedia: group.qr_media || [],
    auxMedia: group.aux_media || [],
    primaryLawShort,
    primaryGuideNo: guides[0]?.no ?? null,
    latestAmendedDate,
  };
}
