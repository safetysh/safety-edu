import React, { useRef, useState } from 'react';
import {
  ChevronDown,
  ChevronUp,
  FileText,
  Presentation,
  LayoutGrid,
  RefreshCw,
  Upload,
  Download,
  Building2,
  Factory,
  Briefcase,
  Database,
  Globe,
  CloudAlert,
  ImagePlus,
  Trash2,
  ArrowUpRight,
} from 'lucide-react';
import {
  CustomSiteInfo,
  ForeignLanguageCode,
  INDUSTRY_WORK_TYPES,
  IndustryType,
  OutputFormat,
  SeasonRiskId,
  VariationOption,
} from '../types/safety';
import { FOREIGN_LANGUAGE_OPTIONS } from '../data/multilingualDict';
import { SEASONAL_RISKS, SEASONAL_RISK_LIST } from '../data/seasonalRisks';

interface ControlSidebarProps {
  industry: IndustryType;
  workType: string;
  outputFormat: OutputFormat;
  variationOption: VariationOption;
  siteInfo: CustomSiteInfo;
  totalDbCount: number;
  customDbCount: number;
  onSelectIndustry: (industry: IndustryType) => void;
  onSelectWorkType: (workType: string) => void;
  onApplyRecommendedCase: (industry: IndustryType, workType: string) => void;
  onChangeOutputFormat: (format: OutputFormat) => void;
  onChangeVariation: (variation: VariationOption) => void;
  onUpdateSiteInfo: (patch: Partial<CustomSiteInfo>) => void;
  onRegenerate: () => void;
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
  { id: 'reconstruction', label: '사고 재구성형', desc: '발생경위·직접/관리원인 중심' },
  { id: 'kyt_quiz', label: '위험예지 KYT 퀴즈형', desc: '근로자 토의 질문·정답 3가지 강조' },
  { id: 'tbm_practice', label: '5분 TBM 실전형', desc: '작업 전 5개 점검표·서명란 강조' },
  { id: 'ox_compare', label: '관행 vs 원칙 O·X 대조형', desc: '잘못된 관행과 안전원칙 대비' },
];

export const ControlSidebar: React.FC<ControlSidebarProps> = ({
  industry,
  workType,
  outputFormat,
  variationOption,
  siteInfo,
  totalDbCount,
  customDbCount,
  onSelectIndustry,
  onSelectWorkType,
  onApplyRecommendedCase,
  onChangeOutputFormat,
  onChangeVariation,
  onUpdateSiteInfo,
  onRegenerate,
  onUploadJsonFile,
  onUploadLogoFile,
  onRemoveLogo,
  onDownloadSampleJson,
}) => {
  const [siteExpanded, setSiteExpanded] = useState(false);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const logoInputRef = useRef<HTMLInputElement | null>(null);

  const workTypes = INDUSTRY_WORK_TYPES[industry];
  const activeSeason = SEASONAL_RISKS[siteInfo.seasonRisk];

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      onUploadJsonFile(file);
      e.target.value = '';
    }
  };

  const handleLogoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      onUploadLogoFile(file);
      e.target.value = '';
    }
  };

  return (
    <aside className="no-print w-full lg:w-[340px] xl:w-[360px] shrink-0 bg-white border-b lg:border-b-0 lg:border-r border-slate-200 flex flex-col">
      <div className="p-5 space-y-5 flex-1 overflow-y-auto">
        {/* 1. Industry Selection */}
        <div className="space-y-2">
          <label className="block text-[12px] font-bold text-slate-700">1. 업종 선택</label>
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
                      ? 'bg-slate-900 text-white shadow-sm'
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

        {/* 2. Work Type Dropdown */}
        <div className="space-y-1.5">
          <label htmlFor="work-type-select" className="block text-[12px] font-bold text-slate-700">
            2. 세부 작업유형 ({industry})
          </label>
          <div className="relative">
            <select
              id="work-type-select"
              value={workType}
              onChange={(e) => onSelectWorkType(e.target.value)}
              className="w-full appearance-none rounded-lg border border-slate-300 bg-white px-3.5 py-2.5 pr-9 text-[12.5px] font-semibold text-slate-900 focus:outline-none focus:ring-2 focus:ring-slate-900 focus:border-slate-900 transition-shadow cursor-pointer"
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

        {/* 3. Output Format Tabs (3 Modes: OPS / Slides / 4-Cut Card News) */}
        <div className="space-y-1.5">
          <span className="block text-[12px] font-bold text-slate-700">3. 출력 형식</span>
          <div className="grid grid-cols-3 gap-1 p-1 bg-slate-100 rounded-lg">
            <button
              type="button"
              onClick={() => onChangeOutputFormat('ops')}
              className={`flex items-center justify-center gap-1 py-2 px-1.5 rounded-md text-[11.5px] font-semibold transition-all whitespace-nowrap cursor-pointer ${
                outputFormat === 'ops'
                  ? 'bg-white text-slate-900 shadow-sm'
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
                  ? 'bg-white text-slate-900 shadow-sm'
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
                  ? 'bg-white text-slate-900 shadow-sm'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <LayoutGrid className="w-3.5 h-3.5 shrink-0" />
              <span>카드뉴스</span>
            </button>
          </div>
        </div>

        {/* 4. Variation Option */}
        <div className="space-y-1.5">
          <label htmlFor="variation-select" className="block text-[12px] font-bold text-slate-700">
            4. 교육 구성 변주 옵션
          </label>
          <div className="relative">
            <select
              id="variation-select"
              value={variationOption}
              onChange={(e) => onChangeVariation(e.target.value as VariationOption)}
              className="w-full appearance-none rounded-lg border border-slate-300 bg-white px-3.5 py-2 pr-9 text-[12.5px] font-semibold text-slate-900 focus:outline-none focus:ring-2 focus:ring-slate-900 focus:border-slate-900 transition-shadow cursor-pointer"
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

        {/* 5. Primary Generate Action */}
        <div>
          <button
            type="button"
            onClick={onRegenerate}
            className="w-full py-2.5 px-4 rounded-lg bg-orange-600 hover:bg-orange-700 active:scale-[0.99] text-white font-bold text-[13px] flex items-center justify-center gap-2 shadow-sm transition-all cursor-pointer whitespace-nowrap"
          >
            <RefreshCw className="w-4 h-4 shrink-0" />
            <span>새로운 교육자료 제작</span>
          </button>
        </div>

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
                      ? 'bg-slate-900 text-white shadow-sm'
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
            핵심 구호와 4대 예방대책 아래에 선택 외국어를 즉시 병기합니다.
          </p>
        </div>

        <hr className="border-slate-200" />

        {/* 8. Custom Site Inputs, Logo Upload & Print Toggles */}
        <div className="space-y-2.5">
          <button
            type="button"
            onClick={() => setSiteExpanded((prev) => !prev)}
            className="w-full flex items-center justify-between py-1 text-[12px] font-bold text-slate-800 hover:text-slate-950 transition-colors cursor-pointer"
          >
            <span>현장 커스텀 정보 · 로고 삽입</span>
            {siteExpanded ? (
              <ChevronUp className="w-4 h-4 text-slate-500" />
            ) : (
              <ChevronDown className="w-4 h-4 text-slate-500" />
            )}
          </button>

          {siteExpanded && (
            <div className="space-y-3 pt-1">
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
                  className="w-full rounded-md border border-slate-300 px-3 py-2 text-[12px] text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-900"
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
                    className="w-full rounded-md border border-slate-300 px-2.5 py-2 text-[11.5px] text-slate-900 tabular-nums focus:outline-none focus:ring-2 focus:ring-slate-900"
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
                    className="w-full rounded-md border border-slate-300 px-2.5 py-2 text-[12px] text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-900"
                  />
                </div>
              </div>

              {/* Company / Site Logo Upload */}
              <div className="space-y-1.5">
                <span className="block text-[11px] font-semibold text-slate-600">
                  회사·현장 로고 이미지 (PNG/JPG)
                </span>
                <input
                  ref={logoInputRef}
                  type="file"
                  accept="image/png,image/jpeg,image/webp,image/svg+xml"
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
                    <span>로고 PNG 업로드 (포스터·슬라이드 하단 자동 배치)</span>
                  </button>
                )}
              </div>
            </div>
          )}

          {/* Toggle: TBM Attendee 10-slot Signature Table */}
          <label className="flex items-center justify-between gap-3 py-1.5 cursor-pointer select-none">
            <div>
              <span className="block text-[12px] font-semibold text-slate-800">
                TBM 교육 참석자 서명란 (10칸)
              </span>
              <span className="block text-[10.8px] text-slate-500">
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

          {/* Toggle: Cross-process related case */}
          <label className="flex items-center justify-between gap-3 py-1 cursor-pointer select-none">
            <div>
              <span className="block text-[12px] font-semibold text-slate-800">
                유사공정 교차사례 포함
              </span>
              <span className="block text-[10.8px] text-slate-500">
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

        <hr className="border-slate-200" />

        {/* 9. JSON DB Upload & Extension */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <span className="inline-flex items-center gap-1.5 text-[12px] font-bold text-slate-700">
              <Database className="w-3.5 h-3.5 text-slate-500" />
              <span>사고사례 JSON DB 확장</span>
            </span>
            <span className="text-[11px] font-semibold text-slate-600 tabular-nums">
              총 {totalDbCount.toLocaleString('ko-KR')}건
              {customDbCount > 0 ? ` (추가 ${customDbCount.toLocaleString('ko-KR')}건)` : ''}
            </span>
          </div>

          <input
            ref={fileInputRef}
            type="file"
            accept=".json,application/json"
            onChange={handleFileChange}
            className="hidden"
          />

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="flex-1 py-2 px-3 rounded-lg border border-slate-300 bg-white hover:bg-slate-50 text-slate-800 text-[12px] font-semibold flex items-center justify-center gap-1.5 transition-colors cursor-pointer whitespace-nowrap"
            >
              <Upload className="w-3.5 h-3.5 shrink-0" />
              <span>JSON DB 업로드</span>
            </button>
            <button
              type="button"
              onClick={onDownloadSampleJson}
              title="추가 사고사례 JSON 샘플 양식 다운로드"
              className="py-2 px-2.5 rounded-lg border border-slate-200 bg-slate-50 hover:bg-slate-100 text-slate-600 hover:text-slate-900 text-[11.5px] font-medium flex items-center gap-1 transition-colors cursor-pointer whitespace-nowrap"
            >
              <Download className="w-3.5 h-3.5 shrink-0" />
              <span>샘플</span>
            </button>
          </div>
        </div>
      </div>
    </aside>
  );
};
