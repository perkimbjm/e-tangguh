import { DEFAULT_PHOTO_FRAME, type IdCardDto, type PhotoFrame } from '@etangguh/shared';
import { CardBackground, Chip, Shield, THEME } from './CardArt';
import { type Orientation, size } from './geometry';
import { HeroPhoto } from './HeroPhoto';

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
  /** Pembingkaian foto sementara (pratinjau editor); bawaan dari data kartu. */
  frame?: PhotoFrame;
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

function Identity({ card, center = false }: { card: IdCardDto; center?: boolean }) {
  const t = THEME[card.category];
  return (
    <div className={center ? 'text-center' : ''}>
      <p className="text-[13px] font-extrabold leading-[1.08] tracking-tight">{card.fullName}</p>
      <p className="mt-[3px] text-[7.4px] font-semibold" style={{ color: t.accentSoft }}>
        {card.positionLabel}
      </p>
      <p className="text-[6.4px] text-[#d3e4ff]">
        {card.dutyKelurahanName
          ? `Wilayah tugas · Kel. ${card.dutyKelurahanName}`
          : card.employmentLabel}
      </p>
    </div>
  );
}

function CardNumber({ card }: { card: IdCardDto }) {
  return (
    <div>
      <p className="text-[5.2px] uppercase tracking-[0.2em] text-[#ffb85c]">No. kartu</p>
      <p className="font-mono text-[7.6px] font-bold tracking-[0.06em]">{card.cardNumber}</p>
      <p className="text-[5.6px] text-[#d3e4ff]">Berlaku s.d. {fmtDate(card.validUntil)}</p>
    </div>
  );
}

/** Sisi depan kartu identitas: foto kasual besar berlapis kurva vektor, identitas, dan nomor. */
export function IdCardFront({ card, orientation, photoUrl, seed = 1, frame }: FaceProps) {
  const { w, h } = size(orientation);
  const landscape = orientation === 'landscape';
  const hero = (
    <HeroPhoto
      url={photoUrl}
      initials={card.initials}
      frame={frame ?? card.photoFrame ?? DEFAULT_PHOTO_FRAME}
      category={card.category}
      orientation={orientation}
      year={card.year}
    />
  );
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
      {hero}
      {landscape ? (
        <>
          <div className="absolute right-[11px] top-[11px]">
            <Ribbon card={card} />
          </div>
          <div className="absolute bottom-[11px] left-[11px] top-[11px] flex w-[166px] flex-col">
            <Header card={card} />
            <p className="mt-[16px] text-[5.6px] font-semibold uppercase tracking-[0.2em] text-[#ffb85c]">
              Nama
            </p>
            <Identity card={card} />
            <div className="mt-[6px]">
              <Duties card={card} />
            </div>
            <div className="mt-auto flex items-end justify-between pr-[10px]">
              <CardNumber card={card} />
              <Chip />
            </div>
          </div>
        </>
      ) : (
        <div className="absolute inset-0 flex flex-col p-[11px]">
          <Header card={card} />
          <div className="mt-[165px]">
            <Ribbon card={card} />
          </div>
          <div className="mt-[5px]">
            <Identity card={card} />
          </div>
          <div className="mt-[4px]">
            <Duties card={card} />
          </div>
          <div className="mt-auto flex items-end justify-between rounded-[6px] border border-white/15 bg-black/20 px-[7px] py-[4px]">
            <CardNumber card={card} />
            <Chip />
          </div>
        </div>
      )}
    </div>
  );
}
