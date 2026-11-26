import React, { useEffect, useState } from 'react';
import {
  ChevronLeft,
  ChevronRight,
  AlertTriangle,
  Eye,
  EyeOff,
  Scale,
  Repeat,
  CloudAlert,
  Globe,
  Lock,
  FileText,
  RotateCcw,
  Plus,
  X,
} from 'lucide-react';
import { CustomSiteInfo, GeneratedMaterial } from '../types/safety';
import { AccidentMechanismDiagram, HazardPictogram } from './SafetyVisuals';
import {
  getCaseTranslations,
  getForeignLanguageNativeLabel,
  getSeasonalTranslation,
} from '../data/multilingualDict';
import { SEASONAL_RISKS } from '../data/seasonalRisks';
import {
  fitFactualOverviewForA4,
  formatCrossProcessSummaryVerbatim,
  formatSourceHeaderBadge,
  getCaseOverviewVerbatim,
  getCrossProcessSourceBadge,
  getDisplaySourceRef,
  getSourceBrandStyle,
  isOfficialKoshaApiCase,
  splitSifBracketHighlights,
} from '../utils/textFit';

interface SlideDeckViewProps {
  material: GeneratedMaterial;
  siteInfo: CustomSiteInfo;
  activeSlide: number;
  onChangeSlide: (index: number) => void;
  showKytAnswers: boolean;
  onToggleKytAnswers: () => void;
  onUpdateMeasures: (nextMeasures: string[]) => void;
  onResetMeasures: () => void;
  onUpdateTbm: (nextTbm: string[]) => void;
  onResetTbm: () => void;
  slideRef: React.RefObject<HTMLDivElement | null>;
}

const SLIDE_META = [
  { num: 1, title: '표지 · 핵심 구호' },
  { num: 2, title: '재해개요 · 메커니즘' },
  { num: 3, title: '원인·SIF · O/X 비교' },
  { num: 4, title: '예방대책 · 유사공정' },
  { num: 5, title: 'TBM 체크 · KYT 퀴즈' },
];

export const SlideDeckView: React.FC<SlideDeckViewProps> = ({
  material,
  siteInfo,
  activeSlide,
  onChangeSlide,
  showKytAnswers,
  onToggleKytAnswers,
  onUpdateMeasures,
  onResetMeasures,
  onUpdateTbm,
  onResetTbm,
  slideRef,
}) => {
  const { primaryCase: c, relatedCase, theme, isExactMatch, perspectiveMode } = material;
  const [editingMeasureIdx, setEditingMeasureIdx] = useState<number | null>(null);
  const [editingTbmIdx, setEditingTbmIdx] = useState<number | null>(null);

  useEffect(() => {
    setEditingMeasureIdx(null);
    setEditingTbmIdx(null);
  }, [c.id, activeSlide]);

  const inkSaver = Boolean(siteInfo.inkSaverMode);
  const sourceBrand = getSourceBrandStyle(c);
  const sourceBadgeLabel = formatSourceHeaderBadge(c);
  const isSif = c.source_type === 'SIF';
  const isFatality = c.source_type === 'FATALITY';
  const accentHex = inkSaver
    ? '#0F172A'
    : isFatality || isSif
      ? sourceBrand.primaryHex
      : theme.primaryHex;

  const isOfficialKosha = isOfficialKoshaApiCase(c);
  const isMeasuresEdited = Boolean(material.isMeasuresEdited);
  const isTbmEdited = Boolean(material.isTbmEdited);
  const measuresSourceLabel = isMeasuresEdited
    ? isOfficialKosha
      ? '공단 권고안 기반 · 현장 맞춤 반영'
      : '표준 가이드 기반 · 현장 맞춤 반영'
    : !isOfficialKosha
      ? '표준 가이드'
      : isSif
        ? '공단 원문 (SIF 위험성감소대책)'
        : '공단 원문 가이드';

  const siteLabel = siteInfo.siteName.trim() || '________________';
  const dateLabel = siteInfo.educationDate || new Date().toISOString().slice(0, 10);
  const instructorLabel = siteInfo.instructorName.trim() || '________________';

  const translations = getCaseTranslations(c, siteInfo.foreignLanguage);
  const langLabel = getForeignLanguageNativeLabel(siteInfo.foreignLanguage);
  const season = SEASONAL_RISKS[siteInfo.seasonRisk];
  const seasonTrans = getSeasonalTranslation(siteInfo.seasonRisk, siteInfo.foreignLanguage);

  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null;
      if (target && ['INPUT', 'SELECT', 'TEXTAREA'].includes(target.tagName)) return;
      if (e.key === 'ArrowLeft') {
        onChangeSlide(Math.max(0, activeSlide - 1));
      } else if (e.key === 'ArrowRight') {
        onChangeSlide(Math.min(4, activeSlide + 1));
      }
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [activeSlide, onChangeSlide]);

  const renderSlideHeader = (sectionTitle: string) => (
    <div className="shrink-0">
      <div
        className={`px-6 py-3 flex items-center justify-between gap-4 ${
          inkSaver
            ? 'bg-white text-slate-950 border-b-2 border-slate-900'
            : 'bg-slate-900 text-white'
        }`}
      >
        <h2 className="text-[15.5px] font-bold tracking-tight keep-all">{sectionTitle}</h2>
        <span
          className="shrink-0 px-2.5 py-1 rounded-sm text-[10.8px] font-bold text-white"
          style={{ backgroundColor: accentHex }}
        >
          {sourceBrand.shortLabel} · {c.hazard_type}
        </span>
      </div>
      {!inkSaver && <div className="h-1 w-full" style={{ backgroundColor: accentHex }} />}
    </div>
  );

  const renderSlideFooter = (pageNum: number) => (
    <div className="shrink-0 border-t border-slate-200 px-6 py-2 bg-slate-50 flex items-center justify-between gap-3 text-[10.5px] text-slate-600 tabular-nums">
      <div className="flex items-center gap-2.5 min-w-0">
        {siteInfo.logoDataUrl && (
          <img
            src={siteInfo.logoDataUrl}
            alt="회사/현장 로고"
            className="h-5 max-w-[92px] object-contain shrink-0 bg-white px-1 py-0.5 rounded-sm border border-slate-200"
          />
        )}
        <span className="keep-all">
          현장: {siteLabel} · 출처: {getDisplaySourceRef(c)} · 코드 {c.id} · {dateLabel}
        </span>
      </div>
      <span className="font-bold text-slate-800 shrink-0">{pageNum} / 5</span>
    </div>
  );

  const renderCurrentSlide = () => {
    // SLIDE 1: Cover
    if (activeSlide === 0) {
      return (
        <div
          className={`w-full h-full flex flex-col justify-between overflow-hidden ${
            inkSaver ? 'bg-white text-slate-950' : 'bg-slate-900 text-white'
          }`}
        >
          <div className="h-3 w-full shrink-0" style={{ backgroundColor: accentHex }} />
          <div className="flex-1 grid grid-cols-12 overflow-hidden">
            <div className="col-span-9 p-7 flex flex-col justify-between gap-3">
              <div className="space-y-2.5">
                {season.id !== 'always' && (
                  <div
                    className="rounded-sm px-3 py-1.5 flex items-center gap-2 text-[11px] text-white"
                    style={{ backgroundColor: inkSaver ? '#0F172A' : season.badgeBgHex }}
                  >
                    <CloudAlert className="w-3.5 h-3.5 shrink-0" />
                    <span className="font-extrabold shrink-0">{season.badgeText}</span>
                    <span className="opacity-95 keep-all">{season.extraRule}</span>
                  </div>
                )}

                <div className="flex items-center flex-wrap gap-2">
                  <span
                    className="px-3 py-1 rounded-sm text-[11.2px] font-extrabold text-white"
                    style={{ backgroundColor: accentHex }}
                  >
                    [{sourceBadgeLabel}] {material.selectedIndustry} · {material.selectedWorkType}
                  </span>
                  {!isExactMatch && (
                    <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-sm bg-amber-100 text-amber-950 text-[10.5px] font-bold">
                      <AlertTriangle className="w-3.5 h-3.5 text-amber-700" />
                      유사 공정 기반 위험요인 분석 자료
                    </span>
                  )}
                </div>

                <h1
                  className={`font-extrabold leading-tight tracking-tight [text-wrap:balance] keep-all pt-1 ${
                    season.id !== 'always' ? 'text-[24px]' : 'text-[27px]'
                  }`}
                >
                  {c.title}
                </h1>

                <p className={`text-[12px] ${inkSaver ? 'text-slate-700' : 'text-slate-300'}`}>
                  중점 기인물: {c.equipment} &nbsp;·&nbsp; 대책 기준: {measuresSourceLabel}
                </p>
              </div>

              <div
                className={`rounded-md border px-5 py-3.5 ${
                  inkSaver ? 'bg-slate-50 border-slate-900' : 'bg-slate-800/90'
                }`}
                style={inkSaver ? undefined : { borderColor: accentHex }}
              >
                <span
                  className={`block text-[10.5px] font-bold mb-0.5 ${
                    inkSaver ? 'text-slate-700' : 'text-amber-300'
                  }`}
                >
                  근로자 핵심 안전 구호{translations ? ` · ${langLabel} 병기` : ''}
                </span>
                <p className="text-[16.5px] font-extrabold leading-snug keep-all">
                  “{c.worker_slogan}”
                </p>
                {translations && (
                  <p
                    className={`text-[12px] font-semibold leading-snug mt-1 ${
                      inkSaver ? 'text-slate-700' : 'text-amber-200'
                    }`}
                  >
                    {translations.slogan}
                  </p>
                )}
              </div>
            </div>

            <div
              className={`col-span-3 border-l p-5 flex flex-col justify-between ${
                inkSaver ? 'bg-slate-50 border-slate-300' : 'bg-slate-800/80 border-slate-700/80'
              }`}
            >
              <div className="flex flex-col items-start gap-2.5">
                <div className="bg-white rounded-md p-2 border border-slate-200">
                  <HazardPictogram hazardType={c.hazard_type} size={52} inkSaver={inkSaver} />
                </div>
                <div>
                  <p className="text-[14.5px] font-extrabold leading-snug">
                    중대재해 예방
                    <br />
                    현장 안전교육
                  </p>
                  <div className="h-0.5 w-12 mt-1.5" style={{ backgroundColor: accentHex }} />
                </div>
              </div>

              <dl className="space-y-2 text-[11px]">
                <div>
                  <dt className="text-slate-400 text-[9.5px]">재해유형</dt>
                  <dd className="font-bold">{c.hazard_type}</dd>
                </div>
                <div>
                  <dt className="text-slate-400 text-[9.5px]">현장명</dt>
                  <dd className="font-bold break-words">{siteLabel}</dd>
                </div>
                <div>
                  <dt className="text-slate-400 text-[9.5px]">교육일자</dt>
                  <dd className="font-bold tabular-nums">{dateLabel}</dd>
                </div>
                <div>
                  <dt className="text-slate-400 text-[9.5px]">교육강사</dt>
                  <dd className="font-bold break-words">{instructorLabel}</dd>
                </div>
              </dl>

              {siteInfo.logoDataUrl && (
                <div className="bg-white rounded p-1.5 border border-slate-200 flex items-center justify-center">
                  <img
                    src={siteInfo.logoDataUrl}
                    alt="회사/현장 로고"
                    className="max-h-9 max-w-full object-contain"
                  />
                </div>
              )}
            </div>
          </div>
        </div>
      );
    }

    // SLIDE 2: Verbatim Factual Overview + 4-Stage Mechanism
    if (activeSlide === 1) {
      const overviewFit = fitFactualOverviewForA4(getCaseOverviewVerbatim(c), 0, false, 310);
      return (
        <div className="w-full h-full bg-white flex flex-col justify-between overflow-hidden">
          {renderSlideHeader(
            isOfficialKosha
              ? '01. 중대재해 사고 개요 [공단 공식 원문] 및 발생 메커니즘'
              : '01. 중대재해 사고 개요 [표준 교육모델] 및 발생 메커니즘'
          )}
          <div className="flex-1 px-6 py-4 flex flex-col justify-between gap-3.5 overflow-hidden">
            <div
              className="rounded-md border p-4 space-y-2"
              style={{
                backgroundColor: inkSaver ? '#F8FAFC' : sourceBrand.softBgHex,
                borderColor: inkSaver ? '#334155' : sourceBrand.borderHex,
              }}
            >
              <div className="flex items-center justify-between gap-2">
                <span
                  className="inline-flex items-center gap-1 text-[11.5px] font-extrabold"
                  style={{ color: isOfficialKosha ? accentHex : '#334155' }}
                >
                  {isOfficialKosha ? (
                    <Lock className="w-3.5 h-3.5 shrink-0" />
                  ) : (
                    <FileText className="w-3.5 h-3.5 shrink-0" />
                  )}
                  <span>
                    {isOfficialKosha ? '사고 개요 공단 공식 원문' : '사고 개요 표준 교육모델'} ·
                    기인물: {c.equipment}
                  </span>
                </span>
                {overviewFit.isExcerpted && (
                  <span className="px-2 py-0.5 rounded bg-amber-100 text-amber-900 text-[10px] font-bold">
                    [원문 일부 발췌]
                  </span>
                )}
              </div>
              <p
                className="text-slate-900 font-medium keep-all"
                style={{ fontSize: overviewFit.fontSizeCss, lineHeight: overviewFit.lineHeightCss }}
              >
                {overviewFit.displayText}
              </p>
              {c.disclaimer && (
                <p className="text-[10.5px] font-semibold text-red-800 pt-1 border-t border-red-200/70">
                  {c.disclaimer}
                </p>
              )}
            </div>

            <div className="space-y-1.5">
              <p className="text-[12.5px] font-bold text-slate-900">사고 발생 4단계 메커니즘 도식</p>
              <AccidentMechanismDiagram
                timeline={c.timeline}
                theme={theme}
                inkSaver={inkSaver}
                accentHex={accentHex}
              />
            </div>
          </div>
          {renderSlideFooter(2)}
        </div>
      );
    }

    // SLIDE 3: SIF Official Analysis / Cause Analysis / O-X Comparison
    if (activeSlide === 2) {
      const showOxFocus = perspectiveMode === 'ox_compare';
      return (
        <div className="w-full h-full bg-white flex flex-col justify-between overflow-hidden">
          {renderSlideHeader(
            showOxFocus
              ? '02. 잘못된 현장 관행(X) vs 안전 원칙(O) 대조'
              : isSif
                ? '02. SIF 고위험작업·재해유발요인 [공단 공식 원문]'
                : '02. 핵심 위험요인 및 관리적 근본원인 분석'
          )}
          <div className="flex-1 px-6 py-4 flex flex-col justify-center overflow-hidden">
            {showOxFocus ? (
              <div className="space-y-3">
                {c.ox_comparison.map((pair, idx) => (
                  <div key={idx} className="border border-slate-300 rounded-md overflow-hidden">
                    <div className="grid grid-cols-2 divide-x divide-slate-200">
                      <div className={inkSaver ? 'bg-white p-3.5' : 'bg-red-50/80 p-3.5'}>
                        <div className="flex items-center gap-2 mb-1">
                          <span className="w-5 h-5 rounded-sm bg-red-700 text-white text-[11px] font-bold flex items-center justify-center">
                            X
                          </span>
                          <span className="text-[11.5px] font-bold text-red-800">
                            잘못된 현장 관행 {idx + 1}
                          </span>
                        </div>
                        <p className="text-[13px] font-bold text-slate-900 leading-snug keep-all">
                          {pair.wrong}
                        </p>
                      </div>
                      <div className={inkSaver ? 'bg-slate-50 p-3.5' : 'bg-emerald-50/80 p-3.5'}>
                        <div className="flex items-center gap-2 mb-1">
                          <span className="w-5 h-5 rounded-sm bg-emerald-700 text-white text-[11px] font-bold flex items-center justify-center">
                            O
                          </span>
                          <span className="text-[11.5px] font-bold text-emerald-800">
                            반드시 지켜야 할 원칙 {idx + 1}
                          </span>
                        </div>
                        <p className="text-[13px] font-bold text-slate-900 leading-snug keep-all">
                          {pair.right}
                        </p>
                      </div>
                    </div>
                    <div className="bg-slate-50 border-t border-slate-200 px-4 py-1.5 text-[11px] text-slate-700">
                      <span className="font-bold text-slate-900">위험 해설:</span> {pair.note}
                    </div>
                  </div>
                ))}
              </div>
            ) : isSif ? (
              <div className="grid grid-cols-12 gap-4 h-full">
                <div
                  className="col-span-7 rounded-md border overflow-hidden flex flex-col"
                  style={{ borderColor: accentHex }}
                >
                  <div
                    className="px-4 py-2.5 text-white text-[12.5px] font-bold flex items-center gap-1.5"
                    style={{ backgroundColor: accentHex }}
                  >
                    <Lock className="w-3.5 h-3.5 shrink-0" />
                    <span>SIF 고위험작업 및 재해유발요인 (공단 원문 고정)</span>
                  </div>
                  <div className="flex-1 p-4 space-y-3 bg-amber-50/40 keep-all">
                    <div>
                      <span className="block text-[10.5px] font-extrabold text-amber-900 mb-0.5">
                        고위험작업·상황 (Potential)
                      </span>
                      <p className="text-[13px] font-bold text-slate-950 leading-snug">
                        {c.high_risk_work || c.work_type}
                      </p>
                    </div>
                    <div className="pt-2 border-t border-amber-200">
                      <span className="block text-[10.5px] font-extrabold text-amber-900 mb-1">
                        재해유발요인 (Precursor)
                      </span>
                      <p className="text-[12.5px] text-slate-900 leading-relaxed">
                        {splitSifBracketHighlights(c.hazard_factor || c.direct_causes[0]).map(
                          (seg, i) =>
                            seg.emphasized ? (
                              <strong
                                key={i}
                                className="font-extrabold bg-amber-200/80 text-amber-950 px-0.5 rounded-xs"
                              >
                                {seg.text}
                              </strong>
                            ) : (
                              <React.Fragment key={i}>{seg.text}</React.Fragment>
                            )
                        )}
                      </p>
                    </div>
                  </div>
                </div>

                <div className="col-span-5 flex flex-col justify-between gap-3 keep-all">
                  <div className="rounded-md border border-slate-300 p-4 space-y-2 bg-white">
                    <p className="text-[12px] font-extrabold text-slate-900">분류 및 기인물 정보</p>
                    <p className="text-[11.5px] text-slate-700">
                      <strong>업종·공종:</strong> {c.process || c.industry}
                    </p>
                    <p className="text-[11.5px] text-slate-700">
                      <strong>핵심 기인물:</strong> {c.equipment}
                    </p>
                    <p className="text-[11px] text-slate-500">{c.source_ref}</p>
                  </div>

                  <div className="rounded-md border border-slate-200 bg-slate-50 p-3.5 space-y-1.5">
                    <p className="text-[11.5px] font-bold text-slate-900">관행 vs 원칙 핵심 대비</p>
                    <p className="text-[11.2px] text-red-700 leading-snug">
                      <span className="font-bold">X</span> {c.ox_comparison[0].wrong}
                    </p>
                    <p className="text-[11.2px] text-emerald-800 font-semibold leading-snug">
                      <span className="font-bold">O</span> {c.ox_comparison[0].right}
                    </p>
                  </div>
                </div>
              </div>
            ) : (
              <div className="grid grid-cols-12 gap-4 h-full">
                <div
                  className="col-span-6 rounded-md border overflow-hidden flex flex-col"
                  style={{ borderColor: accentHex }}
                >
                  <div
                    className="px-4 py-2.5 text-white text-[12.5px] font-bold flex items-center gap-1.5"
                    style={{ backgroundColor: accentHex }}
                  >
                    {isOfficialKosha ? (
                      <>
                        <Lock className="w-3.5 h-3.5 shrink-0" />
                        <span>핵심 위험요인 (원문 고정)</span>
                      </>
                    ) : (
                      <>
                        <FileText className="w-3.5 h-3.5 shrink-0" />
                        <span>핵심 위험요인 (표준 교육모델)</span>
                      </>
                    )}
                  </div>
                  <div className="flex-1 p-3.5 space-y-2.5 bg-white">
                    {c.direct_causes.map((cause, idx) => (
                      <div
                        key={idx}
                        className="rounded border border-slate-200 p-2.5 keep-all"
                        style={{ backgroundColor: inkSaver ? '#F8FAFC' : theme.softBgHex }}
                      >
                        <span
                          className="block text-[10px] font-bold mb-0.5 tabular-nums"
                          style={{ color: accentHex }}
                        >
                          위험요인 0{idx + 1}
                        </span>
                        <p className="text-[12px] font-semibold text-slate-900 leading-snug">
                          {cause}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="col-span-6 flex flex-col gap-3 keep-all">
                  <div className="flex-1 rounded-md border border-slate-300 overflow-hidden flex flex-col">
                    <div className="px-4 py-2.5 bg-slate-800 text-white text-[12.5px] font-bold">
                      근본 원인 (관리·시스템 미흡)
                    </div>
                    <ul className="p-4 space-y-2.5 text-[12px] text-slate-800">
                      {c.root_causes.map((root, idx) => (
                        <li key={idx} className="flex items-start gap-2 leading-snug">
                          <span className="font-bold text-slate-900">•</span>
                          <span className="font-medium">{root}</span>
                        </li>
                      ))}
                    </ul>
                  </div>

                  <div className="rounded-md border border-slate-200 bg-slate-50 p-3.5 space-y-1">
                    <p className="text-[11.5px] font-bold text-slate-900">관행 vs 원칙 핵심 대비</p>
                    <p className="text-[11.2px] text-red-700 leading-snug">
                      <span className="font-bold">X</span> {c.ox_comparison[0].wrong}
                    </p>
                    <p className="text-[11.2px] text-emerald-800 font-semibold leading-snug">
                      <span className="font-bold">O</span> {c.ox_comparison[0].right}
                    </p>
                  </div>
                </div>
              </div>
            )}
          </div>
          {renderSlideFooter(3)}
        </div>
      );
    }

    // SLIDE 4: Editable Preventive Measures + Cross-Process Warning
    if (activeSlide === 3) {
      const relatedSummary = relatedCase
        ? formatCrossProcessSummaryVerbatim(relatedCase)
        : null;

      return (
        <div className="w-full h-full bg-white flex flex-col justify-between overflow-hidden">
          {renderSlideHeader(
            `03. ${isSif ? 'SIF 위험성감소대책' : '핵심 예방대책'} [${measuresSourceLabel}]`
          )}
          <div className="flex-1 px-6 py-3 grid grid-cols-12 gap-4 overflow-hidden">
            <div
              className={`${
                relatedCase ? 'col-span-8' : 'col-span-12'
              } flex flex-col justify-between gap-2 overflow-hidden`}
            >
              <div className="space-y-1.5 overflow-y-auto pr-0.5">
                <div
                  data-export-hide="true"
                  className="no-print flex items-center justify-between text-[10.5px] pb-0.5"
                >
                  <span className="text-slate-500">항목을 클릭하면 현장 맞춤으로 바로 편집됩니다.</span>
                  <div className="flex items-center gap-1.5">
                    {c.preventive_measures.length < 6 && (
                      <button
                        type="button"
                        onClick={() =>
                          onUpdateMeasures([
                            ...c.preventive_measures,
                            '현장 추가 안전대책을 입력하세요.',
                          ])
                        }
                        className="inline-flex items-center gap-0.5 px-2 py-0.5 rounded border border-slate-300 bg-white hover:bg-slate-50 font-bold text-slate-700 cursor-pointer"
                      >
                        <Plus className="w-3 h-3" />
                        <span>추가</span>
                      </button>
                    )}
                    {isMeasuresEdited && (
                      <button
                        type="button"
                        onClick={onResetMeasures}
                        className="inline-flex items-center gap-0.5 px-2 py-0.5 rounded border border-orange-300 bg-orange-50 hover:bg-orange-100 font-bold text-orange-800 cursor-pointer"
                      >
                        <RotateCcw className="w-3 h-3" />
                        <span>{isOfficialKosha ? '↺ 공단 원문 복원' : '↺ 표준 가이드 복원'}</span>
                      </button>
                    )}
                  </div>
                </div>

                {c.preventive_measures.map((measure, idx) => (
                  <div
                    key={idx}
                    className="group flex items-stretch rounded-md border border-slate-200 overflow-hidden bg-white"
                  >
                    <div
                      className="w-8 shrink-0 text-white font-bold text-[12px] flex items-center justify-center tabular-nums"
                      style={{ backgroundColor: accentHex }}
                    >
                      0{idx + 1}
                    </div>
                    <div className="flex-1 px-3 py-1.5 flex items-center justify-between gap-2 keep-all">
                      {editingMeasureIdx === idx ? (
                        <input
                          type="text"
                          autoFocus
                          value={measure}
                          onChange={(e) => {
                            const next = [...c.preventive_measures];
                            next[idx] = e.target.value;
                            onUpdateMeasures(next);
                          }}
                          onBlur={() => setEditingMeasureIdx(null)}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter' || e.key === 'Escape') {
                              e.preventDefault();
                              setEditingMeasureIdx(null);
                            }
                          }}
                          className="w-full rounded border border-orange-400 px-2 py-0.5 text-[11.5px] font-semibold text-slate-950 focus:outline-none"
                        />
                      ) : (
                        <div
                          onClick={() => setEditingMeasureIdx(idx)}
                          className="flex-1 cursor-text"
                        >
                          <p
                            className={`font-semibold text-slate-900 leading-snug ${
                              translations || c.preventive_measures.length >= 5
                                ? 'text-[11px]'
                                : 'text-[11.8px]'
                            }`}
                          >
                            {measure}
                          </p>
                          {translations && translations.measures[idx] && (
                            <p
                              className="text-[9.8px] font-medium leading-tight mt-0.5 flex items-center gap-1"
                              style={{ color: accentHex }}
                            >
                              <Globe className="w-3 h-3 shrink-0" />
                              <span>{translations.measures[idx]}</span>
                            </p>
                          )}
                        </div>
                      )}

                      {c.preventive_measures.length > 1 && editingMeasureIdx !== idx && (
                        <button
                          type="button"
                          data-export-hide="true"
                          onClick={() =>
                            onUpdateMeasures(c.preventive_measures.filter((_, i) => i !== idx))
                          }
                          aria-label="대책 삭제"
                          className="no-print opacity-0 group-hover:opacity-100 p-0.5 text-slate-400 hover:text-red-600 cursor-pointer"
                        >
                          <X className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>

              <div className="rounded-md border border-slate-200 bg-slate-100 px-3 py-1.5 flex items-center justify-between gap-2 text-[10.5px] text-slate-700 font-semibold keep-all">
                <span className="inline-flex items-center gap-1.5">
                  <Scale className="w-3.5 h-3.5 text-slate-600 shrink-0" />
                  <span>{c.legal_ref}</span>
                </span>
                <span className="shrink-0 font-bold text-slate-800">{measuresSourceLabel}</span>
              </div>
            </div>

            {relatedCase && relatedSummary && (() => {
              const crossBadge = getCrossProcessSourceBadge(relatedCase);
              return (
                <div className="col-span-4 rounded-md border border-amber-400 bg-amber-50/70 overflow-hidden flex flex-col justify-between keep-all">
                  <div>
                    <div className="bg-amber-700 text-white px-3.5 py-2 flex items-center justify-between gap-1.5 text-[11.2px] font-bold">
                      <span className="inline-flex items-center gap-1.5">
                        <Repeat className="w-3.5 h-3.5 shrink-0" />
                        <span>타 업종 유사 공정 주의 사례</span>
                      </span>
                      <span className="px-1.5 py-0.5 rounded-sm bg-white/20 text-[9px] font-bold shrink-0">
                        {crossBadge.label}
                      </span>
                    </div>
                    <div className="p-3 space-y-1.5">
                      <div className="text-[10px] font-bold text-amber-900">
                        {relatedCase.industry} · {relatedCase.hazard_type} · {relatedCase.work_type}
                      </div>
                      <h3 className="text-[12px] font-bold text-slate-900 leading-snug">
                        {relatedCase.title}
                      </h3>
                      <p className="text-[10.4px] text-slate-800 leading-snug">
                        {relatedSummary.text}
                      </p>
                    </div>
                  </div>
                  <div className="m-3 mt-0 rounded border border-amber-300 bg-white p-2.5 text-[10.2px] font-bold text-amber-950 leading-snug">
                    핵심 교훈: {relatedCase.preventive_measures[0]}
                  </div>
                </div>
              );
            })()}
          </div>
          {renderSlideFooter(4)}
        </div>
      );
    }

    // SLIDE 5: Editable TBM Checklist + KYT Quiz + Bilingual Slogan
    return (
      <div className="w-full h-full bg-white flex flex-col justify-between overflow-hidden">
        {renderSlideHeader('04. 작업 전 5분 TBM 체크리스트 및 위험예지(KYT) 퀴즈')}
        <div className="flex-1 px-6 py-3.5 grid grid-cols-12 gap-4 overflow-hidden">
          <div className="col-span-7 rounded-md border border-slate-200 overflow-hidden flex flex-col">
            <div className="bg-slate-900 text-white px-4 py-2 flex items-center justify-between text-[11.5px] font-bold">
              <span>
                작업 전 5분 TBM 점검표 (
                {isTbmEdited
                  ? isOfficialKosha
                    ? '공단 권고안 기반 · 현장 맞춤 반영'
                    : '표준 가이드 기반 · 현장 맞춤 반영'
                  : isOfficialKosha
                    ? '공단 원문 가이드'
                    : '표준 가이드'}
                )
              </span>
              <div data-export-hide="true" className="no-print flex items-center gap-1.5">
                {c.tbm_checklist.length < 7 && (
                  <button
                    type="button"
                    onClick={() =>
                      onUpdateTbm([
                        ...c.tbm_checklist,
                        '작업 전 현장 추가 점검항목을 확인했는가?',
                      ])
                    }
                    className="px-1.5 py-0.5 rounded bg-white/15 hover:bg-white/25 text-[10px] cursor-pointer"
                  >
                    + 추가
                  </button>
                )}
                {isTbmEdited && (
                  <button
                    type="button"
                    onClick={onResetTbm}
                    className="px-1.5 py-0.5 rounded bg-orange-500 hover:bg-orange-600 text-[10px] cursor-pointer"
                  >
                    ↺ 복원
                  </button>
                )}
              </div>
            </div>
            <ul className="flex-1 p-3 divide-y divide-slate-100 flex flex-col justify-between overflow-y-auto keep-all">
              {c.tbm_checklist.map((item, idx) => (
                <li
                  key={idx}
                  className="group flex items-start justify-between gap-2 py-1 text-[11.2px] text-slate-900 leading-snug"
                >
                  <div className="flex items-start gap-2 flex-1">
                    <span
                      className="w-4 h-4 mt-0.5 shrink-0 border-2 rounded-[2px] bg-white"
                      style={{ borderColor: accentHex }}
                    />
                    {editingTbmIdx === idx ? (
                      <input
                        type="text"
                        autoFocus
                        value={item}
                        onChange={(e) => {
                          const next = [...c.tbm_checklist];
                          next[idx] = e.target.value;
                          onUpdateTbm(next);
                        }}
                        onBlur={() => setEditingTbmIdx(null)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter' || e.key === 'Escape') {
                            e.preventDefault();
                            setEditingTbmIdx(null);
                          }
                        }}
                        className="w-full rounded border border-orange-400 px-1.5 py-0.5 text-[11px] font-semibold focus:outline-none"
                      />
                    ) : (
                      <span
                        onClick={() => setEditingTbmIdx(idx)}
                        className="font-medium cursor-text"
                      >
                        <strong className="tabular-nums mr-1">{idx + 1}.</strong>
                        {item}
                      </span>
                    )}
                  </div>
                  {c.tbm_checklist.length > 1 && editingTbmIdx !== idx && (
                    <button
                      type="button"
                      data-export-hide="true"
                      onClick={() =>
                        onUpdateTbm(c.tbm_checklist.filter((_, i) => i !== idx))
                      }
                      className="no-print opacity-0 group-hover:opacity-100 text-slate-400 hover:text-red-600 p-0.5 cursor-pointer"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  )}
                </li>
              ))}
            </ul>
          </div>

          <div className="col-span-5 flex flex-col justify-between gap-2.5 keep-all">
            <div
              className="flex-1 rounded-md border overflow-hidden flex flex-col"
              style={{
                backgroundColor: inkSaver ? '#F8FAFC' : theme.softBgHex,
                borderColor: accentHex,
              }}
            >
              <div
                className="px-3.5 py-2 text-white flex items-center justify-between text-[11.5px] font-bold"
                style={{ backgroundColor: accentHex }}
              >
                <span>현장 위험예지(KYT) 퀴즈</span>
                <button
                  type="button"
                  data-export-hide="true"
                  onClick={onToggleKytAnswers}
                  className="no-print inline-flex items-center gap-1 text-[10px] bg-black/20 hover:bg-black/30 px-2 py-0.5 rounded cursor-pointer"
                >
                  {showKytAnswers ? <EyeOff className="w-3 h-3" /> : <Eye className="w-3 h-3" />}
                  <span>{showKytAnswers ? '숨김' : '정답'}</span>
                </button>
              </div>
              <div className="p-3 flex-1 flex flex-col justify-between gap-1.5">
                <p className="text-[11.5px] font-bold text-slate-900 leading-snug">
                  Q. {c.kyt_quiz.question}
                </p>
                {showKytAnswers ? (
                  <ul className="space-y-1 border-t pt-1.5" style={{ borderColor: theme.borderHex }}>
                    {c.kyt_quiz.answers.map((ans, idx) => (
                      <li key={idx} className="text-[10.2px] text-slate-800 leading-snug font-medium">
                        <span className="font-bold mr-1" style={{ color: accentHex }}>
                          ✔ {idx + 1})
                        </span>
                        {ans}
                      </li>
                    ))}
                  </ul>
                ) : (
                  <div className="space-y-1 border-t pt-1.5" style={{ borderColor: theme.borderHex }}>
                    {[1, 2, 3].map((num) => (
                      <div
                        key={num}
                        className="rounded border border-dashed border-slate-400 bg-white px-2 py-1 text-[10px] text-slate-500"
                      >
                        {num}) 토의 기록: ___________________________
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            <div className="rounded-md bg-slate-900 text-white px-4 py-2.5">
              <span className="block text-[9.5px] font-bold text-amber-300 mb-0.5">
                작업 전 다 함께 외치는 안전구호{translations ? ` · ${langLabel}` : ''}
              </span>
              <p className="text-[12.2px] font-extrabold leading-snug">“{c.worker_slogan}”</p>
              {translations && (
                <p className="text-[10px] font-semibold text-amber-200 leading-tight mt-1">
                  {translations.slogan}
                </p>
              )}
              {!translations && seasonTrans && (
                <p className="text-[9.5px] text-slate-300 mt-0.5">{seasonTrans}</p>
              )}
            </div>
          </div>
        </div>
        {renderSlideFooter(5)}
      </div>
    );
  };

  return (
    <div className="w-full max-w-[960px] mx-auto space-y-4">
      <div className="relative flex items-center gap-3">
        <button
          type="button"
          onClick={() => onChangeSlide(Math.max(0, activeSlide - 1))}
          disabled={activeSlide === 0}
          aria-label="이전 슬라이드"
          className="shrink-0 w-10 h-10 rounded-lg border border-slate-300 bg-white text-slate-700 hover:bg-slate-50 hover:text-slate-950 disabled:opacity-35 disabled:cursor-not-allowed flex items-center justify-center transition-colors cursor-pointer"
        >
          <ChevronLeft className="w-5 h-5" />
        </button>

        <div className="flex-1 min-w-0">
          <div
            ref={slideRef}
            className="w-full aspect-video ops-sheet-shadow rounded-sm border border-slate-300 overflow-hidden bg-white"
          >
            {renderCurrentSlide()}
          </div>
        </div>

        <button
          type="button"
          onClick={() => onChangeSlide(Math.min(4, activeSlide + 1))}
          disabled={activeSlide === 4}
          aria-label="다음 슬라이드"
          className="shrink-0 w-10 h-10 rounded-lg border border-slate-300 bg-white text-slate-700 hover:bg-slate-50 hover:text-slate-950 disabled:opacity-35 disabled:cursor-not-allowed flex items-center justify-center transition-colors cursor-pointer"
        >
          <ChevronRight className="w-5 h-5" />
        </button>
      </div>

      {/* Bottom 5-Slide Thumbnail Strip */}
      <div className="grid grid-cols-5 gap-2.5 px-13">
        {SLIDE_META.map((meta, idx) => {
          const isActive = idx === activeSlide;
          return (
            <button
              key={meta.num}
              type="button"
              onClick={() => onChangeSlide(idx)}
              className={`group text-left rounded-md border p-2 transition-all cursor-pointer ${
                isActive
                  ? 'bg-white border-slate-900 ring-2 ring-slate-900/15'
                  : 'bg-white/80 border-slate-200 hover:border-slate-400'
              }`}
            >
              <div
                className="w-full aspect-video rounded-[3px] mb-1.5 overflow-hidden border border-slate-200 flex flex-col"
                style={{
                  backgroundColor: idx === 0 && !inkSaver ? '#0F172A' : '#FFFFFF',
                }}
              >
                <div
                  className="h-1.5 w-full"
                  style={{ backgroundColor: idx === 0 ? accentHex : '#0F172A' }}
                />
                {idx > 0 && (
                  <div className="h-[2px] w-full" style={{ backgroundColor: accentHex }} />
                )}
                <div className="flex-1 p-1.5 flex flex-col justify-between">
                  <div
                    className={`h-1.5 w-3/4 rounded-[1px] ${
                      idx === 0 && !inkSaver ? 'bg-white/75' : 'bg-slate-300'
                    }`}
                  />
                  <div className="grid grid-cols-2 gap-1">
                    <div
                      className={`h-3 rounded-[1px] ${
                        idx === 0 && !inkSaver ? 'bg-slate-700' : 'bg-slate-100'
                      }`}
                    />
                    <div
                      className="h-3 rounded-[1px]"
                      style={{
                        backgroundColor: idx === 0 && !inkSaver ? '#1E293B' : theme.softBgHex,
                      }}
                    />
                  </div>
                </div>
              </div>
              <div className="flex items-center justify-between gap-1">
                <span className="text-[11px] font-bold text-slate-900 tabular-nums">
                  {meta.num}장
                </span>
                <span className="text-[10.5px] text-slate-600 truncate">{meta.title}</span>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
};
