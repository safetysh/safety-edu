import { IndustryType, SeasonRiskId } from '../types/safety';

export interface SeasonalRiskConfig {
  id: SeasonRiskId;
  label: string;
  shortLabel: string;
  badgeText: string;
  extraRule: string;
  bgHex: string;
  borderHex: string;
  badgeBgHex: string;
  textHex: string;
  pptxBg: string;
  pptxBadge: string;
  pptxText: string;
  recommendedIndustry?: IndustryType;
  recommendedWorkType?: string;
}

export const SEASONAL_RISKS: Record<SeasonRiskId, SeasonalRiskConfig> = {
  always: {
    id: 'always',
    label: '상시 (기본)',
    shortLabel: '상시',
    badgeText: '',
    extraRule: '',
    bgHex: '#F8FAFC',
    borderHex: '#CBD5E1',
    badgeBgHex: '#334155',
    textHex: '#0F172A',
    pptxBg: 'F8FAFC',
    pptxBadge: '334155',
    pptxText: '0F172A',
  },
  winter: {
    id: 'winter',
    label: '동절기 (양생 질식·결빙)',
    shortLabel: '동절기',
    badgeText: '동절기 주의 · 양생 질식·결빙',
    extraRule:
      '갈탄·숯탄 밀폐 양생구간 출입 전 산소·CO 농도 측정 및 강제 환기, 결빙 통로 제설·미끄럼방지 조치 필수!',
    bgHex: '#EFF6FF',
    borderHex: '#93C5FD',
    badgeBgHex: '#1D4ED8',
    textHex: '#1E3A8A',
    pptxBg: 'EFF6FF',
    pptxBadge: '1D4ED8',
    pptxText: '1E3A8A',
    recommendedIndustry: '건설현장',
    recommendedWorkType: '밀폐공간·양생 작업',
  },
  thaw: {
    id: 'thaw',
    label: '해빙기 (지반 붕괴)',
    shortLabel: '해빙기',
    badgeText: '해빙기 주의 · 지반 약화·붕괴',
    extraRule:
      '동결 지반 융해로 굴착면·비탈면 균열과 침하 위험 급증 — 작업 전 사면 점검 및 흙막이 지보공 변형 확인 필수!',
    bgHex: '#FEF3C7',
    borderHex: '#F59E0B',
    badgeBgHex: '#B45309',
    textHex: '#78350F',
    pptxBg: 'FEF3C7',
    pptxBadge: 'B45309',
    pptxText: '78350F',
    recommendedIndustry: '건설현장',
    recommendedWorkType: '굴착·가시설 토목 작업',
  },
  monsoon: {
    id: 'monsoon',
    label: '장마철 (감전·토사유출)',
    shortLabel: '장마철',
    badgeText: '장마철 주의 · 감전·토사유출',
    extraRule:
      '침수·습윤 구역 이동식 전동기계 누전차단기·접지 확인 및 강우 후 굴착부 배수·지붕 미끄럼 차단 후 작업 개시!',
    bgHex: '#ECFEFF',
    borderHex: '#22D3EE',
    badgeBgHex: '#0E7490',
    textHex: '#164E63',
    pptxBg: 'ECFEFF',
    pptxBadge: '0E7490',
    pptxText: '164E63',
    recommendedIndustry: '건설현장',
    recommendedWorkType: '철골·지붕 고소 작업',
  },
  heatwave: {
    id: 'heatwave',
    label: '혹서기 (온열질환)',
    shortLabel: '혹서기',
    badgeText: '혹서기 주의 · 온열질환 예방',
    extraRule:
      '폭염특보 시 물·그늘·휴식 3대 수칙 준수(매시간 10~15분 휴식) 및 동료 열사병 의심 증상 즉시 확인·응급조치!',
    bgHex: '#FEF2F2',
    borderHex: '#F87171',
    badgeBgHex: '#DC2626',
    textHex: '#7F1D1D',
    pptxBg: 'FEF2F2',
    pptxBadge: 'DC2626',
    pptxText: '7F1D1D',
    recommendedIndustry: '서비스업',
    recommendedWorkType: '물류창고 상하차·지게차 작업',
  },
};

export const SEASONAL_RISK_LIST: SeasonalRiskConfig[] = [
  SEASONAL_RISKS.always,
  SEASONAL_RISKS.winter,
  SEASONAL_RISKS.thaw,
  SEASONAL_RISKS.monsoon,
  SEASONAL_RISKS.heatwave,
];
