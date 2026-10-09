/**
 * Content checks for the campaign review. "warning" and "strong" are recommendations and never block
 * sending; "block" is a missing technical requirement. None of them can promise which folder a mailbox
 * provider chooses. Deliberately not a spam-word list: structure is a steadier signal than vocabulary.
 */
export type FindingLevel = 'warning' | 'strong' | 'block';

export interface Finding {
  code: string;
  level: FindingLevel;
  title: string;
  reason: string;
  recommendation: string;
  /** The links or figures the finding is about. */
  detail?: string[];
}

export interface EmailDraft {
  subject: string;
  html: string;
  /** Hosts that are ours or the customer's own (app, tracking, sending domain): never "external". */
  ownHosts?: string[];
  /** Whether the backend adds its unsubscribe link and List-Unsubscribe headers when sending. It always does today. */
  systemUnsubscribe?: boolean;
}

const SUBJECT_MIN_LETTERS = 8;
const SUBJECT_UPPER_RATIO = 0.6;
const LINKS_WARN = 5;
const LINKS_STRONG = 10;
/** Visible characters from which an email counts as a long newsletter; link limits double there. */
const LONG_EMAIL_CHARS = 3000;
const DOMAINS_WARN = 2;
const DOMAINS_STRONG = 4;
const IMAGE_SHARE = 0.7;
/** Below this much visible text an email with images is effectively image-only. */
const IMAGE_ONLY_CHARS = 40;
const SHORT_TEXT_CHARS = 20;
/** Images this small are spacers, icons or tracking pixels, not content. */
const TINY_IMAGE_PX = 32;
/** Rough layout area of one character of body text (about 8px wide on a 24px line). */
const CHAR_AREA = 200;
const DEFAULT_IMAGE_WIDTH = 600;

// ponytail: no public-suffix list. Two labels, three for "co.uk"-style suffixes; use tldts if real domains get misgrouped.
const SECOND_LEVEL_SUFFIX = /^(co|com|org|net|gov|ac|edu)\.[a-z]{2}$/;
export function registrableDomain(host: string): string {
  const labels = host.toLowerCase().replace(/\.$/, '').replace(/^www\./, '').split('.');
  return labels.slice(SECOND_LEVEL_SUFFIX.test(labels.slice(-2).join('.')) ? -3 : -2).join('.');
}

const pixels = (img: Element, key: 'width' | 'height') => {
  const value = img.getAttribute(key) ?? (img as HTMLElement).style?.[key] ?? '';
  return /^\d+(px)?$/.test(value.trim()) ? parseInt(value, 10) : null;
};

export function analyzeEmail({ subject, html, ownHosts = [], systemUnsubscribe = true }: EmailDraft): Finding[] {
  // Runs in the browser only; during server rendering there is nothing to analyze yet.
  if (typeof DOMParser === 'undefined') return [];
  const findings: Finding[] = [];
  const doc = new DOMParser().parseFromString(html, 'text/html');
  doc.querySelectorAll('style, script, title').forEach((node) => node.remove());
  const text = (doc.body.textContent ?? '').replace(/\s+/g, ' ').trim();

  // 1. Subject capitalization. Personalisation tags, digits, punctuation and emoji are not letters.
  const letters = subject.replace(/{{[^}]*}}/g, '').match(/\p{L}/gu) ?? [];
  const cased = letters.filter((letter) => letter.toLowerCase() !== letter.toUpperCase());
  const upper = cased.filter((letter) => letter === letter.toUpperCase()).length;
  if (cased.length >= SUBJECT_MIN_LETTERS && upper / cased.length >= SUBJECT_UPPER_RATIO) {
    const all = upper === cased.length;
    findings.push({
      code: 'SUBJECT_UPPERCASE',
      level: all ? 'strong' : 'warning',
      title: all ? 'Subject is entirely uppercase' : 'Subject is mostly uppercase',
      reason: 'Mail filters and readers both associate capitalized subject lines with unwanted email.',
      recommendation: 'Write the subject in normal sentence case and keep capitals for names and abbreviations.',
    });
  }

  // 2. Number of unique links.
  const links = [...new Set(Array.from(doc.querySelectorAll('a[href]'), (a) => (a.getAttribute('href') ?? '').trim()).filter((url) => /^https?:\/\//i.test(url)))];
  const scale = text.length > LONG_EMAIL_CHARS ? 2 : 1;
  if (links.length > LINKS_WARN * scale) {
    findings.push({
      code: 'MANY_LINKS',
      level: links.length > LINKS_STRONG * scale ? 'strong' : 'warning',
      title: `Unusually high number of links (${links.length})`,
      reason: 'Many links in one email is a pattern filters see in bulk promotions.',
      recommendation: 'Keep the links that lead to your main call to action and remove the rest.',
    });
  }

  // 3. External link domains. Ours, the unsubscribe link and links to image files do not count.
  const own = new Set(ownHosts.filter(Boolean).map(registrableDomain));
  const external = new Set<string>();
  for (const url of links) {
    if (/unsubscribe/i.test(url) || /\.(png|jpe?g|gif|webp|svg)([?#]|$)/i.test(url)) continue;
    try {
      const domain = registrableDomain(new URL(url).hostname);
      if (!own.has(domain)) external.add(domain);
    } catch { /* not a URL: ignore */ }
  }
  if (external.size > DOMAINS_WARN) {
    findings.push({
      code: 'MANY_LINK_DOMAINS',
      level: external.size > DOMAINS_STRONG ? 'strong' : 'warning',
      title: `Links point to ${external.size} different external domains`,
      reason: 'Each extra domain is one more reputation a mail filter has to trust.',
      recommendation: 'Link to your own site where you can and drop third-party or tracking domains you do not need.',
      detail: [...external],
    });
  }

  // 4. Images: share of the layout, not a raw count.
  const images = Array.from(doc.querySelectorAll('img')).filter((img) => {
    const [width, height] = [pixels(img, 'width'), pixels(img, 'height')];
    return !((width !== null && width <= TINY_IMAGE_PX) || (height !== null && height <= TINY_IMAGE_PX));
  });
  const imageArea = images.reduce((sum, img) => {
    const width = pixels(img, 'width') ?? DEFAULT_IMAGE_WIDTH;
    return sum + width * (pixels(img, 'height') ?? width / 2);
  }, 0);
  if (images.length && text.length < IMAGE_ONLY_CHARS) {
    findings.push({
      code: 'IMAGE_ONLY',
      level: 'strong',
      title: 'Email is effectively image-only',
      reason: 'Readers with images turned off see almost nothing, and filters cannot read what the email says.',
      recommendation: 'Put the message itself in text and use images to support it.',
    });
  } else if (images.length && imageArea / (imageArea + text.length * CHAR_AREA) > IMAGE_SHARE) {
    findings.push({
      code: 'MOSTLY_IMAGES',
      level: 'warning',
      title: 'Email consists mostly of images',
      reason: 'Images take up more than about 70% of the visible email.',
      recommendation: 'Add more text or use smaller images so the email still reads well without them.',
    });
  }
  const noAlt = images.filter((img) => img.getAttribute('role') !== 'presentation' && !img.getAttribute('alt')?.trim()).length;
  if (noAlt) {
    findings.push({
      code: 'IMAGES_WITHOUT_ALT',
      level: 'warning',
      title: noAlt === 1 ? '1 image has no alt text' : `${noAlt} images have no alt text`,
      reason: 'Alt text is what readers and screen readers get when an image does not load.',
      recommendation: 'Describe each meaningful image in a few words.',
    });
  }

  // 5. Plain text. The backend generates it from this HTML, so only an empty or useless result matters.
  if (!text.length) {
    findings.push({
      code: 'NO_READABLE_TEXT',
      level: 'block',
      title: 'The email has no readable text',
      reason: 'The plain-text version is generated from the email content, and there is no text to generate it from.',
      recommendation: 'Add text to the email before sending.',
    });
  } else if (text.length < SHORT_TEXT_CHARS) {
    findings.push({
      code: 'PLAIN_TEXT_SHORT',
      level: 'warning',
      title: 'The plain-text version will be very short',
      reason: `The email contains only ${text.length} characters of text.`,
      recommendation: 'Add a sentence or two that says what the email is about.',
    });
  }

  // 6. Unsubscribe: the system link and headers, never the customer's own link alone.
  if (!systemUnsubscribe) {
    findings.push({
      code: 'NO_SYSTEM_UNSUBSCRIBE',
      level: 'block',
      title: 'The system unsubscribe link is missing',
      reason: 'Every campaign must carry the unsubscribe link and List-Unsubscribe headers.',
      recommendation: 'Contact support: this email cannot be sent without them.',
    });
  }

  return findings;
}

/** Backend warnings the browser cannot work out itself. The rest overlap the checks above and are dropped. */
const BACKEND: Record<string, Pick<Finding, 'title' | 'reason' | 'recommendation'>> = {
  SUSPICIOUS_LINK: {
    title: 'Some links look suspicious to mail filters',
    reason: 'They use plain http, an IP address, a URL shortener, or text that shows a different site than the link opens.',
    recommendation: 'Link directly to the https address of the page, and let the link text match it.',
  },
  UNREACHABLE_LINK: {
    title: 'Some links point to a domain that does not exist',
    reason: 'The domain could not be found.',
    recommendation: 'Check these links for typos.',
  },
  LARGE_HTML: {
    title: 'The email is unusually large',
    reason: 'Some mail apps cut off messages above about 100 KB.',
    recommendation: 'Shorten the email or remove unused sections.',
  },
  EMBEDDED_IMAGES: {
    title: 'Images are embedded in the email itself',
    reason: 'Embedded images make the email much larger than linked ones.',
    recommendation: 'Upload the images and link to them instead.',
  },
};

export const fromBackend = (warnings: { code: string; detail?: string[] }[]): Finding[] =>
  warnings.flatMap((w) => (BACKEND[w.code] ? [{ code: w.code, level: 'warning' as const, ...BACKEND[w.code], detail: w.detail }] : []));

export const blocksSending = (findings: Finding[]) => findings.some((f) => f.level === 'block');
