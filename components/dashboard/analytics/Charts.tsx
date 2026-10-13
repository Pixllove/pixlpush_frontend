'use client';

import { useState, type KeyboardEvent, type PointerEvent } from 'react';

/** The top of the y axis: the next round number that splits into four even steps. */
export function niceMax(value: number) {
  if (value <= 0) return 1;
  const power = 10 ** Math.floor(Math.log10(value));
  const n = value / power;
  return (n <= 1 ? 1 : n <= 1.6 ? 1.6 : n <= 2 ? 2 : n <= 4 ? 4 : n <= 8 ? 8 : 10) * power;
}

/**
 * A smooth line through the values across a `width` × `height` box, `min` on the bottom edge and `max` on
 * the top. Each segment eases in and out horizontally, so the curve touches every value and never
 * overshoots one.
 */
export function toPath(values: number[], min: number, max: number, width: number, height: number) {
  const span = max - min || 1;
  const step = values.length > 1 ? width / (values.length - 1) : 0;
  const at = (i: number) => [+(i * step).toFixed(2), +(height - ((values[i] - min) / span) * height).toFixed(2)];
  return values.map((_, i) => {
    const [x, y] = at(i);
    if (i === 0) return `M${x} ${y}`;
    const [px, py] = at(i - 1);
    const mid = +((px + x) / 2).toFixed(2);
    return `C${mid} ${py} ${mid} ${y} ${x} ${y}`;
  }).join('');
}

/** Groups of `size` counted back from the end, so the newest group is always full and the oldest takes the rest. */
export function chunks<T>(items: T[], size: number) {
  const groups: T[][] = [];
  for (let end = items.length; end > 0; end -= size) groups.unshift(items.slice(Math.max(0, end - size), end));
  return groups;
}

export const average = (values: number[]) => values.reduce((total, value) => total + value, 0) / values.length;

/**
 * The shape of a metric, not its detail: at most 15 points, each the average of its days, so 90 days read
 * as a trend instead of a scribble. A decoration beside a number that is already written out, so it is
 * hidden from assistive tech.
 */
export function Sparkline({ values }: { values: number[] }) {
  const points = chunks(values, Math.ceil(values.length / 15)).map(average);
  const line = toPath(points, Math.min(...points), Math.max(...points), 100, 26);
  // 2px of headroom so the stroke is not clipped at the peak; the fill runs down to the bottom edge
  return <svg className="pp-spark" viewBox="0 0 100 32" preserveAspectRatio="none" aria-hidden="true"><g transform="translate(0 2)"><path className="pp-spark-area" d={`${line}L100 30L0 30Z`} /><path d={line} vectorEffect="non-scaling-stroke" /></g></svg>;
}

export type TrendSeries = { name: string; values: number[] };

/**
 * One y axis, a line per series (colour follows the series' position: 1 email, 2 push), a legend, and a
 * crosshair with a tooltip on hover or with the arrow keys. Screen readers get the summary in the label. The SVG stretches with its box, so axis text
 * and the hover layer are HTML positioned in percent and nothing needs measuring.
 */
export function TrendChart({ labels, series, formatTick, formatValue, labelPrefix = '' }: { labels: string[]; series: TrendSeries[]; formatTick: (value: number) => string; formatValue: (value: number) => string; /** Goes before the date in the tooltip, e.g. "Week of ". */ labelPrefix?: string }) {
  const [hover, setHover] = useState<number | null>(null);
  const count = labels.length;
  const max = niceMax(Math.max(...series.flatMap((item) => item.values)));
  const ticks = [1, 0.75, 0.5, 0.25, 0].map((share) => max * share);
  // At most six date labels, each sitting under its own point (a week shows all seven days).
  const tickCount = count <= 7 ? count : 6;
  const xTicks = Array.from(new Set(Array.from({ length: tickCount }, (_, i) => Math.round((i * (count - 1)) / (tickCount - 1)))));
  const left = (index: number) => (count > 1 ? (index / (count - 1)) * 100 : 0);
  const move = (event: PointerEvent<HTMLDivElement>) => {
    const box = event.currentTarget.getBoundingClientRect();
    setHover(Math.min(count - 1, Math.max(0, Math.round(((event.clientX - box.left) / box.width) * (count - 1)))));
  };
  const key = (event: KeyboardEvent<HTMLDivElement>) => {
    if (event.key === 'Escape') return setHover(null);
    const step = event.key === 'ArrowLeft' ? -1 : event.key === 'ArrowRight' ? 1 : 0;
    if (!step) return;
    event.preventDefault();
    setHover((current) => Math.min(count - 1, Math.max(0, (current ?? count - 1) + step)));
  };
  const summary = `${series.map((item) => item.name).join(' and ')}, ${labels[0]} to ${labels[count - 1]}. ${series.map((item) => `${item.name}: ${formatValue(item.values[count - 1])} latest, peak ${formatValue(Math.max(...item.values))}.`).join(' ')}`;

  return (
    <div className="pp-chart">
      <div className="pp-chart-legend">{series.map((item, i) => <span className={`pp-legend pp-series-${i + 1}`} key={item.name}>{item.name}</span>)}</div>
      <div className="pp-chart-y" aria-hidden="true">{ticks.map((tick) => <span key={tick}>{formatTick(tick)}</span>)}</div>
      <div className="pp-chart-plot" role="img" aria-label={summary} tabIndex={0} onPointerMove={move} onPointerLeave={() => setHover(null)} onBlur={() => setHover(null)} onKeyDown={key}>
        {ticks.map((tick, i) => <i className="pp-chart-grid" key={tick} style={{ top: `${i * 25}%` }} />)}
        <svg viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true">
          {series.map((item, i) => <path className={`pp-series-${i + 1}`} key={item.name} d={toPath(item.values, 0, max, 100, 100)} vectorEffect="non-scaling-stroke" />)}
        </svg>
        {hover !== null && <>
          <i className="pp-chart-cursor" style={{ left: `${left(hover)}%` }} />
          {series.map((item, i) => <i className={`pp-chart-dot pp-series-${i + 1}`} key={item.name} style={{ left: `${left(hover)}%`, top: `${100 - (item.values[hover] / max) * 100}%` }} />)}
          {/* Flips to the left of the crosshair past the middle, so it never leaves the plot. */}
          <div className="pp-chart-tip" style={{ left: `${left(hover)}%`, transform: left(hover) > 55 ? 'translateX(calc(-100% - 12px))' : 'translateX(12px)' }}>
            <span>{labelPrefix}{labels[hover]}</span>
            {series.map((item, i) => <span className="pp-chart-tip-row" key={item.name}><span className={`pp-legend pp-series-${i + 1}`}>{item.name}</span><b>{formatValue(item.values[hover])}</b></span>)}
          </div>
        </>}
      </div>
      <div className="pp-chart-x" aria-hidden="true">{xTicks.map((index) => <span key={index} className={index === 0 ? 'is-first' : index === count - 1 ? 'is-last' : undefined} style={{ left: `${left(index)}%` }}>{labels[index]}</span>)}</div>
    </div>
  );
}
