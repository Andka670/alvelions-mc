/* Fitur tambahan panel admin: insight, aksi massal, detail pelanggan, pencarian global, sistem */
(()=>{
const sb=supabaseClient,DAY=864e5,jk=d=>new Date(d).toLocaleDateString("sv-SE",{timeZone:"Asia/Jakarta"});
let D={G:[],O:[],U:[],P:[],N:[]},REF={},prev=null,me=null;
sb.auth.getSession().then(({data:{session}})=>{me=session&&session.user.id});
const T=g=>Date.parse(g.created)||0,pct=(a,b)=>b?Math.round((a-b)/b*100):(a?100:0);
const dl=(a,b)=>{const p=pct(a,b),s=el("span","dl "+(p>=0?"up":"dn"),(p>=0?"▲ ":"▼ ")+Math.abs(p)+"%");s.title="Dibanding 7 hari sebelumnya";return s};
window.admFlag=g=>{const f=[];if(g.ref&&REF[g.ref]>1)f.push("Ref ganda");if(g.status==="pending"&&Date.now()-T(g)>36e5)f.push("Menunggu >1 jam");return f};
const list=(box,rows,none)=>{box.textContent="";if(!rows.length){box.append(el("div","empty-s",none));return}
 rows.forEach(([a,b,c,fn])=>{const r=el("div","li"+(fn?" click":"")),l=el("div");l.append(el("b","",a),el("span","mut",b));r.append(l);if(c)r.append(el("b","",c));if(fn)r.onclick=fn;box.append(r)})};
function beep(){if(!$("snd")||!$("snd").checked)return;try{const c=new AudioContext(),o=c.createOscillator(),g=c.createGain();o.frequency.value=880;g.gain.value=.08;o.connect(g);g.connect(c.destination);o.start();o.stop(c.currentTime+.18)}catch(e){}}
function insights(){const {G}=D,now=Date.now(),done=G.filter(g=>g.status==="done"),pend=G.filter(g=>g.status==="pending"),
 w=(a,b)=>done.filter(g=>T(g)>=now-b*DAY&&T(g)<now-a*DAY),c=w(0,7),p=w(7,14),aov=a=>a.length?sumT(a)/a.length:0,none=G.filter(g=>g.status==="none").length;
 kpi($("insK"),[["fa-sack-dollar","Pendapatan 7 hari",rp(sumT(c)),""],["fa-circle-check","Transaksi selesai 7 hari",c.length,""],["fa-scale-balanced","Rata-rata per transaksi",rp(aov(c)),""],["fa-ban","Tingkat pembatalan",G.length?Math.round(none/G.length*100)+"%":"0%",""]]);
 const k=$("insK").children;k[0].querySelector("b").append(dl(sumT(c),sumT(p)));k[1].querySelector("b").append(dl(c.length,p.length));k[2].querySelector("b").append(dl(aov(c),aov(p)));
 const old=pend.filter(g=>now-T(g)>36e5).length,dup=new Set(G.filter(g=>g.ref&&REF[g.ref]>1).map(g=>g.ref)).size,gone=G.filter(g=>g.items.some(i=>i.name==="Produk dihapus")).length,go=()=>{location.hash="orders"},al=[];
 if(old)al.push(["Pesanan tertunda",old+" pesanan menunggu lebih dari 1 jam","",go]);
 if(dup)al.push(["ID pembayaran ganda",dup+" ID dipakai di lebih dari satu invoice","",go]);
 if(gone)al.push(["Produk terhapus",gone+" pesanan memuat produk yang sudah dihapus","",go]);
 list($("insA"),al,"Semua aman. Tidak ada yang perlu dicek.");
 const by={};w(0,30).forEach(g=>g.items.forEach(i=>{const x=by[i.name]||(by[i.name]={q:0,t:0});x.q+=i.qty;x.t+=i.sub}));
 list($("insP"),Object.keys(by).sort((a,b)=>by[b].t-by[a].t).slice(0,5).map(n=>[n,by[n].q+" terjual",rp(by[n].t)]),"Belum ada penjualan.");
 const bu={};done.forEach(g=>{const n=g.user||"-",x=bu[n]||(bu[n]={n:0,t:0});x.n++;x.t+=g.total});
 list($("insB"),Object.keys(bu).sort((a,b)=>bu[b].t-bu[a].t).slice(0,5).map(n=>[n,bu[n].n+" transaksi",rp(bu[n].t)]),"Belum ada pembeli.");
 if(prev!==null&&pend.length>prev){toast("Pesanan baru masuk ("+pend.length+" menunggu)");beep()}prev=pend.length}
document.addEventListener("admin:data",e=>{D=e.detail;REF={};D.G.forEach(g=>{if(g.ref)REF[g.ref]=(REF[g.ref]||0)+1});insights();if(location.hash==="#system")sys()});
/* aksi massal */
const bk=()=>{$("bulk").hidden=!SEL.size;$("bN").textContent=SEL.size+" pesanan dipilih"};window.admBulkUI=bk;
async function bulk(s){const gs=D.G.filter(g=>SEL.has(g.inv));if(!gs.length)return;if(!confirm("Ubah "+gs.length+" pesanan menjadi "+ST[s]+"?"))return;
 const {error}=await sb.from("orders").update({status:s}).in("id",gs.flatMap(g=>g.rows.map(r=>r.id)));if(error)return toast("Gagal: "+error.message,1);SEL.clear();bk();$("oAll").checked=false;toast(gs.length+" pesanan diperbarui");admReload()}
$("bDone").onclick=()=>bulk("done");$("bNone").onclick=()=>bulk("none");
$("bClr").onclick=()=>{SEL.clear();document.querySelectorAll("#ordB input").forEach(c=>c.checked=false);$("oAll").checked=false;bk()};
$("oAll").onchange=e=>document.querySelectorAll("#ordB input[type=checkbox]").forEach(c=>{c.checked=e.target.checked;c.onchange()});
/* detail pelanggan */
const du=el("dialog","wide");document.body.append(du);
window.admUser=u=>{const mine=D.G.filter(g=>g.user===u.username),done=mine.filter(g=>g.status==="done"),last=mine[0];du.textContent="";
 du.append(el("h3","",u.username||"-"));const kv=(k,v)=>{const r=el("div","kv");r.append(el("span","",k),el("b","",v));du.append(r)};
 kv("Role",u.role||"user");kv("Bergabung",u.created_at?fdate(u.created_at).slice(0,10):"-");kv("Total pesanan",mine.length);kv("Total belanja (selesai)",rp(sumT(done)));kv("Pesanan terakhir",last?fdate(last.created):"-");kv("Gamertag",last&&last.gt||"-");kv("Nomor HP",last&&last.phone||"-");
 mine.slice(0,5).forEach(g=>{const r=el("div","li"),l=el("div");l.append(el("span","mono",g.inv.replace("INV-","#")),el("span","mut",fdate(g.created)+" · "+rp(g.total)));r.append(l,bdg(g.status));du.append(r)});
 const a=el("div","act");
 if(last&&last.phone){const w=el("a","btn btn-gold sm","WhatsApp");w.href="https://wa.me/"+wa(last.phone);w.target="_blank";w.rel="noopener";a.append(w)}
 const adm=u.role==="admin",r=el("button","btn sm dng",adm?"Cabut akses admin":"Jadikan admin");r.disabled=u.id===me;if(r.disabled)r.title="Tidak bisa mengubah role akun sendiri";
 r.onclick=async()=>{if(!confirm((adm?"Cabut akses admin dari ":"Beri akses admin penuh ke ")+u.username+"?"))return;const {error}=await sb.from("users_profile").update({role:adm?"user":"admin"}).eq("id",u.id);
  if(error)return toast("Gagal: "+error.message+". Periksa RLS users_profile.",1);du.close();toast("Role diperbarui");admReload()};
 const x=el("button","btn sm","Tutup");x.onclick=()=>du.close();a.append(r,x);du.append(a);du.showModal()};
/* pencarian global */
const pal=el("dialog","pal"),pi=el("input","inp"),pl=el("div");pi.placeholder="Cari invoice, pengguna, atau produk…";pi.setAttribute("aria-label","Pencarian global");const pt=el("div","pal-top"),px=el("button","pal-x");px.type="button";px.setAttribute("aria-label","Tutup pencarian");px.title="Tutup";px.append(el("i","fa-solid fa-xmark"));px.onclick=()=>pal.close();pt.append(pi,px);pal.append(pt,pl);document.body.append(pal);
const go=(p,i,v)=>{location.hash=p;if(i==="oq")$("os").value="all";const x=$(i);x.value=v;x.dispatchEvent(new Event("input"))};
pi.oninput=()=>{const q=pi.value.trim().toLowerCase(),h=[];pl.textContent="";if(!q)return;
 D.G.forEach(g=>[g.inv,g.user,g.gt,g.ref].join(" ").toLowerCase().includes(q)&&h.push(["fa-receipt","Pesanan "+g.inv.replace("INV-","#"),(g.user||"-")+" · "+rp(g.total),()=>go("orders","oq",g.inv)]));
 D.U.forEach(u=>(u.username||"").toLowerCase().includes(q)&&h.push(["fa-user",u.username,"Pengguna",()=>go("users","uq",u.username)]));
 D.P.forEach(p=>(p.name||"").toLowerCase().includes(q)&&h.push(["fa-box",p.name,rp(p.price),()=>go("products","pq",p.name)]));
 h.slice(0,8).forEach(x=>{const b=el("button","pi");b.append(el("i","fa-solid "+x[0]),el("span","",x[1]),el("small","",x[2]));b.onclick=()=>{pal.close();x[3]()};pl.append(b)});
 if(!h.length)pl.append(el("div","empty-s","Tidak ada hasil."))};
pi.onkeydown=e=>{if(e.key==="Enter"){const f=pl.querySelector("button");f&&f.click()}};
const open=()=>{pi.value="";pl.textContent="";pal.showModal();pi.focus()};$("palB").onclick=open;
addEventListener("keydown",e=>{if((e.ctrlKey||e.metaKey)&&e.key.toLowerCase()==="k"){e.preventDefault();open()}});
/* sistem */
async function sys(){const t0=performance.now(),tb=["orders","products","users_profile","announcements"],
 rs=await Promise.all(tb.map(t=>sb.from(t).select("*",{count:"exact",head:true}))),ms=Math.round(performance.now()-t0),b=$("sysB");b.textContent="";
 const kv=(k,v)=>{const r=el("div","kv");r.append(el("span","",k),el("b","",v));b.append(r)},ok=rs.every(r=>!r.error);
 kv("Koneksi database",ok?"Terhubung · "+ms+" ms":"Bermasalah: "+(rs.find(r=>r.error).error.message));
 tb.forEach((t,i)=>kv("Baris "+t,rs[i].error?"-":rs[i].count));kv("Dicek pada",new Date().toLocaleTimeString("id-ID"))}
$("sysR").onclick=sys;addEventListener("hashchange",()=>{if(location.hash==="#system")sys()});if(location.hash==="#system")sys();
$("bak").onclick=()=>{const a=el("a");a.href=URL.createObjectURL(new Blob([JSON.stringify({exported_at:new Date().toISOString(),orders:D.O,products:D.P,users_profile:D.U,announcements:D.N},null,1)],{type:"application/json"}));a.download="backup-alvelions-"+jk(Date.now())+".json";a.click();setTimeout(()=>URL.revokeObjectURL(a.href),1500);toast("Backup diunduh")};
$("auto").onchange=e=>{window.AUTO=e.target.checked};
/* ekspor */
const dx=el("dialog","wide");document.body.append(dx);
const X=ALV_X,tx=v=>v||"",SL=s=>ST[s]||s,MD=s=>(s||"").toUpperCase(),SU=(a,f)=>a.reduce((n,y)=>n+f(y),0);
window.admExport=gs=>{dx.textContent="";dx.append(el("h3","","Ekspor pesanan"),el("p","sub",gs.length+" pesanan sesuai filter saat ini."));
 dx.append(el("p","",""));dx.lastChild.style.cssText="margin-bottom:14px;white-space:normal";
 dx.lastChild.textContent="Excel berisi 3 sheet: Ringkasan, Pesanan, dan Rincian Item. Total dihitung otomatis dengan rumus, ada filter kolom, dan siap dicetak.";
 const a=el("div","act"),xb=el("button","btn btn-gold","Unduh Excel (.xlsx)"),cb=el("button","btn","CSV mentah"),x=el("button","btn","Batal");x.onclick=()=>dx.close();
 const st=$("os").value,q=$("oq").value.trim(),fl=({all:"Semua status",pending:"Menunggu",done:"Selesai",none:"Dibatalkan"}[st]||st)+($("ok").value!=="all"?" · kategori "+$("ok").selectedOptions[0].text:"")+(q?' · kata kunci "'+q+'"':""),fs=({all:"semua",pending:"menunggu",done:"selesai",none:"dibatalkan"}[st]||st);
 const P=g=>[g.inv,X.D(fdate(g.created)),g.user||""];
 xb.onclick=async()=>{xb.disabled=true;xb.textContent="Menyiapkan…";try{
  const wb=X.book("Laporan Pesanan ALVELIONS MC"),sm=wb.addWorksheet("Ringkasan",{views:[{showGridLines:false}],properties:{tabColor:{argb:X.GOLD}},pageSetup:{orientation:"portrait",paperSize:9,fitToPage:true,fitToWidth:1,fitToHeight:0}}),
  rp0='"Rp" #,##0',meta="Dibuat "+X.now()+" · Filter: "+fl+" · "+gs.length+" pesanan",
  PR=gs.map((g,i)=>[i+1,g.inv,X.D(fdate(g.created)),X.Tm(fdate(g.created)),g.user||"",g.gt||"",g.phone||"",g.items.map(y=>y.name+" ×"+y.qty).join(", "),SU(g.items,y=>y.qty),g.total,SL(g.status),MD(g.pay),g.qris||"",g.ref||"",admFlag(g).join("; ")]),IR=[];
  gs.forEach(g=>g.items.forEach(y=>{const r=5+IR.length;IR.push([g.inv,X.D(fdate(g.created)),g.user||"",y.name,y.qty,{formula:`IFERROR(G${r}/E${r},0)`,result:y.qty?y.sub/y.qty:y.sub},y.sub,SL(g.status)])}));
  const tp=X.table(wb,{name:"Pesanan",title:"Daftar Pesanan",meta,rows:PR,status:10,totals:{label:7,cols:[8,9]},cols:[{h:"No",w:6,t:"c"},{h:"Invoice",w:14,t:"c"},{h:"Tanggal",w:14,t:"c",f:"dd mmm yyyy"},{h:"Jam",w:9,t:"c",f:"hh:mm"},{h:"Username",w:16,t:"text"},{h:"Gamertag",w:16,t:"text"},{h:"No. HP",w:16,t:"text"},{h:"Item",w:42,t:"text",wrap:1},{h:"Jumlah item",w:12,t:"num",f:"#,##0"},{h:"Total (Rp)",w:16,t:"num",f:rp0},{h:"Status",w:14,t:"c"},{h:"Metode",w:12,t:"c"},{h:"Tipe QRIS",w:13,t:"c"},{h:"ID Pembayaran",w:24,t:"text"},{h:"Peringatan",w:26,t:"text",wrap:1}]}),
  ti=X.table(wb,{name:"Rincian Item",title:"Rincian Item per Pesanan",meta,rows:IR,status:7,totals:{label:3,cols:[4,6]},cols:[{h:"Invoice",w:14,t:"c"},{h:"Tanggal",w:14,t:"c",f:"dd mmm yyyy"},{h:"Username",w:16,t:"text"},{h:"Produk",w:32,t:"text"},{h:"Qty",w:8,t:"num",f:"#,##0"},{h:"Harga satuan (Rp)",w:18,t:"num",f:rp0},{h:"Subtotal (Rp)",w:18,t:"num",f:rp0},{h:"Status",w:14,t:"c"}]});
  /* sheet Ringkasan */
  const F=(c,o={})=>{c.font={name:X.F,size:10,...(o.font||{})};if(o.fill)c.fill=X.fill(o.fill);c.border=X.bd;if(o.fmt)c.numFmt=o.fmt;c.alignment={vertical:"middle",horizontal:o.h||"left"}},
  H=(r,a)=>a.forEach((v,i)=>{const c=sm.getCell(r,i+1);c.value=v;F(c,{fill:X.GOLD,font:{bold:true,color:{argb:X.INK}},h:i?"right":"left"})});
  sm.columns=[{width:36},{width:18},{width:22}];sm.mergeCells("A1:C1");let c=sm.getCell("A1");c.value="ALVELIONS MC · Laporan Pesanan";c.font={name:X.F,size:16,bold:true,color:{argb:X.GOLD}};c.fill=X.fill(X.INK);c.alignment={vertical:"middle",indent:1};sm.getRow(1).height=34;
  sm.mergeCells("A2:C2");c=sm.getCell("A2");c.value=meta;c.font={name:X.F,size:9,italic:true,color:{argb:"FF5F5A48"}};c.alignment={vertical:"middle",indent:1,wrapText:true};sm.getRow(2).height=30;
  sm.getCell("A4").value="RINGKASAN STATUS";sm.getCell("A4").font={name:X.F,size:11,bold:true};H(5,["Status","Jumlah pesanan","Nilai (Rp)"]);
  const L=tp.last,pe=`Pesanan!$K$5:$K$${L}`,pt=`Pesanan!$J$5:$J$${L}`,by={};
  ["Selesai","Menunggu","Dibatalkan"].forEach((s,i)=>{const r=6+i,m=gs.filter(g=>SL(g.status)===s);
   c=sm.getCell(r,1);c.value=s;F(c,{fill:X.ST[s][0],font:{bold:true,color:{argb:X.ST[s][1]}}});
   c=sm.getCell(r,2);c.value={formula:`COUNTIF(${pe},A${r})`,result:m.length};F(c,{fmt:"#,##0",h:"right"});
   c=sm.getCell(r,3);c.value={formula:`SUMIFS(${pt},${pe},A${r})`,result:sumT(m)};F(c,{fmt:rp0,h:"right"})});
  const dn=gs.filter(g=>g.status==="done"),fo={bold:true,color:{argb:X.GOLD}};
  c=sm.getCell("A9");c.value="TOTAL";F(c,{fill:X.INK,font:fo});c=sm.getCell("B9");c.value={formula:"SUM(B6:B8)",result:gs.length};F(c,{fill:X.INK,font:fo,fmt:"#,##0",h:"right"});c=sm.getCell("C9");c.value={formula:"SUM(C6:C8)",result:sumT(gs)};F(c,{fill:X.INK,font:fo,fmt:rp0,h:"right"});
  [["Pendapatan (pesanan selesai)","C6",sumT(dn),rp0],["Rata-rata per pesanan selesai","IFERROR(C6/B6,0)",dn.length?sumT(dn)/dn.length:0,rp0],["Pesanan dengan peringatan",`SUMPRODUCT(--(LEN(Pesanan!$O$5:$O$${L})>0))`,gs.filter(g=>admFlag(g).length).length,"#,##0"]].forEach(([k,f,v,fm],i)=>{const r=11+i;c=sm.getCell(r,1);c.value=k;F(c,{font:{bold:true}});sm.mergeCells(r,2,r,3);c=sm.getCell(r,2);c.value={formula:f,result:v};F(c,{fmt:fm,h:"right"});sm.getCell(r,3).border=X.bd});
  sm.getCell("A15").value="PENJUALAN PER PRODUK (pesanan selesai)";sm.getCell("A15").font={name:X.F,size:11,bold:true};H(16,["Produk","Terjual","Pendapatan (Rp)"]);
  dn.forEach(g=>g.items.forEach(y=>{const z=by[y.name]||(by[y.name]={q:0,t:0});z.q+=y.qty;z.t+=y.sub}));
  const ks=Object.keys(by).sort((a,b)=>by[b].t-by[a].t),IL=ti.last,ri=k=>`'Rincian Item'!$${k}$5:$${k}$${IL}`;
  ks.forEach((k,i)=>{const r=17+i;c=sm.getCell(r,1);c.value=k;F(c);
   c=sm.getCell(r,2);c.value={formula:`SUMIFS(${ri("E")},${ri("D")},$A${r},${ri("H")},"Selesai")`,result:by[k].q};F(c,{fmt:"#,##0",h:"right"});
   c=sm.getCell(r,3);c.value={formula:`SUMIFS(${ri("G")},${ri("D")},$A${r},${ri("H")},"Selesai")`,result:by[k].t};F(c,{fmt:rp0,h:"right"})});
  let e=17+ks.length;if(!ks.length){sm.mergeCells(e,1,e,3);c=sm.getCell(e,1);c.value="Belum ada penjualan selesai pada data ini.";F(c,{font:{italic:true}});e++}
  else{c=sm.getCell(e,1);c.value="TOTAL";F(c,{fill:X.INK,font:fo});c=sm.getCell(e,2);c.value={formula:`SUM(B17:B${e-1})`,result:ks.reduce((n,k)=>n+by[k].q,0)};F(c,{fill:X.INK,font:fo,fmt:"#,##0",h:"right"});c=sm.getCell(e,3);c.value={formula:`SUM(C17:C${e-1})`,result:ks.reduce((n,k)=>n+by[k].t,0)};F(c,{fill:X.INK,font:fo,fmt:rp0,h:"right"});e++}
  sm.mergeCells(e+1,1,e+1,3);c=sm.getCell(e+1,1);c.value="Catatan: seluruh angka dihitung otomatis dari sheet Pesanan dan Rincian Item. Pendapatan hanya dari pesanan berstatus Selesai.";c.font={name:X.F,size:8,italic:true,color:{argb:"FF5F5A48"}};c.alignment={wrapText:true,vertical:"top"};sm.getRow(e+1).height=26;
  await X.save(wb,"Laporan-Pesanan-ALVELIONS_"+fs+"_"+X.today()+".xlsx");dx.close();toast("Excel diunduh: "+gs.length+" pesanan")}catch(er){toast(er.message,1);xb.disabled=false;xb.textContent="Unduh Excel (.xlsx)"}};
 cb.onclick=()=>{const H=["No","Invoice","Tanggal","Jam","Username","Gamertag","No. HP","Item","Jumlah item","Total (Rp)","Status","Metode","Tipe QRIS","ID pembayaran"],ft=v=>v?{t:v}:"";
  csv("pesanan-alvelions_"+fs+"_"+X.today()+".csv",[H,...gs.map((g,i)=>[i+1,g.inv,fdate(g.created).slice(0,10),fdate(g.created).slice(11,16),g.user,g.gt,ft(g.phone),g.items.map(y=>y.name+" x"+y.qty).join("; "),SU(g.items,y=>y.qty),g.total,SL(g.status),MD(g.pay),g.qris||"",ft(g.ref)])]);dx.close();toast("CSV diunduh")};
 a.append(xb,cb,x);dx.append(a);dx.showModal()};
})();
