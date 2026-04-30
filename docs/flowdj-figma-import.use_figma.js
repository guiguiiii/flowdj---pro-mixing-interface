function hex(hex) {
  const clean = hex.replace("#", "");
  const value =
    clean.length === 3 ? clean.split("").map((c) => c + c).join("") : clean;
  const num = parseInt(value, 16);
  return {
    r: ((num >> 16) & 255) / 255,
    g: ((num >> 8) & 255) / 255,
    b: (num & 255) / 255,
  };
}

function solid(hexColor, opacity) {
  const paint = { type: "SOLID", color: hex(hexColor) };
  if (opacity !== undefined) paint.opacity = opacity;
  return paint;
}

function stroke(node, color, weight, opacity) {
  node.strokes = [solid(color, opacity)];
  node.strokeWeight = weight;
}

function shadow(x, y, blur, spread, color, opacity) {
  return {
    type: "DROP_SHADOW",
    color: { ...hex(color), a: opacity },
    offset: { x, y },
    radius: blur,
    spread,
    visible: true,
    blendMode: "NORMAL",
  };
}

async function chooseFonts() {
  const fonts = await figma.listAvailableFontsAsync();
  const has = (family, style) =>
    fonts.some((f) => f.fontName.family === family && f.fontName.style === style);
  const pick = (choices, fallback) =>
    choices.find((c) => has(c.family, c.style)) || fallback;

  return {
    ui: pick(
      [
        { family: "Chiron GoRound TC", style: "SemiBold" },
        { family: "Chiron GoRound TC", style: "Bold" },
        { family: "Inter", style: "Semi Bold" },
        { family: "Inter", style: "Bold" },
      ],
      { family: "Inter", style: "Regular" }
    ),
    uiRegular: pick(
      [
        { family: "Chiron GoRound TC", style: "Regular" },
        { family: "Inter", style: "Regular" },
      ],
      { family: "Inter", style: "Regular" }
    ),
    mono: pick(
      [
        { family: "JetBrains Mono", style: "Bold" },
        { family: "JetBrains Mono", style: "SemiBold" },
        { family: "Roboto Mono", style: "Bold" },
        { family: "Inter", style: "Bold" },
      ],
      { family: "Inter", style: "Bold" }
    ),
  };
}

const fonts = await chooseFonts();
await figma.loadFontAsync(fonts.ui);
await figma.loadFontAsync(fonts.uiRegular);
await figma.loadFontAsync(fonts.mono);

function makeText(parent, text, x, y, w, h, options = {}) {
  const node = figma.createText();
  node.fontName = options.fontName || fonts.ui;
  node.fontSize = options.fontSize || 12;
  node.characters = text;
  node.fills = [solid(options.color || "#111111", options.opacity)];
  if (options.alignHorizontal) node.textAlignHorizontal = options.alignHorizontal;
  if (options.alignVertical) node.textAlignVertical = options.alignVertical;
  if (options.letterSpacing !== undefined) {
    node.letterSpacing = { unit: "PIXELS", value: options.letterSpacing };
  }
  if (options.lineHeight !== undefined) {
    node.lineHeight = { unit: "PIXELS", value: options.lineHeight };
  }
  node.resize(w, h);
  node.x = x;
  node.y = y;
  parent.appendChild(node);
  return node;
}

function makeRect(parent, x, y, w, h, fill, radius = 0, effects) {
  const node = figma.createRectangle();
  node.resize(w, h);
  node.x = x;
  node.y = y;
  node.fills = Array.isArray(fill) ? fill : [fill];
  node.cornerRadius = radius;
  node.strokes = [];
  if (effects) node.effects = effects;
  parent.appendChild(node);
  return node;
}

function makeEllipse(parent, x, y, w, h, fill, effects) {
  const node = figma.createEllipse();
  node.resize(w, h);
  node.x = x;
  node.y = y;
  node.fills = Array.isArray(fill) ? fill : [fill];
  node.strokes = [];
  if (effects) node.effects = effects;
  parent.appendChild(node);
  return node;
}

function panelFrame(parent, x, y, w, h, fill = "#ADADAD") {
  const frame = figma.createFrame();
  frame.name = "Panel";
  frame.resize(w, h);
  frame.x = x;
  frame.y = y;
  frame.fills = [solid(fill)];
  frame.clipsContent = true;
  frame.cornerRadius = 0;
  frame.effects = [shadow(0, 0, 2, 0, "#000000", 0.08)];
  stroke(frame, "#FFFFFF", 1, 0.08);
  parent.appendChild(frame);
  return frame;
}

function gearKnob(parent, cx, cy, size, accent, label) {
  makeEllipse(
    parent,
    cx - size / 2,
    cy - size / 2,
    size,
    size,
    solid("#D0D0D0"),
    [shadow(1.5, 2.5, 4, 0, "#000000", 0.25)]
  );
  const ring = makeEllipse(
    parent,
    cx - size * 0.34,
    cy - size * 0.34,
    size * 0.68,
    size * 0.68,
    { type: "SOLID", color: hex("#FFFFFF"), opacity: 0 }
  );
  ring.strokes = [solid(accent, 1)];
  ring.strokeWeight = 3;
  const dot = makeEllipse(parent, cx - 3, cy - size * 0.28, 6, 6, solid(accent));
  dot.effects = [shadow(0, 0, 3, 0, accent, 0.35)];
  makeText(parent, label.toUpperCase(), cx - 26, cy + size / 2 + 2, 52, 12, {
    fontName: fonts.ui,
    fontSize: 8.5,
    color: "#191919",
    alignHorizontal: "CENTER",
    letterSpacing: 1.2,
    lineHeight: 10,
  });
}

function miniButton(parent, x, y, w, h, label, textColor) {
  const r = makeRect(
    parent,
    x,
    y,
    w,
    h,
    solid("#D0D0D0"),
    10,
    [shadow(2, 2, 4, 0, "#2A2A2A", 0.35)]
  );
  stroke(r, "#FFFFFF", 1, 0.12);
  makeText(parent, label, x, y + (h - 12) / 2, w, 12, {
    fontName: fonts.ui,
    fontSize: 9,
    color: textColor || "#3C3C3C",
    alignHorizontal: "CENTER",
    letterSpacing: 1.1,
    lineHeight: 10,
  });
  return r;
}

function hotCueButton(parent, x, y, w, h, dotColor, label) {
  makeRect(parent, x, y, w, h, solid("#D0D0D0"), 10, [
    shadow(1, 1, 2, 0, "#000000", 0.1),
  ]);
  makeEllipse(parent, x + w / 2 - 3, y + 8, 6, 6, solid(dotColor));
  makeText(parent, label.toUpperCase(), x + 3, y + 18, w - 6, 12, {
    fontName: fonts.ui,
    fontSize: 6,
    color: "#3A3A3A",
    alignHorizontal: "CENTER",
    lineHeight: 8,
    letterSpacing: 0.4,
  });
}

function verticalFader(parent, x, y, height, color, slim) {
  const trackW = slim ? 36 : 48;
  makeRect(parent, x, y, trackW, height, solid("#1C1C1C", 0.28), 12, [
    shadow(0, 0, 2, 0, "#000000", 0.18),
  ]);
  makeRect(parent, x + trackW / 2 - 2, y + 12, 4, height - 24, solid("#000000", 0.4), 99);
  const handleH = slim ? 36 : 48;
  const handleW = slim ? 24 : 32;
  const handleY = y + height * 0.28;
  const handle = makeRect(
    parent,
    x + (trackW - handleW) / 2,
    handleY,
    handleW,
    handleH,
    [
      {
        type: "GRADIENT_LINEAR",
        gradientTransform: [
          [1, 0, 0],
          [0, 1, 0],
        ],
        gradientStops: [
          { position: 0, color: { ...hex("#F2F2F2"), a: 1 } },
          { position: 0.5, color: { ...hex("#D0D0D0"), a: 1 } },
          { position: 1, color: { ...hex("#B8B8B8"), a: 1 } },
        ],
      },
    ],
    999,
    [shadow(0, 4, 12, 0, "#000000", 0.3)]
  );
  stroke(handle, color, 3, 1);
  makeRect(parent, handle.x + handleW / 2 - 1, handleY + 10, 2, handleH - 20, solid(color, 0.35), 99);
}

function artworkBlock(parent, x, y, color, label) {
  makeRect(
    parent,
    x,
    y,
    64,
    64,
    [
      {
        type: "GRADIENT_LINEAR",
        gradientTransform: [
          [0.8, -0.4, 0.3],
          [0.4, 0.8, -0.1],
        ],
        gradientStops: [
          { position: 0, color: { ...hex(color), a: 1 } },
          { position: 1, color: { ...hex("#101010"), a: 1 } },
        ],
      },
    ]
  );
  makeText(parent, label, x + 6, y + 24, 52, 18, {
    fontName: fonts.mono,
    fontSize: 12,
    color: "#FFFFFF",
    alignHorizontal: "CENTER",
    lineHeight: 12,
  });
  const icon = makeRect(parent, x + 2, y + 44, 18, 18, solid("#000000", 0.55), 4);
  stroke(icon, "#FFFFFF", 1, 0.08);
  makeText(parent, "LIB", x + 2, y + 49, 18, 8, {
    fontName: fonts.ui,
    fontSize: 6,
    color: "#FFFFFF",
    alignHorizontal: "CENTER",
    lineHeight: 6,
  });
}

function horizontalWave(parent, x, y, w, h, color) {
  const box = makeRect(parent, x, y, w, h, solid("#000000", 0.4), 4);
  stroke(box, "#FFFFFF", 1, 0.05);
  for (let i = 0; i < 78; i++) {
    const lineH = 3 + ((i * 7) % 16);
    const lx = x + 5 + i * ((w - 10) / 78);
    const ly = y + (h - lineH) / 2;
    makeRect(parent, lx, ly, 2, lineH, solid(color, i % 3 === 0 ? 0.7 : 0.45), 99);
  }
  makeRect(parent, x + w / 2 - 0.5, y, 1, h, solid("#FFFFFF", 0.45), 99);
}

function circularDeck(parent, x, y, size, accent, bpm, time) {
  const outer = makeEllipse(
    parent,
    x,
    y,
    size,
    size,
    [
      {
        type: "GRADIENT_RADIAL",
        gradientTransform: [
          [1, 0, 0],
          [0, 1, 0],
        ],
        gradientStops: [
          { position: 0, color: { ...hex("#ECECEC"), a: 1 } },
          { position: 1, color: { ...hex("#C5C5C5"), a: 1 } },
        ],
      },
    ],
    [shadow(0, 8, 18, 0, "#000000", 0.18)]
  );
  stroke(outer, "#D1D1D1", 6, 1);
  const inner = makeEllipse(parent, x + 12, y + 12, size - 24, size - 24, solid("#D7D7D7"));
  inner.opacity = 0.65;
  const ring = makeEllipse(parent, x + 2, y + 2, size - 4, size - 4, {
    type: "SOLID",
    color: hex("#FFFFFF"),
    opacity: 0,
  });
  ring.strokes = [solid("#7B7B7B", 0.22)];
  ring.strokeWeight = 1;
  const activeRing = makeEllipse(parent, x + 2, y + 2, size - 4, size - 4, {
    type: "SOLID",
    color: hex("#FFFFFF"),
    opacity: 0,
  });
  activeRing.strokes = [solid(accent, 1)];
  activeRing.strokeWeight = 2;
  activeRing.arcData = {
    startingAngle: 0,
    endingAngle: Math.PI * 1.45,
    innerRadius: 0.97,
  };
  const needle = makeEllipse(parent, x + size / 2 - 2.5, y + 1, 5, 5, solid(accent));
  needle.effects = [shadow(0, 0, 4, 0, accent, 0.45)];

  makeText(parent, String(bpm), x + 30, y + 62, size - 60, 36, {
    fontName: fonts.mono,
    fontSize: 34,
    color: "#1B1B1B",
    alignHorizontal: "CENTER",
    lineHeight: 34,
  });
  makeText(parent, "BPM", x + size / 2 - 20, y + 102, 40, 14, {
    fontName: fonts.ui,
    fontSize: 11,
    color: "#6A6A6A",
    alignHorizontal: "CENTER",
    letterSpacing: 1.6,
    lineHeight: 12,
  });
  makeRect(parent, x + size / 2 - 56, y + 124, 112, 3, solid(accent), 99);
  makeText(parent, time, x + size / 2 - 50, y + 134, 100, 22, {
    fontName: fonts.mono,
    fontSize: 17,
    color: "#111111",
    alignHorizontal: "CENTER",
    lineHeight: 18,
  });
  makeText(parent, "03:36.4", x + size / 2 - 40, y + 156, 80, 16, {
    fontName: fonts.mono,
    fontSize: 12,
    color: "#6B6B6B",
    alignHorizontal: "CENTER",
    lineHeight: 12,
  });
}

function verticalWaveCluster(parent, x, y, w, h, leftColor, rightColor) {
  const box = panelFrame(parent, x, y, w, h, "#ADADAD");
  box.effects = [];
  box.strokes = [solid("#000000", 0.06)];
  box.strokeWeight = 1;
  makeRect(box, 4, 4, w - 8, h - 8, solid("#111111", 0.18), 12);

  const laneW = (w - 18) / 4;
  for (let c = 0; c < 4; c++) {
    const laneX = 5 + c * (laneW + 2);
    makeRect(box, laneX, 5, laneW, h - 10, solid("#000000", 0.44), 0);
    for (let i = 0; i < 24; i++) {
      makeRect(box, laneX, 20 + i * ((h - 48) / 24), laneW, 1, solid("#FFFFFF", 0.08));
    }

    if (c === 0 || c === 3) {
      const bpm = c === 0 ? "122 BPM" : "120 BPM";
      const laneColor = c === 0 ? leftColor : rightColor;
      makeRect(box, laneX, 0, laneW, 22, solid("#000000", 0.72), 0);
      makeText(box, bpm, laneX, 5, laneW, 12, {
        fontName: fonts.mono,
        fontSize: 9,
        color: laneColor,
        alignHorizontal: "CENTER",
        lineHeight: 9,
      });
      for (let i = 0; i < 92; i++) {
        const width = 2 + ((i * 19) % Math.floor(laneW - 12));
        const yy = 28 + i * ((h - 56) / 92);
        const barColor =
          i % 5 === 0 ? "#FF3B30" : i % 3 === 0 ? "#4CD964" : laneColor;
        makeRect(box, laneX + (laneW - width) / 2, yy, width, 2, solid(barColor, 0.9), 99);
      }
    } else {
      makeRect(
        box,
        laneX + 4,
        38,
        laneW - 8,
        h - 70,
        [
          {
            type: "GRADIENT_LINEAR",
            gradientTransform: [
              [0, 1, 0],
              [1, 0, 0],
            ],
            gradientStops: [
              { position: 0, color: { ...hex("#FF0000"), a: 1 } },
              {
                position: 1,
                color: { ...(c === 1 ? hex(leftColor) : hex(rightColor)), a: 1 },
              },
            ],
          },
        ],
        0
      );
    }
  }

  makeRect(box, 4, h / 2 - 2, w - 8, 4, solid("#FFFFFF", 1), 99);
  return box;
}

function sideSelector(parent, title, x, y, w) {
  makeRect(parent, x, y, w, 28, solid("#D0D0D0"));
  makeText(parent, title.toUpperCase(), x, y + 9, w, 12, {
    fontName: fonts.ui,
    fontSize: 11,
    color: "#222222",
    alignHorizontal: "CENTER",
    letterSpacing: 1.8,
    lineHeight: 12,
  });
  const leftBtn = makeRect(parent, x, y + 28, w / 2, 28, solid("#D0D0D0"));
  const rightBtn = makeRect(parent, x + w / 2, y + 28, w / 2, 28, solid("#D0D0D0"));
  stroke(leftBtn, "#000000", 1, 0.08);
  stroke(rightBtn, "#000000", 1, 0.08);
  makeText(parent, "◀", x, y + 35, w / 2, 12, {
    fontName: fonts.ui,
    fontSize: 10,
    color: "#333333",
    alignHorizontal: "CENTER",
    lineHeight: 10,
  });
  makeText(parent, "▶", x + w / 2, y + 35, w / 2, 12, {
    fontName: fonts.ui,
    fontSize: 10,
    color: "#333333",
    alignHorizontal: "CENTER",
    lineHeight: 10,
  });
}

let page = figma.root.children.find((p) => p.name === "FlowDJ Import");
if (!page) {
  page = figma.createPage();
  page.name = "FlowDJ Import";
}
await figma.setCurrentPageAsync(page);

const createdNodeIds = [];
const mutatedNodeIds = [page.id];

const existing = page.children.find((n) => n.name === "FlowDJ Interface");
if (existing) existing.remove();

let maxX = 0;
for (const child of page.children) {
  maxX = Math.max(maxX, child.x + child.width);
}

const root = figma.createFrame();
root.name = "FlowDJ Interface";
root.resize(1440, 900);
root.x = maxX + 200;
root.y = 80;
root.fills = [solid("#333333")];
root.clipsContent = true;
page.appendChild(root);
createdNodeIds.push(root.id);

const orange = "#FF9457";
const blue = "#2E8DFF";
const headerH = 64;
const footerH = 80;
const middleY = headerH;
const middleH = 900 - headerH - footerH;
const row1H = 496;
const row2H = middleH - row1H;
const leftCol = 100;
const centerCol = 160;
const rightCol = 100;
const deckW = (1440 - leftCol - centerCol - rightCol) / 2;
const deckX = leftCol;
const centerX = leftCol + deckW;
const deckBX = centerX + centerCol;
const rightX = deckBX + deckW;

const header = panelFrame(root, 0, 0, 1440, headerH, "#3C3C3C");
header.effects = [];
header.strokes = [solid("#FFFFFF", 0.08)];
header.strokeWeight = 1;
createdNodeIds.push(header.id);

artworkBlock(header, 0, 0, orange, "A");
makeText(header, "One Love", 76, 8, 140, 14, {
  fontName: fonts.ui,
  fontSize: 11,
  color: "#FFFFFF",
  lineHeight: 11,
});
makeRect(header, 190, 8, 24, 14, solid("#4CD964"), 3);
makeText(header, "4A", 190, 10, 24, 10, {
  fontName: fonts.ui,
  fontSize: 8,
  color: "#FFFFFF",
  alignHorizontal: "CENTER",
  lineHeight: 8,
});
makeText(header, "-01:48", 222, 6, 58, 16, {
  fontName: fonts.mono,
  fontSize: 12,
  color: "#FFFFFF",
  alignHorizontal: "RIGHT",
  lineHeight: 12,
});
makeText(header, "DAVID GUETTA", 76, 24, 180, 10, {
  fontName: fonts.ui,
  fontSize: 8,
  color: "#FFFFFF",
  opacity: 0.4,
  letterSpacing: 1.2,
  lineHeight: 8,
});
horizontalWave(header, 76, 39, 206, 20, orange);

makeRect(header, 640, 0, 160, 64, solid("#333333"));
const recOuter = makeEllipse(header, 708, 8, 24, 24, solid("#D0D0D0"), [
  shadow(0, 2, 6, 0, "#000000", 0.3),
]);
stroke(recOuter, "#FFFFFF", 1, 0.16);
makeEllipse(header, 715, 15, 10, 10, solid("#FF3B30"), [
  shadow(0, 0, 8, 0, "#FF3B30", 0.7),
]);
const settingsOuter = makeEllipse(header, 708, 36, 24, 24, solid("#D0D0D0"), [
  shadow(0, 2, 6, 0, "#000000", 0.3),
]);
stroke(settingsOuter, "#FFFFFF", 1, 0.16);
makeText(header, "⚙", 708, 41, 24, 12, {
  fontName: fonts.ui,
  fontSize: 12,
  color: "#3C3C3C",
  alignHorizontal: "CENTER",
  lineHeight: 12,
});

artworkBlock(header, 1376, 0, blue, "B");
makeText(header, "Teenage Dream", 1160, 8, 150, 14, {
  fontName: fonts.ui,
  fontSize: 11,
  color: "#FFFFFF",
  alignHorizontal: "RIGHT",
  lineHeight: 11,
});
makeRect(header, 1129, 8, 24, 14, solid("#007AFF"), 3);
makeText(header, "5B", 1129, 10, 24, 10, {
  fontName: fonts.ui,
  fontSize: 8,
  color: "#FFFFFF",
  alignHorizontal: "CENTER",
  lineHeight: 8,
});
makeText(header, "-03:20", 1080, 6, 44, 16, {
  fontName: fonts.mono,
  fontSize: 12,
  color: "#FFFFFF",
  alignHorizontal: "RIGHT",
  lineHeight: 12,
});
makeText(header, "KATY PERRY", 1095, 24, 210, 10, {
  fontName: fonts.ui,
  fontSize: 8,
  color: "#FFFFFF",
  opacity: 0.4,
  alignHorizontal: "RIGHT",
  letterSpacing: 1.2,
  lineHeight: 8,
});
horizontalWave(header, 1094, 39, 206, 20, blue);

const leftPanel = panelFrame(root, 0, middleY, leftCol, row1H, "#ADADAD");
sideSelector(leftPanel, "Mixer", 0, 0, leftCol);
gearKnob(leftPanel, 50, 140, 44, "#95ED21", "Hi");
gearKnob(leftPanel, 50, 244, 44, "#FF8736", "Mid");
gearKnob(leftPanel, 50, 348, 44, "#008CD3", "Low");
createdNodeIds.push(leftPanel.id);

const deckA = panelFrame(root, deckX, middleY, deckW, row1H, "#D0D0D0");
circularDeck(deckA, deckW / 2 - 92, 88, 184, orange, "122.0", "01:19.7");
createdNodeIds.push(deckA.id);

const center = verticalWaveCluster(root, centerX, middleY, centerCol, middleH, orange, blue);
createdNodeIds.push(center.id);

const deckB = panelFrame(root, deckBX, middleY, deckW, row1H, "#D0D0D0");
circularDeck(deckB, deckW / 2 - 92, 88, 184, blue, "120.0", "02:12.4");
createdNodeIds.push(deckB.id);

const rightPanel = panelFrame(root, rightX, middleY, rightCol, row1H, "#ADADAD");
sideSelector(rightPanel, "Mixer", 0, 0, rightCol);
gearKnob(rightPanel, 50, 140, 44, "#95ED21", "Hi");
gearKnob(rightPanel, 50, 244, 44, "#FF8736", "Mid");
gearKnob(rightPanel, 50, 348, 44, "#008CD3", "Low");
createdNodeIds.push(rightPanel.id);

const pitchA = panelFrame(root, 0, middleY + row1H, leftCol, row2H, "#ADADAD");
miniButton(pitchA, 10, 10, 80, 26, "Sync", orange);
makeText(pitchA, "122.0", 0, 48, 100, 14, {
  fontName: fonts.mono,
  fontSize: 10,
  color: "#222222",
  alignHorizontal: "CENTER",
  lineHeight: 10,
});
makeText(pitchA, "0.0%", 0, 62, 100, 10, {
  fontName: fonts.mono,
  fontSize: 7,
  color: "#666666",
  alignHorizontal: "CENTER",
  lineHeight: 7,
});
verticalFader(pitchA, 32, 86, 132, orange, true);
createdNodeIds.push(pitchA.id);

const hotA = panelFrame(root, deckX, middleY + row1H, deckW, row2H, "#ADADAD");
makeText(hotA, "Hot Cue", 12, 10, 56, 12, {
  fontName: fonts.ui,
  fontSize: 8,
  color: orange,
  letterSpacing: 1.2,
  lineHeight: 8,
});
makeRect(hotA, 12, 24, 48, 2, solid(orange), 99);
makeText(hotA, "Pad FX", 72, 10, 44, 12, {
  fontName: fonts.ui,
  fontSize: 8,
  color: "#666666",
  letterSpacing: 1.2,
  lineHeight: 8,
});
makeText(hotA, "Sample", 124, 10, 50, 12, {
  fontName: fonts.ui,
  fontSize: 8,
  color: "#666666",
  letterSpacing: 1.2,
  lineHeight: 8,
});
["1/8", "1/4", "1/2", "1"].forEach((label, i) =>
  miniButton(hotA, deckW - 108 + i * 24, 8, 22, 16, label, "#555555")
);
const cueColors = ["#FF3B30", "#FF9500", "#007AFF", "#FFCC00"];
const cueLabels = ["Start", "Intro", "Build", "Drop"];
for (let i = 0; i < 4; i++) {
  hotCueButton(hotA, 14 + i * ((deckW - 28) / 4), 46, (deckW - 40) / 4, 112, cueColors[i], cueLabels[i]);
}
["Vocal", "Melody", "Bass", "Drums"].forEach((label, i) =>
  miniButton(hotA, 14 + i * ((deckW - 32) / 4), row2H - 30, (deckW - 40) / 4, 18, label, i === 0 ? orange : "#666666")
);
createdNodeIds.push(hotA.id);

const hotB = panelFrame(root, deckBX, middleY + row1H, deckW, row2H, "#ADADAD");
makeText(hotB, "Hot Cue", 12, 10, 56, 12, {
  fontName: fonts.ui,
  fontSize: 8,
  color: blue,
  letterSpacing: 1.2,
  lineHeight: 8,
});
makeRect(hotB, 12, 24, 48, 2, solid(blue), 99);
makeText(hotB, "Pad FX", 72, 10, 44, 12, {
  fontName: fonts.ui,
  fontSize: 8,
  color: "#666666",
  letterSpacing: 1.2,
  lineHeight: 8,
});
makeText(hotB, "Sample", 124, 10, 50, 12, {
  fontName: fonts.ui,
  fontSize: 8,
  color: "#666666",
  letterSpacing: 1.2,
  lineHeight: 8,
});
["1/8", "1/4", "1/2", "1"].forEach((label, i) =>
  miniButton(hotB, deckW - 108 + i * 24, 8, 22, 16, label, "#555555")
);
for (let i = 0; i < 4; i++) {
  hotCueButton(hotB, 14 + i * ((deckW - 28) / 4), 46, (deckW - 40) / 4, 112, cueColors[i], cueLabels[i]);
}
["Vocal", "Melody", "Bass", "Drums"].forEach((label, i) =>
  miniButton(hotB, 14 + i * ((deckW - 32) / 4), row2H - 30, (deckW - 40) / 4, 18, label, i === 0 ? blue : "#666666")
);
createdNodeIds.push(hotB.id);

const pitchB = panelFrame(root, rightX, middleY + row1H, rightCol, row2H, "#ADADAD");
miniButton(pitchB, 10, 10, 80, 26, "Sync", blue);
makeText(pitchB, "120.0", 0, 48, 100, 14, {
  fontName: fonts.mono,
  fontSize: 10,
  color: "#222222",
  alignHorizontal: "CENTER",
  lineHeight: 10,
});
makeText(pitchB, "0.0%", 0, 62, 100, 10, {
  fontName: fonts.mono,
  fontSize: 7,
  color: "#666666",
  alignHorizontal: "CENTER",
  lineHeight: 7,
});
verticalFader(pitchB, 32, 86, 132, blue, true);
createdNodeIds.push(pitchB.id);

const footer = panelFrame(root, 0, 900 - footerH, 1440, footerH, "#3C3C3C");
footer.effects = [shadow(0, -4, 10, 0, "#000000", 0.2)];
footer.strokes = [solid("#FFFFFF", 0.08)];
footer.strokeWeight = 1;
createdNodeIds.push(footer.id);

miniButton(footer, 24, 20, 56, 40, "▶", "#3C3C3C");
makeRect(footer, 92, 20, 54, 40, solid("#D0D0D0"), 12, [shadow(2, 2, 4, 0, "#2A2A2A", 0.35)]);
makeEllipse(footer, 113, 34, 10, 10, solid("#FF3B30"), [shadow(0, 0, 8, 0, "#FF3B30", 0.7)]);
miniButton(footer, 158, 20, 60, 40, "CUE", "#3C3C3C");
miniButton(footer, 1222, 20, 60, 40, "CUE", "#3C3C3C");
makeRect(footer, 1294, 20, 54, 40, solid("#D0D0D0"), 12, [shadow(2, 2, 4, 0, "#2A2A2A", 0.35)]);
makeEllipse(footer, 1315, 34, 10, 10, solid("#FF3B30"), [shadow(0, 0, 8, 0, "#FF3B30", 0.7)]);
miniButton(footer, 1360, 20, 56, 40, "▶", "#3C3C3C");

makeText(footer, "◀", 546, 35, 12, 10, {
  fontName: fonts.ui,
  fontSize: 8,
  color: "#FFFFFF",
  opacity: 0.22,
  alignHorizontal: "CENTER",
  lineHeight: 8,
});
makeText(footer, "▶", 884, 35, 12, 10, {
  fontName: fonts.ui,
  fontSize: 8,
  color: "#FFFFFF",
  opacity: 0.22,
  alignHorizontal: "CENTER",
  lineHeight: 8,
});
makeRect(footer, 562, 39, 320, 3, solid("#1F1F1F"), 99, [
  shadow(0, 1, 2, 0, "#000000", 0.5),
]);
for (let i = 0; i < 5; i++) {
  makeRect(footer, 562 + i * 80, 33, 1.5, 14, solid("#FFFFFF", 0.08), 99);
}
const handle = makeRect(
  footer,
  700,
  24,
  32,
  32,
  [
    {
      type: "GRADIENT_LINEAR",
      gradientTransform: [
        [1, 0, 0],
        [0, 1, 0],
      ],
      gradientStops: [
        { position: 0, color: { ...hex("#F2F2F2"), a: 1 } },
        { position: 0.5, color: { ...hex("#D0D0D0"), a: 1 } },
        { position: 1, color: { ...hex("#B8B8B8"), a: 1 } },
      ],
    },
  ],
  999,
  [shadow(0, 4, 12, 0, "#000000", 0.3)]
);
stroke(handle, "#FF823C", 3, 1);
makeRect(footer, 715, 31, 2, 18, solid("#FF823C", 0.35), 99);

return {
  createdNodeIds,
  mutatedNodeIds,
  pageId: page.id,
  rootId: root.id,
};
