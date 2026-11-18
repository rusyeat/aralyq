import {lessons,gradeKnowledge} from './curriculum.mjs';
export {lessons};
import {tasks,episodes,topics} from './story.mjs';
export {tasks,episodes,topics};
export const VERSION=3, GOAL=2000;
export function freshState(){return{version:VERSION,profile:{name:'',avatar:0},cursor:0,phase:'lobby',answers:[],lessonSeen:[false,false,false],exams:[null,null,null],reflection:'',settings:{music:true,sfx:true,voice:true,drama:true,volume:.28}};}
export function playerName(value){return String(value??'').replace(/[\u0000-\u001f\u007f]/g,'').trim().slice(0,24);}
export function start(state,name,avatar=0){name=playerName(name);if(!name)throw Error('Атыңды жазшы.');return{...freshState(),profile:{name,avatar:Number.isInteger(avatar)&&avatar>=0&&avatar<4?avatar:0},settings:{...state.settings},phase:'lesson'};}
export function initialPayload(task){return task.type==='sequence'?[...task.initial]:['sort','match','compose'].includes(task.type)?Array((task.items||task.rows||task.parts).length).fill(null):task.type==='multi'?[]:null;}
export function ready(task,p){if(['choice','evidence'].includes(task.type))return Number.isInteger(p)&&!!task.options[p];if(task.type==='pause')return ['done','skip'].includes(p);if(task.type==='multi')return Array.isArray(p)&&p.length>0&&new Set(p).size===p.length&&p.every(n=>Number.isInteger(n)&&task.items[n]);if(task.type==='sequence')return Array.isArray(p)&&p.length===task.items.length&&new Set(p).size===p.length&&p.every(n=>Number.isInteger(n)&&task.items[n]);if(task.type==='sort')return Array.isArray(p)&&p.length===task.items.length&&p.every(v=>['fact','guess'].includes(v));if(task.type==='match')return Array.isArray(p)&&p.length===task.rows.length&&p.every(n=>Number.isInteger(n)&&task.values[n]);if(task.type==='compose')return Array.isArray(p)&&p.length===task.parts.length&&p.every((n,i)=>Number.isInteger(n)&&task.parts[i].options[n]);return false;}
export function evaluate(task,p){
 if(!ready(task,p))throw Error('Тапсырманың барлық бөлігін аяқта.');
 let q=0,reply=task.reply,why=task.why,detail=[],impact={};
 if(['choice','evidence'].includes(task.type)){const a=task.options[p];({q,reply,why}=a);impact=a.impact;}
 if(task.type==='sort'){detail=task.items.map((item,i)=>({correct:item[1]===p[i],label:item[0],text:(item[1]==='fact'?'Факт. ':'Болжам. ')+item[2]}));q=detail.filter(d=>d.correct).length/task.items.length;}
 if(task.type==='multi'){const good=p.filter(n=>task.correct.includes(n)).length,bad=p.length-good;q=Math.max(0,(good-bad)/task.correct.length);detail=task.items.map((item,i)=>({correct:p.includes(i)===task.correct.includes(i),label:item[0],text:task.correct.includes(i)?'Осы жағдайда пайдалы таңдау.':'Бұл таңдау негізгі міндетті шешпейді.'}));}
 if(['match','sequence'].includes(task.type)){detail=p.map((n,i)=>({correct:n===task.correct[i],label:task.type==='match'?task.rows[i]:`${i+1}-қадам`,text:task.type==='match'?task.values[task.correct[i]]:task.items[task.correct[i]]}));q=detail.filter(d=>d.correct).length/p.length;}
 if(task.type==='pause'){q=1;detail=[{correct:true,label:p==='done'?'Үзіліс алдың.':'Өзіңе қолайлы үзілісті таңдадың.',text:'Бұл жаттығуды орындаудың бір ғана дұрыс тәсілі жоқ.'}];}
 if(task.type==='compose'){q=p.reduce((s,n,i)=>s+task.parts[i].options[n][1],0)/p.length;detail=p.map((n,i)=>({correct:task.parts[i].options[n][1]>=.75,label:task.parts[i].label,text:task.parts[i].options[n][2]}));}
 if(!impact||!Object.keys(impact).length)impact={trust:Math.round(q*12-3),pressure:Math.round(5-q*12)};
 if(q<.6&&!['choice','evidence','pause'].includes(task.type))reply='aida|Әзірге толық келісе алмадық. Төмендегі түсіндірмені қарап, басқа нұсқаны байқап көр.';
 return{q,reply,why,detail,impact};
}
export function score(answers){let xp=0,streak=0;return answers.map(a=>{streak=a.q>=.75?streak+1:0;const base=Math.round(a.q*100),bonus=a.q>=.75?Math.min(25,(streak-1)*5):0;xp+=base+bonus;return{base,bonus,gain:base+bonus,xp,streak};});}
export function stats(state){const steps=score(state.answers),practiceXP=steps.at(-1)?.xp||0,knowledge=state.exams.map((exam,i)=>exam?gradeKnowledge(i,exam.payload):null),knowledgeXP=knowledge.reduce((sum,exam)=>sum+(exam?.xp||0),0),xp=practiceXP+knowledgeXP;const trust=state.answers.reduce((n,a)=>Math.min(100,Math.max(0,n+(a.impact?.trust||0))),45);const pressure=state.answers.reduce((n,a)=>Math.min(100,Math.max(0,n+(a.impact?.pressure||0))),60);const skill=topics.map((_,topic)=>{const a=state.answers.filter((a,i)=>episodes[tasks[i].ep].topic===topic);return a.length?Math.round(a.reduce((s,x)=>s+x.q,0)/a.length*100):0;});return{xp,practiceXP,knowledgeXP,knowledge,streak:steps.at(-1)?.streak||0,level:1+Math.floor(xp/400),trust,pressure,skill,win:state.answers.length===tasks.length&&knowledge.every(exam=>exam?.passed)&&xp>=GOAL&&skill.every(n=>n>=50)&&trust>=45};}
export function answer(state,p){if(state.phase!=='task'||state.answers.length!==state.cursor)throw Error('Бұл қадамға жауап берілген.');const result=evaluate(tasks[state.cursor],p);return{...state,phase:'feedback',answers:[...state.answers,{id:tasks[state.cursor].id,payload:structuredClone(p),...result}]};}
export function next(state){
 if(state.phase==='lesson'){const topic=episodes[tasks[state.cursor].ep].topic;return{...state,lessonSeen:state.lessonSeen.map((seen,i)=>i===topic?true:seen),phase:'brief'};}
 if(state.phase==='brief')return{...state,phase:'task'};
 if(state.phase==='map')return{...state,phase:state.cursor%6===0?'lesson':'brief'};
 if(state.phase==='feedback'){if((state.cursor+1)%6===0)return{...state,phase:'exam'};const cursor=state.cursor+1;return{...state,cursor,phase:tasks[cursor].ep!==tasks[state.cursor].ep?'map':'task'};}
 if(state.phase==='examFeedback'){const topic=episodes[tasks[state.cursor].ep].topic;if(!state.exams[topic]?.passed)return{...state,phase:'exam'};if(state.cursor===tasks.length-1)return{...state,phase:'ending'};return{...state,cursor:state.cursor+1,phase:'map'};}
 return state;
}
export function answerKnowledge(state,payload){if(state.phase!=='exam')throw Error('Білім тексеруі қазір ашық емес.');const topic=episodes[tasks[state.cursor].ep].topic;const result=gradeKnowledge(topic,payload);return{...state,phase:'examFeedback',exams:state.exams.map((old,i)=>i===topic?result:old)};}
export function retry(state){if(state.phase!=='feedback')return state;return{...state,phase:'task',answers:state.answers.slice(0,state.cursor)};}
export function responseText(task,p){if(['choice','evidence'].includes(task.type))return task.options[p].text;if(task.type==='compose')return p.map((n,i)=>task.parts[i].options[n][0]).join(' ');if(task.type==='sort')return 'Факт пен болжамды ажыратып көрдім.';if(task.type==='multi')return p.map(n=>task.items[n][0]).join(' · ');if(task.type==='sequence')return p.map(n=>task.items[n]).join(' → ');if(task.type==='match')return p.map((n,i)=>task.rows[i]+' — '+task.values[n]).join('; ');return p==='done'?'Бір сәт үзіліс алдым. Енді сөйлесуге дайынмын.':'Өзіме қолайлы тәсілмен үзіліс алдым.';}
export function restore(raw){try{
 const s=JSON.parse(raw);const phases=['lobby','lesson','brief','task','feedback','map','exam','examFeedback','ending'];
 if(!s||s.version!==VERSION||!phases.includes(s.phase)||!Number.isInteger(s.cursor)||s.cursor<0||s.cursor>=tasks.length||!Array.isArray(s.answers))return freshState();
 const count=['feedback','exam','examFeedback','ending'].includes(s.phase)?s.cursor+1:s.cursor;
 if(s.answers.length!==count||s.phase==='ending'&&count!==18||['exam','examFeedback'].includes(s.phase)&&(s.cursor+1)%6!==0||s.phase==='map'&&(s.cursor===0||s.cursor%3!==0)||s.phase==='brief'&&s.cursor%3!==0||s.phase==='lesson'&&s.cursor%6!==0)throw Error('order');
 const profile={name:playerName(s.profile?.name),avatar:Number.isInteger(s.profile?.avatar)&&s.profile.avatar>=0&&s.profile.avatar<4?s.profile.avatar:0};if(s.phase!=='lobby'&&!profile.name)throw Error('name');
 if(!Array.isArray(s.lessonSeen)||s.lessonSeen.length!==3||s.lessonSeen.some(v=>typeof v!=='boolean')||!Array.isArray(s.exams)||s.exams.length!==3)throw Error('curriculum');
 const lessonSeen=[...s.lessonSeen],exams=s.exams.map((e,i)=>e===null?null:gradeKnowledge(i,e.payload));const topic=episodes[tasks[s.cursor].ep].topic;
 for(let i=0;i<topic;i++)if(!exams[i]?.passed||!lessonSeen[i])throw Error('missed topic');
 for(let i=topic+1;i<3;i++)if(exams[i]!==null||lessonSeen[i])throw Error('future topic');
 if(!['lobby','lesson','map'].includes(s.phase)&&!lessonSeen[topic])throw Error('missed lesson');
 if(exams[topic]&&!['exam','examFeedback','ending'].includes(s.phase))throw Error('early exam');
 if(s.phase==='examFeedback'&&!exams[topic]||s.phase==='ending'&&!exams.every(e=>e?.passed))throw Error('unfinished exam');
 const answers=s.answers.map((a,i)=>{if(a.id!==tasks[i].id)throw Error('id');return{id:a.id,payload:a.payload,...evaluate(tasks[i],a.payload)};});
 const defaults=freshState(),settings={...defaults.settings};for(const key of ['music','sfx','voice','drama'])if(typeof s.settings?.[key]==='boolean')settings[key]=s.settings[key];if(Number.isFinite(s.settings?.volume))settings.volume=Math.max(0,Math.min(1,s.settings.volume));
 return{...defaults,profile,cursor:s.cursor,phase:s.phase,answers,lessonSeen,exams,reflection:typeof s.reflection==='string'?s.reflection.slice(0,1500):'',settings};
}catch{return freshState();}}
