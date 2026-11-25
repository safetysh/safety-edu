import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Download,
  Image as ImageIcon,
  Printer,
  ShieldCheck,
  CheckCircle2,
  AlertCircle,
  Loader2,
  X,
} from 'lucide-react';
import { SEED_ACCIDENT_CASES } from './data/seedCases';
import {
  AccidentCase,
  CustomSiteInfo,
  GeneratedMaterial,
  INDUSTRY_WORK_TYPES,
  IndustryType,
  OutputFormat,
  VariationOption,
} from './types/safety';
import {
  GenerationHistoryState,
  generateEducationMaterial,
  parseCasesData,
  parseUploadedCasesJson,
} from './engine/generator';
import { ControlSidebar } from './components/ControlSidebar';
import { OpsSheetView } from './components/OpsSheetView';
import { SlideDeckView } from './components/SlideDeckView';
import { CardNewsView } from './components/CardNewsView';
import {
  downloadNodeAsPng,
  downloadSampleCaseTemplate,
  normalizeLogoFileToDataUrl,
} from './utils/exportImage';
import { getForeignLanguageNativeLabel } from './data/multilingualDict';
import { SEASONAL_RISKS } from './data/seasonalRisks';

function getTodayDateString(): string {
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, '0');
  const d = String(now.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

function mergeBuiltinAndCustomCases(
  koshaCases: AccidentCase[],
  existingDb: AccidentCase[]
): AccidentCase[] {
  const customUploaded = existingDb.filter((c) => c.source === 'custom');
  const mergedMap = new Map<string, AccidentCase>();
  for (const item of SEED_ACCIDENT_CASES) {
    mergedMap.set(item.id, item);
  }
  for (const item of koshaCases) {
    mergedMap.set(item.id, item);
  }
  for (const item of customUploaded) {
    mergedMap.set(item.id, item);
  }
  return Array.from(mergedMap.values());
}

interface ToastState {
  type: 'success' | 'error';
  message: string;
}

export default function App() {
  const [casesDb, setCasesDb] = useState<AccidentCase[]>(SEED_ACCIDENT_CASES);
  const [industry, setIndustry] = useState<IndustryType>('건설현장');
  const [workType, setWorkType] = useState<string>(INDUSTRY_WORK_TYPES['건설현장'][0]);
  const [outputFormat, setOutputFormat] = useState<OutputFormat>('ops');
  const [variationOption, setVariationOption] = useState<VariationOption>('auto');
  const [activeSlide, setActiveSlide] = useState<number>(0);
  const [showKytAnswers, setShowKytAnswers] = useState<boolean>(true);

  const [siteInfo, setSiteInfo] = useState<CustomSiteInfo>({
    siteName: '',
    educationDate: getTodayDateString(),
    instructorName: '',
    includeCrossProcess: true,
    foreignLanguage: 'none',
    seasonRisk: 'always',
    logoDataUrl: null,
    logoFileName: '',
    showTbmSignTable: false,
  });

  const [isExportingPptx, setIsExportingPptx] = useState(false);
  const [isExportingPng, setIsExportingPng] = useState(false);
  const [toast, setToast] = useState<ToastState | null>(null);

  const opsSheetRef = useRef<HTMLDivElement | null>(null);
  const activeSlideRef = useRef<HTMLDivElement | null>(null);
  const toastTimerRef = useRef<number | null>(null);

  const initialGen = useMemo(
    () =>
      generateEducationMaterial({
        allCases: SEED_ACCIDENT_CASES,
        industry: '건설현장',
        workType: INDUSTRY_WORK_TYPES['건설현장'][0],
        variationOption: 'auto',
        includeCrossProcess: true,
        history: { version: 0 },
        isRegenerate: false,
      }),
    []
  );

  const [material, setMaterial] = useState<GeneratedMaterial>(initialGen.material);
  const [history, setHistory] = useState<GenerationHistoryState>(initialGen.nextHistory);

  const liveStateRef = useRef({
    casesDb,
    industry,
    workType,
    variationOption,
    includeCrossProcess: siteInfo.includeCrossProcess,
    history,
    isExactMatch: material.isExactMatch,
  });
  liveStateRef.current = {
    casesDb,
    industry,
    workType,
    variationOption,
    includeCrossProcess: siteInfo.includeCrossProcess,
    history,
    isExactMatch: material.isExactMatch,
  };

  // Auto-load static KOSHA DB JSON on initial mount and merge with 10 built-in seed cases + custom cases
  useEffect(() => {
    let cancelled = false;
    const controller = new AbortController();

    async function loadStaticKoshaDb() {
      try {
        const dbUrl = `${import.meta.env.BASE_URL}data/accidents_db_lite.json`;
        const response = await fetch(dbUrl, {
          cache: 'no-store',
          signal: controller.signal,
        });
        if (!response.ok) return;

        const rawText = await response.text();
        // Guard against SPA HTML fallback when static file does not exist yet
        if (!rawText.trim() || rawText.trimStart().startsWith('<')) return;

        const parsedJson = JSON.parse(rawText);
        const { cases: hydratedCases } = parseCasesData(parsedJson, 'builtin');
        if (cancelled || hydratedCases.length === 0) return;

        setCasesDb((prevDb) => mergeBuiltinAndCustomCases(hydratedCases, prevDb));

        const snap = liveStateRef.current;
        const mergedAllCases = mergeBuiltinAndCustomCases(hydratedCases, snap.casesDb);

        const fresh = generateEducationMaterial({
          allCases: mergedAllCases,
          industry: snap.industry,
          workType: snap.workType,
          variationOption: snap.variationOption,
          includeCrossProcess: snap.includeCrossProcess,
          history: snap.history,
          isRegenerate: false,
          preservePrimaryCase: snap.isExactMatch,
        });

        if (!cancelled) {
          setMaterial(fresh.material);
          setHistory(fresh.nextHistory);
        }
      } catch {
        // Silently retain built-in 10 seed cases on network/404/parse fallback
      }
    }

    loadStaticKoshaDb();

    return () => {
      cancelled = true;
      controller.abort();
    };
  }, []);

  const showToast = useCallback((type: 'success' | 'error', message: string) => {
    setToast({ type, message });
    if (toastTimerRef.current) {
      window.clearTimeout(toastTimerRef.current);
    }
    toastTimerRef.current = window.setTimeout(() => {
      setToast(null);
    }, 4200);
  }, []);

  const handleToggleKytAnswers = useCallback(() => {
    setShowKytAnswers((prev) => !prev);
  }, []);

  const runGeneration = useCallback(
    (overrides: {
      db?: AccidentCase[];
      industry?: IndustryType;
      workType?: string;
      variationOption?: VariationOption;
      includeCrossProcess?: boolean;
      isRegenerate: boolean;
      preservePrimaryCase?: boolean;
    }) => {
      const targetDb = overrides.db ?? casesDb;
      const targetIndustry = overrides.industry ?? industry;
      const targetWorkType = overrides.workType ?? workType;
      const targetVariation = overrides.variationOption ?? variationOption;
      const targetCross = overrides.includeCrossProcess ?? siteInfo.includeCrossProcess;

      const result = generateEducationMaterial({
        allCases: targetDb,
        industry: targetIndustry,
        workType: targetWorkType,
        variationOption: targetVariation,
        includeCrossProcess: targetCross,
        history,
        isRegenerate: overrides.isRegenerate,
        preservePrimaryCase: overrides.preservePrimaryCase,
      });

      setMaterial(result.material);
      setHistory(result.nextHistory);
    },
    [casesDb, industry, workType, variationOption, siteInfo.includeCrossProcess, history]
  );

  const handleSelectIndustry = (nextIndustry: IndustryType) => {
    const firstWorkType = INDUSTRY_WORK_TYPES[nextIndustry][0];
    setIndustry(nextIndustry);
    setWorkType(firstWorkType);
    setActiveSlide(0);
    runGeneration({
      industry: nextIndustry,
      workType: firstWorkType,
      isRegenerate: false,
    });
  };

  const handleSelectWorkType = (nextWorkType: string) => {
    setWorkType(nextWorkType);
    setActiveSlide(0);
    runGeneration({
      workType: nextWorkType,
      isRegenerate: false,
    });
  };

  const handleApplyRecommendedCase = (targetIndustry: IndustryType, targetWorkType: string) => {
    setIndustry(targetIndustry);
    setWorkType(targetWorkType);
    setActiveSlide(0);
    runGeneration({
      industry: targetIndustry,
      workType: targetWorkType,
      isRegenerate: false,
    });
    showToast('success', `계절 대표 재해 작업유형(${targetWorkType})을 적용했습니다.`);
  };

  const handleChangeVariation = (nextVariation: VariationOption) => {
    setVariationOption(nextVariation);
    runGeneration({
      variationOption: nextVariation,
      isRegenerate: false,
      preservePrimaryCase: true,
    });
  };

  const handleUpdateSiteInfo = (patch: Partial<CustomSiteInfo>) => {
    const nextSite = { ...siteInfo, ...patch };
    setSiteInfo(nextSite);
    if (typeof patch.includeCrossProcess === 'boolean') {
      runGeneration({
        includeCrossProcess: patch.includeCrossProcess,
        isRegenerate: false,
        preservePrimaryCase: true,
      });
    }
  };

  const handleRegenerate = () => {
    runGeneration({ isRegenerate: true });
  };

  const handleUploadLogoFile = async (file: File) => {
    const isSupportedImage =
      file.type.startsWith('image/') || /\.(png|jpe?g|svg|webp)$/i.test(file.name);
    if (!isSupportedImage) {
      showToast('error', 'PNG, JPG, SVG, WebP 형식의 이미지 파일만 로고로 업로드할 수 있습니다.');
      return;
    }
    if (file.size > 3 * 1024 * 1024) {
      showToast('error', '로고 이미지는 3MB 이하 파일로 업로드해 주세요.');
      return;
    }

    try {
      const { dataUrl, convertedToPng } = await normalizeLogoFileToDataUrl(file);
      setSiteInfo((prev) => ({
        ...prev,
        logoDataUrl: dataUrl,
        logoFileName: file.name,
      }));
      showToast(
        'success',
        convertedToPng
          ? `현장 로고(${file.name})를 고해상도 투명 PNG로 변환하여 PPTX·포스터·슬라이드에 적용했습니다.`
          : `현장 로고(${file.name})가 포스터·슬라이드·카드뉴스에 적용되었습니다.`
      );
    } catch {
      showToast('error', '로고 이미지를 읽거나 변환하는 중 오류가 발생했습니다.');
    }
  };

  const handleRemoveLogo = () => {
    setSiteInfo((prev) => ({
      ...prev,
      logoDataUrl: null,
      logoFileName: '',
    }));
    showToast('success', '업로드된 현장 로고를 제거했습니다.');
  };

  const handleUploadJsonFile = async (file: File) => {
    try {
      const text = await file.text();
      const { cases: parsedCases, error } = parseUploadedCasesJson(text);
      if (error || parsedCases.length === 0) {
        showToast('error', error || '사고사례 JSON을 불러오지 못했습니다.');
        return;
      }

      const mergedMap = new Map<string, AccidentCase>();
      for (const item of casesDb) {
        mergedMap.set(item.id, item);
      }
      for (const item of parsedCases) {
        mergedMap.set(item.id, item);
      }
      const nextDb = Array.from(mergedMap.values());
      setCasesDb(nextDb);

      const firstUploaded = parsedCases[0];
      const nextIndustry = firstUploaded.industry;
      const validTypes = INDUSTRY_WORK_TYPES[nextIndustry];
      const matchedWorkType = validTypes.includes(firstUploaded.work_type)
        ? firstUploaded.work_type
        : workType;

      if (validTypes.includes(firstUploaded.work_type)) {
        setIndustry(nextIndustry);
        setWorkType(matchedWorkType);
      }

      runGeneration({
        db: nextDb,
        industry: validTypes.includes(firstUploaded.work_type) ? nextIndustry : industry,
        workType: matchedWorkType,
        isRegenerate: false,
      });

      showToast(
        'success',
        `${parsedCases.length.toLocaleString('ko-KR')}건의 사고사례가 내장 DB에 병합되었습니다. (총 ${nextDb.length.toLocaleString('ko-KR')}건)`
      );
    } catch {
      showToast('error', '파일을 읽는 중 오류가 발생했습니다.');
    }
  };

  const handleExportPptx = async () => {
    if (isExportingPptx) return;
    setIsExportingPptx(true);
    try {
      const { downloadSafetyPptx } = await import('./utils/exportPptx');
      const fileName = await downloadSafetyPptx(material, siteInfo);
      showToast('success', `5장 슬라이드 PPTX 파일이 저장되었습니다: ${fileName}`);
    } catch {
      showToast('error', 'PPTX 파일 생성 중 오류가 발생했습니다. 다시 시도해 주세요.');
    } finally {
      setIsExportingPptx(false);
    }
  };

  const handleExportPng = async () => {
    if (isExportingPng) return;
    const targetNode = outputFormat === 'ops' ? opsSheetRef.current : activeSlideRef.current;
    if (!targetNode) {
      showToast('error', '이미지 저장 대상을 찾을 수 없습니다.');
      return;
    }

    setIsExportingPng(true);
    try {
      const prefix =
        outputFormat === 'ops'
          ? `OPS_${material.selectedWorkType}`
          : `슬라이드${activeSlide + 1}_${material.selectedWorkType}`;
      const targetPixelWidth = outputFormat === 'ops' ? 1588 : 1920;
      const fileName = await downloadNodeAsPng(
        targetNode,
        prefix,
        siteInfo.educationDate || getTodayDateString(),
        targetPixelWidth
      );
      showToast('success', `고해상도 PNG 이미지가 저장되었습니다: ${fileName}`);
    } catch {
      showToast('error', 'PNG 이미지 변환 중 오류가 발생했습니다.');
    } finally {
      setIsExportingPng(false);
    }
  };

  const handlePrintPdf = () => {
    window.print();
  };

  const customDbCount = useMemo(
    () => casesDb.filter((c) => c.source === 'custom').length,
    [casesDb]
  );

  const activeSeason = SEASONAL_RISKS[siteInfo.seasonRisk];
  const activeForeignLabel =
    siteInfo.foreignLanguage !== 'none'
      ? getForeignLanguageNativeLabel(siteInfo.foreignLanguage)
      : null;

  const formatBreadcrumbLabel =
    outputFormat === 'ops'
      ? '한페이지 OPS'
      : outputFormat === 'slides'
        ? `슬라이드 ${activeSlide + 1}/5`
        : '4컷 카드뉴스 (1:1)';

  return (
    <div className="min-h-screen flex flex-col bg-slate-100 text-slate-900">
      {/* Top Bar: Clean 3-Zone Institutional Safety Header */}
      <header className="no-print sticky top-0 z-30 bg-slate-900 text-white border-b border-slate-800 px-5 lg:px-6 h-14 flex items-center justify-between gap-6">
        <div className="flex items-center gap-2.5 whitespace-nowrap shrink-0">
          <ShieldCheck className="w-5 h-5 text-orange-400 shrink-0" />
          <span className="text-[15.5px] font-bold tracking-tight">
            산업안전 교육자료 제작기
          </span>
        </div>

        <div className="hidden md:flex items-center gap-2 text-[12.5px] text-slate-300 min-w-0 truncate">
          <span className="font-medium text-slate-400 whitespace-nowrap">{industry}</span>
          <span className="text-slate-600" aria-hidden="true">/</span>
          <span className="font-semibold text-white truncate">{workType}</span>
          <span className="text-slate-600" aria-hidden="true">/</span>
          <span className="text-slate-300 whitespace-nowrap">{formatBreadcrumbLabel}</span>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <button
            type="button"
            onClick={handleExportPptx}
            disabled={isExportingPptx}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-orange-600 hover:bg-orange-500 disabled:opacity-60 text-white text-[12px] font-bold transition-colors whitespace-nowrap shrink-0 cursor-pointer"
          >
            {isExportingPptx ? (
              <Loader2 className="w-3.5 h-3.5 animate-spin shrink-0" />
            ) : (
              <Download className="w-3.5 h-3.5 shrink-0" />
            )}
            <span>PPTX 다운로드</span>
          </button>

          {outputFormat !== 'cardnews' && (
            <button
              type="button"
              onClick={handleExportPng}
              disabled={isExportingPng}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-slate-800 hover:bg-slate-700 border border-slate-700 disabled:opacity-60 text-slate-100 text-[12px] font-semibold transition-colors whitespace-nowrap shrink-0 cursor-pointer"
            >
              {isExportingPng ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin shrink-0" />
              ) : (
                <ImageIcon className="w-3.5 h-3.5 shrink-0" />
              )}
              <span>PNG 저장</span>
            </button>
          )}

          <button
            type="button"
            onClick={handlePrintPdf}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-100 text-[12px] font-semibold transition-colors whitespace-nowrap shrink-0 cursor-pointer"
          >
            <Printer className="w-3.5 h-3.5 shrink-0" />
            <span>A4 인쇄</span>
          </button>
        </div>
      </header>

      {/* Main Split Workspace */}
      <div className="no-print flex-1 flex flex-col lg:flex-row min-h-0">
        <ControlSidebar
          industry={industry}
          workType={workType}
          outputFormat={outputFormat}
          variationOption={variationOption}
          siteInfo={siteInfo}
          totalDbCount={casesDb.length}
          customDbCount={customDbCount}
          onSelectIndustry={handleSelectIndustry}
          onSelectWorkType={handleSelectWorkType}
          onApplyRecommendedCase={handleApplyRecommendedCase}
          onChangeOutputFormat={setOutputFormat}
          onChangeVariation={handleChangeVariation}
          onUpdateSiteInfo={handleUpdateSiteInfo}
          onRegenerate={handleRegenerate}
          onUploadJsonFile={handleUploadJsonFile}
          onUploadLogoFile={handleUploadLogoFile}
          onRemoveLogo={handleRemoveLogo}
          onDownloadSampleJson={downloadSampleCaseTemplate}
        />

        <main className="flex-1 min-w-0 flex flex-col">
          {/* Clean Unboxed Composition Metadata Bar */}
          <div className="bg-white border-b border-slate-200 px-5 lg:px-8 py-3 flex flex-wrap items-center justify-between gap-3">
            <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-[12px] text-slate-700 tabular-nums">
              <span className="font-bold text-slate-950">버전 #{material.version}</span>
              <span className="text-slate-300" aria-hidden="true">·</span>
              <span className="font-semibold text-slate-800">{material.perspectiveLabel}</span>
              <span className="text-slate-300" aria-hidden="true">·</span>
              <span className="font-semibold" style={{ color: material.theme.accentTextHex }}>
                {material.theme.name}
              </span>
              <span className="text-slate-300" aria-hidden="true">·</span>
              <span className="text-slate-600">
                {material.relatedCase ? '유사공정 연계' : '단독사례 집중'}
              </span>
              {activeSeason.id !== 'always' && (
                <>
                  <span className="text-slate-300" aria-hidden="true">·</span>
                  <span className="font-bold" style={{ color: activeSeason.textHex }}>
                    {activeSeason.shortLabel} 경고
                  </span>
                </>
              )}
              {activeForeignLabel && (
                <>
                  <span className="text-slate-300" aria-hidden="true">·</span>
                  <span className="font-semibold text-slate-800">{activeForeignLabel} 병기</span>
                </>
              )}
              {siteInfo.showTbmSignTable && (
                <>
                  <span className="text-slate-300" aria-hidden="true">·</span>
                  <span className="font-semibold text-slate-800">서명란 10칸</span>
                </>
              )}
            </div>

            <div className="flex items-center gap-3 text-[12px]">
              {!material.isExactMatch ? (
                <span className="font-bold text-amber-800">
                  유사 공정 기반 위험요인 분석 자료 (매칭 {material.matchScore}점)
                </span>
              ) : (
                <span className="text-slate-500">
                  적용 사례: <strong className="text-slate-800">{material.primaryCase.id}</strong> ({material.primaryCase.hazard_type})
                </span>
              )}
            </div>
          </div>

          {/* Inline Notification Toast */}
          {toast && (
            <div
              role="status"
              className={`mx-5 lg:mx-8 mt-4 px-4 py-2.5 rounded-lg border text-[12.5px] font-semibold flex items-center justify-between gap-3 ${
                toast.type === 'success'
                  ? 'bg-emerald-50 border-emerald-200 text-emerald-900'
                  : 'bg-red-50 border-red-200 text-red-900'
              }`}
            >
              <div className="flex items-center gap-2">
                {toast.type === 'success' ? (
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                ) : (
                  <AlertCircle className="w-4 h-4 text-red-600 shrink-0" />
                )}
                <span>{toast.message}</span>
              </div>
              <button
                type="button"
                onClick={() => setToast(null)}
                aria-label="알림 닫기"
                className="text-slate-500 hover:text-slate-800 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          )}

          {/* Document Viewport */}
          <div className="flex-1 overflow-auto p-5 lg:p-8 flex flex-col items-center">
            {outputFormat === 'ops' ? (
              <div className="w-full flex justify-center overflow-x-auto pb-4">
                <OpsSheetView
                  material={material}
                  siteInfo={siteInfo}
                  showKytAnswers={showKytAnswers}
                  onToggleKytAnswers={handleToggleKytAnswers}
                  sheetRef={opsSheetRef}
                />
              </div>
            ) : outputFormat === 'slides' ? (
              <SlideDeckView
                material={material}
                siteInfo={siteInfo}
                activeSlide={activeSlide}
                onChangeSlide={setActiveSlide}
                showKytAnswers={showKytAnswers}
                onToggleKytAnswers={handleToggleKytAnswers}
                slideRef={activeSlideRef}
              />
            ) : (
              <CardNewsView
                material={material}
                siteInfo={siteInfo}
                onNotify={showToast}
              />
            )}
          </div>
        </main>
      </div>

      {/* Dedicated Single-Page A4 Print Container */}
      <div className="hidden print-only-root">
        <OpsSheetView
          material={material}
          siteInfo={siteInfo}
          showKytAnswers={showKytAnswers}
          isPrintClone
        />
      </div>
    </div>
  );
}
