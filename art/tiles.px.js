// Tile della mappa: esagoni con la punta in alto, 32×32 px, lati obliqui 2:1. Si incastrano con
// passo 32 in orizzontale e 24 in verticale (righe dispari spostate di 16). Luce da in alto a
// sinistra. La mappa si compone a strati, dal basso:
//   <bioma>_<n>          il terreno (32×32)
//   edge_<bioma>_<d>     il bioma vicino che sfuma nel bordo d (32×32, vedi DIRS)
//   shore_<d>            spiaggia e schiuma su una casella d'acqua che tocca terra dal lato d
//   <bioma>_top_<n>      il rilievo (32×48: 16 px sopra l'esagono per alberi e montagne)
//   grid                 la griglia, leggera, disegnata in trasparenza dal gioco
//   cloud_base, cloud_<n> le nuvole che coprono ciò che non è ancora esplorato

pal({
  k: "#1a1423",                                                         // inchiostro
  l: "#a6d84a", g: "#6fb43a", G: "#3f8a2e", h: "#24632f", q: "#143f2a", // erba, foglie
  e: "#c99a52", E: "#94693a", d: "#5e4228",                             // terra
  a: "#f4d58a", A: "#e0b45e", z: "#b88a42",                             // sabbia
  s: "#bcb4d2", S: "#8279a0", K: "#564d78", n: "#362f52",               // roccia
  w: "#f6fbff", W: "#cfe0f4", v: "#94acd6",                             // neve
  N: "#13306e", B: "#1d4f9e", b: "#3a78d0",                             // acque profonde
  c: "#3fa2dc", C: "#2c86c8", f: "#c8f0ff",                             // acque basse, schiuma
  L: "#8ea33e", m: "#6a7f2e", M: "#485e26", u: "#2f4a3c", U: "#1f342c", // palude
  o: "#7a4a2a", O: "#4a2c1c",                                           // legno
  r: "#e8434a", y: "#ffd23a", p: "#f8eefc",                             // fiori, oro
  x: "#e6eefa", j: "#b8c8e6", J: "#8b9fcc",                             // nuvole
  Y: "#ffe680", Z: "#fff6c8",                                           // selezione
  i: "#ecdcb8", I: "#c9b48e", R: "#c0473a", T: "#8a2f33", t: "#e2735a", // sede: intonaco, tetto
  P: "#d0703e", Q: "#94462a",                                           // terracotta
  H: "#e6b892", V: "#b88466",                                           // pelle dei Lumacai
  F: "#0c142c5c",                                                       // ombra (trasparente)
  D: "#ffb44a40",                                                       // alone di luce (trasparente)
})

const S = 32, TOP = 16

// L'esagono in un riquadro 32×32.
function inHex(x, y) {
  if (x < 0 || x > 31 || y < 0 || y > 31) return false
  if (y < 8) { const s = 15 - 2 * y; return x >= s && x <= 31 - s }
  if (y >= 24) { const s = 1 + 2 * (y - 24); return x >= s && x <= 31 - s }
  return true
}
const inner = (x, y) => inHex(x, y) && inHex(x - 1, y) && inHex(x + 1, y) && inHex(x, y - 1) && inHex(x, y + 1)

// I sei lati, nello stesso ordine delle direzioni del gioco (packages/core/src/hex.ts):
// est, nord-est, nord-ovest, ovest, sud-ovest, sud-est. Estremi in angoli di pixel.
const DIRS = [
  [[32, 8], [32, 24]],
  [[16, 0], [32, 8]],
  [[0, 8], [16, 0]],
  [[0, 24], [0, 8]],
  [[16, 32], [0, 24]],
  [[32, 24], [16, 32]],
]
// Distanza del centro del pixel (x, y) dal lato d, e posizione lungo il lato (0–1).
function edgeDist(d, x, y) {
  const [[ax, ay], [bx, by]] = DIRS[d]
  const px = x + 0.5 - ax, py = y + 0.5 - ay, ex = bx - ax, ey = by - ay
  const len = Math.hypot(ex, ey)
  return { dist: Math.abs(ex * py - ey * px) / len, along: (px * ex + py * ey) / (len * len) }
}

// Terreno: l'esagono pieno di un colore; i dettagli si timbrano sopra.
function ground(c, base) {
  for (let y = 0; y < S; y++) for (let x = 0; x < S; x++) if (inHex(x, y)) c.px(x, y, base)
}

// Punti dentro l'esagono (riquadro 32×32), lontani dal bordo, scelti in modo ripetibile.
function spots(seed, count, margin = 4) {
  const out = []
  for (let i = 0; out.length < count && i < 400; i++) {
    const x = Math.floor(hash(i, seed) * S), y = Math.floor(hash(seed, i + 77) * S)
    let ok = true
    for (let m = 1; m <= margin && ok; m++) {
      ok = inHex(x - m, y) && inHex(x + m, y) && inHex(x, y - m) && inHex(x, y + m)
    }
    if (ok && out.every(([px, py]) => Math.abs(px - x) + Math.abs(py - y) > margin * 2)) out.push([x, y])
  }
  return out
}

// ---------------------------------------------------------------- parti

sprite("_tuft", `
  G.l.G
  .GgG.`)
sprite("_tuft_dry", `
  E.e.E
  .EzE.`)
sprite("_wave", `
  .bb.
  b..b`)
sprite("_ripple", `
  .ff.
  f..f`)
sprite("_reed", `
  .o
  .O
  hh
  h.
  h.`)
sprite("_pool", { w: 10, h: 4 }, (c) => {
  c.ellipse(5, 2, 4, 1, "u"); c.hline(1, 2, 2, "u"); c.hline(3, 3, 5, "U"); c.hline(3, 1, 2, "C")
})
sprite("_pebble", "S\nK")
sprite("_flower_r", "r")
sprite("_flower_y", "y")
sprite("_flower_w", "p")

sprite("_tree", { outline: "q", pivot: "bottom" }, `
  ....GGG...
  ..GGgggG..
  .GgglgggG.
  .GglllgggG
  GGggllggGh
  GgGgggGGhh
  GGGGgGGhhh
  .hGGGGhhh.
  ..hhhhhh..
  ....oO....
  ....oO....`)
sprite("_tree_b", { base: "_tree", swap: { l: "g", g: "G", G: "h", h: "q" } })

sprite("_pine", { outline: "n", pivot: "bottom" }, `
  ....h....
  ...hwh...
  ...hGh...
  ..hwhGh..
  ..hGGhh..
  .hwhGGhh.
  .hGGGhhh.
  hwwhGGhhh
  hhGGGhhhh
  ...oO....`)

// Una collina tondeggiante, illuminata da in alto a sinistra.
function hill(name, w, h) {
  sprite(name, { w, h, pivot: "bottom" }, (c) => {
    const cx = w / 2, cy = h, rx = w / 2, ry = h
    for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
      const nx = (x + 0.5 - cx) / rx, ny = (y + 0.5 - cy) / ry
      if (nx * nx + ny * ny > 1) continue
      const v = -nx * 0.55 - ny * 0.85 + (bayer(x, y) - 0.5) * 0.2
      c.px(x, y, v > 0.75 ? "l" : v > 0.45 ? "g" : v > 0.15 ? "G" : "h")
    }
  })
}
hill("_hill", 18, 9)
hill("_hill_s", 12, 6)

// Una vetta: l'apice può stare di lato, i fianchi sono frastagliati, una cresta divide la faccia
// in luce (a sinistra) da quella in ombra; cenge sulla roccia e neve con lingue lungo la cresta.
function peak(name, { w, h, apex = 0.5, snow = 4, seed = 1, jag = 1 }) {
  sprite(name, { w, h, outline: "n", pivot: "bottom" }, (c) => {
    const ax = Math.round((w - 1) * apex)
    const wobble = (y, side) => Math.round((vnoise(y * 0.5 + seed * 3.3, side * 5 + seed * 1.7) - 0.5) * 2 * jag)
    for (let y = 0; y < h; y++) {
      const t = (y + 1) / h
      const left = Math.min(ax, Math.round(ax * (1 - t)) + (y > 1 ? wobble(y, 0) : 0))
      const right = Math.max(ax, Math.round(ax + (w - 1 - ax) * t) + (y > 1 ? wobble(y, 1) : 0))
      const ridge = ax + Math.round(t * (w - 1 - ax) * 0.25 + Math.sin(y * 0.6 + seed) * 0.8)
      for (let x = Math.max(0, left); x <= Math.min(w - 1, right); x++) {
        const lit = x <= ridge
        let k = lit ? "s" : "K"
        // Canaloni: tratti diagonali che scendono lungo i pendii, più scuri della roccia intorno.
        if (lit && y > snow + 1 && (x * 2 + y + seed) % 7 === 0 && hash(x * 3, y + seed * 17) < 0.7) k = "S"
        if (!lit && y > snow + 1 && (x * 2 - y + 70 + seed) % 6 === 0 && hash(x * 5, y + seed * 13) < 0.6) k = "n"
        if (lit && x === ridge && y > snow + 1) k = "S"
        const tongue = Math.abs(x - ridge) <= 1 ? 2 + Math.round(hash(seed, x) * 2) : 0
        const line = snow > 0 ? snow + tongue + Math.round((hash(x, seed * 7) - 0.5) * 2) : 0
        if (y < line) k = lit ? "w" : "W"
        c.px(x, y, k)
      }
    }
  })
}
peak("_pk_big", { w: 24, h: 22, apex: 0.42, snow: 6, seed: 1 })
peak("_pk_tall", { w: 18, h: 25, apex: 0.5, snow: 7, seed: 2 })
peak("_pk_med", { w: 18, h: 15, apex: 0.38, snow: 4, seed: 3 })
peak("_pk_med2", { w: 16, h: 14, apex: 0.62, snow: 3, seed: 4 })
peak("_pk_small", { w: 12, h: 10, apex: 0.45, snow: 2, seed: 5 })
peak("_pk_small2", { w: 11, h: 9, apex: 0.6, snow: 0, seed: 6 })
// Uno sperone di roccia: basso, con una cresta irregolare di tre o quattro punte.
sprite("_crag", { w: 16, h: 8, outline: "n", pivot: "bottom" }, (c) => {
  for (let x = 0; x < 16; x++) {
    const top = Math.round(1 + (1 - Math.abs(Math.sin(x * 0.42 + 0.5))) * 3.5 + Math.abs(x - 7.5) * 0.22)
    for (let y = top; y < 8; y++) c.px(x, y, y === top ? "s" : x > 10 || y > 6 ? "K" : (x + y) % 5 === 0 ? "S" : "s")
  }
})
sprite("_scree", { outline: "n", pivot: "bottom" }, `
  ...s.
  .sSKs
  sSKKK`)

sprite("_rock", { outline: "n", pivot: "bottom" }, `
  .sS.
  sSSK
  SSKK`)
sprite("_snow_rock", { outline: "n", pivot: "bottom" }, `
  .ww.
  wwWS
  SSKK`)

sprite("_tree_s", { outline: "q", pivot: "bottom" }, `
  ..GGg..
  .Gglgg.
  GgllgGh
  GggggGh
  .GGGhh.
  ...o...`)
sprite("_tree_big", { outline: "q", pivot: "bottom" }, `
  .....GGGGG.....
  ...GGgggggGG...
  ..GgglllgggGG..
  .GgglllllgggGh.
  .GgglllgggggGh.
  GGgggggggGGGGhh
  GgGggggGGGGGhhh
  GGGgggGGGGGhhhh
  .GGGGGGGGhhhhh.
  ..hhGGGGhhhhh..
  ....hhhhhhh....
  ......oO.......
  ......oO.......
  .....ooOO......`)
sprite("_pine_g", { base: "_pine", swap: { w: "l" } })
sprite("_pine_s", { outline: "n", pivot: "bottom" }, `
  ..h..
  .hwh.
  .hGh.
  hwhGh
  hhGhh
  ..o..`)
sprite("_bush", { outline: "q", pivot: "bottom" }, `
  .GGgG.
  GgllgG
  GGgGGh
  .hhhh.`)
sprite("_stump", { pivot: "bottom" }, `
  .oo.
  oeEO
  .OO.`)
sprite("_dead_tree", { pivot: "bottom" }, `
  O...O..O.
  .O.O..O..
  ..OO.O...
  ...OO....
  ...OO..O.
  ...OOO.O.
  ....OO...
  ....O....
  ...OO....
  ...OO....
  ..OOOO...`)
sprite("_cattails", { pivot: "bottom" }, `
  .o..o.o
  .O..O.O
  .h.hh.h
  .hh.h.h
  h.h.hh.
  hh.hh.h`)
sprite("_cactus", { outline: "q", pivot: "bottom" }, `
  ...G...
  ..GgG..
  ..Ggh..
  G.Ggh..
  Gh.gh.G
  GhGgh.G
  .GGghGh
  ...ghG.
  ...gh..
  ...gh..`)
sprite("_dune_rock", { outline: "d", pivot: "bottom" }, `
  ..aAA..
  .aAAAz.
  aAAAzzE
  AAzzzEE`)

// ---------------------------------------------------------------- terreno

// Il terreno è un colore pieno con dettagli piccoli e sparsi (ciuffi, segni, sassi, riflessi),
// mai macchie grandi: ripetute su ogni casella sembrerebbero chiazze.
sprite("_mark", "GG")
sprite("_mark_d", "G.\n.G")
sprite("_glint", "l")
sprite("_fleck", "g")
sprite("_speck", "h.\n.h")
sprite("_dirt", "Ee")
sprite("_crack", "K.\n.K\n.K")
sprite("_sparkle", "w")
sprite("_drift", "vv")
sprite("_wave_dark", "NN")
sprite("_ripple_dark", "CC")
sprite("_mud", "MM")

/** Una parte timbrata in `count` punti scelti a caso (in modo ripetibile) dentro la casella. */
const scatterParts = (part, seed, count, margin = 2) => spots(seed, count, margin).map(([x, y]) => stamp(part, x, y))

sprite("_bones", "p.p\n.pp")
sprite("_pad", "l")
sprite("_scree_s", "S.\nKS")
sprite("_snowpatch", "ww\nw.")
sprite("_ripple_sand", "aa")

for (let v = 0; v < 3; v++) {
  sprite(`deep_water_${v}`, { w: S, h: S },
    (c) => ground(c, "B"),
    ...scatterParts("_wave_dark", 101 + v, 2 + v),
    ...spots(11 + v, 2 + (v % 2) * 2, 3).map(([x, y]) => stamp("_wave", x - 2, y)))
  sprite(`shallow_water_${v}`, { w: S, h: S },
    (c) => ground(c, "c"),
    ...scatterParts("_ripple_dark", 111 + v, 2 + v),
    ...spots(21 + v, 2 + ((v + 1) % 2) * 2, 3).map(([x, y]) => stamp("_ripple", x - 2, y)))
  sprite(`hills_${v}`, { w: S, h: S },
    (c) => ground(c, "g"),
    ...scatterParts("_dirt", 121 + v, 2 + v * 2),
    ...scatterParts("_mark", 131 + v, 3),
    ...spots(51 + v, 3, 3).map(([x, y]) => stamp("_tuft_dry", x - 2, y)))
  sprite(`swamp_${v}`, { w: S, h: S },
    (c) => ground(c, "m"),
    ...scatterParts("_mud", 141 + v, 4),
    ...spots(71 + v, 2 + (v % 2), 4).map(([x, y]) => stamp("_pool", x - 4, y - 1)),
    ...(v === 2 ? scatterParts("_pad", 145, 5) : []),
    ...spots(81 + v, 3 + v, 2).map(([x, y]) => stamp("_reed", x, y - 4)))
  sprite(`tundra_${v}`, { w: S, h: S },
    (c) => ground(c, "W"),
    ...scatterParts("_drift", 151 + v, 2 + v),
    ...scatterParts("_sparkle", 161 + v, 4),
    ...spots(97 + v, 2 + v, 3).map(([x, y]) => stamp("_pebble", x, y)))
  sprite(`forest_${v}`, { w: S, h: S },
    (c) => ground(c, "G"),
    ...scatterParts("_speck", 201 + v, 4 + v),
    ...scatterParts("_fleck", 211 + v, 3))
  sprite(`mountains_${v}`, { w: S, h: S },
    (c) => ground(c, "S"),
    ...scatterParts("_crack", 221 + v, 2 + v),
    ...scatterParts("_scree_s", 231 + v, 3),
    ...(v === 2 ? scatterParts("_snowpatch", 235, 3) : []),
    ...spots(61 + v, 3, 3).map(([x, y]) => stamp("_pebble", x, y)))
}

for (let v = 0; v < 4; v++) {
  sprite(`plains_${v}`, { w: S, h: S },
    (c) => ground(c, "g"),
    ...scatterParts("_mark", 171 + v, 3),
    ...scatterParts("_mark_d", 181 + v, 2),
    ...scatterParts("_glint", 191 + v, 3),
    ...spots(31 + v, 3 + (v % 2) * 2, 3).map(([x, y]) => stamp("_tuft", x - 2, y)),
    // L'ultima variante è un prato fiorito.
    ...spots(41 + v, v === 3 ? 8 : 2, 2).map(([x, y], i) => stamp(["_flower_r", "_flower_y", "_flower_w"][(v + i) % 3], x, y)))
  sprite(`desert_${v}`, { w: S, h: S }, (c) => {
    ground(c, "A")
    if (v < 3) {
      // Creste di dune: un arco chiaro con l'ombra subito sotto.
      for (let i = 0; i < 3 - (v === 2 ? 1 : 0); i++) {
        const y0 = 8 + i * 8 + v * 2, x0 = 4 + ((i + v) % 2) * 6
        const len = 12 + ((i + v) % 3) * 3
        for (let x = x0; x < x0 + len; x++) {
          const y = y0 + Math.round(Math.sin((x - x0) / (4 + v)) * 2)
          if (inner(x, y) && inner(x, y + 1)) { c.px(x, y, "a"); c.px(x, y + 1, "z") }
        }
      }
    }
  },
  ...(v === 3 ? scatterParts("_ripple_sand", 251, 6) : []),
  ...(v >= 2 ? scatterParts("_pebble", 255 + v, 2) : []),
  ...(v === 1 ? scatterParts("_bones", 259, 1, 4) : []))
}

// ---------------------------------------------------------------- rilievo

// Ombre portate: ellissi semitrasparenti verso il basso a destra, perché la luce viene da in alto
// a sinistra. Si disegnano tutte prima delle cose, così un'ombra non copre un albero vicino.
const shadowPart = (name, w, h) => sprite(name, { w, h, pivot: "center" }, (c) => c.ellipse((w - 1) / 2, (h - 1) / 2, (w - 1) / 2, (h - 1) / 2, "F"))
shadowPart("_shadow_xs", 7, 3)
shadowPart("_shadow_s", 12, 4)
shadowPart("_shadow_m", 16, 5)
shadowPart("_shadow_l", 22, 6)
const SHADOW = {
  _tree: ["_shadow_s", 3], _tree_b: ["_shadow_s", 3], _tree_s: ["_shadow_xs", 2], _tree_big: ["_shadow_m", 4],
  _pine: ["_shadow_s", 3], _pine_g: ["_shadow_s", 3], _pine_s: ["_shadow_xs", 2], _bush: ["_shadow_xs", 2],
  _stump: ["_shadow_xs", 1], _dead_tree: ["_shadow_xs", 2], _cattails: ["_shadow_xs", 1], _cactus: ["_shadow_xs", 2],
  _rock: ["_shadow_xs", 2], _snow_rock: ["_shadow_xs", 2], _dune_rock: ["_shadow_s", 2], _scree: ["_shadow_xs", 1],
  _hill: ["_shadow_m", 4], _hill_s: ["_shadow_s", 3],
  _pk_big: ["_shadow_l", 6], _pk_tall: ["_shadow_m", 5], _pk_med: ["_shadow_m", 4], _pk_med2: ["_shadow_m", 4],
  _pk_small: ["_shadow_s", 3], _pk_small2: ["_shadow_s", 3], _crag: ["_shadow_m", 3],
}
/** Le ombre di tutte le cose, poi le cose: [nome, x, y] con il perno in basso al centro. */
const withShadows = (things) => [
  ...things.map(([name, x, y]) => stamp(SHADOW[name][0], x + SHADOW[name][1], y - 1)),
  ...things.map(([name, x, y]) => stamp(name, x, y)),
]

// Composizioni di rilievo per bioma, dal fondo verso il davanti (y crescente). Una lista vuota
// lascia la casella libera: in pianura, deserto e palude gli oggetti sono rari.
const RELIEF = {
  forest: [
    [["_tree", 9, 28], ["_tree", 22, 27], ["_tree_b", 15, 35], ["_tree", 5, 40], ["_tree", 26, 39]],
    [["_tree", 12, 27], ["_tree_b", 23, 31], ["_tree", 7, 35], ["_tree", 18, 40], ["_tree_b", 27, 41]],
    [["_tree_b", 17, 27], ["_tree", 6, 30], ["_tree", 25, 33], ["_tree", 11, 39], ["_tree_b", 21, 43]],
    [["_pine_g", 10, 29], ["_tree", 21, 29], ["_pine_g", 16, 36], ["_tree_b", 7, 41], ["_pine_g", 24, 42]],
    [["_tree_big", 13, 36], ["_bush", 24, 37], ["_stump", 9, 42], ["_tree_s", 21, 43]],
  ],
  hills: [
    [["_hill", 10, 31], ["_hill_s", 23, 34], ["_hill", 17, 42]],
    [["_hill_s", 8, 30], ["_hill", 20, 33], ["_hill_s", 11, 41], ["_hill_s", 24, 43]],
    [["_tree_s", 21, 30], ["_hill", 10, 34], ["_hill_s", 23, 40], ["_hill", 13, 43]],
    [["_hill", 16, 36], ["_rock", 8, 41], ["_hill_s", 24, 43]],
  ],
  mountains: [
    [["_pk_big", 14, 40], ["_rock", 6, 43], ["_pk_small", 25, 43]],
    [["_pk_med", 10, 35], ["_pk_tall", 20, 41]],
    [["_pk_small", 6, 33], ["_pk_med2", 16, 36], ["_pk_small2", 26, 38], ["_crag", 13, 44]],
    [["_pk_tall", 15, 41], ["_rock", 6, 42], ["_crag", 25, 44]],
    [["_crag", 9, 37], ["_pk_med", 20, 40], ["_scree", 11, 44]],
    [["_pk_med2", 9, 37], ["_pk_med", 21, 40], ["_scree", 14, 44]],
  ],
  tundra: [
    [["_pine", 10, 32], ["_pine", 21, 38], ["_rock", 15, 43]],
    [["_pine", 10, 35], ["_rock", 22, 31], ["_pine", 21, 41]],
    [["_pine_s", 8, 31], ["_pine_s", 19, 33], ["_pine_s", 13, 39], ["_snow_rock", 23, 42]],
    [["_snow_rock", 12, 36], ["_pine", 21, 42]],
  ],
  plains: [[], [], [], [], [], [], [], [["_tree_s", 20, 34]], [["_bush", 10, 36], ["_bush", 22, 42]], [["_rock", 13, 40]]],
  desert: [[], [], [], [], [], [["_cactus", 18, 38]], [["_dune_rock", 13, 40]], [["_cactus", 10, 34], ["_cactus", 22, 42]]],
  swamp: [[], [["_dead_tree", 16, 38]], [["_cattails", 11, 36], ["_cattails", 22, 41]], [["_cattails", 9, 34], ["_dead_tree", 20, 42]]],
}
for (const [biome, variants] of Object.entries(RELIEF)) {
  variants.forEach((things, v) => sprite(`${biome}_top_${v}`, { w: S, h: S + TOP }, ...withShadows(things)))
}

// ---------------------------------------------------------------- transizioni

// Il bioma vicino entra nel bordo con una fascia frastagliata, che sfuma a scacchiera.
// Colori della fascia per ogni bioma che può sconfinare: base e un tono per i punti.
const EDGE = {
  shallow_water: ["c", "C"], swamp: ["m", "M"], desert: ["A", "a"], plains: ["g", "G"],
  hills: ["g", "e"], tundra: ["W", "w"], forest: ["G", "h"], mountains: ["S", "K"],
}
Object.entries(EDGE).forEach(([biome, [base, dot]], b) => {
  for (let d = 0; d < 6; d++) {
    sprite(`edge_${biome}_${d}`, { w: S, h: S }, (c) => {
      for (let y = 0; y < S; y++) for (let x = 0; x < S; x++) {
        if (!inHex(x, y)) continue
        const { dist, along } = edgeDist(d, x, y)
        const depth = 2.5 + vnoise(along * 5 + b * 3.7 + d * 1.3, b + d * 0.7) * 3.5
        if (dist < depth - 1) c.px(x, y, hash(x + d * 40, y + b * 40) < 0.12 ? dot : base)
        else if (dist < depth + 1 && bayer(x, y) < 0.5 - (dist - depth) * 0.2) c.px(x, y, base)
      }
    })
  }
})

// Costa vista dall'acqua: una spiaggia stretta e una riga di schiuma che si sfrangia.
for (let d = 0; d < 6; d++) {
  sprite(`shore_${d}`, { w: S, h: S }, (c) => {
    for (let y = 0; y < S; y++) for (let x = 0; x < S; x++) {
      if (!inHex(x, y)) continue
      const { dist, along } = edgeDist(d, x, y)
      const sand = 1.2 + vnoise(along * 6 + d * 2.1, d) * 1.8
      if (dist < sand - 0.6) c.px(x, y, "a")
      else if (dist < sand + 0.4) c.px(x, y, "A")
      else if (dist < sand + 1.4) c.px(x, y, "f")
      else if (dist < sand + 3.5 && bayer(x, y) < 0.3 - (dist - sand - 1.4) * 0.12) c.px(x, y, "f")
    }
  })
}

// ---------------------------------------------------------------- griglia e selezione

// Solo i lati ovest, nord-ovest e nord-est: ogni lato della mappa viene disegnato una volta.
sprite("grid", { w: S, h: S }, (c) => {
  for (let y = 0; y < S; y++) for (let x = 0; x < S; x++) {
    if (!inHex(x, y)) continue
    if ((y < 24 && !inHex(x - 1, y)) || (y < 8 && !inHex(x, y - 1))) c.px(x, y, "w")
  }
})

sprite("select", { w: S, h: S }, (c) => {
  for (let y = 0; y < S; y++) for (let x = 0; x < S; x++) {
    if (!inHex(x, y)) continue
    const edge = !inHex(x, y - 1) || !inHex(x, y + 1) || !inHex(x - 1, y) || !inHex(x + 1, y)
    const near = !inHex(x, y - 2) || !inHex(x, y + 2) || !inHex(x - 2, y) || !inHex(x + 2, y)
    if (edge) c.px(x, y, "Y")
    else if (near) c.px(x, y, "Z")
  }
})

// ---------------------------------------------------------------- nuvole

// Sotto, un velo uniforme che copre la casella; sopra, un batuffolo che sborda sui vicini.
// I batuffoli di caselle vicine si sovrappongono e formano un mare di nuvole.
sprite("cloud_base", { w: S, h: S }, (c) => {
  for (let y = 0; y < S; y++) for (let x = 0; x < S; x++) if (inHex(x, y)) c.px(x, y, "x")
})

// Un cumulo di lobi rotondi, dal fondo al davanti: ognuno chiaro in alto a sinistra e in ombra
// sotto, così i lobi davanti si staccano da quelli dietro.
function cloud(name, w, h, lobes) {
  sprite(name, { w, h, pivot: "center" }, (c) => {
    for (const [cx, cy, r] of lobes) {
      for (let y = Math.floor(cy - r); y <= cy + r; y++) for (let x = Math.floor(cx - r); x <= cx + r; x++) {
        const nx = (x + 0.5 - cx) / r, ny = (y + 0.5 - cy) / r
        if (nx * nx + ny * ny > 1 || x < 0 || y < 0 || x >= w || y >= h) continue
        const v = -nx * 0.45 - ny * 0.9 + (bayer(x, y) - 0.5) * 0.15
        c.px(x, y, v > 0.35 ? "w" : v > -0.35 ? "x" : v > -0.78 ? "j" : "J")
      }
    }
  })
}
cloud("cloud_0", 44, 28, [[10, 17, 8], [22, 13, 11], [34, 17, 8], [16, 20, 7], [29, 20, 7]])
cloud("cloud_1", 44, 28, [[12, 15, 9], [27, 12, 10], [36, 18, 7], [20, 20, 7], [9, 21, 6]])
cloud("cloud_2", 44, 28, [[9, 18, 7], [19, 12, 9], [31, 14, 10], [24, 21, 7], [37, 20, 6]])
cloud("cloud_3", 44, 28, [[14, 13, 10], [28, 16, 9], [8, 20, 6], [21, 21, 7], [36, 21, 6]])
cloud("cloud_4", 56, 34, [[12, 21, 9], [26, 15, 13], [42, 19, 10], [19, 25, 8], [34, 25, 8], [48, 25, 6]])
cloud("cloud_5", 56, 34, [[10, 23, 8], [22, 16, 11], [37, 14, 12], [47, 22, 8], [28, 25, 8], [15, 27, 6]])

// ---------------------------------------------------------------- sede della gilda

// Una casa mercantile a graticcio: zoccolo di pietra, intonaco e travi, tetto rosso, insegna
// con la moneta d'oro.
sprite("guild", { w: 22, h: 22, outline: "k", pivot: "bottom" },
  rect(3, 9, 16, 12, "i"), rect(14, 9, 5, 12, "I"),                       // muri
  rect(3, 18, 16, 3, "S"), hline(3, 18, 16, "s"), rect(14, 18, 5, 3, "K"), // zoccolo
  vline(3, 9, 9, "O"), vline(9, 9, 9, "O"), vline(14, 9, 9, "O"), vline(18, 9, 9, "O"),
  hline(3, 13, 16, "O"), line(4, 14, 8, 17, "O"),
  rect(6, 10, 2, 2, "b"), rect(11, 10, 2, 2, "b"), rect(16, 10, 2, 2, "N"), // finestre
  rect(10, 15, 3, 6, "o"), vline(12, 15, 6, "O"),                          // porta
  poly([0, 9, 11, 1, 21, 9], "R"), poly([11, 1, 21, 9, 11, 9], "T"),       // tetto
  line(1, 8, 10, 2, "t"),
  rect(16, 1, 2, 5, "K"), px(16, 1, "s"),                                  // camino
  hline(0, 9, 22, "O"),
  vline(1, 11, 4, "O"), rect(0, 14, 3, 3, "y"), px(1, 15, "z"))            // insegna

// Di notte le finestre della sede si accendono: stessa tela della casa, solo le luci e un alone.
sprite("guild_glow", { w: 24, h: 24, pivot: "bottom" }, (c) => {
  const windows = [[7, 11], [12, 11], [17, 11]]
  for (const [wx, wy] of windows) c.circ(wx + 1, wy + 1, 3, "D")
  c.circ(12, 19, 3, "D")
  for (const [wx, wy] of windows) c.rect(wx, wy, 2, 2, "Y")
  c.rect(12, 17, 1, 4, "y")
})
sprite("guild_shadow", { w: 26, h: 6, pivot: "center" }, (c) => c.ellipse(12.5, 2.5, 12.5, 2.5, "F"))

// ---------------------------------------------------------------- ambiente

// Uccelli in volo, due pose d'ala, e la loro ombra lontana sul terreno.
sprite("bird_0", `
  nn.....nn
  ..n...n..
  ...nnn...`)
sprite("bird_1", `
  .........
  ..nn.nn..
  nn..n..nn`)
sprite("bird_shadow", { w: 7, h: 2 }, (c) => c.ellipse(3, 0.5, 3, 0.5, "F"))

// Ombre di nuvole che scorrono sulla terra: macchie larghe, con il bordo a scacchiera.
function cloudShadow(name, lobes) {
  sprite(name, { w: 72, h: 36 }, (c) => {
    for (let y = 0; y < 36; y++) for (let x = 0; x < 72; x++) {
      let v = 0
      for (const [cx, cy, rx, ry] of lobes) {
        const nx = (x + 0.5 - cx) / rx, ny = (y + 0.5 - cy) / ry
        v = Math.max(v, 1 - (nx * nx + ny * ny))
      }
      if (v > 0.25 || (v > 0 && bayer(x, y) < v * 2)) c.px(x, y, "F")
    }
  })
}
cloudShadow("cloud_shadow_0", [[18, 20, 16, 11], [38, 15, 20, 13], [56, 21, 14, 10]])
cloudShadow("cloud_shadow_1", [[16, 16, 14, 10], [33, 21, 18, 12], [52, 16, 17, 11]])

// ---------------------------------------------------------------- personaggi

// Segnalini da mappa, di fronte, lumeggiati da sinistra; il contorno scuro li stacca dal terreno.

// Cartiglio: carta piegata, la testa a cappello di origami, una linea di mappa sul petto.
sprite("char_paperfolk", { outline: "k", pivot: "bottom" }, `
  ......p......
  .....ppi.....
  ....pppii....
  ...ppppiii...
  ..pppppiiii..
  ..IIIIIIIII..
  ..ppkpppkii..
  ..pppppiiii..
  ...ppppiii...
  ....ppNii....
  ...pppNiii...
  ..ppNNpNNii..
  .pppNppiNiii.
  ...ppppiii...
  ...pp...ii...
  ...pp...ii...`)

// Lumacaio: corpo morbido, antenne con gli occhi, il guscio-bottega sulla schiena.
sprite("char_shellfolk", { outline: "k", pivot: "bottom" }, `
  .k...k.......
  .H...H.......
  ..H.H...eee..
  ..HHHH.eEEEe.
  .HHHHHHeEyyEd
  .HkHHkHEyEEyd
  .HHVVHHEyEyEd
  ..HHHHHEEyyEd
  .HHHHHHdEEEdd
  .HHVHHHHdddd.
  ..HHHHHHH....
  .HHHHHHHHV...
  HHHHHHHVVVV..`)

// Cocciaio: una giara robusta con le crepe riparate d'oro.
sprite("char_sherdkin", { outline: "k", pivot: "bottom" }, `
  ...QPPPPQ...
  ....PPPP....
  ...PPPPPQ...
  ...PkPPkQ...
  ...PPPPPQ...
  ....PyPQ....
  ..PPPyPPPQ..
  .PPPPPyPPQQ.
  .PPyPPPPPQQ.
  .PPPyyPPPQQ.
  ..PPPPyPQQ..
  ..PPP..PQQ..
  ..PP....QQ..`)

// Micelide: cappello di fungo a pois, gambo chiaro, occhi sotto la falda.
sprite("char_mycelings", { outline: "k", pivot: "bottom" }, `
  ....rrrrr....
  ..rrprrrrrr..
  .rrrrrrprrrR.
  rrprrrrrrrpRR
  rrrrrrrrrRRRR
  .TTTTTTTTTTT.
  ...ppppppI...
  ...pkppkpI...
  ...ppppppI...
  ....pppiI....
  ....pppiI....
  ....pp.iI....`)

sprite("char_shadow", { w: 12, h: 4 }, (c) => c.ellipse(6, 2, 5, 1, "k"))
sprite("char_ring", { w: 16, h: 7 }, (c) => {
  for (let y = 0; y < 7; y++) for (let x = 0; x < 16; x++) {
    const nx = (x + 0.5 - 8) / 8, ny = (y + 0.5 - 3.5) / 3.5
    const d = nx * nx + ny * ny
    if (d <= 1 && d > 0.45) c.px(x, y, y < 3 ? "Z" : "Y")
  }
})

// Il percorso: un puntino per casella e una bandierina sulla destinazione.
sprite("route_dot", `
  .Z.
  ZYZ
  .Z.`)
sprite("route_flag", { outline: "k", pivot: "bottom" }, `
  oYYYy.
  oYYYYy
  oYYy..
  o.....
  o.....
  o.....
  O.....`)

// ---------------------------------------------------------------- foglio

sheet("tiles", [
  "deep_water_*", "shallow_water_*", "plains_*", "forest_*", "hills_*", "mountains_*",
  "swamp_*", "desert_*", "tundra_*", "edge_*", "shore_*", "grid", "select",
  "cloud_*", "guild*", "char_*", "route_*", "bird*",
], { pad: 1 })
