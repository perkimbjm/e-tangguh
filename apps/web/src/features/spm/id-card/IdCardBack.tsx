import { CardBackground, Shield, THEME } from './CardArt';
import { type FaceProps } from './IdCardFront';
import { size } from './geometry';

/** Sisi belakang: QR verifikasi, kompetensi, ketentuan, kontak dan penandatangan (bila diisi BPBD). */
export function IdCardBack({ card, orientation, qrSvg, seed = 2 }: FaceProps) {
  const { w, h } = size(orientation);
  const t = THEME[card.category];
  const landscape = orientation === 'landscape';
  const s = card.settings;
  const role = card.category === 'relawan' ? 'relawan kebencanaan' : 'petugas kebencanaan';
  const qr = (px: number) => (
    <div className="shrink-0 rounded-[6px] bg-white p-[4px]" style={{ width: px, height: px }}>
      {qrSvg ? (
        <div
          className="h-full w-full [&>svg]:h-full [&>svg]:w-full"
          dangerouslySetInnerHTML={{ __html: qrSvg }}
        />
      ) : null}
    </div>
  );
  const body = (
    <>
      <p className="text-[6.6px] leading-[1.35] text-[#eaf2ff]">
        Pemegang kartu ini adalah <strong className="text-white">{role}</strong> dalam binaan{' '}
        {s.agencyName}. Keaslian kartu dapat diperiksa dengan memindai kode QR.
      </p>
      {card.certifications.length > 0 && (
        <div className="mt-[4px]">
          <p
            className="text-[5.2px] font-semibold uppercase tracking-[0.18em]"
            style={{ color: t.accentSoft }}
          >
            Kompetensi
          </p>
          <div className="mt-[2px] flex flex-wrap gap-[3px]">
            {card.certifications.slice(0, 4).map((c) => (
              <span
                key={c}
                className="rounded-full bg-white/10 px-[5px] py-[1px] text-[5.6px] font-semibold text-white"
              >
                {c}
              </span>
            ))}
          </div>
        </div>
      )}
      {card.hazards.length > 0 && (
        <p className="mt-[3px] text-[5.6px] text-[#d3e4ff]">
          Siaga: {card.hazards.slice(0, 4).join(' · ')}
        </p>
      )}
    </>
  );
  const footer = (
    <div className="text-[5.4px] leading-[1.35] text-[#d3e4ff]">
      <p>
        Bila ditemukan, kembalikan ke {s.agencyName}
        {s.address ? `, ${s.address}` : ''}
        {s.hotline ? ` · ${s.hotline}` : ''}.
      </p>
      <p className="mt-[1px] opacity-80">
        Bukan kartu identitas kependudukan. Tidak dapat dipindahtangankan.
      </p>
    </div>
  );
  const signature = s.signatoryTitle ? (
    <div className="text-center text-[5.4px] text-[#d3e4ff]">
      <p>{s.signatoryTitle}</p>
      <div className="my-[2px] h-[14px] w-[64px] border-b border-white/40" />
      <p className="font-semibold text-white">{s.signatoryName ?? ''}</p>
    </div>
  ) : null;

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
      <div className="absolute left-0 right-0 top-[14px] h-[18px] bg-black/55" aria-hidden />
      {landscape ? (
        <div className="absolute inset-0 flex gap-[10px] px-[11px] pb-[10px] pt-[40px]">
          <div className="flex flex-col items-center gap-[3px]">
            {qr(76)}
            <p
              className="text-[5.4px] font-semibold uppercase tracking-[0.16em]"
              style={{ color: t.accentSoft }}
            >
              Pindai untuk verifikasi
            </p>
            <p className="font-mono text-[6.4px] font-bold">{card.cardNumber}</p>
          </div>
          <div className="flex min-w-0 flex-1 flex-col">
            {body}
            <div className="mt-auto flex items-end justify-between gap-[6px]">
              {footer}
              {signature}
            </div>
          </div>
        </div>
      ) : (
        <div className="absolute inset-0 flex flex-col items-center px-[11px] pb-[10px] pt-[42px] text-center">
          {qr(96)}
          <p
            className="mt-[3px] text-[5.4px] font-semibold uppercase tracking-[0.16em]"
            style={{ color: t.accentSoft }}
          >
            Pindai untuk verifikasi
          </p>
          <p className="font-mono text-[6.6px] font-bold">{card.cardNumber}</p>
          <div className="mt-[8px] text-left">{body}</div>
          {signature && <div className="mt-[6px]">{signature}</div>}
          <div className="mt-auto flex w-full items-end gap-[5px] text-left">
            <Shield size={16} />
            {footer}
          </div>
        </div>
      )}
    </div>
  );
}
