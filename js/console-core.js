/* Helper bersama panel admin dan dashboard member */
const $=id=>document.getElementById(id),rp=n=>"Rp"+(Number(n)||0).toLocaleString("id-ID");
const el=(t,c,x)=>{const e=document.createElement(t);if(c)e.className=c;if(x!=null)e.textContent=x;return e};
const fdate=s=>String(s||"").replace("T"," ").slice(0,16);
const ST={pending:"Menunggu",done:"Selesai",none:"Hangus"};
const SITE_URL="https://alvelionsmc.vercel.app/";
const isPerm=n=>{n=String(n||"").toLowerCase();return !n.includes("/monthly")&&n.includes("rank")};
const catOf=n=>{n=String(n||"").toLowerCase();return n.includes("/monthly")?"bulan":n.includes("rank")?"perm":n.includes("money")?"money":"lain"};
const isRev=g=>g.status==="done"||g.status==="none";
const permItems=g=>g.items.filter(i=>isPerm(i.name));
const RANK_NOTE="Pesanan berstatus hangus membuat rank permanen ikut hangus. Pembeli dihubungi lewat WhatsApp.";
const bdg=s=>el("span","bdg b-"+(ST[s]?s:"none"),ST[s]||s);
const wa=p=>{const n=String(p||"").replace(/\D/g,"");return n.startsWith("0")?"62"+n.slice(1):n};
const sumT=a=>a.reduce((s,g)=>s+g.total,0);
function setT(t,s){const r=document.documentElement,b=$("themeBtn");r.setAttribute("data-theme",t);b.innerHTML='<i class="fa-solid fa-'+(t==="dark"?"sun":"moon")+'"></i>';b.setAttribute("aria-label",t==="dark"?"Ganti ke tema siang":"Ganti ke tema malam");if(s)try{localStorage.setItem("alvelions-theme-override-v5",JSON.stringify({theme:t,until:Date.now()+12*36e5}))}catch(e){}document.dispatchEvent(new Event("themechange"))}
function toast(m,bad){let t=$("toast");if(!t){t=el("div","toast");t.id="toast";t.setAttribute("role","status");document.body.appendChild(t)}t.textContent=m;t.style.background=bad?"#f87171":"";t.classList.add("show");clearTimeout(t._h);t._h=setTimeout(()=>t.classList.remove("show"),2800)}
function csv(name,rows,sep){sep=sep||(/^id/i.test(navigator.language)?";":",");const q=v=>{if(v==null)v="";else if(typeof v==="object"&&"t"in v)v='="'+String(v.t).replace(/"/g,'""')+'"';else if(typeof v==="string"&&/^[=+\-@\t\r]/.test(v))v="'"+v;v=String(v);return v.includes('"')||v.includes(sep)||/[\r\n]/.test(v)?'"'+v.replace(/"/g,'""')+'"':v},a=el("a");a.href=URL.createObjectURL(new Blob(["\ufeff"+rows.map(r=>r.map(q).join(sep)).join("\r\n")],{type:"text/csv;charset=utf-8"}));a.download=name;a.click();setTimeout(()=>URL.revokeObjectURL(a.href),1500)}
function kpi(box,list){box.textContent="";list.forEach(([i,t,v,k])=>{const e=el("div","kpi "+(k||"")),s=el("small");s.append(el("i","fa-solid "+i),t);e.append(s,el("b","",v));box.appendChild(e)})}
function group(rows,pn){const m=new Map();
 rows.forEach(o=>{const k=o.id_transaksi||"ID-"+o.id;let g=m.get(k);
  if(!g){g={inv:k,rows:[],items:[],total:0,created:o.created_at,user:o.username,gt:o.gamertag,phone:o.phone,pay:o.payment_method,ref:o.id_transaksi_payment,qris:o.qris_type};m.set(k,g)}
  g.rows.push(o);g.total+=Number(o.total_price)||0;g.items.push({name:pn[String(o.product_id)]||"Produk dihapus",qty:Number(o.quantity)||1,sub:Number(o.total_price)||0})});
 return[...m.values()].map(g=>{const s=[...new Set(g.rows.map(r=>r.status))];g.status=s.length===1?s[0]:(s.includes("pending")?"pending":s[0]);return g})}
const CH={},CA={};
function drawChart(id,type,labels,data,label){CA[id]=[type,labels,data,label];const c=$(id);if(!c||typeof Chart==="undefined")return;if(CH[id])CH[id].destroy();
 const cs=getComputedStyle(document.documentElement),g=cs.getPropertyValue("--gold").trim(),m=cs.getPropertyValue("--mute").trim(),ln=cs.getPropertyValue("--line").trim();
 CH[id]=new Chart(c,{type,data:{labels,datasets:[{label,data,borderColor:g,backgroundColor:type==="bar"?g:"rgba(255,216,77,.16)",fill:type==="line",tension:.35,borderRadius:6}]},
  options:{responsive:true,maintainAspectRatio:false,plugins:{legend:{display:false},tooltip:{callbacks:{label:x=>" "+rp(x.parsed.y)}}},scales:{x:{ticks:{color:m},grid:{display:false}},y:{beginAtZero:true,ticks:{color:m,callback:v=>v>=1e6?v/1e6+"jt":v>=1e3?v/1e3+"rb":v},grid:{color:ln}}}}})}
document.addEventListener("themechange",()=>Object.keys(CA).forEach(k=>drawChart(k,...CA[k])));
function initNav(show){const links=[...document.querySelectorAll(".side a[data-p]")],pages=[...document.querySelectorAll(".page")],close=()=>{$("side").classList.remove("open");$("scrim").classList.remove("on")};
 function go(){const p=location.hash.slice(1),l=links.find(a=>a.dataset.p===p)||links[0];
  pages.forEach(x=>x.classList.toggle("on",x.id===l.dataset.p));links.forEach(a=>a.classList.toggle("on",a===l));
  $("ttl").textContent=l.dataset.t;$("sub").textContent=l.dataset.s;document.title=l.dataset.t+" – ALVELIONS MC";close();
  Object.values(CH).forEach(c=>c.resize());if(show)show(l.dataset.p)}
 links.forEach(a=>a.onclick=()=>{location.hash=a.dataset.p});addEventListener("hashchange",go);go();
 $("menuB").onclick=()=>{$("side").classList.add("open");$("scrim").classList.add("on")};$("scrim").onclick=close}
setT(document.documentElement.getAttribute("data-theme"),false);
$("themeBtn").onclick=()=>setT(document.documentElement.getAttribute("data-theme")==="dark"?"light":"dark",true);
