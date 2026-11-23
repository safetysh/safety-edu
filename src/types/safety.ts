export type IndustryType = '건설현장' | '제조업' | '서비스업';

export type HazardType = string;

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

export interface AccidentCase {
  id: string;
  industry: IndustryType;
  work_type: string;
  equipment: string;
  hazard_type: HazardType;
  title: string;
  summary_3lines: [string, string, string];
  timeline: [TimelineStep, TimelineStep, TimelineStep, TimelineStep];
  direct_causes: [string, string, string];
  root_causes: [string, string];
  preventive_measures: [string, string, string, string];
  tbm_checklist: [string, string, string, string, string];
  ox_comparison: [OXComparisonPair, OXComparisonPair];
  kyt_quiz: KytQuiz;
  worker_slogan: string;
  legal_ref: string;
  related_work_types: string[];
  source?: 'builtin' | 'custom';
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
