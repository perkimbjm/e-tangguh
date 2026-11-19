import { THEME } from './CardArt';
import type { IdCardCategory } from '@etangguh/shared';

/** Foto profil dengan bingkai aksen; inisial bila belum ada foto. */
export function Photo({
  url,
  initials,
  w,
  h,
  category,
  radius = 10,
}: {
  url: string | null;
  initials: string;
  w: number;
  h: number;
  category: IdCardCategory;
  radius?: number;
}) {
  const t = THEME[category];
  return (
    <div
      className="relative shrink-0"
      style={{
        width: w,
        height: h,
        padding: 2,
        borderRadius: radius + 2,
        background: `linear-gradient(140deg, ${t.accentSoft}, ${t.accent} 45%, #ffffff 60%, ${t.accent})`,
      }}
    >
      <div
        className="h-full w-full overflow-hidden"
        style={{ borderRadius: radius, background: '#0f3d8c' }}
      >
        {url ? (
          <img src={url} alt="" className="h-full w-full object-cover" />
        ) : (
          <div
            className="grid h-full w-full place-items-center font-extrabold text-white/90"
            style={{ fontSize: Math.round(w * 0.32) }}
          >
            {initials}
          </div>
        )}
      </div>
    </div>
  );
}
