/* ============ Colin Dayer — interactions ============ */
document.getElementById('year').textContent = new Date().getFullYear();

/* ---- mobile nav ---- */
const nav = document.querySelector('.nav');
const toggle = document.querySelector('.nav-toggle');
toggle.addEventListener('click', () => nav.classList.toggle('open'));
nav.querySelectorAll('a').forEach(a => a.addEventListener('click', () => nav.classList.remove('open')));

/* ---- hero: uploaded video > WebGL fluid shader > 2D blob fallback ---- */
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
  let raf, running = true;
  const mouse = {x:0.5, y:0.5, tx:0.5, ty:0.5};   // eased mouse for parallax + shader

  window.addEventListener('pointermove', e => {
    mouse.tx = e.clientX / window.innerWidth;
    mouse.ty = e.clientY / window.innerHeight;
  });

  /* --- WebGL fluid: domain-warped noise in the site palette --- */
  const gl = canvas.getContext('webgl', {antialias:false, alpha:true});
  let program, timeLoc, resLoc, mouseLoc, start = performance.now();

  function initGL(){
    if(!gl) return false;
    const vs = `attribute vec2 p; void main(){ gl_Position = vec4(p,0.,1.); }`;
    const fs = `
      precision mediump float;
      uniform float t; uniform vec2 res; uniform vec2 m;
      // hash + value noise + fbm
      float hash(vec2 x){ return fract(sin(dot(x, vec2(127.1,311.7)))*43758.5453123); }
      float noise(vec2 x){
        vec2 i=floor(x), f=fract(x); f=f*f*(3.-2.*f);
        return mix(mix(hash(i),hash(i+vec2(1.,0.)),f.x),
                   mix(hash(i+vec2(0.,1.)),hash(i+vec2(1.,1.)),f.x),f.y);
      }
      float fbm(vec2 x){
        float v=0., a=.5;
        for(int i=0;i<5;i++){ v+=a*noise(x); x*=2.03; a*=.55; }
        return v;
      }
      void main(){
        vec2 uv = gl_FragCoord.xy/res;
        vec2 p = uv*vec2(res.x/res.y,1.);
        float tt = t*.045;
        // domain warp, gently pulled toward the mouse
        vec2 pull = (m-.5)*.35;
        vec2 q = vec2(fbm(p*1.6+tt), fbm(p*1.6-tt*.7));
        vec2 r = vec2(fbm(p*1.6+q*1.8+pull+tt*.4), fbm(p*1.6+q*1.8-pull-tt*.3));
        float f = fbm(p*1.6 + r*2.2);
        // palette: near-black -> smoke grey -> one lime ridge
        vec3 base  = vec3(.039,.039,.047);
        vec3 smoke = vec3(.12,.12,.14);
        vec3 lime  = vec3(.784,1.,.18);
        vec3 col = mix(base, smoke, smoothstep(.25,.85,f));
        float ridge = smoothstep(.55,.62,f)*smoothstep(.72,.62,f); // thin band
        col += lime*ridge*.22;
        col += lime*.05*smoothstep(.9,1.,f);
        // vignette
        float v = smoothstep(1.25,.35,length(uv-vec2(.35,.42)));
        gl_FragColor = vec4(col, .95*v + .35);
      }`;
    function sh(type, src){
      const s = gl.createShader(type); gl.shaderSource(s, src); gl.compileShader(s);
      return gl.getShaderParameter(s, gl.COMPILE_STATUS) ? s : null;
    }
    const v = sh(gl.VERTEX_SHADER, vs), f = sh(gl.FRAGMENT_SHADER, fs);
    if(!v || !f) return false;
    program = gl.createProgram();
    gl.attachShader(program, v); gl.attachShader(program, f); gl.linkProgram(program);
    if(!gl.getProgramParameter(program, gl.LINK_STATUS)) return false;
    gl.useProgram(program);
    const buf = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, buf);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1,-1, 3,-1, -1,3]), gl.STATIC_DRAW);
    const loc = gl.getAttribLocation(program, 'p');
    gl.enableVertexAttribArray(loc);
    gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 0, 0);
    timeLoc = gl.getUniformLocation(program, 't');
    resLoc = gl.getUniformLocation(program, 'res');
    mouseLoc = gl.getUniformLocation(program, 'm');
    return true;
  }

  function resize(){
    const dpr = Math.min(window.devicePixelRatio||1, 1.5);
    canvas.width = canvas.clientWidth*dpr;
    canvas.height = canvas.clientHeight*dpr;
    if(gl) gl.viewport(0,0,canvas.width,canvas.height);
  }

  const glOK = initGL();

  function frame(){
    if(!running) return;
    mouse.x += (mouse.tx-mouse.x)*.04;
    mouse.y += (mouse.ty-mouse.y)*.04;
    if(glOK){
      gl.uniform1f(timeLoc, (performance.now()-start)/1000);
      gl.uniform2f(resLoc, canvas.width, canvas.height);
      gl.uniform2f(mouseLoc, mouse.x, 1.-mouse.y);
      gl.drawArrays(gl.TRIANGLES, 0, 3);
    }
    raf = requestAnimationFrame(frame);
  }

  resize();
  window.addEventListener('resize', resize);
  if(glOK){
    if(reduce){ // render one static frame
      gl.uniform1f(timeLoc, 12); gl.uniform2f(resLoc, canvas.width, canvas.height);
      gl.uniform2f(mouseLoc, .5,.5); gl.drawArrays(gl.TRIANGLES,0,3);
      running = false;
    } else frame();
  } else {
    canvas.style.background = 'radial-gradient(80% 60% at 30% 40%, #17171c, #0a0a0c)';
  }

  // pause when hero is off-screen
  new IntersectionObserver(es => es.forEach(e => {
    const want = e.isIntersecting && !reduce && glOK;
    if(want && !running){ running = true; raf = requestAnimationFrame(frame); }
    else if(!want){ running = false; cancelAnimationFrame(raf); }
  }), {threshold:0}).observe(hero);

  /* --- mouse parallax on the hero text --- */
  const inner = document.querySelector('.hero-inner');
  if(inner && !reduce){
    (function par(){
      const dx = (mouse.x-.5)*18, dy = (mouse.y-.5)*12;
      inner.style.transform = `translate3d(${dx}px, ${dy}px, 0)`;
      requestAnimationFrame(par);
    })();
  }
})();

/* ---- scroll-reveal: sections & cards fade up as they enter ---- */
(function reveal(){
  if(window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  const targets = document.querySelectorAll('.section-head, .work-card, .track, .video-block, .live-block, .about-bio, .about-cols, .contact-inner, .paper');
  targets.forEach(el => el.classList.add('will-reveal'));
  const io = new IntersectionObserver(es => es.forEach(e => {
    if(e.isIntersecting){ e.target.classList.add('revealed'); io.unobserve(e.target); }
  }), {threshold:.12, rootMargin:'0px 0px -40px 0px'});
  targets.forEach(el => io.observe(el));
})();

/* ---- ambient background sound (First Modulation) ---- */
const ambient = new Audio('audio/first-modulation.mp3');
ambient.loop = true;
ambient.volume = 0.3;
window._ambient = ambient;   // debugging hook
const soundToggle = document.getElementById('soundToggle');
let ambientWanted = true;   // user intent; browser may still block until a gesture

function syncSoundUI(){
  soundToggle.classList.toggle('on', !ambient.paused);
}
function ambientPlay(){
  ambient.play().then(syncSoundUI).catch(()=>{ /* blocked until user gesture */ });
}
function ambientStop(){ ambient.pause(); syncSoundUI(); }

soundToggle.addEventListener('click', e => {
  e.stopPropagation();
  ambientWanted = ambient.paused;
  ambientWanted ? ambientPlay() : ambientStop();
});

// try autoplay; if blocked, start on the first interaction anywhere
ambientPlay();
['pointerdown','keydown','touchstart'].forEach(ev =>
  window.addEventListener(ev, function once(){
    if (ambientWanted && ambient.paused) ambientPlay();
    window.removeEventListener(ev, once);
  }, {once:true})
);

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
  ambientWanted = false; ambientStop();   // duck the site ambient for real listening
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
// any html5 video (installation, anarchie) also stops the ambient
document.querySelectorAll('video').forEach(v =>
  v.addEventListener('play', () => { ambientWanted = false; ambientStop(); })
);
