export const STATUSES=['todo','active','done','review'];
export function fresh(data){return {version:1,scheduleRevision:2,student:data.student,updatedAt:null,backupAt:null,initial:Object.fromEntries(data.initial.map(x=>[x.id,true])),weeks:Object.fromEntries(data.weeks.map(x=>[x.id,{date:'',notes:'',tasks:Object.fromEntries(x.tasks.map(t=>[t.id,x.number===1&&t.id==='mon'?'active':'todo']))}])),skills:Object.fromEntries(data.skills.map(x=>[x.id,{first:null,firstDate:'',second:null,secondDate:'',varied:false,notes:''}])),assessments:Object.fromEntries(data.assessments.map(x=>[x.id,{date:'',scores:[null,null,null,null],audio:'',progress:'',next:''}]))};}
const validDate=x=>x===''||typeof x==='string'&&/^\d{4}-\d{2}-\d{2}$/.test(x)&&!Number.isNaN(Date.parse(x))&&new Date(x+'T00:00:00Z').toISOString().slice(0,10)===x;
const score=x=>x===null||Number.isInteger(x)&&x>=0&&x<=3;
const text=x=>typeof x==='string'&&x.length<=6000;
export function validate(raw,data){
 if(!raw||raw.version!==1||raw.student!==data.student)throw Error('备份格式或学生不匹配 / Sauvegarde incompatible.');
 const out=fresh(data);
 for(const x of data.initial){if(typeof raw.initial?.[x.id]!=='boolean')throw Error('历史记录不完整 / Historique incomplet.');out.initial[x.id]=raw.initial[x.id];}
 for(const x of data.weeks){const r=raw.weeks?.[x.id];if(!r||!validDate(r.date)||!text(r.notes))throw Error('每周记录格式不正确 / Semaine invalide.');for(const t of x.tasks)if(!STATUSES.includes(r.tasks?.[t.id]))throw Error('任务状态不正确 / État invalide.');out.weeks[x.id]={date:r.date,notes:r.notes,tasks:Object.fromEntries(x.tasks.map(t=>[t.id,r.tasks[t.id]]))};}
 for(const x of data.skills){const r=raw.skills?.[x.id];if(!r||!score(r.first)||!score(r.second)||!validDate(r.firstDate)||!validDate(r.secondDate)||typeof r.varied!=='boolean'||!text(r.notes))throw Error('能力评分格式不正确 / Score invalide.');out.skills[x.id]={first:r.first,second:r.second,firstDate:r.firstDate,secondDate:r.secondDate,varied:r.varied,notes:r.notes};}
 for(const x of data.assessments){const r=raw.assessments?.[x.id];if(!r||!validDate(r.date)||!Array.isArray(r.scores)||r.scores.length!==4||!r.scores.every(score)||![r.audio,r.progress,r.next].every(text))throw Error('阶段评估格式不正确 / Bilan invalide.');out.assessments[x.id]={date:r.date,scores:[...r.scores],audio:r.audio,progress:r.progress,next:r.next};}
 out.scheduleRevision=Number.isInteger(raw.scheduleRevision)?raw.scheduleRevision:0;out.updatedAt=typeof raw.updatedAt==='string'?raw.updatedAt:null;out.backupAt=typeof raw.backupAt==='string'?raw.backupAt:null;return out;
}
export function skillStatus(s){
 if(s.first===null&&s.second===null)return 'unrated';
 if(s.first===null)return 'firstMissing';
 if(!s.firstDate||s.second!==null&&!s.secondDate)return 'dateMissing';
 if(s.second!==null&&s.secondDate<s.firstDate)return 'dateOrder';
 const current=s.second??s.first;
 if(current<3)return 'practice';
 const days=(Date.parse(s.secondDate)-Date.parse(s.firstDate))/86400000;
 return s.first===3&&s.second===3&&days>=2&&s.varied?'stable':'retest';
}
export function stats(data,state){
 const initial=Object.values(state.initial).filter(Boolean).length;
 const future=data.weeks.reduce((n,w)=>n+['mon','wed','fri'].filter(k=>state.weeks[w.id].tasks[k]==='done').length,0);
 const tasks=data.weeks.reduce((n,w)=>n+Object.values(state.weeks[w.id].tasks).filter(x=>x==='done').length,0);
 const stable=data.skills.filter(x=>skillStatus(state.skills[x.id])==='stable').length;
 const assessed=data.skills.filter(x=>state.skills[x.id].first!==null||state.skills[x.id].second!==null).length;
 const teaching=teachingWeeks(data,state);const weeks=teaching.filter(w=>w.lessons.every(l=>l.status==='done')).length;
 const modules=data.modules.map(m=>{const ws=data.weeks.filter(w=>w.module===m.id),ss=data.skills.filter(s=>s.module===m.id);return {id:m.id,courses:ws.reduce((n,w)=>n+['mon','wed','fri'].filter(k=>state.weeks[w.id].tasks[k]==='done').length,0),tasks:ws.reduce((n,w)=>n+Object.values(state.weeks[w.id].tasks).filter(x=>x==='done').length,0),stable:ss.filter(s=>skillStatus(state.skills[s.id])==='stable').length};});
 return {initial,future,courses:initial+future,total:data.initial.length+data.weeks.length*3,tasks,taskTotal:data.weeks.length*5,stable,assessed,weeks,teachingWeekTotal:teaching.length,modules};
}
export function assessmentAverage(r){return r.date&&r.scores.every(x=>x!==null)?r.scores.reduce((a,b)=>a+b,0)/4:null;}


export function migrateSchedule(state){
 if((state.scheduleRevision||0)<2){for(const key of Object.keys(state.initial))state.initial[key]=true;if(state.weeks.w1.tasks.mon!=='done')state.weeks.w1.tasks.mon='active';state.scheduleRevision=2;}
 return state;
}
export function lessons(data,state){
 const all=data.initial.map(x=>({id:x.id,number:x.number,title:x.title,status:state.initial[x.id]?'done':'todo',expressions:x.expressions||null,initial:true,module:null}));
 for(const w of data.weeks)for(const [i,k]of ['mon','wed','fri'].entries())all.push({id:w.id+':'+k,number:6+(w.number-1)*3+i,title:w.tasks.find(t=>t.id===k).content,status:state.weeks[w.id].tasks[k],module:w.module,initial:false});
 return all;
}
export function teachingWeeks(data,state){const all=lessons(data,state),result=[];for(let i=0;i<all.length;i+=3)result.push({number:Math.floor(i/3)+1,lessons:all.slice(i,i+3)});return result;}
export function currentPosition(data,state){const list=lessons(data,state);const l=list.find(x=>x.status==='active')||list.find(x=>x.status!=='done');return l?{number:l.number,week:Math.ceil(l.number/3),slot:(l.number-1)%3+1}:null;}
