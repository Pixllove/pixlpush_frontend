import { Fragment } from 'react';
import { Box, Link as MuiLink, Typography } from '@mui/material';

const DOCUMENT_LINKS: Record<string, string> = {
  'PixlPush – Terms of Service': '/legal/terms',
  'PixlPush – Privacy Policy': '/privacy',
  'PixlPush – Cookie Policy': '/legal/cookies',
  'PixlPush – Acceptable Use Policy': '/legal/aup',
  'PixlPush – Anti-Spam Policy': '/legal/anti-spam',
  'PixlPush – AI Policy': '/legal/ai-policy',
  'PixlPush – Security & Privacy': '/legal/security',
  'PixlPush – GDPR & Compliance Overview': '/legal/gdpr-compliance',
  'PixlPush – Data Processing Addendum (DPA)': '/legal/dpa',
  'PixlPush – Software Lifecycle & Versioning Policy': '/legal/software-lifecycle',
  'PixlPush – Responsible Disclosure Policy': '/legal/responsible-disclosure',
  'PixlPush – Subprocessor & Provider List': '/legal/subprocessors',
  'PixlPush – Legal Notice': '/legal/impressum',
  'PixlPush – SDK Terms & End-User License Agreement': '/legal/sdk-terms',
};

const EMAIL_PATTERN = '[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\\.[A-Za-z]{2,}';
const PHONE_PATTERN = '\\+\\d{1,3}(?:[\\s-]\\d{1,4}){2,4}';

function escapeRegExp(value: string) {
  return value.replace(/[()]/g, '\\$&');
}

const LINK_PATTERN = new RegExp(`(https?:\\/\\/[^\\s]+|${EMAIL_PATTERN}|${PHONE_PATTERN}|${Object.keys(DOCUMENT_LINKS).sort((a, b) => b.length - a.length).map(escapeRegExp).join('|')})`, 'g');

function InlineText({ text }: { text: string }) {
  return <>{text.split(LINK_PATTERN).map((part, index) => {
    if (DOCUMENT_LINKS[part]) return <MuiLink key={index} href={DOCUMENT_LINKS[part]} sx={{ overflowWrap: 'anywhere' }}>{part}</MuiLink>;
    if (new RegExp(`^${EMAIL_PATTERN}$`).test(part)) return <MuiLink key={index} href={`mailto:${part}`} sx={{ overflowWrap: 'anywhere' }}>{part}</MuiLink>;
    if (new RegExp(`^${PHONE_PATTERN}$`).test(part)) return <MuiLink key={index} href={`tel:${part.replace(/[^\d+]/g, '')}`} sx={{ overflowWrap: 'anywhere' }}>{part}</MuiLink>;
    if (!/^https?:\/\//.test(part)) return <Fragment key={index}>{part}</Fragment>;

    const trailing = part.match(/[.,;:)]+$/)?.[0] ?? '';
    const href = trailing ? part.slice(0, -trailing.length) : part;
    return <Fragment key={index}><MuiLink href={href} target="_blank" rel="noreferrer" sx={{ overflowWrap: 'anywhere' }}>{href}</MuiLink>{trailing}</Fragment>;
  })}</>;
}

export default function LegalBody({ body }: { body: string }) {
  // Treat bullet markers on their own lines as separate list items even when
  // the source document used single line breaks between them.
  const normalizedBody = body.replace(/\n(?=•\s|\*\s|-\s)/g, '\n\n');
  const blocks = normalizedBody.split(/\n{2,}/).map((block) => block.trim()).filter(Boolean);
  const output: JSX.Element[] = [];

  for (let index = 0; index < blocks.length; index += 1) {
    if (/^[•*-]\s+/.test(blocks[index])) {
      const items: string[] = [];
      while (index < blocks.length && /^[•*-]\s+/.test(blocks[index])) {
        items.push(blocks[index].replace(/^[•*-]\s+/, ''));
        index += 1;
      }
      index -= 1;
      output.push(
        <Box component="ul" key={`list-${index}`} sx={{ m: 0, pl: 3, color: 'text.secondary' }}>
          {items.map((item, itemIndex) => <Box component="li" key={itemIndex} sx={{ pl: 0.5, mb: 0.75, lineHeight: 1.8 }}><InlineText text={item} /></Box>)}
        </Box>,
      );
      continue;
    }

    output.push(<Typography component="p" key={`paragraph-${index}`} color="text.secondary" lineHeight={1.8} sx={{ m: 0 }}><InlineText text={blocks[index]} /></Typography>);
  }

  return <Box sx={{ display: 'grid', gap: 1.5 }}>{output}</Box>;
}
