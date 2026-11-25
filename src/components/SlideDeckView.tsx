import React, { useEffect } from 'react';
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
} from 'lucide-react';
import { CustomSiteInfo, GeneratedMaterial } from '../types/safety';
import { AccidentMechanismDiagram, HazardPictogram } from './SafetyVisuals';
import {
  getCaseTranslations,
  getForeignLanguageNativeLabel,
  getSeasonalTranslation,
} from '../data/multilingualDict';
import { SEASONAL_RISKS } from '../data/seasonalRisks';

interface SlideDeckViewProps {
  material: GeneratedMaterial;
  siteInfo: CustomSiteInfo;
  activeSlide: number;
  onChangeSlide: (index: number) => void;
  showKytAnswers: boolean;
  onToggleKytAnswers: () => void;
  slideRef: React.RefObject<HTMLDivElement | null>;
}

const SLIDE_META = [
  { num: 1, title: '표지 · 핵심 구호' },
  { num: 2, title: '사고 재구성 · 타임라인' },
  { num: 3, title: '원인 분석 · O/X 비교' },
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
  slideRef,
}) => {
  const { primaryCase: c, relatedCase, theme, isExactMatch, perspectiveMode } = material;

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
      <div className="bg-slate-900 px-6 py-3 flex items-center justify-between gap-4 text-white">
        <h2 className="text-[16.5px] font-bold tracking-tight truncate">{sectionTitle}</h2>
        <span
          className="shrink-0 px-2.5 py-1 rounded-sm text-[11px] font-bold"
          style={{ backgroundColor: theme.badgeBgHex, color: theme.badgeTextHex }}
        >
          {c.hazard_type} 예방교육
        </span>
      </div>
      <div className="h-1 w-full" style={{ backgroundColor: theme.primaryHex }} />
    </div>
  );

  const renderSlideFooter = (pageNum: number) => (
    <div className="shrink-0 border-t border-slate-200 px-6 py-2 bg-slate-50 flex items-center justify-between gap-3 text-[11px] text-slate-500 tabular-nums">
      <div className="flex items-center gap-2.5 min-w-0">
        {siteInfo.logoDataUrl && (
          <img
            src={siteInfo.logoDataUrl}
            alt="회사/현장 로고"
            className="h-5 max-w-[92px] object-contain shrink-0 bg-white px-1 py-0.5 rounded-sm border border-slate-200"
          />
        )}
        <span className="truncate">
          현장: {siteLabel} · {material.selectedIndustry} · {material.selectedWorkType} · {dateLabel}
        </span>
      </div>
      <span className="font-bold text-slate-700 shrink-0">{pageNum} / 5</span>
    </div>
  );

  const renderCurrentSlide = () => {
    // SLIDE 1: Cover
    if (activeSlide === 0) {
      return (
        <div className="w-full h-full bg-slate-900 text-white flex flex-col justify-between overflow-hidden">
          <div className="h-3 w-full shrink-0" style={{ backgroundColor: theme.primaryHex }} />
          <div className="flex-1 grid grid-cols-12 overflow-hidden">
            {/* Main Left */}
            <div className="col-span-9 p-7 flex flex-col justify-between gap-3">
              <div className="space-y-2.5">
                {season.id !== 'always' && (
                  <div
                    className="rounded-sm px-3 py-1.5 flex items-center gap-2 text-[11px]"
                    style={{ backgroundColor: season.badgeBgHex, color: '#FFFFFF' }}
                  >
                    <CloudAlert className="w-3.5 h-3.5 shrink-0" />
                    <span className="font-extrabold shrink-0">{season.badgeText}</span>
                    <span className="truncate opacity-95">{season.extraRule}</span>
                  </div>
                )}

                <div className="flex items-center flex-wrap gap-2">
                  <span
                    className="px-3 py-1 rounded-sm text-[11.5px] font-bold"
                    style={{ backgroundColor: theme.badgeBgHex, color: theme.badgeTextHex }}
                  >
                    {material.selectedIndustry} · {material.selectedWorkType}
                  </span>
                  {!isExactMatch && (
                    <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-sm bg-amber-100 text-amber-950 text-[10.5px] font-bold">
                      <AlertTriangle className="w-3.5 h-3.5 text-amber-700" />
                      유사 공정 기반 위험요인 분석 자료
                    </span>
                  )}
                </div>

                <h1
                  className={`font-extrabold leading-tight tracking-tight text-white [text-wrap:balance] pt-1 ${
                    season.id !== 'always' ? 'text-[25px]' : 'text-[28px]'
                  }`}
                >
                  {c.title}
                </h1>

                <p className="text-[12.5px] text-slate-300">
                  중점 기인물: {c.equipment} &nbsp;·&nbsp; 구성 관점: {material.perspectiveLabel}
                </p>
              </div>

              <div
                className="rounded-md bg-slate-800/90 border px-5 py-3.5"
                style={{ borderColor: theme.primaryHex }}
              >
                <span className="block text-[10.5px] font-bold text-amber-300 mb-0.5">
                  근로자 핵심 안전 구호{translations ? ` · ${langLabel} 병기` : ''}
                </span>
                <p className="text-[17px] font-extrabold text-white leading-snug">
                  “{c.worker_slogan}”
                </p>
                {translations && (
                  <p className="text-[12.5px] font-semibold text-amber-200 leading-snug mt-1">
                    {translations.slogan}
                  </p>
                )}
              </div>
            </div>

            {/* Right Sidebar Meta + Logo */}
            <div className="col-span-3 bg-slate-800/80 border-l border-slate-700/80 p-5 flex flex-col justify-between">
              <div className="flex flex-col items-start gap-2.5">
                <div className="bg-white rounded-md p-2">
                  <HazardPictogram hazardType={c.hazard_type} size={52} />
                </div>
                <div>
                  <p className="text-[14.5px] font-extrabold text-white leading-snug">
                    중대재해 예방
                    <br />
                    현장 안전교육
                  </p>
                  <div
                    className="h-0.5 w-12 mt-1.5"
                    style={{ backgroundColor: theme.primaryHex }}
                  />
                </div>
              </div>

              <dl className="space-y-2 text-[11px]">
                <div>
                  <dt className="text-slate-400 text-[9.5px]">재해유형</dt>
                  <dd className="font-bold text-white">{c.hazard_type}</dd>
                </div>
                <div>
                  <dt className="text-slate-400 text-[9.5px]">현장명</dt>
                  <dd className="font-bold text-white truncate">{siteLabel}</dd>
                </div>
                <div>
                  <dt className="text-slate-400 text-[9.5px]">교육일자</dt>
                  <dd className="font-bold text-white tabular-nums">{dateLabel}</dd>
                </div>
                <div>
                  <dt className="text-slate-400 text-[9.5px]">교육강사</dt>
                  <dd className="font-bold text-white truncate">{instructorLabel}</dd>
                </div>
              </dl>

              {siteInfo.logoDataUrl && (
                <div className="bg-white rounded p-1.5 flex items-center justify-center">
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

    // SLIDE 2: Accident Reconstruction
    if (activeSlide === 1) {
      return (
        <div className="w-full h-full bg-white flex flex-col justify-between overflow-hidden">
          {renderSlideHeader('01. 중대재해 사고 재구성 및 발생 경위')}
          <div className="flex-1 px-6 py-4 flex flex-col justify-between gap-4 overflow-hidden">
            <div className="rounded-md border border-slate-200 bg-slate-50 p-4">
              <p className="text-[12px] font-bold mb-2" style={{ color: theme.accentTextHex }}>
                사고 개요 3줄 요약 · {c.equipment}
              </p>
              <ul className="space-y-2">
                {c.summary_3lines.map((line, idx) => (
                  <li key={idx} className="flex items-start gap-2.5 text-[13px] text-slate-800 leading-snug">
                    <span className="shrink-0 w-5 h-5 rounded-sm bg-slate-900 text-white text-[11px] font-bold flex items-center justify-center tabular-nums">
                      {idx + 1}
                    </span>
                    <span className="font-medium">{line}</span>
                  </li>
                ))}
              </ul>
            </div>

            <div className="space-y-2">
              <p className="text-[13px] font-bold text-slate-900">사고 발생 4단계 메커니즘 도식</p>
              <AccidentMechanismDiagram timeline={c.timeline} theme={theme} />
            </div>
          </div>
          {renderSlideFooter(2)}
        </div>
      );
    }

    // SLIDE 3: Cause Analysis OR O/X Comparison
    if (activeSlide === 2) {
      const showOxFocus = perspectiveMode === 'ox_compare';
      return (
        <div className="w-full h-full bg-white flex flex-col justify-between overflow-hidden">
          {renderSlideHeader(
            showOxFocus
              ? '02. 잘못된 현장 관행(X) vs 안전 원칙(O) 대조'
              : '02. 직접원인 및 관리적 근본원인 분석'
          )}
          <div className="flex-1 px-6 py-4 flex flex-col justify-center overflow-hidden">
            {showOxFocus ? (
              <div className="space-y-3.5">
                {c.ox_comparison.map((pair, idx) => (
                  <div key={idx} className="border border-slate-200 rounded-md overflow-hidden">
                    <div className="grid grid-cols-2 divide-x divide-slate-200">
                      <div className="bg-red-50/80 p-4">
                        <div className="flex items-center gap-2 mb-1.5">
                          <span className="w-5 h-5 rounded-sm bg-red-700 text-white text-[11px] font-bold flex items-center justify-center">
                            X
                          </span>
                          <span className="text-[12px] font-bold text-red-800">
                            잘못된 현장 관행 {idx + 1}
                          </span>
                        </div>
                        <p className="text-[13.5px] font-bold text-slate-900 leading-snug">
                          {pair.wrong}
                        </p>
                      </div>
                      <div className="bg-emerald-50/80 p-4">
                        <div className="flex items-center gap-2 mb-1.5">
                          <span className="w-5 h-5 rounded-sm bg-emerald-700 text-white text-[11px] font-bold flex items-center justify-center">
                            O
                          </span>
                          <span className="text-[12px] font-bold text-emerald-800">
                            반드시 지켜야 할 원칙 {idx + 1}
                          </span>
                        </div>
                        <p className="text-[13.5px] font-bold text-slate-900 leading-snug">
                          {pair.right}
                        </p>
                      </div>
                    </div>
                    <div className="bg-slate-50 border-t border-slate-200 px-4 py-2 text-[11.5px] text-slate-600">
                      <span className="font-bold text-slate-800">위험 해설:</span> {pair.note}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="grid grid-cols-12 gap-4 h-full">
                <div
                  className="col-span-6 rounded-md border overflow-hidden flex flex-col"
                  style={{ borderColor: theme.primaryHex }}
                >
                  <div
                    className="px-4 py-2.5 text-white text-[13px] font-bold"
                    style={{ backgroundColor: theme.primaryHex }}
                  >
                    직접 원인 (불안전한 상태·행동)
                  </div>
                  <div className="flex-1 p-3.5 space-y-2.5 bg-white">
                    {c.direct_causes.map((cause, idx) => (
                      <div
                        key={idx}
                        className="rounded border border-slate-200 p-3"
                        style={{ backgroundColor: theme.softBgHex }}
                      >
                        <span
                          className="block text-[10.5px] font-bold mb-1 tabular-nums"
                          style={{ color: theme.accentTextHex }}
                        >
                          원인 0{idx + 1}
                        </span>
                        <p className="text-[12.5px] font-semibold text-slate-900 leading-snug">
                          {cause}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="col-span-6 flex flex-col gap-3">
                  <div className="flex-1 rounded-md border border-slate-300 overflow-hidden flex flex-col">
                    <div className="px-4 py-2.5 bg-slate-800 text-white text-[13px] font-bold">
                      근본 원인 (관리·시스템 미흡)
                    </div>
                    <ul className="p-4 space-y-3 text-[12.5px] text-slate-800">
                      {c.root_causes.map((root, idx) => (
                        <li key={idx} className="flex items-start gap-2 leading-snug">
                          <span className="font-bold text-slate-900">•</span>
                          <span className="font-medium">{root}</span>
                        </li>
                      ))}
                    </ul>
                  </div>

                  <div className="rounded-md border border-slate-200 bg-slate-50 p-3.5 space-y-1.5">
                    <p className="text-[11.5px] font-bold text-slate-900">관행 vs 원칙 핵심 대비</p>
                    <p className="text-[11.5px] text-red-700 leading-snug">
                      <span className="font-bold">X</span> {c.ox_comparison[0].wrong}
                    </p>
                    <p className="text-[11.5px] text-emerald-800 font-semibold leading-snug">
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

    // SLIDE 4: Preventive Measures (with Bilingual) & Cross-Process Warning
    if (activeSlide === 3) {
      return (
        <div className="w-full h-full bg-white flex flex-col justify-between overflow-hidden">
          {renderSlideHeader(
            translations
              ? `03. 4대 핵심 예방대책 (${langLabel} 병기) 및 유사공정 주의 사례`
              : '03. 4대 핵심 예방대책 및 유사공정 주의 사례'
          )}
          <div className="flex-1 px-6 py-3.5 grid grid-cols-12 gap-4 overflow-hidden">
            <div
              className={`${
                relatedCase ? 'col-span-8' : 'col-span-12'
              } flex flex-col justify-between gap-2`}
            >
              <div className="space-y-2">
                {c.preventive_measures.map((measure, idx) => (
                  <div
                    key={idx}
                    className="flex items-stretch rounded-md border border-slate-200 overflow-hidden bg-white"
                  >
                    <div
                      className="w-9 shrink-0 text-white font-bold text-[13px] flex items-center justify-center tabular-nums"
                      style={{ backgroundColor: theme.primaryHex }}
                    >
                      0{idx + 1}
                    </div>
                    <div className="px-3 py-2 flex flex-col justify-center">
                      <p
                        className={`font-semibold text-slate-900 leading-snug ${
                          translations ? 'text-[11.5px]' : 'text-[12.5px]'
                        }`}
                      >
                        {measure}
                      </p>
                      {translations && (
                        <p
                          className="text-[10.2px] font-medium leading-tight mt-0.5 flex items-center gap-1"
                          style={{ color: theme.accentTextHex }}
                        >
                          <Globe className="w-3 h-3 shrink-0" />
                          <span>{translations.measures[idx]}</span>
                        </p>
                      )}
                    </div>
                  </div>
                ))}
              </div>

              <div className="rounded-md border border-slate-200 bg-slate-100 px-3 py-2 flex items-center gap-2 text-[11px] text-slate-700 font-semibold">
                <Scale className="w-4 h-4 text-slate-600 shrink-0" />
                <span className="truncate">관련 법령: {c.legal_ref}</span>
              </div>
            </div>

            {relatedCase && (
              <div className="col-span-4 rounded-md border border-amber-400 bg-amber-50/70 overflow-hidden flex flex-col justify-between">
                <div>
                  <div className="bg-amber-700 text-white px-3.5 py-2 flex items-center gap-1.5 text-[11.5px] font-bold">
                    <Repeat className="w-3.5 h-3.5 shrink-0" />
                    <span>타 업종 유사 공정 주의 사례</span>
                  </div>
                  <div className="p-3 space-y-1.5">
                    <div className="text-[10.5px] font-bold text-amber-900">
                      {relatedCase.industry} · {relatedCase.hazard_type} · {relatedCase.work_type}
                    </div>
                    <h3 className="text-[12.5px] font-bold text-slate-900 leading-snug">
                      {relatedCase.title}
                    </h3>
                    <p className="text-[10.8px] text-slate-700 leading-snug line-clamp-4">
                      {relatedCase.summary_3lines.filter(Boolean).join(' ')}
                    </p>
                  </div>
                </div>
                <div className="m-3 mt-0 rounded border border-amber-300 bg-white p-2.5 text-[10.5px] font-bold text-amber-950 leading-snug">
                  핵심 교훈: {relatedCase.preventive_measures[0]}
                </div>
              </div>
            )}
          </div>
          {renderSlideFooter(4)}
        </div>
      );
    }

    // SLIDE 5: TBM Checklist + KYT Quiz + Bilingual Slogan
    return (
      <div className="w-full h-full bg-white flex flex-col justify-between overflow-hidden">
        {renderSlideHeader('04. 작업 전 5분 TBM 체크리스트 및 위험예지(KYT) 퀴즈')}
        <div className="flex-1 px-6 py-3.5 grid grid-cols-12 gap-4 overflow-hidden">
          <div className="col-span-7 rounded-md border border-slate-200 overflow-hidden flex flex-col">
            <div className="bg-slate-900 text-white px-4 py-2 text-[12px] font-bold">
              작업 전 5분 TBM 필수 점검 항목 (5개)
            </div>
            <ul className="flex-1 p-3 divide-y divide-slate-100 flex flex-col justify-between">
              {c.tbm_checklist.map((item, idx) => (
                <li key={idx} className="flex items-start gap-2 py-1 text-[11.5px] text-slate-900 leading-snug">
                  <span
                    className="w-4 h-4 mt-0.5 shrink-0 border-2 rounded-[2px] bg-white"
                    style={{ borderColor: theme.primaryHex }}
                  />
                  <span className="font-medium">
                    <strong className="tabular-nums mr-1">{idx + 1}.</strong>
                    {item}
                  </span>
                </li>
              ))}
            </ul>
          </div>

          <div className="col-span-5 flex flex-col justify-between gap-2.5">
            <div
              className="flex-1 rounded-md border overflow-hidden flex flex-col"
              style={{ backgroundColor: theme.softBgHex, borderColor: theme.primaryHex }}
            >
              <div
                className="px-3.5 py-2 text-white flex items-center justify-between text-[11.5px] font-bold"
                style={{ backgroundColor: theme.primaryHex }}
              >
                <span>현장 위험예지(KYT) 퀴즈</span>
                <button
                  type="button"
                  onClick={onToggleKytAnswers}
                  className="no-print inline-flex items-center gap-1 text-[10px] bg-black/20 hover:bg-black/30 px-2 py-0.5 rounded transition-colors cursor-pointer"
                >
                  {showKytAnswers ? <EyeOff className="w-3 h-3" /> : <Eye className="w-3 h-3" />}
                  <span>{showKytAnswers ? '숨김' : '정답'}</span>
                </button>
              </div>
              <div className="p-3 flex-1 flex flex-col justify-between gap-1.5">
                <p className="text-[11.8px] font-bold text-slate-900 leading-snug">
                  Q. {c.kyt_quiz.question}
                </p>
                {showKytAnswers ? (
                  <ul className="space-y-1 border-t pt-1.5" style={{ borderColor: theme.borderHex }}>
                    {c.kyt_quiz.answers.map((ans, idx) => (
                      <li key={idx} className="text-[10.5px] text-slate-800 leading-snug font-medium">
                        <span className="font-bold mr-1" style={{ color: theme.accentTextHex }}>
                          ✔ {idx + 1})
                        </span>
                        {ans}
                      </li>
                    ))}
                  </ul>
                ) : (
                  <div className="rounded border border-dashed border-slate-400 bg-white/80 p-3 text-center text-[10.5px] text-slate-600">
                    토의 후 우측 상단 “정답” 버튼을 눌러 확인하세요.
                  </div>
                )}
              </div>
            </div>

            <div className="rounded-md bg-slate-900 text-white px-4 py-2.5">
              <span className="block text-[9.5px] font-bold text-amber-300 mb-0.5">
                작업 전 다 함께 외치는 안전구호{translations ? ` · ${langLabel}` : ''}
              </span>
              <p className="text-[12.5px] font-extrabold leading-snug">“{c.worker_slogan}”</p>
              {translations && (
                <p className="text-[10.2px] font-semibold text-amber-200 leading-tight mt-1">
                  {translations.slogan}
                </p>
              )}
              {!translations && seasonTrans && (
                <p className="text-[9.8px] text-slate-300 mt-0.5">{seasonTrans}</p>
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
                  backgroundColor: idx === 0 ? '#0F172A' : '#FFFFFF',
                }}
              >
                <div
                  className="h-1.5 w-full"
                  style={{ backgroundColor: idx === 0 ? theme.primaryHex : '#0F172A' }}
                />
                {idx > 0 && (
                  <div className="h-[2px] w-full" style={{ backgroundColor: theme.primaryHex }} />
                )}
                <div className="flex-1 p-1.5 flex flex-col justify-between">
                  <div
                    className={`h-1.5 w-3/4 rounded-[1px] ${
                      idx === 0 ? 'bg-white/75' : 'bg-slate-300'
                    }`}
                  />
                  <div className="grid grid-cols-2 gap-1">
                    <div
                      className={`h-3 rounded-[1px] ${
                        idx === 0 ? 'bg-slate-700' : 'bg-slate-100'
                      }`}
                    />
                    <div
                      className="h-3 rounded-[1px]"
                      style={{
                        backgroundColor: idx === 0 ? '#1E293B' : theme.softBgHex,
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
