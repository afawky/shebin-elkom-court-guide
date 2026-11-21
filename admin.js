const { createClient } = supabase;
const db = createClient(window.SUPABASE_URL, window.SUPABASE_PUBLISHABLE_KEY);
const $ = id => document.getElementById(id);
const loginPanel=$("login-panel"), dashboard=$("dashboard");
function msg(id,text,isError=false){$(id).textContent=text;$(id).style.color=isError?"#b34235":"#23695a";}
function esc(value=""){return String(value).replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));}
$("login-form").addEventListener("submit",async e=>{
 e.preventDefault();msg("login-message","جارٍ التحقق...");
 const {error}=await db.auth.signInWithPassword({email:$("email").value,password:$("password").value});
 if(error){msg("login-message","تعذر تسجيل الدخول: "+error.message,true);return;}
 await checkSession();
});
async function checkSession(){
 const {data:{session}}=await db.auth.getSession();
 if(!session){loginPanel.hidden=false;dashboard.hidden=true;return;}
 const {data,isError,error}=await db.rpc("is_court_admin");
 if(error||data!==true){await db.auth.signOut();loginPanel.hidden=false;dashboard.hidden=true;msg("login-message","هذا الحساب ليس لديه صلاحية مدير. راجع تسجيله في admin_users.",true);return;}
 loginPanel.hidden=true;dashboard.hidden=false;$("whoami").textContent=session.user.email||"تم تسجيل الدخول";await refreshAll();
}
$("logout").addEventListener("click",async()=>{await db.auth.signOut();checkSession();});
$("refresh").addEventListener("click",refreshAll);
async function refreshAll(){
 const [f,o,s]=await Promise.all([db.from("floors").select("*").order("sort_order"),db.from("offices").select("*").order("name"),db.from("services").select("*").order("name")]);
 if(f.error||o.error||s.error){msg("admin-message",(f.error||o.error||s.error).message,true);return;}
 window.floors=f.data||[];window.offices=o.data||[];window.services=s.data||[];
 const imgs=await db.from("office_images").select("*").order("created_at");
 window.officeImages=imgs.data||[];
 $("office-floor").innerHTML=window.floors.map(x=>`<option value="${x.id}">${esc(x.name)}</option>`).join("");
 $("service-office").innerHTML=window.offices.map(x=>`<option value="${x.id}">${esc(x.name)}</option>`).join("");
 renderRecords();
 await loadSiteSettings();
}
$("floor-form").addEventListener("submit",async e=>{e.preventDefault();const {error}=await db.from("floors").insert({name:$("floor-name").value.trim(),description:$("floor-desc").value.trim()||null});if(error)msg("admin-message",error.message,true);else{$("floor-form").reset();msg("admin-message","تمت إضافة الدور.");await refreshAll();}});
$("office-form").addEventListener("submit",async e=>{e.preventDefault();const {error}=await db.from("offices").insert({name:$("office-name").value.trim(),floor_id:$("office-floor").value,room_number:$("office-room").value.trim()||null,location_description:$("office-location").value.trim()||null,phone:$("office-phone").value.trim()||null});if(error)msg("admin-message",error.message,true);else{$("office-form").reset();msg("admin-message","تمت إضافة المكتب.");await refreshAll();}});
$("service-form").addEventListener("submit",async e=>{e.preventDefault();const {error}=await db.from("services").insert({office_id:$("service-office").value,name:$("service-name").value.trim(),description:$("service-desc").value.trim()||null});if(error)msg("admin-message",error.message,true);else{$("service-form").reset();msg("admin-message","تمت إضافة الخدمة.");await refreshAll();}});

const settingDefaults={site_title:"دليل محكمة شبين الكوم الابتدائية",hero_title:"كيف يمكننا مساعدتك؟",hero_description:"ابحث عن الإدارة أو المكتب أو الخدمة التي تريد الوصول إليها داخل المحكمة.",phone:"",email:"",address:"",facebook:"",ministry_url:"https://moj.gov.eg/services/courts/10050004",footer_text:"دليل إرشادي إلكتروني — محكمة شبين الكوم الابتدائية",hero_image:"",logo:"",background_mode:"color",background_color:"#f4f7f5",background_image:""};
let siteSettings={...settingDefaults};
async function loadSiteSettings(){
 const {data,error}=await db.from("site_settings").select("*").eq("id",1).maybeSingle();
 if(error){msg("admin-message","تعذر قراءة إعدادات الموقع: "+error.message,true);return;}
 if(data){
  siteSettings={...settingDefaults,
   site_title:data.site_title??settingDefaults.site_title,
   hero_title:data.hero_title??settingDefaults.hero_title,
   hero_description:data.hero_description??settingDefaults.hero_description,
   footer_text:data.footer_text??settingDefaults.footer_text,
   phone:data.contact_phone??"", email:data.contact_email??"", address:data.contact_address??"",
   facebook:data.facebook_url??"", hero_image:data.hero_image_url??"", logo:data.logo_url??"",
   background_mode:data.background_mode??settingDefaults.background_mode,
   background_color:data.background_color??settingDefaults.background_color,
   background_image:data.background_image_url??"",
   ministry_url:settingDefaults.ministry_url
  };
 }
 Object.keys(settingDefaults).forEach(k=>{const el=$("setting-"+k);if(el&&el.type!=="file")el.value=siteSettings[k]??settingDefaults[k];});
}
async function uploadAsset(file,folder){
 if(!file)return null;
 if(!file.type.startsWith("image/"))throw new Error("يرجى اختيار ملف صورة.");
 if(file.size>6*1024*1024)throw new Error("حجم الصورة أكبر من 6 ميجابايت.");
 const ext=(file.name.split(".").pop()||"jpg").toLowerCase().replace(/[^a-z0-9]/g,"");
 const path=`${folder}/${crypto.randomUUID()}.${ext||"jpg"}`;
 const {error}=await db.storage.from("court-assets").upload(path,file,{upsert:false,contentType:file.type});
 if(error)throw error;
 return db.storage.from("court-assets").getPublicUrl(path).data.publicUrl;
}
$("settings-form").addEventListener("submit",async e=>{
 e.preventDefault();msg("admin-message","جارٍ حفظ الإعدادات...");
 try{
  const keys=Object.keys(settingDefaults).filter(k=>!["hero_image","logo","background_image"].includes(k));
  const values={};keys.forEach(k=>{const el=$("setting-"+k);values[k]=el.type==="color"?el.value:el.value.trim();});
  for(const [key,folder] of [["hero_image","site"],["logo","site"],["background_image","site"]]){const file=$("setting-"+key).files[0];if(file)values[key]=await uploadAsset(file,folder);else values[key]=siteSettings[key]||"";}
  const row={
   site_title:values.site_title, hero_title:values.hero_title, hero_description:values.hero_description,
   footer_text:values.footer_text, contact_phone:values.phone, contact_email:values.email,
   contact_address:values.address, facebook_url:values.facebook,
   hero_image_url:values.hero_image||null, logo_url:values.logo||null,
   background_mode:values.background_mode,
   background_color:values.background_color,
   background_image_url:values.background_image||null,
   updated_at:new Date().toISOString()
  };
  const {error}=await db.from("site_settings").update(row).eq("id",1);
  if(error)throw error;
  siteSettings={...siteSettings,...values};msg("admin-message","تم حفظ إعدادات الموقع بنجاح.");
 }catch(err){msg("admin-message","تعذر الحفظ: "+err.message,true);}
});
window.uploadOfficeImages=async officeId=>{
 const input=$("office-files-"+officeId);const files=[...(input?.files||[])];if(!files.length){msg("admin-message","اختر صورة واحدة على الأقل.",true);return;}
 try{for(const file of files){const url=await uploadAsset(file,`offices/${officeId}`);const path=url.split("/court-assets/")[1];const {error}=await db.from("office_images").insert({office_id:officeId,image_url:url,storage_path:path});if(error)throw error;}
  msg("admin-message","تم رفع صور المكتب.");if(input)input.value="";await refreshAll();
 }catch(err){msg("admin-message","تعذر رفع الصور: "+err.message,true);}
};
window.deleteOfficeImage=async imageId=>{
 const item=(window.officeImages||[]).find(x=>x.id===imageId);if(!item||!confirm("حذف هذه الصورة؟"))return;
 const {error}=await db.from("office_images").delete().eq("id",imageId);if(error){msg("admin-message",error.message,true);return;}
 if(item.storage_path)await db.storage.from("court-assets").remove([item.storage_path]);msg("admin-message","تم حذف الصورة.");await refreshAll();
};

function renderRecords(){
 const officeRows=window.offices.map(o=>{const floor=window.floors.find(f=>f.id===o.floor_id);const services=window.services.filter(s=>s.office_id===o.id);return `<div class="record-row"><div><strong>${esc(o.name)} ${o.room_number?`— غرفة ${esc(o.room_number)}`:""}</strong><small>${esc(floor?.name||"دون دور محدد")} · ${services.length} خدمة ${o.is_active?"":"· مخفي"}</small><div class="inline-edit"><input id="rename-${o.id}" value="${esc(o.name)}" aria-label="اسم المكتب"><button class="secondary" onclick="renameOffice('${o.id}')">تعديل الاسم</button></div><div class="office-photo-admin">${(window.officeImages||[]).filter(im=>im.office_id===o.id).map(im=>`<span class="admin-thumb"><img src="${esc(im.image_url)}" alt=""><button type="button" class="danger" onclick="deleteOfficeImage('${im.id}')">×</button></span>`).join("")}<input id="office-files-${o.id}" type="file" accept="image/*" multiple aria-label="صور المكتب"><button class="secondary" onclick="uploadOfficeImages('${o.id}')">رفع صور المكتب</button></div></div><div class="record-actions"><button class="secondary" onclick="toggleOffice('${o.id}',${!o.is_active})">${o.is_active?"إخفاء":"تفعيل"}</button><button class="danger" onclick="deleteOffice('${o.id}')">حذف</button></div></div>`;}).join("");
 const floorRows=window.floors.map(f=>`<div class="record-row"><div><strong>${esc(f.name)}</strong><small>${f.is_active?"مفعل":"مخفي"}</small></div><div class="record-actions"><button class="secondary" onclick="toggleFloor('${f.id}',${!f.is_active})">${f.is_active?"إخفاء":"تفعيل"}</button><button class="danger" onclick="deleteFloor('${f.id}')">حذف</button></div></div>`).join("");
 $("admin-records").innerHTML=`<div class="record-group"><h3>الأدوار</h3>${floorRows||'<p class="muted">لا توجد أدوار بعد.</p>'}</div><div class="record-group"><h3>المكاتب</h3>${officeRows||'<p class="muted">لا توجد مكاتب بعد.</p>'}</div>`;
}
async function act(query,success){const {error}=await query;if(error)msg("admin-message",error.message,true);else{msg("admin-message",success);await refreshAll();}}
window.renameOffice=(id)=>act(db.from("offices").update({name:$("rename-"+id).value.trim()}).eq("id",id),"تم تعديل اسم المكتب.");
window.toggleOffice=(id,value)=>act(db.from("offices").update({is_active:value}).eq("id",id),value?"تم تفعيل المكتب.":"تم إخفاء المكتب.");
window.toggleFloor=(id,value)=>act(db.from("floors").update({is_active:value}).eq("id",id),value?"تم تفعيل الدور.":"تم إخفاء الدور.");
window.deleteOffice=(id)=>{if(confirm("هل أنت متأكد من حذف المكتب؟ سيتم حذف خدماته المرتبطة أيضًا."))act(db.from("offices").delete().eq("id",id),"تم حذف المكتب.");};
window.deleteFloor=(id)=>{if(confirm("هل أنت متأكد من حذف الدور؟"))act(db.from("floors").delete().eq("id",id),"تم حذف الدور.");};
db.auth.onAuthStateChange(()=>setTimeout(checkSession,0));
checkSession();