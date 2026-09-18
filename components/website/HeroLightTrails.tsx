/** Decorative vector light trails: no bitmap downloads or animation runtime. */
export default function HeroLightTrails() {
  return <svg aria-hidden="true" className="hero-light-trails" viewBox="0 0 1600 900" preserveAspectRatio="none">
    <defs>
      <linearGradient id="hero-gold" x1="0" y1="1" x2="1" y2="0">
        <stop stopColor="#fff3bb" stopOpacity="0" />
        <stop offset=".25" stopColor="#ffeab0" stopOpacity=".6" />
        <stop offset=".65" stopColor="#fff5c8" />
        <stop offset="1" stopColor="#ffd16f" stopOpacity=".8" />
      </linearGradient>
      <filter id="hero-light-bloom"><feGaussianBlur stdDeviation="5" /></filter>
      <radialGradient id="hero-spark"><stop stopColor="#ffffe6" /><stop offset=".18" stopColor="#fff1aa" stopOpacity=".9" /><stop offset="1" stopColor="#ffe591" stopOpacity="0" /></radialGradient>
    </defs>
    <g fill="none" stroke="url(#hero-gold)">
      <path d="M-100 640 C340 290 1200 810 1690 225" strokeWidth="5" opacity=".7" filter="url(#hero-light-bloom)" />
      <path d="M-100 640 C340 290 1200 810 1690 225" strokeWidth="1.7" />
      {Array.from({ length: 22 }, (_, i) => <path key={i} d={`M-100 ${647+i*4} C340 ${297+i*3} 1200 ${817+i*3} 1690 ${232+i*4}`} strokeWidth=".65" opacity={.26-i*.008} />)}
      <path d="M60 970 C500 410 1100 345 1670 940" strokeWidth="4" opacity=".5" filter="url(#hero-light-bloom)" />
      <path d="M60 970 C500 410 1100 345 1670 940" strokeWidth="1.2" />
      {Array.from({ length: 16 }, (_, i) => <path key={i} d={`M60 ${978+i*4} C500 ${418+i*3} 1100 ${353+i*3} 1670 ${948+i*4}`} strokeWidth=".6" opacity=".15" />)}
    </g>
    <circle cx="304" cy="486" r="42" fill="url(#hero-spark)" />
    <circle cx="1370" cy="485" r="30" fill="url(#hero-spark)" />
  </svg>;
}
