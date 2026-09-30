import * as THREE from "three";
import type { Mural } from "./types";

const GREEN = "#1f7a4a";
const DARK_GREEN = "#14452c";
const INK = "#1d1d1b";
const HEADLINE = "Impact, 'Arial Narrow Bold', 'Arial Narrow', sans-serif";
const BODY = "Arial, Helvetica, sans-serif";

function makeCanvas(w: number, h: number) {
  const canvas = document.createElement("canvas");
  canvas.width = w;
  canvas.height = h;
  return { canvas, ctx: canvas.getContext("2d")! };
}

function toTexture(canvas: HTMLCanvasElement, repeat = false) {
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 8;
  if (repeat) tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
  return tex;
}

/** One square cell with a thin grout line; tiled by UVs. */
export function makeGridTexture(fill: string, line: string, lineWidth = 3) {
  const { canvas, ctx } = makeCanvas(128, 128);
  ctx.fillStyle = fill;
  ctx.fillRect(0, 0, 128, 128);
  ctx.strokeStyle = line;
  ctx.lineWidth = lineWidth;
  ctx.strokeRect(0, 0, 128, 128);
  return toTexture(canvas, true);
}

export function makeLabelTexture(text: string, bg: string, fg: string, aspect: number) {
  const h = 128;
  const w = Math.round(h * aspect);
  const { canvas, ctx } = makeCanvas(w, h);
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, w, h);
  ctx.fillStyle = fg;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  let size = 80;
  ctx.font = `bold ${size}px ${BODY}`;
  const width = ctx.measureText(text).width;
  if (width > w * 0.88) size = Math.floor((size * w * 0.88) / width);
  ctx.font = `bold ${size}px ${BODY}`;
  ctx.fillText(text, w / 2, h / 2 + 4);
  return toTexture(canvas);
}

function drawSkyline(ctx: CanvasRenderingContext2D, w: number, h: number, bandHeight: number) {
  const base = h - bandHeight;
  // Mountains behind, buildings in front. Fixed seed so the mural looks the same every load.
  let seed = 7;
  const rand = () => {
    seed = (seed * 16807) % 2147483647;
    return seed / 2147483647;
  };
  ctx.fillStyle = GREEN;
  ctx.beginPath();
  ctx.moveTo(0, h);
  for (let x = 0; x <= w; x += 40) ctx.lineTo(x, base - 10 - rand() * bandHeight * 0.45);
  ctx.lineTo(w, h);
  ctx.fill();
  ctx.fillStyle = DARK_GREEN;
  for (let x = 0; x < w; ) {
    const bw = 24 + rand() * 46;
    const bh = bandHeight * (0.35 + rand() * 0.5);
    ctx.fillRect(x, h - bh, bw, bh);
    x += bw + rand() * 10;
  }
}

function drawSeal(ctx: CanvasRenderingContext2D, cx: number, cy: number, r: number) {
  ctx.lineWidth = r * 0.08;
  ctx.strokeStyle = GREEN;
  ctx.fillStyle = "#ffffff";
  ctx.beginPath();
  ctx.arc(cx, cy, r, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();
  ctx.lineWidth = r * 0.03;
  ctx.beginPath();
  ctx.arc(cx, cy, r * 0.72, 0, Math.PI * 2);
  ctx.stroke();
  ctx.fillStyle = GREEN;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.font = `${r * 0.6}px ${HEADLINE}`;
  ctx.fillText("UIB", cx, cy + r * 0.04);
}

function drawMission(): HTMLCanvasElement {
  const w = 2048;
  const h = 512;
  const { canvas, ctx } = makeCanvas(w, h);
  ctx.fillStyle = "#f4f4f2";
  ctx.fillRect(0, 0, w, h);
  drawSkyline(ctx, w, h, 120);

  ctx.textBaseline = "alphabetic";
  ctx.textAlign = "left";
  ctx.font = `64px ${HEADLINE}`;
  ctx.fillStyle = INK;
  ctx.fillText("UNIVERSITY", 330, 110);
  ctx.fillStyle = GREEN;
  ctx.fillText("MISSION", 368, 172);

  ctx.fillStyle = INK;
  ctx.font = `bold 17px ${BODY}`;
  const lines = [
    "KNOWLEDGE GENERATION, TRAINING OF IN-DEMAND,",
    "SUCCESSFUL SPECIALISTS WITH",
    "MODERN COMPETENCIES AND ACTIVELY INFLUENCING",
    "THE SOCIO-ECONOMIC DEVELOPMENT OF KAZAKHSTAN",
    "IN A CHANGING WORLD.",
  ];
  lines.forEach((line, i) => ctx.fillText(line, 250, 235 + i * 24));

  drawSeal(ctx, 1240, 150, 100);
  ctx.fillStyle = INK;
  ctx.textAlign = "center";
  ctx.font = `44px ${HEADLINE}`;
  ctx.fillText("KENZHEGALI SAGADIYEV", 1240, 310);
  ctx.font = `bold 20px ${BODY}`;
  ctx.fillText("UNIVERSITY OF INTERNATIONAL BUSINESS", 1240, 342);

  ctx.font = `66px ${HEADLINE}`;
  ["THE BEST", "PLACE", "FOR GOOD", "IDEAS"].forEach((line, i) => ctx.fillText(line, 1790, 110 + i * 68));
  return canvas;
}

const TIMELINE: { year: string; caption?: string[] }[] = [
  { year: "1992", caption: ["СОЗДАНА РЕСПУБЛИКАНСКАЯ", "ШКОЛА БИЗНЕСА"] },
  { year: "2001", caption: ["ПОЛУЧЕНИЕ СТАТУСА", "«УНИВЕРСИТЕТ»"] },
  { year: "2009", caption: ["В ЧИСЛЕ ПЕРВЫХ ПРОШЁЛ НАЦИОНАЛЬНУЮ", "АККРЕДИТАЦИЮ МОН РК"] },
  { year: "2014" },
  { year: "2015" },
  { year: "2016" },
  { year: "2017" },
  { year: "2018" },
  { year: "2019", caption: ["УСПЕШНО ПРОЙДЕНА ИНСТИТУЦИОНАЛЬНАЯ", "АККРЕДИТАЦИЯ FIBAA"] },
  { year: "2020", caption: ["УСПЕШНО ПРОШЛИ ПРОГРАММНУЮ", "АККРЕДИТАЦИЮ KAZSEE"] },
  { year: "2021", caption: ["АККРЕДИТОВАН НЕЗАВИСИМЫМ АГЕНТСТВОМ", "ОБЕСПЕЧЕНИЯ КАЧЕСТВА В ОБРАЗОВАНИИ IQAA"] },
];

function drawTimeline(): HTMLCanvasElement {
  const w = 4096;
  const h = 388;
  const { canvas, ctx } = makeCanvas(w, h);
  ctx.fillStyle = "#f4f4f2";
  ctx.fillRect(0, 0, w, h);

  const bandTop = 150;
  const bandH = 90;
  ctx.fillStyle = INK;
  ctx.beginPath();
  ctx.moveTo(0, bandTop);
  ctx.lineTo(230, bandTop);
  ctx.lineTo(160, bandTop + bandH);
  ctx.lineTo(0, bandTop + bandH);
  ctx.fill();
  ctx.fillStyle = "#ffffff";
  ctx.font = `34px ${HEADLINE}`;
  ctx.textBaseline = "middle";
  ctx.textAlign = "left";
  ctx.fillText("ПУТЬ UIB", 24, bandTop + bandH / 2 + 2);

  ctx.fillStyle = GREEN;
  ctx.beginPath();
  ctx.moveTo(250, bandTop);
  ctx.lineTo(w - 190, bandTop);
  ctx.lineTo(w - 260, bandTop + bandH);
  ctx.lineTo(180, bandTop + bandH);
  ctx.fill();
  ctx.fillStyle = INK;
  ctx.beginPath();
  ctx.moveTo(w - 170, bandTop);
  ctx.lineTo(w, bandTop);
  ctx.lineTo(w, bandTop + bandH);
  ctx.lineTo(w - 240, bandTop + bandH);
  ctx.fill();

  const x0 = 420;
  const step = (w - 760) / (TIMELINE.length - 1);
  ctx.textAlign = "center";
  TIMELINE.forEach((item, i) => {
    const x = x0 + i * step;
    const up = i % 2 === 1;
    ctx.fillStyle = INK;
    ctx.font = `62px ${HEADLINE}`;
    ctx.textBaseline = "middle";
    ctx.fillText(item.year, x, bandTop + bandH / 2 + 4);
    if (!item.caption) return;
    ctx.strokeStyle = INK;
    ctx.lineWidth = 5;
    ctx.beginPath();
    if (up) {
      ctx.moveTo(x, bandTop - 4);
      ctx.lineTo(x, bandTop - 50);
      ctx.moveTo(x - 36, bandTop - 50);
      ctx.lineTo(x + 36, bandTop - 50);
    } else {
      ctx.moveTo(x, bandTop + bandH + 4);
      ctx.lineTo(x, bandTop + bandH + 50);
      ctx.moveTo(x - 36, bandTop + bandH + 50);
      ctx.lineTo(x + 36, bandTop + bandH + 50);
    }
    ctx.stroke();
    ctx.font = `bold 22px ${BODY}`;
    item.caption.forEach((line, j) => {
      const y = up ? bandTop - 110 + j * 28 : bandTop + bandH + 80 + j * 28;
      ctx.fillText(line, x, y);
    });
  });
  return canvas;
}

function drawAccreditations(): HTMLCanvasElement {
  const w = 1024;
  const h = 1024;
  const { canvas, ctx } = makeCanvas(w, h);
  ctx.fillStyle = "#f4f4f2";
  ctx.fillRect(0, 0, w, h);
  drawSkyline(ctx, w, h, 130);

  ctx.save();
  ctx.translate(120, 800);
  ctx.rotate(-Math.PI / 2);
  ctx.fillStyle = INK;
  ctx.font = `76px ${HEADLINE}`;
  ctx.textAlign = "left";
  ctx.fillText("INTERNATIONAL", 0, 0);
  ctx.fillText("ACCREDITATIONS", 0, 84);
  ctx.restore();

  // Certificates as plain framed sheets.
  for (let row = 0; row < 3; row++) {
    for (let col = 0; col < 3; col++) {
      const x = 330 + col * 220;
      const y = 110 + row * 250;
      ctx.fillStyle = "#c9ccc8";
      ctx.fillRect(x - 6, y - 6, 172, 222);
      ctx.fillStyle = "#ffffff";
      ctx.fillRect(x, y, 160, 210);
      ctx.fillStyle = GREEN;
      ctx.fillRect(x + 20, y + 22, 120, 14);
      ctx.fillStyle = "#b9bcb8";
      for (let i = 0; i < 6; i++) ctx.fillRect(x + 20, y + 60 + i * 20, 120 - (i % 3) * 18, 6);
    }
  }
  return canvas;
}

export function makeMuralTexture(kind: Mural["kind"]) {
  const canvas = kind === "mission" ? drawMission() : kind === "timeline" ? drawTimeline() : drawAccreditations();
  return toTexture(canvas);
}
