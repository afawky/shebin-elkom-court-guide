const { createClient } = supabase;
const db = createClient(window.SUPABASE_URL, window.SUPABASE_PUBLISHABLE_KEY);
const directory = document.getElementById("directory");
const search = document.getElementById("search");
let allFloors = [], allOffices = [], allServices = [];

function esc(value=""){return String(value).replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));}
async function loadDirectory(){
  directory.innerHTML='<div class="loading">جارٍ تحميل الدليل...</div>';
  const [f,o,s] = await Promise.all([
    db.from("floors").select("*").eq("is_active",true).order("sort_order").order("name"),
    db.from("offices").select("*").eq("is_active",true).order("sort_order").order("name"),
    db.from("services").select("*").eq("is_active",true).order("name")
  ]);
  const error = f.error || o.error || s.error;
  if(error){directory.innerHTML='<div class="empty">تعذر تحميل البيانات. تأكد من إعداد قاعدة البيانات وسياسات القراءة.</div>';document.getElementById("status").textContent=error.message;return;}
  allFloors=f.data||[];allOffices=o.data||[];allServices=s.data||[];
  document.getElementById("floor-count").textContent=allFloors.length;
  document.getElementById("office-count").textContent=allOffices.length;
  document.getElementById("service-count").textContent=allServices.length;
  render();
}
function render(){
  const q=(search.value||"").trim().toLowerCase();
  const floors=allFloors.map(f=>{
    const offices=allOffices.filter(o=>o.floor_id===f.id).map(o=>({...o,services:allServices.filter(s=>s.office_id===o.id)}))
      .filter(o=>!q||[o.name,o.room_number,o.location_description,o.services.map(s=>s.name+" "+(s.description||"")).join(" ")].join(" ").toLowerCase().includes(q));
    const floorMatch=!q||f.name.toLowerCase().includes(q);
    return {...f,offices:floorMatch&&!q?offices:offices};
  }).filter(f=>f.offices.length||(!q&&true));
  const shown=floors.filter(f=>!q||f.offices.length||f.name.toLowerCase().includes(q));
  document.getElementById("result-count").textContent=`${shown.reduce((n,f)=>n+f.offices.length,0)} مكتب`;
  if(!shown.length){directory.innerHTML='<div class="empty">لا توجد نتائج مطابقة لبحثك.</div>';return;}
  directory.innerHTML=shown.map(f=>`<article class="floor-card"><div class="floor-title"><h3>${esc(f.name)}</h3><span class="count">${f.offices.length} مكتب</span></div>${f.offices.length?f.offices.map(o=>`<div class="office"><h4>${esc(o.name)} ${o.room_number?`<span class="office-meta"> — غرفة ${esc(o.room_number)}</span>`:""}</h4>${o.location_description?`<p>${esc(o.location_description)}</p>`:""}${o.phone?`<div class="office-meta">هاتف: ${esc(o.phone)}</div>`:""}${o.services.length?`<div class="service-list">${o.services.map(s=>`<span class="service-chip">${esc(s.name)}</span>`).join("")}</div>`:""}</div>`).join(""):'<p class="muted">لم تتم إضافة مكاتب لهذا الدور بعد.</p>'}</article>`).join("");
}
search.addEventListener("input",render);
loadDirectory();