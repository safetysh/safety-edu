import React, { useRef, useState } from 'react';
import { Archive, Download, Loader2, AlertTriangle, CloudAlert } from 'lucide-react';
import { CustomSiteInfo, GeneratedMaterial } from '../types/safety';
import { HazardPictogram } from './SafetyVisuals';
import {
  getCaseTranslations,
  getForeignLanguageNativeLabel,
  getSeasonalTranslation,
} from '../data/multilingualDict';
import { SEASONAL_RISKS } from '../data/seasonalRisks';
import { downloadCardNewsZip, downloadNodeAsPng } from '../utils/exportImage';

interface CardNewsViewProps {
  material: GeneratedMaterial;
  siteInfo: CustomSiteInfo;
  onNotify: (type: 'success' | 'error', message: string) => void;
}

const CARD_SLUGS = [
  { index: 0, label: '카드 1 · 표지·구호', slug: '표지_구호' },
  { index: 1, label: '카드 2 · 사고요약·원인', slug: '사고요약_원인' },
  { index: 2, label: '카드 3 · 관행X vs 원칙O', slug: 'XO비교' },
  { index: 3, label: '카드 4 · 5분 TBM 체크', slug: '5분TBM체크' },
];

export const CardNewsView: React.FC<CardNewsViewProps> = ({
  material,
  siteInfo,
  onNotify,
}) => {
  const cardRefs = useRef<Array<HTMLDivElement | null>>([null, null, null, null]);
  const [exportingZip, setExportingZip] = useState(false);
  const [exportingIndex, setExportingIndex] = useState<number | null>(null);

  const { primaryCase: c, theme, isExactMatch } = material;
  const translations = getCaseTranslations(c, siteInfo.foreignLanguage);
  const langLabel = getForeignLanguageNativeLabel(siteInfo.foreignLanguage);
  const season = SEASONAL_RISKS[siteInfo.seasonRisk];
  const seasonTrans = getSeasonalTranslation(siteInfo.seasonRisk, siteInfo.foreignLanguage);

  const siteLabel = siteInfo.siteName.trim() ? `현장: ${siteInfo.siteName.trim()}` : '현장: ________________';
  const dateLabel = siteInfo.educationDate || new Date().toISOString().slice(0, 10);

  const handleDownloadSingle = async (idx: number) => {
    const node = cardRefs.current[idx];
    if (!node || exportingIndex !== null) return;
    setExportingIndex(idx);
    try {
      const fileName = await downloadNodeAsPng(
        node,
        `카드뉴스0${idx + 1}_${CARD_SLUGS[idx].slug}_${material.selectedWorkType}`,
        dateLabel,
        1080
      );
      onNotify('success', `1080×1080 PNG 저장 완료: ${fileName}`);
    } catch {
      onNotify('error', '카드뉴스 PNG 저장 중 오류가 발생했습니다.');
    } finally {
      setExportingIndex(null);
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
      className={`shrink-0 px-5 py-2.5 flex items-center justify-between gap-2 text-[11px] border-t ${
        dark
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
        <span className="font-semibold truncate">{siteLabel}</span>
      </div>
      <span className="font-bold tabular-nums shrink-0">{cardNo} / 4</span>
    </div>
  );

  return (
    <div className="w-full max-w-[980px] mx-auto space-y-5 pb-6">
      {/* Action Header for Mobile Card News */}
      <div className="bg-white rounded-lg border border-slate-200 px-5 py-3.5 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-[14px] font-bold text-slate-900">
            단톡방·모바일 전파용 4컷 카드뉴스 (1:1 · 1080×1080px)
          </h2>
          <p className="text-[12px] text-slate-500 mt-0.5">
            카카오톡·문자 전송에 최적화된 4장 세트입니다. 한 번에 ZIP으로 받거나 필요한 카드만 개별 저장하세요.
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

      {/* 2x2 Grid of 1:1 Square Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 justify-items-center">
        {/* ==================== CARD 1: 표지 · 구호 ==================== */}
        <div className="w-full max-w-[460px] space-y-2">
          <div className="flex items-center justify-between px-0.5">
            <span className="text-[12px] font-bold text-slate-700">{CARD_SLUGS[0].label}</span>
            <button
              type="button"
              onClick={() => handleDownloadSingle(0)}
              disabled={exportingIndex !== null}
              className="inline-flex items-center gap-1 text-[11.5px] font-semibold text-slate-700 hover:text-slate-950 disabled:opacity-50 cursor-pointer"
            >
              {exportingIndex === 0 ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <Download className="w-3.5 h-3.5" />
              )}
              <span>PNG 저장</span>
            </button>
          </div>

          <div
            ref={(el) => {
              cardRefs.current[0] = el;
            }}
            className="w-full aspect-square ops-sheet-shadow bg-slate-900 text-white flex flex-col justify-between overflow-hidden border border-slate-300"
          >
            <div>
              <div className={`h-2.5 w-full ${theme.stripeClass}`} />
              {season.id !== 'always' && (
                <div
                  className="px-4 py-1.5 flex items-center gap-1.5 text-[10.5px] font-bold"
                  style={{ backgroundColor: season.badgeBgHex, color: '#FFFFFF' }}
                >
                  <CloudAlert className="w-3.5 h-3.5 shrink-0" />
                  <span className="truncate">{season.badgeText}</span>
                </div>
              )}
            </div>

            <div className="flex-1 px-6 py-4 flex flex-col justify-between">
              <div className="flex items-start justify-between gap-3">
                <div className="space-y-1.5 min-w-0">
                  <div className="flex flex-wrap items-center gap-1.5 text-[11px] font-bold">
                    <span
                      className="px-2 py-0.5 rounded-sm"
                      style={{ backgroundColor: theme.badgeBgHex, color: theme.badgeTextHex }}
                    >
                      {c.hazard_type} 중대재해 예방
                    </span>
                    <span className="text-slate-300">{material.selectedIndustry}</span>
                  </div>
                  <p className="text-[12px] font-semibold text-slate-300 truncate">
                    {material.selectedWorkType}
                  </p>
                </div>
                <div className="shrink-0 bg-white rounded-md p-1.5">
                  <HazardPictogram hazardType={c.hazard_type} size={46} />
                </div>
              </div>

              <div className="space-y-2 my-auto py-2">
                {!isExactMatch && (
                  <div className="inline-flex items-center gap-1 text-[10.5px] font-bold text-amber-300">
                    <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
                    <span>유사 공정 기반 위험요인 분석</span>
                  </div>
                )}
                <h3 className="text-[21px] font-extrabold leading-snug tracking-tight text-white [text-wrap:balance]">
                  {c.title}
                </h3>
                {season.id !== 'always' && (
                  <p className="text-[11px] text-amber-200/95 leading-snug">
                    {season.extraRule}
                  </p>
                )}
              </div>

              <div
                className="rounded-md px-4 py-3 border"
                style={{ backgroundColor: '#1E293B', borderColor: theme.primaryHex }}
              >
                <span className="block text-[10px] font-bold text-amber-300 mb-0.5">
                  오늘의 현장 안전구호 {translations ? `· ${langLabel}` : ''}
                </span>
                <p className="text-[14.5px] font-extrabold text-white leading-snug">
                  “{c.worker_slogan}”
                </p>
                {translations && (
                  <p className="text-[11px] font-semibold text-amber-200 leading-snug mt-1">
                    {translations.slogan}
                  </p>
                )}
              </div>
            </div>

            {renderCardFooter(1, true)}
          </div>
        </div>

        {/* ==================== CARD 2: 사고요약 · 원인 ==================== */}
        <div className="w-full max-w-[460px] space-y-2">
          <div className="flex items-center justify-between px-0.5">
            <span className="text-[12px] font-bold text-slate-700">{CARD_SLUGS[1].label}</span>
            <button
              type="button"
              onClick={() => handleDownloadSingle(1)}
              disabled={exportingIndex !== null}
              className="inline-flex items-center gap-1 text-[11.5px] font-semibold text-slate-700 hover:text-slate-950 disabled:opacity-50 cursor-pointer"
            >
              {exportingIndex === 1 ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <Download className="w-3.5 h-3.5" />
              )}
              <span>PNG 저장</span>
            </button>
          </div>

          <div
            ref={(el) => {
              cardRefs.current[1] = el;
            }}
            className="w-full aspect-square ops-sheet-shadow bg-white text-slate-900 flex flex-col justify-between overflow-hidden border border-slate-300"
          >
            <div>
              <div className="bg-slate-900 text-white px-5 py-3 flex items-center justify-between">
                <span className="text-[14px] font-extrabold">01. 이렇게 발생했습니다</span>
                <span
                  className="text-[10.5px] font-bold px-2 py-0.5 rounded-sm"
                  style={{ backgroundColor: theme.badgeBgHex, color: theme.badgeTextHex }}
                >
                  사고 요약·원인
                </span>
              </div>
              <div className="h-1 w-full" style={{ backgroundColor: theme.primaryHex }} />
            </div>

            <div className="flex-1 px-5 py-3.5 flex flex-col justify-between gap-2.5 overflow-hidden">
              <div className="rounded-md border border-slate-200 bg-slate-50 p-3 space-y-1.5">
                <p className="text-[11px] font-bold text-slate-600 truncate">
                  기인물: {c.equipment}
                </p>
                {c.summary_3lines.map((line, idx) => (
                  <p key={idx} className="text-[11.5px] text-slate-800 leading-snug flex gap-1.5">
                    <span className="font-bold text-slate-500 tabular-nums shrink-0">
                      {idx + 1}.
                    </span>
                    <span>{line}</span>
                  </p>
                ))}
              </div>

              <div
                className="rounded-md border p-3 space-y-1.5"
                style={{ backgroundColor: theme.softBgHex, borderColor: theme.borderHex }}
              >
                <p className="text-[11.5px] font-extrabold" style={{ color: theme.accentTextHex }}>
                  핵심 사고 원인 (절대 주의)
                </p>
                {c.direct_causes.map((cause, idx) => (
                  <div key={idx} className="flex items-start gap-2 text-[11.5px] text-slate-900 leading-snug">
                    <span
                      className="shrink-0 w-4 h-4 rounded-sm text-white text-[10px] font-bold flex items-center justify-center mt-0.5 tabular-nums"
                      style={{ backgroundColor: theme.primaryHex }}
                    >
                      {idx + 1}
                    </span>
                    <span className="font-semibold">{cause}</span>
                  </div>
                ))}
              </div>
            </div>

            {renderCardFooter(2)}
          </div>
        </div>

        {/* ==================== CARD 3: 관행 X vs 원칙 O ==================== */}
        <div className="w-full max-w-[460px] space-y-2">
          <div className="flex items-center justify-between px-0.5">
            <span className="text-[12px] font-bold text-slate-700">{CARD_SLUGS[2].label}</span>
            <button
              type="button"
              onClick={() => handleDownloadSingle(2)}
              disabled={exportingIndex !== null}
              className="inline-flex items-center gap-1 text-[11.5px] font-semibold text-slate-700 hover:text-slate-950 disabled:opacity-50 cursor-pointer"
            >
              {exportingIndex === 2 ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <Download className="w-3.5 h-3.5" />
              )}
              <span>PNG 저장</span>
            </button>
          </div>

          <div
            ref={(el) => {
              cardRefs.current[2] = el;
            }}
            className="w-full aspect-square ops-sheet-shadow bg-white text-slate-900 flex flex-col justify-between overflow-hidden border border-slate-300"
          >
            <div>
              <div className="bg-slate-900 text-white px-5 py-3 flex items-center justify-between">
                <span className="text-[14px] font-extrabold">02. 위험 관행(X) vs 안전 원칙(O)</span>
                <span
                  className="text-[10.5px] font-bold px-2 py-0.5 rounded-sm"
                  style={{ backgroundColor: theme.badgeBgHex, color: theme.badgeTextHex }}
                >
                  O·X 행동수칙
                </span>
              </div>
              <div className="h-1 w-full" style={{ backgroundColor: theme.primaryHex }} />
            </div>

            <div className="flex-1 px-5 py-3.5 flex flex-col justify-between gap-2.5 overflow-hidden">
              {c.ox_comparison.map((pair, idx) => (
                <div key={idx} className="rounded-md border border-slate-200 overflow-hidden">
                  <div className="bg-red-50 px-3 py-2 flex items-start gap-2">
                    <span className="shrink-0 w-4 h-4 rounded-sm bg-red-700 text-white text-[10px] font-bold flex items-center justify-center mt-0.5">
                      X
                    </span>
                    <p className="text-[11.5px] font-bold text-red-950 leading-snug">{pair.wrong}</p>
                  </div>
                  <div className="bg-emerald-50 px-3 py-2 border-t border-slate-200 flex items-start gap-2">
                    <span className="shrink-0 w-4 h-4 rounded-sm bg-emerald-700 text-white text-[10px] font-bold flex items-center justify-center mt-0.5">
                      O
                    </span>
                    <p className="text-[11.5px] font-bold text-emerald-950 leading-snug">
                      {pair.right}
                    </p>
                  </div>
                </div>
              ))}

              {/* Key Preventive Measure with Optional Multilingual */}
              <div className="rounded-md bg-slate-900 text-white px-3.5 py-2.5">
                <span className="block text-[10px] font-bold text-amber-300 mb-0.5">
                  최우선 예방수칙 {translations ? `· ${langLabel}` : ''}
                </span>
                <p className="text-[11.5px] font-bold leading-snug">{c.preventive_measures[0]}</p>
                {translations && (
                  <p className="text-[10.2px] text-slate-300 leading-snug mt-1">
                    {translations.measures[0]}
                  </p>
                )}
              </div>
            </div>

            {renderCardFooter(3)}
          </div>
        </div>

        {/* ==================== CARD 4: 5분 TBM 체크 ==================== */}
        <div className="w-full max-w-[460px] space-y-2">
          <div className="flex items-center justify-between px-0.5">
            <span className="text-[12px] font-bold text-slate-700">{CARD_SLUGS[3].label}</span>
            <button
              type="button"
              onClick={() => handleDownloadSingle(3)}
              disabled={exportingIndex !== null}
              className="inline-flex items-center gap-1 text-[11.5px] font-semibold text-slate-700 hover:text-slate-950 disabled:opacity-50 cursor-pointer"
            >
              {exportingIndex === 3 ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <Download className="w-3.5 h-3.5" />
              )}
              <span>PNG 저장</span>
            </button>
          </div>

          <div
            ref={(el) => {
              cardRefs.current[3] = el;
            }}
            className="w-full aspect-square ops-sheet-shadow bg-white text-slate-900 flex flex-col justify-between overflow-hidden border border-slate-300"
          >
            <div>
              <div className="bg-slate-900 text-white px-5 py-3 flex items-center justify-between">
                <span className="text-[14px] font-extrabold">03. 작업 전 5분 TBM 체크</span>
                <span
                  className="text-[10.5px] font-bold px-2 py-0.5 rounded-sm"
                  style={{ backgroundColor: theme.badgeBgHex, color: theme.badgeTextHex }}
                >
                  5대 필수점검
                </span>
              </div>
              <div className="h-1 w-full" style={{ backgroundColor: theme.primaryHex }} />
            </div>

            <div className="flex-1 px-5 py-3 flex flex-col justify-between gap-2 overflow-hidden">
              <ul className="space-y-1.5">
                {c.tbm_checklist.map((item, idx) => (
                  <li
                    key={idx}
                    className="flex items-start gap-2 rounded border border-slate-200 bg-slate-50/80 px-2.5 py-1.5 text-[11.2px] text-slate-900 leading-snug"
                  >
                    <span
                      className="w-3.5 h-3.5 mt-0.5 shrink-0 border-2 rounded-[2px] bg-white"
                      style={{ borderColor: theme.primaryHex }}
                    />
                    <span className="font-semibold">{item}</span>
                  </li>
                ))}
              </ul>

              {seasonTrans && (
                <div
                  className="rounded px-2.5 py-1.5 text-[10px] font-semibold border"
                  style={{
                    backgroundColor: season.bgHex,
                    borderColor: season.borderHex,
                    color: season.textHex,
                  }}
                >
                  {seasonTrans}
                </div>
              )}

              <div
                className="rounded-md px-3.5 py-2.5 text-white"
                style={{ backgroundColor: theme.primaryHex }}
              >
                <p className="text-[12.5px] font-extrabold leading-snug">
                  “{c.worker_slogan}”
                </p>
                {translations && (
                  <p className="text-[10.2px] font-semibold text-white/90 leading-snug mt-0.5">
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
