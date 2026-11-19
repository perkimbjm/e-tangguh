/** Penjelasan rumus dan batasannya (Prinsip III: dapat dijelaskan, bukan penilaian pribadi). */
export function FormulaNote() {
  return (
    <p className="mt-4 rounded-xl bg-slate-50 p-3 text-xs leading-relaxed text-slate-600">
      Nilai menggambarkan <strong>kompetensi dan kesiapan</strong> berdasarkan data yang dicatat
      BPBD, bukan penilaian atas pribadi petugas. Rumus atribut versi 1 (bobot: KMP 25%, LAT 15%,
      PNG 25%, SIA 15%, SEN 10%, KEP 10%) masih <strong>usulan dan belum disetujui BPBD</strong>.
      Jenis kelamin, usia, agama, suku, disabilitas, dan data kesehatan tidak dipakai. Sampai modul
      relawan tersedia: setiap entri sertifikasi dihitung tingkat dasar, setiap kejadian dihitung
      satu hari penugasan, dan pelatihan serta kepemimpinan belum memiliki sumber data.
    </p>
  );
}
