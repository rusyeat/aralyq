import { chapters, scenes, freshState, submit, advance, metrics, chapterScore, restore } from './game.mjs';

const KEY = 'aralyq.progress.v1';
const app = document.querySelector('#app');
const dialog = document.querySelector('#dialog');
let storageOK = true;
let raw = null;
try { raw = localStorage.getItem(KEY); } catch { storageOK = false; }
let state = restore(raw);
let showHome = true;
let selection = null;
let opened = new Set();
let toastTimer;
const esc = value => String(value).replace(/[&<>"']/g, c => ({ '&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&#39;' })[c]);
const arrow = '<svg viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M5 12h14m-6-6 6 6-6 6" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"/></svg>';
const check = '<svg viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="m5 12 4 4L19 6" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/></svg>';
const pause = '<span class="pause-mark" aria-hidden="true"><i></i><i></i></span>';
function save() {
  try { localStorage.setItem(KEY, JSON.stringify(state)); } catch { storageOK = false; }
}
function announce(text) { document.querySelector('#announcement').textContent = text; }
function focusMain() { document.querySelector('#main h1')?.focus({ preventScroll: true }); window.scrollTo({ top: 0, behavior: 'instant' }); }
function commit(next) { state = next; selection = null; opened = new Set(); save(); render(); focusMain(); }
function header() {
  return `<header class="header"><button class="brand" data-action="home" aria-label="АРАЛЫҚ — басты бет">${pause}<span>АРАЛЫҚ</span></button><div class="header-right"><span class="course">1 курс <span> / </span> Психология</span><button class="text-button guide-button" data-action="guide"><span class="question-icon">?</span> Қалай ойнаймыз</button></div></header>`;
}
function footer() {
  return `<footer class="footer"><span>Ойлануға арналған шағын кеңістік.</span><button class="text-button" data-action="sources">Тақырыптар мен дереккөздер ${arrow}</button></footer>`;
}
function home() {
  const resume = state.started && !state.completed;
  return `<main id="main" class="home-main">
    <section class="hero"><div class="hero-copy"><div class="eyebrow"><span class="live-dot"></span> ШЕШІМ ҚАБЫЛДАУ СИМУЛЯТОРЫ</div>
      <h1 tabindex="-1">Бір сәт.<br>Басқа <span class="serif">шешім.</span></h1>
      <p class="hero-description">Хабарлама келді. Ішіңде — эмоция.<br>Ал одан кейін не болатыны <strong>өзіңе байланысты.</strong></p>
      <div class="hero-actions"><button class="button primary" data-action="start">${resume ? 'Жалғастыру' : state.completed ? 'Нәтижемді көру' : 'Оқиғаны бастау'} ${arrow}</button><span class="duration"><span class="tiny-clock">◷</span> 10–15 минут<br><small>3 тарау · 9 шешім</small></span></div>
      <div class="hero-note"><span class="mini-line"></span> Жаттап жауап берме. Жағдайды өзгертіп көр.</div>
    </div><div class="hero-art" aria-label="Эмоция, конфликт және коммуникация арасындағы аралықтың иллюстрациясы" role="img">
      <div class="orbit orbit-one"></div><div class="orbit orbit-two"></div><div class="orbit-axis"></div>
      <div class="art-label label-top"><span class="mini-dot"></span> СЕЗІНУ</div><div class="art-label label-bottom">ТҮСІНУ <span class="mini-dot"></span></div>
      <div class="floating-message message-one"><span class="avatar">А</span><div><small>Аян · топтық чат</small><p>«Қазір қолым тимей тұр».</p></div><span class="message-time">21:40</span></div>
      <div class="pause-disc">${pause}<span>АРАЛЫҚТЫ ТАП</span></div>
      <div class="floating-message message-two"><span class="message-leaf">↗</span><div><small>Сенің келесі қадамың</small><p>Байқа. Түсін. Жауап бер.</p></div></div>
      <span class="art-star star-one">✳</span><span class="art-star star-two">+</span><span class="orbit-dot"></span>
    </div></section>
    <section class="journey-preview" aria-labelledby="journey-title"><div class="section-line"><h2 id="journey-title">Бір оқиға. Үш жаңа дағды.</h2><span>СЕНІҢ МАРШРУТЫҢ</span></div>
      <div class="chapter-cards">${chapters.map((c, i) => `<article class="chapter-card ${c.color}"><div class="card-top"><span class="chapter-number">${c.number}</span><span class="chapter-symbol">${['◌','⇄','↗'][i]}</span></div><h3>${c.title}</h3><p>${c.description}</p><div class="card-bottom"><span>${c.short}</span><span>0${i*3+1}—0${i*3+3}</span></div></article>`).join('')}</div>
    </section>
    <section class="premise"><span class="premise-tag">ОҚИҒА</span><p>Бірінші курс. Алғашқы топтық жоба. Ертең — тапсыру күні.<br><span>Үш адам, үш түрлі уайым. Ортақ шешімді сен іздейсің.</span></p><span class="premise-arrow">↗</span></section>
    ${!storageOK ? '<p class="storage-warning">Бұл браузерде прогресс сақталмайды. Ойынды осы терезеде аяқтауға болады.</p>' : ''}
  </main>`;
}
function sidebar() {
  const active = scenes[state.cursor].chapter;
  return `<aside class="sidebar" aria-label="Оқиға барысы"><div class="sidebar-label">СЕНІҢ МАРШРУТЫҢ</div><nav class="chapter-nav">${chapters.map((c, i) => {
    const done = state.answers.length >= (i+1)*3;
    return `<div class="nav-chapter ${i===active ? 'active' : ''} ${done ? 'done' : ''}" ${i===active ? 'aria-current="step"' : ''}><span class="nav-num">${done ? check : c.number}</span><div><span>${c.short}</span><small>${i===active ? 'Қазір осы жерде' : done ? 'Тарау аяқталды' : 'Алда'}</small></div></div>`;
  }).join('')}</nav><div class="sidebar-story"><div class="eyebrow">СЕНІҢ РӨЛІҢ</div><p>Топ мүшесісің.<br>Жобаны бірге<br>аяқтағыларың келеді.</p><div class="cast"><span class="avatar self-avatar">С</span><span class="avatar">А</span><span class="avatar dana">Д</span><small>Сен · Аян · Дана</small></div></div><button class="text-button restart-link" data-action="restart">↺ Басынан бастау</button></aside>`;
}
function meterPanel() {
  const m = metrics(state);
  const items = [['tension','Кернеу','төмендегені пайдалы'],['trust','Сенім','ортақ тіл табу'],['clarity','Айқындық','нақты ақпарат']];
  return `<aside class="meter-panel" aria-label="Ойын көрсеткіштері"><span class="sidebar-label">ӘҢГІМЕ АУА РАЙЫ</span><div class="weather-art" aria-hidden="true"><span class="weather-circle"></span><span class="weather-line"></span><span class="weather-small"></span></div>${items.map(([key,label,hint])=>`<div class="meter-item"><div class="meter-heading"><label for="meter-${key}">${label}</label><span>${m[key]}<small>/100</small></span></div><meter id="meter-${key}" min="0" max="100" value="${m[key]}" class="${key}">${m[key]} / 100</meter><small>${hint}</small></div>`).join('')}<p class="meter-note">Бұлар — оқиғадағы шартты көрсеткіштер. Адамға берілген баға емес.</p></aside>`;
}
function shell(content) {
  const c = chapters[scenes[state.cursor].chapter];
  return `<div class="game-layout">${sidebar()}<main id="main" class="game-main"><div class="game-topline"><span>${c.number} / 03 <i></i> ${c.title}</span><span>${Math.min(state.cursor+1,9)} / 9</span></div><div class="progress-track"><div style="width:${state.answers.length/9*100}%"></div></div>${content}</main>${meterPanel()}</div>`;
}
function choices(scene, disabled = false) {
  return `<div class="choices">${scene.options.map((o,i)=>`<button class="choice ${selection===i ? 'selected' : ''}" data-option="${i}" ${disabled?'disabled':''} aria-pressed="${selection===i}"><span class="choice-key">${String.fromCharCode(65+i)}</span><span><strong>${o.title}</strong><small>${o.text}</small></span><span class="choice-radio" aria-hidden="true">${selection===i ? '•' : ''}</span></button>`).join('')}</div>`;
}
function isReady(scene) {
  if (scene.kind === 'sort') return Array.isArray(selection) && selection.length===4 && selection.every(v=>['fact','guess'].includes(v));
  if (scene.kind === 'compose') return Array.isArray(selection) && selection.length===3 && selection.every(v=>Number.isInteger(v));
  return Number.isInteger(selection) && (scene.kind !== 'evidence' || opened.size===3);
}
function play() {
  const scene = scenes[state.cursor];
  let interaction = '';
  if (scene.kind === 'sort') {
    interaction = `<div class="sort-items">${scene.items.map((item,i)=>`<div class="sort-item"><span class="sort-number">0${i+1}</span><p>${item.text}</p><div class="segmented" role="group" aria-label="${esc(item.text)}">${[['fact','Факт'],['guess','Болжам']].map(([value,label])=>`<button data-sort="${i}" data-value="${value}" aria-pressed="${selection?.[i]===value}" class="${selection?.[i]===value?'selected':''}">${label}</button>`).join('')}</div></div>`).join('')}</div>`;
  } else if (scene.kind === 'compose') {
    interaction = `<div class="composer">${scene.parts.map((part,i)=>`<fieldset><legend>${part.label}</legend><div class="phrase-options">${part.options.map((o,j)=>`<button class="phrase ${selection?.[i]===j?'selected':''}" data-part="${i}" data-value="${j}" aria-pressed="${selection?.[i]===j}">${o.text}</button>`).join('')}</div></fieldset>`).join('')}<div class="message-preview"><span class="eyebrow">СЕНІҢ ХАБАРЛАМАҢ</span><p>${scene.parts.map((part,i)=>selection?.[i] != null ? esc(part.options[selection[i]].text) : `<span class="placeholder">[${['жағдай','сезім','өтініш'][i]}]</span>`).join(' ')}</p></div></div>`;
  } else if (scene.kind === 'evidence') {
    interaction = `<div class="clues">${scene.clues.map((clue,i)=>`<button class="clue ${opened.has(i)?'opened':''}" data-clue="${i}" aria-expanded="${opened.has(i)}"><div><span class="avatar">${clue.initials}</span><strong>${clue.name}</strong><span>${opened.has(i)?'✓':'+'}</span></div>${opened.has(i)?`<p>${clue.text}</p><small>${clue.note}</small>`:'<small>Деректі ашып оқы</small>'}</button>`).join('')}</div><p class="clue-count">${opened.size} / 3 дерек ашылды${opened.size===3 ? ' · Енді шешім таңда.' : ' · Алдымен барлық тарапты тыңда.'}</p>${choices(scene,opened.size<3)}`;
  } else { interaction = choices(scene); }
  const previous = state.answers.at(-1);
  const continuity = scene.id==='interests' ? `<p class="continuity">${(previous?.score??0)>=1.5 ? 'Нақтылаушы сұрағыңнан кейін Аян жағдайын түсіндіруге келісті.' : 'Алдыңғы әңгіме толық шешім бермеді. Енді бәрінің жағдайын тыңдауға мүмкіндік бар.'}</p>` : scene.id==='listen' ? `<p class="continuity">${(previous?.score??0)>=1.5 ? 'Кешегі резерв жоспар белгісіздікті азайтты. Бүгін бір-біріңді түсінуге уақыт бар.' : 'Кешегі келісімде ашық сұрақтар қалды. Бүгін әңгімені қайта түзетуге болады.'}</p>` : '';
  return shell(`<section class="scene"><div class="scene-meta"><span class="scene-tag">${scene.label}</span><span>${scene.time}</span></div><h1 tabindex="-1">${scene.heading}</h1><p class="story-text">${scene.story}</p>${continuity}${scene.messages?`<div class="chat">${scene.messages.map(m=>`<div class="chat-row ${m.self?'self':''}"><span class="avatar ${m.self?'self-avatar':''}">${m.who[0]}</span><div><small>${m.who}</small><p>${m.text}</p></div></div>`).join('')}</div>`:''}<h2 class="decision-question">${scene.question}</h2>${interaction}<div class="decision-footer"><span>Асықпа. Бұл жерде уақыт шектеуі жоқ.</span><button class="button primary" data-action="submit" ${isReady(scene)?'':'disabled'}>${scene.kind==='compose'?'Хабарламаны жіберу':'Шешімді көру'} ${arrow}</button></div></section>`);
}
function feedback() {
  const scene = scenes[state.cursor];
  const answer = state.answers[state.cursor];
  let detail = '';
  if (scene.kind === 'sort') detail = `<div class="fact-review">${scene.items.map((item,i)=>`<div class="fact-review-row"><span class="review-icon ${item.answer===answer.payload[i]?'good':'warm'}">${item.answer===answer.payload[i]?'✓':'↺'}</span><div><p>${item.text}</p><strong>${item.answer==='fact'?'Факт':'Болжам'}</strong><small>${item.why}</small></div></div>`).join('')}</div>`;
  if (scene.kind === 'compose') detail = `<div class="message-preview"><span class="eyebrow">СЕН ЖІБЕРГЕН ХАБАРЛАМА</span><p>${scene.parts.map((p,i)=>p.options[answer.payload[i]].text).join(' ')}</p></div><div class="composition-review">${scene.parts.map((p,i)=>`<p><strong>${p.label}</strong><span>${p.options[answer.payload[i]].why}</span></p>`).join('')}</div>`;
  if (scene.kind === 'choice' || scene.kind==='evidence') detail = `<div class="your-choice"><span class="eyebrow">СЕНІҢ ТАҢДАУЫҢ</span><p>${scene.options[answer.payload].text}</p></div>`;
  return shell(`<section class="feedback-scene"><div class="eyebrow">ШЕШІМНЕН КЕЙІН</div><div class="feedback-heading"><span class="feedback-symbol ${answer.score>=1.5?'good':'warm'}">${answer.score>=1.5?'↗':'↺'}</span><h1 tabindex="-1">${answer.title}</h1></div><p class="outcome-text">${answer.result}</p>${detail}<div class="insight"><span class="insight-mark">✳</span><div><h2>Бұл неліктен маңызды?</h2><p>${answer.why}</p></div></div><div class="delta-row">${Object.entries(answer.delta).filter(([,v])=>v!==0).map(([key,v])=>`<span class="delta ${(key==='tension'?v<0:v>0)?'positive':'negative'}">${({tension:'Кернеу',trust:'Сенім',clarity:'Айқындық'})[key]} ${v>0?'+':''}${v}</span>`).join('')}</div><div class="decision-footer"><button class="text-button" data-action="rethink">↺ Басқа жолды байқап көру</button><button class="button primary" data-action="next">${(state.cursor+1)%3===0?'Тарауды қорытындылау':'Оқиғаны жалғастыру'} ${arrow}</button></div></section>`);
}
function chapterSummary() {
  const i = scenes[state.cursor].chapter;
  const c = chapters[i];
  return shell(`<section class="chapter-summary"><div class="chapter-seal ${c.color}">${c.number}<span>ТАРАУ АЯҚТАЛДЫ</span></div><div class="eyebrow">ӨЗІҢМЕН АЛЫП КЕТ</div><h1 tabindex="-1">${c.quote}</h1><p class="story-text">${c.takeaway}</p><div class="takeaway-topic"><span>ОҚУ ЖОСПАРЫНАН</span><p>${c.topic}</p></div><div class="discussion-box"><span class="eyebrow">БІР СӘТ ОЙЛАН</span><p>${c.discussion}</p></div><button class="button primary" data-action="next">${i===2?'Жалпы нәтижені көру':`${chapters[i+1].short} тарауына өту`} ${arrow}</button></section>`);
}
function result() {
  const scores = chapters.map((_,i)=>chapterScore(state,i));
  const avg = scores.reduce((a,b)=>a+b,0)/3;
  const title = avg>=75?'Аралықты таба білдің.':avg>=40?'Жаңа жолдар ашылды.':'Әр шешім — тәжірибе.';
  const outcome = avg>=75 ? 'Топ жобаны аяқтап, келесі жұмысқа ортақ ереже құра алды. Сенің таңдауларың тыңдау, нақтылау және жауапкершілікті бөлісуге көбірек орын берді.' : avg>=40 ? 'Жоба бойынша біраз келісімге келдіңдер. Кей сұрақтар ашық қалды. Қай шешім әңгімені жақындатқанын, қайсысы қиындатқанын төменнен көр.' : 'Осы жолда қысым мен белгісіздік жиі сақталды. Тарихтан әр шешімнің түсіндірмесін қарап, басқа әрекеттерді байқап көруге болады.';
  return `<main id="main" class="result-main"><div class="result-intro"><div class="result-seal">${pause}</div><div class="eyebrow">ОҚИҒА АЯҚТАЛДЫ · ТӘЖІРИБЕ ҚАЛДЫ</div><h1 tabindex="-1">${title}</h1><p>${outcome}</p></div><div class="result-cards">${chapters.map((c,i)=>`<article class="result-card ${c.color}"><span class="eyebrow">${c.number} · ${c.skill}</span><div class="score-line"><strong>${scores[i]}<small>%</small></strong><span>${scores[i]>=75?'Жақсы қолдандың':scores[i]>=40?'Дамытып келесің':'Қайта байқап көр'}</span></div><p>${c.quote}</p></article>`).join('')}</div><p class="score-note">Пайыздар осы оқиғадағы таңдауларға қатысты. Бұл — психологиялық тест немесе жеке қасиеттеріңнің бағасы емес.</p><section class="reflection"><div><span class="eyebrow">БІЛІМДІ ӨМІРГЕ КӨШІР</span><h2>Ертең не істейсің?</h2><p>Өз өміріңнен бір жағдайды елестет. Эмоцияны қалай байқайсың, кімнің мүддесін нақтылайсың, қандай сөз айтасың?</p></div><div><label for="reflection">Өзіңе қысқа жазба</label><textarea id="reflection" maxlength="1500" placeholder="Келесі топтық жұмыста мен…">${esc(state.reflection)}</textarea><small>${storageOK?'Осы браузерде автоматты сақталады.':'Жазбаны жүктеп сақтай аласың.'} Сайтқа жіберілмейді.</small></div></section><section class="history-section"><div class="section-line"><h2>Сенің шешімдерің</h2><span>9 ҚАДАМ</span></div>${state.answers.map((a,i)=>`<details class="history"><summary><span class="history-index">0${i+1}</span><span>${scenes[i].label}</span><span class="history-state">${a.score>=1.5?'↗':a.score>=0.8?'◌':'↺'}</span></summary><div><p>${scenes[i].kind==='sort' ? a.title : scenes[i].kind==='compose' ? scenes[i].parts.map((p,j)=>p.options[a.payload[j]].text).join(' ') : scenes[i].options[a.payload].text}</p><p>${a.why}</p></div></details>`).join('')}</section><div class="result-actions"><button class="button primary" data-action="download">Жазбамды жүктеу ↓</button><button class="button secondary" data-action="restart">Басқа жолмен ойнау ↺</button><button class="text-button" data-action="teacher">Топпен талқылау ${arrow}</button></div></main>`;
}
function render() {
  const content = showHome ? home() : state.screen==='result' ? result() : state.screen==='chapter' ? chapterSummary() : state.screen==='feedback' ? feedback() : play();
  app.innerHTML = header() + content + footer();
}
function modal(title, body) {
  dialog.innerHTML = `<div class="dialog-header"><h2 id="dialog-title">${title}</h2><button class="close-button" data-action="close" aria-label="Жабу">×</button></div><div class="dialog-body">${body}</div>`;
  dialog.showModal();
}
function guide() {
  modal('Оқиғаның ішінде сен барсың.', `<p>Сен, Аян және Дана алғашқы топтық жобаны аяқтағалы отырсыңдар. Мақсат — біреуді жеңу емес, жағдайды түсініп, әрекетіңнің ықпалын көру.</p><ol class="guide-list"><li><strong>Байқа.</strong> Эмоцияны танып, факт пен болжамды ажырат.</li><li><strong>Түсін.</strong> Үш тараптың дерегін ашып, талаптың артындағы мүддені ізде.</li><li><strong>Айт.</strong> Тыңдап, өз хабарыңды құрастыр.</li></ol><p>Әр қадамнан соң салдары мен түсіндірмесі шығады. «Басқа жолды байқап көру» арқылы шешіміңді өзгерте аласың.</p><div class="dialog-note">10–15 минут · Уақыт шектеуі жоқ · Телефонда да ойнауға болады</div><p class="small-text">Прогресс осы браузерде сақталады. Жеке тіркелу қажет емес. A, B, C пернелерімен әдеттегі жауапты таңдауға болады; Enter — фокустағы батырманы іске қосу. Tab және Enter барлық батырмаға қолжетімді.</p><button class="button primary" data-action="close">Түсінікті ${arrow}</button>`);
}
function sources() {
  modal('Оқу тақырыптары мен негізі', `<p>Ойын фотодағы оқу жоспарының үш тақырыбына сүйеніп, бірінші курсқа бейімделді. Кейіпкерлер мен оқиға — ойдан құрастырылған.</p><div class="source-topics">${chapters.map(c=>`<p><strong>${c.topic}</strong><span>${c.skill}</span></p>`).join('')}</div><h3>Түсініктерді тексеруге арналған дереккөздер</h3><ul class="source-links"><li><a href="https://www.apa.org/topics/stress/tips" target="_blank" rel="noopener noreferrer">American Psychological Association — стресс және оны басқару ↗</a></li><li><a href="https://www.pon.harvard.edu/daily/negotiation-skills-daily/what-is-negotiation/" target="_blank" rel="noopener noreferrer">Harvard Program on Negotiation — позициялар мен мүдделер ↗</a></li><li><a href="https://extension.usu.edu/relationships/research/effective-communication-skills-i-message-and-beyond" target="_blank" rel="noopener noreferrer">Utah State University — «Мен-хабарламасы» және коммуникация ↗</a></li></ul><p class="small-text">Дереккөздердегі жалпы қағидалар қазақша оқу сценарийіне бейімделді. Ойын көрсеткіштері — авторлық шартты модель.</p><button class="text-button" data-action="teacher">Сабақта қолдану жолы ${arrow}</button>`);
}
function teacher() {
  if (dialog.open) dialog.close();
  modal('Бір ойын, ортақ талқылау.', `<p>Сабаққа арналған 20 минуттық нұсқа:</p><ol class="guide-list"><li><strong>2 минут.</strong> Үш тақырыпты атап, «эмоция мен әрекеттің айырмасы қандай?» деп сұра.</li><li><strong>10–12 минут.</strong> Жеке немесе жұппен ойна. Екі ойыншы шешімге келіспесе, әрқайсысы өз уәжін айтсын.</li><li><strong>5 минут.</strong> Бір шешімді салыстырып, фактіні, мүддені және нақты өтінішті ата.</li><li><strong>1–2 минут.</strong> «Келесі жолы мен…» жазбасын толтыр.</li></ol><div class="discussion-box"><p>Талқылау сұрақтары</p>${chapters.map(c=>`<p class="small-text">${c.number}. ${c.discussion}</p>`).join('')}</div><p class="small-text">Пайызды студенттің тұлғасына баға беру үшін қолданба. Оқу дәлелі — оның таңдауының себебін түсіндіруі және дағдыны басқа жағдайға көшіруі.</p>`);
}
function download() {
  const text = `АРАЛЫҚ — оқу рефлексиясы\n\n${chapters.map((c,i)=>`${c.topic}\nОйындағы дағды: ${chapterScore(state,i)}%\n${c.quote}`).join('\n\n')}\n\nӨзіме жазба:\n${state.reflection || 'Жазба толтырылмаған.'}\n\nТаңдауларым:\n${state.answers.map((a,i)=>`${i+1}. ${scenes[i].label}\n${scenes[i].kind==='sort'?a.title:scenes[i].kind==='compose'?scenes[i].parts.map((p,j)=>p.options[a.payload[j]].text).join(' '):scenes[i].options[a.payload].text}\n${a.why}`).join('\n\n')}\n\nПайыздар тек ойын ішіндегі таңдауларды сипаттайды.\n`;
  const url = URL.createObjectURL(new Blob(['\uFEFF'+text], { type: 'text/plain;charset=utf-8' }));
  const a = document.createElement('a'); a.href = url; a.download = 'aralyq-reflection.txt'; a.click(); setTimeout(()=>URL.revokeObjectURL(url), 1000);
  announce('Жазба файл ретінде дайындалды.');
}
function selectAndRender(update) {
  const y = window.scrollY;
  const previous = document.activeElement;
  const selector = previous?.dataset.option!=null ? `[data-option="${previous.dataset.option}"]` : previous?.dataset.sort!=null ? `[data-sort="${previous.dataset.sort}"][data-value="${previous.dataset.value}"]` : previous?.dataset.part!=null ? `[data-part="${previous.dataset.part}"][data-value="${previous.dataset.value}"]` : previous?.dataset.clue!=null ? `[data-clue="${previous.dataset.clue}"]` : null;
  update(); render(); if (selector) document.querySelector(selector)?.focus({preventScroll:true}); window.scrollTo({top:y,behavior:'instant'});
}
document.addEventListener('click', e => {
  const button = e.target.closest('button'); if (!button || button.disabled) return;
  if (button.dataset.option!=null) return selectAndRender(()=>{ selection=Number(button.dataset.option); });
  if (button.dataset.sort!=null) return selectAndRender(()=>{ selection??=Array(4).fill(null); selection[Number(button.dataset.sort)]=button.dataset.value; });
  if (button.dataset.part!=null) return selectAndRender(()=>{ selection??=Array(3).fill(null); selection[Number(button.dataset.part)]=Number(button.dataset.value); });
  if (button.dataset.clue!=null) return selectAndRender(()=>{ opened.add(Number(button.dataset.clue)); });
  switch (button.dataset.action) {
    case 'home': showHome=true; render(); focusMain(); break;
    case 'start': showHome=false; if (!state.started) commit({...state,started:true,screen:'play'}); else {render();focusMain();} break;
    case 'guide': guide(); break;
    case 'sources': sources(); break;
    case 'teacher': teacher(); break;
    case 'close': dialog.close(); break;
    case 'submit': if (!isReady(scenes[state.cursor])) break; commit(submit(state,selection)); announce('Таңдауыңның салдары көрсетілді.'); break;
    case 'next': commit(advance(state)); break;
    case 'rethink': commit({...state,answers:state.answers.slice(0,state.cursor),screen:'play'}); break;
    case 'restart': modal('Басқа жолдан бастаймыз ба?', '<p>Осы браузердегі ойын прогресі мен рефлексия жазбасы жаңартылады. Қажет жазбаны алдымен жүктеп ал.</p><div class="dialog-actions"><button class="button secondary" data-action="close">Оралғым келеді</button><button class="button primary" data-action="confirm-restart">Басынан бастау ↺</button></div>'); break;
    case 'confirm-restart': dialog.close(); showHome=false; commit({...freshState(),started:true,screen:'play'}); break;
    case 'download': download(); break;
  }
});
document.addEventListener('input', e=>{
  if (e.target.id==='reflection') {state.reflection=e.target.value;save();clearTimeout(toastTimer);toastTimer=setTimeout(()=>announce(storageOK?'Жазба сақталды.':'Жазбаны файлға жүктеп сақтауға болады.'),1000);}
});
document.addEventListener('keydown',e=>{
  if (dialog.open || showHome || state.screen!=='play' || e.ctrlKey || e.metaKey || e.altKey || ['TEXTAREA','INPUT','SELECT'].includes(e.target.tagName)) return;
  const scene=scenes[state.cursor];
  if (['choice','evidence'].includes(scene.kind) && /^[abcABC]$/.test(e.key)) { const n=e.key.toLowerCase().charCodeAt(0)-97;document.querySelector(`[data-option="${n}"]`)?.click(); }
  if (e.key==='Enter' && e.target===document.querySelector('#main h1') && isReady(scene)) {e.preventDefault();document.querySelector('[data-action="submit"]')?.click();}
});
dialog.addEventListener('click',e=>{ if(e.target===dialog){const r=dialog.getBoundingClientRect();if(e.clientX<r.left||e.clientX>r.right||e.clientY<r.top||e.clientY>r.bottom)dialog.close();} });
render();

