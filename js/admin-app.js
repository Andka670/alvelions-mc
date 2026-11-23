(async()=>{
const SEL=window.SEL=new Set(),sb=supabaseClient;let P=[],O=[],U=[],N=[],G=[],PN={},lastO=[];
try{const {data:{session}}=await sb.auth.getSession();if(!session){location.replace("login.html");return}
 const {data:pr}=await sb.from("users_profile").select("role").eq("id",session.user.id).maybeSingle();
 if(!pr||pr.role!=="admin"){location.replace("dashboard.html");return}}catch(e){location.replace("login.html");return}
const jk=d=>new Date(d).toLocaleDateString("sv-SE",{timeZone:"Asia/Jakarta"});
const empty=(tb,n,t)=>{const tr=el("tr"),td=el("td","empty-s",t);td.colSpan=n;tr.append(td);tb.append(tr)};
const td=(tr,...n)=>{const c=el("td");c.append(...n);tr.append(c);return c};
async function load(){
 const [o,p,u,n]=await Promise.all([sb.from("orders").select("*").order("created_at",{ascending:false}),sb.from("products").select("*"),sb.from("users_profile").select("*"),sb.from("announcements").select("*").order("created_at",{ascending:false})]);
 if(o.error)toast("Gagal memuat pesanan: "+o.error.message,1);
 O=o.data||[];P=p.data||[];U=u.data||[];N=n.data||[];PN=Object.fromEntries(P.map(x=>[String(x.id),x.name]));G=group(O,PN);renderAll()}
function renderAll(){document.dispatchEvent(new CustomEvent("admin:data",{detail:{G,O,U,P,N}}));rHome();rOrders();rProd();rInc();rUsers();rNews();const c=G.filter(g=>g.status==="pending").length;$("navPend").textContent=c||""}
/* ---- ringkasan ---- */
async function setStatus(g,s){const {error}=await sb.from("orders").update({status:s}).in("id",g.rows.map(r=>r.id));if(error)return toast("Gagal mengubah status: "+error.message,1);toast("Status diperbarui: "+ST[s]);load()}
function rHome(){const done=G.filter(g=>g.status==="done"),pend=G.filter(g=>g.status==="pending"),td0=jk(Date.now());
 kpi($("kpis"),[["fa-hourglass-half","Menunggu verifikasi",pend.length,"warn"],["fa-sack-dollar","Pendapatan hari ini",rp(sumT(done.filter(g=>fdate(g.created).startsWith(td0)))),""],["fa-chart-line","Total pendapatan",rp(sumT(done)),""],["fa-receipt","Total pesanan",G.length,""],["fa-box","Produk",P.length,""],["fa-users","Pengguna",U.length,""]]);
 const days=[];for(let i=13;i>=0;i--)days.push(jk(Date.now()-i*864e5));
 drawChart("chRev","bar",days.map(d=>d.slice(5)),days.map(d=>sumT(done.filter(g=>fdate(g.created).startsWith(d)))),"Pendapatan");
 const b=$("pendL");b.textContent="";
 if(!pend.length){b.append(el("div","empty-s","Tidak ada pesanan yang menunggu. Semua sudah diproses."));return}
 pend.slice(0,6).forEach(g=>{const r=el("div","li"),l=el("div");l.append(el("b","",g.user||"-"),el("span","mut",g.items[0].name+(g.items.length>1?" +"+(g.items.length-1):"")+" · "+rp(g.total)));
  const a=el("div","act"),ok=el("button","btn btn-gold sm","Selesai"),d=el("button","btn sm","Detail");ok.onclick=()=>setStatus(g,"done");d.onclick=()=>detail(g);a.append(ok,d);r.append(l,a);b.append(r)})}
/* ---- pesanan ---- */
function detail(g){$("oT").textContent="Pesanan "+g.inv;const b=$("oB");b.textContent="";
 const kv=(k,v)=>{const r=el("div","kv");r.append(el("span","",k),el("b","",v||"-"));b.append(r)};
 kv("Status",ST[g.status]||g.status);kv("Waktu",fdate(g.created));kv("Username",g.user);kv("Gamertag",g.gt);kv("Nomor HP",g.phone);kv("Metode",(g.pay||"").toUpperCase()+(g.qris?" · QRIS "+g.qris:""));kv("ID pembayaran",g.ref);
 g.items.forEach(i=>kv(i.name+" × "+i.qty,rp(i.sub)));kv("Total",rp(g.total));
 $("oWa").href="https://wa.me/"+wa(g.phone)+"?text="+encodeURIComponent("Halo "+(g.gt||g.user)+", pesanan "+g.inv+" di ALVELIONS MC "+(g.status==="done"?"sudah selesai diproses. Selamat bermain!":"sedang kami proses."));
 $("oDel").onclick=async()=>{if(!confirm("Hapus pesanan "+g.inv+"? Pendapatan dari pesanan ini ikut hilang dan tidak bisa dikembalikan."))return;
  const {error}=await sb.from("orders").delete().in("id",g.rows.map(r=>r.id));if(error)return toast("Gagal menghapus: "+error.message,1);$("dOrder").close();toast("Pesanan dihapus");load()};
 $("dOrder").showModal()}
function rOrders(){const q=$("oq").value.trim().toLowerCase(),f=$("os").value,b=$("ordB");b.textContent="";
 lastO=G.filter(g=>(f==="all"||g.status===f)&&(!q||[g.inv,g.user,g.gt,g.phone,g.ref].join(" ").toLowerCase().includes(q)));
 $("oc").textContent=lastO.length+" pesanan"+(lastO.length>300?" (300 teratas ditampilkan, persempit dengan filter)":"");
 if(!lastO.length)return empty(b,8,"Tidak ada pesanan yang cocok. Ubah kata kunci atau filter status.");
 lastO.slice(0,300).forEach(g=>{const tr=el("tr"),cb=el("input");cb.type="checkbox";cb.checked=SEL.has(g.inv);cb.setAttribute("aria-label","Pilih "+g.inv);cb.onchange=()=>{cb.checked?SEL.add(g.inv):SEL.delete(g.inv);window.admBulkUI&&admBulkUI()};td(tr,cb);const iv=el("div");iv.append(el("span","mono",g.inv.replace("INV-","#")));(window.admFlag?admFlag(g):[]).forEach(f=>iv.append(el("span","flag",f)));td(tr,iv);
  const u=el("div");u.append(el("b","",g.user||"-"),el("span","mut",g.gt||"-"));td(tr,u);
  td(tr,el("span","",g.items[0].name+(g.items.length>1?" +"+(g.items.length-1):"")));td(tr,el("b","",rp(g.total)));
  const s=el("select","inp sm");Object.keys(ST).forEach(k=>{const o=el("option","",ST[k]);o.value=k;s.append(o)});s.value=g.status;s.onchange=()=>setStatus(g,s.value);td(tr,s);
  td(tr,el("span","mut",fdate(g.created)));const d=el("button","btn sm","Detail");d.onclick=()=>detail(g);td(tr,d);b.append(tr)})}
$("oq").oninput=$("os").onchange=rOrders;
$("oExp").onclick=()=>lastO.length?window.admExport&&admExport(lastO):toast("Tidak ada pesanan untuk diekspor",1);
/* ---- produk ---- */
let editId=null;
function rProd(){const q=$("pq").value.trim().toLowerCase(),b=$("prodB");b.textContent="";
 const l=P.filter(p=>!q||(p.name+" "+(p.description||"")).toLowerCase().includes(q)).sort((a,b)=>a.price-b.price);
 if(!l.length)return empty(b,4,"Belum ada produk. Klik Tambah produk untuk membuat yang pertama.");
 l.forEach(p=>{const tr=el("tr");td(tr,el("b","",p.name));td(tr,el("span","",rp(p.price)));td(tr,el("span","mut",(p.description||"-").slice(0,80)));
  const a=el("div","act"),e=el("button","btn sm","Edit"),d=el("button","btn sm dng","Hapus");e.onclick=()=>pForm(p);
  d.onclick=async()=>{if(!confirm("Hapus produk "+p.name+"? Pesanan lama tetap ada, tapi namanya tampil sebagai produk dihapus."))return;const {error}=await sb.from("products").delete().eq("id",p.id);if(error)return toast("Gagal menghapus: "+error.message,1);toast("Produk dihapus");load()};
  a.append(e,d);td(tr,a);b.append(tr)})}
function pForm(p){editId=p?p.id:null;$("pT").textContent=p?"Edit produk":"Tambah produk";$("pN").value=p?p.name:"";$("pP").value=p?p.price:"";$("pD").value=p&&p.description?p.description:"";$("pM").textContent="";$("dProd").showModal()}
$("pAdd").onclick=()=>pForm(null);$("pq").oninput=rProd;$("pC").onclick=()=>$("dProd").close();
$("pS").onclick=async()=>{const n=$("pN").value.trim(),pr=Number($("pP").value);
 if(!n||$("pP").value===""||!Number.isFinite(pr)||pr<0){$("pM").textContent="Nama wajib diisi dan harga tidak boleh negatif.";return}
 const row={name:n,price:pr,description:$("pD").value.trim()};
 const {error}=editId?await sb.from("products").update(row).eq("id",editId):await sb.from("products").insert([row]);
 if(error){$("pM").textContent="Gagal menyimpan: "+error.message;return}$("dProd").close();toast("Produk disimpan");load()};
/* ---- pendapatan ---- */
function rInc(){const r=$("ir").value,lim=r==="all"?0:Date.now()-Number(r)*864e5,since=lim?jk(lim):"";
 const done=G.filter(g=>g.status==="done"&&(!since||fdate(g.created).slice(0,10)>=since));
 const by={};done.forEach(g=>g.items.forEach(i=>{const x=by[i.name]||(by[i.name]={qty:0,tot:0});x.qty+=i.qty;x.tot+=i.sub}));
 kpi($("ik"),[["fa-sack-dollar","Pendapatan",rp(sumT(done)),""],["fa-receipt","Transaksi selesai",done.length,""],["fa-scale-balanced","Rata-rata per transaksi",rp(done.length?sumT(done)/done.length:0),""]]);
 const n=r==="all"?30:Math.min(Number(r),90),days=[];for(let i=n-1;i>=0;i--)days.push(jk(Date.now()-i*864e5));
 drawChart("chInc","line",days.map(d=>d.slice(5)),days.map(d=>sumT(done.filter(g=>fdate(g.created).startsWith(d)))),"Pendapatan");
 const b=$("incB");b.textContent="";const k=Object.keys(by).sort((a,c)=>by[c].tot-by[a].tot);
 if(!k.length)return empty(b,3,"Belum ada transaksi selesai pada periode ini.");
 k.forEach(x=>{const tr=el("tr");td(tr,el("b","",x));td(tr,String(by[x].qty));td(tr,rp(by[x].tot));b.append(tr)})}
$("ir").onchange=rInc;
/* ---- pengguna ---- */
let resetId=null;
function rUsers(){const q=$("uq").value.trim().toLowerCase(),b=$("userB");b.textContent="";
 const l=U.filter(u=>!q||(u.username||"").toLowerCase().includes(q));
 if(!l.length)return empty(b,5,"Tidak ada pengguna yang cocok.");
 l.forEach(u=>{const mine=G.filter(g=>g.user===u.username),tr=el("tr");td(tr,el("b","",u.username||"-"));
  td(tr,el("span","bdg "+(u.role==="admin"?"b-done":"b-pending"),u.role||"user"));td(tr,String(mine.length));td(tr,rp(sumT(mine.filter(g=>g.status==="done"))));
  const r=el("button","btn sm","Reset password");r.onclick=()=>{resetId=u.id;$("rU").textContent="Pengguna: "+u.username;$("rP").value=$("rC").value="";$("rM").textContent="";$("dPass").showModal()};const dt=el("button","btn sm","Detail");dt.onclick=()=>window.admUser&&admUser(u);const ac=el("div","act");ac.append(dt,r);td(tr,ac);b.append(tr)})}
$("uq").oninput=rUsers;$("rX").onclick=()=>$("dPass").close();
$("rS").onclick=async()=>{const a=$("rP").value,c=$("rC").value,m=$("rM");m.style.color="var(--red)";
 if(a.length<6){m.textContent="Password minimal 6 karakter.";return}if(a!==c){m.textContent="Konfirmasi password tidak cocok.";return}
 m.style.color="var(--mute)";m.textContent="Memproses…";
 try{const {data:{session}}=await sb.auth.getSession();
  const res=await fetch(SUPABASE_URL+"/functions/v1/admin-reset-password",{method:"POST",headers:{"Content-Type":"application/json",Authorization:"Bearer "+session.access_token,apikey:SUPABASE_ANON_KEY},body:JSON.stringify({user_id:resetId,new_password:a})});
  const j=await res.json();if(!res.ok){m.style.color="var(--red)";m.textContent=j.error||"Gagal reset password.";return}
  $("dPass").close();toast("Password berhasil diubah")}catch(e){m.style.color="var(--red)";m.textContent="Terjadi kesalahan: "+e.message}};
/* ---- pengumuman ---- */
function rNews(){const b=$("newsL");b.textContent="";
 if(!N.length){b.append(el("div","empty-s","Belum ada pengumuman. Yang kamu tulis di sini tampil di dashboard semua member."));return}
 N.forEach(n=>{const d=el("div","news"),h=el("div","li"),t=el("div");t.append(el("h3","",n.title),el("span","mut",fdate(n.created_at)));
  const x=el("button","btn sm dng","Hapus");x.onclick=async()=>{if(!confirm("Hapus pengumuman ini?"))return;const q=n.id!=null?sb.from("announcements").delete().eq("id",n.id):sb.from("announcements").delete().eq("created_at",n.created_at);const {error}=await q;if(error)return toast("Gagal menghapus: "+error.message,1);toast("Pengumuman dihapus");load()};
  h.append(t,x);h.style.border="0";h.style.padding="0 0 6px";d.append(h,el("p","",n.content));b.append(d)})}
$("nS").onclick=async()=>{const t=$("nT").value.trim(),c=$("nC").value.trim(),m=$("nM");
 if(!t||!c){m.textContent="Judul dan isi pengumuman wajib diisi.";return}m.textContent="";
 const {error}=await sb.from("announcements").insert([{title:t,content:c,created_at:new Date().toISOString()}]);
 if(error){m.textContent="Gagal menerbitkan: "+error.message+". Periksa aturan RLS tabel announcements.";return}
 $("nT").value=$("nC").value="";toast("Pengumuman diterbitkan");load()};
$("out").onclick=async()=>{await sb.auth.signOut();location.href="index.html"};
$("refresh").onclick=()=>load().then(()=>toast("Data dimuat ulang"));
document.addEventListener("keydown",e=>{if(e.key==="Escape")$("side").classList.remove("open")});
window.admReload=load;initNav();await load();setInterval(()=>{if(!document.hidden&&window.AUTO!==false)load()},60000);
})();
