/** Decorative vector light trails: no bitmap downloads or animation runtime. */
export default function HeroLightTrails() {
  return <svg aria-hidden="true" className="hero-light-trails" viewBox="0 0 1600 900" preserveAspectRatio="none">
    <defs>
      <linearGradient id="hero-gold" x1="0" y1="1" x2="1" y2="0">
        <stop stopColor="#c4a7ff" stopOpacity="0" />
        <stop offset=".25" stopColor="#c4a7ff" stopOpacity=".55" />
        <stop offset=".65" stopColor="#d8c5ff" />
        <stop offset="1" stopColor="#ff8b78" stopOpacity=".55" />
      </linearGradient>
      <filter id="hero-light-bloom"><feGaussianBlur stdDeviation="5" /></filter>
    </defs>
    <g fill="none" stroke="url(#hero-gold)">
      <path d="M-100 640 C340 290 1200 810 1690 225" strokeWidth="5" opacity=".25" filter="url(#hero-light-bloom)" />
      <path d="M-100 640 C340 290 1200 810 1690 225" strokeWidth="1.7" opacity=".42" />
      {Array.from({ length: 22 }, (_, i) => <path key={i} d={`M-100 ${647+i*4} C340 ${297+i*3} 1200 ${817+i*3} 1690 ${232+i*4}`} strokeWidth=".65" opacity={.12-i*.003} />)}
      <path d="M60 970 C500 410 1100 345 1670 940" strokeWidth="4" opacity=".2" filter="url(#hero-light-bloom)" />
      <path d="M60 970 C500 410 1100 345 1670 940" strokeWidth="1.2" opacity=".38" />
      {Array.from({ length: 16 }, (_, i) => <path key={i} d={`M60 ${978+i*4} C500 ${418+i*3} 1100 ${353+i*3} 1670 ${948+i*4}`} strokeWidth=".6" opacity=".08" />)}
    </g>
  </svg>;
}
