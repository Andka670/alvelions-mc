(async()=>{
const sb=supabaseClient;let G=[],PN={},uname="",lastG=[];
const {data:{session}}=await sb.auth.getSession();if(!session){location.replace("login.html");return}
const {data:pr}=await sb.from("users_profile").select("*").eq("id",session.user.id).maybeSingle();
uname=(pr&&pr.username)||(session.user.email||"user").split("@")[0];
$("who").textContent=uname;if(pr&&pr.role==="admin")$("admL").hidden=false;
$("pU").textContent=uname;$("pE").textContent=session.user.email||"-";$("pR").textContent=pr&&pr.role==="admin"?"Admin":"Member";$("pJ").textContent=pr&&pr.created_at?new Date(pr.created_at).toLocaleDateString("id-ID",{day:"numeric",month:"long",year:"numeric"}):"-";
const td=(tr,...n)=>{const c=el("td");c.append(...n);tr.append(c);return c};
async function load(){const [o,p]=await Promise.all([sb.from("orders").select("*").eq("username",uname).order("created_at",{ascending:false}),sb.from("products").select("id,name")]);
 if(o.error)toast("Gagal memuat transaksi: "+o.error.message,1);PN=Object.fromEntries((p.data||[]).map(x=>[String(x.id),x.name]));G=group(o.data||[],PN);rHome();rTrx();document.dispatchEvent(new CustomEvent("dash:data",{detail:{G}}))}
function rHome(){const done=G.filter(g=>g.status==="done"),pend=G.filter(g=>g.status==="pending");
 kpi($("kpis"),[["fa-wallet","Total belanja",rp(sumT(done)),""],["fa-hourglass-half","Pesanan menunggu",pend.length,"warn"],["fa-circle-check","Pesanan selesai",done.length,""]]);
 const mo=[];for(let i=5;i>=0;i--){const d=new Date();d.setMonth(d.getMonth()-i);mo.push(d.toLocaleDateString("sv-SE",{timeZone:"Asia/Jakarta"}).slice(0,7))}
 drawChart("chSp","bar",mo,mo.map(m=>sumT(done.filter(g=>fdate(g.created).startsWith(m)))),"Belanja")}
/* transaksi */
function detail(g){$("oT").textContent="Pesanan "+g.inv;const b=$("oB");b.textContent="";
 const kv=(k,v)=>{const r=el("div","kv");r.append(el("span","",k),el("b","",v||"-"));b.append(r)};
 kv("Status",ST[g.status]||g.status);kv("Waktu",fdate(g.created));kv("Gamertag",g.gt);kv("Metode",(g.pay||"").toUpperCase());kv("ID pembayaran",g.ref);
 g.items.forEach(i=>kv(i.name+" × "+i.qty,rp(i.sub)));kv("Total",rp(g.total));
 if(g.status==="none"&&permItems(g).length){const p=el("p","sub",RANK_NOTE+" Silakan cek website ALVELIONS: "),a=el("a","",SITE_URL);a.href=SITE_URL;a.target="_blank";a.rel="noopener";p.append(a);b.append(p)}
 const c=$("oCancel");c.hidden=g.status!=="pending";
 c.onclick=async()=>{if(!confirm("Batalkan pesanan "+g.inv+"? Hanya pesanan yang belum diproses yang bisa dibatalkan."))return;
  const {error}=await sb.from("orders").delete().eq("username",uname).eq("id_transaksi",g.inv).eq("status","pending");
  if(error)return toast("Gagal membatalkan: "+error.message,1);$("dOrder").close();toast("Pesanan dibatalkan");load()};
 $("dOrder").showModal()}
function rTrx(){const f=$("ts").value,b=$("trxB");b.textContent="";const q=$("tq").value.trim().toLowerCase();lastG=G.filter(g=>(f==="all"||g.status===f)&&(!q||(g.inv+" "+g.items.map(i=>i.name).join(" ")).toLowerCase().includes(q)));
 if(!lastG.length){const tr=el("tr"),t=el("td","empty-s",G.length?"Tidak ada transaksi dengan status ini.":"Belum ada transaksi. Pilih rank atau item di store untuk mulai.");t.colSpan=5;tr.append(t);b.append(tr);return}
 lastG.forEach(g=>{const tr=el("tr");td(tr,el("span","mono",g.inv.replace("INV-","#")));
  td(tr,el("span","",g.items[0].name+(g.items.length>1?" +"+(g.items.length-1):"")));td(tr,el("b","",rp(g.total)));td(tr,bdg(g.status));
  const s=el("div","act"),d=el("button","btn sm","Detail");d.onclick=()=>detail(g);s.append(el("span","mut",fdate(g.created)),d);td(tr,s);b.append(tr)})}
$("ts").onchange=$("tq").oninput=rTrx;
$("tExp").onclick=async()=>{if(!lastG.length)return toast("Tidak ada transaksi untuk diunduh",1);try{const X=ALV_X,wb=X.book("Riwayat Transaksi "+uname),
 rows=lastG.map((g,i)=>[i+1,g.inv,X.D(fdate(g.created)),X.Tm(fdate(g.created)),g.items.map(x=>x.name+" ×"+x.qty).join(", "),g.items.reduce((n,x)=>n+x.qty,0),g.total,ST[g.status]||g.status,(g.pay||"").toUpperCase(),g.ref||""]);
 X.table(wb,{name:"Transaksi",title:"Riwayat Transaksi · "+uname,meta:"Dibuat "+X.now()+" · "+rows.length+" transaksi",rows,status:7,totals:{label:4,cols:[5,6]},cols:[{h:"No",w:6,t:"c"},{h:"Invoice",w:14,t:"c"},{h:"Tanggal",w:14,t:"c",f:"dd mmm yyyy"},{h:"Jam",w:9,t:"c",f:"hh:mm"},{h:"Item",w:42,t:"text",wrap:1},{h:"Jumlah item",w:12,t:"num",f:"#,##0"},{h:"Total (Rp)",w:16,t:"num",f:'"Rp" #,##0'},{h:"Status",w:14,t:"c"},{h:"Metode",w:12,t:"c"},{h:"ID Pembayaran",w:24,t:"text"}]});
 await X.save(wb,"Transaksi-"+uname+"_"+X.today()+".xlsx");toast("Excel diunduh")}catch(e){toast(e.message,1)}};
/* server */
const ADDR="alvelionssmp.my.id:26714";
$("cp").onclick=()=>navigator.clipboard.writeText(ADDR).then(()=>toast("IP server disalin"));
$("jn").onclick=()=>{navigator.clipboard.writeText(ADDR).catch(()=>{});location.href="minecraft://?addExternalServer=ALVELIONS SMP|"+ADDR};
(async()=>{try{const d=await AlvelionsBedrockStatus.check(),on=AlvelionsBedrockStatus.isCurrent(d)&&d.verdict==="online";
 $("sSt").className="state "+(on?"ok":""),$("sTx").textContent=on?"Online":"Status belum dapat dipastikan";
 if(on){const p=d.players||{};$("sPl").textContent=Number.isFinite(p.online)?(p.max?p.online+"/"+p.max:p.online):"--";$("sVr").textContent=d.version||"--"}}
 catch(e){$("sTx").textContent="Gagal memeriksa status"}})();
/* pengumuman */
(async()=>{const b=$("newsL"),{data,error}=await sb.from("announcements").select("title,content,created_at").order("created_at",{ascending:false}).limit(8);b.textContent="";
 if(error||!data||!data.length){b.append(el("div","empty-s",error?"Pengumuman gagal dimuat.":"Belum ada pengumuman."));return}
 data.forEach(n=>{const d=el("div","news");d.append(el("h3","",n.title),el("span","mut",fdate(n.created_at)),el("p","",n.content));b.append(d)})})();
/* profil */
$("pwS").onclick=async()=>{const a=$("pw1").value,c=$("pw2").value,m=$("pwM");m.style.color="var(--red)";
 if(a.length<6){m.textContent="Password minimal 6 karakter.";return}if(a!==c){m.textContent="Konfirmasi password tidak cocok.";return}
 const {error}=await sb.auth.updateUser({password:a});if(error){m.textContent=error.message;return}
 $("pw1").value=$("pw2").value="";m.style.color="var(--grass)";m.textContent="Password berhasil diperbarui."};
$("out").onclick=async()=>{await sb.auth.signOut();location.href="index.html"};
/* hapus akun sendiri (via Edge Function delete-account) */
{const dd=$("dDel"),di=$("dI"),dg=$("dGo"),dm=$("dM");
 if(pr&&pr.role==="admin")$("delCard").hidden=true;
 $("delB").onclick=()=>{di.value="";dg.disabled=true;dm.textContent="";$("dN").textContent=uname;dd.showModal()};
 $("dX").onclick=()=>dd.close();
 di.oninput=()=>{dg.disabled=di.value.trim()!==uname};
 dg.onclick=async()=>{dm.style.color="var(--mute)";dm.textContent="Menghapus akun…";dg.disabled=true;
  try{const {data:{session:s}}=await sb.auth.getSession();
   const res=await fetch(SUPABASE_URL+"/functions/v1/delete-account",{method:"POST",headers:{"Content-Type":"application/json",Authorization:"Bearer "+s.access_token,apikey:SUPABASE_ANON_KEY},body:"{}"});
   const j=await res.json().catch(()=>({}));
   if(!res.ok){dm.style.color="var(--red)";dm.textContent=j.error||"Gagal menghapus akun.";dg.disabled=false;return}
   await sb.auth.signOut({scope:"local"}).catch(()=>{});location.replace("index.html")}
  catch(e){dm.style.color="var(--red)";dm.textContent="Terjadi kesalahan: "+e.message;dg.disabled=false}}}
initNav();await load();
})();
