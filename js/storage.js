export const DB_KEY = "tak_duty_control_v4_fixed";
export const SESSION_KEY = "tak_duty_user_v4";

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
  return String(str || "").replace(/[0-9]/g, d => map[d]);
}

export function todayJalali(){
  const parts = new Intl.DateTimeFormat("en-US-u-ca-persian", {
    year:"numeric", month:"2-digit", day:"2-digit"
  }).formatToParts(new Date());
  const y = parts.find(p=>p.type==="year").value;
  const m = parts.find(p=>p.type==="month").value.padStart(2,"0");
  const d = parts.find(p=>p.type==="day").value.padStart(2,"0");
  return `${y}/${m}/${d}`;
}

export function nowText(){
  return toPersianDigits(new Date().toLocaleString("fa-IR"));
}

export function normalizeJalali(input){
  let s = toEnglishDigits(input).trim();
  s = s.replaceAll("-", "/").replaceAll(".", "/").replace(/\s/g, "");
  const p = s.split("/").filter(Boolean);
  if(p.length !== 3) return "";
  let [y,m,d] = p;
  if(y.length === 2) y = "14" + y;
  y = y.padStart(4,"0");
  m = m.padStart(2,"0");
  d = d.padStart(2,"0");
  const yy = Number(y), mm = Number(m), dd = Number(d);
  if(!yy || mm < 1 || mm > 12 || dd < 1 || dd > 31) return "";
  return `${y}/${m}/${d}`;
}

export function compareJalali(a,b){
  const aa = normalizeJalali(a).replaceAll("/","");
  const bb = normalizeJalali(b).replaceAll("/","");
  return aa.localeCompare(bb);
}

export function formatJalali(j){
  const n = normalizeJalali(j);
  return n ? toPersianDigits(n) : "-";
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
        id:"t1",
        title:"مرتب‌سازی مواد کنار دستگاه لمینت",
        description:"مواد اضافه جمع‌آوری و مسیر عبور آزاد شود.",
        creatorId:"u1",
        executorId:"u5",
        watcherIds:["u2","u3","u4"],
        department:"سالن تولید",
        location:"دستگاه لمینت",
        assetId:"a1",
        priority:"بالا",
        type:"بازدیدی",
        dueDate:today,
        needPhoto:true,
        status:"open",
        doneAt:"",
        doneNote:"",
        createdAt:nowText(),
        logs:[{at:nowText(), by:"u1", action:"ایجاد وظیفه"}]
      },
      {
        id:"t2",
        title:"تماس با مشتری جدید",
        description:"پیگیری قیمت و درخواست نمونه.",
        creatorId:"u1",
        executorId:"u6",
        watcherIds:["u1"],
        department:"فروش",
        location:"دفتر فروش",
        assetId:"",
        priority:"عادی",
        type:"روزانه",
        dueDate:today,
        needPhoto:false,
        status:"open",
        doneAt:"",
        doneNote:"",
        createdAt:nowText(),
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

export function saveDB(data){
  localStorage.setItem(DB_KEY, JSON.stringify(data));
}

export function getSession(){
  return localStorage.getItem(SESSION_KEY) || "";
}

export function setSession(userId){
  localStorage.setItem(SESSION_KEY, userId);
}

export function clearSession(){
  localStorage.removeItem(SESSION_KEY);
}

export function resetDB(){
  localStorage.removeItem(DB_KEY);
  localStorage.removeItem(SESSION_KEY);
}
