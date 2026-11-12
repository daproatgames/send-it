(() => {
  'use strict';

  const game = window.__SENDIT;
  const ui = window.__SENDIT_UI;
  const Terrain = window.__SENDIT_TERRAIN;
  if (!game || !ui || !Terrain || !window.THREE) return;

  const THREE = window.THREE;
  const TAU = Math.PI * 2;
  const GRAVITY = 9.81;
  const HEIGHT_SCALE = 1.35;
  const MAX_X = 2000;
  const STEP_X = 2;
  const BEST_KEY = 'sendit.best3d';

  const $ = (id) => document.getElementById(id);
  const dom = {
    canvas: $('game3d'),
    menu: $('menu'),
    hud: $('hud'),
    start: $('start3d'),
    startBtn: $('start3dBtn'),
    backBtn: $('back3dBtn'),
    best: $('best3d'),
    over: $('over3d'),
    overEyebrow: $('over3dEyebrow'),
    overTitle: $('over3dTitle'),
    finalScore: $('final3d'),
    coins: $('runCoins3d'),
    finalDist: $('finalDist3d'),
    finalTrick: $('finalTrick3d'),
    finalBest: $('finalBest3d'),
    newBest: $('newBest3d'),
    againBtn: $('again3dBtn'),
    menuBtn: $('menu3dBtn'),
    exitBtn: $('exit3dBtn'),
    count: $('count3d'),
    countNum: $('count3dNum'),
    land: $('land3d'),
    landBar: $('land3dBar'),
    landDeg: $('land3dDeg'),
    launchBtn: $('ride3dBtn'),
    touch: $('touch3d'),
    boostPanel: $('boostPanel'),
    bailsPanel: $('bailsPanel'),
    ridersPanel: $('ridersPanel')
  };

  const S = {
    active: false,
    looping: false,
    mode: 'idle', // intro | countdown | playing | crashed | over
    countdown: 0,
    goTimer: 0,
    world: null,
    bike: null,
    cameraReady: false,
    last: 0,
    uiTimer: 0,
    windTimer: 0,
    trickPoints: 0,
    chain: 0,
    comboTimer: 0,
    boost: 0.35,
    boosting: false,
    bails: 3,
    bestTrick: null,
    best3d: loadBest3d(),
    coinsEarned: 0,
    rewarded: false,
    crashTimer: 0,
    shake: 0,
    time: 0,
    input: {
      left: false,
      right: false,
      up: false,
      down: false,
      grab: false,
      boost: false,
      jumpBuffer: 0
    },
    gates: [],
    frame: 0
  };

  let renderer, scene, camera;
  let bikeRoot, bikeTilt, bikeModel, frontWheel, rearWheel, shadow;
  let worldGroup = null;
  let camPos = new THREE.Vector3();
  let camLook = new THREE.Vector3();
  let tmpV = new THREE.Vector3();
  let dust = null;
  let dustTimer = 0;
  let dustCursor = 0;
  let treeTexture = null;
  let grassTexture = null;
  let grassEdgeAlpha = null;
  let RIG = null;
  let KIT = null;
  let TRAIL = null;
  let skyTex = null;
  let envRT = null;
  let hemiLight = null;
  let fillLight = null;
  let rain = null;
  let rainDirty = true;
  const windUniform = { value: 0 };
  const DUST_MAX = 140;
  const dustParts = [];

  const M = {};

  function hash(n) {
    const s = Math.sin(n * 127.1 + 311.7) * 43758.5453123;
    return s - Math.floor(s);
  }

  function clamp(v, a, b) {
    return v < a ? a : v > b ? b : v;
  }

  function wrapAngle(a) {
    a = (a + Math.PI) % TAU;
    if (a < 0) a += TAU;
    return a - Math.PI;
  }

  function loadBest3d() {
    try {
      return parseInt(localStorage.getItem(BEST_KEY) || '0', 10) || 0;
    } catch (e) {
      return 0;
    }
  }

  function saveBest3d(v) {
    try {
      localStorage.setItem(BEST_KEY, String(Math.round(v)));
    } catch (e) {
      /* ignore */
    }
  }

  function trailPath() {
    return (TRAIL && TRAIL.path) || { a1: 18, w1: 72, a2: 30, w2: 185, a3: 2.2, w3: 27 };
  }

  function pathZ(x) {
    const p = trailPath();
    return Math.sin(x / p.w1) * p.a1 + Math.sin(x / p.w2 + 1.4) * p.a2 + Math.sin(x / p.w3 + 0.6) * p.a3;
  }

  function pathDZ(x) {
    const p = trailPath();
    return (p.a1 / p.w1) * Math.cos(x / p.w1) + (p.a2 / p.w2) * Math.cos(x / p.w2 + 1.4) + (p.a3 / p.w3) * Math.cos(x / p.w3 + 0.6);
  }

  function terrainY(x) {
    const scale = TRAIL && TRAIL.height ? TRAIL.height : HEIGHT_SCALE;
    return -S.world.profile.groundY(x * 40) / 40 * scale;
  }

  function slopeAt(x) {
    const e = 0.06;
    return (terrainY(x + e) - terrainY(x - e)) / (2 * e);
  }

  function sideY(u) {
    const a = Math.abs(u);
    if (a <= 8) return -0.05 * (a / 8) * (a / 8);
    if (u < 0) return Math.pow((a - 8) / 44, 1.35) * 18;
    return -Math.pow((a - 8) / 44, 1.25) * 22;
  }

  function bikeGroundY(x) {
    return terrainY(x);
  }

  function scoreNow() {
    if (!S.bike) return 0;
    return Math.round(S.trickPoints + Math.max(0, S.bike.x) * 6);
  }

  function garageBike() {
    const g = window.SENDIT_GARAGE;
    return (g && g.bike()) || {
      brand: 'SEND IT',
      name: 'Freeride',
      color: '#ff8a2a',
      accent: '#ffcf6b',
      rim: '#d6ceb9',
      stats: { speed: 3, handling: 3, pop: 3 }
    };
  }

  function garageKit() {
    const g = window.SENDIT_GARAGE;
    return (g && g.kit()) || {
      jersey: '#216d72',
      helmet: '#f2e7cd',
      pants: '#151b17',
      shoe: '#0d0b09'
    };
  }

  function garageTrail() {
    const g = window.SENDIT_GARAGE;
    return (g && g.trail()) || {
      id: 'dusk-ridge',
      name: 'Dusk Ridge',
      seed: 202611,
      height: 1.35,
      path: { a1: 18, w1: 72, a2: 30, w2: 185, a3: 2.2, w3: 27 },
      trees: 1,
      leafTint: '#d8d3c4',
      grassTint: '#a9b596',
      rockTint: '#ffffff',
      trailTint: '#ffffff',
      fog: '#c7b4a2',
      fogNear: 120,
      fogFar: 1400,
      sun: '#ffbe7a',
      sunIntensity: 2.05,
      hemiSky: '#9db9d8',
      hemiGround: '#30342a',
      hemiIntensity: 0.46,
      exposure: 0.92
    };
  }

  function applyTrailConfig(trail) {
    TRAIL = trail || garageTrail();
    rainDirty = true;
  }

  function applyTrailSky() {
    if (!renderer || !scene) return;
    if (skyTex) skyTex.dispose();
    if (envRT) envRT.dispose();
    skyTex = makeSkyTexture();
    scene.background = skyTex;
    const pmrem = new THREE.PMREMGenerator(renderer);
    pmrem.compileEquirectangularShader();
    envRT = pmrem.fromEquirectangular(skyTex);
    scene.environment = envRT.texture;
    pmrem.dispose();
  }

  function applyTrailTheme() {
    if (!scene) return;
    const t = TRAIL || garageTrail();
    scene.fog = new THREE.Fog(t.fog || 0xc7b4a2, t.fogNear || 120, t.fogFar || 1400);
    if (sunLight) {
      sunLight.color.set(t.sun || 0xffbe7a);
      sunLight.intensity = t.sunIntensity == null ? 2.05 : t.sunIntensity;
    }
    if (hemiLight) {
      hemiLight.color.set(t.hemiSky || 0x9db9d8);
      hemiLight.groundColor.set(t.hemiGround || 0x30342a);
      hemiLight.intensity = t.hemiIntensity == null ? 0.46 : t.hemiIntensity;
    }
    if (fillLight) {
      fillLight.intensity = (t.hemiIntensity == null ? 0.46 : t.hemiIntensity) * 0.45;
    }
    if (renderer) renderer.toneMappingExposure = t.exposure == null ? 0.92 : t.exposure;
    if (M.trail) M.trail.color.set(t.trailTint || '#ffffff');
    if (M.grass) M.grass.color.set(t.grassTint || '#a9b596');
    if (M.rock) M.rock.color.set(t.rockTint || '#ffffff');
    if (M.foliage) M.foliage.color.set(t.leafTint || '#ffffff');
  }

  function applyGarageLook() {
    RIG = garageBike();
    KIT = garageKit();
    if (!M.frame) return;
    M.frame.color.set(RIG.color);
    M.accent.color.set(RIG.accent);
    M.rim.color.set(RIG.rim);
    M.jersey.color.set(KIT.jersey);
    M.helmet.color.set(KIT.helmet);
    M.pants.color.set(KIT.pants);
    M.shoe.color.set(KIT.shoe || '#0d0b09');
  }

  function rigStats() {
    if (!RIG) RIG = garageBike();
    return RIG.stats || { speed: 3, handling: 3, pop: 3 };
  }

  function applyWind(material, amp) {
    material.onBeforeCompile = (shader) => {
      shader.uniforms.uWind = windUniform;
      shader.vertexShader = `uniform float uWind;\n${shader.vertexShader}`;
      shader.vertexShader = shader.vertexShader.replace(
        '#include <begin_vertex>',
        `#include <begin_vertex>
        #ifdef USE_INSTANCING
          float windPhase = instanceMatrix[3].x * 0.17 + instanceMatrix[3].z * 0.11;
          float windSway = sin(uWind * 1.35 + windPhase) * 0.62 + sin(uWind * 2.25 + windPhase * 1.7) * 0.38;
          transformed.x += windSway * ${amp.toFixed(4)} * max(0.0, position.y);
          transformed.z += windSway * ${(amp * 0.55).toFixed(4)} * max(0.0, position.y);
        #endif`
      );
    };
  }

  /* ── PBR assets ──────────────────────────────────────────── */

  let sunLight = null;
  const TEX = {};
  const texLoader = new THREE.TextureLoader();

  function loadTex(path, srgb, rx = 1, ry = 1) {
    const t = texLoader.load(path);
    t.wrapS = THREE.RepeatWrapping;
    t.wrapT = THREE.RepeatWrapping;
    t.repeat.set(rx, ry);
    t.anisotropy = Math.min(8, renderer?.capabilities?.getMaxAnisotropy?.() || 4);
    t.encoding = srgb ? THREE.sRGBEncoding : THREE.LinearEncoding;
    return t;
  }

  function initTextures() {
    if (TEX.trail) return;
    const set = (name) => ({
      map: loadTex(`assets/textures/${name}/d.jpg`, true),
      normal: loadTex(`assets/textures/${name}/n.jpg`, false),
      rough: loadTex(`assets/textures/${name}/r.jpg`, false)
    });
    TEX.trail = set('trail');
    TEX.grass = set('grass');
    TEX.rock = set('rock');
    TEX.bark = {
      map: loadTex('assets/textures/bark/d.jpg', true, 1.6, 3),
      normal: loadTex('assets/textures/bark/n.jpg', false, 1.6, 3),
      rough: loadTex('assets/textures/bark/r.jpg', false, 1.6, 3)
    };
    TEX.foliage = {
      map: loadTex('assets/textures/foliage/d.jpg', true, 2.2, 2.2),
      normal: loadTex('assets/textures/foliage/n.jpg', false, 2.2, 2.2),
      rough: null
    };
  }

  function texMaterial(name, opts = {}) {
    const t = TEX[name];
    return new THREE.MeshStandardMaterial({
      map: t.map,
      normalMap: t.normal,
      ...(t.rough ? { roughnessMap: t.rough } : {}),
      roughness: 1,
      metalness: 0,
      envMapIntensity: 0.55,
      ...opts
    });
  }

  function makeSkyTexture() {
    const c = document.createElement('canvas');
    c.width = 2048;
    c.height = 1024;
    const ctx = c.getContext('2d');
    const w = c.width;
    const h = c.height;
    const sky = (TRAIL && TRAIL.sky) || {};
    const stops = sky.stops || [
      [0, '#14233a'],
      [0.24, '#2d4662'],
      [0.43, '#6c8096'],
      [0.52, '#b78b77'],
      [0.58, '#e8ae7d'],
      [0.64, '#f5cf9f'],
      [0.7, '#cfb99a'],
      [0.78, '#706f5c'],
      [1, '#3c3e36']
    ];
    const grad = ctx.createLinearGradient(0, 0, 0, h);
    for (const [at, color] of stops) grad.addColorStop(at, color);
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, w, h);

    const cloud = (x, y, rx, ry, alpha, color) => {
      ctx.save();
      ctx.translate(x, y);
      ctx.scale(1, ry / rx);
      const cg = ctx.createRadialGradient(0, 0, rx * 0.08, 0, 0, rx);
      cg.addColorStop(0, `rgba(${color},${alpha})`);
      cg.addColorStop(0.5, `rgba(${color},${alpha * 0.55})`);
      cg.addColorStop(1, `rgba(${color},0)`);
      ctx.fillStyle = cg;
      ctx.beginPath();
      ctx.arc(0, 0, rx, 0, TAU);
      ctx.fill();
      ctx.restore();
    };

    const cloudCol = sky.cloud || '235,222,220';
    const warmCol = sky.warmCloud || '255,205,175';
    const sunCol = sky.sunGlow || '255,190,125';

    cloud(w * 0.14, h * 0.33, 230, 34, 0.18, cloudCol);
    cloud(w * 0.34, h * 0.28, 300, 42, 0.14, cloudCol);
    cloud(w * 0.58, h * 0.36, 260, 30, 0.16, warmCol);
    cloud(w * 0.86, h * 0.31, 210, 28, 0.12, cloudCol);
    cloud(w * 0.24, h * 0.48, 340, 38, 0.2, warmCol);
    cloud(w * 0.72, h * 0.5, 280, 34, 0.22, warmCol);
    cloud(w * 0.17, h * 0.21, 430, 26, 0.17, cloudCol);
    cloud(w * 0.6, h * 0.24, 500, 28, 0.13, cloudCol);
    cloud(w * 0.05, h * 0.43, 360, 40, 0.3, warmCol);
    cloud(w * 0.46, h * 0.42, 430, 42, 0.24, warmCol);
    cloud(w * 0.92, h * 0.44, 310, 34, 0.28, warmCol);

    const sx = w * 0.72;
    const sy = h * 0.435;
    const glow = ctx.createRadialGradient(sx, sy, 8, sx, sy, h * 0.38);
    glow.addColorStop(0, `rgba(${sunCol},0.92)`);
    glow.addColorStop(0.13, `rgba(${sunCol},0.45)`);
    glow.addColorStop(0.4, `rgba(${sunCol},0.15)`);
    glow.addColorStop(1, `rgba(${sunCol},0)`);
    ctx.fillStyle = glow;
    ctx.fillRect(0, 0, w, h);
    ctx.beginPath();
    ctx.arc(sx, sy, h * 0.027, 0, TAU);
    ctx.fillStyle = '#fff4ce';
    ctx.fill();

    const tex = new THREE.CanvasTexture(c);
    tex.mapping = THREE.EquirectangularReflectionMapping;
    tex.encoding = THREE.sRGBEncoding;
    return tex;
  }

  /* ── three setup ─────────────────────────────────────────── */

  function initThree() {
    renderer = new THREE.WebGLRenderer({
      canvas: dom.canvas,
      antialias: true,
      alpha: true,
      powerPreference: 'high-performance'
    });
    renderer.setPixelRatio(Math.min(2, window.devicePixelRatio || 1));
    renderer.setSize(window.innerWidth, window.innerHeight, false);
    renderer.setClearColor(0x000000, 0);
    renderer.outputEncoding = THREE.sRGBEncoding;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 0.92;
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;

    scene = new THREE.Scene();
    scene.fog = new THREE.Fog(0xc7b4a2, 120, 1400);

    camera = new THREE.PerspectiveCamera(62, window.innerWidth / window.innerHeight, 0.08, 1200);
    camera.position.set(-7, 4, 0);

    applyTrailConfig();
    applyTrailSky();

    hemiLight = new THREE.HemisphereLight(0x9db9d8, 0x30342a, 0.46);
    scene.add(hemiLight);

    sunLight = new THREE.DirectionalLight(0xffbe7a, 2.05);
    sunLight.position.set(-64, 40, 50);
    sunLight.castShadow = true;
    sunLight.shadow.mapSize.set(window.innerWidth < 820 ? 1024 : 2048, window.innerWidth < 820 ? 1024 : 2048);
    const sc = sunLight.shadow.camera;
    sc.left = -48;
    sc.right = 48;
    sc.top = 48;
    sc.bottom = -48;
    sc.near = 1;
    sc.far = 190;
    sunLight.shadow.bias = -0.0004;
    sunLight.shadow.normalBias = 0.025;
    scene.add(sunLight);
    scene.add(sunLight.target);

    fillLight = new THREE.DirectionalLight(0x8fb4d6, 0.22);
    fillLight.position.set(50, 30, 60);
    scene.add(fillLight);

    initTextures();
    M.trail = texMaterial('trail', {
      normalScale: new THREE.Vector2(0.95, 0.95),
      envMapIntensity: 0.5
    });
    M.grass = texMaterial('grass', {
      color: 0xa9b596,
      normalScale: new THREE.Vector2(0.8, 0.8),
      envMapIntensity: 0.4
    });
    M.rock = texMaterial('rock', {
      normalScale: new THREE.Vector2(1, 1),
      envMapIntensity: 0.5
    });
    M.bark = texMaterial('bark', {
      normalScale: new THREE.Vector2(1, 1),
      envMapIntensity: 0.3
    });
    M.foliage = texMaterial('foliage', {
      normalScale: new THREE.Vector2(0.7, 0.7),
      envMapIntensity: 0.35
    });

    M.frame = new THREE.MeshStandardMaterial({
      color: new THREE.Color(game.playerColor || '#ff8a2a'),
      roughness: 0.38,
      metalness: 0.28
    });
    M.accent = new THREE.MeshStandardMaterial({
      color: 0xffcf6b,
      roughness: 0.42,
      metalness: 0.3
    });
    M.dark = new THREE.MeshStandardMaterial({ color: 0x17130e, roughness: 0.86, metalness: 0.2 });
    M.tire = new THREE.MeshStandardMaterial({ color: 0x15120e, roughness: 0.96 });
    M.rim = new THREE.MeshStandardMaterial({ color: 0xd6ceb9, roughness: 0.35, metalness: 0.55 });
    M.jersey = new THREE.MeshStandardMaterial({ color: 0x216d72, roughness: 0.82 });
    M.helmet = new THREE.MeshStandardMaterial({ color: 0xf2e7cd, roughness: 0.5 });
    M.skin = new THREE.MeshStandardMaterial({ color: 0xc98e66, roughness: 0.9 });
    M.pants = new THREE.MeshStandardMaterial({ color: 0x151b17, roughness: 0.95 });
    M.shoe = new THREE.MeshStandardMaterial({ color: 0x0d0b09, roughness: 0.9 });
    M.flag = new THREE.MeshStandardMaterial({ color: 0xff8a2a, roughness: 0.75 });
    M.flag2 = new THREE.MeshStandardMaterial({ color: 0xf7f1e1, roughness: 0.75 });

    applyWind(M.foliage, 0.05);
    applyTrailTheme();
    applyGarageLook();
    if (window.SENDIT_GARAGE) {
      window.SENDIT_GARAGE.onChange = (sel) => {
        const prev = TRAIL && TRAIL.id;
        applyGarageLook();
        if (sel && sel.trail && sel.trail.id !== prev) {
          applyTrailConfig(sel.trail);
          applyTrailTheme();
          applyTrailSky();
          if (S.active) resetRide(true);
        }
      };
    }

    createBike();
    initDust();
    initRain();
    if (bikeRoot) {
      bikeRoot.traverse((o) => {
        if (o.isMesh) {
          o.castShadow = true;
          o.receiveShadow = true;
        }
      });
    }
    window.addEventListener('resize', onResize);
  }

  function onResize() {
    if (!renderer) return;
    renderer.setPixelRatio(Math.min(2, window.devicePixelRatio || 1));
    renderer.setSize(window.innerWidth, window.innerHeight, false);
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
  }

  function disposeGroup(group) {
    if (!group) return;
    group.traverse((obj) => {
      if (obj.geometry) obj.geometry.dispose();
      if (obj.material) {
        if (Array.isArray(obj.material)) obj.material.forEach((m) => m.dispose());
        else obj.material.dispose();
      }
    });
    scene.remove(group);
  }

  function terrainNormalAt(x, u, out) {
    const e = 0.4;
    const fx = (terrainY(x + e) - terrainY(x - e)) / (2 * e);
    const fu = (sideY(u + e) - sideY(u - e)) / (2 * e);
    const dz = pathDZ(x);
    return out.set(-fx + dz * fu, 1, -fu).normalize();
  }

  function initDust() {
    const c = document.createElement('canvas');
    c.width = 64;
    c.height = 64;
    const g = c.getContext('2d');
    const grad = g.createRadialGradient(32, 32, 1, 32, 32, 31);
    grad.addColorStop(0, 'rgba(255,255,255,0.85)');
    grad.addColorStop(0.4, 'rgba(255,255,255,0.34)');
    grad.addColorStop(1, 'rgba(255,255,255,0)');
    g.fillStyle = grad;
    g.fillRect(0, 0, 64, 64);
    const tex = new THREE.CanvasTexture(c);

    const geo = new THREE.BufferGeometry();
    const pos = new Float32Array(DUST_MAX * 3);
    const alpha = new Float32Array(DUST_MAX);
    const size = new Float32Array(DUST_MAX);
    for (let i = 0; i < DUST_MAX; i++) {
      pos[i * 3 + 1] = -1000;
      dustParts.push({ life: 0, maxLife: 1, x: 0, y: -1000, z: 0, vx: 0, vy: 0, vz: 0, size: 0 });
    }
    geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    geo.setAttribute('alpha', new THREE.BufferAttribute(alpha, 1));
    geo.setAttribute('size', new THREE.BufferAttribute(size, 1));
    const mat = new THREE.ShaderMaterial({
      uniforms: {
        map: { value: tex },
        tint: { value: new THREE.Color(0x8f7a5f) }
      },
      vertexShader: `
        attribute float alpha;
        attribute float size;
        varying float vA;
        void main() {
          vA = alpha;
          vec4 mv = modelViewMatrix * vec4(position, 1.0);
          gl_PointSize = clamp(size * (420.0 / max(1.0, -mv.z)), 1.0, 84.0);
          gl_Position = projectionMatrix * mv;
        }
      `,
      fragmentShader: `
        uniform sampler2D map;
        uniform vec3 tint;
        varying float vA;
        void main() {
          vec4 t = texture2D(map, gl_PointCoord);
          gl_FragColor = vec4(tint, t.a * vA);
        }
      `,
      transparent: true,
      depthWrite: false,
      blending: THREE.NormalBlending
    });
    dust = new THREE.Points(geo, mat);
    dust.frustumCulled = false;
    dust.renderOrder = 2;
    scene.add(dust);
  }

  function spawnDust(x, y, z, count, power) {
    if (!dust) return;
    for (let i = 0; i < count; i++) {
      const p = dustParts[dustCursor];
      dustCursor = (dustCursor + 1) % DUST_MAX;
      p.maxLife = p.life = 0.5 + Math.random() * 0.75;
      p.x = x + (Math.random() - 0.5) * 0.6;
      p.y = y + Math.random() * 0.3;
      p.z = z + (Math.random() - 0.5) * 0.6;
      p.vx = (Math.random() - 0.5) * 1.2 - 1.1 * power;
      p.vy = 0.4 + Math.random() * 1.1;
      p.vz = (Math.random() - 0.5) * 1.5;
      p.size = 0.32 + Math.random() * 0.42;
    }
  }

  function updateDust(dt) {
    if (!dust) return;
    const b = S.bike;
    dustTimer -= dt;
    if (S.mode === 'playing' && b && b.onGround && b.vx > 7 && dustTimer <= 0) {
      dustTimer = 0.05;
      spawnDust(b.x - 0.9, b.y + 0.12, b.z, 2, 1);
    }
    const pos = dust.geometry.attributes.position.array;
    const alpha = dust.geometry.attributes.alpha.array;
    const size = dust.geometry.attributes.size.array;
    for (let i = 0; i < DUST_MAX; i++) {
      const p = dustParts[i];
      if (p.life <= 0) {
        alpha[i] = 0;
        size[i] = 0;
        continue;
      }
      p.life -= dt;
      const t = Math.max(0, p.life / p.maxLife);
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.z += p.vz * dt;
      p.vy -= 1.5 * dt;
      p.vx *= 0.97;
      p.vz *= 0.97;
      pos[i * 3] = p.x;
      pos[i * 3 + 1] = p.y;
      pos[i * 3 + 2] = p.z;
      alpha[i] = t * t * 0.58;
      size[i] = p.size * (1 + (1 - t) * 2.1);
    }
    dust.geometry.attributes.position.needsUpdate = true;
    dust.geometry.attributes.alpha.needsUpdate = true;
    dust.geometry.attributes.size.needsUpdate = true;
  }

  function initRain() {
    const count = 240;
    const positions = new Float32Array(count * 2 * 3);
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    const mat = new THREE.LineBasicMaterial({
      color: 0xb9ccd8,
      transparent: true,
      opacity: 0.34,
      depthWrite: false,
      fog: true
    });
    rain = new THREE.LineSegments(geo, mat);
    rain.frustumCulled = false;
    rain.visible = false;
    rain.userData.drops = [];
    for (let i = 0; i < count; i++) {
      rain.userData.drops.push({ x: 0, y: 0, z: 0, speed: 18 + Math.random() * 16 });
      positions[i * 6 + 1] = -1000;
    }
    scene.add(rain);
  }

  function updateRain(dt) {
    if (!rain) return;
    const active = TRAIL && TRAIL.rain;
    rain.visible = !!active;
    if (!active) return;
    const cam = camera.position;
    const pos = rain.geometry.attributes.position.array;
    const drops = rain.userData.drops;
    if (rainDirty) {
      for (const d of drops) {
        d.x = cam.x + (Math.random() - 0.5) * 58;
        d.y = cam.y + Math.random() * 32 - 10;
        d.z = cam.z + (Math.random() - 0.5) * 58;
      }
      rainDirty = false;
    }
    for (let i = 0; i < drops.length; i++) {
      const d = drops[i];
      d.y -= d.speed * dt;
      d.x += 3.5 * dt;
      if (d.y < cam.y - 16) {
        d.y = cam.y + 16 + Math.random() * 12;
        d.x = cam.x + (Math.random() - 0.5) * 58;
        d.z = cam.z + (Math.random() - 0.5) * 58;
      }
      if (d.x > cam.x + 30) d.x -= 60;
      if (d.x < cam.x - 30) d.x += 60;
      if (d.z > cam.z + 30) d.z -= 60;
      if (d.z < cam.z - 30) d.z += 60;
      const o = i * 6;
      pos[o] = d.x;
      pos[o + 1] = d.y;
      pos[o + 2] = d.z;
      pos[o + 3] = d.x + 0.06;
      pos[o + 4] = d.y + 0.92;
      pos[o + 5] = d.z;
    }
    rain.geometry.attributes.position.needsUpdate = true;
  }

  function buildRibbon(u0, u1, cols, material, uvScale, kind) {
    const xStart = -30;
    const rows = Math.floor((MAX_X - xStart) / STEP_X) + 1;
    const positions = new Float32Array(rows * cols * 3);
    const normals = new Float32Array(rows * cols * 3);
    const uvs = new Float32Array(rows * cols * 2);
    const colors = new Float32Array(rows * cols * 3);
    const n = new THREE.Vector3();
    let p = 0, q = 0, t = 0, c = 0;
    for (let i = 0; i < rows; i++) {
      const x = xStart + i * STEP_X;
      const base = terrainY(x);
      const z0 = pathZ(x);
      for (let j = 0; j < cols; j++) {
        const u = u0 + ((u1 - u0) * j) / (cols - 1);
        positions[p++] = x;
        positions[p++] = base + sideY(u);
        positions[p++] = z0 + u;
        terrainNormalAt(x, u, n);
        normals[p - 3] = n.x;
        normals[p - 2] = n.y;
        normals[p - 1] = n.z;
        uvs[q++] = x / uvScale;
        uvs[q++] = u / uvScale;
        const v = 0.78 + hash(x * 0.53 + u * 1.17 + 3.1) * 0.3;
        colors[c++] = kind === 'trail' ? v : v * 0.98;
        colors[c++] = v;
        colors[c++] = kind === 'rock' ? v : v * 0.94;
      }
    }
    const indices = [];
    for (let i = 0; i < rows - 1; i++) {
      for (let j = 0; j < cols - 1; j++) {
        const a = i * cols + j;
        const b = a + 1;
        const d = (i + 1) * cols + j;
        const e = d + 1;
        indices.push(a, b, d);
        indices.push(b, e, d);
      }
    }
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geo.setAttribute('normal', new THREE.BufferAttribute(normals, 3));
    geo.setAttribute('uv', new THREE.BufferAttribute(uvs, 2));
    geo.setAttribute('color', new THREE.BufferAttribute(colors, 3));
    geo.setIndex(indices);
    const mesh = new THREE.Mesh(geo, material);
    mesh.receiveShadow = true;
    worldGroup.add(mesh);
  }

  function buildWorld(seed) {
    if (worldGroup) disposeGroup(worldGroup);
    worldGroup = new THREE.Group();
    scene.add(worldGroup);

    const profile = new Terrain(seed);
    profile.extendTo(MAX_X * 40 + 5000);
    S.world = { seed, profile, trailId: TRAIL && TRAIL.id };

    // PBR terrain built as textured ribbons: singletrack, grass shoulders, rock slopes.
    const trailMat = M.trail.clone();
    trailMat.vertexColors = true;
    const grassMat = M.grass.clone();
    grassMat.vertexColors = true;
    const rockMat = M.rock.clone();
    rockMat.vertexColors = true;

    buildRibbon(-6.8, 6.8, 10, trailMat, 2.8, 'trail');
    buildRibbon(-26, -6.8, 12, grassMat, 3.0, 'grass');
    buildRibbon(6.8, 26, 12, grassMat, 3.0, 'grass');
    buildRibbon(-90, -26, 14, rockMat, 6, 'rock');
    buildRibbon(26, 90, 14, rockMat, 6, 'rock');
    buildEdgeStrip(-7.8, -6.1);
    buildEdgeStrip(6.1, 7.8);

    addTrees();
    addRocks();
    addMarkers();
    addMountains();
    addGates();
    addFinishGate();
    addRut();
    addTufts();
    addGrassTufts();
  }

  function makeTreeTexture() {
    if (treeTexture) return treeTexture;
    const c = document.createElement('canvas');
    c.width = 512;
    c.height = 1024;
    const g = c.getContext('2d');
    let seed = 1337;
    const rnd = () => {
      seed = (seed * 1664525 + 1013904223) >>> 0;
      return seed / 4294967296;
    };
    g.lineCap = 'round';

    const trunk = g.createLinearGradient(236, 0, 276, 0);
    trunk.addColorStop(0, '#241b12');
    trunk.addColorStop(0.45, '#433325');
    trunk.addColorStop(0.7, '#57422e');
    trunk.addColorStop(1, '#221a12');
    g.fillStyle = trunk;
    g.beginPath();
    g.moveTo(240, 1024);
    g.lineTo(250, 92);
    g.lineTo(262, 92);
    g.lineTo(274, 1024);
    g.closePath();
    g.fill();

    const topY = 74;
    const bottomY = 1000;
    const levels = 86;
    for (let i = 0; i < levels; i++) {
      const t = i / (levels - 1);
      const y = topY + t * (bottomY - topY);
      const maxHalf = 8 + Math.pow(t, 0.92) * 242;
      const n = 7 + Math.floor(t * 16);
      for (let k = 0; k < n; k++) {
        const side = k % 2 ? 1 : -1;
        const len = maxHalf * (0.42 + rnd() * 0.72) * (0.72 + (1 - Math.abs(k / n - 0.5)) * 0.4);
        const ex = 256 + side * len;
        const ey = y + 10 + rnd() * (18 + t * 42);
        const glow = 0.18 + rnd() * 0.42 + (1 - t) * 0.08;
        const r = Math.round(18 + glow * 64);
        const gr = Math.round(52 + glow * 78);
        const b = Math.round(30 + glow * 48);
        g.strokeStyle = `rgb(${r},${gr},${b})`;
        g.lineWidth = 0.9 + rnd() * 2.1;
        g.beginPath();
        g.moveTo(256 + side * (2 + rnd() * 5), y);
        g.quadraticCurveTo(256 + side * len * 0.45, y + 5 + rnd() * 8, ex, ey);
        g.stroke();
        for (let j = 0; j < 7; j++) {
          const tt = 0.25 + rnd() * 0.75;
          const bx = 256 + (ex - 256) * tt;
          const by = y + (ey - y) * tt;
          g.strokeStyle = `rgb(${r + 8},${gr + 10},${b + 6})`;
          g.lineWidth = 0.6 + rnd() * 1.4;
          g.beginPath();
          g.moveTo(bx, by);
          g.lineTo(bx + (rnd() - 0.5) * 11, by + 4 + rnd() * 11);
          g.stroke();
        }
      }
    }

    // sunlit rim on one side
    g.globalCompositeOperation = 'source-atop';
    const rim = g.createLinearGradient(210, 0, 470, 0);
    rim.addColorStop(0, 'rgba(255,205,140,0)');
    rim.addColorStop(0.75, 'rgba(255,205,140,0.08)');
    rim.addColorStop(1, 'rgba(255,225,170,0.28)');
    g.fillStyle = rim;
    g.fillRect(0, 0, 512, 1024);
    g.globalCompositeOperation = 'source-over';

    const tex = new THREE.CanvasTexture(c);
    tex.encoding = THREE.sRGBEncoding;
    tex.anisotropy = 8;
    treeTexture = tex;
    return tex;
  }

  function crossPlaneGeometry(w, h, planes) {
    const geos = [];
    for (let i = 0; i < planes; i++) {
      const plane = new THREE.PlaneGeometry(w, h);
      plane.rotateY((i * Math.PI) / planes);
      plane.translate(0, h / 2, 0);
      geos.push(plane);
    }
    const pos = [];
    const nor = [];
    const uv = [];
    const idx = [];
    let base = 0;
    for (const geo of geos) {
      const p = geo.attributes.position;
      const n = geo.attributes.normal;
      const t = geo.attributes.uv;
      for (let i = 0; i < p.count; i++) {
        pos.push(p.getX(i), p.getY(i), p.getZ(i));
        nor.push(n.getX(i), n.getY(i), n.getZ(i));
        uv.push(t.getX(i), t.getY(i));
      }
      const ix = geo.index.array;
      for (let i = 0; i < ix.length; i++) idx.push(ix[i] + base);
      base += p.count;
      geo.dispose();
    }
    const merged = new THREE.BufferGeometry();
    merged.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
    merged.setAttribute('normal', new THREE.Float32BufferAttribute(nor, 3));
    merged.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
    merged.setIndex(idx);
    return merged;
  }

  function addTrees() {
    const trees = [];
    const treeDensity = (TRAIL && TRAIL.trees) || 1;
    for (let x = 8; x < MAX_X; x += 5.2 / treeDensity) {
      for (const side of [-1, 1]) {
        const h = hash(x * 0.131 + side * 17.3);
        if (h < 0.31 / Math.min(1.6, treeDensity)) continue;
        const u = side * (10.5 + hash(x * 0.217 + side * 5.1) * 31);
        const y = terrainY(x) + sideY(u);
        const s = 0.6 + hash(x * 0.071 + side * 3.3) * 0.95;
        trees.push({
          x,
          y,
          z: pathZ(x) + u,
          rot: hash(x * 0.19 + side * 8.1) * TAU,
          s,
          shade: hash(x * 0.31 + side * 2.7)
        });
      }
    }
    const count = trees.length;
    if (!count) return;

    const geo = crossPlaneGeometry(6.4, 11.6, 3);
    const tex = makeTreeTexture();
    const leafMat = new THREE.MeshStandardMaterial({
      map: tex,
      color: new THREE.Color((TRAIL && TRAIL.leafTint) || '#d8d3c4'),
      alphaTest: 0.32,
      side: THREE.DoubleSide,
      roughness: 0.98,
      metalness: 0,
      envMapIntensity: 0.25
    });
    applyWind(leafMat, 0.014);
    const mesh = new THREE.InstancedMesh(geo, leafMat, count);
    const dummy = new THREE.Object3D();
    const leafColors = [
      new THREE.Color('#a5b39a'),
      new THREE.Color('#8f9e86'),
      new THREE.Color('#b8c3aa'),
      new THREE.Color('#7f8f79')
    ];
    for (let i = 0; i < count; i++) {
      const t = trees[i];
      dummy.position.set(t.x, t.y, t.z);
      dummy.rotation.set(0, t.rot, 0);
      dummy.scale.set(t.s, t.s, t.s);
      dummy.updateMatrix();
      mesh.setMatrixAt(i, dummy.matrix);
      const col = leafColors[(t.shade * leafColors.length) | 0];
      mesh.setColorAt(i, col);
    }
    mesh.instanceMatrix.needsUpdate = true;
    if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    mesh.customDepthMaterial = new THREE.MeshDepthMaterial({
      depthPacking: THREE.RGBADepthPacking,
      map: tex,
      alphaTest: 0.32
    });
    worldGroup.add(mesh);
  }

  function addRocks() {
    const count = 95;
    const geo = new THREE.DodecahedronGeometry(1, 1);
    const mat = texMaterial('rock', { roughness: 1, envMapIntensity: 0.4 });
    const mesh = new THREE.InstancedMesh(geo, mat, count);
    const dummy = new THREE.Object3D();
    const colors = [new THREE.Color('#cfc7b8'), new THREE.Color('#bdb4a4'), new THREE.Color('#e0d8c8')];
    let n = 0;
    for (let i = 0; i < count * 3 && n < count; i++) {
      const x = 10 + hash(i * 3.3) * (MAX_X - 20);
      const side = hash(i * 5.7) > 0.5 ? 1 : -1;
      const edge = i % 5 === 0;
      const u = side * (edge ? 4.4 + hash(i * 7.1) * 2.8 : 10.5 + hash(i * 7.1) * 24);
      const s = edge ? 0.22 + hash(i * 9.2) * 0.55 : 0.3 + hash(i * 9.2) * 1.5;
      dummy.position.set(x, terrainY(x) + sideY(u) + s * 0.35, pathZ(x) + u);
      dummy.rotation.set(hash(i) * 2, hash(i + 2) * 6, hash(i + 4));
      dummy.scale.set(s, s * (0.6 + hash(i + 1) * 0.7), s);
      dummy.updateMatrix();
      mesh.setMatrixAt(n, dummy.matrix);
      mesh.setColorAt(n, colors[(hash(i + 5) * colors.length) | 0]);
      n++;
    }
    mesh.count = n;
    mesh.instanceMatrix.needsUpdate = true;
    if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    worldGroup.add(mesh);
  }

  function addMarkers() {
    const positions = [];
    for (let x = 26; x < MAX_X - 20; x += 36) {
      positions.push({ x, side: -1 }, { x, side: 1 });
    }
    const count = positions.length;
    if (!count) return;

    const poleGeo = new THREE.CylinderGeometry(0.045, 0.07, 1.55, 5);
    poleGeo.translate(0, 0.775, 0);
    const flagGeo = new THREE.BoxGeometry(0.75, 0.34, 0.04);
    flagGeo.translate(0.37, 1.35, 0);

    const poleMat = texMaterial('bark', { roughness: 0.95, envMapIntensity: 0.2 });
    const flagMat = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.7 });
    const poles = new THREE.InstancedMesh(poleGeo, poleMat, count);
    const flags = new THREE.InstancedMesh(flagGeo, flagMat, count);
    const dummy = new THREE.Object3D();
    const colors = [new THREE.Color('#ff8a2a'), new THREE.Color('#f7f1e1'), new THREE.Color('#ffcf6b')];

    for (let i = 0; i < count; i++) {
      const p = positions[i];
      const u = p.side * 9.3;
      const y = terrainY(p.x) + sideY(u);
      const z = pathZ(p.x) + u;
      const yaw = -Math.atan(pathDZ(p.x)) + (p.side > 0 ? Math.PI : 0);
      dummy.position.set(p.x, y, z);
      dummy.rotation.set(0, yaw, 0);
      dummy.scale.setScalar(1);
      dummy.updateMatrix();
      poles.setMatrixAt(i, dummy.matrix);
      flags.setMatrixAt(i, dummy.matrix);
      flags.setColorAt(i, colors[i % colors.length]);
    }
    poles.instanceMatrix.needsUpdate = true;
    flags.instanceMatrix.needsUpdate = true;
    if (flags.instanceColor) flags.instanceColor.needsUpdate = true;
    poles.castShadow = true;
    flags.castShadow = true;
    worldGroup.add(poles, flags);
  }

  function addMountains() {
    const layers = [
      { dist: 260, h: 46, amp: 26, seed: 2.2, base: -90, bot: '#202923', mid: '#2b352d', rock: '#374238', top: '#3f4a40', snow: false },
      { dist: 430, h: 118, amp: 52, seed: 1.4, base: -120, bot: '#2b353b', mid: '#3c474e', rock: '#505b62', top: '#525d64', snow: false },
      { dist: 780, h: 195, amp: 82, seed: 4.1, base: -180, bot: '#435059', mid: '#55616a', rock: '#68747c', top: '#6d7981', snow: false },
      { dist: 1250, h: 300, amp: 120, seed: 8.3, base: -250, bot: '#67747d', mid: '#77848c', rock: '#8d999f', top: '#b9c3c5' }
    ];
    for (const L of layers) {
      const peaks = [];
      for (let i = 0; i < 12; i++) {
        peaks.push({
          c: -500 + hash(i * 7.7 + L.seed * 13) * (MAX_X + 1000),
          w: 26 + hash(i * 3.1 + L.seed) * 62,
          h: L.amp * (0.6 + hash(i * 9.3 + L.seed * 2) * 1.15)
        });
      }
      for (const side of [-1, 1]) {
        const positions = [];
        const colors = [];
        const indices = [];
        let n = 0;
        for (let x = -600; x <= MAX_X + 600; x += 12) {
          const dist = L.dist + Math.sin(x / 280 + side * 1.3) * 80;
          const z = pathZ(x) + side * dist;
          const baseY = terrainY(x) + L.base;
          let peak = 0;
          for (const p of peaks) {
            const d = (x - p.c) / p.w;
            peak += p.h * Math.exp(-d * d);
          }
          const topY =
            terrainY(x) +
            L.h +
            Math.sin(x / 240 + side * L.seed) * L.amp * 0.28 +
            Math.sin(x / 55 + side * 2.3) * L.amp * 0.16 +
            peak;
          const midY = baseY + (topY - baseY) * 0.55;
          const rockY = baseY + (topY - baseY) * 0.9;
          positions.push(x, baseY, z, x, midY, z, x, rockY, z, x, topY, z);
          const shade = 0.74 + hash(x * 0.031 + side * 11.7) * 0.36;
          const bot = new THREE.Color(L.bot);
          const mid = new THREE.Color(L.mid).multiplyScalar(shade);
          const rock = new THREE.Color(L.rock).multiplyScalar(shade);
          const snowy = L.snow !== false && topY > terrainY(x) + L.h + L.amp * 0.42;
          const top = new THREE.Color(snowy ? L.top : L.rock).multiplyScalar(
            snowy ? 0.82 + hash(x * 0.09 + side * 4.3) * 0.24 : shade
          );
          colors.push(
            bot.r, bot.g, bot.b,
            mid.r, mid.g, mid.b,
            rock.r, rock.g, rock.b,
            top.r, top.g, top.b
          );
          if (n > 0) {
            const a = (n - 1) * 4;
            const b = a + 1;
            const c = a + 2;
            const d = a + 3;
            const e = n * 4;
            const f = e + 1;
            const g = e + 2;
            const h = e + 3;
            indices.push(a, e, b, b, e, f);
            indices.push(b, f, c, c, f, g);
            indices.push(c, g, d, d, g, h);
          }
          n++;
        }
        const geo = new THREE.BufferGeometry();
        geo.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
        geo.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));
        geo.setIndex(indices);
        const mat = new THREE.MeshBasicMaterial({
          vertexColors: true,
          color: new THREE.Color((TRAIL && TRAIL.mountainTint) || '#ffffff'),
          side: THREE.DoubleSide,
          fog: false
        });
        worldGroup.add(new THREE.Mesh(geo, mat));
      }
    }
  }

  function addRut() {
    const positions = [];
    const indices = [];
    let n = 0;
    for (let x = 0; x <= MAX_X; x += 3) {
      const y = terrainY(x) + 0.035;
      const z = pathZ(x);
      positions.push(x, y, z - 0.28, x, y, z + 0.28);
      if (n > 0) {
        const a = (n - 1) * 2;
        const b = a + 1;
        const c = n * 2;
        const d = c + 1;
        indices.push(a, c, b, b, c, d);
      }
      n++;
    }
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
    geo.setIndex(indices);
    const mat = new THREE.MeshBasicMaterial({
      color: 0x2a1a0e,
      transparent: true,
      opacity: 0.18,
      depthWrite: false,
      side: THREE.DoubleSide,
      fog: true
    });
    const mesh = new THREE.Mesh(geo, mat);
    mesh.renderOrder = 1;
    worldGroup.add(mesh);
  }

  function addTufts() {
    const bushes = [];
    for (let x = 6; x < MAX_X; x += 7.5) {
      for (const side of [-1, 1]) {
        if (hash(x * 0.071 + side * 4.8) < 0.38) continue;
        const u = side * (9.4 + hash(x * 0.113 + side * 3.2) * 3.8);
        const y = terrainY(x) + sideY(u);
        bushes.push({ x, y, z: pathZ(x) + u, s: 0.7 + hash(x * 0.19 + side) * 0.9 });
      }
    }
    const count = bushes.length;
    if (!count) return;
    const geo = new THREE.IcosahedronGeometry(0.42, 1);
    const mat = texMaterial('foliage', { roughness: 0.95, envMapIntensity: 0.25 });
    const mesh = new THREE.InstancedMesh(geo, mat, count);
    const dummy = new THREE.Object3D();
    const colors = [new THREE.Color('#a8c48e'), new THREE.Color('#bdd3a0'), new THREE.Color('#94b57c')];
    for (let i = 0; i < count; i++) {
      const b = bushes[i];
      dummy.position.set(b.x, b.y + b.s * 0.18, b.z);
      dummy.rotation.set(0, hash(b.x) * TAU, 0);
      dummy.scale.set(b.s * 1.15, b.s * 0.62, b.s);
      dummy.updateMatrix();
      mesh.setMatrixAt(i, dummy.matrix);
      mesh.setColorAt(i, colors[i % colors.length]);
    }
    mesh.instanceMatrix.needsUpdate = true;
    if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    worldGroup.add(mesh);
  }

  function makeGrassTexture() {
    if (grassTexture) return grassTexture;
    const c = document.createElement('canvas');
    c.width = 128;
    c.height = 128;
    const g = c.getContext('2d');
    g.lineCap = 'round';
    let seed = 4242;
    const rnd = () => {
      seed = (seed * 1664525 + 1013904223) >>> 0;
      return seed / 4294967296;
    };
    for (let i = 0; i < 120; i++) {
      const x0 = 64 + (rnd() - 0.5) * 20;
      const y0 = 130;
      const x1 = 64 + (rnd() - 0.5) * 56;
      const y1 = 26 + rnd() * 66;
      const cx = 64 + (rnd() - 0.5) * 26;
      const cy = y0 - (y0 - y1) * (0.4 + rnd() * 0.25);
      const shade = rnd();
      const r = Math.round(36 + shade * 40);
      const gr = Math.round(66 + shade * 48);
      const b = Math.round(28 + shade * 26);
      g.strokeStyle = `rgb(${r},${gr},${b})`;
      g.lineWidth = 0.8 + rnd() * 1.6;
      g.beginPath();
      g.moveTo(x0, y0);
      g.quadraticCurveTo(cx, cy, x1, y1);
      g.stroke();
      if (rnd() > 0.82) {
        g.fillStyle = `rgb(${r + 16},${gr + 14},${b + 8})`;
        g.beginPath();
        g.ellipse(x1, y1, 1.2 + rnd() * 1.1, 2.6 + rnd() * 2.6, (rnd() - 0.5) * 0.6, 0, TAU);
        g.fill();
      }
    }
    const tex = new THREE.CanvasTexture(c);
    tex.encoding = THREE.sRGBEncoding;
    tex.anisotropy = 8;
    grassTexture = tex;
    return tex;
  }

  function makeGrassEdgeAlpha() {
    if (grassEdgeAlpha) return grassEdgeAlpha;
    const c = document.createElement('canvas');
    c.width = 8;
    c.height = 64;
    const g = c.getContext('2d');
    const grad = g.createLinearGradient(0, 0, 0, 64);
    grad.addColorStop(0, '#ffffff');
    grad.addColorStop(0.45, '#cfcfcf');
    grad.addColorStop(1, '#000000');
    g.fillStyle = grad;
    g.fillRect(0, 0, 8, 64);
    const tex = new THREE.CanvasTexture(c);
    tex.wrapS = THREE.RepeatWrapping;
    tex.wrapT = THREE.ClampToEdgeWrapping;
    tex.minFilter = THREE.LinearFilter;
    tex.magFilter = THREE.LinearFilter;
    grassEdgeAlpha = tex;
    return tex;
  }

  function buildEdgeStrip(u0, u1) {
    const xStart = -30;
    const rows = Math.floor((MAX_X - xStart) / STEP_X) + 1;
    const cols = 4;
    const positions = new Float32Array(rows * cols * 3);
    const normals = new Float32Array(rows * cols * 3);
    const uvs = new Float32Array(rows * cols * 2);
    const n = new THREE.Vector3();
    let p = 0;
    let q = 0;
    for (let i = 0; i < rows; i++) {
      const x = xStart + i * STEP_X;
      const base = terrainY(x);
      const z0 = pathZ(x);
      for (let j = 0; j < cols; j++) {
        const u = u0 + ((u1 - u0) * j) / (cols - 1);
        positions[p++] = x;
        positions[p++] = base + sideY(u) + 0.02;
        positions[p++] = z0 + u;
        terrainNormalAt(x, u, n);
        normals[p - 3] = n.x;
        normals[p - 2] = n.y;
        normals[p - 1] = n.z;
        const v = clamp((Math.abs(u) - 6.1) / 1.7, 0, 1);
        uvs[q++] = x / 2.8;
        uvs[q++] = v;
      }
    }
    const indices = [];
    for (let i = 0; i < rows - 1; i++) {
      for (let j = 0; j < cols - 1; j++) {
        const a = i * cols + j;
        const b = a + 1;
        const d = (i + 1) * cols + j;
        const e = d + 1;
        indices.push(a, b, d, b, e, d);
      }
    }
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geo.setAttribute('normal', new THREE.BufferAttribute(normals, 3));
    geo.setAttribute('uv', new THREE.BufferAttribute(uvs, 2));
    geo.setIndex(indices);
    const mat = M.grass.clone();
    mat.vertexColors = false;
    mat.alphaMap = makeGrassEdgeAlpha();
    mat.transparent = true;
    mat.depthWrite = false;
    const mesh = new THREE.Mesh(geo, mat);
    mesh.receiveShadow = true;
    mesh.renderOrder = 1;
    worldGroup.add(mesh);
  }

  function addGrassTufts() {
    const items = [];
    for (let x = 4; x < MAX_X; x += 1.9) {
      for (const side of [-1, 1]) {
        if (hash(x * 0.17 + side * 4.2) < 0.18) continue;
        const u = side * (6.9 + Math.pow(hash(x * 0.29 + side * 2.7), 1.7) * 16);
        const y = terrainY(x) + sideY(u);
        items.push({
          x,
          y,
          z: pathZ(x) + u,
          s: 0.45 + hash(x * 0.41 + side * 6.3) * 0.6,
          rot: hash(x * 0.23 + side * 9.1) * TAU
        });
      }
    }
    const count = items.length;
    if (!count) return;
    const geo = crossPlaneGeometry(0.58, 0.4, 2);
    const mat = new THREE.MeshStandardMaterial({
      map: makeGrassTexture(),
      alphaTest: 0.3,
      side: THREE.DoubleSide,
      roughness: 1,
      metalness: 0,
      envMapIntensity: 0.2
    });
    applyWind(mat, 0.05);
    const mesh = new THREE.InstancedMesh(geo, mat, count);
    const dummy = new THREE.Object3D();
    const cols = [new THREE.Color('#c3c9a6'), new THREE.Color('#a8b58b'), new THREE.Color('#d3d6b2'), new THREE.Color('#94a67d')];
    for (let i = 0; i < count; i++) {
      const it = items[i];
      dummy.position.set(it.x, it.y + 0.01, it.z);
      dummy.rotation.set(0, it.rot, 0);
      dummy.scale.set(it.s, it.s, it.s);
      dummy.updateMatrix();
      mesh.setMatrixAt(i, dummy.matrix);
      mesh.setColorAt(i, cols[(hash(it.x * 0.7 + it.z) * cols.length) | 0]);
    }
    mesh.instanceMatrix.needsUpdate = true;
    if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
    mesh.receiveShadow = true;
    worldGroup.add(mesh);
  }

  function addGates() {
    S.gates = [];
    const gateGeo = new THREE.TorusGeometry(2.65, 0.14, 6, 24);
    const offsets = [0, -3.6, 3.6];
    let i = 0;
    for (let x = 95; x < MAX_X - 40; x += 170) {
      const offset = offsets[i % offsets.length];
      const y = terrainY(x) + 2.25;
      const z = pathZ(x) + offset;
      const mat = new THREE.MeshStandardMaterial({
        color: 0xffcf6b,
        emissive: 0xff7a1f,
        emissiveIntensity: 0.28,
        roughness: 0.42,
        metalness: 0.22
      });
      const mesh = new THREE.Mesh(gateGeo, mat);
      mesh.position.set(x, y, z);
      mesh.rotation.y = Math.PI / 2;
      mesh.castShadow = true;
      worldGroup.add(mesh);
      S.gates.push({ x, z, y, mesh, passed: false });
      i++;
    }
  }

  function addFinishGate() {
    const x = MAX_X - 25;
    const z = pathZ(x);
    const y = terrainY(x);
    const poleMat = texMaterial('bark', { roughness: 0.9, envMapIntensity: 0.2 });
    const poleGeo = new THREE.CylinderGeometry(0.14, 0.22, 7.4, 7);
    poleGeo.translate(0, 3.7, 0);
    for (const side of [-1, 1]) {
      const p = new THREE.Mesh(poleGeo, poleMat);
      p.position.set(x, y, z + side * 6.0);
      p.castShadow = true;
      worldGroup.add(p);
    }
    const bar = new THREE.Mesh(new THREE.BoxGeometry(0.35, 0.35, 12.4), poleMat);
    bar.position.set(x, y + 7.4, z);
    bar.castShadow = true;
    worldGroup.add(bar);

    const c = document.createElement('canvas');
    c.width = 1024;
    c.height = 256;
    const g2 = c.getContext('2d');
    g2.fillStyle = '#132218';
    g2.fillRect(0, 0, 1024, 256);
    for (let i = 0; i < 32; i++) {
      g2.fillStyle = i % 2 ? '#f7f1e1' : '#ff8a2a';
      g2.fillRect(i * 32, 0, 32, 18);
      g2.fillRect(i * 32, 238, 32, 18);
    }
    g2.strokeStyle = '#ff8a2a';
    g2.lineWidth = 8;
    g2.strokeRect(24, 24, 976, 208);
    g2.fillStyle = '#f7f1e1';
    g2.font = '900 142px "Avenir Next Condensed", "Arial Narrow", sans-serif';
    g2.textAlign = 'center';
    g2.textBaseline = 'middle';
    g2.fillText('FINISH', 512, 130);
    const tex = new THREE.CanvasTexture(c);
    tex.encoding = THREE.sRGBEncoding;
    tex.anisotropy = 4;
    const bmat = new THREE.MeshStandardMaterial({ map: tex, roughness: 0.8, side: THREE.DoubleSide });
    const banner = new THREE.Mesh(new THREE.PlaneGeometry(11.4, 2.8), bmat);
    banner.position.set(x, y + 5.7, z);
    banner.rotation.y = -Math.PI / 2;
    banner.castShadow = true;
    worldGroup.add(banner);

    const light = new THREE.MeshStandardMaterial({ color: 0xf7f1e1, roughness: 0.85 });
    const dark = new THREE.MeshStandardMaterial({ color: 0x1a1a18, roughness: 0.9 });
    for (let i = 0; i < 12; i++) {
      const box = new THREE.Mesh(new THREE.BoxGeometry(1.7, 0.06, 0.94), i % 2 ? light : dark);
      box.position.set(x, terrainY(x) + 0.05, z - 6 + i + 0.5);
      worldGroup.add(box);
    }
  }

  /* ── bike & rider ────────────────────────────────────────── */

  function tube(a, b, r, mat) {
    const dir = new THREE.Vector3().subVectors(b, a);
    const len = dir.length();
    const geo = new THREE.CylinderGeometry(r, r, len, 9);
    const mesh = new THREE.Mesh(geo, mat);
    mesh.position.copy(a).add(b).multiplyScalar(0.5);
    mesh.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), dir.normalize());
    return mesh;
  }

  function capsule(a, b, r, mat) {
    const dir = new THREE.Vector3().subVectors(b, a);
    const len = dir.length();
    const geo = new THREE.CapsuleGeometry(r, Math.max(0.01, len - r * 2), 4, 10);
    const mesh = new THREE.Mesh(geo, mat);
    mesh.position.copy(a).add(b).multiplyScalar(0.5);
    mesh.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), dir.normalize());
    return mesh;
  }

  function sphere(x, y, z, r, mat) {
    const mesh = new THREE.Mesh(new THREE.SphereGeometry(r, 12, 9), mat);
    mesh.position.set(x, y, z);
    return mesh;
  }

  function makeWheel(x) {
    const g = new THREE.Group();
    g.position.set(x, 0.4, 0);
    const tire = new THREE.Mesh(new THREE.TorusGeometry(0.33, 0.055, 8, 26), M.tire);
    g.add(tire);
    const rim = new THREE.Mesh(new THREE.TorusGeometry(0.255, 0.014, 5, 26), M.rim);
    g.add(rim);
    for (let i = 0; i < 6; i++) {
      const spoke = new THREE.Mesh(new THREE.BoxGeometry(0.49, 0.012, 0.012), M.rim);
      spoke.rotation.z = (i * Math.PI) / 6;
      g.add(spoke);
    }
    const rotor = new THREE.Mesh(new THREE.CylinderGeometry(0.115, 0.115, 0.008, 18), M.rim);
    rotor.rotation.x = Math.PI / 2;
    rotor.position.z = 0.08;
    g.add(rotor);
    const caliper = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.1, 0.05), M.dark);
    caliper.position.set(-0.12, 0.12, 0.1);
    g.add(caliper);
    g.add(sphere(0, 0, 0, 0.045, M.frame));
    return g;
  }

  function createBike() {
    bikeRoot = new THREE.Group();
    bikeTilt = new THREE.Group();
    bikeModel = new THREE.Group();
    bikeRoot.add(bikeTilt);
    bikeTilt.add(bikeModel);
    scene.add(bikeRoot);

    frontWheel = makeWheel(0.78);
    rearWheel = makeWheel(-0.78);
    bikeModel.add(frontWheel, rearWheel);

    const rear = new THREE.Vector3(-0.78, 0.4, 0);
    const front = new THREE.Vector3(0.78, 0.4, 0);
    const bb = new THREE.Vector3(-0.08, 0.44, 0);
    const seat = new THREE.Vector3(-0.34, 0.92, 0);
    const head = new THREE.Vector3(0.43, 0.94, 0);
    const headLow = new THREE.Vector3(0.36, 0.58, 0);

    const addTube = (a, b, r, mat) => bikeModel.add(tube(a, b, r, mat));
    addTube(rear, bb, 0.045, M.frame);
    addTube(rear, seat, 0.04, M.frame);
    addTube(bb, seat, 0.042, M.frame);
    addTube(bb, headLow, 0.05, M.frame);
    addTube(seat, head, 0.045, M.frame);
    addTube(headLow, head, 0.045, M.frame);
    addTube(headLow, front, 0.028, M.dark);
    addTube(headLow.clone().add(new THREE.Vector3(0, 0, 0.06)), front.clone().add(new THREE.Vector3(0, 0, 0.06)), 0.025, M.dark);
    addTube(headLow.clone().add(new THREE.Vector3(0, 0, -0.06)), front.clone().add(new THREE.Vector3(0, 0, -0.06)), 0.025, M.dark);

    const seatPost = new THREE.Mesh(new THREE.BoxGeometry(0.25, 0.045, 0.1), M.dark);
    seatPost.position.set(-0.35, 0.95, 0);
    bikeModel.add(seatPost);

    const bar = new THREE.Mesh(new THREE.CylinderGeometry(0.022, 0.022, 0.48, 6), M.dark);
    bar.position.set(0.52, 1.0, 0);
    bar.rotation.x = Math.PI / 2;
    bikeModel.add(bar);
    addTube(head, new THREE.Vector3(0.52, 1.0, 0), 0.025, M.dark);

    const crank = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.07, 0.16, 8), M.dark);
    crank.position.set(-0.08, 0.44, 0);
    crank.rotation.x = Math.PI / 2;
    bikeModel.add(crank);

    // rider
    const hip = new THREE.Vector3(-0.25, 1.02, 0);
    const shoulder = new THREE.Vector3(0.1, 1.53, 0);
    const headC = new THREE.Vector3(0.28, 1.71, 0);
    bikeModel.add(capsule(hip, shoulder, 0.165, M.jersey));
    const chest = sphere(0.02, 1.4, 0, 0.22, M.jersey);
    chest.scale.set(1.05, 1.1, 1.25);
    bikeModel.add(chest);
    const pack = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.36, 0.26), M.dark);
    pack.position.set(-0.12, 1.34, 0);
    pack.rotation.z = 0.16;
    bikeModel.add(pack);
    const packStripe = new THREE.Mesh(new THREE.BoxGeometry(0.31, 0.05, 0.27), M.frame);
    packStripe.position.set(-0.12, 1.4, 0);
    packStripe.rotation.z = 0.16;
    bikeModel.add(packStripe);
    bikeModel.add(sphere(hip.x, hip.y, hip.z, 0.15, M.pants));
    bikeModel.add(sphere(shoulder.x, shoulder.y, shoulder.z + 0.15, 0.1, M.jersey));
    bikeModel.add(sphere(shoulder.x, shoulder.y, shoulder.z - 0.15, 0.1, M.jersey));
    bikeModel.add(sphere(headC.x, headC.y, headC.z, 0.165, M.skin));
    const helmet = sphere(headC.x, headC.y + 0.035, headC.z, 0.185, M.helmet);
    helmet.scale.set(1, 0.85, 1.05);
    bikeModel.add(helmet);
    const chin = new THREE.Mesh(new THREE.BoxGeometry(0.15, 0.13, 0.23), M.helmet);
    chin.position.set(headC.x + 0.1, headC.y - 0.06, 0);
    bikeModel.add(chin);
    const goggle = new THREE.Mesh(new THREE.BoxGeometry(0.07, 0.075, 0.245), M.dark);
    goggle.position.set(headC.x + 0.155, headC.y + 0.015, 0);
    bikeModel.add(goggle);
    const visor = new THREE.Mesh(new THREE.BoxGeometry(0.19, 0.035, 0.26), M.frame);
    visor.position.set(headC.x + 0.13, headC.y + 0.11, 0);
    bikeModel.add(visor);

    const kneeL = new THREE.Vector3(0.03, 0.72, 0.17);
    const kneeR = new THREE.Vector3(0.03, 0.72, -0.17);
    const footL = new THREE.Vector3(0.11, 0.44, 0.12);
    const footR = new THREE.Vector3(0.11, 0.44, -0.12);
    bikeModel.add(tube(hip, kneeL, 0.07, M.pants));
    bikeModel.add(tube(kneeL, footL, 0.055, M.pants));
    bikeModel.add(tube(hip, kneeR, 0.07, M.pants));
    bikeModel.add(tube(kneeR, footR, 0.055, M.pants));
    const padL = sphere(kneeL.x, kneeL.y, kneeL.z, 0.085, M.dark);
    padL.scale.set(1, 1.15, 1);
    const padR = sphere(kneeR.x, kneeR.y, kneeR.z, 0.085, M.dark);
    padR.scale.set(1, 1.15, 1);
    bikeModel.add(padL, padR);
    const shoeL = new THREE.Mesh(new THREE.BoxGeometry(0.22, 0.08, 0.12), M.shoe);
    shoeL.position.copy(footL).add(new THREE.Vector3(0.03, -0.03, 0));
    const shoeR = new THREE.Mesh(new THREE.BoxGeometry(0.22, 0.08, 0.12), M.shoe);
    shoeR.position.copy(footR).add(new THREE.Vector3(0.03, -0.03, 0));
    bikeModel.add(shoeL, shoeR);

    const elbowL = new THREE.Vector3(0.4, 1.27, 0.23);
    const elbowR = new THREE.Vector3(0.4, 1.27, -0.23);
    const handL = new THREE.Vector3(0.52, 1.0, 0.24);
    const handR = new THREE.Vector3(0.52, 1.0, -0.24);
    bikeModel.add(tube(shoulder.clone().add(new THREE.Vector3(0, 0, 0.14)), elbowL, 0.055, M.jersey));
    bikeModel.add(tube(elbowL, handL, 0.045, M.skin));
    bikeModel.add(tube(shoulder.clone().add(new THREE.Vector3(0, 0, -0.14)), elbowR, 0.055, M.jersey));
    bikeModel.add(tube(elbowR, handR, 0.045, M.skin));
    const elbowPadL = sphere(elbowL.x, elbowL.y, elbowL.z, 0.07, M.dark);
    const elbowPadR = sphere(elbowR.x, elbowR.y, elbowR.z, 0.07, M.dark);
    const gloveL = sphere(handL.x, handL.y, handL.z, 0.055, M.dark);
    const gloveR = sphere(handR.x, handR.y, handR.z, 0.055, M.dark);
    bikeModel.add(elbowPadL, elbowPadR, gloveL, gloveR);

    const pedalL = new THREE.Mesh(new THREE.BoxGeometry(0.14, 0.022, 0.1), M.dark);
    pedalL.position.set(0.11, 0.395, 0.16);
    const pedalR = new THREE.Mesh(new THREE.BoxGeometry(0.14, 0.022, 0.1), M.dark);
    pedalR.position.set(0.11, 0.395, -0.16);
    bikeModel.add(pedalL, pedalR);
    const chain = new THREE.Mesh(new THREE.BoxGeometry(0.72, 0.03, 0.012), M.dark);
    chain.position.set(-0.43, 0.42, -0.07);
    chain.rotation.z = 0.05;
    bikeModel.add(chain);
    const chainring = new THREE.Mesh(new THREE.CylinderGeometry(0.11, 0.11, 0.015, 16), M.rim);
    chainring.position.set(-0.08, 0.44, -0.07);
    chainring.rotation.x = Math.PI / 2;
    bikeModel.add(chainring);
    const saddle = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.055, 0.14), M.dark);
    saddle.position.set(-0.38, 0.985, 0);
    saddle.rotation.z = -0.08;
    bikeModel.add(saddle);

    const scarf = new THREE.Mesh(new THREE.BoxGeometry(0.55, 0.06, 0.16), M.frame);
    scarf.position.set(-0.17, 1.55, 0);
    scarf.rotation.z = -0.18;
    bikeModel.add(scarf);
    bikeModel.scale.setScalar(1.12);

    // soft blob shadow
    const c = document.createElement('canvas');
    c.width = 128;
    c.height = 128;
    const g2 = c.getContext('2d');
    const grad = g2.createRadialGradient(64, 64, 4, 64, 64, 62);
    grad.addColorStop(0, 'rgba(0,0,0,0.55)');
    grad.addColorStop(0.55, 'rgba(0,0,0,0.24)');
    grad.addColorStop(1, 'rgba(0,0,0,0)');
    g2.fillStyle = grad;
    g2.fillRect(0, 0, 128, 128);
    const tex = new THREE.CanvasTexture(c);
    const smat = new THREE.MeshBasicMaterial({ map: tex, transparent: true, depthWrite: false });
    shadow = new THREE.Mesh(new THREE.PlaneGeometry(2.6, 1.5), smat);
    shadow.rotation.x = -Math.PI / 2;
    scene.add(shadow);
  }

  /* ── ride state ──────────────────────────────────────────── */

  function randomSeed() {
    if (window.crypto && crypto.getRandomValues) return crypto.getRandomValues(new Uint32Array(1))[0] >>> 0;
    return (Math.random() * 0xffffffff) >>> 0;
  }

  function resetRide(newWorld = false) {
    if (!S.world || newWorld) buildWorld((TRAIL && TRAIL.seed) || randomSeed());
    const startX = 3;
    const y = bikeGroundY(startX);
    S.bike = {
      x: startX,
      y,
      z: pathZ(startX),
      lateral: 0,
      vx: 7.5,
      vy: slopeAt(startX) * 7.5,
      onGround: true,
      steer: 0,
      wheelSpin: 0,
      flipRot: 0,
      flipVel: 0,
      spinRot: 0,
      spinVel: 0,
      airTime: 0,
      grabTime: 0,
      basePitch: Math.atan(slopeAt(startX)),
      lean: 0
    };
    S.trickPoints = 0;
    S.chain = 0;
    S.comboTimer = 0;
    S.boost = 0.35;
    S.boosting = false;
    S.bails = 3;
    S.bestTrick = null;
    S.crashTimer = 0;
    S.shake = 0;
    S.goTimer = 0;
    S.finishBonus = false;
    S.coinsEarned = 0;
    S.rewarded = false;
    S.input.jumpBuffer = 0;
    ui.setBails(3);
    updateBikeVisual(0);
    snapCamera();
  }

  function showIntro() {
    S.mode = 'intro';
    S.active = true;
    window.__3D_ACTIVE = true;
    document.body.classList.add('mode3d');
    dom.menu.classList.add('hidden');
    hide3dOverlays();
    dom.start.style.display = '';
    dom.start.classList.remove('hidden');
    dom.startBtn?.focus?.();
    ui.setHud(false);
    dom.exitBtn.classList.add('hidden');
    dom.touch.classList.add('hidden');
    dom.land.classList.add('hidden');
    dom.count.classList.add('hidden');
    dom.count.classList.remove('show');
    dom.ridersPanel.classList.add('is-hidden');
    dom.bailsPanel.classList.remove('online-hide');
    dom.best.textContent = fmt(S.best3d);
    game.state = 'mode3d';
    if (!renderer) initThree();
    resetRide(true);
    S.mode = 'intro';
    snapCamera();
    updateBikeVisual(0);
    if (!S.looping) {
      S.looping = true;
      S.last = performance.now();
      requestAnimationFrame(frame);
    }
  }

  function fmt(n) {
    return Math.round(n).toLocaleString('en-US');
  }

  function hide3dOverlays() {
    dom.start.classList.add('hidden');
    dom.over.classList.add('hidden');
    dom.count.classList.add('hidden');
    dom.count.classList.remove('show');
  }

  function startCountdown() {
    dom.start.classList.add('hidden');
    dom.start.style.display = 'none';
    dom.over.classList.add('hidden');
    dom.land.classList.add('hidden');
    ui.setHud(true);
    dom.bailsPanel.classList.remove('online-hide');
    dom.ridersPanel.classList.add('is-hidden');
    dom.exitBtn.classList.remove('hidden');
    if (game.touchMode) dom.touch.classList.remove('hidden');
    ui.setBails(S.bails);
    S.mode = 'countdown';
    S.countdown = 3.2;
    S.goTimer = 0;
    dom.count.classList.remove('hidden');
    dom.count.classList.add('show');
    dom.countNum.textContent = '3';
    game.sfx.init();
    game.sfx.stopWind();
    S.uiTimer = 0;
    S.input.jumpBuffer = 0;
    updateHud(true);
  }

  function startGame() {
    S.mode = 'countdown';
    startCountdown();
  }

  function again3d() {
    dom.over.classList.add('hidden');
    resetRide(true);
    startCountdown();
  }

  function exitToMenu() {
    S.active = false;
    S.looping = false;
    window.__3D_ACTIVE = false;
    document.body.classList.remove('mode3d');
    hide3dOverlays();
    dom.start.classList.add('hidden');
    dom.over.classList.add('hidden');
    dom.exitBtn.classList.add('hidden');
    dom.touch.classList.add('hidden');
    dom.land.classList.add('hidden');
    ui.setHud(false);
    dom.menu.classList.remove('hidden');
    game.state = 'menu';
    game.sfx.stopWind();
    document.getElementById('toast').classList.remove('show');
    document.getElementById('wipeout').classList.remove('show');
  }

  function showOver(reason = 'wipeout') {
    if (S.mode === 'over') return;
    S.mode = 'over';
    S.active = true;
    game.sfx.stopWind();
    document.getElementById('wipeout').classList.remove('show');
    document.getElementById('trickFeed').classList.remove('pop');
    document.getElementById('toast').classList.remove('show');
    dom.land.classList.add('hidden');
    const finished = reason === 'finish';
    if (finished && !S.finishBonus) {
      S.finishBonus = true;
      S.trickPoints += 500;
    }
    dom.overEyebrow.textContent = finished ? '3D RUN COMPLETE' : '3D RUN OVER';
    dom.overTitle.textContent = finished ? 'FINISH' : 'WIPEOUT';
    const total = scoreNow();
    if (!S.rewarded) {
      S.rewarded = true;
      S.coinsEarned = window.SENDIT_GARAGE
        ? window.SENDIT_GARAGE.awardRun(total, Math.max(0, S.bike.x), '3D')
        : 0;
    }
    const isBest = total > S.best3d;
    if (isBest) {
      S.best3d = total;
      saveBest3d(total);
    }
    dom.finalScore.textContent = fmt(total);
    if (dom.coins) dom.coins.textContent = `+${fmt(S.coinsEarned)} COINS`;
    dom.finalDist.textContent = `${fmt(Math.max(0, S.bike.x))} m`;
    dom.finalTrick.textContent = S.bestTrick ? S.bestTrick.name : '—';
    dom.finalBest.textContent = fmt(S.best3d);
    dom.newBest.classList.toggle('is-hidden', !isBest);
    dom.best.textContent = fmt(S.best3d);
    dom.over.classList.remove('hidden');
    dom.exitBtn.classList.add('hidden');
    dom.touch.classList.add('hidden');
    dom.count.classList.add('hidden');
    dom.count.classList.remove('show');
    updateHud(true);
  }

  /* ── update ──────────────────────────────────────────────── */

  function frame(now) {
    if (!S.active) {
      S.looping = false;
      return;
    }
    const dt = Math.min(0.033, Math.max(0.001, (now - S.last) / 1000));
    S.last = now;
    S.time += dt;
    update(dt);
    renderer.render(scene, camera);
    requestAnimationFrame(frame);
  }

  function update(dt) {
    S.input.jumpBuffer = Math.max(0, S.input.jumpBuffer - dt);
    windUniform.value += dt;

    if (S.mode === 'intro') {
      updateIntro(dt);
    } else if (S.mode === 'countdown') {
      S.countdown -= dt;
      const n = Math.max(1, Math.ceil(S.countdown));
      if (dom.countNum.textContent !== String(n)) dom.countNum.textContent = String(n);
      if (S.countdown <= 0) {
        S.mode = 'playing';
        S.goTimer = 0.7;
        dom.countNum.textContent = 'GO!';
        game.sfx.startWind();
        game.sfx.click();
      }
      updateBikeVisual(dt);
      updateCamera(dt, false);
    } else if (S.mode === 'playing') {
      if (S.goTimer > 0) {
        S.goTimer -= dt;
        dom.countNum.textContent = 'GO!';
        if (S.goTimer <= 0) {
          dom.count.classList.add('hidden');
          dom.count.classList.remove('show');
        }
      }
      updatePlaying(dt);
      updateCamera(dt, false);
    } else if (S.mode === 'crashed') {
      updateCrash(dt);
      updateCamera(dt, false);
    } else if (S.mode === 'over') {
      updateCamera(dt, false);
    }

    updateShadow(dt);
    updateDust(dt);
    updateRain(dt);
    S.uiTimer -= dt;
    if (S.uiTimer <= 0 && (S.mode === 'playing' || S.mode === 'countdown' || S.mode === 'crashed')) {
      S.uiTimer = 0.07;
      updateHud(false);
    }
    S.windTimer -= dt;
    if (S.windTimer <= 0 && S.mode === 'playing') {
      S.windTimer = 0.12;
      game.sfx.updateWind(S.bike.vx * 40, !S.bike.onGround);
    }
  }

  function updateIntro(dt) {
    if (!S.bike) return;
    S.bike.wheelSpin += dt * 0.8;
    updateBikeVisual(dt);
    updateCamera(dt, false);
  }

  function updatePlaying(dt) {
    const b = S.bike;
    if (!b) return;
    const st = rigStats();
    const speedMod = 1 + (st.speed - 3) * 0.025;
    const handleMod = 0.9 + st.handling * 0.04;
    const popMod = 0.9 + st.pop * 0.04;

    // smooth steering
    const steerTarget = (S.input.right ? 1 : 0) - (S.input.left ? 1 : 0);
    b.steer += (steerTarget - b.steer) * Math.min(1, dt * 8);

    if (b.onGround) {
      const slope = slopeAt(b.x);
      const norm = Math.sqrt(1 + slope * slope);
      let accel = GRAVITY * (-slope) / norm + 3.2 * speedMod;
      if (S.input.down) accel -= 7;
      accel -= 0.0058 * b.vx * b.vx;
      let boosting = false;
      if (S.input.boost && S.boost > 0.01) {
        accel += 6.5 * speedMod;
        S.boost = Math.max(0, S.boost - dt * 0.36);
        boosting = true;
        if (!S.boosting) game.sfx.boost();
      }
      S.boosting = boosting;
      const cap = (boosting ? 33 : 27) * speedMod;
      b.vx = clamp(b.vx + accel * dt, 0, cap);

      const lateralSpeed = (3.7 + b.vx * 0.07) * handleMod;
      b.lateral += b.steer * lateralSpeed * dt;
      if (b.lateral > 6.6) {
        b.lateral = 6.6;
        b.vx *= 0.994;
      } else if (b.lateral < -6.6) {
        b.lateral = -6.6;
        b.vx *= 0.994;
      }
      b.z = pathZ(b.x) + b.lateral;

      if (S.input.jumpBuffer > 0) {
        S.input.jumpBuffer = 0;
        b.onGround = false;
        b.vy = slope * b.vx + 7.4;
        b.airTime = 0;
        b.flipRot = 0;
        b.flipVel = 0;
        b.spinRot = 0;
        b.spinVel = 0;
        b.grabTime = 0;
        b.basePitch = Math.atan(slope);
        game.sfx.jump();
      } else {
        const nx = b.x + b.vx * dt;
        const gy = bikeGroundY(nx);
        const reqVy = (gy - b.y) / Math.max(dt, 0.0001);
        if (reqVy > b.vy + GRAVITY * dt * 1.65) {
          b.x = nx;
          b.z = pathZ(b.x) + b.lateral;
          b.onGround = false;
          b.vy = slope * b.vx;
          b.airTime = 0;
          b.flipRot = 0;
          b.flipVel = 0;
          b.spinRot = 0;
          b.spinVel = 0;
          b.grabTime = 0;
          b.basePitch = Math.atan(slope);
          if (b.vy < -2) game.sfx.whoosh();
        } else {
          b.x = nx;
          b.y = gy;
          b.vy = slopeAt(nx) * b.vx;
          b.z = pathZ(b.x) + b.lateral;
          b.wheelSpin += (b.vx * dt) / 0.33;
          b.flipRot = 0;
          b.spinRot = 0;
          b.airTime = 0;
          b.grabTime = 0;
          b.basePitch = Math.atan(slopeAt(b.x));
        }
      }
    } else {
      b.vy -= GRAVITY * dt;
      b.x += b.vx * dt;
      b.y += b.vy * dt;
      b.z = pathZ(b.x) + b.lateral;
      b.airTime += dt;

      let flipTarget = 0;
      if (S.input.up) flipTarget = 7.0 * popMod;
      else if (S.input.down) flipTarget = -7.0 * popMod;
      b.flipVel += (flipTarget - b.flipVel) * Math.min(1, dt * 9);
      if (!flipTarget) b.flipVel *= Math.exp(-4.2 * dt);
      b.flipRot += b.flipVel * dt;

      let spinTarget = 0;
      if (S.input.left) spinTarget = 6.2 * popMod;
      else if (S.input.right) spinTarget = -6.2 * popMod;
      b.spinVel += (spinTarget - b.spinVel) * Math.min(1, dt * 8);
      if (!spinTarget) b.spinVel *= Math.exp(-4.5 * dt);
      b.spinRot += b.spinVel * dt;

      if (S.input.grab && b.airTime > 0.12) b.grabTime += dt;
      b.wheelSpin += dt * 2.2;

      const gy = bikeGroundY(b.x);
      if (b.y <= gy && b.vy <= 0) {
        land(gy);
      }
    }

    // gates
    const prev = S.bike.prevX == null ? S.bike.x : S.bike.prevX;
    for (const gate of S.gates) {
      if (gate.passed) continue;
      if (prev < gate.x && b.x >= gate.x) {
        gate.passed = true;
        const dz = b.z - gate.z;
        if (Math.abs(dz) < 2.15) {
          S.trickPoints += 80;
          S.boost = Math.min(1, S.boost + 0.25);
          gate.mesh.material.color.setHex(0xd9ff83);
          gate.mesh.material.emissive.setHex(0x7dff6a);
          gate.mesh.material.emissiveIntensity = 0.55;
          game.sfx.click();
          ui.toast('GATE +BOOST');
        } else {
          gate.mesh.material.color.setHex(0x8a8478);
          gate.mesh.material.emissiveIntensity = 0.05;
        }
      }
    }
    b.prevX = b.x;

    // slow combo timer
    if (S.comboTimer > 0) {
      S.comboTimer -= dt;
      if (S.comboTimer <= 0) {
        S.comboTimer = 0;
        S.chain = 0;
      }
    }

    if (b.x > MAX_X - 10) {
      // crossed the finish gate
      showOver('finish');
      return;
    }

    updateBikeVisual(dt);
  }

  function land(gy) {
    const b = S.bike;
    const rem = Math.abs(wrapAngle(b.flipRot));
    const air = b.airTime;
    const impact = Math.max(0, -b.vy);
    b.y = gy;
    b.vy = slopeAt(b.x) * b.vx;
    b.onGround = true;
    b.basePitch = Math.atan(slopeAt(b.x));
    b.z = pathZ(b.x) + b.lateral;
    b.flipVel = 0;
    b.spinVel = 0;
    b.wheelSpin += 0.5;
    if (impact > 1.2) spawnDust(b.x, b.y + 0.12, b.z, impact > 5 ? 14 : 7, 0.7);

    const st = rigStats();
    if (rem > 1.06 + st.handling * 0.02) {
      b.flipRot = 0;
      b.spinRot = 0;
      crash();
      return;
    }

    let grade = 'SKETCHY';
    let gradeMult = 0.78;
    if (rem < 0.16) {
      grade = 'PERFECT';
      gradeMult = 1.35;
    } else if (rem < 0.55) {
      grade = 'CLEAN';
      gradeMult = 1;
    }

    const flips = Math.floor(Math.abs(b.flipRot) / TAU + 0.12);
    const spins = Math.floor(Math.abs(b.spinRot) / TAU + 0.12);
    const grabbed = b.grabTime > 0.22;
    if (air > 0.28 && (flips > 0 || spins > 0 || grabbed || air > 0.55)) {
      const dir = b.flipRot >= 0 ? 'BACKFLIP' : 'FRONTFLIP';
      const flipPrefix = flips >= 4 ? 'QUAD ' : flips === 3 ? 'TRIPLE ' : flips === 2 ? 'DOUBLE ' : '';
      const grabPrefix = grabbed ? (flips >= 2 ? 'SUPERMAN ' : flips === 1 ? 'NO-HANDER ' : 'STYLE ') : '';
      let name = flips > 0 ? `${grabPrefix}${flipPrefix}${dir}` : '';
      if (spins > 0) {
        name += `${name ? ' ' : ''}${spins * 360}`;
        if (!flips && !grabbed) name = `${spins * 360} SPIN`;
      }
      if (!name && grabbed) name = 'STYLE GRAB';
      if (!name) name = 'BIG AIR';

      const base = 80 + flips * 390 + spins * 190 + (grabbed ? 260 : 0) + Math.min(air, 2.4) * 170;
      if (S.comboTimer > 0) S.chain += 1;
      else S.chain = 1;
      S.comboTimer = 5.2;
      const comboMult = Math.min(8, 1 + (S.chain - 1) * 0.35);
      const points = Math.round(base * gradeMult * comboMult);
      S.trickPoints += points;
      S.boost = Math.min(1, S.boost + 0.11 + flips * 0.08 + spins * 0.03 + (grabbed ? 0.04 : 0));
      if (!S.bestTrick || points > S.bestTrick.points) S.bestTrick = { name, points };
      ui.showTrick(name, points, grade);
      game.sfx.trick(flips);
      S.shake = Math.min(0.55, impact * 0.02 + (air > 0.6 ? 0.12 : 0));
      game.sfx.land(impact * 34);
    } else if (air > 0.3) {
      game.sfx.land(impact * 34);
    }

    b.flipRot = 0;
    b.spinRot = 0;
    b.airTime = 0;
    b.grabTime = 0;
    S.boosting = false;
  }

  function crash() {
    if (S.mode !== 'playing') return;
    S.mode = 'crashed';
    S.crashTimer = 1.45;
    S.bails = Math.max(0, S.bails - 1);
    ui.setBails(S.bails);
    ui.wipeout();
    game.sfx.crash();
    game.sfx.stopWind();
    S.crashSpeed = S.bike.vx;
    S.bike.vy = Math.max(S.bike.vy, 2.5);
    S.bike.crashSpin = 4 + Math.random() * 4;
    S.shake = 1;
    S.chain = 0;
    S.comboTimer = 0;
    S.boosting = false;
  }

  function updateCrash(dt) {
    const b = S.bike;
    b.vy -= GRAVITY * 0.8 * dt;
    b.x += b.vx * dt * 0.7;
    b.y += b.vy * dt;
    b.z = pathZ(b.x) + b.lateral;
    b.flipRot += (b.crashSpin || 4) * dt;
    b.spinRot += 2.4 * dt;
    b.lean += 3 * dt;
    const gy = bikeGroundY(b.x);
    if (b.y < gy) {
      b.y = gy;
      b.vy = Math.abs(b.vy) * 0.22;
      b.vx *= 0.96;
    }
    updateBikeVisual(dt);
    S.crashTimer -= dt;
    if (S.crashTimer <= 0) {
      if (S.bails <= 0) {
        showOver('wipeout');
      } else {
        respawn();
      }
    }
  }

  function respawn() {
    const b = S.bike;
    let nx = b.x + 6;
    for (let d = 4; d < 80; d += 3) {
      const x = b.x + d;
      if (Math.abs(slopeAt(x)) < 0.62) {
        nx = x;
        break;
      }
    }
    b.x = Math.min(MAX_X - 20, nx);
    b.lateral = 0;
    b.z = pathZ(b.x);
    b.y = bikeGroundY(b.x);
    b.vx = 7.5;
    b.vy = slopeAt(b.x) * b.vx;
    b.onGround = true;
    b.steer = 0;
    b.flipRot = 0;
    b.spinRot = 0;
    b.flipVel = 0;
    b.spinVel = 0;
    b.lean = 0;
    b.airTime = 0;
    b.grabTime = 0;
    b.basePitch = Math.atan(slopeAt(b.x));
    S.mode = 'playing';
    S.shake = 0.2;
    updateBikeVisual(0);
    snapCamera();
    game.sfx.startWind();
    ui.toast('SHAKE IT OFF');
  }

  /* ── visuals ─────────────────────────────────────────────── */

  function updateBikeVisual(dt) {
    if (!bikeRoot || !S.bike) return;
    const b = S.bike;
    const dz = pathDZ(b.x);
    const yaw = Math.atan2(-dz, 1);
    const steerYaw = b.onGround ? -b.steer * 0.22 : 0;
    bikeRoot.position.set(b.x, b.y, b.z);
    bikeRoot.rotation.y = yaw + steerYaw + b.spinRot;

    let pitch;
    if (b.onGround) pitch = Math.atan(slopeAt(b.x));
    else pitch = b.basePitch + b.flipRot;
    if (S.mode === 'crashed') pitch = b.basePitch + b.flipRot;
    bikeTilt.rotation.z = pitch;
    const leanTarget = b.onGround ? -b.steer * 0.32 : 0;
    b.lean += (leanTarget - b.lean) * Math.min(1, dt * 7);
    bikeTilt.rotation.x = b.lean;

    if (frontWheel) frontWheel.rotation.z = b.wheelSpin;
    if (rearWheel) rearWheel.rotation.z = b.wheelSpin;

    if (shadow) {
      const gy = bikeGroundY(b.x);
      const air = Math.max(0, b.y - gy);
      const sc = clamp(1 - air / 12, 0.25, 1);
      shadow.position.set(b.x, gy + 0.05, b.z);
      shadow.scale.set(sc, sc, sc);
      shadow.material.opacity = 0.42 * sc;
    }
  }

  function updateShadow(dt) {
    if (!sunLight || !S.bike) return;
    const b = S.bike;
    // keep the shadow frustum centered on the rider
    sunLight.position.set(b.x - 64, b.y + 40, b.z + 50);
    sunLight.target.position.set(b.x + 6, b.y, b.z - 4);
    sunLight.target.updateMatrixWorld();
  }

  function snapCamera() {
    if (!S.bike || !camera) return;
    const b = S.bike;
    const dz = pathDZ(b.x);
    const back = tmpV.set(-1, 0, -dz).normalize();
    const right = new THREE.Vector3(-dz, 0, 1).normalize();
    const portrait = window.innerWidth < 760 || window.innerWidth < window.innerHeight;
    const side = portrait ? 1.1 : 2.8;
    const lookSide = portrait ? 0.2 : 0.8;
    const dist = portrait ? 9.8 : 7.8;
    const height = portrait ? 4.9 : 3.8;
    const ahead = portrait ? 12.5 : 9.5;
    camPos.set(b.x + back.x * dist + right.x * side, b.y + height, b.z + back.z * dist + right.z * side);
    camLook.set(b.x - back.x * ahead + right.x * lookSide, b.y + 1.2, b.z - back.z * ahead + right.z * lookSide);
    camera.position.copy(camPos);
    camera.lookAt(camLook);
    S.cameraReady = true;
  }

  function updateCamera(dt, snap) {
    if (!camera || !S.bike) return;
    const b = S.bike;
    const dz = pathDZ(b.x);
    const tangent = tmpV.set(1, 0, dz).normalize();
    const right = new THREE.Vector3(-dz, 0, 1).normalize();
    const portrait = window.innerWidth < 760 || window.innerWidth < window.innerHeight;
    const side = portrait ? 1.1 : 2.8;
    const lookSide = portrait ? 0.2 : 0.8;
    const dist = portrait ? 9.8 : 7.8;
    const height = portrait ? 4.9 : 3.8;
    const ahead = portrait ? 12.5 : 9.5;
    const lookY = portrait ? 1.2 : 1.15;
    const desired = new THREE.Vector3(
      b.x - tangent.x * dist + right.x * side,
      b.y + height + clamp((b.y - bikeGroundY(b.x)) * 0.12, 0, 2.2),
      b.z - tangent.z * dist + right.z * side
    );
    const look = new THREE.Vector3(
      b.x + tangent.x * ahead + right.x * lookSide,
      b.y + lookY,
      b.z + tangent.z * ahead + right.z * lookSide
    );
    if (!S.cameraReady || snap) {
      camPos.copy(desired);
      camLook.copy(look);
      S.cameraReady = true;
    } else {
      camPos.x += (desired.x - camPos.x) * (1 - Math.exp(-dt * 6.2));
      camPos.z += (desired.z - camPos.z) * (1 - Math.exp(-dt * 6.2));
      camPos.y += (desired.y - camPos.y) * (1 - Math.exp(-dt * 3.6));
      camLook.x += (look.x - camLook.x) * (1 - Math.exp(-dt * 7));
      camLook.y += (look.y - camLook.y) * (1 - Math.exp(-dt * 6));
      camLook.z += (look.z - camLook.z) * (1 - Math.exp(-dt * 7));
    }
    S.shake = Math.max(0, S.shake - dt * 2.8);
    const sh = S.shake;
    camera.position.set(
      camPos.x + (Math.random() * 2 - 1) * sh * 0.35,
      camPos.y + (Math.random() * 2 - 1) * sh * 0.25,
      camPos.z + (Math.random() * 2 - 1) * sh * 0.35
    );
    camera.lookAt(camLook);
    const speed = b.vx;
    const baseFov = portrait ? 70 : 62;
    const fovTarget = baseFov + clamp((speed - 8) / 25, 0, 1) * 5 + (S.boosting ? 3 : 0);
    camera.fov += (fovTarget - camera.fov) * Math.min(1, dt * 3);
    camera.updateProjectionMatrix();
  }

  /* ── HUD / UI ────────────────────────────────────────────── */

  function hudView() {
    const b = S.bike;
    return {
      totalScore: scoreNow(),
      distance: b ? Math.max(0, b.x) : 0,
      displaySpeed: b ? (S.mode === 'countdown' || S.mode === 'intro' ? 0 : b.vx * 3.6) : 0,
      bike: { vx: b ? b.vx : 0 },
      chain: S.chain,
      comboTimer: S.comboTimer,
      boost: S.boost,
      boosting: S.boosting,
      state: S.mode === 'countdown' ? 'countdown' : 'playing'
    };
  }

  function updateHud(force) {
    if (!S.bike) return;
    ui.tick(hudView());
    updateLandingIndicator();
  }

  function updateLandingIndicator() {
    if (!dom.land) return;
    const b = S.bike;
    if (S.mode !== 'playing' || !b || b.onGround || b.airTime < 0.15) {
      dom.land.classList.add('hidden');
      return;
    }
    dom.land.classList.remove('hidden');
    const rem = Math.abs(wrapAngle(b.flipRot));
    const deg = Math.round((rem * 180) / Math.PI);
    dom.landDeg.textContent = `${deg}°`;
    const q = clamp(1 - rem / Math.PI, 0, 1);
    dom.landBar.style.transform = `scaleX(${q})`;
    dom.landBar.style.background = rem < 0.5 ? '#d9ff83' : rem < 1.12 ? '#ffcf6b' : '#ff7a6b';
  }

  /* ── input ───────────────────────────────────────────────── */

  function keydown(e) {
    if (!S.active) return;
    if (e.target && (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA')) return;
    switch (e.code) {
      case 'ArrowLeft':
      case 'KeyA':
        S.input.left = true;
        e.preventDefault();
        break;
      case 'ArrowRight':
      case 'KeyD':
        S.input.right = true;
        e.preventDefault();
        break;
      case 'ArrowUp':
      case 'KeyW':
      case 'Space':
        S.input.up = true;
        if (!e.repeat && S.mode === 'playing') S.input.jumpBuffer = 0.15;
        e.preventDefault();
        break;
      case 'ArrowDown':
      case 'KeyS':
        S.input.down = true;
        e.preventDefault();
        break;
      case 'ShiftLeft':
      case 'ShiftRight':
        S.input.grab = true;
        e.preventDefault();
        break;
      case 'KeyB':
        S.input.boost = true;
        e.preventDefault();
        break;
      case 'Escape':
        e.preventDefault();
        if (S.mode === 'over') exitToMenu();
        else exitToMenu();
        break;
      case 'KeyR':
        if (S.mode === 'over') again3d();
        break;
      default:
        break;
    }
  }

  function keyup(e) {
    if (!S.active) return;
    switch (e.code) {
      case 'ArrowLeft':
      case 'KeyA':
        S.input.left = false;
        break;
      case 'ArrowRight':
      case 'KeyD':
        S.input.right = false;
        break;
      case 'ArrowUp':
      case 'KeyW':
      case 'Space':
        S.input.up = false;
        break;
      case 'ArrowDown':
      case 'KeyS':
        S.input.down = false;
        break;
      case 'ShiftLeft':
      case 'ShiftRight':
        S.input.grab = false;
        break;
      case 'KeyB':
        S.input.boost = false;
        break;
      default:
        break;
    }
  }

  function clearInput() {
    S.input.left = false;
    S.input.right = false;
    S.input.up = false;
    S.input.down = false;
    S.input.grab = false;
    S.input.boost = false;
    S.input.jumpBuffer = 0;
  }

  function setupTouch() {
    for (const btn of dom.touch.querySelectorAll('.tbtn')) {
      const act = btn.dataset.act3d;
      const on = (e) => {
        e.preventDefault();
        btn.classList.add('on');
        if (act === 'left') S.input.left = true;
        else if (act === 'right') S.input.right = true;
        else if (act === 'jump') {
          S.input.up = true;
          if (S.mode === 'playing') S.input.jumpBuffer = 0.15;
        } else if (act === 'grab') S.input.grab = true;
      };
      const off = (e) => {
        e.preventDefault();
        btn.classList.remove('on');
        if (act === 'left') S.input.left = false;
        else if (act === 'right') S.input.right = false;
        else if (act === 'jump') S.input.up = false;
        else if (act === 'grab') S.input.grab = false;
      };
      btn.addEventListener('pointerdown', on);
      btn.addEventListener('pointerup', off);
      btn.addEventListener('pointercancel', off);
      btn.addEventListener('pointerleave', off);
    }
  }

  /* ── events ──────────────────────────────────────────────── */

  dom.launchBtn?.addEventListener('click', () => {
    game.sfx.init();
    game.sfx.click();
    showIntro();
  });
  dom.startBtn?.addEventListener('click', () => {
    if (!S.active) return;
    startGame();
  });
  dom.backBtn?.addEventListener('click', exitToMenu);
  dom.againBtn?.addEventListener('click', again3d);
  dom.menuBtn?.addEventListener('click', exitToMenu);
  dom.exitBtn?.addEventListener('click', exitToMenu);
  window.addEventListener('keydown', keydown);
  window.addEventListener('keyup', keyup);
  window.addEventListener('blur', clearInput);
  setupTouch();

  if (dom.boostPanel) {
    dom.boostPanel.addEventListener('pointerdown', (e) => {
      if (!S.active || S.mode !== 'playing') return;
      e.preventDefault();
      S.input.boost = true;
    });
    dom.boostPanel.addEventListener('pointerup', () => { S.input.boost = false; });
    dom.boostPanel.addEventListener('pointercancel', () => { S.input.boost = false; });
    dom.boostPanel.addEventListener('pointerleave', () => { S.input.boost = false; });
  }

  // expose for tests / debugging
  window.__SENDIT_3D = {
    S,
    startGame,
    showIntro,
    exitToMenu,
    pathZ,
    terrainY,
    teleport: (x) => {
      if (!S.bike) return;
      S.mode = 'playing';
      S.crashTimer = 0;
      S.bike.x = Math.max(0, Math.min(MAX_X - 2, x));
      S.bike.y = terrainY(S.bike.x);
      S.bike.z = pathZ(S.bike.x);
      S.bike.lateral = 0;
      S.bike.vx = 12;
      S.bike.vy = slopeAt(S.bike.x) * 12;
      S.bike.onGround = true;
      S.bike.prevX = S.bike.x;
      S.bike.flipRot = 0;
      S.bike.spinRot = 0;
      S.bike.flipVel = 0;
      S.bike.spinVel = 0;
      S.bike.lean = 0;
      S.bike.airTime = 0;
      S.bike.grabTime = 0;
      S.bike.basePitch = Math.atan(slopeAt(S.bike.x));
      S.input.left = false;
      S.input.right = false;
      S.input.up = false;
      S.input.down = false;
      S.input.grab = false;
      S.input.boost = false;
      S.input.jumpBuffer = 0;
      dom.over.classList.add('hidden');
      dom.land.classList.add('hidden');
      updateBikeVisual(0);
      snapCamera();
    },
    step: (dt = 1 / 60, n = 1) => {
      for (let i = 0; i < n; i++) update(dt);
      if (renderer) renderer.render(scene, camera);
    },
    dustCount: () => dustParts.filter((p) => p.life > 0).length,
    info: () => renderer ? { calls: renderer.info.render.calls, triangles: renderer.info.render.triangles } : null
  };
})();