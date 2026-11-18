import test from 'node:test';
import assert from 'node:assert/strict';
import {AudioDirector} from './audio.mjs';

const manifest={intro:'./assets/voice/intro.mp3','brief-0':'./assets/voice/brief-0.mp3'};
class FakeAudio{
 constructor(src){this.src=src;this.paused=true;this.volume=1;this.currentTime=0;this.events={};}
 addEventListener(name,fn){this.events[name]=fn;}
 play(){this.paused=false;this.events.playing?.();return this.gate||Promise.resolve();}
 pause(){this.paused=true;}
}
function setup(){globalThis.Audio=FakeAudio;globalThis.document={hidden:false,addEventListener(){}};globalThis.fetch=async()=>({ok:true,json:async()=>manifest});return new AudioDirector({music:true,sfx:true,voice:true,volume:.28});}

test('narration pauses and resumes the same clip while music ducks and restores',async()=>{
 const audio=setup();await audio.loadVoices();audio.unlock();assert.equal(await audio.voice('intro'),true);
 const clip=audio.voiceAudio;clip.currentTime=4;
 assert.equal(audio.status(),'Қазақша дауыс оқып тұр');assert.equal(audio.track.volume,.07);
 await audio.voice('intro');assert.equal(clip.paused,true);assert.equal(audio.track.volume,.28);
 await audio.voice('intro');assert.equal(audio.voiceAudio,clip);assert.equal(clip.currentTime,4);assert.equal(clip.paused,false);
 clip.onended();assert.equal(audio.voiceAudio,null);assert.equal(audio.activeClip,'');assert.equal(audio.track.volume,.28);
});
test('leaving a scene cancels narration that is still loading',async()=>{
 const audio=setup();audio.voiceMap={};let resolveFetch;globalThis.fetch=()=>new Promise(resolve=>{resolveFetch=resolve;});audio.unlock();
 const pending=audio.voice('intro');audio.stopVoice();resolveFetch({ok:true,json:async()=>manifest});
 assert.equal(await pending,false);assert.equal(audio.voiceAudio,null);assert.equal(audio.activeClip,'');
});
test('late playback and ended events from the old scene cannot stop the new narration',async()=>{
 const audio=setup();await audio.loadVoices();audio.unlock();
 const OriginalAudio=globalThis.Audio;let resolveOld;
 globalThis.Audio=class extends OriginalAudio{constructor(src){super(src);if(src.endsWith('/intro.mp3'))this.gate=new Promise(resolve=>{resolveOld=resolve;});}};
 const pending=audio.voice('intro'),old=audio.voiceAudio;
 await audio.voice('brief-0');const current=audio.voiceAudio;old.onended();resolveOld();
 assert.equal(await pending,false);assert.equal(audio.voiceAudio,current);assert.equal(audio.activeClip,'brief-0');assert.equal(current.paused,false);
 audio.sync({...audio.settings,voice:false});assert.equal(audio.voiceAudio,null);assert.equal(current.paused,true);assert.equal(audio.track.volume,.28);
});
