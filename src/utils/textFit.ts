import { AccidentCase, SourceBrandStyle, SOURCE_BRAND_STYLES, SourceType } from '../types/safety';

export interface OverviewFitResult {
  fontSizeCss: string;
  lineHeightCss: number;
  tierLabel: '10.5pt' | '9.5pt' | '8.8pt';
  displayText: string;
  fullText: string;
  isExcerpted: boolean;
}

/**
 * Splits Korean text strictly at sentence boundaries (e.g., '.', '다.', '임.', '됨.', '사망')
 * without modifying or summarizing a single character of the original sentence.
 */
export function splitKoreanSentencesVerbatim(rawText: string): string[] {
  const normalized = (rawText || '').trim();
  if (!normalized) return [];

  // Split after period followed by space (avoiding date numbers like '2026. 11. 23.' or section '1.2.')
  const parts = normalized
    .split(/(?<=[가-힣a-zA-Z)%\]』])\.\s+/)
    .map((seg, idx, arr) => {
      const s = seg.trim();
      if (!s) return '';
      if (idx < arr.length - 1 && !s.endsWith('.')) {
        return `${s}.`;
      }
      return s;
    })
    .filter(Boolean);

  if (parts.length > 1) {
    return parts;
  }

  // Secondary split at Korean formal clause endings when a multi-sentence report omits periods
  const clauseParts = normalized
    .split(/(?<=(?:사망함|발생함|매몰됨|추락함|깔림|끼임|맞음|감전됨|재해임|사망))\s+(?=[가-힣0-9‘'(\[※*])/)
    .map((s) => s.trim())
    .filter(Boolean);

  return clauseParts.length > 0 ? clauseParts : [normalized];
}

/**
 * Implements 3-stage dynamic typography ('10.5pt' -> '9.5pt' -> '8.8pt') to fit A4 1-page
 * slot budget without CSS line-clamp or '...' mid-sentence truncation.
 * Only when text exceeds `maxCharsThreshold` (default 230 chars) at minimum 8.8pt font,
 * extracts the first 2~3 complete sentences verbatim and sets `isExcerpted = true`.
 */
export function fitFactualOverviewForA4(
  rawText: string,
  extraModuleCount = 0,
  expandFullOnWeb = false,
  maxCharsThreshold = 230
): OverviewFitResult {
  const fullText = (rawText || '').trim();
  const effectiveLen = fullText.length + extraModuleCount * 28;

  let fontSizeCss = '10.5pt';
  let lineHeightCss = 1.42;
  let tierLabel: '10.5pt' | '9.5pt' | '8.8pt' = '10.5pt';

  if (effectiveLen > 185) {
    fontSizeCss = '8.8pt';
    lineHeightCss = 1.3;
    tierLabel = '8.8pt';
  } else if (effectiveLen > 125) {
    fontSizeCss = '9.5pt';
    lineHeightCss = 1.36;
    tierLabel = '9.5pt';
  }

  const budgetChars = Math.max(175, maxCharsThreshold - extraModuleCount * 18);

  if (expandFullOnWeb || fullText.length <= budgetChars) {
    return {
      fontSizeCss,
      lineHeightCss,
      tierLabel,
      displayText: fullText,
      fullText,
      isExcerpted: false,
    };
  }

  const sentences = splitKoreanSentencesVerbatim(fullText);
  if (sentences.length > 1) {
    const picked: string[] = [];
    let currentLen = 0;
    for (let i = 0; i < Math.min(3, sentences.length); i++) {
      const next = sentences[i];
      if (picked.length >= 1 && currentLen + next.length + 1 > budgetChars + 35) {
        break;
      }
      picked.push(next);
      currentLen += next.length + 1;
    }
    const joined = picked.join(' ').trim();
    if (joined && joined.length < fullText.length) {
      return {
        fontSizeCss: '8.8pt',
        lineHeightCss: 1.3,
        tierLabel: '8.8pt',
        displayText: joined,
        fullText,
        isExcerpted: true,
      };
    }
  }

  // Single ultra-long unpunctuated paragraph (>230 chars): cut ONLY at natural Korean clause boundary, never '...'
  if (fullText.length > budgetChars + 40) {
    const windowSlice = fullText.slice(0, budgetChars + 30);
    const clauseMatch = windowSlice.match(
      /^(.+?(?:현장에서|공장에서|사업장에서|창고에서|작업\s*중|이동\s*중|과정에서|하던\s*중|사망함|발생함|추락|끼임|깔림|맞음|매몰됨))(?=\s|$)/
    );
    if (clauseMatch && clauseMatch[1].length >= 90 && clauseMatch[1].length < fullText.length) {
      return {
        fontSizeCss: '8.8pt',
        lineHeightCss: 1.3,
        tierLabel: '8.8pt',
        displayText: clauseMatch[1].trim(),
        fullText,
        isExcerpted: true,
      };
    }
  }

  return {
    fontSizeCss: '8.8pt',
    lineHeightCss: 1.3,
    tierLabel: '8.8pt',
    displayText: fullText,
    fullText,
    isExcerpted: false,
  };
}

/**
 * Returns up to 2 complete sentences for Section 03 (Cross-Process Warning) without '...' truncation.
 */
export function formatCrossProcessSummaryVerbatim(c: AccidentCase): {
  text: string;
  isExcerpted: boolean;
} {
  const raw = (c.overview_raw || c.summary_3lines.filter(Boolean).join(' ')).trim();
  if (raw.length <= 155) {
    return { text: raw, isExcerpted: false };
  }
  const sentences = splitKoreanSentencesVerbatim(raw);
  if (sentences.length >= 2) {
    const two = sentences.slice(0, 2).join(' ').trim();
    if (two.length <= 185) {
      return { text: two, isExcerpted: two.length < raw.length };
    }
    return { text: sentences[0], isExcerpted: true };
  }
  return { text: raw, isExcerpted: false };
}

export interface HighlightSegment {
  text: string;
  emphasized: boolean;
}

/**
 * Parses SIF `disasterFactor` so phrases wrapped in double corner brackets (`『...』`)
 * can be highlighted with inline `<strong>` while keeping 100% of the verbatim text.
 */
export function splitSifBracketHighlights(rawText: string): HighlightSegment[] {
  const src = rawText || '';
  if (!src.includes('『')) {
    return [{ text: src, emphasized: false }];
  }
  const parts = src.split(/(『[^』]+』)/g).filter(Boolean);
  return parts.map((part) => ({
    text: part,
    emphasized: part.startsWith('『') && part.endsWith('』'),
  }));
}

export function getCaseOverviewVerbatim(c: AccidentCase): string {
  if (c.overview_raw && c.overview_raw.trim()) {
    return c.overview_raw.trim();
  }
  return c.summary_3lines.filter(Boolean).join(' ').trim();
}

export function getSourceBrandStyle(c: AccidentCase): SourceBrandStyle {
  const st: SourceType = c.source_type || 'CASE';
  return SOURCE_BRAND_STYLES[st] || SOURCE_BRAND_STYLES.CASE;
}

export function formatOccurredDateLabel(occurredDate?: string): string {
  if (!occurredDate) return '';
  return occurredDate.replace(/-/g, '.');
}

export function formatSourceHeaderBadge(c: AccidentCase): string {
  const st: SourceType = c.source_type || 'CASE';
  const dateDot = formatOccurredDateLabel(c.occurred_date);
  if (st === 'FATALITY') {
    const parts = ['최신 사망속보'];
    if (dateDot) parts.push(dateDot);
    if (c.region) parts.push(c.region);
    return parts.join(' · ');
  }
  if (st === 'SIF') {
    return dateDot ? `공단 SIF 공식 분석 · ${dateDot}` : '공단 SIF 공식 분석';
  }
  if (c.source === 'custom') {
    return '사업장 등록 사고사례';
  }
  return dateDot ? `유사 재해사례 · ${dateDot}` : '유사 재해사례';
}

export function isOccurredWithinDays(occurredDate?: string, days = 30): boolean {
  if (!occurredDate || !/^\d{4}-\d{2}-\d{2}$/.test(occurredDate)) {
    return false;
  }
  const [y, m, d] = occurredDate.split('-').map(Number);
  const dt = new Date(y, m - 1, d);
  if (Number.isNaN(dt.getTime())) return false;
  const now = new Date();
  const diffMs = now.getTime() - dt.getTime();
  // Allow slight timezone ahead tolerance (-2 days) up to `days`
  return diffMs >= -2 * 86400_000 && diffMs <= days * 86400_000;
}
