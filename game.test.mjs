import test from 'node:test';
import assert from 'node:assert/strict';
import { scenes, chapters, freshState, assess, submit, advance, metrics, restore, chapterScore } from './game.mjs';

const best = [1, ['fact','guess','fact','guess'], 1, 0, 0, 1, 1, [1,2,0], 1];
const worst = [0, ['guess','fact','guess','fact'], 0, 1, 2, 0, 0, [0,0,1], 0];
function journey(payloads) {
  let s = {...freshState(), started:true, screen:'play'};
  for (let i=0;i<scenes.length;i++) {
    assert.equal(s.cursor,i);
    s=submit(s,payloads[i]);
    assert.equal(s.screen,'feedback');
    assert.deepEqual(restore(JSON.stringify(s)),s);
    assert.throws(()=>submit(s,payloads[i]));
    const measured=metrics(s);
    for (const n of Object.values(measured)) assert.ok(n>=0 && n<=100);
    s=advance(s);
    if ((i+1)%3===0) {
      assert.equal(s.screen,'chapter');
      assert.deepEqual(restore(JSON.stringify(s)),s);
      s=advance(s);
    }
    assert.deepEqual(restore(JSON.stringify(s)),s);
  }
  assert.equal(s.screen,'result');
  assert.equal(s.completed,true);
  assert.equal(s.answers.length,9);
  return s;
}
test('all constructive choices complete the three-chapter journey with full skill scores',()=>{
  const s=journey(best);
  assert.deepEqual(chapters.map((_,i)=>chapterScore(s,i)),[100,100,100]);
  assert.ok(metrics(s).trust>metrics(freshState()).trust);
});
test('unhelpful choices still reach a complete teachable ending',()=>{
  const s=journey(worst);
  assert.deepEqual(chapters.map((_,i)=>chapterScore(s,i)),[0,0,0]);
  assert.ok(metrics(s).tension>metrics(freshState()).tension);
});
test('every single option yields valid feedback; malformed or incomplete inputs are rejected',()=>{
  for(const scene of scenes) {
    if(scene.options) for(let i=0;i<scene.options.length;i++) {
      const a=assess(scene,i); assert.ok(a.why&&a.result); assert.ok(a.score>=0&&a.score<=2);
    }
    assert.throws(()=>assess(scene,null));
    assert.throws(()=>assess(scene,[]));
  }
  assert.equal(assess(scenes[1],['fact','fact','fact','guess']).score,1.5);
  assert.throws(()=>assess(scenes[7],[1,2,90]));
});
test('27 distinct composed messages are evaluated without gaps',()=>{
  let evaluated=0;
  for(let a=0;a<3;a++)for(let b=0;b<3;b++)for(let c=0;c<3;c++) {
    const feedback=assess(scenes[7],[a,b,c]);
    assert.ok(Number.isFinite(feedback.score)&&feedback.score>=0&&feedback.score<=2);
    evaluated++;
  }
  assert.equal(evaluated,27);
});
test('retry removes a previous decision so metrics and scores are not counted twice',()=>{
  let s={...freshState(),started:true,screen:'play'};
  s=submit(s,0);
  s={...s,answers:s.answers.slice(0,s.cursor),screen:'play'};
  assert.deepEqual(metrics(s),metrics(freshState()));
  s=submit(s,1);
  assert.equal(s.answers.length,1);
  assert.equal(s.answers[0].score,2);
});
test('corrupt, outdated and inconsistent progress resets safely',()=>{
  for(const raw of [null,'{','{}','null',JSON.stringify({...freshState(),version:0}),JSON.stringify({...freshState(),cursor:50}),JSON.stringify({...freshState(),screen:'result'}),JSON.stringify({...freshState(),answers:[{id:'other'}]})]) assert.deepEqual(restore(raw),freshState());
  const s=journey(best);
  s.answers[0].score=999;
  assert.equal(restore(JSON.stringify(s)).answers[0].score,2);
  s.answers[0].payload=999;
  assert.deepEqual(restore(JSON.stringify(s)),freshState());
});
