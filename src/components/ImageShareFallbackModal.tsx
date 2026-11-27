import React, { useEffect, useState } from 'react';
import { Download, Share2, X, Smartphone, CheckCircle2, AlertCircle } from 'lucide-react';
import {
  CapturedPngAsset,
  isIosDevice,
  triggerBlobDownload,
} from '../utils/exportImage';

interface ImageShareFallbackModalProps {
  asset: CapturedPngAsset | null;
  titleLabel?: string;
  autoDownloaded?: boolean;
  onClose: () => void;
  onNotify?: (type: 'success' | 'error', message: string) => void;
}

/**
 * Mobile & In-App Browser safe image save/share modal for generated high-resolution PNG images.
 * - Uses `asset.dataUrl` on `<img>` so iOS Safari & WKWebView long-press reliably offers "사진에 저장".
 * - Passes `{ files: [asset.file] }` ONLY (without `title`/`text`) to `navigator.share()` so iOS
 *   treats the payload as a pure image and exposes "이미지 저장 (Save Image)" in the native Share Sheet.
 * - Uses `Blob ObjectURL` for `<a download>` so Android Chrome & desktop downloads never fail on large data URIs.
 */
export const ImageShareFallbackModal: React.FC<ImageShareFallbackModalProps> = ({
  asset,
  titleLabel = '고해상도 교육자료 이미지',
  autoDownloaded = false,
  onClose,
  onNotify,
}) => {
  const [isSharing, setIsSharing] = useState(false);
  const [inlineNotice, setInlineNotice] = useState<{
    type: 'success' | 'error';
    text: string;
  } | null>(null);

  useEffect(() => {
    setInlineNotice(
      autoDownloaded
        ? {
            type: 'success',
            text: '기기 다운로드 폴더로 이미지 저장을 시작했습니다. 사진첩에 보이지 않으면 아래 버튼을 이용해 주세요.',
          }
        : null
    );
  }, [asset, autoDownloaded]);

  useEffect(() => {
    if (!asset) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [asset, onClose]);

  if (!asset) return null;

  const isIos = isIosDevice();
  const canNativeShare =
    typeof navigator !== 'undefined' && typeof navigator.share === 'function';

  const handleFreshGestureShare = async () => {
    if (!canNativeShare || isSharing) return;
    setIsSharing(true);
    try {
      // Pure `{ files }` payload (NO title/text) ensures iOS Share Sheet displays "이미지 저장 (Save Image)"
      const shareData: ShareData = { files: [asset.file] };
      if (typeof navigator.canShare === 'function' && !navigator.canShare(shareData)) {
        const msg =
          '이 브라우저에서는 공유 시트 파일 전달이 제한됩니다. 위 이미지를 길게 눌러 ‘사진에 저장’해 주세요.';
        setInlineNotice({ type: 'error', text: msg });
        onNotify?.('error', msg);
        return;
      }
      await navigator.share(shareData);
      setInlineNotice({ type: 'success', text: '사진 저장 · 공유를 완료했습니다.' });
      onNotify?.('success', '사진 저장 · 공유를 완료했습니다.');
    } catch (err) {
      if (err instanceof DOMException && err.name === 'AbortError') {
        return;
      }
      const msg =
        '바로 공유가 제한된 앱 내 브라우저입니다. 위 이미지를 길게 눌러 ‘사진에 저장’하거나, 우측 메뉴에서 Safari/크롬으로 열어 주세요.';
      setInlineNotice({ type: 'error', text: msg });
      onNotify?.('error', msg);
    } finally {
      setIsSharing(false);
    }
  };

  const handleDirectDownload = () => {
    triggerBlobDownload(asset.blob, asset.fileName);
    const msg = isIos
      ? '‘파일’ 앱 저장을 요청했습니다. 아이폰 ‘사진’ 앱 저장은 [사진 저장 · 공유] → ‘이미지 저장’ 또는 이미지 길게 누르기를 사용해 주세요.'
      : `다운로드 폴더에 저장했습니다: ${asset.fileName}`;
    setInlineNotice({ type: 'success', text: msg });
    onNotify?.('success', msg);
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
            {isIos ? (
              <>
                아이폰 사진첩 저장: 아래 <strong>[사진 저장 · 공유] → ‘이미지 저장’</strong>을 누르거나, 이미지를 <strong>길게 눌러 ‘사진에 저장’</strong>하세요.
              </>
            ) : (
              <>
                아래 <strong>이미지를 길게 눌러 ‘이미지 저장’</strong>하거나, <strong>[사진 저장 · 공유]</strong> · <strong>[파일 저장]</strong> 버튼을 이용해 주세요.
              </>
            )}
          </span>
        </div>

        {/* Always use dataUrl (not blob:) on <img> so iOS Safari & WKWebView long-press offers "사진에 저장" */}
        <div className="flex-1 overflow-y-auto overscroll-contain bg-slate-100 p-4 flex items-center justify-center">
          <img
            src={asset.dataUrl}
            alt={titleLabel}
            className="max-h-[50dvh] w-auto max-w-full rounded-md border border-slate-300 shadow-md bg-white"
            style={{ WebkitTouchCallout: 'default', touchAction: 'auto' }}
          />
        </div>

        {inlineNotice && (
          <div
            role="status"
            className={`shrink-0 mx-3 mt-2.5 px-3 py-2 rounded-lg border text-[11.5px] font-bold flex items-start gap-1.5 keep-all ${
              inlineNotice.type === 'success'
                ? 'bg-emerald-50 border-emerald-200 text-emerald-900'
                : 'bg-red-50 border-red-200 text-red-900'
            }`}
          >
            {inlineNotice.type === 'success' ? (
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0 mt-0.5" />
            ) : (
              <AlertCircle className="w-3.5 h-3.5 text-red-600 shrink-0 mt-0.5" />
            )}
            <span>{inlineNotice.text}</span>
          </div>
        )}

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
              <span>사진 저장 · 공유</span>
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
