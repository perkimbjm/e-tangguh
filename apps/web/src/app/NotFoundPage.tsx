import { Link } from 'react-router-dom';

export function NotFoundPage() {
  return (
    <main className="mx-auto max-w-xl p-6">
      <h1 className="text-2xl font-semibold">Halaman tidak ditemukan</h1>
      <Link to="/" className="mt-4 inline-block text-sky-800 underline">
        Kembali ke beranda
      </Link>
    </main>
  );
}
