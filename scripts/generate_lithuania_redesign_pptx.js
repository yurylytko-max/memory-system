const PptxGenJS = require("pptxgenjs");

const OUT_PATH = "/Users/user/Documents/memory-system/exports/lithuania-2026-redesign-v4.pptx";

const PAGE_W = 960;
const PAGE_H = 540;
const MARGIN_X = 54;
const TOP_Y = 500;
const CHART_BOTTOM = 92;
const PX = 1 / 72;

const EMERALD = "0B6E4F";
const RUBY = "8E1B2C";
const SAPPHIRE = "1F4E79";
const BLACK = "000000";
const WHITE = "FFFFFF";

function ix(v) {
  return Number((v * PX).toFixed(4));
}

function fmtPct(value) {
  return `${value.toFixed(1).replace(".", ",")}%`;
}

function hexToRgb(hex) {
  const normalized = hex.replace("#", "");
  return {
    r: parseInt(normalized.slice(0, 2), 16),
    g: parseInt(normalized.slice(2, 4), 16),
    b: parseInt(normalized.slice(4, 6), 16),
  };
}

function rgbToHex({ r, g, b }) {
  return [r, g, b]
    .map((value) => Math.max(0, Math.min(255, Math.round(value))).toString(16).padStart(2, "0"))
    .join("")
    .toUpperCase();
}

function tint(hex, amount) {
  const { r, g, b } = hexToRgb(hex);
  return rgbToHex({
    r: r + (255 - r) * amount,
    g: g + (255 - g) * amount,
    b: b + (255 - b) * amount,
  });
}

function estimateLines(text, widthPx, fontSizePt) {
  const capacity = Math.max(10, Math.floor(widthPx / (fontSizePt * 0.58)));
  return String(text)
    .split("\n")
    .reduce((sum, line) => sum + Math.max(1, Math.ceil(line.length / capacity)), 0);
}

function addText(slide, text, x, y, w, h, options = {}) {
  slide.addText(String(text), {
    x: ix(x),
    y: ix(y),
    w: ix(w),
    h: ix(h),
    margin: options.margin ?? 0,
    fontFace: options.fontFace || "Arial",
    fontSize: options.fontSize || 12,
    bold: options.bold || false,
    color: options.color || BLACK,
    align: options.align || "center",
    valign: options.valign || "mid",
    fit: options.fit || "shrink",
    breakLine: false,
    paraSpaceAfterPt: options.paraSpaceAfterPt || 0,
    lineSpacingMultiple: options.lineSpacingMultiple,
    italic: options.italic || false,
  });
}

function addRect(slide, x, y, w, h, color, line = null) {
  slide.addShape("rect", {
    x: ix(x),
    y: ix(y),
    w: ix(w),
    h: ix(h),
    line: line || { color, transparency: 100 },
    fill: { color },
  });
}

function addLine(slide, x1, y1, x2, y2, color, width = 1) {
  slide.addShape("line", {
    x: ix(x1),
    y: ix(y1),
    w: ix(x2 - x1),
    h: ix(y2 - y1),
    line: { color, width },
  });
}

function baseSlide(pptx) {
  const slide = pptx.addSlide();
  slide.background = { color: WHITE };
  return slide;
}

function drawCover(slide) {
  addText(slide, "Lietuvos gyventojų nuomonės\napie baltarusius", MARGIN_X, 114, PAGE_W - 2 * MARGIN_X, 102, {
    fontFace: "Times New Roman",
    fontSize: 34,
    color: BLACK,
    align: "center",
    margin: 0,
  });
  addText(slide, "Беларусы ў вачах жыхароў Літвы", MARGIN_X, 238, PAGE_W - 2 * MARGIN_X, 42, {
    fontFace: "Times New Roman",
    fontSize: 22,
    color: BLACK,
    align: "center",
    margin: 0,
  });
  addText(slide, "Sociologinio tyrimo pristatymas", MARGIN_X, 324, PAGE_W - 2 * MARGIN_X, 30, {
    fontFace: "Times New Roman",
    fontSize: 18,
    color: BLACK,
    align: "center",
    margin: 0,
  });
  addText(slide, "Сацыялагічнае даследаванне", MARGIN_X, 360, PAGE_W - 2 * MARGIN_X, 28, {
    fontFace: "Times New Roman",
    fontSize: 16,
    color: BLACK,
    align: "center",
    margin: 0,
  });
}

function drawSection(slide, lt, be) {
  addText(slide, `${lt}\n${be}`, MARGIN_X, 208, PAGE_W - 2 * MARGIN_X, 96, {
    fontFace: "Times New Roman",
    fontSize: 30,
    color: BLACK,
    align: "center",
    margin: 0,
  });
}

function drawDualTitle(slide, lt, be, opts = {}) {
  const top = opts.top ?? 26;
  const bottom = opts.bottom ?? 118;
  const gap = opts.gap ?? 8;
  const width = opts.width ?? PAGE_W - 2 * MARGIN_X;
  const x = opts.x ?? MARGIN_X;
  const ltH = (bottom - top - gap) / 2;
  const beH = ltH;
  addText(slide, lt, x, top, width, ltH, {
    fontFace: opts.fontFace || "Arial",
    fontSize: opts.fontSize || 19,
    color: BLACK,
    align: "center",
    margin: 0,
  });
  addText(slide, be, x, top + ltH + gap, width, beH, {
    fontFace: opts.fontFace || "Arial",
    fontSize: opts.fontSize || 19,
    color: BLACK,
    align: "center",
    margin: 0,
  });
}

function drawMethodologyMono(slide, title, rows) {
  addText(slide, title, MARGIN_X, 48, PAGE_W - 2 * MARGIN_X, 38, {
    fontFace: "Times New Roman",
    fontSize: 25,
    color: BLACK,
    align: "center",
    margin: 0,
  });
  const tableX = 106;
  const iconW = 52;
  const labelW = 150;
  const valueW = 580;
  const x1 = tableX;
  const x2 = x1 + iconW + labelW;
  const tableRight = x1 + iconW + labelW + valueW;
  let y = 120;
  const heights = [36, 68, 36, 36, 36, 36, 58, 76];
  addLine(slide, x1, y, tableRight, y, tint(SAPPHIRE, 0.78), 0.8);
  rows.forEach(([label, value], idx) => {
    const rowH = heights[idx];
    const nextY = y + rowH;
    addLine(slide, x1, nextY, tableRight, nextY, tint(SAPPHIRE, 0.78), 0.8);
    addLine(slide, x2, y, x2, nextY, tint(SAPPHIRE, 0.78), 0.8);
    slide.addShape("ellipse", {
      x: ix(x1 + 20),
      y: ix(y + rowH / 2 - 6),
      w: ix(12),
      h: ix(12),
      line: { color: BLACK, width: 1 },
      fill: { color: WHITE, transparency: 100 },
    });
    addText(slide, label, x1 + iconW + 6, y + 4, labelW - 8, rowH - 8, {
      fontFace: "Times New Roman",
      fontSize: 10.5,
      color: BLACK,
      align: "left",
      margin: 0,
    });
    addText(slide, value, x2 + 10, y + 4, valueW - 16, rowH - 8, {
      fontFace: "Times New Roman",
      fontSize: 8.8,
      color: BLACK,
      align: "left",
      margin: 0,
    });
    y = nextY;
  });
}

function drawValue(slide, x, y, text, options = {}) {
  addText(slide, text, x - 24, y - 9, 48, 18, {
    fontFace: "Arial",
    fontSize: 10.5,
    color: options.color || BLACK,
    align: options.align || "center",
    bold: options.bold || false,
    margin: 0,
  });
}

function drawSimpleVerticalChart(slide, titleLt, titleBe, items, opts = {}) {
  const top = opts.top ?? 420;
  const bottom = opts.bottom ?? 102;
  const maxValue = opts.maxValue ?? Math.max(...items.map((item) => item.value));
  const labelYOffset = opts.labelYOffset ?? -12;
  drawDualTitle(slide, titleLt, titleBe, {
    bottom: Math.min(top - 20, 150),
    fontFace: "Arial",
    fontSize: opts.titleFontSize || 19,
    gap: opts.titleGap || 8,
  });
  const left = MARGIN_X + 62;
  const right = PAGE_W - MARGIN_X - 26;
  const width = right - left;
  const height = top - bottom;
  addLine(slide, left, bottom, right, bottom, tint(SAPPHIRE, 0.65), 1.2);
  const tickStep = maxValue >= 30 ? 10 : 5;
  for (let tick = 0; tick <= maxValue + tickStep; tick += tickStep) {
    if (tick > maxValue) continue;
    const y = bottom + height - (height * tick) / maxValue;
    addLine(slide, left, y, right, y, tint(SAPPHIRE, 0.9), tick === 0 ? 1.2 : 0.6);
    addText(slide, fmtPct(tick), left - 54, y - 8, 46, 16, {
      fontFace: "Arial",
      fontSize: 8.2,
      color: BLACK,
      align: "right",
      margin: 0,
    });
  }
  const barSlot = width / items.length;
  const barW = Math.min(56, barSlot * 0.42);
  items.forEach((item, idx) => {
    const x = left + idx * barSlot + (barSlot - barW) / 2;
    const h = (height * item.value) / maxValue;
    addRect(slide, x, bottom + height - h, barW, h, item.color);
    drawValue(slide, x + barW / 2, bottom + height - h - 12, fmtPct(item.value), { color: item.color });
    addText(slide, `${item.lt}\n${item.be}`, x - 18, bottom + height + labelYOffset, barW + 36, 34, {
      fontFace: "Arial",
      fontSize: 8.4,
      color: BLACK,
      align: "center",
      margin: 0,
    });
  });
}

function drawGroupedVerticalChart(slide, titleLt, titleBe, groups, series, opts = {}) {
  const top = opts.top ?? 420;
  const bottom = opts.bottom ?? 110;
  const maxValue = opts.maxValue ?? 100;
  const seriesWRatio = opts.seriesWRatio ?? 0.72;
  const legendY = opts.legendY ?? 88;
  const labelYOffset = opts.labelYOffset ?? -12;
  drawDualTitle(slide, titleLt, titleBe, {
    bottom: Math.min(top - 18, 152),
    fontFace: "Arial",
    fontSize: opts.titleFontSize || 19,
    gap: opts.titleGap || 8,
  });
  const left = MARGIN_X + 58;
  const right = PAGE_W - MARGIN_X - 24;
  const width = right - left;
  const height = top - bottom;
  addLine(slide, left, bottom, right, bottom, tint(SAPPHIRE, 0.65), 1.2);
  for (let tick = 0; tick <= maxValue; tick += 10) {
    const y = bottom + height - (height * tick) / maxValue;
    addLine(slide, left, y, right, y, tint(SAPPHIRE, 0.88), tick === 0 ? 1.2 : 0.6);
    addText(slide, fmtPct(tick), left - 52, y - 8, 44, 16, {
      fontFace: "Arial",
      fontSize: 8.2,
      color: BLACK,
      align: "right",
      margin: 0,
    });
  }
  let legendX = MARGIN_X + 110;
  series.forEach(([labelLt, labelBe, color]) => {
    addRect(slide, legendX, legendY - 8, 10, 10, color);
    addText(slide, `${labelLt}\n${labelBe}`, legendX + 14, legendY - 8, 100, 24, {
      fontFace: "Arial",
      fontSize: 8.4,
      color: BLACK,
      align: "left",
      margin: 0,
    });
    legendX += 130;
  });
  const groupW = width / groups.length;
  const seriesW = groupW * seriesWRatio;
  const gap = seriesW / (series.length * 1.4);
  const barW = (seriesW - gap * (series.length - 1)) / series.length;
  groups.forEach(([gLt, gBe], gIdx) => {
    const start = left + gIdx * groupW + (groupW - seriesW) / 2;
    series.forEach(([, , color, values], sIdx) => {
      const x = start + sIdx * (barW + gap);
      const h = (height * values[gIdx]) / maxValue;
      addRect(slide, x, bottom + height - h, barW, h, color);
      drawValue(slide, x + barW / 2, bottom + height - h - 12, fmtPct(values[gIdx]), { color });
    });
    addText(slide, `${gLt}\n${gBe}`, start - 10, bottom + height + labelYOffset, seriesW + 20, 34, {
      fontFace: "Arial",
      fontSize: 8.4,
      color: BLACK,
      align: "center",
      margin: 0,
    });
  });
}

function drawDivergingChart(slide, titleLt, titleBe, items, opts = {}) {
  const top = opts.top ?? 420;
  const bottom = opts.bottom ?? 110;
  const labelYOffset = opts.labelYOffset ?? -12;
  drawDualTitle(slide, titleLt, titleBe, {
    bottom: Math.min(top - 18, 150),
    fontFace: "Arial",
    fontSize: opts.titleFontSize || 19,
    gap: opts.titleGap || 8,
  });
  const left = MARGIN_X + 72;
  const right = PAGE_W - MARGIN_X - 20;
  const width = right - left;
  const height = top - bottom;
  const minVal = Math.min(...items.map((item) => item[2]));
  const maxVal = Math.max(...items.map((item) => item[2]));
  const span = Math.max(Math.abs(minVal), Math.abs(maxVal));
  const zeroY = bottom + height / 2;
  addLine(slide, left, zeroY, right, zeroY, tint(SAPPHIRE, 0.7), 1.2);
  for (let tick = -Math.floor(span / 5) * 5; tick <= Math.ceil(span / 5) * 5; tick += 5) {
    const y = zeroY - ((height / 2) * tick) / span;
    addLine(slide, left, y, right, y, tint(SAPPHIRE, 0.9), tick === 0 ? 1.2 : 0.5);
    addText(slide, fmtPct(tick), left - 54, y - 8, 46, 16, {
      fontFace: "Arial",
      fontSize: 8.2,
      color: BLACK,
      align: "right",
      margin: 0,
    });
  }
  const slot = width / items.length;
  const barW = Math.min(52, slot * 0.36);
  items.forEach(([lt, be, value], idx) => {
    const x = left + idx * slot + (slot - barW) / 2;
    const h = ((height / 2) * Math.abs(value)) / span;
    const y = value >= 0 ? zeroY - h : zeroY;
    const color = value >= 0 ? EMERALD : RUBY;
    addRect(slide, x, y, barW, h, color);
    const textY = value >= 0 ? y - 12 : y + h + 2;
    drawValue(slide, x + barW / 2, textY, fmtPct(value), { color });
    addText(slide, `${lt}\n${be}`, x - 20, bottom + height + labelYOffset, barW + 40, 34, {
      fontFace: "Arial",
      fontSize: 8.4,
      color: BLACK,
      align: "center",
      margin: 0,
    });
  });
}

function drawHorizontalBarChart(slide, titleLt, titleBe, items, opts = {}) {
  const top = opts.top ?? 436;
  const bottom = opts.bottom ?? CHART_BOTTOM;
  const labelW = opts.labelW ?? 220;
  const maxValue = opts.maxValue ?? Math.max(...items.map((item) => item.value));
  drawDualTitle(slide, titleLt, titleBe, {
    bottom: Math.min(top - 16, 156),
    fontFace: "Arial",
    fontSize: opts.titleFontSize || 19,
    gap: opts.titleGap || 10,
  });
  const left = MARGIN_X + labelW + 18;
  const right = PAGE_W - MARGIN_X - 20;
  const width = right - left;
  const height = top - bottom;
  const rowH = height / items.length;
  addLine(slide, left, bottom, left, top, tint(SAPPHIRE, 0.72), 1.2);
  addLine(slide, left, top, right, top, tint(SAPPHIRE, 0.92), 0.6);
  const tickStep = maxValue >= 50 ? 10 : 5;
  for (let tick = 0; tick <= maxValue; tick += tickStep) {
    const x = left + (width * tick) / maxValue;
    addLine(slide, x, bottom, x, top, tint(SAPPHIRE, 0.92), tick === 0 ? 1.2 : 0.5);
    addText(slide, fmtPct(tick), x - 24, top + 4, 48, 16, {
      fontFace: "Arial",
      fontSize: 8.2,
      color: BLACK,
      align: "center",
      margin: 0,
    });
  }
  items.forEach((item, idx) => {
    const y = bottom + idx * rowH + rowH * 0.2;
    const barH = rowH * 0.42;
    const barW = (width * item.value) / maxValue;
    addRect(slide, left, y, barW, barH, item.color);
    addText(slide, `${item.lt}\n${item.be}`, MARGIN_X, y - 1, labelW - 8, barH + 6, {
      fontFace: "Arial",
      fontSize: 8.8,
      color: BLACK,
      align: "right",
      margin: 0,
    });
    drawValue(slide, left + barW + 28, y + barH / 2 - 1, fmtPct(item.value), { color: item.color });
  });
}

function drawTable(slide, titleLt, titleBe, rows, headers, opts = {}) {
  const top = opts.top ?? 420;
  const rowFontSize = opts.rowFontSize ?? 10.5;
  const titleFontSize = opts.titleFontSize ?? 19;
  const firstColRatio = opts.firstColRatio ?? 0.66;
  const minRowHeight = opts.minRowHeight ?? 34;
  const cellPadding = opts.cellPadding ?? 14;
  drawDualTitle(slide, titleLt, titleBe, {
    bottom: Math.min(top - 18, 152),
    fontFace: "Arial",
    fontSize: titleFontSize,
    gap: opts.titleGap || 8,
  });
  const tableX = MARGIN_X;
  const tableW = PAGE_W - 2 * MARGIN_X;
  const firstColW = tableW * firstColRatio;
  const otherW = (tableW - firstColW) / headers.length;
  const headerH = headers.every((header) => header.replace(/\n/g, " ").length <= 12) ? 24 : 42;
  addRect(slide, tableX, top - headerH, tableW, headerH, SAPPHIRE);
  let headerX = tableX + firstColW;
  headers.forEach((header) => {
    addText(slide, header, headerX + 6, top - headerH + 4, otherW - 12, headerH - 8, {
      fontFace: "Arial",
      fontSize: 8.2,
      color: WHITE,
      bold: true,
      align: "center",
      margin: 0,
    });
    headerX += otherW;
  });
  let y = top + 4;
  const availableBottom = PAGE_H - 18;
  let rowHeights = rows.map(([lt, be]) => {
    const text = `${lt}\n${be}`;
    const lines = estimateLines(text, firstColW - 18, rowFontSize);
    return Math.max(minRowHeight, lines * (rowFontSize + 2.5) + cellPadding);
  });
  const totalRowsHeight = rowHeights.reduce((sum, h) => sum + h + 2, 0);
  const maxAvailable = availableBottom - y;
  if (totalRowsHeight > maxAvailable) {
    const scale = maxAvailable / totalRowsHeight;
    rowHeights = rowHeights.map((h) => Math.max(minRowHeight * 0.84, h * scale));
  }
  rows.forEach(([lt, be, values, accent], idx) => {
    const cellH = rowHeights[idx];
    const shade = tint(accent || SAPPHIRE, idx % 2 === 0 ? 0.82 : 0.9);
    addRect(slide, tableX, y, tableW, cellH, shade);
    if (accent) {
      addRect(slide, tableX, y, 7, cellH, accent);
    }
    addText(slide, `${lt}\n${be}`, tableX + 14, y + 4, firstColW - 24, cellH - 8, {
      fontFace: "Arial",
      fontSize: rowFontSize,
      color: BLACK,
      align: "left",
      margin: 0,
    });
    let x = tableX + firstColW;
    values.forEach((value) => {
      addText(slide, value, x, y + cellH / 2 - 10, otherW, 20, {
        fontFace: "Arial",
        fontSize: 11.5,
        color: BLACK,
        bold: true,
        align: "center",
        margin: 0,
      });
      x += otherW;
    });
    y += cellH + 2;
  });
}

function item(lt, be, value, color) {
  return { lt, be, value, color };
}

async function main() {
  const pptx = new PptxGenJS();
  pptx.defineLayout({ name: "LITH", width: 13.333, height: 7.5 });
  pptx.layout = "LITH";
  pptx.author = "Codex";
  pptx.company = "Codex";
  pptx.subject = "Lithuania 2026 redesign";
  pptx.title = "Lithuania 2026 redesign";
  pptx.lang = "lt-LT";
  pptx.theme = {
    headFontFace: "Arial",
    bodyFontFace: "Arial",
    lang: "lt-LT",
  };

  const slides = [];
  const add = (fn) => slides.push(fn);

  add((slide) => drawCover(slide));
  add((slide) =>
    drawMethodologyMono(slide, "TYRIMO METODIKA", [
      ["LAIKAS", "2026 01 19–29"],
      ["TIKSLAS", "Išsiaiškinti 2020 m. sprendimo dėl atvykimo vertinimą, nacionalinio saugumo grėsmių ir ekonominio indėlio suvokimą, taip pat režimo legitimumo ir opozicijos lyderės žinomumo vertinimus."],
      ["TIKSLINĖ GRUPĖ", "Šalies gyventojai nuo 18 iki 75 metų amžiaus."],
      ["IMTIS", "Tyrimo metu buvo apklausta 1017 respondentų."],
      ["ATRANKA", "Tyrime naudotas kvotinės atrankos metodas."],
      ["LOKACIJA", "Visa šalies teritorija."],
      ["APKLAUSOS METODAS", "Kombinuotas metodas: CATI (Computer Assisted Telephone Interview) ir CAWI (Computer Assisted WEB Interview)."],
      ["DUOMENŲ ANALIZĖ", "Analizė atlikta SPSS/PC programine įranga. Ataskaitoje pateikiami bendrieji atsakymų pasiskirstymai (procentais) ir pasiskirstymai pagal socialines-demografines charakteristikas (žr. priedus)."],
    ])
  );
  add((slide) =>
    drawMethodologyMono(slide, "МЕТАДАЛОГІЯ ДАСЛЕДАВАННЯ", [
      ["ЧАС", "2026 01 19–29"],
      ["МЭТА", "Вызначыць ацэнкі рашэння ўезду ў 2020 годзе, уяўленне нацыянальных пагроз бяспецы і эканамічнага ўнёску, а таксама ацэнкі легітымнасці рэжыму і вядомасці апазіцыйнага лідара."],
      ["МЭТАВАЯ ГРУПА", "Жыхары краіны ва ўзросце ад 18 да 75 гадоў."],
      ["ВЫБАРКА", "Падчас даследавання было апытана 1017 рэспандэнтаў."],
      ["АДБОР", "Ужываўся квотны метад адбору."],
      ["ЛАКАЦЫЯ", "Тэрыторыя ўсёй краіны."],
      ["МЕТАД АПЫТАННЯ", "Камбінаваны метад: CATI (Computer Assisted Telephone Interview) і CAWI (Computer Assisted WEB Interview)."],
      ["АНАЛІЗ ДАДЗЕНЫХ", "Аналіз праведзены ў праграме SPSS/PC. У справаздачы падаюцца асноўныя размеркаванні адказаў (у працэнтах), а таксама размеркаванні па сацыяльна-дэмаграфічных характарыстыках (гл. дадаткі)."],
    ])
  );
  add((slide) => drawSection(slide, "1. Požiūris į baltarusius", "1. Стаўленне да беларусаў"));
  add((slide) =>
    drawHorizontalBarChart(
      slide,
      "Kaip Jūs vertinate Baltarusijos piliečius?",
      "Як вы ставіцеся да грамадзян Беларусі?",
      [item("Teigiamai", "Пазітыўна", 37.2, EMERALD), item("Neigiamai", "Негатыўна", 36.6, RUBY), item("Sunku pasakyti", "Цяжка сказаць", 26.3, SAPPHIRE)],
      { maxValue: 40 }
    )
  );
  add((slide) =>
    drawGroupedVerticalChart(
      slide,
      "Kaip Jūs vertinate Baltarusijos piliečius?",
      "Як вы ставіцеся да грамадзян Беларусі?",
      [["LT", "LT"], ["LV", "LV"], ["UA", "UA"]],
      [
        ["Teigiamai", "Пазітыўна", EMERALD, [37.2, 48.6, 35.6]],
        ["Neigiamai", "Негатыўна", RUBY, [36.6, 26.5, 50.4]],
        ["Sunku pasakyti", "Цяжка сказаць", SAPPHIRE, [26.3, 24.8, 14.0]],
      ],
      { maxValue: 60, seriesWRatio: 0.52, legendY: 58 }
    )
  );
  add((slide) =>
    drawDivergingChart(
      slide,
      "Teigiamų ir neigiamų nuostatų santykis (amžius)",
      "Баланс пазітыўнага і негатыўнага стаўлення (узрост)",
      [
        ["18-25 m.", "18-25 г.", 8.4],
        ["26-35 m.", "26-35 г.", -19.9],
        ["36-45 m.", "36-45 г.", -4.1],
        ["46-55 m.", "46-55 г.", 9.9],
        ["56 m. ir daugiau", "56 г. і больш", 8.1],
      ],
      { labelYOffset: -20 }
    )
  );
  add((slide) =>
    drawDivergingChart(
      slide,
      "Teigiamų ir neigiamų nuostatų santykis (išsilavinimas)",
      "Баланс пазітыўнага і негатыўнага стаўлення (адукацыя)",
      [["Aukštasis", "Вышэйшая", -8.3], ["Vidurinis", "Сярэдняя", 4.8], ["Nebaigtas vidurinis", "Незавершаная сярэдняя", 13.5]]
    )
  );
  add((slide) =>
    drawDivergingChart(
      slide,
      "Teigiamų ir neigiamų nuostatų santykis (pajamos)",
      "Баланс пазітыўнага і негатыўнага стаўлення (даход)",
      [
        ["Iki 500 Eur", "Да 500 Eur", 1.3],
        ["501-700 Eur", "501-700 Eur", 6.0],
        ["701-1000 Eur", "701-1000 Eur", 7.5],
        ["1001-1500 Eur", "1001-1500 Eur", -12.1],
        ["Daugiau nei 1500 Eur", "Больш за 1500 Eur", -9.6],
      ],
      { labelYOffset: -20 }
    )
  );
  add((slide) =>
    drawSimpleVerticalChart(
      slide,
      "Kaip Jūs vertinate Baltarusijos piliečius, gyvenančius Lietuvoje?",
      "Як вы ставіцеся да грамадзян Беларусі, якія жывуць у Літве?",
      [item("Teigiamai", "Пазітыўна", 41.9, EMERALD), item("Neigiamai", "Негатыўна", 30.9, RUBY), item("Sunku pasakyti", "Цяжка сказаць", 27.2, SAPPHIRE)],
      { maxValue: 45 }
    )
  );
  add((slide) =>
    drawSimpleVerticalChart(
      slide,
      "2020 m., kai Baltarusijoje prasidėjo protestai prieš galimą rinkimų klastojimą, Lietuvos vyriausybė leido atvykti į šalį daugeliui žmonių, kurie buvo priversti palikti Baltarusiją. Kaip Jūs vertinate šį sprendimą?",
      "У 2020 годзе, калі ў Беларусі ўспыхнулі пратэсты супраць магчымага фальсіфікавання выбараў, літоўскі ўрад дазволіў многім людзям, якія былі вымушаныя пакінуць Беларусь, уехаць у краіну. Як вы ацэньваеце гэтае рашэнне?",
      [item("Teigiamai", "Пазітыўна", 49.9, EMERALD), item("Neigiamai", "Негатыўна", 27.1, RUBY), item("Sunku pasakyti", "Цяжка сказаць", 23.0, SAPPHIRE)],
      { maxValue: 60, top: 350 }
    )
  );
  add((slide) =>
    drawSimpleVerticalChart(
      slide,
      "Teigiamai",
      "Пазітыўна",
      [item("Baltarusijos piliečius", "Грамадзян Беларусі", 37.2, EMERALD), item("Piliečius, gyvenančius Lietuvoje", "Грамадзян, якія жывуць у Літве", 41.9, EMERALD), item("2020 m. migraciją", "Міграцыю 2020 года", 49.9, EMERALD)],
      { maxValue: 60 }
    )
  );
  add((slide) =>
    drawSimpleVerticalChart(
      slide,
      "Ar turite giminių, kolegų, pažįstamų ar kitų asmenų iš Baltarusijos, su kuriais per pastaruosius metus bent kartą palaikėte ryšį? Nesvarbu, ar jie gyvena Baltarusijoje, ar kitose šalyse.",
      "Ці ёсць у вас сваякі, калегі, знаёмыя ці іншыя людзі з Беларусі, з якімі вы падтрымлівалі сувязь хаця б адзін раз за апошні год? Не мае значэння, жывуць яны ў Беларусі ці ў іншых краінах.",
      [item("Taip", "Так", 12.4, EMERALD), item("Ne", "Не", 87.6, RUBY)],
      { maxValue: 100, top: 350, titleFontSize: 18.0, titleGap: 12 }
    )
  );
  add((slide) =>
    drawGroupedVerticalChart(
      slide,
      "Ar turite giminių, kolegų, pažįstamų ar kitų asmenų iš Baltarusijos, su kuriais per pastaruosius metus bent kartą palaikėte ryšį? Nesvarbu, ar jie gyvena Baltarusijoje, ar kitose šalyse.",
      "Ці ёсць у вас сваякі, калегі, знаёмыя ці іншыя людзі з Беларусі, з якімі вы падтрымлівалі сувязь хаця б адзін раз за апошні год? Не мае значэння, жывуць яны ў Беларусі ці ў іншых краінах.",
      [["LT", "LT"], ["LV", "LV"], ["UA", "UA"]],
      [["Taip", "Так", EMERALD, [12.4, 22.5, 7.3]], ["Ne", "Не", RUBY, [87.6, 72.1, 92.6]]],
      { maxValue: 100, top: 360, seriesWRatio: 0.38, legendY: 60, titleFontSize: 18.0, titleGap: 12 }
    )
  );
  add((slide) =>
    drawSimpleVerticalChart(
      slide,
      "Ar turite giminių, kolegų, pažįstamų ar kitų asmenų iš Baltarusijos, su kuriais per pastaruosius metus bent kartą palaikėte ryšį? Nesvarbu, ar jie gyvena Baltarusijoje, ar kitose šalyse (taip).",
      "Ці ёсць у вас сваякі, калегі, знаёмыя ці іншыя людзі з Беларусі, з якімі вы падтрымлівалі сувязь хаця б адзін раз за апошні год? Не мае значэння, жывуць яны ў Беларусі ці ў іншых краінах (так).",
      [
        item("Vilnius", "Вільнюс", 21.7, EMERALD),
        item("Kiti didieji miestai", "Іншыя буйныя гарады", 7.5, EMERALD),
        item("Kitas miestas, rajono centras", "Іншы горад, раённы цэнтр", 9.8, EMERALD),
        item("Kaimo vietovė", "Сельская мясцовасць", 12.1, EMERALD),
      ],
      { maxValue: 25, top: 360 }
    )
  );
  add((slide) =>
    drawTable(
      slide,
      "Kaip Lietuvai reikėtų elgtis su darbo migracija iš Baltarusijos?",
      "Як Літве варта вырашаць пытанне працоўнай міграцыі з Беларусі?",
      [
        ["Siekti sumažinti šiuo metu Lietuvoje esančių darbo migrantų iš Baltarusijos skaičių", "Мэта — скараціць колькасць працоўных мігрантаў з Беларусі, якія цяпер знаходзяцца ў Літве", ["26,8%", "26,2%"], RUBY],
        ["Nutraukti tolesnę darbo migraciją iš Baltarusijos, tačiau nesiimti priemonių mažinti jau esamą jų skaičių", "Спыніць далейшую працоўную міграцыю з Беларусі, але не прымаць мер па скарачэнні ўжо наяўнай колькасці", ["18,1%", "16,3%"], RUBY],
        ["Leisti darbo migraciją tomis pačiomis sąlygomis kaip ir iš kitų ne ES šalių", "Дазволіць працоўную міграцыю на тых самых умовах, што і з іншых краін па-за ЕС", ["37,3%", "30,5%"], SAPPHIRE],
        ["Skatinti darbo migraciją iš Baltarusijos (sudaryti specialias, palankias sąlygas)", "Заахвочваць працоўную міграцыю з Беларусі (стварыць спецыяльныя спрыяльныя ўмовы)", ["3,9%", "6,6%"], EMERALD],
        ["Sunku pasakyti", "Цяжка сказаць", ["13,9%", "20,4%"], SAPPHIRE],
      ],
      ["LT", "LV"],
      { top: 420 }
    )
  );
  add((slide) => drawSection(slide, "2. Baltarusijos politika ir valstybė", "2. Беларуская палітыка і дзяржава"));
  add((slide) =>
    drawTable(
      slide,
      "Su kuriuo iš žemiau pateiktų teiginių Jūs labiausiai sutinkate?",
      "З якім з наступных сцвярджэнняў вы найбольш згодныя?",
      [
        ["Baltarusija yra demokratiška valstybė", "Беларусь — дэмакратычная дзяржава", ["2,6%"], EMERALD],
        ["Baltarusija yra daugiau demokratiška nei autoritarinė", "Беларусь хутчэй дэмакратычная, чым аўтарытарная", ["4,2%"], EMERALD],
        ["Baltarusija daugiau yra autoritarinė nei demokratiška valstybė", "Беларусь хутчэй аўтарытарная, чым дэмакратычная", ["21,9%"], RUBY],
        ["Baltarusija yra autoritarinė valstybė", "Беларусь — аўтарытарная дзяржава", ["54,0%"], RUBY],
        ["Sunku pasakyti", "Цяжка сказаць", ["17,3%"], SAPPHIRE],
      ],
      [""]
    )
  );
  add((slide) =>
    drawTable(
      slide,
      "Su kuriuo iš žemiau pateiktų teiginių Jūs labiausiai sutinkate?",
      "З якім з наступных сцвярджэнняў вы найбольш згодныя?",
      [
        ["Baltarusija yra demokratiška valstybė", "Беларусь — дэмакратычная дзяржава", ["2,6%", "5,2%", "2,3%"], EMERALD],
        ["Baltarusija yra daugiau demokratiška nei autoritarinė", "Беларусь хутчэй дэмакратычная, чым аўтарытарная", ["4,2%", "11,9%", "6,6%"], EMERALD],
        ["Baltarusija daugiau yra autoritarinė nei demokratiška valstybė", "Беларусь хутчэй аўтарытарная, чым дэмакратычная", ["21,9%", "21,1%", "22,2%"], RUBY],
        ["Baltarusija yra autoritarinė valstybė", "Беларусь — аўтарытарная дзяржава", ["54,0%", "45,9%", "58,3%"], RUBY],
        ["Sunku pasakyti", "Цяжка сказаць", ["17,3%", "15,9%", "10,6%"], SAPPHIRE],
      ],
      ["LT", "LV", "UA"]
    )
  );
  add((slide) => drawSection(slide, "3. Užsienio politika", "3. Знешняя палітыка"));
  add((slide) =>
    drawTable(
      slide,
      "Su kuriuo iš šių teiginių Jūs labiausiai sutinkate?",
      "З якім з гэтых сцвярджэнняў вы найбольш згодныя?",
      [
        ["Baltarusija yra nepriklausoma valstybė, visiškai savarankiška užsienio politikoje", "Беларусь — незалежная дзяржава, цалкам аўтаномная ў знешняй палітыцы", ["6,1%"], EMERALD],
        ["Baltarusija yra nepriklausoma valstybė, kurios užsienio politikai reikšmingą įtaką daro Rusija", "Беларусь — незалежная дзяржава, на знешнюю палітыку якой істотна ўплывае Расія", ["17,7%"], EMERALD],
        ["Baltarusija yra priklausoma valstybė, kurios užsienio politiką beveik visiškai lemia Rusija", "Беларусь — залежная дзяржава, знешняя палітыка якой амаль цалкам вызначаецца Расіяй", ["28,1%"], RUBY],
        ["Baltarusija yra priklausoma valstybė, visiškai kontroliuojama Rusijos (faktiškai Rusijos okupuota valstybė)", "Беларусь — залежная дзяржава, цалкам кантралюемая Расіяй (фактычна акупаваная Расіяй)", ["33,9%"], RUBY],
        ["Sunku pasakyti", "Цяжка сказаць", ["14,2%"], SAPPHIRE],
      ],
      [""],
      { top: 410, rowFontSize: 8.6, titleFontSize: 17 }
    )
  );
  add((slide) =>
    drawTable(
      slide,
      "Su kuriuo iš šių teiginių Jūs labiausiai sutinkate?",
      "З якім з гэтых сцвярджэнняў вы найбольш згодныя?",
      [
        ["Baltarusija yra nepriklausoma valstybė", "Беларусь — незалежная дзяржава", ["23,8%"], EMERALD],
        ["Baltarusija yra priklausoma valstybė", "Беларусь — залежная дзяржава", ["62,0%"], RUBY],
        ["Sunku pasakyti", "Цяжка сказаць", ["14,2%"], SAPPHIRE],
      ],
      [""]
    )
  );
  add((slide) =>
    drawGroupedVerticalChart(
      slide,
      "Su kuriuo iš šių teiginių Jūs labiausiai sutinkate?",
      "З якім з гэтых сцвярджэнняў вы найбольш згодныя?",
      [["LT", "LT"], ["LV", "LV"], ["LV piliečiai", "Грамадзяне ЛВ"], ["UA", "UA"]],
      [
        ["Priklausoma valstybė", "Залежная дзяржава", RUBY, [62.0, 49.4, 51.8, 81.6]],
        ["Nepriklausoma valstybė", "Незалежная дзяржава", EMERALD, [23.8, 36.7, 34.7, 13.5]],
        ["Sunku pasakyti", "Цяжка сказаць", SAPPHIRE, [14.2, 13.9, 13.5, 5.0]],
      ],
      { maxValue: 90, seriesWRatio: 0.48, legendY: 58 }
    )
  );
  add((slide) =>
    drawHorizontalBarChart(
      slide,
      "Baltarusija yra nepriklausoma valstybė",
      "Беларусь — незалежная дзяржава",
      [
        item("Nebalsavau", "Не галасаваў(ла)", 25.1, EMERALD),
        item("Kita partija", "Іншая партыя", 23.7, EMERALD),
        item("Nacionalinis susivienijimas", "Нацыянальнае аб'яднанне", 27.3, EMERALD),
        item("Lietuvos lenkų rinkimų akcija – Krikščioniškų šeimų sąjunga", "Выбарчая акцыя палякаў Літвы — Саюз хрысціянскіх сем'яў", 33.3, EMERALD),
        item("Lietuvos valstiečių ir žaliųjų sąjunga", "Саюз сялян і зялёных Літвы", 25.0, EMERALD),
        item("Liberalų sąjūdis", "Ліберальны рух", 16.5, EMERALD),
        item("Demokratų sąjunga „Vardan Lietuvos“", "Дэмакратычны саюз «Дзеля Літвы»", 21.6, EMERALD),
        item("Partija „Nemuno aušra“", "Партыя «Світанак Нёмана»", 34.6, EMERALD),
        item("Tėvynės sąjunga – Lietuvos konservatoriai", "Саюз Айчыны — літоўскія кансерватары", 14.0, EMERALD),
        item("Socialdemokratų partija", "Сацыял-дэмакратычная партыя", 26.4, EMERALD),
      ],
      { maxValue: 40, labelW: 290, top: 430 }
    )
  );
  add((slide) =>
    drawTable(
      slide,
      "Kokią politiką Lietuva turėtų vykdyti Baltarusijos atžvilgiu?",
      "Якую палітыку павінна праводзіць Літва ў дачыненні да Беларусі?",
      [
        ["Vykdyti užsienio politikos izoliacijos ir sankcijų politiką", "Праводзіць палітыку ізаляцыі і санкцый", ["30,0%", "34,9%"], RUBY],
        ["Aktyviai neplėtoti bendradarbiavimo, tačiau palaikyti santykius su Baltarusijos valdžia tose srityse, kurios yra ekonomiškai svarbios", "Не развіваць супрацоўніцтва актыўна, але падтрымліваць адносіны з уладамі Беларусі ў сферах эканамічнага інтарэсу", ["39,9%", "29,4%"], SAPPHIRE],
        ["Plėtoti visapusišką bendradarbiavimą ir partnerystę su Baltarusijos valdžia", "Развіваць усебаковае супрацоўніцтва і партнёрства з уладамі Беларусі", ["13,2%", "21,6%"], EMERALD],
        ["Sunku pasakyti", "Цяжка сказаць", ["16,9%", "14,2%"], SAPPHIRE],
      ],
      ["LT", "LV"],
      { top: 420 }
    )
  );
  add((slide) =>
    drawSimpleVerticalChart(
      slide,
      "Vykdyti užsienio politikos izoliacijos ir sankcijų politiką",
      "Праводзіць палітыку ізаляцыі і санкцый",
      [
        item("Iki 500 Eur", "Да 500 Eur", 18.4, RUBY),
        item("501-700 Eur", "501-700 Eur", 26.4, RUBY),
        item("701-1000 Eur", "701-1000 Eur", 25.6, RUBY),
        item("1001-1500 Eur", "1001-1500 Eur", 38.4, RUBY),
        item("Daugiau nei 1500 Eur", "Больш за 1500 Eur", 51.1, RUBY),
      ],
      { maxValue: 60 }
    )
  );
  add((slide) =>
    drawSimpleVerticalChart(
      slide,
      "Vykdyti užsienio politikos izoliacijos ir sankcijų politiką",
      "Праводзіць палітыку ізаляцыі і санкцый",
      [item("Vilnius", "Вільнюс", 41.9, RUBY), item("Kiti didieji miestai", "Іншыя буйныя гарады", 28.3, RUBY), item("Kitas miestas, rajono centras", "Іншы горад, раённы цэнтр", 29.7, RUBY), item("Kaimo vietovė", "Сельская мясцовасць", 22.5, RUBY)],
      { maxValue: 45 }
    )
  );
  add((slide) => drawSection(slide, "4. Kultūra, istorija ir tapatybė", "4. Культура, гісторыя і ідэнтычнасць"));
  add((slide) =>
    drawHorizontalBarChart(
      slide,
      "Kaip Jūs vertintumėte, jei herbas, paremtas LDK „Vyčiu“, vėl taptų Baltarusijos valstybiniu simboliu (kaip tai buvo 1991-1995 m.)?",
      "Як бы вы паставіліся да сітуацыі, калі б герб Вялікага Княства Літоўскага («Пагоня») зноў стаў дзяржаўным сімвалам Беларусі (як гэта было ў 1991-1995 гадах)?",
      [
        item("Teigiamai", "Пазітыўна", 3.4, EMERALD),
        item("Greičiau teigiamai", "Хутчэй пазітыўна", 15.9, EMERALD),
        item("Greičiau neigiamai", "Хутчэй негатыўна", 15.0, RUBY),
        item("Neigiamai", "Негатыўна", 32.1, RUBY),
        item("Man tai nesvarbu", "Для мяне гэта не мае значэння", 16.4, SAPPHIRE),
        item("Sunku pasakyti", "Цяжка сказаць", 17.1, SAPPHIRE),
      ],
      { maxValue: 35, top: 400, labelW: 250, titleFontSize: 17.0, titleGap: 16 }
    )
  );
  add((slide) =>
    drawSimpleVerticalChart(
      slide,
      "Kaip Jūs vertintumėte, jei herbas, paremtas LDK „Vyčiu“, vėl taptų Baltarusijos valstybiniu simboliu (teigiamai arba greičiau teigiamai)?",
      "Як бы вы паставіліся да сітуацыі, калі б герб ВКЛ «Пагоня» зноў стаў дзяржаўным сімвалам Беларусі (пазітыўна або хутчэй пазітыўна)?",
      [
        item("Vilnius", "Вільнюс", 53.0, EMERALD),
        item("Kiti didieji miestai", "Іншыя буйныя гарады", 49.2, EMERALD),
        item("Kitas miestas, rajono centras", "Іншы горад, раённы цэнтр", 43.2, EMERALD),
        item("Kaimo vietovė", "Сельская мясцовасць", 44.3, EMERALD),
      ],
      { maxValue: 60, top: 360 }
    )
  );
  add((slide) =>
    drawTable(
      slide,
      "Su kuriuo iš šių teiginių Jūs labiausiai sutinkate?",
      "З якім з гэтых сцвярджэнняў вы найбольш згодныя?",
      [
        ["Lietuvos Didžiosios Kunigaikštystės politinis ir kultūrinis paveldas priklauso tik lietuvių tautai", "Палітычная і культурная спадчына Вялікага Княства Літоўскага належыць выключна літоўскаму народу", ["25,8%"], null],
        ["Lietuvos Didžiosios Kunigaikštystės politinis ir kultūrinis paveldas priklauso visoms tautoms, kurios joje gyveno", "Палітычная і культурная спадчына Вялікага Княства Літоўскага належыць усім народам, якія там жылі", ["34,4%"], null],
        ["Lietuvos Didžiosios Kunigaikštystės politinis ir kultūrinis paveldas priklauso lietuvių ir lenkų tautoms", "Палітычная і культурная спадчына Вялікага Княства Літоўскага належыць літоўскаму і польскаму народу", ["9,2%"], null],
        ["Lietuvos Didžiosios Kunigaikštystės politinis ir kultūrinis paveldas priklauso lietuvių ir baltarusių tautoms", "Палітычная і культурная спадчына Вялікага Княства Літоўскага належыць літоўскаму і беларускаму народу", ["3,6%"], null],
        ["Nesutinku nė su vienu iš pateiktų teiginių", "Не згодны ні з адным са сцвярджэнняў", ["6,2%"], null],
        ["Sunku pasakyti", "Цяжка сказаць", ["20,7%"], null],
      ],
      [""],
      { top: 420, rowFontSize: 8.6, titleFontSize: 17 }
    )
  );
  add((slide) =>
    drawHorizontalBarChart(
      slide,
      "Pastaraisiais metais Lietuvoje vyko daug viešų diskusijų apie „litvinizmą“. Ar esate girdėję apie šias diskusijas?",
      "У апошнія гады ў Літве адбылося шмат публічных дыскусій пра «літвінізм». Ці чулі вы пра гэтыя дыскусіі?",
      [item("Taip", "Так", 29.0, EMERALD), item("Ne", "Не", 54.8, RUBY), item("Sunku pasakyti", "Цяжка сказаць", 16.2, SAPPHIRE)],
      { maxValue: 60, top: 400, labelW: 220 }
    )
  );
  add((slide) =>
    drawSimpleVerticalChart(
      slide,
      "Ne",
      "Не",
      [
        item("Vilnius", "Вільнюс", 45.2, RUBY),
        item("Kiti didieji miestai", "Іншыя буйныя гарады", 54.7, RUBY),
        item("Kitas miestas, rajono centras", "Іншы горад, раённы цэнтр", 61.3, RUBY),
        item("Kaimo vietovė", "Сельская мясцовасць", 56.1, RUBY),
      ],
      { maxValue: 70 }
    )
  );
  add((slide) =>
    drawTable(
      slide,
      "Kuriuos iš žemiau išvardintų Baltarusijos kultūros veikėjų (rašytojų, intelektualų, muzikantų ir kt.) Jūs žinote?",
      "Каго з пералічаных дзеячаў культуры Беларусі (пісьменнікаў, інтэлектуалаў, музыкаў і г.д.) вы ведаеце?",
      [
        ["Eufrosinija Polockaja", "Ефрасіння Полацкая", ["1,3%"], null],
        ["Pranciškus Skorina", "Францыск Скарына", ["20,9%"], null],
        ["Konstantinas (Kastusis) Kalinauskas", "Кастусь Каліноўскі", ["25,8%"], null],
        ["Jakubas Kolasas", "Якуб Колас", ["6,6%"], null],
        ["Janka Kupala", "Янка Купала", ["25,2%"], null],
        ["Vladimiras Karatkevičius", "Уладзімір Караткевіч", ["3,8%"], null],
        ["Svetlana Aleksijevič", "Святлана Алексіевіч", ["13,3%"], null],
        ["Vseslavas Polockietis (Burtininkas)", "Усяслаў Полацкі (Чарадзей)", ["2,6%"], null],
        ["Vasilijus Bykovas", "Васіль Быкаў", ["8,0%"], null],
        ["Nežinau nė vieno", "Нікога не ведаю", ["52,6%"], null],
        ["Sunku pasakyti", "Цяжка сказаць", ["4,5%"], null],
      ],
      [""],
      { top: 404, rowFontSize: 7.8, titleFontSize: 15, minRowHeight: 29, cellPadding: 10 }
    )
  );
  add((slide) =>
    drawTable(
      slide,
      "Kuriuos iš žemiau išvardintų Baltarusijos kultūros veikėjų (rašytojų, intelektualų, muzikantų ir kt.) Jūs žinote?",
      "Каго з пералічаных дзеячаў культуры Беларусі (пісьменнікаў, інтэлектуалаў, музыкаў і г.д.) вы ведаеце?",
      [
        ["Eufrosinija Polockaja", "Ефрасіння Полацкая", ["1,3%", "2,8%"], null],
        ["Pranciškus Skorina", "Францыск Скарына", ["20,9%", "4,4%"], null],
        ["Konstantinas (Kastusis) Kalinauskas", "Кастусь Каліноўскі", ["25,8%", "20,9%"], null],
        ["Jakubas Kolasas", "Якуб Колас", ["6,6%", "7,5%"], null],
        ["Janka Kupala", "Янка Купала", ["25,2%", "12,7%"], null],
        ["Vladimiras Karatkevičius", "Уладзімір Караткевіч", ["3,8%", "5,2%"], null],
        ["Svetlana Aleksijevič", "Святлана Алексіевіч", ["13,3%", "4,2%"], null],
        ["Vseslavas Polockietis (Burtininkas)", "Усяслаў Полацкі (Чарадзей)", ["2,6%", "2,8%"], null],
        ["Vasilijus Bykovas", "Васіль Быкаў", ["8,0%", "NA"], null],
        ["Nežinau nė vieno", "Нікога не ведаю", ["52,6%", "65,0%"], null],
        ["Sunku pasakyti", "Цяжка сказаць", ["4,5%", "7,3%"], null],
      ],
      ["LT", "UA"],
      { top: 404, rowFontSize: 7.8, titleFontSize: 15, minRowHeight: 29, cellPadding: 10 }
    )
  );
  add((slide) =>
    drawTable(
      slide,
      "Kuriuos iš žemiau išvardintų Baltarusijos kultūros veikėjų Jūs žinote?",
      "Каго з пералічаных дзеячаў культуры Беларусі вы ведаеце?",
      [
        ["Pranciškus Skorina", "Францыск Скарына", ["11,1%", "8,6%", "17,9%", "15,9%", "36,5%"], null],
        ["Janka Kupala", "Янка Купала", ["10,0%", "10,2%", "15,6%", "19,6%", "48,6%"], null],
        ["Konstantinas (Kastusis) Kalinauskas", "Кастусь Каліноўскі", ["13,3%", "12,4%", "21,2%", "24,8%", "41,0%"], null],
        ["Svetlana Aleksijevič", "Святлана Алексіевіч", ["6,7%", "7,5%", "9,4%", "9,8%", "23,5%"], null],
      ],
      ["18-25 m.\n18-25 г.", "26-35 m.\n26-35 г.", "36-45 m.\n36-45 г.", "46-55 m.\n46-55 г.", "56+ m.\n56+ г."],
      { top: 416, rowFontSize: 8.6, titleFontSize: 17, firstColRatio: 0.56 }
    )
  );
  add((slide) =>
    drawTable(
      slide,
      "Kuriuos iš žemiau išvardintų Baltarusijos kultūros veikėjų Jūs žinote?",
      "Каго з пералічаных дзеячаў культуры Беларусі вы ведаеце?",
      [
        ["Pranciškus Skorina", "Францыск Скарына", ["35,0%", "16,9%", "17,3%", "17,1%"], null],
        ["Janka Kupala", "Янка Купала", ["31,8%", "24,4%", "22,6%", "23,2%"], null],
        ["Konstantinas (Kastusis) Kalinauskas", "Кастусь Каліноўскі", ["37,3%", "24,0%", "24,4%", "19,6%"], null],
        ["Svetlana Aleksijevič", "Святлана Алексіевіч", ["18,4%", "13,0%", "12,4%", "10,4%"], null],
      ],
      ["Vilnius\nВільнюс", "Kiti didieji miestai\nІншыя буйныя гарады", "Kitas miestas,\nrajono centras\nІншы горад,\nраённы цэнтр", "Kaimo vietovė\nСельская мясцовасць"],
      { top: 416, rowFontSize: 8.6, titleFontSize: 17, firstColRatio: 0.56 }
    )
  );

  slides.forEach((drawFn) => {
    const slide = baseSlide(pptx);
    drawFn(slide);
  });

  const fileName = await pptx.writeFile({ fileName: OUT_PATH, compression: true });
  console.log(fileName);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
