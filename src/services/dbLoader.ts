import { SEED_ACCIDENT_CASES } from '../data/seedCases';
import { parseCasesData } from '../engine/generator';
import { AccidentCase, IndustryType, MetaSummaryData } from '../types/safety';

export const INDUSTRY_SHARD_FILENAME: Record<IndustryType, string> = {
  건설현장: 'db_con.json',
  제조업: 'db_mfg.json',
  서비스업: 'db_svc.json',
};

export const INDUSTRY_EXT_SHARD_FILENAME: Partial<Record<IndustryType, string>> = {
  건설현장: 'db_con_sif.json',
};

const shardCache = new Map<IndustryType, AccidentCase[]>();
const inflightShards = new Map<IndustryType, Promise<AccidentCase[]>>();
const extLoadedSet = new Set<IndustryType>();
const inflightExts = new Map<IndustryType, Promise<boolean>>();
let cachedMeta: MetaSummaryData | null = null;
let inflightMeta: Promise<MetaSummaryData | null> | null = null;

function getStaticDataCandidateUrls(fileName: string): string[] {
  const candidates: string[] = [
    `${import.meta.env.BASE_URL}data/${fileName}`,
  ];

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

async function fetchStaticJsonText(
  fileName: string,
  signal?: AbortSignal,
  cacheMode: RequestCache = 'default'
): Promise<string | null> {
  const urls = getStaticDataCandidateUrls(fileName);
  for (const url of urls) {
    try {
      const response = await fetch(url, {
        cache: cacheMode,
        signal,
      });
      if (!response.ok) continue;
      const raw = await response.text();
      if (!raw.trim() || raw.trimStart().startsWith('<')) continue;
      return raw;
    } catch (err) {
      if (signal?.aborted) throw err;
    }
  }
  return null;
}

/**
 * Loads `meta_summary.json` first on app mount (~9 KB) for instant source/industry counts
 * and latest fatality ticker headlines.
 */
export async function loadMetaSummary(signal?: AbortSignal): Promise<MetaSummaryData | null> {
  if (cachedMeta) return cachedMeta;
  if (inflightMeta) return inflightMeta;

  inflightMeta = (async () => {
    try {
      const raw = await fetchStaticJsonText('meta_summary.json', signal, 'no-cache');
      if (!raw) return null;
      const parsed = JSON.parse(raw) as MetaSummaryData;
      cachedMeta = parsed;
      return parsed;
    } catch {
      return null;
    } finally {
      inflightMeta = null;
    }
  })();

  return inflightMeta;
}

/**
 * Lazily fetches and caches a single industry core shard (`db_con.json`, `db_mfg.json`, or `db_svc.json`),
 * merging the matching built-in seed cases (with 6-language dedicated translations) at the front.
 */
export async function loadIndustryShard(
  industry: IndustryType,
  signal?: AbortSignal
): Promise<AccidentCase[]> {
  const hit = shardCache.get(industry);
  if (hit) return hit;

  const inflight = inflightShards.get(industry);
  if (inflight) return inflight;

  const promise = (async () => {
    const seedForIndustry = SEED_ACCIDENT_CASES.filter((c) => c.industry === industry).map((c) => ({
      ...c,
      source_type: c.source_type ?? 'CASE',
      facts_locked: true,
      source_ref: c.source_ref ?? '한국산업안전보건공단 중대재해 대표 표준사례',
    }));

    try {
      const shardFile = INDUSTRY_SHARD_FILENAME[industry];
      const rawText = await fetchStaticJsonText(shardFile, signal, 'default');
      if (!rawText) {
        return seedForIndustry;
      }

      const parsedJson = JSON.parse(rawText);
      const { cases: hydrated } = parseCasesData(parsedJson, 'builtin');
      if (hydrated.length === 0) {
        return seedForIndustry;
      }

      const mergedMap = new Map<string, AccidentCase>();
      for (const s of seedForIndustry) mergedMap.set(s.id, s);
      for (const h of hydrated) mergedMap.set(h.id, h);

      const merged = Array.from(mergedMap.values());
      shardCache.set(industry, merged);
      return merged;
    } catch {
      return seedForIndustry;
    } finally {
      inflightShards.delete(industry);
    }
  })();

  inflightShards.set(industry, promise);
  return promise;
}

/**
 * Quietly loads and merges an industry's background extension archive (e.g. `db_con_sif.json`)
 * after initial core render, returning true if new cases were merged.
 */
export async function loadIndustryExtension(
  industry: IndustryType,
  signal?: AbortSignal
): Promise<boolean> {
  const extFile = INDUSTRY_EXT_SHARD_FILENAME[industry];
  if (!extFile || extLoadedSet.has(industry)) return false;

  const inflight = inflightExts.get(industry);
  if (inflight) return inflight;

  const promise = (async () => {
    try {
      const rawText = await fetchStaticJsonText(extFile, signal, 'default');
      if (!rawText) return false;

      const parsedJson = JSON.parse(rawText);
      const { cases: hydrated } = parseCasesData(parsedJson, 'builtin');
      if (hydrated.length === 0) return false;

      const existing = shardCache.get(industry) ?? [];
      const mergedMap = new Map<string, AccidentCase>();
      for (const c of existing) mergedMap.set(c.id, c);
      for (const h of hydrated) {
        if (!mergedMap.has(h.id)) mergedMap.set(h.id, h);
      }

      shardCache.set(industry, Array.from(mergedMap.values()));
      extLoadedSet.add(industry);
      return true;
    } catch {
      return false;
    } finally {
      inflightExts.delete(industry);
    }
  })();

  inflightExts.set(industry, promise);
  return promise;
}

export function getCachedCasesSnapshot(customCases: AccidentCase[]): AccidentCase[] {
  const map = new Map<string, AccidentCase>();

  // Always include all 10 built-in seed cases so cross-industry matching works immediately
  for (const seed of SEED_ACCIDENT_CASES) {
    map.set(seed.id, {
      ...seed,
      source_type: seed.source_type ?? 'CASE',
      facts_locked: true,
      source_ref: seed.source_ref ?? '한국산업안전보건공단 중대재해 대표 표준사례',
    });
  }

  for (const ind of ['건설현장', '제조업', '서비스업'] as IndustryType[]) {
    const cached = shardCache.get(ind);
    if (cached) {
      for (const item of cached) {
        map.set(item.id, item);
      }
    }
  }

  for (const custom of customCases) {
    map.set(custom.id, custom);
  }

  return Array.from(map.values());
}

export function isIndustryShardCached(industry: IndustryType): boolean {
  return shardCache.has(industry);
}

export function hasPendingIndustryExtension(industry: IndustryType): boolean {
  return Boolean(INDUSTRY_EXT_SHARD_FILENAME[industry]) && !extLoadedSet.has(industry);
}
