// Draws the Analytics PDF directly with jsPDF (charts + insights).
import jsPDF from "jspdf";
import type { ContentAnalytics, ContentTotals } from "@/hooks/useAnalytics";

export interface AnalyticsReportInput {
  platformLabel: string;          // e.g. "All Platforms", "Instagram"
  platformKey: string | null;     // null = all platforms
  days: number;
  selected: string[];             // "reach" | "engagement" | "clicks" | "growth"
  metrics: { label: string; displayValue: string }[]; // selected metric cards
  content: ContentAnalytics | null;
  totals: ContentTotals | null;   // totals for chosen platform / all
  growth: number;                 // 7-day audience growth %
  insightTitle: string;
  insightText: string;
  fileName: string;
}

/* ---------- Layout (A4, mm) ---------- */
const PAGE_W = 210;
const PAGE_H = 297;
const MARGIN = 14;
const CONTENT_W = PAGE_W - MARGIN * 2;

// Colours (RGB)
const INDIGO: [number, number, number] = [79, 70, 229];
const PURPLE: [number, number, number] = [147, 51, 234];
const PINK: [number, number, number] = [236, 72, 153];
const AMBER: [number, number, number] = [245, 158, 11];

type Ctx = { pdf: jsPDF; y: number };

/* ---------- Helpers ---------- */
const n = (v: number) => Math.round(v).toLocaleString("en-IN");
const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);
const cut = (t: string, max: number) => (t.length > max ? t.slice(0, max - 3) + "..." : t);
const platName = (p: string) => (p === "twitter" ? "X (Twitter)" : cap(p));

// Start a new page if the next block would not fit (keeps blocks unsplit)
function ensure(ctx: Ctx, h: number) {
  if (ctx.y + h > PAGE_H - 16) {
    ctx.pdf.addPage();
    ctx.y = 20;
  }
}

// Round a max value up to a "nice" number for chart axes
function niceMax(v: number) {
  if (v <= 0) return 1;
  const p = Math.pow(10, Math.floor(Math.log10(v)));
  const m = v / p;
  const nice = m <= 1 ? 1 : m <= 2 ? 2 : m <= 5 ? 5 : 10;
  return nice * p;
}

function heading(ctx: Ctx, title: string, sub?: string) {
  ensure(ctx, 16);
  const { pdf } = ctx;
  pdf.setFont("helvetica", "bold");
  pdf.setFontSize(13);
  pdf.setTextColor(17, 24, 39);
  pdf.text(title, MARGIN, ctx.y);
  ctx.y += 5.5;
  if (sub) {
    pdf.setFont("helvetica", "normal");
    pdf.setFontSize(9);
    pdf.setTextColor(107, 114, 128);
    pdf.text(sub, MARGIN, ctx.y);
    ctx.y += 5;
  }
  ctx.y += 2;
}

function banner(ctx: Ctx, i: AnalyticsReportInput) {
  const { pdf } = ctx;
  pdf.setFillColor(...INDIGO);
  pdf.rect(0, 0, PAGE_W, 42, "F");
  pdf.setTextColor(199, 210, 254);
  pdf.setFont("helvetica", "bold");
  pdf.setFontSize(9);
  pdf.text("SOCIALPILOT", MARGIN, 14);
  pdf.setTextColor(255, 255, 255);
  pdf.setFontSize(22);
  pdf.text("Analytics Report", MARGIN, 25);
  pdf.setFont("helvetica", "normal");
  pdf.setFontSize(10);
  pdf.text(
    `Platform: ${i.platformLabel}   |   Period: Last ${i.days} day${i.days !== 1 ? "s" : ""}`,
    MARGIN,
    33
  );
  pdf.setFontSize(8);
  pdf.setTextColor(199, 210, 254);
  pdf.text(`Generated ${new Date().toLocaleString()}`, MARGIN, 38.5);
  ctx.y = 52;
}

// Light box with a title and wrapped paragraph
function insightBox(ctx: Ctx, title: string, text: string) {
  const { pdf } = ctx;
  pdf.setFont("helvetica", "normal");
  pdf.setFontSize(9.5);
  const lines: string[] = pdf.splitTextToSize(text, CONTENT_W - 12);
  const h = 16 + lines.length * 4.6;
  ensure(ctx, h + 4);
  pdf.setFillColor(238, 242, 255);
  pdf.setDrawColor(199, 210, 254);
  pdf.roundedRect(MARGIN, ctx.y, CONTENT_W, h, 3, 3, "FD");
  pdf.setFont("helvetica", "bold");
  pdf.setFontSize(8);
  pdf.setTextColor(...INDIGO);
  pdf.text("EXECUTIVE INSIGHT", MARGIN + 6, ctx.y + 7);
  pdf.setFontSize(11);
  pdf.setTextColor(30, 27, 75);
  pdf.text(title, MARGIN + 6, ctx.y + 13);
  pdf.setFont("helvetica", "normal");
  pdf.setFontSize(9.5);
  pdf.setTextColor(55, 48, 163);
  pdf.text(lines, MARGIN + 6, ctx.y + 19);
  ctx.y += h + 8;
}

// Row of KPI cards (up to 4 per row)
function kpiCards(ctx: Ctx, items: { label: string; displayValue: string }[]) {
  if (items.length === 0) return;
  const { pdf } = ctx;
  const cols = Math.min(items.length, 4);
  const gap = 4;
  const w = (CONTENT_W - gap * (cols - 1)) / cols;
  const h = 22;
  const colors = [INDIGO, PINK, PURPLE, AMBER];

  ensure(ctx, h + 6);
  items.forEach((m, idx) => {
    const x = MARGIN + (idx % cols) * (w + gap);
    const y = ctx.y + Math.floor(idx / cols) * (h + gap);
    pdf.setFillColor(255, 255, 255);
    pdf.setDrawColor(229, 231, 235);
    pdf.roundedRect(x, y, w, h, 2.5, 2.5, "FD");
    pdf.setFillColor(...colors[idx % colors.length]);
    pdf.rect(x, y + 3, 1.2, h - 6, "F");
    pdf.setFont("helvetica", "normal");
    pdf.setFontSize(8);
    pdf.setTextColor(107, 114, 128);
    pdf.text(m.label, x + 5, y + 8);
    pdf.setFont("helvetica", "bold");
    pdf.setFontSize(16);
    pdf.setTextColor(17, 24, 39);
    pdf.text(m.displayValue, x + 5, y + 17);
  });
  const rows = Math.ceil(items.length / cols);
  ctx.y += rows * (h + gap) + 4;
}

// Line + filled area chart (daily values)
function lineChart(
  ctx: Ctx,
  points: { label: string; value: number }[],
  color: [number, number, number]
) {
  const { pdf } = ctx;
  const boxH = 62;
  ensure(ctx, boxH + 4);

  const x0 = MARGIN + 14; // plot left (room for y labels)
  const w = CONTENT_W - 18;
  const top = ctx.y + 4;
  const h = 44;
  const base = top + h;
  const max = niceMax(Math.max(...points.map((p) => p.value), 1));

  // Grid lines + y labels
  pdf.setFont("helvetica", "normal");
  pdf.setFontSize(7);
  pdf.setDrawColor(229, 231, 235);
  pdf.setLineWidth(0.2);
  for (let g = 0; g <= 4; g++) {
    const gy = base - (h * g) / 4;
    pdf.line(x0, gy, x0 + w, gy);
    pdf.setTextColor(156, 163, 175);
    pdf.text(n((max * g) / 4), x0 - 2, gy + 1, { align: "right" });
  }

  const count = points.length;
  const px = (idx: number) => (count === 1 ? x0 + w / 2 : x0 + (idx * w) / (count - 1));
  const py = (v: number) => base - (v / max) * h;

  // Filled area under the line (relative path from the baseline)
  if (count > 1) {
    const segs: [number, number][] = [[0, py(points[0].value) - base]];
    for (let k = 1; k < count; k++) {
      segs.push([px(k) - px(k - 1), py(points[k].value) - py(points[k - 1].value)]);
    }
    segs.push([0, base - py(points[count - 1].value)]);
    pdf.setFillColor(224, 231, 255);
    pdf.lines(segs, px(0), base, [1, 1], "F", true);
  }

  // The line itself
  pdf.setDrawColor(...color);
  pdf.setLineWidth(0.7);
  for (let k = 1; k < count; k++) {
    pdf.line(px(k - 1), py(points[k - 1].value), px(k), py(points[k].value));
  }
  // Dots for short periods
  if (count <= 31) {
    pdf.setFillColor(...color);
    points.forEach((p, k) => pdf.circle(px(k), py(p.value), 0.8, "F"));
  }
  pdf.setLineWidth(0.2);

  // X labels (up to 6, evenly spaced)
  const labels = Math.min(6, count);
  pdf.setTextColor(107, 114, 128);
  for (let k = 0; k < labels; k++) {
    const idx = labels === 1 ? 0 : Math.round((k * (count - 1)) / (labels - 1));
    pdf.text(points[idx].label, px(idx), base + 5, { align: "center" });
  }
  ctx.y += boxH + 4;
}

// Horizontal bar list
function hBars(
  ctx: Ctx,
  items: { label: string; value: number; text: string; color: [number, number, number] }[]
) {
  const { pdf } = ctx;
  const max = Math.max(...items.map((i) => i.value), 1);
  const barX = MARGIN + 40;
  const barW = CONTENT_W - 40 - 38;

  items.forEach((it) => {
    ensure(ctx, 10);
    pdf.setFont("helvetica", "normal");
    pdf.setFontSize(9);
    pdf.setTextColor(55, 65, 81);
    pdf.text(cut(it.label, 20), MARGIN, ctx.y + 3.5);
    pdf.setFillColor(243, 244, 246);
    pdf.roundedRect(barX, ctx.y, barW, 5, 2.5, 2.5, "F");
    const fill = Math.max((it.value / max) * barW, it.value > 0 ? 3 : 0);
    if (fill > 0) {
      pdf.setFillColor(...it.color);
      pdf.roundedRect(barX, ctx.y, fill, 5, 2.5, 2.5, "F");
    }
    pdf.setFont("helvetica", "bold");
    pdf.setTextColor(17, 24, 39);
    pdf.text(it.text, MARGIN + CONTENT_W, ctx.y + 3.8, { align: "right" });
    ctx.y += 9;
  });
  ctx.y += 3;
}

// Table: first column left-aligned, others right-aligned
function table(ctx: Ctx, headers: string[], rows: string[][], widths: number[]) {
  const { pdf } = ctx;
  const drawHeader = () => {
    pdf.setFillColor(243, 244, 246);
    pdf.rect(MARGIN, ctx.y - 5, CONTENT_W, 8, "F");
    pdf.setFont("helvetica", "bold");
    pdf.setFontSize(9);
    pdf.setTextColor(55, 65, 81);
    let x = MARGIN;
    headers.forEach((h, k) => {
      if (k === 0) pdf.text(h, x + 2, ctx.y);
      else pdf.text(h, x + widths[k] - 2, ctx.y, { align: "right" });
      x += widths[k];
    });
    ctx.y += 8;
  };
  ensure(ctx, 24);
  drawHeader();
  rows.forEach((row) => {
    if (ctx.y > PAGE_H - 22) {
      pdf.addPage();
      ctx.y = 20;
      drawHeader();
    }
    pdf.setFont("helvetica", "normal");
    pdf.setFontSize(9);
    pdf.setTextColor(17, 24, 39);
    let x = MARGIN;
    row.forEach((cell, k) => {
      if (k === 0) pdf.text(cell, x + 2, ctx.y);
      else pdf.text(cell, x + widths[k] - 2, ctx.y, { align: "right" });
      x += widths[k];
    });
    pdf.setDrawColor(229, 231, 235);
    pdf.line(MARGIN, ctx.y + 2.5, MARGIN + CONTENT_W, ctx.y + 2.5);
    ctx.y += 7;
  });
  ctx.y += 5;
}

function bullets(ctx: Ctx, items: string[]) {
  const { pdf } = ctx;
  items.forEach((t) => {
    pdf.setFont("helvetica", "normal");
    pdf.setFontSize(9.5);
    const lines: string[] = pdf.splitTextToSize(t, CONTENT_W - 8);
    ensure(ctx, lines.length * 4.8 + 3);
    pdf.setFillColor(...INDIGO);
    pdf.circle(MARGIN + 1.5, ctx.y - 1, 0.9, "F");
    pdf.setTextColor(55, 65, 81);
    pdf.text(lines, MARGIN + 6, ctx.y);
    ctx.y += lines.length * 4.8 + 2.5;
  });
  ctx.y += 3;
}

function note(ctx: Ctx, text: string) {
  const { pdf } = ctx;
  pdf.setFont("helvetica", "italic");
  pdf.setFontSize(8);
  pdf.setTextColor(156, 163, 175);
  const lines: string[] = pdf.splitTextToSize(text, CONTENT_W);
  ensure(ctx, lines.length * 4 + 2);
  pdf.text(lines, MARGIN, ctx.y);
  ctx.y += lines.length * 4 + 4;
}

function addFooters(pdf: jsPDF) {
  const total = pdf.getNumberOfPages();
  for (let p = 1; p <= total; p++) {
    pdf.setPage(p);
    pdf.setFont("helvetica", "normal");
    pdf.setFontSize(8);
    pdf.setTextColor(156, 163, 175);
    pdf.text("Generated by SocialPilot", MARGIN, PAGE_H - 8);
    pdf.text(`Page ${p} of ${total}`, PAGE_W - MARGIN, PAGE_H - 8, { align: "right" });
  }
}

/* ---------- Written insights computed from the data ---------- */
function buildInsights(i: AnalyticsReportInput): string[] {
  const out: string[] = [];
  const c = i.content;
  const t = i.totals;
  if (!c || !t) return out;

  const eng = t.likes + t.shares + t.comments;
  if (eng > 0) {
    const parts: [string, number][] = [
      ["likes", t.likes],
      ["shares", t.shares],
      ["comments", t.comments],
    ];
    parts.sort((a, b) => b[1] - a[1]);
    out.push(
      `${cap(parts[0][0])} are the largest part of engagement (${Math.round(
        (parts[0][1] / eng) * 100
      )}% of ${n(eng)} interactions).`
    );
  }
  out.push(
    `Engagement rate is ${t.engagement_rate}% and click-through rate is ${t.ctr}% over this period.`
  );

  const trend = c.trend;
  if (trend.length > 0) {
    const avg = trend.reduce((s, d) => s + d.reach, 0) / trend.length;
    const peak = trend.reduce((a, b) => (b.reach > a.reach ? b : a));
    out.push(`Average daily reach is ${n(avg)}. The best day was ${peak.date} with ${n(peak.reach)} reach.`);
  }
  if (trend.length >= 4) {
    const mid = Math.floor(trend.length / 2);
    const avgOf = (arr: typeof trend) => arr.reduce((s, d) => s + d.reach, 0) / arr.length;
    const a = avgOf(trend.slice(0, mid));
    const b = avgOf(trend.slice(mid));
    if (a > 0) {
      const pct = ((b - a) / a) * 100;
      out.push(
        `Daily reach in the second half of the period is ${Math.abs(pct).toFixed(1)}% ${
          pct >= 0 ? "higher" : "lower"
        } than in the first half.`
      );
    }
  }
  if (!i.platformKey && c.by_platform.length > 1) {
    const byReach = [...c.by_platform].sort((a, b) => b.reach - a.reach)[0];
    const byRate = [...c.by_platform].sort((a, b) => b.engagement_rate - a.engagement_rate)[0];
    out.push(`${platName(byReach.platform)} delivers the highest reach (${n(byReach.reach)}).`);
    out.push(`${platName(byRate.platform)} has the best engagement rate (${byRate.engagement_rate}%).`);
  }
  if (i.selected.includes("growth")) {
    out.push(
      `Audience ${i.growth >= 0 ? "grew" : "declined"} by ${Math.abs(i.growth)}% over the last 7 days.`
    );
  }
  return out;
}

/* =====================================================
   MAIN: build and download the PDF
===================================================== */
export function downloadAnalyticsPdf(i: AnalyticsReportInput) {
  if (!i.content || !i.totals) {
    throw new Error("Analytics data is not available.");
  }
  const c = i.content;
  const t = i.totals;

  const pdf = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
  const ctx: Ctx = { pdf, y: 0 };

  banner(ctx, i);
  insightBox(ctx, i.insightTitle, i.insightText);

  // KPI cards (growth is always a 7-day figure)
  heading(ctx, "Performance Snapshot", "Selected metrics for this reporting period.");
  kpiCards(
    ctx,
    i.metrics.map((m) => ({
      label: m.label.includes("Growth") ? `${m.label} (7 days)` : m.label,
      displayValue: m.displayValue,
    }))
  );

  const allNote = i.platformKey
    ? "Note: daily trend and top posts are shown across all platforms."
    : "";

  // Reach trend
  if (i.selected.includes("reach") && c.trend.length > 0) {
    heading(ctx, "Daily Reach Trend", `Reach per day over the last ${i.days} days.`);
    lineChart(
      ctx,
      c.trend.map((d) => ({ label: d.date.slice(5), value: d.reach })),
      INDIGO
    );
    if (allNote) note(ctx, allNote);
  }

  // Engagement breakdown
  if (i.selected.includes("engagement") && t.likes + t.shares + t.comments > 0) {
    const eng = t.likes + t.shares + t.comments;
    heading(ctx, "Engagement Breakdown", "How people interacted with your content.");
    hBars(ctx, [
      { label: "Likes", value: t.likes, text: `${n(t.likes)} (${Math.round((t.likes / eng) * 100)}%)`, color: PINK },
      { label: "Shares", value: t.shares, text: `${n(t.shares)} (${Math.round((t.shares / eng) * 100)}%)`, color: INDIGO },
      { label: "Comments", value: t.comments, text: `${n(t.comments)} (${Math.round((t.comments / eng) * 100)}%)`, color: AMBER },
    ]);
  }

  // Platform comparison (all platforms only)
  if (!i.platformKey && c.by_platform.length > 0 && (i.selected.includes("reach") || i.selected.includes("clicks"))) {
    const sorted = [...c.by_platform].sort((a, b) => b.reach - a.reach);
    heading(ctx, "Platform Comparison", "Reach by platform, with efficiency metrics.");
    hBars(
      ctx,
      sorted.map((p) => ({
        label: platName(p.platform),
        value: p.reach,
        text: n(p.reach),
        color: PURPLE,
      }))
    );
    table(
      ctx,
      ["Platform", "Posts", "Clicks", "Eng. rate", "CTR"],
      sorted.map((p) => [
        platName(p.platform),
        String(p.posts),
        n(p.clicks),
        `${p.engagement_rate}%`,
        `${p.ctr}%`,
      ]),
      [58, 24, 34, 34, 32]
    );
  }

  // Key insights
  const insights = buildInsights(i);
  if (insights.length > 0) {
    heading(ctx, "Key Insights", "What the numbers say.");
    bullets(ctx, insights);
  }

  // Top posts
  if (c.top_posts.length > 0) {
    heading(ctx, "Top Performing Posts", "Ranked by interactions (likes + shares + comments).");
    table(
      ctx,
      ["Post", "Interactions", "Reach", "Eng. rate"],
      c.top_posts.map((p) => [
        cut(p.content.replace(/\s+/g, " "), 52),
        n(p.interactions),
        n(p.reach),
        `${p.engagement_rate}%`,
      ]),
      [92, 32, 30, 28]
    );
    if (allNote && !(i.selected.includes("reach") && c.trend.length > 0)) note(ctx, allNote);
  }

  addFooters(pdf);
  pdf.save(i.fileName);
}