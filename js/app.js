import { loadDB, saveDB, getSession, setSession, clearSession, resetDB, uid, todayISO, nowText } from "./storage.js";

let db = loadDB();
let currentUserId = getSession();
let currentView = "dashboard";

const app = document.getElementById("app");

function userName(id){ return db.users.find(u=>u.id===id)?.name || "-"; }
function assetName(id){ return db.assets.find(a=>a.id===id)?.name || "-"; }
function currentUser(){ return db.users.find(u=>u.id===currentUserId); }

function canSeeTask(task){
  const u = currentUser();
  if(!u) return false;
  if(u.level === "admin") return true;
  if(task.executorId === u.id || task.creatorId === u.id || (task.watcherIds||[]).includes(u.id)) return true;
  const subIds = db.users.filter(x=>x.managerId===u.id).map(x=>x.id);
  return subIds.includes(task.executorId);
}

function render(){
  if(!currentUserId || !currentUser()){
    renderLogin();
    return;
  }

  app.className = "app";
  app.innerHTML = `
    <div class="header">
      <div>
        <h1>TAK Duty Control</h1>
        <small>نسخه آفلاین مدیریت وظایف، گزارش روزانه و PM</small>
      </div>
      <div class="user-box">
        ${currentUser().name} - ${currentUser().role}
        <button class="mobile-menu-btn" id="menuBtn">☰</button>
        <button class="btn yellow" id="logoutBtn">خروج</button>
      </div>
    </div>
    <div class="nav-wrap">
      <div class="nav" id="mainNav">
        ${navBtn("dashboard","داشبورد")}
        ${navBtn("tasks","وظایف")}
        ${navBtn("newTask","تعریف وظیفه")}
        ${navBtn("daily","گزارش روزانه")}
        ${navBtn("people","پرسنل")}
        ${navBtn("assets","تجهیزات و PM")}
        ${navBtn("reports","گزارش عملکرد")}
      </div>
    </div>
    <div id="view"></div>
  `;
  document.getElementById("logoutBtn").onclick = () => { clearSession(); currentUserId=""; render(); };
  const menuBtn = document.getElementById("menuBtn");
  const mainNav = document.getElementById("mainNav");
  if(menuBtn && mainNav){
    menuBtn.onclick = () => mainNav.classList.toggle("show");
  }
  document.querySelectorAll("[data-view]").forEach(b=>b.onclick=()=>{
    currentView=b.dataset.view;
    if(mainNav) mainNav.classList.remove("show");
    render();
  });
  renderView();
}

function navBtn(id,label){
  return `<button data-view="${id}" class="${currentView===id?'active':''}">${label}</button>`;
}

function renderLogin(){
  app.className = "login";
  app.innerHTML = `
    <div class="card">
      <h2>ورود به TAK Duty Control</h2>
      <p class="muted">نسخه آفلاین آزمایشی. فعلاً بدون رمز؛ فقط کاربر را انتخاب کن.</p>
      <label>کاربر</label>
      <select id="loginUser">
        ${db.users.filter(u=>u.active).map(u=>`<option value="${u.id}">${u.name} - ${u.role}</option>`).join("")}
      </select>
      <div class="actions">
        <button class="btn primary" id="loginBtn">ورود</button>
        <button class="btn danger" id="resetBtn">ریست کامل دیتای تست</button>
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

function visibleTasks(){
  return db.tasks.filter(canSeeTask);
}

function statusBadge(t){
  const late = t.status!=="done" && t.dueDate < todayISO();
  if(t.status==="done") return `<span class="badge done">انجام‌شده</span>`;
  if(late) return `<span class="badge late">عقب‌افتاده</span>`;
  return `<span class="badge open">باز</span>`;
}

function dashboardHTML(){
  const tasks = visibleTasks();
  const open = tasks.filter(t=>t.status!=="done").length;
  const done = tasks.filter(t=>t.status==="done").length;
  const late = tasks.filter(t=>t.status!=="done" && t.dueDate < todayISO()).length;
  const today = tasks.filter(t=>t.dueDate===todayISO() && t.status!=="done").length;
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
function kpi(title,num){ return `<div class="card"><div class="muted">${title}</div><div class="kpi">${num}</div></div>`; }

function taskTable(tasks){
  return `<div class="table-wrap"><table>
    <thead><tr>
      <th>وضعیت</th><th>عنوان</th><th>مسئول</th><th>پیگیرها</th><th>محل</th><th>مهلت</th><th>نوع</th><th>عملیات</th>
    </tr></thead>
    <tbody>
      ${tasks.map(t=>`
        <tr>
          <td>${statusBadge(t)}</td>
          <td><b>${t.title}</b><br><span class="muted">${t.description||""}</span></td>
          <td>${userName(t.executorId)}</td>
          <td>${(t.watcherIds||[]).map(userName).join("، ")}</td>
          <td>${t.location||"-"}</td>
          <td>${t.dueDate}</td>
          <td>${t.type}</td>
          <td>
            ${t.status!=="done" ? `<button class="btn success small" data-done="${t.id}">انجام شد</button>` : ""}
            <button class="btn small" data-detail="${t.id}">جزئیات</button>
          </td>
        </tr>`).join("")}
    </tbody>
  </table></div>`;
}

function tasksHTML(){
  return `<div class="card">
    <h2>وظایف قابل مشاهده</h2>
    ${taskTable(visibleTasks())}
  </div>`;
}

function newTaskHTML(){
  return `<div class="card">
    <h2>تعریف وظیفه جدید</h2>
    <div class="form-grid">
      <div><label>عنوان</label><input id="taskTitle"></div>
      <div><label>مسئول اجرا</label>${userSelect("taskExecutor")}</div>
      <div><label>مهلت</label><input type="date" id="taskDue" value="${todayISO()}"></div>
      <div><label>واحد</label>${simpleSelect("taskDept",db.departments)}</div>
      <div><label>محل</label>${simpleSelect("taskLocation",db.locations)}</div>
      <div><label>نوع</label>${simpleSelect("taskType",["روزانه","هفتگی","ماهانه","سالیانه","تاریخ مشخص","فوری","بازدیدی","PM"])}</div>
      <div><label>اولویت</label>${simpleSelect("taskPriority",["عادی","بالا","بحرانی"])}</div>
      <div><label>تجهیزات مرتبط</label>${assetSelect("taskAsset")}</div>
      <div><label>نیاز به عکس؟</label>${simpleSelect("taskPhoto",["خیر","بله"])}</div>
      <div class="full"><label>پیگیرها / ناظرها</label>${multiUserCheckboxes("watchers")}</div>
      <div class="full"><label>شرح کار</label><textarea id="taskDesc"></textarea></div>
    </div>
    <div class="actions"><button class="btn primary" id="saveTask">ثبت وظیفه</button></div>
  </div>`;
}

function userSelect(id){
  return `<select id="${id}">${db.users.filter(u=>u.active).map(u=>`<option value="${u.id}">${u.name} - ${u.role}</option>`).join("")}</select>`;
}
function assetSelect(id){
  return `<select id="${id}"><option value="">بدون دستگاه</option>${db.assets.map(a=>`<option value="${a.id}">${a.name}</option>`).join("")}</select>`;
}
function simpleSelect(id,arr){
  return `<select id="${id}">${arr.map(x=>`<option value="${x}">${x}</option>`).join("")}</select>`;
}
function multiUserCheckboxes(name){
  return `<div style="display:grid;grid-template-columns:repeat(3,1fr);gap:6px">
    ${db.users.filter(u=>u.active).map(u=>`<label><input type="checkbox" name="${name}" value="${u.id}"> ${u.name}</label>`).join("")}
  </div>`;
}

function dailyHTML(){
  return `<div class="card">
    <h2>گزارش روزانه</h2>
    <div class="form-grid">
      <div><label>تاریخ</label><input type="date" id="repDate" value="${todayISO()}"></div>
      <div><label>نوع گزارش</label>${simpleSelect("repType",["عمومی","فروش","تعمیرات","نگهبانی","تولید","منابع انسانی"])}</div>
      <div><label>تعداد تماس/اقدام</label><input type="number" id="repCount" value="0"></div>
      <div class="full"><label>شرح گزارش</label><textarea id="repText" placeholder="مثلاً برای فروش: با چه مشتری‌هایی تماس گرفتی، نتیجه چه شد، پیگیری بعدی چیست"></textarea></div>
    </div>
    <div class="actions"><button class="btn primary" id="saveReport">ثبت گزارش امروز</button></div>
    <hr>
    <h3>گزارش‌های ثبت‌شده من</h3>
    ${dailyTable(db.dailyReports.filter(r=>r.userId===currentUserId))}
  </div>`;
}
function dailyTable(rows){
  return `<div class="table-wrap"><table><thead><tr><th>تاریخ</th><th>نوع</th><th>تعداد</th><th>شرح</th><th>ثبت</th></tr></thead><tbody>
    ${rows.map(r=>`<tr><td>${r.date}</td><td>${r.type}</td><td>${r.count}</td><td>${r.text}</td><td>${r.createdAt}</td></tr>`).join("")}
  </tbody></table></div>`;
}

function peopleHTML(){
  return `<div class="card">
    <h2>پرسنل و چارت ساده</h2>
    <div class="form-grid">
      <div><label>نام</label><input id="personName"></div>
      <div><label>سمت</label><input id="personRole"></div>
      <div><label>واحد</label>${simpleSelect("personDept",db.departments)}</div>
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
    <h3>تعریف PM ساده</h3>
    <div class="form-grid">
      <div><label>دستگاه</label>${assetSelect("pmAsset")}</div>
      <div><label>عنوان PM</label><input id="pmTitle"></div>
      <div><label>تناوب</label>${simpleSelect("pmFreq",["روزانه","هفتگی","ماهانه","سالیانه"])}</div>
      <div><label>مسئول</label>${userSelect("pmExec")}</div>
      <div class="full"><label>چک‌لیست با ویرگول جدا شود</label><input id="pmChecklist" placeholder="روغن، گریس، صدا، نشتی"></div>
    </div>
    <div class="actions">
      <button class="btn primary" id="savePM">ثبت PM</button>
      <button class="btn yellow" id="generatePM">تولید تسک از PMها برای امروز</button>
    </div>
  </div>`;
}

function reportsHTML(){
  const tasks = visibleTasks();
  const rows = db.users.map(u=>{
    const mine = tasks.filter(t=>t.executorId===u.id);
    const done = mine.filter(t=>t.status==="done").length;
    const late = mine.filter(t=>t.status!=="done" && t.dueDate < todayISO()).length;
    const reports = db.dailyReports.filter(r=>r.userId===u.id).length;
    return {u,total:mine.length,done,late,reports};
  }).filter(r=>r.total || r.reports);
  return `<div class="card">
    <h2>گزارش عملکرد</h2>
    <div class="table-wrap"><table>
      <thead><tr><th>نفر</th><th>واحد</th><th>کل وظایف</th><th>انجام‌شده</th><th>عقب‌افتاده</th><th>گزارش روزانه ثبت‌شده</th></tr></thead>
      <tbody>${rows.map(r=>`<tr><td>${r.u.name}</td><td>${r.u.department}</td><td>${r.total}</td><td>${r.done}</td><td>${r.late}</td><td>${r.reports}</td></tr>`).join("")}</tbody>
    </table></div>
  </div>`;
}

function bindEvents(){
  const saveTask = document.getElementById("saveTask");
  if(saveTask) saveTask.onclick = () => {
    const watcherIds = [...document.querySelectorAll('input[name="watchers"]:checked')].map(x=>x.value);
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
      dueDate:val("taskDue"),
      needPhoto:val("taskPhoto")==="بله",
      needNote:true,
      status:"open",
      doneAt:"",
      doneNote:"",
      photos:[],
      createdAt:nowText(),
      logs:[{at:nowText(), by:currentUserId, action:"ایجاد وظیفه"}]
    });
    saveDB(db); currentView="tasks"; render();
  };

  document.querySelectorAll("[data-done]").forEach(btn=>btn.onclick=()=>markDone(btn.dataset.done));
  document.querySelectorAll("[data-detail]").forEach(btn=>btn.onclick=()=>showDetail(btn.dataset.detail));

  const saveReport = document.getElementById("saveReport");
  if(saveReport) saveReport.onclick = () => {
    db.dailyReports.unshift({id:uid("r"), userId:currentUserId, date:val("repDate"), type:val("repType"), count:Number(val("repCount")||0), text:val("repText"), createdAt:nowText()});
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
  const note = prompt("توضیح انجام کار را بنویس:", "");
  if(!t) return;
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
مهلت: ${t.dueDate}
وضعیت: ${t.status}
شرح: ${t.description}
توضیح انجام: ${t.doneNote || "-"}
ثبت: ${t.createdAt}`
  );
}

function generatePMTasks(){
  const today = todayISO();
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
      needNote:true,
      status:"open",
      doneAt:"",
      doneNote:"",
      photos:[],
      createdAt:nowText(),
      logs:[{at:nowText(), by:currentUserId, action:"تولید خودکار از PM"}]
    });
    pm.lastGenerated = today;
    count++;
  });
  saveDB(db);
  alert(`${count} وظیفه PM برای امروز ساخته شد.`);
  currentView="tasks"; render();
}

render();
