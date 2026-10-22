# 회전하는 신촌 — outdoor sections 01 + 02 + 03 + 04

Separate from the original game. Open `prototype/index.html` through HTTP(S).

- Vendored Three.js 0.160.1 (MIT), no external runtime/CDN dependency.
- Original surveyed `CITY_GEOGRAPHY` is cropped to Sinchon Station–Hyundai–U-PLEX–northern Yonsei-ro–the first Myeongmul-gil stretch–Changchun Church–Seongsan-ro crossing–Yonsei main gate–Baekyang-ro–engineering buildings–Centennial Hall and uniformly compressed into a small walking scene. Building heights, facades and street props are illustrative, not surveyed.
- Polygon ground and extruded buildings, nearest-filtered textures and an original varsity-jacket student sprite and existing NPC sprites (hero design notes in `assets/varsity-character.md`).
- Automatic camera follows the local tangent of the surveyed road under the player, using movement alignment and distance hysteresis to choose branches. Tangents are sampled over an 8-unit arc; compatible survey-way endpoints are joined. Stopping/reversing does not select a new view, and angular speed is limited to 0.75 rad/s.
- Orthographic camera: Q/R look around by 45 degrees (walking 0.7 world units resumes auto); C explicitly toggles auto/manual; Z toggles distance.
- Arrows/WASD: tap faces, hold 150 ms walks, combined keys walk diagonally. A new press or changed direction follows the visible screen axes; holding the same direction preserves its world heading through camera turns. Releasing/re-pressing reads the current screen again. Camera rotation does not restart the turn delay. Hold Shift to run at 1.8× walking speed, or toggle the visible run button on desktop/phones. Running has a separate four-frame stride; the 150 ms turn-only delay still applies.
- Space/E inspect nearby landmarks; M opens a north-up map. Touch buttons use pointer capture and suppress text selection.
- Outdoor prototype only. The original game's subway/department-store interiors, progress and storage remain untouched. This prototype does not write localStorage.
- No fixed grid collision: swept circle/polygon tests prevent tunneling and allow sliding along diagonal facades. Foreground buildings fade when they hide the player.

Validation: `node tests/prototype.test.mjs` from repository root. Includes route connectivity, direction hold timing, rotating-camera input, multitouch, normalized diagonal speed and collision regressions.

## Section-by-section work

1. **Sinchon Station → Hyundai → U-PLEX (01)**: camera aligned to the surveyed Yonsei-ro centreline (about −1.79°), with no artificial station-to-street turn. Actual local street bends drive the view; there is no preset plaza angle. Camera look-ahead rotates about the player, so rotating in place does not move the character on screen. UI shows automatic/manual/temporary look state. Desktop viewport fills the screen frame. Original game links to the HTTPS prototype, including when opened as a local file.
2. **Northern Yonsei-ro + Myeongmul-gil (02, open)**: continuous extension from the old y=422 boundary to y=258, east edge x=350. The surveyed fork, side streets and Changchun Church footprint are retained. Seven visit points, numbered mini-map and current-section highlighting are available. New shop facades have doors/show windows; roof details are limited. Heights and facades remain illustrative.
3. **Seongsan-ro crossing → Yonsei main gate → Baekyang-ro entrance (03, open)**: bounds extend north to y=145. Saved crossing polylines, gate POI 5799952872, campus garden polygons and Baekyang-ro are retained. The engineering/hospital footprints have illustrative facades and signs. Ten visit points and three map sections are available. The deeper campus remains background.
4. **Baekyang-ro → engineering buildings → Centennial Hall front (04, open)**: bounds extend north to y=25 using saved survey geometry. Three new outdoor visit points bring the total to thirteen. Campus paths, garden polygons and named building signs extend into this section. Interiors and the underground campus remain outside this scope.
5. Subway and department-store underground connections: later implementation; not accessible in this 3D prototype.

Current camera scope is the walking presentation, not a fresh geographical survey. Station approach tests cover the complete outward and return transition, boundary stability, explicit manual mode, automatic restoration after looking around, and return-to-station reset.

Hero art: `avatar.mjs` renders the user-approved simplified varsity character from `assets/varsity-atlas.png`. The generated atlas supplies 20 cropped poses, drawn with nearest-neighbor sampling at a shared scale and foot baseline. The 24×32 canvas preserves a large rounded head and short body. See `assets/varsity-character.md` for provenance. No extracted HGSS frames are loaded. The original 2D game is unchanged.

### Hyundai–U-PLEX underpass

The saved OSM way 1041227528 is a 4F building bridge (`min_height=13`, `height=16`). Both geography compilers now retain this vertical metadata. Its upper volume is rendered at 3.64–4.48 scene units, with the ground alley open below it; its footprint is no longer a ground-level collision wall. Neighboring shops and Hyundai remain solid. Bridge roof equipment was removed, glass sides and an underside rim distinguish the raised structure, and the map outlines it with a dashed line. This is the ground alley beneath the bridge, not a new underground/4F entrance.

Validation includes walking the entire alley northward and southward through the bridge footprint, reachability from the station, adjacent wall collisions, insufficient-clearance rejection, and metadata comparison against the saved survey XML.

Character revision 5 replaces the rejected procedural student with the approved low-detail design and generated animation atlas. The live four-direction idle/walk/run review is at `reference/character-study.html`.


### Section 02 validation

The playable crop contains 438 building footprints and 311 road features from the saved survey. The background buffer adds surrounding buildings/roads without expanding collision bounds. Existing section 01 facade palettes/heights retain their previous indices. The ground surface is sized from the expanded world bounds.

Camera bearings follow the local geometry of the selected surveyed road, including the Myeongmul-gil connector and side streets. There are no rectangular region triggers or fixed automatic turn angles. Holding a direction remains world-straight through all camera transitions.

Tests cover all seven reachable destinations, north/south traversal of the surveyed main street and branch, curved-road tangents, fork selection, stationary/reverse stability and bounded rotation, and the previous controls/bridge regressions. Manual browser checks cover the station-to-northern-end run, Changchun Church approach/interaction, diagonal Myeongmul-gil travel and mobile held-button return. The seven-point map and controls were checked at 390 × 844. Sources and exact scope are recorded in `reference/map-audit/section-02.md`.

Camera road-following revision: direct keyboard runs verified the station approach, automatic Myeongmul-gil entry without Q/R, onward travel and reverse travel. Synthetic curve/fork tests and the real survey connector test complement the existing 30/60/120 Hz held-heading tests. This camera follows road orientation; it does not automatically steer the character around curves.

Section 03 validation: all ten landmarks are reachable from station. Tests traverse the saved diagonal crosswalk and campus entrance in both directions and check Baekyang-ro camera selection. Direct browser play covered station-to-gate, the gate dialogue and Baekyang-ro arrival. See `reference/map-audit/section-03.md`.

Section 04 validation: 467 building footprints, 537 road features and thirteen reachable destinations. Tests cover the section seam, bidirectional surveyed promenade and Baekyang-ro camera selection. Direct browser play reached the engineering buildings and northern promenade from the station, including the promenade dialogue. See `reference/map-audit/section-04.md`.

### Building survey pass 01-A

Each of the four sections now has four geographic audit cells (A northwest, B northeast, C southwest, D southeast), shown on the map and current-location line. U-PLEX is the first individually sourced model: 12 above-ground storeys, a rooftop garden, a saved OSM height of 60 m (16.8 scene units), blue curtain walls, lower facade projections and a neutral billboard. Architectural floor counts and indicative facade geometry are kept separate from unverified surrounding buildings. See `reference/map-audit/building-detail-01A.md`. Ground footprint and passage collisions are unchanged.

Building survey pass 01-C: Hyundai main store now uses the official 12-storey count and saved OSM 57 m height, with a photo-guided white tiled facade, upper strip windows, vertical details and a glazed cylindrical corner. Decorative dimensions remain approximate. Existing footprint/collisions and the bridge passage remain unchanged. See `reference/map-audit/building-detail-01C.md`.
