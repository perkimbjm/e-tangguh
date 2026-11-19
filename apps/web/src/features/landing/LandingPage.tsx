import { useEffect } from 'react';
import { Flow } from './Flow';
import { Hero } from './Hero';
import { LandingFooter } from './LandingFooter';
import { LandingNav } from './LandingNav';
import { Stats } from './Stats';
import { StoryScrolly } from './StoryScrolly';
import { Trust } from './Trust';

/** Beranda publik: hanya narasi dan angka ilustrasi; tidak memuat data perorangan. */
export function LandingPage() {
  useEffect(() => {
    document.title = 'e-Tangguh · Data SPM Bencana Kota Banjarmasin';
  }, []);
  return (
    <div className="bg-sungai-950 font-sans antialiased">
      <a
        href="#cerita"
        className="sr-only focus:not-sr-only focus:fixed focus:left-2 focus:top-2 focus:z-50 focus:rounded focus:bg-white focus:px-3 focus:py-2 focus:text-sungai-950"
      >
        Lompat ke konten
      </a>
      <LandingNav />
      <main>
        <Hero />
        <StoryScrolly />
        <Stats />
        <Flow />
        <Trust />
      </main>
      <LandingFooter />
    </div>
  );
}
