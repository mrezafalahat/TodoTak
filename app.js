const $ = s => document.querySelector(s);
const $$ = s => [...document.querySelectorAll(s)];
const LS_TASKS='tak_v6_tasks', LS_REPORTS='tak_v6_reports';
let page='home', sheetMode='task', editId=null;
let tasks=load(LS_TASKS, seedTasks()), reports=load(LS_REPORTS, []);
let currentDate = isoToday(), currentTime='', currentPerson='محمدرضا';

function load(k,def){try{return JSON.parse(localStorage.getItem(k))??def}catch{return def}}
function save(){localStorage.setItem(LS_TASKS,JSON.stringify(tasks));localStorage.setItem(LS_REPORTS,JSON.stringify(reports)); scheduleNotifications();}
function uid(){return Math.random().toString(36).slice(2)+Date.now().toString(36)}
function isoToday(){const d=new Date(); return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`}
function faDate(iso){if(!iso)return 'بدون تاریخ'; const d=new Date(iso+'T00:00:00'); return new Intl.DateTimeFormat('fa-IR-u-ca-persian',{month:'numeric',day:'numeric'}).format(d)}
function dayWord(iso){return iso===isoToday()?'Today':faDate(iso)}
function seedTasks(){return[
 {id:uid(),title:'پیگیری بار آلومینیوم گمرک',desc:'',date:isoToday(),time:'',person:'محمدرضا',done:false,createdAt:Date.now()},
 {id:uid(),title:'پیگیری ارز خریداری شده',desc:'',date:isoToday(),time:'',person:'محمدرضا',done:false,createdAt:Date.now()},
 {id:uid(),title:'پیگیری و تعیین تکلیف پول برداشت شده بیمه',desc:'',date:isoToday(),time:'',person:'محمدرضا',done:false,createdAt:Date.now()},
 {id:uid(),title:'تمدید ضمانت نامه های بارها',desc:'',date:isoToday(),time:'',person:'محمدرضا',done:false,createdAt:Date.now()},
 {id:uid(),title:'پیگیری ارز گرفته شده که چرا تو سیستم ثبت نشده بانک صنعت و معدن',desc:'',date:isoToday(),time:'',person:'محمدرضا',done:false,createdAt:Date.now()},
 {id:uid(),title:'امضا پروفرما خانم اشراقی',desc:'',date:isoToday(),time:'',person:'محمدرضا',done:false,createdAt:Date.now()},
 {id:uid(),title:'ثبت سفارش ها اصلاح شود بارهایی که ارز آن گرفته شده',desc:'',date:isoToday(),time:'',person:'محمدرضا',done:false,createdAt:Date.now()}
]}

function render(){
  $$('#app .nav-item').forEach(b=>b.classList.toggle('active',b.dataset.page===page));
  $('#pageTitle').textContent = page==='home'?'خانه':page==='tasks'?'وظایف':'گزارش من';
  $('#fab').style.display = page==='home'?'none':'block';
  if(page==='home') renderHome();
  if(page==='tasks') renderTasks();
  if(page==='reports') renderReports();
}
function renderHome(){
 const open=tasks.filter(t=>!t.done).length, done=tasks.filter(t=>t.done).length, today=tasks.filter(t=>t.date===isoToday()&&!t.done).length, late=tasks.filter(t=>t.date<isoToday()&&!t.done).length;
 $('#view').innerHTML=`<div class="stats"><div class="stat"><b>${open}</b><span>باز</span></div><div class="stat"><b>${today}</b><span>امروز</span></div><div class="stat"><b>${late}</b><span>عقب افتاده</span></div><div class="stat"><b>${done}</b><span>انجام</span></div></div><div class="list-card"><div class="section-head"><h2>وظایف امروز</h2><button class="mini-btn" onclick="go('tasks')">همه</button></div>${taskList(tasks.filter(t=>t.date===isoToday()&&!t.done).slice(0,5))}</div><div class="list-card"><div class="section-head"><h2>گزارش امروز</h2><button class="mini-btn" onclick="go('reports')">همه</button></div>${reports.filter(r=>r.date===isoToday()).map(reportHtml).join('')||'<div class="empty">گزارشی وجود ندارد.</div>'}</div>`;
}
function renderTasks(){
 $('#view').innerHTML=`<input class="search" id="taskSearch" placeholder="جستجو در وظایف..."><div class="todo-list"><div class="group-title">TODAY <span style="float:right;color:#999;font-weight:400">${tasks.filter(t=>!t.done).length}</span></div><div id="taskContainer"></div></div>`;
 $('#taskSearch').oninput=()=>paintTaskSearch($('#taskSearch').value);
 paintTaskSearch('');
}
function paintTaskSearch(q){
 q=(q||'').trim().toLowerCase();
 const list=tasks.filter(t=>!q || [t.title,t.desc,t.person,t.date,t.time].join(' ').toLowerCase().includes(q)).sort((a,b)=>(a.done-b.done)||((a.date||'9999')>(b.date||'9999')?1:-1));
 $('#taskContainer').innerHTML=taskList(list);
}
function taskList(list){return list.length?list.map(taskHtml).join(''):'<div class="empty">وظیفه‌ای وجود ندارد.</div>'}
function taskHtml(t){return `<div class="task-row"><button class="check ${t.done?'done':''}" onclick="toggleTask('${t.id}')">${t.done?'✓':''}</button><div class="task-content"><div class="task-title ${t.done?'done':''}">${esc(t.title)}</div><div class="meta"><span class="date-blue">${dayWord(t.date)}</span><span class="inbox">Inbox</span></div><div class="submeta"><span class="chip">${esc(t.person||'بدون مسئول')}</span>${t.time?`<span class="chip">⏰ ${t.time}</span>`:''}</div><div class="actions"><button class="mini-btn" onclick="editTask('${t.id}')">ویرایش</button><button class="mini-btn danger" onclick="deleteTask('${t.id}')">حذف</button></div></div></div>`}
function renderReports(){
 $('#view').innerHTML=`<input class="search" id="reportSearch" placeholder="جستجو در گزارش من..."><div id="reportContainer"></div>`;
 $('#reportSearch').oninput=()=>paintReportSearch($('#reportSearch').value);
 paintReportSearch('');
}
function paintReportSearch(q){
 q=(q||'').trim().toLowerCase();
 const list=reports.filter(r=>!q || [r.text,r.desc,r.person,r.date].join(' ').toLowerCase().includes(q)).sort((a,b)=>b.createdAt-a.createdAt);
 $('#reportContainer').innerHTML=list.map(reportHtml).join('')||'<div class="empty">گزارشی وجود ندارد.</div>';
}
function reportHtml(r){return `<div class="report-item"><div class="report-text">${esc(r.text)}</div>${r.desc?`<div class="report-text" style="font-size:15px;color:#666">${esc(r.desc)}</div>`:''}<div class="report-meta">${faDate(r.date)} • ${esc(r.person||'محمدرضا')}</div><div class="actions"><button class="mini-btn" onclick="editReport('${r.id}')">ویرایش</button><button class="mini-btn danger" onclick="deleteReport('${r.id}')">حذف</button></div></div>`}
function esc(s){return (s||'').replace(/[&<>"]/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[m]))}
function go(p){page=p; render()}
function toggleTask(id){const t=tasks.find(x=>x.id===id); if(t){t.done=!t.done; save(); render()}}
function deleteTask(id){if(confirm('حذف شود؟')){tasks=tasks.filter(t=>t.id!==id); save(); render()}}
function deleteReport(id){if(confirm('حذف شود؟')){reports=reports.filter(r=>r.id!==id); save(); render()}}
function editTask(id){const t=tasks.find(x=>x.id===id); if(!t)return; openSheet('task',t)}
function editReport(id){const r=reports.find(x=>x.id===id); if(!r)return; openSheet('report',r)}

function openSheet(mode,item=null){
 sheetMode=mode; editId=item?.id||null; currentDate=item?.date||isoToday(); currentTime=item?.time||''; currentPerson=item?.person||'محمدرضا';
 $('#quickTitle').placeholder=mode==='task'?'چه کاری باید انجام شود؟':'گزارش امروز را بنویسید...';
 $('#quickTitle').value=item?(mode==='task'?item.title:item.text):''; $('#quickDesc').value=item?.desc||'';
 updateLabels(); $('#pickers').classList.add('hidden'); $('#quickSheet').classList.add('show'); $('#sheetBackdrop').classList.add('show'); setTimeout(()=>$('#quickTitle').focus(),100);
}
function closeSheet(){ $('#quickSheet').classList.remove('show'); $('#sheetBackdrop').classList.remove('show'); editId=null; }
function updateLabels(){ $('#dateLabel').textContent=dayWord(currentDate); $('#personLabel').textContent=currentPerson||'مسئول'; $('#timeLabel').textContent=currentTime||'بدون ساعت'; $('#dateInput').value=currentDate; $('#timeInput').value=currentTime; $('#personInput').value=currentPerson;}
$('#fab').onclick=()=>openSheet(page==='reports'?'report':'task');
$('#sheetBackdrop').onclick=closeSheet;
$('#pickDate').onclick=()=>{ $('#pickers').classList.toggle('hidden'); $('#dateInput').focus(); };
$('#pickTime').onclick=()=>{ $('#pickers').classList.toggle('hidden'); $('#timeInput').focus(); };
$('#pickPerson').onclick=()=>{ $('#pickers').classList.toggle('hidden'); $('#personInput').focus(); };
$('#dateInput').onchange=e=>{currentDate=e.target.value||isoToday(); updateLabels()};
$('#timeInput').onchange=e=>{currentTime=e.target.value; updateLabels()};
$('#personInput').oninput=e=>{currentPerson=e.target.value; updateLabels()};
$('#quickForm').onsubmit=e=>{
 e.preventDefault(); const title=$('#quickTitle').value.trim(), desc=$('#quickDesc').value.trim(); if(!title)return;
 if(sheetMode==='task'){
   if(editId){const t=tasks.find(x=>x.id===editId); Object.assign(t,{title,desc,date:currentDate,time:currentTime,person:currentPerson});}
   else tasks.unshift({id:uid(),title,desc,date:currentDate,time:currentTime,person:currentPerson,done:false,createdAt:Date.now(),notified:false});
 }else{
   if(editId){const r=reports.find(x=>x.id===editId); Object.assign(r,{text:title,desc,date:currentDate,person:currentPerson});}
   else reports.unshift({id:uid(),text:title,desc,date:currentDate,person:currentPerson,createdAt:Date.now()});
 }
 save(); closeSheet(); render();
};
$$('.nav-item').forEach(b=>b.onclick=()=>go(b.dataset.page));
$('#notifBtn').onclick=async()=>{ await askNotification(); alert('نوتیفیکیشن فعال شد. برای اعلان دقیق، سایت باید روی گوشی نصب یا در مرورگر باز باشد.'); };
$('#menuBtn').onclick=()=>alert('نسخه ساده: خانه، وظایف، گزارش من');

async function askNotification(){ if('Notification' in window && Notification.permission==='default') await Notification.requestPermission(); }
let timers=[];
function scheduleNotifications(){ timers.forEach(clearTimeout); timers=[]; tasks.filter(t=>!t.done && t.date && t.time).forEach(t=>{
 const when=new Date(`${t.date}T${t.time}:00`).getTime(); const delay=when-Date.now();
 if(delay>0 && delay<2147483647) timers.push(setTimeout(()=>notifyTask(t),delay));
});}
function notifyTask(t){ if('Notification' in window && Notification.permission==='granted') new Notification('TAK Duty Control',{body:t.title,tag:t.id}); else alert('یادآوری: '+t.title); }
if('serviceWorker' in navigator) navigator.serviceWorker.register('sw.js').catch(()=>{});
scheduleNotifications(); render();
