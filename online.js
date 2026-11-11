(() => {
  'use strict';

  const game = window.__SENDIT;
  if (!game) return;

  const $ = (id) => document.getElementById(id);
  const fmt = (n) => Math.round(n).toLocaleString('en-US');
  const clamp = (v, a, b) => (v < a ? a : v > b ? b : v);
  const wrapAngle = (a) => {
    a = (a + Math.PI) % (Math.PI * 2);
    if (a < 0) a += Math.PI * 2;
    return a - Math.PI;
  };

  const COLORS = ['#ff8a2a', '#4fc3f7', '#d9ff83', '#ff5e7a', '#b38cff', '#ffd166'];
  const BROKER = 'wss://broker.emqx.io:8084/mqtt';
  const TOPIC_ROOT = 'senditmtb/v1/';
  const ACCOUNTS_KEY = 'sendit.accounts.v1';
  const SESSION_KEY = 'sendit.session.v1';
  const CODE_ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';

  const dom = {
    menu: $('menu'),
    hud: $('hud'),
    over: $('over'),
    profileBtn: $('profileBtn'),
    profileDot: $('profileDot'),
    profileName: $('profileName'),
    onlineBtn: $('onlineBtn'),
    auth: $('auth'),
    authForm: $('authForm'),
    authName: $('authName'),
    authPin: $('authPin'),
    authColors: $('authColors'),
    authError: $('authError'),
    authTitle: $('authTitle'),
    authSubmit: $('authSubmit'),
    authSignedIn: $('authSignedIn'),
    authWho: $('authWho'),
    authBest: $('authBest'),
    authDot: $('authDot'),
    authSignOut: $('authSignOut'),
    authClose: $('authClose'),
    authCloseSigned: $('authCloseSigned'),
    online: $('online'),
    onlineGate: $('onlineGate'),
    onlineHome: $('onlineHome'),
    onlineSignIn: $('onlineSignIn'),
    hostBtn: $('hostBtn'),
    joinBtn: $('joinBtn'),
    joinCode: $('joinCode'),
    onlineStatus: $('onlineStatus'),
    onlineError: $('onlineError'),
    lobby: $('lobby'),
    roomCode: $('roomCode'),
    copyCode: $('copyCode'),
    lobbyPlayers: $('lobbyPlayers'),
    startOnlineBtn: $('startOnlineBtn'),
    leaveLobbyBtn: $('leaveLobbyBtn'),
    lobbyHint: $('lobbyHint'),
    onlineClose: $('onlineClose'),
    ridersPanel: $('ridersPanel'),
    ridersList: $('ridersList'),
    leaveRideBtn: $('leaveRideBtn'),
    bailsPanel: $('bailsPanel')
  };

  let accounts = {};
  let session = null;
  let selectedColor = COLORS[0];
  let returnToOnlineAfterAuth = false;

  function readJSON(key, fallback) {
    try {
      const raw = localStorage.getItem(key);
      return raw ? JSON.parse(raw) : fallback;
    } catch (e) {
      return fallback;
    }
  }

  function writeJSON(key, value) {
    try {
      localStorage.setItem(key, JSON.stringify(value));
    } catch (e) {
      /* ignore */
    }
  }

  function randomId(len = 10) {
    const bytes = new Uint8Array(len);
    if (window.crypto && crypto.getRandomValues) crypto.getRandomValues(bytes);
    else for (let i = 0; i < len; i++) bytes[i] = (Math.random() * 256) | 0;
    return Array.from(bytes).map((b) => (b % 36).toString(36)).join('');
  }

  function randomCode() {
    const bytes = new Uint8Array(5);
    if (window.crypto && crypto.getRandomValues) crypto.getRandomValues(bytes);
    else for (let i = 0; i < 5; i++) bytes[i] = (Math.random() * 256) | 0;
    let out = '';
    for (const b of bytes) out += CODE_ALPHABET[b % CODE_ALPHABET.length];
    return out;
  }

  function currentAccount() {
    return session ? accounts[session] : null;
  }

  async function hashPin(name, pin) {
    const text = `${name.toLowerCase()}:${pin}:sendit-v1`;
    const bytes = new TextEncoder().encode(text);
    if (window.crypto && crypto.subtle) {
      try {
        const digest = await crypto.subtle.digest('SHA-256', bytes);
        return Array.from(new Uint8Array(digest)).map((b) => b.toString(16).padStart(2, '0')).join('');
      } catch (e) {
        /* fall through */
      }
    }
    let h = 2166136261;
    for (const b of bytes) {
      h ^= b;
      h = Math.imul(h, 16777619);
    }
    return (h >>> 0).toString(16);
  }

  function loadAccounts() {
    accounts = readJSON(ACCOUNTS_KEY, {});
    if (!accounts || typeof accounts !== 'object') accounts = {};
    try {
      session = localStorage.getItem(SESSION_KEY);
    } catch (e) {
      session = null;
    }
    if (session && !accounts[session]) session = null;
  }

  function saveAccounts() {
    writeJSON(ACCOUNTS_KEY, accounts);
    try {
      if (session) localStorage.setItem(SESSION_KEY, session);
      else localStorage.removeItem(SESSION_KEY);
    } catch (e) {
      /* ignore */
    }
  }

  function applyProfile() {
    const acct = currentAccount();
    if (acct) {
      game.playerName = acct.name;
      game.playerColor = validColor(acct.color);
      dom.profileName.textContent = acct.name;
      dom.profileBtn.classList.remove('guest');
      dom.profileDot.style.background = game.playerColor;
      dom.authWho.textContent = acct.name;
      dom.authBest.textContent = fmt(acct.best || 0);
      dom.authDot.style.background = game.playerColor;
    } else {
      game.playerName = 'RIDER';
      game.playerColor = COLORS[0];
      dom.profileName.textContent = 'SIGN IN';
      dom.profileBtn.classList.add('guest');
      dom.profileDot.style.background = 'transparent';
      dom.authWho.textContent = '—';
      dom.authBest.textContent = '0';
      dom.authDot.style.background = COLORS[0];
    }
    syncAuthView();
  }

  function syncAuthView() {
    const acct = currentAccount();
    dom.authTitle.textContent = acct ? 'YOUR RIDER' : 'SIGN IN';
    dom.authForm.classList.toggle('is-hidden', !!acct);
    dom.authSignedIn.classList.toggle('is-hidden', !acct);
  }

  function buildSwatches() {
    for (const color of COLORS) {
      const button = document.createElement('button');
      button.type = 'button';
      button.className = 'swatch';
      button.style.background = color;
      button.dataset.color = color;
      button.setAttribute('aria-label', `Bike color ${color}`);
      button.addEventListener('click', () => {
        selectedColor = color;
        updateSwatches();
      });
      dom.authColors.appendChild(button);
    }
  }

  function updateSwatches() {
    for (const swatch of dom.authColors.children) {
      swatch.classList.toggle('selected', swatch.dataset.color === selectedColor);
    }
  }

  function openAuth(returnOnline = false) {
    returnToOnlineAfterAuth = returnOnline;
    if (returnOnline) dom.online.classList.add('hidden');
    const acct = currentAccount();
    dom.authError.textContent = '';
    dom.authName.value = acct ? acct.name : '';
    dom.authPin.value = '';
    selectedColor = acct ? acct.color : COLORS[0];
    updateSwatches();
    syncAuthView();
    dom.auth.classList.remove('hidden');
    setTimeout(() => {
      (acct ? dom.authCloseSigned : dom.authName).focus();
    }, 60);
  }

  function closeAuth() {
    dom.auth.classList.add('hidden');
    if (returnToOnlineAfterAuth && currentAccount()) {
      returnToOnlineAfterAuth = false;
      openOnline();
    } else {
      returnToOnlineAfterAuth = false;
    }
  }

  async function submitAuth(event) {
    event.preventDefault();
    dom.authError.textContent = '';
    const name = dom.authName.value.trim();
    const pin = dom.authPin.value.trim();
    if (!/^[A-Za-z0-9 _-]{2,14}$/.test(name)) {
      dom.authError.textContent = 'Name needs 2–14 letters, numbers, spaces, _ or -.';
      return;
    }
    if (!/^\d{4,8}$/.test(pin)) {
      dom.authError.textContent = 'PIN needs to be 4–8 digits.';
      return;
    }
    const key = name.toLowerCase();
    const existing = accounts[key];
    const canonical = existing ? existing.name : name;
    dom.authSubmit.disabled = true;
    dom.authSubmit.textContent = 'CHECKING…';
    let hash;
    try {
      hash = await hashPin(canonical, pin);
    } catch (e) {
      dom.authSubmit.disabled = false;
      dom.authSubmit.textContent = 'SIGN IN / CREATE';
      dom.authError.textContent = 'Could not save the profile. Try again.';
      return;
    }
    dom.authSubmit.disabled = false;
    dom.authSubmit.textContent = 'SIGN IN / CREATE';

    if (existing) {
      if (existing.hash !== hash) {
        dom.authError.textContent = 'Wrong PIN for that rider.';
        return;
      }
      existing.color = selectedColor;
      existing.lastSeen = Date.now();
      session = key;
    } else {
      accounts[key] = {
        name,
        color: selectedColor,
        hash,
        best: 0,
        created: Date.now()
      };
      session = key;
    }
    saveAccounts();
    applyProfile();
    game.sfx.init();
    game.sfx.click();
    if (returnToOnlineAfterAuth) {
      returnToOnlineAfterAuth = false;
      dom.auth.classList.add('hidden');
      openOnline();
    }
  }

  function signOut() {
    session = null;
    saveAccounts();
    applyProfile();
    dom.authPin.value = '';
    dom.authError.textContent = '';
    game.playerName = 'RIDER';
    game.playerColor = COLORS[0];
  }

  /* ── network ─────────────────────────────────────────────── */

  const net = {
    client: null,
    topic: '',
    roomCode: '',
    selfId: 'rider_' + randomId(10),
    hostId: '',
    isHost: false,
    started: false,
    players: new Map(),
    closing: false,
    joinTimer: null,
    lobbyTimer: null,
    pingTimer: null,
    sendAcc: 0,
    boardAcc: 0,
    lastHostSeen: 0,
    connected: false
  };

  const profile = () => {
    const acct = currentAccount();
    return acct ? { name: acct.name, color: acct.color } : { name: 'RIDER', color: COLORS[0] };
  };

  function setOnlineError(msg) {
    dom.onlineError.textContent = msg || '';
  }

  function setStatus(msg) {
    dom.onlineStatus.textContent = msg || '';
  }

  function publish(payload, qos = 1) {
    if (!net.client || !net.connected || !net.topic) return;
    net.client.publish(net.topic, JSON.stringify(payload), { qos });
  }

  function connectBroker(onReady) {
    if (typeof mqtt === 'undefined') {
      setOnlineError('The live relay could not load. Check your connection and try again.');
      resetRoomAfterFailure();
      return;
    }
    net.closing = false;
    const client = mqtt.connect(BROKER, {
      clientId: 'sendit_' + net.selfId + '_' + randomId(6),
      clean: true,
      connectTimeout: 8000,
      reconnectPeriod: 0
    });
    net.client = client;
    let opened = false;
    let failureTimer = setTimeout(() => {
      if (opened) return;
      setOnlineError('Could not reach the live relay. Try again.');
      resetRoomAfterFailure();
    }, 10000);

    client.on('connect', () => {
      net.connected = true;
      client.subscribe(net.topic, { qos: 0 }, (err) => {
        clearTimeout(failureTimer);
        if (err) {
          setOnlineError('Could not open the room. Try again.');
          resetRoomAfterFailure();
          return;
        }
        opened = true;
        onReady();
      });
    });

    client.on('message', (topic, payload) => {
      if (topic !== net.topic) return;
      let msg;
      try {
        msg = JSON.parse(payload.toString());
      } catch (e) {
        return;
      }
      handleMessage(msg);
    });

    client.on('error', () => {
      if (!opened) setOnlineError('Could not reach the live relay. Try again.');
    });

    client.on('close', () => {
      net.connected = false;
      if (net.closing) return;
      if (net.roomCode) hostOrGuestLost();
    });
  }

  function resetRoomAfterFailure() {
    clearTimeout(net.joinTimer);
    clearInterval(net.lobbyTimer);
    clearInterval(net.pingTimer);
    net.joinTimer = null;
    net.lobbyTimer = null;
    net.pingTimer = null;
    net.closing = true;
    if (net.client) {
      try { net.client.end(true); } catch (e) { /* ignore */ }
    }
    net.client = null;
    net.connected = false;
    net.roomCode = '';
    net.topic = '';
    net.hostId = '';
    net.isHost = false;
    net.started = false;
    net.startedAt = 0;
    net.players.clear();
    net.closing = false;
    game.onTick = null;
    game.remotes.clear();
    setStatus('');
    updateOnlineUI();
  }

  function teardown() {
    net.closing = true;
    clearTimeout(net.joinTimer);
    clearInterval(net.lobbyTimer);
    clearInterval(net.pingTimer);
    net.joinTimer = null;
    net.lobbyTimer = null;
    net.pingTimer = null;
    net.connected = false;
    net.started = false;
    net.startedAt = 0;
    if (net.client) {
      try {
        net.client.end(true);
      } catch (e) {
        /* ignore */
      }
    }
    net.client = null;
    net.topic = '';
    net.roomCode = '';
    net.hostId = '';
    net.isHost = false;
    net.players.clear();
    net.closing = false;
    game.onTick = null;
    game.remotes.clear();
    setStatus('');
  }

  function hostOrGuestLost() {
    if (net.started) {
      endOnlineSession('CONNECTION LOST');
    } else {
      teardown();
      setStatus('');
      setOnlineError('Connection lost. Try again.');
      updateOnlineUI();
    }
  }

  function hostInit() {
    const p = profile();
    net.isHost = true;
    net.hostId = net.selfId;
    net.players.set(net.selfId, { id: net.selfId, name: p.name, color: p.color, lastSeen: Date.now(), host: true });
    net.lastHostSeen = Date.now();
    if (typeof net.client.publish !== 'function') return;
    broadcastLobby();
    net.lobbyTimer = setInterval(() => {
      if (!net.isHost || net.started) return;
      const now = Date.now();
      let changed = false;
      for (const [id, player] of net.players) {
        if (id === net.selfId) continue;
        if (now - player.lastSeen > 9000) {
          net.players.delete(id);
          changed = true;
        }
      }
      if (changed) broadcastLobby();
      else if (net.players.size > 1) {
        // keep guests' host-presence timers fresh
        broadcastLobby();
      }
    }, 2200);
    updateOnlineUI();
  }

  function guestJoin() {
    const p = profile();
    net.players.set(net.selfId, { id: net.selfId, name: p.name, color: p.color, lastSeen: Date.now(), host: false });
    net.lastHostSeen = Date.now();
    publish({ type: 'join', id: net.selfId, name: p.name, color: p.color }, 1);
    updateOnlineUI();
    clearTimeout(net.joinTimer);
    net.joinTimer = setTimeout(() => {
      if (!net.started && net.players.size < 2) {
        setOnlineError('No ride found with that code. Check it and try again.');
        teardown();
        updateOnlineUI();
      }
    }, 7000);
    net.pingTimer = setInterval(() => {
      if (net.started || net.isHost) return;
      const q = profile();
      publish({ type: 'ping', id: net.selfId, name: q.name, color: q.color }, 0);
      if (Date.now() - net.lastHostSeen > 9000) {
        endOnlineSession('THE HOST LEFT');
      }
    }, 3000);
  }

  function broadcastLobby() {
    if (!net.isHost) return;
    const players = [];
    const self = net.players.get(net.selfId);
    if (self) players.push({ id: self.id, name: self.name, color: self.color });
    for (const [id, p] of net.players) {
      if (id === net.selfId) continue;
      players.push({ id, name: p.name, color: p.color });
    }
    publish({ type: 'lobby', hostId: net.selfId, players }, 0);
    renderLobbyPlayers(players);
  }

  function handleMessage(msg) {
    if (!msg || typeof msg !== 'object') return;
    if (msg.type === 'state') {
      if (msg.id && msg.id !== net.selfId) receiveState(msg);
      return;
    }
    if (msg.id === net.selfId) return;

    if (net.isHost) {
      if (msg.type === 'join') {
        if (net.started) {
          publish({ type: 'in-progress', for: msg.id }, 1);
          return;
        }
        const name = sanitizeName(msg.name);
        if (!name) return;
        net.players.set(msg.id, {
          id: msg.id,
          name,
          color: validColor(msg.color),
          lastSeen: Date.now(),
          host: false
        });
        broadcastLobby();
        updateOnlineUI();
      } else if (msg.type === 'ping') {
        if (net.started) return;
        const existing = net.players.get(msg.id);
        if (existing) existing.lastSeen = Date.now();
        else {
          const name = sanitizeName(msg.name);
          if (!name) return;
          net.players.set(msg.id, {
            id: msg.id,
            name,
            color: validColor(msg.color),
            lastSeen: Date.now(),
            host: false
          });
          broadcastLobby();
          updateOnlineUI();
        }
      } else if (msg.type === 'leave') {
        if (net.players.delete(msg.id) && !net.started) {
          broadcastLobby();
          updateOnlineUI();
        }
      }
      return;
    }

    if (msg.type === 'lobby') {
      if (net.started || net.isHost) return;
      if (!msg.hostId) return;
      if (net.hostId && msg.hostId !== net.hostId) return;
      net.hostId = msg.hostId;
      net.lastHostSeen = Date.now();
      net.players.clear();
      net.players.set(net.selfId, { id: net.selfId, name: profile().name, color: profile().color, host: false, lastSeen: Date.now() });
      for (const p of msg.players || []) {
        if (!p || !p.id || p.id === net.selfId) continue;
        net.players.set(p.id, {
          id: p.id,
          name: sanitizeName(p.name) || 'RIDER',
          color: validColor(p.color),
          host: p.id === net.hostId,
          lastSeen: Date.now()
        });
      }
      clearTimeout(net.joinTimer);
      net.joinTimer = null;
      setStatus('');
      setOnlineError('');
      updateOnlineUI();
    } else if (msg.type === 'start') {
      if (net.started) return;
      if (net.hostId && msg.hostId && msg.hostId !== net.hostId) return;
      const seed = Number(msg.seed);
      if (!Number.isFinite(seed)) return;
      if (!net.hostId) net.hostId = msg.hostId || '';
      startRide(seed >>> 0);
    } else if (msg.type === 'in-progress') {
      if (msg.for !== net.selfId) return;
      setOnlineError('That ride is already in progress. Ask the host for a new room.');
      teardown();
      updateOnlineUI();
    } else if (msg.type === 'end') {
      if (net.hostId && msg.hostId && msg.hostId !== net.hostId) return;
      endOnlineSession('THE HOST ENDED THE RIDE');
    }
  }

  function receiveState(msg) {
    const now = Date.now();
    if (msg.id === net.hostId) net.lastHostSeen = now;
    const target = {
      x: Number(msg.x),
      y: Number(msg.y),
      angle: Number(msg.angle),
      vx: Number(msg.vx) || 0
    };
    if (!Number.isFinite(target.x) || !Number.isFinite(target.y) || !Number.isFinite(target.angle)) return;
    const existing = game.remotes.get(msg.id);
    const name = sanitizeName(msg.name) || 'RIDER';
    const color = validColor(msg.color);
    if (!existing) {
      game.remotes.set(msg.id, {
        id: msg.id,
        name,
        color,
        target,
        render: {
          x: target.x,
          y: target.y,
          angle: target.angle,
          vx: target.vx,
          vy: 0,
          grounded: !!msg.grounded,
          wheelSpin: 0,
          grabbing: false,
          squash: 0
        },
        lastSeen: now
      });
    } else {
      existing.name = name;
      existing.color = color;
      existing.target = target;
      existing.lastSeen = now;
    }
  }

  function sendState() {
    if (!net.connected || !net.started || !game.bike) return;
    if (game.state !== 'playing' && game.state !== 'countdown' && game.state !== 'crashed') return;
    const b = game.bike;
    publish(
      {
        type: 'state',
        id: net.selfId,
        name: game.playerName,
        color: game.playerColor,
        x: Math.round(b.x * 10) / 10,
        y: Math.round(b.y * 10) / 10,
        angle: Math.round(b.angle * 1000) / 1000,
        vx: Math.round(b.vx),
        grounded: b.grounded ? 1 : 0
      },
      0
    );
  }

  function onlineTick(dt) {
    if (!net.started) return;
    net.sendAcc += dt;
    if (net.sendAcc >= 0.12) {
      net.sendAcc = 0;
      sendState();
    }
    if (!net.isHost && Date.now() - net.lastHostSeen > 10000) {
      endOnlineSession('THE HOST LEFT');
      return;
    }
    const now = Date.now();
    for (const [id, r] of game.remotes) {
      if (now - r.lastSeen > 4200) {
        game.remotes.delete(id);
        continue;
      }
      const t = r.target;
      const v = r.render;
      if (Math.abs(t.x - v.x) > 260) {
        v.x = t.x;
        v.y = t.y;
        v.angle = t.angle;
      } else {
        const k = Math.min(1, dt * 13);
        v.x += (t.x - v.x) * k;
        v.y += (t.y - v.y) * k;
        v.angle += wrapAngle(t.angle - v.angle) * Math.min(1, dt * 13);
      }
      v.vx = t.vx;
      v.grounded = !!t.grounded;
      v.wheelSpin += (v.vx * dt) / 12;
    }
    net.boardAcc += dt;
    if (net.boardAcc >= 0.25) {
      net.boardAcc = 0;
      renderRiders();
    }
  }

  function renderRiders() {
    if (!net.started) return;
    const rows = [];
    rows.push({ id: net.selfId, name: game.playerName, color: game.playerColor, dist: game.distance, me: true });
    for (const [id, r] of game.remotes) {
      const d = (r.target ? r.target.x : r.render.x) / 40;
      rows.push({ id, name: r.name, color: r.color, dist: Math.max(0, d), me: false });
    }
    rows.sort((a, b) => b.dist - a.dist);
    dom.ridersList.textContent = '';
    const limit = Math.min(rows.length, 5);
    for (let i = 0; i < limit; i++) {
      const row = document.createElement('div');
      row.className = 'rider-row' + (rows[i].me ? ' me' : '');
      const dot = document.createElement('i');
      dot.style.background = rows[i].color;
      const name = document.createElement('span');
      name.className = 'nm';
      name.textContent = rows[i].name;
      const dist = document.createElement('span');
      dist.className = 'dst';
      dist.textContent = `${fmt(rows[i].dist)}m`;
      row.append(dot, name, dist);
      dom.ridersList.appendChild(row);
    }
    if (rows.length > limit) {
      const more = document.createElement('div');
      more.className = 'rider-row';
      more.style.opacity = '0.55';
      more.textContent = `+${rows.length - limit} more rider${rows.length - limit > 1 ? 's' : ''}`;
      dom.ridersList.appendChild(more);
    }
  }

  function sanitizeName(name) {
    if (typeof name !== 'string') return '';
    return name.trim().replace(/[^A-Za-z0-9 _-]/g, '').slice(0, 14);
  }

  function validColor(color) {
    return typeof color === 'string' && /^#[0-9a-f]{6}$/i.test(color) ? color : COLORS[0];
  }

  /* ── online UI ───────────────────────────────────────────── */

  function updateOnlineUI() {
    const signed = !!currentAccount();
    const inRoom = !!net.roomCode;
    dom.onlineGate.classList.toggle('is-hidden', signed || inRoom);
    dom.onlineHome.classList.toggle('is-hidden', !signed || inRoom);
    dom.lobby.classList.toggle('is-hidden', !inRoom);
    if (inRoom) {
      dom.roomCode.textContent = net.roomCode;
      dom.startOnlineBtn.classList.toggle('is-hidden', !net.isHost);
      dom.lobbyHint.textContent = net.isHost
        ? 'Share the code. Start when everyone is in.'
        : 'Waiting for the host to start…';
      const players = [];
      if (net.isHost) {
        for (const p of net.players.values()) {
          players.push({ id: p.id, name: p.name, color: p.color, host: p.id === net.selfId });
        }
      } else {
        for (const p of net.players.values()) {
          players.push({ id: p.id, name: p.name, color: p.color, host: p.id === net.hostId });
        }
      }
      renderLobbyPlayers(players);
      if (dom.online.classList.contains('hidden')) {
        dom.online.classList.remove('hidden');
      }
    }
  }

  function renderLobbyPlayers(players) {
    dom.lobbyPlayers.textContent = '';
    for (const p of players) {
      const row = document.createElement('div');
      row.className = 'player-row';
      const dot = document.createElement('i');
      dot.style.background = p.color;
      const name = document.createElement('b');
      name.textContent = p.name || 'RIDER';
      row.append(dot, name);
      const tag = document.createElement('span');
      tag.className = 'tag' + (p.host ? ' host' : '');
      tag.textContent = p.host ? 'HOST' : p.id === net.selfId ? 'YOU' : '';
      if (tag.textContent) row.append(tag);
      dom.lobbyPlayers.appendChild(row);
    }
  }

  function openOnline() {
    setOnlineError('');
    setStatus('');
    dom.online.classList.remove('hidden');
    if (net.roomCode) {
      updateOnlineUI();
    } else {
      updateOnlineUI();
    }
  }

  function closeOnline() {
    if (net.roomCode) {
      leaveRoom(true);
    } else {
      dom.online.classList.add('hidden');
    }
  }

  function startHosting() {
    const acct = currentAccount();
    if (!acct) {
      openAuth(true);
      return;
    }
    if (net.roomCode) return;
    game.sfx.init();
    game.sfx.click();
    net.roomCode = randomCode();
    net.topic = TOPIC_ROOT + net.roomCode;
    net.isHost = true;
    net.hostId = net.selfId;
    net.started = false;
    net.startedAt = 0;
    net.players.clear();
    net.players.set(net.selfId, { id: net.selfId, name: acct.name, color: acct.color, lastSeen: Date.now(), host: true });
    dom.onlineHome.classList.add('is-hidden');
    dom.lobby.classList.remove('is-hidden');
    dom.roomCode.textContent = net.roomCode;
    renderLobbyPlayers([{ id: net.selfId, name: acct.name, color: acct.color, host: true }]);
    setOnlineError('');
    setStatus('Connecting to the live relay…');
    connectBroker(() => {
      setStatus('');
      hostInit();
      updateOnlineUI();
    });
  }

  function joinRide() {
    const acct = currentAccount();
    if (!acct) {
      openAuth(true);
      return;
    }
    if (net.roomCode) return;
    const code = (dom.joinCode.value || '').trim().toUpperCase();
    if (!/^[A-Z2-9]{5}$/.test(code) || [...code].some((c) => !CODE_ALPHABET.includes(c))) {
      setStatus('');
      setOnlineError('Enter the 5-character room code.');
      return;
    }
    game.sfx.init();
    game.sfx.click();
    net.roomCode = code;
    net.topic = TOPIC_ROOT + code;
    net.isHost = false;
    net.hostId = '';
    net.started = false;
    net.startedAt = 0;
    net.players.clear();
    net.players.set(net.selfId, { id: net.selfId, name: acct.name, color: acct.color, lastSeen: Date.now(), host: false });
    setOnlineError('');
    setStatus('Connecting…');
    dom.onlineHome.classList.add('is-hidden');
    dom.lobby.classList.remove('is-hidden');
    dom.roomCode.textContent = code;
    dom.startOnlineBtn.classList.add('is-hidden');
    dom.lobbyHint.textContent = 'Connecting to the host…';
    dom.lobbyPlayers.textContent = '';
    connectBroker(() => {
      setStatus('');
      guestJoin();
    });
  }

  function hostStart() {
    if (!net.isHost || net.started || !net.roomCode) return;
    if (!net.connected) {
      setOnlineError('Still connecting to the live relay…');
      return;
    }
    game.sfx.init();
    game.sfx.click();
    const seed = ((window.crypto && crypto.getRandomValues ? crypto.getRandomValues(new Uint32Array(1))[0] : Math.random() * 0xffffffff) >>> 0);
    net.started = true;
    net.startedAt = 0;
    publish({ type: 'start', seed, hostId: net.selfId }, 1);
    setTimeout(() => {
      if (net.started && net.roomCode) publish({ type: 'start', seed, hostId: net.selfId }, 1);
    }, 700);
    setTimeout(() => {
      if (net.started && net.roomCode) publish({ type: 'start', seed, hostId: net.selfId }, 1);
    }, 1500);
    startRide(seed);
  }

  function startRide(seed) {
    if (net.started && net.startedAt) return;
    net.started = true;
    net.startedAt = Date.now();
    clearTimeout(net.joinTimer);
    clearInterval(net.lobbyTimer);
    clearInterval(net.pingTimer);
    net.joinTimer = null;
    net.lobbyTimer = null;
    net.pingTimer = null;
    dom.online.classList.add('hidden');
    dom.auth.classList.add('hidden');
    dom.menu.classList.add('hidden');
    dom.over.classList.add('hidden');
    dom.hud.classList.remove('hidden');
    dom.hud.setAttribute('aria-hidden', 'false');
    dom.bailsPanel.classList.add('online-hide');
    dom.ridersPanel.classList.remove('is-hidden');
    dom.ridersList.textContent = '';
    game.startOnline(seed >>> 0);
    game.onTick = onlineTick;
    net.sendAcc = 0;
    net.boardAcc = 0;
    game.onToast?.('RIDE TOGETHER');
  }

  function leaveRoom(announce = true) {
    const wasStarted = net.started;
    const wasHost = net.isHost;
    if (net.client && net.connected && net.roomCode) {
      if (wasHost) publish({ type: 'end', hostId: net.selfId }, 1);
      else publish({ type: 'leave', id: net.selfId }, 1);
    }
    net.closing = true;
    clearTimeout(net.joinTimer);
    clearInterval(net.lobbyTimer);
    clearInterval(net.pingTimer);
    net.joinTimer = null;
    net.lobbyTimer = null;
    net.pingTimer = null;
    const client = net.client;
    net.client = null;
    net.connected = false;
    net.roomCode = '';
    net.topic = '';
    net.hostId = '';
    net.isHost = false;
    net.started = false;
    net.startedAt = 0;
    net.players.clear();
    game.remotes.clear();
    game.onTick = null;
    dom.online.classList.add('hidden');
    dom.auth.classList.add('hidden');
    dom.lobby.classList.add('is-hidden');
    if (client) {
      setTimeout(() => {
        try {
          client.end(true);
        } catch (e) {
          /* ignore */
        }
      }, announce ? 120 : 0);
    }
    if (wasStarted) {
      endOnlineSession(announce && !wasHost ? 'YOU LEFT THE RIDE' : '');
    } else {
      dom.menu.classList.remove('hidden');
      dom.hud.classList.add('hidden');
      dom.bailsPanel.classList.remove('online-hide');
      dom.ridersPanel.classList.add('is-hidden');
      game.endOnline();
    }
  }

  function endOnlineSession(message) {
    clearTimeout(net.joinTimer);
    clearInterval(net.lobbyTimer);
    clearInterval(net.pingTimer);
    net.joinTimer = null;
    net.lobbyTimer = null;
    net.pingTimer = null;
    net.closing = true;
    const client = net.client;
    net.client = null;
    net.connected = false;
    net.roomCode = '';
    net.topic = '';
    net.hostId = '';
    net.isHost = false;
    net.started = false;
    net.players.clear();
    net.startedAt = 0;
    game.remotes.clear();
    game.onTick = null;
    if (client) {
      try {
        client.end(true);
      } catch (e) {
        /* ignore */
      }
    }
    dom.online.classList.add('hidden');
    dom.auth.classList.add('hidden');
    dom.hud.classList.add('hidden');
    dom.menu.classList.remove('hidden');
    dom.bailsPanel.classList.remove('online-hide');
    dom.ridersPanel.classList.add('is-hidden');
    game.endOnline();
    if (message) game.onToast?.(message);
  }

  /* ── events ──────────────────────────────────────────────── */

  loadAccounts();
  buildSwatches();
  applyProfile();
  updateSwatches();

  const previousGameOver = game.onGameOver;
  game.onGameOver = (g, isBest) => {
    const acct = currentAccount();
    if (acct && g.totalScore > (acct.best || 0)) {
      acct.best = g.totalScore;
      saveAccounts();
      dom.authBest.textContent = fmt(acct.best);
    }
    if (previousGameOver) previousGameOver(g, isBest);
  };

  dom.profileBtn.addEventListener('click', () => openAuth(false));
  dom.onlineBtn.addEventListener('click', () => {
    if (!currentAccount()) openAuth(true);
    else openOnline();
  });
  dom.onlineSignIn.addEventListener('click', () => openAuth(true));
  dom.authClose.addEventListener('click', closeAuth);
  dom.authCloseSigned.addEventListener('click', closeAuth);
  dom.authSignOut.addEventListener('click', signOut);
  dom.authForm.addEventListener('submit', submitAuth);
  dom.auth.addEventListener('pointerdown', (e) => {
    if (e.target === dom.auth) closeAuth();
  });
  dom.online.addEventListener('pointerdown', (e) => {
    if (e.target === dom.online) closeOnline();
  });
  dom.onlineClose.addEventListener('click', closeOnline);
  dom.hostBtn.addEventListener('click', startHosting);
  dom.joinBtn.addEventListener('click', joinRide);
  dom.joinCode.addEventListener('input', () => {
    const clean = dom.joinCode.value.toUpperCase().replace(/[^A-Z2-9]/g, '').slice(0, 5);
    dom.joinCode.value = clean;
  });
  dom.joinCode.addEventListener('keydown', (e) => {
    if (e.code === 'Enter') {
      e.preventDefault();
      joinRide();
    }
  });
  dom.copyCode.addEventListener('click', async () => {
    try {
      await navigator.clipboard.writeText(net.roomCode);
      dom.copyCode.textContent = 'COPIED';
      setTimeout(() => {
        dom.copyCode.textContent = 'COPY';
      }, 1200);
    } catch (e) {
      dom.copyCode.textContent = net.roomCode;
      setTimeout(() => {
        dom.copyCode.textContent = 'COPY';
      }, 1200);
    }
  });
  dom.startOnlineBtn.addEventListener('click', hostStart);
  dom.leaveLobbyBtn.addEventListener('click', () => leaveRoom(true));
  dom.leaveRideBtn.addEventListener('click', () => leaveRoom(true));

  window.addEventListener('beforeunload', () => {
    if (net.client && net.roomCode) {
      if (net.isHost) publish({ type: 'end', hostId: net.selfId }, 0);
      else publish({ type: 'leave', id: net.selfId }, 0);
    }
  });

  // expose for debugging / test harnesses
  window.__SENDIT_ONLINE = net;
})();