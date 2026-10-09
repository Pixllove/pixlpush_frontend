import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import DeliverabilityCheck from '@/components/dashboard/DeliverabilityCheck';
import DomainStatusBadge from '@/components/dashboard/sending-domains/DomainStatusBadge';
import { analyzeEmail, blocksSending, fromBackend, registrableDomain, type EmailDraft } from '@/lib/deliverability';

const sentence = 'Hello there, here is this month’s update with everything you asked about. ';
const body = `<p>${sentence.repeat(8)}</p>`; // about 600 characters
const longBody = `<p>${sentence.repeat(45)}</p>`; // a long newsletter, above 3000 characters
const links = (n: number, host = 'shop.example.com') => Array.from({ length: n }, (_, i) => `<a href="https://${host}/p${i}">link</a>`).join('');
const linksTo = (hosts: string[]) => hosts.map((host) => `<a href="https://${host}/page">link</a>`).join('');
const codes = (draft: Partial<EmailDraft>) => analyzeEmail({ subject: 'Your October update', html: body, ...draft }).map((f) => `${f.code}:${f.level}`);
const ready = { loading: false, ready: true };

describe('subject capitalization', () => {
  it('ignores normal, short and personalised subjects', () => {
    expect(codes({ subject: 'Your October update' })).toEqual([]);
    expect(codes({ subject: 'ABCDE fghij' })).toEqual([]); // 50%
    expect(codes({ subject: 'SALE NOW' })).toEqual([]); // 7 letters
    expect(codes({ subject: 'HI 2026!!! 🎉 50% -- #1' })).toEqual([]);
    expect(codes({ subject: '{{FIRST_NAME}}, your update is here' })).toEqual([]);
  });

  it('warns from 60% uppercase and more strongly when everything is uppercase', () => {
    expect(codes({ subject: 'ABCDEF ghij' })).toEqual(['SUBJECT_UPPERCASE:warning']); // exactly 60%
    expect(codes({ subject: 'HUGE SALE today 2026!' })).toEqual(['SUBJECT_UPPERCASE:warning']);
    expect(codes({ subject: 'HUGE SALE TODAY ONLY!!! 🎉' })).toEqual(['SUBJECT_UPPERCASE:strong']);
  });
});

describe('number of links', () => {
  it('is fine up to 5, a warning for 6 to 10 and stronger above 10', () => {
    expect(codes({ html: body + links(1) })).toEqual([]);
    expect(codes({ html: body + links(5) })).toEqual([]);
    expect(codes({ html: body + links(6) })).toEqual(['MANY_LINKS:warning']);
    expect(codes({ html: body + links(10) })).toEqual(['MANY_LINKS:warning']);
    expect(codes({ html: body + links(11) })).toEqual(['MANY_LINKS:strong']);
  });

  it('counts each link once', () => {
    expect(codes({ html: body + '<a href="https://shop.example.com/sale">link</a>'.repeat(12) })).toEqual([]);
  });

  it('allows twice as many in a clearly long newsletter', () => {
    expect(codes({ html: longBody + links(10) })).toEqual([]);
    expect(codes({ html: longBody + links(11) })).toEqual(['MANY_LINKS:warning']);
    expect(codes({ html: longBody + links(20) })).toEqual(['MANY_LINKS:warning']);
    expect(codes({ html: longBody + links(21) })).toEqual(['MANY_LINKS:strong']);
  });
});

describe('external link domains', () => {
  it('is fine for 1 to 2, a warning for 3 to 4 and stronger above 4', () => {
    expect(codes({ html: body + linksTo(['a.com', 'b.com']) })).toEqual([]);
    expect(codes({ html: body + linksTo(['a.com', 'b.com', 'c.com']) })).toEqual(['MANY_LINK_DOMAINS:warning']);
    expect(codes({ html: body + linksTo(['a.com', 'b.com', 'c.com', 'd.com']) })).toEqual(['MANY_LINK_DOMAINS:warning']);
    expect(codes({ html: body + linksTo(['a.com', 'b.com', 'c.com', 'd.com', 'e.com']) })).toEqual(['MANY_LINK_DOMAINS:strong']);
  });

  it('compares registrable domains, not individual hosts or URLs', () => {
    expect(registrableDomain('www.Shop.Example.com')).toBe('example.com');
    expect(registrableDomain('news.shop.co.uk')).toBe('shop.co.uk');
    expect(codes({ html: body + linksTo(['a.shop.com', 'b.shop.com', 'www.shop.com', 'other.com']) })).toEqual([]);
    expect(codes({ html: body + linksTo(['a.co.uk', 'b.co.uk', 'c.co.uk']) })).toEqual(['MANY_LINK_DOMAINS:warning']);
  });

  it('does not count our own tracking domain, the unsubscribe link or links to images', () => {
    const html = body + linksTo(['a.com', 'b.com', 'track.engagementool.test'])
      + '<a href="https://lists.other.com/unsubscribe/abc">Unsubscribe</a><a href="https://cdn.images.net/photo.png?w=600">photo</a>';
    expect(codes({ html, ownHosts: ['app.engagementool.test'] })).toEqual([]);
    expect(codes({ html })).toEqual(['MANY_LINK_DOMAINS:warning']); // without knowing our host, the tracking domain is a third one
  });
});

describe('image-heavy emails', () => {
  const img = (w: number, h: number, alt = 'alt="Autumn collection"') => `<img src="https://shop.example.com/a.png" width="${w}" height="${h}" ${alt}>`;

  it('accepts normal text together with images, whatever their number', () => {
    expect(codes({ html: body + img(600, 200) })).toEqual([]);
    expect(codes({ html: body + img(40, 40).repeat(6) })).toEqual([]);
  });

  it('warns when images take more than about 70% of the email', () => {
    expect(codes({ html: `<p>${sentence}</p>${img(600, 400)}` })).toEqual(['MOSTLY_IMAGES:warning']);
  });

  it('warns more strongly when the email is effectively image-only', () => {
    expect(codes({ html: `${img(600, 400)}<p>Our autumn sale is on now</p>` })).toEqual(['IMAGE_ONLY:strong']);
  });

  it('warns about meaningful images without alt text, not about pixels or decoration', () => {
    expect(codes({ html: body + img(600, 100, '') })).toEqual(['IMAGES_WITHOUT_ALT:warning']);
    expect(codes({ html: body + img(600, 100, 'alt=""') })).toEqual(['IMAGES_WITHOUT_ALT:warning']);
    expect(codes({ html: body + img(1, 1, '') })).toEqual([]);
    expect(codes({ html: body + img(600, 100, 'role="presentation"') })).toEqual([]);
  });
});

describe('plain-text version', () => {
  it('says nothing just because the editor has no separate text field', () => {
    expect(codes({ html: body })).toEqual([]);
  });

  it('warns when the generated text would be unusably short', () => {
    expect(codes({ html: '<p>Hi there</p>' })).toEqual(['PLAIN_TEXT_SHORT:warning']);
  });

  it('blocks when there is no readable text at all', () => {
    expect(codes({ html: '' })).toEqual(['NO_READABLE_TEXT:block']);
    expect(codes({ html: '<style>p{color:red}</style><img src="https://shop.example.com/a.png" alt="Sale">' })).toContain('NO_READABLE_TEXT:block');
  });
});

describe('unsubscribe link', () => {
  it('says nothing when the content has no unsubscribe link, because the system adds one', () => {
    expect(codes({ html: body })).toEqual([]);
  });

  it('blocks only when the system link and headers are missing, whatever the customer added', () => {
    expect(codes({ html: `${body}<a href="https://shop.example.com/unsubscribe">Unsubscribe</a>`, systemUnsubscribe: false })).toEqual(['NO_SYSTEM_UNSUBSCRIBE:block']);
  });
});

describe('findings', () => {
  it('does not judge vocabulary', () => {
    expect(codes({ subject: 'Free gift: win cash now', html: `<p>Free money, act now, winner! ${sentence.repeat(8)}</p>` })).toEqual([]);
  });

  it('explains every finding and recommends what to do', () => {
    const findings = analyzeEmail({ subject: 'HUGE SALE TODAY', html: `${links(12)}${linksTo(['a.com', 'b.com', 'c.com'])}<img src="x.png">`, systemUnsubscribe: false });
    expect(findings.length).toBeGreaterThan(4);
    for (const f of findings) {
      expect(f.reason.length).toBeGreaterThan(20);
      expect(f.recommendation.length).toBeGreaterThan(15);
    }
  });

  it('only lets technical requirements block sending', () => {
    expect(blocksSending(analyzeEmail({ subject: 'HUGE SALE TODAY ONLY', html: body + links(30) + linksTo(['a.com', 'b.com', 'c.com', 'd.com', 'e.com']) }))).toBe(false);
    expect(blocksSending(analyzeEmail({ subject: 'Hi', html: '' }))).toBe(true);
  });

  it('adds the backend warnings the browser cannot compute and drops the ones it overrides', () => {
    const backend = [
      { code: 'SUSPICIOUS_LINK', detail: ['http://203.0.113.9/login'] },
      { code: 'NO_PLAIN_TEXT' },
      { code: 'NO_UNSUBSCRIBE_LINK' },
      { code: 'MANY_LINKS' },
      { code: 'LARGE_HTML' },
    ];
    expect(fromBackend(backend).map((f) => [f.code, f.level])).toEqual([['SUSPICIOUS_LINK', 'warning'], ['LARGE_HTML', 'warning']]);
    expect(fromBackend(backend)[0].detail).toEqual(['http://203.0.113.9/login']);
  });
});

describe('DeliverabilityCheck', () => {
  it('passes a clean email on a ready project', () => {
    render(<DeliverabilityCheck findings={analyzeEmail({ subject: 'Your October update', html: body })} sender={ready} />);
    expect(screen.getByText('Domain authenticated and sending connection ready')).toBeInTheDocument();
    expect(screen.getByText('Bounce and complaint handling is active')).toBeInTheDocument();
    expect(screen.getByText('Unsubscribe link and one-click unsubscribe headers are added automatically')).toBeInTheDocument();
    expect(screen.getByText('A plain-text version is generated automatically')).toBeInTheDocument();
    expect(screen.queryByRole('alert')).toBeNull();
    expect(screen.queryByText('Deliverability recommendations')).toBeNull();
  });

  it('shows content findings as recommendations that do not block sending', () => {
    render(<DeliverabilityCheck findings={analyzeEmail({ subject: 'HUGE SALE TODAY ONLY', html: body + links(6) })} sender={ready} />);
    expect(screen.getByRole('alert')).toHaveTextContent('This email can be sent, but we found possible deliverability risks.');
    expect(screen.getByText('Deliverability recommendations')).toBeInTheDocument();
    expect(screen.getByText(/Subject is entirely uppercase/)).toHaveTextContent('(high risk)');
    expect(screen.getByText('Unusually high number of links (6)')).toBeInTheDocument();
    expect(screen.getByText(/Write the subject in normal sentence case/)).toBeInTheDocument();
    expect(screen.queryByText(/cannot be sent/)).toBeNull();
  });

  it('blocks when the sending setup is incomplete, whatever the content, and says what is missing', () => {
    const sender = { loading: false, ready: false, blockers: [{ code: 'SMTP_NOT_CONFIGURED', message: 'Connect the email provider (SMTP relay) this project sends through.' }] };
    render(<DeliverabilityCheck findings={analyzeEmail({ subject: 'Your October update', html: body })} sender={sender} />);
    expect(screen.getByRole('alert')).toHaveTextContent('This campaign cannot be sent yet');
    expect(screen.getByText('Connect the email provider (SMTP relay) this project sends through.')).toBeInTheDocument();
    expect(screen.queryByText('Domain authenticated and sending connection ready')).toBeNull();
    expect(screen.queryByText('Bounce and complaint handling is active')).toBeNull();
  });

  it('blocks an email without readable text even on a ready project', () => {
    render(<DeliverabilityCheck findings={analyzeEmail({ subject: 'Hi', html: '' })} sender={ready} />);
    expect(screen.getByRole('alert')).toHaveTextContent('This campaign cannot be sent yet');
    expect(screen.getByText('The email has no readable text')).toBeInTheDocument();
    expect(screen.queryByText('A plain-text version is generated automatically')).toBeNull();
  });

  it('never promises inbox placement', () => {
    const { container } = render(<DeliverabilityCheck findings={[]} sender={ready} />);
    expect(container.textContent).not.toMatch(/spam-proof|guaranteed inbox/i);
    expect(container.textContent).toContain('cannot guarantee which folder');
  });
});

describe('DomainStatusBadge', () => {
  it('does not call a domain ready when only DNS passed', () => {
    render(<DomainStatusBadge status="verification_failed" lastError="FEEDBACK_NOT_CONFIGURED" />);
    expect(screen.getByText('Provider connection incomplete')).toBeInTheDocument();
    expect(screen.queryByText('Ready to send')).toBeNull();
  });

  it('keeps real DNS failures as authentication failures', () => {
    render(<DomainStatusBadge status="verification_failed" lastError="DOMAIN_NOT_VERIFIED" />);
    expect(screen.getByText('Authentication failed')).toBeInTheDocument();
  });
});
