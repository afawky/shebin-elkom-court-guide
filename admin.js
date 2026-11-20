const {createClient}=supabase;
const db=createClient(window.SUPABASE_URL,window.SUPABASE_PUBLISHABLE_KEY);
const BUCKET="court-assets";
const $=id=>document.getElementById(id);
function msg(id,text,bad=false){$(id).textContent=text;$(id).style.color=bad?"#b34235":"#23695a";}
function esc(v=""){return String(v).replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));}
$("login-form").addEventListener("submit",async e=>{e.preventDefault();msg("login-message","جارٍ التحقق...");const {error}=await db.auth.signInWithPassword({email:$("email").value,password:$("password").value});if(error){msg("login-message","تعذر تسجيل الدخول: "+error.message,true);return;}await checkSession();});
async function checkSession(){
 const {data:{session}}=await db.auth.getSession();
 if(!session){$("login-panel").hidden=false;$("dashboard").hidden=true;return;}
 const {data,error}=await db.rpc("is_court_admin");
 if(error||data!==true){await db.auth.signOut();$("login-panel").hidden=false;$("dashboard").hidden=true;msg("login-message","هذا الحساب ليس لديه صلاحية مدير. راجع تسجيله في admin_users.",true);return;}
 $("login-panel").hidden=true;$("dashboard").hidden=false;$("whoami").textContent=session.user.email||"تم تسجيل الدخول";await refreshAll();await loadSiteSettings();
}
$("logout").addEventListener("click",async()=>{await db.auth.signOut();await checkSession();});
$("refresh").addEventListener("click",refreshAll);
async function refreshAll(){
 const [f,o,s,i]=await Promise.all([db.from("floors").select("*").order("sort_order"),db.from("offices").select("*").order("name"),db.from("services").select("*").order("name"),db.from("office_images").select("*").order("sort_order")]);
 const error=f.error||o.error||s.error||i.error;if(error){msg("admin-message",error.message,true);return;}
 window.floors=f.data||[];window.offices=o.data||[];window.services=s.data||[];window.images=i.data||[];
 $("office-floor").innerHTML=window.floors.map(x=>`<option value="${x.id}">${esc(x.name)}</option>`).join("");
 ["service-office","image-office"].forEach(id=>$(id).innerHTML=window.offices.map(x=>`<option value="${x.id}">${esc(x.name)}</option>`).join(""));
 renderRecords();
}
$("floor-form").addEventListener("submit",async e=>{e.preventDefault();const {error}=await db.from("floors").insert({name:$("floor-name").value.trim(),description:$("floor-desc").value.trim()||null});if(error)msg("admin-message",error.message,true);else{$("floor-form").reset();msg("admin-message","تمت إضافة الدور.");await refreshAll();}});
$("office-form").addEventListener("submit",async e=>{e.preventDefault();const {error}=await db.from("offices").insert({name:$("office-name").value.trim(),floor_id:$("office-floor").value,room_number:$("office-room").value.trim()||null,location_description:$("office-location").value.trim()||null,phone:$("office-phone").value.trim()||null});if(error)msg("admin-message",error.message,true);else{$("office-form").reset();msg("admin-message","تمت إضافة المكتب.");await refreshAll();}});
$("service-form").addEventListener("submit",async e=>{e.preventDefault();const {error}=await db.from("services").insert({office_id:$("service-office").value,name:$("service-name").value.trim(),description:$("service-desc").value.trim()||null});if(error)msg("admin-message",error.message,true);else{$("service-form").reset();msg("admin-message","تمت إضافة الخدمة.");await refreshAll();}});
async function uploadAsset(file,folder){
 if(!["image/jpeg","image/png","image/webp"].includes(file.type))throw new Error("يسمح فقط بصور JPG وPNG وWEBP");
 if(file.size>5*1024*1024)throw new Error("حجم الصورة يجب ألا يتجاوز 5 ميجابايت");
 const safe=file.name.replace(/[^a-zA-Z0-9._-]/g,"-");const path=`${folder}/${Date.now()}-${safe}`;
 const {error}=await db.storage.from(BUCKET).upload(path,file,{cacheControl:"3600",upsert:false,contentType:file.type});if(error)throw error;
 return db.storage.from(BUCKET).getPublicUrl(path).data.publicUrl;
}
$("image-form").addEventListener("submit",async e=>{
 e.preventDefault();const files=[...$("office-files").files];if(!files.length)return;msg("admin-message","جارٍ رفع الصور...");
 try{for(const file of files){const url=await uploadAsset(file,$("image-office").value);const {error}=await db.from("office_images").insert({office_id:$("image-office").value,image_url:url,description:file.name});if(error)throw error;}
 $("image-form").reset();msg("admin-message","تم رفع الصور وربطها بالمكتب.");await refreshAll();
 }catch(err){msg("admin-message","تعذر رفع الصور: "+err.message,true);}
});
async function loadSiteSettings(){
 const {data,error}=await db.from("site_settings").select("*").eq("id",1).maybeSingle();if(error){msg("admin-message","إعدادات الموقع غير جاهزة: "+error.message,true);return;}
 const d=data||{};const map={"setting-title":"site_title","setting-subtitle":"site_subtitle","setting-hero-title":"hero_title","setting-hero-description":"hero_description","setting-footer":"footer_text","setting-phone":"contact_phone","setting-email":"contact_email","setting-address":"contact_address","setting-facebook":"facebook_url"};
 Object.entries(map).forEach(([id,key])=>$(id).value=d[key]||"");
}
$("settings-form").addEventListener("submit",async e=>{
 e.preventDefault();msg("admin-message","جارٍ حفظ إعدادات الموقع...");
 try{const {data:old}=await db.from("site_settings").select("*").eq("id",1).maybeSingle();let logo=old?.logo_url||null,hero=old?.hero_image_url||null;
 const logoFile=$("setting-logo").files[0],heroFile=$("setting-hero-image").files[0];if(logoFile)logo=await uploadAsset(logoFile,"site");if(heroFile)hero=await uploadAsset(heroFile,"site");
 const row={id:1,site_title:$("setting-title").value.trim(),site_subtitle:$("setting-subtitle").value.trim(),hero_title:$("setting-hero-title").value.trim(),hero_description:$("setting-hero-description").value.trim(),footer_text:$("setting-footer").value.trim(),contact_phone:$("setting-phone").value.trim(),contact_email:$("setting-email").value.trim(),contact_address:$("setting-address").value.trim(),facebook_url:$("setting-facebook").value.trim(),logo_url:logo,hero_image_url:hero,updated_at:new Date().toISOString()};
 const {error}=await db.from("site_settings").upsert(row);if(error)throw error;$("settings-form").reset();await loadSiteSettings();msg("admin-message","تم حفظ إعدادات الموقع بنجاح.");
 }catch(err){msg("admin-message","تعذر حفظ الإعدادات: "+err.message,true);}
});
function renderRecords(){
 const floorRows=window.floors.map(f=>`<div class="record-row"><div><strong>${esc(f.name)}</strong><small>${f.is_active?"مفعل":"مخفي"}</small></div><div class="record-actions"><button class="secondary" onclick="toggleFloor('${f.id}',${!f.is_active})">${f.is_active?"إخفاء":"تفعيل"}</button><button class="danger" onclick="deleteFloor('${f.id}')">حذف</button></div></div>`).join("");
 const officeRows=window.offices.map(o=>{const floor=window.floors.find(f=>f.id===o.floor_id),imgs=window.images.filter(i=>i.office_id===o.id);return `<div class="record-row"><div class="record-main"><strong>${esc(o.name)} ${o.room_number?`— غرفة ${esc(o.room_number)}`:""}</strong><small>${esc(floor?.name||"دون دور محدد")} · ${imgs.length} صورة ${o.is_active?"":"· مخفي"}</small><div class="inline-edit"><input id="rename-${o.id}" value="${esc(o.name)}" aria-label="اسم المكتب"><button class="secondary" onclick="renameOffice('${o.id}')">تعديل الاسم</button></div>${imgs.length?`<div class="admin-thumbs">${imgs.map(im=>`<div><img src="${esc(im.image_url)}" alt=""><button class="danger" onclick="deleteImage('${im.id}')">حذف الصورة</button></div>`).join("")}</div>`:""}</div><div class="record-actions"><button class="secondary" onclick="toggleOffice('${o.id}',${!o.is_active})">${o.is_active?"إخفاء":"تفعيل"}</button><button class="danger" onclick="deleteOffice('${o.id}')">حذف المكتب</button></div></div>`;}).join("");
 $("admin-records").innerHTML=`<div class="record-group"><h3>الأدوار</h3>${floorRows||'<p class="muted">لا توجد أدوار.</p>'}</div><div class="record-group"><h3>المكاتب وصورها</h3>${officeRows||'<p class="muted">لا توجد مكاتب.</p>'}</div>`;
}
async function act(query,success){const {error}=await query;if(error)msg("admin-message",error.message,true);else{msg("admin-message",success);await refreshAll();}}
window.renameOffice=id=>act(db.from("offices").update({name:$("rename-"+id).value.trim()}).eq("id",id),"تم تعديل اسم المكتب.");
window.toggleOffice=(id,v)=>act(db.from("offices").update({is_active:v}).eq("id",id),v?"تم تفعيل المكتب.":"تم إخفاء المكتب.");
window.toggleFloor=(id,v)=>act(db.from("floors").update({is_active:v}).eq("id",id),v?"تم تفعيل الدور.":"تم إخفاء الدور.");
window.deleteOffice=id=>{if(confirm("حذف المكتب وخدماته وصوره المرتبطة؟"))act(db.from("offices").delete().eq("id",id),"تم حذف المكتب.");};
window.deleteFloor=id=>{if(confirm("حذف الدور؟"))act(db.from("floors").delete().eq("id",id),"تم حذف الدور.");};
window.deleteImage=async id=>{const im=window.images.find(x=>x.id===id);if(!confirm("حذف الصورة من الدليل؟"))return;const {error}=await db.from("office_images").delete().eq("id",id);if(error){msg("admin-message",error.message,true);return;}if(im?.image_url){const marker=`/storage/v1/object/public/${BUCKET}/`,pos=im.image_url.indexOf(marker);if(pos>=0)await db.storage.from(BUCKET).remove([decodeURIComponent(im.image_url.slice(pos+marker.length))]);}msg("admin-message","تم حذف الصورة.");await refreshAll();};
db.auth.onAuthStateChange(()=>setTimeout(checkSession,0));checkSession();
