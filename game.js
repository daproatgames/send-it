(() => {
  'use strict';

  /* ============================================================
     SEND IT — downhill MTB trick game
     Canvas 2D, no dependencies.
     ============================================================ */

  const TAU = Math.PI * 2;
  const GRAVITY = 1550;
  const ROT_SPEED = 9.6;
  const METERS_PER_PX = 1 / 40;
  const COMBO_WINDOW = 5.2;
  const ZONE_LENGTH = 780;

  const clamp = (v, a, b) => (v < a ? a : v > b ? b : v);
  const lerp = (a, b, t) => a + (b - a) * t;
  const smooth = (t) => {
    t = clamp(t, 0, 1);
    return t * t * (3 - 2 * t);
  };
  const rand = (a = 0, b = 1) => a + Math.random() * (b - a);
  const wrapAngle = (a) => {
    a = (a + Math.PI) % TAU;
    if (a < 0) a += TAU;
    return a - Math.PI;
  };
  const fmt = (n) => Math.round(n).toLocaleString('en-US');
  const ease = (rate, dt) => 1 - Math.exp(-rate * dt);

  function hash1(n) {
    const s = Math.sin(n * 127.1 + 311.7) * 43758.5453123;
    return s - Math.floor(s);
  }

  function mulberry32(a) {
    return function () {
      a |= 0;
      a = (a + 0x6d2b79f5) | 0;
      let t = Math.imul(a ^ (a >>> 15), 1 | a);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }

  function hexToRgb(hex) {
    const h = hex.replace('#', '');
    return [parseInt(h.slice(0, 2), 16), parseInt(h.slice(2, 4), 16), parseInt(h.slice(4, 6), 16)];
  }

  function mixHex(a, b, t) {
    const A = hexToRgb(a);
    const B = hexToRgb(b);
    return `rgb(${Math.round(lerp(A[0], B[0], t))},${Math.round(lerp(A[1], B[1], t))},${Math.round(lerp(A[2], B[2], t))})`;
  }

  function alpha(color, a) {
    if (color[0] === '#') {
      const [r, g, b] = hexToRgb(color);
      return `rgba(${r},${g},${b},${a})`;
    }
    if (color.startsWith('rgb(')) return color.replace('rgb(', 'rgba(').replace(')', `,${a})`);
    return color;
  }

  function loadBest() {
    try {
      return parseInt(localStorage.getItem('sendit.best') || '0', 10) || 0;
    } catch (e) {
      return 0;
    }
  }

  function saveBest(v) {
    try {
      localStorage.setItem('sendit.best', String(v));
    } catch (e) {
      /* ignore */
    }
  }

  function loadMuted() {
    try {
      return localStorage.getItem('sendit.muted') === '1';
    } catch (e) {
      return false;
    }
  }

  function saveMuted(v) {
    try {
      localStorage.setItem('sendit.muted', v ? '1' : '0');
    } catch (e) {
      /* ignore */
    }
  }

  /* ============================================================
     Palettes
     ============================================================ */

  const BIOMES = [
    {
      name: 'PINE RIDGE',
      skyTop: '#67accd',
      skyBottom: '#f2ecd2',
      sun: '#fff1ba',
      haze: '#d5e5d7',
      far: '#a7c3b4',
      far2: '#8bb0a1',
      mid: '#5e8a6d',
      mid2: '#466c55',
      tree: '#2c5340',
      tree2: '#1f3f30',
      grass: '#729b4c',
      grass2: '#a6cb68',
      dirt: '#7b5c3d',
      dirtDeep: '#422d1e',
      rock: '#65594b',
      accent: '#ff8a2a',
      cloud: '#fff9ea'
    },
    {
      name: 'RED CANYON',
      skyTop: '#5b9dc2',
      skyBottom: '#ffe1b1',
      sun: '#ffe09e',
      haze: '#f2d0a6',
      far: '#cba383',
      far2: '#b68866',
      mid: '#97633f',
      mid2: '#7a4b2d',
      tree: '#5f6d3b',
      tree2: '#48552b',
      grass: '#b08a4c',
      grass2: '#d5b165',
      dirt: '#9d633c',
      dirtDeep: '#54301a',
      rock: '#81654f',
      accent: '#ff7a1f',
      cloud: '#fff0db'
    },
    {
      name: 'ALPINE',
      skyTop: '#4d80a9',
      skyBottom: '#e9f3fb',
      sun: '#fff8e2',
      haze: '#dbe9f2',
      far: '#c5d4df',
      far2: '#adc1cf',
      mid: '#7e9ba9',
      mid2: '#62808e',
      tree: '#31504a',
      tree2: '#253d39',
      grass: '#9cb8aa',
      grass2: '#dbe7df',
      dirt: '#8a887f',
      dirtDeep: '#4c4942',
      rock: '#79756c',
      accent: '#ff9a3c',
      cloud: '#ffffff'
    }
  ];

  function getPalette(meters) {
    const raw = Math.max(0, meters) / ZONE_LENGTH;
    const base = Math.floor(raw);
    const i = ((base % BIOMES.length) + BIOMES.length) % BIOMES.length;
    const frac = raw - base;
    const j = (i + 1) % BIOMES.length;
    const t = frac > 0.88 ? smooth((frac - 0.88) / 0.12) : 0;
    const A = BIOMES[i];
    const B = BIOMES[j];
    const out = {};
    for (const k in A) {
      if (typeof A[k] === 'string' && A[k][0] === '#') out[k] = mixHex(A[k], B[k], t);
      else out[k] = A[k];
    }
    out.name = t > 0.5 ? B.name : A.name;
    out.zone = t > 0.5 ? j : i;
    return out;
  }

  /* ============================================================
     Sound
     ============================================================ */

  class Sfx {
    constructor() {
      this.ctx = null;
      this.master = null;
      this.noiseBuf = null;
      this.wind = null;
      this.roll = null;
      this.windOn = false;
      this.muted = loadMuted();
    }

    init() {
      if (this.ctx) {
        if (this.ctx.state === 'suspended') this.ctx.resume();
        return;
      }
      const AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) return;
      this.ctx = new AC();
      this.master = this.ctx.createGain();
      this.master.gain.value = this.muted ? 0 : 0.55;
      this.master.connect(this.ctx.destination);

      const len = Math.floor(this.ctx.sampleRate * 1.5);
      const buffer = this.ctx.createBuffer(1, len, this.ctx.sampleRate);
      const data = buffer.getChannelData(0);
      for (let i = 0; i < len; i++) data[i] = Math.random() * 2 - 1;
      this.noiseBuf = buffer;

      const src = this.ctx.createBufferSource();
      src.buffer = buffer;
      src.loop = true;
      const filt = this.ctx.createBiquadFilter();
      filt.type = 'bandpass';
      filt.frequency.value = 420;
      filt.Q.value = 0.55;
      const gain = this.ctx.createGain();
      gain.gain.value = 0;
      src.connect(filt);
      filt.connect(gain);
      gain.connect(this.master);
      src.start();
      this.wind = { src, filt, gain };

      // rolling gravel / tyre noise
      const rsrc = this.ctx.createBufferSource();
      rsrc.buffer = buffer;
      rsrc.loop = true;
      const rfilt = this.ctx.createBiquadFilter();
      rfilt.type = 'bandpass';
      rfilt.frequency.value = 780;
      rfilt.Q.value = 0.5;
      const rgain = this.ctx.createGain();
      rgain.gain.value = 0;
      rsrc.connect(rfilt);
      rfilt.connect(rgain);
      rgain.connect(this.master);
      rsrc.start();
      this.roll = { src: rsrc, filt: rfilt, gain: rgain };
    }

    setMuted(m) {
      this.muted = m;
      saveMuted(m);
      if (!this.ctx) return;
      this.master.gain.setTargetAtTime(m ? 0 : 0.55, this.ctx.currentTime, 0.05);
    }

    toggleMute() {
      this.setMuted(!this.muted);
      return this.muted;
    }

    startWind() {
      this.windOn = true;
    }

    stopWind() {
      this.windOn = false;
      if (this.wind && this.ctx) {
        this.wind.gain.gain.setTargetAtTime(0, this.ctx.currentTime, 0.25);
      }
      if (this.roll && this.ctx) {
        this.roll.gain.gain.setTargetAtTime(0, this.ctx.currentTime, 0.18);
      }
    }

    updateWind(speed, airborne) {
      if (!this.ctx || !this.wind) return;
      const level = this.windOn ? clamp((speed - 140) / 950, 0, 1) * 0.13 + (airborne ? 0.015 : 0) : 0;
      this.wind.gain.gain.setTargetAtTime(level, this.ctx.currentTime, 0.14);
      this.wind.filt.frequency.setTargetAtTime(300 + speed * 1.25, this.ctx.currentTime, 0.2);
      if (this.roll) {
        const rollLevel = this.windOn && !airborne ? clamp((speed - 120) / 900, 0, 1) * 0.055 : 0;
        this.roll.gain.gain.setTargetAtTime(rollLevel, this.ctx.currentTime, 0.09);
        this.roll.filt.frequency.setTargetAtTime(520 + speed * 0.9, this.ctx.currentTime, 0.12);
      }
    }

    tone(freq, dur, opts = {}) {
      if (!this.ctx) return;
      const t0 = this.ctx.currentTime + (opts.delay || 0);
      const osc = this.ctx.createOscillator();
      const g = this.ctx.createGain();
      osc.type = opts.type || 'sine';
      osc.frequency.setValueAtTime(freq, t0);
      if (opts.to) osc.frequency.exponentialRampToValueAtTime(Math.max(20, opts.to), t0 + dur);
      const vol = opts.gain == null ? 0.13 : opts.gain;
      g.gain.setValueAtTime(0.0001, t0);
      g.gain.exponentialRampToValueAtTime(vol, t0 + 0.012);
      g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
      osc.connect(g);
      g.connect(this.master);
      osc.start(t0);
      osc.stop(t0 + dur + 0.04);
    }

    noise(dur, opts = {}) {
      if (!this.ctx) return;
      const t0 = this.ctx.currentTime + (opts.delay || 0);
      const src = this.ctx.createBufferSource();
      src.buffer = this.noiseBuf;
      const filt = this.ctx.createBiquadFilter();
      filt.type = opts.filter || 'bandpass';
      filt.frequency.setValueAtTime(opts.freq || 800, t0);
      if (opts.to) filt.frequency.exponentialRampToValueAtTime(Math.max(30, opts.to), t0 + dur);
      filt.Q.value = opts.q == null ? 0.7 : opts.q;
      const g = this.ctx.createGain();
      const vol = opts.gain == null ? 0.1 : opts.gain;
      g.gain.setValueAtTime(0.0001, t0);
      g.gain.exponentialRampToValueAtTime(vol, t0 + 0.01);
      g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
      src.connect(filt);
      filt.connect(g);
      g.connect(this.master);
      src.start(t0);
      src.stop(t0 + dur + 0.02);
    }

    jump() {
      this.noise(0.2, { freq: 650, to: 1900, gain: 0.055, q: 0.8 });
      this.tone(190, 0.12, { to: 300, type: 'triangle', gain: 0.04 });
    }

    whoosh() {
      this.noise(0.14, { freq: 700, to: 1500, gain: 0.035, q: 1 });
    }

    land(impact) {
      const v = clamp(impact / 2600, 0.04, 0.18);
      this.tone(120, 0.2, { to: 55, gain: v, type: 'sine' });
      this.noise(0.13, { freq: 420, to: 180, gain: v * 0.8, filter: 'lowpass' });
    }

    trick(flips) {
      const notes = [523.25, 659.25, 783.99, 1046.5];
      const n = clamp(1 + flips, 1, 4);
      for (let i = 0; i <= n; i++) {
        this.tone(notes[i % notes.length] * (i >= 4 ? 2 : 1), 0.14, {
          delay: i * 0.055,
          type: 'triangle',
          gain: 0.055
        });
      }
    }

    crash() {
      this.noise(0.5, { freq: 900, to: 120, gain: 0.2, filter: 'lowpass' });
      this.noise(0.3, { freq: 2600, to: 400, gain: 0.09, q: 0.5 });
      this.tone(150, 0.4, { to: 42, type: 'sawtooth', gain: 0.08 });
    }

    boost() {
      this.noise(0.55, { freq: 240, to: 1900, gain: 0.09, q: 0.9 });
      this.tone(90, 0.45, { to: 180, type: 'sawtooth', gain: 0.035 });
    }

    click() {
      this.tone(660, 0.06, { to: 880, type: 'square', gain: 0.03 });
    }
  }

  /* ============================================================
     Terrain
     ============================================================ */

  class Terrain {
    constructor(seed = null) {
      this.seed = seed == null ? (Math.random() * 0x7fffffff) | 0 : seed >>> 0;
      this.rng = mulberry32(this.seed);
      this.segments = [];
      this.cursorX = -520;
      this.cursorY = 0;
      this.cursorSlope = 0.17;
      this.addFlow(1500, { m: 0.17, amp: 2.2, wl: 520 });
      this.extendTo(7000);
    }

    range(a, b) {
      return a + this.rng() * (b - a);
    }

    difficulty() {
      return clamp((this.cursorX * METERS_PER_PX - 350) / 2700, 0, 1);
    }

    evalSeg(seg, t) {
      switch (seg.type) {
        case 'flow': {
          return seg.y0 + seg.m * t + seg.amp * (Math.sin((t / seg.wl) * TAU + seg.phase) - seg.phase0);
        }
        case 'ramp': {
          const u = t / seg.L;
          return seg.y0 + seg.m * t - seg.H * u * u;
        }
        case 'rolloff': {
          return seg.y0 + seg.g * t;
        }
        case 'landing': {
          return seg.y0 + seg.gs * t - ((seg.gs - seg.m2) * t * t) / (2 * seg.L);
        }
        case 'drop': {
          const u = clamp((t - seg.pre) / seg.over, 0, 1);
          return seg.y0 + seg.m * t + seg.D * (u * u * (3 - 2 * u));
        }
        default:
          return seg.y0;
      }
    }

    commit(seg) {
      this.segments.push(seg);
      this.cursorX = seg.x1;
      const len = seg.x1 - seg.x0;
      const y1 = this.evalSeg(seg, len);
      this.cursorY = y1;
      const h = Math.min(1, len * 0.45);
      if (h > 0.001) {
        const a = this.evalSeg(seg, Math.max(0, len - h));
        this.cursorSlope = (y1 - a) / h;
      }
    }

    addFlow(len, opts = {}) {
      const x0 = this.cursorX;
      const y0 = this.cursorY;
      const m = opts.m !== undefined ? opts.m : clamp(this.cursorSlope + this.range(-0.045, 0.045) + 0.003, 0.07, 0.48);
      const amp = opts.amp !== undefined ? opts.amp : this.rng() < 0.3 ? this.range(5, 13) : this.range(1.2, 5);
      const wl = opts.wl !== undefined ? opts.wl : this.range(250, 540);
      const phase = this.range(0, TAU);
      const seg = {
        type: 'flow',
        x0,
        x1: x0 + len,
        y0,
        m,
        amp,
        wl,
        phase,
        phase0: Math.sin(phase)
      };
      this.commit(seg);
    }

    addKicker() {
      const diff = this.difficulty();
      const x0 = this.cursorX;
      const y0 = this.cursorY;
      const L = 128 + this.range(0, 40) + diff * 26;
      const H = 72 + this.range(0, 38) + diff * 52;
      const m = clamp(this.cursorSlope, 0.08, 0.4);

      this.commit({ type: 'ramp', x0, x1: x0 + L, y0, m, H, L });
      const lipY = this.cursorY;

      const g = 0.9 + this.range(0, 0.4) + diff * 0.36;
      const G = 60 + this.range(0, 70) + diff * 100;
      this.commit({ type: 'rolloff', x0: this.cursorX, x1: this.cursorX + G, y0: lipY, g, G });

      const yLand = this.cursorY;
      const LD = 170 + this.range(0, 90);
      const m2 = clamp(0.15 + this.range(0, 0.18), 0.1, 0.38);
      this.commit({ type: 'landing', x0: this.cursorX, x1: this.cursorX + LD, y0: yLand, gs: g, m2, L: LD });

      this.addFlow(270 + this.range(0, 230), { m: m2, amp: this.range(2, 6), wl: this.range(320, 520) });
    }

    addDrop() {
      const diff = this.difficulty();
      const x0 = this.cursorX;
      const y0 = this.cursorY;
      const m = clamp(this.cursorSlope, 0.08, 0.44);
      const pre = 60 + this.range(0, 70);
      const over = 22 + this.range(0, 20);
      const D = 45 + this.range(0, 70) + diff * 85;
      const len = pre + over + 70 + this.range(0, 80);
      this.commit({ type: 'drop', x0, x1: x0 + len, y0, m, pre, over, D, len });
      this.addFlow(300 + this.range(0, 320));
    }

    nextFeature() {
      const meters = this.cursorX * METERS_PER_PX;
      if (meters < 38) {
        this.addFlow(560);
        return;
      }
      const diff = this.difficulty();
      const r = this.rng();
      if (r < 0.3 + diff * 0.14) this.addKicker();
      else if (r < 0.42 + diff * 0.1) this.addDrop();
      else this.addFlow(300 + this.range(0, 340));
    }

    extendTo(x) {
      let guard = 0;
      while (this.cursorX < x && guard < 260) {
        this.nextFeature();
        guard++;
      }
    }

    segAt(x) {
      if (x > this.cursorX - 120) this.extendTo(x + 2600);
      const segs = this.segments;
      let lo = 0;
      let hi = segs.length - 1;
      while (lo < hi) {
        const mid = (lo + hi + 1) >> 1;
        if (segs[mid].x0 <= x) lo = mid;
        else hi = mid - 1;
      }
      return segs[lo];
    }

    groundY(x) {
      const s = this.segAt(x);
      const t = clamp(x - s.x0, 0, s.x1 - s.x0);
      return this.evalSeg(s, t);
    }

    slopeAt(x) {
      const h = 1.1;
      return (this.groundY(x + h) - this.groundY(x - h)) / (2 * h);
    }
  }

  /* ============================================================
     DOM / UI
     ============================================================ */

  const $ = (id) => document.getElementById(id);
  const dom = {
    canvas: $('game'),
    hud: $('hud'),
    score: $('score'),
    combo: $('combo'),
    comboCount: $('comboCount'),
    comboBar: $('comboBar'),
    dist: $('dist'),
    speed: $('speed'),
    trickFeed: $('trickFeed'),
    trickName: $('trickName'),
    trickPts: $('trickPts'),
    boostPanel: $('boostPanel'),
    boostBar: $('boostBar'),
    bails: $('bails'),
    wipeout: $('wipeout'),
    toast: $('toast'),
    menu: $('menu'),
    startBtn: $('startBtn'),
    menuBest: $('menuBest'),
    over: $('over'),
    finalScore: $('finalScore'),
    runCoins: $('runCoins'),
    finalDist: $('finalDist'),
    finalTrick: $('finalTrick'),
    finalBest: $('finalBest'),
    newBest: $('newBest'),
    againBtn: $('againBtn'),
    menuBtn: $('menuBtn'),
    soundBtn: $('soundBtn'),
    soundLabel: $('soundLabel'),
    touch: $('touch')
  };

  const ui = {
    toastTimer: 0,
    trickTimer: 0,

    init(game) {
      dom.menuBest.textContent = fmt(game.bestScore);
      dom.soundBtn.classList.toggle('muted', game.sfx.muted);
      dom.soundLabel.textContent = game.sfx.muted ? 'MUTED' : 'SOUND';
      dom.soundBtn.setAttribute('aria-pressed', String(!game.sfx.muted));
      this.setBails(3);
      this.tick(game);
    },

    setHud(show) {
      dom.hud.classList.toggle('hidden', !show);
      dom.hud.setAttribute('aria-hidden', String(!show));
    },

    setMenu(show) {
      dom.menu.classList.toggle('hidden', !show);
    },

    setOver(show) {
      dom.over.classList.toggle('hidden', !show);
    },

    setBails(n) {
      const pips = dom.bails.children;
      for (let i = 0; i < pips.length; i++) pips[i].classList.toggle('lost', i >= n);
    },

    showTrick(name, pts, grade) {
      dom.trickName.textContent = name;
      dom.trickPts.textContent = `+${fmt(pts)}`;
      dom.trickPts.classList.toggle('perfect', grade === 'PERFECT');
      dom.trickPts.classList.toggle('sketchy', grade === 'SKETCHY');
      dom.trickFeed.classList.remove('pop');
      void dom.trickFeed.offsetWidth;
      dom.trickFeed.classList.add('pop');
      clearTimeout(this.trickTimer);
      this.trickTimer = setTimeout(() => dom.trickFeed.classList.remove('pop'), 1950);
    },

    tick(game) {
      const total = game.totalScore;
      dom.score.textContent = fmt(total);
      const m = Math.max(0, game.distance);
      dom.dist.textContent = fmt(Math.floor(m));
      const kmh = game.displaySpeed != null ? game.displaySpeed : game.state === 'countdown' ? 0 : game.bike.vx * 0.09;
      dom.speed.textContent = String(Math.round(kmh));

      const active = game.chain >= 2 && game.comboTimer > 0;
      dom.combo.classList.toggle('active', active);
      if (active) {
        const mult = Math.min(8, 1 + (game.chain - 1) * 0.35);
        dom.comboCount.textContent = `×${mult.toFixed(mult % 1 === 0 ? 0 : 1)}`;
        dom.comboBar.style.transform = `scaleX(${clamp(game.comboTimer / COMBO_WINDOW, 0, 1)})`;
      }

      const boost = clamp(game.boost, 0, 1);
      dom.boostBar.style.transform = `scaleX(${boost})`;
      dom.boostPanel.classList.toggle('active', game.boosting);
      dom.boostPanel.classList.toggle('full', boost > 0.985);
    },

    showOver(game, isBest) {
      dom.toast.classList.remove('show');
      dom.trickFeed.classList.remove('pop');
      dom.finalScore.textContent = fmt(game.totalScore);
      if (dom.runCoins) dom.runCoins.textContent = `+${fmt(game.coinsEarned || 0)} COINS`;
      dom.finalDist.textContent = `${fmt(Math.floor(game.distance))} m`;
      dom.finalTrick.textContent = game.bestTrick ? game.bestTrick.name : '—';
      dom.finalTrick.title = game.bestTrick ? `${game.bestTrick.name} · ${fmt(game.bestTrick.points)} pts` : '';
      dom.finalBest.textContent = fmt(game.bestScore);
      dom.newBest.classList.toggle('hidden', !isBest);
      dom.menuBest.textContent = fmt(game.bestScore);
      this.tick(game);
      this.setOver(true);
    },

    wipeout() {
      dom.wipeout.classList.remove('show');
      void dom.wipeout.offsetWidth;
      dom.wipeout.classList.add('show');
    },

    toast(msg) {
      dom.toast.textContent = msg;
      dom.toast.classList.add('show');
      clearTimeout(this.toastTimer);
      this.toastTimer = setTimeout(() => dom.toast.classList.remove('show'), 1800);
    }
  };

  /* ============================================================
     Game
     ============================================================ */

  class Game {
    constructor(canvas) {
      this.canvas = canvas;
      this.ctx = canvas.getContext('2d');
      this.W = 1;
      this.H = 1;
      this.dpr = 1;
      this.scale = 1;
      this.time = 0;
      this.bestScore = loadBest();
      this.sfx = new Sfx();
      this.touchMode = matchMedia('(pointer: coarse)').matches || 'ontouchstart' in window;
      this.demo = true;
      this.state = 'menu';
      this.terrain = new Terrain();
      this.bike = null;
      this.particles = [];
      this.floaters = [];
      this.streaks = [];
      this.clouds = [];
      this.cam = { x: 0, y: 0, shake: 0, shakeX: 0, shakeY: 0 };
      this.input = {
        pedal: false,
        brake: false,
        back: false,
        front: false,
        grab: false,
        boost: false,
        touchBack: false,
        touchFront: false,
        jumpBuffer: 0
      };
      this.distance = 0;
      this.trickPoints = 0;
      this.chain = 0;
      this.comboTimer = 0;
      this.boost = 0;
      this.boosting = false;
      this.bailsLeft = 3;
      this.bestTrick = null;
      this.crashTimer = 0;
      this.crashSpeed = 0;
      this.dustAcc = 0;
      this.audioTimer = 0;
      this.uiTimer = 0;
      this.paletteTimer = 0;
      this.palette = getPalette(0);
      this.zone = 0;
      this.newBest = false;
      this.coinsEarned = 0;
      this.streakAlpha = 0;
      this.cloudSprite = makeCloudSprite();
      this.online = false;
      this.remotes = new Map();
      this.playerName = 'RIDER';
      this.playerColor = '#ff8a2a';
      this.countdown = 0;
      this.goFlash = 0;
      this.terrainSeed = null;
      this.onTick = null;

      this.onTrick = null;
      this.onToast = null;
      this.onGameOver = null;
      this.onCrash = null;
      this.onBails = null;

      for (let i = 0; i < 5; i++) {
        this.clouds.push({
          x: rand(0, 1),
          y: rand(0.05, 0.3),
          s: rand(0.55, 1.25),
          d: rand(2, 7),
          a: rand(0.13, 0.26)
        });
      }
      for (let i = 0; i < 22; i++) {
        this.streaks.push({ x: rand(0, 1), y: rand(0, 1), len: rand(30, 110), v: rand(0.7, 1.5) });
      }

      this.resize();
      this.resetRide(220, 300);
      this.updateCamera(0, true);
    }

    get viewW() {
      return this.W / this.scale;
    }

    get viewH() {
      return this.H / this.scale;
    }

    get viewLeft() {
      return this.cam.x - this.viewW / 2;
    }

    get viewRight() {
      return this.cam.x + this.viewW / 2;
    }

    get totalScore() {
      return Math.round(this.trickPoints + this.distance * 6);
    }

    resize() {
      const dpr = Math.min(2, window.devicePixelRatio || 1);
      this.W = Math.max(1, window.innerWidth);
      this.H = Math.max(1, window.innerHeight);
      this.dpr = dpr;
      this.canvas.width = Math.round(this.W * dpr);
      this.canvas.height = Math.round(this.H * dpr);
      this.canvas.style.width = `${this.W}px`;
      this.canvas.style.height = `${this.H}px`;
      if (this.W < 820) this.scale = clamp(this.W / 760, 0.62, 0.98);
      else this.scale = clamp(this.H / 840, 0.78, 1.22);
      this.baseScale = this.scale;
      this.ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      this.ctx.imageSmoothingEnabled = true;
      if (this.bike) this.updateCamera(0, true);
    }

    resetRide(x, speed) {
      const gy = this.terrain.groundY(x);
      const slopeVal = this.terrain.slopeAt(x);
      const slope = Math.atan(slopeVal);
      this.bike = {
        x,
        y: gy,
        vx: speed,
        vy: slopeVal * speed,
        angle: slope,
        angVel: 0,
        grounded: true,
        wheelSpin: 0,
        airTime: 0,
        netRot: 0,
        grabTime: 0,
        grabbing: false,
        squash: 0,
        jumpCooldown: 0
      };
      this.dustAcc = 0;
      this.particles.length = 0;
      this.floaters.length = 0;
      this.cam.shake = 0;
      this.updateCamera(0, true);
    }

    startDemo() {
      this.demo = true;
      this.online = false;
      this.remotes.clear();
      this.state = 'menu';
      this.countdown = 0;
      this.goFlash = 0;
      this.terrain = new Terrain();
      this.distance = 0;
      this.trickPoints = 0;
      this.chain = 0;
      this.comboTimer = 0;
      this.boost = 0;
      this.boosting = false;
      this.bailsLeft = 3;
      this.bestTrick = null;
      this.zone = 0;
      this.palette = getPalette(0);
      this.resetRide(260, 380);
      this.sfx.stopWind();
    }

    startRun() {
      this.demo = false;
      this.online = false;
      this.remotes.clear();
      this.state = 'playing';
      this.countdown = 0;
      this.goFlash = 0;
      this.terrain = new Terrain();
      this.distance = 0;
      this.trickPoints = 0;
      this.chain = 0;
      this.comboTimer = 0;
      this.boost = 0.35;
      this.boosting = false;
      this.bailsLeft = 3;
      this.bestTrick = null;
      this.crashTimer = 0;
      this.newBest = false;
      this.zone = 0;
      this.palette = getPalette(0);
      this.clearInput();
      this.resetRide(110, 330);
      this.uiTimer = 0;
      this.audioTimer = 0;
      this.sfx.startWind();
      if (this.onBails) this.onBails(3);
      if (this.onToast) this.onToast('DROP IN');
    }

    startOnline(seed) {
      this.demo = false;
      this.online = true;
      this.state = 'countdown';
      this.countdown = 3.2;
      this.goFlash = 0;
      this.terrainSeed = seed;
      this.terrain = new Terrain(seed);
      this.distance = 0;
      this.trickPoints = 0;
      this.chain = 0;
      this.comboTimer = 0;
      this.boost = 0.35;
      this.boosting = false;
      this.bailsLeft = 3;
      this.bestTrick = null;
      this.crashTimer = 0;
      this.newBest = false;
      this.zone = 0;
      this.palette = getPalette(0);
      this.remotes.clear();
      this.clearInput();
      this.resetRide(110, 330);
      this.uiTimer = 0;
      this.audioTimer = 0;
      this.sfx.init();
      this.sfx.stopWind();
      if (this.onBails) this.onBails(3);
    }

    endOnline() {
      this.online = false;
      this.remotes.clear();
      this.onTick = null;
      this.startDemo();
    }

    clearInput() {
      const i = this.input;
      i.pedal = false;
      i.brake = false;
      i.back = false;
      i.front = false;
      i.grab = false;
      i.boost = false;
      i.touchBack = false;
      i.touchFront = false;
      i.jumpBuffer = 0;
    }

    queueJump() {
      if (this.state === 'playing') this.input.jumpBuffer = 0.15;
    }

    update(dt) {
      this.time += dt;
      this.input.jumpBuffer = Math.max(0, this.input.jumpBuffer - dt);
      this.paletteTimer -= dt;
      if (this.paletteTimer <= 0) {
        this.paletteTimer = 0.2;
        this.palette = getPalette(this.bike.x * METERS_PER_PX);
        this.checkZone();
      }

      this.updateStreaks(dt);

      if (this.state === 'menu') {
        this.updateBike(dt, true);
        this.updateCamera(dt);
        this.updateParticles(dt);
        this.updateFloaters(dt);
      } else if (this.state === 'countdown') {
        this.countdown -= dt;
        this.updateCamera(dt);
        this.updateParticles(dt);
        this.updateFloaters(dt);
        this.audioTimer -= dt;
        if (this.audioTimer <= 0) {
          this.audioTimer = 0.09;
          this.sfx.updateWind(0, true);
        }
        if (this.countdown <= 0) {
          this.state = 'playing';
          this.goFlash = 0.8;
          this.sfx.startWind();
        }
      } else if (this.state === 'playing') {
        this.goFlash = Math.max(0, this.goFlash - dt);
        this.updateBike(dt, false);
        this.updateCamera(dt);
        this.updateParticles(dt);
        this.updateFloaters(dt);
        this.distance = Math.max(0, this.bike.x * METERS_PER_PX);
        if (this.comboTimer > 0) {
          this.comboTimer -= dt;
          if (this.comboTimer <= 0) {
            this.comboTimer = 0;
            this.chain = 0;
          }
        }
        this.audioTimer -= dt;
        if (this.audioTimer <= 0) {
          this.audioTimer = 0.09;
          this.sfx.updateWind(this.bike.vx, !this.bike.grounded);
        }
      } else if (this.state === 'crashed') {
        this.updateCrash(dt);
        this.updateParticles(dt);
        this.updateFloaters(dt);
        this.updateShakeOnly(dt);
        this.audioTimer -= dt;
        if (this.audioTimer <= 0) {
          this.audioTimer = 0.12;
          this.sfx.updateWind(0, true);
        }
      } else if (this.state === 'over') {
        this.updateParticles(dt);
        this.updateFloaters(dt);
        this.updateShakeOnly(dt);
      }

      this.uiTimer -= dt;
      if (this.uiTimer <= 0 && this.state !== 'menu') {
        this.uiTimer = 0.07;
        ui.tick(this);
      }
      if (this.onTick) this.onTick(dt);
    }

    checkZone() {
      const m = this.bike.x * METERS_PER_PX;
      const base = Math.floor(Math.max(0, m) / ZONE_LENGTH);
      const zone = ((base % BIOMES.length) + BIOMES.length) % BIOMES.length;
      if (zone !== this.zone && this.state === 'playing') {
        this.zone = zone;
        if (this.onToast) this.onToast(`ENTERING ${BIOMES[zone].name}`);
      } else {
        this.zone = zone;
      }
    }

    updateShakeOnly(dt) {
      this.cam.shake = Math.max(0, this.cam.shake - dt * 26);
      this.cam.shakeX = (Math.random() * 2 - 1) * this.cam.shake;
      this.cam.shakeY = (Math.random() * 2 - 1) * this.cam.shake;
    }

    updateCamera(dt, snap = false) {
      const b = this.bike;
      if (!b) return;
      const anchor = this.demo ? 0.66 : 0.36;
      const look = this.demo ? 0 : clamp(b.vx, 0, 1100) * 0.045;
      const groundBelow = this.terrain.groundY(b.x);
      const airHeight = b.grounded ? 0 : Math.max(0, groundBelow - b.y);
      const airBias = b.grounded ? 0 : clamp(airHeight / 650, 0, 1.15);
      const airLook = b.grounded ? 0 : 22;
      const zoomTarget = this.demo || b.grounded
        ? this.baseScale || this.scale
        : (this.baseScale || this.scale) * clamp(1 - airHeight / 1800, 0.8, 1);
      if (snap) this.scale = zoomTarget;
      else this.scale = lerp(this.scale, zoomTarget, ease(2.2, dt));

      const tx = b.x + (0.5 - anchor) * this.viewW + look + airLook;
      const ty = b.y + (0.055 + airBias * 0.32) * this.viewH;
      if (snap) {
        this.cam.x = tx;
        this.cam.y = ty;
      } else {
        this.cam.x = lerp(this.cam.x, tx, ease(5.2, dt));
        this.cam.y = lerp(this.cam.y, ty, ease(4.2, dt));
      }
      this.cam.shake = Math.max(0, this.cam.shake - dt * 34);
      this.cam.shakeX = (Math.random() * 2 - 1) * this.cam.shake;
      this.cam.shakeY = (Math.random() * 2 - 1) * this.cam.shake;
    }

    updateBike(dt, demo) {
      const b = this.bike;
      if (!b) return;
      const t = this.terrain;
      const i = this.input;
      b.jumpCooldown = Math.max(0, b.jumpCooldown - dt);
      b.squash = Math.max(0, b.squash - dt * 4.5);

      if (b.grounded) {
        const slope = t.slopeAt(b.x);
        const slopeAng = Math.atan(slope);
        b.angle += wrapAngle(slopeAng - b.angle) * Math.min(1, dt * 15);
        b.angVel = 0;

        // ollie / pump
        if (!demo && i.jumpBuffer > 0) {
          i.jumpBuffer = 0;
          b.grounded = false;
          b.vy = slope * b.vx - 590;
          b.angle = slopeAng;
          b.airTime = 0;
          b.netRot = 0;
          b.grabTime = 0;
          b.grabbing = false;
          this.sfx.jump();
          this.spawnDust(5, 1.4);
          b.x += b.vx * dt;
          b.y += b.vy * dt;
          b.wheelSpin += b.vx * dt / 12;
          return;
        }

        const speed = b.vx;
        const norm = Math.sqrt(1 + slope * slope);
        let accel = GRAVITY * (slope / norm) * 1.04;
        let boosting = false;

        if (demo) {
          accel += 250 * (1 - clamp(speed / 850, 0, 1));
          accel -= 0.00034 * speed * speed;
        } else {
          const throttle = 1 - clamp(speed / 1180, 0, 1);
          if (!i.brake) {
            accel += 330 * throttle; // auto-pedal
            if (i.pedal) accel += 300 * throttle; // sprint
          }
          if (i.brake) accel -= 1320;
          if (i.front) accel += 45; // tuck
          if (i.boost && this.boost > 0.012) {
            accel += 720;
            this.boost = Math.max(0, this.boost - dt * 0.4);
            boosting = true;
            if (!this.boosting) this.sfx.boost();
          }
          if (!boosting) accel -= 0.00026 * speed * Math.abs(speed);
        }

        const maxSpeed = boosting ? 1520 : 1160;
        b.vx = clamp(b.vx + accel * dt, 0, maxSpeed);
        if (boosting && b.vx < 330) b.vx = 330;
        this.boosting = boosting;

        const nx = b.x + b.vx * dt;
        const gy = t.groundY(nx);
        const reqVy = (gy - b.y) / Math.max(dt, 0.0001);
        const prevVy = b.vy;

        if (reqVy > prevVy + GRAVITY * dt * 1.55 && b.vx > 30) {
          // ground falls away faster than gravity — takeoff
          b.x = nx;
          b.grounded = false;
          b.vy = prevVy - 55;
          b.airTime = 0;
          b.netRot = 0;
          b.grabTime = 0;
          b.grabbing = false;
          if (b.vy < -90) this.sfx.whoosh();
        } else {
          b.x = nx;
          b.y = gy;
          b.vy = t.slopeAt(nx) * b.vx;
          b.wheelSpin += (b.vx * dt) / 12;
          this.maybeDust(dt);
        }
      } else {
        b.vy += GRAVITY * dt;
        b.x += b.vx * dt;
        b.y += b.vy * dt;
        b.airTime += dt;

        if (demo) {
          const target = Math.atan(t.slopeAt(b.x + b.vx * 0.22));
          b.angle += wrapAngle(target - b.angle) * Math.min(1, dt * 6);
          b.angVel = 0;
          b.netRot = 0;
          b.grabTime = 0;
          b.grabbing = false;
        } else {
          const back = i.back || i.touchBack;
          const front = i.front || i.touchFront;
          let target = 0;
          if (back && !front) target = -ROT_SPEED;
          else if (front && !back) target = ROT_SPEED;
          if (target !== 0) b.angVel += (target - b.angVel) * Math.min(1, dt * 9.5);
          else b.angVel *= Math.exp(-4.8 * dt);
          b.angle += b.angVel * dt;
          b.netRot += b.angVel * dt;
          b.grabbing = i.grab && b.airTime > 0.12;
          if (i.grab && b.airTime > 0.12) b.grabTime += dt;
          b.wheelSpin += dt * 4;
        }

        const gy = t.groundY(b.x);
        if (b.y >= gy && b.vy >= 0) {
          this.land(gy);
        }
      }
    }

    land(gy) {
      const b = this.bike;
      const t = this.terrain;
      const slope = t.slopeAt(b.x);
      const slopeAng = Math.atan(slope);
      const diff = wrapAngle(b.angle - slopeAng);
      const absDiff = Math.abs(diff);
      const air = b.airTime;
      const impact = Math.max(0, b.vy);

      if (this.demo) {
        b.y = gy;
        b.vy = slope * b.vx;
        b.grounded = true;
        b.angle = slopeAng;
        b.angVel = 0;
        b.airTime = 0;
        b.netRot = 0;
        b.grabTime = 0;
        b.grabbing = false;
        b.squash = Math.min(1, impact / 1500);
        this.spawnDust(6, 0.9);
        return;
      }

      if (absDiff > 1.02) {
        this.crash();
        return;
      }

      b.y = gy;
      b.grounded = true;
      b.angle = slopeAng;
      b.angVel = 0;
      b.squash = 1;
      b.vx *= 1 - clamp(absDiff / 4.5 + impact / 9000, 0, 0.24);
      b.vy = slope * b.vx;
      this.cam.shake = Math.min(18, impact / 130 + (air > 0.45 ? 3 : 0));
      this.spawnDust(10 + Math.min(22, Math.floor(impact / 70)), 1.2);
      this.sfx.land(impact);

      if (this.touchMode) {
        this.input.touchBack = false;
        this.input.touchFront = false;
      }

      if (air > 0.26) this.scoreTrick(air, absDiff);
      b.airTime = 0;
      b.netRot = 0;
      b.grabTime = 0;
      b.grabbing = false;
    }

    scoreTrick(air, absDiff) {
      const b = this.bike;
      const flips = Math.floor(Math.abs(b.netRot) / TAU + 0.18);
      const grabbed = b.grabTime > 0.22;
      const dir = b.netRot < 0 ? -1 : 1;
      let grade = 'SKETCHY';
      let gradeMult = 0.78;
      if (absDiff < 0.16) {
        grade = 'PERFECT';
        gradeMult = 1.35;
      } else if (absDiff < 0.46) {
        grade = 'CLEAN';
        gradeMult = 1;
      }

      let name = '';
      let base = 0;
      if (flips > 0) {
        const grabName = flips >= 2 ? 'SUPERMAN' : 'NO-HANDER';
        const pre = flips >= 4 ? 'QUAD ' : flips === 3 ? 'TRIPLE ' : flips === 2 ? 'DOUBLE ' : '';
        name = `${grabbed ? grabName + ' ' : ''}${pre}${dir < 0 ? 'BACKFLIP' : 'FRONTFLIP'}`;
        base = 120 + flips * 340 + (grabbed ? 280 : 0) + Math.min(air, 2.4) * 160;
      } else if (grabbed) {
        name = 'TABLETOP';
        base = 200 + Math.min(air, 2.4) * 160;
      } else if (air > 0.46) {
        name = 'BIG AIR';
        base = 60 + Math.min(air, 2.4) * 120;
      }

      if (!name) return;

      if (this.comboTimer > 0) this.chain += 1;
      else this.chain = 1;
      this.comboTimer = COMBO_WINDOW;
      const comboMult = Math.min(8, 1 + (this.chain - 1) * 0.35);
      const points = Math.round(base * gradeMult * comboMult);
      this.trickPoints += points;
      this.boost = clamp(this.boost + 0.11 + flips * 0.09 + (grabbed ? 0.04 : 0), 0, 1);
      this.bestTrick =
        !this.bestTrick || points > this.bestTrick.points ? { name, points } : this.bestTrick;

      this.sfx.trick(flips);
      if (this.onTrick) this.onTrick(name, points, grade);
      const color = grade === 'PERFECT' ? '#d9ff83' : grade === 'SKETCHY' ? '#ffb29b' : '#ffcf6b';
      this.floaters.push({
        x: b.x,
        y: b.y - 96,
        text: `+${fmt(points)}`,
        sub: `${grade} · ×${comboMult.toFixed(comboMult % 1 === 0 ? 0 : 1)}`,
        color,
        life: 1.5,
        maxLife: 1.5,
        size: 34,
        vy: -42
      });
    }

    crash() {
      if (this.state !== 'playing') return;
      const b = this.bike;
      this.state = 'crashed';
      this.crashTimer = 1.55;
      this.crashSpeed = b.vx;
      b.angVel = rand(-11, 11);
      b.vy = Math.min(b.vy, -220);
      b.grabTime = 0;
      b.grabbing = false;
      this.cam.shake = 24;
      this.chain = 0;
      this.comboTimer = 0;
      this.boost = Math.max(0, this.boost - 0.2);
      if (!this.online) {
        this.bailsLeft = Math.max(0, this.bailsLeft - 1);
        if (this.onBails) this.onBails(this.bailsLeft);
      }
      if (this.onCrash) this.onCrash();
      this.spawnDust(42, 2.4);
      this.spawnSparks(10);
      this.sfx.crash();
      this.sfx.stopWind();
    }

    updateCrash(dt) {
      const b = this.bike;
      const t = this.terrain;
      b.vy += GRAVITY * 0.75 * dt;
      b.x += b.vx * dt;
      b.y += b.vy * dt;
      b.vx *= 0.986;
      b.angVel *= 0.996;
      b.angle += b.angVel * dt;
      b.wheelSpin += dt * 6;

      const gy = t.groundY(b.x) + 4;
      if (b.y > gy) {
        b.y = gy;
        if (b.vy > 140) {
          b.vy *= -0.28;
          b.vx *= 0.8;
          b.angVel *= 0.75;
          this.spawnDust(6, 0.8);
        } else {
          b.vy = 0;
          b.vx *= 0.94;
        }
      }

      this.crashTimer -= dt;
      if (this.crashTimer <= 0) {
        if (this.online || this.bailsLeft > 0) this.respawn();
        else this.finishRun();
      }
    }

    findSafeRespawn(fromX) {
      const t = this.terrain;
      const isSafe = (x) => {
        const s = t.segAt(x);
        if (s.type !== 'flow') return false;
        if (x < s.x0 + 90 || x > s.x1 - 120) return false;
        return Math.abs(t.slopeAt(x)) < 0.5;
      };
      for (let d = 80; d <= 1800; d += 30) {
        if (isSafe(fromX + d)) return fromX + d;
      }
      for (let d = 60; d <= 1200; d += 30) {
        const x = fromX - d;
        if (x > 120 && isSafe(x)) return x;
      }
      // last resort: nearest flow segment midpoint
      let best = null;
      let bestDist = Infinity;
      for (const s of this.terrain.segments) {
        if (s.type !== 'flow' || s.x1 - s.x0 < 200) continue;
        const x = s.x0 + (s.x1 - s.x0) * 0.5;
        if (Math.abs(t.slopeAt(x)) > 0.6) continue;
        const dist = Math.abs(x - fromX);
        if (dist < bestDist) {
          best = x;
          bestDist = dist;
        }
      }
      if (best !== null) return best;
      return Math.max(120, fromX);
    }

    respawn() {
      const b = this.bike;
      const t = this.terrain;
      b.x = this.findSafeRespawn(b.x);
      const slopeVal = t.slopeAt(b.x);
      b.y = t.groundY(b.x);
      b.vx = clamp(this.crashSpeed * 0.45, 360, 540);
      b.angle = Math.atan(slopeVal);
      b.vy = slopeVal * b.vx;
      b.angVel = 0;
      b.grounded = true;
      b.airTime = 0;
      b.netRot = 0;
      b.grabTime = 0;
      b.grabbing = false;
      b.squash = 0;
      this.state = 'playing';
      this.cam.shake = 0;
      this.sfx.startWind();
      this.updateCamera(0, true);
      if (this.onToast) this.onToast('SHAKE IT OFF');
    }

    finishRun() {
      if (this.state === 'over') return;
      this.state = 'over';
      this.sfx.stopWind();
      this.distance = Math.max(0, this.bike.x * METERS_PER_PX);
      if (this.totalScore > this.bestScore) {
        this.bestScore = this.totalScore;
        this.newBest = true;
        saveBest(this.bestScore);
      }
      this.coinsEarned = 0;
      if (window.SENDIT_GARAGE) {
        this.coinsEarned = window.SENDIT_GARAGE.awardRun(this.totalScore, this.distance, '2D');
      }
      if (this.onGameOver) this.onGameOver(this, this.newBest);
    }

    maybeDust(dt) {
      const b = this.bike;
      if (b.vx < 300) return;
      this.dustAcc += dt;
      const interval = b.vx > 760 ? 0.022 : b.vx > 500 ? 0.034 : 0.05;
      let budget = 2;
      while (this.dustAcc > interval && budget-- > 0) {
        this.dustAcc -= interval;
        this.spawnDust(1, 0.85);
      }
    }

    spawnDust(n, power = 1) {
      const b = this.bike;
      const pal = this.palette;
      const colors = [pal.dirt, pal.dirt, pal.dirtDeep, '#cbb48e', '#b79b72'];
      for (let k = 0; k < n; k++) {
        if (this.particles.length > 260) this.particles.shift();
        const life = rand(0.3, 0.7) * power;
        this.particles.push({
          x: b.x - 18 + rand(-9, 9),
          y: b.y - 2 + rand(-3, 4),
          vx: -b.vx * rand(0.1, 0.24) + rand(-45, 35),
          vy: rand(-95, -12) * power,
          grav: rand(120, 220),
          drag: 0.975,
          size: rand(1.6, 4.4) * power,
          grow: rand(4, 11),
          life,
          maxLife: life,
          color: colors[(Math.random() * colors.length) | 0],
          type: 'dust',
          a: rand(0.16, 0.36)
        });
      }
    }

    spawnSparks(n) {
      const b = this.bike;
      for (let k = 0; k < n; k++) {
        if (this.particles.length > 300) this.particles.shift();
        const life = rand(0.3, 0.7);
        this.particles.push({
          x: b.x + rand(-12, 12),
          y: b.y - 40 + rand(-20, 20),
          vx: rand(-180, 180),
          vy: rand(-260, 60),
          grav: 500,
          drag: 0.99,
          size: rand(1.4, 3),
          grow: 0,
          life,
          maxLife: life,
          color: Math.random() < 0.5 ? '#ffd166' : '#ff9a4d',
          type: 'spark',
          a: 0.95
        });
      }
    }

    updateParticles(dt) {
      const arr = this.particles;
      const cullX = this.cam.x - this.viewW * 0.75;
      for (let k = arr.length - 1; k >= 0; k--) {
        const p = arr[k];
        p.life -= dt;
        if (p.life <= 0 || p.x < cullX) {
          arr.splice(k, 1);
          continue;
        }
        p.x += p.vx * dt;
        p.y += p.vy * dt;
        p.vy += p.grav * dt;
        p.vx *= p.drag;
        p.vy *= p.drag;
        p.size += p.grow * dt;
      }
    }

    updateFloaters(dt) {
      for (let k = this.floaters.length - 1; k >= 0; k--) {
        const f = this.floaters[k];
        f.life -= dt;
        f.y += f.vy * dt;
        f.vy *= 0.985;
        if (f.life <= 0) this.floaters.splice(k, 1);
      }
    }

    updateStreaks(dt) {
      const speed = this.state === 'menu' ? 0 : this.bike ? this.bike.vx : 0;
      const target = clamp((speed - 680) / 520, 0, 1) * 0.24 + (this.boosting ? 0.2 : 0);
      this.streakAlpha = lerp(this.streakAlpha, target, ease(4, dt));
      if (this.streakAlpha < 0.01) return;
      for (const s of this.streaks) {
        s.x -= ((480 + speed * 0.9) * s.v * dt) / this.W;
        if (s.x < -0.2) {
          s.x = 1.2;
          s.y = rand(0.08, 0.94);
          s.len = rand(30, 120);
        }
      }
    }

    render() {
      const ctx = this.ctx;
      const W = this.W;
      const H = this.H;
      if (!W || !H) return;
      ctx.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);
      ctx.clearRect(0, 0, W, H);

      const pal = this.palette;
      this.drawSky(ctx, W, H, pal);
      this.drawMountains(ctx, W, H, pal);
      this.drawCloudLayer(ctx, W, H, pal);

      ctx.save();
      ctx.translate(W / 2 + this.cam.shakeX, H / 2 + this.cam.shakeY);
      ctx.scale(this.scale, this.scale);
      ctx.translate(-this.cam.x, -this.cam.y);

      this.drawNearForest(ctx, pal);
      this.drawGround(ctx, pal);
      this.drawTrailDetails(ctx, pal);
      this.drawParticles(ctx, false);
      this.drawRemoteRiders(ctx, pal);
      this.drawBike(ctx, pal);
      this.drawParticles(ctx, true);
      this.drawFloaters(ctx);

      ctx.restore();

      this.drawSpeedLines(ctx, W, H);
      this.drawCountdown(ctx, W, H);
    }

    drawRemoteRiders(ctx, pal) {
      if (!this.remotes || this.remotes.size === 0) return;
      const list = [...this.remotes.values()].filter((r) => r && r.render);
      list.sort((a, b) => a.render.x - b.render.x);
      for (const r of list) {
        if (Math.abs(r.render.x - this.bike.x) > this.viewW * 0.85) continue;
        this.drawBike(ctx, pal, r.render, { local: false, frameColor: r.color, name: r.name });
      }
    }

    drawCountdown(ctx, W, H) {
      const counting = this.state === 'countdown';
      const go = this.goFlash > 0;
      if (!counting && !go) return;
      if (counting) {
        ctx.fillStyle = 'rgba(5,10,7,0.16)';
        ctx.fillRect(0, 0, W, H);
      }
      const label = counting ? String(Math.max(1, Math.ceil(this.countdown))) : 'GO!';
      const size = Math.min(190, W * 0.21);
      ctx.save();
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.font = `800 ${size}px "Avenir Next Condensed", "Arial Narrow", Impact, sans-serif`;
      ctx.lineWidth = Math.max(6, size * 0.055);
      ctx.strokeStyle = 'rgba(8,14,10,0.5)';
      ctx.fillStyle = counting ? '#f7f1e1' : '#d9ff83';
      if (go) ctx.globalAlpha = clamp(this.goFlash / 0.8, 0, 1);
      ctx.strokeText(label, W / 2, H * 0.44);
      ctx.fillText(label, W / 2, H * 0.44);
      if (counting) {
        ctx.font = '800 12px "Avenir Next Condensed", "Arial Narrow", sans-serif';
        ctx.fillStyle = '#ffcf6b';
        ctx.fillText('RIDE TOGETHER', W / 2, H * 0.44 - size * 0.62);
        ctx.fillStyle = 'rgba(247,241,225,0.65)';
        ctx.font = '700 10px "Avenir Next Condensed", "Arial Narrow", sans-serif';
        ctx.fillText('GET READY', W / 2, H * 0.44 + size * 0.58);
      }
      ctx.restore();
    }

    drawSky(ctx, W, H, pal) {
      const sky = ctx.createLinearGradient(0, 0, 0, H);
      sky.addColorStop(0, pal.skyTop);
      sky.addColorStop(1, pal.skyBottom);
      ctx.fillStyle = sky;
      ctx.fillRect(0, 0, W, H);

      const sx = W * 0.73;
      const sy = H * 0.19;
      const glow = ctx.createRadialGradient(sx, sy, 4, sx, sy, H * 0.46);
      glow.addColorStop(0, 'rgba(255,244,205,0.72)');
      glow.addColorStop(0.35, 'rgba(255,240,190,0.2)');
      glow.addColorStop(1, 'rgba(255,240,190,0)');
      ctx.fillStyle = glow;
      ctx.fillRect(0, 0, W, H);

      ctx.beginPath();
      ctx.arc(sx, sy, Math.min(52, H * 0.062), 0, TAU);
      ctx.fillStyle = pal.sun;
      ctx.fill();

      const haze = ctx.createLinearGradient(0, H * 0.42, 0, H * 0.78);
      haze.addColorStop(0, alpha(pal.haze, 0));
      haze.addColorStop(1, alpha(pal.haze, 0.4));
      ctx.fillStyle = haze;
      ctx.fillRect(0, H * 0.42, W, H * 0.4);
    }

    ridgeY(x, camX, freq, seed, base, amp) {
      const wx = (x + camX) * freq;
      const n =
        Math.sin(wx + seed) * 0.5 +
        Math.sin(wx * 2.17 + seed * 1.9) * 0.3 +
        Math.sin(wx * 4.9 + seed * 0.7) * 0.2;
      return base - amp * (0.34 + 0.66 * (0.5 + 0.5 * n));
    }

    drawMountains(ctx, W, H, pal) {
      const s = this.scale;
      const layers = [
        { p: 0.07, freq: 0.0019, seed: 1.3, base: H * 0.63, amp: H * 0.3, color: pal.far },
        { p: 0.16, freq: 0.0031, seed: 4.6, base: H * 0.72, amp: H * 0.22, color: pal.far2 },
        { p: 0.28, freq: 0.0052, seed: 7.8, base: H * 0.8, amp: H * 0.14, color: pal.mid }
      ];
      for (const L of layers) {
        const camX = this.cam.x * s * L.p;
        ctx.beginPath();
        ctx.moveTo(-20, H + 20);
        for (let x = -20; x <= W + 20; x += 16) {
          ctx.lineTo(x, this.ridgeY(x, camX, L.freq, L.seed, L.base, L.amp));
        }
        ctx.lineTo(W + 20, H + 20);
        ctx.closePath();
        ctx.fillStyle = L.color;
        ctx.fill();

        if (L === layers[1]) {
          const camX2 = this.cam.x * s * L.p;
          ctx.beginPath();
          for (let x = -10; x <= W + 10; x += 15) {
            const h = hash1(Math.floor((x + camX2) / 15));
            if (h < 0.52) continue;
            const y = this.ridgeY(x, camX2, L.freq, L.seed, L.base, L.amp) + 2;
            const th = 5 + h * 9;
            ctx.moveTo(x, y);
            ctx.lineTo(x - 3.2, y + th);
            ctx.lineTo(x + 3.2, y + th);
            ctx.closePath();
          }
          ctx.fillStyle = alpha(pal.mid2, 0.85);
          ctx.fill();
        }
      }
    }

    drawCloudLayer(ctx, W, H, pal) {
      ctx.save();
      for (const c of this.clouds) {
        const span = W + 520;
        let x = c.x * W + this.time * c.d - this.cam.x * this.scale * 0.012;
        x = ((x % span) + span) % span - 260;
        const y = c.y * H;
        const sc = c.s;
        ctx.globalAlpha = c.a * 1.35;
        ctx.drawImage(this.cloudSprite, x - 190 * sc, y - 62 * sc, 380 * sc, 145 * sc);
      }
      ctx.restore();
      ctx.globalAlpha = 1;
    }

    drawNearForest(ctx, pal) {
      const t = this.terrain;
      const left = this.viewLeft - 130;
      const right = this.viewRight + 130;
      const step = 98;
      const start = Math.floor(left / step) * step;
      for (let x = start; x < right; x += step) {
        const h = hash1(x * 0.0173 + 4.1);
        if (h < 0.4) continue;
        const px = x + h * 78;
        const sl = t.slopeAt(px);
        if (Math.abs(sl) > 0.56) continue;
        const gy = t.groundY(px) + 10;
        const size = 54 + hash1(x * 0.031 + 9.2) * 72;
        drawPine(ctx, px, gy, size, pal.tree, pal.tree2);
      }
    }

    drawGround(ctx, pal) {
      const t = this.terrain;
      const left = this.viewLeft - 80;
      const right = this.viewRight + 80;
      const bottom = this.cam.y + this.viewH * 0.5 + 500;
      const step = 7;

      const top = new Path2D();
      top.moveTo(left, t.groundY(left));
      for (let x = left + step; x <= right; x += step) top.lineTo(x, t.groundY(x));
      top.lineTo(right, t.groundY(right));

      const fill = new Path2D();
      fill.moveTo(left, bottom);
      fill.lineTo(left, t.groundY(left));
      fill.addPath(top);
      fill.lineTo(right, bottom);
      fill.closePath();

      const grad = ctx.createLinearGradient(0, this.cam.y - this.viewH * 0.2, 0, this.cam.y + this.viewH * 0.65);
      grad.addColorStop(0, pal.dirt);
      grad.addColorStop(0.28, pal.dirt);
      grad.addColorStop(1, pal.dirtDeep);
      ctx.fillStyle = grad;
      ctx.fill(fill);

      // exposed rock dashes on steep faces
      ctx.fillStyle = alpha(pal.rock, 0.32);
      for (let x = left; x < right; x += 30) {
        const sl = t.slopeAt(x);
        if (sl < 0.8) continue;
        const h = hash1(x * 0.041);
        if (h < 0.45) continue;
        const gy = t.groundY(x);
        ctx.save();
        ctx.translate(x, gy);
        ctx.rotate(Math.atan(sl));
        ctx.fillRect(-5, 10, 16 + h * 16, 4.5);
        ctx.restore();
      }

      // soil speckles
      for (let x = Math.floor(left / 30) * 30; x < right; x += 30) {
        const h = hash1(x * 0.033 + 12.7);
        if (h < 0.3) continue;
        const gy = t.groundY(x);
        const py = gy + 20 + h * 250;
        ctx.beginPath();
        ctx.arc(x + h * 20, py, 0.9 + h * 1.6, 0, TAU);
        ctx.fillStyle = alpha(pal.dirtDeep, 0.12);
        ctx.fill();
      }

      // buried pebbles
      for (let x = Math.floor(left / 90) * 90; x < right; x += 90) {
        const h = hash1(x * 0.027 + 8.3);
        if (h < 0.5) continue;
        const gy = t.groundY(x);
        const px = x + h * 32;
        const py = gy + 24 + h * 140;
        ctx.beginPath();
        ctx.ellipse(px, py, 1.4 + h * 2.6, 0.9 + h * 1.6, 0.3, 0, TAU);
        ctx.fillStyle = alpha(pal.rock, 0.16 + h * 0.1);
        ctx.fill();
      }

      ctx.strokeStyle = pal.grass;
      ctx.lineWidth = 9;
      ctx.lineJoin = 'round';
      ctx.lineCap = 'round';
      ctx.stroke(top);

      ctx.save();
      ctx.translate(0, -1.4);
      ctx.strokeStyle = pal.grass2;
      ctx.lineWidth = 2.8;
      ctx.stroke(top);
      ctx.restore();
    }

    drawTrailDetails(ctx, pal) {
      const t = this.terrain;
      const left = this.viewLeft - 40;
      const right = this.viewRight + 40;

      // faint packed trail line
      ctx.save();
      ctx.beginPath();
      for (let x = left; x <= right; x += 12) {
        const y = t.groundY(x) + 12;
        if (x === left) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      }
      ctx.strokeStyle = 'rgba(20,12,6,0.1)';
      ctx.lineWidth = 5;
      ctx.stroke();
      ctx.restore();

      // pebbles and scuffs
      for (let x = Math.floor(left / 90) * 90; x < right; x += 90) {
        const h = hash1(x * 0.021 + 3.7);
        if (h > 0.58) continue;
        const gy = t.groundY(x);
        const off = 8 + h * 18;
        ctx.beginPath();
        ctx.ellipse(x, gy + off, 1.4 + h * 2.6, 1 + h * 1.5, 0.25, 0, TAU);
        ctx.fillStyle = alpha(pal.rock, 0.18);
        ctx.fill();
      }

      // grass tufts poking out of the trail edge
      ctx.lineCap = 'round';
      for (let x = Math.floor(left / 46) * 46; x < right; x += 46) {
        const h = hash1(x * 0.013);
        if (h < 0.46) continue;
        const gy = t.groundY(x);
        ctx.strokeStyle = pal.grass2;
        ctx.lineWidth = 1.4;
        for (let k = 0; k < 4; k++) {
          const bx = x + (k - 1.5) * 3.4;
          ctx.beginPath();
          ctx.moveTo(bx, gy - 2);
          ctx.lineTo(bx + (k - 1.5) * 2.8, gy - 5 - h * 9 - k * 1.8);
          ctx.stroke();
        }
      }

      // distance pennants every 250 m
      const every = 250 / METERS_PER_PX;
      const first = Math.ceil(left / every) * every;
      for (let x = first; x < right; x += every) {
        if (x < 900) continue;
        const gy = t.groundY(x);
        const m = Math.round((x * METERS_PER_PX) / 50) * 50;
        ctx.strokeStyle = alpha(pal.dirtDeep, 0.9);
        ctx.lineWidth = 2.5;
        ctx.beginPath();
        ctx.moveTo(x, gy - 2);
        ctx.lineTo(x, gy - 54);
        ctx.stroke();
        ctx.beginPath();
        ctx.moveTo(x + 1, gy - 54);
        ctx.lineTo(x + 28, gy - 46);
        ctx.lineTo(x + 1, gy - 35);
        ctx.closePath();
        ctx.fillStyle = pal.accent;
        ctx.fill();
        ctx.fillStyle = 'rgba(20,16,9,0.75)';
        ctx.font = '800 12px "Avenir Next Condensed", "Arial Narrow", sans-serif';
        ctx.textAlign = 'left';
        ctx.textBaseline = 'middle';
        ctx.fillText(`${m}`, x + 6, gy - 46);
        ctx.textBaseline = 'alphabetic';
      }
    }

    drawParticles(ctx, front) {
      ctx.save();
      for (const p of this.particles) {
        if ((p.type === 'spark') !== front) continue;
        const a = clamp(p.life / p.maxLife, 0, 1) * p.a;
        ctx.globalAlpha = a;
        if (p.type === 'spark') {
          ctx.strokeStyle = p.color;
          ctx.lineWidth = p.size;
          ctx.beginPath();
          ctx.moveTo(p.x, p.y);
          ctx.lineTo(p.x - p.vx * 0.03, p.y - p.vy * 0.03);
          ctx.stroke();
        } else {
          ctx.fillStyle = p.color;
          ctx.beginPath();
          ctx.arc(p.x, p.y, Math.max(0.4, p.size), 0, TAU);
          ctx.fill();
        }
      }
      ctx.restore();
      ctx.globalAlpha = 1;
    }

    drawBike(ctx, pal, b = this.bike, opts = {}) {
      if (!b) return;
      const isLocal = opts.local !== false;
      const t = this.terrain;
      const gy = t.groundY(b.x);
      const slopeAng = Math.atan(t.slopeAt(b.x));
      const airH = Math.max(0, b.y - gy);

      // shadow
      ctx.save();
      ctx.translate(b.x, gy + 3);
      ctx.rotate(slopeAng);
      ctx.scale(1, 0.26);
      const sh = clamp(1 - airH / 750, 0.32, 1);
      ctx.beginPath();
      ctx.arc(0, 0, 32 * sh, 0, TAU);
      ctx.fillStyle = `rgba(12,15,9,${0.2 * sh})`;
      ctx.fill();
      ctx.restore();

      ctx.save();
      ctx.translate(b.x, b.y);
      ctx.rotate(b.angle);

      const garage = isLocal && window.SENDIT_GARAGE ? window.SENDIT_GARAGE : null;
      const rig = garage ? garage.bike() : null;
      const fit = garage ? garage.kit() : null;
      const frame = opts.frameColor || (isLocal ? (rig ? rig.color : this.playerColor) : null) || pal.accent;
      const dark = '#17130e';
      const rim = rig ? rig.rim : '#d6ceb9';
      const jersey = fit ? fit.jersey : '#216d72';
      const jerseyHi = mixHex(jersey, '#ffffff', 0.18);
      const helmet = fit ? fit.helmet : '#f2e7cd';
      const skin = '#c98e66';
      const pants = fit ? fit.pants : '#151b17';
      const shoe = fit ? fit.shoe : '#0d0b09';
      const spin = b.wheelSpin;

      const wheel = (cx, cy) => {
        ctx.save();
        ctx.translate(cx, cy);
        ctx.rotate(spin);
        ctx.beginPath();
        ctx.arc(0, 0, 12.2, 0, TAU);
        ctx.lineWidth = 4.6;
        ctx.strokeStyle = dark;
        ctx.stroke();
        ctx.beginPath();
        ctx.arc(0, 0, 8.6, 0, TAU);
        ctx.lineWidth = 1.5;
        ctx.strokeStyle = rim;
        ctx.stroke();
        ctx.strokeStyle = 'rgba(214,206,185,0.9)';
        ctx.lineWidth = 1;
        for (let k = 0; k < 4; k++) {
          const a = (k / 4) * TAU;
          ctx.beginPath();
          ctx.moveTo(Math.cos(a) * 2, Math.sin(a) * 2);
          ctx.lineTo(Math.cos(a) * 8.3, Math.sin(a) * 8.3);
          ctx.stroke();
        }
        ctx.beginPath();
        ctx.arc(0, 0, 1.9, 0, TAU);
        ctx.fillStyle = frame;
        ctx.fill();
        ctx.restore();
      };

      wheel(-25, -12.5);
      wheel(25, -12.5);

      const stroke = (pts, w, color) => {
        ctx.beginPath();
        ctx.moveTo(pts[0][0], pts[0][1]);
        for (let k = 1; k < pts.length; k++) ctx.lineTo(pts[k][0], pts[k][1]);
        ctx.lineWidth = w;
        ctx.strokeStyle = color;
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';
        ctx.stroke();
      };

      const rear = [-25, -12.5];
      const bb = [0, -15];
      const seat = [-7.5, -32];
      const head = [18.5, -34];
      const headLow = [16, -23.5];
      const front = [25, -12.5];

      const frameLines = [
        [rear, bb],
        [rear, seat],
        [bb, seat],
        [bb, headLow],
        [seat, head],
        [headLow, head],
        [headLow, front]
      ];
      for (const line of frameLines) stroke(line, 5.2, dark);
      for (const line of frameLines) stroke(line, 2.7, frame);

      // seat + bars
      stroke([[-8.5, -32], [-8.5, -36.5]], 4, dark);
      stroke([[-13, -37], [-4, -37.5]], 3, '#211a13');
      stroke([[17, -35], [24.5, -38.5]], 2.4, dark);
      stroke([[21.5, -38.8], [27, -38.2]], 2.8, '#211a13');

      // crank + pedal
      ctx.save();
      ctx.translate(0, -15);
      ctx.rotate(spin * 0.35);
      stroke([[0, 0], [6, 5]], 2.2, dark);
      ctx.beginPath();
      ctx.arc(6, 5, 2.2, 0, TAU);
      ctx.fillStyle = frame;
      ctx.fill();
      ctx.restore();

      // rider
      const tuck = isLocal && b.grounded && this.input.front ? 1 : 0;
      const crouch = b.grounded ? 1 : 0.72;
      const hip = [-3.5, -35.5 + tuck * 3];
      const shoulder = [5.5 - tuck * 2.6, -50 + tuck * 5.5 + (1 - crouch) * 3];
      const headC = [shoulder[0] + 5.2, shoulder[1] - 7.6];
      const knee = [3.5, -25 + tuck * 2];
      const foot = [5.5, -14 + tuck * 2];

      // back arm
      if (b.grabbing) {
        stroke([shoulder, [shoulder[0] - 9, shoulder[1] + 4], [shoulder[0] - 17, shoulder[1] + 1]], 3.6, jersey);
      } else {
        stroke([shoulder, [15, -43], [23, -37]], 3.6, jersey);
      }

      // legs
      stroke([hip, knee, foot], 5.2, pants);
      stroke([foot, [foot[0] + 4, foot[1] + 1.5]], 3.6, shoe);

      // torso
      stroke([hip, shoulder], 10.5, jersey);
      stroke([hip, shoulder], 3, jerseyHi);

      // head + helmet
      ctx.beginPath();
      ctx.arc(headC[0], headC[1], 6.6, 0, TAU);
      ctx.fillStyle = skin;
      ctx.fill();
      ctx.beginPath();
      ctx.arc(headC[0], headC[1] - 1.5, 7.4, Math.PI * 0.9, Math.PI * 2.18);
      ctx.lineTo(headC[0] + 5.5, headC[1] - 0.6);
      ctx.closePath();
      ctx.fillStyle = helmet;
      ctx.fill();
      ctx.beginPath();
      ctx.moveTo(headC[0] + 1.8, headC[1] - 8.6);
      ctx.lineTo(headC[0] + 9.4, headC[1] - 4.8);
      ctx.lineTo(headC[0] + 3.6, headC[1] - 2.6);
      ctx.closePath();
      ctx.fillStyle = frame;
      ctx.fill();
      ctx.fillStyle = '#121712';
      ctx.fillRect(headC[0] + 3.3, headC[1] - 2.8, 4.2, 2.1);

      // front arm
      if (b.grabbing) {
        stroke([shoulder, [shoulder[0] + 11, shoulder[1] - 1], [shoulder[0] + 20, shoulder[1] - 4]], 3.6, jerseyHi);
      } else {
        stroke([shoulder, [15.5, -42.5], [23, -37]], 3.6, jerseyHi);
      }

      // scarf
      if (b.vx > 150) {
        const f = Math.sin(this.time * 13) * 2.6;
        ctx.beginPath();
        ctx.moveTo(shoulder[0] - 1, shoulder[1] - 3);
        ctx.quadraticCurveTo(shoulder[0] - 10, shoulder[1] - 1 + f, shoulder[0] - 19, shoulder[1] + 6 - f);
        ctx.strokeStyle = alpha(frame, 0.88);
        ctx.lineWidth = 2.6;
        ctx.lineCap = 'round';
        ctx.stroke();
      }

      if (b.grabbing) {
        ctx.fillStyle = 'rgba(255,207,107,0.9)';
        for (let k = 0; k < 3; k++) {
          const a = this.time * 9 + k * 2.1;
          ctx.beginPath();
          ctx.arc(shoulder[0] + Math.cos(a) * 13, shoulder[1] - 6 + Math.sin(a) * 7, 1.2, 0, TAU);
          ctx.fill();
        }
      }

      ctx.restore();

      if (opts.name) {
        const name = String(opts.name).slice(0, 16).toUpperCase();
        ctx.save();
        ctx.font = '800 13px "Avenir Next Condensed", "Arial Narrow", sans-serif';
        const tw = ctx.measureText(name).width;
        const bw = tw + 20;
        const bh = 20;
        const bx = b.x - bw / 2;
        const by = b.y - 82 - bh;
        const r = 6;
        ctx.beginPath();
        ctx.moveTo(bx + r, by);
        ctx.lineTo(bx + bw - r, by);
        ctx.quadraticCurveTo(bx + bw, by, bx + bw, by + r);
        ctx.lineTo(bx + bw, by + bh - r);
        ctx.quadraticCurveTo(bx + bw, by + bh, bx + bw - r, by + bh);
        ctx.lineTo(bx + r, by + bh);
        ctx.quadraticCurveTo(bx, by + bh, bx, by + bh - r);
        ctx.lineTo(bx, by + r);
        ctx.quadraticCurveTo(bx, by, bx + r, by);
        ctx.closePath();
        ctx.fillStyle = 'rgba(8,14,10,0.66)';
        ctx.fill();
        ctx.beginPath();
        ctx.moveTo(b.x - 4, by + bh);
        ctx.lineTo(b.x + 4, by + bh);
        ctx.lineTo(b.x, by + bh + 5);
        ctx.closePath();
        ctx.fill();
        ctx.fillStyle = opts.frameColor || frame;
        ctx.beginPath();
        ctx.arc(bx + 8, by + bh / 2, 3, 0, TAU);
        ctx.fill();
        ctx.fillStyle = '#f7f1e1';
        ctx.textAlign = 'left';
        ctx.textBaseline = 'middle';
        ctx.fillText(name, bx + 14, by + bh / 2 + 1);
        ctx.restore();
      }

      if (isLocal && this.state === 'crashed') {
        ctx.save();
        ctx.translate(b.x, b.y - 70);
        ctx.fillStyle = '#ffd166';
        for (let k = 0; k < 3; k++) {
          const a = this.time * 6 + (k * TAU) / 3;
          const sx = Math.cos(a) * 22;
          const sy = Math.sin(a) * 8;
          ctx.beginPath();
          ctx.arc(sx, sy, 2.6, 0, TAU);
          ctx.fill();
        }
        ctx.restore();
      }
    }

    drawFloaters(ctx) {
      ctx.save();
      ctx.textAlign = 'center';
      for (const f of this.floaters) {
        const a = clamp(f.life / f.maxLife, 0, 1);
        ctx.globalAlpha = a;
        ctx.font = `800 ${f.size}px "Avenir Next Condensed", "Arial Narrow", Impact, sans-serif`;
        ctx.lineWidth = 5;
        ctx.strokeStyle = 'rgba(8,13,9,0.55)';
        ctx.strokeText(f.text, f.x, f.y);
        ctx.fillStyle = f.color;
        ctx.fillText(f.text, f.x, f.y);
        if (f.sub) {
          ctx.font = '800 15px "Avenir Next Condensed", "Arial Narrow", Impact, sans-serif';
          ctx.lineWidth = 4;
          ctx.strokeStyle = 'rgba(8,13,9,0.45)';
          ctx.strokeText(f.sub, f.x, f.y + 21);
          ctx.fillStyle = 'rgba(247,241,225,0.85)';
          ctx.fillText(f.sub, f.x, f.y + 21);
        }
      }
      ctx.restore();
      ctx.globalAlpha = 1;
    }

    drawSpeedLines(ctx, W, H) {
      if (this.boosting) {
        const vg = ctx.createRadialGradient(W / 2, H / 2, H * 0.18, W / 2, H / 2, H * 0.78);
        vg.addColorStop(0, 'rgba(255,122,31,0)');
        vg.addColorStop(1, 'rgba(255,122,31,0.17)');
        ctx.fillStyle = vg;
        ctx.fillRect(0, 0, W, H);
      }
      if (this.streakAlpha < 0.01) return;
      ctx.save();
      ctx.strokeStyle = `rgba(255,255,255,${this.streakAlpha})`;
      ctx.lineWidth = 1.3;
      for (const s of this.streaks) {
        const x = s.x * W;
        const y = s.y * H;
        ctx.beginPath();
        ctx.moveTo(x, y);
        ctx.lineTo(x + s.len, y);
        ctx.stroke();
      }
      ctx.restore();
    }
  }

  /* ============================================================
     World drawing helpers
     ============================================================ */

  function drawPine(ctx, x, baseY, h, color, dark) {
    const w = h * 0.36;
    ctx.fillStyle = dark;
    ctx.fillRect(x - 2, baseY - h * 0.3, 4, h * 0.3);
    ctx.fillStyle = color;
    for (let i = 0; i < 3; i++) {
      const top = baseY - h + i * h * 0.21;
      const half = w * (0.42 + i * 0.27);
      const bottom = top + h * 0.5;
      ctx.beginPath();
      ctx.moveTo(x, top);
      ctx.lineTo(x - half, bottom);
      ctx.lineTo(x + half, bottom);
      ctx.closePath();
      ctx.fill();
    }
  }

  function makeCloudSprite() {
    const c = document.createElement('canvas');
    c.width = 420;
    c.height = 160;
    const x = c.getContext('2d');
    const puffs = [
      [100, 98, 88, 40],
      [205, 90, 82, 42],
      [300, 100, 80, 36],
      [190, 60, 58, 34],
      [250, 66, 48, 28]
    ];
    for (const [px, py, rx, ry] of puffs) {
      x.save();
      x.translate(px, py);
      x.scale(1, ry / rx);
      const g = x.createRadialGradient(0, 0, 0, 0, 0, rx);
      g.addColorStop(0, 'rgba(255,255,255,0.42)');
      g.addColorStop(0.55, 'rgba(255,255,255,0.24)');
      g.addColorStop(1, 'rgba(255,255,255,0)');
      x.fillStyle = g;
      x.beginPath();
      x.arc(0, 0, rx, 0, TAU);
      x.fill();
      x.restore();
    }
    return c;
  }

  /* ============================================================
     Boot
     ============================================================ */

  const game = new Game(dom.canvas);

  game.onTrick = (name, pts, grade) => ui.showTrick(name, pts, grade);
  game.onToast = (msg) => ui.toast(msg);
  game.onCrash = () => ui.wipeout();
  game.onBails = (n) => ui.setBails(n);
  game.onGameOver = (g, isBest) => ui.showOver(g, isBest);

  ui.init(game);
  game.startDemo();
  ui.setMenu(true);
  ui.setHud(false);
  ui.setOver(false);

  if (game.touchMode) {
    document.body.classList.add('touch-mode');
    dom.touch.classList.remove('hidden');
  }

  function toggleSound() {
    game.sfx.init();
    const muted = game.sfx.toggleMute();
    dom.soundBtn.classList.toggle('muted', muted);
    dom.soundLabel.textContent = muted ? 'MUTED' : 'SOUND';
    dom.soundBtn.setAttribute('aria-pressed', String(!muted));
    if (!muted) game.sfx.click();
  }

  function beginRun() {
    game.sfx.init();
    game.startRun();
    ui.setMenu(false);
    ui.setOver(false);
    ui.setHud(true);
    dom.startBtn.blur();
    dom.againBtn.blur();
  }

  dom.startBtn.addEventListener('click', beginRun);
  dom.againBtn.addEventListener('click', beginRun);

  dom.menuBtn.addEventListener('click', () => {
    game.startDemo();
    ui.setOver(false);
    ui.setHud(false);
    ui.setMenu(true);
    dom.menuBtn.blur();
  });

  dom.soundBtn.addEventListener('click', toggleSound);

  const pressBoost = () => {
    if (game.state === 'playing') game.input.boost = true;
  };
  const releaseBoost = () => {
    game.input.boost = false;
  };
  dom.boostPanel.addEventListener('pointerdown', (e) => {
    e.preventDefault();
    game.sfx.init();
    pressBoost();
    dom.boostPanel.classList.add('active');
  });
  dom.boostPanel.addEventListener('pointerup', releaseBoost);
  dom.boostPanel.addEventListener('pointercancel', releaseBoost);
  dom.boostPanel.addEventListener('pointerleave', releaseBoost);
  dom.boostPanel.addEventListener('keydown', (e) => {
    if (e.code === 'Enter' || e.code === 'Space') {
      e.preventDefault();
      pressBoost();
    }
  });
  dom.boostPanel.addEventListener('keyup', releaseBoost);

  /* keyboard */
  window.addEventListener('keydown', (e) => {
    if (window.__3D_ACTIVE) return;
    const tag = e.target && e.target.tagName;
    if (tag === 'INPUT' || tag === 'TEXTAREA' || (e.target && e.target.isContentEditable)) return;
    const authOpen = document.getElementById('auth') && !document.getElementById('auth').classList.contains('hidden');
    const onlineOpen = document.getElementById('online') && !document.getElementById('online').classList.contains('hidden');
    if (authOpen || onlineOpen) return;
    if (e.code === 'KeyM') {
      toggleSound();
      return;
    }
    if (game.state === 'menu') {
      if (e.code === 'Enter' || e.code === 'Space') {
        e.preventDefault();
        beginRun();
      }
      return;
    }
    if (game.state !== 'playing') {
      if (e.code === 'KeyR' && game.state === 'over') {
        beginRun();
      }
      return;
    }
    switch (e.code) {
      case 'ArrowRight':
      case 'KeyD':
        game.input.pedal = true;
        e.preventDefault();
        break;
      case 'ArrowLeft':
      case 'KeyA':
        game.input.brake = true;
        e.preventDefault();
        break;
      case 'ArrowUp':
      case 'KeyW':
      case 'Space':
        game.input.back = true;
        if (!e.repeat) game.queueJump();
        e.preventDefault();
        break;
      case 'ArrowDown':
      case 'KeyS':
        game.input.front = true;
        e.preventDefault();
        break;
      case 'ShiftLeft':
      case 'ShiftRight':
        game.input.grab = true;
        e.preventDefault();
        break;
      case 'KeyB':
        pressBoost();
        e.preventDefault();
        break;
      default:
        break;
    }
  });

  window.addEventListener('keyup', (e) => {
    switch (e.code) {
      case 'ArrowRight':
      case 'KeyD':
        game.input.pedal = false;
        break;
      case 'ArrowLeft':
      case 'KeyA':
        game.input.brake = false;
        break;
      case 'ArrowUp':
      case 'KeyW':
      case 'Space':
        game.input.back = false;
        break;
      case 'ArrowDown':
      case 'KeyS':
        game.input.front = false;
        break;
      case 'ShiftLeft':
      case 'ShiftRight':
        game.input.grab = false;
        break;
      case 'KeyB':
        releaseBoost();
        break;
      default:
        break;
    }
  });

  window.addEventListener('blur', () => game.clearInput());

  document.addEventListener('visibilitychange', () => {
    if (document.hidden) game.clearInput();
  });

  /* touch controls */
  const touchMap = new Map();
  for (const btn of dom.touch.querySelectorAll('.tbtn')) {
    const act = btn.dataset.act;
    const down = (e) => {
      e.preventDefault();
      game.sfx.init();
      btn.classList.add('on');
      btn.setPointerCapture?.(e.pointerId);
      if (act === 'brake') {
        game.input.brake = true;
        if (!game.bike.grounded) game.input.touchFront = true;
      } else if (act === 'pedal') {
        game.input.pedal = true;
        if (!game.bike.grounded) game.input.touchBack = true;
      } else if (act === 'jump') {
        game.queueJump();
      } else if (act === 'grab') {
        game.input.grab = true;
      }
    };
    const up = (e) => {
      e.preventDefault();
      btn.classList.remove('on');
      if (act === 'brake') {
        game.input.brake = false;
        game.input.touchFront = false;
      } else if (act === 'pedal') {
        game.input.pedal = false;
        game.input.touchBack = false;
      } else if (act === 'grab') {
        game.input.grab = false;
      }
    };
    btn.addEventListener('pointerdown', down);
    btn.addEventListener('pointerup', up);
    btn.addEventListener('pointercancel', up);
    btn.addEventListener('lostpointercapture', up);
    touchMap.set(act, btn);
  }

  window.addEventListener('resize', () => game.resize());

  let last = performance.now();
  let acc = 0;
  const STEP = 1 / 120;

  function loop(now) {
    let delta = (now - last) / 1000;
    last = now;
    if (delta > 0.25) delta = 0.25;
    if (window.__3D_ACTIVE) {
      acc = 0;
      requestAnimationFrame(loop);
      return;
    }
    acc += delta;
    let steps = 0;
    while (acc >= STEP && steps < 20) {
      game.update(STEP);
      acc -= STEP;
      steps++;
    }
    if (steps === 20) acc = 0;
    game.render();
    requestAnimationFrame(loop);
  }

  requestAnimationFrame(loop);

  window.__SENDIT = game;
  window.__SENDIT_UI = ui;
  window.__SENDIT_TERRAIN = Terrain;
})();