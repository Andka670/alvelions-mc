/* Fitur tambahan dashboard member: pelacak pesanan terakhir dan statistik belanja */
document.addEventListener("dash:data",e=>{const G=e.detail.G,done=G.filter(g=>g.status==="done"),q={};
 done.forEach(g=>g.items.forEach(i=>{q[i.name]=(q[i.name]||0)+i.qty}));const fav=Object.keys(q).sort((a,b)=>q[b]-q[a])[0];
 kpi($("kpis2"),[["fa-scale-balanced","Rata-rata per pesanan",rp(done.length?sumT(done)/done.length:0),""],["fa-calendar-check","Belanja terakhir",done.length?fdate(done[0].created).slice(0,10):"-",""],["fa-star","Item favorit",fav||"-",""]]);
 const t=$("trk"),g=G[0];t.textContent="";t.append(el("h2","","Pesanan terakhir"));
 if(!g){t.append(el("p","sub","Belum ada pesanan. Pilih rank atau item di store untuk mulai."));return}
 t.append(el("p","sub",g.inv.replace("INV-","#")+" · "+g.items.map(i=>i.name+" ×"+i.qty).join(", ")+" · "+rp(g.total)+" · "+fdate(g.created)));
 if(g.status==="none")t.append(bdg("none"));
 else{const n=g.status==="done"?3:1,o=el("ol","stp");["Pesanan dibuat","Verifikasi pembayaran","Selesai"].forEach((s,i)=>o.append(el("li",i<n?"ok":i===n?"cur":"",s)));t.append(o)}
 const b=el("button","btn sm",""),i=el("i","fa-regular fa-copy");b.append(i," Salin nomor invoice");b.onclick=()=>navigator.clipboard.writeText(g.inv).then(()=>toast("Nomor invoice disalin"));t.append(b)});
