// Tile della mappa: esagoni con la punta in alto, 32 px di larghezza, lati obliqui 2:1.
// Ogni tile è 32×48: l'esagono occupa le ultime 32 righe; sopra resta spazio per il rilievo
// (alberi, colline, montagne), che sborda sulla riga di esagoni dietro.
// Gli esagoni si incastrano con passo 32 in orizzontale e 24 in verticale (righe dispari +16).
// Luce da in alto a sinistra.

pal({
  k: "#1a1423",                                                         // inchiostro
  l: "#b5d86a", g: "#82b84a", G: "#568f3c", h: "#2f6438", q: "#1d4232", // erba, foglie
  e: "#c8a66c", E: "#9a7a4a", d: "#6a5034",                             // terra
  a: "#f0dca0", A: "#d9bc7c", z: "#b39257",                             // sabbia
  s: "#c4bfcf", S: "#8f8aa2", K: "#605c78", n: "#3d3a52",               // roccia
  w: "#f4f8ff", W: "#d2deef", v: "#a3b6d3",                             // neve
  N: "#1d3a74", B: "#2a5aa2", b: "#4782cc",                             // acque profonde
  c: "#63b0dc", C: "#4b96cc", f: "#d4eef8",                             // acque basse, schiuma
  L: "#9aa858", m: "#7c8a44", M: "#56663a", u: "#3e5048", U: "#2b3a36", // palude
  o: "#7a5034", O: "#4e3424",                                           // legno
  r: "#e25c5c", y: "#f4d44c", p: "#f6f0fa",                             // fiori, oro
  F: "#1c1b29", D: "#2a2940",                                           // nebbia
  Y: "#ffe680", Z: "#fff6c8",                                           // selezione
  i: "#ecdcb8", I: "#c9b48e", R: "#c0473a", T: "#8a2f33", t: "#e2735a", // sede: intonaco, tetto
})

const W = 32, H = 48, TOP = 16

// L'esagono in coordinate del tile: righe TOP..TOP+31.
function inHex(x, y) {
  const r = y - TOP
  if (r < 0 || r > 31 || x < 0 || x > 31) return false
  if (r < 8) { const s = 15 - 2 * r; return x >= s && x <= 31 - s }
  if (r >= 24) { const s = 1 + 2 * (r - 24); return x >= s && x <= 31 - s }
  return true
}
const hexRegion = (x, y) => inHex(x, y)

// Fondo dell'esagono. Con `light`/`dark` disegna il bordo: chiaro sopra e a sinistra, scuro
// sotto e a destra; due esagoni vicini mostrano così una coppia chiaro/scuro, una griglia leggera.
function ground(c, base, light, dark) {
  for (let y = TOP; y < H; y++) for (let x = 0; x < W; x++) {
    if (!inHex(x, y)) continue
    let k = base
    if (light) {
      const up = !inHex(x, y - 1), down = !inHex(x, y + 1)
      const left = !inHex(x - 1, y), right = !inHex(x + 1, y)
      if (down || (right && !up)) k = dark
      else if (up || left) k = light
    }
    c.px(x, y, k)
  }
}

// Una macchia di un tono lungo una forma morbida, dentro l'esagono e lontano dal bordo.
function patches(c, key, seed, scale, threshold) {
  for (let y = TOP + 1; y < H - 1; y++) for (let x = 1; x < W - 1; x++) {
    if (!inHex(x, y - 1) || !inHex(x, y + 1) || !inHex(x - 1, y) || !inHex(x + 1, y)) continue
    if (vnoise(x / scale + seed * 7.3, y / scale + seed * 3.1) < threshold) c.px(x, y, key)
  }
}

// Punti dentro l'esagono, ben lontani dal bordo, scelti in modo ripetibile.
function spots(seed, count, margin = 4) {
  const out = []
  for (let i = 0; out.length < count && i < 400; i++) {
    const x = Math.floor(hash(i, seed) * W), y = TOP + Math.floor(hash(seed, i + 77) * 32)
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
sprite("_hill", { w: 18, h: 9, pivot: "bottom" }, (c) => {
  const cx = 8.5, cy = 8.5, rx = 9, ry = 8.5
  for (let y = 0; y < 9; y++) for (let x = 0; x < 18; x++) {
    const nx = (x + 0.5 - cx) / rx, ny = (y + 0.5 - cy) / ry
    if (nx * nx + ny * ny > 1) continue
    const v = -nx * 0.55 - ny * 0.85 + (bayer(x, y) - 0.5) * 0.2
    c.px(x, y, v > 0.75 ? "l" : v > 0.45 ? "g" : v > 0.15 ? "G" : "h")
  }
})
sprite("_hill_s", { w: 12, h: 6, pivot: "bottom" }, (c) => {
  const cx = 5.5, cy = 5.5, rx = 6, ry = 5.5
  for (let y = 0; y < 6; y++) for (let x = 0; x < 12; x++) {
    const nx = (x + 0.5 - cx) / rx, ny = (y + 0.5 - cy) / ry
    if (nx * nx + ny * ny > 1) continue
    const v = -nx * 0.55 - ny * 0.85 + (bayer(x, y) - 0.5) * 0.2
    c.px(x, y, v > 0.75 ? "l" : v > 0.45 ? "g" : v > 0.15 ? "G" : "h")
  }
})

// Una vetta: faccia sinistra in luce, destra in ombra, cresta ondulata, neve in cima.
function peak(name, w, h, snow, seed) {
  sprite(name, { w, h, outline: "n", pivot: "bottom" }, (c) => {
    const ax = (w - 1) / 2
    for (let y = 0; y < h; y++) {
      const half = ((y + 1) * (w / 2)) / h
      const ridge = ax + Math.round(Math.sin(y * 0.8 + seed) * 1.2)
      for (let x = 0; x < w; x++) {
        if (Math.abs(x - ax) > half) continue
        const lit = x < ridge
        let k = lit ? "s" : "K"
        if (lit && x > ridge - 3 && y > snow + 2) k = "S"
        if (y < snow || (y < snow + 2 && hash(x, y + seed * 31) < 0.45)) k = lit ? "w" : "W"
        c.px(x, y, k)
      }
    }
    // Canaloni: righe scure che scendono sulla faccia in luce.
    for (let i = 0; i < 2; i++) {
      const x0 = Math.round(ax - 2 - i * 4), y0 = snow + 2 + i * 3
      for (let j = 0; j < 4 && y0 + j < h; j++) c.px(x0 - Math.floor(j / 2), y0 + j, "S")
    }
  })
}
peak("_peak", 22, 20, 5, 1)
peak("_peak_s", 14, 12, 3, 4)
peak("_peak_m", 18, 16, 4, 2)

sprite("_rock", { outline: "n", pivot: "bottom" }, `
  .sS.
  sSSK
  SSKK`)
sprite("_pool", { w: 10, h: 4 }, (c) => {
  c.ellipse(5, 2, 4, 1, "u"); c.hline(1, 2, 2, "u"); c.hline(3, 3, 5, "U"); c.hline(3, 1, 2, "C")
})
sprite("_flower_r", "r")
sprite("_flower_y", "y")
sprite("_flower_w", "p")

// ---------------------------------------------------------------- biomi

for (let v = 0; v < 2; v++) {
  sprite(`deep_water_${v}`, { w: W, h: H },
    (c) => { ground(c, "B"); patches(c, "N", v + 1, 5, 0.27) },
    ...spots(11 + v, 3, 3).map(([x, y]) => stamp("_wave", x - 2, y)))
  sprite(`shallow_water_${v}`, { w: W, h: H },
    (c) => { ground(c, "c"); patches(c, "C", v + 5, 6, 0.35) },
    ...spots(21 + v, 3, 3).map(([x, y]) => stamp("_ripple", x - 2, y)))
}

for (let v = 0; v < 3; v++) {
  const tufts = spots(31 + v, 4, 3)
  const flowers = spots(41 + v, 2, 2)
  sprite(`plains_${v}`, { w: W, h: H },
    (c) => { ground(c, "g", "l", "G"); patches(c, "G", v + 9, 6, 0.28) },
    ...tufts.map(([x, y]) => stamp("_tuft", x - 2, y)),
    ...flowers.map(([x, y], i) => stamp(["_flower_r", "_flower_y", "_flower_w"][(v + i) % 3], x, y)))
}

// Alberi dal fondo verso il davanti, così quelli vicini coprono quelli lontani.
const FOREST = [
  [[9, 28], [22, 27], [15, 35], [5, 40], [26, 39]],
  [[12, 27], [23, 31], [7, 35], [18, 40], [27, 41]],
  [[6, 30], [17, 27], [25, 33], [11, 39], [21, 43]],
]
for (let v = 0; v < 3; v++) {
  sprite(`forest_${v}`, { w: W, h: H },
    (c) => { ground(c, "G", "g", "h"); patches(c, "h", v + 13, 5, 0.35) },
    ...FOREST[v].map(([x, y], i) => stamp((i + v) % 3 === 1 ? "_tree_b" : "_tree", x, y)))
}

const HILLS = [
  [["_hill", 10, 31], ["_hill_s", 23, 34], ["_hill", 17, 42]],
  [["_hill_s", 8, 30], ["_hill", 20, 33], ["_hill_s", 11, 41], ["_hill_s", 24, 43]],
]
for (let v = 0; v < 2; v++) {
  sprite(`hills_${v}`, { w: W, h: H },
    (c) => { ground(c, "g", "l", "G"); patches(c, "e", v + 17, 5, 0.25) },
    ...spots(51 + v, 2, 3).map(([x, y]) => stamp("_tuft_dry", x - 2, y)),
    ...HILLS[v].map(([name, x, y]) => stamp(name, x, y)))
}

const MOUNTAINS = [
  [["_peak", 13, 37], ["_peak_s", 24, 42]],
  [["_peak_m", 9, 34], ["_peak", 19, 40]],
  [["_peak_s", 7, 32], ["_peak", 17, 36], ["_peak_s", 26, 43]],
]
for (let v = 0; v < 3; v++) {
  sprite(`mountains_${v}`, { w: W, h: H },
    (c) => { ground(c, "S", "s", "K"); patches(c, "K", v + 21, 5, 0.3) },
    ...MOUNTAINS[v].map(([name, x, y]) => stamp(name, x, y)),
    ...spots(61 + v, 1, 3).map(([x, y]) => stamp("_rock", x, Math.max(y, 42))))
}

for (let v = 0; v < 2; v++) {
  sprite(`desert_${v}`, { w: W, h: H }, (c) => {
    ground(c, "A", "a", "z")
    // Creste di dune: un arco chiaro con l'ombra subito sotto.
    for (let i = 0; i < 3; i++) {
      const y0 = TOP + 8 + i * 8 + v * 2, x0 = 4 + ((i + v) % 2) * 6
      for (let x = x0; x < x0 + 16; x++) {
        const y = y0 + Math.round(Math.sin((x - x0) / 5) * 2)
        if (inHex(x, y) && inHex(x, y + 1) && inHex(x, y - 1)) { c.px(x, y, "a"); c.px(x, y + 1, "z") }
      }
    }
  })
  sprite(`swamp_${v}`, { w: W, h: H },
    (c) => { ground(c, "m", "L", "M"); patches(c, "M", v + 25, 5, 0.32) },
    ...spots(71 + v, 3, 4).map(([x, y]) => stamp("_pool", x - 4, y - 1)),
    ...spots(81 + v, 4, 2).map(([x, y]) => stamp("_reed", x, y - 4)))
  sprite(`tundra_${v}`, { w: W, h: H },
    (c) => { ground(c, "W", "w", "v"); patches(c, "w", v + 29, 6, 0.3) },
    ...spots(91 + v, 2, 3).map(([x, y]) => stamp("_rock", x, y)),
    ...[[10, 32 + v * 3], [21, 38 - v * 2]].map(([x, y]) => stamp("_pine", x, y)))
}

// ---------------------------------------------------------------- nebbia e selezione

// Nebbia: un tratteggio con la stessa pendenza dei lati, ripetuto sul reticolo degli esagoni,
// così le caselle coperte si fondono in un'unica distesa.
sprite("fog", { w: W, h: H }, (c) => {
  for (let y = TOP; y < H; y++) for (let x = 0; x < W; x++) {
    if (!inHex(x, y)) continue
    c.px(x, y, (((x - 2 * y) % 16) + 16) % 16 === 0 ? "D" : "F")
  }
})

sprite("select", { w: W, h: H }, (c) => {
  for (let y = TOP; y < H; y++) for (let x = 0; x < W; x++) {
    if (!inHex(x, y)) continue
    const edge = !inHex(x, y - 1) || !inHex(x, y + 1) || !inHex(x - 1, y) || !inHex(x + 1, y)
    const near = !inHex(x, y - 2) || !inHex(x, y + 2) || !inHex(x - 2, y) || !inHex(x + 2, y)
    if (edge) c.px(x, y, "Y")
    else if (near) c.px(x, y, "Z")
  }
})

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

// ---------------------------------------------------------------- foglio e anteprima

sheet("tiles", [
  "deep_water_*", "shallow_water_*", "plains_*", "forest_*", "hills_*", "mountains_*",
  "swamp_*", "desert_*", "tundra_*", "fog", "select", "guild",
], { pad: 1 })

// Un pezzo di mappa per controllare come si incastrano: righe dall'alto in basso.
const PREVIEW = [
  "ddsssppff",
  "dsppffmmh",
  "spppfmmmh",
  "sxxpfhmhp",
  "dsxxpppfp",
  "ddsttppnn",
  "dssttFFnn",
]
const KIND = {
  d: ["deep_water", 2], s: ["shallow_water", 2], p: ["plains", 3], f: ["forest", 3],
  h: ["hills", 2], m: ["mountains", 3], x: ["swamp", 2], t: ["desert", 2], n: ["tundra", 2],
}
scene("preview", { w: 16 + 9 * 32, h: 16 + 6 * 24 + 32, bg: "k" },
  ...PREVIEW.flatMap((line, row) => [...line].map((ch, col) => {
    const at = [col * 32 + (row % 2) * 16, row * 24]
    if (ch === "F") return stamp("fog", ...at)
    const [kind, variants] = KIND[ch]
    return stamp(`${kind}_${(row * 7 + col * 3) % variants}`, ...at)
  })),
  stamp("guild", 4 * 32 + 16 + 16, 3 * 24 + 16 + 26))
