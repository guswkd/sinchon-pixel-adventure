# Ethan field sprite source

Pokémon HeartGold / SoulSilver field sprites of Ethan (심향).
Original game artwork: Game Freak / The Pokémon Company / Nintendo.
Sprite sheet rip credited to ChriSX698 (2010):
https://www.deviantart.com/chrisx698/art/Pokemon-HG-SS-Sprite-Gold-165246738

Source: original 449 × 590 PNG, SHA-256
`e0c1db9d0214a322be50d88d3db157476e1292a16490f2c74b52a2f47e07bf4f`.

`ethan-frames.mjs` contains the source's 24 walking/running poses, three
poses per direction and gait. They are translated into a transparent 24 × 32
canvas with no scaling, tracing, redrawing, mirroring or pixel interpolation.
The standing pose separates the alternating steps in the four-frame cycle.

`avatar.mjs` replaces only RGB (192,56,56) and (240,104,72), the two red
clothing tones, with blue (40,96,184) and (101,155,226). Every other colour
and pixel position is retained. These are recoloured game assets, not original
character artwork; the source credit must remain with them.
