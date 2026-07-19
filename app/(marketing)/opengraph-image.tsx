import { ImageResponse } from 'next/og';

export const alt = 'kikoeru lab — listening to what the internet complains about';
export const size = { width: 1200, height: 630 };
export const contentType = 'image/png';

// Warm brand hex, hardcoded — Satori cannot read CSS variables or font-* classes.
const BG = '#e5e3df';
const TEXT = '#2a2a28';
const MUTED = '#8a8783';
const ACCENT = '#4a5d52';

// The serif wordmark needs real font data (Satori can't use CSS variables). An
// old UA makes the Google Fonts CSS API hand back a static .woff — which Satori
// parses, unlike the variable-font .ttf or woff2 — subset to just the wordmark's
// characters. If the font is unavailable the wordmark falls back to the default
// font next/og bundles.
const FONT_UA = 'Mozilla/5.0 (compatible; MSIE 9.0; Windows NT 6.1)';

async function loadSerif(): Promise<ArrayBuffer | null> {
  try {
    const cssUrl = 'https://fonts.googleapis.com/css2?family=Newsreader:wght@400&text=kikoerulab';
    const css = await fetch(cssUrl, { headers: { 'User-Agent': FONT_UA } }).then((r) => r.text());
    const src = css.match(/src:\s*url\((https:\/\/[^)]+)\)/)?.[1];
    if (!src) return null;
    const res = await fetch(src);
    if (!res.ok) return null;
    return await res.arrayBuffer();
  } catch {
    return null;
  }
}

const RIPPLE = [
  { w: 320, o: 0.25 },
  { w: 230, o: 0.18 },
  { w: 282, o: 0.14 },
  { w: 144, o: 0.09 },
  { w: 192, o: 0.05 },
];

export default async function Image() {
  const serif = await loadSerif();
  const fonts = serif ? [{ name: 'Newsreader', data: serif, style: 'normal' as const, weight: 400 as const }] : undefined;
  const serifFamily = serif ? 'Newsreader' : undefined;

  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          background: BG,
        }}
      >
        <div style={{ display: 'flex', fontFamily: serifFamily, fontSize: 96, color: TEXT }}>
          <span>kikoeru</span>
          <span style={{ marginLeft: 24, color: MUTED }}>lab</span>
        </div>

        <div style={{ marginTop: 32, fontSize: 28, color: MUTED }}>
          listening to what the internet complains about
        </div>

        <div style={{ marginTop: 64, display: 'flex', flexDirection: 'column' }}>
          {RIPPLE.map((line, i) => (
            <div
              key={i}
              style={{ width: line.w, height: 1, marginBottom: 14, background: ACCENT, opacity: line.o }}
            />
          ))}
        </div>
      </div>
    ),
    { ...size, ...(fonts ? { fonts } : {}) },
  );
}
