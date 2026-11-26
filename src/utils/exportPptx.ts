import type PptxGenJS from 'pptxgenjs';
import { CustomSiteInfo, GeneratedMaterial } from '../types/safety';
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
  getDisplaySourceRef,
  getSourceBrandStyle,
  isOfficialKoshaApiCase,
} from './textFit';

const FONT = 'Malgun Gothic';

function sanitizeFileName(text: string): string {
  return text.replace(/[\\/:*?"<>|\s·]+/g, '_').replace(/_+/g, '_').slice(0, 42);
}

/**
 * Generates an editable 5-slide 16:9 PowerPoint presentation (.pptx)
 * using pptxgenjs completely client-side with zero external API calls.
 * Synchronizes source identity colors (FATALITY/SIF/CASE), verbatim facts,
 * inline-edited field measures & TBM items, and automatic attribution switching.
 */
export async function downloadSafetyPptx(
  material: GeneratedMaterial,
  siteInfo: CustomSiteInfo
): Promise<string> {
  const { default: PptxGenJSRuntime } = await import('pptxgenjs');
  const pptx = new PptxGenJSRuntime();
  pptx.layout = 'LAYOUT_16x9'; // 10 x 5.625 inches
  pptx.author = siteInfo.instructorName || '산업안전보건 교육담당자';
  pptx.company = siteInfo.siteName || '현장 안전보건관리팀';
  pptx.title = `${material.selectedWorkType} 안전보건교육자료`;
  pptx.subject = `${material.selectedIndustry} · ${material.primaryCase.hazard_type} 재해예방`;

  const { primaryCase: c, relatedCase, theme, isExactMatch } = material;
  const isOfficialKosha = isOfficialKoshaApiCase(c);
  const sourceBrand = getSourceBrandStyle(c);
  const sourceBadgeText = formatSourceHeaderBadge(c);
  const primaryAccentPptx = !isOfficialKosha
    ? sourceBrand.pptxHex
    : c.source_type === 'FATALITY' || c.source_type === 'SIF'
      ? sourceBrand.pptxHex
      : theme.pptxPrimary;

  const siteLabel = siteInfo.siteName.trim() || '________________';
  const dateLabel = siteInfo.educationDate || new Date().toISOString().slice(0, 10);
  const instructorLabel = siteInfo.instructorName.trim() || '________________';

  const translations = getCaseTranslations(c, siteInfo.foreignLanguage);
  const langLabel = getForeignLanguageNativeLabel(siteInfo.foreignLanguage);
  const season = SEASONAL_RISKS[siteInfo.seasonRisk];
  const seasonTrans = getSeasonalTranslation(siteInfo.seasonRisk, siteInfo.foreignLanguage);

  const isMeasuresEdited = Boolean(material.isMeasuresEdited || material.isCustomEdited);
  const isTbmEdited = Boolean(material.isTbmEdited);
  const measuresAttributionLabel = isMeasuresEdited
    ? isOfficialKosha
      ? '공단 권고안 기반 · 현장 맞춤 반영'
      : '표준 가이드 기반 · 현장 맞춤 반영'
    : !isOfficialKosha
      ? '표준 가이드'
      : c.source_type === 'SIF'
        ? '공단 원문 (SIF 위험성감소대책)'
        : '공단 표준 예방가이드 원문';

  const addLogoIfPresent = (slide: PptxGenJS.Slide, x: number, y: number, w = 1.05, h = 0.28) => {
    if (!siteInfo.logoDataUrl) return;
    try {
      slide.addImage({
        data: siteInfo.logoDataUrl,
        x,
        y,
        w,
        h,
        sizing: { type: 'contain', w, h },
      });
    } catch {
      // Ignore invalid image format gracefully without blocking PPTX export
    }
  };

  const addSlideChrome = (slide: PptxGenJS.Slide, pageNum: number, sectionTitle: string) => {
    slide.background = { color: 'FFFFFF' };

    slide.addShape(pptx.ShapeType.rect, {
      x: 0,
      y: 0,
      w: 10,
      h: 0.62,
      fill: { color: '0F172A' },
      line: { color: '0F172A', width: 0 },
    });

    slide.addShape(pptx.ShapeType.rect, {
      x: 0,
      y: 0.62,
      w: 10,
      h: 0.06,
      fill: { color: primaryAccentPptx },
      line: { color: primaryAccentPptx, width: 0 },
    });

    slide.addText(sectionTitle, {
      x: 0.45,
      y: 0.12,
      w: 6.95,
      h: 0.4,
      fontFace: FONT,
      fontSize: 15,
      bold: true,
      color: 'FFFFFF',
      valign: 'middle',
    });

    slide.addShape(pptx.ShapeType.rect, {
      x: 7.55,
      y: 0.14,
      w: 2.05,
      h: 0.34,
      fill: { color: primaryAccentPptx },
      line: { color: primaryAccentPptx, width: 0 },
    });
    slide.addText(`${sourceBrand.shortLabel} · ${c.hazard_type}`, {
      x: 7.55,
      y: 0.14,
      w: 2.05,
      h: 0.34,
      fontFace: FONT,
      fontSize: 9.8,
      bold: true,
      color: 'FFFFFF',
      align: 'center',
      valign: 'middle',
    });

    slide.addShape(pptx.ShapeType.rect, {
      x: 0.45,
      y: 5.18,
      w: 9.1,
      h: 0.015,
      fill: { color: 'CBD5E1' },
      line: { color: 'CBD5E1', width: 0 },
    });

    const textStartX = siteInfo.logoDataUrl ? 1.62 : 0.45;
    addLogoIfPresent(slide, 0.45, 5.23, 1.05, 0.3);

    const sourceRefLabel = getDisplaySourceRef(c);
    slide.addText(
      `현장: ${siteLabel}  |  출처: ${sourceRefLabel} · 코드 ${c.id}  |  ${dateLabel}`,
      {
        x: textStartX,
        y: 5.24,
        w: 8.4 - textStartX,
        h: 0.28,
        fontFace: FONT,
        fontSize: 8.4,
        color: '64748B',
        valign: 'middle',
      }
    );

    slide.addText(`${pageNum} / 5`, {
      x: 8.6,
      y: 5.24,
      w: 0.95,
      h: 0.28,
      fontFace: FONT,
      fontSize: 9.5,
      bold: true,
      color: '334155',
      align: 'right',
      valign: 'middle',
    });
  };

  // =========================================================================
  // SLIDE 1: 표지 (Cover)
  // =========================================================================
  {
    const slide = pptx.addSlide();
    slide.background = { color: '0F172A' };

    slide.addShape(pptx.ShapeType.rect, {
      x: 0,
      y: 0,
      w: 10,
      h: 0.22,
      fill: { color: primaryAccentPptx },
      line: { color: primaryAccentPptx, width: 0 },
    });

    slide.addShape(pptx.ShapeType.rect, {
      x: 7.55,
      y: 0.22,
      w: 2.45,
      h: 5.405,
      fill: { color: '1E293B' },
      line: { color: '1E293B', width: 0 },
    });

    let currentY = 0.48;
    if (season.id !== 'always') {
      slide.addShape(pptx.ShapeType.rect, {
        x: 0.55,
        y: currentY,
        w: 6.65,
        h: 0.4,
        fill: { color: season.pptxBadge },
        line: { color: season.pptxBadge, width: 0 },
      });
      slide.addText(`[${season.badgeText}]  ${season.extraRule}`, {
        x: 0.65,
        y: currentY,
        w: 6.45,
        h: 0.4,
        fontFace: FONT,
        fontSize: 9,
        bold: true,
        color: 'FFFFFF',
        valign: 'middle',
      });
      currentY += 0.48;
    }

    // Source Recognition Badge + Industry / Work Type Tag
    slide.addShape(pptx.ShapeType.rect, {
      x: 0.55,
      y: currentY,
      w: 6.65,
      h: 0.38,
      fill: { color: primaryAccentPptx },
      line: { color: primaryAccentPptx, width: 0 },
    });
    slide.addText(`[${sourceBadgeText}]   ${material.selectedIndustry} · ${material.selectedWorkType}`, {
      x: 0.65,
      y: currentY,
      w: 6.45,
      h: 0.38,
      fontFace: FONT,
      fontSize: 10.8,
      bold: true,
      color: 'FFFFFF',
      valign: 'middle',
    });
    currentY += 0.46;

    if (!isExactMatch) {
      slide.addShape(pptx.ShapeType.rect, {
        x: 0.55,
        y: currentY,
        w: 4.1,
        h: 0.28,
        fill: { color: 'FEF3C7' },
        line: { color: 'F59E0B', width: 0.75 },
      });
      slide.addText('유사 공정 기반 위험요인 분석 자료', {
        x: 0.62,
        y: currentY,
        w: 3.96,
        h: 0.28,
        fontFace: FONT,
        fontSize: 9.5,
        bold: true,
        color: '92400E',
        valign: 'middle',
      });
      currentY += 0.36;
    }

    slide.addText(c.title, {
      x: 0.55,
      y: currentY,
      w: 6.7,
      h: 1.45,
      fontFace: FONT,
      fontSize: season.id !== 'always' ? 21 : 23,
      bold: true,
      color: 'FFFFFF',
      valign: 'top',
      breakLine: true,
    });

    slide.addText(
      `중점 기인물: ${c.equipment}   |   대책 기준: ${measuresAttributionLabel}`,
      {
        x: 0.55,
        y: 3.22,
        w: 6.7,
        h: 0.34,
        fontFace: FONT,
        fontSize: 10.2,
        color: 'CBD5E1',
        valign: 'middle',
      }
    );

    slide.addShape(pptx.ShapeType.rect, {
      x: 0.55,
      y: 3.68,
      w: 6.65,
      h: translations ? 1.24 : 0.94,
      fill: { color: '1E293B' },
      line: { color: primaryAccentPptx, width: 1.5 },
    });
    slide.addText(
      translations ? `근로자 핵심 안전 구호 (${langLabel} 병기)` : '근로자 핵심 안전 구호',
      {
        x: 0.72,
        y: 3.75,
        w: 6.3,
        h: 0.22,
        fontFace: FONT,
        fontSize: 9.2,
        bold: true,
        color: 'FACC15',
      }
    );
    slide.addText(`“${c.worker_slogan}”`, {
      x: 0.72,
      y: 4.0,
      w: 6.3,
      h: 0.42,
      fontFace: FONT,
      fontSize: 14,
      bold: true,
      color: 'FFFFFF',
      valign: 'middle',
    });
    if (translations) {
      slide.addText(translations.slogan, {
        x: 0.72,
        y: 4.44,
        w: 6.3,
        h: 0.4,
        fontFace: FONT,
        fontSize: 10.2,
        bold: true,
        color: 'FDE68A',
        valign: 'top',
      });
    }

    slide.addText('중대재해 예방\n현장 안전교육', {
      x: 7.8,
      y: 0.65,
      w: 1.95,
      h: 0.85,
      fontFace: FONT,
      fontSize: 16,
      bold: true,
      color: 'F8FAFC',
      valign: 'top',
    });

    slide.addShape(pptx.ShapeType.rect, {
      x: 7.8,
      y: 1.62,
      w: 1.9,
      h: 0.03,
      fill: { color: primaryAccentPptx },
      line: { color: primaryAccentPptx, width: 0 },
    });

    const metaRows = [
      { label: '재해유형', value: c.hazard_type },
      { label: '현장명', value: siteLabel },
      { label: '교육일자', value: dateLabel },
      { label: '교육강사', value: instructorLabel },
    ];

    metaRows.forEach((row, idx) => {
      const yPos = 1.85 + idx * 0.62;
      slide.addText(row.label, {
        x: 7.8,
        y: yPos,
        w: 1.95,
        h: 0.2,
        fontFace: FONT,
        fontSize: 9,
        color: '94A3B8',
      });
      slide.addText(row.value, {
        x: 7.8,
        y: yPos + 0.2,
        w: 1.95,
        h: 0.34,
        fontFace: FONT,
        fontSize: 11,
        bold: true,
        color: 'FFFFFF',
        valign: 'top',
      });
    });

    if (siteInfo.logoDataUrl) {
      slide.addShape(pptx.ShapeType.rect, {
        x: 7.8,
        y: 4.55,
        w: 1.9,
        h: 0.65,
        fill: { color: 'FFFFFF' },
        line: { color: 'CBD5E1', width: 0.5 },
      });
      addLogoIfPresent(slide, 7.9, 4.62, 1.7, 0.5);
    }
  }

  // =========================================================================
  // SLIDE 2: 재해개요 원문 (Read-Only) + 4단계 메커니즘
  // =========================================================================
  {
    const slide = pptx.addSlide();
    addSlideChrome(
      slide,
      2,
      isOfficialKosha
        ? '01. 중대재해 사고 개요 [공단 공식 원문] 및 발생 메커니즘'
        : '01. 중대재해 사고 개요 [표준 교육모델] 및 발생 메커니즘'
    );

    const rawOverview = getCaseOverviewVerbatim(c);
    const fit = fitFactualOverviewForA4(rawOverview, 0, false, 300);
    const overviewPt = fit.tierLabel === '8.8pt' ? 9.5 : fit.tierLabel === '9.5pt' ? 10.2 : 10.8;

    slide.addShape(pptx.ShapeType.rect, {
      x: 0.45,
      y: 0.84,
      w: 9.1,
      h: c.disclaimer ? 1.72 : 1.62,
      fill: { color: sourceBrand.pptxSoftBg },
      line: { color: primaryAccentPptx, width: 0.9 },
    });

    const factBadgePrefix = isOfficialKosha ? '공단 공식 원문' : '표준 교육모델';
    const overviewHeader = fit.isExcerpted
      ? `[${factBadgePrefix} · 원문 일부 발췌]  기인물: ${c.equipment}`
      : `[${factBadgePrefix}]  기인물: ${c.equipment}`;

    slide.addText(overviewHeader, {
      x: 0.62,
      y: 0.92,
      w: 8.75,
      h: 0.26,
      fontFace: FONT,
      fontSize: 10.5,
      bold: true,
      color: primaryAccentPptx,
    });

    slide.addText(fit.displayText, {
      x: 0.62,
      y: 1.2,
      w: 8.75,
      h: c.disclaimer ? 1.02 : 1.16,
      fontFace: FONT,
      fontSize: overviewPt,
      color: '0F172A',
      valign: 'top',
    });

    if (c.disclaimer) {
      slide.addText(c.disclaimer, {
        x: 0.62,
        y: 2.26,
        w: 8.75,
        h: 0.24,
        fontFace: FONT,
        fontSize: 8.5,
        color: '7F1D1D',
        valign: 'middle',
      });
    }

    const timelineTitleY = c.disclaimer ? 2.68 : 2.62;
    const timelineCardY = c.disclaimer ? 3.02 : 2.98;

    slide.addText('사고 발생 4단계 메커니즘', {
      x: 0.45,
      y: timelineTitleY,
      w: 9.1,
      h: 0.28,
      fontFace: FONT,
      fontSize: 12,
      bold: true,
      color: '0F172A',
    });

    c.timeline.forEach((step, idx) => {
      const cardW = 2.08;
      const gap = 0.26;
      const xPos = 0.45 + idx * (cardW + gap);
      const isLast = idx === 3;

      slide.addShape(pptx.ShapeType.rect, {
        x: xPos,
        y: timelineCardY,
        w: cardW,
        h: 1.98,
        fill: { color: isLast ? 'ECFDF5' : 'FFFFFF' },
        line: { color: isLast ? '059669' : 'CBD5E1', width: isLast ? 1.5 : 0.75 },
      });

      slide.addShape(pptx.ShapeType.rect, {
        x: xPos,
        y: timelineCardY,
        w: cardW,
        h: 0.36,
        fill: { color: isLast ? '047857' : '1E293B' },
        line: { color: isLast ? '047857' : '1E293B', width: 0 },
      });

      slide.addText(isLast ? `${step.step} · 예방 핵심` : `${step.step} · ${step.label}`, {
        x: xPos + 0.08,
        y: timelineCardY,
        w: cardW - 0.16,
        h: 0.36,
        fontFace: FONT,
        fontSize: 10,
        bold: true,
        color: 'FFFFFF',
        valign: 'middle',
      });

      slide.addText(step.detail, {
        x: xPos + 0.12,
        y: timelineCardY + 0.44,
        w: cardW - 0.24,
        h: 1.44,
        fontFace: FONT,
        fontSize: step.detail.length > 70 ? 9.2 : 10,
        color: '1E293B',
        valign: 'top',
      });

      if (!isLast) {
        slide.addShape(pptx.ShapeType.rightArrow, {
          x: xPos + cardW + 0.05,
          y: timelineCardY + 0.86,
          w: 0.16,
          h: 0.24,
          fill: { color: primaryAccentPptx },
          line: { color: primaryAccentPptx, width: 0 },
        });
      }
    });
  }

  // =========================================================================
  // SLIDE 3: SIF 고위험작업·유발요인(원문 고정) / 원인 분석 / O·X 비교
  // =========================================================================
  {
    const slide = pptx.addSlide();
    const showOX = material.perspectiveMode === 'ox_compare';
    const isSif = c.source_type === 'SIF';

    addSlideChrome(
      slide,
      3,
      showOX
        ? '02. 잘못된 현장 관행(X) vs 안전 원칙(O) 대조'
        : isSif
          ? '02. SIF 고위험작업·재해유발요인 [공단 공식 원문] 분석'
          : '02. 핵심 위험요인 및 관리적 근본원인 분석'
    );

    if (showOX) {
      c.ox_comparison.forEach((pair, idx) => {
        const yBase = 0.92 + idx * 2.08;

        slide.addShape(pptx.ShapeType.rect, {
          x: 0.45,
          y: yBase,
          w: 4.35,
          h: 1.45,
          fill: { color: 'FEF2F2' },
          line: { color: 'FCA5A5', width: 1 },
        });
        slide.addText(`X  잘못된 현장 관행 ${idx + 1}`, {
          x: 0.62,
          y: yBase + 0.1,
          w: 4.0,
          h: 0.28,
          fontFace: FONT,
          fontSize: 11,
          bold: true,
          color: 'B91C1C',
        });
        slide.addText(pair.wrong, {
          x: 0.62,
          y: yBase + 0.42,
          w: 4.0,
          h: 0.92,
          fontFace: FONT,
          fontSize: 11.2,
          bold: true,
          color: '1E293B',
          valign: 'top',
        });

        slide.addShape(pptx.ShapeType.rightArrow, {
          x: 4.9,
          y: yBase + 0.58,
          w: 0.2,
          h: 0.28,
          fill: { color: '0F172A' },
          line: { color: '0F172A', width: 0 },
        });

        slide.addShape(pptx.ShapeType.rect, {
          x: 5.2,
          y: yBase,
          w: 4.35,
          h: 1.45,
          fill: { color: 'F0FDF4' },
          line: { color: '86EFAC', width: 1 },
        });
        slide.addText(`O  반드시 지켜야 할 원칙 ${idx + 1}`, {
          x: 5.37,
          y: yBase + 0.1,
          w: 4.0,
          h: 0.28,
          fontFace: FONT,
          fontSize: 11,
          bold: true,
          color: '15803D',
        });
        slide.addText(pair.right, {
          x: 5.37,
          y: yBase + 0.42,
          w: 4.0,
          h: 0.92,
          fontFace: FONT,
          fontSize: 11.2,
          bold: true,
          color: '1E293B',
          valign: 'top',
        });

        slide.addShape(pptx.ShapeType.rect, {
          x: 0.45,
          y: yBase + 1.5,
          w: 9.1,
          h: 0.4,
          fill: { color: 'F8FAFC' },
          line: { color: 'E2E8F0', width: 0.5 },
        });
        slide.addText(`위험 해설: ${pair.note}`, {
          x: 0.62,
          y: yBase + 1.5,
          w: 8.75,
          h: 0.4,
          fontFace: FONT,
          fontSize: 10,
          color: '475569',
          valign: 'middle',
        });
      });
    } else if (isSif) {
      // Dedicated SIF Read-Only Facts Frame
      slide.addShape(pptx.ShapeType.rect, {
        x: 0.45,
        y: 0.9,
        w: 4.45,
        h: 4.05,
        fill: { color: 'FFFBEB' },
        line: { color: 'D97706', width: 1.3 },
      });
      slide.addShape(pptx.ShapeType.rect, {
        x: 0.45,
        y: 0.9,
        w: 4.45,
        h: 0.44,
        fill: { color: 'D97706' },
        line: { color: 'D97706', width: 0 },
      });
      slide.addText('SIF 고위험작업 및 재해유발요인 [공단 원문]', {
        x: 0.62,
        y: 0.9,
        w: 4.1,
        h: 0.44,
        fontFace: FONT,
        fontSize: 11.5,
        bold: true,
        color: 'FFFFFF',
        valign: 'middle',
      });

      slide.addText('고위험작업·상황 (Potential)', {
        x: 0.65,
        y: 1.5,
        w: 4.05,
        h: 0.25,
        fontFace: FONT,
        fontSize: 10,
        bold: true,
        color: '92400E',
      });
      slide.addText(c.high_risk_work || c.work_type, {
        x: 0.65,
        y: 1.78,
        w: 4.05,
        h: 0.72,
        fontFace: FONT,
        fontSize: 10.8,
        bold: true,
        color: '0F172A',
        valign: 'top',
      });

      slide.addText('재해유발요인 (Precursor)', {
        x: 0.65,
        y: 2.62,
        w: 4.05,
        h: 0.25,
        fontFace: FONT,
        fontSize: 10,
        bold: true,
        color: '92400E',
      });
      slide.addText(c.hazard_factor || c.direct_causes[0], {
        x: 0.65,
        y: 2.9,
        w: 4.05,
        h: 1.85,
        fontFace: FONT,
        fontSize: 10.5,
        color: '0F172A',
        valign: 'top',
      });

      // Right side: Category & O/X contrast
      slide.addShape(pptx.ShapeType.rect, {
        x: 5.1,
        y: 0.9,
        w: 4.45,
        h: 2.25,
        fill: { color: 'FFFFFF' },
        line: { color: '334155', width: 1 },
      });
      slide.addShape(pptx.ShapeType.rect, {
        x: 5.1,
        y: 0.9,
        w: 4.45,
        h: 0.44,
        fill: { color: '1E293B' },
        line: { color: '1E293B', width: 0 },
      });
      slide.addText('산재업종·기인물 분류 및 관리 포인트', {
        x: 5.27,
        y: 0.9,
        w: 4.1,
        h: 0.44,
        fontFace: FONT,
        fontSize: 11.5,
        bold: true,
        color: 'FFFFFF',
        valign: 'middle',
      });
      slide.addText(`• 공종·업종: ${c.process || c.industry}\n• 핵심 기인물: ${c.equipment}\n• 출처: ${c.source_ref}`, {
        x: 5.27,
        y: 1.48,
        w: 4.12,
        h: 1.5,
        fontFace: FONT,
        fontSize: 10.2,
        color: '1E293B',
        valign: 'top',
      });

      slide.addShape(pptx.ShapeType.rect, {
        x: 5.1,
        y: 3.32,
        w: 4.45,
        h: 1.63,
        fill: { color: 'F8FAFC' },
        line: { color: 'CBD5E1', width: 0.75 },
      });
      slide.addText('현장 관행 vs 안전 원칙 핵심 대비', {
        x: 5.27,
        y: 3.42,
        w: 4.1,
        h: 0.25,
        fontFace: FONT,
        fontSize: 10.5,
        bold: true,
        color: '0F172A',
      });
      slide.addText(`X  ${c.ox_comparison[0].wrong}`, {
        x: 5.27,
        y: 3.72,
        w: 4.1,
        h: 0.5,
        fontFace: FONT,
        fontSize: 9.8,
        color: 'B91C1C',
        valign: 'top',
      });
      slide.addText(`O  ${c.ox_comparison[0].right}`, {
        x: 5.27,
        y: 4.26,
        w: 4.1,
        h: 0.58,
        fontFace: FONT,
        fontSize: 9.8,
        bold: true,
        color: '15803D',
        valign: 'top',
      });
    } else {
      slide.addShape(pptx.ShapeType.rect, {
        x: 0.45,
        y: 0.9,
        w: 4.45,
        h: 4.05,
        fill: { color: 'FFFFFF' },
        line: { color: primaryAccentPptx, width: 1.2 },
      });
      slide.addShape(pptx.ShapeType.rect, {
        x: 0.45,
        y: 0.9,
        w: 4.45,
        h: 0.44,
        fill: { color: primaryAccentPptx },
        line: { color: primaryAccentPptx, width: 0 },
      });
      slide.addText('핵심 점검 위험요인 (불안전한 상태·행동)', {
        x: 0.62,
        y: 0.9,
        w: 4.1,
        h: 0.44,
        fontFace: FONT,
        fontSize: 12,
        bold: true,
        color: 'FFFFFF',
        valign: 'middle',
      });

      c.direct_causes.forEach((cause, idx) => {
        const yPos = 1.52 + idx * 1.1;
        slide.addShape(pptx.ShapeType.rect, {
          x: 0.62,
          y: yPos,
          w: 4.1,
          h: 0.94,
          fill: { color: theme.pptxSoftBg },
          line: { color: 'E2E8F0', width: 0.5 },
        });
        slide.addText(`위험요인 0${idx + 1}`, {
          x: 0.74,
          y: yPos + 0.08,
          w: 3.85,
          h: 0.22,
          fontFace: FONT,
          fontSize: 9.5,
          bold: true,
          color: primaryAccentPptx,
        });
        slide.addText(cause, {
          x: 0.74,
          y: yPos + 0.3,
          w: 3.85,
          h: 0.58,
          fontFace: FONT,
          fontSize: 10.2,
          color: '0F172A',
          valign: 'top',
        });
      });

      slide.addShape(pptx.ShapeType.rect, {
        x: 5.1,
        y: 0.9,
        w: 4.45,
        h: 2.32,
        fill: { color: 'FFFFFF' },
        line: { color: '334155', width: 1 },
      });
      slide.addShape(pptx.ShapeType.rect, {
        x: 5.1,
        y: 0.9,
        w: 4.45,
        h: 0.44,
        fill: { color: '1E293B' },
        line: { color: '1E293B', width: 0 },
      });
      slide.addText('관리적 근본 원인', {
        x: 5.27,
        y: 0.9,
        w: 4.1,
        h: 0.44,
        fontFace: FONT,
        fontSize: 12,
        bold: true,
        color: 'FFFFFF',
        valign: 'middle',
      });

      c.root_causes.forEach((root, idx) => {
        const yPos = 1.48 + idx * 0.82;
        slide.addText(`• ${root}`, {
          x: 5.27,
          y: yPos,
          w: 4.12,
          h: 0.72,
          fontFace: FONT,
          fontSize: 10.5,
          color: '1E293B',
          valign: 'top',
        });
      });

      slide.addShape(pptx.ShapeType.rect, {
        x: 5.1,
        y: 3.38,
        w: 4.45,
        h: 1.57,
        fill: { color: 'F8FAFC' },
        line: { color: 'CBD5E1', width: 0.75 },
      });
      slide.addText('핵심 관행 vs 원칙 한눈에 보기', {
        x: 5.27,
        y: 3.48,
        w: 4.1,
        h: 0.25,
        fontFace: FONT,
        fontSize: 10.5,
        bold: true,
        color: '0F172A',
      });
      slide.addText(`X  ${c.ox_comparison[0].wrong}`, {
        x: 5.27,
        y: 3.78,
        w: 4.1,
        h: 0.48,
        fontFace: FONT,
        fontSize: 9.8,
        color: 'B91C1C',
        valign: 'top',
      });
      slide.addText(`O  ${c.ox_comparison[0].right}`, {
        x: 5.27,
        y: 4.3,
        w: 4.1,
        h: 0.56,
        fontFace: FONT,
        fontSize: 9.8,
        bold: true,
        color: '15803D',
        valign: 'top',
      });
    }
  }

  // =========================================================================
  // SLIDE 4: 예방대책 / 위험성감소대책 (편집 반영 + 출처 표기 자동 전환) 및 유사공정
  // =========================================================================
  {
    const slide = pptx.addSlide();
    const slide4TitleBase =
      c.source_type === 'SIF' ? '03. SIF 위험성감소대책' : '03. 핵심 예방대책';
    addSlideChrome(
      slide,
      4,
      `${slide4TitleBase} [${measuresAttributionLabel}]${translations ? ` (${langLabel})` : ''}`
    );

    const leftW = relatedCase ? 5.95 : 9.1;
    const measures = c.preventive_measures.slice(0, 6);
    const count = Math.max(1, measures.length);
    const totalAvailH = 3.68;
    const gap = count >= 5 ? 0.06 : 0.08;
    const boxH = Math.min(0.95, (totalAvailH - gap * (count - 1)) / count);

    measures.forEach((measure, idx) => {
      const yPos = 0.84 + idx * (boxH + gap);
      slide.addShape(pptx.ShapeType.rect, {
        x: 0.45,
        y: yPos,
        w: leftW,
        h: boxH,
        fill: { color: 'FFFFFF' },
        line: { color: isMeasuresEdited ? 'D97706' : 'CBD5E1', width: 0.75 },
      });
      slide.addShape(pptx.ShapeType.rect, {
        x: 0.45,
        y: yPos,
        w: 0.5,
        h: boxH,
        fill: { color: primaryAccentPptx },
        line: { color: primaryAccentPptx, width: 0 },
      });
      slide.addText(`0${idx + 1}`, {
        x: 0.45,
        y: yPos,
        w: 0.5,
        h: boxH,
        fontFace: FONT,
        fontSize: count >= 5 ? 11 : 12.5,
        bold: true,
        color: 'FFFFFF',
        align: 'center',
        valign: 'middle',
      });

      const hasTransRow = Boolean(translations && translations.measures[idx] && count <= 4);
      slide.addText(measure, {
        x: 1.05,
        y: hasTransRow ? yPos + 0.05 : yPos + 0.04,
        w: leftW - 0.7,
        h: hasTransRow ? boxH * 0.54 : boxH - 0.08,
        fontFace: FONT,
        fontSize: count >= 5 ? 9.6 : hasTransRow ? 10.2 : 11,
        bold: true,
        color: '0F172A',
        valign: 'middle',
      });

      if (hasTransRow && translations) {
        slide.addText(translations.measures[idx], {
          x: 1.05,
          y: yPos + boxH * 0.55,
          w: leftW - 0.7,
          h: boxH * 0.4,
          fontFace: FONT,
          fontSize: 8.8,
          color: primaryAccentPptx,
          valign: 'top',
        });
      }
    });

    slide.addShape(pptx.ShapeType.rect, {
      x: 0.45,
      y: 4.64,
      w: leftW,
      h: 0.4,
      fill: { color: 'F1F5F9' },
      line: { color: 'CBD5E1', width: 0.5 },
    });
    slide.addText(`관련 법령: ${c.legal_ref}   |   대책 출처: ${measuresAttributionLabel}`, {
      x: 0.58,
      y: 4.64,
      w: leftW - 0.25,
      h: 0.4,
      fontFace: FONT,
      fontSize: 9.2,
      bold: true,
      color: '334155',
      valign: 'middle',
    });

    if (relatedCase) {
      const relatedSummary = formatCrossProcessSummaryVerbatim(relatedCase);
      slide.addShape(pptx.ShapeType.rect, {
        x: 6.6,
        y: 0.84,
        w: 2.95,
        h: 4.2,
        fill: { color: 'FFFBEB' },
        line: { color: 'F59E0B', width: 1.2 },
      });
      slide.addShape(pptx.ShapeType.rect, {
        x: 6.6,
        y: 0.84,
        w: 2.95,
        h: 0.42,
        fill: { color: 'B45309' },
        line: { color: 'B45309', width: 0 },
      });
      slide.addText('타 업종 유사 공정 주의 사례', {
        x: 6.72,
        y: 0.84,
        w: 2.7,
        h: 0.42,
        fontFace: FONT,
        fontSize: 10.8,
        bold: true,
        color: 'FFFFFF',
        valign: 'middle',
      });

      slide.addText(
        `${relatedCase.industry}  |  ${relatedCase.hazard_type}\n${relatedCase.work_type}`,
        {
          x: 6.74,
          y: 1.34,
          w: 2.68,
          h: 0.42,
          fontFace: FONT,
          fontSize: 9,
          bold: true,
          color: '92400E',
        }
      );

      slide.addText(relatedCase.title, {
        x: 6.74,
        y: 1.8,
        w: 2.68,
        h: 0.68,
        fontFace: FONT,
        fontSize: 10.2,
        bold: true,
        color: '0F172A',
        valign: 'top',
      });

      slide.addText(relatedSummary.text, {
        x: 6.74,
        y: 2.52,
        w: 2.68,
        h: 1.4,
        fontFace: FONT,
        fontSize: 9,
        color: '334155',
        valign: 'top',
      });

      slide.addShape(pptx.ShapeType.rect, {
        x: 6.72,
        y: 4.0,
        w: 2.71,
        h: 0.92,
        fill: { color: 'FFFFFF' },
        line: { color: 'FCD34D', width: 0.75 },
      });
      slide.addText(`핵심 교훈: ${relatedCase.preventive_measures[0] || ''}`, {
        x: 6.8,
        y: 4.06,
        w: 2.55,
        h: 0.8,
        fontFace: FONT,
        fontSize: 8.8,
        bold: true,
        color: '78350F',
        valign: 'top',
      });
    }
  }

  // =========================================================================
  // SLIDE 5: 5분 TBM 체크리스트 (편집 반영) + KYT 퀴즈 + 구호
  // =========================================================================
  {
    const slide = pptx.addSlide();
    const tbmAttr = isTbmEdited
      ? isOfficialKosha
        ? '공단 권고안 기반 · 현장 맞춤 반영'
        : '표준 가이드 기반 · 현장 맞춤 반영'
      : isOfficialKosha
        ? '공단 원문 가이드'
        : '표준 가이드';
    addSlideChrome(slide, 5, `04. 작업 전 5분 TBM 체크리스트 [${tbmAttr}] 및 KYT 퀴즈`);

    slide.addShape(pptx.ShapeType.rect, {
      x: 0.45,
      y: 0.86,
      w: 5.25,
      h: 4.15,
      fill: { color: 'FFFFFF' },
      line: { color: 'CBD5E1', width: 0.75 },
    });
    slide.addShape(pptx.ShapeType.rect, {
      x: 0.45,
      y: 0.86,
      w: 5.25,
      h: 0.42,
      fill: { color: '0F172A' },
      line: { color: '0F172A', width: 0 },
    });
    slide.addText(`작업 전 5분 TBM 필수 점검 항목 (${tbmAttr})`, {
      x: 0.6,
      y: 0.86,
      w: 4.95,
      h: 0.42,
      fontFace: FONT,
      fontSize: 10.8,
      bold: true,
      color: 'FFFFFF',
      valign: 'middle',
    });

    const tbmItems = c.tbm_checklist.slice(0, 7);
    const tbmRowStep = Math.min(0.68, 3.55 / Math.max(1, tbmItems.length));
    tbmItems.forEach((item, idx) => {
      const yPos = 1.38 + idx * tbmRowStep;
      slide.addShape(pptx.ShapeType.rect, {
        x: 0.62,
        y: yPos + 0.08,
        w: 0.2,
        h: 0.2,
        fill: { color: 'FFFFFF' },
        line: { color: primaryAccentPptx, width: 1.3 },
      });
      slide.addText(`${idx + 1}. ${item}`, {
        x: 0.92,
        y: yPos,
        w: 4.65,
        h: tbmRowStep - 0.04,
        fontFace: FONT,
        fontSize: tbmItems.length >= 6 ? 9.4 : 10.2,
        color: '1E293B',
        valign: 'middle',
      });
    });

    slide.addShape(pptx.ShapeType.rect, {
      x: 5.9,
      y: 0.86,
      w: 3.65,
      h: 2.95,
      fill: { color: theme.pptxSoftBg },
      line: { color: primaryAccentPptx, width: 1 },
    });
    slide.addShape(pptx.ShapeType.rect, {
      x: 5.9,
      y: 0.86,
      w: 3.65,
      h: 0.42,
      fill: { color: primaryAccentPptx },
      line: { color: primaryAccentPptx, width: 0 },
    });
    slide.addText('현장 위험예지(KYT) 토의 질문', {
      x: 6.05,
      y: 0.86,
      w: 3.35,
      h: 0.42,
      fontFace: FONT,
      fontSize: 11.2,
      bold: true,
      color: 'FFFFFF',
      valign: 'middle',
    });

    slide.addText(`Q. ${c.kyt_quiz.question}`, {
      x: 6.05,
      y: 1.36,
      w: 3.35,
      h: 0.82,
      fontFace: FONT,
      fontSize: 9.8,
      bold: true,
      color: '0F172A',
      valign: 'top',
    });

    c.kyt_quiz.answers.forEach((ans, idx) => {
      slide.addText(`✔ ${idx + 1}) ${ans}`, {
        x: 6.05,
        y: 2.24 + idx * 0.5,
        w: 3.35,
        h: 0.46,
        fontFace: FONT,
        fontSize: 9,
        color: '334155',
        valign: 'top',
      });
    });

    slide.addShape(pptx.ShapeType.rect, {
      x: 5.9,
      y: 3.94,
      w: 3.65,
      h: 1.07,
      fill: { color: '0F172A' },
      line: { color: primaryAccentPptx, width: 1.2 },
    });
    slide.addText(
      translations ? `작업 전 다 함께 복창 (${langLabel})` : '작업 전 다 함께 외치는 안전구호',
      {
        x: 6.05,
        y: 4.0,
        w: 3.35,
        h: 0.2,
        fontFace: FONT,
        fontSize: 8.8,
        bold: true,
        color: 'FACC15',
      }
    );
    slide.addText(`“${c.worker_slogan}”`, {
      x: 6.05,
      y: 4.2,
      w: 3.35,
      h: translations ? 0.4 : 0.72,
      fontFace: FONT,
      fontSize: translations ? 10 : 11,
      bold: true,
      color: 'FFFFFF',
      valign: 'middle',
    });
    if (translations) {
      slide.addText(translations.slogan, {
        x: 6.05,
        y: 4.6,
        w: 3.35,
        h: 0.36,
        fontFace: FONT,
        fontSize: 8.4,
        bold: true,
        color: 'FDE68A',
        valign: 'top',
      });
    } else if (seasonTrans) {
      slide.addText(seasonTrans, {
        x: 6.05,
        y: 4.68,
        w: 3.35,
        h: 0.28,
        fontFace: FONT,
        fontSize: 8,
        color: 'CBD5E1',
      });
    }
  }

  const fileName = `안전교육자료_${sanitizeFileName(material.selectedIndustry)}_${sanitizeFileName(material.selectedWorkType)}_${dateLabel}.pptx`;
  await pptx.writeFile({ fileName });
  return fileName;
}
