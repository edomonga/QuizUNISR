// Ridimensiona e comprime un'immagine lato browser PRIMA dell'upload:
// mantiene le proporzioni, limita il lato massimo e riduce il peso del file.
// Restituisce un Blob (WebP se supportato, altrimenti JPEG).
export async function compressImage(file: File, maxDim = 1400, quality = 0.85): Promise<Blob> {
  const dataUrl = await new Promise<string>((resolve, reject) => {
    const r = new FileReader();
    r.onload = () => resolve(r.result as string);
    r.onerror = () => reject(new Error('read'));
    r.readAsDataURL(file);
  });

  const img = await new Promise<HTMLImageElement>((resolve, reject) => {
    const i = new Image();
    i.onload = () => resolve(i);
    i.onerror = () => reject(new Error('img'));
    i.src = dataUrl;
  });

  let width = img.naturalWidth || img.width;
  let height = img.naturalHeight || img.height;
  if (Math.max(width, height) > maxDim) {
    const scale = maxDim / Math.max(width, height);
    width = Math.round(width * scale);
    height = Math.round(height * scale);
  }

  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('canvas');
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = 'high';
  ctx.drawImage(img, 0, 0, width, height);

  const toBlob = (type: string) =>
    new Promise<Blob | null>(res => canvas.toBlob(res, type, quality));

  const webp = await toBlob('image/webp');
  if (webp && webp.size > 0) return webp;
  const jpeg = await toBlob('image/jpeg');
  if (jpeg && jpeg.size > 0) return jpeg;
  throw new Error('compress');
}
