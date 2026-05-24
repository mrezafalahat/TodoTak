export const DB_KEY = "tak_duty_control_telegram_style_v1";
export const SESSION_KEY = "tak_duty_control_telegram_user_v1";

export function uid(prefix="id"){
  return `${prefix}_${Date.now()}_${Math.random().toString(16).slice(2)}`;
}

export function toEnglishDigits(str){
  const fa = "۰۱۲۳۴۵۶۷۸۹";
  const ar = "٠١٢٣٤٥٦٧٨٩";
  return String(str || "")
    .replace(/[۰-۹]/g, d => fa.indexOf(d))
    .replace(/[٠-٩]/g, d => ar.indexOf(d));
}

export function toPersianDigits(str){
  const map = {"0":"۰","1":"۱","2":"۲","3":"۳","4":"۴","5":"۵","6":"۶","7":"۷","8":"۸","9":"۹"};
  return String(str ?? "").replace(/[0-9]/g, d => map[d]);
}

export function div(a,b){ return Math.floor(a/b); }

export function gregorianToJalali(gy, gm, gd){
  const g_d_m = [0,31,59,90,120,151,181,212,243,273,304,334];
  let jy = (gy <= 1600) ? 0 : 979;
  gy -= (gy <= 1600) ? 621 : 1600;
  const gy2 = (gm > 2) ? gy + 1 : gy;
  let days = 365*gy + div(gy2+3,4) - div(gy2+99,100) + div(gy2+399,400) - 80 + gd + g_d_m[gm-1];
  jy += 33*div(days,12053);
  days %= 12053;
  jy += 4*div(days,1461);
  days %= 1461;
  if(days > 365){
    jy += div(days-1,365);
    days = (days-1)%365;
  }
  const jm = (days < 186) ? 1 + div(days,31) : 7 + div(days-186,30);
  const jd = 1 + ((days < 186) ? (days%31) : ((days-186)%30));
  return [jy,jm,jd];
}

export function jalaliToGregorian(jy, jm, jd){
  jy = Number(jy); jm = Number(jm); jd = Number(jd);
  let gy = (jy <= 979) ? 621 : 1600;
  jy -= (jy <= 979) ? 0 : 979;
  let days = 365*jy + div(jy,33)*8 + div((jy%33)+3,4) + 78 + jd + (jm < 7 ? (jm-1)*31 : ((jm-7)*30 + 186));
  gy += 400*div(days,146097);
  days %= 146097;
  if(days > 36524){
    gy += 100*div(--days,36524);
    days %= 36524;
    if(days >= 365) days++;
  }
  gy += 4*div(days,1461);
  days %= 1461;
  if(days > 365){
    gy += div(days-1,365);
    days = (days-1)%365;
  }
  let gd = days + 1;
  const sal_a = [0,31,(gy%4===0 && gy%100!==0) || gy%400===0 ? 29 : 28,31,30,31,30,31,31,30,31,30,31];
  let gm = 1;
  while(gm <= 12 && gd > sal_a[gm]){
    gd -= sal_a[gm];
    gm++;
  }
  return [gy,gm,gd];
}

export function isLeapJalali(jy){
  const breaks=[-61,9,38,199,426,686,756,818,1111,1181,1210,1635,2060,2097,2192,2262,2324,2394,2456,3178];
  let bl=breaks.length, gy=jy+621, leapJ=-14, jp=breaks[0], jm, jump, leap, n, i;
  if(jy<jp || jy>=breaks[bl-1]) return false;
  for(i=1;i<bl;i++){
    jm=breaks[i]; jump=jm-jp;
    if(jy<jm) break;
    leapJ += div(jump,33)*8 + div(jump%33,4);
    jp=jm;
  }
  n=jy-jp;
  leapJ += div(n,33)*8 + div((n%33)+3,4);
  if(jump%33===4 && jump-n===4) leapJ++;
  leap = (((n+1)%33)-1)%4;
  if(leap === -1) leap = 4;
  return leap === 0;
}

export function jalaliMonthLength(y,m){
  m=Number(m);
  if(m<=6) return 31;
  if(m<=11) return 30;
  return isLeapJalali(Number(y)) ? 30 : 29;
}

export function todayJalali(){
  const d = new Date();
  const [jy,jm,jd] = gregorianToJalali(d.getFullYear(), d.getMonth()+1, d.getDate());
  return `${jy}/${String(jm).padStart(2,"0")}/${String(jd).padStart(2,"0")}`;
}

export function normalizeJalali(input){
  let s = toEnglishDigits(input).trim().replaceAll("-", "/").replaceAll(".", "/").replace(/\s/g,"");
  const p = s.split("/").filter(Boolean);
  if(p.length !== 3) return "";
  let [y,m,d] = p;
  if(y.length === 2) y = "14" + y;
  y = y.padStart(4,"0");
  m = m.padStart(2,"0");
  d = d.padStart(2,"0");
  const yy = Number(y), mm = Number(m), dd = Number(d);
  if(!yy || mm < 1 || mm > 12 || dd < 1 || dd > jalaliMonthLength(yy,mm)) return "";
  return `${y}/${m}/${d}`;
}

export function formatJalali(j){
  const n = normalizeJalali(j);
  return n ? toPersianDigits(n) : "-";
}

export function compactJalali(j){
  const n = normalizeJalali(j);
  if(!n) return "-";
  const [y,m,d]=n.split("/");
  return toPersianDigits(`${Number(m)}/${Number(d)}`);
}

export function compareJalali(a,b){
  const aa = normalizeJalali(a).replaceAll("/","");
  const bb = normalizeJalali(b).replaceAll("/","");
  return aa.localeCompare(bb);
}

export function nowText(){
  return toPersianDigits(new Date().toLocaleString("fa-IR"));
}

export function seedData(){
  const today = todayJalali();
  return {
    users:[
      {id:"u1", name:"محمدرضا", role:"مدیرعامل", department:"مدیریت", managerId:"", level:"admin", active:true},
      {id:"u2", name:"مدیر کارخانه", role:"مدیر کارخانه", department:"تولید", managerId:"u1", level:"manager", active:true},
      {id:"u3", name:"مدیر سالن", role:"مدیر سالن", department:"سالن تولید", managerId:"u2", level:"supervisor", active:true},
      {id:"u4", name:"منابع انسانی", role:"منابع انسانی", department:"اداری", managerId:"u1", level:"hr", active:true},
      {id:"u5", name:"آقای رضایی", role:"کارگر خط", department:"سالن تولید", managerId:"u3", level:"worker", active:true},
      {id:"u6", name:"کارشناس فروش", role:"فروش", department:"فروش", managerId:"u1", level:"staff", active:true}
    ],
    departments:["مدیریت","تولید","سالن تولید","فروش","اداری","تعمیرات","نگهبانی","انبار","لمینت","چاپ","دایکات"],
    locations:["سوله لفاف","سوله پاکت","سوله جعبه","انبار مواد","دستگاه لمینت","دستگاه چاپ","حیاط","اتاق برق"],
    assets:[
      {id:"a1", name:"لمینت ۳ لایه", code:"LAM-01", location:"سوله لفاف", responsibleId:"u3"},
      {id:"a2", name:"کمپرسور", code:"AIR-01", location:"اتاق برق", responsibleId:"u3"}
    ],
    tasks:[
      {
        id:"t1", title:"مرتب‌سازی مواد کنار دستگاه لمینت",
        description:"مواد اضافه جمع‌آوری شود و مسیر عبور آزاد بماند.",
        creatorId:"u1", executorId:"u5", watcherIds:["u2","u3","u4"],
        department:"سالن تولید", location:"دستگاه لمینت", assetId:"a1",
        priority:"بالا", type:"بازدیدی", dueDate:today, needPhoto:true,
        status:"open", doneAt:"", doneNote:"", createdAt:nowText(),
        logs:[{at:nowText(), by:"u1", action:"ایجاد وظیفه"}]
      },
      {
        id:"t2", title:"تماس با مشتری جدید",
        description:"تماس، ثبت نتیجه و تعیین پیگیری بعدی.",
        creatorId:"u1", executorId:"u6", watcherIds:["u1"],
        department:"فروش", location:"دفتر فروش", assetId:"",
        priority:"عادی", type:"روزانه", dueDate:today, needPhoto:false,
        status:"open", doneAt:"", doneNote:"", createdAt:nowText(),
        logs:[{at:nowText(), by:"u1", action:"ایجاد وظیفه"}]
      }
    ],
    dailyReports:[],
    pmTemplates:[
      {id:"pm1", assetId:"a1", title:"گریس‌کاری رول‌های لمینت", frequency:"ماهانه", executorId:"u3", needPhoto:true, checklist:["گریس سمت چپ","گریس سمت راست","بررسی صدا"], lastGenerated:""}
    ]
  };
}

export function loadDB(){
  const raw = localStorage.getItem(DB_KEY);
  if(!raw){
    const data = seedData();
    saveDB(data);
    return data;
  }
  return JSON.parse(raw);
}
export function saveDB(data){ localStorage.setItem(DB_KEY, JSON.stringify(data)); }
export function getSession(){ return localStorage.getItem(SESSION_KEY) || ""; }
export function setSession(userId){ localStorage.setItem(SESSION_KEY, userId); }
export function clearSession(){ localStorage.removeItem(SESSION_KEY); }
export function resetDB(){ localStorage.removeItem(DB_KEY); localStorage.removeItem(SESSION_KEY); }
