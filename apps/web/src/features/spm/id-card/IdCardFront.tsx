import type { IdCardDto } from '@etangguh/shared';
import { AccentStripe, CardBackground, Chip, HoloStrip, Shield, THEME } from './CardArt';
import { type Orientation, size } from './geometry';
import { Photo } from './Photo';

const fmtDate = (iso: string) =>
  new Date(`${iso}T00:00:00`).toLocaleDateString('id-ID', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });

export interface FaceProps {
  card: IdCardDto;
  orientation: Orientation;
  photoUrl: string | null;
  qrSvg?: string;
  seed?: number;
}

function Ribbon({ card }: { card: IdCardDto }) {
  const t = THEME[card.category];
  return (
    <span
      className="inline-block rounded-[3px] px-[6px] py-[2px] text-[6.4px] font-extrabold tracking-[0.14em] text-[#050f2a]"
      style={{ background: t.ribbon }}
    >
      {t.label}
    </span>
  );
}

function Header({ card }: { card: IdCardDto }) {
  return (
    <div className="flex items-center gap-[5px]">
      <Shield size={20} />
      <div className="leading-[1.05]">
        <p className="text-[5.6px] font-semibold uppercase tracking-[0.2em] text-[#ffb85c]">
          Binaan
        </p>
        <p className="text-[8px] font-extrabold uppercase tracking-[0.06em] text-white">
          {card.settings.agencyName}
        </p>
      </div>
    </div>
  );
}

function Duties({ card }: { card: IdCardDto }) {
  return (
    <div className="flex flex-wrap gap-[3px]">
      {card.duties.map((d) => (
        <span
          key={d}
          className="rounded-full border border-white/25 bg-white/10 px-[5px] py-[1px] text-[5.6px] font-bold tracking-wide text-white"
        >
          {d}
        </span>
      ))}
    </div>
  );
}

/** Sisi depan kartu identitas: identitas, kategori, wilayah tugas, nomor, masa berlaku. */
export function IdCardFront({ card, orientation, photoUrl, seed = 1 }: FaceProps) {
  const { w, h } = size(orientation);
  const t = THEME[card.category];
  const landscape = orientation === 'landscape';
  return (
    <div
      className="etg-card relative overflow-hidden text-white"
      style={{
        width: w,
        height: h,
        borderRadius: 12,
        fontFamily: '"Plus Jakarta Sans Variable", system-ui, sans-serif',
      }}
    >
      <CardBackground w={w} h={h} category={card.category} seed={seed} />
      <AccentStripe
        style={
          landscape
            ? { right: 52, top: -20, width: 3, height: h + 40, transform: 'rotate(14deg)' }
            : { right: 36, top: -20, width: 2.5, height: h + 40, transform: 'rotate(10deg)' }
        }
      />
      <HoloStrip
        style={
          landscape
            ? { right: 34, top: -20, width: 9, height: h + 40, transform: 'rotate(14deg)' }
            : { right: 22, top: -20, width: 8, height: h + 40, transform: 'rotate(10deg)' }
        }
      />
      {landscape ? (
        <div className="absolute inset-0 flex flex-col p-[11px]">
          <div className="flex items-start justify-between">
            <Header card={card} />
            <Ribbon card={card} />
          </div>
          <div className="mt-[9px] flex flex-1 gap-[10px]">
            <div className="flex flex-col items-center gap-[4px]">
              <Photo
                url={photoUrl}
                initials={card.initials}
                w={72}
                h={90}
                category={card.category}
              />
              <span
                className="text-[6px] font-bold tracking-[0.18em]"
                style={{ color: t.accentSoft }}
              >
                TA {card.year}
              </span>
            </div>
            <div className="flex min-w-0 flex-1 flex-col">
              <p className="text-[5.6px] font-semibold uppercase tracking-[0.2em] text-[#ffb85c]">
                Nama
              </p>
              <p className="text-[13px] font-extrabold leading-[1.1] tracking-tight">
                {card.fullName}
              </p>
              <p className="mt-[3px] text-[7.4px] font-semibold" style={{ color: t.accentSoft }}>
                {card.positionLabel}
              </p>
              <p className="text-[6.4px] text-[#d3e4ff]">
                {card.dutyKelurahanName
                  ? `Wilayah tugas · Kel. ${card.dutyKelurahanName}`
                  : card.employmentLabel}
              </p>
              <div className="mt-[5px]">
                <Duties card={card} />
              </div>
              <div className="mt-auto flex items-end justify-between">
                <div>
                  <p className="text-[5.2px] uppercase tracking-[0.2em] text-[#ffb85c]">
                    No. kartu
                  </p>
                  <p className="font-mono text-[7.6px] font-bold tracking-[0.06em]">
                    {card.cardNumber}
                  </p>
                  <p className="text-[5.6px] text-[#d3e4ff]">
                    Berlaku s.d. {fmtDate(card.validUntil)}
                  </p>
                </div>
                <Chip />
              </div>
            </div>
          </div>
        </div>
      ) : (
        <div className="absolute inset-0 flex flex-col items-center p-[11px] text-center">
          <Header card={card} />
          <div className="mt-[8px]">
            <Ribbon card={card} />
          </div>
          <div className="mt-[10px]">
            <Photo
              url={photoUrl}
              initials={card.initials}
              w={92}
              h={112}
              category={card.category}
              radius={14}
            />
          </div>
          <p className="mt-[8px] text-[13px] font-extrabold leading-[1.1] tracking-tight">
            {card.fullName}
          </p>
          <p className="mt-[2px] text-[7.4px] font-semibold" style={{ color: t.accentSoft }}>
            {card.positionLabel}
          </p>
          <p className="text-[6.4px] text-[#d3e4ff]">
            {card.dutyKelurahanName
              ? `Wilayah tugas · Kel. ${card.dutyKelurahanName}`
              : card.employmentLabel}
          </p>
          <div className="mt-[6px] flex justify-center">
            <Duties card={card} />
          </div>
          <div className="mt-auto w-full rounded-[6px] border border-white/15 bg-black/20 px-[7px] py-[5px] text-left">
            <p className="text-[5.2px] uppercase tracking-[0.2em] text-[#ffb85c]">
              No. kartu · TA {card.year}
            </p>
            <p className="font-mono text-[7.6px] font-bold tracking-[0.06em]">{card.cardNumber}</p>
            <p className="text-[5.6px] text-[#d3e4ff]">Berlaku s.d. {fmtDate(card.validUntil)}</p>
          </div>
        </div>
      )}
    </div>
  );
}
