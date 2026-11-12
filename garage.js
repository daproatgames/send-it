(() => {
  'use strict';

  const KEY = 'sendit.garage.v1';
  const START_COINS = 500;

  const BIKES = [
    {
      id: 'dust-runner',
      brand: 'ROOTLINE',
      name: 'Dust Runner',
      type: 'TRAIL',
      price: 0,
      color: '#e0642a',
      accent: '#f3a13c',
      rim: '#d6ceb9',
      blurb: 'The bike that started it all. Light, balanced, and happy to get loose.',
      stats: { speed: 3, handling: 3, pop: 3 }
    },
    {
      id: 'pine-slayer',
      brand: 'NORTHFORK',
      name: 'Pine Slayer',
      type: 'TRAIL',
      price: 350,
      color: '#2f7a4f',
      accent: '#a8d95c',
      rim: '#cfd8c2',
      blurb: 'Quick edge-to-edge and built for tight singletrack between the pines.',
      stats: { speed: 3, handling: 4, pop: 3 }
    },
    {
      id: 'nightfall',
      brand: 'VANTA',
      name: 'Nightfall',
      type: 'ENDURO',
      price: 700,
      color: '#2a2438',
      accent: '#b56cff',
      rim: '#8b83a0',
      blurb: 'A dusk-built enduro rig. More speed, more stability, still happy in the air.',
      stats: { speed: 4, handling: 3, pop: 3 }
    },
    {
      id: 'rock-ram',
      brand: 'STONECREST',
      name: 'Rock Ram',
      type: 'DOWNHILL',
      price: 1100,
      color: '#8a2f2a',
      accent: '#e8c26a',
      rim: '#b9b2a1',
      blurb: 'Point it down and hold on. The fastest frame in the garage.',
      stats: { speed: 5, handling: 2, pop: 3 }
    },
    {
      id: 'skyhook',
      brand: 'APEX',
      name: 'Skyhook',
      type: 'DIRT JUMP',
      price: 1500,
      color: '#e8c21a',
      accent: '#1c8f8a',
      rim: '#f2e7cd',
      blurb: 'Short, stiff, and built to boost. Spins and flips come easy.',
      stats: { speed: 3, handling: 4, pop: 5 }
    },
    {
      id: 'mist-runner',
      brand: 'GHOSTLINE',
      name: 'Mist Runner',
      type: 'ALL-MOUNTAIN',
      price: 2200,
      color: '#d7dde2',
      accent: '#4b7fb5',
      rim: '#8794a0',
      blurb: 'The do-everything flagship. Fast, composed, and flickable.',
      stats: { speed: 4, handling: 4, pop: 4 }
    }
  ];

  const KITS = [
    {
      id: 'factory',
      name: 'Factory Teal',
      price: 0,
      jersey: '#216d72',
      helmet: '#f2e7cd',
      pants: '#151b17',
      shoe: '#0d0b09',
      blurb: 'The classic team kit. Teal jersey, cream helmet, black pants.'
    },
    {
      id: 'sunset',
      name: 'Sunset Kit',
      price: 250,
      jersey: '#d9622b',
      helmet: '#f4e7c8',
      pants: '#241a14',
      shoe: '#12100c',
      blurb: 'Warm jersey for late laps. Pairs well with a dusty sunset.'
    },
    {
      id: 'moss',
      name: 'Moss Kit',
      price: 400,
      jersey: '#4c6b3c',
      helmet: '#dfe5c8',
      pants: '#1a2117',
      shoe: '#0e120c',
      blurb: 'Forest-camo team colours. Quiet, dark, and fast.'
    },
    {
      id: 'midnight',
      name: 'Midnight Kit',
      price: 650,
      jersey: '#2b3350',
      helmet: '#e6e9f2',
      pants: '#10121a',
      shoe: '#0a0b10',
      blurb: 'Cold blue and clean white. Built for night laps.'
    },
    {
      id: 'cherry',
      name: 'Cherry Kit',
      price: 900,
      jersey: '#b8344a',
      helmet: '#f5e9d6',
      pants: '#1c1418',
      shoe: '#120b0d',
      blurb: 'Loud, warm, and impossible to miss in the trees.'
    }
  ];

  const TRAILS = [
    {
      id: 'dusk-ridge',
      name: 'Dusk Ridge',
      region: 'ALPINE',
      difficulty: 'FLOW',
      blurb: 'The classic sunset line. Open turns, big views, and long shadows.',
      seed: 202611,
      height: 1.35,
      path: { a1: 18, w1: 72, a2: 30, w2: 185, a3: 2.2, w3: 27 },
      trees: 1,
      leafTint: '#d8d3c4',
      grassTint: '#a9b596',
      rockTint: '#ffffff',
      trailTint: '#ffffff',
      mountainTint: '#ffffff',
      preview: ['#2d4662', '#e8ae7d', '#5c6963', '#c8b08d'],
      sky: {
        stops: [
          [0, '#14233a'],
          [0.24, '#2d4662'],
          [0.43, '#6c8096'],
          [0.52, '#b78b77'],
          [0.58, '#e8ae7d'],
          [0.64, '#f5cf9f'],
          [0.7, '#cfb99a'],
          [0.78, '#706f5c'],
          [1, '#3c3e36']
        ],
        cloud: '235,222,220',
        warmCloud: '255,205,175',
        sunGlow: '255,190,125'
      },
      fog: '#c7b4a2',
      fogNear: 120,
      fogFar: 1400,
      sun: '#ffbe7a',
      sunIntensity: 2.05,
      hemiSky: '#9db9d8',
      hemiGround: '#30342a',
      hemiIntensity: 0.46,
      exposure: 0.92
    },
    {
      id: 'fern-gully',
      name: 'Fern Gully',
      region: 'RAINFOREST',
      difficulty: 'TECH',
      blurb: 'Tight, damp, and green. Roots, fog, and a canopy that eats the sky.',
      seed: 771204,
      height: 1.22,
      path: { a1: 14, w1: 58, a2: 24, w2: 150, a3: 3, w3: 23 },
      trees: 1.55,
      leafTint: '#a9c09a',
      grassTint: '#8eae7c',
      rockTint: '#a7ad9e',
      trailTint: '#c4b49a',
      mountainTint: '#b9c6bd',
      preview: ['#405866', '#d8d2c1', '#4c5a52', '#9a8d74'],
      sky: {
        stops: [
          [0, '#27394a'],
          [0.24, '#405866'],
          [0.43, '#788d92'],
          [0.52, '#b9b6a8'],
          [0.58, '#d8d2c1'],
          [0.64, '#e8e2d2'],
          [0.7, '#c9c5b4'],
          [0.78, '#6a6f63'],
          [1, '#3b4039']
        ],
        cloud: '214,218,214',
        warmCloud: '214,212,192',
        sunGlow: '222,218,190'
      },
      fog: '#b7c2b5',
      fogNear: 70,
      fogFar: 820,
      sun: '#ffe1b0',
      sunIntensity: 1.35,
      hemiSky: '#b8c7c6',
      hemiGround: '#2b332b',
      hemiIntensity: 0.55,
      exposure: 0.9
    },
    {
      id: 'red-rock',
      name: 'Red Rock',
      region: 'CANYON',
      difficulty: 'FAST',
      blurb: 'Wide-open desert line. Loose rock, big compressions, and a hard blue sky.',
      seed: 550913,
      height: 1.55,
      path: { a1: 24, w1: 88, a2: 36, w2: 210, a3: 1.2, w3: 33 },
      trees: 0.35,
      leafTint: '#b5b89a',
      grassTint: '#b3a06f',
      rockTint: '#c98a63',
      trailTint: '#d2a47e',
      mountainTint: '#d6a080',
      preview: ['#4f80a5', '#f0d7b3', '#a86a4a', '#c59a75'],
      sky: {
        stops: [
          [0, '#2a5b86'],
          [0.24, '#4f80a5'],
          [0.43, '#8fb3ca'],
          [0.52, '#d8c7b2'],
          [0.58, '#f0d7b3'],
          [0.64, '#f6e3c6'],
          [0.7, '#d9c7a8'],
          [0.78, '#8d7760'],
          [1, '#4b3f32']
        ],
        cloud: '244,234,220',
        warmCloud: '255,220,180',
        sunGlow: '255,205,150'
      },
      fog: '#dec4a4',
      fogNear: 140,
      fogFar: 1300,
      sun: '#ffd7a0',
      sunIntensity: 2.4,
      hemiSky: '#b6cde0',
      hemiGround: '#5a4532',
      hemiIntensity: 0.5,
      exposure: 0.9
    },
    {
      id: 'storm-pass',
      name: 'Storm Pass',
      region: 'HIGHLANDS',
      difficulty: 'ROUGH',
      blurb: 'Exposed ridge line in bad weather. Grey light, short views, no margin.',
      seed: 314159,
      height: 1.45,
      path: { a1: 20, w1: 66, a2: 30, w2: 170, a3: 2.6, w3: 29 },
      trees: 1.1,
      rain: true,
      leafTint: '#9caa9a',
      grassTint: '#8e9c84',
      rockTint: '#9ca3a3',
      trailTint: '#a8a094',
      mountainTint: '#8f9a9a',
      preview: ['#444f56', '#b6b6ae', '#6f7b80', '#8d857a'],
      sky: {
        stops: [
          [0, '#2b3339'],
          [0.24, '#444f56'],
          [0.43, '#6f7b80'],
          [0.52, '#8e9698'],
          [0.58, '#b6b6ae'],
          [0.64, '#cbc7ba'],
          [0.7, '#9a998e'],
          [0.78, '#5b605a'],
          [1, '#343936']
        ],
        cloud: '186,190,190',
        warmCloud: '198,196,184',
        sunGlow: '190,196,194'
      },
      fog: '#97a2a0',
      fogNear: 55,
      fogFar: 680,
      sun: '#c7d4dc',
      sunIntensity: 0.9,
      hemiSky: '#8c9ba3',
      hemiGround: '#2b302c',
      hemiIntensity: 0.6,
      exposure: 0.82
    }
  ];

  function load() {
    const fallback = {
      balance: START_COINS,
      owned: ['dust-runner', 'factory'],
      bike: 'dust-runner',
      kit: 'factory',
      trail: 'dusk-ridge',
      runs: 0
    };
    try {
      const raw = localStorage.getItem(KEY);
      if (!raw) return fallback;
      const parsed = JSON.parse(raw);
      const state = {
        balance: Number.isFinite(parsed.balance) ? Math.max(0, Math.floor(parsed.balance)) : START_COINS,
        owned: Array.isArray(parsed.owned) ? parsed.owned.filter((id) => typeof id === 'string') : [],
        bike: typeof parsed.bike === 'string' ? parsed.bike : 'dust-runner',
        kit: typeof parsed.kit === 'string' ? parsed.kit : 'factory',
        trail: typeof parsed.trail === 'string' ? parsed.trail : 'dusk-ridge',
        runs: Number.isFinite(parsed.runs) ? Math.max(0, Math.floor(parsed.runs)) : 0
      };
      if (!state.owned.includes('dust-runner')) state.owned.push('dust-runner');
      if (!state.owned.includes('factory')) state.owned.push('factory');
      if (!BIKES.some((b) => b.id === state.bike && state.owned.includes(b.id))) state.bike = 'dust-runner';
      if (!KITS.some((k) => k.id === state.kit && state.owned.includes(k.id))) state.kit = 'factory';
      if (!TRAILS.some((t) => t.id === state.trail)) state.trail = 'dusk-ridge';
      return state;
    } catch (e) {
      return fallback;
    }
  }

  const state = load();
  const api = {
    bikes: BIKES,
    kits: KITS,
    trails: TRAILS,
    state,
    onChange: null
  };

  function save() {
    try {
      localStorage.setItem(KEY, JSON.stringify(state));
    } catch (e) {
      /* ignore */
    }
  }

  function bike() {
    return BIKES.find((b) => b.id === state.bike) || BIKES[0];
  }

  function kit() {
    return KITS.find((k) => k.id === state.kit) || KITS[0];
  }

  function trail() {
    return TRAILS.find((t) => t.id === state.trail) || TRAILS[0];
  }

  function owned(id) {
    return state.owned.includes(id);
  }

  function fmt(n) {
    return Math.max(0, Math.floor(n)).toLocaleString('en-US');
  }

  function notify() {
    if (typeof api.onChange === 'function') api.onChange({ bike: bike(), kit: kit(), trail: trail() });
    syncLabels();
  }

  function syncLabels() {
    const balance = fmt(state.balance);
    document.querySelectorAll('[data-garage-coins]').forEach((el) => {
      el.textContent = balance;
    });
    const rig = bike();
    const fit = kit();
    const trl = trail();
    document.querySelectorAll('[data-garage-bike]').forEach((el) => {
      el.textContent = `${rig.brand} ${rig.name}`;
    });
    document.querySelectorAll('[data-garage-kit]').forEach((el) => {
      el.textContent = fit.name;
    });
    document.querySelectorAll('[data-garage-trail]').forEach((el) => {
      el.textContent = trl.name;
    });
    const sub = document.getElementById('start3dSub');
    if (sub && trl.blurb) sub.textContent = trl.blurb;
  }

  api.bike = bike;
  api.kit = kit;
  api.trail = trail;
  api.fmt = fmt;
  api.owned = owned;

  api.awardRun = function awardRun(score = 0, distance = 0, mode = '2D') {
    const base = Math.floor(Math.max(0, Number(score) || 0) / 40);
    const dist = Math.floor(Math.max(0, Number(distance) || 0) / 180);
    const modeBonus = mode === '3D' && score > 0 ? 20 : 0;
    const coins = Math.max(0, base + dist + modeBonus);
    if (coins > 0) {
      state.balance += coins;
      state.runs += 1;
      save();
      syncLabels();
    }
    return coins;
  };

  api.addCoins = function addCoins(n) {
    const amount = Math.floor(Number(n) || 0);
    if (!amount) return state.balance;
    state.balance = Math.max(0, state.balance + amount);
    save();
    syncLabels();
    return state.balance;
  };

  api.select = function select(id) {
    const item = BIKES.find((b) => b.id === id);
    if (!item || !owned(id)) return false;
    state.bike = id;
    save();
    notify();
    render();
    return true;
  };

  api.selectKit = function selectKit(id) {
    const item = KITS.find((k) => k.id === id);
    if (!item || !owned(id)) return false;
    state.kit = id;
    save();
    notify();
    render();
    return true;
  };

  api.selectTrail = function selectTrail(id) {
    const item = TRAILS.find((t) => t.id === id);
    if (!item) return false;
    state.trail = id;
    save();
    notify();
    render();
    return true;
  };

  api.buy = function buy(id) {
    const item = BIKES.find((b) => b.id === id);
    if (!item || owned(id)) return false;
    if (state.balance < item.price) return false;
    state.balance -= item.price;
    state.owned.push(id);
    state.bike = id;
    save();
    notify();
    render();
    return true;
  };

  api.buyKit = function buyKit(id) {
    const item = KITS.find((k) => k.id === id);
    if (!item || owned(id)) return false;
    if (state.balance < item.price) return false;
    state.balance -= item.price;
    state.owned.push(id);
    state.kit = id;
    save();
    notify();
    render();
    return true;
  };

  /* ── UI ─────────────────────────────────────────────────── */

  let garageEl = null;
  let bikesEl = null;
  let gearEl = null;
  let trailsEl = null;
  let noteEl = null;
  let activeTab = 'bikes';
  let noteTimer = 0;

  function bikeSVG(b) {
    return `
      <svg class="bike-art" viewBox="0 0 260 120" role="img" aria-label="${b.brand} ${b.name}">
        <g fill="none" stroke-linecap="round" stroke-linejoin="round">
          <circle cx="50" cy="88" r="22" stroke="#12120f" stroke-width="6"/>
          <circle cx="50" cy="88" r="17" stroke="${b.rim}" stroke-width="2" opacity=".9"/>
          <circle cx="206" cy="88" r="22" stroke="#12120f" stroke-width="6"/>
          <circle cx="206" cy="88" r="17" stroke="${b.rim}" stroke-width="2" opacity=".9"/>
          <path d="M50 88 L120 88 L96 54 Z" stroke="${b.color}" stroke-width="5"/>
          <path d="M50 88 L96 54 M120 88 L96 54 M120 88 L166 72 L172 50 M96 54 L172 50" stroke="${b.color}" stroke-width="5"/>
          <path d="M166 72 L206 88" stroke="${b.accent}" stroke-width="4"/>
          <path d="M84 50 L110 52" stroke="#1b1b18" stroke-width="6"/>
          <path d="M172 47 L184 42" stroke="${b.accent}" stroke-width="5"/>
          <circle cx="120" cy="88" r="4" fill="${b.rim}" stroke="none"/>
          <circle cx="50" cy="88" r="3" fill="${b.accent}" stroke="none"/>
          <circle cx="206" cy="88" r="3" fill="${b.accent}" stroke="none"/>
        </g>
      </svg>
    `;
  }

  function riderSVG(k) {
    return `
      <svg class="kit-art" viewBox="0 0 120 160" role="img" aria-label="Rider kit">
        <circle cx="62" cy="28" r="19" fill="${k.helmet}"/>
        <path d="M48 25 h30 v6 h-30z" fill="#17130e" opacity=".55"/>
        <path d="M44 52 q17 -12 34 0 l7 42 q-24 10 -48 0z" fill="${k.jersey}"/>
        <path d="M42 58 l-14 34 l8 4 l17 -30z" fill="${k.jersey}"/>
        <path d="M78 58 l14 34 l-8 4 l-17 -30z" fill="${k.jersey}"/>
        <path d="M50 94 l-6 38 h13 l8 -34z" fill="${k.pants}"/>
        <path d="M70 94 l6 38 h-13 l-8 -34z" fill="${k.pants}"/>
        <path d="M42 132 h17 v10 h-20z" fill="${k.shoe}"/>
        <path d="M61 132 h17 v10 h-20z" fill="${k.shoe}"/>
      </svg>
    `;
  }

  function statRow(label, value) {
    const pct = Math.max(8, Math.min(100, (value / 5) * 100));
    return `<div class="rig-stat"><span>${label}</span><i><b style="width:${pct}%"></b></i><em>${value}/5</em></div>`;
  }

  function bikeCard(b) {
    const isOwned = owned(b.id);
    const isSelected = state.bike === b.id;
    let action;
    if (isSelected) {
      action = '<button class="rig-btn is-selected" type="button" disabled>EQUIPPED</button>';
    } else if (isOwned) {
      action = `<button class="rig-btn" type="button" data-equip="${b.id}">EQUIP</button>`;
    } else {
      const poor = state.balance < b.price;
      action = `<button class="rig-btn ${poor ? 'cant-afford' : 'buy'}" type="button" data-buy="${b.id}" ${poor ? 'disabled' : ''}>${poor ? 'LOCKED' : 'BUY'}</button>`;
    }
    return `
      <article class="rig-card ${isSelected ? 'is-equipped' : ''} ${isOwned ? '' : 'is-locked'}">
        <div class="rig-preview" style="--rig-color:${b.color}">
          ${bikeSVG(b)}
          <span class="rig-tier">${b.type}</span>
        </div>
        <div class="rig-brand">${b.brand}</div>
        <h3 class="rig-name">${b.name}</h3>
        <p class="rig-blurb">${b.blurb}</p>
        <div class="rig-stats">
          ${statRow('SPEED', b.stats.speed)}
          ${statRow('HANDLING', b.stats.handling)}
          ${statRow('POP', b.stats.pop)}
        </div>
        <div class="rig-foot">
          <span class="rig-price">${isOwned ? 'OWNED' : `<i class="coin-mark mini">S</i> ${fmt(b.price)}`}</span>
          ${action}
        </div>
      </article>
    `;
  }

  function kitCard(k) {
    const isOwned = owned(k.id);
    const isSelected = state.kit === k.id;
    let action;
    if (isSelected) {
      action = '<button class="rig-btn is-selected" type="button" disabled>WEARING</button>';
    } else if (isOwned) {
      action = `<button class="rig-btn" type="button" data-wear="${k.id}">WEAR</button>`;
    } else {
      const poor = state.balance < k.price;
      action = `<button class="rig-btn ${poor ? 'cant-afford' : 'buy'}" type="button" data-buykit="${k.id}" ${poor ? 'disabled' : ''}>${poor ? 'LOCKED' : 'BUY'}</button>`;
    }
    return `
      <article class="rig-card kit-card ${isSelected ? 'is-equipped' : ''} ${isOwned ? '' : 'is-locked'}">
        <div class="rig-preview kit-preview">${riderSVG(k)}<span class="rig-tier">RIDER KIT</span></div>
        <div class="rig-brand">SEND IT TEAM</div>
        <h3 class="rig-name">${k.name}</h3>
        <p class="rig-blurb">${k.blurb}</p>
        <div class="kit-swatches">
          <i style="background:${k.jersey}"></i><i style="background:${k.helmet}"></i><i style="background:${k.pants}"></i><i style="background:${k.shoe}"></i>
        </div>
        <div class="rig-foot">
          <span class="rig-price">${isOwned ? 'OWNED' : `<i class="coin-mark mini">S</i> ${fmt(k.price)}`}</span>
          ${action}
        </div>
      </article>
    `;
  }

  function trailSVG(t) {
    const [skyTop, skyBottom, ridge, dirt] = t.preview;
    return `
      <svg class="trail-art" viewBox="0 0 260 120" role="img" aria-label="${t.name}">
        <defs>
          <linearGradient id="trail-sky-${t.id}" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stop-color="${skyTop}"/>
            <stop offset="1" stop-color="${skyBottom}"/>
          </linearGradient>
        </defs>
        <rect width="260" height="120" fill="url(#trail-sky-${t.id})"/>
        <circle cx="198" cy="34" r="13" fill="#fff7df" opacity=".6"/>
        <path d="M0 88 L38 58 L76 84 L116 42 L158 82 L204 52 L260 86 V120 H0 Z" fill="${ridge}" opacity=".92"/>
        <path d="M0 104 Q56 92 118 98 T260 94 V120 H0 Z" fill="${dirt}" opacity=".9"/>
        <path d="M116 121 Q136 98 128 88 Q122 79 146 70" stroke="#f7f1e1" stroke-width="4" fill="none" opacity=".55" stroke-linecap="round"/>
      </svg>
    `;
  }

  function trailCard(t) {
    const isSelected = state.trail === t.id;
    return `
      <article class="rig-card trail-card ${isSelected ? 'is-equipped' : ''}">
        <div class="rig-preview trail-preview">
          ${trailSVG(t)}
          <span class="rig-tier">${t.difficulty}</span>
        </div>
        <div class="rig-brand">${t.region}</div>
        <h3 class="rig-name">${t.name}</h3>
        <p class="rig-blurb">${t.blurb}</p>
        <div class="rig-foot">
          <span class="rig-price">${isSelected ? 'CURRENT TRAIL' : 'OPEN'}</span>
          ${isSelected
            ? '<button class="rig-btn is-selected" type="button" disabled>RIDING</button>'
            : `<button class="rig-btn" type="button" data-trail="${t.id}">RIDE HERE</button>`}
        </div>
      </article>
    `;
  }

  function renderBikes() {
    if (!bikesEl) return;
    bikesEl.innerHTML = BIKES.map(bikeCard).join('');
  }

  function renderKits() {
    if (!gearEl) return;
    gearEl.innerHTML = KITS.map(kitCard).join('');
  }

  function renderTrails() {
    if (!trailsEl) return;
    trailsEl.innerHTML = TRAILS.map(trailCard).join('');
  }

  function render() {
    renderBikes();
    renderKits();
    renderTrails();
    syncLabels();
  }

  function setTab(tab) {
    activeTab = tab === 'gear' ? 'gear' : tab === 'trails' ? 'trails' : 'bikes';
    document.querySelectorAll('[data-garage-tab]').forEach((btn) => {
      btn.classList.toggle('active', btn.dataset.garageTab === activeTab);
    });
    if (bikesEl) bikesEl.classList.toggle('is-hidden', activeTab !== 'bikes');
    if (gearEl) gearEl.classList.toggle('is-hidden', activeTab !== 'gear');
    if (trailsEl) trailsEl.classList.toggle('is-hidden', activeTab !== 'trails');
  }

  function showNote(msg) {
    if (!noteEl) return;
    noteEl.textContent = msg;
    noteEl.classList.add('show');
    clearTimeout(noteTimer);
    noteTimer = setTimeout(() => noteEl.classList.remove('show'), 2400);
  }

  function open(tab = 'bikes') {
    if (!garageEl) return;
    render();
    setTab(tab);
    garageEl.classList.remove('hidden');
    document.body.classList.add('garage-open');
  }

  function close() {
    if (!garageEl) return;
    garageEl.classList.add('hidden');
    document.body.classList.remove('garage-open');
  }

  api.open = open;
  api.close = close;
  api.render = render;

  function onClick(e) {
    const buyId = e.target.closest('[data-buy]')?.dataset.buy;
    const equipId = e.target.closest('[data-equip]')?.dataset.equip;
    const buyKitId = e.target.closest('[data-buykit]')?.dataset.buykit;
    const wearId = e.target.closest('[data-wear]')?.dataset.wear;
    const trailId = e.target.closest('[data-trail]')?.dataset.trail;
    if (buyId) {
      const item = BIKES.find((b) => b.id === buyId);
      if (api.buy(buyId)) showNote(`${item.brand} ${item.name} added to the garage.`);
      else showNote('Not enough coins yet — go ride.');
      return;
    }
    if (equipId) {
      if (api.select(equipId)) showNote('Bike equipped.');
      return;
    }
    if (buyKitId) {
      const item = KITS.find((k) => k.id === buyKitId);
      if (api.buyKit(buyKitId)) showNote(`${item.name} added. Looking fast.`);
      else showNote('Not enough coins yet — go ride.');
      return;
    }
    if (wearId) {
      if (api.selectKit(wearId)) showNote('Kit equipped.');
      return;
    }
    if (trailId) {
      if (api.selectTrail(trailId)) {
        const item = TRAILS.find((t) => t.id === trailId);
        showNote(`${item.name} selected. Drop in to ride it.`);
      }
    }
  }

  function init() {
    garageEl = document.getElementById('garage');
    bikesEl = document.getElementById('garageBikes');
    gearEl = document.getElementById('garageGear');
    trailsEl = document.getElementById('garageTrails');
    noteEl = document.getElementById('garageNote');
    if (!garageEl) return;

    document.getElementById('garageClose')?.addEventListener('click', close);
    document.getElementById('garageBtn')?.addEventListener('click', () => open('bikes'));
    document.getElementById('garage3dBtn')?.addEventListener('click', () => open('bikes'));
    document.getElementById('trails3dBtn')?.addEventListener('click', () => open('trails'));
    document.getElementById('walletBtn')?.addEventListener('click', () => open('bikes'));
    document.getElementById('garageShopBtn')?.addEventListener('click', () => open('bikes'));
    document.querySelectorAll('[data-garage-tab]').forEach((btn) => {
      btn.addEventListener('click', () => setTab(btn.dataset.garageTab));
    });
    garageEl.addEventListener('click', (e) => {
      if (e.target === garageEl) close();
    });
    garageEl.addEventListener('click', onClick);
    document.addEventListener('keydown', (e) => {
      if (!garageEl.classList.contains('hidden')) {
        e.stopImmediatePropagation();
        if (e.key === 'Escape') {
          e.preventDefault();
          close();
        }
      }
    }, true);
    render();
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();

  window.SENDIT_GARAGE = api;
})();