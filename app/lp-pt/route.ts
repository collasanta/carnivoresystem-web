import { ICON_DATA_URI } from "./icon-data";

/*
 * Landing BR dos anúncios do Meta (leodiet.com/lp-pt). Conversão = clique numa loja (evento Lead).
 *
 * Servida como HTML estático puro (route handler prerenderizado no build, cache na edge da Vercel),
 * fora do layout raiz do site: sem React, sem webfont, sem CSS externo. O topo (ícone, título,
 * linha curta e os dois botões) pinta já no primeiro pacote de HTML, e o clique é rastreado por um
 * script inline no <head>, então funciona mesmo antes de qualquer outro JS carregar.
 */
export const dynamic = "force-static";

const META_PIXEL_ID = "1370037514985006"; // dataset "leodiet" (criado 2026-10-20)

// PostHog do Leo (chave pública do projeto): guarda cada visita e cada clique com data, botão e origem do anúncio.
const POSTHOG_KEY = "phc_zjKJutnPszYRBzo7gHxkeskro74gQ5cNC7Bc5f9hvFLk";
const POSTHOG_CAPTURE = "https://us.i.posthog.com/capture/";

// Links de campanha: Meta Ads Brasil (App Analytics › Campaigns `ct`, Play Console › Aquisição `utm_source`)
const APP_STORE = "https://apps.apple.com/app/apple-store/id6808867448?pt=128456926&ct=meta_br&mt=8";
const PLAY_STORE = "https://play.google.com/store/apps/details?id=dev.thirtythreeweb.leo&referrer=utm_source%3Dmeta_br";

const TITLE = "LeoDiet — Dieta carnívora do jeito certo";
const DESCRIPTION = "O app que calcula seu sal e sua água, te lembra todo dia e mostra sua sequência de dias limpos na carnívora.";
const OG_DESCRIPTION = "Sal, água e dias limpos. O app que te mantém na carnívora.";

// Prints em webp 440px de largura (220px CSS @2x), carregados sob demanda abaixo da dobra.
const SECTIONS = [
  {
    head: "O erro nº 1 da primeira semana é o sal",
    body: "Falta sal, vem a dor de cabeça e a câimbra, e a pessoa acha que a dieta não é pra ela. O LeoDiet calcula quanto sal e quanta água você precisa e te lembra ao longo do dia.",
    img: "/lp-pt/today.webp",
    h: 957,
    alt: "Tela Hoje: refeições e sal &amp; água",
  },
  {
    head: "Marcar o dia leva um toque",
    body: "Comeu 100% carnívoro? Um toque. Saiu da dieta? Um toque honesto. Sem contar caloria, sem macro, sem banco de alimentos.",
    img: "/lp-pt/meals.webp",
    h: 957,
    alt: "Registro de refeições com um toque",
  },
  {
    head: "Cada dia limpo fica verde",
    body: "Seu mês vira um calendário de dias limpos e você vê a sequência crescendo. É o que segura nos fins de semana: ninguém quer quebrar a sequência.",
    img: "/lp-pt/month.webp",
    h: 794,
    alt: "Calendário do mês com os dias limpos em verde",
  },
  {
    head: "Como você está se sentindo?",
    body: "Humor, sintomas como câimbra, dor de cabeça e vontade de doce. Com o tempo você enxerga o que mudou quando acertou o sal.",
    img: "/lp-pt/feel.webp",
    h: 957,
    alt: "Tela de humor e sintomas",
  },
];

// Roda no <head>, antes do <body>: stub do pixel (as chamadas entram na fila até o fbevents.js async chegar),
// lp_view no PostHog e um listener de clique no document para os links com data-store.
const HEAD_SCRIPT = `(function(w,d){
var K=${JSON.stringify(POSTHOG_KEY)},H=${JSON.stringify(POSTHOG_CAPTURE)};
!function(f,b,e,v,n,t,s){if(f.fbq)return;n=f.fbq=function(){n.callMethod?n.callMethod.apply(n,arguments):n.queue.push(arguments)};if(!f._fbq)f._fbq=n;n.push=n;n.loaded=!0;n.version='2.0';n.queue=[];t=b.createElement(e);t.async=!0;t.src=v;s=b.getElementsByTagName(e)[0];s.parentNode.insertBefore(t,s)}(w,d,'script','https://connect.facebook.net/en_US/fbevents.js');
fbq('init','${META_PIXEL_ID}');fbq('track','PageView');
w.va=w.va||function(){(w.vaq=w.vaq||[]).push(arguments)};
function uuid(){try{return crypto.randomUUID()}catch(e){return 'v'+Date.now().toString(36)+Math.random().toString(36).slice(2)}}
function vid(){try{var i=localStorage.getItem('lp_vid');if(!i){i=uuid();localStorage.setItem('lp_vid',i)}return i}catch(e){return uuid()}}
function cap(ev,x){var q=new URLSearchParams(location.search),ua=navigator.userAgent,p={},k;
for(k in x)p[k]=x[k];
p.page='lp-pt';p.platform=/iPhone|iPad|iPod/.test(ua)?'ios':/Android/.test(ua)?'android':'desktop';
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
try{w.va('event',{name:'lp_pt_store_click',data:{store:s}})}catch(x){}
try{cap('lp_store_click',{store:s})}catch(x){}
try{w.fbq('track','Lead',{content_name:s})}catch(x){}
setTimeout(function(){busy=0;location.href=href},300)});
})(window,document);`;

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

const BUTTONS = `<div class="btns">
<a class="btn" data-store="app_store" href="${esc(APP_STORE)}">${APPLE_SVG}<span><small>Baixar na</small><b>App Store</b></span></a>
<a class="btn" data-store="google_play" href="${esc(PLAY_STORE)}">${PLAY_SVG}<span><small>Disponível no</small><b>Google Play</b></span></a>
</div>`;

const HTML = `<!doctype html>
<html lang="pt-BR">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${TITLE}</title>
<meta name="description" content="${DESCRIPTION}">
<meta name="robots" content="noindex">
<meta name="theme-color" content="#fcf8f1">
<link rel="canonical" href="https://leodiet.com/lp-pt">
<link rel="icon" href="/icon.svg" type="image/svg+xml">
<link rel="preconnect" href="https://connect.facebook.net">
<meta property="og:title" content="${TITLE}">
<meta property="og:description" content="${OG_DESCRIPTION}">
<meta property="og:url" content="https://leodiet.com/lp-pt">
<meta property="og:locale" content="pt_BR">
<meta property="og:type" content="website">
<meta property="og:image" content="https://leodiet.com/lp-pt/today.webp">
<meta property="og:image:width" content="440">
<meta property="og:image:height" content="957">
<style>${CSS}</style>
<script>${HEAD_SCRIPT}</script>
</head>
<body>
<div class="w">
<header class="hero">
<img class="icon" src="${ICON_DATA_URI}" alt="LeoDiet" width="84" height="84">
<div class="kick">LeoDiet · Dieta carnívora</div>
<h1>Comece a carnívora <span>do jeito certo</span></h1>
<p class="lead">O app que calcula seu sal e sua água, te lembra todo dia e mostra sua sequência de dias limpos. Sem contar caloria.</p>
${BUTTONS}
<p class="note">iPhone e Android · Em português</p>
</header>
<section class="secs">
${SECTIONS.map(
  (s, i) => `<div class="sec${i % 2 ? " r" : ""}">
<img class="shot" src="${s.img}" alt="${s.alt}" width="440" height="${s.h}" loading="lazy" decoding="async">
<div><h2>${s.head}</h2><p>${s.body}</p></div>
</div>`,
).join("\n")}
</section>
<div class="cta">
<h2>Desta vez, passa da terceira semana</h2>
<p>Baixe o LeoDiet e comece hoje.</p>
${BUTTONS}
</div>
<p class="disc">O LeoDiet é um diário de hábitos, não orientação médica. Se você tem pressão alta, problema nos rins ou no coração, fale com seu médico antes de aumentar o sal.</p>
<footer>
<a href="/privacy">Privacidade</a>
<a href="/terms">Termos</a>
<a href="/support">Suporte</a>
<a href="mailto:leo@leodiet.com">leo@leodiet.com</a>
<span>© 2026 33WEB SOFTWARE LTDA</span>
</footer>
</div>
<noscript><img height="1" width="1" style="display:none" alt="" src="https://www.facebook.com/tr?id=${META_PIXEL_ID}&amp;ev=PageView&amp;noscript=1"></noscript>
<script defer src="/_vercel/insights/script.js"></script>
</body>
</html>`;

export function GET() {
  return new Response(HTML, {
    headers: { "content-type": "text/html; charset=utf-8" },
  });
}
