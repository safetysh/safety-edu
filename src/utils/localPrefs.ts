import { CustomSiteInfo, ForeignLanguageCode, SeasonRiskId } from '../types/safety';

const SITE_PREFS_STORAGE_KEY = 'safety_edu_site_prefs_v2';
const MEASURE_PRESETS_STORAGE_KEY = 'safety_edu_measure_presets_v2';

export const DEFAULT_MEASURE_PRESETS: string[] = [
  '작업 시작 전 2인 1조 상호 보호구·방호장치 이상 유무 교차 확인 실시',
  '작업 중 이상 징후·기상 악화 시 즉시 작업중지권 행사 및 관리자 보고',
  '신규·외국인 근로자 투입 시 위험구간 동행 확인 및 통역·픽토그램 안내',
];

interface PersistedSitePrefs {
  siteName?: string;
  instructorName?: string;
  includeCrossProcess?: boolean;
  foreignLanguage?: ForeignLanguageCode;
  seasonRisk?: SeasonRiskId;
  logoDataUrl?: string | null;
  logoFileName?: string;
  showTbmSignTable?: boolean;
  inkSaverMode?: boolean;
  showPage1LegalSummary?: boolean;
  showPage2Appendix?: boolean;
  appendixSections?: {
    laws?: boolean;
    guides?: boolean;
    mediaQr?: boolean;
  };
}

export function loadPersistedSitePrefs(todayDate: string): CustomSiteInfo {
  const defaults: CustomSiteInfo = {
    siteName: '',
    educationDate: todayDate,
    instructorName: '',
    includeCrossProcess: true,
    foreignLanguage: 'none',
    seasonRisk: 'always',
    logoDataUrl: null,
    logoFileName: '',
    showTbmSignTable: false,
    inkSaverMode: false,
    showPage1LegalSummary: true,
    showPage2Appendix: false,
    appendixSections: {
      laws: true,
      guides: true,
      mediaQr: true,
    },
  };

  if (typeof window === 'undefined') return defaults;

  try {
    const raw = window.localStorage.getItem(SITE_PREFS_STORAGE_KEY);
    if (!raw) return defaults;
    const parsed = JSON.parse(raw) as PersistedSitePrefs;
    return {
      ...defaults,
      siteName: typeof parsed.siteName === 'string' ? parsed.siteName : defaults.siteName,
      instructorName:
        typeof parsed.instructorName === 'string' ? parsed.instructorName : defaults.instructorName,
      includeCrossProcess:
        typeof parsed.includeCrossProcess === 'boolean'
          ? parsed.includeCrossProcess
          : defaults.includeCrossProcess,
      foreignLanguage: parsed.foreignLanguage ?? defaults.foreignLanguage,
      seasonRisk: parsed.seasonRisk ?? defaults.seasonRisk,
      logoDataUrl:
        typeof parsed.logoDataUrl === 'string' && parsed.logoDataUrl.startsWith('data:image/')
          ? parsed.logoDataUrl
          : null,
      logoFileName:
        typeof parsed.logoFileName === 'string' ? parsed.logoFileName : defaults.logoFileName,
      showTbmSignTable: Boolean(parsed.showTbmSignTable),
      inkSaverMode: Boolean(parsed.inkSaverMode),
      showPage1LegalSummary:
        typeof parsed.showPage1LegalSummary === 'boolean'
          ? parsed.showPage1LegalSummary
          : defaults.showPage1LegalSummary,
      showPage2Appendix: Boolean(parsed.showPage2Appendix),
      appendixSections: {
        laws:
          typeof parsed.appendixSections?.laws === 'boolean'
            ? parsed.appendixSections.laws
            : true,
        guides:
          typeof parsed.appendixSections?.guides === 'boolean'
            ? parsed.appendixSections.guides
            : true,
        mediaQr:
          typeof parsed.appendixSections?.mediaQr === 'boolean'
            ? parsed.appendixSections.mediaQr
            : true,
      },
    };
  } catch {
    return defaults;
  }
}

export function savePersistedSitePrefs(siteInfo: CustomSiteInfo): void {
  if (typeof window === 'undefined') return;
  try {
    const payload: PersistedSitePrefs = {
      siteName: siteInfo.siteName,
      instructorName: siteInfo.instructorName,
      includeCrossProcess: siteInfo.includeCrossProcess,
      foreignLanguage: siteInfo.foreignLanguage,
      seasonRisk: siteInfo.seasonRisk,
      logoDataUrl: siteInfo.logoDataUrl,
      logoFileName: siteInfo.logoFileName,
      showTbmSignTable: siteInfo.showTbmSignTable,
      inkSaverMode: siteInfo.inkSaverMode,
      showPage1LegalSummary: siteInfo.showPage1LegalSummary,
      showPage2Appendix: siteInfo.showPage2Appendix,
      appendixSections: siteInfo.appendixSections,
    };
    window.localStorage.setItem(SITE_PREFS_STORAGE_KEY, JSON.stringify(payload));
  } catch {
    // Ignore storage quota errors (e.g., private browsing) gracefully
  }
}

export const MAX_MEASURE_PRESETS = 50;

export function loadMeasurePresets(): string[] {
  if (typeof window === 'undefined') return DEFAULT_MEASURE_PRESETS;
  try {
    const raw = window.localStorage.getItem(MEASURE_PRESETS_STORAGE_KEY);
    if (!raw) return DEFAULT_MEASURE_PRESETS;
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed)) {
      const cleaned = parsed
        .map((v) => String(v ?? '').trim())
        .filter(Boolean)
        .slice(0, MAX_MEASURE_PRESETS);
      return cleaned.length > 0 ? cleaned : DEFAULT_MEASURE_PRESETS;
    }
    return DEFAULT_MEASURE_PRESETS;
  } catch {
    return DEFAULT_MEASURE_PRESETS;
  }
}

export function saveMeasurePresets(presets: string[]): void {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(
      MEASURE_PRESETS_STORAGE_KEY,
      JSON.stringify(presets.slice(0, MAX_MEASURE_PRESETS))
    );
  } catch {
    // Ignore storage quota errors
  }
}
