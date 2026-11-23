/* Pembuat laporan Excel (.xlsx) berformat. Dipakai panel admin dan dashboard member. Butuh ExcelJS. */
window.ALV_X=(()=>{
const F="Arial",GOLD="FFFFD84D",INK="FF14151A",LINE="FFD9D4C0",ZEB="FFFBF8EC",
 ST={Selesai:["FFE3F5EA","FF1B7F45"],Menunggu:["FFFFF0D9","FF9A5B00"],Dibatalkan:["FFFCE4E4","FFB3261E"]},
 s=c=>({style:"thin",color:{argb:LINE}}),bd={top:s(),left:s(),bottom:s(),right:s()},
 fill=a=>({type:"pattern",pattern:"solid",fgColor:{argb:a}}),
 col=n=>{let r="";for(;n>0;n=Math.floor((n-1)/26))r=String.fromCharCode(65+(n-1)%26)+r;return r},
 D=v=>{const m=/^(\d{4})-(\d{2})-(\d{2})/.exec(v||"");return m?Math.round(Date.UTC(+m[1],+m[2]-1,+m[3])/864e5)+25569:null},
 Tm=v=>{const m=/[T ](\d{2}):(\d{2})/.exec(v||"");return m?(+m[1]*60+ +m[2])/1440:null},
 now=()=>new Date().toLocaleString("id-ID",{timeZone:"Asia/Jakarta",dateStyle:"long",timeStyle:"short"})+" WIB",
 today=()=>new Date().toLocaleDateString("sv-SE",{timeZone:"Asia/Jakarta"});
function book(title){if(typeof ExcelJS==="undefined")throw new Error("Pustaka Excel belum termuat. Periksa koneksi internet lalu coba lagi.");
 const wb=new ExcelJS.Workbook();wb.creator="ALVELIONS MC";wb.title=title;wb.created=new Date();return wb}
/* o: {name,title,meta,cols:[{h,w,t:"c"|"text"|"num",f,wrap}],rows,totals:{label,cols},status} */
function table(wb,o){const n=o.cols.length,al=c=>({vertical:"middle",horizontal:c.t==="num"?"right":c.t==="text"?"left":"center",wrapText:!!c.wrap}),
 ws=wb.addWorksheet(o.name,{views:[{state:"frozen",ySplit:4,showGridLines:false}],properties:{tabColor:{argb:GOLD}},
  pageSetup:{orientation:"landscape",paperSize:9,fitToPage:true,fitToWidth:1,fitToHeight:0,printTitlesRow:"4:4",margins:{left:.4,right:.4,top:.6,bottom:.6,header:.3,footer:.3}},
  headerFooter:{oddFooter:"&L&8ALVELIONS MC&C&8Halaman &P dari &N&R&8&D"}});
 ws.mergeCells(1,1,1,n);const t=ws.getCell(1,1);t.value=o.title;t.font={name:F,size:16,bold:true,color:{argb:GOLD}};t.fill=fill(INK);t.alignment={vertical:"middle",indent:1};ws.getRow(1).height=34;
 ws.mergeCells(2,1,2,n);const m=ws.getCell(2,1);m.value=o.meta;m.font={name:F,size:9,italic:true,color:{argb:"FF5F5A48"}};m.alignment={vertical:"middle",indent:1};ws.getRow(2).height=20;
 const h=ws.getRow(4);h.height=28;o.cols.forEach((c,i)=>{const x=h.getCell(i+1);x.value=c.h;x.font={name:F,size:10,bold:true,color:{argb:INK}};x.fill=fill(GOLD);x.border=bd;x.alignment={...al(c),horizontal:c.t==="num"?"right":c.t==="text"?"left":"center"};ws.getColumn(i+1).width=c.w});
 o.rows.forEach((r,j)=>{const row=ws.getRow(5+j);r.forEach((v,i)=>{const c=o.cols[i],x=row.getCell(i+1);x.value=v;x.font={name:F,size:10};x.border=bd;x.alignment=al(c);if(c.f)x.numFmt=c.f;if(j%2)x.fill=fill(ZEB);
  if(o.status===i&&ST[v]){x.fill=fill(ST[v][0]);x.font={name:F,size:10,bold:true,color:{argb:ST[v][1]}}}})});
 const last=4+o.rows.length;
 if(o.totals&&o.rows.length){const row=ws.getRow(last+1);row.height=24;o.cols.forEach((c,i)=>{const x=row.getCell(i+1);x.fill=fill(INK);x.font={name:F,size:10,bold:true,color:{argb:GOLD}};x.border=bd;x.alignment=al(c);if(c.f)x.numFmt=c.f;
  if(i===o.totals.label)x.value="TOTAL";
  if(o.totals.cols.includes(i)){const L=col(i+1);x.value={formula:`SUBTOTAL(109,${L}5:${L}${last})`,result:o.rows.reduce((a,r)=>a+(Number((r[i]&&r[i].result!==undefined)?r[i].result:r[i])||0),0)}}})}
 ws.autoFilter={from:{row:4,column:1},to:{row:Math.max(last,4),column:n}};return{ws,last}}
async function save(wb,name){const b=await wb.xlsx.writeBuffer(),a=document.createElement("a");a.href=URL.createObjectURL(new Blob([b],{type:"application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"}));a.download=name;a.click();setTimeout(()=>URL.revokeObjectURL(a.href),1500)}
return{book,table,save,D,Tm,now,today,F,GOLD,INK,bd,ST,fill}})();
