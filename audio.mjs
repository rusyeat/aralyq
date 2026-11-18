const sounds={tap:'click_001',message:'open_001',select:'select_001',success:'confirmation_001',finish:'confirmation_002',error:'error_001'};
export class AudioDirector{
 constructor(settings,onStatus=()=>{}){this.settings=settings;this.onStatus=onStatus;this.unlocked=false;this.voiceMap={};this.voiceAudio=null;this.activeClip='';this.voiceRequest=0;this.track=new Audio('./assets/audio/sunset-plains.ogg');this.track.loop=true;this.track.preload='none';this.track.addEventListener('playing',()=>this.onStatus(this.status()));this.track.addEventListener('error',()=>this.onStatus('Музыка жүктелмеді'));this.loadVoices();document.addEventListener('visibilitychange',()=>{if(document.hidden){this.track.pause();this.voiceAudio?.pause();this.onStatus(this.status());}else if(this.unlocked&&this.settings.music)this.track.play().catch(()=>{});});}
 status(){return this.voiceAudio&&!this.voiceAudio.paused?'Қазақша дауыс оқып тұр':!this.unlocked?'Дыбыс бастағанда қосылады':this.track.paused?'Музыка өшірулі':'Музыка ойнап тұр';}
 async loadVoices(){try{const r=await fetch('./assets/voice/manifest.json',{cache:'no-store'});if(r.ok)this.voiceMap=await r.json();}catch{}}
 unlock(){this.unlocked=true;this.sync();}
 sync(settings=this.settings){this.settings=settings;this.track.volume=Math.min(1,settings.volume*(this.voiceAudio && !this.voiceAudio.paused ? .3 : 1));if(settings.music&&this.unlocked&&!document.hidden)this.track.play().catch(()=>this.onStatus('Музыканы қосу үшін батырманы бас'));else {this.track.pause();this.onStatus('Музыка өшірулі');}if(!settings.voice)this.stopVoice();}
 fx(name){if(!this.settings.sfx||!this.unlocked)return;const a=new Audio('./assets/audio/'+(sounds[name]||sounds.tap)+'.wav');a.volume=Math.min(.55,this.settings.volume+.12);a.play().catch(()=>{});}
 stopVoice(){this.voiceRequest++;if(this.voiceAudio){this.voiceAudio.pause();this.voiceAudio=null;}this.activeClip='';this.track.volume=this.settings.volume;this.onStatus(this.status());}
 async voice(id){
  if(this.activeClip===id&&this.voiceAudio){if(!this.voiceAudio.paused){this.voiceAudio.pause();this.track.volume=this.settings.volume;this.onStatus(this.status());return true;}try{await this.voiceAudio.play();this.track.volume=this.settings.volume*.25;this.onStatus(this.status());return true;}catch{this.stopVoice();return false;}}
  this.stopVoice();const request=this.voiceRequest;if(!this.settings.voice||!this.unlocked)return false;if(!this.voiceMap[id])await this.loadVoices();const path=this.voiceMap[id];if(!path||request!==this.voiceRequest)return false;
  const clip=new Audio(path);this.voiceAudio=clip;this.activeClip=id;clip.volume=Math.min(1,this.settings.volume*2+.25);this.track.volume=this.settings.volume*.25;
  clip.onended=()=>{if(this.voiceAudio!==clip)return;this.voiceAudio=null;this.activeClip='';this.track.volume=this.settings.volume;this.onStatus(this.status());};
  try{await clip.play();if(request!==this.voiceRequest){clip.pause();return false;}this.onStatus(this.status());return true;}catch{if(request===this.voiceRequest)this.stopVoice();return false;}
 }
}

