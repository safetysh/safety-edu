import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  Scale,
  BookOpen,
  QrCode,
  AlertTriangle,
  Info,
  ShieldAlert,
  Copy,
  Image as ImageIcon,
  Loader2,
  ExternalLink,
} from 'lucide-react';
import {
  CustomSiteInfo,
  GeneratedMaterial,
  ResolvedLegalReference,
} from '../types/safety';
import { generateLocalQrDataUrl } from '../utils/qrLocal';
import { copyNodeAsPngToClipboard, downloadNodeAsPng } from '../utils/exportImage';

interface OpsReferenceSheetViewProps {
  material: GeneratedMaterial;
  siteInfo: CustomSiteInfo;
  legalRef: ResolvedLegalReference | null;
  isPrintClone?: boolean;
  onNotify?: (type: 'success' | 'error', message: string) => void;
}

/**
 * Fits verbatim legal rule text cleanly onto A4 Page 2 without altering legal wording.
 * Applies sentence/clause-boundary excerpting only when text exceeds the available budget.
 */
function fitLegalTextForPage2(rawText: string, maxChars: number): {
  text: string;
  isExcerpted: boolean;
} {
  const clean = (rawText || '').trim();
  if (clean.length <= maxChars) {
    return { text: clean, isExcerpted: false };
  }

  // Prefer cutting cleanly at paragraph/line boundary first
  const lines = clean.split('\n');
  const picked: string[] = [];
  let acc = 0;
  for (let i = 0; i < lines.length; i++) {
    const ln = lines[i];
    if (acc + ln.length + 1 <= maxChars) {
      picked.push(ln);
      acc += ln.length + 1;
    } else if (picked.length === 0) {
      // Single long line fallback: break at last period before maxChars
      const slice = ln.slice(0, maxChars);
      const lastPeriod = Math.max(slice.lastIndexOf('.'), slice.lastIndexOf('다.'));
      picked.push(lastPeriod > maxChars * 0.45 ? slice.slice(0, lastPeriod + 1) : slice);
      break;
    } else {
      break;
    }
  }
  return { text: picked.join('\n'), isExcerpted: true };
}

export const OpsReferenceSheetView: React.FC<OpsReferenceSheetViewProps> = React.memo(
  ({ material, siteInfo, legalRef, isPrintClone = false, onNotify }) => {
    const appendixRef = useRef<HTMLDivElement | null>(null);
    const [qrMap, setQrMap] = useState<Record<string, string>>({});
    const [isExportingPng, setIsExportingPng] = useState(false);
    const [isCopying, setIsCopying] = useState(false);

    const { primaryCase: c } = material;
    const inkSaver = Boolean(siteInfo.inkSaverMode);
    const sections = siteInfo.appendixSections;
    const showLaws = Boolean(sections?.laws);
    const showGuides = Boolean(sections?.guides);
    const showMediaQr = Boolean(sections?.mediaQr);

    const visibleQrItems = useMemo(
      () => (legalRef?.qrMedia ?? []).slice(0, 4),
      [legalRef?.qrMedia]
    );

    useEffect(() => {
      if (!showMediaQr || visibleQrItems.length === 0) return;
      let cancelled = false;
      Promise.all(
        visibleQrItems.map(async (item) => {
          const dataUrl = await generateLocalQrDataUrl(item.url);
          return [item.url, dataUrl] as const;
        })
      ).then((entries) => {
        if (cancelled) return;
        const next: Record<string, string> = {};
        for (const [u, data] of entries) {
          if (data) next[u] = data;
        }
        setQrMap(next);
      });
      return () => {
        cancelled = true;
      };
    }, [showMediaQr, visibleQrItems]);

    if (!legalRef) return null;

    const dateLabel = siteInfo.educationDate || new Date().toISOString().slice(0, 10);
    const siteLabel = siteInfo.siteName.trim() || '________________';

    // Allocate verbatim legal text budget dynamically based on which Page 2 sections are enabled
    const activeSectionCount =
      (showLaws ? 1 : 0) + (showGuides ? 1 : 0) + (showMediaQr ? 1 : 0);
    const lawsToRender = legalRef.laws.slice(0, activeSectionCount === 1 ? 3 : 2);
    const perLawBudget =
      activeSectionCount === 1
        ? 1100
        : activeSectionCount === 2
          ? 760
          : lawsToRender.length >= 2
            ? 430
            : 820;

    const handleExportAppendixPng = async () => {
      if (!appendixRef.current || isExportingPng) return;
      setIsExportingPng(true);
      try {
        const fileName = await downloadNodeAsPng(
          appendixRef.current,
          `안전교육OPS_2면참고별지_${material.selectedWorkType}`,
          dateLabel,
          1600
        );
        onNotify?.('success', `2면 참고 별지 PNG 저장 완료: ${fileName}`);
      } catch {
        onNotify?.('error', '2면 참고 별지 PNG 저장 중 오류가 발생했습니다.');
      } finally {
        setIsExportingPng(false);
      }
    };

    const handleCopyAppendixImage = async () => {
      if (!appendixRef.current || isCopying) return;
      setIsCopying(true);
      try {
        const res = await copyNodeAsPngToClipboard(appendixRef.current, 1600);
        if (res === 'copied') {
          onNotify?.(
            'success',
            '2면 참고 별지 이미지가 클립보드에 복사되었습니다. 단톡방에 Ctrl+V 하세요.'
          );
        } else {
          onNotify?.(
            'error',
            '이 브라우저는 클립보드 이미지 복사를 지원하지 않습니다. 별지 PNG 저장을 이용해 주세요.'
          );
        }
      } catch {
        onNotify?.('error', '별지 이미지 복사 중 오류가 발생했습니다.');
      } finally {
        setIsCopying(false);
      }
    };

    return (
      <div className={isPrintClone ? 'ops-appendix-print-wrap' : 'w-[794px] space-y-2'}>
        {/* Screen-only Action Bar for Page 2 Appendix (hidden in print & PNG capture) */}
        {!isPrintClone && (
          <div
            data-export-hide="true"
            className="no-print flex items-center justify-between gap-2 px-1"
          >
            <div className="flex items-center gap-2 text-[11.5px] font-bold text-slate-700">
              <span className="px-2 py-0.5 rounded bg-slate-900 text-white text-[10px] font-extrabold">
                A4 2면 별지
              </span>
              <span>관련 최신 법령 · 코샤가이드 · 공단 교육미디어 QR</span>
            </div>
            <div className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={handleCopyAppendixImage}
                disabled={isCopying}
                className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md bg-emerald-700 hover:bg-emerald-600 disabled:opacity-60 text-white text-[11px] font-bold transition-colors cursor-pointer"
              >
                {isCopying ? (
                  <Loader2 className="w-3 h-3 animate-spin" />
                ) : (
                  <Copy className="w-3 h-3" />
                )}
                <span>별지 이미지 복사</span>
              </button>
              <button
                type="button"
                onClick={handleExportAppendixPng}
                disabled={isExportingPng}
                className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md bg-slate-800 hover:bg-slate-700 disabled:opacity-60 text-white text-[11px] font-semibold transition-colors cursor-pointer"
              >
                {isExportingPng ? (
                  <Loader2 className="w-3 h-3 animate-spin" />
                ) : (
                  <ImageIcon className="w-3 h-3" />
                )}
                <span>별지 PNG 저장</span>
              </button>
            </div>
          </div>
        )}

        {/* A4 210mm x 297mm Reference Appendix Sheet */}
        <div
          ref={appendixRef}
          className={`ops-print-page ops-appendix-page bg-white text-slate-900 border border-slate-300 flex flex-col justify-between overflow-hidden ${
            isPrintClone ? 'w-[210mm] h-[297mm]' : 'w-[794px] h-[1123px] ops-sheet-shadow'
          }`}
        >
          {/* Top Header */}
          <div className="shrink-0">
            <div
              className={`px-6 py-3 flex items-center justify-between gap-3 ${
                inkSaver
                  ? 'bg-white text-slate-950 border-b-2 border-slate-950'
                  : 'bg-slate-900 text-white'
              }`}
            >
              <div className="min-w-0 space-y-0.5">
                <div className="flex items-center gap-1.5 text-[10px] font-bold">
                  <span
                    className={`px-1.5 py-0.5 rounded-sm ${
                      inkSaver
                        ? 'border border-slate-900 text-slate-950'
                        : 'bg-orange-600 text-white'
                    }`}
                  >
                    참고 별지 (2/2면)
                  </span>
                  <span className={inkSaver ? 'text-slate-700' : 'text-slate-300'}>
                    {material.selectedIndustry} · {legalRef.matchedGroupKey}
                  </span>
                </div>
                <h2 className="text-[14.5px] font-extrabold tracking-tight leading-snug truncate keep-all">
                  관련 최신 법령 · 기술지원규정(KOSHA GUIDE) · 현장 교육미디어
                </h2>
              </div>
              <div className="text-right shrink-0 text-[9.8px] tabular-nums leading-tight">
                <p className={inkSaver ? 'font-bold text-slate-900' : 'font-semibold text-slate-200'}>
                  공단 API 동기화: {legalRef.syncedAt}
                </p>
                <p className={inkSaver ? 'text-slate-700' : 'text-slate-400'}>
                  연계 사례: {c.id}
                </p>
              </div>
            </div>

            {/* Fixed Legal Hierarchy Warning Banner */}
            <div
              className={`px-6 py-1.5 text-[10px] font-bold flex items-center gap-1.5 border-b keep-all ${
                inkSaver
                  ? 'bg-white text-slate-950 border-slate-900'
                  : 'bg-amber-50 text-amber-950 border-amber-200'
              }`}
            >
              <ShieldAlert className="w-3.5 h-3.5 shrink-0" />
              <span>{legalRef.hierarchyNotice}</span>
            </div>
          </div>

          {/* Dynamic Checked Sections Body */}
          <div className="flex-1 px-6 py-3 flex flex-col justify-between gap-2.5 overflow-hidden">
            {activeSectionCount === 0 && (
              <div className="flex-1 flex items-center justify-center text-[12px] text-slate-500 border border-dashed border-slate-300 rounded-md">
                좌측 ‘2면 참고 별지 출력’ 하위 체크박스에서 출력할 항목을 1개 이상 선택해 주세요.
              </div>
            )}

            {/* SECTION A: Tier 1 Mandatory Legal Rules (cat 4) */}
            {showLaws && (
              <section className="space-y-1.5 min-h-0">
                <div className="flex items-center justify-between border-b border-slate-300 pb-1 gap-2">
                  <div className="flex items-center gap-1.5">
                    <Scale className="w-3.5 h-3.5 text-slate-900 shrink-0" />
                    <h3 className="text-[12.2px] font-extrabold text-slate-950">
                      A. 최신 강제 법령 핵심 조문 (1순위 · 산업안전보건기준에 관한 규칙)
                    </h3>
                  </div>
                  <span className="text-[9.5px] font-semibold text-slate-600 tabular-nums shrink-0">
                    최신 조문 확인: law.go.kr
                  </span>
                </div>

                <div className="space-y-1.5">
                  {lawsToRender.map((law) => {
                    const fitted = fitLegalTextForPage2(law.content, perLawBudget);
                    return (
                      <div
                        key={law.id}
                        className={`rounded-md border p-2.5 space-y-1 ${
                          inkSaver
                            ? 'border-slate-900 bg-white'
                            : 'border-slate-300 bg-slate-50/70'
                        }`}
                      >
                        <div className="flex items-center justify-between gap-2">
                          <div className="flex items-center gap-1.5 min-w-0">
                            <span
                              className={`px-1.5 py-0.5 rounded-sm text-[9px] font-extrabold shrink-0 ${
                                inkSaver
                                  ? 'border border-slate-900 text-slate-950 bg-white'
                                  : 'bg-slate-900 text-white'
                              }`}
                            >
                              강제 법규
                            </span>
                            <span className="text-[11px] font-extrabold text-slate-950 truncate">
                              {law.law_name} {law.title}
                            </span>
                          </div>
                          <div className="flex items-center gap-1.5 shrink-0 tabular-nums">
                            {law.latest_amended_date && (
                              <span
                                className={`px-1.5 py-0.5 rounded text-[9px] font-bold ${
                                  inkSaver
                                    ? 'border border-slate-700 text-slate-900'
                                    : 'bg-orange-100 text-orange-950'
                                }`}
                              >
                                개정/신설 {law.latest_amended_date}
                              </span>
                            )}
                            {fitted.isExcerpted && (
                              <span className="text-[8.8px] font-bold text-slate-600">
                                [핵심 항 발췌]
                              </span>
                            )}
                          </div>
                        </div>

                        <p
                          className={`text-slate-900 whitespace-pre-line keep-all leading-[1.42] ${
                            activeSectionCount === 3 ? 'text-[9.2px]' : 'text-[9.8px]'
                          }`}
                        >
                          {fitted.text}
                        </p>
                      </div>
                    );
                  })}

                  {legalRef.blockedConflicts.length > 0 && (
                    <div
                      className={`rounded border px-2.5 py-1 text-[9.2px] font-semibold flex items-center gap-1.5 keep-all ${
                        inkSaver
                          ? 'border-slate-800 bg-white text-slate-950'
                          : 'border-red-200 bg-red-50/70 text-red-900'
                      }`}
                    >
                      <AlertTriangle className="w-3 h-3 shrink-0" />
                      <span>
                        기준 충돌 구버전 고시 자동 제외: {legalRef.blockedConflicts[0].title} → 최신 안전보건규칙 기준 단일 적용
                      </span>
                    </div>
                  )}
                </div>
              </section>
            )}

            {/* SECTION B: Tier 3 Voluntary KOSHA GUIDE */}
            {showGuides && (
              <section className="space-y-1.5 shrink-0">
                <div className="flex items-center justify-between border-b border-slate-300 pb-1 gap-2">
                  <div className="flex items-center gap-1.5">
                    <BookOpen className="w-3.5 h-3.5 text-slate-900 shrink-0" />
                    <h3 className="text-[12.2px] font-extrabold text-slate-950">
                      B. 관련 기술지원규정 (3순위 · KOSHA GUIDE 자율 권고)
                    </h3>
                  </div>
                  <span className="text-[9.3px] font-medium text-slate-600">
                    원문 PDF는 웹 ‘법령·지침·영상 참고’에서 다운로드
                  </span>
                </div>

                {legalRef.guides.length === 0 ? (
                  <p className="text-[10px] text-slate-500 py-1">
                    해당 공종에 매칭된 KOSHA GUIDE가 없습니다.
                  </p>
                ) : (
                  <div className="space-y-1.5">
                    {legalRef.guides.slice(0, 3).map((g) => (
                      <div
                        key={g.no}
                        className={`rounded-md border px-3 py-2 keep-all space-y-1 ${
                          inkSaver
                            ? 'border-slate-800 bg-white'
                            : g.staleness_level === 'critical'
                              ? 'border-red-300 bg-red-50/50'
                              : 'border-slate-200 bg-white'
                        }`}
                      >
                        <div className="flex items-center justify-between gap-2">
                          <div className="flex items-center gap-1.5 min-w-0">
                            <span
                              className={`px-1.5 py-0.5 rounded-sm text-[9.2px] font-extrabold tabular-nums shrink-0 border ${
                                inkSaver
                                  ? 'border-slate-900 text-slate-950 bg-white'
                                  : 'border-slate-400 bg-slate-100 text-slate-900'
                              }`}
                            >
                              KOSHA GUIDE {g.no}
                            </span>
                            <span className="text-[10.4px] font-bold text-slate-950 truncate">
                              {g.name}
                            </span>
                          </div>
                          <span className="text-[9.4px] font-semibold text-slate-600 tabular-nums shrink-0">
                            공표 {g.published_date || '-'}
                          </span>
                        </div>

                        {g.staleness_level === 'critical' && g.staleness_note && (
                          <div
                            className={`text-[9.2px] font-bold flex items-start gap-1 leading-snug ${
                              inkSaver ? 'text-slate-950' : 'text-red-900'
                            }`}
                          >
                            <AlertTriangle className="w-3 h-3 shrink-0 mt-0.5" />
                            <span>[개정 법령 우선 확인] {g.staleness_note}</span>
                          </div>
                        )}

                        {g.staleness_level === 'info' && g.staleness_note && (
                          <div className="text-[9.1px] font-semibold text-slate-700 flex items-center gap-1">
                            <Info className="w-3 h-3 shrink-0" />
                            <span>{g.staleness_note}</span>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </section>
            )}

            {/* SECTION C: Mobile-ready Official KOSHA Media QR Cards */}
            {showMediaQr && (
              <section className="space-y-1.5 shrink-0">
                <div className="flex items-center justify-between border-b border-slate-300 pb-1 gap-2">
                  <div className="flex items-center gap-1.5">
                    <QrCode className="w-3.5 h-3.5 text-slate-900 shrink-0" />
                    <h3 className="text-[12.2px] font-extrabold text-slate-950">
                      C. 근로자 현장 시청용 공단 공식 교육미디어 QR
                    </h3>
                  </div>
                  <span className="text-[9.3px] font-medium text-slate-600">
                    스마트폰 카메라 스캔 → 공단 포털 즉시 열람
                  </span>
                </div>

                {visibleQrItems.length === 0 ? (
                  <p className="text-[10px] text-slate-500 py-1">
                    연결된 공단 공식 미디어 자료가 없습니다.
                  </p>
                ) : (
                  <div
                    className={`grid gap-2 ${
                      visibleQrItems.length <= 2
                        ? 'grid-cols-2'
                        : visibleQrItems.length === 3
                          ? 'grid-cols-3'
                          : 'grid-cols-4'
                    }`}
                  >
                    {visibleQrItems.map((m) => (
                      <div
                        key={m.url}
                        className={`rounded-md border p-2 flex flex-col items-center text-center justify-between gap-1.5 keep-all ${
                          inkSaver
                            ? 'border-slate-900 bg-white'
                            : 'border-slate-300 bg-slate-50/50'
                        }`}
                      >
                        <span
                          className={`px-1.5 py-0.5 rounded-sm text-[9px] font-extrabold ${
                            inkSaver
                              ? 'border border-slate-900 text-slate-950 bg-white'
                              : 'bg-slate-900 text-white'
                          }`}
                        >
                          공단 {m.media_style}
                        </span>

                        {/* Print-grade QR: Pure black #000 on #FFF, ~19mm (74px) + 2mm quiet zone */}
                        <div className="bg-white p-[6px] rounded border border-slate-300 flex items-center justify-center">
                          {qrMap[m.url] ? (
                            <img
                              src={qrMap[m.url]}
                              alt={`${m.title} QR코드`}
                              className="w-[74px] h-[74px] block"
                            />
                          ) : (
                            <div className="w-[74px] h-[74px] flex items-center justify-center text-[9px] text-slate-400">
                              QR 생성 중
                            </div>
                          )}
                        </div>

                        <p className="text-[9.3px] font-bold text-slate-950 leading-tight line-clamp-2 min-h-[24px]">
                          {m.title}
                        </p>

                        <a
                          href={m.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          data-export-hide="true"
                          className="no-print inline-flex items-center gap-0.5 text-[8.8px] font-bold text-orange-700 hover:underline"
                        >
                          <span>바로 열기</span>
                          <ExternalLink className="w-2.5 h-2.5" />
                        </a>
                      </div>
                    ))}
                  </div>
                )}
              </section>
            )}
          </div>

          {/* Bottom Footer */}
          <footer className="shrink-0 border-t border-slate-300 px-6 py-2 bg-slate-50 flex items-center justify-between gap-3 text-[9.5px] text-slate-600 tabular-nums">
            <div className="flex items-center gap-2 min-w-0">
              {siteInfo.logoDataUrl && (
                <img
                  src={siteInfo.logoDataUrl}
                  alt="회사/현장 로고"
                  className="h-4 max-w-[78px] object-contain shrink-0 bg-white px-1 py-0.5 rounded-sm border border-slate-300"
                />
              )}
              <span className="truncate">
                현장: {siteLabel} · 교육일자: {dateLabel} · 출처: 한국산업안전보건공단 안전보건법령·기술지원규정·안전보건자료실
              </span>
            </div>
            <span className="font-bold text-slate-800 shrink-0">참고 별지 2 / 2 (A4)</span>
          </footer>
        </div>
      </div>
    );
  }
);
