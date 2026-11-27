import React, { useEffect, useState } from 'react';
import {
  Check,
  Lock,
  Plus,
  RotateCcw,
  Trash2,
  FileText,
  ShieldCheck,
  ClipboardCheck,
  BookmarkPlus,
} from 'lucide-react';
import { GeneratedMaterial } from '../types/safety';
import {
  getCaseOverviewVerbatim,
  getDisplaySourceRef,
  getMeasuresSourceCaption,
  getTbmSourceCaption,
  hasOfficialKoshaMeasures,
  isOfficialKoshaApiCase,
} from '../utils/textFit';

interface MobileEditSheetProps {
  open: boolean;
  initialTab?: 'measures' | 'tbm';
  material: GeneratedMaterial;
  measurePresets: string[];
  onClose: () => void;
  onUpdateMeasures: (nextMeasures: string[]) => void;
  onResetMeasures: () => void;
  onUpdateTbm: (nextTbm: string[]) => void;
  onResetTbm: () => void;
  onResetAll: () => void;
  onAppendPresetMeasure: (presetText: string) => void;
}

/**
 * Mobile-dedicated bottom sheet for editing preventive measures and 5-minute TBM checklist.
 * Keeps factual KOSHA fields strictly Read-Only, uses 16px+ inputs to prevent iOS auto-zoom,
 * and pins Done/Reset actions to the top header so the virtual keyboard never hides them.
 */
export const MobileEditSheet: React.FC<MobileEditSheetProps> = ({
  open,
  initialTab = 'measures',
  material,
  measurePresets,
  onClose,
  onUpdateMeasures,
  onResetMeasures,
  onUpdateTbm,
  onResetTbm,
  onResetAll,
  onAppendPresetMeasure,
}) => {
  const [tab, setTab] = useState<'measures' | 'tbm'>(initialTab);
  const [showPresets, setShowPresets] = useState(false);

  useEffect(() => {
    if (open) {
      setTab(initialTab);
      setShowPresets(false);
    }
  }, [open, initialTab]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  if (!open) return null;

  const c = material.primaryCase;
  const isOfficialKosha = isOfficialKoshaApiCase(c);
  const hasOfficialMeasures = hasOfficialKoshaMeasures(c);
  const isMeasuresEdited = Boolean(material.isMeasuresEdited);
  const isTbmEdited = Boolean(material.isTbmEdited);
  const isAnyEdited = Boolean(material.isCustomEdited);

  const statusLabel =
    tab === 'tbm'
      ? getTbmSourceCaption(c, isTbmEdited)
      : getMeasuresSourceCaption(c, isMeasuresEdited);

  const handleMeasureChange = (idx: number, val: string) => {
    const next = [...c.preventive_measures];
    next[idx] = val;
    onUpdateMeasures(next);
  };

  const handleMeasureAdd = () => {
    if (c.preventive_measures.length >= 6) return;
    onUpdateMeasures([...c.preventive_measures, '현장 추가 안전대책을 입력하세요.']);
  };

  const handleMeasureDelete = (idx: number) => {
    if (c.preventive_measures.length <= 1) return;
    onUpdateMeasures(c.preventive_measures.filter((_, i) => i !== idx));
  };

  const handleTbmChange = (idx: number, val: string) => {
    const next = [...c.tbm_checklist];
    next[idx] = val;
    onUpdateTbm(next);
  };

  const handleTbmAdd = () => {
    if (c.tbm_checklist.length >= 7) return;
    onUpdateTbm([...c.tbm_checklist, '작업 전 현장 추가 안전점검 항목을 확인했는가?']);
  };

  const handleTbmDelete = (idx: number) => {
    if (c.tbm_checklist.length <= 1) return;
    onUpdateTbm(c.tbm_checklist.filter((_, i) => i !== idx));
  };

  return (
    <div
      data-export-hide="true"
      className="no-print fixed inset-0 z-50 flex items-end justify-center bg-slate-950/55 backdrop-blur-[1px]"
      onClick={onClose}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-label="예방대책 및 TBM 현장 맞춤 편집"
        className="w-full max-w-[680px] max-h-[85dvh] bg-white rounded-t-2xl shadow-2xl flex flex-col overflow-hidden overscroll-contain"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Top Sticky Header — always reachable above mobile virtual keyboard */}
        <div className="shrink-0 bg-slate-900 text-white px-4 py-3 flex items-center justify-between gap-2">
          <div className="min-w-0">
            <h2 className="text-[15px] font-extrabold leading-tight truncate">
              대책 · TBM 현장 맞춤 편집
            </h2>
            <p className="text-[11px] text-slate-300 truncate mt-0.5">{statusLabel}</p>
          </div>
          <div className="flex items-center gap-1.5 shrink-0">
            {isAnyEdited && (
              <button
                type="button"
                onClick={onResetAll}
                className="min-h-[44px] px-2.5 rounded-lg border border-orange-400/70 bg-orange-500/20 text-orange-100 text-[12px] font-bold inline-flex items-center gap-1 active:bg-orange-500/35 cursor-pointer"
              >
                <RotateCcw className="w-3.5 h-3.5 shrink-0" />
                <span>{hasOfficialMeasures ? '공단 원문 복원' : '표준 복원'}</span>
              </button>
            )}
            <button
              type="button"
              onClick={onClose}
              className="min-h-[44px] min-w-[64px] px-3.5 rounded-lg bg-orange-600 hover:bg-orange-500 active:bg-orange-700 text-white text-[13.5px] font-extrabold inline-flex items-center justify-center gap-1 cursor-pointer"
            >
              <Check className="w-4 h-4 shrink-0" />
              <span>완료</span>
            </button>
          </div>
        </div>

        {/* Section Tabs */}
        <div className="shrink-0 grid grid-cols-2 gap-1.5 p-2.5 bg-slate-100 border-b border-slate-200">
          <button
            type="button"
            onClick={() => setTab('measures')}
            className={`min-h-[44px] rounded-lg text-[13px] font-bold inline-flex items-center justify-center gap-1.5 transition-colors cursor-pointer ${
              tab === 'measures'
                ? 'bg-white text-slate-950 shadow-xs border border-slate-200'
                : 'text-slate-600'
            }`}
          >
            <ShieldCheck className="w-4 h-4 shrink-0" />
            <span>예방대책 ({c.preventive_measures.length}/6)</span>
            {isMeasuresEdited && (
              <span className="w-2 h-2 rounded-full bg-orange-600 shrink-0" aria-hidden="true" />
            )}
          </button>
          <button
            type="button"
            onClick={() => setTab('tbm')}
            className={`min-h-[44px] rounded-lg text-[13px] font-bold inline-flex items-center justify-center gap-1.5 transition-colors cursor-pointer ${
              tab === 'tbm'
                ? 'bg-white text-slate-950 shadow-xs border border-slate-200'
                : 'text-slate-600'
            }`}
          >
            <ClipboardCheck className="w-4 h-4 shrink-0" />
            <span>5분 TBM ({c.tbm_checklist.length}/7)</span>
            {isTbmEdited && (
              <span className="w-2 h-2 rounded-full bg-orange-600 shrink-0" aria-hidden="true" />
            )}
          </button>
        </div>

        {/* Scrollable Sheet Body */}
        <div
          className="flex-1 overflow-y-auto overscroll-contain p-4 space-y-3"
          style={{ paddingBottom: 'calc(1.25rem + env(safe-area-inset-bottom))' }}
        >
          {/* Read-Only Fact Reminder Banner */}
          <div className="rounded-lg border border-slate-200 bg-slate-50 p-3 space-y-1 text-[12px] keep-all">
            <div className="flex items-center justify-between gap-2">
              <span className="inline-flex items-center gap-1 font-extrabold text-slate-800">
                {isOfficialKosha ? (
                  <Lock className="w-3.5 h-3.5 text-slate-700 shrink-0" />
                ) : (
                  <FileText className="w-3.5 h-3.5 text-slate-600 shrink-0" />
                )}
                <span>사실 영역 원문 고정 (수정 불가)</span>
              </span>
              <span className="text-[11px] font-semibold text-slate-500">기인물: {c.equipment}</span>
            </div>
            <p className="text-slate-700 leading-snug line-clamp-2">{getCaseOverviewVerbatim(c)}</p>
            <p className="text-[10.5px] text-slate-500 truncate">
              출처: {getDisplaySourceRef(c)}
              {c.occurred_date ? ` · 발생일 ${c.occurred_date}` : ''}
            </p>
          </div>

          {tab === 'measures' ? (
            <div className="space-y-2.5">
              <div className="flex items-center justify-between gap-2">
                <span className="text-[12.5px] font-extrabold text-slate-800">
                  {c.source_type === 'SIF' ? 'SIF 위험성감소대책' : '동종재해 예방 핵심 안전조치'}
                </span>
                <div className="flex items-center gap-1.5">
                  {isMeasuresEdited && (
                    <button
                      type="button"
                      onClick={onResetMeasures}
                      className="min-h-[36px] px-2.5 rounded-md border border-orange-300 bg-orange-50 text-orange-800 text-[11.5px] font-bold inline-flex items-center gap-1 cursor-pointer"
                    >
                      <RotateCcw className="w-3 h-3" />
                      <span>대책만 복원</span>
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() => setShowPresets((p) => !p)}
                    className="min-h-[36px] px-2.5 rounded-md border border-slate-300 bg-white text-slate-700 text-[11.5px] font-bold inline-flex items-center gap-1 cursor-pointer"
                  >
                    <BookmarkPlus className="w-3.5 h-3.5" />
                    <span>프리셋 불러오기</span>
                  </button>
                </div>
              </div>

              {showPresets && measurePresets.length > 0 && (
                <div className="rounded-lg border border-orange-200 bg-orange-50/70 p-2.5 space-y-1.5">
                  <span className="block text-[11.5px] font-bold text-orange-900">
                    저장된 현장 프리셋 (탭하여 대책에 추가)
                  </span>
                  <div className="space-y-1 max-h-36 overflow-y-auto">
                    {measurePresets.slice(0, 8).map((preset, idx) => (
                      <button
                        key={idx}
                        type="button"
                        onClick={() => onAppendPresetMeasure(preset)}
                        className="w-full min-h-[40px] text-left rounded-md bg-white border border-orange-200 px-2.5 py-1.5 text-[12.5px] font-semibold text-slate-800 active:bg-orange-100 keep-all cursor-pointer"
                      >
                        + {preset}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {c.preventive_measures.map((item, idx) => (
                <div
                  key={idx}
                  className="rounded-xl border border-slate-300 bg-white p-2.5 flex items-start gap-2"
                >
                  <span className="w-6 h-6 rounded-md bg-slate-900 text-white text-[12px] font-bold flex items-center justify-center shrink-0 mt-1 tabular-nums">
                    {idx + 1}
                  </span>
                  <textarea
                    rows={3}
                    value={item}
                    onChange={(e) => handleMeasureChange(idx, e.target.value)}
                    aria-label={`예방대책 ${idx + 1}번`}
                    className="flex-1 min-w-0 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-base font-medium text-slate-950 leading-snug focus:outline-none focus:ring-2 focus:ring-slate-900 focus:bg-white"
                  />
                  {c.preventive_measures.length > 1 && (
                    <button
                      type="button"
                      onClick={() => handleMeasureDelete(idx)}
                      aria-label={`예방대책 ${idx + 1}번 삭제`}
                      className="min-w-[44px] min-h-[44px] rounded-lg text-slate-400 hover:text-red-700 hover:bg-red-50 flex items-center justify-center shrink-0 cursor-pointer"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}
                </div>
              ))}

              {c.preventive_measures.length < 6 && (
                <button
                  type="button"
                  onClick={handleMeasureAdd}
                  className="w-full min-h-[46px] rounded-xl border-2 border-dashed border-slate-300 bg-slate-50 hover:bg-slate-100 text-slate-800 text-[13.5px] font-bold inline-flex items-center justify-center gap-1.5 cursor-pointer"
                >
                  <Plus className="w-4 h-4" />
                  <span>현장 안전대책 항목 추가 ({c.preventive_measures.length}/6)</span>
                </button>
              )}
            </div>
          ) : (
            <div className="space-y-2.5">
              <div className="flex items-center justify-between gap-2">
                <span className="text-[12.5px] font-extrabold text-slate-800">
                  작업 전 5분 TBM 필수 안전점검 항목
                </span>
                {isTbmEdited && (
                  <button
                    type="button"
                    onClick={onResetTbm}
                    className="min-h-[36px] px-2.5 rounded-md border border-orange-300 bg-orange-50 text-orange-800 text-[11.5px] font-bold inline-flex items-center gap-1 cursor-pointer"
                  >
                    <RotateCcw className="w-3 h-3" />
                    <span>TBM만 복원</span>
                  </button>
                )}
              </div>

              {c.tbm_checklist.map((item, idx) => (
                <div
                  key={idx}
                  className="rounded-xl border border-slate-300 bg-white p-2.5 flex items-start gap-2"
                >
                  <span className="w-6 h-6 rounded-md bg-slate-900 text-white text-[12px] font-bold flex items-center justify-center shrink-0 mt-1 tabular-nums">
                    0{idx + 1}
                  </span>
                  <textarea
                    rows={3}
                    value={item}
                    onChange={(e) => handleTbmChange(idx, e.target.value)}
                    aria-label={`TBM 점검항목 ${idx + 1}번`}
                    className="flex-1 min-w-0 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-base font-medium text-slate-950 leading-snug focus:outline-none focus:ring-2 focus:ring-slate-900 focus:bg-white"
                  />
                  {c.tbm_checklist.length > 1 && (
                    <button
                      type="button"
                      onClick={() => handleTbmDelete(idx)}
                      aria-label={`TBM 점검항목 ${idx + 1}번 삭제`}
                      className="min-w-[44px] min-h-[44px] rounded-lg text-slate-400 hover:text-red-700 hover:bg-red-50 flex items-center justify-center shrink-0 cursor-pointer"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}
                </div>
              ))}

              {c.tbm_checklist.length < 7 && (
                <button
                  type="button"
                  onClick={handleTbmAdd}
                  className="w-full min-h-[46px] rounded-xl border-2 border-dashed border-slate-300 bg-slate-50 hover:bg-slate-100 text-slate-800 text-[13.5px] font-bold inline-flex items-center justify-center gap-1.5 cursor-pointer"
                >
                  <Plus className="w-4 h-4" />
                  <span>TBM 점검항목 추가 ({c.tbm_checklist.length}/7)</span>
                </button>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
