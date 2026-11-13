const $ = (id) => document.getElementById(id);
const UI = {
  cloudBtn: $('cloudBtn'), cloudModal: $('cloudModal'), cloudClose: $('cloudClose'),
  form: $('cloudForm'), email: $('cloudEmail'), password: $('cloudPassword'),
  create: $('cloudCreate'), reset: $('cloudReset'), signedIn: $('cloudSignedIn'), account: $('cloudAccount'),
  nickname: $('cloudNickname'), shareScore: $('cloudShareScore'), saveProfile: $('cloudSaveProfile'),
  signOut: $('cloudSignOut'), status: $('cloudStatus'),
  leaderboardBtn: $('leaderboardBtn'), leaderboardModal: $('leaderboardModal'),
  leaderboardClose: $('leaderboardClose'), leaderboard2d: $('leaderboard2d'),
  leaderboard3d: $('leaderboard3d'), leaderboardRows: $('leaderboardRows'),
  leaderboardStatus: $('leaderboardStatus')
};

const SAVE_KEY = 'sendit.cloud.uid';
const DIRTY_KEY = 'sendit.cloud.dirty';
const RESTORED_KEY = 'sendit.cloud.restored';
const GARAGE_KEY = 'sendit.garage.v1';
const BEST_2D_KEY = 'sendit.best';
const BEST_3D_KEY = 'sendit.best3d';
const GHOST_PREFIX = 'sendit.ghost3d.v1.';
const config = window.SENDIT_FIREBASE_CONFIG;
let auth;
let db;
let firebaseAuth;
let firestore;
let user = null;
let syncReady = false;
let playerProfile = { nickname: 'RIDER', shareScore: false };
let saveTimer = null;
let saving = Promise.resolve();
let selectedBoard = '2d';

function status(message) { UI.status.textContent = message; }
function boardStatus(message) { UI.leaderboardStatus.textContent = message; }
function safeScore(value) { return Math.max(0, Math.min(99999999, Math.floor(Number(value) || 0))); }
function validNickname(value) { return /^[A-Za-z0-9 _-]{2,14}$/.test(value); }
function readJSON(key, fallback) {
  try { return JSON.parse(localStorage.getItem(key)) ?? fallback; }
  catch (_) { return fallback; }
}
function ghostKeys() {
  return (window.SENDIT_GARAGE?.trails || []).map((trail) => trail.id);
}
function localSnapshot() {
  const ghosts = {};
  for (const id of ghostKeys()) {
    const value = readJSON(GHOST_PREFIX + id, null);
    if (value && Array.isArray(value.samples)) ghosts[id] = value;
  }
  return {
    garage: readJSON(GARAGE_KEY, null),
    best2d: safeScore(localStorage.getItem(BEST_2D_KEY)),
    best3d: safeScore(localStorage.getItem(BEST_3D_KEY)),
    ghosts,
    nickname: playerProfile.nickname,
    shareScore: playerProfile.shareScore,
    updatedAt: firestore.serverTimestamp()
  };
}
function restoreSnapshot(data) {
  if (data.garage && typeof data.garage === 'object') {
    localStorage.setItem(GARAGE_KEY, JSON.stringify(data.garage));
  } else localStorage.removeItem(GARAGE_KEY);
  localStorage.setItem(BEST_2D_KEY, String(safeScore(data.best2d)));
  localStorage.setItem(BEST_3D_KEY, String(safeScore(data.best3d)));
  for (const id of ghostKeys()) {
    const ghost = data.ghosts?.[id];
    if (ghost && Array.isArray(ghost.samples)) localStorage.setItem(GHOST_PREFIX + id, JSON.stringify(ghost));
    else localStorage.removeItem(GHOST_PREFIX + id);
  }
}
function setAccountUI() {
  UI.form.classList.toggle('is-hidden', !!user);
  UI.signedIn.classList.toggle('is-hidden', !user);
  UI.cloudBtn.textContent = user ? '☁ CLOUD SAVED' : '☁ CLOUD SAVE';
  if (user) {
    UI.account.textContent = user.email || 'Signed in';
    UI.nickname.value = playerProfile.nickname;
    UI.shareScore.checked = playerProfile.shareScore;
  }
}
function friendlyError(error) {
  const code = error?.code || '';
  if (code === 'auth/email-already-in-use') return 'Account already exists. Use Sign In.';
  if (code === 'auth/invalid-credential') return 'Email or password is incorrect.';
  if (code === 'auth/weak-password') return 'Choose a stronger password.';
  if (code === 'auth/invalid-email') return 'Enter a valid email address.';
  if (code === 'permission-denied') return 'Cloud access was denied. Check the database rules.';
  if (!navigator.onLine) return 'Offline. Your device save is safe; cloud sync will retry.';
  return 'Cloud request failed. Please try again.';
}
function enqueueSave() {
  if (!user || !syncReady) return;
  localStorage.setItem(DIRTY_KEY, '1');
  clearTimeout(saveTimer);
  saveTimer = setTimeout(() => { void saveNow(); }, 900);
}
async function publishScores(snapshot, uid) {
  for (const [mode, score] of [['2d', snapshot.best2d], ['3d', snapshot.best3d]]) {
    const ref = firestore.doc(db, mode === '2d' ? 'scores2d' : 'scores3d', uid);
    if (snapshot.shareScore && score > 0) {
      await firestore.setDoc(ref, {
        nickname: snapshot.nickname,
        score,
        updatedAt: firestore.serverTimestamp()
      });
    } else {
      await firestore.deleteDoc(ref);
    }
  }
}
function saveNow() {
  if (!user || !db || !syncReady) return saving;
  const uid = user.uid;
  saving = saving.catch(() => {}).then(async () => {
    if (!user || user.uid !== uid) return;
    const snapshot = localSnapshot();
    status('Saving online…');
    try {
      await firestore.setDoc(firestore.doc(db, 'players', uid), snapshot);
      await publishScores(snapshot, uid);
      localStorage.setItem(SAVE_KEY, uid);
      localStorage.removeItem(DIRTY_KEY);
      status('Saved online. Your progress is available on other devices.');
    } catch (error) {
      localStorage.setItem(DIRTY_KEY, '1');
      status(friendlyError(error));
    }
  });
  return saving;
}
async function loadAccount(account) {
  user = account;
  syncReady = false;
  if (!user) { setAccountUI(); status('Sign in to save progress online.'); return; }
  status('Loading your cloud save…');
  try {
    const uid = user.uid;
    const ref = firestore.doc(db, 'players', uid);
    const result = await firestore.getDoc(ref);
    if (!user || user.uid !== uid) return;
    if (result.exists()) {
      const data = result.data();
      playerProfile = {
        nickname: validNickname(data.nickname) ? data.nickname : 'RIDER',
        shareScore: data.shareScore === true
      };
      const revision = `${uid}:${data.updatedAt?.toMillis?.() || 'saved'}`;
      if (sessionStorage.getItem(RESTORED_KEY) === revision) {
        sessionStorage.removeItem(RESTORED_KEY);
      } else if (localStorage.getItem(SAVE_KEY) === uid && localStorage.getItem(DIRTY_KEY) === '1') {
        syncReady = true;
        await saveNow();
      } else {
        restoreSnapshot(data);
        localStorage.setItem(SAVE_KEY, uid);
        localStorage.removeItem(DIRTY_KEY);
        sessionStorage.setItem(RESTORED_KEY, revision);
        location.reload();
        return;
      }
    } else {
      const priorOwner = localStorage.getItem(SAVE_KEY);
      if (priorOwner && priorOwner !== uid) {
        status('This device has another account’s save. Use that account before creating a new cloud save here.');
        setAccountUI();
        return;
      }
      const localName = document.getElementById('profileName')?.textContent?.trim();
      playerProfile.nickname = localName !== 'SIGN IN' && validNickname(localName) ? localName : 'RIDER';
      syncReady = true;
      await saveNow();
    }
    syncReady = true;
    setAccountUI();
    if (localStorage.getItem(DIRTY_KEY) === '1') enqueueSave();
    else status('Saved online. Your progress is available on other devices.');
  } catch (error) {
    setAccountUI();
    status(friendlyError(error));
  }
}
async function showBoard(mode) {
  selectedBoard = mode;
  UI.leaderboard2d.className = `btn ${mode === '2d' ? 'primary' : 'ghost'}`;
  UI.leaderboard3d.className = `btn ${mode === '3d' ? 'primary' : 'ghost'}`;
  UI.leaderboardRows.textContent = '';
  boardStatus('Loading scores…');
  if (!db) { boardStatus('Leaderboards are being set up.'); return; }
  try {
    const ref = firestore.collection(db, mode === '2d' ? 'scores2d' : 'scores3d');
    const query = firestore.query(ref, firestore.orderBy('score', 'desc'), firestore.limit(25));
    const result = await firestore.getDocs(query);
    if (selectedBoard !== mode) return;
    let rank = 0;
    for (const row of result.docs) {
      rank++;
      const data = row.data();
      const li = document.createElement('li');
      if (row.id === user?.uid) li.classList.add('mine');
      const position = document.createElement('span');
      position.textContent = `#${rank}`;
      const name = document.createElement('b');
      name.textContent = validNickname(data.nickname) ? data.nickname : 'RIDER';
      const score = document.createElement('strong');
      score.textContent = safeScore(data.score).toLocaleString();
      li.append(position, name, score);
      UI.leaderboardRows.appendChild(li);
    }
    boardStatus(rank ? 'Top 25 rider bests' : 'No scores yet. Be the first to ride.');
  } catch (error) {
    boardStatus(friendlyError(error));
  }
}

UI.cloudBtn.addEventListener('click', () => UI.cloudModal.classList.remove('hidden'));
UI.cloudClose.addEventListener('click', () => UI.cloudModal.classList.add('hidden'));
UI.leaderboardBtn.addEventListener('click', () => {
  UI.leaderboardModal.classList.remove('hidden');
  void showBoard(selectedBoard);
});
UI.leaderboardClose.addEventListener('click', () => UI.leaderboardModal.classList.add('hidden'));
UI.leaderboard2d.addEventListener('click', () => void showBoard('2d'));
UI.leaderboard3d.addEventListener('click', () => void showBoard('3d'));
for (const modal of [UI.cloudModal, UI.leaderboardModal]) {
  modal.addEventListener('pointerdown', (event) => { if (event.target === modal) modal.classList.add('hidden'); });
}
window.addEventListener('keydown', (event) => {
  if (event.code !== 'Escape') return;
  if (!UI.cloudModal.classList.contains('hidden')) UI.cloudModal.classList.add('hidden');
  if (!UI.leaderboardModal.classList.contains('hidden')) UI.leaderboardModal.classList.add('hidden');
});
window.addEventListener('sendit:save', () => {
  if (localStorage.getItem(SAVE_KEY)) localStorage.setItem(DIRTY_KEY, '1');
  enqueueSave();
});
window.addEventListener('online', () => {
  if (user && !syncReady) void loadAccount(user);
  else if (user && localStorage.getItem(DIRTY_KEY) === '1') enqueueSave();
});
UI.form.addEventListener('submit', async (event) => {
  event.preventDefault();
  if (!auth) return;
  status('Signing in…');
  try { await firebaseAuth.signInWithEmailAndPassword(auth, UI.email.value.trim(), UI.password.value); }
  catch (error) { status(friendlyError(error)); }
});
UI.create.addEventListener('click', async () => {
  if (!auth || !UI.form.reportValidity()) return;
  status('Creating account…');
  try { await firebaseAuth.createUserWithEmailAndPassword(auth, UI.email.value.trim(), UI.password.value); }
  catch (error) { status(friendlyError(error)); }
});
UI.reset.addEventListener('click', async () => {
  if (!auth || !UI.email.reportValidity()) return;
  try {
    await firebaseAuth.sendPasswordResetEmail(auth, UI.email.value.trim());
    status('If this account exists, a reset email is on its way.');
  } catch (error) { status(friendlyError(error)); }
});
UI.saveProfile.addEventListener('click', async () => {
  const nickname = UI.nickname.value.trim();
  if (!validNickname(nickname)) { status('Rider name must be 2–14 letters, numbers, spaces, _ or -.'); return; }
  playerProfile = { nickname, shareScore: UI.shareScore.checked };
  await saveNow();
});
UI.signOut.addEventListener('click', async () => {
  if (!auth) return;
  await firebaseAuth.signOut(auth);
});

if (!config?.apiKey || !config?.projectId || !config?.appId) {
  status('Cloud saves are being set up. Local progress still works.');
  boardStatus('Leaderboards are being set up.');
  UI.form.querySelectorAll('input, button').forEach((element) => { element.disabled = true; });
} else {
  try {
    const version = '12.19.0';
    const [appModule, authModule, firestoreModule] = await Promise.all([
      import(`https://www.gstatic.com/firebasejs/${version}/firebase-app.js`),
      import(`https://www.gstatic.com/firebasejs/${version}/firebase-auth.js`),
      import(`https://www.gstatic.com/firebasejs/${version}/firebase-firestore.js`)
    ]);
    firebaseAuth = authModule;
    firestore = firestoreModule;
    const app = appModule.initializeApp(config);
    auth = authModule.getAuth(app);
    db = firestoreModule.getFirestore(app);
    authModule.onAuthStateChanged(auth, (account) => { void loadAccount(account); });
  } catch (error) {
    status('Cloud service could not load. Local progress still works.');
  }
}
