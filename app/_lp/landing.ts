import { ICON_DATA_URI } from "./icon-data";

/*
 * Base compartilhada das landings de anúncio do Meta (leodiet.com/lp-pt, /lp-au, ...). Conversão = clique numa loja (evento Lead).
 *
 * Cada landing é um route handler estático (`dynamic = "force-static"`, prerenderizado no build, cache na edge da Vercel)
 * que devolve o HTML gerado aqui, fora do layout raiz do site: sem React, sem webfont, sem CSS externo. O topo (ícone,
 * título, linha curta e os dois botões) pinta já no primeiro pacote de HTML, e o clique é rastreado por um script inline
 * no <head>, então funciona mesmo antes de qualquer outro JS carregar.
 */

const META_PIXEL_ID = "1370037514985006"; // dataset "leodiet" (criado 2026-10-20)

// PostHog do Leo (chave pública do projeto): guarda cada visita e cada clique com data, botão e origem do anúncio.
const POSTHOG_KEY = "phc_zjKJutnPszYRBzo7gHxkeskro74gQ5cNC7Bc5f9hvFLk";
const POSTHOG_CAPTURE = "https://us.i.posthog.com/capture/";

export type LandingSection = {
  head: string;
  body: string;
  img: string;
  /** altura do webp (largura sempre 440px = 220px CSS @2x) */
  h: number;
  alt: string;
};

export type LandingConfig = {
  /** segmento da URL, ex. "lp-pt"; vira a propriedade `page` no PostHog e o canonical */
  slug: string;
  lang: string;
  ogLocale: string;
  title: string;
  description: string;
  ogDescription: string;
  /** links de campanha (App Analytics › Campaigns `ct`, Play Console › Aquisição `utm_source`) */
  appStore: string;
  playStore: string;
  /** texto pequeno + nome da loja em cada botão */
  appStoreLabel: [string, string];
  playStoreLabel: [string, string];
  kick: string;
  /** HTML do <h1> (o trecho em destaque vai num <span>) */
  h1: string;
  lead: string;
  note: string;
  sections: LandingSection[];
  ctaHead: string;
  ctaBody: string;
  disclaimer: string;
  footer: { privacy: string; terms: string; support: string };
};

// Roda no <head>, antes do <body>: stub do pixel (as chamadas entram na fila até o fbevents.js async chegar),
// lp_view no PostHog e um listener de clique no document para os links com data-store.
function headScript(page: string) {
  const vaEvent = page.replace(/-/g, "_") + "_store_click";
  return `(function(w,d){
var K=${JSON.stringify(POSTHOG_KEY)},H=${JSON.stringify(POSTHOG_CAPTURE)};
!function(f,b,e,v,n,t,s){if(f.fbq)return;n=f.fbq=function(){n.callMethod?n.callMethod.apply(n,arguments):n.queue.push(arguments)};if(!f._fbq)f._fbq=n;n.push=n;n.loaded=!0;n.version='2.0';n.queue=[];t=b.createElement(e);t.async=!0;t.src=v;s=b.getElementsByTagName(e)[0];s.parentNode.insertBefore(t,s)}(w,d,'script','https://connect.facebook.net/en_US/fbevents.js');
fbq('init','${META_PIXEL_ID}');fbq('track','PageView');
w.va=w.va||function(){(w.vaq=w.vaq||[]).push(arguments)};
function uuid(){try{return crypto.randomUUID()}catch(e){return 'v'+Date.now().toString(36)+Math.random().toString(36).slice(2)}}
function vid(){try{var i=localStorage.getItem('lp_vid');if(!i){i=uuid();localStorage.setItem('lp_vid',i)}return i}catch(e){return uuid()}}
function cap(ev,x){var q=new URLSearchParams(location.search),ua=navigator.userAgent,p={},k;
for(k in x)p[k]=x[k];
p.page='${page}';p.platform=/iPhone|iPad|iPod/.test(ua)?'ios':/Android/.test(ua)?'android':'desktop';
['utm_source','utm_campaign','utm_content'].forEach(function(n){var v=q.get(n);if(v!==null)p[n]=v});
p.from_meta_ad=q.has('fbclid');p.$current_url=location.href;p.$process_person_profile=false;
var b=JSON.stringify({api_key:K,event:ev,distinct_id:vid(),properties:p});
try{if(!navigator.sendBeacon||!navigator.sendBeacon(H,b))throw 0}catch(e){try{fetch(H,{method:'POST',body:b,keepalive:true}).catch(function(){})}catch(e2){}}}
try{cap('lp_view',{})}catch(e){}
var busy=0;
w.addEventListener('pageshow',function(){busy=0});
d.addEventListener('click',function(e){
var t=e.target,a=t&&t.closest?t.closest('a[data-store]'):null;
if(!a||e.button||e.metaKey||e.ctrlKey||e.shiftKey||e.altKey)return;
e.preventDefault();if(busy)return;busy=1;
var s=a.getAttribute('data-store'),href=a.href;
try{w.va('event',{name:'${vaEvent}',data:{store:s}})}catch(x){}
try{cap('lp_store_click',{store:s})}catch(x){}
try{w.fbq('track','Lead',{content_name:s})}catch(x){}
setTimeout(function(){busy=0;location.href=href},300)});
})(window,document);`;
}

const CSS = `*,*::before,*::after{box-sizing:border-box}
html{-webkit-text-size-adjust:100%}
body{margin:0;min-height:100svh;background:#fcf8f1;color:#211a12;font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,"Helvetica Neue",Arial,sans-serif;-webkit-font-smoothing:antialiased;-moz-osx-font-smoothing:grayscale}
h1,h2,p{margin:0}
img{display:block}
a{color:inherit}
.w{width:100%;max-width:640px;margin:0 auto;padding:32px 20px 40px}
.hero{text-align:center}
.icon{margin:0 auto;width:84px;height:84px;border-radius:22px;box-shadow:0 8px 24px rgba(33,26,18,.12)}
.kick{margin-top:16px;font-size:11px;font-weight:600;letter-spacing:.16em;text-transform:uppercase;color:#93887a}
h1{margin-top:8px;font-size:clamp(32px,9vw,44px);line-height:1.04;font-weight:800;letter-spacing:-.03em;text-wrap:balance}
h1 span{color:#7a5a3e}
.lead{margin-top:12px;font-size:16px;line-height:1.625;color:#93887a;text-wrap:balance}
.btns{margin-top:24px;display:flex;flex-wrap:wrap;align-items:center;justify-content:center;gap:12px}
.btn{display:inline-flex;min-width:220px;min-height:56px;align-items:center;justify-content:center;gap:12px;border-radius:16px;background:#251e17;padding:12px 20px;color:#fff;text-decoration:none;box-shadow:0 10px 30px rgba(37,30,23,.25);-webkit-tap-highlight-color:transparent;touch-action:manipulation}
.btn:hover,.btn:active{background:#3a2e21}
.btn svg{flex:none}
.btn b,.btn small{display:block;text-align:left;line-height:1.25}
.btn small{font-size:11px;opacity:.8}
.btn b{font-size:18px;font-weight:700}
.note{margin-top:12px;font-size:12px;color:#c4bbac}
.secs{margin-top:48px;display:flex;flex-direction:column;gap:40px}
.sec{display:flex;flex-direction:column;align-items:center;gap:20px;text-align:center}
.shot{flex:none;width:220px;height:auto;border-radius:26px;border:1px solid #f0e9dd;background:#f7f1e6;box-shadow:0 12px 32px rgba(33,26,18,.08)}
h2{font-size:21px;font-weight:800;letter-spacing:-.02em;text-wrap:balance}
.sec p,.cta p{margin-top:8px;font-size:15px;line-height:1.625;color:#93887a}
.cta{margin-top:56px;border:1px solid #f0e9dd;border-radius:28px;background:#fff;padding:32px 24px;text-align:center;box-shadow:0 12px 32px rgba(33,26,18,.06)}
.cta h2{font-size:24px}
.cta .btns{margin-top:20px}
.disc{margin-top:32px;text-align:center;font-size:12px;line-height:1.625;color:#c4bbac}
footer{margin-top:32px;display:flex;flex-wrap:wrap;align-items:center;justify-content:center;gap:4px 16px;font-size:12px;color:#93887a}
footer a{text-decoration:none}
@media (min-width:640px){.sec{flex-direction:row;text-align:left}.sec.r{flex-direction:row-reverse}}`;

const APPLE_SVG = `<svg width="26" height="26" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M16.4 12.6c0-2.6 2.1-3.8 2.2-3.9-1.2-1.8-3.1-2-3.7-2-1.6-.2-3.1.9-3.9.9-.8 0-2-.9-3.4-.9-1.7 0-3.3 1-4.2 2.6-1.8 3.1-.5 7.8 1.3 10.3.9 1.2 1.9 2.6 3.2 2.6 1.3-.1 1.8-.8 3.4-.8 1.6 0 2 .8 3.4.8 1.4 0 2.3-1.3 3.1-2.5 1-1.4 1.4-2.8 1.4-2.9 0 0-2.8-1.1-2.8-4.2zM14 4.9c.7-.9 1.2-2.1 1.1-3.3-1 0-2.3.7-3 1.6-.7.8-1.2 2-1.1 3.2 1.1.1 2.3-.6 3-1.5z"/></svg>`;
const PLAY_SVG = `<svg width="24" height="24" viewBox="0 0 24 24" aria-hidden="true"><path d="M4 2.6 13.4 12 4 21.4c-.3-.2-.5-.6-.5-1V3.6c0-.4.2-.8.5-1z" fill="#00a0ff"/><path d="M16.6 8.8 13.4 12 4 2.6c.3-.2.8-.2 1.2 0l11.4 6.2z" fill="#00dc6e"/><path d="M16.6 15.2 5.2 21.4c-.4.2-.9.2-1.2 0l9.4-9.4 3.2 3.2z" fill="#ff3a44"/><path d="m20.2 10.8-3.6-2L13.4 12l3.2 3.2 3.6-2c.9-.5.9-1.9 0-2.4z" fill="#ffd200"/></svg>`;

const esc = (s: string) => s.replace(/&/g, "&amp;");

export function renderLanding(c: LandingConfig): string {
  const url = `https://leodiet.com/${c.slug}`;
  const og = c.sections[0];
  const buttons = `<div class="btns">
<a class="btn" data-store="app_store" href="${esc(c.appStore)}">${APPLE_SVG}<span><small>${c.appStoreLabel[0]}</small><b>${c.appStoreLabel[1]}</b></span></a>
<a class="btn" data-store="google_play" href="${esc(c.playStore)}">${PLAY_SVG}<span><small>${c.playStoreLabel[0]}</small><b>${c.playStoreLabel[1]}</b></span></a>
</div>`;

  return `<!doctype html>
<html lang="${c.lang}">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${c.title}</title>
<meta name="description" content="${c.description}">
<meta name="robots" content="noindex">
<meta name="theme-color" content="#fcf8f1">
<link rel="canonical" href="${url}">
<link rel="icon" href="/icon.svg" type="image/svg+xml">
<link rel="preconnect" href="https://connect.facebook.net">
<meta property="og:title" content="${c.title}">
<meta property="og:description" content="${c.ogDescription}">
<meta property="og:url" content="${url}">
<meta property="og:locale" content="${c.ogLocale}">
<meta property="og:type" content="website">
<meta property="og:image" content="https://leodiet.com${og.img}">
<meta property="og:image:width" content="440">
<meta property="og:image:height" content="${og.h}">
<style>${CSS}</style>
<script>${headScript(c.slug)}</script>
</head>
<body>
<div class="w">
<header class="hero">
<img class="icon" src="${ICON_DATA_URI}" alt="LeoDiet" width="84" height="84">
<div class="kick">${c.kick}</div>
<h1>${c.h1}</h1>
<p class="lead">${c.lead}</p>
${buttons}
<p class="note">${c.note}</p>
</header>
<section class="secs">
${c.sections
  .map(
    (s, i) => `<div class="sec${i % 2 ? " r" : ""}">
<img class="shot" src="${s.img}" alt="${s.alt}" width="440" height="${s.h}" loading="lazy" decoding="async">
<div><h2>${s.head}</h2><p>${s.body}</p></div>
</div>`,
  )
  .join("\n")}
</section>
<div class="cta">
<h2>${c.ctaHead}</h2>
<p>${c.ctaBody}</p>
${buttons}
</div>
<p class="disc">${c.disclaimer}</p>
<footer>
<a href="/privacy">${c.footer.privacy}</a>
<a href="/terms">${c.footer.terms}</a>
<a href="/support">${c.footer.support}</a>
<a href="mailto:leo@leodiet.com">leo@leodiet.com</a>
<span>© 2026 33WEB SOFTWARE LTDA</span>
</footer>
</div>
<noscript><img height="1" width="1" style="display:none" alt="" src="https://www.facebook.com/tr?id=${META_PIXEL_ID}&amp;ev=PageView&amp;noscript=1"></noscript>
<script defer src="/_vercel/insights/script.js"></script>
</body>
</html>`;
}

export function landingResponse(html: string) {
  return new Response(html, {
    headers: { "content-type": "text/html; charset=utf-8" },
  });
}
