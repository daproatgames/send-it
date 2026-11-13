# SEND IT — Downhill MTB

A fast, arcade downhill mountain biking game built with Canvas 2D and a high-fidelity Three.js freeride mode. No build step.

Ride a procedurally generated trail, hit kickers, backflip and frontflip, throw style grabs, chain combos, and boost. Land with your wheels lined up or eat dirt. Three wipeouts ends a solo run — online, the group ride keeps going.

**Play:** https://daproatgames.github.io/send-it/

## Modes

- **Solo** — endless downhill run with tricks, combos, boosts, and wipeouts.
- **Ride Together** — online ghost ride with real riders. Host a room, share the 5-character code, and ride the same seeded trail in real time.
- **Freeride 3D** — a chase-cam, PBR alpine descent with carve steering, jumps, flips, spins, gate boosts, and a separate 3D best score. The trail ends at a finish gate; a landing gauge shows your flip angle before touchdown.
- **Garage** — earn coins and XP from runs, buy fictional bike brands and rider kits, upgrade parts, complete daily contracts, unlock badges, and pick from six 3D trails.

## Garage & progression

Open **GARAGE** from the main menu or the 3D start card. Coins and XP are earned at the end of every solo/3D run from your score and distance, then saved locally on the device.

- **Bikes** — six fictional brands/models with different 3D speed, handling, and pop stats.
- **Rider kits** — jersey, helmet, pants, and shoe colour sets.
- **Trails** — six 3D environments with their own seed, terrain scale, path shape, lighting, fog, vegetation density, weather, and local best run.
- **Parts** — wheels, suspension, and drivetrain upgrades with three levels each.
- **Contracts** — three daily challenges with coin and XP rewards.
- **Badges** — lifetime achievements for distance, flips, coins, trails, scores, and rider level.
- **Levels** — rider XP with level-up coin bonuses.
- **PB ghost** — your best run on each trail is saved and raced as a translucent ghost next time.
- Bike brands are invented for this game; no real-world trademarks are used.

## Pause, settings & photo mode

- `Esc` / `P` or the **PAUSE** button opens the pause menu during a 3D run.
- Quality toggle (High / Balanced), PB ghost toggle, and camera-shake toggle.
- **Photo mode** freezes the run and lets you orbit the bike with drag, zoom with the wheel, and save a PNG.
- Gamepad support in 3D: left stick carves/spins, A jumps/flips, B frontflips, X grabs, RT boosts.

## Rider profiles

Click the **SIGN IN** chip on the menu to create a local rider profile (name, PIN, bike color). Profiles are stored on the device; PINs are stored as a hash. A profile is required for online play and your rider tag is visible to other players in the room.

Online rooms use a public MQTT relay. Use a nickname, not personal information. Cloud saves use Firebase separately; verified ranked competition would need server-side run validation.

## Cloud saves and community leaderboards

The **CLOUD SAVE** button signs into a separate email/password cloud account. On a new account, the current device's garage, best scores, and 3D PB ghosts are uploaded. On an existing account, its cloud save loads onto the device. If both the device and cloud have progress, the player chooses which save to keep. Local play still works when the cloud service is unavailable; changes made after signing in sync when connectivity returns.

The **LEADERBOARDS** button shows the top 25 solo and 3D personal bests. Scores are shared only after the player enables the opt-in checkbox and chooses a public rider nickname. These are community scores submitted by game clients, not verified competitive rankings. The local PIN profile remains for the existing multiplayer rooms and is not a cloud credential.

### Firebase setup

1. Create a Firebase project and Web app, enable **Authentication → Email/Password**, and create a Cloud Firestore database.
2. Copy the Web app's public SDK config into `cloud-config.js` as `window.SENDIT_FIREBASE_CONFIG = { ... }`.
3. Deploy `firestore.rules` from this repository before enabling the app. The rules restrict private saves to their signed-in owner and permit public reading of opted-in scores.
4. Add `daproatgames.github.io` to Firebase Authentication's authorized domains.

No service-account key or other server secret belongs in the website. Firebase charges may apply if usage exceeds the project's free limits. Leaderboard entries are intentionally labelled unverified because a static client cannot prove a score was earned in an honest run.

## Controls

### 2D / online

| Input | Action |
| --- | --- |
| `→` / `D` | Sprint (the bike auto-pedals) |
| `←` / `A` | Brake |
| `↑` / `W` / `Space` | Ollie, then backflip in the air |
| `↓` / `S` | Tuck, then frontflip in the air |
| `Shift` | Style grab |
| `B` | Boost |
| `M` | Mute |
| `R` | Ride again after a wipeout |

### 3D freeride

| Input | Action |
| --- | --- |
| `→` / `D` | Carve right · spin right in the air |
| `←` / `A` | Carve left · spin left in the air |
| `W` / `Space` | Jump · hold to backflip |
| `S` | Brake · frontflip in the air |
| `Shift` | Grab |
| `B` | Boost |
| `Esc` / `P` | Pause / resume |
| Gamepad | Left stick carve · A jump/flip · B frontflip · X grab · RT boost |

Touch controls are available on phones and tablets.

## Run locally

Open `index.html` in a browser, or serve the folder:

```bash
python3 -m http.server 8765
```

Then open `http://localhost:8765`.

## Credits

- [Three.js](https://threejs.org/) r149 (MIT) powers the 3D freeride mode. License: `vendor/three.LICENSE`.
- [Poly Haven](https://polyhaven.com/) CC0 PBR textures (trail, grass, rock, bark, foliage). License: `assets/textures/LICENSE.txt`.
- [MQTT.js](https://github.com/mqttjs/MQTT.js) (MIT) powers the online room relay. License: `vendor/mqtt.LICENSE`.
- Bike brands and model names are fictional.
- The online relay is hosted by the public EMQX broker for this prototype.
