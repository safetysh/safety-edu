import React, { startTransition, useCallback, useDeferredValue, useEffect, useMemo, useRef, useState } from 'react';
import {
  Download,
  Image as ImageIcon,
  Copy,
  Printer,
  ShieldCheck,
  CheckCircle2,
  AlertCircle,
  Loader2,
  X,
  RotateCcw,
} from 'lucide-react';
import { SEED_ACCIDENT_CASES } from './data/seedCases';
import {
  AccidentCase,
  CaseEditableOverride,
  CustomSiteInfo,
  GeneratedMaterial,
  INDUSTRY_WORK_TYPES,
  IndustryType,
  MetaSummaryData,
  OutputFormat,
  SourceFilterTab,
  TimelineStep,
  VariationOption,
} from './types/safety';
import {
  GenerationHistoryState,
  generateEducationMaterial,
  parseUploadedCasesJson,
} from './engine/generator';
import {
  getCachedCasesSnapshot,
  hasPendingIndustryExtension,
  isIndustryShardCached,
  loadIndustryExtension,
  loadIndustryShard,
  loadMetaSummary,
} from './services/dbLoader';
import {
  loadMeasurePresets,
  loadPersistedSitePrefs,
  saveMeasurePresets,
  savePersistedSitePrefs,
} from './utils/localPrefs';
import { ControlSidebar } from './components/ControlSidebar';
import { OpsSheetView } from './components/OpsSheetView';
import { SlideDeckView } from './components/SlideDeckView';
import { CardNewsView } from './components/CardNewsView';
import {
  copyNodeAsPngToClipboard,
  downloadNodeAsPng,
  downloadSampleCaseTemplate,
  normalizeLogoFileToDataUrl,
} from './utils/exportImage';
import { getForeignLanguageNativeLabel } from './data/multilingualDict';
import { SEASONAL_RISKS } from './data/seasonalRisks';
import {
  formatSourceHeaderBadge,
  getSourceBrandStyle,
  isStandardModelCase,
} from './utils/textFit';

function getTodayDateString(): string {
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, '0');
  const d = String(now.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

function areStringArraysEqual(a: string[], b: string[]): boolean {
  if (a.length !== b.length) return false;
  for (let i = 0; i < a.length; i++) {
    if ((a[i] || '').trim() !== (b[i] || '').trim()) return false;
  }
  return true;
}

interface ToastState {
  type: 'success' | 'error';
  message: string;
}

export default function App() {
  const [casesDb, setCasesDb] = useState<AccidentCase[]>(() => getCachedCasesSnapshot([]));
  const [customCases, setCustomCases] = useState<AccidentCase[]>([]);
  const [metaSummary, setMetaSummary] = useState<MetaSummaryData | null>(null);
  const [isShardLoading, setIsShardLoading] = useState<boolean>(false);

  const [industry, setIndustry] = useState<IndustryType>('건설현장');
  const [workType, setWorkType] = useState<string>(INDUSTRY_WORK_TYPES['건설현장'][0]);
  const [sourceFilter, setSourceFilter] = useState<SourceFilterTab>('ALL');
  const [pinnedCaseId, setPinnedCaseId] = useState<string | null>(null);
  const [outputFormat, setOutputFormat] = useState<OutputFormat>('ops');
  const [variationOption, setVariationOption] = useState<VariationOption>('auto');
  const [activeSlide, setActiveSlide] = useState<number>(0);
  const [showKytAnswers, setShowKytAnswers] = useState<boolean>(true);

  const [siteInfo, setSiteInfo] = useState<CustomSiteInfo>(() =>
    loadPersistedSitePrefs(getTodayDateString())
  );
  const [measurePresets, setMeasurePresets] = useState<string[]>(() => loadMeasurePresets());
  const [caseEditsMap, setCaseEditsMap] = useState<Record<string, CaseEditableOverride>>({});

  const [isExportingPptx, setIsExportingPptx] = useState(false);
  const [isExportingPng, setIsExportingPng] = useState(false);
  const [isCopyingClipboard, setIsCopyingClipboard] = useState(false);
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
        sourceFilter: 'ALL',
        variationOption: 'auto',
        includeCrossProcess: true,
        history: { version: 0 },
        isRegenerate: false,
      }),
    []
  );

  const [material, setMaterial] = useState<GeneratedMaterial>(initialGen.material);
  const [history, setHistory] = useState<GenerationHistoryState>(initialGen.nextHistory);

  // Auto-persist site preferences & presets to localStorage
  useEffect(() => {
    savePersistedSitePrefs(siteInfo);
  }, [siteInfo]);

  useEffect(() => {
    saveMeasurePresets(measurePresets);
  }, [measurePresets]);

  const regenSeqRef = useRef(0);

  const liveStateRef = useRef({
    casesDb,
    customCases,
    industry,
    workType,
    sourceFilter,
    pinnedCaseId,
    variationOption,
    includeCrossProcess: siteInfo.includeCrossProcess,
    history,
    isExactMatch: material.isExactMatch,
    primaryIndustry: material.primaryCase.industry,
    isPrimaryStandardModel: isStandardModelCase(material.primaryCase),
  });
  liveStateRef.current = {
    casesDb,
    customCases,
    industry,
    workType,
    sourceFilter,
    pinnedCaseId,
    variationOption,
    includeCrossProcess: siteInfo.includeCrossProcess,
    history,
    isExactMatch: material.isExactMatch,
    primaryIndustry: material.primaryCase.industry,
    isPrimaryStandardModel: isStandardModelCase(material.primaryCase),
  };

  // Preload meta_summary.json once on mount
  useEffect(() => {
    const controller = new AbortController();
    loadMetaSummary(controller.signal).then((meta) => {
      if (meta) setMetaSummary(meta);
    });
    return () => controller.abort();
  }, []);

  // Lazy-load the selected industry's fast core shard first, then silently hydrate any background extension
  // and quietly prefetch remaining industries during browser idle time for 0ms switching.
  useEffect(() => {
    let cancelled = false;
    let idleTimer: number | null = null;
    let prefetchTimer: number | null = null;

    async function ensureIndustryLoaded() {
      const wasAlreadyCached = isIndustryShardCached(industry);
      if (!wasAlreadyCached) {
        setIsShardLoading(true);
      }

      await loadIndustryShard(industry);
      if (cancelled) return;

      const snap = liveStateRef.current;
      const nextCases = getCachedCasesSnapshot(snap.customCases);
      const dbChanged = nextCases !== snap.casesDb;

      if (dbChanged) {
        liveStateRef.current.casesDb = nextCases;
        setCasesDb(nextCases);
      }
      if (!wasAlreadyCached) {
        setIsShardLoading(false);
      }

      const isSameIndustryAsCurrent = snap.primaryIndustry === snap.industry;

      // On warm industry switches where handleSelectIndustry already ran synchronously with up-to-date casesDb,
      // skip redundant generation & second render!
      const needsGeneration =
        !wasAlreadyCached ||
        !isSameIndustryAsCurrent ||
        dbChanged ||
        snap.isPrimaryStandardModel;

      if (needsGeneration) {
        const shouldKeepCurrent =
          Boolean(snap.pinnedCaseId) ||
          (isSameIndustryAsCurrent &&
            !snap.isPrimaryStandardModel &&
            (regenSeqRef.current > 0 || (snap.isExactMatch && snap.sourceFilter === 'ALL')));

        const fresh = generateEducationMaterial({
          allCases: nextCases,
          industry: snap.industry,
          workType: snap.workType,
          sourceFilter: snap.sourceFilter,
          pinnedCaseId: snap.pinnedCaseId,
          variationOption: snap.variationOption,
          includeCrossProcess: snap.includeCrossProcess,
          history: snap.history,
          isRegenerate: false,
          preservePrimaryCase: shouldKeepCurrent,
        });

        if (!cancelled) {
          liveStateRef.current.history = fresh.nextHistory;
          liveStateRef.current.isExactMatch = fresh.material.isExactMatch;
          liveStateRef.current.primaryIndustry = fresh.material.primaryCase.industry;
          liveStateRef.current.isPrimaryStandardModel = isStandardModelCase(fresh.material.primaryCase);
          setMaterial(fresh.material);
          setHistory(fresh.nextHistory);
        }
      }

      // Silently merge large background archive (e.g. db_con_sif.json) in a low-priority transition
      if (!cancelled && hasPendingIndustryExtension(industry)) {
        idleTimer = window.setTimeout(async () => {
          const mergedNew = await loadIndustryExtension(industry);
          if (cancelled || !mergedNew) return;
          const fullCases = getCachedCasesSnapshot(liveStateRef.current.customCases);
          liveStateRef.current.casesDb = fullCases;
          startTransition(() => {
            setCasesDb(fullCases);
          });
        }, 250);
      }

      // Quietly prefetch remaining industry shards during browser idle time so switching industries is instant
      // and Section 03 cross-process cards get real KOSHA API cases without affecting initial load.
      const otherIndustries = (['건설현장', '제조업', '서비스업'] as IndustryType[]).filter(
        (ind) => ind !== industry && !isIndustryShardCached(ind)
      );
      if (!cancelled && otherIndustries.length > 0) {
        const runPrefetch = async () => {
          for (const otherInd of otherIndustries) {
            if (cancelled) return;
            if (!isIndustryShardCached(otherInd)) {
              await loadIndustryShard(otherInd);
              // Brief yield between shards so main thread stays responsive to user clicks
              await new Promise((r) => window.setTimeout(r, 60));
            }
          }
          if (cancelled) return;
          const prefetchedCases = getCachedCasesSnapshot(liveStateRef.current.customCases);
          if (prefetchedCases !== liveStateRef.current.casesDb) {
            liveStateRef.current.casesDb = prefetchedCases;
            startTransition(() => {
              setCasesDb(prefetchedCases);
            });
          }
        };

        prefetchTimer = window.setTimeout(() => {
          if (cancelled) return;
          const win = window as Window & {
            requestIdleCallback?: (cb: () => void, opts?: { timeout: number }) => number;
          };
          if (typeof win.requestIdleCallback === 'function') {
            win.requestIdleCallback(() => {
              if (!cancelled) void runPrefetch();
            }, { timeout: 1500 });
          } else {
            void runPrefetch();
          }
        }, 700);
      }
    }

    ensureIndustryLoaded();

    return () => {
      cancelled = true;
      if (idleTimer !== null) window.clearTimeout(idleTimer);
      if (prefetchTimer !== null) window.clearTimeout(prefetchTimer);
    };
  }, [industry]);

  // Compute effective material merging any inline field edits onto primaryCase (without mutating KOSHA facts)
  const effectiveMaterial = useMemo<GeneratedMaterial>(() => {
    const baseCase = material.primaryCase;
    const edit = caseEditsMap[baseCase.id];
    if (!edit) {
      return {
        ...material,
        isCustomEdited: false,
        isMeasuresEdited: false,
        isTbmEdited: false,
      };
    }

    const nextMeasures = edit.preventive_measures ?? baseCase.preventive_measures;
    const nextTbm = edit.tbm_checklist ?? baseCase.tbm_checklist;

    const isMeasuresEdited = !areStringArraysEqual(nextMeasures, baseCase.preventive_measures);
    const isTbmEdited = !areStringArraysEqual(nextTbm, baseCase.tbm_checklist);
    const isCustomEdited = isMeasuresEdited || isTbmEdited;

    const updatedTimeline: [TimelineStep, TimelineStep, TimelineStep, TimelineStep] = [
      baseCase.timeline[0],
      baseCase.timeline[1],
      baseCase.timeline[2],
      {
        ...baseCase.timeline[3],
        detail: isMeasuresEdited && nextMeasures[0] ? nextMeasures[0] : baseCase.timeline[3].detail,
      },
    ];

    return {
      ...material,
      primaryCase: {
        ...baseCase,
        preventive_measures: nextMeasures,
        tbm_checklist: nextTbm,
        timeline: updatedTimeline,
      },
      isMeasuresEdited,
      isTbmEdited,
      isCustomEdited,
    };
  }, [material, caseEditsMap]);

  const deferredPrintMaterial = useDeferredValue(effectiveMaterial);

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
      sourceFilter?: SourceFilterTab;
      pinnedCaseId?: string | null;
      variationOption?: VariationOption;
      includeCrossProcess?: boolean;
      isRegenerate: boolean;
      preservePrimaryCase?: boolean;
      regenNonce?: number;
    }) => {
      const snap = liveStateRef.current;
      const targetDb = overrides.db ?? snap.casesDb;
      const targetIndustry = overrides.industry ?? snap.industry;
      const targetWorkType = overrides.workType ?? snap.workType;
      const targetSourceFilter = overrides.sourceFilter ?? snap.sourceFilter;
      const targetPinned =
        overrides.pinnedCaseId !== undefined ? overrides.pinnedCaseId : snap.pinnedCaseId;
      const targetVariation = overrides.variationOption ?? snap.variationOption;
      const targetCross = overrides.includeCrossProcess ?? snap.includeCrossProcess;

      const result = generateEducationMaterial({
        allCases: targetDb,
        industry: targetIndustry,
        workType: targetWorkType,
        sourceFilter: targetSourceFilter,
        pinnedCaseId: targetPinned,
        variationOption: targetVariation,
        includeCrossProcess: targetCross,
        history: snap.history,
        isRegenerate: overrides.isRegenerate,
        preservePrimaryCase: overrides.preservePrimaryCase,
        regenNonce: overrides.regenNonce,
      });

      liveStateRef.current = {
        ...snap,
        casesDb: targetDb,
        industry: targetIndustry,
        workType: targetWorkType,
        sourceFilter: targetSourceFilter,
        pinnedCaseId: targetPinned,
        variationOption: targetVariation,
        includeCrossProcess: targetCross,
        history: result.nextHistory,
        isExactMatch: result.material.isExactMatch,
        primaryIndustry: result.material.primaryCase.industry,
        isPrimaryStandardModel: isStandardModelCase(result.material.primaryCase),
      };
      setMaterial(result.material);
      setHistory(result.nextHistory);
      return result.material;
    },
    []
  );

  const handleSelectIndustry = (nextIndustry: IndustryType) => {
    const firstWorkType = INDUSTRY_WORK_TYPES[nextIndustry][0];
    setIndustry(nextIndustry);
    setWorkType(firstWorkType);
    setPinnedCaseId(null);
    setActiveSlide(0);

    if (isIndustryShardCached(nextIndustry)) {
      const latestDb = getCachedCasesSnapshot(liveStateRef.current.customCases);
      if (latestDb !== liveStateRef.current.casesDb) {
        liveStateRef.current.casesDb = latestDb;
        setCasesDb(latestDb);
      }
      runGeneration({
        db: latestDb,
        industry: nextIndustry,
        workType: firstWorkType,
        pinnedCaseId: null,
        isRegenerate: false,
      });
    } else {
      setIsShardLoading(true);
    }
  };

  const handleSelectWorkType = (nextWorkType: string) => {
    setWorkType(nextWorkType);
    setPinnedCaseId(null);
    setActiveSlide(0);
    runGeneration({
      workType: nextWorkType,
      pinnedCaseId: null,
      isRegenerate: false,
    });
  };

  const handleChangeSourceFilter = (nextTab: SourceFilterTab) => {
    setSourceFilter(nextTab);
    setPinnedCaseId(null);
    setActiveSlide(0);
    runGeneration({
      sourceFilter: nextTab,
      pinnedCaseId: null,
      isRegenerate: false,
    });
  };

  const handlePinCase = (chosenCase: AccidentCase) => {
    setPinnedCaseId(chosenCase.id);
    if (chosenCase.industry !== industry) {
      setIndustry(chosenCase.industry);
    }
    if (INDUSTRY_WORK_TYPES[chosenCase.industry].includes(chosenCase.work_type)) {
      setWorkType(chosenCase.work_type);
    }
    setActiveSlide(0);
    runGeneration({
      industry: chosenCase.industry,
      workType: chosenCase.work_type,
      pinnedCaseId: chosenCase.id,
      isRegenerate: false,
    });
    showToast('success', `선택한 사례(${chosenCase.id})로 교육자료를 구성했습니다.`);
  };

  const handleClearPinnedCase = () => {
    setPinnedCaseId(null);
    runGeneration({
      pinnedCaseId: null,
      isRegenerate: false,
    });
  };

  const handleApplyRecommendedCase = (targetIndustry: IndustryType, targetWorkType: string) => {
    setIndustry(targetIndustry);
    setWorkType(targetWorkType);
    setPinnedCaseId(null);
    setActiveSlide(0);
    runGeneration({
      industry: targetIndustry,
      workType: targetWorkType,
      pinnedCaseId: null,
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

  const handleRegenerate = async () => {
    regenSeqRef.current += 1;
    const nonce =
      Math.floor(Math.random() * 900_000) + 100_000 + regenSeqRef.current * 7919;

    setPinnedCaseId(null);

    const snap = liveStateRef.current;
    let activeDb = snap.casesDb;

    // Ensure full industry shard is hydrated before picking a new case if clicked during initial load
    if (!isIndustryShardCached(snap.industry)) {
      setIsShardLoading(true);
      await loadIndustryShard(snap.industry);
      activeDb = getCachedCasesSnapshot(liveStateRef.current.customCases);
      liveStateRef.current.casesDb = activeDb;
      setCasesDb(activeDb);
      setIsShardLoading(false);
    }

    runGeneration({
      db: activeDb,
      pinnedCaseId: null,
      isRegenerate: true,
      regenNonce: nonce,
    });
  };

  // Inline editable Measures & TBM handlers (Facts remain Read-Only)
  const handleUpdateMeasures = useCallback(
    (nextMeasures: string[]) => {
      const caseId = material.primaryCase.id;
      setCaseEditsMap((prev) => ({
        ...prev,
        [caseId]: {
          ...prev[caseId],
          preventive_measures: nextMeasures,
        },
      }));
    },
    [material.primaryCase.id]
  );

  const handleResetMeasures = useCallback(() => {
    const caseId = material.primaryCase.id;
    const isStd = isStandardModelCase(material.primaryCase);
    setCaseEditsMap((prev) => {
      const current = prev[caseId];
      if (!current) return prev;
      const next = { ...prev };
      if (current.tbm_checklist) {
        next[caseId] = { tbm_checklist: current.tbm_checklist };
      } else {
        delete next[caseId];
      }
      return next;
    });
    showToast(
      'success',
      isStd ? '예방대책을 표준 가이드로 복원했습니다.' : '예방대책을 공단 공식 원문으로 복원했습니다.'
    );
  }, [material.primaryCase, showToast]);

  const handleUpdateTbm = useCallback(
    (nextTbm: string[]) => {
      const caseId = material.primaryCase.id;
      setCaseEditsMap((prev) => ({
        ...prev,
        [caseId]: {
          ...prev[caseId],
          tbm_checklist: nextTbm,
        },
      }));
    },
    [material.primaryCase.id]
  );

  const handleResetTbm = useCallback(() => {
    const caseId = material.primaryCase.id;
    const isStd = isStandardModelCase(material.primaryCase);
    setCaseEditsMap((prev) => {
      const current = prev[caseId];
      if (!current) return prev;
      const next = { ...prev };
      if (current.preventive_measures) {
        next[caseId] = { preventive_measures: current.preventive_measures };
      } else {
        delete next[caseId];
      }
      return next;
    });
    showToast(
      'success',
      isStd ? 'TBM 점검표를 표준 가이드로 복원했습니다.' : 'TBM 점검표를 공단 원문 가이드로 복원했습니다.'
    );
  }, [material.primaryCase, showToast]);

  const handleResetAllEditsForCurrentCase = () => {
    const caseId = material.primaryCase.id;
    const isStd = isStandardModelCase(material.primaryCase);
    setCaseEditsMap((prev) => {
      const next = { ...prev };
      delete next[caseId];
      return next;
    });
    showToast(
      'success',
      isStd
        ? '대책 및 점검표를 모두 표준 가이드로 복원했습니다.'
        : '대책 및 점검표를 모두 공단 원문으로 복원했습니다.'
    );
  };

  const handleAppendPresetMeasure = (presetText: string) => {
    const cur = effectiveMaterial.primaryCase.preventive_measures;
    if (cur.includes(presetText)) {
      showToast('error', '이미 현재 예방대책에 포함된 항목입니다.');
      return;
    }
    if (cur.length >= 6) {
      showToast('error', 'A4 1장 가독성을 위해 예방대책은 최대 6개까지 추가할 수 있습니다.');
      return;
    }
    handleUpdateMeasures([...cur, presetText]);
    showToast('success', '선택한 현장 프리셋이 예방대책에 추가되었습니다.');
  };

  const handleAddMeasurePreset = (presetText: string) => {
    setMeasurePresets((prev) => {
      if (prev.includes(presetText)) return prev;
      return [presetText, ...prev].slice(0, 50);
    });
    showToast('success', '자주 쓰는 현장 대책 프리셋에 저장되었습니다.');
  };

  const handleRemoveMeasurePreset = (index: number) => {
    setMeasurePresets((prev) => prev.filter((_, i) => i !== index));
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
          ? `현장 로고(${file.name})를 투명 PNG로 변환하여 PPTX·포스터에 적용·자동저장했습니다.`
          : `현장 로고(${file.name})가 적용 및 자동저장되었습니다.`
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
      const { cases: parsedCases, error } = parseUploadedCasesJson(text, 'custom');
      if (error || parsedCases.length === 0) {
        showToast('error', error || '사고사례 JSON을 불러오지 못했습니다.');
        return;
      }

      const nextCustomMap = new Map<string, AccidentCase>();
      for (const c of customCases) nextCustomMap.set(c.id, c);
      for (const c of parsedCases) nextCustomMap.set(c.id, c);
      const nextCustom = Array.from(nextCustomMap.values());
      setCustomCases(nextCustom);

      const nextDb = getCachedCasesSnapshot(nextCustom);
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

      setPinnedCaseId(firstUploaded.id);
      runGeneration({
        db: nextDb,
        industry: validTypes.includes(firstUploaded.work_type) ? nextIndustry : industry,
        workType: matchedWorkType,
        pinnedCaseId: firstUploaded.id,
        isRegenerate: false,
      });

      showToast(
        'success',
        `${parsedCases.length.toLocaleString('ko-KR')}건의 자체 사고사례가 병합되었습니다.`
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
      const fileName = await downloadSafetyPptx(effectiveMaterial, siteInfo);
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
          ? `OPS_${effectiveMaterial.selectedWorkType}`
          : `슬라이드${activeSlide + 1}_${effectiveMaterial.selectedWorkType}`;
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

  const handleCopyClipboardImage = async () => {
    if (isCopyingClipboard) return;
    const targetNode = outputFormat === 'ops' ? opsSheetRef.current : activeSlideRef.current;
    if (!targetNode) {
      showToast('error', '클립보드에 복사할 대상을 찾을 수 없습니다.');
      return;
    }

    setIsCopyingClipboard(true);
    try {
      const targetPixelWidth = outputFormat === 'ops' ? 1588 : 1920;
      const res = await copyNodeAsPngToClipboard(targetNode, targetPixelWidth);
      if (res === 'copied') {
        showToast(
          'success',
          '클립보드에 고해상도 이미지가 복사되었습니다! 카카오톡·밴드 대화창에 바로 붙여넣기(Ctrl+V) 하세요.'
        );
      } else {
        showToast(
          'error',
          '현재 브라우저 환경에서 클립보드 이미지 복사가 제한됩니다. 옆의 ‘PNG 저장’ 버튼을 이용해 주세요.'
        );
      }
    } catch {
      showToast(
        'error',
        '클립보드 이미지 복사 중 오류가 발생했습니다. ‘PNG 저장’ 버튼을 이용해 주세요.'
      );
    } finally {
      setIsCopyingClipboard(false);
    }
  };

  const handlePrintPdf = () => {
    window.print();
  };

  const totalDbCount = metaSummary
    ? metaSummary.totals.all + SEED_ACCIDENT_CASES.length + customCases.length
    : casesDb.length;

  const activeSeason = SEASONAL_RISKS[siteInfo.seasonRisk];
  const activeForeignLabel =
    siteInfo.foreignLanguage !== 'none'
      ? getForeignLanguageNativeLabel(siteInfo.foreignLanguage)
      : null;

  const sourceBrand = getSourceBrandStyle(effectiveMaterial.primaryCase);
  const sourceHeaderBadge = formatSourceHeaderBadge(effectiveMaterial.primaryCase);

  const formatBreadcrumbLabel =
    outputFormat === 'ops'
      ? '한페이지 OPS'
      : outputFormat === 'slides'
        ? `슬라이드 ${activeSlide + 1}/5`
        : '4컷 카드뉴스 (1:1)';

  return (
    <div className="min-h-screen flex flex-col bg-slate-100 text-slate-900">
      {/* Top Bar: Institutional Safety Action Header */}
      <header className="no-print sticky top-0 z-30 bg-slate-900 text-white border-b border-slate-800 px-4 lg:px-6 h-14 flex items-center justify-between gap-4">
        <div className="flex items-center gap-2.5 whitespace-nowrap shrink-0">
          <ShieldCheck className="w-5 h-5 text-orange-400 shrink-0" />
          <span className="text-[15px] font-bold tracking-tight">
            산업안전 교육자료 제작기
          </span>
        </div>

        <div className="hidden xl:flex items-center gap-2 text-[12px] text-slate-300 min-w-0 truncate">
          <span
            className="px-2 py-0.5 rounded text-[10.5px] font-extrabold text-white shrink-0"
            style={{ backgroundColor: sourceBrand.primaryHex }}
          >
            {sourceBrand.shortLabel}
          </span>
          <span className="font-medium text-slate-400 whitespace-nowrap">{industry}</span>
          <span className="text-slate-600" aria-hidden="true">/</span>
          <span className="font-semibold text-white truncate">{workType}</span>
          <span className="text-slate-600" aria-hidden="true">/</span>
          <span className="text-slate-300 whitespace-nowrap">{formatBreadcrumbLabel}</span>
        </div>

        <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
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
            <>
              <button
                type="button"
                onClick={handleCopyClipboardImage}
                disabled={isCopyingClipboard}
                title="카카오톡·밴드 단톡방에 바로 붙여넣기(Ctrl+V)용 이미지 복사"
                className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-md bg-emerald-700 hover:bg-emerald-600 disabled:opacity-60 text-white text-[12px] font-bold transition-colors whitespace-nowrap shrink-0 cursor-pointer"
              >
                {isCopyingClipboard ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin shrink-0" />
                ) : (
                  <Copy className="w-3.5 h-3.5 shrink-0" />
                )}
                <span>이미지 복사</span>
              </button>

              <button
                type="button"
                onClick={handleExportPng}
                disabled={isExportingPng}
                className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-md bg-slate-800 hover:bg-slate-700 border border-slate-700 disabled:opacity-60 text-slate-100 text-[12px] font-semibold transition-colors whitespace-nowrap shrink-0 cursor-pointer"
              >
                {isExportingPng ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin shrink-0" />
                ) : (
                  <ImageIcon className="w-3.5 h-3.5 shrink-0" />
                )}
                <span>PNG 저장</span>
              </button>
            </>
          )}

          <button
            type="button"
            onClick={handlePrintPdf}
            className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-md bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-100 text-[12px] font-semibold transition-colors whitespace-nowrap shrink-0 cursor-pointer"
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
          sourceFilter={sourceFilter}
          pinnedCaseId={pinnedCaseId}
          activeCaseId={effectiveMaterial.primaryCase.id}
          outputFormat={outputFormat}
          variationOption={variationOption}
          siteInfo={siteInfo}
          casesPool={casesDb}
          metaSummary={metaSummary}
          isShardLoading={isShardLoading}
          totalDbCount={totalDbCount}
          customDbCount={customCases.length}
          measurePresets={measurePresets}
          onSelectIndustry={handleSelectIndustry}
          onSelectWorkType={handleSelectWorkType}
          onChangeSourceFilter={handleChangeSourceFilter}
          onPinCase={handlePinCase}
          onClearPinnedCase={handleClearPinnedCase}
          onApplyRecommendedCase={handleApplyRecommendedCase}
          onChangeOutputFormat={setOutputFormat}
          onChangeVariation={handleChangeVariation}
          onUpdateSiteInfo={handleUpdateSiteInfo}
          onRegenerate={handleRegenerate}
          onAppendPresetMeasure={handleAppendPresetMeasure}
          onAddMeasurePreset={handleAddMeasurePreset}
          onRemoveMeasurePreset={handleRemoveMeasurePreset}
          onUploadJsonFile={handleUploadJsonFile}
          onUploadLogoFile={handleUploadLogoFile}
          onRemoveLogo={handleRemoveLogo}
          onDownloadSampleJson={downloadSampleCaseTemplate}
        />

        <main className="flex-1 min-w-0 flex flex-col">
          {/* Status & Attribution Metadata Bar */}
          <div className="bg-white border-b border-slate-200 px-5 lg:px-8 py-2.5 flex flex-wrap items-center justify-between gap-3">
            <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-[11.8px] text-slate-700 tabular-nums">
              <span
                className="px-2 py-0.5 rounded-sm text-[10.8px] font-extrabold text-white"
                style={{ backgroundColor: sourceBrand.primaryHex }}
              >
                {sourceHeaderBadge}
              </span>
              <span className="text-slate-300" aria-hidden="true">·</span>
              <span className="font-semibold text-slate-800">{effectiveMaterial.perspectiveLabel}</span>
              {siteInfo.inkSaverMode && (
                <>
                  <span className="text-slate-300" aria-hidden="true">·</span>
                  <span className="px-1.5 py-0.5 rounded bg-slate-900 text-white text-[10.5px] font-bold">
                    흑백 토너 절약 ON
                  </span>
                </>
              )}
              {effectiveMaterial.isCustomEdited ? (
                <>
                  <span className="text-slate-300" aria-hidden="true">·</span>
                  <span className="px-2 py-0.5 rounded bg-amber-100 border border-amber-300 text-amber-950 text-[10.8px] font-extrabold">
                    {isStandardModelCase(effectiveMaterial.primaryCase)
                      ? '표준 가이드 기반 · 현장 맞춤 반영'
                      : '공단 권고안 기반 · 현장 맞춤 편집됨'}
                  </span>
                  <button
                    type="button"
                    onClick={handleResetAllEditsForCurrentCase}
                    className="inline-flex items-center gap-1 text-[11px] font-bold text-orange-800 hover:underline cursor-pointer"
                  >
                    <RotateCcw className="w-3 h-3" />
                    <span>
                      {isStandardModelCase(effectiveMaterial.primaryCase)
                        ? '표준 가이드 전체 복원'
                        : '공단 원문 전체 복원'}
                    </span>
                  </button>
                </>
              ) : (
                <>
                  <span className="text-slate-300" aria-hidden="true">·</span>
                  <span className="text-slate-500">대책·점검표 클릭 시 현장 맞춤 편집 가능</span>
                </>
              )}
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
            </div>

            <div className="flex items-center gap-3 text-[11.8px]">
              <span className="text-slate-500">
                사례코드: <strong className="text-slate-800">{effectiveMaterial.primaryCase.id}</strong> ({effectiveMaterial.primaryCase.hazard_type})
              </span>
            </div>
          </div>

          {/* Inline Notification Toast */}
          {toast && (
            <div
              role="status"
              className={`mx-5 lg:mx-8 mt-3 px-4 py-2.5 rounded-lg border text-[12.5px] font-semibold flex items-center justify-between gap-3 ${
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
          <div className="flex-1 overflow-auto p-5 lg:p-7 flex flex-col items-center">
            {outputFormat === 'ops' ? (
              <div className="w-full flex justify-center overflow-x-auto pb-4">
                <OpsSheetView
                  material={effectiveMaterial}
                  siteInfo={siteInfo}
                  showKytAnswers={showKytAnswers}
                  onToggleKytAnswers={handleToggleKytAnswers}
                  onUpdateMeasures={handleUpdateMeasures}
                  onResetMeasures={handleResetMeasures}
                  onUpdateTbm={handleUpdateTbm}
                  onResetTbm={handleResetTbm}
                  sheetRef={opsSheetRef}
                />
              </div>
            ) : outputFormat === 'slides' ? (
              <SlideDeckView
                material={effectiveMaterial}
                siteInfo={siteInfo}
                activeSlide={activeSlide}
                onChangeSlide={setActiveSlide}
                showKytAnswers={showKytAnswers}
                onToggleKytAnswers={handleToggleKytAnswers}
                onUpdateMeasures={handleUpdateMeasures}
                onResetMeasures={handleResetMeasures}
                onUpdateTbm={handleUpdateTbm}
                onResetTbm={handleResetTbm}
                slideRef={activeSlideRef}
              />
            ) : (
              <CardNewsView
                material={effectiveMaterial}
                siteInfo={siteInfo}
                onNotify={showToast}
              />
            )}
          </div>
        </main>
      </div>

      {/* Dedicated Single-Page A4 Print Container (deferred so screen paint stays instant) */}
      <div className="hidden print-only-root">
        <OpsSheetView
          material={deferredPrintMaterial}
          siteInfo={siteInfo}
          showKytAnswers={showKytAnswers}
          isPrintClone
        />
      </div>
    </div>
  );
}
