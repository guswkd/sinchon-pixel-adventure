# 회전하는 신촌 — outdoor sections 01 + 02

Separate from the original game. Open `prototype/index.html` through HTTP(S).

- Vendored Three.js 0.160.1 (MIT), no external runtime/CDN dependency.
- Original surveyed `CITY_GEOGRAPHY` is cropped to Sinchon Station–Hyundai–U-PLEX–northern Yonsei-ro–the first Myeongmul-gil stretch–Changchun Church and uniformly compressed into a small walking scene. Building heights, facades and street props are illustrative, not surveyed.
- Polygon ground and extruded buildings, nearest-filtered textures and a recoloured HGSS Ethan field sprite and existing NPC sprites (source credits in `assets/ethan-source.md`).
- Orthographic camera: Q/R look around by 45 degrees (walking 0.7 world units resumes auto); C explicitly toggles auto/manual; Z toggles distance.
- Arrows/WASD: tap faces, hold 150 ms walks, combined keys walk diagonally. A new press or changed direction follows the visible screen axes; holding the same direction preserves its world heading through camera turns. Releasing/re-pressing reads the current screen again. Camera rotation does not restart the turn delay. Hold Shift to run at 1.8× walking speed, or toggle the visible run button on desktop/phones. Running has a separate four-frame stride; the 150 ms turn-only delay still applies.
- Space/E inspect nearby landmarks; M opens a north-up map. Touch buttons use pointer capture and suppress text selection.
- Outdoor prototype only. The original game's subway/department-store interiors, progress and storage remain untouched. This prototype does not write localStorage.
- No fixed grid collision: swept circle/polygon tests prevent tunneling and allow sliding along diagonal facades. Foreground buildings fade when they hide the player.

Validation: `node tests/prototype.test.mjs` from repository root. Includes route connectivity, direction hold timing, rotating-camera input, multitouch, normalized diagonal speed and collision regressions.

## Section-by-section work

1. **Sinchon Station → Hyundai → U-PLEX (01)**: camera aligned to the surveyed Yonsei-ro centreline (about −1.79°), with no artificial station-to-street turn. The minor northern road bend is retained; the plaza view rotates only west of the main street. Camera look-ahead rotates about the player, so rotating in place does not move the character on screen. UI shows automatic/manual/temporary look state. Desktop viewport fills the screen frame. Original game links to the HTTPS prototype, including when opened as a local file.
2. **Northern Yonsei-ro + Myeongmul-gil (02, open)**: continuous extension from the old y=422 boundary to y=258, east edge x=350. The surveyed fork, side streets and Changchun Church footprint are retained. Seven visit points, numbered mini-map and current-section highlighting are available. New shop facades have doors/show windows; roof details are limited. Heights and facades remain illustrative.
3. Seongsan-ro crossing → Yonsei main gate: next section, not yet walkable. Real surrounding blocks are rendered as background beyond the playable edge.
4. Subway and department-store underground connections: later implementation; not accessible in this 3D prototype.

Current camera scope is the walking presentation, not a fresh geographical survey. Station approach tests cover the complete outward and return transition, boundary stability, explicit manual mode, automatic restoration after looking around, and return-to-station reset.

Hero art: `avatar.mjs` renders the original HGSS Ethan walking/running frames with only the two red clothing shades changed to blue. The indexed source frames and source credit are in `assets/ethan-frames.mjs` and `assets/ethan-source.md`. Original pixel shapes, colours outside the red clothing, and independent left/right poses are preserved. The original 2D hero is unchanged. Run input tests cover both Shift keys, release/blur cleanup, touch toggle persistence, diagonal speed and wall collisions.

### Hyundai–U-PLEX underpass

The saved OSM way 1041227528 is a 4F building bridge (`min_height=13`, `height=16`). Both geography compilers now retain this vertical metadata. Its upper volume is rendered at 3.64–4.48 scene units, with the ground alley open below it; its footprint is no longer a ground-level collision wall. Neighboring shops and Hyundai remain solid. Bridge roof equipment was removed, glass sides and an underside rim distinguish the raised structure, and the map outlines it with a dashed line. This is the ground alley beneath the bridge, not a new underground/4F entrance.

Validation includes walking the entire alley northward and southward through the bridge footprint, reachability from the station, adjacent wall collisions, insufficient-clearance rejection, and metadata comparison against the saved survey XML.

Character revision 3 uses the source sprites directly instead of the previous hand-drawn approximation. The live four-direction idle/walk/run review is at `reference/character-study.html`.


### Section 02 validation

The playable crop contains 438 building footprints and 311 road features from the saved survey. The background buffer adds surrounding buildings/roads without expanding collision bounds. Existing section 01 facade palettes/heights retain their previous indices. The ground surface is sized from the expanded world bounds.

Camera north bearings follow saved Yonsei-ro points; Myeongmul-gil gets a gradual diagonal view off the main street. The old plaza turn fades before the section seam. Holding a direction remains world-straight through all camera transitions.

Tests cover all seven reachable destinations, north/south traversal of the surveyed main street and branch, continuous camera seams, and the previous controls/bridge regressions. Manual browser checks cover the station-to-northern-end run, Changchun Church approach/interaction, diagonal Myeongmul-gil travel and mobile held-button return. The seven-point map and controls were checked at 390 × 844. Sources and exact scope are recorded in `reference/map-audit/section-02.md`.
