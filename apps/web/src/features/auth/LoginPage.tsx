import { loginRequestSchema } from '@etangguh/shared';
import { useState, type FormEvent } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { FormField } from '../../components/FormField';
import { ApiError } from '../../lib/api-client';
import { useSession } from '../../lib/session';

export function LoginPage() {
  const { login } = useSession();
  const navigate = useNavigate();
  const location = useLocation();
  const [fields, setFields] = useState<Record<string, string>>({});
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = new FormData(e.currentTarget);
    const parsed = loginRequestSchema.safeParse({
      identifier: form.get('identifier'),
      password: form.get('password'),
    });
    if (!parsed.success) {
      setFields(Object.fromEntries(parsed.error.issues.map((i) => [String(i.path[0]), i.message])));
      return;
    }
    setFields({});
    setError(null);
    setBusy(true);
    try {
      await login(parsed.data);
      const from = (location.state as { from?: string } | null)?.from;
      navigate(from && from.startsWith('/app') ? from : '/app', { replace: true });
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Gagal masuk');
      if (err instanceof ApiError) setFields(err.fields);
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-gradient-to-b from-sky-50 to-white px-4">
      <div className="w-full max-w-sm rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
        <Link to="/" className="text-sm text-sky-800 underline">
          ← Beranda
        </Link>
        <h1 className="mt-3 text-2xl font-bold text-slate-900">Masuk e-Tangguh</h1>
        <p className="mt-1 text-sm text-slate-600">Khusus petugas BPBD dan pendata kelurahan.</p>
        <form className="mt-6 space-y-4" onSubmit={onSubmit} noValidate>
          <FormField
            label="Email atau nomor ponsel"
            name="identifier"
            autoComplete="username"
            error={fields.identifier}
          />
          <FormField
            label="Kata sandi"
            name="password"
            type="password"
            autoComplete="current-password"
            error={fields.password}
          />
          {error && (
            <p role="alert" className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-800">
              {error}
            </p>
          )}
          <button
            type="submit"
            disabled={busy}
            className="w-full rounded-md bg-sungai-800 px-4 py-2.5 font-semibold text-white hover:bg-sungai-900 disabled:opacity-60 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sky-700"
          >
            {busy ? 'Memproses…' : 'Masuk'}
          </button>
        </form>
      </div>
    </main>
  );
}
