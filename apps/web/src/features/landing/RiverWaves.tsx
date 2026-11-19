/** Gelombang sungai berlapis; dekoratif. Tiap lapisan dua kali lebar layar dan digeser berulang. */
const LAYERS = [
  {
    d: 'M0 60 C 150 20 350 100 500 60 S 850 20 1000 60 V 120 H 0 Z',
    fill: 'fill-sungai-700/50',
    anim: 'animate-arus-lambat',
    h: 'h-28',
  },
  {
    d: 'M0 70 C 120 40 380 110 500 70 S 880 40 1000 70 V 120 H 0 Z',
    fill: 'fill-sungai-500/40',
    anim: 'animate-arus-sedang',
    h: 'h-24',
  },
  {
    d: 'M0 80 C 180 55 320 105 500 80 S 820 55 1000 80 V 120 H 0 Z',
    fill: 'fill-sungai-950',
    anim: 'animate-arus-cepat',
    h: 'h-20',
  },
];

export function RiverWaves() {
  return (
    <div aria-hidden="true" className="pointer-events-none absolute inset-x-0 bottom-0">
      {LAYERS.map((l, i) => (
        <div key={i} className={`absolute inset-x-0 bottom-0 overflow-hidden ${l.h}`}>
          <div className={`flex w-[200%] ${l.anim}`}>
            {[0, 1].map((k) => (
              <svg
                key={k}
                viewBox="0 0 1000 120"
                preserveAspectRatio="none"
                className={`h-full w-1/2 ${l.fill}`}
              >
                <path d={l.d} />
              </svg>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
