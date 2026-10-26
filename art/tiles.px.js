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

const edgeMin = (x, y) => Math.min(...DIRS.map((_, d) => edgeDist(d, x, y).dist))

// Terreno: un colore di base e macchie morbide di un secondo tono, ad almeno 3 px dal bordo,
// così due caselle dello stesso bioma si toccano senza cuciture.
function ground(c, base, patch, seed, scale, threshold) {
  for (let y = 0; y < S; y++) for (let x = 0; x < S; x++) {
    if (!inHex(x, y)) continue
    const blob = patch && edgeMin(x, y) > 3 && vnoise(x / scale + seed * 7.3, y / scale + seed * 3.1) < threshold
    c.px(x, y, blob ? patch : base)
  }
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

// ---------------------------------------------------------------- terreno

for (let v = 0; v < 2; v++) {
  sprite(`deep_water_${v}`, { w: S, h: S },
    (c) => ground(c, "B", "N", v + 1, 3.5, 0.2),
    ...spots(11 + v, 3, 3).map(([x, y]) => stamp("_wave", x - 2, y)))
  sprite(`shallow_water_${v}`, { w: S, h: S },
    (c) => ground(c, "c", "C", v + 5, 6, 0.33),
    ...spots(21 + v, 3, 3).map(([x, y]) => stamp("_ripple", x - 2, y)))
  sprite(`hills_${v}`, { w: S, h: S },
    (c) => ground(c, "g", "e", v + 17, 5, 0.25),
    ...spots(51 + v, 3, 3).map(([x, y]) => stamp("_tuft_dry", x - 2, y)))
  sprite(`swamp_${v}`, { w: S, h: S },
    (c) => ground(c, "m", "M", v + 25, 5, 0.32),
    ...spots(71 + v, 3, 4).map(([x, y]) => stamp("_pool", x - 4, y - 1)),
    ...spots(81 + v, 4, 2).map(([x, y]) => stamp("_reed", x, y - 4)))
  sprite(`tundra_${v}`, { w: S, h: S },
    (c) => ground(c, "W", "w", v + 29, 3.5, 0.24),
    ...spots(97 + v, 3, 3).map(([x, y]) => stamp("_pebble", x, y)))
  sprite(`desert_${v}`, { w: S, h: S }, (c) => {
    ground(c, "A")
    // Creste di dune: un arco chiaro con l'ombra subito sotto.
    for (let i = 0; i < 3; i++) {
      const y0 = 8 + i * 8 + v * 2, x0 = 4 + ((i + v) % 2) * 6
      for (let x = x0; x < x0 + 16; x++) {
        const y = y0 + Math.round(Math.sin((x - x0) / 5) * 2)
        if (inner(x, y) && inner(x, y + 1)) { c.px(x, y, "a"); c.px(x, y + 1, "z") }
      }
    }
  })
}

for (let v = 0; v < 3; v++) {
  sprite(`plains_${v}`, { w: S, h: S },
    (c) => ground(c, "g", "G", v + 9, 6, 0.28),
    ...spots(31 + v, 4, 3).map(([x, y]) => stamp("_tuft", x - 2, y)),
    ...spots(41 + v, 2, 2).map(([x, y], i) => stamp(["_flower_r", "_flower_y", "_flower_w"][(v + i) % 3], x, y)))
  sprite(`forest_${v}`, { w: S, h: S }, (c) => ground(c, "G", "h", v + 13, 5, 0.35))
  sprite(`mountains_${v}`, { w: S, h: S },
    (c) => ground(c, "S", "K", v + 21, 5, 0.3),
    ...spots(61 + v, 3, 3).map(([x, y]) => stamp("_pebble", x, y)))
}

// ---------------------------------------------------------------- rilievo

// Alberi dal fondo verso il davanti, così quelli vicini coprono quelli lontani.
const FOREST = [
  [[9, 28], [22, 27], [15, 35], [5, 40], [26, 39]],
  [[12, 27], [23, 31], [7, 35], [18, 40], [27, 41]],
  [[6, 30], [17, 27], [25, 33], [11, 39], [21, 43]],
]
const HILLS = [
  [["_hill", 10, 31], ["_hill_s", 23, 34], ["_hill", 17, 42]],
  [["_hill_s", 8, 30], ["_hill", 20, 33], ["_hill_s", 11, 41], ["_hill_s", 24, 43]],
]
const MOUNTAINS = [
  [["_peak", 13, 37], ["_peak_s", 24, 42], ["_rock", 8, 44]],
  [["_peak_m", 9, 34], ["_peak", 19, 40], ["_rock", 27, 37]],
  [["_peak_s", 7, 32], ["_peak", 17, 36], ["_peak_s", 26, 43]],
]
const TUNDRA = [
  [["_pine", 10, 32], ["_pine", 21, 38], ["_rock", 15, 43]],
  [["_pine", 10, 35], ["_rock", 22, 31], ["_pine", 21, 41]],
]
for (let v = 0; v < 3; v++) {
  sprite(`forest_top_${v}`, { w: S, h: S + TOP },
    ...FOREST[v].map(([x, y], i) => stamp((i + v) % 3 === 1 ? "_tree_b" : "_tree", x, y)))
  sprite(`mountains_top_${v}`, { w: S, h: S + TOP }, ...MOUNTAINS[v].map(([name, x, y]) => stamp(name, x, y)))
}
for (let v = 0; v < 2; v++) {
  sprite(`hills_top_${v}`, { w: S, h: S + TOP }, ...HILLS[v].map(([name, x, y]) => stamp(name, x, y)))
  sprite(`tundra_top_${v}`, { w: S, h: S + TOP }, ...TUNDRA[v].map(([name, x, y]) => stamp(name, x, y)))
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
  "cloud_*", "guild", "char_*", "route_*",
], { pad: 1 })
