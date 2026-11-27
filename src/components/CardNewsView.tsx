import React, { useRef, useState } from 'react';
import { Archive, Copy, Download, Loader2, AlertTriangle, CloudAlert, Lock, FileText } from 'lucide-react';
import {
  CustomSiteInfo,
  GeneratedMaterial,
  ResolvedLegalReference,
} from '../types/safety';
import { HazardPictogram } from './SafetyVisuals';
import {
  getCaseTranslations,
  getForeignLanguageNativeLabel,
  getSeasonalTranslation,
} from '../data/multilingualDict';
import { SEASONAL_RISKS } from '../data/seasonalRisks';
import {
  CapturedPngAsset,
  captureNodeAsPngResult,
  copyNodeAsPngToClipboard,
  downloadCardNewsZip,
  downloadNodeAsPng,
  isInAppBrowser,
  isIosDevice,
  triggerBlobDownload,
} from '../utils/exportImage';
import {
  fitFactualOverviewForA4,
  formatSourceHeaderBadge,
  getCaseOverviewVerbatim,
  getMeasuresSourceCaption,
  getSourceBrandStyle,
  getTbmSourceCaption,
  isOfficialKoshaApiCase,
} from '../utils/textFit';

interface CardNewsViewProps {
  material: GeneratedMaterial;
  siteInfo: CustomSiteInfo;
  legalRef?: ResolvedLegalReference | null;
  isMobileViewport?: boolean;
  onNotify: (type: 'success' | 'error', message: string) => void;
  onOpenImageFallback?: (asset: CapturedPngAsset, label: string, autoDownloaded?: boolean) => void;
}

const CARD_SLUGS = [
  { index: 0, label: '카드 1 · 표지·구호', slug: '표지_구호' },
  { index: 1, label: '카드 2 · 재해개요·원인', slug: '사고요약_원인' },
  { index: 2, label: '카드 3 · 관행X vs 원칙O', slug: 'XO비교' },
  { index: 3, label: '카드 4 · 5분 TBM 체크', slug: '5분TBM체크' },
];

export const CardNewsView: React.FC<CardNewsViewProps> = ({
  material,
  siteInfo,
  legalRef = null,
  isMobileViewport = false,
  onNotify,
  onOpenImageFallback,
}) => {
  const cardRefs = useRef<Array<HTMLDivElement | null>>([null, null, null, null]);
  const [exportingZip, setExportingZip] = useState(false);
  const [exportingIndex, setExportingIndex] = useState<number | null>(null);
  const [copyingIndex, setCopyingIndex] = useState<number | null>(null);

  const { primaryCase: c, theme, isExactMatch } = material;
  const inkSaver = Boolean(siteInfo.inkSaverMode);
  const sourceBrand = getSourceBrandStyle(c);
  const sourceBadgeLabel = formatSourceHeaderBadge(c);
  const accentHex = inkSaver
    ? '#0F172A'
    : c.source_type === 'FATALITY' || c.source_type === 'SIF'
      ? sourceBrand.primaryHex
      : theme.primaryHex;

  const translations = getCaseTranslations(c, siteInfo.foreignLanguage);
  const langLabel = getForeignLanguageNativeLabel(siteInfo.foreignLanguage);
  const season = SEASONAL_RISKS[siteInfo.seasonRisk];
  const seasonTrans = getSeasonalTranslation(siteInfo.seasonRisk, siteInfo.foreignLanguage);

  const siteLabel = siteInfo.siteName.trim()
    ? `현장: ${siteInfo.siteName.trim()}`
    : '현장: ________________';
  const dateLabel = siteInfo.educationDate || new Date().toISOString().slice(0, 10);

  const isOfficialKosha = isOfficialKoshaApiCase(c);
  const overviewFit = fitFactualOverviewForA4(getCaseOverviewVerbatim(c), 1, false, 200);
  const measuresSourceTag = getMeasuresSourceCaption(
    c,
    Boolean(material.isMeasuresEdited || material.isCustomEdited)
  );
  const tbmSourceTag = getTbmSourceCaption(c, Boolean(material.isTbmEdited));

  const handleDownloadSingle = async (idx: number) => {
    const node = cardRefs.current[idx];
    if (!node || exportingIndex !== null) return;
    setExportingIndex(idx);
    try {
      const prefix = `카드뉴스0${idx + 1}_${CARD_SLUGS[idx].slug}_${material.selectedWorkType}`;
      if (isMobileViewport && onOpenImageFallback) {
        const asset = await captureNodeAsPngResult(node, prefix, dateLabel, 1080);
        const didDownload = !isIosDevice() && !isInAppBrowser();
        if (didDownload) {
          triggerBlobDownload(asset.blob, asset.fileName);
        }
        onOpenImageFallback(asset, `${CARD_SLUGS[idx].label} (1080×1080 PNG)`, didDownload);
        return;
      }
      const fileName = await downloadNodeAsPng(node, prefix, dateLabel, 1080);
      onNotify('success', `1080×1080 PNG 저장 완료: ${fileName}`);
    } catch {
      onNotify('error', '카드뉴스 PNG 저장 중 오류가 발생했습니다.');
    } finally {
      setExportingIndex(null);
    }
  };

  const handleCopySingle = async (idx: number) => {
    const node = cardRefs.current[idx];
    if (!node || copyingIndex !== null) return;
    setCopyingIndex(idx);
    try {
      const res = await copyNodeAsPngToClipboard(node, 1080);
      if (res === 'copied') {
        onNotify(
          'success',
          `카드 ${idx + 1}번 이미지가 클립보드에 복사되었습니다. 단톡방에 바로 붙여넣기(Ctrl+V) 하세요.`
        );
      } else {
        onNotify('error', '이 브라우저는 클립보드 이미지 복사를 지원하지 않습니다. PNG 저장을 이용해 주세요.');
      }
    } catch {
      onNotify('error', '클립보드 복사 중 오류가 발생했습니다. PNG 저장을 이용해 주세요.');
    } finally {
      setCopyingIndex(null);
    }
  };

  const handleDownloadZip = async () => {
    if (exportingZip) return;
    const validNodes = CARD_SLUGS.map((meta) => ({
      node: cardRefs.current[meta.index],
      slug: meta.slug,
    })).filter((entry): entry is { node: HTMLDivElement; slug: string } => entry.node !== null);

    if (validNodes.length !== 4) {
      onNotify('error', '4장의 카드를 모두 불러온 뒤 다시 시도해 주세요.');
      return;
    }

    setExportingZip(true);
    try {
      const fileName = await downloadCardNewsZip(
        validNodes,
        material.selectedWorkType,
        dateLabel
      );
      onNotify('success', `4컷 카드뉴스 ZIP 파일이 저장되었습니다: ${fileName}`);
    } catch {
      onNotify('error', '카드뉴스 ZIP 생성 중 오류가 발생했습니다.');
    } finally {
      setExportingZip(false);
    }
  };

  const renderCardFooter = (cardNo: number, dark = false) => (
    <div
      className={`shrink-0 px-5 py-2.5 flex items-center justify-between gap-2 text-[10.5px] border-t ${
        dark && !inkSaver
          ? 'bg-slate-950/60 border-slate-700/80 text-slate-300'
          : 'bg-slate-50 border-slate-200 text-slate-600'
      }`}
    >
      <div className="flex items-center gap-2 min-w-0">
        {siteInfo.logoDataUrl && (
          <img
            src={siteInfo.logoDataUrl}
            alt="현장 로고"
            className="h-5 max-w-[78px] object-contain shrink-0 bg-white/95 rounded-sm px-1 py-0.5"
          />
        )}
        <span className="font-semibold keep-all">{siteLabel}</span>
      </div>
      <span className="font-bold tabular-nums shrink-0">{cardNo} / 4</span>
    </div>
  );

  const renderCardActionButtons = (idx: number) => (
    <div className="flex items-center gap-2.5">
      <button
        type="button"
        onClick={() => handleCopySingle(idx)}
        disabled={copyingIndex !== null}
        className="inline-flex items-center gap-1 text-[11.5px] font-bold text-orange-700 hover:text-orange-900 disabled:opacity-50 cursor-pointer"
      >
        {copyingIndex === idx ? (
          <Loader2 className="w-3.5 h-3.5 animate-spin" />
        ) : (
          <Copy className="w-3.5 h-3.5" />
        )}
        <span>복사</span>
      </button>
      <button
        type="button"
        onClick={() => handleDownloadSingle(idx)}
        disabled={exportingIndex !== null}
        className="inline-flex items-center gap-1 text-[11.5px] font-semibold text-slate-700 hover:text-slate-950 disabled:opacity-50 cursor-pointer"
      >
        {exportingIndex === idx ? (
          <Loader2 className="w-3.5 h-3.5 animate-spin" />
        ) : (
          <Download className="w-3.5 h-3.5" />
        )}
        <span>PNG 저장</span>
      </button>
    </div>
  );

  return (
    <div className="w-full max-w-[980px] mx-auto space-y-5 pb-6">
      <div className="bg-white rounded-lg border border-slate-200 px-5 py-3.5 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-[14px] font-bold text-slate-900">
            단톡방·모바일 전파용 4컷 카드뉴스 (1:1 · 1080×1080px)
          </h2>
          <p className="text-[12px] text-slate-500 mt-0.5">
            카드별 ‘복사’를 누르면 카카오톡·밴드 대화창에 바로 붙여넣기(Ctrl+V)할 수 있습니다.
          </p>
        </div>

        <button
          type="button"
          onClick={handleDownloadZip}
          disabled={exportingZip}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-slate-900 hover:bg-slate-800 disabled:opacity-60 text-white text-[12.5px] font-bold transition-colors whitespace-nowrap shrink-0 cursor-pointer"
        >
          {exportingZip ? (
            <Loader2 className="w-4 h-4 animate-spin shrink-0" />
          ) : (
            <Archive className="w-4 h-4 shrink-0" />
          )}
          <span>{exportingZip ? 'ZIP 압축 중...' : '4장 한번에 ZIP 다운로드'}</span>
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 justify-items-center">
        {/* CARD 1 */}
        <div className="w-full max-w-[460px] space-y-2">
          <div className="flex items-center justify-between px-0.5">
            <span className="text-[12px] font-bold text-slate-700">{CARD_SLUGS[0].label}</span>
            {renderCardActionButtons(0)}
          </div>

          <div
            ref={(el) => {
              cardRefs.current[0] = el;
            }}
            className={`w-full aspect-square ops-sheet-shadow flex flex-col justify-between overflow-hidden border border-slate-300 keep-all ${
              inkSaver ? 'bg-white text-slate-950' : 'bg-slate-900 text-white'
            }`}
          >
            <div>
              <div className="h-2.5 w-full" style={{ backgroundColor: accentHex }} />
              {season.id !== 'always' && (
                <div
                  className="px-4 py-1.5 flex items-center gap-1.5 text-[10.5px] font-bold text-white"
                  style={{ backgroundColor: inkSaver ? '#0F172A' : season.badgeBgHex }}
                >
                  <CloudAlert className="w-3.5 h-3.5 shrink-0" />
                  <span>{season.badgeText}</span>
                </div>
              )}
            </div>

            <div className="flex-1 px-6 py-4 flex flex-col justify-between">
              <div className="flex items-start justify-between gap-3">
                <div className="space-y-1.5 min-w-0">
                  <div className="flex flex-wrap items-center gap-1.5 text-[10.5px] font-bold">
                    <span
                      className="px-2 py-0.5 rounded-sm text-white"
                      style={{ backgroundColor: accentHex }}
                    >
                      {sourceBadgeLabel}
                    </span>
                    <span className={inkSaver ? 'text-slate-700' : 'text-slate-300'}>
                      {material.selectedIndustry}
                    </span>
                  </div>
                  <p className={`text-[12px] font-semibold ${inkSaver ? 'text-slate-700' : 'text-slate-300'}`}>
                    {material.selectedWorkType}
                  </p>
                </div>
                <div className="shrink-0 bg-white rounded-md p-1.5 border border-slate-200">
                  <HazardPictogram hazardType={c.hazard_type} size={46} inkSaver={inkSaver} />
                </div>
              </div>

              <div className="space-y-2 my-auto py-2">
                {!isExactMatch && (
                  <div className="inline-flex items-center gap-1 text-[10.5px] font-bold text-amber-500">
                    <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
                    <span>유사 공정 기반 위험요인 분석</span>
                  </div>
                )}
                <h3 className="text-[20px] font-extrabold leading-snug tracking-tight [text-wrap:balance]">
                  {c.title}
                </h3>
                {season.id !== 'always' && (
                  <p className={`text-[11px] leading-snug ${inkSaver ? 'text-slate-700' : 'text-amber-200/95'}`}>
                    {season.extraRule}
                  </p>
                )}
              </div>

              <div
                className={`rounded-md px-4 py-3 border ${
                  inkSaver ? 'bg-slate-50 border-slate-900' : 'bg-slate-800'
                }`}
                style={inkSaver ? undefined : { borderColor: accentHex }}
              >
                <span
                  className={`block text-[10px] font-bold mb-0.5 ${
                    inkSaver ? 'text-slate-600' : 'text-amber-300'
                  }`}
                >
                  오늘의 현장 안전구호 {translations ? `· ${langLabel}` : ''}
                </span>
                <p className="text-[14px] font-extrabold leading-snug">“{c.worker_slogan}”</p>
                {translations && (
                  <p className={`text-[11px] font-semibold leading-snug mt-1 ${inkSaver ? 'text-slate-700' : 'text-amber-200'}`}>
                    {translations.slogan}
                  </p>
                )}
              </div>
            </div>

            {renderCardFooter(1, true)}
          </div>
        </div>

        {/* CARD 2 */}
        <div className="w-full max-w-[460px] space-y-2">
          <div className="flex items-center justify-between px-0.5">
            <span className="text-[12px] font-bold text-slate-700">{CARD_SLUGS[1].label}</span>
            {renderCardActionButtons(1)}
          </div>

          <div
            ref={(el) => {
              cardRefs.current[1] = el;
            }}
            className="w-full aspect-square ops-sheet-shadow bg-white text-slate-900 flex flex-col justify-between overflow-hidden border border-slate-300 keep-all"
          >
            <div>
              <div className="bg-slate-900 text-white px-5 py-3 flex items-center justify-between">
                <span className="text-[13.5px] font-extrabold">01. 재해개요 및 발생원인</span>
                <span
                  className={`inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-sm ${
                    isOfficialKosha ? 'bg-white/15 text-white' : 'bg-slate-700 text-slate-100'
                  }`}
                >
                  {isOfficialKosha ? (
                    <>
                      <Lock className="w-3 h-3" />
                      <span>공단 공식 원문</span>
                    </>
                  ) : (
                    <>
                      <FileText className="w-3 h-3" />
                      <span>표준 교육모델</span>
                    </>
                  )}
                </span>
              </div>
              <div className="h-1 w-full" style={{ backgroundColor: accentHex }} />
            </div>

            <div className="flex-1 px-5 py-3.5 flex flex-col justify-between gap-2.5 overflow-hidden">
              <div className="rounded-md border border-slate-200 bg-slate-50 p-3 space-y-1">
                <p className="text-[10.8px] font-bold text-slate-600">
                  기인물: {c.equipment}
                </p>
                <p className="text-[11.2px] text-slate-900 leading-snug font-medium">
                  {overviewFit.displayText}
                </p>
              </div>

              <div
                className="rounded-md border p-3 space-y-1.5"
                style={{
                  backgroundColor: inkSaver ? '#F8FAFC' : sourceBrand.softBgHex,
                  borderColor: inkSaver ? '#334155' : sourceBrand.borderHex,
                }}
              >
                <p className="text-[11.2px] font-extrabold" style={{ color: accentHex }}>
                  {c.source_type === 'SIF' ? 'SIF 재해유발요인 (원문)' : '핵심 사고 원인 (절대 주의)'}
                </p>
                {c.source_type === 'SIF' && c.hazard_factor ? (
                  <p className="text-[11.2px] font-semibold text-slate-900 leading-snug">
                    {c.hazard_factor}
                  </p>
                ) : (
                  c.direct_causes.map((cause, idx) => (
                    <div key={idx} className="flex items-start gap-2 text-[11px] text-slate-900 leading-snug">
                      <span
                        className="shrink-0 w-4 h-4 rounded-sm text-white text-[9.5px] font-bold flex items-center justify-center mt-0.5 tabular-nums"
                        style={{ backgroundColor: accentHex }}
                      >
                        {idx + 1}
                      </span>
                      <span className="font-semibold">{cause}</span>
                    </div>
                  ))
                )}
              </div>
            </div>

            {renderCardFooter(2)}
          </div>
        </div>

        {/* CARD 3 */}
        <div className="w-full max-w-[460px] space-y-2">
          <div className="flex items-center justify-between px-0.5">
            <span className="text-[12px] font-bold text-slate-700">{CARD_SLUGS[2].label}</span>
            {renderCardActionButtons(2)}
          </div>

          <div
            ref={(el) => {
              cardRefs.current[2] = el;
            }}
            className="w-full aspect-square ops-sheet-shadow bg-white text-slate-900 flex flex-col justify-between overflow-hidden border border-slate-300 keep-all"
          >
            <div>
              <div className="bg-slate-900 text-white px-5 py-3 flex items-center justify-between">
                <span className="text-[13.5px] font-extrabold">02. 위험 관행(X) vs 안전 원칙(O)</span>
                <span
                  className="text-[10px] font-bold px-2 py-0.5 rounded-sm text-white"
                  style={{ backgroundColor: accentHex }}
                >
                  {measuresSourceTag}
                </span>
              </div>
              <div className="h-1 w-full" style={{ backgroundColor: accentHex }} />
            </div>

            <div className="flex-1 px-5 py-3.5 flex flex-col justify-between gap-2.5 overflow-hidden">
              {c.ox_comparison.map((pair, idx) => (
                <div key={idx} className="rounded-md border border-slate-200 overflow-hidden">
                  <div className="bg-red-50 px-3 py-2 flex items-start gap-2">
                    <span className="shrink-0 w-4 h-4 rounded-sm bg-red-700 text-white text-[10px] font-bold flex items-center justify-center mt-0.5">
                      X
                    </span>
                    <p className="text-[11px] font-bold text-red-950 leading-snug">{pair.wrong}</p>
                  </div>
                  <div className="bg-emerald-50 px-3 py-2 border-t border-slate-200 flex items-start gap-2">
                    <span className="shrink-0 w-4 h-4 rounded-sm bg-emerald-700 text-white text-[10px] font-bold flex items-center justify-center mt-0.5">
                      O
                    </span>
                    <p className="text-[11px] font-bold text-emerald-950 leading-snug">
                      {pair.right}
                    </p>
                  </div>
                </div>
              ))}

              <div className="rounded-md bg-slate-900 text-white px-3.5 py-2.5">
                <span className="block text-[9.8px] font-bold text-amber-300 mb-0.5">
                  최우선 예방수칙 ({measuresSourceTag})
                </span>
                <p className="text-[11.2px] font-bold leading-snug">{c.preventive_measures[0]}</p>
                {translations && (
                  <p className="text-[10px] text-slate-300 leading-snug mt-1">
                    {translations.measures[0]}
                  </p>
                )}
              </div>
            </div>

            {renderCardFooter(3)}
          </div>
        </div>

        {/* CARD 4 */}
        <div className="w-full max-w-[460px] space-y-2">
          <div className="flex items-center justify-between px-0.5">
            <span className="text-[12px] font-bold text-slate-700">{CARD_SLUGS[3].label}</span>
            {renderCardActionButtons(3)}
          </div>

          <div
            ref={(el) => {
              cardRefs.current[3] = el;
            }}
            className="w-full aspect-square ops-sheet-shadow bg-white text-slate-900 flex flex-col justify-between overflow-hidden border border-slate-300 keep-all"
          >
            <div>
              <div className="bg-slate-900 text-white px-5 py-3 flex items-center justify-between">
                <span className="text-[13.5px] font-extrabold">03. 작업 전 5분 TBM 체크</span>
                <span
                  className="text-[10px] font-bold px-2 py-0.5 rounded-sm text-white"
                  style={{ backgroundColor: accentHex }}
                >
                  {tbmSourceTag}
                </span>
              </div>
              <div className="h-1 w-full" style={{ backgroundColor: accentHex }} />
            </div>

            <div className="flex-1 px-5 py-3 flex flex-col justify-between gap-2 overflow-hidden">
              <ul className="space-y-1.5">
                {c.tbm_checklist.slice(0, 5).map((item, idx) => (
                  <li
                    key={idx}
                    className="flex items-start gap-2 rounded border border-slate-200 bg-slate-50/80 px-2.5 py-1.5 text-[11px] text-slate-900 leading-snug"
                  >
                    <span
                      className="w-3.5 h-3.5 mt-0.5 shrink-0 border-2 rounded-[2px] bg-white"
                      style={{ borderColor: accentHex }}
                    />
                    <span className="font-semibold">{item}</span>
                  </li>
                ))}
              </ul>

              {seasonTrans && (
                <div
                  className="rounded px-2.5 py-1.5 text-[9.8px] font-semibold border"
                  style={{
                    backgroundColor: season.bgHex,
                    borderColor: season.borderHex,
                    color: season.textHex,
                  }}
                >
                  {seasonTrans}
                </div>
              )}

              {siteInfo.showPage1LegalSummary && (
                <div className="rounded border border-slate-300 bg-slate-100 px-2.5 py-1 text-[9.5px] font-bold text-slate-900 truncate">
                  [필수 법령] {legalRef?.primaryLawShort || c.legal_ref}
                </div>
              )}

              <div
                className="rounded-md px-3.5 py-2.5 text-white"
                style={{ backgroundColor: accentHex }}
              >
                <p className="text-[12px] font-extrabold leading-snug">“{c.worker_slogan}”</p>
                {translations && (
                  <p className="text-[10px] font-semibold text-white/90 leading-snug mt-0.5">
                    {translations.slogan}
                  </p>
                )}
              </div>
            </div>

            {renderCardFooter(4)}
          </div>
        </div>
      </div>
    </div>
  );
};
