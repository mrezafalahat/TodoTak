const DB_KEY = 'tak_duty_control_db_v4_simple';
const SESSION_KEY = 'tak_duty_control_session_v4';
const $ = id => document.getElementById(id);
const app = $('app');

let db = loadDB();
let currentUserId = localStorage.getItem(SESSION_KEY) || 'u_admin';
let view = 'home';
let taskSearch = '';
let reportSearch = '';
let editingTaskId = '';
let editingReportId = '';
let timers = [];

function uid(p='id'){ return `${p}_${Date.now().toString(36)}_${Math.random().toString(36).slice(2,8)}`; }
function esc(s=''){ return String(s).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c])); }
function val(id){ return $(id)?.value || ''; }
function checked(id){ return !!$(id)?.checked; }
function save(){ localStorage.setItem(DB_KEY, JSON.stringify(db)); scheduleNotifications(); }
function user(){ return db.users.find(x => x.id === currentUserId) || db.users[0]; }
function userName(id){ return db.users.find(x => x.id === id)?.name || 'بدون مسئول'; }
function toEn(x=''){ return String(x).replace(/[۰-۹]/g,d=>'۰۱۲۳۴۵۶۷۸۹'.indexOf(d)).replace(/[٠-٩]/g,d=>'٠١٢٣٤٥٦٧٨٩'.indexOf(d)); }
function toFa(x=''){ return String(x).replace(/[0-9]/g,d=>'۰۱۲۳۴۵۶۷۸۹'[d]); }
function pad(n){ return String(n).padStart(2,'0'); }
function div(a,b){ return Math.floor(a/b); }
function g2j(gy,gm,gd){
  const gdm=[0,31,59,90,120,151,181,212,243,273,304,334];
  let jy=(gy<=1600)?0:979; gy-=(gy<=1600)?621:1600;
  let gy2=(gm>2)?gy+1:gy;
  let days=365*gy+div(gy2+3,4)-div(gy2+99,100)+div(gy2+399,400)-80+gd+gdm[gm-1];
  jy+=33*div(days,12053); days%=12053; jy+=4*div(days,1461); days%=1461;
  if(days>365){ jy+=div(days-1,365); days=(days-1)%365; }
  const jm=(days<186)?1+div(days,31):7+div(days-186,30);
  const jd=1+((days<186)?days%31:(days-186)%30);
  return [jy,jm,jd];
}
function j2g(jy,jm,jd){
  jy=+jy; jm=+jm; jd=+jd; let gy=(jy<=979)?621:1600; jy-=(jy<=979)?0:979;
  let days=365*jy+div(jy,33)*8+div((jy%33)+3,4)+78+jd+(jm<7?(jm-1)*31:((jm-7)*30+186));
  gy+=400*div(days,146097); days%=146097;
  if(days>36524){ gy+=100*div(--days,36524); days%=36524; if(days>=365) days++; }
  gy+=4*div(days,1461); days%=1461; if(days>365){ gy+=div(days-1,365); days=(days-1)%365; }
  let gd=days+1; const sal=[0,31,((gy%4===0&&gy%100!==0)||gy%400===0)?29:28,31,30,31,30,31,31,30,31,30,31];
  let gm=1; while(gm<=12 && gd>sal[gm]){ gd-=sal[gm]; gm++; }
  return [gy,gm,gd];
}
function todayJ(){ const d=new Date(); const [y,m,day]=g2j(d.getFullYear(),d.getMonth()+1,d.getDate()); return `${y}/${pad(m)}/${pad(day)}`; }
function normJ(v=''){
  v=toEn(v).trim().replace(/[-.]/g,'/').replace(/\s+/g,'');
  const m=v.match(/^(\d{4})\/(\d{1,2})\/(\d{1,2})$/); if(!m) return '';
  const y=+m[1], mo=+m[2], d=+m[3]; if(mo<1||mo>12||d<1||d>31) return '';
  return `${y}/${pad(mo)}/${pad(d)}`;
}
function fmtJ(v=''){ const n=normJ(v); if(!n) return toFa(v); return toFa(n); }
function compactJ(v=''){ const n=normJ(v); if(!n) return '-'; const [,m,d]=n.split('/'); return `${toFa(+m)}/${toFa(+d)}`; }
function nowText(){ const d=new Date(); return `${fmtJ(todayJ())} ${toFa(pad(d.getHours()))}:${toFa(pad(d.getMinutes()))}`; }
function dateObj(j, time='00:00'){
  const n=normJ(j); if(!n) return null; const [jy,jm,jd]=n.split('/').map(Number); const [gy,gm,gd]=j2g(jy,jm,jd);
  const [h,min]=toEn(time||'00:00').split(':').map(Number); return new Date(gy,gm-1,gd,h||0,min||0,0,0);
}
function isToday(j){ return normJ(j) === todayJ(); }
function isLate(t){ if(t.status==='done' || t.type==='پیشرو') return false; const d = dateObj(t.dueDate, t.hasTime ? t.dueTime : '23:59'); return d && d < new Date(); }
function statusText(t){ if(t.status==='done') return 'انجام شده'; if(isLate(t)) return 'عقب‌افتاده'; if(t.type==='پیشرو') return 'پیشرو'; return 'باز'; }
function statusClass(t){ if(t.status==='done') return 'done'; if(isLate(t)) return 'late'; if(t.type==='پیشرو') return 'forward'; return 'open'; }
function seed(){
  const today = todayJ();
  return {
    users:[
      {id:'u_admin', name:'محمدرضا', role:'مدیرعامل'},
      {id:'u_factory', name:'مدیر کارخانه', role:'مدیر کارخانه'},
      {id:'u_sales', name:'فروش', role:'کارشناس فروش'},
      {id:'u_office', name:'اداری', role:'اداری'}
    ],
    tasks:[
      {id:uid('t'), title:'پیگیری بار آلومینیوم گمرک', description:'', executorId:'u_admin', type:'امروز', dueDate:today, hasTime:true, dueTime:'09:00', remind:true, repeatMinutes:30, status:'open', createdAt:nowText(), doneAt:''},
      {id:uid('t'), title:'ثبت سفارش ها اصلاح شود بارهایی که ارز آن گرفته شده', description:'', executorId:'u_admin', type:'پیشرو', dueDate:today, hasTime:false, dueTime:'', remind:false, repeatMinutes:0, status:'open', createdAt:nowText(), doneAt:''}
    ],
    reports:[]
  };
}
function loadDB(){
  try{ const d=JSON.parse(localStorage.getItem(DB_KEY)||'null') || seed(); d.users ||= seed().users; d.tasks ||= []; d.reports ||= d.dailyReports || []; return d; }
  catch{ return seed(); }
}
function qMatch(text, q){ return !q || toEn(String(text).toLowerCase()).includes(toEn(q).toLowerCase()); }

async function initPWA(){
  if('serviceWorker' in navigator){ try{ await navigator.serviceWorker.register('./sw.js'); }catch(e){} }
}
async function askNotification(){
  if(!('Notification' in window)) return alert('مرورگر این گوشی نوتیفیکیشن را پشتیبانی نمی‌کند.');
  const p = await Notification.requestPermission();
  if(p === 'granted'){ toast('نوتیفیکیشن فعال شد'); scheduleNotifications(); }
  else alert('اجازه نوتیفیکیشن داده نشد. از تنظیمات مرورگر باید Allow شود.');
}
function clearTimers(){ timers.forEach(clearTimeout); timers=[]; }
function scheduleNotifications(){
  clearTimers();
  if(!('Notification' in window) || Notification.permission !== 'granted') return;
  const now = Date.now();
  db.tasks.filter(t => t.status !== 'done' && t.hasTime && t.dueTime && t.remind).forEach(t => {
    const first = dateObj(t.dueDate, t.dueTime); if(!first) return;
    const times = [first.getTime()];
    const rep = Number(t.repeatMinutes || 0);
    if(rep > 0){ for(let i=1;i<=6;i++) times.push(first.getTime() + i * rep * 60000); }
    times.forEach((ms, idx) => {
      if(ms <= now || ms - now > 2147483647) return;
      const timer = setTimeout(() => showNotification(t, idx), ms - now);
      timers.push(timer);
    });
  });
}
function showNotification(t, idx=0){
  if(t.status === 'done') return;
  const title = idx ? 'یادآوری مجدد وظیفه' : 'زمان انجام وظیفه رسید';
  const body = `${t.title}\n${userName(t.executorId)} • ${fmtJ(t.dueDate)} ${toFa(t.dueTime||'')}`;
  if(navigator.serviceWorker?.controller){ navigator.serviceWorker.controller.postMessage({type:'SHOW_NOTIFICATION', title, body, tag:t.id}); }
  else if('Notification' in window && Notification.permission === 'granted'){ new Notification(title, {body, tag:t.id}); }
}
function toast(msg){ const el=document.createElement('div'); el.className='toast'; el.textContent=msg; document.body.appendChild(el); setTimeout(()=>el.remove(),2200); }

function render(){
  const u = user();
  app.innerHTML = `<div class="appShell">
    <header class="top">
      <button class="topIcon" onclick="openDrawer()">☰</button>
      <div><h1>${view==='home'?'Today':view==='tasks'?'وظایف':'گزارش من'}</h1><small>${esc(u.name)} • ${esc(u.role||'')}</small></div>
      <button class="topIcon" onclick="askNotification()">💡</button>
    </header>
    <main class="main">${view==='home'?homeHTML():view==='tasks'?tasksHTML():view==='reports'?reportsHTML():newHTML()}</main>
    <button class="fab" onclick="go('new')">＋</button>
    ${bottomHTML()}
    ${drawerHTML()}
  </div>`;
}
function drawerHTML(){ return `<div id="backdrop" class="backdrop" onclick="closeDrawer()"></div><aside id="drawer" class="drawer">
  <div class="drawerHead"><div class="avatar">تک</div><b>${esc(user().name)}</b><span>${esc(user().role||'')}</span></div>
  <button onclick="go('home')">🏠 خانه</button><button onclick="go('tasks')">☑️ وظایف</button><button onclick="go('reports')">📝 گزارش من</button><button onclick="go('new')">＋ ثبت جدید</button>
  <div class="drawerFoot"><button onclick="resetDemo()">ریست نمونه</button></div></aside>`; }
function bottomHTML(){ return `<nav class="bottom"><button class="${view==='home'?'active':''}" onclick="go('home')"><span>⌂</span>خانه</button><button class="${view==='tasks'?'active':''}" onclick="go('tasks')"><span>☑</span>وظایف</button><button class="${view==='new'?'active':''}" onclick="go('new')"><span>＋</span>جدید</button><button class="${view==='reports'?'active':''}" onclick="go('reports')"><span>□</span>گزارش</button></nav>`; }
function filteredTasks(filter='all'){
  let arr = [...db.tasks];
  if(filter==='open') arr = arr.filter(t=>t.status!=='done');
  if(filter==='today') arr = arr.filter(t=>t.status!=='done' && (isToday(t.dueDate) || t.type==='پیشرو'));
  if(filter==='late') arr = arr.filter(isLate);
  if(filter==='done') arr = arr.filter(t=>t.status==='done');
  if(taskSearch) arr = arr.filter(t => qMatch(`${t.title} ${t.description} ${userName(t.executorId)} ${t.type} ${statusText(t)}`, taskSearch));
  return arr.sort((a,b)=> (a.status==='done')-(b.status==='done') || (normJ(a.dueDate)||'9999').localeCompare(normJ(b.dueDate)||'9999') || (a.dueTime||'99').localeCompare(b.dueTime||'99'));
}
function homeHTML(){
  const open=db.tasks.filter(t=>t.status!=='done').length, today=filteredTasks('today').length, late=db.tasks.filter(isLate).length, done=db.tasks.filter(t=>t.status==='done').length;
  return `<section class="stats"><button onclick="goTasks('open')"><b>${toFa(open)}</b><span>باز</span></button><button onclick="goTasks('today')"><b>${toFa(today)}</b><span>امروز</span></button><button onclick="goTasks('late')"><b>${toFa(late)}</b><span>عقب‌افتاده</span></button><button onclick="goTasks('done')"><b>${toFa(done)}</b><span>انجام</span></button></section>
  <section class="panel"><h2>وظایف من</h2><input class="search" placeholder="جستجو در وظایف من..." oninput="taskSearch=this.value; render()" value="${esc(taskSearch)}">${taskListHTML(filteredTasks('today').slice(0,8))}</section>
  <section class="panel"><h2>گزارش روزانه</h2><input class="search" placeholder="جستجو در گزارش‌ها..." oninput="reportSearch=this.value; render()" value="${esc(reportSearch)}">${reportListHTML(5)}</section>`;
}
let taskFilter = 'open';
function tasksHTML(){ return `<section class="panel fullPanel"><h2>وظایف</h2><div class="chips"><button class="${taskFilter==='open'?'on':''}" onclick="setFilter('open')">باز</button><button class="${taskFilter==='today'?'on':''}" onclick="setFilter('today')">امروز</button><button class="${taskFilter==='late'?'on':''}" onclick="setFilter('late')">عقب‌افتاده</button><button class="${taskFilter==='done'?'on':''}" onclick="setFilter('done')">انجام شده</button></div><input class="search" placeholder="سرچ قوی: عنوان، مسئول، وضعیت..." oninput="taskSearch=this.value; render()" value="${esc(taskSearch)}">${taskListHTML(filteredTasks(taskFilter))}</section>`; }
function taskListHTML(arr){ if(!arr.length) return `<div class="empty">وظیفه‌ای وجود ندارد.</div>`; return `<div class="todoList">${arr.map(taskRowHTML).join('')}</div>`; }
function taskRowHTML(t){ return `<article class="todo ${t.status==='done'?'isDone':''}">
  <button class="check" onclick="toggleDone('${t.id}')">${t.status==='done'?'✓':''}</button>
  <div class="todoBody" onclick="editTask('${t.id}')"><div class="todoTitle">${esc(t.title)}</div><div class="todoMeta"><span>${esc(userName(t.executorId))}</span><span>${t.type==='پیشرو'?'پیشرو':fmtJ(t.dueDate)}</span>${t.hasTime&&t.dueTime?`<span>${toFa(t.dueTime)}</span>`:''}<span class="badge ${statusClass(t)}">${statusText(t)}</span></div>${t.description?`<div class="todoDesc">${esc(t.description)}</div>`:''}</div>
  <button class="more" onclick="menuTask(event,'${t.id}')">⋮</button></article>`; }
function reportsHTML(){ return `<section class="panel fullPanel"><h2>گزارش من</h2><input class="search" placeholder="جستجو در گزارش‌ها..." oninput="reportSearch=this.value; render()" value="${esc(reportSearch)}">${reportListHTML(999)}</section>`; }
function filteredReports(){ let arr=[...db.reports]; if(reportSearch) arr=arr.filter(r=>qMatch(`${r.text} ${r.type} ${userName(r.userId)} ${r.date}`, reportSearch)); return arr.sort((a,b)=>(normJ(b.date)||'').localeCompare(normJ(a.date)||'')); }
function reportListHTML(limit){ const arr=filteredReports().slice(0,limit); if(!arr.length) return `<div class="empty">گزارشی وجود ندارد.</div>`; return `<div class="reportList">${arr.map(r=>`<article class="report" onclick="editReport('${r.id}')"><div><b>${esc(r.type)}</b><span>${fmtJ(r.date)} • ${esc(userName(r.userId))}</span></div><p>${esc(r.text)}</p></article>`).join('')}</div>`; }
function newHTML(){ return `<section class="panel fullPanel"><div class="tabs"><button class="${editingReportId?'':'on'}" onclick="editingReportId='';render()">وظیفه</button><button class="${editingReportId?'on':''}" onclick="newReport()">گزارش</button></div>${editingReportId?reportFormHTML():taskFormHTML()}</section>`; }
function taskFormHTML(){ const t = db.tasks.find(x=>x.id===editingTaskId) || {title:'',description:'',executorId:currentUserId,type:'امروز',dueDate:todayJ(),hasTime:false,dueTime:'09:00',remind:false,repeatMinutes:30,status:'open'}; return `<h2>${editingTaskId?'ویرایش وظیفه':'ثبت وظیفه جدید'}</h2>
  <label>عنوان وظیفه</label><textarea id="taskTitle" class="bigTitle" placeholder="مثلاً پیگیری بار آلومینیوم گمرک">${esc(t.title)}</textarea>
  <label>توضیح</label><textarea id="taskDesc" placeholder="توضیح اختیاری">${esc(t.description||'')}</textarea>
  <div class="formGrid"><div><label>مسئول</label><select id="taskUser">${db.users.map(u=>`<option value="${u.id}" ${u.id===t.executorId?'selected':''}>${esc(u.name)}</option>`).join('')}</select></div><div><label>نوع</label><select id="taskType" onchange="render()"><option ${t.type==='امروز'?'selected':''}>امروز</option><option ${t.type==='تاریخ مشخص'?'selected':''}>تاریخ مشخص</option><option ${t.type==='پیشرو'?'selected':''}>پیشرو</option></select></div><div><label>تاریخ شمسی</label><input id="taskDate" value="${esc(t.dueDate||todayJ())}" placeholder="1405/03/09"></div></div>
  <label class="checkLine"><input id="hasTime" type="checkbox" ${t.hasTime?'checked':''}> ساعت دارد</label>
  <div class="formGrid"><div><label>ساعت</label><input id="taskTime" value="${esc(t.dueTime||'09:00')}" placeholder="09:00"></div><div><label class="checkLine inner"><input id="remind" type="checkbox" ${t.remind?'checked':''}> نوتیفیکیشن</label></div><div><label>تکرار یادآوری / دقیقه</label><input id="repeatMin" type="number" value="${esc(t.repeatMinutes||30)}"></div></div>
  <div class="actions"><button class="btn primary" onclick="saveTask()">ذخیره وظیفه</button>${editingTaskId?`<button class="btn danger" onclick="deleteTask('${editingTaskId}')">حذف</button>`:''}<button class="btn" onclick="cancelEdit()">انصراف</button></div>
  <div class="hint">برای نوتیفیکیشن، دکمه چراغ بالای صفحه را بزن و اجازه اعلان بده. در مرورگر موبایل، وقتی صفحه کاملاً بسته باشد اعلان تضمینی نیست؛ ولی در حالت PWA/باز بودن صفحه کار می‌کند.</div>`; }
function reportFormHTML(){ const r = db.reports.find(x=>x.id===editingReportId) || {date:todayJ(),type:'عمومی',text:'',userId:currentUserId}; return `<h2>${db.reports.find(x=>x.id===editingReportId)?'ویرایش گزارش':'ثبت گزارش من'}</h2><div class="formGrid"><div><label>تاریخ</label><input id="repDate" value="${esc(r.date)}"></div><div><label>نوع</label><select id="repType"><option ${r.type==='عمومی'?'selected':''}>عمومی</option><option ${r.type==='فروش'?'selected':''}>فروش</option><option ${r.type==='تولید'?'selected':''}>تولید</option><option ${r.type==='اداری'?'selected':''}>اداری</option></select></div></div><label>متن گزارش</label><textarea id="repText" class="reportText" placeholder="امروز چه کارهایی انجام شد؟">${esc(r.text||'')}</textarea><div class="actions"><button class="btn primary" onclick="saveReport()">ذخیره گزارش</button>${db.reports.find(x=>x.id===editingReportId)?`<button class="btn danger" onclick="deleteReport('${editingReportId}')">حذف</button>`:''}<button class="btn" onclick="cancelEdit()">انصراف</button></div>`; }

window.go = v => { view=v; editingTaskId=''; if(v!=='new') editingReportId=''; render(); };
window.goTasks = f => { taskFilter=f; view='tasks'; render(); };
window.setFilter = f => { taskFilter=f; render(); };
window.openDrawer = () => { $('drawer')?.classList.add('show'); $('backdrop')?.classList.add('show'); };
window.closeDrawer = () => { $('drawer')?.classList.remove('show'); $('backdrop')?.classList.remove('show'); };
window.askNotification = askNotification;
window.toggleDone = id => { const t=db.tasks.find(x=>x.id===id); if(!t) return; t.status = t.status==='done'?'open':'done'; t.doneAt = t.status==='done'?nowText():''; save(); render(); };
window.editTask = id => { editingTaskId=id; editingReportId=''; view='new'; render(); };
window.menuTask = (ev,id) => { ev.stopPropagation(); const t=db.tasks.find(x=>x.id===id); if(!t) return; const doIt=confirm(`${t.title}\n\nOK = انجام شد / باز شود\nCancel = ویرایش`); if(doIt) window.toggleDone(id); else window.editTask(id); };
window.deleteTask = id => { if(confirm('وظیفه حذف شود؟')){ db.tasks=db.tasks.filter(x=>x.id!==id); save(); editingTaskId=''; view='tasks'; render(); } };
window.saveTask = () => {
  const title=val('taskTitle').trim(); if(!title) return alert('عنوان وظیفه را بنویس.');
  const dueDate=normJ(val('taskDate')) || todayJ();
  const t = db.tasks.find(x=>x.id===editingTaskId) || {id:uid('t'), createdAt:nowText(), status:'open', doneAt:''};
  Object.assign(t,{title, description:val('taskDesc').trim(), executorId:val('taskUser'), type:val('taskType'), dueDate, hasTime:checked('hasTime'), dueTime:toEn(val('taskTime')||'09:00'), remind:checked('remind'), repeatMinutes:Number(val('repeatMin')||0)});
  if(!db.tasks.find(x=>x.id===t.id)) db.tasks.push(t);
  save(); editingTaskId=''; view='tasks'; toast('ذخیره شد'); render();
};
window.newReport = () => { editingReportId='new'; editingTaskId=''; view='new'; render(); };
window.editReport = id => { editingReportId=id; editingTaskId=''; view='new'; render(); };
window.saveReport = () => { const text=val('repText').trim(); if(!text) return alert('متن گزارش را بنویس.'); let r=db.reports.find(x=>x.id===editingReportId); if(!r){ r={id:uid('r'), userId:currentUserId, createdAt:nowText()}; db.reports.push(r); } Object.assign(r,{date:normJ(val('repDate'))||todayJ(), type:val('repType'), text}); save(); editingReportId=''; view='reports'; toast('گزارش ذخیره شد'); render(); };
window.deleteReport = id => { if(confirm('گزارش حذف شود؟')){ db.reports=db.reports.filter(x=>x.id!==id); save(); editingReportId=''; view='reports'; render(); } };
window.cancelEdit = () => { editingTaskId=''; editingReportId=''; view='home'; render(); };
window.resetDemo = () => { if(confirm('اطلاعات نمونه و فعلی ریست شود؟')){ db=seed(); save(); view='home'; render(); } };

initPWA(); render(); scheduleNotifications();
