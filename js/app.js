import { loadDB, saveDB, getSession, setSession, clearSession, resetDB, uid, todayJalali, nowText, normalizeJalali, compareJalali, formatJalali, compactJalali, toPersianDigits, jalaliMonthLength, jalaliToGregorian } from "./storage.js";

let db = loadDB();
let currentUserId = getSession();
let currentView = "dashboard";
let editingTaskId = "";
let dashboardFilter = "open";
let reportSearch = "";
let pickerTarget = "";
let pickerY = Number(todayJalali().split("/")[0]);
let pickerM = Number(todayJalali().split("/")[1]);
let selectedPickerValue = todayJalali();

const app = document.getElementById("app");
const monthNames = ["فروردین","اردیبهشت","خرداد","تیر","مرداد","شهریور","مهر","آبان","آذر","دی","بهمن","اسفند"];
const weekNames = ["ش","ی","د","س","چ","پ","ج"];

function userName(id){ return db.users.find(u=>u.id===id)?.name || "-"; }
function assetName(id){ return db.assets.find(a=>a.id===id)?.name || "-"; }
function currentUser(){ return db.users.find(u=>u.id===currentUserId); }

function icon(name){
  const icons = {
    menu:`<svg viewBox="0 0 24 24"><path d="M4 6h16M4 12h16M4 18h16"/></svg>`,
    user:`<svg viewBox="0 0 24 24"><path d="M20 21a8 8 0 0 0-16 0"/><circle cx="12" cy="7" r="4"/></svg>`,
    home:`<svg viewBox="0 0 24 24"><path d="M3 11l9-8 9 8"/><path d="M5 10v10h14V10"/></svg>`,
    tasks:`<svg viewBox="0 0 24 24"><rect x="4" y="4" width="16" height="16" rx="2"/><path d="M8 12l2 2 5-5"/></svg>`,
    plus:`<svg viewBox="0 0 24 24"><path d="M12 5v14M5 12h14"/></svg>`,
    calendar:`<svg viewBox="0 0 24 24"><rect x="3" y="5" width="18" height="16" rx="2"/><path d="M16 3v4M8 3v4M3 10h18"/></svg>`,
    people:`<svg viewBox="0 0 24 24"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>`,
    wrench:`<svg viewBox="0 0 24 24"><path d="M14.7 6.3a4 4 0 0 0-5.4 5.4L3 18l3 3 6.3-6.3a4 4 0 0 0 5.4-5.4l-3 3-3-3 3-3z"/></svg>`,
    chart:`<svg viewBox="0 0 24 24"><path d="M4 19V5"/><path d="M4 19h16"/><rect x="7" y="10" width="3" height="6"/><rect x="12" y="7" width="3" height="9"/><rect x="17" y="12" width="3" height="4"/></svg>`,
    logout:`<svg viewBox="0 0 24 24"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><path d="M16 17l5-5-5-5"/><path d="M21 12H9"/></svg>`
  };
  return icons[name] || "";
}

const menuItems = [
  ["dashboard","داشبورد","home"],
  ["tasks","وظایف","tasks"],
  ["newTask","تعریف وظیفه","plus"],
  ["daily","گزارش روزانه","calendar"],
  ["people","پرسنل","people"],
  ["assets","تجهیزات و PM","wrench"],
  ["reports","گزارش عملکرد","chart"]
];
const bottomItems = [["dashboard","خانه","home"],["tasks","وظایف","tasks"],["newTask","جدید","plus"],["daily","گزارش","calendar"]];

function canSeeTask(t){
  const u=currentUser(); if(!u) return false;
  if(u.level==="admin") return true;
  if(t.executorId===u.id || t.creatorId===u.id || (t.watcherIds||[]).includes(u.id)) return true;
  const subIds = db.users.filter(x=>x.managerId===u.id).map(x=>x.id);
  return subIds.includes(t.executorId);
}
function canEditTask(t){ const u=currentUser(); return !!u && (u.level==="admin" || t.creatorId===u.id); }
function canDeleteTask(t){ const u=currentUser(); return !!u && (u.level==="admin" || t.creatorId===u.id); }
function canDoTask(t){ const u=currentUser(); return !!u && (u.level==="admin" || t.executorId===u.id); }
function isLate(t){ return t.status!=="done" && compareJalali(t.dueDate,todayJalali())<0; }
function visibleTasks(){ return db.tasks.filter(canSeeTask); }
function val(id){ return document.getElementById(id)?.value || ""; }
function esc(s=""){ return String(s).replace(/[&<>"]/g, c=>({"&":"&amp;","<":"&lt;",">":"&gt;","\"":"&quot;"}[c])); }

function render(){
  if(!currentUserId || !currentUser()){ renderLogin(); return; }
  app.className="app";
  app.innerHTML = `
    <div class="drawer-backdrop" id="drawerBackdrop"></div>
    <aside class="drawer" id="drawer">
      <div class="drawer-profile"><div class="avatar">${icon("user")}</div><b>${esc(currentUser().name)}</b><span>${esc(currentUser().role)}</span></div>
      <div class="drawer-nav">${menuItems.map(m=>drawerBtn(m[0],m[1],m[2])).join("")}</div>
      <div class="drawer-spacer"></div>
      <div class="drawer-nav"><button id="logoutBtn"><span class="drawer-icon">${icon("logout")}</span><span>خروج</span></button></div>
    </aside>
    <header class="topbar">
      <div class="toprow"><div></div><div class="title"><h1>TAK Duty Control</h1><small>سبک تلگرام، وظایف و گزارش کارخانه</small></div><button class="icon-btn" id="menuBtn">${icon("menu")}</button></div>
      <div class="userline">${esc(currentUser().name)} • ${esc(currentUser().role)}</div>
    </header>
    <main class="main" id="view"></main>
    <nav class="bottom-nav">${bottomItems.map(m=>bottomBtn(m[0],m[1],m[2])).join("")}</nav>
    ${jalaliPickerHTML()}
  `;
  const drawer=document.getElementById("drawer"), backdrop=document.getElementById("drawerBackdrop");
  const openDrawer=()=>{drawer.classList.add("show");backdrop.classList.add("show")};
  const closeDrawer=()=>{drawer.classList.remove("show");backdrop.classList.remove("show")};
  document.getElementById("menuBtn").onclick=openDrawer;
  backdrop.onclick=closeDrawer;
  document.getElementById("logoutBtn").onclick=()=>{clearSession();currentUserId="";render();};
  document.querySelectorAll("[data-view]").forEach(b=>b.onclick=()=>{currentView=b.dataset.view;if(currentView!=="newTask")editingTaskId="";closeDrawer();render();});
  renderView();
}
function drawerBtn(id,label,ic){ return `<button class="${currentView===id?'active':''}" data-view="${id}"><span class="drawer-icon">${icon(ic)}</span><span>${label}</span></button>`; }
function bottomBtn(id,label,ic){ return `<button class="${currentView===id?'active':''}" data-view="${id}">${icon(ic)}<span>${label}</span></button>`; }

function renderLogin(){
  app.className="login";
  app.innerHTML = `<div class="card"><h2>ورود</h2><p class="muted">نسخه آفلاین آزمایشی. فعلاً بدون رمز.</p><label>کاربر</label><select id="loginUser">${db.users.filter(u=>u.active).map(u=>`<option value="${u.id}">${esc(u.name)} - ${esc(u.role)}</option>`).join("")}</select><div class="actions"><button class="btn primary full" id="loginBtn">ورود</button><button class="btn gray full" id="resetBtn">ریست دیتای تست</button></div></div>`;
  document.getElementById("loginBtn").onclick=()=>{currentUserId=val("loginUser");setSession(currentUserId);render();};
  document.getElementById("resetBtn").onclick=()=>{if(confirm("کل دیتای آفلاین پاک شود؟")){resetDB();db=loadDB();currentUserId="";renderLogin();}};
}

function renderView(){
  const view=document.getElementById("view");
  if(currentView==="dashboard") view.innerHTML=dashboardHTML();
  if(currentView==="tasks") view.innerHTML=tasksHTML();
  if(currentView==="newTask") view.innerHTML=newTaskHTML();
  if(currentView==="daily") view.innerHTML=dailyHTML();
  if(currentView==="people") view.innerHTML=peopleHTML();
  if(currentView==="assets") view.innerHTML=assetsHTML();
  if(currentView==="reports") view.innerHTML=reportsHTML();
  bindEvents();
}

function dashboardHTML(){
  const tasks=visibleTasks();
  const open=tasks.filter(t=>t.status!=="done").length;
  const done=tasks.filter(t=>t.status==="done").length;
  const late=tasks.filter(isLate).length;
  const today=tasks.filter(t=>t.dueDate===todayJalali() && t.status!=="done").length;
  let filtered=tasks;
  if(dashboardFilter==="open") filtered=tasks.filter(t=>t.status!=="done");
  if(dashboardFilter==="today") filtered=tasks.filter(t=>t.dueDate===todayJalali() && t.status!=="done");
  if(dashboardFilter==="late") filtered=tasks.filter(isLate);
  if(dashboardFilter==="done") filtered=tasks.filter(t=>t.status==="done");
  const titleMap={open:"کارهای باز",today:"کارهای امروز",late:"کارهای عقب‌افتاده",done:"کارهای انجام‌شده"};
  return `<div class="kpis">${kpi("باز",open,"open")}${kpi("امروز",today,"today")}${kpi("عقب‌افتاده",late,"late")}${kpi("انجام",done,"done")}</div><div class="card"><h2>${titleMap[dashboardFilter]||"کارها"}</h2>${taskList(filtered)}</div>`;
}
function kpi(title,num,filter){ return `<button class="kpi ${dashboardFilter===filter?'active':''}" data-dash-filter="${filter}"><div class="num">${toPersianDigits(num)}</div><div class="lbl">${title}</div></button>`; }

function taskList(tasks){
  if(!tasks.length) return `<div class="muted empty-state">وظیفه‌ای وجود ندارد.</div>`;
  return `<div class="list">${tasks.map(t=>`<div class="task-row"><span class="dot ${isLate(t)?'late':t.status}"></span><div class="task-main"><div class="task-title">${esc(t.title)}</div><div class="task-sub">${esc(t.location||'-')} • ${esc(t.type||'-')}</div></div><div class="task-person">${esc(userName(t.executorId))}</div><div class="task-date">${compactJalali(t.dueDate)}</div><div class="more"><button class="more-btn" data-menu="${t.id}">⋮</button><div class="action-menu" id="menu_${t.id}">${t.status!=="done"&&canDoTask(t)?`<button data-done="${t.id}">انجام شد</button>`:""}${canEditTask(t)?`<button data-edit="${t.id}">ادیت</button>`:""}<button data-detail="${t.id}">جزئیات</button>${canDeleteTask(t)?`<button class="danger" data-delete="${t.id}">حذف</button>`:""}</div></div></div>`).join("")}</div>`;
}
function tasksHTML(){ return `<div class="card"><h2>وظایف</h2><p class="muted">لیست فشرده؛ ادیت، حذف و انجام از سه‌نقطه.</p>${taskList(visibleTasks())}</div>`; }

function newTaskHTML(){
  const t=editingTaskId?db.tasks.find(x=>x.id===editingTaskId):null, isEdit=!!t;
  if(isEdit && !canEditTask(t)){editingTaskId="";return `<div class="card"><h2>دسترسی غیرمجاز</h2><p class="muted">فقط مدیرعامل یا ایجادکننده وظیفه می‌تواند آن را ویرایش کند.</p></div>`;}
  return `<div class="card"><h2>${isEdit?"ادیت وظیفه":"وظیفه جدید"}</h2><div class="form-grid"><div class="full"><label>عنوان</label><input id="taskTitle" value="${esc(t?.title||"")}"></div><div><label>مسئول اجرا</label>${userSelect("taskExecutor",t?.executorId)}</div><div><label>مهلت شمسی</label><input id="taskDue" data-date-input value="${formatJalali(t?.dueDate||todayJalali())}" readonly></div><div><label>بخش / واحد سازمانی</label>${simpleSelect("taskDept",db.departments,t?.department)}</div><div><label>محل</label>${simpleSelect("taskLocation",db.locations,t?.location)}</div><div><label>نوع</label>${simpleSelect("taskType",["روزانه","هفتگی","ماهانه","سالیانه","تاریخ مشخص","فوری","بازدیدی","PM"],t?.type)}</div><div><label>اولویت</label>${simpleSelect("taskPriority",["عادی","بالا","بحرانی"],t?.priority)}</div><div><label>تجهیزات مرتبط</label>${assetSelect("taskAsset",t?.assetId)}</div><div><label>نیاز به عکس؟</label>${simpleSelect("taskPhoto",["خیر","بله"],t?.needPhoto?"بله":"خیر")}</div><div class="full"><label>پیگیرها / ناظرها</label>${multiUserCheckboxes("watchers",t?.watcherIds||[])}</div><div class="full"><label>شرح کار</label><textarea id="taskDesc">${esc(t?.description||"")}</textarea></div></div><div class="actions"><button class="btn primary full" id="saveTask">${isEdit?"ذخیره ادیت":"ثبت وظیفه"}</button>${isEdit?`<button class="btn gray full" id="cancelEdit">انصراف</button>`:""}</div></div>`;
}
function userSelect(id,selected=""){return `<select id="${id}">${db.users.filter(u=>u.active).map(u=>`<option value="${u.id}" ${selected===u.id?'selected':''}>${esc(u.name)} - ${esc(u.role)}</option>`).join("")}</select>`;}
function assetSelect(id,selected=""){return `<select id="${id}"><option value="">بدون دستگاه</option>${db.assets.map(a=>`<option value="${a.id}" ${selected===a.id?'selected':''}>${esc(a.name)}</option>`).join("")}</select>`;}
function simpleSelect(id,arr,selected=""){return `<select id="${id}">${arr.map(x=>`<option value="${esc(x)}" ${selected===x?'selected':''}>${esc(x)}</option>`).join("")}</select>`;}
function multiUserCheckboxes(name,selected=[]){return `<div class="checkbox-grid">${db.users.filter(u=>u.active).map(u=>`<label><input type="checkbox" name="${name}" value="${u.id}" ${selected.includes(u.id)?'checked':''}> <span>${esc(u.name)}</span></label>`).join("")}</div>`;}

function dailyHTML(){
  const myReports=db.dailyReports.filter(r=>r.userId===currentUserId);
  const q=reportSearch.trim();
  const filteredReports=q?myReports.filter(r=>(r.type||"").includes(q)||(r.text||"").includes(q)||formatJalali(r.date).includes(q)):myReports;
  return `<div class="card"><h2>گزارش روزانه</h2><div class="form-grid"><div><label>تاریخ شمسی</label><input id="repDate" data-date-input value="${formatJalali(todayJalali())}" readonly></div><div><label>نوع گزارش</label>${simpleSelect("repType",["عمومی","فروش","تعمیرات","نگهبانی","تولید","منابع انسانی"])}</div><div class="full"><label>شرح گزارش</label><textarea id="repText" placeholder="شرح گزارش را بنویس..."></textarea></div></div><div class="actions"><button class="btn primary full" id="saveReport">ثبت گزارش</button></div></div><div class="card"><h2>گزارش‌های من</h2><input id="reportSearch" class="search-input" placeholder="جستجو در نوع، شرح یا تاریخ..." value="${esc(reportSearch)}">${dailyTable(filteredReports)}</div>`;
}
function dailyTable(rows){
  if(!rows.length) return `<div class="muted empty-state">گزارشی وجود ندارد.</div>`;
  return `<div class="report-list">${rows.map(r=>`<div class="report-item"><div class="report-top"><b>${esc(r.type||'-')}</b><span>${formatJalali(r.date)}</span></div><div class="report-text">${esc(r.text||'-')}</div></div>`).join("")}</div>`;
}
function peopleHTML(){ return `<div class="card"><h2>پرسنل</h2><div class="form-grid"><div><label>نام</label><input id="personName"></div><div><label>سمت</label><input id="personRole"></div><div><label>بخش</label>${simpleSelect("personDept",db.departments)}</div><div><label>مدیر مستقیم</label>${userSelect("personManager")}</div><div><label>سطح</label>${simpleSelect("personLevel",["admin","manager","supervisor","hr","staff","worker"])}</div></div><button class="btn primary full" id="savePerson">افزودن پرسنل</button></div>`; }
function assetsHTML(){ return `<div class="card"><h2>تجهیزات و PM</h2><div class="form-grid"><div><label>نام دستگاه</label><input id="assetName"></div><div><label>کد دستگاه</label><input id="assetCode"></div><div><label>محل</label>${simpleSelect("assetLoc",db.locations)}</div><div><label>مسئول</label>${userSelect("assetResp")}</div></div><button class="btn primary full" id="saveAsset">افزودن دستگاه</button></div><div class="card"><h3>تعریف PM</h3><div class="form-grid"><div><label>دستگاه</label>${assetSelect("pmAsset")}</div><div><label>عنوان PM</label><input id="pmTitle"></div><div><label>تناوب</label>${simpleSelect("pmFreq",["روزانه","هفتگی","ماهانه","سالیانه"])}</div><div><label>مسئول</label>${userSelect("pmExec")}</div><div class="full"><label>چک‌لیست</label><textarea id="pmChecklist"></textarea></div></div><button class="btn primary full" id="savePM">ثبت PM</button><button class="btn gray full" id="generatePM">تولید تسک PM امروز</button></div>`; }
function reportsHTML(){
  const tasks=visibleTasks();
  const rows=db.users.map(u=>{const mine=tasks.filter(t=>t.executorId===u.id);return {u,total:mine.length,done:mine.filter(t=>t.status==="done").length,late:mine.filter(isLate).length,reports:db.dailyReports.filter(r=>r.userId===u.id).length};}).filter(r=>r.total||r.reports);
  return `<div class="card"><h2>گزارش عملکرد</h2><div class="table-wrap"><table><thead><tr><th>نفر</th><th>کل</th><th>انجام</th><th>عقب</th><th>گزارش</th></tr></thead><tbody>${rows.map(r=>`<tr><td>${esc(r.u.name)}</td><td>${toPersianDigits(r.total)}</td><td>${toPersianDigits(r.done)}</td><td>${toPersianDigits(r.late)}</td><td>${toPersianDigits(r.reports)}</td></tr>`).join("")}</tbody></table></div></div>`;
}

function bindEvents(){
  document.querySelectorAll("[data-menu]").forEach(btn=>btn.onclick=(e)=>{e.stopPropagation();document.querySelectorAll(".action-menu").forEach(m=>m.classList.remove("show"));document.getElementById("menu_"+btn.dataset.menu)?.classList.toggle("show");});
  document.body.onclick=()=>document.querySelectorAll(".action-menu").forEach(m=>m.classList.remove("show"));
  document.querySelectorAll("[data-detail]").forEach(el=>el.onclick=e=>{e.stopPropagation();showDetail(el.dataset.detail);});
  document.querySelectorAll("[data-done]").forEach(el=>el.onclick=e=>{e.stopPropagation();markDone(el.dataset.done);});
  document.querySelectorAll("[data-edit]").forEach(el=>el.onclick=e=>{e.stopPropagation();editingTaskId=el.dataset.edit;currentView="newTask";render();});
  document.querySelectorAll("[data-delete]").forEach(el=>el.onclick=e=>{e.stopPropagation();deleteTask(el.dataset.delete);});
  document.querySelectorAll("[data-dash-filter]").forEach(btn=>btn.onclick=()=>{dashboardFilter=btn.dataset.dashFilter;renderView();});
  const reportSearchInput=document.getElementById("reportSearch"); if(reportSearchInput){reportSearchInput.oninput=()=>{reportSearch=reportSearchInput.value.trim();renderView();};}
  document.querySelectorAll("[data-date-input]").forEach(inp=>inp.onclick=()=>openDatePicker(inp.id));
  const saveTask=document.getElementById("saveTask"); if(saveTask) saveTask.onclick=saveTaskAction;
  const cancelEdit=document.getElementById("cancelEdit"); if(cancelEdit) cancelEdit.onclick=()=>{editingTaskId="";currentView="tasks";render();};
  const saveReport=document.getElementById("saveReport"); if(saveReport) saveReport.onclick=saveReportAction;
  const savePerson=document.getElementById("savePerson"); if(savePerson) savePerson.onclick=()=>{db.users.push({id:uid("u"),name:val("personName"),role:val("personRole"),department:val("personDept"),managerId:val("personManager"),level:val("personLevel"),active:true});saveDB(db);renderView();};
  const saveAsset=document.getElementById("saveAsset"); if(saveAsset) saveAsset.onclick=()=>{db.assets.push({id:uid("a"),name:val("assetName"),code:val("assetCode"),location:val("assetLoc"),responsibleId:val("assetResp")});saveDB(db);renderView();};
  const savePM=document.getElementById("savePM"); if(savePM) savePM.onclick=()=>{db.pmTemplates.push({id:uid("pm"),assetId:val("pmAsset"),title:val("pmTitle"),frequency:val("pmFreq"),executorId:val("pmExec"),needPhoto:true,checklist:val("pmChecklist").split(",").map(x=>x.trim()).filter(Boolean),lastGenerated:""});saveDB(db);renderView();};
  const gen=document.getElementById("generatePM"); if(gen) gen.onclick=generatePMTasks;
  bindPickerEvents();
}

function saveTaskAction(){
  const due=normalizeJalali(val("taskDue")); if(!due){alert("تاریخ شمسی درست نیست.");return;}
  if(!val("taskTitle").trim()){alert("عنوان وظیفه را بنویس.");return;}
  const watcherIds=[...document.querySelectorAll('input[name="watchers"]:checked')].map(x=>x.value);
  if(editingTaskId){
    const t=db.tasks.find(x=>x.id===editingTaskId); if(!t||!canEditTask(t)){alert("اجازه ادیت نداری.");return;}
    Object.assign(t,{title:val("taskTitle"),description:val("taskDesc"),executorId:val("taskExecutor"),watcherIds,department:val("taskDept"),location:val("taskLocation"),assetId:val("taskAsset"),priority:val("taskPriority"),type:val("taskType"),dueDate:due,needPhoto:val("taskPhoto")==="بله"});
    t.logs=t.logs||[]; t.logs.push({at:nowText(),by:currentUserId,action:"ادیت"}); editingTaskId="";
  }else{
    db.tasks.unshift({id:uid("t"),title:val("taskTitle"),description:val("taskDesc"),creatorId:currentUserId,executorId:val("taskExecutor"),watcherIds,department:val("taskDept"),location:val("taskLocation"),assetId:val("taskAsset"),priority:val("taskPriority"),type:val("taskType"),dueDate:due,needPhoto:val("taskPhoto")==="بله",status:"open",doneAt:"",doneNote:"",createdAt:nowText(),logs:[{at:nowText(),by:currentUserId,action:"ایجاد"}]});
  }
  saveDB(db);currentView="tasks";render();
}
function saveReportAction(){
  const d=normalizeJalali(val("repDate")); if(!d){alert("تاریخ گزارش درست نیست.");return;}
  if(!val("repText").trim()){alert("شرح گزارش را بنویس.");return;}
  db.dailyReports.unshift({id:uid("r"),userId:currentUserId,date:d,type:val("repType"),text:val("repText"),createdAt:nowText()});
  saveDB(db); renderView();
}
function markDone(id){const t=db.tasks.find(x=>x.id===id); if(!t||!canDoTask(t)){alert("اجازه ثبت انجام نداری.");return;} const note=prompt("توضیح انجام:",""); t.status="done"; t.doneAt=nowText(); t.doneNote=note||""; t.logs=t.logs||[]; t.logs.push({at:nowText(),by:currentUserId,action:"انجام شد"}); saveDB(db); dashboardFilter="done"; renderView();}
function deleteTask(id){const t=db.tasks.find(x=>x.id===id); if(!t||!canDeleteTask(t)){alert("اجازه حذف نداری.");return;} if(confirm("این وظیفه حذف شود؟")){db.tasks=db.tasks.filter(x=>x.id!==id);saveDB(db);renderView();}}
function showDetail(id){const t=db.tasks.find(x=>x.id===id); if(!t)return; alert(`عنوان: ${t.title}\nمسئول: ${userName(t.executorId)}\nتعریف‌کننده: ${userName(t.creatorId)}\nپیگیرها: ${(t.watcherIds||[]).map(userName).join("، ")}\nمحل: ${t.location||"-"}\nدستگاه: ${assetName(t.assetId)}\nمهلت: ${formatJalali(t.dueDate)}\nوضعیت: ${t.status}\nشرح: ${t.description||"-"}`);}
function generatePMTasks(){const today=todayJalali();let count=0;db.pmTemplates.forEach(pm=>{if(pm.lastGenerated===today)return;const asset=db.assets.find(a=>a.id===pm.assetId);db.tasks.unshift({id:uid("t"),title:`PM - ${pm.title}`,description:`دستگاه: ${asset?.name||"-"} | چک‌لیست: ${(pm.checklist||[]).join("، ")}`,creatorId:currentUserId,executorId:pm.executorId,watcherIds:[asset?.responsibleId].filter(Boolean),department:"تعمیرات",location:asset?.location||"",assetId:pm.assetId,priority:"بالا",type:"PM",dueDate:today,needPhoto:pm.needPhoto,status:"open",doneAt:"",doneNote:"",createdAt:nowText(),logs:[{at:nowText(),by:currentUserId,action:"تولید PM"}]});pm.lastGenerated=today;count++;});saveDB(db);alert(`${toPersianDigits(count)} وظیفه ساخته شد.`);currentView="tasks";render();}

function jalaliPickerHTML(){return `<div class="modal-backdrop" id="dateModal"><div class="jalali-picker"><div class="jp-head"><button class="jp-nav" id="prevMonth">›</button><div class="jp-title" id="jpTitle"></div><button class="jp-nav" id="nextMonth">‹</button></div><div class="jp-week">${weekNames.map(w=>`<div>${w}</div>`).join("")}</div><div class="jp-days" id="jpDays"></div><div class="jp-foot"><button class="btn gray" id="cancelDate">انصراف</button><button class="btn primary" id="setDate">انتخاب</button></div></div></div>`;}
function openDatePicker(targetId){pickerTarget=targetId;const current=normalizeJalali(val(targetId))||todayJalali();selectedPickerValue=current;const [y,m]=current.split("/").map(Number);pickerY=y;pickerM=m;document.getElementById("dateModal").classList.add("show");drawPicker();}
function bindPickerEvents(){const modal=document.getElementById("dateModal"); if(!modal)return; document.getElementById("prevMonth").onclick=()=>{pickerM--;if(pickerM<1){pickerM=12;pickerY--;}drawPicker();}; document.getElementById("nextMonth").onclick=()=>{pickerM++;if(pickerM>12){pickerM=1;pickerY++;}drawPicker();}; document.getElementById("cancelDate").onclick=()=>modal.classList.remove("show"); document.getElementById("setDate").onclick=()=>{if(pickerTarget)document.getElementById(pickerTarget).value=formatJalali(selectedPickerValue);modal.classList.remove("show");}; modal.onclick=e=>{if(e.target===modal)modal.classList.remove("show");};}
function firstDayIndexJalali(y,m){return getWeekIndex(y,m,1);}
function getWeekIndex(y,m,d){const [gy,gm,gd]=jalaliToGregorian(y,m,d);const jsDay=new Date(gy,gm-1,gd).getDay();return (jsDay+1)%7;}
function drawPicker(){document.getElementById("jpTitle").textContent=`${monthNames[pickerM-1]} ${toPersianDigits(pickerY)}`;const daysEl=document.getElementById("jpDays");const len=jalaliMonthLength(pickerY,pickerM);const first=firstDayIndexJalali(pickerY,pickerM);let html="";for(let i=0;i<first;i++)html+=`<button class="jp-day other" disabled></button>`;for(let d=1;d<=len;d++){const v=`${pickerY}/${String(pickerM).padStart(2,"0")}/${String(d).padStart(2,"0")}`;const selected=normalizeJalali(selectedPickerValue)===v?"selected":"";html+=`<button class="jp-day ${selected}" data-pick="${v}">${toPersianDigits(d)}</button>`;}daysEl.innerHTML=html;daysEl.querySelectorAll("[data-pick]").forEach(b=>b.onclick=()=>{selectedPickerValue=b.dataset.pick;drawPicker();});}

render();
