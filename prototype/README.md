# 회전하는 신촌 — outdoor prototype 01

Separate from the original game. Open `prototype/index.html` through HTTP(S).

- Vendored Three.js 0.160.1 (MIT), no external runtime/CDN dependency.
- Original surveyed `CITY_GEOGRAPHY` is cropped to Sinchon Station–Hyundai–U-PLEX and uniformly compressed into a small walking scene. Building heights, facades and street props are illustrative, not surveyed.
- Polygon ground and extruded buildings, nearest-filtered textures and an original 24×32 varsity-jacket hero and existing NPC sprites. No Pokémon game art.
- Orthographic camera: Q/R look around by 45 degrees (walking 0.7 world units resumes auto); C explicitly toggles auto/manual; Z toggles distance.
- Arrows/WASD: tap faces, hold 150 ms walks, combined keys walk diagonally. Movement follows the current screen axes every frame, including while a key or finger stays held during automatic or manual camera rotation. Camera rotation does not restart the turn delay. Hold Shift to run at 1.8× walking speed, or toggle the visible run button on desktop/phones. Running has a separate four-frame stride; the 150 ms turn-only delay still applies.
- Space/E inspect nearby landmarks; M opens a north-up map. Touch buttons use pointer capture and suppress text selection.
- Outdoor prototype only. The original game's subway/department-store interiors, progress and storage remain untouched. This prototype does not write localStorage.
- No fixed grid collision: swept circle/polygon tests prevent tunneling and allow sliding along diagonal facades. Foreground buildings fade when they hide the player.

Validation: `node tests/prototype.test.mjs` from repository root. Includes route connectivity, direction hold timing, rotating-camera input, multitouch, normalized diagonal speed and collision regressions.

## Section-by-section work

1. **Sinchon Station → Yonsei-ro entrance (current review)**: position-driven camera, station view −35° → north-facing street view across z=6…−5, reversible on return. No entry-event dependency. UI shows automatic/manual/temporary look state. Desktop viewport fills the screen frame. Original game links to the HTTPS prototype, including when opened as a local file.
2. Hyundai frontage and side streets: next review; geometry and illustrative facades remain from prototype 01.
3. U-PLEX and Red Periscope plaza: later review; existing prototype only.
4. Subway and department-store underground connections: later implementation; not accessible in this 3D prototype.

Current camera scope is the walking presentation, not a fresh geographical survey. Station approach tests cover the complete outward and return transition, boundary stability, explicit manual mode, automatic restoration after looking around, and return-to-station reset.

Hero art: `avatar.mjs` renders the original HGSS Ethan walking/running frames with only the two red clothing shades changed to blue. The indexed source frames and source credit are in `assets/ethan-frames.mjs` and `assets/ethan-source.md`. Original pixel shapes, colours outside the red clothing, and independent left/right poses are preserved. The original 2D hero is unchanged. Run input tests cover both Shift keys, release/blur cleanup, touch toggle persistence, diagonal speed and wall collisions.

### Hyundai–U-PLEX underpass

The saved OSM way 1041227528 is a 4F building bridge (`min_height=13`, `height=16`). Both geography compilers now retain this vertical metadata. Its upper volume is rendered at 3.64–4.48 scene units, with the ground alley open below it; its footprint is no longer a ground-level collision wall. Neighboring shops and Hyundai remain solid. Bridge roof equipment was removed, glass sides and an underside rim distinguish the raised structure, and the map outlines it with a dashed line. This is the ground alley beneath the bridge, not a new underground/4F entrance.

Validation includes walking the entire alley northward and southward through the bridge footprint, reachability from the station, adjacent wall collisions, insufficient-clearance rejection, and metadata comparison against the saved survey XML.

Character revision 3 uses the source sprites directly instead of the previous hand-drawn approximation. The live four-direction idle/walk/run review is at `reference/character-study.html`.
