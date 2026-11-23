import PptxGenJS from 'pptxgenjs';
import { CustomSiteInfo, GeneratedMaterial } from '../types/safety';
import {
  getCaseTranslations,
  getForeignLanguageNativeLabel,
  getSeasonalTranslation,
} from '../data/multilingualDict';
import { SEASONAL_RISKS } from '../data/seasonalRisks';

const FONT = 'Malgun Gothic';

function sanitizeFileName(text: string): string {
  return text.replace(/[\\/:*?"<>|\s·]+/g, '_').replace(/_+/g, '_').slice(0, 42);
}

/**
 * Generates an editable 5-slide 16:9 PowerPoint presentation (.pptx)
 * using pptxgenjs completely client-side with zero external API calls.
 * Supports multilingual subtitles, seasonal risk warnings, and embedded site logo PNG.
 */
export async function downloadSafetyPptx(
  material: GeneratedMaterial,
  siteInfo: CustomSiteInfo
): Promise<string> {
  const pptx = new PptxGenJS();
  pptx.layout = 'LAYOUT_16x9'; // 10 x 5.625 inches
  pptx.author = siteInfo.instructorName || '산업안전보건 교육담당자';
  pptx.company = siteInfo.siteName || '현장 안전보건관리팀';
  pptx.title = `${material.selectedWorkType} 안전보건교육자료`;
  pptx.subject = `${material.selectedIndustry} · ${material.primaryCase.hazard_type} 재해예방`;

  const { primaryCase: c, relatedCase, theme, isExactMatch } = material;
  const siteLabel = siteInfo.siteName.trim() || '________________';
  const dateLabel = siteInfo.educationDate || new Date().toISOString().slice(0, 10);
  const instructorLabel = siteInfo.instructorName.trim() || '________________';

  const translations = getCaseTranslations(c, siteInfo.foreignLanguage);
  const langLabel = getForeignLanguageNativeLabel(siteInfo.foreignLanguage);
  const season = SEASONAL_RISKS[siteInfo.seasonRisk];
  const seasonTrans = getSeasonalTranslation(siteInfo.seasonRisk, siteInfo.foreignLanguage);

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

    // Top Navy Header Bar
    slide.addShape(pptx.ShapeType.rect, {
      x: 0,
      y: 0,
      w: 10,
      h: 0.62,
      fill: { color: '0F172A' },
      line: { color: '0F172A', width: 0 },
    });

    // Safety accent underline
    slide.addShape(pptx.ShapeType.rect, {
      x: 0,
      y: 0.62,
      w: 10,
      h: 0.06,
      fill: { color: theme.pptxPrimary },
      line: { color: theme.pptxPrimary, width: 0 },
    });

    // Section title left
    slide.addText(sectionTitle, {
      x: 0.45,
      y: 0.12,
      w: 6.8,
      h: 0.4,
      fontFace: FONT,
      fontSize: 15.5,
      bold: true,
      color: 'FFFFFF',
      valign: 'middle',
    });

    // Hazard type indicator right
    slide.addShape(pptx.ShapeType.rect, {
      x: 7.75,
      y: 0.14,
      w: 1.85,
      h: 0.34,
      fill: { color: theme.pptxPrimary },
      line: { color: theme.pptxPrimary, width: 0 },
    });
    slide.addText(`${c.hazard_type} 예방교육`, {
      x: 7.75,
      y: 0.14,
      w: 1.85,
      h: 0.34,
      fontFace: FONT,
      fontSize: 10.5,
      bold: true,
      color: 'FFFFFF',
      align: 'center',
      valign: 'middle',
    });

    // Footer divider & metadata
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

    slide.addText(
      `현장: ${siteLabel}  |  ${material.selectedIndustry} · ${material.selectedWorkType}  |  ${dateLabel}`,
      {
        x: textStartX,
        y: 5.24,
        w: 8.4 - textStartX,
        h: 0.28,
        fontFace: FONT,
        fontSize: 9,
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
      fill: { color: theme.pptxPrimary },
      line: { color: theme.pptxPrimary, width: 0 },
    });

    slide.addShape(pptx.ShapeType.rect, {
      x: 7.55,
      y: 0.22,
      w: 2.45,
      h: 5.405,
      fill: { color: '1E293B' },
      line: { color: '1E293B', width: 0 },
    });

    // Optional Seasonal Alert Ribbon at top-left
    let currentY = 0.52;
    if (season.id !== 'always') {
      slide.addShape(pptx.ShapeType.rect, {
        x: 0.55,
        y: currentY,
        w: 6.65,
        h: 0.42,
        fill: { color: season.pptxBadge },
        line: { color: season.pptxBadge, width: 0 },
      });
      slide.addText(`[${season.badgeText}]  ${season.extraRule}`, {
        x: 0.65,
        y: currentY,
        w: 6.45,
        h: 0.42,
        fontFace: FONT,
        fontSize: 9.2,
        bold: true,
        color: 'FFFFFF',
        valign: 'middle',
      });
      currentY += 0.52;
    }

    // Industry / Work Type Header Tag
    slide.addShape(pptx.ShapeType.rect, {
      x: 0.55,
      y: currentY,
      w: 4.9,
      h: 0.38,
      fill: { color: theme.pptxPrimary },
      line: { color: theme.pptxPrimary, width: 0 },
    });
    slide.addText(`${material.selectedIndustry}  |  ${material.selectedWorkType}`, {
      x: 0.65,
      y: currentY,
      w: 4.7,
      h: 0.38,
      fontFace: FONT,
      fontSize: 11.5,
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

    // Main Accident Title
    slide.addText(c.title, {
      x: 0.55,
      y: currentY,
      w: 6.7,
      h: 1.45,
      fontFace: FONT,
      fontSize: season.id !== 'always' ? 22 : 24,
      bold: true,
      color: 'FFFFFF',
      valign: 'top',
      breakLine: true,
    });

    // Mode & Equipment subtitle
    slide.addText(`중점 기인물: ${c.equipment}   |   교육 구성: ${material.perspectiveLabel}`, {
      x: 0.55,
      y: 3.2,
      w: 6.7,
      h: 0.36,
      fontFace: FONT,
      fontSize: 10.8,
      color: 'CBD5E1',
      valign: 'middle',
    });

    // Worker Slogan Highlight Box (with optional bilingual slogan)
    slide.addShape(pptx.ShapeType.rect, {
      x: 0.55,
      y: 3.68,
      w: 6.65,
      h: translations ? 1.24 : 0.94,
      fill: { color: '1E293B' },
      line: { color: theme.pptxPrimary, width: 1.5 },
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
      fontSize: 14.5,
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
        fontSize: 10.5,
        bold: true,
        color: 'FDE68A',
        valign: 'top',
      });
    }

    // Right panel metadata block + Logo
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
      fill: { color: theme.pptxPrimary },
      line: { color: theme.pptxPrimary, width: 0 },
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
  // SLIDE 2: 사고 재구성 (3줄 요약 + 4단계 타임라인)
  // =========================================================================
  {
    const slide = pptx.addSlide();
    addSlideChrome(slide, 2, '01. 중대재해 사고 재구성 및 발생 경위');

    slide.addShape(pptx.ShapeType.rect, {
      x: 0.45,
      y: 0.85,
      w: 9.1,
      h: 1.62,
      fill: { color: 'F8FAFC' },
      line: { color: 'CBD5E1', width: 0.75 },
    });

    slide.addText(`사고 개요 3줄 요약  (${c.equipment})`, {
      x: 0.62,
      y: 0.94,
      w: 8.7,
      h: 0.28,
      fontFace: FONT,
      fontSize: 11.5,
      bold: true,
      color: theme.pptxPrimary,
    });

    c.summary_3lines.forEach((line, idx) => {
      slide.addText(`${idx + 1}. ${line}`, {
        x: 0.62,
        y: 1.24 + idx * 0.39,
        w: 8.75,
        h: 0.37,
        fontFace: FONT,
        fontSize: 10.5,
        color: '1E293B',
        valign: 'middle',
      });
    });

    slide.addText('사고 발생 4단계 메커니즘', {
      x: 0.45,
      y: 2.65,
      w: 9.1,
      h: 0.3,
      fontFace: FONT,
      fontSize: 12.5,
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
        y: 3.02,
        w: cardW,
        h: 1.98,
        fill: { color: isLast ? 'ECFDF5' : 'FFFFFF' },
        line: { color: isLast ? '059669' : 'CBD5E1', width: isLast ? 1.5 : 0.75 },
      });

      slide.addShape(pptx.ShapeType.rect, {
        x: xPos,
        y: 3.02,
        w: cardW,
        h: 0.36,
        fill: { color: isLast ? '047857' : '1E293B' },
        line: { color: isLast ? '047857' : '1E293B', width: 0 },
      });

      slide.addText(isLast ? `${step.step} · 예방 핵심` : `${step.step} · ${step.label}`, {
        x: xPos + 0.08,
        y: 3.02,
        w: cardW - 0.16,
        h: 0.36,
        fontFace: FONT,
        fontSize: 10.5,
        bold: true,
        color: 'FFFFFF',
        valign: 'middle',
      });

      slide.addText(step.detail, {
        x: xPos + 0.12,
        y: 3.48,
        w: cardW - 0.24,
        h: 1.42,
        fontFace: FONT,
        fontSize: 10.5,
        color: '1E293B',
        valign: 'top',
      });

      if (!isLast) {
        slide.addShape(pptx.ShapeType.rightArrow, {
          x: xPos + cardW + 0.05,
          y: 3.88,
          w: 0.16,
          h: 0.24,
          fill: { color: theme.pptxPrimary },
          line: { color: theme.pptxPrimary, width: 0 },
        });
      }
    });
  }

  // =========================================================================
  // SLIDE 3: 원인 분석 또는 O/X 비교
  // =========================================================================
  {
    const slide = pptx.addSlide();
    const showOX = material.perspectiveMode === 'ox_compare';

    addSlideChrome(
      slide,
      3,
      showOX
        ? '02. 잘못된 현장 관행(X) vs 안전 원칙(O) 대조'
        : '02. 직접원인 및 관리적 근본원인 분석'
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
          fontSize: 11.5,
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
          fontSize: 11.5,
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
    } else {
      slide.addShape(pptx.ShapeType.rect, {
        x: 0.45,
        y: 0.9,
        w: 4.45,
        h: 4.05,
        fill: { color: 'FFFFFF' },
        line: { color: theme.pptxPrimary, width: 1.2 },
      });
      slide.addShape(pptx.ShapeType.rect, {
        x: 0.45,
        y: 0.9,
        w: 4.45,
        h: 0.44,
        fill: { color: theme.pptxPrimary },
        line: { color: theme.pptxPrimary, width: 0 },
      });
      slide.addText('직접 원인 (불안전한 상태·행동)', {
        x: 0.62,
        y: 0.9,
        w: 4.1,
        h: 0.44,
        fontFace: FONT,
        fontSize: 12.5,
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
        slide.addText(`원인 0${idx + 1}`, {
          x: 0.74,
          y: yPos + 0.08,
          w: 3.85,
          h: 0.22,
          fontFace: FONT,
          fontSize: 9.5,
          bold: true,
          color: theme.pptxPrimary,
        });
        slide.addText(cause, {
          x: 0.74,
          y: yPos + 0.3,
          w: 3.85,
          h: 0.58,
          fontFace: FONT,
          fontSize: 10.5,
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
      slide.addText('근본 원인 (관리적·시스템 미흡)', {
        x: 5.27,
        y: 0.9,
        w: 4.1,
        h: 0.44,
        fontFace: FONT,
        fontSize: 12.5,
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
  // SLIDE 4: 핵심 예방대책 (다국어 병기 지원) 및 유사공정 경고
  // =========================================================================
  {
    const slide = pptx.addSlide();
    addSlideChrome(
      slide,
      4,
      translations
        ? `03. 4대 핵심 예방대책 (${langLabel} 병기) 및 유사공정 주의 사례`
        : '03. 4대 핵심 예방대책 및 유사공정 주의 사례'
    );

    const leftW = relatedCase ? 5.95 : 9.1;

    c.preventive_measures.forEach((measure, idx) => {
      const yPos = 0.84 + idx * 0.92;
      const boxH = 0.84;
      slide.addShape(pptx.ShapeType.rect, {
        x: 0.45,
        y: yPos,
        w: leftW,
        h: boxH,
        fill: { color: 'FFFFFF' },
        line: { color: 'CBD5E1', width: 0.75 },
      });
      slide.addShape(pptx.ShapeType.rect, {
        x: 0.45,
        y: yPos,
        w: 0.52,
        h: boxH,
        fill: { color: theme.pptxPrimary },
        line: { color: theme.pptxPrimary, width: 0 },
      });
      slide.addText(`0${idx + 1}`, {
        x: 0.45,
        y: yPos,
        w: 0.52,
        h: boxH,
        fontFace: FONT,
        fontSize: 13,
        bold: true,
        color: 'FFFFFF',
        align: 'center',
        valign: 'middle',
      });

      if (translations) {
        slide.addText(measure, {
          x: 1.06,
          y: yPos + 0.05,
          w: leftW - 0.7,
          h: 0.4,
          fontFace: FONT,
          fontSize: 9.8,
          bold: true,
          color: '0F172A',
          valign: 'top',
        });
        slide.addText(translations.measures[idx], {
          x: 1.06,
          y: yPos + 0.45,
          w: leftW - 0.7,
          h: 0.35,
          fontFace: FONT,
          fontSize: 8.6,
          color: theme.pptxPrimary,
          valign: 'top',
        });
      } else {
        slide.addText(measure, {
          x: 1.08,
          y: yPos + 0.06,
          w: leftW - 0.74,
          h: 0.72,
          fontFace: FONT,
          fontSize: 10.5,
          bold: true,
          color: '0F172A',
          valign: 'middle',
        });
      }
    });

    // Legal reference strip
    slide.addShape(pptx.ShapeType.rect, {
      x: 0.45,
      y: 4.56,
      w: leftW,
      h: 0.48,
      fill: { color: 'F1F5F9' },
      line: { color: 'CBD5E1', width: 0.75 },
    });
    slide.addText(`관련 법령: ${c.legal_ref}`, {
      x: 0.6,
      y: 4.56,
      w: leftW - 0.3,
      h: 0.48,
      fontFace: FONT,
      fontSize: 9.5,
      bold: true,
      color: '334155',
      valign: 'middle',
    });

    // Cross-process warning box
    if (relatedCase) {
      slide.addShape(pptx.ShapeType.rect, {
        x: 6.6,
        y: 0.84,
        w: 2.95,
        h: 4.2,
        fill: { color: 'FFFBEB' },
        line: { color: 'D97706', width: 1.2 },
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
        fontSize: 11,
        bold: true,
        color: 'FFFFFF',
        valign: 'middle',
      });

      slide.addText(`${relatedCase.industry} · ${relatedCase.hazard_type} · ${relatedCase.work_type}`, {
        x: 6.74,
        y: 1.36,
        w: 2.66,
        h: 0.32,
        fontFace: FONT,
        fontSize: 9.2,
        bold: true,
        color: '92400E',
      });

      slide.addText(relatedCase.title, {
        x: 6.74,
        y: 1.72,
        w: 2.66,
        h: 0.78,
        fontFace: FONT,
        fontSize: 10.8,
        bold: true,
        color: '0F172A',
        valign: 'top',
      });

      slide.addText(relatedCase.summary_3lines.filter(Boolean).join(' '), {
        x: 6.74,
        y: 2.54,
        w: 2.66,
        h: 1.28,
        fontFace: FONT,
        fontSize: 9.0,
        color: '334155',
        valign: 'top',
      });

      slide.addShape(pptx.ShapeType.rect, {
        x: 6.74,
        y: 3.92,
        w: 2.66,
        h: 0.98,
        fill: { color: 'FFFFFF' },
        line: { color: 'FCD34D', width: 0.75 },
      });
      slide.addText(`교훈: ${relatedCase.preventive_measures[0]}`, {
        x: 6.84,
        y: 3.98,
        w: 2.46,
        h: 0.86,
        fontFace: FONT,
        fontSize: 9.5,
        bold: true,
        color: '78350F',
        valign: 'middle',
      });
    }
  }

  // =========================================================================
  // SLIDE 5: 작업 전 5분 TBM 체크리스트 & KYT 퀴즈
  // =========================================================================
  {
    const slide = pptx.addSlide();
    addSlideChrome(slide, 5, '04. 작업 전 5분 TBM 체크리스트 및 위험예지(KYT) 퀴즈');

    slide.addShape(pptx.ShapeType.rect, {
      x: 0.45,
      y: 0.86,
      w: 5.0,
      h: 4.18,
      fill: { color: 'FFFFFF' },
      line: { color: 'CBD5E1', width: 0.75 },
    });
    slide.addShape(pptx.ShapeType.rect, {
      x: 0.45,
      y: 0.86,
      w: 5.0,
      h: 0.42,
      fill: { color: '0F172A' },
      line: { color: '0F172A', width: 0 },
    });
    slide.addText('작업 전 5분 TBM 필수 점검 항목 (5개)', {
      x: 0.62,
      y: 0.86,
      w: 4.65,
      h: 0.42,
      fontFace: FONT,
      fontSize: 11.5,
      bold: true,
      color: 'FFFFFF',
      valign: 'middle',
    });

    c.tbm_checklist.forEach((item, idx) => {
      const yPos = 1.4 + idx * 0.69;
      slide.addShape(pptx.ShapeType.rect, {
        x: 0.62,
        y: yPos + 0.08,
        w: 0.24,
        h: 0.24,
        fill: { color: 'FFFFFF' },
        line: { color: theme.pptxPrimary, width: 1.5 },
      });
      slide.addText(`${idx + 1}. ${item}`, {
        x: 0.96,
        y: yPos,
        w: 4.35,
        h: 0.6,
        fontFace: FONT,
        fontSize: 10.2,
        color: '1E293B',
        valign: 'top',
      });
    });

    // Right: KYT Field Quiz
    const quizH = translations ? 2.86 : 3.16;
    slide.addShape(pptx.ShapeType.rect, {
      x: 5.65,
      y: 0.86,
      w: 3.9,
      h: quizH,
      fill: { color: theme.pptxSoftBg },
      line: { color: theme.pptxPrimary, width: 1.2 },
    });
    slide.addShape(pptx.ShapeType.rect, {
      x: 5.65,
      y: 0.86,
      w: 3.9,
      h: 0.4,
      fill: { color: theme.pptxPrimary },
      line: { color: theme.pptxPrimary, width: 0 },
    });
    slide.addText('현장 위험예지(KYT) 토의 질문', {
      x: 5.8,
      y: 0.86,
      w: 3.6,
      h: 0.4,
      fontFace: FONT,
      fontSize: 11.2,
      bold: true,
      color: 'FFFFFF',
      valign: 'middle',
    });

    slide.addText(`Q. ${c.kyt_quiz.question}`, {
      x: 5.8,
      y: 1.34,
      w: 3.6,
      h: 0.65,
      fontFace: FONT,
      fontSize: 10.2,
      bold: true,
      color: '0F172A',
      valign: 'top',
    });

    c.kyt_quiz.answers.forEach((ans, idx) => {
      slide.addText(`✔ ${idx + 1}) ${ans}`, {
        x: 5.8,
        y: 2.04 + idx * (translations ? 0.52 : 0.58),
        w: 3.6,
        h: 0.5,
        fontFace: FONT,
        fontSize: 9.4,
        color: '1E293B',
        valign: 'top',
      });
    });

    // Right Bottom: Worker Slogan callout (with bilingual slogan & seasonal reminder if active)
    const sloganY = translations ? 3.84 : 4.14;
    const sloganH = translations ? 1.2 : 0.9;
    slide.addShape(pptx.ShapeType.rect, {
      x: 5.65,
      y: sloganY,
      w: 3.9,
      h: sloganH,
      fill: { color: '0F172A' },
      line: { color: '0F172A', width: 0 },
    });
    slide.addText(
      translations ? `안전구호 (${langLabel} 병기)` : '작업 전 다 함께 외치는 안전구호',
      {
        x: 5.8,
        y: sloganY + 0.06,
        w: 3.6,
        h: 0.2,
        fontFace: FONT,
        fontSize: 8.5,
        bold: true,
        color: 'FACC15',
      }
    );
    slide.addText(`“${c.worker_slogan}”`, {
      x: 5.8,
      y: sloganY + 0.27,
      w: 3.6,
      h: 0.42,
      fontFace: FONT,
      fontSize: 10.5,
      bold: true,
      color: 'FFFFFF',
      valign: 'middle',
    });
    if (translations) {
      slide.addText(translations.slogan, {
        x: 5.8,
        y: sloganY + 0.72,
        w: 3.6,
        h: 0.42,
        fontFace: FONT,
        fontSize: 8.8,
        color: 'FDE68A',
        valign: 'top',
      });
    } else if (seasonTrans) {
      slide.addText(seasonTrans, {
        x: 5.8,
        y: sloganY + 0.68,
        w: 3.6,
        h: 0.2,
        fontFace: FONT,
        fontSize: 7.5,
        color: 'CBD5E1',
      });
    }
  }

  const fileName = `안전교육_${sanitizeFileName(material.selectedWorkType)}_${dateLabel}.pptx`;
  await pptx.writeFile({ fileName });
  return fileName;
}
