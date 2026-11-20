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
 $("office-floor").innerHTML=window.floors.map(x=>`<option value="${x.id}">${esc(x.name)}</option>`).join("");
 $("service-office").innerHTML=window.offices.map(x=>`<option value="${x.id}">${esc(x.name)}</option>`).join("");
 renderRecords();
}
$("floor-form").addEventListener("submit",async e=>{e.preventDefault();const {error}=await db.from("floors").insert({name:$("floor-name").value.trim(),description:$("floor-desc").value.trim()||null});if(error)msg("admin-message",error.message,true);else{$("floor-form").reset();msg("admin-message","تمت إضافة الدور.");await refreshAll();}});
$("office-form").addEventListener("submit",async e=>{e.preventDefault();const {error}=await db.from("offices").insert({name:$("office-name").value.trim(),floor_id:$("office-floor").value,room_number:$("office-room").value.trim()||null,location_description:$("office-location").value.trim()||null,phone:$("office-phone").value.trim()||null});if(error)msg("admin-message",error.message,true);else{$("office-form").reset();msg("admin-message","تمت إضافة المكتب.");await refreshAll();}});
$("service-form").addEventListener("submit",async e=>{e.preventDefault();const {error}=await db.from("services").insert({office_id:$("service-office").value,name:$("service-name").value.trim(),description:$("service-desc").value.trim()||null});if(error)msg("admin-message",error.message,true);else{$("service-form").reset();msg("admin-message","تمت إضافة الخدمة.");await refreshAll();}});
function renderRecords(){
 const officeRows=window.offices.map(o=>{const floor=window.floors.find(f=>f.id===o.floor_id);const services=window.services.filter(s=>s.office_id===o.id);return `<div class="record-row"><div><strong>${esc(o.name)} ${o.room_number?`— غرفة ${esc(o.room_number)}`:""}</strong><small>${esc(floor?.name||"دون دور محدد")} · ${services.length} خدمة ${o.is_active?"":"· مخفي"}</small><div class="inline-edit"><input id="rename-${o.id}" value="${esc(o.name)}" aria-label="اسم المكتب"><button class="secondary" onclick="renameOffice('${o.id}')">تعديل الاسم</button></div></div><div class="record-actions"><button class="secondary" onclick="toggleOffice('${o.id}',${!o.is_active})">${o.is_active?"إخفاء":"تفعيل"}</button><button class="danger" onclick="deleteOffice('${o.id}')">حذف</button></div></div>`;}).join("");
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