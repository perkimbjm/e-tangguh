/**
 * Menyiapkan foto kasual (close-up atau separuh badan) di peramban: rasio dibatasi antara
 * 7:10 dan 1:1 agar mengisi area foto kartu lanskap maupun potret, lalu dipadatkan ke WebP
 * ≤ 150 KB. Berkas asli tidak diunggah. Posisi dan perbesaran diatur terpisah (bingkai foto).
 */
export async function preparePhoto(file: File, maxBytes = 150 * 1024): Promise<Blob> {
  if (!/^image\/(jpeg|png|webp)$/.test(file.type))
    throw new Error('Gunakan foto JPG, PNG, atau WebP');
  const bitmap = await createImageBitmap(file);
  const r = bitmap.width / bitmap.height;
  let sw = bitmap.width;
  let sh = bitmap.height;
  if (r > 1) sw = sh; // lebih lebar dari persegi → potong sisi kiri-kanan
  else if (r < 0.7) sh = Math.round(sw / 0.7); // terlalu tinggi → potong bawah
  const sx = Math.round((bitmap.width - sw) / 2);
  const sy = Math.round((bitmap.height - sh) / 4);
  for (const [long, quality] of [
    [1100, 0.84],
    [960, 0.8],
    [840, 0.74],
    [720, 0.68],
    [600, 0.6],
  ] as const) {
    const k = long / Math.max(sw, sh);
    const canvas = document.createElement('canvas');
    canvas.width = Math.round(sw * Math.min(1, k));
    canvas.height = Math.round(sh * Math.min(1, k));
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('Peramban tidak mendukung pemrosesan foto');
    ctx.drawImage(bitmap, sx, sy, sw, sh, 0, 0, canvas.width, canvas.height);
    const blob = await new Promise<Blob | null>((res) => canvas.toBlob(res, 'image/webp', quality));
    if (blob && (blob.size <= maxBytes || long === 600)) return blob;
  }
  throw new Error('Foto tidak dapat diproses');
}
