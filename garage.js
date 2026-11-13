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
    },
    {
      id: 'night-shift',
      name: 'Night Shift',
      region: 'AFTER DARK',
      difficulty: 'FLOW',
      blurb: 'The same mountain after dark. Cold air, a narrow headlight beam, and glowing gates.',
      seed: 606060,
      height: 1.3,
      path: { a1: 16, w1: 64, a2: 28, w2: 178, a3: 2.4, w3: 26 },
      trees: 1.25,
      night: true,
      leafTint: '#8fa0a8',
      grassTint: '#6f8578',
      rockTint: '#8d9aa3',
      trailTint: '#9fa8ad',
      mountainTint: '#6d7b8a',
      preview: ['#0d1a2b', '#31465c', '#263241', '#6d7a83'],
      sky: {
        stops: [
          [0, '#050b14'],
          [0.24, '#0a1526'],
          [0.43, '#16263b'],
          [0.52, '#25364a'],
          [0.58, '#3a4d60'],
          [0.64, '#556779'],
          [0.7, '#44515b'],
          [0.78, '#222a30'],
          [1, '#0a0f13']
        ],
        cloud: '150,170,190',
        warmCloud: '120,140,165',
        sunGlow: '170,200,230',
        stars: true,
        moon: true
      },
      fog: '#0f1a24',
      fogNear: 35,
      fogFar: 560,
      sun: '#8fb2d6',
      sunIntensity: 0.65,
      hemiSky: '#51688a',
      hemiGround: '#10151a',
      hemiIntensity: 0.32,
      exposure: 0.72
    },
    {
      id: 'alpine-dawn',
      name: 'Alpine Dawn',
      region: 'HIGH ALPINE',
      difficulty: 'FLOW',
      blurb: 'First light on the high ridge. Long views, cold air, and fast open turns.',
      seed: 880022,
      height: 1.42,
      path: { a1: 19, w1: 76, a2: 32, w2: 195, a3: 2.1, w3: 28 },
      trees: 0.85,
      leafTint: '#c6d6b2',
      grassTint: '#a9b58a',
      rockTint: '#d8d2c0',
      trailTint: '#e1c3a0',
      mountainTint: '#d6c3b2',
      preview: ['#3d6c9c', '#f3c9a0', '#7c8d88', '#c8a883'],
      sky: {
        stops: [
          [0, '#2d5b86'],
          [0.24, '#6a92b0'],
          [0.43, '#b9cbd4'],
          [0.52, '#e7c7b3'],
          [0.58, '#f6c9a2'],
          [0.64, '#ffdcb4'],
          [0.7, '#d8c1a5'],
          [0.78, '#7f7566'],
          [1, '#3d3a33']
        ],
        cloud: '244,234,220',
        warmCloud: '255,221,188',
        sunGlow: '255,208,170'
      },
      fog: '#e3c9b0',
      fogNear: 160,
      fogFar: 1500,
      sun: '#ffd2a0',
      sunIntensity: 2.3,
      hemiSky: '#c7d9e6',
      hemiGround: '#4a4438',
      hemiIntensity: 0.55,
      exposure: 0.98
    }
  ];

  const PART_INFO = [
    {
      id: 'wheels',
      name: 'Wheels',
      stat: 'speed',
      statName: 'SPEED',
      icon: '◉',
      desc: 'Faster rolling wheels. Each level adds top speed and acceleration.',
      costs: [300, 700, 1400]
    },
    {
      id: 'suspension',
      name: 'Suspension',
      stat: 'handling',
      statName: 'HANDLING',
      icon: '≈',
      desc: 'More control and a wider landing window. Each level adds handling.',
      costs: [300, 700, 1400]
    },
    {
      id: 'drivetrain',
      name: 'Drivetrain',
      stat: 'pop',
      statName: 'POP',
      icon: '⚙',
      desc: 'Lighter rotating mass. Each level adds pop for flips and spins.',
      costs: [300, 700, 1400]
    }
  ];

  const CHALLENGE_TEMPLATES = [
    { id: 'score', event: 'score', target: 6000, reward: 140, xp: 90, title: 'Score 6,000 in one run', desc: 'Best single-run score today.' },
    { id: 'distance', event: 'distance', target: 5000, reward: 120, xp: 80, title: 'Ride 5,000 m today', desc: 'Total distance across all runs.' },
    { id: 'flips', event: 'flips', target: 5, reward: 150, xp: 100, title: 'Land 5 flips today', desc: 'Backflips and frontflips.' },
    { id: 'grabs', event: 'grabs', target: 4, reward: 130, xp: 90, title: 'Land 4 style grabs', desc: 'Hold grab in the air and land it.' },
    { id: 'rides', event: 'rides', target: 3, reward: 110, xp: 70, title: 'Complete 3 runs today', desc: 'Any 2D or 3D run counts.' },
    { id: 'coins', event: 'coins', target: 500, reward: 160, xp: 100, title: 'Earn 500 coins today', desc: 'Coins from runs and contracts.' },
    { id: 'finish', event: 'finish', target: 1, reward: 170, xp: 110, title: 'Finish a 3D trail', desc: 'Cross the finish gate.' },
    { id: 'trail', event: 'trail', reward: 190, xp: 120, title: 'Ride {trail}', desc: 'Complete a run on this trail.' }
  ];

  const ACHIEVEMENTS = [
    { id: 'first-send', name: 'First Send', desc: 'Complete your first run', target: 1, reward: 100, get: (l) => l.runs },
    { id: 'dirt-rich', name: 'Dirt Rich', desc: 'Earn 5,000 coins', target: 5000, reward: 250, get: (l) => l.coins },
    { id: 'distance-demon', name: 'Distance Demon', desc: 'Ride 50,000 m', target: 50000, reward: 300, get: (l) => l.distance },
    { id: 'flip-machine', name: 'Flip Machine', desc: 'Land 50 flips', target: 50, reward: 300, get: (l) => l.flips },
    { id: 'trail-hunter', name: 'Trail Hunter', desc: 'Finish every 3D trail', target: TRAILS.length, reward: 400, get: (l) => Object.keys(l.trails || {}).length },
    { id: 'high-roller', name: 'High Roller', desc: 'Score 20,000 in one run', target: 20000, reward: 400, get: (l) => l.bestScore },
    { id: 'level-ten', name: 'Level 10', desc: 'Reach rider level 10', target: 10, reward: 500, get: () => levelInfo().level }
  ];

  function levelInfo() {
    const level = Math.floor(Math.sqrt(Math.max(0, state.xp) / 400)) + 1;
    const base = 400 * (level - 1) * (level - 1);
    const next = 400 * level * level;
    return { level, xp: state.xp, base, next, pct: next > base ? (state.xp - base) / (next - base) : 0 };
  }

  function dayKey() {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  }

  function dayHash(text) {
    let h = 2166136261;
    for (let i = 0; i < text.length; i++) {
      h ^= text.charCodeAt(i);
      h = Math.imul(h, 16777619);
    }
    return h >>> 0;
  }

  function ensureDaily() {
    const day = dayKey();
    if (state.challenges && state.challenges.day === day && Array.isArray(state.challenges.list)) return;
    const seed = dayHash(day);
    const picks = [];
    const pool = CHALLENGE_TEMPLATES.filter((c) => c.id !== 'trail');
    for (let i = 0; i < 2; i++) {
      let idx = (seed + i * 7) % pool.length;
      while (picks.includes(pool[idx])) idx = (idx + 1) % pool.length;
      picks.push(pool[idx]);
    }
    const trail = TRAILS[seed % TRAILS.length];
    const trailTemplate = CHALLENGE_TEMPLATES.find((c) => c.id === 'trail');
    picks.push({
      ...trailTemplate,
      target: 1,
      trail: trail.id,
      title: `Ride ${trail.name}`,
      desc: 'Complete a run on this trail.'
    });
    state.challenges = {
      day,
      list: picks.map((c, i) => ({
        id: `${c.id}-${i}`,
        event: c.event,
        target: c.target,
        reward: c.reward,
        xp: c.xp,
        title: c.title,
        desc: c.desc,
        trail: c.trail || null,
        progress: 0,
        claimed: false
      }))
    };
    save();
  }

  function ensureLifetime() {
    if (!state.lifetime) {
      state.lifetime = {
        runs: 0,
        distance: 0,
        coins: 0,
        flips: 0,
        grabs: 0,
        bestScore: 0,
        finishes: 0,
        trails: {}
      };
    }
  }

  function ensureAchievements() {
    if (!state.achievements) state.achievements = {};
  }

  function checkLevelUp(before) {
    const after = levelInfo().level;
    if (after > before) {
      state.balance += after * 50;
      return after;
    }
    return 0;
  }

  function checkAchievements() {
    ensureLifetime();
    ensureAchievements();
    const unlocked = [];
    for (const a of ACHIEVEMENTS) {
      if (state.achievements[a.id]) continue;
      if (a.get(state.lifetime) >= a.target) {
        state.achievements[a.id] = true;
        state.balance += a.reward;
        state.xp += 100;
        unlocked.push(a);
      }
    }
    return unlocked;
  }

  function load() {
    const fallback = {
      balance: START_COINS,
      owned: ['dust-runner', 'factory'],
      bike: 'dust-runner',
      kit: 'factory',
      trail: 'dusk-ridge',
      runs: 0,
      xp: 0,
      parts: { wheels: 0, suspension: 0, drivetrain: 0 },
      challenges: { day: '', list: [] },
      lifetime: { runs: 0, distance: 0, coins: 0, flips: 0, grabs: 0, bestScore: 0, finishes: 0, trails: {} },
      achievements: {},
      settings: { quality: 'high', ghost: true, shake: true },
      records: {}
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
        runs: Number.isFinite(parsed.runs) ? Math.max(0, Math.floor(parsed.runs)) : 0,
        xp: Number.isFinite(parsed.xp) ? Math.max(0, Math.floor(parsed.xp)) : 0,
        parts: {
          wheels: Math.max(0, Math.min(3, Number(parsed.parts?.wheels) || 0)),
          suspension: Math.max(0, Math.min(3, Number(parsed.parts?.suspension) || 0)),
          drivetrain: Math.max(0, Math.min(3, Number(parsed.parts?.drivetrain) || 0))
        },
        challenges: parsed.challenges && typeof parsed.challenges === 'object' ? parsed.challenges : { day: '', list: [] },
        lifetime: parsed.lifetime && typeof parsed.lifetime === 'object' ? parsed.lifetime : fallback.lifetime,
        achievements: parsed.achievements && typeof parsed.achievements === 'object' ? parsed.achievements : {},
        settings: parsed.settings && typeof parsed.settings === 'object' ? parsed.settings : fallback.settings,
        records: parsed.records && typeof parsed.records === 'object' ? parsed.records : {}
      };
      if (!state.owned.includes('dust-runner')) state.owned.push('dust-runner');
      if (!state.owned.includes('factory')) state.owned.push('factory');
      if (!BIKES.some((b) => b.id === state.bike && state.owned.includes(b.id))) state.bike = 'dust-runner';
      if (!KITS.some((k) => k.id === state.kit && state.owned.includes(k.id))) state.kit = 'factory';
      if (!TRAILS.some((t) => t.id === state.trail)) state.trail = 'dusk-ridge';
      const defs = fallback.lifetime;
      const life = state.lifetime;
      for (const key of ['runs', 'distance', 'coins', 'flips', 'grabs', 'bestScore', 'finishes']) {
        if (!Number.isFinite(life[key])) life[key] = defs[key];
      }
      if (!life.trails || typeof life.trails !== 'object') life.trails = {};
      state.settings = { ...fallback.settings, ...(state.settings || {}) };
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
      window.dispatchEvent(new Event('sendit:save'));
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

  function fmtTime(sec) {
    const s = Math.max(0, Number(sec) || 0);
    return `${Math.floor(s / 60)}:${Math.floor(s % 60).toString().padStart(2, '0')}`;
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
    const lv = levelInfo();
    document.querySelectorAll('[data-garage-level]').forEach((el) => {
      el.textContent = String(lv.level);
    });
    document.querySelectorAll('[data-garage-xp]').forEach((el) => {
      el.style.width = `${Math.min(100, Math.max(0, lv.pct * 100))}%`;
    });
    document.querySelectorAll('[data-garage-xp-text]').forEach((el) => {
      el.textContent = `${fmt(lv.xp - lv.base)} / ${fmt(lv.next - lv.base)} XP`;
    });
  }

  api.bike = bike;
  api.kit = kit;
  api.trail = trail;
  api.fmt = fmt;
  api.owned = owned;
  api.parts = PART_INFO;
  api.achievements = ACHIEVEMENTS;
  api.levelInfo = levelInfo;
  api.daily = () => {
    ensureDaily();
    return state.challenges.list;
  };

  api.stats = function stats() {
    const b = bike();
    const p = state.parts || {};
    return {
      speed: b.stats.speed + (p.wheels || 0) * 0.35,
      handling: b.stats.handling + (p.suspension || 0) * 0.35,
      pop: b.stats.pop + (p.drivetrain || 0) * 0.35
    };
  };

  api.setSetting = function setSetting(key, value) {
    if (!state.settings) state.settings = {};
    state.settings[key] = value;
    save();
    return value;
  };

  api.reportRun = function reportRun(summary = {}) {
    ensureDaily();
    ensureLifetime();
    ensureAchievements();
    const beforeLevel = levelInfo().level;
    const distance = Math.max(0, Number(summary.distance) || 0);
    const score = Math.max(0, Number(summary.score) || 0);
    const coins = Math.max(0, Number(summary.coins) || 0);
    const flips = Math.max(0, Number(summary.flips) || 0);
    const grabs = Math.max(0, Number(summary.grabs) || 0);
    const finish = summary.finish ? 1 : 0;
    const life = state.lifetime;
    life.runs += 1;
    life.distance += distance;
    life.coins += coins;
    life.flips += flips;
    life.grabs += grabs;
    life.bestScore = Math.max(life.bestScore, score);
    if (finish) {
      life.finishes += 1;
      if (summary.trail) life.trails[summary.trail] = true;
    }
    if (summary.mode === '3D' && summary.trail) {
      if (!state.records) state.records = {};
      const list = Array.isArray(state.records[summary.trail]) ? state.records[summary.trail] : [];
      list.push({
        score,
        time: Math.max(0, Number(summary.time) || 0),
        bike: state.bike,
        date: dayKey()
      });
      list.sort((a, b) => b.score - a.score || a.time - b.time);
      state.records[summary.trail] = list.slice(0, 5);
    }
    const xpGain = Math.floor(score / 30) + Math.floor(distance / 40) + (finish ? 100 : 0);
    state.xp += xpGain;
    const completed = [];
    for (const c of state.challenges.list) {
      if (c.claimed) continue;
      let value = null;
      if (c.event === 'score') value = score;
      else if (c.event === 'distance') value = distance;
      else if (c.event === 'flips') value = flips;
      else if (c.event === 'grabs') value = grabs;
      else if (c.event === 'coins') value = coins;
      else if (c.event === 'finish') value = finish;
      else if (c.event === 'trail') value = summary.trail === c.trail ? 1 : 0;
      else if (c.event === 'rides') value = 1;
      if (value == null) continue;
      if (c.event === 'score') c.progress = Math.max(c.progress, value);
      else c.progress += value;
      if (c.progress >= c.target) completed.push(c);
    }
    const levelUp = checkLevelUp(beforeLevel);
    const unlocked = checkAchievements();
    save();
    syncLabels();
    return { xp: xpGain, completed, levelUp, unlocked };
  };

  api.claim = function claim(id) {
    ensureDaily();
    const c = state.challenges.list.find((x) => x.id === id);
    if (!c || c.claimed || c.progress < c.target) return false;
    c.claimed = true;
    const beforeLevel = levelInfo().level;
    state.balance += c.reward;
    state.xp += c.xp;
    checkLevelUp(beforeLevel);
    checkAchievements();
    save();
    syncLabels();
    render();
    return true;
  };

  api.buyPart = function buyPart(id) {
    const part = PART_INFO.find((p) => p.id === id);
    if (!part) return false;
    const level = state.parts[id] || 0;
    if (level >= 3) return false;
    const cost = part.costs[level];
    if (state.balance < cost) return false;
    state.balance -= cost;
    state.parts[id] = level + 1;
    save();
    syncLabels();
    render();
    return true;
  };

  api.partLevel = (id) => (state.parts && state.parts[id]) || 0;

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
  let partsEl = null;
  let contractsEl = null;
  let badgesEl = null;
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
    const rec = ((state.records && state.records[t.id]) || [])[0];
    return `
      <article class="rig-card trail-card ${isSelected ? 'is-equipped' : ''}">
        <div class="rig-preview trail-preview">
          ${trailSVG(t)}
          <span class="rig-tier">${t.difficulty}</span>
        </div>
        <div class="rig-brand">${t.region}</div>
        <h3 class="rig-name">${t.name}</h3>
        <p class="rig-blurb">${t.blurb}</p>
        <div class="trail-record ${rec ? '' : 'empty'}">${rec ? `PB ${fmt(rec.score)} · ${fmtTime(rec.time)}` : 'NO RUNS YET'}</div>
        <div class="rig-foot">
          <span class="rig-price">${isSelected ? 'CURRENT TRAIL' : 'OPEN'}</span>
          ${isSelected
            ? '<button class="rig-btn is-selected" type="button" disabled>RIDING</button>'
            : `<button class="rig-btn" type="button" data-trail="${t.id}">RIDE HERE</button>`}
        </div>
      </article>
    `;
  }

  function partCard(p) {
    const level = state.parts[p.id] || 0;
    const maxed = level >= 3;
    const cost = maxed ? 0 : p.costs[level];
    const poor = state.balance < cost;
    const pips = [1, 2, 3].map((n) => `<i class="${n <= level ? 'on' : ''}"></i>`).join('');
    return `
      <article class="rig-card part-card ${maxed ? 'is-equipped' : ''}">
        <div class="part-head">
          <span class="part-icon">${p.icon}</span>
          <div><div class="rig-brand">BIKE PART</div><h3 class="rig-name">${p.name}</h3></div>
        </div>
        <p class="rig-blurb">${p.desc}</p>
        <div class="part-pips">${pips}<span>${level}/3</span></div>
        <div class="rig-foot">
          <span class="rig-price">${maxed ? 'MAXED' : `<i class="coin-mark mini">S</i> ${fmt(cost)}`}</span>
          ${maxed
            ? '<button class="rig-btn is-selected" type="button" disabled>MAX</button>'
            : `<button class="rig-btn ${poor ? 'cant-afford' : 'buy'}" type="button" data-part="${p.id}" ${poor ? 'disabled' : ''}>${poor ? 'LOCKED' : 'UPGRADE'}</button>`}
        </div>
      </article>
    `;
  }

  function contractCard(c) {
    const pct = Math.min(100, (c.progress / c.target) * 100);
    const done = c.progress >= c.target;
    const button = c.claimed
      ? '<button class="rig-btn is-selected" type="button" disabled>CLAIMED</button>'
      : done
        ? `<button class="rig-btn buy" type="button" data-claim="${c.id}">CLAIM</button>`
        : '<button class="rig-btn" type="button" disabled>IN PROGRESS</button>';
    return `
      <article class="contract-card ${done && !c.claimed ? 'is-ready' : ''} ${c.claimed ? 'is-claimed' : ''}">
        <div class="contract-top">
          <span class="label">DAILY CONTRACT</span>
          <span class="contract-reward"><i class="coin-mark mini">S</i> ${fmt(c.reward)} · ${c.xp} XP</span>
        </div>
        <h3>${c.title}</h3>
        <p>${c.desc}</p>
        <div class="contract-track"><i style="width:${pct}%"></i></div>
        <div class="contract-foot">
          <span>${fmt(Math.min(c.progress, c.target))} / ${fmt(c.target)}</span>
          ${button}
        </div>
      </article>
    `;
  }

  function badgeCard(a) {
    const unlocked = !!state.achievements[a.id];
    const value = a.get(state.lifetime || {});
    const pct = Math.min(100, (value / a.target) * 100);
    return `
      <article class="badge-card ${unlocked ? 'is-unlocked' : ''}">
        <div class="badge-icon">${unlocked ? '★' : '☆'}</div>
        <div class="badge-body">
          <h3>${a.name}</h3>
          <p>${a.desc}</p>
          <div class="contract-track"><i style="width:${pct}%"></i></div>
          <span class="badge-progress">${fmt(Math.min(value, a.target))} / ${fmt(a.target)}</span>
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

  function renderParts() {
    if (!partsEl) return;
    partsEl.innerHTML = PART_INFO.map(partCard).join('');
  }

  function renderContracts() {
    if (!contractsEl) return;
    ensureDaily();
    contractsEl.innerHTML = state.challenges.list.map(contractCard).join('');
  }

  function renderBadges() {
    if (!badgesEl) return;
    ensureLifetime();
    badgesEl.innerHTML = ACHIEVEMENTS.map(badgeCard).join('');
  }

  function render() {
    renderBikes();
    renderKits();
    renderTrails();
    renderParts();
    renderContracts();
    renderBadges();
    syncLabels();
  }

  function setTab(tab) {
    const allowed = ['bikes', 'gear', 'trails', 'parts', 'contracts', 'badges'];
    activeTab = allowed.includes(tab) ? tab : 'bikes';
    document.querySelectorAll('[data-garage-tab]').forEach((btn) => {
      btn.classList.toggle('active', btn.dataset.garageTab === activeTab);
    });
    const map = {
      bikes: bikesEl,
      gear: gearEl,
      trails: trailsEl,
      parts: partsEl,
      contracts: contractsEl,
      badges: badgesEl
    };
    for (const [key, el] of Object.entries(map)) {
      if (el) el.classList.toggle('is-hidden', key !== activeTab);
    }
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
    const partId = e.target.closest('[data-part]')?.dataset.part;
    const claimId = e.target.closest('[data-claim]')?.dataset.claim;
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
      return;
    }
    if (partId) {
      const item = PART_INFO.find((p) => p.id === partId);
      if (api.buyPart(partId)) showNote(`${item.name} upgraded.`);
      else showNote('Not enough coins yet — go ride.');
      return;
    }
    if (claimId) {
      if (api.claim(claimId)) showNote('Contract claimed. Coins and XP added.');
      return;
    }
  }

  function init() {
    garageEl = document.getElementById('garage');
    bikesEl = document.getElementById('garageBikes');
    gearEl = document.getElementById('garageGear');
    trailsEl = document.getElementById('garageTrails');
    partsEl = document.getElementById('garageParts');
    contractsEl = document.getElementById('garageContracts');
    badgesEl = document.getElementById('garageBadges');
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
