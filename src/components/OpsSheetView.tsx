import React, { useEffect, useState } from 'react';
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
  Lock,
  RotateCcw,
  Plus,
  X,
  Pencil,
  ExternalLink,
  ChevronDown,
  ChevronUp,
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
  getSourceBrandStyle,
  splitSifBracketHighlights,
} from '../utils/textFit';

interface OpsSheetViewProps {
  material: GeneratedMaterial;
  siteInfo: CustomSiteInfo;
  showKytAnswers?: boolean;
  onToggleKytAnswers?: () => void;
  onUpdateMeasures?: (nextMeasures: string[]) => void;
  onResetMeasures?: () => void;
  onUpdateTbm?: (nextTbm: string[]) => void;
  onResetTbm?: () => void;
  sheetRef?: React.RefObject<HTMLDivElement | null>;
  isPrintClone?: boolean;
}

export const OpsSheetView: React.FC<OpsSheetViewProps> = React.memo(({
  material,
  siteInfo,
  showKytAnswers = true,
  onToggleKytAnswers,
  onUpdateMeasures,
  onResetMeasures,
  onUpdateTbm,
  onResetTbm,
  sheetRef,
  isPrintClone = false,
}) => {
  const { primaryCase: c, relatedCase, theme, perspectiveMode, layoutStyle, isExactMatch } = material;
  const [expandFullOverview, setExpandFullOverview] = useState(false);
  const [editingMeasureIdx, setEditingMeasureIdx] = useState<number | null>(null);
  const [editingTbmIdx, setEditingTbmIdx] = useState<number | null>(null);

  useEffect(() => {
    setExpandFullOverview(false);
    setEditingMeasureIdx(null);
    setEditingTbmIdx(null);
  }, [c.id]);

  const inkSaver = Boolean(siteInfo.inkSaverMode);
  const sourceBrand = getSourceBrandStyle(c);
  const sourceBadgeLabel = formatSourceHeaderBadge(c);
  const isSif = c.source_type === 'SIF';
  const isFatality = c.source_type === 'FATALITY';

  const isMeasuresEdited = Boolean(material.isMeasuresEdited);
  const isTbmEdited = Boolean(material.isTbmEdited);
  const canInlineEdit = !isPrintClone && Boolean(onUpdateMeasures && onUpdateTbm);

  const siteLabel = siteInfo.siteName.trim() || '________________';
  const dateLabel = siteInfo.educationDate || new Date().toISOString().slice(0, 10);
  const instructorLabel = siteInfo.instructorName.trim() || '________________';

  const translations = getCaseTranslations(c, siteInfo.foreignLanguage);
  const langLabel = getForeignLanguageNativeLabel(siteInfo.foreignLanguage);
  const season = SEASONAL_RISKS[siteInfo.seasonRisk];
  const seasonTrans = getSeasonalTranslation(siteInfo.seasonRisk, siteInfo.foreignLanguage);

  const isTbmHighlight = perspectiveMode === 'tbm_practice';

  // Adaptive vertical slot budget computation
  const extraCount =
    (translations ? 1 : 0) +
    (siteInfo.showTbmSignTable ? 1 : 0) +
    (season.id !== 'always' ? 1 : 0) +
    (c.preventive_measures.length > 4 ? 1 : 0) +
    (c.tbm_checklist.length > 5 ? 1 : 0);
  const dense = extraCount >= 1;
  const ultraDense = extraCount >= 2;

  // Source-driven 1-second visual recognition colors (or monochrome ink-saver)
  const accentHex = inkSaver
    ? '#0F172A'
    : isFatality || isSif
      ? sourceBrand.primaryHex
      : theme.primaryHex;

  const headerBgHex = inkSaver
    ? '#FFFFFF'
    : isFatality
      ? '#991B1B'
      : isSif
        ? '#92400E'
        : layoutStyle === 'timeline_focus'
          ? theme.darkHex
          : layoutStyle === 'tbm_briefing'
            ? '#18181B'
            : '#0F172A';

  const stripeClass = inkSaver
    ? 'bg-slate-900'
    : isFatality
      ? 'hazard-stripe-crimson'
      : isSif
        ? 'hazard-stripe-amber'
        : theme.stripeClass;

  const overviewVerbatim = getCaseOverviewVerbatim(c);
  const overviewFit = fitFactualOverviewForA4(
    overviewVerbatim,
    extraCount,
    !isPrintClone && expandFullOverview,
    225
  );

  const measuresSourceCaption = isMeasuresEdited
    ? '공단 권고안 기반 · 현장 맞춤 반영'
    : isSif
      ? '공단 원문 (SIF 위험성감소대책)'
      : '공단 원문 가이드';

  const tbmSourceCaption = isTbmEdited
    ? '공단 권고안 기반 · 현장 맞춤 반영'
    : '공단 원문 가이드';

  const handleChangeMeasureText = (idx: number, val: string) => {
    if (!onUpdateMeasures) return;
    const next = [...c.preventive_measures];
    next[idx] = val;
    onUpdateMeasures(next);
  };

  const handleRemoveMeasure = (idx: number) => {
    if (!onUpdateMeasures || c.preventive_measures.length <= 1) return;
    const next = c.preventive_measures.filter((_, i) => i !== idx);
    onUpdateMeasures(next);
    setEditingMeasureIdx(null);
  };

  const handleAddMeasure = () => {
    if (!onUpdateMeasures || c.preventive_measures.length >= 6) return;
    const next = [...c.preventive_measures, '현장 추가 안전대책을 입력하세요.'];
    onUpdateMeasures(next);
    setEditingMeasureIdx(next.length - 1);
  };

  const handleChangeTbmText = (idx: number, val: string) => {
    if (!onUpdateTbm) return;
    const next = [...c.tbm_checklist];
    next[idx] = val;
    onUpdateTbm(next);
  };

  const handleRemoveTbm = (idx: number) => {
    if (!onUpdateTbm || c.tbm_checklist.length <= 1) return;
    const next = c.tbm_checklist.filter((_, i) => i !== idx);
    onUpdateTbm(next);
    setEditingTbmIdx(null);
  };

  const handleAddTbm = () => {
    if (!onUpdateTbm || c.tbm_checklist.length >= 7) return;
    const next = [...c.tbm_checklist, '작업 전 현장 추가 안전점검 항목을 확인했는가?'];
    onUpdateTbm(next);
    setEditingTbmIdx(next.length - 1);
  };

  // =========================================================================
  // 01. 중대재해 사고 개요 [Read-Only 원문 고정] 및 발생 메커니즘
  // =========================================================================
  const renderSection01Overview = () => (
    <section className={dense ? 'space-y-1.5' : 'space-y-2'}>
      <div className="flex items-center justify-between border-b border-slate-300 pb-1 gap-2">
        <div className="flex items-center gap-1.5 min-w-0">
          <h2 className="text-[12.8px] font-bold text-slate-950 tracking-tight">
            01. 중대재해 사고 개요 및 발생 메커니즘
          </h2>
          <span
            className={`inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-sm text-[9.4px] font-bold shrink-0 ${
              inkSaver
                ? 'bg-slate-100 text-slate-900 border border-slate-400'
                : 'bg-slate-800 text-white'
            }`}
          >
            <Lock className="w-2.5 h-2.5 shrink-0" />
            <span>공단 공식 원문</span>
          </span>
          {overviewFit.isExcerpted && (
            <span className="px-1.5 py-0.5 rounded-sm bg-amber-100 border border-amber-300 text-amber-900 text-[9.2px] font-bold shrink-0">
              [원문 일부 발췌]
            </span>
          )}
        </div>
        <div className="flex items-center gap-2 shrink-0">
          {!isPrintClone && c.source_image_url && (
            <a
              href={c.source_image_url}
              target="_blank"
              rel="noreferrer"
              data-export-hide="true"
              className="no-print inline-flex items-center gap-0.5 text-[9.8px] font-bold text-red-700 hover:underline"
            >
              <span>원본 속보 이미지</span>
              <ExternalLink className="w-2.5 h-2.5" />
            </a>
          )}
          <span className="text-[10.2px] font-semibold text-slate-700">기인물: {c.equipment}</span>
        </div>
      </div>

      {/* Verbatim Factual Overview — Dynamic 10.5pt / 9.5pt / 8.8pt Typography, ZERO line-clamp */}
      <div
        className={`rounded-md border px-3 ${ultraDense ? 'py-1.5' : 'py-2'}`}
        style={{
          backgroundColor: inkSaver ? '#FFFFFF' : sourceBrand.softBgHex,
          borderColor: inkSaver ? '#334155' : sourceBrand.borderHex,
        }}
      >
        <div className="flex items-start gap-2">
          <span
            className="shrink-0 text-[9.5px] font-extrabold px-1.5 py-0.5 rounded-sm mt-0.5"
            style={
              inkSaver
                ? { backgroundColor: '#F1F5F9', color: '#0F172A', border: '1px solid #0F172A' }
                : { backgroundColor: accentHex, color: '#FFFFFF' }
            }
          >
            재해개요
          </span>
          <div className="flex-1 min-w-0">
            <p
              className="font-medium text-slate-900 keep-all"
              style={{
                fontSize: overviewFit.fontSizeCss,
                lineHeight: overviewFit.lineHeightCss,
              }}
            >
              {overviewFit.displayText}
            </p>
            {!isPrintClone && (overviewFit.isExcerpted || expandFullOverview) && (
              <button
                type="button"
                data-export-hide="true"
                onClick={() => setExpandFullOverview((p) => !p)}
                className="no-print mt-1 inline-flex items-center gap-0.5 text-[10px] font-bold text-slate-700 hover:text-slate-950 underline underline-offset-2 cursor-pointer"
              >
                {expandFullOverview ? (
                  <>
                    <ChevronUp className="w-3 h-3" />
                    <span>A4 발췌 규격으로 접기</span>
                  </>
                ) : (
                  <>
                    <ChevronDown className="w-3 h-3" />
                    <span>전체 원문 보기 ({overviewFit.fullText.length}자)</span>
                  </>
                )}
              </button>
            )}
          </div>
        </div>
      </div>

      <AccidentMechanismDiagram
        timeline={c.timeline}
        theme={theme}
        compact={dense}
        inkSaver={inkSaver}
        accentHex={accentHex}
      />
    </section>
  );

  // =========================================================================
  // 02. 핵심 원인 분석 [Read-Only 고정] + 예방대책 [현장 맞춤 인라인 편집]
  // =========================================================================
  const renderSection02AnalysisAndMeasures = () => {
    const renderLockedAnalysisFrame = () => {
      if (perspectiveMode === 'ox_compare') {
        return (
          <div className="grid grid-cols-2 gap-2">
            {c.ox_comparison.map((pair, idx) => (
              <div
                key={idx}
                className="border rounded-md overflow-hidden flex flex-col"
                style={{ borderColor: inkSaver ? '#475569' : '#CBD5E1' }}
              >
                <div
                  className={`${inkSaver ? 'bg-white' : 'bg-red-50/80'} ${
                    ultraDense ? 'px-2.5 py-1.5' : 'px-2.5 py-1.5'
                  }`}
                >
                  <div className="flex items-start gap-1.5">
                    <span
                      className={`shrink-0 inline-flex items-center justify-center w-4 h-4 rounded-sm text-[9.5px] font-bold mt-0.5 ${
                        inkSaver
                          ? 'bg-white text-slate-950 border border-slate-900'
                          : 'bg-red-700 text-white'
                      }`}
                    >
                      X
                    </span>
                    <p className="font-semibold text-slate-950 leading-snug keep-all text-[10px]">
                      {pair.wrong}
                    </p>
                  </div>
                </div>
                <div
                  className={`border-t flex-1 ${
                    inkSaver ? 'bg-slate-50 border-slate-300' : 'bg-emerald-50/80 border-slate-200'
                  } ${ultraDense ? 'px-2.5 py-1.5' : 'px-2.5 py-1.5'}`}
                >
                  <div className="flex items-start gap-1.5">
                    <span
                      className={`shrink-0 inline-flex items-center justify-center w-4 h-4 rounded-sm text-[9.5px] font-bold mt-0.5 ${
                        inkSaver ? 'bg-slate-900 text-white' : 'bg-emerald-700 text-white'
                      }`}
                    >
                      O
                    </span>
                    <p className="font-semibold text-slate-950 leading-snug keep-all text-[10px]">
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
        return (
          <div
            className={`rounded-md border ${ultraDense ? 'p-2' : 'p-2.5'}`}
            style={{
              backgroundColor: inkSaver ? '#FFFFFF' : theme.softBgHex,
              borderColor: inkSaver ? '#334155' : theme.borderHex,
            }}
          >
            <div className="flex items-center justify-between gap-2 mb-1">
              <p
                className="text-[10.4px] font-extrabold tracking-tight"
                style={{ color: inkSaver ? '#0F172A' : theme.accentTextHex }}
              >
                현장 위험예지(KYT) 토의 질문
              </p>
              {!isPrintClone && onToggleKytAnswers && (
                <button
                  type="button"
                  data-export-hide="true"
                  onClick={onToggleKytAnswers}
                  className="no-print inline-flex items-center gap-1 text-[10px] font-semibold text-slate-700 hover:text-slate-950 cursor-pointer"
                >
                  {showKytAnswers ? <EyeOff className="w-3 h-3" /> : <Eye className="w-3 h-3" />}
                  <span>{showKytAnswers ? '정답 숨기기' : '모범 정답 보기'}</span>
                </button>
              )}
            </div>
            <p className="text-[11px] font-bold text-slate-950 leading-snug keep-all mb-1.5">
              Q. {c.kyt_quiz.question}
            </p>
            {showKytAnswers ? (
              <div
                className="grid grid-cols-3 gap-1.5 border-t pt-1.5"
                style={{ borderColor: inkSaver ? '#CBD5E1' : theme.borderHex }}
              >
                {c.kyt_quiz.answers.map((ans, idx) => (
                  <div
                    key={idx}
                    className="rounded bg-white border border-slate-300 px-2 py-1.5 flex items-start gap-1.5 text-[9.8px] text-slate-900 leading-snug keep-all"
                  >
                    <span
                      className="shrink-0 w-3.5 h-3.5 rounded-sm text-white text-[9px] font-bold flex items-center justify-center mt-0.5 tabular-nums"
                      style={{ backgroundColor: accentHex }}
                    >
                      {idx + 1}
                    </span>
                    <span className="font-medium">{ans}</span>
                  </div>
                ))}
              </div>
            ) : (
              <div
                className="grid grid-cols-3 gap-1.5 border-t pt-1.5"
                style={{ borderColor: inkSaver ? '#CBD5E1' : theme.borderHex }}
              >
                {[1, 2, 3].map((num) => (
                  <div
                    key={num}
                    className="rounded bg-white border border-dashed border-slate-500 px-2 py-2 flex items-center gap-1.5 text-[9.8px] text-slate-600 leading-snug keep-all"
                  >
                    <span
                      className="shrink-0 w-3.5 h-3.5 rounded-sm text-white text-[9px] font-bold flex items-center justify-center tabular-nums"
                      style={{ backgroundColor: accentHex }}
                    >
                      {num}
                    </span>
                    <span className="flex-1 border-b border-dotted border-slate-400 pb-0.5 text-[9.5px]">
                      토의 기록:
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        );
      }

      // Dedicated SIF Official Analysis Read-Only Frame (High-Risk Work + Precursor Factor with 『...』 highlight)
      if (isSif) {
        const factorSegments = splitSifBracketHighlights(c.hazard_factor || c.direct_causes[0]);
        return (
          <div
            className={`rounded-md border grid grid-cols-12 gap-2.5 ${ultraDense ? 'p-2' : 'p-2.5'}`}
            style={{
              backgroundColor: inkSaver ? '#F8FAFC' : '#FFFBEB',
              borderColor: inkSaver ? '#334155' : '#F59E0B',
            }}
          >
            <div className="col-span-4 border-r pr-2.5" style={{ borderColor: inkSaver ? '#CBD5E1' : '#FDE68A' }}>
              <span
                className="inline-flex items-center gap-1 text-[9.5px] font-extrabold mb-0.5"
                style={{ color: inkSaver ? '#0F172A' : '#92400E' }}
              >
                <Lock className="w-2.5 h-2.5 shrink-0" />
                <span>고위험작업·상황 (원문)</span>
              </span>
              <p className="text-[10.4px] font-bold text-slate-950 leading-snug keep-all">
                {c.high_risk_work || c.work_type}
              </p>
              {c.process && (
                <p className="text-[9.2px] text-slate-600 mt-1 leading-tight keep-all">
                  분류: {c.process}
                </p>
              )}
            </div>
            <div className="col-span-8 min-w-0">
              <span
                className="inline-flex items-center gap-1 text-[9.5px] font-extrabold mb-0.5"
                style={{ color: inkSaver ? '#0F172A' : '#92400E' }}
              >
                <Lock className="w-2.5 h-2.5 shrink-0" />
                <span>재해유발요인 (SIF Precursor · 공단 공식 원문)</span>
              </span>
              <p className="text-[10.4px] text-slate-900 leading-snug keep-all">
                {factorSegments.map((seg, i) =>
                  seg.emphasized ? (
                    <strong
                      key={i}
                      className={`font-extrabold rounded-xs px-0.5 ${
                        inkSaver
                          ? 'underline decoration-2 decoration-slate-900'
                          : 'bg-amber-200/80 text-amber-950'
                      }`}
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
        );
      }

      // Standard Cause Analysis Grid (Read-Only)
      return (
        <div className="grid grid-cols-12 gap-2">
          <div
            className={`col-span-7 rounded-md border ${ultraDense ? 'p-2' : 'p-2.5'}`}
            style={{
              backgroundColor: inkSaver ? '#FFFFFF' : theme.softBgHex,
              borderColor: inkSaver ? '#334155' : theme.borderHex,
            }}
          >
            <p
              className="text-[10.2px] font-extrabold mb-1 flex items-center gap-1"
              style={{ color: inkSaver ? '#0F172A' : theme.accentTextHex }}
            >
              <Lock className="w-2.5 h-2.5 shrink-0" />
              <span>핵심 위험요인 및 발생원인 (원문 고정)</span>
            </p>
            <ul className="space-y-1">
              {c.direct_causes.map((cause, idx) => (
                <li
                  key={idx}
                  className="flex items-start gap-1.5 text-[10.1px] text-slate-900 leading-snug keep-all"
                >
                  <span
                    className="shrink-0 w-3.5 h-3.5 rounded-sm text-white text-[9px] font-bold flex items-center justify-center mt-0.5 tabular-nums"
                    style={{ backgroundColor: accentHex }}
                  >
                    {idx + 1}
                  </span>
                  <span className="font-medium">{cause}</span>
                </li>
              ))}
            </ul>
          </div>
          <div
            className={`col-span-5 rounded-md border border-slate-300 bg-slate-50 flex flex-col justify-between ${
              ultraDense ? 'p-2' : 'p-2.5'
            }`}
          >
            <div>
              <p className="text-[10.2px] font-extrabold text-slate-800 mb-1">관리적 근본 원인</p>
              <ul className="space-y-1">
                {c.root_causes.map((root, idx) => (
                  <li
                    key={idx}
                    className="flex items-start gap-1.5 text-[9.9px] text-slate-800 leading-snug keep-all"
                  >
                    <span className="font-bold text-slate-950">•</span>
                    <span>{root}</span>
                  </li>
                ))}
              </ul>
            </div>
            {!ultraDense && (
              <div className="mt-1 pt-1 border-t border-slate-200 text-[9.4px] text-slate-700 leading-snug keep-all">
                <span className="font-bold text-red-800">X 관행:</span> {c.ox_comparison[0].wrong}
              </div>
            )}
          </div>
        </div>
      );
    };

    const mCols = c.preventive_measures.length === 1 ? 'grid-cols-1' : 'grid-cols-2';

    return (
      <section className={dense ? 'space-y-1.5' : 'space-y-2'}>
        <div className="flex items-center justify-between border-b border-slate-300 pb-1 gap-2">
          <div className="flex items-center gap-1.5 min-w-0">
            <h2 className="text-[12.8px] font-bold text-slate-950 tracking-tight">
              02. 핵심 원인 분석 및 {isSif ? '위험성감소대책' : '동종재해 예방 안전조치'}
            </h2>
            {translations && (
              <span className="inline-flex items-center gap-0.5 text-[9.8px] font-bold text-slate-700 shrink-0">
                <Globe className="w-3 h-3" />
                <span>{langLabel} 병기</span>
              </span>
            )}
          </div>
          <span className="inline-flex items-center gap-1 text-[9.8px] text-slate-600 font-medium keep-all text-right">
            <Scale className="w-3 h-3 shrink-0" />
            <span>{c.legal_ref}</span>
          </span>
        </div>

        {/* Locked Factual Cause / SIF Block */}
        {renderLockedAnalysisFrame()}

        {/* Editable Preventive / SIF Risk-Reduction Measures Frame */}
        <div className="space-y-1">
          <div className="flex items-center justify-between gap-2 text-[10px]">
            <div className="flex items-center gap-1.5 flex-wrap">
              <span className="font-extrabold text-slate-900">
                {isSif ? 'SIF 위험성감소대책' : '동종재해 예방 핵심 안전조치'}
              </span>
              <span
                className={`px-1.5 py-0.5 rounded-sm text-[9.2px] font-bold ${
                  isMeasuresEdited
                    ? inkSaver
                      ? 'bg-slate-200 text-slate-950 border border-slate-700'
                      : 'bg-amber-100 text-amber-900 border border-amber-300'
                    : 'bg-slate-100 text-slate-700 border border-slate-200'
                }`}
              >
                {measuresSourceCaption}
              </span>
            </div>

            {canInlineEdit && (
              <div
                data-export-hide="true"
                className="no-print flex items-center gap-1.5 shrink-0"
              >
                {c.preventive_measures.length < 6 && (
                  <button
                    type="button"
                    onClick={handleAddMeasure}
                    className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded border border-slate-300 bg-white hover:bg-slate-50 text-[9.5px] font-bold text-slate-700 cursor-pointer"
                  >
                    <Plus className="w-2.5 h-2.5" />
                    <span>대책 추가</span>
                  </button>
                )}
                {isMeasuresEdited && onResetMeasures && (
                  <button
                    type="button"
                    onClick={() => {
                      setEditingMeasureIdx(null);
                      onResetMeasures();
                    }}
                    className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded border border-orange-300 bg-orange-50 hover:bg-orange-100 text-[9.5px] font-bold text-orange-800 cursor-pointer"
                  >
                    <RotateCcw className="w-2.5 h-2.5" />
                    <span>↺ 공단 원문 복원</span>
                  </button>
                )}
              </div>
            )}
          </div>

          <div className={`grid ${mCols} gap-1.5`}>
            {c.preventive_measures.map((measure, idx) => {
              const isEditingThis = canInlineEdit && editingMeasureIdx === idx;
              return (
                <div
                  key={idx}
                  className={`group relative flex items-start gap-2 rounded-md border bg-white ${
                    translations || ultraDense || c.preventive_measures.length >= 5
                      ? 'p-1.5'
                      : 'p-2'
                  } ${
                    isMeasuresEdited
                      ? inkSaver
                        ? 'border-slate-700'
                        : 'border-amber-300'
                      : 'border-slate-300'
                  }`}
                >
                  <span
                    className="shrink-0 w-4 h-4 rounded-sm text-white text-[9.5px] font-bold flex items-center justify-center mt-0.5 tabular-nums"
                    style={{ backgroundColor: accentHex }}
                  >
                    {idx + 1}
                  </span>

                  <div className="flex-1 min-w-0 keep-all">
                    {isEditingThis ? (
                      <textarea
                        autoFocus
                        rows={2}
                        value={measure}
                        onChange={(e) => handleChangeMeasureText(idx, e.target.value)}
                        onBlur={() => setEditingMeasureIdx(null)}
                        onKeyDown={(e) => {
                          if (e.key === 'Escape' || (e.key === 'Enter' && !e.shiftKey)) {
                            e.preventDefault();
                            setEditingMeasureIdx(null);
                          }
                        }}
                        className="w-full rounded border border-orange-400 bg-orange-50/40 px-1.5 py-0.5 text-[10.2px] font-semibold text-slate-950 leading-snug focus:outline-none"
                      />
                    ) : (
                      <div
                        onClick={() => {
                          if (canInlineEdit) setEditingMeasureIdx(idx);
                        }}
                        title={canInlineEdit ? '클릭하여 현장 여건에 맞게 수정·요약' : undefined}
                        className={canInlineEdit ? 'cursor-text hover:bg-slate-50 rounded -mx-0.5 px-0.5' : ''}
                      >
                        <p
                          className={`font-semibold text-slate-950 leading-snug ${
                            translations || ultraDense || c.preventive_measures.length >= 5
                              ? 'text-[9.8px]'
                              : 'text-[10.4px]'
                          }`}
                        >
                          {measure}
                        </p>
                        {translations && translations.measures[idx] && (
                          <p
                            className="text-[9px] font-medium leading-tight mt-0.5"
                            style={{ color: inkSaver ? '#334155' : theme.accentTextHex }}
                          >
                            {translations.measures[idx]}
                          </p>
                        )}
                      </div>
                    )}
                  </div>

                  {canInlineEdit && !isEditingThis && (
                    <div
                      data-export-hide="true"
                      className="no-print opacity-0 group-hover:opacity-100 flex items-center gap-0.5 shrink-0 transition-opacity"
                    >
                      <button
                        type="button"
                        onClick={() => setEditingMeasureIdx(idx)}
                        aria-label="대책 수정"
                        className="p-0.5 text-slate-400 hover:text-slate-800 cursor-pointer"
                      >
                        <Pencil className="w-3 h-3" />
                      </button>
                      {c.preventive_measures.length > 1 && (
                        <button
                          type="button"
                          onClick={() => handleRemoveMeasure(idx)}
                          aria-label="대책 삭제"
                          className="p-0.5 text-slate-400 hover:text-red-600 cursor-pointer"
                        >
                          <X className="w-3 h-3" />
                        </button>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </section>
    );
  };

  // =========================================================================
  // 03. 유사 공정 주의 사례 (문장 단위 완결 — 말줄임 '...' 없음)
  // =========================================================================
  const renderSection03CrossProcess = () => {
    if (!relatedCase) {
      return (
        <section className="space-y-1">
          <div className="flex items-center justify-between border-b border-slate-300 pb-1">
            <h2 className="text-[12.8px] font-bold text-slate-950 tracking-tight">
              03. 현장 위험예지(KYT) 핵심 확인
            </h2>
            <span className="text-[9.8px] font-medium text-slate-600">단독사례 집중 모드</span>
          </div>
          <div className="rounded-md border border-slate-300 bg-slate-50 px-3 py-1.5 flex items-center justify-between gap-3 keep-all">
            <p className="text-[10.4px] font-bold text-slate-900 leading-snug">
              Q. {c.kyt_quiz.question}
            </p>
            <span className="shrink-0 text-[9.5px] font-bold text-slate-800 bg-white border border-slate-300 rounded px-2 py-0.5">
              작업 전 구두 확인
            </span>
          </div>
        </section>
      );
    }

    const crossSummary = formatCrossProcessSummaryVerbatim(relatedCase);

    return (
      <section className="space-y-1">
        <div className="flex items-center justify-between border-b border-slate-300 pb-1 gap-2">
          <div className="flex items-center gap-1.5">
            <h2 className="text-[12.8px] font-bold text-slate-950 tracking-tight">
              03. 유사 공정 주의 사례
            </h2>
            <span className="text-[10px] font-medium text-slate-600">타 업종 교차 경각심</span>
          </div>
          <span
            className={`inline-flex items-center gap-1 text-[10px] font-bold ${
              inkSaver ? 'text-slate-900' : 'text-amber-900'
            }`}
          >
            <Repeat className="w-3 h-3 shrink-0" />
            <span>
              {relatedCase.industry} · {relatedCase.hazard_type} · {relatedCase.work_type}
            </span>
          </span>
        </div>

        <div
          className={`rounded-md border grid grid-cols-12 gap-2.5 items-center keep-all ${
            ultraDense ? 'px-2.5 py-1.5' : 'px-3 py-2'
          } ${
            inkSaver
              ? 'border-slate-400 bg-slate-50'
              : 'border-amber-300 bg-amber-50/75'
          }`}
        >
          <div className="col-span-8 min-w-0 space-y-0.5">
            <p className="text-[10.6px] font-extrabold text-slate-950 leading-snug">
              {relatedCase.title}
            </p>
            <p className="text-[9.8px] text-slate-800 leading-snug">
              {crossSummary.text}
            </p>
          </div>
          <div
            className={`col-span-4 rounded border bg-white px-2.5 py-1.5 ${
              inkSaver ? 'border-slate-400' : 'border-amber-300/90'
            }`}
          >
            <span
              className={`block text-[9.2px] font-extrabold mb-0.5 ${
                inkSaver ? 'text-slate-900' : 'text-amber-800'
              }`}
            >
              교차 공정 핵심 교훈
            </span>
            <p className="text-[9.9px] font-bold text-slate-950 leading-snug">
              {relatedCase.preventive_measures[0]}
            </p>
          </div>
        </div>
      </section>
    );
  };

  // =========================================================================
  // 04. 작업 전 5분 TBM 현장 실전 점검표 [현장 맞춤 인라인 편집 허용]
  // =========================================================================
  const renderSection04TbmChecklist = () => (
    <section className="space-y-1">
      <div className="flex items-center justify-between border-b border-slate-300 pb-1 gap-2">
        <div className="flex items-center gap-1.5 flex-wrap">
          {isTbmHighlight ? (
            <ClipboardCheck className="w-4 h-4 shrink-0" style={{ color: accentHex }} />
          ) : (
            <CheckSquare className="w-3.5 h-3.5 text-slate-900 shrink-0" />
          )}
          <h2 className="text-[12.8px] font-bold text-slate-950 tracking-tight">
            04. 작업 전 5분 TBM 현장 실전 점검표
          </h2>
          <span
            className={`px-1.5 py-0.5 rounded-sm text-[9px] font-bold ${
              isTbmEdited
                ? inkSaver
                  ? 'bg-slate-200 text-slate-950 border border-slate-700'
                  : 'bg-amber-100 text-amber-900 border border-amber-300'
                : 'bg-slate-100 text-slate-700 border border-slate-200'
            }`}
          >
            {tbmSourceCaption}
          </span>
        </div>

        <div className="flex items-center gap-1.5">
          {canInlineEdit && (
            <div data-export-hide="true" className="no-print flex items-center gap-1">
              {c.tbm_checklist.length < 7 && (
                <button
                  type="button"
                  onClick={handleAddTbm}
                  className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded border border-slate-300 bg-white hover:bg-slate-50 text-[9.5px] font-bold text-slate-700 cursor-pointer"
                >
                  <Plus className="w-2.5 h-2.5" />
                  <span>점검 추가</span>
                </button>
              )}
              {isTbmEdited && onResetTbm && (
                <button
                  type="button"
                  onClick={() => {
                    setEditingTbmIdx(null);
                    onResetTbm();
                  }}
                  className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded border border-orange-300 bg-orange-50 hover:bg-orange-100 text-[9.5px] font-bold text-orange-800 cursor-pointer"
                >
                  <RotateCcw className="w-2.5 h-2.5" />
                  <span>↺ 원문 복원</span>
                </button>
              )}
            </div>
          )}
          <span className="text-[9.8px] font-medium text-slate-600 hidden sm:inline">
            이상 시 즉시 작업 중지
          </span>
        </div>
      </div>

      <div
        className="rounded-md overflow-hidden border"
        style={{
          borderColor: inkSaver ? '#0F172A' : isTbmHighlight ? accentHex : '#CBD5E1',
          borderWidth: isTbmHighlight || inkSaver ? '1.5px' : '1px',
        }}
      >
        <table className="w-full text-left border-collapse keep-all">
          <thead>
            <tr
              className={`text-[9.8px] ${inkSaver ? 'text-slate-950 border-b border-slate-900' : 'text-white'}`}
              style={{
                backgroundColor: inkSaver
                  ? '#F1F5F9'
                  : isTbmHighlight
                    ? accentHex
                    : '#0F172A',
              }}
            >
              <th className="py-1 px-2 w-10 text-center font-bold">번호</th>
              <th className="py-1 px-2 font-bold">작업 전 필수 안전점검 항목</th>
              <th className="py-1 px-2 w-28 text-center font-bold">점검 결과</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-200">
            {c.tbm_checklist.map((item, idx) => {
              const isEditingRow = canInlineEdit && editingTbmIdx === idx;
              const compactRow = ultraDense || c.tbm_checklist.length >= 6;
              return (
                <tr
                  key={idx}
                  className={`group ${idx % 2 === 1 ? 'bg-slate-50/70' : 'bg-white'}`}
                >
                  <td
                    className={`px-2 text-center font-bold text-slate-800 tabular-nums ${
                      compactRow ? 'py-1 text-[9.8px]' : 'py-1.5 text-[10.2px]'
                    }`}
                  >
                    0{idx + 1}
                  </td>
                  <td
                    className={`px-2 font-semibold text-slate-950 leading-snug ${
                      compactRow ? 'py-1 text-[9.9px]' : 'py-1.5 text-[10.3px]'
                    }`}
                  >
                    {isEditingRow ? (
                      <input
                        type="text"
                        autoFocus
                        value={item}
                        onChange={(e) => handleChangeTbmText(idx, e.target.value)}
                        onBlur={() => setEditingTbmIdx(null)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter' || e.key === 'Escape') {
                            e.preventDefault();
                            setEditingTbmIdx(null);
                          }
                        }}
                        className="w-full rounded border border-orange-400 bg-orange-50/40 px-1.5 py-0.5 text-[10.2px] font-semibold text-slate-950 focus:outline-none"
                      />
                    ) : (
                      <div className="flex items-center justify-between gap-1.5">
                        <span
                          onClick={() => {
                            if (canInlineEdit) setEditingTbmIdx(idx);
                          }}
                          title={canInlineEdit ? '클릭하여 점검항목 수정' : undefined}
                          className={canInlineEdit ? 'cursor-text hover:underline decoration-dotted' : ''}
                        >
                          {item}
                        </span>
                        {canInlineEdit && (
                          <span
                            data-export-hide="true"
                            className="no-print opacity-0 group-hover:opacity-100 inline-flex items-center gap-0.5 shrink-0"
                          >
                            <button
                              type="button"
                              onClick={() => setEditingTbmIdx(idx)}
                              aria-label="점검항목 수정"
                              className="p-0.5 text-slate-400 hover:text-slate-800 cursor-pointer"
                            >
                              <Pencil className="w-2.5 h-2.5" />
                            </button>
                            {c.tbm_checklist.length > 1 && (
                              <button
                                type="button"
                                onClick={() => handleRemoveTbm(idx)}
                                aria-label="점검항목 삭제"
                                className="p-0.5 text-slate-400 hover:text-red-600 cursor-pointer"
                              >
                                <X className="w-2.5 h-2.5" />
                              </button>
                            )}
                          </span>
                        )}
                      </div>
                    )}
                  </td>
                  <td
                    className={`px-2 text-center text-slate-800 font-semibold whitespace-nowrap ${
                      compactRow ? 'py-1 text-[9.6px]' : 'py-1.5 text-[10px]'
                    }`}
                  >
                    □ 양호 &nbsp; □ 조치
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>

        {isTbmHighlight && (
          <div
            className="border-t px-3 py-1 flex items-center justify-between text-[9.8px] font-bold tabular-nums"
            style={{
              backgroundColor: inkSaver ? '#F8FAFC' : theme.softBgHex,
              borderColor: inkSaver ? '#334155' : theme.borderHex,
              color: inkSaver ? '#0F172A' : theme.accentTextHex,
            }}
          >
            <span>점검자 확인란</span>
            <div className="flex items-center gap-4 text-slate-900 font-semibold">
              <span>점검자(반장): ______________ (인)</span>
              <span>확인 시각: ____ : ____</span>
              <span>이상 조치: □ 없음  □ 완료</span>
            </div>
          </div>
        )}
      </div>
    </section>
  );

  const allowWebAutoHeight = !isPrintClone && expandFullOverview;

  return (
    <div
      ref={sheetRef}
      className={`ops-print-page ops-sheet-shadow bg-white text-slate-900 w-[794px] ${
        allowWebAutoHeight ? 'min-h-[1123px] h-auto' : 'h-[1123px] overflow-hidden'
      } flex flex-col border border-slate-300 select-text keep-all`}
    >
      {/* Top Industrial Header + Source 1-Second Recognition Badge */}
      <div className="shrink-0">
        <div className={`h-2 w-full ${stripeClass}`} />

        <header
          className={`px-6 flex items-center justify-between gap-4 ${
            inkSaver ? 'text-slate-950 border-b-2 border-slate-900' : 'text-white'
          } ${ultraDense ? 'py-2.5' : 'py-3'}`}
          style={{ backgroundColor: headerBgHex }}
        >
          <div className="flex items-center gap-3.5 min-w-0">
            <div
              className={`shrink-0 rounded-md p-1.5 ${
                inkSaver ? 'bg-white border border-slate-900' : 'bg-white/95 shadow-xs'
              }`}
            >
              <HazardPictogram
                hazardType={c.hazard_type}
                size={ultraDense ? 42 : 48}
                inkSaver={inkSaver}
              />
            </div>
            <div className="min-w-0">
              <div className="flex items-center flex-wrap gap-1.5 text-[10px] font-semibold mb-0.5">
                <span
                  className="px-1.5 py-0.5 rounded-sm font-extrabold text-[9.8px]"
                  style={
                    inkSaver
                      ? { backgroundColor: '#0F172A', color: '#FFFFFF' }
                      : { backgroundColor: '#FFFFFF', color: sourceBrand.primaryHex }
                  }
                >
                  [{sourceBadgeLabel}]
                </span>
                <span className={inkSaver ? 'text-slate-800 font-bold' : 'text-slate-100'}>
                  {material.selectedIndustry} · {material.selectedWorkType}
                </span>
              </div>
              <h1
                className={`font-extrabold leading-tight tracking-tight [text-wrap:balance] keep-all ${
                  inkSaver ? 'text-slate-950' : 'text-white'
                } ${ultraDense ? 'text-[15.5px]' : 'text-[17px]'}`}
              >
                {c.title}
              </h1>
            </div>
          </div>

          <div
            className={`shrink-0 text-right border-l pl-3.5 space-y-0.5 text-[10px] ${
              inkSaver ? 'border-slate-300' : 'border-white/25'
            }`}
          >
            <div
              className={`font-extrabold text-[11px] ${
                inkSaver ? 'text-slate-950' : 'text-amber-300'
              }`}
            >
              재해유형: {c.hazard_type}
            </div>
            <div className={`tabular-nums ${inkSaver ? 'text-slate-800' : 'text-slate-100'}`}>
              교육일자: {dateLabel}
            </div>
            <div className={`max-w-[175px] break-words ${inkSaver ? 'text-slate-800' : 'text-slate-100'}`}>
              현장: {siteLabel}
            </div>
            <div className={`max-w-[175px] break-words ${inkSaver ? 'text-slate-700' : 'text-slate-200'}`}>
              강사: {instructorLabel}
            </div>
          </div>
        </header>

        {/* Seasonal & Weather Risk Alert Ribbon */}
        {season.id !== 'always' && (
          <div
            className="border-b px-6 py-1.5 flex items-start gap-2 text-[10px]"
            style={
              inkSaver
                ? { backgroundColor: '#F8FAFC', borderColor: '#334155', color: '#0F172A' }
                : { backgroundColor: season.bgHex, borderColor: season.borderHex, color: season.textHex }
            }
          >
            <span
              className="inline-flex items-center gap-1 shrink-0 px-1.5 py-0.5 rounded-sm text-[9.2px] font-extrabold text-white mt-0.5"
              style={{ backgroundColor: inkSaver ? '#0F172A' : season.badgeBgHex }}
            >
              <CloudAlert className="w-3 h-3 shrink-0" />
              <span>{season.badgeText}</span>
            </span>
            <div className="min-w-0 leading-snug keep-all">
              <p className="font-bold">{season.extraRule}</p>
              {seasonTrans && <p className="text-[9.2px] opacity-90">{seasonTrans}</p>}
            </div>
          </div>
        )}

        {/* Similarity Fallback Notice Ribbon */}
        {!isExactMatch && (
          <div
            className={`border-b px-6 py-1 flex items-center justify-between text-[9.8px] ${
              inkSaver
                ? 'bg-slate-100 border-slate-400 text-slate-900'
                : 'bg-amber-100 border-amber-300 text-amber-950'
            }`}
          >
            <div className="flex items-center gap-1.5 font-bold">
              <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
              <span>유사 공정 기반 위험요인 분석 자료</span>
            </div>
            <span className="text-[9.4px] font-medium">
              참조: {c.industry} · {c.work_type}
            </span>
          </div>
        )}
      </div>

      {/* Main Content Body: STRICT 01 -> 02 -> 03 -> 04 educational flow */}
      <main
        className={`flex-1 px-6 flex flex-col justify-between ${
          allowWebAutoHeight ? '' : 'overflow-hidden'
        } ${ultraDense ? 'py-2 gap-1.5' : dense ? 'py-2.5 gap-2' : 'py-3 gap-2.5'}`}
      >
        {renderSection01Overview()}
        {renderSection02AnalysisAndMeasures()}
        {renderSection03CrossProcess()}
        {renderSection04TbmChecklist()}
      </main>

      {/* Bottom Worker Slogan + Optional Fatality Disclaimer + Signature Table + Source Footer */}
      <div className="shrink-0">
        {c.disclaimer && (
          <div
            className={`mx-6 mb-1.5 px-3 py-1 rounded text-[9.2px] font-semibold keep-all ${
              inkSaver
                ? 'bg-slate-100 text-slate-800 border border-slate-400'
                : 'bg-red-50 text-red-900 border border-red-200'
            }`}
          >
            {c.disclaimer}
          </div>
        )}

        <div
          className={`mx-6 rounded-md px-4 flex items-center justify-between gap-4 ${
            inkSaver ? 'bg-white text-slate-950 border-2 border-slate-900' : 'text-white'
          } ${siteInfo.showTbmSignTable ? 'mb-1.5 py-1.5' : 'mb-2 py-2'}`}
          style={inkSaver ? undefined : { backgroundColor: accentHex }}
        >
          <div className="min-w-0 keep-all">
            <span
              className={`block text-[9.2px] font-bold tracking-wide ${
                inkSaver ? 'text-slate-600' : 'text-white/85'
              }`}
            >
              작업 전 근로자 다짐 구호 (다 함께 복창){translations ? ` · ${langLabel}` : ''}
            </span>
            <p
              className={`${
                ultraDense ? 'text-[13px]' : 'text-[14.2px]'
              } font-extrabold tracking-tight leading-snug`}
            >
              “{c.worker_slogan}”
            </p>
            {translations && (
              <p
                className={`text-[9.8px] font-semibold leading-tight mt-0.5 ${
                  inkSaver ? 'text-slate-700' : 'text-amber-100'
                }`}
              >
                {translations.slogan}
              </p>
            )}
          </div>
          {!siteInfo.showTbmSignTable && (
            <div
              className={`shrink-0 rounded px-2.5 py-1 text-right text-[9.5px] leading-tight ${
                inkSaver ? 'bg-slate-100 border border-slate-400 text-slate-900' : 'bg-black/20'
              }`}
            >
              <div className="font-bold">교육 확인 서명</div>
              <div className={inkSaver ? 'text-slate-700 mt-0.5' : 'text-white/85 mt-0.5'}>
                관리자: _______ / 대표: _______
              </div>
            </div>
          )}
        </div>

        {/* Optional TBM Attendee Signature Table (10 Slots) */}
        {siteInfo.showTbmSignTable && (
          <div className="mx-6 mb-1.5 border border-slate-400 rounded-sm overflow-hidden bg-white">
            <div
              className={`px-2.5 py-1 flex items-center justify-between text-[9.4px] font-semibold tabular-nums ${
                inkSaver ? 'bg-slate-100 text-slate-950 border-b border-slate-400' : 'bg-slate-800 text-white'
              }`}
            >
              <span>TBM 안전교육 참석자 확인 서명부 (10인)</span>
              <span>
                교육일자: {dateLabel} &nbsp;|&nbsp; 교육강사: {instructorLabel} (서명: _________)
              </span>
            </div>
            <table className="w-full border-collapse text-[9px] text-slate-800 table-fixed">
              <tbody>
                {[0, 5].map((rowStart) => (
                  <tr key={rowStart} className="border-t border-slate-300">
                    {[0, 1, 2, 3, 4].map((offset) => {
                      const num = rowStart + offset + 1;
                      return (
                        <td
                          key={num}
                          className="border-r last:border-r-0 border-slate-300 px-1.5 py-0.5 align-top"
                        >
                          <div className="flex items-center justify-between text-[8.4px] text-slate-500 tabular-nums">
                            <span className="font-bold text-slate-700">{num}.</span>
                            <span>성명 / 서명</span>
                          </div>
                          <div className="h-2.5" />
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        <footer className="bg-slate-100 border-t border-slate-300 px-6 py-1.5 flex items-center justify-between gap-3 text-[9.2px] text-slate-700 tabular-nums">
          <div className="flex items-center gap-2 min-w-0">
            {siteInfo.logoDataUrl && (
              <img
                src={siteInfo.logoDataUrl}
                alt="회사/현장 로고"
                className="h-5 max-w-[90px] object-contain shrink-0 bg-white px-1 py-0.5 rounded-sm border border-slate-300"
              />
            )}
            <span className="keep-all">
              출처: {c.source_ref || sourceBrand.defaultSourceRef} · 코드 {c.id}
            </span>
          </div>
          <span className="shrink-0 font-semibold">
            {material.isCustomEdited
              ? '대책: 공단 권고안 기반 · 현장 맞춤 반영'
              : '사실·대책: 공단 공식 원문 기준'}{' '}
            (A4)
          </span>
        </footer>
      </div>
    </div>
  );
});
