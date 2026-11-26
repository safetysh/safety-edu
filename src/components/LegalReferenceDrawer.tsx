import React, { useEffect, useState } from 'react';
import {
  X,
  Scale,
  BookOpen,
  PlayCircle,
  ExternalLink,
  Download,
  AlertTriangle,
  Info,
  ShieldAlert,
  FileText,
  CheckCircle2,
} from 'lucide-react';
import { AccidentCase, ResolvedLegalReference } from '../types/safety';

interface LegalReferenceDrawerProps {
  open: boolean;
  onClose: () => void;
  legalRef: ResolvedLegalReference | null;
  primaryCase: AccidentCase;
}

type DrawerTab = 'laws' | 'guides' | 'media';

export const LegalReferenceDrawer: React.FC<LegalReferenceDrawerProps> = ({
  open,
  onClose,
  legalRef,
  primaryCase,
}) => {
  const [activeTab, setActiveTab] = useState<DrawerTab>('laws');

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div
      data-export-hide="true"
      className="no-print fixed inset-0 z-50 flex justify-end bg-slate-950/45 backdrop-blur-[1px]"
      onClick={onClose}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-label="법령·지침·공단 미디어 참고 서랍"
        className="w-full max-w-[620px] h-full bg-white shadow-2xl border-l border-slate-200 flex flex-col overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="bg-slate-900 text-white px-5 py-4 flex items-start justify-between gap-3 shrink-0">
          <div className="min-w-0 space-y-1">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="px-2 py-0.5 rounded-sm bg-orange-600 text-[10.5px] font-extrabold">
                법적 효력 위계 검증
              </span>
              <span className="text-[11px] text-slate-300 font-semibold">
                {legalRef ? `매칭 공종: ${legalRef.matchedGroupKey}` : primaryCase.work_type}
              </span>
            </div>
            <h2 className="text-[15px] font-extrabold tracking-tight leading-snug keep-all">
              관련 최신 법령 · 코샤가이드 · 공단 교육미디어
            </h2>
            <p className="text-[11px] text-slate-300 truncate">
              현재 사례: {primaryCase.title} (기인물: {primaryCase.equipment})
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="참고 서랍 닫기"
            className="p-1.5 rounded-md text-slate-300 hover:text-white hover:bg-slate-800 cursor-pointer shrink-0"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Fixed 3-Tier Legal Hierarchy Notice */}
        <div className="bg-amber-50 border-b border-amber-200 px-5 py-2.5 text-[11.2px] text-amber-950 font-semibold leading-snug keep-all shrink-0 flex items-start gap-2">
          <ShieldAlert className="w-4 h-4 text-amber-700 shrink-0 mt-0.5" />
          <span>
            {legalRef?.hierarchyNotice ||
              '※ 기술지원규정(KOSHA GUIDE) 및 고시는 참고 기준이며, 기준 상충 시 반드시 최신 산업안전보건기준에 관한 규칙이 우선 적용됩니다.'}
          </span>
        </div>

        {/* Tabs */}
        <div className="grid grid-cols-3 border-b border-slate-200 bg-slate-50 px-3 pt-2 gap-1 shrink-0">
          <button
            type="button"
            onClick={() => setActiveTab('laws')}
            className={`flex items-center justify-center gap-1.5 py-2 px-2 rounded-t-lg text-[12px] font-bold transition-colors cursor-pointer ${
              activeTab === 'laws'
                ? 'bg-white text-slate-950 border border-b-0 border-slate-200'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Scale className="w-3.5 h-3.5 shrink-0" />
            <span>최신 법령 조문</span>
            <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-slate-200 text-slate-800 tabular-nums">
              {legalRef?.laws.length ?? 0}
            </span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('guides')}
            className={`flex items-center justify-center gap-1.5 py-2 px-2 rounded-t-lg text-[12px] font-bold transition-colors cursor-pointer ${
              activeTab === 'guides'
                ? 'bg-white text-slate-950 border border-b-0 border-slate-200'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <BookOpen className="w-3.5 h-3.5 shrink-0" />
            <span>코샤가이드</span>
            <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-slate-200 text-slate-800 tabular-nums">
              {legalRef?.guides.length ?? 0}
            </span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('media')}
            className={`flex items-center justify-center gap-1.5 py-2 px-2 rounded-t-lg text-[12px] font-bold transition-colors cursor-pointer ${
              activeTab === 'media'
                ? 'bg-white text-slate-950 border border-b-0 border-slate-200'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <PlayCircle className="w-3.5 h-3.5 shrink-0" />
            <span>공단 영상·OPS</span>
            <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-slate-200 text-slate-800 tabular-nums">
              {(legalRef?.qrMedia.length ?? 0) + (legalRef?.auxMedia.length ?? 0)}
            </span>
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-5 space-y-4">
          {!legalRef ? (
            <div className="rounded-lg border border-dashed border-slate-300 p-8 text-center text-[13px] text-slate-500 space-y-1">
              <p className="font-bold text-slate-700">법령·지침 참고 데이터를 불러오는 중입니다.</p>
              <p className="text-[11.5px]">오프라인 상태이거나 데이터 파일이 아직 로드되지 않았습니다.</p>
            </div>
          ) : activeTab === 'laws' ? (
            <div className="space-y-4">
              {/* Sync & Law Portal Header */}
              <div className="rounded-lg border border-slate-200 bg-slate-50 px-3.5 py-2.5 flex flex-wrap items-center justify-between gap-2 text-[11.2px]">
                <div className="flex items-center gap-2 flex-wrap text-slate-700 tabular-nums">
                  <span className="font-bold text-slate-900">1순위 강제 법규</span>
                  <span className="text-slate-300">·</span>
                  <span>공단 API 동기화 기준일: {legalRef.syncedAt}</span>
                </div>
                <a
                  href={legalRef.lawPortalUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md bg-slate-900 hover:bg-slate-800 text-white text-[11px] font-bold transition-colors"
                >
                  <span>국가법령정보센터(law.go.kr) 최신 확인</span>
                  <ExternalLink className="w-3 h-3" />
                </a>
              </div>

              {/* Tier 1: Mandatory Rules (cat 4) */}
              {legalRef.laws.map((law) => (
                <article
                  key={law.id}
                  className="rounded-lg border border-slate-300 bg-white overflow-hidden"
                >
                  <div className="bg-slate-900 text-white px-4 py-2.5 flex items-center justify-between gap-2 flex-wrap">
                    <div className="flex items-center gap-2 min-w-0">
                      <span className="px-1.5 py-0.5 rounded-sm bg-orange-600 text-[10px] font-extrabold shrink-0">
                        1순위 · {law.tier_label}
                      </span>
                      <h3 className="text-[13px] font-extrabold truncate">
                        {law.law_name} {law.title}
                      </h3>
                    </div>
                    {law.latest_amended_date && (
                      <span className="px-2 py-0.5 rounded bg-white/15 text-[10.5px] font-bold tabular-nums shrink-0">
                        최근 개정/신설 {law.latest_amended_date}
                      </span>
                    )}
                  </div>
                  <div className="p-4 text-[12px] text-slate-800 leading-relaxed whitespace-pre-line keep-all">
                    {law.content}
                  </div>
                </article>
              ))}

              {/* Blocked Conflict Notices Transparency Box */}
              {legalRef.blockedConflicts.length > 0 && (
                <div className="rounded-lg border border-red-200 bg-red-50/75 p-3.5 space-y-1.5 keep-all">
                  <div className="flex items-center gap-1.5 text-[11.5px] font-extrabold text-red-900">
                    <AlertTriangle className="w-4 h-4 text-red-700 shrink-0" />
                    <span>구버전 기준 충돌 고시 자동 차단됨 ({legalRef.blockedConflicts.length}건)</span>
                  </div>
                  {legalRef.blockedConflicts.map((blk, idx) => (
                    <div key={idx} className="text-[11.2px] text-red-900/90 leading-snug">
                      <p className="font-bold">• 차단 대상: {blk.title}</p>
                      <p className="text-red-800 mt-0.5">{blk.reason}</p>
                    </div>
                  ))}
                </div>
              )}

              {/* Tier 2: Non-conflicting Ministry Notices (cat 5) */}
              {legalRef.notices.length > 0 && (
                <div className="space-y-2.5 pt-2 border-t border-slate-200">
                  <span className="block text-[11.5px] font-extrabold text-slate-700">
                    2순위 · 고용노동부 고시 / 표준안전작업지침 (참고)
                  </span>
                  {legalRef.notices.map((notice) => (
                    <article
                      key={notice.id}
                      className="rounded-lg border border-slate-200 bg-slate-50/70 p-3.5 space-y-1.5"
                    >
                      <div className="flex items-center justify-between gap-2">
                        <h4 className="text-[12.2px] font-bold text-slate-900 keep-all">
                          {notice.title}
                        </h4>
                        <span className="px-1.5 py-0.5 rounded bg-slate-200 text-slate-700 text-[9.8px] font-bold shrink-0">
                          2순위 고시
                        </span>
                      </div>
                      <p className="text-[11.4px] text-slate-700 leading-relaxed whitespace-pre-line keep-all">
                        {notice.content}
                      </p>
                    </article>
                  ))}
                </div>
              )}
            </div>
          ) : activeTab === 'guides' ? (
            <div className="space-y-3">
              <div className="rounded-lg border border-slate-200 bg-slate-50 px-3.5 py-2 text-[11.2px] text-slate-700 keep-all">
                <strong className="text-slate-900">3순위 자율 권고 지침 (KOSHA GUIDE)</strong> — 공단 기술지원규정 원문 PDF를 인증 없이 바로 내려받을 수 있습니다.
              </div>

              {legalRef.guides.length === 0 ? (
                <div className="rounded-lg border border-dashed border-slate-300 p-6 text-center text-[12px] text-slate-500">
                  이 공종과 직접 매칭된 기술지원규정이 없습니다.
                </div>
              ) : (
                legalRef.guides.map((g) => (
                  <div
                    key={g.no}
                    className={`rounded-lg border p-4 space-y-2.5 keep-all ${
                      g.staleness_level === 'critical'
                        ? 'border-red-300 bg-red-50/40'
                        : 'border-slate-200 bg-white'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0 space-y-1">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <span className="px-2 py-0.5 rounded-sm bg-slate-800 text-white text-[10.5px] font-extrabold tabular-nums">
                            KOSHA GUIDE {g.no}
                          </span>
                          <span className="text-[10.8px] font-semibold text-slate-500 tabular-nums">
                            공표일 {g.published_date || '미기재'}
                          </span>
                          {g.staleness_level === 'none' && (
                            <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded bg-emerald-50 border border-emerald-200 text-emerald-800 text-[10px] font-bold">
                              <CheckCircle2 className="w-3 h-3" />
                              <span>최신 공표</span>
                            </span>
                          )}
                        </div>
                        <h4 className="text-[13px] font-extrabold text-slate-950 leading-snug">
                          {g.name}
                        </h4>
                      </div>

                      {g.download_url && (
                        <a
                          href={g.download_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-slate-900 hover:bg-slate-800 text-white text-[11.2px] font-bold shrink-0 transition-colors"
                        >
                          <Download className="w-3.5 h-3.5" />
                          <span>PDF 원문</span>
                        </a>
                      )}
                    </div>

                    {g.staleness_level === 'critical' && g.staleness_note && (
                      <div className="rounded-md border border-red-300 bg-red-100/80 px-3 py-2 text-[11.2px] text-red-950 font-semibold leading-snug flex items-start gap-2">
                        <AlertTriangle className="w-4 h-4 text-red-700 shrink-0 mt-0.5" />
                        <div>
                          <span className="block font-extrabold text-red-900 mb-0.5">
                            [필수 확인 · 최신 규칙 개정 우선]
                          </span>
                          <span>{g.staleness_note}</span>
                        </div>
                      </div>
                    )}

                    {g.staleness_level === 'info' && g.staleness_note && (
                      <div className="rounded-md border border-amber-200 bg-amber-50 px-3 py-1.5 text-[11px] text-amber-900 font-semibold flex items-center gap-1.5">
                        <Info className="w-3.5 h-3.5 text-amber-700 shrink-0" />
                        <span>{g.staleness_note}</span>
                      </div>
                    )}
                  </div>
                ))
              )}
            </div>
          ) : (
            <div className="space-y-4">
              <div className="space-y-2.5">
                <div className="flex items-center justify-between">
                  <h4 className="text-[12.5px] font-extrabold text-slate-900">
                    모바일 현장 시청용 공단 공식 자료 (동영상 · OPS · 포스터 · 리플릿)
                  </h4>
                  <span className="text-[10.5px] text-slate-500">2면 별지 QR 연결 대상</span>
                </div>

                {legalRef.qrMedia.length === 0 ? (
                  <div className="rounded-lg border border-dashed border-slate-300 p-5 text-center text-[12px] text-slate-500">
                    연결된 공단 공식 미디어가 없습니다.
                  </div>
                ) : (
                  <div className="space-y-2">
                    {legalRef.qrMedia.map((m) => (
                      <a
                        key={m.url}
                        href={m.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center justify-between gap-3 rounded-lg border border-slate-200 bg-white hover:border-slate-400 hover:bg-slate-50 p-3 transition-colors"
                      >
                        <div className="min-w-0 space-y-0.5">
                          <span className="inline-block px-1.5 py-0.5 rounded-sm bg-orange-100 text-orange-900 text-[10px] font-extrabold">
                            {m.media_style}
                          </span>
                          <p className="text-[12.5px] font-bold text-slate-900 leading-snug keep-all">
                            {m.title}
                          </p>
                        </div>
                        <ExternalLink className="w-4 h-4 text-slate-500 shrink-0" />
                      </a>
                    ))}
                  </div>
                )}
              </div>

              {legalRef.auxMedia.length > 0 && (
                <div className="space-y-2 pt-3 border-t border-slate-200">
                  <h4 className="text-[12px] font-extrabold text-slate-700">
                    관리감독자·강사용 보조 교육자료 (교안 PPT · 책자)
                  </h4>
                  <div className="space-y-1.5">
                    {legalRef.auxMedia.map((m) => (
                      <a
                        key={m.url}
                        href={m.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center justify-between gap-3 rounded-lg border border-slate-200 bg-slate-50 hover:bg-slate-100 px-3 py-2.5 transition-colors"
                      >
                        <div className="flex items-center gap-2 min-w-0">
                          <FileText className="w-3.5 h-3.5 text-slate-600 shrink-0" />
                          <span className="px-1.5 py-0.5 rounded bg-slate-200 text-slate-700 text-[9.8px] font-bold shrink-0">
                            {m.media_style}
                          </span>
                          <span className="text-[12px] font-semibold text-slate-800 truncate">
                            {m.title}
                          </span>
                        </div>
                        <ExternalLink className="w-3.5 h-3.5 text-slate-500 shrink-0" />
                      </a>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
