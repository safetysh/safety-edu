export type IndustryType = '건설현장' | '제조업' | '서비스업';

export type HazardType = string;

export type SourceType = 'FATALITY' | 'SIF' | 'CASE';

export type SourceFilterTab = 'ALL' | 'FATALITY' | 'SIF';

export type SidebarTabId = 'basic' | 'search' | 'site';

export type OutputFormat = 'ops' | 'slides' | 'cardnews';

export type ForeignLanguageCode = 'none' | 'en' | 'vi' | 'zh' | 'th' | 'km' | 'uz';

export type SeasonRiskId = 'always' | 'winter' | 'thaw' | 'monsoon' | 'heatwave';

export type VariationOption =
  | 'auto'
  | 'reconstruction'
  | 'kyt_quiz'
  | 'tbm_practice'
  | 'ox_compare';

export type PerspectiveMode =
  | 'reconstruction'
  | 'kyt_quiz'
  | 'tbm_practice'
  | 'ox_compare';

export type LayoutStyleId = 'poster_grid' | 'timeline_focus' | 'tbm_briefing';

export type SafetyThemeId =
  | 'safety_orange'
  | 'hazard_amber'
  | 'impact_crimson'
  | 'confined_blue';

export interface TimelineStep {
  step: string;
  label: string;
  detail: string;
}

export interface OXComparisonPair {
  wrong: string;
  right: string;
  note: string;
}

export interface KytQuiz {
  question: string;
  answers: [string, string, string];
}

export interface SifMetadata {
  cateSeNm?: string;
  sifLclsfNm?: string;
  sifMclsfNm?: string;
  sifSclsfNm?: string;
  orgtNm?: string;
  situation?: string | null;
}

export interface AccidentCase {
  id: string;
  source_type?: SourceType;
  facts_locked?: boolean;
  boardno?: string;
  atcflcnt?: number;
  occurred_date?: string;
  sort_ts?: string;
  region?: string;
  industry: IndustryType;
  process?: string;
  work_type: string;
  equipment: string;
  hazard_type: HazardType;
  season_tag?: string;
  severity?: string;
  title: string;
  overview_raw?: string;
  high_risk_work?: string;
  hazard_factor?: string;
  sif_meta?: SifMetadata;
  summary_3lines: [string, string, string];
  timeline: [TimelineStep, TimelineStep, TimelineStep, TimelineStep];
  direct_causes: [string, string, string];
  root_causes: [string, string];
  preventive_measures: string[];
  tbm_checklist: string[];
  ox_comparison: [OXComparisonPair, OXComparisonPair];
  kyt_quiz: KytQuiz;
  worker_slogan: string;
  legal_ref: string;
  related_work_types: string[];
  source_ref?: string;
  source_image_url?: string | null;
  disclaimer?: string;
  source?: 'builtin' | 'custom';
  is_standard_model?: boolean;
  /** True only when preventive_measures came verbatim from official KOSHA API (e.g. SIF reduction measures); false when auto-matched from equipment/standard templates. */
  has_official_measures?: boolean;
}

export interface CaseEditableOverride {
  preventive_measures?: string[];
  tbm_checklist?: string[];
}

export interface SafetyThemeConfig {
  id: SafetyThemeId;
  name: string;
  primaryHex: string;
  darkHex: string;
  softBgHex: string;
  borderHex: string;
  accentTextHex: string;
  badgeBgHex: string;
  badgeTextHex: string;
  stripeClass: string;
  pptxPrimary: string;
  pptxDark: string;
  pptxSoftBg: string;
  pptxAccent: string;
}

export interface SourceBrandStyle {
  sourceType: SourceType;
  shortLabel: string;
  badgePrefix: string;
  primaryHex: string;
  darkHex: string;
  softBgHex: string;
  borderHex: string;
  textHex: string;
  pptxHex: string;
  pptxSoftBg: string;
  defaultSourceRef: string;
}

export const SOURCE_BRAND_STYLES: Record<SourceType, SourceBrandStyle> = {
  FATALITY: {
    sourceType: 'FATALITY',
    shortLabel: '최신 사망속보',
    badgePrefix: '최신 사망속보',
    primaryHex: '#C62828',
    darkHex: '#7F1D1D',
    softBgHex: '#FEF2F2',
    borderHex: '#FECACA',
    textHex: '#991B1B',
    pptxHex: 'C62828',
    pptxSoftBg: 'FEF2F2',
    defaultSourceRef: '한국산업안전보건공단 사고사망 속보',
  },
  SIF: {
    sourceType: 'SIF',
    shortLabel: '공단 SIF 공식 분석',
    badgePrefix: '공단 SIF 공식 분석',
    primaryHex: '#D97706',
    darkHex: '#78350F',
    softBgHex: '#FFFBEB',
    borderHex: '#FDE68A',
    textHex: '#92400E',
    pptxHex: 'D97706',
    pptxSoftBg: 'FFFBEB',
    defaultSourceRef: '한국산업안전보건공단 사망사고 고위험요인(SIF) 아카이브',
  },
  CASE: {
    sourceType: 'CASE',
    shortLabel: '유사 재해사례',
    badgePrefix: '유사 재해사례',
    primaryHex: '#1E293B',
    darkHex: '#0F172A',
    softBgHex: '#F8FAFC',
    borderHex: '#CBD5E1',
    textHex: '#1E293B',
    pptxHex: '1E293B',
    pptxSoftBg: 'F8FAFC',
    defaultSourceRef: '한국산업안전보건공단 국내재해사례',
  },
};

export interface LegalAppendixSections {
  laws: boolean;
  guides: boolean;
  mediaQr: boolean;
}

export type StalenessLevel = 'none' | 'info' | 'critical';

export interface LegalRuleItem {
  id: string;
  doc_id: string;
  tier: 1;
  tier_label: string;
  law_name: string;
  article_no: string;
  title: string;
  short_label: string;
  latest_amended_date: string;
  content: string;
}

export interface LegalNoticeItem {
  id: string;
  doc_id: string;
  tier: 2;
  tier_label: string;
  title: string;
  latest_amended_date: string;
  content: string;
}

export interface KoshaGuideItem {
  no: string;
  name: string;
  published_date: string;
  download_url: string;
  file_format: string;
}

export interface KoshaGuideGroupRef {
  no: string;
  staleness_level: StalenessLevel;
  staleness_note: string;
}

export interface ResolvedKoshaGuide extends KoshaGuideItem {
  staleness_level: StalenessLevel;
  staleness_note: string;
}

export type MediaLangCode =
  | 'ko'
  | 'en'
  | 'vi'
  | 'zh'
  | 'th'
  | 'km'
  | 'uz'
  | 'multi'
  | 'other_foreign';

export interface KoshaMediaItem {
  doc_id: string;
  title: string;
  media_style: string;
  url: string;
  lang?: MediaLangCode;
}

export interface RefsMediaI18nData {
  format: string;
  synced_at: string;
  supported_langs: Array<Exclude<MediaLangCode, 'ko' | 'other_foreign'>>;
  stats: {
    groups_with_i18n: number;
    total_i18n_media: number;
  };
  groups: Record<string, Partial<Record<Exclude<MediaLangCode, 'ko' | 'other_foreign'>, KoshaMediaItem[]>>>;
}

export interface BlockedConflictItem {
  title: string;
  reason: string;
}

export interface LegalWorkGroupEntry {
  work_type: string;
  industry: IndustryType;
  match_keywords: string[];
  law_ids: string[];
  notice_ids: string[];
  blocked_conflicts: BlockedConflictItem[];
  guides: KoshaGuideGroupRef[];
  qr_media: KoshaMediaItem[];
  aux_media: KoshaMediaItem[];
}

export interface RefsLegalData {
  format: string;
  synced_at: string;
  law_portal_url: string;
  hierarchy_notice: string;
  stats: {
    groups_count: number;
    laws_count: number;
    notices_count: number;
    blocked_conflicts_count: number;
    guides_catalog_count: number;
    guides_mapped_count: number;
    media_mapped_count: number;
  };
  laws_by_id: Record<string, LegalRuleItem>;
  notices_by_id: Record<string, LegalNoticeItem>;
  guides_by_no: Record<string, KoshaGuideItem>;
  groups: Record<string, LegalWorkGroupEntry>;
}

export interface ResolvedLegalReference {
  matchedGroupKey: string;
  matchedIndustry: IndustryType;
  matchedBy: 'case_keyword' | 'case_worktype' | 'selected_worktype';
  syncedAt: string;
  lawPortalUrl: string;
  hierarchyNotice: string;
  laws: LegalRuleItem[];
  notices: LegalNoticeItem[];
  blockedConflicts: BlockedConflictItem[];
  guides: ResolvedKoshaGuide[];
  qrMedia: KoshaMediaItem[];
  auxMedia: KoshaMediaItem[];
  industryFallbackKoMedia: KoshaMediaItem[];
  primaryLawShort: string;
  primaryGuideNo: string | null;
  latestAmendedDate: string;
}

export interface CustomSiteInfo {
  siteName: string;
  educationDate: string;
  instructorName: string;
  includeCrossProcess: boolean;
  foreignLanguage: ForeignLanguageCode;
  seasonRisk: SeasonRiskId;
  logoDataUrl: string | null;
  logoFileName: string;
  showTbmSignTable: boolean;
  inkSaverMode: boolean;
  showPage1LegalSummary: boolean;
  showPage2Appendix: boolean;
  appendixSections: LegalAppendixSections;
}

export interface GeneratedMaterial {
  version: number;
  selectedIndustry: IndustryType;
  selectedWorkType: string;
  primaryCase: AccidentCase;
  relatedCase: AccidentCase | null;
  isExactMatch: boolean;
  matchScore: number;
  matchReason: string;
  perspectiveMode: PerspectiveMode;
  perspectiveLabel: string;
  theme: SafetyThemeConfig;
  layoutStyle: LayoutStyleId;
  layoutLabel: string;
  generatedAt: string;
  seedHash: number;
  isCustomEdited?: boolean;
  isMeasuresEdited?: boolean;
  isTbmEdited?: boolean;
}

export interface FatalityHeadlineItem {
  id: string;
  industry: IndustryType;
  work_type: string;
  hazard_type: string;
  equipment: string;
  occurred_date: string;
  region?: string;
  title: string;
}

export interface MetaSummaryData {
  format: string;
  updated_at: string;
  shards: Record<IndustryType, string>;
  ext_shards?: Partial<Record<IndustryType, string>>;
  totals: {
    all: number;
    by_industry: Record<IndustryType, number>;
    by_source: Record<SourceType, number>;
  };
  industry_source_counts: Record<
    IndustryType,
    {
      file: string;
      ext_file?: string;
      size_kb: number;
      ext_size_kb?: number;
      total: number;
      FATALITY: number;
      SIF: number;
      CASE: number;
    }
  >;
  recent_fatalities: FatalityHeadlineItem[];
}

export const INDUSTRY_WORK_TYPES: Record<IndustryType, string[]> = {
  건설현장: [
    '이동식 비계·사다리 작업',
    '굴착·가시설 토목 작업',
    '철골·지붕 고소 작업',
    '타워크레인·양중 작업',
    '밀폐공간·양생 작업',
  ],
  제조업: [
    '컨베이어·회전체 점검/청소',
    '프레스·절곡·전단기 작업',
    '지게차·물류 하역 작업',
    '고소작업대·설비 보수',
    '화학물질·밀폐탱크 작업',
  ],
  서비스업: [
    '물류창고 상하차·지게차 작업',
    '건물 시설관리·조명 교체',
    '폐기물 파쇄·압축기 작업',
    '주방·조리실 화상/절단 작업',
    '배달·이륜차 운행 작업',
  ],
};

export const PERSPECTIVE_LABELS: Record<PerspectiveMode, string> = {
  reconstruction: '사고 재구성형',
  kyt_quiz: '위험예지 KYT 퀴즈형',
  tbm_practice: '5분 TBM 실전형',
  ox_compare: '관행 vs 원칙 O·X 대조형',
};

export const LAYOUT_LABELS: Record<LayoutStyleId, string> = {
  poster_grid: '네이비 헤더 포스터',
  timeline_focus: '안전색 강조 헤더',
  tbm_briefing: '고대비 현장 브리핑',
};

export const SAFETY_THEMES: Record<SafetyThemeId, SafetyThemeConfig> = {
  safety_orange: {
    id: 'safety_orange',
    name: '안전 주황 테마',
    primaryHex: '#C2410C',
    darkHex: '#7C2D12',
    softBgHex: '#FFF7ED',
    borderHex: '#FDBA74',
    accentTextHex: '#9A3412',
    badgeBgHex: '#EA580C',
    badgeTextHex: '#FFFFFF',
    stripeClass: 'hazard-stripe-orange',
    pptxPrimary: 'C2410C',
    pptxDark: '7C2D12',
    pptxSoftBg: 'FFF7ED',
    pptxAccent: 'EA580C',
  },
  hazard_amber: {
    id: 'hazard_amber',
    name: '경고 황흑 테마',
    primaryHex: '#B45309',
    darkHex: '#18181B',
    softBgHex: '#FEFCE8',
    borderHex: '#FDE047',
    accentTextHex: '#854D0E',
    badgeBgHex: '#FACC15',
    badgeTextHex: '#18181B',
    stripeClass: 'hazard-stripe-amber',
    pptxPrimary: 'B45309',
    pptxDark: '18181B',
    pptxSoftBg: 'FEFCE8',
    pptxAccent: 'CA8A04',
  },
  impact_crimson: {
    id: 'impact_crimson',
    name: '충돌 적갈 테마',
    primaryHex: '#991B1B',
    darkHex: '#450A0A',
    softBgHex: '#FEF2F2',
    borderHex: '#FCA5A5',
    accentTextHex: '#991B1B',
    badgeBgHex: '#B91C1C',
    badgeTextHex: '#FFFFFF',
    stripeClass: 'hazard-stripe-crimson',
    pptxPrimary: '991B1B',
    pptxDark: '450A0A',
    pptxSoftBg: 'FEF2F2',
    pptxAccent: 'DC2626',
  },
  confined_blue: {
    id: 'confined_blue',
    name: '지시 안전청 테마',
    primaryHex: '#1D4ED8',
    darkHex: '#1E3A8A',
    softBgHex: '#EFF6FF',
    borderHex: '#93C5FD',
    accentTextHex: '#1E40AF',
    badgeBgHex: '#1D4ED8',
    badgeTextHex: '#FFFFFF',
    stripeClass: 'hazard-stripe-blue',
    pptxPrimary: '1D4ED8',
    pptxDark: '1E3A8A',
    pptxSoftBg: 'EFF6FF',
    pptxAccent: '2563EB',
  },
};
