const { createClient } = supabase;
const db = createClient(window.SUPABASE_URL, window.SUPABASE_PUBLISHABLE_KEY);
const directory = document.getElementById("directory");
const search = document.getElementById("search");
let allFloors = [], allOffices = [], allServices = [], allImages = [];

function esc(value=""){return String(value).replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));}
async function loadSettings(){
  const {data,error}=await db.from("site_settings").select("*").eq("id",1).maybeSingle();
  if(error||!data)return;
  document.getElementById("site-title").textContent=data.site_title||"دليل محكمة شبين الكوم";
  document.getElementById("site-subtitle").textContent=data.site_subtitle||"المحكمة الابتدائية";
  document.getElementById("hero-title").textContent=data.hero_title||"كيف يمكننا مساعدتك؟";
  document.getElementById("hero-description").textContent=data.hero_description||"ابحث عن الإدارة أو المكتب أو الخدمة التي تريد الوصول إليها داخل المحكمة.";
  document.getElementById("footer-text").textContent=data.footer_text||"دليل إرشادي إلكتروني — محكمة شبين الكوم الابتدائية";
  if(data.logo_url){const logo=document.getElementById("site-logo");logo.src=data.logo_url;logo.hidden=false;document.getElementById("brand-fallback").hidden=true;}
  if(data.hero_image_url)document.getElementById("hero").style.backgroundImage=`linear-gradient(90deg,rgba(13,54,47,.88),rgba(18,70,59,.82)),url("${data.hero_image_url}")`;
  const links=[];if(data.contact_phone)links.push(`<span>هاتف: ${esc(data.contact_phone)}</span>`);if(data.contact_email)links.push(`<a href="mailto:${encodeURIComponent(data.contact_email)}">${esc(data.contact_email)}</a>`);if(data.contact_address)links.push(`<span>${esc(data.contact_address)}</span>`);if(data.facebook_url)links.push(`<a href="${esc(data.facebook_url)}" target="_blank" rel="noopener">صفحتنا على فيسبوك</a>`);document.getElementById("contact-details").innerHTML=links.join(" • ");
}
async function loadDirectory(){
  directory.innerHTML='<div class="loading">جارٍ تحميل الدليل...</div>';
  const [f,o,s,i] = await Promise.all([
    db.from("floors").select("*").eq("is_active",true).order("sort_order").order("name"),
    db.from("offices").select("*").eq("is_active",true).order("sort_order").order("name"),
    db.from("services").select("*").eq("is_active",true).order("name"),
    db.from("office_images").select("*").order("sort_order")
  ]);
  const error = f.error || o.error || s.error || i.error;
  if(error){directory.innerHTML='<div class="empty">تعذر تحميل البيانات. تأكد من إعداد قاعدة البيانات وسياسات القراءة.</div>';document.getElementById("status").textContent=error.message;return;}
  allFloors=f.data||[];allOffices=o.data||[];allServices=s.data||[]; allImages=i.data||[];
  document.getElementById("floor-count").textContent=allFloors.length;
  document.getElementById("office-count").textContent=allOffices.length;
  document.getElementById("service-count").textContent=allServices.length;
  render();
}
function render(){
  const q=(search.value||"").trim().toLowerCase();
  const floors=allFloors.map(f=>{
    const offices=allOffices.filter(o=>o.floor_id===f.id).map(o=>({...o,services:allServices.filter(s=>s.office_id===o.id),images:allImages.filter(i=>i.office_id===o.id)}))
      .filter(o=>!q||[o.name,o.room_number,o.location_description,o.services.map(s=>s.name+" "+(s.description||"")).join(" ")].join(" ").toLowerCase().includes(q));
    const floorMatch=!q||f.name.toLowerCase().includes(q);
    return {...f,offices:floorMatch&&!q?offices:offices};
  }).filter(f=>f.offices.length||(!q&&true));
  const shown=floors.filter(f=>!q||f.offices.length||f.name.toLowerCase().includes(q));
  document.getElementById("result-count").textContent=`${shown.reduce((n,f)=>n+f.offices.length,0)} مكتب`;
  if(!shown.length){directory.innerHTML='<div class="empty">لا توجد نتائج مطابقة لبحثك.</div>';return;}
  directory.innerHTML=shown.map(f=>`<article class="floor-card"><div class="floor-title"><h3>${esc(f.name)}</h3><span class="count">${f.offices.length} مكتب</span></div>${f.offices.length?f.offices.map(o=>`<div class="office">${o.images.length?`<div class="office-gallery">${o.images.map(im=>`<a href="${esc(im.image_url)}" target="_blank" rel="noopener"><img src="${esc(im.image_url)}" alt="${esc(im.description||o.name)}" loading="lazy"></a>`).join("")}</div>`:""}<h4>${esc(o.name)} ${o.room_number?`<span class="office-meta"> — غرفة ${esc(o.room_number)}</span>`:""}</h4>${o.location_description?`<p>${esc(o.location_description)}</p>`:""}${o.phone?`<div class="office-meta">هاتف: ${esc(o.phone)}</div>`:""}${o.services.length?`<div class="service-list">${o.services.map(s=>`<span class="service-chip">${esc(s.name)}</span>`).join("")}</div>`:""}</div>`).join(""):'<p class="muted">لم تتم إضافة مكاتب لهذا الدور بعد.</p>'}</article>`).join("");
}
search.addEventListener("input",render);
loadSettings();
loadDirectory();