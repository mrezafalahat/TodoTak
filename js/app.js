import {
  loadDB, saveDB, getSession, setSession, clearSession, resetDB,
  uid, todayJalali, nowText, normalizeJalali, compareJalali, formatJalali, toPersianDigits
} from "./storage.js";

let db = loadDB();
let currentUserId = getSession();
let currentView = "dashboard";
let editingTaskId = "";

const app = document.getElementById("app");

function userName(id){ return db.users.find(u=>u.id===id)?.name || "-"; }
function assetName(id){ return db.assets.find(a=>a.id===id)?.name || "-"; }
function currentUser(){ return db.users.find(u=>u.id===currentUserId); }

function icon(name){
  const icons = {
    menu:`<svg viewBox="0 0 24 24"><path d="M4 6h16M4 12h16M4 18h16"/></svg>`,
    close:`<svg viewBox="0 0 24 24"><path d="M18 6 6 18M6 6l12 12"/></svg>`,
    user:`<svg viewBox="0 0 24 24"><path d="M20 21a8 8 0 0 0-16 0"/><circle cx="12" cy="7" r="4"/></svg>`,
    home:`<svg viewBox="0 0 24 24"><path d="m3 11 9-8 9 8"/><path d="M5 10v10h14V10"/><path d="M9 20v-6h6v6"/></svg>`,
    tasks:`<svg viewBox="0 0 24 24"><path d="M9 11l2 2 4-4"/><path d="M9 17l2 2 4-4"/><rect x="4" y="3" width="16" height="18" rx="2"/></svg>`,
    plus:`<svg viewBox="0 0 24 24"><path d="M12 5v14M5 12h14"/><rect x="3" y="3" width="18" height="18" rx="3"/></svg>`,
    calendar:`<svg viewBox="0 0 24 24"><rect x="3" y="5" width="18" height="16" rx="2"/><path d="M16 3v4M8 3v4M3 11h18"/></svg>`,
    people:`<svg viewBox="0 0 24 24"><path d="M16 21v-2a4 4 0 0 0-8 0v2"/><circle cx="12" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.87"/></svg>`,
    wrench:`<svg viewBox="0 0 24 24"><path d="M14.7 6.3a4 4 0 0 0-5.4 5.4L3 18l3 3 6.3-6.3a4 4 0 0 0 5.4-5.4l-2.6 2.6-2-2 2.6-2.6Z"/></svg>`,
    chart:`<svg viewBox="0 0 24 24"><path d="M4 20V10"/><path d="M10 20V4"/><path d="M16 20v-7"/><path d="M22 20H2"/></svg>`,
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

function canSeeTask(t){
  const u = currentUser();
  if(!u) return false;
  if(u.level === "admin") return true;
  if(t.executorId === u.id || t.creatorId === u.id || (t.watcherIds||[]).includes(u.id)) return true;
  const subIds = db.users.filter(x=>x.managerId===u.id).map(x=>x.id);
  return subIds.includes(t.executorId);
}
function canEditTask(t){
  const u = currentUser();
  return !!u && (u.level === "admin" || t.creatorId === u.id);
}
function canDoTask(t){
  const u = currentUser();
  return !!u && (u.level === "admin" || t.executorId === u.id);
}

function render(){
  if(!currentUserId || !currentUser()){
    renderLogin();
    return;
  }
  app.className = "app";
  app.innerHTML = `
    <div class="drawer-backdrop" id="drawerBackdrop"></div>
    <aside class="side-drawer" id="sideDrawer">
      <div class="drawer-head"><b>منو</b><button class="close-btn" id="closeDrawer">×</button></div>
      <div class="drawer-user">
        <div class="avatar">${icon("user")}</div>
        <b>${currentUser().name}</b>
        <span>${currentUser().role}</span>
      </div>
      <div class="drawer-nav">
        ${menuItems.map(m=>drawerBtn(m[0],m[1],m[2])).join("")}
      </div>
      <div class="drawer-spacer"></div>
      <div class="drawer-nav">
        <button id="logoutBtn">${spanIcon("logout")}<span>خروج</span></button>
      </div>
    </aside>

    <div class="header">
      <div class="header-top">
        <button class="icon-btn" id="menuBtn">${icon("menu")}</button>
        <div class="header-title">
          <h1>TAK Duty Control</h1>
          <small>مدیریت وظایف، گزارش روزانه و PM</small>
        </div>
        <div></div>
      </div>
      <div class="user-pill">${currentUser().name} - ${currentUser().role}</div>
    </div>

    <main class="main" id="view"></main>
  `;

  const drawer = document.getElementById("sideDrawer");
  const backdrop = document.getElementById("drawerBackdrop");
  const openDrawer = () => { drawer.classList.add("show"); backdrop.classList.add("show"); };
  const closeDrawer = () => { drawer.classList.remove("show"); backdrop.classList.remove("show"); };

  document.getElementById("menuBtn").onclick = openDrawer;
  document.getElementById("closeDrawer").onclick = closeDrawer;
  backdrop.onclick = closeDrawer;
  document.getElementById("logoutBtn").onclick = () => { clearSession(); currentUserId=""; render(); };

  document.querySelectorAll("[data-view]").forEach(b=>b.onclick=()=>{
    currentView=b.dataset.view;
    if(currentView !== "newTask") editingTaskId = "";
    closeDrawer();
    render();
  });

  renderView();
}

function spanIcon(name){ return `<span class="drawer-icon">${icon(name)}</span>`; }
function drawerBtn(id,label,ic){
  return `<button data-view="${id}" class="${currentView===id?'active':''}">${spanIcon(ic)}<span>${label}</span></button>`;
}

function renderLogin(){
  app.className = "login";
  app.innerHTML = `
    <div class="card">
      <h2>ورود به TAK Duty Control</h2>
      <p class="muted">نسخه آفلاین آزمایشی. فعلاً بدون رمز.</p>
      <label>کاربر</label>
      <select id="loginUser">${db.users.filter(u=>u.active).map(u=>`<option value="${u.id}">${u.name} - ${u.role}</option>`).join("")}</select>
      <div class="actions">
        <button class="btn primary" id="loginBtn">ورود</button>
        <button class="btn danger" id="resetBtn">ریست دیتای تست</button>
      </div>
    </div>
  `;
  document.getElementById("loginBtn").onclick = () => {
    currentUserId = document.getElementById("loginUser").value;
    setSession(currentUserId);
    render();
  };
  document.getElementById("resetBtn").onclick = () => {
    if(confirm("کل دیتای آفلاین پاک شود؟")){
      resetDB(); db=loadDB(); currentUserId=""; renderLogin();
    }
  };
}

function renderView(){
  const view = document.getElementById("view");
  if(currentView==="dashboard") view.innerHTML = dashboardHTML();
  if(currentView==="tasks") view.innerHTML = tasksHTML();
  if(currentView==="newTask") view.innerHTML = newTaskHTML();
  if(currentView==="daily") view.innerHTML = dailyHTML();
  if(currentView==="people") view.innerHTML = peopleHTML();
  if(currentView==="assets") view.innerHTML = assetsHTML();
  if(currentView==="reports") view.innerHTML = reportsHTML();
  bindEvents();
}

function visibleTasks(){ return db.tasks.filter(canSeeTask); }
function isLate(t){ return t.status !== "done" && compareJalali(t.dueDate, todayJalali()) < 0; }

function statusBadge(t){
  if(t.status==="done") return `<span class="badge done">انجام‌شده</span>`;
  if(isLate(t)) return `<span class="badge late">عقب‌افتاده</span>`;
  return `<span class="badge open">باز</span>`;
}

function dashboardHTML(){
  const tasks = visibleTasks();
  const open = tasks.filter(t=>t.status!=="done").length;
  const done = tasks.filter(t=>t.status==="done").length;
  const late = tasks.filter(isLate).length;
  const today = tasks.filter(t=>t.dueDate===todayJalali() && t.status!=="done").length;
  return `
    <div class="grid">
      ${kpi("کارهای باز",open)}
      ${kpi("امروز",today)}
      ${kpi("عقب‌افتاده",late)}
      ${kpi("انجام‌شده",done)}
    </div>
    <div class="card" style="margin-top:10px">
      <h3>کارهای مهم امروز</h3>
      ${taskTable(tasks.filter(t=>t.status!=="done").slice(0,8))}
    </div>
  `;
}
function kpi(title,num){ return `<div class="card"><div class="muted">${title}</div><div class="kpi">${toPersianDigits(num)}</div></div>`; }

function taskTable(tasks){
  return `<div class="table-wrap"><table class="task-table">
    <thead><tr>
      <th class="m-status">وضعیت</th>
      <th class="m-title">وظیفه</th>
      <th class="m-person">مسئول</th>
      <th class="hide-mobile">پیگیرها</th>
      <th class="hide-mobile">محل</th>
      <th class="m-date">تاریخ</th>
      <th class="hide-mobile">نوع</th>
      <th class="m-actions">عمل</th>
    </tr></thead>
    <tbody>
      ${tasks.map(t=>`
        <tr>
          <td class="m-status">${statusBadge(t)}</td>
          <td class="m-title"><b>${t.title}</b><br><span class="muted task-title-sub">${t.description||""}</span></td>
          <td class="m-person">${userName(t.executorId)}</td>
          <td class="hide-mobile">${(t.watcherIds||[]).map(userName).join("، ")}</td>
          <td class="hide-mobile">${t.location||"-"}</td>
          <td class="m-date">${formatJalali(t.dueDate)}</td>
          <td class="hide-mobile">${t.type}</td>
          <td class="m-actions">
            <div class="desktop-actions">
              ${t.status!=="done" && canDoTask(t) ? `<button class="btn success small" data-done="${t.id}">انجام شد</button>` : ""}
              ${canEditTask(t) ? `<button class="btn yellow small" data-edit="${t.id}">ادیت</button>` : ""}
              <button class="btn small" data-detail="${t.id}">جزئیات</button>
            </div>
            <div class="mobile-actions">
              <button class="dots-btn" data-menu="${t.id}">⋮</button>
              <div class="action-menu" id="menu_${t.id}">
                ${t.status!=="done" && canDoTask(t) ? `<button data-done="${t.id}">انجام شد</button>` : ""}
                ${canEditTask(t) ? `<button data-edit="${t.id}">ادیت</button>` : ""}
                <button data-detail="${t.id}">جزئیات</button>
              </div>
            </div>
          </td>
        </tr>`).join("")}
    </tbody>
  </table></div>`;
}

function tasksHTML(){
  return `<div class="card">
    <h2>وظایف</h2>
    <p class="muted">روی موبایل جدول یک‌خطی است و اسکرول افقی ندارد.</p>
    ${taskTable(visibleTasks())}
  </div>`;
}

function newTaskHTML(){
  const t = editingTaskId ? db.tasks.find(x=>x.id===editingTaskId) : null;
  const isEdit = !!t;
  if(isEdit && !canEditTask(t)){
    editingTaskId="";
    return `<div class="card"><h2>دسترسی غیرمجاز</h2><p>فقط مدیرعامل یا ایجادکننده وظیفه می‌تواند آن را ویرایش کند.</p></div>`;
  }
  return `<div class="card">
    <h2>${isEdit ? "ویرایش وظیفه" : "تعریف وظیفه جدید"}</h2>
    <div class="form-grid">
      <div><label>عنوان</label><input id="taskTitle" value="${t?.title || ""}"></div>
      <div><label>مسئول اجرا</label>${userSelect("taskExecutor", t?.executorId)}</div>
      <div><label>مهلت شمسی</label><input id="taskDue" inputmode="numeric" placeholder="۱۴۰۵/۰۳/۰۵" value="${formatJalali(t?.dueDate || todayJalali())}"></div>
      <div><label>بخش / واحد سازمانی</label>${simpleSelect("taskDept",db.departments,t?.department)}</div>
      <div><label>محل</label>${simpleSelect("taskLocation",db.locations,t?.location)}</div>
      <div><label>نوع</label>${simpleSelect("taskType",["روزانه","هفتگی","ماهانه","سالیانه","تاریخ مشخص","فوری","بازدیدی","PM"],t?.type)}</div>
      <div><label>اولویت</label>${simpleSelect("taskPriority",["عادی","بالا","بحرانی"],t?.priority)}</div>
      <div><label>تجهیزات مرتبط</label>${assetSelect("taskAsset",t?.assetId)}</div>
      <div><label>نیاز به عکس؟</label>${simpleSelect("taskPhoto",["خیر","بله"],t?.needPhoto ? "بله" : "خیر")}</div>
      <div class="full"><label>پیگیرها / ناظرها</label>${multiUserCheckboxes("watchers",t?.watcherIds || [])}</div>
      <div class="full"><label>شرح کار</label><textarea id="taskDesc">${t?.description || ""}</textarea></div>
    </div>
    <div class="actions">
      <button class="btn primary" id="saveTask">${isEdit ? "ذخیره ویرایش" : "ثبت وظیفه"}</button>
      ${isEdit ? `<button class="btn danger" id="cancelEdit">انصراف</button>` : ""}
    </div>
  </div>`;
}

function userSelect(id, selected=""){
  return `<select id="${id}">${db.users.filter(u=>u.active).map(u=>`<option value="${u.id}" ${u.id===selected?'selected':''}>${u.name} - ${u.role}</option>`).join("")}</select>`;
}
function assetSelect(id, selected=""){
  return `<select id="${id}"><option value="">بدون دستگاه</option>${db.assets.map(a=>`<option value="${a.id}" ${a.id===selected?'selected':''}>${a.name}</option>`).join("")}</select>`;
}
function simpleSelect(id,arr,selected=""){
  return `<select id="${id}">${arr.map(x=>`<option value="${x}" ${x===selected?'selected':''}>${x}</option>`).join("")}</select>`;
}
function multiUserCheckboxes(name, selected=[]){
  return `<div class="checkbox-grid">${db.users.filter(u=>u.active).map(u=>`<label><input type="checkbox" name="${name}" value="${u.id}" ${selected.includes(u.id)?'checked':''}> ${u.name}</label>`).join("")}</div>`;
}

function dailyHTML(){
  return `<div class="card">
    <h2>گزارش روزانه</h2>
    <div class="form-grid">
      <div><label>تاریخ شمسی</label><input id="repDate" inputmode="numeric" value="${formatJalali(todayJalali())}"></div>
      <div><label>نوع گزارش</label>${simpleSelect("repType",["عمومی","فروش","تعمیرات","نگهبانی","تولید","منابع انسانی"])}</div>
      <div><label>تعداد تماس/اقدام</label><input type="number" id="repCount" value="0"></div>
      <div class="full"><label>شرح گزارش</label><textarea id="repText"></textarea></div>
    </div>
    <div class="actions"><button class="btn primary" id="saveReport">ثبت گزارش</button></div>
    <hr>
    <h3>گزارش‌های من</h3>
    ${dailyTable(db.dailyReports.filter(r=>r.userId===currentUserId))}
  </div>`;
}
function dailyTable(rows){
  return `<div class="table-wrap"><table><thead><tr><th>تاریخ</th><th>نوع</th><th>تعداد</th><th>شرح</th><th>ثبت</th></tr></thead><tbody>
    ${rows.map(r=>`<tr><td>${formatJalali(r.date)}</td><td>${r.type}</td><td>${toPersianDigits(r.count)}</td><td>${r.text}</td><td>${r.createdAt}</td></tr>`).join("")}
  </tbody></table></div>`;
}

function peopleHTML(){
  return `<div class="card">
    <h2>پرسنل</h2>
    <div class="form-grid">
      <div><label>نام</label><input id="personName"></div>
      <div><label>سمت</label><input id="personRole"></div>
      <div><label>بخش / واحد سازمانی</label>${simpleSelect("personDept",db.departments)}</div>
      <div><label>مدیر مستقیم</label>${userSelect("personManager")}</div>
      <div><label>سطح</label>${simpleSelect("personLevel",["admin","manager","supervisor","hr","staff","worker"])}</div>
    </div>
    <div class="actions"><button class="btn primary" id="savePerson">افزودن پرسنل</button></div>
    <hr>
    <div class="table-wrap"><table><thead><tr><th>نام</th><th>سمت</th><th>واحد</th><th>مدیر مستقیم</th><th>سطح</th></tr></thead><tbody>
      ${db.users.map(u=>`<tr><td>${u.name}</td><td>${u.role}</td><td>${u.department}</td><td>${userName(u.managerId)}</td><td>${u.level}</td></tr>`).join("")}
    </tbody></table></div>
  </div>`;
}

function assetsHTML(){
  return `<div class="card">
    <h2>تجهیزات و PM</h2>
    <div class="form-grid">
      <div><label>نام دستگاه</label><input id="assetName"></div>
      <div><label>کد دستگاه</label><input id="assetCode"></div>
      <div><label>محل</label>${simpleSelect("assetLoc",db.locations)}</div>
      <div><label>مسئول</label>${userSelect("assetResp")}</div>
    </div>
    <div class="actions"><button class="btn primary" id="saveAsset">افزودن دستگاه</button></div>
    <hr>
    <h3>لیست تجهیزات</h3>
    <div class="table-wrap"><table><thead><tr><th>نام</th><th>کد</th><th>محل</th><th>مسئول</th></tr></thead><tbody>
      ${db.assets.map(a=>`<tr><td>${a.name}</td><td>${a.code}</td><td>${a.location}</td><td>${userName(a.responsibleId)}</td></tr>`).join("")}
    </tbody></table></div>
    <hr>
    <h3>تعریف PM</h3>
    <div class="form-grid">
      <div><label>دستگاه</label>${assetSelect("pmAsset")}</div>
      <div><label>عنوان PM</label><input id="pmTitle"></div>
      <div><label>تناوب</label>${simpleSelect("pmFreq",["روزانه","هفتگی","ماهانه","سالیانه"])}</div>
      <div><label>مسئول</label>${userSelect("pmExec")}</div>
      <div class="full"><label>چک‌لیست با ویرگول جدا شود</label><input id="pmChecklist" placeholder="روغن، گریس، صدا، نشتی"></div>
    </div>
    <div class="actions">
      <button class="btn primary" id="savePM">ثبت PM</button>
      <button class="btn yellow" id="generatePM">تولید تسک PM امروز</button>
    </div>
  </div>`;
}

function reportsHTML(){
  const tasks = visibleTasks();
  const rows = db.users.map(u=>{
    const mine = tasks.filter(t=>t.executorId===u.id);
    const done = mine.filter(t=>t.status==="done").length;
    const late = mine.filter(isLate).length;
    const reports = db.dailyReports.filter(r=>r.userId===u.id).length;
    return {u,total:mine.length,done,late,reports};
  }).filter(r=>r.total || r.reports);
  return `<div class="card">
    <h2>گزارش عملکرد</h2>
    <div class="table-wrap"><table><thead><tr><th>نفر</th><th>واحد</th><th>کل وظایف</th><th>انجام‌شده</th><th>عقب‌افتاده</th><th>گزارش روزانه</th></tr></thead>
    <tbody>${rows.map(r=>`<tr><td>${r.u.name}</td><td>${r.u.department}</td><td>${toPersianDigits(r.total)}</td><td>${toPersianDigits(r.done)}</td><td>${toPersianDigits(r.late)}</td><td>${toPersianDigits(r.reports)}</td></tr>`).join("")}</tbody></table></div>
  </div>`;
}

function bindEvents(){
  const saveTask = document.getElementById("saveTask");
  if(saveTask) saveTask.onclick = () => {
    const due = normalizeJalali(document.getElementById("taskDue").value);
    if(!due){ alert("تاریخ شمسی را درست وارد کن. مثال: ۱۴۰۵/۰۳/۰۵"); return; }
    const watcherIds = [...document.querySelectorAll('input[name="watchers"]:checked')].map(x=>x.value);

    if(editingTaskId){
      const t = db.tasks.find(x=>x.id===editingTaskId);
      if(!t || !canEditTask(t)){ alert("اجازه ویرایش نداری."); return; }
      Object.assign(t,{
        title:val("taskTitle"),
        description:val("taskDesc"),
        executorId:val("taskExecutor"),
        watcherIds,
        department:val("taskDept"),
        location:val("taskLocation"),
        assetId:val("taskAsset"),
        priority:val("taskPriority"),
        type:val("taskType"),
        dueDate:due,
        needPhoto:val("taskPhoto")==="بله"
      });
      t.logs.push({at:nowText(), by:currentUserId, action:"ویرایش وظیفه"});
      editingTaskId="";
    }else{
      db.tasks.unshift({
        id:uid("t"),
        title:val("taskTitle"),
        description:val("taskDesc"),
        creatorId:currentUserId,
        executorId:val("taskExecutor"),
        watcherIds,
        department:val("taskDept"),
        location:val("taskLocation"),
        assetId:val("taskAsset"),
        priority:val("taskPriority"),
        type:val("taskType"),
        dueDate:due,
        needPhoto:val("taskPhoto")==="بله",
        status:"open",
        doneAt:"",
        doneNote:"",
        createdAt:nowText(),
        logs:[{at:nowText(), by:currentUserId, action:"ایجاد وظیفه"}]
      });
    }
    saveDB(db); currentView="tasks"; render();
  };

  const cancelEdit = document.getElementById("cancelEdit");
  if(cancelEdit) cancelEdit.onclick = () => { editingTaskId=""; currentView="tasks"; render(); };

  document.querySelectorAll("[data-menu]").forEach(btn=>btn.onclick=(e)=>{
    e.stopPropagation();
    document.querySelectorAll(".action-menu").forEach(m=>m.classList.remove("show"));
    document.getElementById("menu_"+btn.dataset.menu)?.classList.toggle("show");
  });
  document.body.onclick = () => document.querySelectorAll(".action-menu").forEach(m=>m.classList.remove("show"));

  document.querySelectorAll("[data-done]").forEach(btn=>btn.onclick=(e)=>{ e.stopPropagation(); markDone(btn.dataset.done); });
  document.querySelectorAll("[data-detail]").forEach(btn=>btn.onclick=(e)=>{ e.stopPropagation(); showDetail(btn.dataset.detail); });
  document.querySelectorAll("[data-edit]").forEach(btn=>btn.onclick=(e)=>{
    e.stopPropagation();
    editingTaskId = btn.dataset.edit;
    currentView="newTask";
    render();
  });

  const saveReport = document.getElementById("saveReport");
  if(saveReport) saveReport.onclick = () => {
    const d = normalizeJalali(val("repDate"));
    if(!d){ alert("تاریخ گزارش را درست وارد کن."); return; }
    db.dailyReports.unshift({id:uid("r"), userId:currentUserId, date:d, type:val("repType"), count:Number(val("repCount")||0), text:val("repText"), createdAt:nowText()});
    saveDB(db); renderView();
  };

  const savePerson = document.getElementById("savePerson");
  if(savePerson) savePerson.onclick = () => {
    db.users.push({id:uid("u"), name:val("personName"), role:val("personRole"), department:val("personDept"), managerId:val("personManager"), level:val("personLevel"), active:true});
    saveDB(db); renderView();
  };

  const saveAsset = document.getElementById("saveAsset");
  if(saveAsset) saveAsset.onclick = () => {
    db.assets.push({id:uid("a"), name:val("assetName"), code:val("assetCode"), location:val("assetLoc"), responsibleId:val("assetResp")});
    saveDB(db); renderView();
  };

  const savePM = document.getElementById("savePM");
  if(savePM) savePM.onclick = () => {
    db.pmTemplates.push({id:uid("pm"), assetId:val("pmAsset"), title:val("pmTitle"), frequency:val("pmFreq"), executorId:val("pmExec"), needPhoto:true, checklist:val("pmChecklist").split(",").map(x=>x.trim()).filter(Boolean), lastGenerated:""});
    saveDB(db); renderView();
  };

  const gen = document.getElementById("generatePM");
  if(gen) gen.onclick = generatePMTasks;
}

function val(id){ return document.getElementById(id)?.value || ""; }

function markDone(id){
  const t = db.tasks.find(x=>x.id===id);
  if(!t || !canDoTask(t)){ alert("اجازه ثبت انجام نداری."); return; }
  const note = prompt("توضیح انجام کار:", "");
  t.status = "done";
  t.doneAt = nowText();
  t.doneNote = note || "";
  t.logs.push({at:nowText(), by:currentUserId, action:"انجام شد"});
  saveDB(db); renderView();
}

function showDetail(id){
  const t = db.tasks.find(x=>x.id===id);
  if(!t) return;
  alert(
`عنوان: ${t.title}
مسئول: ${userName(t.executorId)}
تعریف‌کننده: ${userName(t.creatorId)}
پیگیرها: ${(t.watcherIds||[]).map(userName).join("، ")}
محل: ${t.location}
دستگاه: ${assetName(t.assetId)}
مهلت: ${formatJalali(t.dueDate)}
وضعیت: ${t.status}
شرح: ${t.description}
توضیح انجام: ${t.doneNote || "-"}
دسترسی ادیت: ${canEditTask(t) ? "دارد" : "ندارد"}
ثبت: ${t.createdAt}`
  );
}

function generatePMTasks(){
  const today = todayJalali();
  let count = 0;
  db.pmTemplates.forEach(pm=>{
    if(pm.lastGenerated === today) return;
    const asset = db.assets.find(a=>a.id===pm.assetId);
    db.tasks.unshift({
      id:uid("t"),
      title:`PM - ${pm.title}`,
      description:`دستگاه: ${asset?.name || "-"} | چک‌لیست: ${(pm.checklist||[]).join("، ")}`,
      creatorId:currentUserId,
      executorId:pm.executorId,
      watcherIds:[asset?.responsibleId].filter(Boolean),
      department:"تعمیرات",
      location:asset?.location || "",
      assetId:pm.assetId,
      priority:"بالا",
      type:"PM",
      dueDate:today,
      needPhoto:pm.needPhoto,
      status:"open",
      doneAt:"",
      doneNote:"",
      createdAt:nowText(),
      logs:[{at:nowText(), by:currentUserId, action:"تولید خودکار از PM"}]
    });
    pm.lastGenerated = today;
    count++;
  });
  saveDB(db);
  alert(`${toPersianDigits(count)} وظیفه PM برای امروز ساخته شد.`);
  currentView="tasks"; render();
}

render();
