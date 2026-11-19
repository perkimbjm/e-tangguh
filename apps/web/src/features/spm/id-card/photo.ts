/**
 * Memotong foto menjadi persegi panjang 4:5 di tengah lalu memadatkannya ke WebP ≤ 40 KB
 * (anggaran foto kontrak UI fitur 001). Diproses di peramban; berkas asli tidak diunggah.
 */
export async function preparePhoto(file: File, maxBytes = 40 * 1024): Promise<Blob> {
  if (!/^image\/(jpeg|png|webp)$/.test(file.type))
    throw new Error('Gunakan foto JPG, PNG, atau WebP');
  const bitmap = await createImageBitmap(file);
  const ratio = 4 / 5;
  let sw = bitmap.width;
  let sh = bitmap.height;
  if (sw / sh > ratio) sw = Math.round(sh * ratio);
  else sh = Math.round(sw / ratio);
  const sx = Math.round((bitmap.width - sw) / 2);
  const sy = Math.round((bitmap.height - sh) / 3);
  for (const [width, quality] of [
    [480, 0.82],
    [400, 0.74],
    [360, 0.66],
    [320, 0.58],
    [280, 0.5],
  ] as const) {
    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = Math.round(width / ratio);
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('Peramban tidak mendukung pemrosesan foto');
    ctx.drawImage(bitmap, sx, sy, sw, sh, 0, 0, canvas.width, canvas.height);
    const blob = await new Promise<Blob | null>((r) => canvas.toBlob(r, 'image/webp', quality));
    if (blob && (blob.size <= maxBytes || width === 280)) return blob;
  }
  throw new Error('Foto tidak dapat diproses');
}
