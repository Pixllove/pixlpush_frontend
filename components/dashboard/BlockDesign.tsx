// Design markup ported from Dashboard-Frontend EmailCampaign.tsx.
import { CSSProperties, ReactNode, isValidElement, cloneElement, createElement, ReactElement } from 'react';
import { createSvgIcon } from '@mui/material/utils';
import { ImageOutlined, DescriptionOutlined, PeopleOutline, AutoAwesomeOutlined, Apple, Facebook, Instagram, X, LinkedIn, YouTube, WhatsApp, Telegram, Pinterest } from '@mui/icons-material';
export type DesignItem = {type: string; label: string; description?: string};
const icon = (Icon: typeof ImageOutlined) => function DesignIcon({size=16, className}: {size?: number; className?: string}) {return <Icon className={className} style={{width:size,height:size,fill:'currentColor',display:'inline-block',flexShrink:0}}/>};
const DesignImage=icon(ImageOutlined), FileText=icon(DescriptionOutlined), Users=icon(PeopleOutline), Sparkles=icon(AutoAwesomeOutlined), FaApple=icon(Apple);
export const DashboardBlockDesign = (item: DesignItem) => {
    const { type, label } = item;

    if (type === 'navigation') {
      if (label === 'Logo') {
        return (
          <div className="rounded bg-white p-4 text-center text-[9px] text-black">
            <span className="inline-flex items-center gap-1 font-bold text-slate-500"><DesignImage size={12} /> Logo image</span>
          </div>
        );
      }

      if (label === 'Logo + Button') {
        return (
          <div className="flex items-center justify-between rounded bg-white px-4 py-3 text-[8px] text-black">
            <span className="inline-flex items-center gap-1 font-bold text-slate-500"><DesignImage size={12} /> Logo</span>
            <span className="rounded bg-black px-4 py-1.5 text-white">
              Button
            </span>
          </div>
        );
      }

      if (label === 'Logo + Social links') {
        return (
          <div className="flex items-center justify-between rounded bg-white px-4 py-3 text-[8px] text-black">
            <span className="inline-flex items-center gap-1 font-bold text-slate-500"><DesignImage size={12} /> Logo</span>
            <span className="flex gap-1">
              <span className="h-3 w-3 rounded-full bg-black"></span>
              <span className="h-3 w-3 rounded-full bg-black"></span>
              <span className="h-3 w-3 rounded-full bg-black"></span>
            </span>
          </div>
        );
      }

      return (
        <div className="space-y-2 rounded bg-white p-3 text-center text-[8px] text-black shadow-sm">
          {label !== 'Navigation' && (
            <div className="font-bold text-slate-500">Logo image</div>
          )}
          <div className="flex justify-center gap-3">
            <span>About</span>
            <span>New!</span>
            <span>Shop</span>
          </div>
        </div>
      );
    }

    if (type === 'hero') {
      if (label === 'Image grid') {
        return (
          <div className="rounded bg-white p-3 text-center text-[8px] text-black shadow-sm">
            <div className="grid grid-cols-2 gap-2">
              {['Image 1', 'Image 2', 'Image 3', 'Image 4'].map((image) => (
                <div key={image}>
                  <div className="flex h-20 items-center justify-center rounded bg-gray-2 text-body">
                    <DesignImage size={18} />
                  </div>
                  <div className="mt-1 font-semibold">{image}</div>
                </div>
              ))}
            </div>
          </div>
        );
      }

      if (label === 'Image with caption') {
        return (
          <div className="rounded bg-white p-3 text-center text-[8px] text-black shadow-sm">
            <div className="flex h-28 items-center justify-center rounded bg-gray-2 text-body">
              <DesignImage size={22} />
            </div>
            <div className="mx-auto mt-2 h-2 w-32 rounded bg-slate-300"></div>
          </div>
        );
      }

      if (label === 'Latest post') {
        return (
          <div className="grid grid-cols-2 gap-3 rounded bg-white p-3 text-[8px] text-black shadow-sm">
            <div className="flex h-24 items-center justify-center rounded bg-gray-2 text-body">
              <DesignImage size={18} />
            </div>
            <div className="flex flex-col justify-center">
              <div className="text-[6px] font-bold uppercase text-primary">Latest post</div>
              <div className="mt-1 font-bold">Latest from our blog</div>
              <div className="mt-2 h-3 w-14 rounded bg-success"></div>
            </div>
          </div>
        );
      }

      if (label === 'RSS digest') {
        return (
          <div className="rounded bg-white p-3 text-[8px] text-black shadow-sm">
            <div className="mb-2 font-bold">Latest updates</div>
            {['Product update', 'Community story', 'Matchmaking tips'].map((post) => (
              <div key={post} className="mb-1 flex items-center gap-2 rounded bg-gray-2 p-2 last:mb-0">
                <FileText size={12} className="text-primary" />
                <span>{post}</span>
              </div>
            ))}
          </div>
        );
      }

      if (label === 'Community invite') {
        return (
          <div className="rounded bg-white p-4 text-center text-[8px] text-black shadow-sm">
            <Users size={22} className="mx-auto mb-2 text-primary" />
            <div className="font-bold">Join our community</div>
            <div className="mx-auto mt-2 h-3 w-14 rounded bg-success"></div>
          </div>
        );
      }

      if (['Two column feature', 'Image + text'].includes(label)) {
        return (
          <div className="grid grid-cols-2 gap-3 rounded bg-white p-3 text-[8px] text-black shadow-sm">
            <div className="flex h-24 items-center justify-center rounded bg-gray-2 text-body"><DesignImage size={18} /></div>
            <div className="flex flex-col justify-center">
              <div className="font-bold">Introduce your concept</div>
              <div className="mt-2 h-2 rounded bg-slate-200"></div>
              <div className="mt-1 h-2 w-3/4 rounded bg-slate-200"></div>
              <div className="mt-3 h-4 w-12 rounded bg-success"></div>
            </div>
          </div>
        );
      }

      if (label === 'Feature spotlight') {
        return (
          <div className="rounded bg-white p-3 text-center text-[8px] text-black shadow-sm">
            <div className="mb-2 flex h-24 items-center justify-center rounded bg-gray-2 text-body"><DesignImage size={18} /></div>
            <div className="font-bold">Introduce your concept</div>
            <div className="mx-auto mt-2 h-2 w-32 rounded bg-slate-200"></div>
            <div className="mx-auto mt-3 h-4 w-12 rounded bg-success"></div>
          </div>
        );
      }

      if (label === 'Announcement section' || label === 'Survey invitation') {
        return (
          <div className="rounded bg-white p-4 text-center text-[8px] text-black shadow-sm">
            <Sparkles size={20} className="mx-auto mb-2 text-primary" />
            <div className="font-bold">{label === 'Announcement section' ? 'Important update' : 'Tell us what you want next'}</div>
            <div className="mx-auto mt-3 h-4 w-14 rounded bg-success"></div>
          </div>
        );
      }

      if (label === 'Countdown offer') {
        return (
          <div className="rounded bg-white p-4 text-center text-[8px] text-black shadow-sm">
            <div className="font-bold text-danger">Limited time</div>
            <div className="mt-2 font-bold">Limited-time match boost</div>
            <div className="mt-3 grid grid-cols-3 gap-1">
              {['02', '14', '39'].map((time) => <span key={time} className="rounded bg-gray-2 p-2 font-bold">{time}</span>)}
            </div>
            <div className="mx-auto mt-3 h-4 w-14 rounded bg-success"></div>
          </div>
        );
      }

      if (['Single product', 'Product spotlight'].includes(label)) {
        return (
          <div className="grid grid-cols-2 gap-3 rounded bg-white p-3 text-[8px] text-black shadow-sm">
            <div className="flex h-28 items-center justify-center rounded bg-gray-2 text-body"><DesignImage size={18} /></div>
            <div className="flex flex-col justify-center"><div className="font-bold">Premium Match Boost</div><div className="mt-2 text-primary">$99</div><div className="mt-3 h-4 w-14 rounded bg-success"></div></div>
          </div>
        );
      }

      if (label === 'Two product row') {
        return (
          <div className="grid grid-cols-2 gap-2 rounded bg-white p-3 text-center text-[8px] text-black shadow-sm">
            {['Premium Match Boost', 'Weekend Spotlight'].map((product) => <div key={product} className="rounded border border-stroke p-2"><div className="flex h-16 items-center justify-center rounded bg-gray-2 text-body"><DesignImage size={14} /></div><div className="mt-2 font-bold">{product}</div></div>)}
          </div>
        );
      }

      if (label === 'Extended hero') {
        return (
          <div className="rounded bg-white p-4 text-center text-[8px] text-black shadow-sm">
            <div className="mb-3 flex h-24 items-center justify-center rounded bg-gray-2 text-body">
              <DesignImage size={18} />
            </div>
            <div className="font-bold">Product name</div>
            <p className="mx-auto mt-1 w-35 text-[6px] leading-snug text-body">
              Describe your product in a way that highlights how it benefits
              readers
            </p>
            <div className="mt-2 text-[7px] font-bold">
              $99 <span className="text-body line-through">$129</span>
            </div>
            <div className="mx-auto mt-2 h-4 w-12 rounded bg-success"></div>
          </div>
        );
      }

      if (label === 'Title + image') {
        return (
          <div className="rounded bg-white p-4 text-center text-[8px] text-black shadow-sm">
            <div className="mb-3 text-sm font-bold">Introduce your concept</div>
            <div className="mx-auto mb-3 flex h-20 w-22 items-center justify-center rounded bg-gray-2 text-body">
              <DesignImage size={18} />
            </div>
            <div className="font-bold">Compelling headline</div>
            <p className="mx-auto mt-1 w-40 text-[6px] leading-snug text-body">
              Get your creative juices flowing with informative content.
            </p>
            <div className="mx-auto mt-3 h-4 w-12 rounded bg-success"></div>
          </div>
        );
      }

      if (label === 'Side-by-side image + text') {
        return (
          <div className="grid grid-cols-[1fr_1fr] gap-3 rounded bg-white p-4 text-[8px] text-black shadow-sm">
            <div className="flex h-24 items-center justify-center rounded bg-gray-2 text-body">
              <DesignImage size={18} />
            </div>
            <div className="flex flex-col justify-center">
              <span className="text-[6px] font-bold text-body">Subtitle</span>
              <strong className="text-sm leading-tight">
                Introduce your concept
              </strong>
              <p className="mt-1 text-[6px] leading-snug text-body">
                Use this space to introduce subscribers.
              </p>
              <span className="mt-2 h-4 w-12 rounded bg-success"></span>
            </div>
          </div>
        );
      }

      if (label === 'Image below text') {
        return (
          <div className="rounded bg-white p-4 text-[8px] text-black shadow-sm">
            <div className="grid grid-cols-[0.9fr_1.1fr] gap-3">
              <strong className="text-sm leading-tight">
                Introduce your concept
              </strong>
              <p className="text-[6px] leading-snug text-body">
                Use this space to introduce subscribers to the topic.
              </p>
            </div>
            <div className="mt-3 flex h-20 items-center justify-center rounded bg-gray-2 text-body">
              <DesignImage size={18} />
            </div>
          </div>
        );
      }

      if (label === 'Three benefit cards') {
        return (
          <div className="rounded bg-white p-3 text-center text-[7px] text-black shadow-sm">
            <div className="mb-3 font-bold">Why readers love it</div>
            <div className="grid grid-cols-3 gap-2">
              {[1, 2, 3].map((item) => (
                <span key={item} className="rounded bg-gray-2 p-2">
                  <span className="mx-auto mb-1 block h-4 w-4 rounded-full bg-success/70"></span>
                  Benefit
                </span>
              ))}
            </div>
          </div>
        );
      }

      return (
        <div className="rounded bg-white p-4 text-center text-[8px] text-black shadow-sm">
          <div className="mb-3 flex h-24 items-center justify-center rounded bg-gray-2 text-body">
            <DesignImage size={18} />
          </div>
          <div className="text-sm font-bold">Introduce your concept</div>
          <p className="mx-auto mt-1 w-44 text-[6px] leading-snug text-body">
            Use this space to introduce subscribers to the topic of this
            newsletter.
          </p>
          <div className="mx-auto mt-3 h-4 w-12 rounded bg-success"></div>
        </div>
      );
    }

    if (type === 'image') {
      return (
        <div className="rounded bg-white p-3 text-body shadow-sm">
          <div
            className={`flex items-center justify-center rounded bg-gray-2 ${
              label === 'Tall image' ? 'h-32' : 'h-22'
            }`}
          >
            <DesignImage size={24} />
          </div>
          {label === 'Image with caption' && (
            <div className="mx-auto mt-2 h-2 w-28 rounded bg-slate-300"></div>
          )}
        </div>
      );
    }

    if (type === 'heading') {
      return (
        <div className="rounded bg-white p-4 text-black shadow-sm">
          <div className="text-sm font-bold">Compelling headline</div>
          {label === 'Title with button' && (
            <div className="mt-2 h-4 w-14 rounded bg-black"></div>
          )}
        </div>
      );
    }

    if (type === 'text') {
      if (label === 'Quote') {
        return (
          <div className="rounded bg-white p-4 shadow-sm">
            <div className="border-l-3 border-success pl-3 text-[7px] italic text-body">
              Write your quote here
            </div>
          </div>
        );
      }

      if (label === 'Coupon code') {
        return (
          <div className="rounded bg-white p-4 text-center shadow-sm">
            <div className="text-[8px] text-body">Your code</div>
            <div className="mt-1 rounded border border-dashed border-success px-3 py-2 text-sm font-bold text-success">
              PIXL20
            </div>
          </div>
        );
      }

      return (
        <div className="space-y-1 rounded bg-white p-4 shadow-sm">
          <div className="h-2 rounded bg-slate-300"></div>
          <div className="h-2 rounded bg-slate-200"></div>
          <div className="h-2 w-3/4 rounded bg-slate-200"></div>
        </div>
      );
    }

    if (type === 'button') {
      return (
        <div className="rounded bg-white p-4 text-center shadow-sm">
          <div
            className={`grid gap-2 ${
              label === 'Three buttons'
                ? 'grid-cols-3'
                : label === 'Two buttons'
                ? 'grid-cols-2'
                : 'grid-cols-1'
            }`}
          >
            {(label === 'Three buttons'
              ? [1, 2, 3]
              : label === 'Two buttons'
              ? [1, 2]
              : [1]
            ).map((item) => (
              <span
                key={item}
                className="inline-block rounded bg-success px-3 py-2 text-[7px] text-white"
              >
                Button
              </span>
            ))}
          </div>
        </div>
      );
    }

    if (type === 'divider') {
      return (
        <div className="rounded bg-white p-5 shadow-sm">
          {label === 'Spacer' ? (
            <div className="rounded border border-dashed border-stroke py-2 text-center text-[8px] text-body">
              up/down space
            </div>
          ) : (
            <div className="h-px bg-stroke"></div>
          )}
        </div>
      );
    }

    if (type === 'footer') {
      if (label === 'Footer + app download') {
        return (
          <div className="rounded bg-white p-4 text-[7px] text-black shadow-sm">
            <div className="font-bold">Company name</div>
            <div className="mt-1 text-body">Add your postal address here</div>
            <div className="mt-3 font-bold">Use our app on the go</div>
            <div className="mt-2 flex gap-2">
              <span className="inline-flex h-6 min-w-[64px] items-center justify-center gap-1 rounded bg-black px-1.5 text-white">
                <FaApple className="h-4 w-4" />
                <span className="leading-none">
                  <span className="block text-[4px]">Download on the</span>
                  <span className="block text-[7px] font-bold">App Store</span>
                </span>
              </span>
              <span className="inline-flex h-6 min-w-[64px] items-center justify-center gap-1 rounded bg-black px-1.5 text-white">
                <svg
                  width="13"
                  height="13"
                  viewBox="0 0 32 32"
                  aria-hidden="true"
                  className="shrink-0"
                >
                  <path
                    d="M5.3 3.6c-.5.4-.8 1.1-.8 2v20.8c0 .9.3 1.6.8 2l12.2-12.3L5.3 3.6Z"
                    fill="#00A0FF"
                  />
                  <path
                    d="m17.5 16.1 4-4L7.1 3.8c-.7-.4-1.3-.4-1.8-.2l12.2 12.5Z"
                    fill="#00F076"
                  />
                  <path
                    d="M17.5 16.1 5.3 28.4c.5.2 1.1.2 1.8-.2l14.4-8.3-4-3.8Z"
                    fill="#FFCE00"
                  />
                  <path
                    d="m21.5 12.1-4 4 4 3.8 4.8-2.8c1.6-.9 1.6-1.5 0-2.4l-4.8-2.6Z"
                    fill="#FF3D3D"
                  />
                </svg>
                <span className="leading-none">
                  <span className="block text-[4px] font-bold uppercase">
                    Get it on
                  </span>
                  <span className="block text-[7px] font-bold">
                    Google Play
                  </span>
                </span>
              </span>
            </div>
            <div className="mt-3 flex justify-end gap-1">
              <span className="h-3 w-3 rounded-full bg-black"></span>
              <span className="h-3 w-3 rounded-full bg-black"></span>
              <span className="h-3 w-3 rounded-full bg-black"></span>
            </div>
          </div>
        );
      }

      if (label === 'Footer + navigation') {
        return (
          <div className="rounded bg-white p-4 text-center text-[7px] text-black shadow-sm">
            <div className="flex justify-center gap-3">
              <span>About</span>
              <span>New</span>
              <span>Shop</span>
            </div>
            <div className="my-3 h-px bg-stroke"></div>
            <div className="font-bold">Company name</div>
            <div className="mt-1 text-body">Postal address here</div>
            <div className="mt-2 underline">Unsubscribe</div>
          </div>
        );
      }

      if (label === 'Centered footer') {
        return (
          <div className="rounded bg-white p-4 text-center text-[7px] text-black shadow-sm">
            <div className="font-bold text-success">Company</div>
            <div className="mt-2 flex justify-center gap-1">
              <span className="h-3 w-3 rounded-full bg-black"></span>
              <span className="h-3 w-3 rounded-full bg-black"></span>
              <span className="h-3 w-3 rounded-full bg-black"></span>
            </div>
            <div className="mt-2 font-bold">Company name</div>
            <div className="mt-1 text-body">Add your address here</div>
            <div className="mt-1 underline">Unsubscribe</div>
          </div>
        );
      }

      if (label === 'Aligned footer' || label === 'Social footer') {
        return (
          <div className="rounded bg-white p-4 text-[7px] text-black shadow-sm">
            <div className="flex items-start justify-between">
              <div>
                <div className="font-bold text-success">Company</div>
                <div className="mt-2 font-bold">Company name</div>
                <div className="mt-1 text-body">Postal address here</div>
              </div>
              <div className="flex gap-1">
                <span className="h-3 w-3 rounded-full bg-black"></span>
                <span className="h-3 w-3 rounded-full bg-black"></span>
                <span className="h-3 w-3 rounded-full bg-black"></span>
              </div>
            </div>
            <div className="mt-2 text-body">You received this email.</div>
          </div>
        );
      }
    }

    return (
      <div className="rounded bg-white shadow-sm">
        <div className="grid grid-cols-2 gap-3 rounded-b bg-main p-4 text-[8px] text-white">
          <div>
            <div className="font-bold">Company name</div>
            <div className="mt-1 opacity-80">Postal address here</div>
          </div>
          <div className="opacity-80">
            You received this email because you subscribed.
          </div>
        </div>
      </div>
    );
  };


const palette: Record<string,string> = {
 white:'var(--section-background, #ffffff)', black:'var(--section-heading, #1c2434)',
 body:'var(--section-text, #64748b)', primary:'var(--section-primary, #7132d3)',
 success:'var(--section-primary, #7132d3)', 'success/70':'var(--section-primary, #7132d3)',
 'gray-2':'#f7f8fb', 'slate-200':'#e2e8f0', 'slate-300':'#cbd5e1',
 'slate-500':'var(--section-text, #64748b)', stroke:'#e2e8f0', main:'var(--section-background, #241536)', danger:'#e14b55'
};
function utilityStyle(classes: string, scale: number): CSSProperties {
 const out: Record<string,string|number> = {};
 const px=(n:number)=>n*scale;
 for(const c of classes.split(/\s+/)){
  const simple: Record<string,CSSProperties> = {
   flex:{display:'flex'},grid:{display:'grid'},block:{display:'block'},
   'inline-flex':{display:'inline-flex'},'inline-block':{display:'inline-block'},
   'flex-col':{flexDirection:'column'},'items-center':{alignItems:'center'},
   'items-start':{alignItems:'flex-start'},'justify-between':{justifyContent:'space-between'},
   'justify-center':{justifyContent:'center'},'justify-end':{justifyContent:'flex-end'},
   'text-center':{textAlign:'center'},'text-white':{color:'#fff'},
   'font-bold':{fontWeight:700},'font-semibold':{fontWeight:600},italic:{fontStyle:'italic'},
   underline:{textDecoration:'underline'},'line-through':{textDecoration:'line-through'},
   uppercase:{textTransform:'uppercase'},rounded:{borderRadius:px(4)},
   'rounded-full':{borderRadius:999},'mx-auto':{marginLeft:'auto',marginRight:'auto'},
   border:{borderWidth:1,borderStyle:'solid'},'border-dashed':{borderStyle:'dashed'},
   'border-l-3':{borderLeftWidth:3,borderLeftStyle:'solid'},'h-px':{height:1},
   'leading-none':{lineHeight:1},'leading-tight':{lineHeight:1.25},'leading-snug':{lineHeight:1.375},
   // Secondary copy on the dark design: its own colour, so "Text color" can change it.
   'opacity-80':{color:'var(--section-text, #d9d5e3)'},'w-3/4':{width:'75%'},'shrink-0':{flexShrink:0},
   // Full-size sections size text through the inspector's scale variables; thumbnails use plain px.
   'text-sm':{fontSize:scale>1?'calc(32px * var(--section-heading-scale, 1))':14},
   'shadow-sm':{},'last:mb-0':{},'rounded-b':{borderRadius:px(4)}
  };
  if(simple[c]){Object.assign(out,simple[c]);continue;}
  const color=c.match(/^(bg|text|border)-(.+)$/);
  if(color && palette[color[2]]) {out[color[1]==='bg'?'backgroundColor':color[1]==='text'?'color':'borderColor']=palette[color[2]];continue;}
  const grid=c.match(/^grid-cols-(\d)$/);
  if(grid){out.gridTemplateColumns=`repeat(${grid[1]}, minmax(0, 1fr))`;continue;}
  if(c.startsWith('grid-cols-[')){out.gridTemplateColumns=c.slice(11,-1).replaceAll('_',' ');continue;}
  const font=c.match(/^text-\[(\d+)px\]$/);
  // Body copy never drops below 14px in the real email; only micro labels (store badges) stay smaller.
  if(font){const n=Number(font[1]);out.fontSize=scale>1?`calc(${n>=6?Math.max(14,px(n)):px(n)}px * var(--section-text-scale, 1))`:px(n);continue;}
  const stack=c.match(/^space-y-(\d)$/);
  if(stack){Object.assign(out,{display:'flex',flexDirection:'column',gap:px(Number(stack[1])*4)});continue;}
  const space=c.match(/^(p|px|py|pl|m|mt|mb|my|gap|h|w)-(\d+(?:\.\d+)?)$/);
  if(space){
   const keys:Record<string,string[]>={p:['padding'],px:['paddingLeft','paddingRight'],py:['paddingTop','paddingBottom'],pl:['paddingLeft'],m:['margin'],mt:['marginTop'],mb:['marginBottom'],my:['marginTop','marginBottom'],gap:['gap'],h:['height'],w:['width']};
   keys[space[1]].forEach(k=>out[k]=px(Number(space[2])*4));continue;
  }
  const min=c.match(/^min-w-\[(\d+)px\]$/); if(min)out.minWidth=px(Number(min[1]));
 }
 return out as CSSProperties;
}
// MUI ships no TikTok glyph, so it is drawn here.
const TikTok = createSvgIcon(<path d="M12.525.02c1.31-.02 2.61-.01 3.91-.02.08 1.53.63 3.09 1.75 4.17 1.12 1.11 2.7 1.62 4.24 1.79v4.03c-1.44-.05-2.89-.35-4.2-.97-.57-.26-1.1-.59-1.62-.93-.01 2.92.01 5.84-.02 8.75-.08 1.4-.54 2.79-1.35 3.94-1.31 1.92-3.58 3.17-5.91 3.21-1.43.08-2.86-.31-4.08-1.03-2.02-1.19-3.44-3.37-3.65-5.71-.02-.5-.03-1-.01-1.49.18-1.9 1.12-3.72 2.58-4.96 1.66-1.44 3.98-2.13 6.15-1.72.02 1.48-.04 2.96-.04 4.44-.99-.32-2.15-.23-3.02.37-.63.41-1.11 1.04-1.36 1.75-.21.51-.15 1.07-.14 1.61.24 1.64 1.82 3.02 3.5 2.87 1.12-.01 2.19-.66 2.77-1.61.19-.33.4-.67.41-1.06.1-1.79.06-3.57.07-5.36.01-4.03-.01-8.05.02-12.07z" />, 'TikTok');
export const socialNetworks: Record<string,{label:string;url:string;Icon:typeof ImageOutlined}> = {
 facebook:{label:'Facebook',url:'https://facebook.com/',Icon:Facebook}, instagram:{label:'Instagram',url:'https://instagram.com/',Icon:Instagram},
 tiktok:{label:'TikTok',url:'https://tiktok.com/',Icon:TikTok}, linkedin:{label:'LinkedIn',url:'https://linkedin.com/',Icon:LinkedIn},
 youtube:{label:'YouTube',url:'https://youtube.com/',Icon:YouTube}, x:{label:'X (Twitter)',url:'https://x.com/',Icon:X},
 whatsapp:{label:'WhatsApp',url:'https://wa.me/',Icon:WhatsApp},
 telegram:{label:'Telegram',url:'https://t.me/',Icon:Telegram}, pinterest:{label:'Pinterest',url:'https://pinterest.com/',Icon:Pinterest},
};
// ponytail: inline SVG icons — Gmail strips <svg>, swap for hosted PNGs when a public asset URL exists.
export function SocialLink({network,url,size=24}:{network:string;url?:string;size?:number}) {
 const item=socialNetworks[network] || socialNetworks.facebook;
 return <a data-social={network} href={url || item.url} title={item.label} contentEditable={false} style={{display:'inline-flex',alignItems:'center',justifyContent:'center',width:size,height:size,borderRadius:999,flexShrink:0,color:'#fff',backgroundColor:'var(--section-heading, #1c2434)',textDecoration:'none'}}><item.Icon style={{width:size*.58,height:size*.58,fill:'currentColor'}}/></a>;
}
const isDot=(n:ReactNode)=>isValidElement(n) && !(n.props as {children?:ReactNode}).children && /rounded-full/.test((n.props as {className?:string}).className||'') && /bg-black/.test((n.props as {className?:string}).className||'');
function inlineDesign(node: ReactNode, scale: number): ReactNode {
 if(!isValidElement(node))return node;
 const el=node as ReactElement<{className?:string;style?:CSSProperties;children?:ReactNode}>;
 // SVG children must stay SVG elements: wrapping <path> in <span> made the icon render blank.
 if(el.type==='svg')return cloneElement(el as ReactElement<{className?:string;width?:number;height?:number;style?:CSSProperties}>,{className:undefined,width:13*scale,height:13*scale,style:{flexShrink:0}});
 const classes=el.props.className || '';
 // .map() inside JSX nests an array among the children; flatten it so those rows get inlined too.
 const rawKids=el.props.children;
 const kids=Array.isArray(rawKids)?rawKids.flat(Infinity as 1).filter(kid=>kid!==null&&kid!==undefined&&kid!==false):rawKids;
 const style={...utilityStyle(classes,scale),...el.props.style};
 // The dark design: its text follows "Heading color" instead of a fixed white, and it is tagged so the editor starts it from dark colours.
 const dark=/\bbg-main\b/.test(classes);
 if(dark) style.color='var(--section-heading, #ffffff)';
 // A row of placeholder dots becomes real, editable social links.
 if(Array.isArray(kids) && kids.length>0 && kids.every(isDot)) {
   return cloneElement(el,{style,className:undefined,'data-socials':''} as object,['facebook','instagram','x'].map(network=><SocialLink key={network} network={network} size={12*scale}/>));
 }
 // Anything clickable is an <a data-link> so the inspector can list it and set its URL.
 const link=(extra:CSSProperties,children:ReactNode)=>createElement('a',{'data-link':'',href:'#',style:{color:'inherit',textDecoration:'none',display:el.type==='div'?'block':'inline-block',...style,...extra}},children);
 const filled=/bg-(success|black)\b/.test(classes) && !classes.includes('rounded-full');
 if(scale>1 && !kids && filled) {
   return link({display:'inline-block',height:'auto',width:'auto',minWidth:96,padding:'10px 20px',color:'#fff',fontSize:'calc(14px * var(--section-text-scale, 1))'},'Button');
 }
 if(scale>1 && !kids && /bg-slate-(200|300)/.test(classes)) {
   return <p style={{margin:'8px 0',color:'var(--section-text, #64748b)',fontSize:'calc(16px * var(--section-text-scale, 1))',lineHeight:'var(--section-line-height, 1.6)'}}>Share your story and help your readers discover what comes next.</p>;
 }
 const isNavItem=(n:ReactNode)=>isValidElement(n) && n.type==='span' && !(n.props as {className?:string}).className && typeof (n.props as {children?:ReactNode}).children==='string';
 const inner=Array.isArray(kids)
   ? kids.map((n,i)=><span key={i} style={{display:'contents'}}>{kids.length>1 && kids.every(isNavItem) ? <a data-link="" href="#" style={{color:'inherit',textDecoration:'none'}}>{(n as ReactElement<{children:string}>).props.children}</a> : inlineDesign(n,scale)}</span>)
   : inlineDesign(kids,scale);
 if((filled && kids) || classes.split(/\s+/).includes('underline')) return link({},inner);
 // Logo placeholders are tagged so an uploaded logo replaces them in place instead of being stacked on top.
 const isLogo=/\bfont-bold\b/.test(classes) && /\btext-slate-500\b/.test(classes);
 return cloneElement(el,{style,className:undefined,...(isLogo?{'data-logo':''}:{}),...(dark?{'data-theme':'dark'}:{})} as object,inner);
}
// Which typography controls make sense for a section's HTML: no heading -> no heading size, no text -> no text controls.
export function sectionTextFeatures(root: HTMLElement) {
 const html=root.innerHTML;
 const heading=html.includes('--section-heading-scale')
   // sections saved before the scale variables: any bold text was treated as a heading
   || (!html.includes('-scale') && Boolean(root.querySelector('h1,h2,h3,strong,[style*="font-weight:700"],[style*="font-weight: 700"]')));
 return {heading, text:Boolean((root.textContent||'').trim())};
}
export function BlockDesign({item, miniature=false}:{item:DesignItem;miniature?:boolean}) {
 return <div style={{fontFamily:'Arial, sans-serif',fontSize:miniature?8:'calc(16px * var(--section-text-scale, 1))',lineHeight:miniature?1.6:'var(--section-line-height, 1.6)',overflowWrap:'anywhere'}}>{inlineDesign(DashboardBlockDesign(item),miniature?1:2)}</div>;
}
