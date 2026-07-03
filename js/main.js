/* ============ Colin Dayer — interactions ============ */
document.getElementById('year').textContent = new Date().getFullYear();

/* ---- mobile nav ---- */
const nav = document.querySelector('.nav');
const toggle = document.querySelector('.nav-toggle');
toggle.addEventListener('click', () => nav.classList.toggle('open'));
nav.querySelectorAll('a').forEach(a => a.addEventListener('click', () => nav.classList.remove('open')));

/* ---- hero: use uploaded video if present, else generative animation ---- */
(function heroBackdrop(){
  const hero = document.querySelector('.hero');
  const canvas = document.querySelector('.hero-canvas');
  const video = document.querySelector('.hero-video');
  if(!hero || !canvas) return;

  // If assets/hero.mp4 exists and can play, reveal it and skip the canvas.
  if(video){
    video.addEventListener('loadeddata', () => {
      if(video.videoWidth){ video.classList.add('ready'); hero.classList.add('has-video'); }
    });
    video.addEventListener('error', () => { video.remove(); });
  }

  const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const ctx = canvas.getContext('2d');
  let w, h, dpr, t = 0, raf, running = true;

  // drifting "liquid" blobs — monochrome with one lime accent
  const blobs = Array.from({length: 6}, (_, i) => ({
    x: Math.random(), y: Math.random(),
    r: 0.28 + Math.random()*0.22,
    sx: (Math.random()-0.5)*0.00007,
    sy: (Math.random()-0.5)*0.00007,
    ph: Math.random()*Math.PI*2,
    lime: i === 2            // one accent blob
  }));

  function resize(){
    dpr = Math.min(window.devicePixelRatio||1, 2);
    w = canvas.clientWidth; h = canvas.clientHeight;
    canvas.width = w*dpr; canvas.height = h*dpr;
    ctx.setTransform(dpr,0,0,dpr,0,0);
  }

  function frame(){
    if(!running) return;
    t += 1;
    ctx.clearRect(0,0,w,h);
    ctx.globalCompositeOperation = 'lighter';
    const min = Math.min(w,h);
    blobs.forEach(b => {
      b.x += b.sx*16; b.y += b.sy*16;
      if(b.x<-0.2)b.x=1.2; if(b.x>1.2)b.x=-0.2;
      if(b.y<-0.2)b.y=1.2; if(b.y>1.2)b.y=-0.2;
      const pulse = 1 + 0.12*Math.sin(t*0.006 + b.ph);
      const cx = b.x*w, cy = b.y*h, rad = b.r*min*pulse;
      const g = ctx.createRadialGradient(cx,cy,0,cx,cy,rad);
      if(b.lime){
        g.addColorStop(0,'rgba(200,255,46,0.10)');
        g.addColorStop(1,'rgba(200,255,46,0)');
      } else {
        g.addColorStop(0,'rgba(150,152,160,0.12)');
        g.addColorStop(1,'rgba(150,152,160,0)');
      }
      ctx.fillStyle = g;
      ctx.beginPath(); ctx.arc(cx,cy,rad,0,Math.PI*2); ctx.fill();
    });
    ctx.globalCompositeOperation = 'source-over';
    raf = requestAnimationFrame(frame);
  }

  resize();
  window.addEventListener('resize', resize);
  if(reduce){ frame(); running=false; }   // one static frame only
  else frame();

  // pause when hero scrolled out of view
  new IntersectionObserver(es => es.forEach(e => {
    running = e.isIntersecting && !reduce;
    if(running){ raf = requestAnimationFrame(frame); }
    else cancelAnimationFrame(raf);
  }), {threshold:0}).observe(hero);
})();

/* ---- audio player ---- */
const audio = new Audio();
let currentTrack = null;

const player = document.getElementById('player');
const playerPlay = player.querySelector('.player-play');
const playerTitle = player.querySelector('.player-title');
const playerFill = player.querySelector('.player-fill');
const playerBar = player.querySelector('.player-bar');
const playerTime = player.querySelector('.player-time');
const tracks = [...document.querySelectorAll('.track')];

const fmt = s => (isNaN(s) ? '0:00' : `${Math.floor(s/60)}:${String(Math.floor(s%60)).padStart(2,'0')}`);

/* preload durations */
tracks.forEach(t => {
  const probe = new Audio();
  probe.preload = 'metadata';
  probe.src = t.dataset.src;
  probe.addEventListener('loadedmetadata', () => {
    t.querySelector('.track-time').textContent = fmt(probe.duration);
  });
});

function playTrack(track){
  if (currentTrack === track){
    audio.paused ? audio.play() : audio.pause();
    return;
  }
  currentTrack = track;
  audio.src = track.dataset.src;
  audio.play();
  player.hidden = false;
  playerTitle.textContent = track.querySelector('.track-title').textContent.trim();
  tracks.forEach(t => { t.classList.remove('active'); t.querySelector('.track-play').textContent = '▶'; });
  track.classList.add('active');
}

tracks.forEach(track => {
  track.addEventListener('click', () => playTrack(track));
});

playerPlay.addEventListener('click', () => { audio.paused ? audio.play() : audio.pause(); });

audio.addEventListener('play', () => {
  playerPlay.textContent = '❚❚';
  if (currentTrack) currentTrack.querySelector('.track-play').textContent = '❚❚';
});
audio.addEventListener('pause', () => {
  playerPlay.textContent = '▶';
  if (currentTrack) currentTrack.querySelector('.track-play').textContent = '▶';
});
audio.addEventListener('timeupdate', () => {
  const pct = (audio.currentTime / audio.duration) * 100 || 0;
  playerFill.style.width = pct + '%';
  playerTime.textContent = fmt(audio.currentTime);
  if (currentTrack) currentTrack.querySelector('.track-bar').style.width = pct + '%';
});
audio.addEventListener('ended', () => {
  if (currentTrack){
    currentTrack.querySelector('.track-play').textContent = '▶';
    currentTrack.querySelector('.track-bar').style.width = '0%';
  }
});

/* seek */
playerBar.addEventListener('click', e => {
  const rect = playerBar.getBoundingClientRect();
  audio.currentTime = ((e.clientX - rect.left) / rect.width) * audio.duration;
});

/* pause video when audio starts and vice-versa */
const video = document.querySelector('.video');
if (video){
  video.addEventListener('play', () => audio.pause());
  audio.addEventListener('play', () => video.pause());
}
