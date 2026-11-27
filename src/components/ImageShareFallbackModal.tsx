import React, { useEffect, useState } from 'react';
import { Download, Share2, X, Smartphone } from 'lucide-react';
import { CapturedPngAsset, triggerDownload } from '../utils/exportImage';

interface ImageShareFallbackModalProps {
  asset: CapturedPngAsset | null;
  titleLabel?: string;
  onClose: () => void;
  onNotify?: (type: 'success' | 'error', message: string) => void;
}

/**
 * Mobile & In-App Browser safe fallback modal for generated high-resolution PNG images.
 * Handles iOS Safari Web Share transient-activation expiration and KakaoTalk/Naver
 * in-app download blocks by showing a native long-press-saveable <img> + fresh-gesture Share button.
 */
export const ImageShareFallbackModal: React.FC<ImageShareFallbackModalProps> = ({
  asset,
  titleLabel = '고해상도 교육자료 이미지',
  onClose,
  onNotify,
}) => {
  const [isSharing, setIsSharing] = useState(false);

  useEffect(() => {
    if (!asset) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [asset, onClose]);

  if (!asset) return null;

  const canNativeShare =
    typeof navigator !== 'undefined' && typeof navigator.share === 'function';

  const handleFreshGestureShare = async () => {
    if (!canNativeShare || isSharing) return;
    setIsSharing(true);
    try {
      const shareData: ShareData = {
        title: titleLabel,
        files: [asset.file],
      };
      if (typeof navigator.canShare === 'function' && !navigator.canShare(shareData)) {
        onNotify?.(
          'error',
          '현재 브라우저에서 파일 직접 공유가 제한됩니다. 위 이미지를 길게 눌러 사진에 저장해 주세요.'
        );
        return;
      }
      await navigator.share(shareData);
      onNotify?.('success', '이미지 공유를 완료했습니다.');
    } catch (err) {
      if (err instanceof DOMException && err.name === 'AbortError') {
        return;
      }
      onNotify?.(
        'error',
        '바로 공유가 제한된 환경입니다. 위 이미지를 길게 눌러 ‘사진에 저장’ 후 단톡방에 전송해 주세요.'
      );
    } finally {
      setIsSharing(false);
    }
  };

  const handleDirectDownload = () => {
    triggerDownload(asset.dataUrl, asset.fileName);
    onNotify?.('success', `PNG 파일 다운로드를 요청했습니다: ${asset.fileName}`);
  };

  return (
    <div
      data-export-hide="true"
      className="no-print fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-slate-950/65 backdrop-blur-[1px] p-0 sm:p-4"
      onClick={onClose}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-label="고해상도 이미지 저장 및 공유"
        className="w-full sm:max-w-[520px] max-h-[90dvh] bg-white rounded-t-2xl sm:rounded-2xl shadow-2xl flex flex-col overflow-hidden overscroll-contain"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="shrink-0 bg-slate-900 text-white px-4 py-3 flex items-center justify-between gap-2">
          <div className="min-w-0">
            <h2 className="text-[14.5px] font-extrabold truncate">{titleLabel}</h2>
            <p className="text-[11px] text-slate-300 truncate">{asset.fileName}</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="이미지 미리보기 닫기"
            className="min-w-[44px] min-h-[44px] rounded-lg text-slate-300 hover:text-white hover:bg-slate-800 flex items-center justify-center shrink-0 cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="shrink-0 bg-amber-50 border-b border-amber-200 px-4 py-2.5 flex items-start gap-2 text-[12px] font-bold text-amber-950 keep-all">
          <Smartphone className="w-4 h-4 text-amber-700 shrink-0 mt-0.5" />
          <span>
            아이폰·카카오톡 인앱 브라우저에서는 아래 <strong>이미지를 길게 눌러 ‘사진에 저장’</strong>하거나, <strong>[공유하기]</strong> 버튼으로 바로 전송하세요.
          </span>
        </div>

        <div className="flex-1 overflow-y-auto overscroll-contain bg-slate-100 p-4 flex items-center justify-center">
          <img
            src={asset.dataUrl}
            alt={titleLabel}
            className="max-h-[54dvh] w-auto max-w-full rounded-md border border-slate-300 shadow-md bg-white select-auto"
            style={{ WebkitTouchCallout: 'default' }}
          />
        </div>

        <div
          className="shrink-0 bg-white border-t border-slate-200 p-3 grid grid-cols-2 gap-2"
          style={{ paddingBottom: 'calc(0.75rem + env(safe-area-inset-bottom))' }}
        >
          {canNativeShare ? (
            <button
              type="button"
              onClick={handleFreshGestureShare}
              disabled={isSharing}
              className="min-h-[48px] rounded-xl bg-emerald-700 hover:bg-emerald-600 active:bg-emerald-800 disabled:opacity-60 text-white text-[13.5px] font-extrabold inline-flex items-center justify-center gap-1.5 cursor-pointer"
            >
              <Share2 className="w-4 h-4 shrink-0" />
              <span>공유하기</span>
            </button>
          ) : (
            <button
              type="button"
              onClick={onClose}
              className="min-h-[48px] rounded-xl border border-slate-300 bg-slate-100 text-slate-800 text-[13.5px] font-bold inline-flex items-center justify-center cursor-pointer"
            >
              닫기
            </button>
          )}
          <button
            type="button"
            onClick={handleDirectDownload}
            className="min-h-[48px] rounded-xl bg-slate-900 hover:bg-slate-800 active:bg-slate-950 text-white text-[13.5px] font-bold inline-flex items-center justify-center gap-1.5 cursor-pointer"
          >
            <Download className="w-4 h-4 shrink-0" />
            <span>파일 저장</span>
          </button>
        </div>
      </div>
    </div>
  );
};
