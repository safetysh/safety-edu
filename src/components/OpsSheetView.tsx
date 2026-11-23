import React, { useState } from 'react';
import {
  Eye,
  EyeOff,
  AlertTriangle,
  CheckSquare,
  Scale,
  Repeat,
  CloudAlert,
  Globe,
  ClipboardCheck,
} from 'lucide-react';
import { CustomSiteInfo, GeneratedMaterial } from '../types/safety';
import { AccidentMechanismDiagram, HazardPictogram } from './SafetyVisuals';
import {
  getCaseTranslations,
  getForeignLanguageNativeLabel,
  getSeasonalTranslation,
} from '../data/multilingualDict';
import { SEASONAL_RISKS } from '../data/seasonalRisks';

interface OpsSheetViewProps {
  material: GeneratedMaterial;
  siteInfo: CustomSiteInfo;
  sheetRef?: React.RefObject<HTMLDivElement | null>;
  isPrintClone?: boolean;
}

export const OpsSheetView: React.FC<OpsSheetViewProps> = ({
  material,
  siteInfo,
  sheetRef,
  isPrintClone = false,
}) => {
  const [showKytAnswers, setShowKytAnswers] = useState(true);
  const { primaryCase: c, relatedCase, theme, perspectiveMode, layoutStyle, isExactMatch } = material;

  const siteLabel = siteInfo.siteName.trim() || '________________';
  const dateLabel = siteInfo.educationDate || new Date().toISOString().slice(0, 10);
  const instructorLabel = siteInfo.instructorName.trim() || '________________';

  const translations = getCaseTranslations(c, siteInfo.foreignLanguage);
  const langLabel = getForeignLanguageNativeLabel(siteInfo.foreignLanguage);
  const season = SEASONAL_RISKS[siteInfo.seasonRisk];
  const seasonTrans = getSeasonalTranslation(siteInfo.seasonRisk, siteInfo.foreignLanguage);

  const isTbmHighlight = perspectiveMode === 'tbm_practice';

  // Adaptive compact density when extra modules (multilingual / 10-slot signature sheet / seasonal banner) are enabled
  const extraCount =
    (translations ? 1 : 0) +
    (siteInfo.showTbmSignTable ? 1 : 0) +
    (season.id !== 'always' ? 1 : 0);
  const dense = extraCount >= 1;
  const ultraDense = extraCount >= 2;

  // Header visual variation (never reorders sections 01 -> 02 -> 03 -> 04)
  const headerBgHex =
    layoutStyle === 'timeline_focus'
      ? theme.darkHex
      : layoutStyle === 'tbm_briefing'
        ? '#18181B'
        : '#0F172A';

  const fullSummaryText = c.summary_3lines.filter(Boolean).join(' ');

  // =========================================================================
  // 01. 중대재해 사고 개요 및 발생 메커니즘
  // =========================================================================
  const renderSection01Overview = () => (
    <section className={dense ? 'space-y-1.5' : 'space-y-2'}>
      <div className="flex items-center justify-between border-b border-slate-200 pb-1">
        <h2 className="text-[13px] font-bold text-slate-900 tracking-tight">
          01. 중대재해 사고 개요 및 발생 메커니즘
        </h2>
        <span className="text-[10.5px] font-medium text-slate-500">기인물: {c.equipment}</span>
      </div>

      {/* Complete joined summary so sentences never truncate mid-phrase */}
      <div
        className={`rounded-md border border-slate-200 bg-slate-50 px-3 flex items-start gap-2 ${
          ultraDense ? 'py-1.5' : 'py-2'
        }`}
      >
        <span
          className="shrink-0 text-[9.8px] font-extrabold px-1.5 py-0.5 rounded-sm text-white mt-0.5"
          style={{ backgroundColor: theme.primaryHex }}
        >
          사고 개요
        </span>
        <p
          className={`font-medium text-slate-800 leading-snug keep-all ${
            ultraDense ? 'text-[10.2px] line-clamp-2' : 'text-[10.8px] line-clamp-3'
          }`}
        >
          {fullSummaryText}
        </p>
      </div>

      {/* 4-stage timeline with deduplicated top badges & '예방 핵심' on step 4 */}
      <AccidentMechanismDiagram timeline={c.timeline} theme={theme} compact={dense} />
    </section>
  );

  // =========================================================================
  // 02. 핵심 원인 분석 및 동종재해 예방 안전조치 (관점별 변주 + 4대 안전조치 통합)
  // =========================================================================
  const renderSection02AnalysisAndMeasures = () => {
    const modeSubLabel =
      perspectiveMode === 'ox_compare'
        ? '관행(X)·원칙(O) 대조 + 4대 안전조치'
        : perspectiveMode === 'kyt_quiz'
          ? '위험예지(KYT) 퀴즈 + 4대 안전조치'
          : perspectiveMode === 'tbm_practice'
            ? '핵심 위험요인 + 4대 안전조치'
            : '직접·관리원인 분석 + 4대 안전조치';

    const renderModeTopBlock = () => {
      if (perspectiveMode === 'ox_compare') {
        return (
          <div className="grid grid-cols-2 gap-2">
            {c.ox_comparison.map((pair, idx) => (
              <div key={idx} className="border border-slate-200 rounded-md overflow-hidden flex flex-col">
                <div className={`bg-red-50/80 ${ultraDense ? 'px-2.5 py-1.5' : 'px-2.5 py-2'}`}>
                  <div className="flex items-start gap-1.5">
                    <span className="shrink-0 inline-flex items-center justify-center w-4 h-4 rounded-sm bg-red-700 text-white text-[9.8px] font-bold mt-0.5">
                      X
                    </span>
                    <p
                      className={`font-semibold text-red-950 leading-snug keep-all ${
                        ultraDense ? 'text-[10px]' : 'text-[10.6px]'
                      }`}
                    >
                      {pair.wrong}
                    </p>
                  </div>
                </div>
                <div
                  className={`bg-emerald-50/80 border-t border-slate-200 flex-1 ${
                    ultraDense ? 'px-2.5 py-1.5' : 'px-2.5 py-2'
                  }`}
                >
                  <div className="flex items-start gap-1.5">
                    <span className="shrink-0 inline-flex items-center justify-center w-4 h-4 rounded-sm bg-emerald-700 text-white text-[9.8px] font-bold mt-0.5">
                      O
                    </span>
                    <p
                      className={`font-semibold text-emerald-950 leading-snug keep-all ${
                        ultraDense ? 'text-[10px]' : 'text-[10.6px]'
                      }`}
                    >
                      {pair.right}
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        );
      }

      if (perspectiveMode === 'kyt_quiz') {
        const reveal = isPrintClone ? true : showKytAnswers;
        return (
          <div
            className={`rounded-md border ${ultraDense ? 'p-2' : 'p-2.5'}`}
            style={{ backgroundColor: theme.softBgHex, borderColor: theme.borderHex }}
          >
            <div className="flex items-center justify-between gap-2 mb-1">
              <p
                className="text-[10.5px] font-extrabold tracking-tight"
                style={{ color: theme.accentTextHex }}
              >
                현장 위험예지(KYT) 토의 질문
              </p>
              {!isPrintClone && (
                <button
                  type="button"
                  onClick={() => setShowKytAnswers((prev) => !prev)}
                  className="no-print inline-flex items-center gap-1 text-[10px] font-semibold text-slate-700 hover:text-slate-950 transition-colors cursor-pointer"
                >
                  {showKytAnswers ? <EyeOff className="w-3 h-3" /> : <Eye className="w-3 h-3" />}
                  <span>{showKytAnswers ? '정답 숨기기' : '모범 정답 보기'}</span>
                </button>
              )}
            </div>
            <p className="text-[11.2px] font-bold text-slate-900 leading-snug keep-all mb-1.5">
              Q. {c.kyt_quiz.question}
            </p>
            {reveal ? (
              <div className="grid grid-cols-3 gap-1.5 border-t pt-1.5" style={{ borderColor: theme.borderHex }}>
                {c.kyt_quiz.answers.map((ans, idx) => (
                  <div
                    key={idx}
                    className="rounded bg-white/90 border border-slate-200/80 px-2 py-1.5 flex items-start gap-1.5 text-[10px] text-slate-800 leading-snug keep-all"
                  >
                    <span
                      className="shrink-0 w-3.5 h-3.5 rounded-sm text-white text-[9px] font-bold flex items-center justify-center mt-0.5 tabular-nums"
                      style={{ backgroundColor: theme.primaryHex }}
                    >
                      {idx + 1}
                    </span>
                    <span className="font-medium">{ans}</span>
                  </div>
                ))}
              </div>
            ) : (
              <div className="border border-dashed border-slate-400/70 rounded bg-white/80 px-3 py-2 text-center text-[10.5px] text-slate-600">
                근로자와 함께 3가지 핵심 위험요인을 토의한 뒤 “모범 정답 보기”를 눌러 확인하세요.
              </div>
            )}
          </div>
        );
      }

      // 'reconstruction' & 'tbm_practice' — Direct vs Root Cause compact 2-column grid
      return (
        <div className="grid grid-cols-12 gap-2">
          <div
            className={`col-span-7 rounded-md border ${ultraDense ? 'p-2' : 'p-2.5'}`}
            style={{ backgroundColor: theme.softBgHex, borderColor: theme.borderHex }}
          >
            <p className="text-[10.4px] font-extrabold mb-1" style={{ color: theme.accentTextHex }}>
              직접 원인 (불안전한 상태·행동)
            </p>
            <ul className="space-y-1">
              {c.direct_causes.map((cause, idx) => (
                <li
                  key={idx}
                  className="flex items-start gap-1.5 text-[10.3px] text-slate-900 leading-snug keep-all"
                >
                  <span
                    className="shrink-0 w-3.5 h-3.5 rounded-sm text-white text-[9px] font-bold flex items-center justify-center mt-0.5 tabular-nums"
                    style={{ backgroundColor: theme.primaryHex }}
                  >
                    {idx + 1}
                  </span>
                  <span className="font-medium">{cause}</span>
                </li>
              ))}
            </ul>
          </div>
          <div
            className={`col-span-5 rounded-md border border-slate-200 bg-slate-50 flex flex-col justify-between ${
              ultraDense ? 'p-2' : 'p-2.5'
            }`}
          >
            <div>
              <p className="text-[10.4px] font-extrabold text-slate-800 mb-1">
                관리적 근본 원인
              </p>
              <ul className="space-y-1">
                {c.root_causes.map((root, idx) => (
                  <li
                    key={idx}
                    className="flex items-start gap-1.5 text-[10.1px] text-slate-700 leading-snug keep-all"
                  >
                    <span className="font-bold text-slate-900">•</span>
                    <span>{root}</span>
                  </li>
                ))}
              </ul>
            </div>
            {!ultraDense && (
              <div className="mt-1.5 pt-1 border-t border-slate-200 text-[9.6px] text-slate-600 leading-snug keep-all">
                <span className="font-bold text-red-700">X 관행:</span> {c.ox_comparison[0].wrong}
              </div>
            )}
          </div>
        </div>
      );
    };

    return (
      <section className={dense ? 'space-y-1.5' : 'space-y-2'}>
        <div className="flex items-center justify-between border-b border-slate-200 pb-1 gap-2">
          <div className="flex items-center gap-1.5 min-w-0">
            <h2 className="text-[13px] font-bold text-slate-900 tracking-tight whitespace-nowrap">
              02. 핵심 원인 분석 및 동종재해 예방 안전조치
            </h2>
            {translations && (
              <span className="inline-flex items-center gap-0.5 text-[10px] font-bold text-slate-600 whitespace-nowrap">
                <Globe className="w-3 h-3" />
                <span>{langLabel} 병기</span>
              </span>
            )}
          </div>
          <span className="text-[10.2px] font-medium text-slate-500 truncate">{modeSubLabel}</span>
        </div>

        {/* Mode-specific Analysis / O-X / KYT Block */}
        {renderModeTopBlock()}

        {/* 4 Essential Preventive Measures + Legal Reference */}
        <div className="space-y-1">
          <div className="flex items-center justify-between gap-2 text-[10.2px]">
            <span className="font-extrabold text-slate-800">동종재해 예방 4대 필수 안전조치</span>
            <span className="inline-flex items-center gap-1 text-slate-600 font-medium truncate">
              <Scale className="w-3 h-3 shrink-0" />
              <span className="truncate">{c.legal_ref}</span>
            </span>
          </div>
          <div className="grid grid-cols-2 gap-1.5">
            {c.preventive_measures.map((measure, idx) => (
              <div
                key={idx}
                className={`flex items-start gap-2 rounded-md border border-slate-200 bg-white ${
                  translations || ultraDense ? 'p-1.5' : 'p-2'
                }`}
              >
                <span
                  className="shrink-0 w-4 h-4 rounded-sm text-white text-[9.8px] font-bold flex items-center justify-center mt-0.5 tabular-nums"
                  style={{ backgroundColor: theme.primaryHex }}
                >
                  {idx + 1}
                </span>
                <div className="min-w-0 keep-all">
                  <p
                    className={`font-semibold text-slate-900 leading-snug ${
                      translations || ultraDense ? 'text-[10.1px]' : 'text-[10.6px]'
                    }`}
                  >
                    {measure}
                  </p>
                  {translations && (
                    <p
                      className="text-[9.2px] font-medium leading-tight mt-0.5"
                      style={{ color: theme.accentTextHex }}
                    >
                      {translations.measures[idx]}
                    </p>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>
    );
  };

  // =========================================================================
  // 03. 유사 공정 주의 사례 (타 업종 교차 경각심)
  // =========================================================================
  const renderSection03CrossProcess = () => {
    if (!relatedCase) {
      return (
        <section className={dense ? 'space-y-1' : 'space-y-1.5'}>
          <div className="flex items-center justify-between border-b border-slate-200 pb-1">
            <h2 className="text-[13px] font-bold text-slate-900 tracking-tight">
              03. 현장 위험예지(KYT) 핵심 확인 및 법령 기준
            </h2>
            <span className="text-[10.2px] font-medium text-slate-500">단독사례 집중 모드</span>
          </div>
          <div className="rounded-md border border-slate-200 bg-slate-50 px-3 py-2 flex items-center justify-between gap-4 keep-all">
            <div className="min-w-0">
              <p className="text-[10.8px] font-bold text-slate-900 leading-snug">
                Q. {c.kyt_quiz.question}
              </p>
              <p className="text-[10px] text-slate-600 mt-0.5 leading-snug">
                관련 법령: {c.legal_ref}
              </p>
            </div>
            <span className="shrink-0 text-[10px] font-bold text-slate-700 bg-white border border-slate-200 rounded px-2.5 py-1">
              작업 전 구두 확인
            </span>
          </div>
        </section>
      );
    }

    const relatedFullSummary = relatedCase.summary_3lines.filter(Boolean).join(' ');

    return (
      <section className={dense ? 'space-y-1' : 'space-y-1.5'}>
        <div className="flex items-center justify-between border-b border-slate-200 pb-1">
          <div className="flex items-center gap-1.5">
            <h2 className="text-[13px] font-bold text-slate-900 tracking-tight">
              03. 유사 공정 주의 사례
            </h2>
            <span className="text-[10.5px] font-medium text-slate-500">타 업종 교차 경각심</span>
          </div>
          <span className="inline-flex items-center gap-1 text-[10.5px] font-bold text-amber-900">
            <Repeat className="w-3.5 h-3.5 shrink-0" />
            <span>
              {relatedCase.industry} · {relatedCase.hazard_type} · {relatedCase.work_type}
            </span>
          </span>
        </div>

        <div
          className={`rounded-md border border-amber-300 bg-amber-50/75 grid grid-cols-12 gap-3 items-center keep-all ${
            ultraDense ? 'px-3 py-2' : 'px-3.5 py-2.5'
          }`}
        >
          <div className="col-span-8 min-w-0 space-y-0.5">
            <p className="text-[11px] font-extrabold text-slate-900 leading-snug">
              {relatedCase.title}
            </p>
            <p
              className={`text-slate-700 leading-snug ${
                ultraDense ? 'text-[9.8px] line-clamp-2' : 'text-[10.2px] line-clamp-3'
              }`}
            >
              {relatedFullSummary}
            </p>
          </div>
          <div className="col-span-4 rounded border border-amber-300/90 bg-white px-2.5 py-2">
            <span className="block text-[9.5px] font-extrabold text-amber-800 mb-0.5">
              교차 공정 핵심 교훈
            </span>
            <p className="text-[10.2px] font-bold text-amber-950 leading-snug">
              {relatedCase.preventive_measures[0]}
            </p>
          </div>
        </div>
      </section>
    );
  };

  // =========================================================================
  // 04. 작업 전 5분 TBM 현장 실전 점검표 (항상 최하단 고정)
  // =========================================================================
  const renderSection04TbmChecklist = () => (
    <section className={dense ? 'space-y-1' : 'space-y-1.5'}>
      <div className="flex items-center justify-between border-b border-slate-200 pb-1">
        <div className="flex items-center gap-1.5">
          {isTbmHighlight ? (
            <ClipboardCheck className="w-4 h-4 shrink-0" style={{ color: theme.primaryHex }} />
          ) : (
            <CheckSquare className="w-3.5 h-3.5 text-slate-800 shrink-0" />
          )}
          <h2 className="text-[13px] font-bold text-slate-900 tracking-tight">
            04. 작업 전 5분 TBM 현장 실전 점검표
          </h2>
          {isTbmHighlight && (
            <span
              className="text-[9.8px] font-extrabold px-1.5 py-0.5 rounded-sm text-white"
              style={{ backgroundColor: theme.primaryHex }}
            >
              실전 집중 점검
            </span>
          )}
        </div>
        <span className="text-[10.2px] font-medium text-slate-500">
          작업 시작 전 전원 확인 · 이상 시 작업 중지
        </span>
      </div>

      <div
        className="rounded-md overflow-hidden border"
        style={{
          borderColor: isTbmHighlight ? theme.primaryHex : '#CBD5E1',
          borderWidth: isTbmHighlight ? '1.5px' : '1px',
        }}
      >
        <table className="w-full text-left border-collapse keep-all">
          <thead>
            <tr
              className="text-white text-[10px]"
              style={{ backgroundColor: isTbmHighlight ? theme.primaryHex : '#0F172A' }}
            >
              <th className="py-1.5 px-2.5 w-10 text-center font-semibold">번호</th>
              <th className="py-1.5 px-2.5 font-semibold">작업 전 필수 안전점검 항목</th>
              <th className="py-1.5 px-2.5 w-28 text-center font-semibold">점검 결과</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-200">
            {c.tbm_checklist.map((item, idx) => (
              <tr key={idx} className={idx % 2 === 1 ? 'bg-slate-50/80' : 'bg-white'}>
                <td
                  className={`px-2.5 text-center font-bold text-slate-700 tabular-nums ${
                    isTbmHighlight && !ultraDense
                      ? 'py-2 text-[11px]'
                      : ultraDense
                        ? 'py-1 text-[10px]'
                        : 'py-1.5 text-[10.4px]'
                  }`}
                >
                  0{idx + 1}
                </td>
                <td
                  className={`px-2.5 font-semibold text-slate-900 leading-snug ${
                    isTbmHighlight && !ultraDense
                      ? 'py-2 text-[11px]'
                      : ultraDense
                        ? 'py-1 text-[10px]'
                        : 'py-1.5 text-[10.5px]'
                  }`}
                >
                  {item}
                </td>
                <td
                  className={`px-2.5 text-center text-slate-700 font-semibold whitespace-nowrap ${
                    isTbmHighlight && !ultraDense
                      ? 'py-2 text-[10.8px]'
                      : ultraDense
                        ? 'py-1 text-[9.8px]'
                        : 'py-1.5 text-[10.2px]'
                  }`}
                >
                  □ 양호 &nbsp;&nbsp; □ 조치
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        {/* Highlighted Inspector Verification Bar in TBM Practice Mode */}
        {isTbmHighlight && (
          <div
            className="border-t px-3 py-1.5 flex items-center justify-between text-[10.2px] font-bold tabular-nums"
            style={{
              backgroundColor: theme.softBgHex,
              borderColor: theme.borderHex,
              color: theme.accentTextHex,
            }}
          >
            <span>점검자 확인란</span>
            <div className="flex items-center gap-4 text-slate-800 font-semibold">
              <span>점검자(반장): ______________ (인)</span>
              <span>확인 시각: ____ : ____</span>
              <span>이상 조치: □ 없음  □ 완료</span>
            </div>
          </div>
        )}
      </div>
    </section>
  );

  return (
    <div
      ref={sheetRef}
      className="ops-print-page ops-sheet-shadow bg-white text-slate-900 w-[794px] h-[1123px] flex flex-col overflow-hidden border border-slate-300 select-text keep-all"
    >
      {/* Top Industrial Safety Hazard Stripe + Header + Optional Seasonal Alert */}
      <div className="shrink-0">
        <div className={`h-2.5 w-full ${theme.stripeClass}`} />

        <header
          className={`px-6 text-white flex items-center justify-between gap-4 ${
            ultraDense ? 'py-2.5' : 'py-3.5'
          }`}
          style={{ backgroundColor: headerBgHex }}
        >
          <div className="flex items-center gap-3.5 min-w-0">
            <div className="shrink-0 bg-white/95 rounded-md p-1.5 shadow-sm">
              <HazardPictogram hazardType={c.hazard_type} size={ultraDense ? 44 : 50} />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2 text-[10.5px] font-semibold text-slate-200 mb-0.5">
                <span
                  className="px-1.5 py-0.5 rounded-sm font-bold text-[10px]"
                  style={{
                    backgroundColor: theme.badgeBgHex,
                    color: theme.badgeTextHex,
                  }}
                >
                  중대재해 예방 한페이지 교육자료 (OPS)
                </span>
                <span>{material.selectedIndustry}</span>
                <span aria-hidden="true">·</span>
                <span className="truncate">{material.selectedWorkType}</span>
              </div>
              <h1
                className={`font-extrabold leading-tight tracking-tight text-white [text-wrap:balance] keep-all ${
                  ultraDense ? 'text-[16px]' : 'text-[17.5px]'
                }`}
              >
                {c.title}
              </h1>
            </div>
          </div>

          <div className="shrink-0 text-right border-l border-white/20 pl-3.5 space-y-0.5 text-[10.2px]">
            <div className="font-bold text-amber-300 text-[11.2px]">
              재해유형: {c.hazard_type}
            </div>
            <div className="text-slate-200 tabular-nums">교육일자: {dateLabel}</div>
            <div className="text-slate-200 max-w-[165px] truncate">현장: {siteLabel}</div>
            <div className="text-slate-300 max-w-[165px] truncate">강사: {instructorLabel}</div>
          </div>
        </header>

        {/* Seasonal & Weather Risk Alert Ribbon */}
        {season.id !== 'always' && (
          <div
            className="border-b px-6 py-1.5 flex items-start gap-2 text-[10.2px]"
            style={{
              backgroundColor: season.bgHex,
              borderColor: season.borderHex,
              color: season.textHex,
            }}
          >
            <span
              className="inline-flex items-center gap-1 shrink-0 px-1.5 py-0.5 rounded-sm text-[9.5px] font-extrabold text-white mt-0.5"
              style={{ backgroundColor: season.badgeBgHex }}
            >
              <CloudAlert className="w-3 h-3 shrink-0" />
              <span>{season.badgeText}</span>
            </span>
            <div className="min-w-0 leading-snug keep-all">
              <p className="font-bold">{season.extraRule}</p>
              {seasonTrans && <p className="text-[9.4px] opacity-90">{seasonTrans}</p>}
            </div>
          </div>
        )}

        {/* Similarity Fallback Notice Ribbon */}
        {!isExactMatch && (
          <div className="bg-amber-100 border-b border-amber-300 px-6 py-1 flex items-center justify-between text-[10.2px] text-amber-950">
            <div className="flex items-center gap-1.5 font-bold">
              <AlertTriangle className="w-3.5 h-3.5 text-amber-700 shrink-0" />
              <span>유사 공정 기반 위험요인 분석 자료</span>
            </div>
            <span className="text-[9.8px] font-medium text-amber-900">
              매칭 근거: {material.matchReason} (참조사례: {c.industry} · {c.work_type})
            </span>
          </div>
        )}
      </div>

      {/* Main Content Body: STRICT 01 -> 02 -> 03 -> 04 educational flow with even A4 vertical balance */}
      <main
        className={`flex-1 px-6 flex flex-col justify-between overflow-hidden ${
          ultraDense ? 'py-2 gap-1.5' : dense ? 'py-2.5 gap-2' : 'py-3.5 gap-2.5'
        }`}
      >
        {renderSection01Overview()}
        {renderSection02AnalysisAndMeasures()}
        {renderSection03CrossProcess()}
        {renderSection04TbmChecklist()}
      </main>

      {/* Bottom Worker Slogan + Optional 10-Slot TBM Attendee Sign Table + Logo Footer */}
      <div className="shrink-0">
        <div
          className={`mx-6 rounded-md px-4 flex items-center justify-between gap-4 text-white ${
            siteInfo.showTbmSignTable ? 'mb-1.5 py-2' : 'mb-2 py-2.5'
          }`}
          style={{ backgroundColor: theme.primaryHex }}
        >
          <div className="min-w-0 keep-all">
            <span className="block text-[9.5px] font-bold text-white/85 tracking-wide">
              작업 전 근로자 다짐 구호 (다 함께 복창){translations ? ` · ${langLabel}` : ''}
            </span>
            <p
              className={`${
                ultraDense ? 'text-[13.5px]' : 'text-[14.8px]'
              } font-extrabold tracking-tight leading-snug`}
            >
              “{c.worker_slogan}”
            </p>
            {translations && (
              <p className="text-[10.2px] font-semibold text-amber-100 leading-tight mt-0.5">
                {translations.slogan}
              </p>
            )}
          </div>
          {!siteInfo.showTbmSignTable && (
            <div className="shrink-0 bg-black/20 rounded px-2.5 py-1.5 text-right text-[9.8px] leading-tight">
              <div className="font-bold">교육 확인 서명</div>
              <div className="text-white/85 mt-0.5">관리자: _______ / 대표: _______</div>
            </div>
          )}
        </div>

        {/* Optional TBM Attendee Signature Table (10 Slots) */}
        {siteInfo.showTbmSignTable && (
          <div className="mx-6 mb-1.5 border border-slate-300 rounded-sm overflow-hidden bg-white">
            <div className="bg-slate-800 text-white px-2.5 py-1 flex items-center justify-between text-[9.6px] font-semibold tabular-nums">
              <span>TBM 안전교육 참석자 확인 서명부 (10인)</span>
              <span>
                교육일자: {dateLabel} &nbsp;|&nbsp; 교육강사: {instructorLabel} (서명: _________)
              </span>
            </div>
            <table className="w-full border-collapse text-[9.2px] text-slate-700 table-fixed">
              <tbody>
                {[0, 5].map((rowStart) => (
                  <tr key={rowStart} className="border-t border-slate-200">
                    {[0, 1, 2, 3, 4].map((offset) => {
                      const num = rowStart + offset + 1;
                      return (
                        <td
                          key={num}
                          className="border-r last:border-r-0 border-slate-200 px-1.5 py-1 align-top"
                        >
                          <div className="flex items-center justify-between text-[8.5px] text-slate-400 tabular-nums">
                            <span className="font-bold text-slate-600">{num}.</span>
                            <span>성명 / 서명</span>
                          </div>
                          <div className="h-3" />
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        <footer className="bg-slate-100 border-t border-slate-200 px-6 py-1.5 flex items-center justify-between gap-3 text-[9.5px] text-slate-500 tabular-nums">
          <div className="flex items-center gap-2.5 min-w-0">
            {siteInfo.logoDataUrl && (
              <img
                src={siteInfo.logoDataUrl}
                alt="회사/현장 로고"
                className="h-5 max-w-[90px] object-contain shrink-0 bg-white px-1 py-0.5 rounded-sm border border-slate-200"
              />
            )}
            <span className="truncate">
              사례코드 {c.id} · 구성 #{material.version} ({material.perspectiveLabel} · {material.layoutLabel})
            </span>
          </div>
          <span className="shrink-0">현장 게시 및 작업 전 5분 TBM 교육 배포용 (A4 표준 규격)</span>
        </footer>
      </div>
    </div>
  );
};
