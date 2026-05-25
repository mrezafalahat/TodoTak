const DB_KEY = "tak_duty_control_db_v2";
const SESSION_KEY = "tak_duty_control_session_v2";

export function uid(prefix="id"){
  return `${prefix}_${Date.now().toString(36)}_${Math.random().toString(36).slice(2,8)}`;
}

export function toEnglishDigits(input=""){
  return String(input).replace(/[۰-۹]/g, d=>"۰۱۲۳۴۵۶۷۸۹".indexOf(d)).replace(/[٠-٩]/g, d=>"٠١٢٣٤٥٦٧٨٩".indexOf(d));
}

export function toPersianDigits(input=""){
  return String(input).replace(/[0-9]/g, d=>"۰۱۲۳۴۵۶۷۸۹"[d]);
}

export function pad2(n){ return String(n).padStart(2,"0"); }

function div(a,b){ return Math.floor(a/b); }

export function jalaliToGregorian(jy,jm,jd){
  jy = Number(jy); jm = Number(jm); jd = Number(jd);
  let gy = (jy <= 979) ? 621 : 1600;
  jy -= (jy <= 979) ? 0 : 979;
  let days = 365*jy + div(jy,33)*8 + div((jy%33)+3,4) + 78 + jd + (jm < 7 ? (jm-1)*31 : ((jm-7)*30 + 186));
  gy += 400*div(days,146097); days %= 146097;
  if(days > 36524){ gy += 100*div(--days,36524); days %= 36524; if(days >= 365) days++; }
  gy += 4*div(days,1461); days %= 1461;
  if(days > 365){ gy += div(days-1,365); days = (days-1)%365; }
  let gd = days + 1;
  const sal=[0,31,((gy%4===0 && gy%100!==0)||gy%400===0)?29:28,31,30,31,30,31,31,30,31,30,31];
  let gm=1;
  while(gm<=12 && gd>sal[gm]){ gd-=sal[gm]; gm++; }
  return [gy,gm,gd];
}

export function gregorianToJalali(gy,gm,gd){
  gy=Number(gy); gm=Number(gm); gd=Number(gd);
  const g_d_m=[0,31,59,90,120,151,181,212,243,273,304,334];
  let jy = (gy<=1600)?0:979;
  gy -= (gy<=1600)?621:1600;
  let gy2 = (gm>2)?(gy+1):gy;
  let days = 365*gy + div((gy2+3),4) - div((gy2+99),100) + div((gy2+399),400) - 80 + gd + g_d_m[gm-1];
  jy += 33*div(days,12053); days%=12053;
  jy += 4*div(days,1461); days%=1461;
  if(days>365){ jy += div(days-1,365); days=(days-1)%365; }
  let jm = (days<186)?1+div(days,31):7+div(days-186,30);
  let jd = 1 + ((days<186)?(days%31):((days-186)%30));
  return [jy,jm,jd];
}

export function todayJalali(){
  const d = new Date();
  const [jy,jm,jd] = gregorianToJalali(d.getFullYear(), d.getMonth()+1, d.getDate());
  return `${jy}/${pad2(jm)}/${pad2(jd)}`;
}

export function nowText(){
  const d = new Date();
  return `${formatJalali(todayJalali())} ${toPersianDigits(pad2(d.getHours()))}:${toPersianDigits(pad2(d.getMinutes()))}`;
}

export function normalizeJalali(v=""){
  v = toEnglishDigits(String(v).trim()).replace(/-/g,"/").replace(/\s+/g,"");
  const m = v.match(/^(\d{4})\/(\d{1,2})\/(\d{1,2})$/);
  if(!m) return "";
  const y=Number(m[1]), mo=Number(m[2]), d=Number(m[3]);
  if(mo<1 || mo>12 || d<1 || d>jalaliMonthLength(y,mo)) return "";
  return `${y}/${pad2(mo)}/${pad2(d)}`;
}

export function formatJalali(v=""){
  const n = normalizeJalali(v);
  if(!n) return toPersianDigits(v);
  const [y,m,d] = n.split("/");
  return `${toPersianDigits(y)}/${toPersianDigits(m)}/${toPersianDigits(d)}`;
}

export function compactJalali(v=""){
  const n = normalizeJalali(v);
  if(!n) return "-";
  const [,m,d] = n.split("/");
  return `${toPersianDigits(Number(m))}/${toPersianDigits(Number(d))}`;
}

export function compareJalali(a,b){
  a = normalizeJalali(a); b = normalizeJalali(b);
  if(!a || !b) return 0;
  return a.localeCompare(b);
}

export function jalaliMonthLength(y,m){
  y=Number(y); m=Number(m);
  if(m<=6) return 31;
  if(m<=11) return 30;
  return isJalaliLeap(y) ? 30 : 29;
}

function isJalaliLeap(jy){
  const breaks=[-61,9,38,199,426,686,756,818,1111,1181,1210,1635,2060,2097,2192,2262,2324,2394,2456,3178];
  let bl=breaks.length, gy=jy+621, leapJ=-14, jp=breaks[0], jm, jump, leap, n, i;
  if(jy<jp || jy>=breaks[bl-1]) return false;
  for(i=1;i<bl;i++){ jm=breaks[i]; jump=jm-jp; if(jy<jm) break; leapJ += div(jump,33)*8 + div(jump%33,4); jp=jm; }
  n=jy-jp; leapJ += div(n,33)*8 + div((n%33)+3,4); if(jump%33===4 && jump-n===4) leapJ++;
  const leapG = div(gy,4)-div((div(gy,100)+1)*3,4)-150;
  const march = 20 + leapJ - leapG;
  if(jump-n < 6) n = n - jump + div(jump+4,33)*33;
  leap = (((n+1)%33)-1)%4;
  if(leap===-1) leap=4;
  return leap===0;
}

function seedDB(){
  const u1="u_admin", u2="u_factory", u3="u_hall", u4="u_hr", u5="u_sales";
  return {
    users:[
      {id:u1,name:"محمدرضا",role:"مدیرعامل",department:"مدیریت",managerId:"",level:"admin",active:true},
      {id:u2,name:"مدیر کارخانه",role:"مدیر کارخانه",department:"تولید",managerId:u1,level:"manager",active:true},
      {id:u3,name:"مدیر سالن",role:"مدیر سالن",department:"تولید",managerId:u2,level:"supervisor",active:true},
      {id:u4,name:"منابع انسانی",role:"منابع انسانی",department:"اداری",managerId:u1,level:"hr",active:true},
      {id:u5,name:"کارشناس فروش",role:"کارشناس فروش",department:"فروش",managerId:u1,level:"staff",active:true}
    ],
    departments:["مدیریت","فروش","تولید","نگهبانی","تعمیرات","منابع انسانی","مالی"],
    locations:["دفتر فروش","سالن تولید","انبار","نگهبانی","واحد تعمیرات","دفتر مدیریت"],
    assets:[{id:"a1",name:"دستگاه لمینت",code:"LAM-01",location:"سالن تولید",responsibleId:u2}],
    pmTemplates:[],
    tasks:[
      {id:"t1",title:"تماس با مشتری جدید",description:"پیگیری مشتری جدید و ثبت نتیجه.",creatorId:u1,executorId:u5,watcherIds:[u1],department:"فروش",location:"دفتر فروش",assetId:"",priority:"بالا",type:"روزانه",dueDate:todayJalali(),needPhoto:false,status:"open",doneAt:"",doneNote:"",createdAt:nowText(),logs:[]},
      {id:"t2",title:"بررسی نظم سالن",description:"بازدید کوتاه از وضعیت سالن.",creatorId:u1,executorId:u3,watcherIds:[u2],department:"تولید",location:"سالن تولید",assetId:"",priority:"عادی",type:"روزانه",dueDate:todayJalali(),needPhoto:false,status:"done",doneAt:nowText(),doneNote:"انجام شد",createdAt:nowText(),logs:[]}
    ],
    dailyReports:[
      {id:"r1",userId:u1,date:todayJalali(),type:"عمومی",text:"بررسی کلی کارهای روزانه و پیگیری موارد مهم.",createdAt:nowText()}
    ]
  };
}

export function loadDB(){
  try{
    const raw = localStorage.getItem(DB_KEY);
    if(raw){
      const db = JSON.parse(raw);
      db.dailyReports = db.dailyReports || [];
      db.tasks = db.tasks || [];
      db.users = db.users || [];
      db.assets = db.assets || [];
      return db;
    }
  }catch(e){}
  const db = seedDB();
  saveDB(db);
  return db;
}

export function saveDB(db){ localStorage.setItem(DB_KEY, JSON.stringify(db)); }
export function resetDB(){ localStorage.removeItem(DB_KEY); localStorage.removeItem(SESSION_KEY); }
export function getSession(){ return localStorage.getItem(SESSION_KEY) || "u_admin"; }
export function setSession(id){ localStorage.setItem(SESSION_KEY, id); }
export function clearSession(){ localStorage.removeItem(SESSION_KEY); }
