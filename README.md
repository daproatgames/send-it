# SEND IT — Downhill MTB

A fast, arcade downhill mountain biking game built with Canvas 2D and a low-poly Three.js freeride mode. No build step.

Ride a procedurally generated trail, hit kickers, backflip and frontflip, throw style grabs, chain combos, and boost. Land with your wheels lined up or eat dirt. Three wipeouts ends a solo run — online, the group ride keeps going.

**Play:** https://daproatgames.github.io/send-it/

## Modes

- **Solo** — endless downhill run with tricks, combos, boosts, and wipeouts.
- **Ride Together** — online ghost ride with real riders. Host a room, share the 5-character code, and ride the same seeded trail in real time.
- **Freeride 3D** — a chase-cam, low-poly descent with carve steering, jumps, flips, spins, gate boosts, and a separate 3D best score. The trail ends at a finish gate; a landing gauge shows your flip angle before touchdown.

## Rider profiles

Click the **SIGN IN** chip on the menu to create a local rider profile (name, PIN, bike color). Profiles are stored on the device; PINs are stored as a hash. A profile is required for online play and your rider tag is visible to other players in the room.

Online rooms use a public MQTT relay. Use a nickname, not personal information. A dedicated backend would be needed for cross-device accounts and ranked leaderboards.

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
| `Esc` | Exit 3D |

Touch controls are available on phones and tablets.

## Run locally

Open `index.html` in a browser, or serve the folder:

```bash
python3 -m http.server 8765
```

Then open `http://localhost:8765`.

## Credits

- [Three.js](https://threejs.org/) r149 (MIT) powers the 3D freeride mode. License: `vendor/three.LICENSE`.
- [MQTT.js](https://github.com/mqttjs/MQTT.js) (MIT) powers the online room relay. License: `vendor/mqtt.LICENSE`.
- The online relay is hosted by the public EMQX broker for this prototype.