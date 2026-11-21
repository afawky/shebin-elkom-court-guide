const { createClient } = supabase;
const db = createClient(window.SUPABASE_URL, window.SUPABASE_PUBLISHABLE_KEY);
const directory = document.getElementById("directory");
const search = document.getElementById("search");
let allFloors = [], allOffices = [], allServices = [], allOfficeImages = [];
let siteSettings = {};

function esc(value=""){return String(value).replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));}
async function loadDirectory(){
  directory.innerHTML='<div class="loading">جارٍ تحميل الدليل...</div>';
  const [f,o,s,settings,images] = await Promise.all([
    db.from("floors").select("*").eq("is_active",true).order("sort_order").order("name"),
    db.from("offices").select("*").eq("is_active",true).order("sort_order").order("name"),
    db.from("services").select("*").eq("is_active",true).order("name"),
    db.from("site_settings").select("*").eq("id",1),
    db.from("office_images").select("*").order("created_at")
  ]);
  const error = f.error || o.error || s.error || settings.error || images.error;
  if(error){directory.innerHTML='<div class="empty">تعذر تحميل البيانات. تأكد من إعداد قاعدة البيانات وسياسات القراءة.</div>';document.getElementById("status").textContent=error.message;return;}
  allFloors=f.data||[];allOffices=o.data||[];allServices=s.data||[];allOfficeImages=images.data||[];
  // site_settings uses one row (id=1) with named columns, not setting_key/setting_value pairs.
  const row = (settings.data||[])[0] || {};
  siteSettings = {
    site_title: row.site_title || "دليل محكمة شبين الكوم الابتدائية",
    site_subtitle: row.site_subtitle || "المحكمة الابتدائية",
    hero_title: row.hero_title || "كيف يمكننا مساعدتك؟",
    hero_description: row.hero_description || "ابحث عن الإدارة أو المكتب أو الخدمة التي تريد الوصول إليها داخل المحكمة.",
    footer_text: row.footer_text || "دليل إرشادي إلكتروني — محكمة شبين الكوم الابتدائية",
    phone: row.contact_phone || "",
    email: row.contact_email || "",
    address: row.contact_address || "",
    facebook: row.facebook_url || "",
    hero_image: row.hero_image_url || "",
    logo: row.logo_url || "",
    ministry_url: "https://moj.gov.eg/services/courts/10050004"
  };
  applySiteSettings();
  document.getElementById("floor-count").textContent=allFloors.length;
  document.getElementById("office-count").textContent=allOffices.length;
  document.getElementById("service-count").textContent=allServices.length;
  render();
}
function applySiteSettings(){
 const title=siteSettings.site_title||"دليل محكمة شبين الكوم الابتدائية";
 document.title=title;const brand=document.querySelector(".brand strong");if(brand)brand.textContent=title;
 const subtitle=document.querySelector(".brand small");if(subtitle&&siteSettings.site_subtitle)subtitle.textContent=siteSettings.site_subtitle;
 const heroTitle=document.querySelector(".hero h1");if(heroTitle&&siteSettings.hero_title)heroTitle.textContent=siteSettings.hero_title;
 const heroDesc=document.querySelector(".hero p");if(heroDesc&&siteSettings.hero_description)heroDesc.textContent=siteSettings.hero_description;
 const hero=document.querySelector(".hero");if(hero&&siteSettings.hero_image)hero.style.backgroundImage=`linear-gradient(90deg,rgba(12,45,39,.88),rgba(12,45,39,.72)),url("${siteSettings.hero_image}")`;
 const mark=document.querySelector(".brand-mark");if(mark&&siteSettings.logo)mark.innerHTML=`<img src="${siteSettings.logo}" alt="الشعار">`;
 const footer=document.querySelector("footer");if(footer){const parts=[siteSettings.phone&&`هاتف: ${siteSettings.phone}`,siteSettings.email&&`البريد: ${siteSettings.email}`,siteSettings.address,siteSettings.facebook&&`<a href="${siteSettings.facebook}" target="_blank" rel="noopener">فيسبوك</a>`,siteSettings.ministry_url&&`<a href="${siteSettings.ministry_url}" target="_blank" rel="noopener">خدمات وزارة العدل الإلكترونية</a>`].filter(Boolean);footer.innerHTML=`${parts.map(x=>`<span>${x}</span>`).join(" · ")}<div>${siteSettings.footer_text||"دليل إرشادي إلكتروني — محكمة شبين الكوم الابتدائية"}</div>`;}
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
  directory.innerHTML=shown.map(f=>`<article class="floor-card"><div class="floor-title"><h3>${esc(f.name)}</h3><span class="count">${f.offices.length} مكتب</span></div>${f.offices.length?f.offices.map(o=>`<div class="office"><h4>${esc(o.name)} ${o.room_number?`<span class="office-meta"> — غرفة ${esc(o.room_number)}</span>`:""}</h4>${o.location_description?`<p>${esc(o.location_description)}</p>`:""}${o.phone?`<div class="office-meta">هاتف: ${esc(o.phone)}</div>`:""}${o.services.length?`<div class="service-list">${o.services.map(s=>`<span class="service-chip">${esc(s.name)}</span>`).join("")}</div>`:""}${allOfficeImages.filter(im=>im.office_id===o.id).length?`<div class="office-gallery">${allOfficeImages.filter(im=>im.office_id===o.id).map(im=>`<a href="${esc(im.image_url)}" target="_blank" rel="noopener"><img src="${esc(im.image_url)}" alt="صورة ${esc(o.name)}" loading="lazy"></a>`).join("")}</div>`:""}</div>`).join(""):'<p class="muted">لم تتم إضافة مكاتب لهذا الدور بعد.</p>'}</article>`).join("");
}
search.addEventListener("input",render);
loadDirectory();