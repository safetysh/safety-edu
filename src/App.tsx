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
  BookOpen,
  Share2,
  SlidersHorizontal,
  Eye,
  Pencil,
  Maximize2,
  Minimize2,
  Lock,
  FileText,
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
  RefsLegalData,
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
  loadRefsLegalDb,
  resolveLegalReferenceForCase,
} from './services/legalLoader';
import {
  loadMeasurePresets,
  loadPersistedSitePrefs,
  saveMeasurePresets,
  savePersistedSitePrefs,
} from './utils/localPrefs';
import { ControlSidebar } from './components/ControlSidebar';
import { OpsSheetView } from './components/OpsSheetView';
import { OpsReferenceSheetView } from './components/OpsReferenceSheetView';
import { LegalReferenceDrawer } from './components/LegalReferenceDrawer';
import { SlideDeckView } from './components/SlideDeckView';
import { CardNewsView } from './components/CardNewsView';
import { ScaledDocumentFrame } from './components/ScaledDocumentFrame';
import { MobileEditSheet } from './components/MobileEditSheet';
import { ImageShareFallbackModal } from './components/ImageShareFallbackModal';
import {
  CapturedPngAsset,
  captureNodeAsPngResult,
  copyNodeAsPngToClipboard,
  downloadNodeAsPng,
  downloadSampleCaseTemplate,
  isInAppBrowser,
  normalizeLogoFileToDataUrl,
} from './utils/exportImage';
import { getForeignLanguageNativeLabel } from './data/multilingualDict';
import { SEASONAL_RISKS } from './data/seasonalRisks';
import {
  formatSourceHeaderBadge,
  getCaseOverviewVerbatim,
  getDisplaySourceRef,
  getSourceBrandStyle,
  isOfficialKoshaApiCase,
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
  const [legalDb, setLegalDb] = useState<RefsLegalData | null>(null);
  const [legalDrawerOpen, setLegalDrawerOpen] = useState<boolean>(false);
  const [isShardLoading, setIsShardLoading] = useState<boolean>(false);

  const [industry, setIndustry] = useState<IndustryType>('건설현장');
  const [workType, setWorkType] = useState<string>(INDUSTRY_WORK_TYPES['건설현장'][0]);
  const [sourceFilter, setSourceFilter] = useState<SourceFilterTab>('ALL');
  const [pinnedCaseId, setPinnedCaseId] = useState<string | null>(null);
  const [outputFormat, setOutputFormat] = useState<OutputFormat>('ops');
  const [variationOption, setVariationOption] = useState<VariationOption>('auto');
  const [activeSlide, setActiveSlide] = useState<number>(0);
  const [showKytAnswers, setShowKytAnswers] = useState<boolean>(true);

  // Mobile/Tablet (<1024px) responsive UX state (strictly isolated from >=1024px desktop)
  const [isMobileViewport, setIsMobileViewport] = useState<boolean>(() =>
    typeof window !== 'undefined' ? window.innerWidth < 1024 : false
  );
  const [mobileTab, setMobileTab] = useState<'settings' | 'preview'>('preview');
  const [mobileOpsPage, setMobileOpsPage] = useState<'page1' | 'page2'>('page1');
  const [mobileZoomMode, setMobileZoomMode] = useState<'fit' | 'actual'>('fit');
  const [mobileEditSheet, setMobileEditSheet] = useState<{
    open: boolean;
    tab: 'measures' | 'tbm';
  }>({ open: false, tab: 'measures' });
  const [fullOverviewModalOpen, setFullOverviewModalOpen] = useState<boolean>(false);
  const [fallbackImageState, setFallbackImageState] = useState<{
    asset: CapturedPngAsset;
    label: string;
  } | null>(null);
  const [isSharingImage, setIsSharingImage] = useState<boolean>(false);

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
  const appendixSheetRef = useRef<HTMLDivElement | null>(null);
  const activeSlideRef = useRef<HTMLDivElement | null>(null);
  const toastTimerRef = useRef<number | null>(null);

  useEffect(() => {
    if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') return;
    const mq = window.matchMedia('(max-width: 1023px)');
    const sync = () => setIsMobileViewport(mq.matches);
    sync();
    mq.addEventListener('change', sync);
    return () => mq.removeEventListener('change', sync);
  }, []);

  useEffect(() => {
    if (!siteInfo.showPage2Appendix && mobileOpsPage === 'page2') {
      setMobileOpsPage('page1');
    }
  }, [siteInfo.showPage2Appendix, mobileOpsPage]);

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

  // Auto-persist site preferences & presets to localStorage (with QuotaExceeded fallback)
  useEffect(() => {
    savePersistedSitePrefs(siteInfo);
  }, [siteInfo]);

  // Keep @media print 2-page mode synchronized on root <html> element
  useEffect(() => {
    document.documentElement.classList.toggle('print-two-page-mode', siteInfo.showPage2Appendix);
    return () => {
      document.documentElement.classList.remove('print-two-page-mode');
    };
  }, [siteInfo.showPage2Appendix]);

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

  // Preload meta_summary.json & refs_legal.json once on mount (static JSON, zero external API)
  useEffect(() => {
    const controller = new AbortController();
    loadMetaSummary(controller.signal).then((meta) => {
      if (meta) setMetaSummary(meta);
    });
    loadRefsLegalDb(controller.signal).then((refs) => {
      if (refs) setLegalDb(refs);
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

  const resolvedLegalRef = useMemo(
    () => resolveLegalReferenceForCase(legalDb, effectiveMaterial.primaryCase, workType),
    [legalDb, effectiveMaterial.primaryCase, workType]
  );
  const deferredPrintLegalRef = useDeferredValue(resolvedLegalRef);

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
    setSiteInfo((prev) => ({ ...prev, ...patch }));
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
    if (file.size > 15 * 1024 * 1024) {
      showToast('error', '로고 이미지는 15MB 이하 파일로 업로드해 주세요.');
      return;
    }

    try {
      const { dataUrl, convertedToPng, compressed } = await normalizeLogoFileToDataUrl(file, 400);
      setSiteInfo((prev) => ({
        ...prev,
        logoDataUrl: dataUrl,
        logoFileName: file.name,
      }));
      showToast(
        'success',
        convertedToPng
          ? `현장 로고(${file.name})를 투명 PNG로 최적화·자동저장했습니다.`
          : compressed
            ? `현장 로고(${file.name})를 모바일·인쇄 규격(400px 이하)으로 자동 압축해 저장했습니다.`
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
      const fileName = await downloadSafetyPptx(effectiveMaterial, siteInfo, resolvedLegalRef);
      const slideCount = siteInfo.showPage2Appendix && resolvedLegalRef ? 6 : 5;
      showToast('success', `${slideCount}장 슬라이드 PPTX 파일이 저장되었습니다: ${fileName}`);
    } catch {
      showToast('error', 'PPTX 파일 생성 중 오류가 발생했습니다. 다시 시도해 주세요.');
    } finally {
      setIsExportingPptx(false);
    }
  };

  const getActiveCaptureTarget = (preferMobilePage: boolean): {
    node: HTMLElement | null;
    prefix: string;
    targetPixelWidth: number;
    label: string;
  } => {
    if (outputFormat === 'ops') {
      const usePage2 =
        preferMobilePage &&
        mobileOpsPage === 'page2' &&
        siteInfo.showPage2Appendix &&
        Boolean(resolvedLegalRef) &&
        Boolean(appendixSheetRef.current);

      if (usePage2) {
        return {
          node: appendixSheetRef.current,
          prefix: `안전교육OPS_2면참고별지_${effectiveMaterial.selectedWorkType}`,
          targetPixelWidth: 1600,
          label: 'A4 2면 참고 별지 (고해상도 PNG)',
        };
      }
      return {
        node: opsSheetRef.current,
        prefix: `OPS_${effectiveMaterial.selectedWorkType}`,
        targetPixelWidth: 1588,
        label: 'A4 1면 안전교육 OPS (고해상도 PNG)',
      };
    }

    return {
      node: activeSlideRef.current,
      prefix: `슬라이드${activeSlide + 1}_${effectiveMaterial.selectedWorkType}`,
      targetPixelWidth: 1920,
      label: `교육용 슬라이드 ${activeSlide + 1}장 (고해상도 PNG)`,
    };
  };

  const handleOpenImageFallback = useCallback((asset: CapturedPngAsset, label: string) => {
    setFallbackImageState({ asset, label });
  }, []);

  const handleExportPng = async (fromMobileBar = false) => {
    if (isExportingPng) return;
    if (outputFormat === 'cardnews') {
      setMobileTab('preview');
      showToast('success', '카드뉴스 화면에서 개별 카드 저장 또는 4장 ZIP 다운로드를 이용해 주세요.');
      return;
    }

    const { node, prefix, targetPixelWidth, label } = getActiveCaptureTarget(
      fromMobileBar || isMobileViewport
    );
    if (!node) {
      showToast('error', '이미지 저장 대상을 찾을 수 없습니다.');
      return;
    }

    setIsExportingPng(true);
    try {
      const dateStr = siteInfo.educationDate || getTodayDateString();
      // In KakaoTalk / Naver in-app browsers, direct blob/data downloads are frequently blocked
      if ((fromMobileBar || isMobileViewport) && isInAppBrowser()) {
        const asset = await captureNodeAsPngResult(node, prefix, dateStr, targetPixelWidth);
        setFallbackImageState({ asset, label });
        return;
      }

      const fileName = await downloadNodeAsPng(node, prefix, dateStr, targetPixelWidth);
      showToast('success', `고해상도 PNG 이미지가 저장되었습니다: ${fileName}`);
    } catch {
      showToast('error', 'PNG 이미지 변환 중 오류가 발생했습니다.');
    } finally {
      setIsExportingPng(false);
    }
  };

  const handleShareMobileImage = async () => {
    if (isSharingImage || isExportingPng) return;
    if (outputFormat === 'cardnews') {
      setMobileTab('preview');
      showToast('success', '카드뉴스 미리보기에서 개별 카드 이미지를 복사·저장해 공유해 주세요.');
      return;
    }

    const { node, prefix, targetPixelWidth, label } = getActiveCaptureTarget(true);
    if (!node) {
      showToast('error', '공유할 교육자료 이미지를 찾을 수 없습니다.');
      return;
    }

    setIsSharingImage(true);
    try {
      const dateStr = siteInfo.educationDate || getTodayDateString();
      const asset = await captureNodeAsPngResult(node, prefix, dateStr, targetPixelWidth);

      // In KakaoTalk/Naver in-app browsers, show long-press save + fresh-gesture share modal directly
      if (isInAppBrowser()) {
        setFallbackImageState({ asset, label });
        return;
      }

      if (typeof navigator !== 'undefined' && typeof navigator.share === 'function') {
        const shareData: ShareData = {
          title: `${effectiveMaterial.selectedWorkType} 안전교육자료`,
          files: [asset.file],
        };
        const canShareFiles =
          typeof navigator.canShare !== 'function' || navigator.canShare(shareData);
        if (canShareFiles) {
          try {
            await navigator.share(shareData);
            showToast('success', '교육자료 이미지 공유를 완료했습니다.');
            return;
          } catch (err) {
            if (err instanceof DOMException && err.name === 'AbortError') {
              return;
            }
            // Fall through to high-res preview modal (handles iOS Safari NotAllowedError gesture expiry)
          }
        }
      }

      setFallbackImageState({ asset, label });
    } catch {
      showToast('error', '공유용 이미지 생성 중 오류가 발생했습니다.');
    } finally {
      setIsSharingImage(false);
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

  const anyMobileOverlayOpen =
    mobileEditSheet.open ||
    legalDrawerOpen ||
    Boolean(fallbackImageState) ||
    fullOverviewModalOpen;

  const showPage2 = siteInfo.showPage2Appendix && Boolean(resolvedLegalRef);
  const mobileActivePage2 = isMobileViewport && outputFormat === 'ops' && showPage2 && mobileOpsPage === 'page2';
  const isOfficialPrimary = isOfficialKoshaApiCase(effectiveMaterial.primaryCase);

  return (
    <div className="min-h-screen flex flex-col bg-slate-100 text-slate-900">
      {/* Desktop Top Bar (>=1024px): 100% preserved */}
      <header className="no-print hidden lg:flex sticky top-0 z-30 bg-slate-900 text-white border-b border-slate-800 px-6 h-14 items-center justify-between gap-4">
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
                onClick={() => handleExportPng(false)}
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

      {/* Mobile/Tablet Slim Single-Row Header (<1024px, <= 48px) */}
      <header className="no-print flex lg:hidden sticky top-0 z-30 bg-slate-900 text-white border-b border-slate-800 px-3 h-12 items-center justify-between gap-2">
        <div className="flex items-center gap-2 min-w-0">
          <ShieldCheck className="w-4.5 h-4.5 text-orange-400 shrink-0" />
          <span className="text-[14px] font-extrabold tracking-tight truncate">
            산업안전 교육자료 제작기
          </span>
        </div>
        <button
          type="button"
          onClick={handlePrintPdf}
          aria-label="A4 인쇄"
          className="min-h-[36px] px-2.5 rounded-md bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-100 text-[12px] font-bold inline-flex items-center gap-1 shrink-0 whitespace-nowrap cursor-pointer"
        >
          <Printer className="w-3.5 h-3.5 shrink-0" />
          <span>인쇄</span>
        </button>
      </header>

      {/* Mobile/Tablet Fixed 2-Tab Switcher (<1024px) */}
      <nav
        aria-label="모바일 작업 탭"
        className="no-print lg:hidden sticky top-12 z-20 bg-white border-b border-slate-200 px-3 py-1.5 shadow-2xs"
      >
        <div className="grid grid-cols-2 gap-1.5 p-1 bg-slate-100 rounded-xl">
          <button
            type="button"
            onClick={() => setMobileTab('settings')}
            className={`min-h-[44px] rounded-lg text-[13px] font-extrabold inline-flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
              mobileTab === 'settings'
                ? 'bg-slate-900 text-white shadow-xs'
                : 'text-slate-600'
            }`}
          >
            <SlidersHorizontal className="w-4 h-4 shrink-0" />
            <span>설정 · 사례 선택</span>
          </button>
          <button
            type="button"
            onClick={() => setMobileTab('preview')}
            className={`min-h-[44px] rounded-lg text-[13px] font-extrabold inline-flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
              mobileTab === 'preview'
                ? 'bg-slate-900 text-white shadow-xs'
                : 'text-slate-600'
            }`}
          >
            <Eye className="w-4 h-4 shrink-0" />
            <span>A4 미리보기 · 편집</span>
            {effectiveMaterial.isCustomEdited && (
              <span className="w-2 h-2 rounded-full bg-orange-500 shrink-0" aria-hidden="true" />
            )}
          </button>
        </div>
      </nav>

      {/* Mobile Toast Notification (visible on both Settings & Preview tabs) */}
      {toast && (
        <div
          role="status"
          className={`no-print lg:hidden mx-3 mt-2.5 px-3.5 py-2.5 rounded-lg border text-[12px] font-semibold flex items-center justify-between gap-2.5 ${
            toast.type === 'success'
              ? 'bg-emerald-50 border-emerald-200 text-emerald-900'
              : 'bg-red-50 border-red-200 text-red-900'
          }`}
        >
          <div className="flex items-center gap-2 min-w-0">
            {toast.type === 'success' ? (
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            ) : (
              <AlertCircle className="w-4 h-4 text-red-600 shrink-0" />
            )}
            <span className="keep-all">{toast.message}</span>
          </div>
          <button
            type="button"
            onClick={() => setToast(null)}
            aria-label="알림 닫기"
            className="min-w-[36px] min-h-[36px] flex items-center justify-center text-slate-500 shrink-0 cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Main Split Workspace */}
      <div className="no-print flex-1 flex flex-col lg:flex-row min-h-0">
        <ControlSidebar
          className={
            mobileTab === 'settings'
              ? 'flex lg:flex pb-24 lg:pb-0'
              : 'hidden lg:flex'
          }
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

        {/*
          Keep <main> mounted & laid out (never display:none) while on Mobile Settings tab
          so A4 opsSheetRef / appendixSheetRef preserve exact 794x1123 layout metrics for
          zero-flicker instant PNG capture & sharing from any mobile tab.
        */}
        <main
          aria-hidden={isMobileViewport && mobileTab === 'settings' ? true : undefined}
          className={
            isMobileViewport && mobileTab === 'settings'
              ? 'fixed left-0 top-0 w-0 h-0 overflow-hidden pointer-events-none -z-10'
              : 'flex-1 min-w-0 flex flex-col pb-24 lg:pb-0'
          }
        >
          {/* Desktop Status & Attribution Metadata Bar (>=1024px) */}
          <div className="hidden lg:flex bg-white border-b border-slate-200 px-8 py-2.5 flex-wrap items-center justify-between gap-3">
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

            <div className="flex items-center gap-2.5 text-[11.8px]">
              <button
                type="button"
                data-export-hide="true"
                onClick={() => setLegalDrawerOpen(true)}
                className="no-print inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-slate-900 hover:bg-slate-800 text-white text-[11.2px] font-bold transition-colors cursor-pointer whitespace-nowrap"
              >
                <BookOpen className="w-3.5 h-3.5 text-orange-400 shrink-0" />
                <span>법령·지침·영상 참고</span>
              </button>
              <span className="text-slate-500">
                사례코드: <strong className="text-slate-800">{effectiveMaterial.primaryCase.id}</strong> ({effectiveMaterial.primaryCase.hazard_type})
              </span>
            </div>
          </div>

          {/* Desktop Inline Notification Toast (>=1024px) */}
          {toast && (
            <div
              role="status"
              className={`hidden lg:flex mx-8 mt-3 px-4 py-2.5 rounded-lg border text-[12.5px] font-semibold items-center justify-between gap-3 ${
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

          {/* Mobile/Tablet Non-Sticky Preview Controls (<1024px) */}
          <div className="lg:hidden px-3 pt-2.5 pb-1 space-y-2">
            <div className="flex items-center justify-between gap-2 flex-wrap">
              <div className="flex items-center gap-1.5 min-w-0 flex-wrap">
                <span
                  className="px-2 py-0.5 rounded-sm text-[10.5px] font-extrabold text-white shrink-0"
                  style={{ backgroundColor: sourceBrand.primaryHex }}
                >
                  {sourceBrand.shortLabel}
                </span>
                <span className="text-[12px] font-bold text-slate-800 truncate">
                  {industry} · {workType}
                </span>
              </div>
              {effectiveMaterial.isCustomEdited && (
                <button
                  type="button"
                  onClick={handleResetAllEditsForCurrentCase}
                  className="min-h-[34px] px-2 rounded-md bg-amber-100 border border-amber-300 text-amber-950 text-[11px] font-extrabold inline-flex items-center gap-1 shrink-0 cursor-pointer"
                >
                  <RotateCcw className="w-3 h-3" />
                  <span>{isOfficialPrimary ? '공단 원문 복원' : '표준 복원'}</span>
                </button>
              )}
            </div>

            {outputFormat === 'ops' && (
              <div className="flex items-center justify-between gap-2 flex-wrap">
                {showPage2 ? (
                  <div className="inline-flex items-center p-0.5 rounded-full bg-slate-200/90 border border-slate-300">
                    <button
                      type="button"
                      onClick={() => setMobileOpsPage('page1')}
                      className={`min-h-[38px] px-3 rounded-full text-[12px] font-extrabold transition-all cursor-pointer ${
                        mobileOpsPage === 'page1'
                          ? 'bg-slate-900 text-white shadow-xs'
                          : 'text-slate-700'
                      }`}
                    >
                      1면 OPS
                    </button>
                    <button
                      type="button"
                      onClick={() => setMobileOpsPage('page2')}
                      className={`min-h-[38px] px-3 rounded-full text-[12px] font-extrabold transition-all cursor-pointer ${
                        mobileOpsPage === 'page2'
                          ? 'bg-slate-900 text-white shadow-xs'
                          : 'text-slate-700'
                      }`}
                    >
                      2면 참고 별지
                    </button>
                  </div>
                ) : (
                  <span className="text-[11.5px] font-bold text-slate-600">
                    A4 한페이지 OPS (1면)
                  </span>
                )}

                <div className="flex items-center gap-1.5 ml-auto">
                  <button
                    type="button"
                    onClick={() =>
                      setMobileZoomMode((prev) => (prev === 'fit' ? 'actual' : 'fit'))
                    }
                    className="min-h-[40px] px-2.5 rounded-lg border border-slate-300 bg-white text-slate-800 text-[12px] font-bold inline-flex items-center gap-1 shrink-0 cursor-pointer"
                  >
                    {mobileZoomMode === 'fit' ? (
                      <>
                        <Maximize2 className="w-3.5 h-3.5 shrink-0" />
                        <span>100% 확대</span>
                      </>
                    ) : (
                      <>
                        <Minimize2 className="w-3.5 h-3.5 shrink-0" />
                        <span>화면 맞춤</span>
                      </>
                    )}
                  </button>

                  <button
                    type="button"
                    onClick={() => setMobileEditSheet({ open: true, tab: 'measures' })}
                    className="min-h-[40px] px-3 rounded-lg bg-slate-900 hover:bg-slate-800 text-white text-[12px] font-extrabold inline-flex items-center gap-1 shrink-0 cursor-pointer"
                  >
                    <Pencil className="w-3.5 h-3.5 text-orange-400 shrink-0" />
                    <span>대책·TBM 편집</span>
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Document Viewport */}
          <div className="flex-1 overflow-y-auto px-3 py-2.5 lg:p-7 flex flex-col items-center">
            {outputFormat === 'ops' ? (
              <div className="w-full flex flex-col items-center gap-4 lg:gap-6 pb-4 lg:pb-6">
                <div className={mobileActivePage2 ? 'hidden lg:block w-full' : 'w-full'}>
                  <ScaledDocumentFrame
                    naturalWidth={794}
                    naturalHeight={1123}
                    zoomMode={isMobileViewport ? mobileZoomMode : 'fit'}
                    recalcTrigger={`${mobileTab}-${mobileOpsPage}-${mobileZoomMode}-${effectiveMaterial.primaryCase.id}`}
                  >
                    <OpsSheetView
                      material={effectiveMaterial}
                      siteInfo={siteInfo}
                      legalRef={resolvedLegalRef}
                      showKytAnswers={showKytAnswers}
                      onToggleKytAnswers={handleToggleKytAnswers}
                      onUpdateMeasures={handleUpdateMeasures}
                      onResetMeasures={handleResetMeasures}
                      onUpdateTbm={handleUpdateTbm}
                      onResetTbm={handleResetTbm}
                      sheetRef={opsSheetRef}
                      isMobileViewport={isMobileViewport}
                      onRequestMobileEdit={(tab) => setMobileEditSheet({ open: true, tab })}
                      onRequestFullOverviewModal={() => setFullOverviewModalOpen(true)}
                    />
                  </ScaledDocumentFrame>
                </div>

                {showPage2 && resolvedLegalRef && (
                  <div
                    className={
                      isMobileViewport && mobileOpsPage !== 'page2'
                        ? 'hidden lg:block w-full'
                        : 'w-full'
                    }
                  >
                    <ScaledDocumentFrame
                      naturalWidth={794}
                      naturalHeight={1123}
                      zoomMode={isMobileViewport ? mobileZoomMode : 'fit'}
                      recalcTrigger={`${mobileTab}-${mobileOpsPage}-${mobileZoomMode}-${effectiveMaterial.primaryCase.id}-${siteInfo.showPage2Appendix}`}
                    >
                      <OpsReferenceSheetView
                        material={effectiveMaterial}
                        siteInfo={siteInfo}
                        legalRef={resolvedLegalRef}
                        sheetRef={appendixSheetRef}
                        onNotify={showToast}
                        onOpenImageFallback={handleOpenImageFallback}
                      />
                    </ScaledDocumentFrame>
                  </div>
                )}
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
                legalRef={resolvedLegalRef}
                onNotify={showToast}
              />
            )}
          </div>
        </main>
      </div>

      {/* Mobile/Tablet Fixed Bottom Action Bar (<1024px, hidden when bottom sheet/drawer/modal is open) */}
      {!anyMobileOverlayOpen && (
        <div
          data-export-hide="true"
          className="no-print lg:hidden fixed bottom-0 inset-x-0 z-30 bg-white/95 backdrop-blur-xs border-t border-slate-200 shadow-[0_-4px_16px_rgba(15,23,42,0.08)]"
          style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}
        >
          <div className="grid grid-cols-4 gap-1 px-2 py-1.5">
            <button
              type="button"
              onClick={() => handleExportPng(true)}
              disabled={isExportingPng || isSharingImage}
              className="min-h-[50px] rounded-xl bg-slate-100 active:bg-slate-200 disabled:opacity-60 text-slate-900 flex flex-col items-center justify-center gap-0.5 text-[11px] font-extrabold cursor-pointer"
            >
              {isExportingPng ? (
                <Loader2 className="w-4 h-4 animate-spin text-slate-800" />
              ) : (
                <ImageIcon className="w-4 h-4 text-slate-800" />
              )}
              <span>PNG 저장</span>
            </button>

            <button
              type="button"
              onClick={handleShareMobileImage}
              disabled={isSharingImage || isExportingPng}
              className="min-h-[50px] rounded-xl bg-emerald-700 active:bg-emerald-800 disabled:opacity-60 text-white flex flex-col items-center justify-center gap-0.5 text-[11px] font-extrabold cursor-pointer"
            >
              {isSharingImage ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Share2 className="w-4 h-4" />
              )}
              <span>이미지 공유</span>
            </button>

            <button
              type="button"
              onClick={handleExportPptx}
              disabled={isExportingPptx}
              className="min-h-[50px] rounded-xl bg-orange-600 active:bg-orange-700 disabled:opacity-60 text-white flex flex-col items-center justify-center gap-0.5 text-[11px] font-extrabold cursor-pointer"
            >
              {isExportingPptx ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Download className="w-4 h-4" />
              )}
              <span>PPTX</span>
            </button>

            <button
              type="button"
              onClick={() => setLegalDrawerOpen(true)}
              className="min-h-[50px] rounded-xl bg-slate-900 active:bg-slate-800 text-white flex flex-col items-center justify-center gap-0.5 text-[11px] font-extrabold cursor-pointer"
            >
              <BookOpen className="w-4 h-4 text-orange-400" />
              <span>법령·영상</span>
            </button>
          </div>
        </div>
      )}

      {/* Dedicated A4 Print Container (1-page or 2-page with Reference Appendix) */}
      <div
        className={`hidden print-only-root ${
          siteInfo.showPage2Appendix && deferredPrintLegalRef ? 'print-two-page' : ''
        }`}
      >
        <OpsSheetView
          material={deferredPrintMaterial}
          siteInfo={siteInfo}
          legalRef={deferredPrintLegalRef}
          showKytAnswers={showKytAnswers}
          isPrintClone
        />
        {siteInfo.showPage2Appendix && deferredPrintLegalRef && (
          <OpsReferenceSheetView
            material={deferredPrintMaterial}
            siteInfo={siteInfo}
            legalRef={deferredPrintLegalRef}
            isPrintClone
          />
        )}
      </div>

      {/* Web-only Legal / KOSHA GUIDE / Media Reference Drawer */}
      <LegalReferenceDrawer
        open={legalDrawerOpen}
        onClose={() => setLegalDrawerOpen(false)}
        legalRef={resolvedLegalRef}
        primaryCase={effectiveMaterial.primaryCase}
      />

      {/* Mobile-only Safe Editing Bottom Sheet (Measures & TBM) */}
      <MobileEditSheet
        open={mobileEditSheet.open}
        initialTab={mobileEditSheet.tab}
        material={effectiveMaterial}
        measurePresets={measurePresets}
        onClose={() => setMobileEditSheet((prev) => ({ ...prev, open: false }))}
        onUpdateMeasures={handleUpdateMeasures}
        onResetMeasures={handleResetMeasures}
        onUpdateTbm={handleUpdateTbm}
        onResetTbm={handleResetTbm}
        onResetAll={handleResetAllEditsForCurrentCase}
        onAppendPresetMeasure={handleAppendPresetMeasure}
      />

      {/* Mobile & In-App Browser High-Res PNG Preview / Long-Press Save & Share Fallback Modal */}
      <ImageShareFallbackModal
        asset={fallbackImageState?.asset ?? null}
        titleLabel={fallbackImageState?.label}
        onClose={() => setFallbackImageState(null)}
        onNotify={showToast}
      />

      {/* Mobile Readable Full Factual Overview Modal (Read-Only) */}
      {fullOverviewModalOpen && (
        <div
          data-export-hide="true"
          className="no-print fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-slate-950/55 backdrop-blur-[1px] p-0 sm:p-4"
          onClick={() => setFullOverviewModalOpen(false)}
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-label="재해개요 전체 원문 보기"
            className="w-full sm:max-w-[560px] max-h-[85dvh] bg-white rounded-t-2xl sm:rounded-2xl shadow-2xl flex flex-col overflow-hidden overscroll-contain"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="shrink-0 bg-slate-900 text-white px-4 py-3 flex items-center justify-between gap-2">
              <div className="flex items-center gap-1.5 min-w-0">
                {isOfficialPrimary ? (
                  <Lock className="w-4 h-4 text-orange-400 shrink-0" />
                ) : (
                  <FileText className="w-4 h-4 text-slate-300 shrink-0" />
                )}
                <h2 className="text-[14.5px] font-extrabold truncate">
                  재해개요 전체 원문 ({isOfficialPrimary ? '공단 공식 원문 · 수정 불가' : '표준 교육모델'})
                </h2>
              </div>
              <button
                type="button"
                onClick={() => setFullOverviewModalOpen(false)}
                aria-label="원문 모달 닫기"
                className="min-w-[44px] min-h-[44px] rounded-lg text-slate-300 hover:text-white flex items-center justify-center shrink-0 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div
              className="flex-1 overflow-y-auto overscroll-contain p-4 space-y-3 keep-all"
              style={{ paddingBottom: 'calc(1.25rem + env(safe-area-inset-bottom))' }}
            >
              <p className="text-[15.5px] font-medium text-slate-900 leading-relaxed whitespace-pre-line">
                {getCaseOverviewVerbatim(effectiveMaterial.primaryCase)}
              </p>
              <div className="rounded-lg bg-slate-50 border border-slate-200 p-3 text-[12px] text-slate-600 space-y-1">
                <p>
                  <strong className="text-slate-800">기인물:</strong> {effectiveMaterial.primaryCase.equipment}
                </p>
                {effectiveMaterial.primaryCase.occurred_date && (
                  <p>
                    <strong className="text-slate-800">발생일자:</strong> {effectiveMaterial.primaryCase.occurred_date}
                  </p>
                )}
                <p>
                  <strong className="text-slate-800">출처:</strong> {getDisplaySourceRef(effectiveMaterial.primaryCase)}
                </p>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
