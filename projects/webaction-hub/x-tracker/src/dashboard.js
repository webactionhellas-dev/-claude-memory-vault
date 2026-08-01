// Minimal zero-dependency dashboard: serves the alert log at http://localhost:PORT
import { createServer } from "node:http";
import { readAlerts, log } from "./lib.js";

const PAGE = `<!doctype html>
<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>X Tracker</title>
<style>
  :root { color-scheme: dark; }
  * { box-sizing: border-box; }
  body { margin:0; font:15px/1.5 ui-monospace,SFMono-Regular,Menlo,monospace; background:#0b0e14; color:#d7dce5; }
  header { padding:16px 22px; border-bottom:1px solid #1c2230; position:sticky; top:0; background:#0b0e14cc; backdrop-filter:blur(8px); z-index:5; }
  .top { display:flex; align-items:center; gap:12px; }
  .dot { width:9px; height:9px; border-radius:50%; background:#37d67a; box-shadow:0 0 10px #37d67a; }
  header h1 { font-size:16px; margin:0; letter-spacing:1px; }
  .muted { color:#6b7385; font-size:12px; }
  .filters { display:flex; gap:8px; flex-wrap:wrap; margin-top:12px; align-items:center; }
  .filters button { font:inherit; font-size:12px; background:#10141d; color:#aab2c2; border:1px solid #1c2230; border-radius:20px; padding:4px 12px; cursor:pointer; }
  .filters button.on { background:#1b2a44; color:#cfe4ff; border-color:#2a4570; }
  .filters label { font-size:12px; color:#8a93a6; display:flex; align-items:center; gap:5px; cursor:pointer; }
  main { padding:14px 22px 60px; max-width:920px; }
  .card { border:1px solid #1c2230; border-radius:10px; padding:13px 16px; margin:10px 0; background:#10141d; }
  .card.convergence { border-color:#7a3a10; background:#181008; box-shadow:0 0 0 1px #7a3a1055; }
  .row { display:flex; justify-content:space-between; gap:12px; align-items:center; }
  .tags { display:flex; gap:6px; align-items:center; flex-wrap:wrap; }
  .tag { font-size:10px; text-transform:uppercase; letter-spacing:.6px; padding:2px 8px; border-radius:20px; }
  .tag.x { background:#15202b; color:#4aa8ff; } .tag.wallet { background:#1a1330; color:#b18cff; }
  .tag.convergence { background:#2a1605; color:#ff9d3c; } .tag.system { background:#131a16; color:#5fae7f; }
  .band { font-size:10px; font-weight:700; padding:2px 8px; border-radius:6px; text-transform:uppercase; letter-spacing:.5px; }
  .band.Safe{background:#0f2a17;color:#43d17a} .band.Caution{background:#2c2708;color:#e3c53a}
  .band.High{background:#331a06;color:#ff9d3c} .band.Critical{background:#320f12;color:#ff5a6a} .band.Unknown{background:#20242e;color:#8a93a6}
  .title { font-weight:600; color:#fff; margin:6px 0 2px; }
  .body { color:#aab2c2; white-space:pre-wrap; word-break:break-word; font-size:13.5px; }
  .market { margin:7px 0 2px; font-size:12.5px; color:#9fb0c9; }
  .reasons { font-size:12px; color:#c98; margin-top:3px; }
  .mint { font-size:11.5px; color:#6b7385; word-break:break-all; margin-top:6px; }
  .links a { color:#5fd1ff; text-decoration:none; margin-right:14px; font-size:13px; }
  .links a:hover { text-decoration:underline; }
  .empty { color:#6b7385; padding:40px 0; text-align:center; }
  time { color:#6b7385; font-size:12px; white-space:nowrap; }
</style></head>
<body>
<header>
  <div class="top"><span class="dot"></span><h1>X TRACKER</h1><span class="muted" id="status">loading…</span></div>
  <div class="filters">
    <button data-src="all" class="on">All</button>
    <button data-src="wallet">Wallet</button>
    <button data-src="convergence">Convergence</button>
    <button data-src="x">X</button>
    <label><input type="checkbox" id="hideRisk"> hide High/Critical/Unknown risk</label>
  </div>
</header>
<main id="list"><div class="empty">Waiting for the first alert…</div></main>
<script>
let SRC='all';
document.querySelectorAll('.filters button').forEach(b=>b.onclick=()=>{SRC=b.dataset.src;document.querySelectorAll('.filters button').forEach(x=>x.classList.toggle('on',x===b));render();});
document.getElementById('hideRisk').onchange=render;
let DATA=[];
function esc(s){return String(s==null?'':s).replace(/[&<>]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;'}[c]));}
function riskEmoji(b){return {Safe:'✅',Caution:'⚠️',High:'🛑',Critical:'☠️',Unknown:'❓'}[b]||'';}
function fmt(n){if(n==null)return'?';if(n>=1e6)return'$'+(n/1e6).toFixed(1)+'M';if(n>=1e3)return'$'+(n/1e3).toFixed(1)+'k';if(n>=1)return'$'+n.toFixed(2);return'$'+Number(n).toPrecision(2);}
function age(m){if(m==null)return'?';if(m<60)return m+'m';if(m<1440)return(m/60).toFixed(1)+'h';return(m/1440).toFixed(1)+'d';}
function render(){
  const el=document.getElementById('list');
  let a=DATA;
  if(SRC!=='all') a=a.filter(x=>x.source===SRC);
  if(document.getElementById('hideRisk').checked) a=a.filter(x=>!x.risk||x.risk.band==='Safe'||x.risk.band==='Caution');
  if(!a.length){el.innerHTML='<div class="empty">No alerts match this filter yet.</div>';return;}
  el.innerHTML=a.map(x=>{
    const conv=x.source==='convergence';
    const links=x.links?Object.entries(x.links).map(([k,v])=>'<a href="'+v+'" target="_blank">'+k+'</a>').join(''):'';
    const src=x.url?'<a href="'+x.url+'" target="_blank">source</a>':'';
    const band=x.risk?'<span class="band '+esc(x.risk.band)+'">'+riskEmoji(x.risk.band)+' '+esc(x.risk.band)+'</span>':'';
    let market='';
    if(x.market){const m=x.market;market='<div class="market">'+(m.symbol?'<b>'+esc(m.symbol)+'</b>  ':'')+'px '+fmt(m.priceUsd)+' · liq '+fmt(m.liquidityUsd)+' · age '+age(m.ageMinutes)+(m.dex?' · '+esc(m.dex):'')+'</div>';}
    const reasons=(x.risk&&x.risk.reasons&&x.risk.reasons.length)?'<div class="reasons">'+esc(x.risk.reasons.join(' · '))+'</div>':'';
    return '<div class="card'+(conv?' convergence':'')+'">'
      +'<div class="row"><span class="tags"><span class="tag '+esc(x.source||'')+'">'+esc(x.source||'')+'</span>'+band+'</span>'
      +'<time>'+new Date(x.time).toLocaleTimeString()+'</time></div>'
      +'<div class="title">'+(conv?'🔥 ':'')+esc(x.title||'')+'</div>'
      +'<div class="body">'+esc(x.body||'')+'</div>'
      +market+reasons
      +(x.mint?'<div class="mint">'+esc(x.mint)+'</div>':'')
      +'<div class="links">'+links+' '+src+'</div></div>';
  }).join('');
}
async function refresh(){
  try{
    const r=await fetch('/api/alerts');DATA=await r.json();
    document.getElementById('status').textContent=DATA.length+' alerts · read-only radar · you place the trades';
    render();
  }catch(e){document.getElementById('status').textContent='dashboard offline';}
}
refresh();setInterval(refresh,5000);
</script>
</body></html>`;

export function startDashboard(port) {
  const server = createServer((req, res) => {
    if (req.url.startsWith("/api/alerts")) {
      res.writeHead(200, { "Content-Type": "application/json" });
      res.end(JSON.stringify(readAlerts()));
      return;
    }
    res.writeHead(200, { "Content-Type": "text/html; charset=utf-8" });
    res.end(PAGE);
  });
  server.on("error", (e) => log("Dashboard error:", e.message));
  server.listen(port, () => log(`Dashboard: http://localhost:${port}`));
  return server;
}
