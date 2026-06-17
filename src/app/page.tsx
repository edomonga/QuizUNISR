'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import {
  questions as ALL_QUESTIONS,
  MACRO_AREAS,
  TOPICS_BY_MACRO,
  MacroArea,
  Question,
} from '@/data/questions';
import { COURSES, Course } from '@/data/courses';
import { authenticate, getAllUsers, addUser, deleteUser, updateUser, AppUser } from '@/lib/users';

// ─── Types ───────────────────────────────────────────────────────────────────
type View = 'login'|'course_select'|'dashboard'|'quiz_setup'|'quiz'|'exam_setup'|'exam'|'profile'|'admin';
interface UserSession { username: string; displayName: string; isAdmin: boolean; }
interface TopicStat { correct: number; total: number }
interface ExamRecord { date: string; courseId: string; courseName: string; scoreIn30: number; correct: number; wrong: number; omitted: number; duration: number; }
interface Stats { topicStats: Record<string,TopicStat>; macroStats: Record<string,TopicStat>; examHistory: ExamRecord[]; totalQuestions: number; totalCorrect: number; }

// ─── Helpers ──────────────────────────────────────────────────────────────────
const fmt = (s: number) => `${Math.floor(s/60).toString().padStart(2,'0')}:${(s%60).toString().padStart(2,'0')}`;
const EMPTY_STATS = (): Stats => ({ topicStats:{}, macroStats:{}, examHistory:[], totalQuestions:0, totalCorrect:0 });
const SK = (u: string) => `medquiz_stats_${u}`;
function loadStats(u: string): Stats {
  if (typeof window==='undefined') return EMPTY_STATS();
  try { return JSON.parse(localStorage.getItem(SK(u))||'null')??EMPTY_STATS(); } catch { return EMPTY_STATS(); }
}
function saveStats(u: string, s: Stats) { localStorage.setItem(SK(u), JSON.stringify(s)); }
function recordAnswers(u: string, arr: {question:Question;correct:boolean}[]) {
  const s=loadStats(u);
  arr.forEach(({question,correct})=>{
    (s.topicStats[question.topic]??=(s.topicStats[question.topic]={correct:0,total:0})).total++;
    if(correct) s.topicStats[question.topic].correct++;
    (s.macroStats[question.macroArea]??=(s.macroStats[question.macroArea]={correct:0,total:0})).total++;
    if(correct) s.macroStats[question.macroArea].correct++;
    s.totalQuestions++; if(correct) s.totalCorrect++;
  });
  saveStats(u,s);
}
function recordExam(u: string, r: ExamRecord) { const s=loadStats(u); s.examHistory.unshift(r); saveStats(u,s); }

// ─── Small reusables ──────────────────────────────────────────────────────────
function BackBtn({onClick}:{onClick:()=>void}) {
  return <button onClick={onClick} className="p-2 rounded-xl hover:bg-gray-200 transition-colors flex-shrink-0">
    <svg className="w-5 h-5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7"/></svg>
  </button>;
}
function PageHeader({title,onBack}:{title:string;onBack?:()=>void}) {
  return <div className="flex items-center gap-3 mb-5">{onBack&&<BackBtn onClick={onBack}/>}<h2 className="text-xl font-bold text-[rgb(32,44,71)]">{title}</h2></div>;
}
function Checkbox({checked,small}:{checked:boolean;small?:boolean}) {
  const sz=small?'w-4 h-4':'w-5 h-5';
  return <div className={`${sz} rounded-md border-2 flex items-center justify-center flex-shrink-0 transition-colors ${checked?'bg-[rgb(32,44,71)] border-[rgb(32,44,71)]':'border-gray-300 bg-white'}`}>
    {checked&&<svg className="w-3 h-3 text-white" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd"/></svg>}
  </div>;
}

// ─── LOGIN ────────────────────────────────────────────────────────────────────
function LoginView({onLogin}:{onLogin:(u:UserSession)=>void}) {
  const [username,setUsername]=useState('');
  const [password,setPassword]=useState('');
  const [error,setError]=useState('');
  const [loading,setLoading]=useState(false);
  const go=(e:React.FormEvent)=>{
    e.preventDefault(); setLoading(true); setError('');
    setTimeout(()=>{
      const user=authenticate(username,password);
      if(user) onLogin({username:user.username,displayName:user.displayName,isAdmin:user.isAdmin});
      else { setError('Username o password non corretti.'); setLoading(false); }
    },500);
  };
  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-[rgb(32,44,71)] to-[rgb(52,69,110)] p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-white/10 mb-4"><span className="text-3xl">🩺</span></div>
          <h1 className="text-3xl font-bold text-white tracking-tight">UniQuiz</h1>
          <p className="text-blue-200 mt-1 text-sm">Preparazione esami universitari</p>
        </div>
        <div className="bg-white rounded-2xl shadow-2xl p-8">
          <h2 className="text-xl font-semibold text-[rgb(32,44,71)] mb-6">Accedi</h2>
          {error&&<div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-xl text-red-700 text-sm font-medium">{error}</div>}
          <form onSubmit={go} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Username</label>
              <input type="text" value={username} onChange={e=>setUsername(e.target.value)}
                className="w-full border border-gray-300 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[rgb(32,44,71)]"
                placeholder="Il tuo username" required autoFocus/>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Password</label>
              <input type="password" value={password} onChange={e=>setPassword(e.target.value)}
                className="w-full border border-gray-300 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[rgb(32,44,71)]"
                placeholder="••••••••" required/>
            </div>
            <button type="submit" disabled={loading} className="btn-primary w-full mt-1 py-3 text-base">
              {loading?'Accesso in corso…':'Accedi →'}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}

// ─── COURSE SELECT ────────────────────────────────────────────────────────────
function CourseSelectView({user,onSelect,onAdmin}:{user:UserSession;onSelect:(c:Course)=>void;onAdmin:()=>void}) {
  return (
    <div className="max-w-3xl mx-auto p-4 md:p-6">
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-[rgb(32,44,71)]">Ciao, {user.displayName}! 👋</h2>
          <p className="text-gray-500 mt-0.5 text-sm">Scegli la materia su cui vuoi esercitarti</p>
        </div>
        {user.isAdmin&&(
          <button onClick={onAdmin} className="flex items-center gap-2 text-sm font-medium text-[rgb(32,44,71)] bg-white border border-gray-200 rounded-xl px-3 py-2 hover:bg-gray-50 transition-colors shadow-sm">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"/><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"/></svg>
            Admin
          </button>
        )}
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {COURSES.map(course=>(
          <button key={course.id} onClick={()=>course.available&&onSelect(course)} disabled={!course.available}
            className={`group relative text-left rounded-2xl border-2 p-5 transition-all duration-200 ${course.available?'bg-white hover:shadow-lg hover:scale-[1.02] border-gray-100 hover:border-[rgb(32,44,71)] cursor-pointer':'bg-gray-50 border-gray-100 cursor-not-allowed opacity-60'}`}>
            <div className={`absolute top-0 left-0 right-0 h-1 rounded-t-2xl ${course.accentColor} ${!course.available?'opacity-30':''}`}/>
            <div className="flex items-start gap-4 mt-1">
              <div className={`w-12 h-12 rounded-2xl flex items-center justify-center text-2xl flex-shrink-0 ${course.available?'bg-gray-50 group-hover:bg-gray-100':'bg-gray-100'} transition-colors`}>{course.icon}</div>
              <div className="min-w-0">
                <h3 className="font-bold text-[rgb(32,44,71)] text-base leading-tight">{course.name}</h3>
                <p className="text-sm text-gray-400 mt-0.5">{course.subtitle}</p>
                {course.available&&<p className="text-xs text-gray-400 mt-2">{ALL_QUESTIONS.filter(q=>course.macroAreaIds.includes(q.macroArea)).length} domande disponibili</p>}
              </div>
            </div>
            {!course.available&&<div className="mt-3"><span className="inline-block text-xs font-medium bg-gray-200 text-gray-500 px-2 py-0.5 rounded-full">In arrivo</span></div>}
          </button>
        ))}
      </div>
    </div>
  );
}

// ─── DASHBOARD ────────────────────────────────────────────────────────────────
function DashboardView({user,course,stats,onNavigate,onChangeCourse}:{user:UserSession;course:Course;stats:Stats;onNavigate:(v:View)=>void;onChangeCourse:()=>void}) {
  const acc=stats.totalQuestions>0?Math.round((stats.totalCorrect/stats.totalQuestions)*100):0;
  return (
    <div className="max-w-3xl mx-auto p-4 md:p-6 space-y-5">
      <div className="relative overflow-hidden rounded-2xl bg-[rgb(32,44,71)] text-white p-6">
        <div className={`absolute top-0 left-0 right-0 h-1 ${course.accentColor}`}/>
        <div className="flex items-start justify-between gap-4">
          <div><div className="text-2xl mb-1">{course.icon}</div><h2 className="text-xl font-bold leading-tight">{course.name}</h2><p className="text-blue-200 text-xs mt-0.5">{course.subtitle}</p></div>
          <button onClick={onChangeCourse} className="flex-shrink-0 text-xs bg-white/10 hover:bg-white/20 text-white font-medium px-3 py-1.5 rounded-lg transition-colors">Cambia materia</button>
        </div>
        <div className="grid grid-cols-3 gap-3 mt-5">
          {[[stats.totalQuestions,'Domande svolte'],[`${acc}%`,'Accuratezza'],[stats.examHistory.length,'Esami simulati']].map(([v,l])=>(
            <div key={l as string} className="bg-white/10 rounded-xl p-3 text-center"><div className="text-xl font-bold">{v}</div><div className="text-xs text-blue-200 mt-0.5">{l}</div></div>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <button onClick={()=>onNavigate('quiz_setup')} className="card-hover group">
          <div className="flex items-start gap-4">
            <div className="w-11 h-11 rounded-xl bg-emerald-100 group-hover:bg-emerald-200 flex items-center justify-center flex-shrink-0 transition-colors">
              <svg className="w-5 h-5 text-emerald-700" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253"/></svg>
            </div>
            <div><h3 className="font-semibold text-[rgb(32,44,71)]">Esercitazione</h3><p className="text-gray-400 text-xs mt-1 leading-relaxed">Scegli argomenti e domande. Risposta corretta mostrata subito.</p></div>
          </div>
        </button>
        <button onClick={()=>onNavigate('exam_setup')} className="card-hover group">
          <div className="flex items-start gap-4">
            <div className="w-11 h-11 rounded-xl bg-blue-100 group-hover:bg-blue-200 flex items-center justify-center flex-shrink-0 transition-colors">
              <svg className="w-5 h-5 text-blue-700" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"/></svg>
            </div>
            <div><h3 className="font-semibold text-[rgb(32,44,71)]">Simulazione Esame</h3><p className="text-gray-400 text-xs mt-1 leading-relaxed">{course.examRule.totalQuestions} domande · {course.examRule.timeLimitSeconds/60} min · +1/−0,2</p></div>
          </div>
        </button>
        <button onClick={()=>onNavigate('profile')} className="card-hover group sm:col-span-2">
          <div className="flex items-start gap-4">
            <div className="w-11 h-11 rounded-xl bg-purple-100 group-hover:bg-purple-200 flex items-center justify-center flex-shrink-0 transition-colors">
              <svg className="w-5 h-5 text-purple-700" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 8v8m-4-5v5m-4-2v2m-2 4h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"/></svg>
            </div>
            <div><h3 className="font-semibold text-[rgb(32,44,71)]">Il mio profilo</h3><p className="text-gray-400 text-xs mt-1 leading-relaxed">Statistiche per argomento, punti di forza e aree deboli. Ripasso mirato.</p></div>
          </div>
        </button>
      </div>

      {stats.totalQuestions>0&&(
        <div className="card">
          <h3 className="font-semibold text-[rgb(32,44,71)] mb-4 text-sm uppercase tracking-wide">Progressi per materia</h3>
          <div className="space-y-3">
            {course.macroAreaIds.map(key=>{
              const ma=MACRO_AREAS[key as MacroArea]; if(!ma) return null;
              const s=stats.macroStats[key]||{correct:0,total:0};
              const pct=s.total>0?Math.round((s.correct/s.total)*100):0;
              const color=pct>=70?'#10b981':pct>=50?'#f59e0b':'#ef4444';
              return <div key={key}>
                <div className="flex justify-between text-sm mb-1"><span className="font-medium text-gray-700">{ma.label}</span><span className="text-gray-400 tabular-nums">{s.correct}/{s.total} · {pct}%</span></div>
                <div className="progress-bar"><div className="progress-fill" style={{width:`${pct}%`,backgroundColor:color}}/></div>
              </div>;
            })}
          </div>
        </div>
      )}
    </div>
  );
}

// ─── QUIZ SETUP ───────────────────────────────────────────────────────────────
function QuizSetupView({course,onStart,onBack}:{course:Course;onStart:(qs:Question[])=>void;onBack:()=>void}) {
  const [selMacros,setSelMacros]=useState<string[]>([]);
  const [selTopics,setSelTopics]=useState<string[]>([]);
  const [count,setCount]=useState(10);
  const [error,setError]=useState('');
  const courseQs=ALL_QUESTIONS.filter(q=>course.macroAreaIds.includes(q.macroArea));
  const toggleMacro=(m:string)=>{
    if(selMacros.includes(m)){setSelMacros(selMacros.filter(x=>x!==m));const rm=TOPICS_BY_MACRO[m as MacroArea]||[];setSelTopics(selTopics.filter(t=>!rm.includes(t)));}
    else setSelMacros([...selMacros,m]);
  };
  const toggleTopic=(t:string)=>setSelTopics(p=>p.includes(t)?p.filter(x=>x!==t):[...p,t]);
  const availTopics=selMacros.flatMap(m=>TOPICS_BY_MACRO[m as MacroArea]||[]);
  const pool=courseQs.filter(q=>selMacros.includes(q.macroArea)&&(selTopics.length===0||selTopics.includes(q.topic)));
  const maxQ=Math.min(pool.length,50);
  const go=()=>{
    if(!selMacros.length){setError('Seleziona almeno una macro-area.');return;}
    if(!pool.length){setError('Nessuna domanda per la selezione corrente.');return;}
    onStart([...pool].sort(()=>Math.random()-0.5).slice(0,count));
  };
  return (
    <div className="max-w-xl mx-auto p-4 md:p-6 space-y-4">
      <PageHeader title="Configura Esercitazione" onBack={onBack}/>
      {error&&<div className="p-3 bg-red-50 border border-red-200 rounded-xl text-red-700 text-sm">{error}</div>}
      <div className="card">
        <h3 className="font-semibold text-[rgb(32,44,71)] mb-3 text-sm">1 · Scegli le macro-aree</h3>
        <div className="space-y-2">
          {course.macroAreaIds.map(key=>{
            const ma=MACRO_AREAS[key as MacroArea]; if(!ma) return null;
            const n=courseQs.filter(q=>q.macroArea===key).length;
            const on=selMacros.includes(key);
            return <button key={key} onClick={()=>toggleMacro(key)}
              className={`w-full flex items-center justify-between p-3 rounded-xl border-2 transition-all text-left ${on?'border-[rgb(32,44,71)] bg-[rgb(240,242,247)]':'border-gray-200 hover:border-gray-300 bg-white'}`}>
              <span className={`font-medium text-sm ${on?'text-[rgb(32,44,71)]':'text-gray-700'}`}>{ma.label}</span>
              <div className="flex items-center gap-2"><span className="text-xs text-gray-400">{n} domande</span><Checkbox checked={on}/></div>
            </button>;
          })}
        </div>
      </div>
      {availTopics.length>0&&(
        <div className="card">
          <h3 className="font-semibold text-[rgb(32,44,71)] mb-1 text-sm">2 · Filtra per argomento <span className="font-normal text-gray-400">(opzionale)</span></h3>
          <p className="text-xs text-gray-400 mb-3">Se non selezioni nulla vengono inclusi tutti.</p>
          <div className="space-y-1.5">
            {availTopics.map(t=>{
              const n=courseQs.filter(q=>q.topic===t).length; const on=selTopics.includes(t);
              return <button key={t} onClick={()=>toggleTopic(t)}
                className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl border transition-all text-left ${on?'border-[rgb(32,44,71)] bg-[rgb(240,242,247)]':'border-gray-200 hover:border-gray-300 bg-white'}`}>
                <span className={`text-sm ${on?'font-medium text-[rgb(32,44,71)]':'text-gray-600'}`}>{t}</span>
                <div className="flex items-center gap-2"><span className="text-xs text-gray-400">{n}</span><Checkbox checked={on} small/></div>
              </button>;
            })}
          </div>
        </div>
      )}
      <div className="card">
        <h3 className="font-semibold text-[rgb(32,44,71)] mb-3 text-sm">{availTopics.length>0?'3':'2'} · Numero di domande: <span className="text-[rgb(99,130,201)]">{Math.min(count,maxQ||5)}</span></h3>
        <input type="range" min={5} max={maxQ||5} value={Math.min(count,maxQ||5)} onChange={e=>setCount(+e.target.value)} className="w-full accent-[rgb(32,44,71)]"/>
        <div className="flex justify-between text-xs text-gray-400 mt-1"><span>5</span><span>Disponibili: {pool.length}</span><span>{maxQ||5}</span></div>
      </div>
      <button onClick={go} className="btn-primary w-full py-3 text-base">Inizia esercitazione →</button>
    </div>
  );
}

// ─── QUIZ (practice) ─────────────────────────────────────────────────────────
function QuizView({questions:qs,user,onEnd}:{questions:Question[];user:UserSession;onEnd:()=>void}) {
  const [cur,setCur]=useState(0);
  const [sel,setSel]=useState<number|null>(null);
  const [answered,setAnswered]=useState(false);
  const [log,setLog]=useState<{question:Question;correct:boolean}[]>([]);
  const [done,setDone]=useState(false);
  const q=qs[cur];
  const pick=(idx:number)=>{if(answered)return;setSel(idx);setAnswered(true);};
  const next=()=>{
    const entry={question:q,correct:sel===q.correctAnswer};
    const newLog=[...log,entry];setLog(newLog);
    if(cur===qs.length-1){recordAnswers(user.username,newLog);setDone(true);}
    else{setCur(c=>c+1);setSel(null);setAnswered(false);}
  };
  if(done){
    const correct=log.filter(l=>l.correct).length;
    const pct=Math.round((correct/qs.length)*100);
    return (
      <div className="max-w-lg mx-auto p-4 md:p-6">
        <div className="card text-center">
          <div className="text-5xl mb-3">{pct>=70?'🎉':pct>=50?'👍':'📚'}</div>
          <h2 className="text-2xl font-bold text-[rgb(32,44,71)]">Esercitazione completata!</h2>
          <div className="mt-4 p-5 bg-[rgb(240,242,247)] rounded-2xl">
            <div className="text-5xl font-bold text-[rgb(32,44,71)]">{correct}<span className="text-2xl text-gray-400">/{qs.length}</span></div>
            <div className="text-gray-500 text-sm mt-1">{pct}% di risposte corrette</div>
          </div>
          <div className="grid grid-cols-2 gap-3 mt-4">
            <div className="p-3 bg-emerald-50 rounded-xl"><div className="text-2xl font-bold text-emerald-600">{correct}</div><div className="text-xs text-emerald-600 mt-0.5">Corrette</div></div>
            <div className="p-3 bg-red-50 rounded-xl"><div className="text-2xl font-bold text-red-500">{qs.length-correct}</div><div className="text-xs text-red-500 mt-0.5">Errate</div></div>
          </div>
          <button onClick={onEnd} className="btn-primary w-full mt-5">Torna alla dashboard</button>
        </div>
      </div>
    );
  }
  const maInfo=MACRO_AREAS[q.macroArea as MacroArea];
  return (
    <div className="max-w-2xl mx-auto p-4 md:p-6 space-y-4">
      <div className="flex items-center gap-3">
        <div className="flex-1 progress-bar"><div className="progress-fill bg-[rgb(32,44,71)]" style={{width:`${(cur/qs.length)*100}%`}}/></div>
        <span className="text-sm text-gray-400 tabular-nums flex-shrink-0">{cur+1}/{qs.length}</span>
      </div>
      <div className="flex items-center gap-2 flex-wrap">
        {maInfo&&<span className={`text-xs px-2.5 py-1 rounded-full font-medium border ${maInfo.bgColor} ${maInfo.color}`}>{maInfo.label}</span>}
        <span className="text-xs text-gray-400">{q.topic}</span>
      </div>
      <div className="card"><p className="text-[rgb(32,44,71)] font-medium leading-relaxed">{q.question}</p></div>
      <div className="space-y-2">
        {q.options.map((opt,idx)=>{
          const isCorrect=idx===q.correctAnswer; const isSelected=idx===sel;
          let cls='opt-btn';
          if(answered){
            cls+=' opt-disabled';
            if(isCorrect) cls+=' opt-correct';
            else if(isSelected) cls+=' opt-wrong';
            else cls+=' opt-reveal-neutral';
          } else if(isSelected) cls+=' opt-selected';
          return (
            <button key={idx} className={cls} onClick={()=>pick(idx)} disabled={answered}>
              <span className="inline-flex items-center justify-center w-6 h-6 rounded-md bg-gray-100 text-gray-500 text-xs font-bold mr-3 flex-shrink-0">{String.fromCharCode(65+idx)}</span>
              {opt}
            </button>
          );
        })}
      </div>
      {answered&&(
        <div className={`p-3.5 rounded-xl text-sm font-medium border ${sel===q.correctAnswer?'bg-emerald-50 text-emerald-800 border-emerald-200':'bg-red-50 text-red-800 border-red-200'}`}>
          {sel===q.correctAnswer?'✅ Risposta corretta!':<>❌ Risposta errata. <span className="font-semibold">Corretta: {q.options[q.correctAnswer]}</span></>}
        </div>
      )}
      {answered&&<button onClick={next} className="btn-primary w-full">{cur===qs.length-1?'Vedi risultati':'Prossima domanda →'}</button>}
    </div>
  );
}

// ─── EXAM SETUP ───────────────────────────────────────────────────────────────
function ExamSetupView({course,onStart,onBack}:{course:Course;onStart:()=>void;onBack:()=>void}) {
  const r=course.examRule;
  return (
    <div className="max-w-xl mx-auto p-4 md:p-6 space-y-4">
      <PageHeader title="Simulazione Esame" onBack={onBack}/>
      <div className="card space-y-4">
        <h3 className="font-semibold text-[rgb(32,44,71)]">Regole dell'esame — {course.name}</h3>
        <div className="space-y-2.5 text-sm text-gray-700">
          {[
            ['📝',`${r.totalQuestions} domande a scelta multipla (5 opzioni)`],
            ['⏱️',`${r.timeLimitSeconds/60} minuti di tempo massimo`],
            ['✅',`+${r.correctScore} punto per risposta corretta`],
            ['❌',`−${r.wrongPenalty} punti per risposta errata`],
            ['⬜','0 punti per risposta omessa'],
            ['🏛️',`Distribuzione: ${Object.entries(r.distribution).map(([k,v])=>`${v} ${MACRO_AREAS[k as MacroArea]?.label||k}`).join(' + ')}`],
            ['🔀','Puoi navigare avanti e indietro tra le domande'],
          ].map(([icon,text])=>(
            <div key={text} className="flex items-start gap-2.5"><span className="flex-shrink-0">{icon}</span><span>{text}</span></div>
          ))}
        </div>
        <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-sm text-amber-800">⚠️ Il timer parte subito. L'esame si chiude automaticamente allo scadere del tempo.</div>
      </div>
      <button onClick={onStart} className="btn-primary w-full py-3 text-base">Inizia simulazione →</button>
    </div>
  );
}

// ─── EXAM ─────────────────────────────────────────────────────────────────────
function buildExamQs(course:Course):Question[]{
  const out:Question[]=[];
  Object.entries(course.examRule.distribution).forEach(([area,n])=>{
    const pool=ALL_QUESTIONS.filter(q=>q.macroArea===area&&course.macroAreaIds.includes(q.macroArea));
    out.push(...[...pool].sort(()=>Math.random()-0.5).slice(0,n));
  });
  return out.sort(()=>Math.random()-0.5);
}

function ExamView({course,user,onEnd}:{course:Course;user:UserSession;onEnd:()=>void}) {
  const qsRef=useRef<Question[]>(buildExamQs(course));
  const qs=qsRef.current;
  const rule=course.examRule;
  const [cur,setCur]=useState(0);
  const [answers,setAnswers]=useState<(number|null)[]>(Array(qs.length).fill(null));
  const [timeLeft,setTimeLeft]=useState(rule.timeLimitSeconds);
  const [submitted,setSubmitted]=useState(false);
  const [showReview,setShowReview]=useState(false);
  const startRef=useRef(Date.now());
  const timerRef=useRef<ReturnType<typeof setInterval>|null>(null);
  const submit=useCallback(()=>{if(timerRef.current)clearInterval(timerRef.current);setSubmitted(true);},[]);
  useEffect(()=>{
    timerRef.current=setInterval(()=>setTimeLeft(t=>{if(t<=1){submit();return 0;}return t-1;}),1000);
    return ()=>{if(timerRef.current)clearInterval(timerRef.current);};
  },[submit]);
  const calcRes=()=>{
    let correct=0,wrong=0,omitted=0;
    answers.forEach((a,i)=>{if(a===null)omitted++;else if(a===qs[i].correctAnswer)correct++;else wrong++;});
    const raw=correct*rule.correctScore-wrong*rule.wrongPenalty;
    return {correct,wrong,omitted,raw,scoreIn30:Math.max(0,Math.round((raw/rule.totalQuestions)*30*10)/10)};
  };
  useEffect(()=>{
    if(submitted){
      const r=calcRes();
      const dur=Math.round((Date.now()-startRef.current)/1000);
      recordAnswers(user.username,answers.map((a,i)=>({question:qs[i],correct:a===qs[i].correctAnswer})));
      recordExam(user.username,{date:new Date().toLocaleDateString('it-IT',{day:'2-digit',month:'2-digit',year:'numeric'}),courseId:course.id,courseName:course.name,scoreIn30:r.scoreIn30,correct:r.correct,wrong:r.wrong,omitted:r.omitted,duration:dur});
    }
  },[submitted]); // eslint-disable-line

  if(submitted){
    const r=calcRes(); const dur=Math.round((Date.now()-startRef.current)/1000);
    return (
      <div className="max-w-3xl mx-auto p-4 md:p-6 space-y-4">
        {/* Score */}
        <div className="card text-center">
          <div className="text-4xl mb-2">{r.scoreIn30>=27?'🏆':r.scoreIn30>=24?'🎓':r.scoreIn30>=18?'👍':'📚'}</div>
          <h2 className="text-xl font-bold text-[rgb(32,44,71)]">Esame completato</h2>
          <div className="mt-4 inline-block bg-[rgb(32,44,71)] rounded-2xl px-10 py-5 text-white">
            <div className="text-5xl font-black">{r.scoreIn30}</div>
            <div className="text-blue-200 text-sm">su 30</div>
          </div>
          <div className="grid grid-cols-3 gap-3 mt-4">
            <div className="p-3 bg-emerald-50 rounded-xl"><div className="text-xl font-bold text-emerald-600">{r.correct}</div><div className="text-xs text-emerald-600 mt-0.5">Corrette<br/><span className="text-gray-400">(+{r.correct})</span></div></div>
            <div className="p-3 bg-red-50 rounded-xl"><div className="text-xl font-bold text-red-500">{r.wrong}</div><div className="text-xs text-red-500 mt-0.5">Errate<br/><span className="text-gray-400">(−{(r.wrong*rule.wrongPenalty).toFixed(1)})</span></div></div>
            <div className="p-3 bg-gray-50 rounded-xl"><div className="text-xl font-bold text-gray-500">{r.omitted}</div><div className="text-xs text-gray-400 mt-0.5">Omesse<br/>(0)</div></div>
          </div>
          <p className="text-xs text-gray-400 mt-3">Punteggio grezzo: {r.raw.toFixed(2)} · Durata: {fmt(dur)}</p>
        </div>

        {/* Review toggle */}
        <button onClick={()=>setShowReview(v=>!v)}
          className="w-full flex items-center justify-between p-4 bg-white rounded-2xl border border-gray-200 hover:border-[rgb(32,44,71)] transition-colors font-semibold text-[rgb(32,44,71)] text-sm">
          <span>📋 Revisione completa delle {qs.length} domande</span>
          <svg className={`w-5 h-5 transition-transform flex-shrink-0 ${showReview?'rotate-180':''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7"/></svg>
        </button>

        {showReview&&(
          <div className="space-y-3">
            {qs.map((q,i)=>{
              const a=answers[i]; const isCorrect=a===q.correctAnswer; const isOmitted=a===null;
              const maI=MACRO_AREAS[q.macroArea as MacroArea];
              return (
                <div key={q.id} className={`rounded-2xl border-2 overflow-hidden ${isCorrect?'border-emerald-300':isOmitted?'border-gray-200':'border-red-300'}`}>
                  <div className={`flex items-center justify-between px-4 py-2.5 text-xs font-medium ${isCorrect?'bg-emerald-50 text-emerald-700':isOmitted?'bg-gray-50 text-gray-500':'bg-red-50 text-red-700'}`}>
                    <span className="font-semibold">{isCorrect?'✅ Corretta':isOmitted?'⬜ Omessa':'❌ Errata'} — D{i+1}</span>
                    {maI&&<span className={`px-2 py-0.5 rounded-full border text-xs ${maI.bgColor} ${maI.color}`}>{maI.label}</span>}
                  </div>
                  <div className="bg-white px-4 py-3">
                    <p className="text-sm font-semibold text-[rgb(32,44,71)] leading-relaxed mb-3">{q.question}</p>
                    <div className="space-y-1.5">
                      {q.options.map((opt,idx)=>{
                        const isCorr=idx===q.correctAnswer; const isSel=idx===a;
                        let row='flex items-start gap-2 text-sm px-3 py-2 rounded-lg ';
                        if(isCorr) row+='bg-emerald-50 text-emerald-800 font-medium';
                        else if(isSel&&!isCorr) row+='bg-red-50 text-red-800';
                        else row+='text-gray-500';
                        return (
                          <div key={idx} className={row}>
                            <span className="flex-shrink-0 w-5 h-5 rounded border bg-white text-xs font-bold flex items-center justify-center">{String.fromCharCode(65+idx)}</span>
                            <span className="leading-snug flex-1">{opt}</span>
                            {isCorr&&<span className="flex-shrink-0 text-emerald-600 font-bold">✓</span>}
                            {isSel&&!isCorr&&<span className="flex-shrink-0 text-red-500 font-bold">✗</span>}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
        <button onClick={onEnd} className="btn-primary w-full">Torna alla dashboard</button>
      </div>
    );
  }

  // in-progress
  const q=qs[cur]; const maInfo=MACRO_AREAS[q.macroArea as MacroArea]; const warn=timeLeft<300;
  return (
    <div className="flex h-[calc(100vh-56px)] overflow-hidden">
      <aside className="hidden md:flex w-52 flex-shrink-0 flex-col bg-[rgb(32,44,71)]">
        <div className="p-4 border-b border-white/10">
          <div className={`text-2xl font-black tabular-nums ${warn?'text-red-400':'text-white'}`}>{fmt(timeLeft)}</div>
          <div className="text-blue-200 text-xs mt-0.5">Tempo rimanente</div>
        </div>
        <div className="flex-1 overflow-y-auto p-3">
          <p className="text-xs text-blue-300 uppercase tracking-wide font-medium mb-2">Domande</p>
          <div className="grid grid-cols-4 gap-1.5">
            {qs.map((_,i)=>{
              const cls=i===cur?'q-dot q-current':answers[i]!==null?'q-dot q-answered':'q-dot q-unanswered';
              return <button key={i} className={cls} onClick={()=>setCur(i)}>{i+1}</button>;
            })}
          </div>
        </div>
        <div className="p-3 border-t border-white/10 space-y-2">
          <div className="text-xs text-blue-200">Risposte: <span className="font-bold text-white">{answers.filter(a=>a!==null).length}</span>/{qs.length}</div>
          <button onClick={submit} className="w-full py-2 bg-white text-[rgb(32,44,71)] rounded-xl text-sm font-bold hover:bg-blue-50 transition-colors">Consegna</button>
        </div>
      </aside>
      <div className="flex-1 flex flex-col overflow-hidden">
        <div className="md:hidden bg-[rgb(32,44,71)] px-4 py-2.5 flex items-center justify-between">
          <span className={`text-base font-bold tabular-nums ${warn?'text-red-400':'text-white'}`}>{fmt(timeLeft)}</span>
          <span className="text-blue-200 text-xs">{answers.filter(a=>a!==null).length}/{qs.length} risposte</span>
          <button onClick={submit} className="bg-white text-[rgb(32,44,71)] rounded-lg px-3 py-1 text-xs font-bold">Consegna</button>
        </div>
        <div className="flex-1 overflow-y-auto p-4 md:p-6">
          <div className="max-w-2xl mx-auto space-y-4">
            <div className="flex items-center justify-between gap-2 flex-wrap">
              <span className="text-sm text-gray-400 tabular-nums">Domanda {cur+1} di {qs.length}</span>
              {maInfo&&<span className={`text-xs px-2.5 py-1 rounded-full font-medium border ${maInfo.bgColor} ${maInfo.color}`}>{maInfo.label}</span>}
            </div>
            <div className="card"><p className="text-[rgb(32,44,71)] font-medium leading-relaxed">{q.question}</p></div>
            <div className="space-y-2">
              {q.options.map((opt,idx)=>(
                <button key={idx}
                  className={`opt-btn ${answers[cur]===idx?'opt-selected':''}`}
                  onClick={()=>{const a=[...answers];a[cur]=idx;setAnswers(a);}}>
                  <span className="inline-flex items-center justify-center w-6 h-6 rounded-md bg-gray-100 text-gray-500 text-xs font-bold mr-3 flex-shrink-0">{String.fromCharCode(65+idx)}</span>
                  {opt}
                </button>
              ))}
            </div>
            <div className="flex gap-2 pt-1">
              <button onClick={()=>setCur(c=>Math.max(0,c-1))} disabled={cur===0} className="btn-secondary flex-1 disabled:opacity-30">← Precedente</button>
              <button onClick={()=>setCur(c=>Math.min(qs.length-1,c+1))} disabled={cur===qs.length-1} className="btn-primary flex-1 disabled:opacity-30">Successiva →</button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── PROFILE ──────────────────────────────────────────────────────────────────
function ProfileView({user,onBack,onPractice}:{user:UserSession;onBack:()=>void;onPractice:(qs:Question[])=>void}) {
  const stats=loadStats(user.username);
  const acc=stats.totalQuestions>0?Math.round((stats.totalCorrect/stats.totalQuestions)*100):0;
  const topics=Object.entries(stats.topicStats).map(([topic,s])=>({topic,...s,pct:s.total>0?Math.round((s.correct/s.total)*100):0})).sort((a,b)=>a.pct-b.pct);
  const weak=topics.filter(t=>t.pct<60&&t.total>=3);
  const strong=topics.filter(t=>t.pct>=70&&t.total>=3);
  return (
    <div className="max-w-2xl mx-auto p-4 md:p-6 space-y-4">
      <PageHeader title="Il mio profilo" onBack={onBack}/>
      <div className="card bg-[rgb(32,44,71)] text-white">
        <p className="text-blue-200 text-xs uppercase tracking-wide font-medium mb-3">Riepilogo generale</p>
        <div className="grid grid-cols-3 gap-3">
          {[[stats.totalQuestions,'Domande'],[`${acc}%`,'Accuratezza'],[stats.examHistory.length,'Esami']].map(([v,l])=>(
            <div key={l as string} className="bg-white/10 rounded-xl p-3 text-center"><div className="text-xl font-bold">{v}</div><div className="text-xs text-blue-200 mt-0.5">{l}</div></div>
          ))}
        </div>
      </div>
      {weak.length>0&&(
        <div className="card border-2 border-red-100">
          <h3 className="font-semibold text-red-600 mb-3 text-sm">📉 Da migliorare</h3>
          <div className="space-y-3">
            {weak.map(t=>(
              <div key={t.topic} className="flex items-center gap-3">
                <div className="flex-1 min-w-0">
                  <div className="flex justify-between text-sm mb-1"><span className="font-medium text-gray-700 truncate pr-2">{t.topic}</span><span className="text-red-500 font-semibold flex-shrink-0">{t.pct}%</span></div>
                  <div className="progress-bar"><div className="progress-fill bg-red-400" style={{width:`${t.pct}%`}}/></div>
                </div>
                <button onClick={()=>onPractice([...ALL_QUESTIONS.filter(q=>q.topic===t.topic)].sort(()=>Math.random()-0.5).slice(0,15))}
                  className="flex-shrink-0 text-xs bg-red-100 text-red-700 font-semibold px-2.5 py-1.5 rounded-lg hover:bg-red-200 transition-colors">Ripassa</button>
              </div>
            ))}
          </div>
        </div>
      )}
      {strong.length>0&&(
        <div className="card border-2 border-emerald-100">
          <h3 className="font-semibold text-emerald-600 mb-3 text-sm">💪 Punti di forza</h3>
          <div className="space-y-2">
            {strong.map(t=>(
              <div key={t.topic}>
                <div className="flex justify-between text-sm mb-1"><span className="font-medium text-gray-700">{t.topic}</span><span className="text-emerald-600 font-semibold">{t.pct}%</span></div>
                <div className="progress-bar"><div className="progress-fill bg-emerald-400" style={{width:`${t.pct}%`}}/></div>
              </div>
            ))}
          </div>
        </div>
      )}
      {topics.length>0&&(
        <div className="card">
          <h3 className="font-semibold text-[rgb(32,44,71)] mb-3 text-sm">Tutti gli argomenti</h3>
          <div className="space-y-2.5">
            {topics.map(t=>(
              <div key={t.topic}>
                <div className="flex justify-between text-xs mb-1"><span className="text-gray-600">{t.topic}</span><span className="text-gray-400 tabular-nums">{t.correct}/{t.total} · {t.pct}%</span></div>
                <div className="progress-bar h-1.5"><div className="progress-fill" style={{width:`${t.pct}%`,backgroundColor:t.pct>=70?'#10b981':t.pct>=50?'#f59e0b':'#ef4444'}}/></div>
              </div>
            ))}
          </div>
        </div>
      )}
      {stats.examHistory.length>0&&(
        <div className="card">
          <h3 className="font-semibold text-[rgb(32,44,71)] mb-3 text-sm">Storico esami simulati</h3>
          <div className="space-y-2">
            {stats.examHistory.slice(0,15).map((e,i)=>(
              <div key={i} className="flex items-center justify-between p-3 bg-[rgb(240,242,247)] rounded-xl text-sm">
                <div>
                  <div className="font-semibold text-[rgb(32,44,71)]">{e.courseName||'Esame'} · {e.date}</div>
                  <div className="text-xs text-gray-400 mt-0.5">✅{e.correct} ❌{e.wrong} ⬜{e.omitted} · {fmt(e.duration)}</div>
                </div>
                <div className={`text-2xl font-black tabular-nums ${e.scoreIn30>=27?'text-emerald-500':e.scoreIn30>=24?'text-blue-500':e.scoreIn30>=18?'text-amber-500':'text-red-500'}`}>{e.scoreIn30}</div>
              </div>
            ))}
          </div>
        </div>
      )}
      {topics.length===0&&stats.examHistory.length===0&&(
        <div className="card text-center py-10 text-gray-400"><div className="text-4xl mb-3">📊</div><p>Nessuna statistica ancora.<br/>Inizia un'esercitazione o un esame!</p></div>
      )}
    </div>
  );
}

// ─── ADMIN ────────────────────────────────────────────────────────────────────
function AdminView({onBack}:{onBack:()=>void}) {
  const [users,setUsers]=useState<AppUser[]>([]);
  const [newU,setNewU]=useState({username:'',displayName:'',password:'',isAdmin:false});
  const [msg,setMsg]=useState<{type:'ok'|'err';text:string}|null>(null);
  const [editingPwd,setEditingPwd]=useState<{username:string;value:string}|null>(null);
  const [confirmDel,setConfirmDel]=useState<string|null>(null);
  const refresh=()=>setUsers(getAllUsers());
  useEffect(refresh,[]);
  const flash=(type:'ok'|'err',text:string)=>{setMsg({type,text});setTimeout(()=>setMsg(null),3500);};
  const handleAdd=(e:React.FormEvent)=>{
    e.preventDefault();
    if(!newU.username||!newU.password||!newU.displayName) return;
    const r=addUser(newU);
    if(r.ok){flash('ok',`Utente "${newU.username}" aggiunto.`);setNewU({username:'',displayName:'',password:'',isAdmin:false});refresh();}
    else flash('err',r.error||'Errore.');
  };
  const handleDelete=(username:string)=>{const r=deleteUser(username);if(r.ok){flash('ok',`Utente "${username}" eliminato.`);setConfirmDel(null);refresh();}else flash('err',r.error||'Errore.');};
  return (
    <div className="max-w-2xl mx-auto p-4 md:p-6 space-y-5">
      <PageHeader title="Pannello Admin" onBack={onBack}/>
      {msg&&<div className={`p-3 rounded-xl text-sm font-medium ${msg.type==='ok'?'bg-emerald-50 text-emerald-700 border border-emerald-200':'bg-red-50 text-red-700 border border-red-200'}`}>{msg.text}</div>}
      <div className="card">
        <h3 className="font-semibold text-[rgb(32,44,71)] mb-4 text-sm uppercase tracking-wide">➕ Aggiungi utente</h3>
        <form onSubmit={handleAdd} className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Username *</label>
              <input value={newU.username} onChange={e=>setNewU({...newU,username:e.target.value.toLowerCase().replace(/\s/g,'')})}
                className="w-full border border-gray-300 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[rgb(32,44,71)]" placeholder="mario.rossi" required/>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Nome visualizzato *</label>
              <input value={newU.displayName} onChange={e=>setNewU({...newU,displayName:e.target.value})}
                className="w-full border border-gray-300 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[rgb(32,44,71)]" placeholder="Mario Rossi" required/>
            </div>
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Password *</label>
            <input type="password" value={newU.password} onChange={e=>setNewU({...newU,password:e.target.value})}
              className="w-full border border-gray-300 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[rgb(32,44,71)]" placeholder="••••••••" required/>
          </div>
          <div className="flex items-center gap-2">
            <input type="checkbox" id="isAdmin" checked={newU.isAdmin} onChange={e=>setNewU({...newU,isAdmin:e.target.checked})} className="rounded accent-[rgb(32,44,71)]"/>
            <label htmlFor="isAdmin" className="text-sm text-gray-600 cursor-pointer">Utente admin</label>
          </div>
          <button type="submit" className="btn-primary w-full">Crea account</button>
        </form>
      </div>
      <div className="card">
        <h3 className="font-semibold text-[rgb(32,44,71)] mb-4 text-sm uppercase tracking-wide">👥 Utenti registrati ({users.length})</h3>
        <div className="space-y-3">
          {users.map(u=>(
            <div key={u.username} className="p-3.5 bg-[rgb(240,242,247)] rounded-xl">
              <div className="flex items-center justify-between gap-2 flex-wrap">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-[rgb(32,44,71)] text-sm">{u.displayName}</span>
                    {u.isAdmin&&<span className="text-xs bg-amber-100 text-amber-700 font-medium px-1.5 py-0.5 rounded-full">Admin</span>}
                  </div>
                  <div className="text-xs text-gray-400 mt-0.5">@{u.username}</div>
                </div>
                <div className="flex items-center gap-2 flex-wrap">
                  <button onClick={()=>setEditingPwd({username:u.username,value:''})}
                    className="text-xs bg-white border border-gray-200 text-gray-600 font-medium px-2.5 py-1 rounded-lg hover:bg-gray-50 transition-colors">Cambia pwd</button>
                  {u.username!=='edoardo'&&(
                    confirmDel===u.username
                      ?<div className="flex gap-1">
                        <button onClick={()=>handleDelete(u.username)} className="text-xs bg-red-500 text-white font-medium px-2.5 py-1 rounded-lg">Conferma</button>
                        <button onClick={()=>setConfirmDel(null)} className="text-xs bg-gray-200 text-gray-600 font-medium px-2.5 py-1 rounded-lg">Annulla</button>
                       </div>
                      :<button onClick={()=>setConfirmDel(u.username)} className="text-xs bg-white border border-red-200 text-red-500 font-medium px-2.5 py-1 rounded-lg hover:bg-red-50 transition-colors">Elimina</button>
                  )}
                </div>
              </div>
              {editingPwd?.username===u.username&&(
                <div className="mt-3 flex gap-2">
                  <input type="password" value={editingPwd.value} onChange={e=>setEditingPwd({...editingPwd,value:e.target.value})}
                    className="flex-1 border border-gray-300 rounded-xl px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-[rgb(32,44,71)]" placeholder="Nuova password"/>
                  <button onClick={()=>{if(editingPwd.value){updateUser(u.username,{password:editingPwd.value});flash('ok','Password aggiornata.');setEditingPwd(null);}}} className="btn-primary text-sm px-3 py-1.5">Salva</button>
                  <button onClick={()=>setEditingPwd(null)} className="btn-ghost text-sm px-3">✕</button>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ─── ROOT ─────────────────────────────────────────────────────────────────────
export default function App() {
  const [view,setView]=useState<View>('login');
  const [user,setUser]=useState<UserSession|null>(null);
  const [course,setCourse]=useState<Course|null>(null);
  const [quizQs,setQuizQs]=useState<Question[]>([]);
  const [stats,setStats]=useState<Stats>(EMPTY_STATS());
  const refresh=useCallback(()=>{if(user)setStats(loadStats(user.username));},[user]);
  const go=(v:View,qs?:Question[])=>{if(qs)setQuizQs(qs);if(v==='dashboard')refresh();setView(v);};
  const handleLogin=(u:UserSession)=>{setUser(u);setStats(loadStats(u.username));setView('course_select');};
  const handleLogout=()=>{setUser(null);setCourse(null);setView('login');};

  const wrap=(content:React.ReactNode)=>(
    <div className="min-h-screen flex flex-col">
      <nav className="bg-[rgb(32,44,71)] text-white h-14 px-4 flex items-center justify-between sticky top-0 z-50 flex-shrink-0 shadow-md">
        <button onClick={()=>go(course?'dashboard':'course_select')} className="flex items-center gap-2 font-bold text-base hover:opacity-80 transition-opacity">
          <span className="text-lg">🩺</span><span>UniQuiz</span>
          {course&&<span className="hidden sm:inline text-blue-300 font-normal text-sm">· {course.name}</span>}
        </button>
        <div className="flex items-center gap-3">
          {user?.isAdmin&&(
            <button onClick={()=>go('admin')} className="p-1.5 rounded-lg hover:bg-white/10 transition-colors" title="Admin">
              <svg className="w-4 h-4 text-blue-300" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"/><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"/></svg>
            </button>
          )}
          <span className="text-blue-200 text-sm hidden sm:block">{user?.displayName}</span>
          <button onClick={handleLogout} className="text-blue-300 hover:text-white text-xs font-medium transition-colors px-2 py-1 rounded-lg hover:bg-white/10">Esci</button>
        </div>
      </nav>
      <div className="flex-1 py-4 overflow-auto">{content}</div>
    </div>
  );

  if(view==='login') return <LoginView onLogin={handleLogin}/>;
  if(!user) return <LoginView onLogin={handleLogin}/>;
  if(view==='course_select') return wrap(<CourseSelectView user={user} onSelect={c=>{setCourse(c);refresh();go('dashboard');}} onAdmin={()=>go('admin')}/>);
  if(view==='admin') return wrap(<AdminView onBack={()=>go(course?'dashboard':'course_select')}/>);
  if(!course) return wrap(<CourseSelectView user={user} onSelect={c=>{setCourse(c);refresh();go('dashboard');}} onAdmin={()=>go('admin')}/>);
  if(view==='quiz_setup') return wrap(<QuizSetupView course={course} onStart={qs=>{setQuizQs(qs);setView('quiz');}} onBack={()=>go('dashboard')}/>);
  if(view==='quiz'&&quizQs.length>0) return wrap(<QuizView questions={quizQs} user={user} onEnd={()=>go('dashboard')}/>);
  if(view==='exam_setup') return wrap(<ExamSetupView course={course} onStart={()=>setView('exam')} onBack={()=>go('dashboard')}/>);
  if(view==='exam') return wrap(<ExamView course={course} user={user} onEnd={()=>go('dashboard')}/>);
  if(view==='profile') return wrap(<ProfileView user={user} onBack={()=>go('dashboard')} onPractice={qs=>{setQuizQs(qs);setView('quiz');}}/>);
  return wrap(<DashboardView user={user} course={course} stats={stats} onNavigate={go} onChangeCourse={()=>go('course_select')}/>);
}
