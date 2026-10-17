# 회전하는 신촌 — outdoor prototype 01

Separate from the original game. Open `prototype/index.html` through HTTP(S).

- Vendored Three.js 0.160.1 (MIT), no external runtime/CDN dependency.
- Original surveyed `CITY_GEOGRAPHY` is cropped to Sinchon Station–Hyundai–U-PLEX and uniformly compressed into a small walking scene. Building heights, facades and street props are illustrative, not surveyed.
- Polygon ground and extruded buildings, nearest-filtered textures and existing original 16×20 sprites. No Pokémon game art.
- Orthographic camera: Q/R rotate 45 degrees; C restores automatic regional views; Z toggles distance.
- Arrows/WASD: tap faces, hold 150 ms walks, combined keys walk diagonally. World heading stays fixed during a held direction so camera animation cannot steer the player. Shift runs.
- Space/E inspect nearby landmarks; M opens a north-up map. Touch buttons use pointer capture and suppress text selection.
- Outdoor prototype only. The original game's subway/department-store interiors, progress and storage remain untouched. This prototype does not write localStorage.
- No fixed grid collision: swept circle/polygon tests prevent tunneling and allow sliding along diagonal facades. Foreground buildings fade when they hide the player.

Validation: `node tests/prototype.test.mjs` from repository root. Includes route connectivity, direction hold timing, rotating-camera input, multitouch, normalized diagonal speed and collision regressions.
