import { renderToStaticMarkup } from 'react-dom/server';
import { FormCard } from './FormRenderer';
import type { FormDraft } from './model';

// Ticks every countdown in the exported markup; plain ES5 so it runs anywhere.
const COUNTDOWN_SCRIPT = `<script>(function(){var n=document.querySelectorAll('[data-pixlpush-countdown]');function t(){for(var i=0;i<n.length;i++){var e=n[i],l=Math.max(0,new Date(e.getAttribute('data-pixlpush-countdown'))-new Date()),s=Math.floor(l/1e3),v={days:Math.floor(s/86400),hours:Math.floor(s/3600)%24,minutes:Math.floor(s/60)%60,seconds:s%60};for(var k in v){var u=e.querySelector('[data-unit='+k+']');if(u)u.textContent=(v[k]<10?'0':'')+v[k]}}}t();setInterval(t,1000)})();</script>`;

/** Static HTML for the "HTML code" install option: the same markup the editor shows. */
export function renderFormHtml(draft: FormDraft) {
  const markup = renderToStaticMarkup(<FormCard draft={draft} mode="export" />);
  const countdown = draft.blocks.some((block) => block.type === 'countdown' && block.endsAt) ? `\n${COUNTDOWN_SCRIPT}` : '';
  return `<div data-pixlpush-form="${draft.id}" data-pixlpush-static="">\n${markup}\n</div>${countdown}`;
}
