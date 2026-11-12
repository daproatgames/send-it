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
  const U = [-90, -52, -32, -20, -14, -11, -9.5, -7, -5.5, -4, -2, 0, 2, 4, 5.5, 7, 9.5, 11, 14, 20, 32, 52, 90];
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

  function pathZ(x) {
    return Math.sin(x / 72) * 18 + Math.sin(x / 185 + 1.4) * 30 + Math.sin(x / 27 + 0.6) * 2.2;
  }

  function pathDZ(x) {
    return (18 / 72) * Math.cos(x / 72) + (30 / 185) * Math.cos(x / 185 + 1.4) + (2.2 / 27) * Math.cos(x / 27 + 0.6);
  }

  function terrainY(x) {
    return -S.world.profile.groundY(x * 40) / 40 * HEIGHT_SCALE;
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
    renderer.toneMappingExposure = 0.84;

    scene = new THREE.Scene();
    scene.fog = new THREE.Fog(0xd4e1d3, 90, 700);

    camera = new THREE.PerspectiveCamera(62, window.innerWidth / window.innerHeight, 0.08, 1200);
    camera.position.set(-7, 4, 0);

    const hemi = new THREE.HemisphereLight(0xfff2d2, 0x263822, 0.54);
    scene.add(hemi);

    const sun = new THREE.DirectionalLight(0xffe3b0, 0.8);
    sun.position.set(-70, 90, 45);
    scene.add(sun);

    const fill = new THREE.DirectionalLight(0x9fc8c8, 0.16);
    fill.position.set(50, 30, -60);
    scene.add(fill);

    M.frame = new THREE.MeshStandardMaterial({
      color: new THREE.Color(game.playerColor || '#ff8a2a'),
      roughness: 0.45,
      metalness: 0.18
    });
    M.dark = new THREE.MeshStandardMaterial({ color: 0x17130e, roughness: 0.9 });
    M.tire = new THREE.MeshStandardMaterial({ color: 0x15120e, roughness: 0.95 });
    M.rim = new THREE.MeshStandardMaterial({ color: 0xd6ceb9, roughness: 0.45, metalness: 0.25 });
    M.jersey = new THREE.MeshStandardMaterial({ color: 0x216d72, roughness: 0.85 });
    M.helmet = new THREE.MeshStandardMaterial({ color: 0xf2e7cd, roughness: 0.55 });
    M.skin = new THREE.MeshStandardMaterial({ color: 0xc98e66, roughness: 0.9 });
    M.pants = new THREE.MeshStandardMaterial({ color: 0x151b17, roughness: 0.95 });
    M.shoe = new THREE.MeshStandardMaterial({ color: 0x0d0b09, roughness: 0.9 });
    M.flag = new THREE.MeshStandardMaterial({ color: 0xff8a2a, roughness: 0.8 });
    M.flag2 = new THREE.MeshStandardMaterial({ color: 0xf7f1e1, roughness: 0.8 });

    createBike();
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

  function terrainColor(u, x) {
    const a = Math.abs(u);
    const n = hash(x * 0.37 + u * 0.21 + 7.3);
    const dirt = new THREE.Color('#5e4128');
    const dirtDark = new THREE.Color('#422a17');
    const dirtLight = new THREE.Color('#7c5a36');
    const grass = new THREE.Color('#3a6b2c');
    const grassLight = new THREE.Color('#6f9e3e');
    const green = new THREE.Color('#2f5831');
    const dark = new THREE.Color('#1d3b28');
    const rock = new THREE.Color('#60594d');
    let c;
    if (a < 5.4) {
      c = dirt.clone().lerp(dirtDark, 0.25 + n * 0.4);
      if (a < 1.6) c.lerp(dirtLight, 0.16);
    } else if (a < 9.2) {
      c = grass.clone().lerp(grassLight, 0.12 + n * 0.36);
    } else if (u < 0) {
      c = green.clone().lerp(dark, 0.3 + n * 0.4);
      if (a > 55) c.lerp(rock, 0.25);
    } else {
      c = green.clone().lerp(dark, 0.2 + n * 0.45);
      if (a > 55) c.lerp(rock, 0.3);
    }
    return c;
  }

  function buildWorld(seed) {
    if (worldGroup) disposeGroup(worldGroup);
    worldGroup = new THREE.Group();
    scene.add(worldGroup);

    const profile = new Terrain(seed);
    profile.extendTo(MAX_X * 40 + 5000);
    S.world = { seed, profile };

    const xStart = -30;
    const rows = Math.floor((MAX_X - xStart) / STEP_X) + 1;
    const cols = U.length;
    const positions = new Float32Array(rows * cols * 3);
    const colors = new Float32Array(rows * cols * 3);
    let p = 0;
    let c = 0;
    for (let i = 0; i < rows; i++) {
      const x = xStart + i * STEP_X;
      const base = terrainY(x);
      const z0 = pathZ(x);
      for (let j = 0; j < cols; j++) {
        const u = U[j];
        const y = base + sideY(u);
        positions[p++] = x;
        positions[p++] = y;
        positions[p++] = z0 + u;
        const col = terrainColor(u, x);
        colors[c++] = col.r;
        colors[c++] = col.g;
        colors[c++] = col.b;
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
    geo.setAttribute('color', new THREE.BufferAttribute(colors, 3));
    geo.setIndex(indices);
    geo.computeVertexNormals();
    const mat = new THREE.MeshStandardMaterial({
      vertexColors: true,
      roughness: 0.96,
      metalness: 0,
      flatShading: true
    });
    const mesh = new THREE.Mesh(geo, mat);
    mesh.frustumCulled = false;
    worldGroup.add(mesh);

    addTrees();
    addRocks();
    addMarkers();
    addMountains();
    addGates();
    addFinishGate();
    addRut();
    addTufts();
  }

  function addTrees() {
    const trees = [];
    for (let x = 8; x < MAX_X; x += 5.2) {
      for (const side of [-1, 1]) {
        const h = hash(x * 0.131 + side * 17.3);
        if (h < 0.31) continue;
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

    const trunkGeo = new THREE.CylinderGeometry(0.1, 0.18, 2.2, 5);
    trunkGeo.translate(0, 1.1, 0);
    const coneGeo = new THREE.ConeGeometry(1.65, 4.3, 6);
    coneGeo.translate(0, 3.6, 0);
    const coneGeo2 = new THREE.ConeGeometry(1.1, 3.1, 6);
    coneGeo2.translate(0, 5.5, 0);

    const trunkMat = new THREE.MeshStandardMaterial({ color: 0x3a2a1d, roughness: 1, flatShading: true });
    const leafMat = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.95, flatShading: true });

    const trunks = new THREE.InstancedMesh(trunkGeo, trunkMat, count);
    const leaves1 = new THREE.InstancedMesh(coneGeo, leafMat, count);
    const leaves2 = new THREE.InstancedMesh(coneGeo2, leafMat, count);
    const dummy = new THREE.Object3D();
    const leafColors = [new THREE.Color('#214832'), new THREE.Color('#2b5a3d'), new THREE.Color('#193d2a'), new THREE.Color('#356b47')];

    for (let i = 0; i < count; i++) {
      const t = trees[i];
      dummy.position.set(t.x, t.y, t.z);
      dummy.rotation.set(0, t.rot, 0);
      dummy.scale.set(t.s, t.s, t.s);
      dummy.updateMatrix();
      trunks.setMatrixAt(i, dummy.matrix);
      leaves1.setMatrixAt(i, dummy.matrix);
      leaves2.setMatrixAt(i, dummy.matrix);
      const col = leafColors[(t.shade * leafColors.length) | 0];
      leaves1.setColorAt(i, col);
      leaves2.setColorAt(i, col);
    }
    trunks.instanceMatrix.needsUpdate = true;
    leaves1.instanceMatrix.needsUpdate = true;
    leaves2.instanceMatrix.needsUpdate = true;
    if (leaves1.instanceColor) leaves1.instanceColor.needsUpdate = true;
    if (leaves2.instanceColor) leaves2.instanceColor.needsUpdate = true;
    worldGroup.add(trunks, leaves1, leaves2);
  }

  function addRocks() {
    const count = 95;
    const geo = new THREE.DodecahedronGeometry(1, 0);
    const mat = new THREE.MeshStandardMaterial({ color: 0x6f6758, roughness: 0.95, flatShading: true });
    const mesh = new THREE.InstancedMesh(geo, mat, count);
    const dummy = new THREE.Object3D();
    const colors = [new THREE.Color('#5f5a4d'), new THREE.Color('#706858'), new THREE.Color('#4c4a3f')];
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

    const poleMat = new THREE.MeshStandardMaterial({ color: 0x4a3726, roughness: 0.95 });
    const flagMat = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.75 });
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
    worldGroup.add(poles, flags);
  }

  function addMountains() {
    const layers = [
      { dist: 300, h: 92, amp: 42, color: 0x6f8b87, seed: 1.4, base: -80 },
      { dist: 560, h: 150, amp: 65, color: 0x8ea6a2, seed: 4.1, base: -120 }
    ];
    for (const L of layers) {
      for (const side of [-1, 1]) {
        const positions = [];
        const indices = [];
        let n = 0;
        for (let x = -200; x <= MAX_X + 300; x += 24) {
          const dist = L.dist + Math.sin(x / 280 + side * 1.3) * 60;
          const z = pathZ(x) + side * dist;
          const base = terrainY(x) + L.base;
          const top =
            terrainY(x) +
            L.h +
            Math.sin(x / 115 + side * L.seed) * L.amp +
            Math.sin(x / 41 + side * 2.3) * L.amp * 0.35 +
            hash(x * 0.017 + side * 7) * L.amp * 0.8;
          positions.push(x, base, z, x, top, z);
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
        const mat = new THREE.MeshBasicMaterial({ color: L.color, side: THREE.DoubleSide, fog: true });
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
      opacity: 0.35,
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
    const geo = new THREE.DodecahedronGeometry(0.3, 0);
    const mat = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 1, flatShading: true });
    const mesh = new THREE.InstancedMesh(geo, mat, count);
    const dummy = new THREE.Object3D();
    const colors = [new THREE.Color('#3f7330'), new THREE.Color('#5d8a3e'), new THREE.Color('#79a845')];
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
      worldGroup.add(mesh);
      S.gates.push({ x, z, y, mesh, passed: false });
      i++;
    }
  }

  function addFinishGate() {
    const x = MAX_X - 25;
    const z = pathZ(x);
    const y = terrainY(x);
    const poleMat = new THREE.MeshStandardMaterial({ color: 0x3a2a1d, roughness: 0.9 });
    const poleGeo = new THREE.CylinderGeometry(0.14, 0.22, 7.4, 7);
    poleGeo.translate(0, 3.7, 0);
    for (const side of [-1, 1]) {
      const p = new THREE.Mesh(poleGeo, poleMat);
      p.position.set(x, y, z + side * 6.0);
      worldGroup.add(p);
    }
    const bar = new THREE.Mesh(new THREE.BoxGeometry(0.35, 0.35, 12.4), poleMat);
    bar.position.set(x, y + 7.4, z);
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
    const geo = new THREE.CylinderGeometry(r, r, len, 6);
    const mesh = new THREE.Mesh(geo, mat);
    mesh.position.copy(a).add(b).multiplyScalar(0.5);
    mesh.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), dir.normalize());
    return mesh;
  }

  function sphere(x, y, z, r, mat) {
    const mesh = new THREE.Mesh(new THREE.SphereGeometry(r, 8, 6), mat);
    mesh.position.set(x, y, z);
    return mesh;
  }

  function makeWheel(x) {
    const g = new THREE.Group();
    g.position.set(x, 0.4, 0);
    const tire = new THREE.Mesh(new THREE.TorusGeometry(0.33, 0.055, 6, 16), M.tire);
    g.add(tire);
    const rim = new THREE.Mesh(new THREE.TorusGeometry(0.255, 0.014, 4, 16), M.rim);
    g.add(rim);
    for (let i = 0; i < 4; i++) {
      const spoke = new THREE.Mesh(new THREE.BoxGeometry(0.49, 0.012, 0.012), M.rim);
      spoke.rotation.z = (i * Math.PI) / 4;
      g.add(spoke);
    }
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
    const torso = new THREE.Mesh(new THREE.SphereGeometry(0.3, 8, 6), M.jersey);
    torso.position.set(-0.075, 1.27, 0);
    torso.scale.set(0.78, 1.32, 0.86);
    bikeModel.add(torso);
    bikeModel.add(tube(hip, shoulder, 0.13, M.jersey));
    bikeModel.add(sphere(hip.x, hip.y, hip.z, 0.15, M.pants));
    bikeModel.add(sphere(shoulder.x, shoulder.y, shoulder.z + 0.15, 0.1, M.jersey));
    bikeModel.add(sphere(shoulder.x, shoulder.y, shoulder.z - 0.15, 0.1, M.jersey));
    bikeModel.add(sphere(headC.x, headC.y, headC.z, 0.165, M.skin));
    const helmet = sphere(headC.x, headC.y + 0.035, headC.z, 0.185, M.helmet);
    helmet.scale.set(1, 0.85, 1.05);
    bikeModel.add(helmet);
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
    bikeModel.add(sphere(footL.x, footL.y, footL.z, 0.075, M.shoe));
    bikeModel.add(sphere(footR.x, footR.y, footR.z, 0.075, M.shoe));

    const elbowL = new THREE.Vector3(0.4, 1.27, 0.23);
    const elbowR = new THREE.Vector3(0.4, 1.27, -0.23);
    const handL = new THREE.Vector3(0.52, 1.0, 0.24);
    const handR = new THREE.Vector3(0.52, 1.0, -0.24);
    bikeModel.add(tube(shoulder.clone().add(new THREE.Vector3(0, 0, 0.14)), elbowL, 0.055, M.jersey));
    bikeModel.add(tube(elbowL, handL, 0.045, M.skin));
    bikeModel.add(tube(shoulder.clone().add(new THREE.Vector3(0, 0, -0.14)), elbowR, 0.055, M.jersey));
    bikeModel.add(tube(elbowR, handR, 0.045, M.skin));

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
    if (!S.world || newWorld) buildWorld(randomSeed());
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
    const isBest = total > S.best3d;
    if (isBest) {
      S.best3d = total;
      saveBest3d(total);
    }
    dom.finalScore.textContent = fmt(total);
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

    // smooth steering
    const steerTarget = (S.input.right ? 1 : 0) - (S.input.left ? 1 : 0);
    b.steer += (steerTarget - b.steer) * Math.min(1, dt * 8);

    if (b.onGround) {
      const slope = slopeAt(b.x);
      const norm = Math.sqrt(1 + slope * slope);
      let accel = GRAVITY * (-slope) / norm + 3.2;
      if (S.input.down) accel -= 7;
      accel -= 0.0058 * b.vx * b.vx;
      let boosting = false;
      if (S.input.boost && S.boost > 0.01) {
        accel += 6.5;
        S.boost = Math.max(0, S.boost - dt * 0.36);
        boosting = true;
        if (!S.boosting) game.sfx.boost();
      }
      S.boosting = boosting;
      const cap = boosting ? 33 : 27;
      b.vx = clamp(b.vx + accel * dt, 0, cap);

      const lateralSpeed = 3.7 + b.vx * 0.07;
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
      if (S.input.up) flipTarget = 7.0;
      else if (S.input.down) flipTarget = -7.0;
      b.flipVel += (flipTarget - b.flipVel) * Math.min(1, dt * 9);
      if (!flipTarget) b.flipVel *= Math.exp(-4.2 * dt);
      b.flipRot += b.flipVel * dt;

      let spinTarget = 0;
      if (S.input.left) spinTarget = 6.2;
      else if (S.input.right) spinTarget = -6.2;
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

    if (rem > 1.12) {
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
      shadow.material.opacity = 0.9 * sc;
    }
  }

  function updateShadow(dt) {
    // shadow is updated in updateBikeVisual
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
    }
  };
})();