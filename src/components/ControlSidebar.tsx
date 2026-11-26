import React, { useMemo, useRef, useState } from 'react';
import {
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  FileText,
  Presentation,
  LayoutGrid,
  RefreshCw,
  Building2,
  Factory,
  Briefcase,
  Globe,
  CloudAlert,
  ImagePlus,
  Trash2,
  ArrowUpRight,
  Search,
  SlidersHorizontal,
  Printer,
  Pin,
  X,
  Plus,
  Loader2,
} from 'lucide-react';
import {
  AccidentCase,
  CustomSiteInfo,
  ForeignLanguageCode,
  INDUSTRY_WORK_TYPES,
  IndustryType,
  MetaSummaryData,
  OutputFormat,
  SeasonRiskId,
  SidebarTabId,
  SOURCE_BRAND_STYLES,
  SourceFilterTab,
  SourceType,
  VariationOption,
} from '../types/safety';
import { FOREIGN_LANGUAGE_OPTIONS } from '../data/multilingualDict';
import { SEASONAL_RISKS, SEASONAL_RISK_LIST } from '../data/seasonalRisks';
import { formatOccurredDateLabel, isOccurredWithinDays } from '../utils/textFit';

interface ControlSidebarProps {
  industry: IndustryType;
  workType: string;
  sourceFilter: SourceFilterTab;
  pinnedCaseId: string | null;
  activeCaseId: string;
  outputFormat: OutputFormat;
  variationOption: VariationOption;
  siteInfo: CustomSiteInfo;
  casesPool: AccidentCase[];
  metaSummary: MetaSummaryData | null;
  isShardLoading: boolean;
  totalDbCount: number;
  customDbCount: number;
  measurePresets: string[];
  onSelectIndustry: (industry: IndustryType) => void;
  onSelectWorkType: (workType: string) => void;
  onChangeSourceFilter: (tab: SourceFilterTab) => void;
  onPinCase: (caseItem: AccidentCase) => void;
  onClearPinnedCase: () => void;
  onApplyRecommendedCase: (industry: IndustryType, workType: string) => void;
  onChangeOutputFormat: (format: OutputFormat) => void;
  onChangeVariation: (variation: VariationOption) => void;
  onUpdateSiteInfo: (patch: Partial<CustomSiteInfo>) => void;
  onRegenerate: () => void;
  onAppendPresetMeasure: (presetText: string) => void;
  onAddMeasurePreset: (presetText: string) => void;
  onRemoveMeasurePreset: (index: number) => void;
  onUploadJsonFile: (file: File) => void;
  onUploadLogoFile: (file: File) => void;
  onRemoveLogo: () => void;
  onDownloadSampleJson: () => void;
}

const INDUSTRIES: Array<{ id: IndustryType; label: string; icon: React.ReactNode }> = [
  { id: '건설현장', label: '건설현장', icon: <Building2 className="w-3.5 h-3.5" /> },
  { id: '제조업', label: '제조업', icon: <Factory className="w-3.5 h-3.5" /> },
  { id: '서비스업', label: '서비스업', icon: <Briefcase className="w-3.5 h-3.5" /> },
];

const VARIATION_CHOICES: Array<{ id: VariationOption; label: string; desc: string }> = [
  { id: 'auto', label: '자동 다양화 (추천)', desc: '제작마다 02번 관점·안전테마·헤더·사례 자동 회전' },
  { id: 'reconstruction', label: '사고 재구성형', desc: '발생경위·고위험요인 분석 중심' },
  { id: 'kyt_quiz', label: '위험예지 KYT 퀴즈형', desc: '근로자 토의 질문·정답 3가지 강조' },
  { id: 'tbm_practice', label: '5분 TBM 실전형', desc: '작업 전 점검표·확인란 강조' },
  { id: 'ox_compare', label: '관행 vs 원칙 O·X 대조형', desc: '잘못된 관행과 안전원칙 대비' },
];

export const ControlSidebar: React.FC<ControlSidebarProps> = ({
  industry,
  workType,
  sourceFilter,
  pinnedCaseId,
  activeCaseId,
  outputFormat,
  variationOption,
  siteInfo,
  casesPool,
  metaSummary,
  isShardLoading,
  totalDbCount,
  customDbCount,
  measurePresets,
  onSelectIndustry,
  onSelectWorkType,
  onChangeSourceFilter,
  onPinCase,
  onClearPinnedCase,
  onApplyRecommendedCase,
  onChangeOutputFormat,
  onChangeVariation,
  onUpdateSiteInfo,
  onRegenerate,
  onAppendPresetMeasure,
  onAddMeasurePreset,
  onRemoveMeasurePreset,
  onUploadLogoFile,
  onRemoveLogo,
}) => {
  const [activeTab, setActiveTab] = useState<SidebarTabId>('basic');
  const [searchQuery, setSearchQuery] = useState('');
  const [searchSourceFilter, setSearchSourceFilter] = useState<'ALL' | SourceType>('ALL');
  const [newPresetInput, setNewPresetInput] = useState('');
  const [presetPage, setPresetPage] = useState(1);

  const logoInputRef = useRef<HTMLInputElement | null>(null);

  const PRESETS_PER_PAGE = 5;
  const totalPresetPages = Math.max(1, Math.ceil(measurePresets.length / PRESETS_PER_PAGE));
  const safePresetPage = Math.min(presetPage, totalPresetPages);
  const presetPageStart = (safePresetPage - 1) * PRESETS_PER_PAGE;
  const visibleMeasurePresets = measurePresets.slice(
    presetPageStart,
    presetPageStart + PRESETS_PER_PAGE
  );

  const workTypes = INDUSTRY_WORK_TYPES[industry];
  const activeSeason = SEASONAL_RISKS[siteInfo.seasonRisk];

  const industryCases = useMemo(
    () => casesPool.filter((c) => c.industry === industry),
    [casesPool, industry]
  );

  const sourceCounts = useMemo(() => {
    const shardMeta = metaSummary?.industry_source_counts?.[industry];
    const localFatality = industryCases.filter((c) => c.source_type === 'FATALITY').length;
    const localSif = industryCases.filter((c) => c.source_type === 'SIF').length;
    const localAll = industryCases.length;

    return {
      FATALITY: Math.max(localFatality, shardMeta?.FATALITY || 0),
      SIF: Math.max(localSif, shardMeta?.SIF || 0),
      ALL: Math.max(localAll, shardMeta?.total || 0),
    };
  }, [industryCases, metaSummary, industry]);

  const hasRecentFatalityNewBadge = useMemo(() => {
    if (industryCases.some((c) => c.source_type === 'FATALITY' && isOccurredWithinDays(c.occurred_date, 30))) {
      return true;
    }
    return Boolean(
      metaSummary?.recent_fatalities?.some(
        (f) => f.industry === industry && isOccurredWithinDays(f.occurred_date, 30)
      )
    );
  }, [industryCases, metaSummary, industry]);

  const filteredSearchResults = useMemo(() => {
    if (activeTab !== 'search') return [];
    const q = searchQuery.trim().toLowerCase();
    const base = industryCases.filter((c) => {
      if (searchSourceFilter === 'ALL') return true;
      return (c.source_type || 'CASE') === searchSourceFilter;
    });

    const matched = !q
      ? base
      : base.filter((c) => {
          const hay = `${c.title} ${c.equipment} ${c.hazard_type} ${c.work_type} ${c.region || ''} ${c.overview_raw || ''} ${c.high_risk_work || ''}`.toLowerCase();
          return hay.includes(q);
        });

    const sorted = [...matched].sort((a, b) => {
      // Exact title/equipment hit first when searching
      if (q) {
        const aHit = a.title.toLowerCase().includes(q) || a.equipment.toLowerCase().includes(q) ? 1 : 0;
        const bHit = b.title.toLowerCase().includes(q) || b.equipment.toLowerCase().includes(q) ? 1 : 0;
        if (bHit !== aHit) return bHit - aHit;
      }
      // Recent fatalities first when viewing ALL or FATALITY
      const aFat = a.source_type === 'FATALITY' ? 1 : 0;
      const bFat = b.source_type === 'FATALITY' ? 1 : 0;
      if (!q && searchSourceFilter === 'ALL' && bFat !== aFat) return bFat - aFat;
      const ad = a.occurred_date || '';
      const bd = b.occurred_date || '';
      return bd !== ad ? (bd > ad ? 1 : -1) : 0;
    });

    return sorted.slice(0, 45);
  }, [activeTab, industryCases, searchQuery, searchSourceFilter]);

  const pinnedCaseObj = useMemo(
    () => (pinnedCaseId ? casesPool.find((c) => c.id === pinnedCaseId) ?? null : null),
    [casesPool, pinnedCaseId]
  );

  const handleLogoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      onUploadLogoFile(file);
      e.target.value = '';
    }
  };

  const handleSubmitNewPreset = () => {
    const trimmed = newPresetInput.trim();
    if (!trimmed) return;
    onAddMeasurePreset(trimmed);
    setNewPresetInput('');
    setPresetPage(1);
  };

  const renderPrintLayoutSettings = () => (
    <div className="space-y-2 rounded-lg border border-slate-200 bg-slate-50/70 p-3">
      <span className="block text-[11.5px] font-extrabold text-slate-800">
        인쇄 · 레이아웃 설정
      </span>

      {/* Ink-Saver Monochrome Mode */}
      <label className="flex items-center justify-between gap-3 py-1 cursor-pointer select-none">
        <div>
          <span className="block text-[12px] font-bold text-slate-900">
            흑백 인쇄 (토너 절약) 모드
          </span>
          <span className="block text-[10.5px] text-slate-500">
            짙은 배경 제거 · 고대비 검정 선으로 인쇄·PNG·복사 출력
          </span>
        </div>
        <button
          type="button"
          role="switch"
          aria-checked={siteInfo.inkSaverMode}
          onClick={() => onUpdateSiteInfo({ inkSaverMode: !siteInfo.inkSaverMode })}
          className={`relative inline-flex h-6 w-11 shrink-0 items-center rounded-full transition-colors cursor-pointer ${
            siteInfo.inkSaverMode ? 'bg-slate-900' : 'bg-slate-300'
          }`}
        >
          <span
            className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
              siteInfo.inkSaverMode ? 'translate-x-6' : 'translate-x-1'
            }`}
          />
        </button>
      </label>

      {/* TBM Signature Table */}
      <label className="flex items-center justify-between gap-3 py-1 cursor-pointer select-none border-t border-slate-200/80 pt-2">
        <div>
          <span className="block text-[12px] font-semibold text-slate-800">
            TBM 교육 참석자 서명란 (10칸)
          </span>
          <span className="block text-[10.5px] text-slate-500">
            OPS/A4 인쇄 하단에 교육일자·강사·서명 표 추가
          </span>
        </div>
        <button
          type="button"
          role="switch"
          aria-checked={siteInfo.showTbmSignTable}
          onClick={() => onUpdateSiteInfo({ showTbmSignTable: !siteInfo.showTbmSignTable })}
          className={`relative inline-flex h-6 w-11 shrink-0 items-center rounded-full transition-colors cursor-pointer ${
            siteInfo.showTbmSignTable ? 'bg-slate-900' : 'bg-slate-300'
          }`}
        >
          <span
            className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
              siteInfo.showTbmSignTable ? 'translate-x-6' : 'translate-x-1'
            }`}
          />
        </button>
      </label>

      {/* Cross-Process Toggle */}
      <label className="flex items-center justify-between gap-3 py-1 cursor-pointer select-none border-t border-slate-200/80 pt-2">
        <div>
          <span className="block text-[12px] font-semibold text-slate-800">
            유사공정 교차사례 포함
          </span>
          <span className="block text-[10.5px] text-slate-500">
            타 업종의 동일 위험 메커니즘 사례 함께 제시
          </span>
        </div>
        <button
          type="button"
          role="switch"
          aria-checked={siteInfo.includeCrossProcess}
          onClick={() =>
            onUpdateSiteInfo({ includeCrossProcess: !siteInfo.includeCrossProcess })
          }
          className={`relative inline-flex h-6 w-11 shrink-0 items-center rounded-full transition-colors cursor-pointer ${
            siteInfo.includeCrossProcess ? 'bg-slate-900' : 'bg-slate-300'
          }`}
        >
          <span
            className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
              siteInfo.includeCrossProcess ? 'translate-x-6' : 'translate-x-1'
            }`}
          />
        </button>
      </label>
    </div>
  );

  const renderSiteMetadataBlock = () => (
    <div className="space-y-2.5">
      <div className="flex items-center justify-between">
        <span className="text-[12px] font-bold text-slate-800">
          현장명(사업장명) 및 현장로고 등 삽입
        </span>
        <span className="text-[10.5px] text-emerald-700 font-semibold">자동저장</span>
      </div>

      <div>
        <label htmlFor="site-name" className="block text-[11px] font-semibold text-slate-600 mb-1">
          현장명 / 사업장명
        </label>
        <input
          id="site-name"
          type="text"
          value={siteInfo.siteName}
          onChange={(e) => onUpdateSiteInfo({ siteName: e.target.value })}
          placeholder="예: (주)대한건설 성수동 신축현장"
          className="w-full rounded-md border border-slate-300 px-3 py-1.5 text-[12px] text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-900"
        />
      </div>

      <div className="grid grid-cols-2 gap-2">
        <div>
          <label htmlFor="edu-date" className="block text-[11px] font-semibold text-slate-600 mb-1">
            교육일자
          </label>
          <input
            id="edu-date"
            type="date"
            value={siteInfo.educationDate}
            onChange={(e) => onUpdateSiteInfo({ educationDate: e.target.value })}
            className="w-full rounded-md border border-slate-300 px-2.5 py-1.5 text-[11.5px] text-slate-900 tabular-nums focus:outline-none focus:ring-2 focus:ring-slate-900"
          />
        </div>
        <div>
          <label htmlFor="instructor-name" className="block text-[11px] font-semibold text-slate-600 mb-1">
            교육강사명
          </label>
          <input
            id="instructor-name"
            type="text"
            value={siteInfo.instructorName}
            onChange={(e) => onUpdateSiteInfo({ instructorName: e.target.value })}
            placeholder="예: 김안전 과장"
            className="w-full rounded-md border border-slate-300 px-2.5 py-1.5 text-[12px] text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-900"
          />
        </div>
      </div>

      {/* Company / Site Logo Upload */}
      <div className="space-y-1.5">
        <span className="block text-[11px] font-semibold text-slate-600">
          회사·현장 로고 이미지 (PNG/JPG/SVG/WebP)
        </span>
        <input
          ref={logoInputRef}
          type="file"
          accept="image/png,image/jpeg,image/webp,image/svg+xml,.svg,.webp"
          onChange={handleLogoChange}
          className="hidden"
        />
        {siteInfo.logoDataUrl ? (
          <div className="flex items-center justify-between gap-2 rounded-md border border-slate-200 bg-slate-50 px-2.5 py-2">
            <div className="flex items-center gap-2 min-w-0">
              <img
                src={siteInfo.logoDataUrl}
                alt="업로드된 현장 로고"
                className="h-7 max-w-[84px] object-contain bg-white border border-slate-200 rounded-sm px-1"
              />
              <span className="text-[11px] font-medium text-slate-700 truncate">
                {siteInfo.logoFileName || '로고 적용됨'}
              </span>
            </div>
            <button
              type="button"
              onClick={onRemoveLogo}
              aria-label="로고 삭제"
              className="text-slate-500 hover:text-red-700 p-1 transition-colors cursor-pointer shrink-0"
            >
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          </div>
        ) : (
          <button
            type="button"
            onClick={() => logoInputRef.current?.click()}
            className="w-full py-2 px-3 rounded-md border border-dashed border-slate-300 bg-slate-50 hover:bg-slate-100 text-slate-700 text-[12px] font-semibold flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
          >
            <ImagePlus className="w-3.5 h-3.5 shrink-0" />
            <span>로고 업로드 (SVG·WebP 자동 변환)</span>
          </button>
        )}
      </div>
    </div>
  );

  return (
    <aside className="no-print w-full lg:w-[365px] xl:w-[390px] shrink-0 bg-white border-b lg:border-b-0 lg:border-r border-slate-200 flex flex-col">
      {/* Top 3-Tab Navigation: 제작 설정 / 사례 검색 / 출력 옵션 */}
      <div className="shrink-0 px-3.5 pt-2.5 pb-2 border-b border-slate-200 bg-slate-50/80">
        <div className="grid grid-cols-3 gap-1 p-1 bg-slate-200/80 rounded-lg">
          <button
            type="button"
            onClick={() => setActiveTab('basic')}
            className={`flex items-center justify-center gap-1 py-1.5 px-1.5 rounded-md text-[12px] font-bold transition-all whitespace-nowrap cursor-pointer ${
              activeTab === 'basic'
                ? 'bg-white text-slate-950 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <SlidersHorizontal className="w-3.5 h-3.5 shrink-0" />
            <span>제작 설정</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('search')}
            className={`flex items-center justify-center gap-1 py-1.5 px-1.5 rounded-md text-[12px] font-bold transition-all whitespace-nowrap cursor-pointer ${
              activeTab === 'search'
                ? 'bg-white text-slate-950 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Search className="w-3.5 h-3.5 shrink-0" />
            <span>사례 검색</span>
            {pinnedCaseId && (
              <span className="w-2 h-2 rounded-full bg-orange-600 shrink-0" aria-hidden="true" />
            )}
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('site')}
            className={`flex items-center justify-center gap-1 py-1.5 px-1.5 rounded-md text-[12px] font-bold transition-all whitespace-nowrap cursor-pointer ${
              activeTab === 'site'
                ? 'bg-white text-slate-950 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Printer className="w-3.5 h-3.5 shrink-0" />
            <span>출력 옵션</span>
            {siteInfo.inkSaverMode && (
              <span className="w-2 h-2 rounded-full bg-slate-900 shrink-0" aria-hidden="true" />
            )}
          </button>
        </div>
      </div>

      {/* Main Sidebar Body (flows naturally with page; no cramped inner scroll trap) */}
      <div className="p-3.5 space-y-3 flex-1">
        {/* ================================================================ */}
        {/* TAB 1: 제작 설정 (업종·출처·작업유형·형식·변주·계절·외국어)        */}
        {/* ================================================================ */}
        {activeTab === 'basic' && (
          <>
            {/* 1. Industry Selection */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <label className="text-[12px] font-bold text-slate-700">1. 업종 선택</label>
                {isShardLoading && (
                  <span className="inline-flex items-center gap-1 text-[11px] text-orange-700 font-semibold">
                    <Loader2 className="w-3 h-3 animate-spin" />
                    <span>업종 DB 로드 중</span>
                  </span>
                )}
              </div>
              <div className="grid grid-cols-3 gap-1 p-1 bg-slate-100 rounded-lg">
                {INDUSTRIES.map((item) => {
                  const active = industry === item.id;
                  return (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => onSelectIndustry(item.id)}
                      className={`flex items-center justify-center gap-1.5 py-2 px-2 rounded-md text-[12px] font-semibold transition-all whitespace-nowrap cursor-pointer ${
                        active
                          ? 'bg-slate-900 text-white shadow-xs'
                          : 'text-slate-600 hover:text-slate-900'
                      }`}
                    >
                      {item.icon}
                      <span>{item.label}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* 2. KOSHA Source Filter Tabs: FATALITY / SIF / ALL */}
            <div className="space-y-1.5">
              <span className="block text-[12px] font-bold text-slate-700">
                2. 공단 데이터 출처 선택 ({industry})
              </span>
              <div className="grid grid-cols-3 gap-1.5">
                <button
                  type="button"
                  onClick={() => onChangeSourceFilter('FATALITY')}
                  className={`relative rounded-lg border px-2 py-2 text-left transition-all cursor-pointer ${
                    sourceFilter === 'FATALITY'
                      ? 'border-[#C62828] bg-[#FEF2F2] ring-1 ring-[#C62828]'
                      : 'border-slate-200 bg-white hover:border-slate-300'
                  }`}
                >
                  <div className="flex items-center justify-between gap-1">
                    <span className="text-[11.2px] font-extrabold text-[#C62828] whitespace-nowrap">
                      최신 사망속보
                    </span>
                    {hasRecentFatalityNewBadge && (
                      <span className="px-1 py-0.2 rounded bg-[#C62828] text-white text-[8.5px] font-extrabold leading-tight">
                        NEW
                      </span>
                    )}
                  </div>
                  <div className="text-[10.5px] font-bold text-slate-600 tabular-nums mt-0.5">
                    {sourceCounts.FATALITY.toLocaleString('ko-KR')}건
                  </div>
                </button>

                <button
                  type="button"
                  onClick={() => onChangeSourceFilter('SIF')}
                  className={`rounded-lg border px-2 py-2 text-left transition-all cursor-pointer ${
                    sourceFilter === 'SIF'
                      ? 'border-[#D97706] bg-[#FFFBEB] ring-1 ring-[#D97706]'
                      : 'border-slate-200 bg-white hover:border-slate-300'
                  }`}
                >
                  <div className="text-[11.2px] font-extrabold text-[#B45309] whitespace-nowrap">
                    SIF 공식 분석
                  </div>
                  <div className="text-[10.5px] font-bold text-slate-600 tabular-nums mt-0.5">
                    {sourceCounts.SIF.toLocaleString('ko-KR')}건
                  </div>
                </button>

                <button
                  type="button"
                  onClick={() => onChangeSourceFilter('ALL')}
                  className={`rounded-lg border px-2 py-2 text-left transition-all cursor-pointer ${
                    sourceFilter === 'ALL'
                      ? 'border-[#1E293B] bg-slate-100 ring-1 ring-[#1E293B]'
                      : 'border-slate-200 bg-white hover:border-slate-300'
                  }`}
                >
                  <div className="text-[11.2px] font-extrabold text-slate-900 whitespace-nowrap">
                    전체 재해사례
                  </div>
                  <div className="text-[10.5px] font-bold text-slate-600 tabular-nums mt-0.5">
                    {sourceCounts.ALL.toLocaleString('ko-KR')}건
                  </div>
                </button>
              </div>
            </div>

            {/* 3. Work Type Dropdown */}
            <div className="space-y-1.5">
              <label htmlFor="work-type-select" className="block text-[12px] font-bold text-slate-700">
                3. 세부 작업유형
              </label>
              <div className="relative">
                <select
                  id="work-type-select"
                  value={workType}
                  onChange={(e) => onSelectWorkType(e.target.value)}
                  className="w-full appearance-none rounded-lg border border-slate-300 bg-white px-3 py-2.5 pr-9 text-[12.5px] font-semibold text-slate-900 focus:outline-none focus:ring-2 focus:ring-slate-900 cursor-pointer"
                >
                  {workTypes.map((wt) => (
                    <option key={wt} value={wt}>
                      {wt}
                    </option>
                  ))}
                </select>
                <ChevronDown className="w-4 h-4 text-slate-500 pointer-events-none absolute right-3 top-1/2 -translate-y-1/2" />
              </div>
            </div>

            {/* 4. Output Format Tabs */}
            <div className="space-y-1.5">
              <span className="block text-[12px] font-bold text-slate-700">4. 출력 형식</span>
              <div className="grid grid-cols-3 gap-1 p-1 bg-slate-100 rounded-lg">
                <button
                  type="button"
                  onClick={() => onChangeOutputFormat('ops')}
                  className={`flex items-center justify-center gap-1 py-2 px-1.5 rounded-md text-[11.5px] font-semibold transition-all whitespace-nowrap cursor-pointer ${
                    outputFormat === 'ops'
                      ? 'bg-white text-slate-900 shadow-xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  <FileText className="w-3.5 h-3.5 shrink-0" />
                  <span>OPS (A4)</span>
                </button>
                <button
                  type="button"
                  onClick={() => onChangeOutputFormat('slides')}
                  className={`flex items-center justify-center gap-1 py-2 px-1.5 rounded-md text-[11.5px] font-semibold transition-all whitespace-nowrap cursor-pointer ${
                    outputFormat === 'slides'
                      ? 'bg-white text-slate-900 shadow-xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  <Presentation className="w-3.5 h-3.5 shrink-0" />
                  <span>슬라이드</span>
                </button>
                <button
                  type="button"
                  onClick={() => onChangeOutputFormat('cardnews')}
                  className={`flex items-center justify-center gap-1 py-2 px-1.5 rounded-md text-[11.5px] font-semibold transition-all whitespace-nowrap cursor-pointer ${
                    outputFormat === 'cardnews'
                      ? 'bg-white text-slate-900 shadow-xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  <LayoutGrid className="w-3.5 h-3.5 shrink-0" />
                  <span>카드뉴스</span>
                </button>
              </div>
            </div>

            {/* 5. Variation Option */}
            <div className="space-y-1.5">
              <label htmlFor="variation-select" className="block text-[12px] font-bold text-slate-700">
                5. 교육 구성 변주 옵션
              </label>
              <div className="relative">
                <select
                  id="variation-select"
                  value={variationOption}
                  onChange={(e) => onChangeVariation(e.target.value as VariationOption)}
                  className="w-full appearance-none rounded-lg border border-slate-300 bg-white px-3 py-2 pr-9 text-[12.5px] font-semibold text-slate-900 focus:outline-none focus:ring-2 focus:ring-slate-900 cursor-pointer"
                >
                  {VARIATION_CHOICES.map((opt) => (
                    <option key={opt.id} value={opt.id}>
                      {opt.label}
                    </option>
                  ))}
                </select>
                <ChevronDown className="w-4 h-4 text-slate-500 pointer-events-none absolute right-3 top-1/2 -translate-y-1/2" />
              </div>
              <p className="text-[11px] text-slate-500">
                {VARIATION_CHOICES.find((o) => o.id === variationOption)?.desc}
              </p>
            </div>

            {/* Pinned Case Indicator (if active) */}
            {pinnedCaseObj && (
              <div className="rounded-lg border border-orange-300 bg-orange-50 px-3 py-2 flex items-start justify-between gap-2 text-[11.2px]">
                <div className="min-w-0">
                  <span className="inline-flex items-center gap-1 font-extrabold text-orange-800">
                    <Pin className="w-3 h-3 shrink-0" />
                    <span>직접 선택 사례 고정 중</span>
                  </span>
                  <p className="text-slate-800 font-semibold leading-snug mt-0.5 keep-all">
                    {pinnedCaseObj.title}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={onClearPinnedCase}
                  title="고정 해제"
                  className="shrink-0 text-slate-500 hover:text-slate-900 p-0.5 cursor-pointer"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
            )}

            {/* Primary Generate CTA */}
            <button
              type="button"
              onClick={onRegenerate}
              className="w-full py-2.5 px-4 rounded-lg bg-orange-600 hover:bg-orange-700 active:scale-[0.99] text-white font-bold text-[13px] flex items-center justify-center gap-2 shadow-xs transition-all cursor-pointer whitespace-nowrap"
            >
              <RefreshCw className={`w-4 h-4 shrink-0 ${isShardLoading ? 'animate-spin' : ''}`} />
              <span>다른 사례로 새로운 교육자료 제작</span>
            </button>

            <hr className="border-slate-200" />

            {/* 6. Seasonal & Weather Risk Filter */}
            <div className="space-y-2">
              <span className="inline-flex items-center gap-1.5 text-[12px] font-bold text-slate-700">
                <CloudAlert className="w-3.5 h-3.5 text-slate-500" />
                <span>계절·기상 리스크 경고 필터</span>
              </span>
              <div className="grid grid-cols-5 gap-1 p-1 bg-slate-100 rounded-lg">
                {SEASONAL_RISK_LIST.map((s) => {
                  const active = siteInfo.seasonRisk === s.id;
                  return (
                    <button
                      key={s.id}
                      type="button"
                      onClick={() => onUpdateSiteInfo({ seasonRisk: s.id as SeasonRiskId })}
                      className={`py-1.5 px-1 rounded-md text-[11px] font-semibold transition-all whitespace-nowrap cursor-pointer ${
                        active
                          ? 'bg-slate-900 text-white shadow-xs'
                          : 'text-slate-600 hover:text-slate-900'
                      }`}
                    >
                      {s.shortLabel}
                    </button>
                  );
                })}
              </div>
              {activeSeason.id !== 'always' && (
                <div
                  className="rounded-md border px-2.5 py-2 text-[11px] space-y-1.5"
                  style={{
                    backgroundColor: activeSeason.bgHex,
                    borderColor: activeSeason.borderHex,
                    color: activeSeason.textHex,
                  }}
                >
                  <p className="font-bold leading-snug">{activeSeason.badgeText}</p>
                  {activeSeason.recommendedIndustry &&
                    activeSeason.recommendedWorkType &&
                    activeSeason.recommendedWorkType !== workType && (
                      <button
                        type="button"
                        onClick={() =>
                          onApplyRecommendedCase(
                            activeSeason.recommendedIndustry!,
                            activeSeason.recommendedWorkType!
                          )
                        }
                        className="inline-flex items-center gap-1 font-bold underline underline-offset-2 hover:opacity-80 cursor-pointer"
                      >
                        <span>대표 계절재해({activeSeason.recommendedWorkType}) 바로 적용</span>
                        <ArrowUpRight className="w-3 h-3 shrink-0" />
                      </button>
                    )}
                </div>
              )}
            </div>

            {/* 7. Offline Multilingual Bilingual Safety Rules */}
            <div className="space-y-1.5">
              <label
                htmlFor="foreign-lang-select"
                className="inline-flex items-center gap-1.5 text-[12px] font-bold text-slate-700"
              >
                <Globe className="w-3.5 h-3.5 text-slate-500" />
                <span>외국어 병기 (무API 내장사전)</span>
              </label>
              <div className="relative">
                <select
                  id="foreign-lang-select"
                  value={siteInfo.foreignLanguage}
                  onChange={(e) =>
                    onUpdateSiteInfo({ foreignLanguage: e.target.value as ForeignLanguageCode })
                  }
                  className="w-full appearance-none rounded-lg border border-slate-300 bg-white px-3 py-2 pr-9 text-[12.5px] font-semibold text-slate-900 focus:outline-none focus:ring-2 focus:ring-slate-900 cursor-pointer"
                >
                  {FOREIGN_LANGUAGE_OPTIONS.map((opt) => (
                    <option key={opt.code} value={opt.code}>
                      {opt.label}
                    </option>
                  ))}
                </select>
                <ChevronDown className="w-4 h-4 text-slate-500 pointer-events-none absolute right-3 top-1/2 -translate-y-1/2" />
              </div>
              <p className="text-[11px] text-slate-500">
                핵심 구호와 예방대책 아래에 선택 외국어를 즉시 병기합니다.
              </p>
            </div>

            <hr className="border-slate-200" />

            {/* 8. Site Info & Logo (synced identically with 출력 옵션 tab) */}
            {renderSiteMetadataBlock()}

            {/* 9. Print & Layout Switches (synced identically with 출력 옵션 tab) */}
            {renderPrintLayoutSettings()}
          </>
        )}

        {/* ================================================================ */}
        {/* TAB 2: 사례 검색 (1초 키워드·기인물·재해유형 검색 및 직접 고정)    */}
        {/* ================================================================ */}
        {activeTab === 'search' && (
          <div className="space-y-3">
            <div className="space-y-2">
              <label htmlFor="case-search-input" className="block text-[12px] font-bold text-slate-800">
                사례 즉시 검색 ({industry} · {industryCases.length.toLocaleString('ko-KR')}건)
              </label>
              <div className="relative">
                <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                <input
                  id="case-search-input"
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="기인물·작업·지역 검색 (예: 크레인, 비계, 질식)"
                  className="w-full rounded-lg border border-slate-300 bg-white pl-9 pr-8 py-2 text-[12.5px] text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-900"
                />
                {searchQuery && (
                  <button
                    type="button"
                    onClick={() => setSearchQuery('')}
                    aria-label="검색어 지우기"
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700 cursor-pointer"
                  >
                    <X className="w-4 h-4" />
                  </button>
                )}
              </div>

              {/* Source Filter Chips */}
              <div className="flex flex-wrap items-center gap-1">
                {(
                  [
                    { id: 'ALL', label: '전체' },
                    { id: 'FATALITY', label: '사망속보' },
                    { id: 'SIF', label: 'SIF 분석' },
                    { id: 'CASE', label: '국내사례' },
                  ] as const
                ).map((chip) => (
                  <button
                    key={chip.id}
                    type="button"
                    onClick={() => setSearchSourceFilter(chip.id)}
                    className={`px-2.5 py-1 rounded-full text-[11px] font-bold transition-colors cursor-pointer ${
                      searchSourceFilter === chip.id
                        ? 'bg-slate-900 text-white'
                        : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                    }`}
                  >
                    {chip.label}
                  </button>
                ))}
              </div>
            </div>

            <div className="space-y-1.5 max-h-[calc(100vh-16rem)] overflow-y-auto pr-0.5">
              {filteredSearchResults.length === 0 ? (
                <div className="rounded-lg border border-dashed border-slate-300 p-5 text-center text-[12px] text-slate-500">
                  검색 조건과 일치하는 사례가 없습니다.
                </div>
              ) : (
                filteredSearchResults.map((item) => {
                  const st: SourceType = item.source_type || 'CASE';
                  const brand = SOURCE_BRAND_STYLES[st];
                  const isSelected = item.id === activeCaseId;
                  const isNew = st === 'FATALITY' && isOccurredWithinDays(item.occurred_date, 30);

                  return (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => onPinCase(item)}
                      className={`w-full text-left rounded-lg border p-2.5 transition-all cursor-pointer keep-all ${
                        isSelected
                          ? 'border-orange-500 bg-orange-50/70 ring-1 ring-orange-500'
                          : 'border-slate-200 bg-white hover:border-slate-400 hover:bg-slate-50/70'
                      }`}
                    >
                      <div className="flex items-center justify-between gap-1.5 mb-1">
                        <div className="flex items-center gap-1 min-w-0">
                          <span
                            className="px-1.5 py-0.5 rounded-sm text-[9.5px] font-extrabold text-white shrink-0"
                            style={{ backgroundColor: brand.primaryHex }}
                          >
                            {st === 'FATALITY' ? '사망속보' : st === 'SIF' ? 'SIF' : '사례'}
                          </span>
                          {isNew && (
                            <span className="px-1 py-0.5 rounded-sm bg-red-600 text-white text-[9px] font-extrabold shrink-0">
                              NEW
                            </span>
                          )}
                          <span className="text-[10.5px] font-bold text-slate-700">
                            {item.hazard_type} · {item.equipment}
                          </span>
                        </div>
                        {item.occurred_date && (
                          <span className="text-[10px] font-medium text-slate-500 tabular-nums shrink-0">
                            {formatOccurredDateLabel(item.occurred_date)}
                          </span>
                        )}
                      </div>
                      <p className="text-[12px] font-bold text-slate-900 leading-snug">
                        {item.title}
                      </p>
                    </button>
                  );
                })
              )}
            </div>
          </div>
        )}

        {/* ================================================================ */}
        {/* TAB 3: 출력 옵션 (인쇄·레이아웃 스위치 · 현장명/로고 · 대책 프리셋) */}
        {/* ================================================================ */}
        {activeTab === 'site' && (
          <div className="space-y-4">
            {renderPrintLayoutSettings()}

            {renderSiteMetadataBlock()}

            {/* Field Custom Measure Presets (localStorage, paginated 5 per page) */}
            <div className="space-y-2 pt-2 border-t border-slate-200">
              <div className="flex items-center justify-between gap-2">
                <span className="block text-[12px] font-bold text-slate-800">
                  자주 쓰는 현장 추가 대책 프리셋 ({measurePresets.length}건)
                </span>
                {totalPresetPages > 1 && (
                  <span className="text-[10.5px] font-bold text-slate-500 tabular-nums">
                    {safePresetPage} / {totalPresetPages} 페이지
                  </span>
                )}
              </div>
              <p className="text-[10.8px] text-slate-500">
                클릭하면 현재 교육자료의 예방대책 항목에 즉시 추가됩니다. (최대 50건 저장 · 5건씩 페이지 분할)
              </p>

              <div className="space-y-1">
                {visibleMeasurePresets.map((preset, localIdx) => {
                  const absoluteIdx = presetPageStart + localIdx;
                  return (
                    <div
                      key={`${absoluteIdx}-${preset.slice(0, 12)}`}
                      className="flex items-center justify-between gap-1.5 rounded-md border border-slate-200 bg-slate-50 px-2.5 py-1.5 text-[11.2px]"
                    >
                      <button
                        type="button"
                        onClick={() => onAppendPresetMeasure(preset)}
                        className="flex-1 text-left font-medium text-slate-800 hover:text-orange-700 leading-snug keep-all cursor-pointer"
                        title="클릭하여 현재 예방대책에 추가"
                      >
                        + {preset}
                      </button>
                      <button
                        type="button"
                        onClick={() => onRemoveMeasurePreset(absoluteIdx)}
                        aria-label="프리셋 삭제"
                        className="text-slate-400 hover:text-red-600 p-0.5 shrink-0 cursor-pointer"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  );
                })}
              </div>

              {totalPresetPages > 1 && (
                <div className="flex items-center justify-between gap-2 pt-0.5">
                  <button
                    type="button"
                    disabled={safePresetPage <= 1}
                    onClick={() => setPresetPage((p) => Math.max(1, Math.min(p, totalPresetPages) - 1))}
                    className="inline-flex items-center gap-0.5 px-2 py-1 rounded border border-slate-200 bg-white hover:bg-slate-100 disabled:opacity-40 disabled:cursor-not-allowed text-[11px] font-bold text-slate-700 cursor-pointer"
                  >
                    <ChevronLeft className="w-3.5 h-3.5" />
                    <span>이전</span>
                  </button>
                  <div className="flex items-center gap-1">
                    {Array.from({ length: totalPresetPages }, (_, i) => i + 1).map((pageNum) => (
                      <button
                        key={pageNum}
                        type="button"
                        onClick={() => setPresetPage(pageNum)}
                        className={`min-w-[22px] h-6 px-1.5 rounded text-[11px] font-bold tabular-nums transition-colors cursor-pointer ${
                          pageNum === safePresetPage
                            ? 'bg-slate-900 text-white'
                            : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                        }`}
                      >
                        {pageNum}
                      </button>
                    ))}
                  </div>
                  <button
                    type="button"
                    disabled={safePresetPage >= totalPresetPages}
                    onClick={() =>
                      setPresetPage((p) => Math.min(totalPresetPages, Math.min(p, totalPresetPages) + 1))
                    }
                    className="inline-flex items-center gap-0.5 px-2 py-1 rounded border border-slate-200 bg-white hover:bg-slate-100 disabled:opacity-40 disabled:cursor-not-allowed text-[11px] font-bold text-slate-700 cursor-pointer"
                  >
                    <span>다음</span>
                    <ChevronRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              )}

              <div className="flex items-center gap-1.5 pt-0.5">
                <input
                  type="text"
                  value={newPresetInput}
                  onChange={(e) => setNewPresetInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      handleSubmitNewPreset();
                    }
                  }}
                  placeholder="현장 고유 안전수칙 프리셋 등록..."
                  className="flex-1 rounded-md border border-slate-300 px-2.5 py-1.5 text-[11.5px] text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-900"
                />
                <button
                  type="button"
                  onClick={handleSubmitNewPreset}
                  className="shrink-0 px-2.5 py-1.5 rounded-md bg-slate-800 hover:bg-slate-900 text-white text-[11.5px] font-bold inline-flex items-center gap-1 cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>저장</span>
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      {activeTab !== 'basic' && (
        <div className="shrink-0 p-3 border-t border-slate-200 bg-slate-50/90">
          <button
            type="button"
            onClick={onRegenerate}
            className="w-full py-2.25 px-3.5 rounded-lg bg-orange-600 hover:bg-orange-700 active:scale-[0.99] text-white font-bold text-[12.5px] flex items-center justify-center gap-2 shadow-xs transition-all cursor-pointer whitespace-nowrap"
          >
            <RefreshCw className={`w-3.5 h-3.5 shrink-0 ${isShardLoading ? 'animate-spin' : ''}`} />
            <span>다른 사례로 새로운 교육자료 제작</span>
          </button>
        </div>
      )}
    </aside>
  );
};
