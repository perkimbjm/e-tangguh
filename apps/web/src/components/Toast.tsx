import { createContext, useCallback, useContext, useState, type ReactNode } from 'react';

type Tone = 'info' | 'sukses' | 'galat';
interface ToastItem {
  id: number;
  tone: Tone;
  message: string;
}

const ToastContext = createContext<(message: string, tone?: Tone) => void>(() => undefined);

const TONE: Record<Tone, string> = {
  info: 'border-sky-300 bg-sky-50 text-sky-900',
  sukses: 'border-emerald-300 bg-emerald-50 text-emerald-900',
  galat: 'border-red-300 bg-red-50 text-red-900',
};

/** Notifikasi singkat; diumumkan pembaca layar lewat wilayah `aria-live`. */
export function ToastProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<ToastItem[]>([]);
  const push = useCallback((message: string, tone: Tone = 'info') => {
    const id = Date.now() + Math.random();
    setItems((xs) => [...xs, { id, tone, message }]);
    setTimeout(() => setItems((xs) => xs.filter((x) => x.id !== id)), 6000);
  }, []);
  return (
    <ToastContext.Provider value={push}>
      {children}
      <div aria-live="polite" className="fixed bottom-4 right-4 z-50 flex w-80 flex-col gap-2">
        {items.map((t) => (
          <div
            key={t.id}
            role={t.tone === 'galat' ? 'alert' : 'status'}
            className={`rounded-md border px-4 py-3 text-sm shadow ${TONE[t.tone]}`}
          >
            {t.message}
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast() {
  return useContext(ToastContext);
}
