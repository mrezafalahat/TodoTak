export const DB_KEY = "tak_duty_control_offline_v1";
export const SESSION_KEY = "tak_duty_current_user";

export function todayISO(){
  return new Date().toISOString().slice(0,10);
}

export function nowText(){
  return new Date().toLocaleString("fa-IR");
}

export function uid(prefix="id"){
  return `${prefix}_${Date.now()}_${Math.random().toString(16).slice(2)}`;
}

export function seedData(){
  return {
    users:[
      {id:"u1", name:"محمدرضا", role:"مدیرعامل", department:"مدیریت", managerId:"", level:"admin", active:true},
      {id:"u2", name:"مدیر کارخانه", role:"مدیر کارخانه", department:"تولید", managerId:"u1", level:"manager", active:true},
      {id:"u3", name:"مدیر سالن", role:"مدیر سالن", department:"سالن تولید", managerId:"u2", level:"supervisor", active:true},
      {id:"u4", name:"منابع انسانی", role:"منابع انسانی", department:"اداری", managerId:"u1", level:"hr", active:true},
      {id:"u5", name:"آقای رضایی", role:"کارگر خط", department:"سالن تولید", managerId:"u3", level:"worker", active:true},
      {id:"u6", name:"کارشناس فروش", role:"فروش", department:"فروش", managerId:"u1", level:"staff", active:true}
    ],
    departments:["مدیریت","تولید","سالن تولید","فروش","اداری","تعمیرات","نگهبانی","انبار"],
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
        dueDate:todayISO(),
        needPhoto:true,
        needNote:true,
        status:"open",
        doneAt:"",
        doneNote:"",
        photos:[],
        createdAt:nowText(),
        logs:[{at:nowText(), by:"u1", action:"ایجاد وظیفه"}]
      }
    ],
    dailyReports:[],
    pmTemplates:[
      {
        id:"pm1",
        assetId:"a1",
        title:"گریس‌کاری رول‌های لمینت",
        frequency:"ماهانه",
        executorId:"u3",
        needPhoto:true,
        checklist:["گریس سمت چپ","گریس سمت راست","بررسی صدای غیرعادی"],
        lastGenerated:""
      }
    ]
  }
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
