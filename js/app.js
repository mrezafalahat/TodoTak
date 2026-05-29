const DB_KEY = 'tak_duty_control_db_v2';
const SESSION_KEY = 'tak_duty_control_session_v2';

const $ = (id) => document.getElementById(id);
const app = $('app');
let db = loadDB();
let currentUserId = getSession();
let currentView = 'dashboard';
let dashboardFilter = 'open';
let editingTaskId = '';
let editingReportId = '';
let taskSearch = '';
let reportSearch = '';
let homeOpen = { tasks: true, reports: true };

function uid(prefix='id'){ return `${prefix}_${Date.now().toString(36)}_${Math.random().toString(36).slice(2,8)}`; }
function esc(s=''){ return String(s).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c])); }
function val(id){ return $(id)?.value || ''; }
function checked(id){ return !!$(id)?.checked; }
function save(){ localStorage.setItem(DB_KEY, JSON.stringify(db)); }
function getSession(){ return localStorage.getItem(SESSION_KEY) || 'u_admin'; }
function setSession(id){ localStorage.setItem(SESSION_KEY, id); }
function clearSession(){ localStorage.removeItem(SESSION_KEY); }
function currentUser(){ return db.users.find(u=>u.id===currentUserId); }
function userName(id){ return db.users.find(u=>u.id===id)?.name || '-'; }
function assetName(id){ return db.assets.find(a=>a.id===id)?.name || '-'; }
function toEnglishDigits(input=''){ return String(input).replace(/[۰-۹]/g, d=>'۰۱۲۳۴۵۶۷۸۹'.indexOf(d)).replace(/[٠-٩]/g, d=>'٠١٢٣٤٥٦٧٨٩'.indexOf(d)); }
function toPersianDigits(input=''){ return String(input).replace(/[0-9]/g, d=>'۰۱۲۳۴۵۶۷۸۹'[d]); }
function pad2(n){ return String(n).padStart(2,'0'); }
function nowText(){ const d=new Date(); return `${formatJalali(todayJalali())} ${toPersianDigits(pad2(d.getHours()))}:${toPersianDigits(pad2(d.getMinutes()))}`; }
function todayJalali(){ const f = new Intl.DateTimeFormat('fa-IR-u-ca-persian', {year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date()); return normalizeJalali(f) || '1405/01/01'; }
function normalizeJalali(v=''){
  v = toEnglishDigits(String(v).trim()).replace(/-/g,'/').replace(/[.]/g,'/').replace(/\s+/g,'');
  const parts = v.match(/^(\d{4})\/(\d{1,2})\/(\d{1,2})$/);
  if(!parts) return '';
  const y=Number(parts[1]), m=Number(parts[2]), d=Number(parts[3]);
  if(m<1 || m>12 || d<1 || d>31) return '';
  return `${y}/${pad2(m)}/${pad2(d)}`;
}
function formatJalali(v=''){ const n=normalizeJalali(v); if(!n) return toPersianDigits(v); const [y,m,d]=n.split('/'); return `${toPersianDigits(y)}/${toPersianDigits(m)}/${toPersianDigits(d)}`; }
function compactJalali(v=''){ const n=normalizeJalali(v); if(!n) return '-'; const [,m,d]=n.split('/'); return `${toPersianDigits(Number(m))}/${toPersianDigits(Number(d))}`; }
function compareJalali(a,b){ a=normalizeJalali(a); b=normalizeJalali(b); if(!a||!b) return 0; return a.localeCompare(b); }
function addDays(date, days){ const d=new Date(); d.setDate(d.getDate()+Number(days||0)); return new Intl.DateTimeFormat('fa-IR-u-ca-persian', {year:'numeric',month:'2-digit',day:'2-digit'}).format(d).replace(/\u200e/g,''); }
function splitLines(text=''){ return String(text).split(/\n|،|,/).map(x=>x.trim()).filter(Boolean); }

function seedDB(){
  const u1='u_admin', u2='u_factory', u3='u_hall', u4='u_hr', u5='u_sales';
  return {
    users:[
      {id:u1,name:'محمدرضا',role:'مدیرعامل',department:'مدیریت',managerId:'',level:'admin',active:true},
      {id:u2,name:'مدیر کارخانه',role:'مدیر کارخانه',department:'تولید',managerId:u1,level:'manager',active:true},
      {id:u3,name:'مدیر سالن',role:'مدیر سالن',department:'تولید',managerId:u2,level:'supervisor',active:true},
      {id:u4,name:'منابع انسانی',role:'منابع انسانی',department:'اداری',managerId:u1,level:'hr',active:true},
      {id:u5,name:'کارشناس فروش',role:'کارشناس فروش',department:'فروش',managerId:u1,level:'staff',active:true}
    ],
    departments:['مدیریت','فروش','تولید','نگهبانی','تعمیرات','منابع انسانی','مالی'],
    locations:['دفتر فروش','سالن تولید','انبار','نگهبانی','واحد تعمیرات','دفتر مدیریت'],
    assets:[{id:'a1',name:'دستگاه لمینت',code:'LAM-01',location:'سالن تولید',responsibleId:u2}],
    pmTemplates:[],
    tasks:[
      {id:'t1',title:'تماس با مشتری جدید',description:'پیگیری مشتری جدید و ثبت نتیجه.',creatorId:u1,executorId:u5,watcherIds:[u1],department:'فروش',location:'دفتر فروش',assetId:'',priority:'بالا',type:'روزانه',hasTime:true,dueDate:todayJalali(),dueTime:'09:00',needPhoto:false,status:'open',doneAt:'',doneNote:'',createdAt:nowText(),logs:[]},
      {id:'t2',title:'بررسی نظم سالن',description:'بازدید کوتاه از وضعیت سالن.',creatorId:u1,executorId:u3,watcherIds:[u2],department:'تولید',location:'سالن تولید',assetId:'',priority:'عادی',type:'باید انجام شود / پیشرو',hasTime:false,dueDate:todayJalali(),dueTime:'',needPhoto:false,status:'open',doneAt:'',doneNote:'',createdAt:nowText(),logs:[]}
    ],
    dailyReports:[{id:'r1',userId:u1,date:todayJalali(),type:'عمومی',text:'بررسی کلی کارهای روزانه و پیگیری موارد مهم.',createdAt:nowText()}]
  };
}
function migrateDB(data){
  const base = seedDB();
  const d = data && typeof data === 'object' ? data : base;
  d.users = Array.isArray(d.users) ? d.users : base.users;
  d.departments = Array.isArray(d.departments) ? d.departments : base.departments;
  d.locations = Array.isArray(d.locations) ? d.locations : base.locations;
  d.assets = Array.isArray(d.assets) ? d.assets : [];
  d.pmTemplates = Array.isArray(d.pmTemplates) ? d.pmTemplates : [];
  d.tasks = Array.isArray(d.tasks) ? d.tasks : [];
  d.dailyReports = Array.isArray(d.dailyReports) ? d.dailyReports : [];
  d.tasks.forEach(t=>{ if(t.hasTime===undefined) t.hasTime = !!t.dueTime; if(!t.type) t.type='تاریخ مشخص'; if(!t.status) t.status='open'; if(!t.logs) t.logs=[]; });
  return d;
}
function loadDB(){
  try{ const raw=localStorage.getItem(DB_KEY); if(raw) return migrateDB(JSON.parse(raw)); }catch(e){}
  const d=seedDB(); localStorage.setItem(DB_KEY, JSON.stringify(d)); return d;
}
function resetDB(){ localStorage.removeItem(DB_KEY); localStorage.removeItem(SESSION_KEY); db=seedDB(); save(); currentUserId='u_admin'; }

function canSeeTask(t){ const u=currentUser(); if(!u) return false; if(u.level==='admin') return true; if(t.executorId===u.id || t.creatorId===u.id || (t.watcherIds||[]).includes(u.id)) return true; const subIds=db.users.filter(x=>x.managerId===u.id).map(x=>x.id); return subIds.includes(t.executorId); }
function canEditTask(t){ const u=currentUser(); return !!u && (u.level==='admin' || t.creatorId===u.id); }
function canDeleteTask(t){ const u=currentUser(); return !!u && (u.level==='admin' || t.creatorId===u.id); }
function canDoTask(t){ const u=currentUser(); return !!u && (u.level==='admin' || t.executorId===u.id); }
function isLate(t){ return t.status!=='done' && t.dueDate && compareJalali(t.dueDate,todayJalali())<0 && t.type!=='باید انجام شود / پیشرو'; }
function visibleTasks(){ return db.tasks.filter(canSeeTask); }
function myTasks(){ const u=currentUser(); return visibleTasks().filter(t=>t.executorId===u.id || t.creatorId===u.id || (t.watcherIds||[]).includes(u.id) || u.level==='admin'); }
function myReports(){ return db.dailyReports.filter(r=>r.userId===currentUserId || currentUser()?.level==='admin'); }

const icons = {dashboard:'⌂', tasks:'☑', newTask:'＋', daily:'▣', people:'👥', assets:'⚙', reports:'▥', settings:'⚙', menu:'☰', logout:'⇦'};
const menuItems = [['dashboard','داشبورد','dashboard'],['newTask','تعریف وظیفه','newTask'],['tasks','وظایف','tasks'],['daily','گزارش روزانه','daily'],['people','پرسنل','people'],['assets','تجهیزات و PM','assets'],['reports','گزارش عملکرد','reports'],['settings','تنظیمات','settings']];
const bottomItems = [['dashboard','خانه','dashboard'],['tasks','وظایف','tasks'],['newTask','جدید','newTask'],['daily','گزارش','daily']];

function render(){
  if(!currentUserId || !currentUser()){ renderLogin(); return; }
  app.className='app';
  app.innerHTML = `
    <div class="drawer-backdrop" id="drawerBackdrop"></div>
    <aside class="drawer" id="drawer">
      <div class="drawer-profile"><div class="avatar">👤</div><b>${esc(currentUser().name)}</b><span>${esc(currentUser().role)}</span></div>
      <div class="drawer-nav">${menuItems.map(m=>drawerBtn(m[0],m[1],m[2])).join('')}</div>
      <div class="drawer-spacer"></div>
      <div class="drawer-nav"><button id="logoutBtn"><span class="drawer-icon">${icons.logout}</span><span>خروج</span></button></div>
    </aside>
    <header class="topbar">
      <div class="toprow"><button class="icon-btn" id="menuBtn">${icons.menu}</button><div class="title"><h1>TAK Duty Control</h1><small>سبک تلگرام، وظایف و گزارش کارخانه</small></div><div></div></div>
      <div class="userline">${esc(currentUser().name)} • ${esc(currentUser().role)}</div>
    </header>
    <main class="main" id="view"></main>
    <nav class="bottom-nav">${bottomItems.map(m=>bottomBtn(m[0],m[1],m[2])).join('')}</nav>`;
  $('menuBtn').onclick=()=>{$('drawer').classList.add('show');$('drawerBackdrop').classList.add('show');};
  $('drawerBackdrop').onclick=closeDrawer;
  $('logoutBtn').onclick=()=>{clearSession(); currentUserId=''; render();};
  document.querySelectorAll('[data-view]').forEach(b=>b.onclick=()=>{currentView=b.dataset.view;if(currentView!=='newTask')editingTaskId='';closeDrawer();renderView();});
  renderView();
}
function closeDrawer(){ $('drawer')?.classList.remove('show'); $('drawerBackdrop')?.classList.remove('show'); }
function drawerBtn(id,label,ic){ return `<button class="${currentView===id?'active':''}" data-view="${id}"><span class="drawer-icon">${icons[ic]||'•'}</span><span>${label}</span></button>`; }
function bottomBtn(id,label,ic){ return `<button class="${currentView===id?'active':''}" data-view="${id}"><span class="ico">${icons[ic]||'•'}</span><span>${label}</span></button>`; }
function renderLogin(){
  app.className='login';
  app.innerHTML=`<div class="card"><h2>ورود</h2><p class="muted">نسخه آفلاین. اطلاعات روی همین مرورگر ذخیره می‌شود.</p><label>کاربر</label><select id="loginUser">${db.users.filter(u=>u.active).map(u=>`<option value="${u.id}">${esc(u.name)} - ${esc(u.role)}</option>`).join('')}</select><div class="actions"><button class="btn primary full" id="loginBtn">ورود</button><button class="btn gray full" id="resetBtn">ریست دیتای تست</button></div></div>`;
  $('loginBtn').onclick=()=>{currentUserId=val('loginUser');setSession(currentUserId);render();};
  $('resetBtn').onclick=()=>{if(confirm('کل دیتای آفلاین پاک شود؟')){resetDB();renderLogin();}};
}
function renderView(){
  const view=$('view'); if(!view) return;
  const map = {dashboard:dashboardHTML, tasks:tasksHTML, newTask:newTaskHTML, daily:dailyHTML, people:peopleHTML, assets:assetsHTML, reports:reportsHTML, settings:settingsHTML};
  view.innerHTML = (map[currentView]||dashboardHTML)();
  bindEvents();
}

function dashboardHTML(){
  const tasks=visibleTasks();
  const open=tasks.filter(t=>t.status!=='done').length, done=tasks.filter(t=>t.status==='done').length, late=tasks.filter(isLate).length, today=tasks.filter(t=>t.dueDate===todayJalali()&&t.status!=='done').length;
  const mt = filterTasks(myTasks(), taskSearch);
  const mr = filterReports(myReports(), reportSearch);
  return `<div class="kpis">${kpi('باز',open,'open')}${kpi('امروز',today,'today')}${kpi('عقب‌افتاده',late,'late')}${kpi('انجام',done,'done')}</div>
    <section class="card"><button class="collapse-head" data-toggle-home="tasks"><span>وظایف من</span><span>${homeOpen.tasks?'▲':'▼'}</span></button><div class="collapse-body ${homeOpen.tasks?'show':''}"><input class="search-input" id="homeTaskSearch" placeholder="جستجو در وظایف من..." value="${esc(taskSearch)}">${taskList(mt)}</div></section>
    <section class="card"><button class="collapse-head" data-toggle-home="reports"><span>گزارش روزانه</span><span>${homeOpen.reports?'▲':'▼'}</span></button><div class="collapse-body ${homeOpen.reports?'show':''}"><input class="search-input" id="homeReportSearch" placeholder="جستجو در گزارش‌ها..." value="${esc(reportSearch)}">${reportList(mr)}</div></section>`;
}
function kpi(title,num,filter){ return `<div class="kpi ${dashboardFilter===filter?'active':''}" data-dash-filter="${filter}"><div class="num">${toPersianDigits(num)}</div><div class="lbl">${title}</div></div>`; }
function filterTasks(rows,q){ q=(q||'').trim(); if(!q) return rows; return rows.filter(t=>[t.title,t.description,t.location,t.department,t.type,t.priority,userName(t.executorId)].join(' ').includes(q)); }
function filterReports(rows,q){ q=(q||'').trim(); if(!q) return rows; return rows.filter(r=>[r.type,r.text,formatJalali(r.date),userName(r.userId)].join(' ').includes(q)); }

function taskList(tasks){
  if(!tasks.length) return `<div class="empty-state">وظیفه‌ای وجود ندارد.</div>`;
  return `<div class="list">${tasks.map(t=>`<div class="task-row"><span class="dot ${t.status==='done'?'done':isLate(t)?'late':t.type==='باید انجام شود / پیشرو'?'forward':'open'}"></span><div class="task-main"><div class="task-title">${esc(t.title)}</div><div class="task-sub">${esc(t.location||'-')} • ${esc(t.type||'-')} ${t.hasTime&&t.dueTime?'• '+esc(t.dueTime):'• بدون ساعت'}</div></div><div class="task-person">${esc(userName(t.executorId))}</div><div class="task-date">${compactJalali(t.dueDate)}</div><div class="more"><button class="more-btn" data-menu="${t.id}">⋮</button><div class="action-menu" id="menu_${t.id}">${t.status!=='done'&&canDoTask(t)?`<button data-done="${t.id}">انجام شد</button>`:''}${canEditTask(t)?`<button data-edit="${t.id}">ویرایش</button>`:''}<button data-detail="${t.id}">جزئیات</button>${canDeleteTask(t)?`<button class="danger" data-delete="${t.id}">حذف</button>`:''}</div></div></div>`).join('')}</div>`;
}
function tasksHTML(){
  let rows=visibleTasks();
  if(dashboardFilter==='open') rows=rows.filter(t=>t.status!=='done');
  if(dashboardFilter==='today') rows=rows.filter(t=>t.dueDate===todayJalali()&&t.status!=='done');
  if(dashboardFilter==='late') rows=rows.filter(isLate);
  if(dashboardFilter==='done') rows=rows.filter(t=>t.status==='done');
  rows=filterTasks(rows, taskSearch);
  return `<div class="page-title">وظایف</div><input class="search-input" id="taskSearch" placeholder="جستجو در وظایف..." value="${esc(taskSearch)}">${taskList(rows)}`;
}

function userSelect(id,selected=''){ return `<select id="${id}">${db.users.filter(u=>u.active).map(u=>`<option value="${u.id}" ${u.id===selected?'selected':''}>${esc(u.name)} - ${esc(u.role)}</option>`).join('')}</select>`; }
function assetSelect(id,selected=''){ return `<select id="${id}"><option value="">بدون دستگاه</option>${db.assets.map(a=>`<option value="${a.id}" ${a.id===selected?'selected':''}>${esc(a.name)}</option>`).join('')}</select>`; }
function simpleSelect(id,arr,selected=''){ return `<select id="${id}">${arr.map(x=>`<option value="${esc(x)}" ${x===selected?'selected':''}>${esc(x)}</option>`).join('')}</select>`; }
function multiUserCheckboxes(name,selected=[]){ return `<div class="checkbox-grid">${db.users.filter(u=>u.active).map(u=>`<label><input type="checkbox" name="${name}" value="${u.id}" ${(selected||[]).includes(u.id)?'checked':''}>${esc(u.name)}</label>`).join('')}</div>`; }
function newTaskHTML(){
  const t=editingTaskId?db.tasks.find(x=>x.id===editingTaskId):null, isEdit=!!t;
  if(isEdit && !canEditTask(t)) return `<div class="card"><h2>دسترسی غیرمجاز</h2><p class="muted">فقط مدیرعامل یا ایجادکننده وظیفه می‌تواند ویرایش کند.</p></div>`;
  return `<div class="page-title">${isEdit?'ویرایش وظیفه':'وظیفه جدید'}</div><section class="card"><div class="form-grid">
    <div class="full"><label>عنوان</label><input id="taskTitle" value="${esc(t?.title||'')}"></div>
    <div><label>مسئول اجرا</label>${userSelect('taskExecutor',t?.executorId||currentUserId)}</div>
    <div><label>نوع</label>${simpleSelect('taskType',['روزانه','هفتگی','ماهانه','سالیانه','تاریخ مشخص','فوری','بازدیدی','PM','باید انجام شود / پیشرو'],t?.type||'روزانه')}</div>
    <div><label>تاریخ</label><input id="taskDue" value="${formatJalali(t?.dueDate||todayJalali())}" placeholder="1405/03/08"></div>
    <div class="full"><label class="checkbox-line"><input type="checkbox" id="hasTime" ${t?.hasTime===false?'':'checked'}> دارای ساعت مشخص</label></div>
    <div id="timeBox"><label>ساعت</label><input type="time" id="taskTime" value="${esc(t?.dueTime||'09:00')}"><p class="muted">اگر تیک ساعت خاموش باشد، وظیفه بدون ساعت ثبت می‌شود.</p></div>
    <div><label>بخش / واحد سازمانی</label>${simpleSelect('taskDept',db.departments,t?.department||db.departments[0])}</div>
    <div><label>محل</label>${simpleSelect('taskLocation',db.locations,t?.location||db.locations[0])}</div>
    <div><label>اولویت</label>${simpleSelect('taskPriority',['عادی','بالا','بحرانی'],t?.priority||'عادی')}</div>
    <div><label>تجهیزات مرتبط</label>${assetSelect('taskAsset',t?.assetId||'')}</div>
    <div><label>نیاز به عکس؟</label>${simpleSelect('taskPhoto',['خیر','بله'],t?.needPhoto?'بله':'خیر')}</div>
    <div class="full"><label>پیگیرها / ناظرها</label>${multiUserCheckboxes('watchers',t?.watcherIds||[])}</div>
    <div class="full"><label>شرح کار</label><textarea id="taskDesc">${esc(t?.description||'')}</textarea></div>
    </div><div class="actions"><button class="btn primary" id="saveTask">${isEdit?'ذخیره ویرایش':'ثبت وظیفه'}</button>${isEdit?`<button class="btn gray" id="cancelEdit">انصراف</button>`:''}</div></section>`;
}
function buildDueDate(type){ const d=normalizeJalali(val('taskDue'))||todayJalali(); if(type==='باید انجام شود / پیشرو') return d; return d; }
function saveTaskAction(){
  if(!val('taskTitle').trim()){ alert('عنوان وظیفه را بنویس.'); return; }
  const type=val('taskType'); const hasTime=checked('hasTime'); const watcherIds=[...document.querySelectorAll('input[name="watchers"]:checked')].map(x=>x.value);
  const payload={title:val('taskTitle'),description:val('taskDesc'),executorId:val('taskExecutor'),watcherIds,department:val('taskDept'),location:val('taskLocation'),assetId:val('taskAsset'),priority:val('taskPriority'),type,dueDate:buildDueDate(type),hasTime,dueTime:hasTime?val('taskTime'):'',needPhoto:val('taskPhoto')==='بله'};
  if(editingTaskId){ const t=db.tasks.find(x=>x.id===editingTaskId); if(!t||!canEditTask(t)){alert('اجازه ویرایش نداری.');return;} Object.assign(t,payload); t.logs=t.logs||[]; t.logs.push({at:nowText(),by:currentUserId,action:'ویرایش'}); editingTaskId=''; }
  else db.tasks.unshift({id:uid('t'),...payload,creatorId:currentUserId,status:'open',doneAt:'',doneNote:'',createdAt:nowText(),logs:[{at:nowText(),by:currentUserId,action:'ایجاد'}]});
  save(); currentView='tasks'; render();
}

function dailyHTML(){
  const edit = editingReportId ? db.dailyReports.find(r=>r.id===editingReportId) : null;
  const rows = filterReports(myReports(), reportSearch);
  return `<div class="page-title">گزارش روزانه</div><section class="card"><h3>${edit?'ویرایش گزارش':'ثبت گزارش'}</h3><div class="form-grid"><div><label>تاریخ شمسی</label><input id="repDate" value="${formatJalali(edit?.date||todayJalali())}"></div><div><label>نوع گزارش</label>${simpleSelect('repType',['عمومی','فروش','تعمیرات','نگهبانی','تولید','منابع انسانی'],edit?.type||'عمومی')}</div><div class="full"><label>شرح گزارش</label><textarea id="repText">${esc(edit?.text||'')}</textarea></div></div><div class="actions"><button class="btn primary" id="saveReport">${edit?'ذخیره ویرایش':'ثبت گزارش'}</button>${edit?`<button class="btn gray" id="cancelReportEdit">انصراف</button>`:''}<button class="btn gray" id="printToday">پرینت امروز</button></div></section><section class="card"><h3>گزارش‌های من</h3><input class="search-input" id="reportSearch" placeholder="جستجو در گزارش‌ها..." value="${esc(reportSearch)}">${reportList(rows)}</section>`;
}
function reportList(rows){ if(!rows.length) return `<div class="empty-state">گزارشی وجود ندارد.</div>`; return `<div class="report-list">${rows.map(r=>`<div class="report-item"><div class="report-top"><b>${esc(r.type||'-')} • ${esc(userName(r.userId))}</b><span>${formatJalali(r.date)}</span></div><div class="report-text">${esc(r.text||'-')}</div><div class="actions"><button class="btn gray" data-edit-report="${r.id}">ویرایش</button><button class="btn danger" data-delete-report="${r.id}">حذف</button></div></div>`).join('')}</div>`; }
function saveReportAction(){
  const d=normalizeJalali(val('repDate')); if(!d){alert('تاریخ گزارش درست نیست.');return;} if(!val('repText').trim()){alert('شرح گزارش را بنویس.');return;}
  if(editingReportId){ const r=db.dailyReports.find(x=>x.id===editingReportId); if(r){ r.date=d; r.type=val('repType'); r.text=val('repText'); r.updatedAt=nowText(); } editingReportId=''; }
  else db.dailyReports.unshift({id:uid('r'),userId:currentUserId,date:d,type:val('repType'),text:val('repText'),createdAt:nowText()});
  save(); renderView();
}
function printTodayReport(){ const rows=db.dailyReports.filter(r=>r.userId===currentUserId&&r.date===todayJalali()); if(!rows.length){alert('گزارشی برای امروز ثبت نشده.');return;} const win=window.open('','_blank'); win.document.write(`<html dir="rtl" lang="fa"><head><title>گزارش امروز</title><style>body{font-family:Tahoma;padding:20px;line-height:2} .item{border:1px solid #ddd;border-radius:12px;padding:12px;margin:10px 0}</style></head><body><h2>گزارش کار روزانه</h2><p>پرسنل: ${esc(currentUser().name)} | تاریخ: ${formatJalali(todayJalali())}</p>${rows.map(r=>`<div class="item"><b>${esc(r.type)}</b><p>${esc(r.text)}</p></div>`).join('')}</body></html>`); win.document.close(); setTimeout(()=>win.print(),300); }

function peopleHTML(){ return `<div class="page-title">پرسنل</div><section class="card"><div class="form-grid"><div><label>نام</label><input id="personName"></div><div><label>سمت</label><input id="personRole"></div><div><label>بخش</label>${simpleSelect('personDept',db.departments)}</div><div><label>مدیر مستقیم</label>${userSelect('personManager')}</div><div><label>سطح</label>${simpleSelect('personLevel',['admin','manager','supervisor','hr','staff','worker'])}</div></div><div class="actions"><button class="btn primary" id="savePerson">افزودن پرسنل</button></div></section><section class="card"><h3>لیست پرسنل</h3>${db.users.map(u=>`<span class="pill">${esc(u.name)} - ${esc(u.role)}</span>`).join('')}</section>`; }
function assetsHTML(){ return `<div class="page-title">تجهیزات و PM</div><section class="card"><h3>افزودن دستگاه</h3><div class="form-grid"><div><label>نام دستگاه</label><input id="assetName"></div><div><label>کد دستگاه</label><input id="assetCode"></div><div><label>محل</label>${simpleSelect('assetLoc',db.locations)}</div><div><label>مسئول</label>${userSelect('assetResp')}</div></div><div class="actions"><button class="btn primary" id="saveAsset">افزودن دستگاه</button></div></section><section class="card"><h3>تجهیزات</h3>${db.assets.map(a=>`<div class="report-item"><b>${esc(a.name)}</b><div class="muted">${esc(a.code)} • ${esc(a.location)} • ${esc(userName(a.responsibleId))}</div></div>`).join('')||'<div class="empty-state">دستگاهی ثبت نشده.</div>'}</section>`; }
function reportsHTML(){ const tasks=visibleTasks(); const rows=db.users.map(u=>{const mine=tasks.filter(t=>t.executorId===u.id);return {u,total:mine.length,done:mine.filter(t=>t.status==='done').length,late:mine.filter(isLate).length,reports:db.dailyReports.filter(r=>r.userId===u.id).length};}).filter(r=>r.total||r.reports); return `<div class="page-title">گزارش عملکرد</div><section class="card">${rows.map(r=>`<div class="report-item"><b>${esc(r.u.name)}</b><div><span class="pill">کل: ${toPersianDigits(r.total)}</span><span class="pill">انجام: ${toPersianDigits(r.done)}</span><span class="pill">عقب‌افتاده: ${toPersianDigits(r.late)}</span><span class="pill">گزارش: ${toPersianDigits(r.reports)}</span></div></div>`).join('')||'<div class="empty-state">داده‌ای نیست.</div>'}</section>`; }

function settingsHTML(){ return `<div class="page-title">تنظیمات</div><section class="card"><h3>مدیریت محل‌ها</h3><p class="muted">محل‌ها از همینجا اضافه، ویرایش و حذف می‌شوند و در وظایف و تجهیزات استفاده می‌شوند.</p><div class="grid2"><div><label>محل جدید</label><input id="newLocation" placeholder="مثلاً: انبار مواد اولیه"></div><div style="align-self:end"><button class="btn primary full" id="addLocation">افزودن محل</button></div></div><div class="list" style="margin-top:10px">${db.locations.map((l,i)=>`<div class="loc-row"><input value="${esc(l)}" data-location-input="${i}"><button class="btn gray" data-save-location="${i}">ثبت</button><button class="btn danger" data-delete-location="${i}">حذف</button></div>`).join('')||'<div class="empty-state">محلی ثبت نشده.</div>'}</div></section><section class="card"><h3>پشتیبان‌گیری</h3><div class="actions"><button class="btn gray" id="exportDB">خروجی JSON</button><button class="btn danger" id="resetDB">ریست کامل</button></div><textarea id="backupBox" placeholder="خروجی اینجا نمایش داده می‌شود"></textarea></section>`; }

function bindEvents(){
  document.querySelectorAll('[data-view]').forEach(b=>b.onclick=()=>{currentView=b.dataset.view;if(currentView!=='newTask')editingTaskId='';closeDrawer();renderView();});
  document.querySelectorAll('[data-dash-filter]').forEach(b=>b.onclick=()=>{dashboardFilter=b.dataset.dashFilter;currentView='tasks';renderView();});
  document.querySelectorAll('[data-toggle-home]').forEach(b=>b.onclick=()=>{homeOpen[b.dataset.toggleHome]=!homeOpen[b.dataset.toggleHome];renderView();});
  const hts=$('homeTaskSearch'); if(hts) hts.oninput=()=>{taskSearch=hts.value; renderView();};
  const hrs=$('homeReportSearch'); if(hrs) hrs.oninput=()=>{reportSearch=hrs.value; renderView();};
  const ts=$('taskSearch'); if(ts) ts.oninput=()=>{taskSearch=ts.value; renderView();};
  const rs=$('reportSearch'); if(rs) rs.oninput=()=>{reportSearch=rs.value; renderView();};
  document.querySelectorAll('[data-menu]').forEach(btn=>btn.onclick=(e)=>{e.stopPropagation();document.querySelectorAll('.action-menu').forEach(m=>m.classList.remove('show'));$('menu_'+btn.dataset.menu)?.classList.toggle('show');});
  document.body.onclick=()=>document.querySelectorAll('.action-menu').forEach(m=>m.classList.remove('show'));
  document.querySelectorAll('[data-detail]').forEach(el=>el.onclick=e=>{e.stopPropagation();showDetail(el.dataset.detail);});
  document.querySelectorAll('[data-done]').forEach(el=>el.onclick=e=>{e.stopPropagation();markDone(el.dataset.done);});
  document.querySelectorAll('[data-edit]').forEach(el=>el.onclick=e=>{e.stopPropagation();editingTaskId=el.dataset.edit;currentView='newTask';render();});
  document.querySelectorAll('[data-delete]').forEach(el=>el.onclick=e=>{e.stopPropagation();deleteTask(el.dataset.delete);});
  const hasTime=$('hasTime'); if(hasTime){ const update=()=>{$('timeBox')?.classList.toggle('hidden',!hasTime.checked);}; hasTime.onchange=update; update(); }
  const saveTask=$('saveTask'); if(saveTask) saveTask.onclick=saveTaskAction;
  const cancelEdit=$('cancelEdit'); if(cancelEdit) cancelEdit.onclick=()=>{editingTaskId='';currentView='tasks';render();};
  const saveReport=$('saveReport'); if(saveReport) saveReport.onclick=saveReportAction;
  const cancelReport=$('cancelReportEdit'); if(cancelReport) cancelReport.onclick=()=>{editingReportId='';renderView();};
  document.querySelectorAll('[data-edit-report]').forEach(b=>b.onclick=()=>{editingReportId=b.dataset.editReport; currentView='daily'; renderView();});
  document.querySelectorAll('[data-delete-report]').forEach(b=>b.onclick=()=>{deleteReport(b.dataset.deleteReport);});
  const printToday=$('printToday'); if(printToday) printToday.onclick=printTodayReport;
  const savePerson=$('savePerson'); if(savePerson) savePerson.onclick=()=>{if(!val('personName').trim()){alert('نام را بنویس.');return;} db.users.push({id:uid('u'),name:val('personName'),role:val('personRole'),department:val('personDept'),managerId:val('personManager'),level:val('personLevel'),active:true});save();renderView();};
  const saveAsset=$('saveAsset'); if(saveAsset) saveAsset.onclick=()=>{if(!val('assetName').trim()){alert('نام دستگاه را بنویس.');return;} db.assets.push({id:uid('a'),name:val('assetName'),code:val('assetCode'),location:val('assetLoc'),responsibleId:val('assetResp')});save();renderView();};
  const addLocation=$('addLocation'); if(addLocation) addLocation.onclick=()=>{const name=val('newLocation').trim(); if(!name)return; if(!db.locations.includes(name)) db.locations.push(name); save(); renderView();};
  document.querySelectorAll('[data-save-location]').forEach(b=>b.onclick=()=>{const i=Number(b.dataset.saveLocation); const input=document.querySelector(`[data-location-input="${i}"]`); const old=db.locations[i]; const name=input.value.trim(); if(!name)return; db.locations[i]=name; db.tasks.forEach(t=>{if(t.location===old)t.location=name;}); db.assets.forEach(a=>{if(a.location===old)a.location=name;}); save(); renderView();});
  document.querySelectorAll('[data-delete-location]').forEach(b=>b.onclick=()=>{const i=Number(b.dataset.deleteLocation); const name=db.locations[i]; if(confirm(`محل «${name}» حذف شود؟`)){db.locations.splice(i,1);save();renderView();}});
  const exportDB=$('exportDB'); if(exportDB) exportDB.onclick=()=>{$('backupBox').value=JSON.stringify(db,null,2);};
  const reset=$('resetDB'); if(reset) reset.onclick=()=>{if(confirm('کل اطلاعات پاک شود؟')){resetDB();render();}};
}
function markDone(id){ const t=db.tasks.find(x=>x.id===id); if(!t||!canDoTask(t)){alert('اجازه ثبت انجام نداری.');return;} const note=prompt('توضیح انجام:',''); t.status='done'; t.doneAt=nowText(); t.doneNote=note||''; t.logs=t.logs||[]; t.logs.push({at:nowText(),by:currentUserId,action:'انجام شد'}); save(); renderView(); }
function deleteTask(id){ const t=db.tasks.find(x=>x.id===id); if(!t||!canDeleteTask(t)){alert('اجازه حذف نداری.');return;} if(confirm('این وظیفه حذف شود؟')){db.tasks=db.tasks.filter(x=>x.id!==id);save();renderView();} }
function deleteReport(id){ const r=db.dailyReports.find(x=>x.id===id); if(!r)return; if(r.userId!==currentUserId && currentUser()?.level!=='admin'){alert('اجازه حذف این گزارش را نداری.');return;} if(confirm('این گزارش حذف شود؟')){db.dailyReports=db.dailyReports.filter(x=>x.id!==id); if(editingReportId===id) editingReportId=''; save(); renderView();} }
function showDetail(id){ const t=db.tasks.find(x=>x.id===id); if(!t)return; alert(`عنوان: ${t.title}\nمسئول: ${userName(t.executorId)}\nتعریف‌کننده: ${userName(t.creatorId)}\nپیگیرها: ${(t.watcherIds||[]).map(userName).join('، ')}\nمحل: ${t.location||'-'}\nدستگاه: ${assetName(t.assetId)}\nمهلت: ${formatJalali(t.dueDate)} ${t.hasTime? t.dueTime : 'بدون ساعت'}\nنوع: ${t.type}\nوضعیت: ${t.status}\nشرح: ${t.description||'-'}`); }

render();
