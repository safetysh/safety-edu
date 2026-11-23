import { toPng } from 'html-to-image';
import JSZip from 'jszip';
import { AccidentCase } from '../types/safety';

function sanitizeName(text: string): string {
  return text.replace(/[\\/:*?"<>|\s·]+/g, '_').replace(/_+/g, '_').slice(0, 40);
}

async function captureNodeDataUrl(node: HTMLElement, targetPixelWidth?: number): Promise<string> {
  const computedRatio =
    targetPixelWidth && node.offsetWidth > 0
      ? Math.max(1.5, targetPixelWidth / node.offsetWidth)
      : 2;

  try {
    return await toPng(node, {
      cacheBust: true,
      pixelRatio: computedRatio,
      backgroundColor: '#ffffff',
    });
  } catch {
    return await toPng(node, {
      cacheBust: true,
      pixelRatio: computedRatio,
      backgroundColor: '#ffffff',
      skipFonts: true,
    });
  }
}

function triggerDownload(href: string, fileName: string): void {
  const link = document.createElement('a');
  link.download = fileName;
  link.href = href;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

/**
 * Exports a DOM node (OPS A4 sheet, active 16:9 slide, or single 1:1 card) as high-res PNG.
 */
export async function downloadNodeAsPng(
  node: HTMLElement,
  baseTitle: string,
  dateStr: string,
  targetPixelWidth?: number
): Promise<string> {
  const dataUrl = await captureNodeDataUrl(node, targetPixelWidth);
  const fileName = `${sanitizeName(baseTitle)}_${dateStr}.png`;
  triggerDownload(dataUrl, fileName);
  return fileName;
}

/**
 * Exports all 4 mobile card news DOM nodes (1080x1080px each) packed into a single ZIP file.
 */
export async function downloadCardNewsZip(
  nodes: Array<{ node: HTMLElement; slug: string }>,
  workType: string,
  dateStr: string
): Promise<string> {
  const zip = new JSZip();

  for (let i = 0; i < nodes.length; i++) {
    const { node, slug } = nodes[i];
    const dataUrl = await captureNodeDataUrl(node, 1080);
    const base64Data = dataUrl.split(',')[1];
    if (base64Data) {
      zip.file(`0${i + 1}_${slug}.png`, base64Data, { base64: true });
    }
  }

  const blob = await zip.generateAsync({ type: 'blob' });
  const fileName = `카드뉴스4컷_${sanitizeName(workType)}_${dateStr}.zip`;
  const url = URL.createObjectURL(blob);
  triggerDownload(url, fileName);
  URL.revokeObjectURL(url);
  return fileName;
}

/**
 * Downloads a valid sample JSON template so safety managers can quickly prepare
 * additional serious accident cases and merge them into the local DB.
 */
export function downloadSampleCaseTemplate(): void {
  const sample: AccidentCase[] = [
    {
      id: 'CUSTOM-001',
      industry: '제조업',
      work_type: '프레스·절곡·전단기 작업',
      equipment: '110톤 동력프레스 및 금형 이송부',
      hazard_type: '끼임',
      title: '동력프레스 금형 이물질 제거 중 광전자식 방호장치 해제 상태로 손 협착',
      summary_3lines: [
        '자동차 차체 부품 성형 중 프레스 하부 금형에 스크랩 조각이 걸려 정상 성형이 지연됨.',
        '작업자가 광전자식 안전장치를 꺼둔 상태에서 주전원 차단 없이 손으로 스크랩을 제거하려 함.',
        '발판 페달이 오조작되며 상부 슬라이드가 하강해 작업자 손이 금형 사이에 협착됨.',
      ],
      timeline: [
        { step: '1단계', label: '방호장치 해제', detail: '작업 속도 향상을 위해 광전자식 방호장치 전원을 임의로 끔.' },
        { step: '2단계', label: '스크랩 걸림', detail: '성형 완료 후 잔여 금속 조각이 하부 금형에 걸림.' },
        { step: '3단계', label: '수작업 진입', detail: '전용 집게(수공구) 없이 금형 내부로 맨손을 집어넣음.' },
        { step: '4단계', label: '슬라이드 하강', detail: '풋스위치 오조작으로 프레스 상형이 급하강하며 협착 발생.' },
      ],
      direct_causes: [
        '광전자식 방호장치(안전센서) 임의 해제 및 무력화',
        '금형 내 이물질 제거 시 전원 차단·안전블록 미설치',
        '전용 수공구(긴 집게·자석봉) 미사용 및 위험점 신체 진입',
      ],
      root_causes: [
        '방호장치 정상 작동 여부에 대한 일상점검 및 관리자 확인 누락',
        '프레스 금형 트러블 발생 시 정지·안전블록 삽입 표준절차 교육 미흡',
      ],
      preventive_measures: [
        '광전자식·양수조작식 방호장치 상시 정상 작동 유지 및 임의 해제 엄격 금지',
        '금형 청소·점검·교체 시 주전원 차단 후 안전블록(Safety Block) 반드시 삽입',
        '금형 내부 이물질 제거 시 절대 손을 넣지 말고 전용 긴 집게·에어건 사용',
        '풋스위치(발판) 오조작 방지용 견고한 덮개 설치 및 양수조작 모드 우선 적용',
      ],
      tbm_checklist: [
        '광전자식·양수조작식 방호장치가 정상 작동하는지 시험 확인했는가?',
        '금형 점검·교체용 안전블록이 설비 옆 지정 위치에 비치되어 있는가?',
        '스크랩 제거용 전용 집게와 에어건이 준비되어 있는가?',
        '풋스위치 오조작 방지 덮개가 파손 없이 고정되어 있는가?',
        '금형 내부 손 진입 절대 금지 원칙을 작업자 전원이 숙지했는가?',
      ],
      ox_comparison: [
        {
          wrong: '“센서가 자꾸 걸려서 작업이 느리니 광전자 스위치를 끄고 작업하자.”',
          right: '방호장치 없이는 절대 프레스를 가동하지 않으며 이상 시 즉시 보고한다.',
          note: '방호장치 해제는 프레스 끼임 중대재해의 1순위 직접 원인입니다.',
        },
        {
          wrong: '“금형 사이에 낀 조각만 손으로 재빨리 빼고 다시 밟자.”',
          right: '설비를 정지하고 안전블록을 끼우거나 반드시 전용 긴 집게로 제거한다.',
          note: '슬라이드 하강 속도는 사람이 손을 빼는 반응 속도보다 훨씬 빠릅니다.',
        },
      ],
      kyt_quiz: {
        question: '동력프레스 작업 중 금형에 스크랩이 걸렸을 때 협착을 막는 3대 수칙은?',
        answers: [
          '광전자식·양수조작식 방호장치 상시 정상 작동 유지(임의 해제 금지)',
          '금형 점검·조치 시 전원 차단 및 안전블록 삽입 후 작업',
          '금형 내 손 진입 절대 금지 및 전용 긴 집게·수공구 사용',
        ],
      },
      worker_slogan: '방호장치 해제 금지! 금형 안엔 손 대신 집게와 안전블록!',
      legal_ref: '산업안전보건기준에 관한 규칙 제103조(프레스 등의 위험 방지)',
      related_work_types: ['컨베이어·회전체 점검/청소', '폐기물 파쇄·압축기 작업'],
    },
  ];

  const blob = new Blob([JSON.stringify(sample, null, 2)], {
    type: 'application/json;charset=utf-8',
  });
  const url = URL.createObjectURL(blob);
  triggerDownload(url, '사고사례_추가_샘플양식.json');
  URL.revokeObjectURL(url);
}
