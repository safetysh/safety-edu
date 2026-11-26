const qrDataUrlCache = new Map<string, Promise<string>>();

/**
 * Generates a pure client-side PNG Data URL QR code (pure black #000000 on white #FFFFFF,
 * quiet zone margin >= 2 modules, high-res 240px for sharp 18~20mm A4 print).
 * Dynamically imports `qrcode` on demand so initial page load stays lean while
 * guaranteeing 0% CORS taint across html-to-image (PNG/clipboard), @media print, and PptxGenJS.
 */
export function generateLocalQrDataUrl(url: string): Promise<string> {
  const trimmed = (url || '').trim();
  if (!trimmed) return Promise.resolve('');

  const cached = qrDataUrlCache.get(trimmed);
  if (cached) return cached;

  const promise = import('qrcode')
    .then(({ default: QRCode }) =>
      QRCode.toDataURL(trimmed, {
        type: 'image/png',
        width: 240,
        margin: 2,
        errorCorrectionLevel: 'M',
        color: {
          dark: '#000000',
          light: '#FFFFFF',
        },
      })
    )
    .catch(() => '');

  qrDataUrlCache.set(trimmed, promise);
  return promise;
}
