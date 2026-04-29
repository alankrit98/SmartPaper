import puppeteer from "puppeteer";
import fs from "fs";
import path from "path";
import { aggregateBlooms, aggregateCOs, BLOOM_LEVELS } from "../utils/analysisUtils.js";
import logger from "../utils/logger.js";

// ── PDF Service ──────────────────────────────────────────────────
const PDF_DIR = path.resolve(process.env.PDF_STORAGE_PATH || "./pdfs");

/**
 * Ensure the PDF output directory exists at startup.
 */
const ensurePDFDir = () => {
  if (!fs.existsSync(PDF_DIR)) {
    fs.mkdirSync(PDF_DIR, { recursive: true });
    logger.info(`Created PDF directory: ${PDF_DIR}`);
  }
};

/**
 * Render a single question row (or multiple rows for subparts) in the table.
 */
const renderQuestionRows = (q) => {
  let html = "";

  if (q.type === "single" && q.subquestions?.length > 0) {
    const sq = q.subquestions[0];
    html += `<tr>
      <td class="col-qno">${q.question_id}</td>
      <td class="col-question">${sq.text}</td>
      <td class="col-marks">${q.marks}</td>
      <td class="col-co">${sq.co ? `CO${sq.co}` : "-"}</td>
    </tr>`;
  } else if (q.type === "subparts" && q.subquestions?.length > 0) {
    // First row — question number with (a) part
    q.subquestions.forEach((sq, idx) => {
      html += `<tr>
        <td class="col-qno">${idx === 0 ? q.question_id : ""}</td>
        <td class="col-question"><span class="sub-label">(${sq.label || String.fromCharCode(97 + idx)})</span> ${sq.text}</td>
        <td class="col-marks">${sq.marks}</td>
        <td class="col-co">${sq.co ? `CO${sq.co}` : "-"}</td>
      </tr>`;
    });
  } else if (q.type === "choice_group") {
    // Use options as primary source; fall back to subquestions
    const items = (q.options?.length > 0) ? q.options : (q.subquestions || []);
    items.forEach((opt, idx) => {
      // OR divider between options
      if (idx > 0) {
        html += `<tr class="or-row">
          <td class="col-qno"></td>
          <td colspan="3" class="or-cell"><strong>OR</strong></td>
        </tr>`;
      }
      html += `<tr>
        <td class="col-qno">${idx === 0 ? q.question_id : ""}</td>
        <td class="col-question"><span class="sub-label">(${opt.label || String.fromCharCode(97 + idx)})</span> ${opt.text}</td>
        <td class="col-marks">${opt.marks || q.marks}</td>
        <td class="col-co">${opt.co ? `CO${opt.co}` : "-"}</td>
      </tr>`;
    });
  }

  return html;
};

/**
 * Build the analysis charts HTML for the PDF.
 * Bloom's → CSS pie chart (conic-gradient), CO → horizontal bar chart.
 * No summary tables — graphs only.
 */
const BLOOM_COLORS = {
  K1: "#14b8a6", K2: "#3b82f6", K3: "#6366f1",
  K4: "#f59e0b", K5: "#f97316", K6: "#ef4444",
  Unknown: "#94a3b8",
};

const BLOOM_LABELS = {
  K1: "Remember", K2: "Understand", K3: "Apply",
  K4: "Analyze", K5: "Evaluate", K6: "Create",
};

const CO_BAR_COLORS = [
  "#6366f1", "#8b5cf6", "#a855f7", "#ec4899",
  "#f472b6", "#fb923c", "#facc15", "#34d399",
];

const buildChartsHTML = (paper) => {
  const bloomsData = aggregateBlooms(paper);
  const coData = aggregateCOs(paper);

  const totalBlooms = Object.values(bloomsData).reduce((s, v) => s + v, 0);
  const totalCOs = Object.values(coData).reduce((s, v) => s + v, 0);

  if (totalBlooms === 0 && totalCOs === 0) return "";

  // ── Bloom's Pie Chart (conic-gradient) ─────────────────────────
  // Build conic-gradient stops
  const activeBloomEntries = Object.entries(bloomsData).filter(([, v]) => v > 0);
  let gradientStops = "";
  let cumPct = 0;
  for (const [key, val] of activeBloomEntries) {
    const pct = totalBlooms ? (val / totalBlooms) * 100 : 0;
    const color = BLOOM_COLORS[key] || BLOOM_COLORS.Unknown;
    gradientStops += `${color} ${cumPct.toFixed(2)}% ${(cumPct + pct).toFixed(2)}%, `;
    cumPct += pct;
  }
  // Remove trailing comma
  gradientStops = gradientStops.replace(/,\s*$/, "");

  // Bloom's legend items
  let bloomLegend = "";
  for (const [key, val] of Object.entries(bloomsData)) {
    const pct = totalBlooms ? Math.round((val / totalBlooms) * 100) : 0;
    const color = BLOOM_COLORS[key] || BLOOM_COLORS.Unknown;
    const label = BLOOM_LABELS[key] || key;
    bloomLegend += `<div class="pie-legend-item">
      <div class="pie-legend-color" style="background:${color};"></div>
      <span>${key} – ${label}: ${val}m (${pct}%)</span>
    </div>`;
  }

  // ── CO Bar Chart ───────────────────────────────────────────────
  const maxCO = Math.max(...Object.values(coData), 1);
  let coBars = "";
  const coKeys = Object.keys(coData);
  coKeys.forEach((key, idx) => {
    const val = coData[key];
    const pct = totalCOs ? Math.round((val / totalCOs) * 100) : 0;
    const widthPct = Math.max((val / maxCO) * 100, val > 0 ? 8 : 0);
    const color = CO_BAR_COLORS[idx % CO_BAR_COLORS.length];
    coBars += `
      <div class="bar-row">
        <div class="bar-label">${key}</div>
        <div class="bar-track">
          <div class="bar-fill" style="width:${widthPct}%;background:${color};">${val > 0 ? val : ""}</div>
        </div>
        <div class="bar-value">${val}m (${pct}%)</div>
      </div>`;
  });

  return `
  <div class="analysis-page">
    <h2>Question Paper Analysis</h2>
    <div class="charts-container">
      <div class="chart-box">
        <h3>Bloom's Taxonomy Distribution</h3>
        <div class="pie-chart-wrapper">
          <div class="pie-chart" style="background: conic-gradient(${gradientStops});"></div>
        </div>
        <div class="pie-legend">${bloomLegend}</div>
      </div>
      <div class="chart-box">
        <h3>Course Outcome Distribution</h3>
        <div class="bar-chart">${coBars}</div>
      </div>
    </div>
  </div>`;
};

/**
 * Build an HTML string from the question paper data — TABULAR FORMAT.
 * Matches standard university exam paper layout with Q.No | Question | Marks | CO columns.
 */
const buildHTML = (paper) => {
  const meta = paper.metadata || {};
  const collegeName = process.env.COLLEGE_NAME || "GL Bajaj Institute of Technology and Management";
  const examName = meta.exam || "Examination";
  const subjectName = meta.subject || "N/A";
  const subjectCode = meta.subject_code || "";
  const duration = meta.duration || "3 Hours";
  const maxMarks = meta.max_marks || 0;

  // Render instructions
  const instructionsList = (paper.instructions || [])
    .map((inst) => `<li>${inst}</li>`)
    .join("");
  const instructionsHTML = instructionsList
    ? `<div class="instructions"><strong>General Instructions:</strong><ol>${instructionsList}</ol></div>`
    : "";

  // Render sections — each as a table, each starting on a new page (except the first)
  let sectionsHTML = "";
  const sections = paper.sections || [];

  for (let i = 0; i < sections.length; i++) {
    const section = sections[i];
    // Add page-break class for sections after the first
    const sectionClass = i > 0 ? "section section-page-break" : "section";

    sectionsHTML += `<div class="${sectionClass}">
      <div class="section-header">
        <strong>SECTION ${section.section_id}</strong>${section.title ? ` — ${section.title}` : ""}
      </div>`;

    // Custom header notes (user-defined section description)
    const headerNotes = section.header_notes || section.description || "";
    if (headerNotes) {
      sectionsHTML += `<div class="section-notes">${headerNotes.replace(/\n/g, "<br/>")}</div>`;
    }

    // Attempt rule & marks scheme
    if (section.marks_scheme || section.attempt_rule) {
      sectionsHTML += `<div class="section-info">`;
      if (section.marks_scheme) sectionsHTML += `<em>${section.marks_scheme}</em>`;
      if (section.marks_scheme && section.attempt_rule) sectionsHTML += ` | `;
      if (section.attempt_rule) sectionsHTML += `<em>${section.attempt_rule}</em>`;
      sectionsHTML += `</div>`;
    }

    // Question table
    sectionsHTML += `<table class="question-table">
      <thead>
        <tr>
          <th class="col-qno">Q.No.</th>
          <th class="col-question">Question</th>
          <th class="col-marks">Marks</th>
          <th class="col-co">CO</th>
        </tr>
      </thead>
      <tbody>`;

    for (const q of section.questions || []) {
      sectionsHTML += renderQuestionRows(q);
    }

    sectionsHTML += `</tbody></table></div>`;
  }

  // Build analysis charts HTML
  const chartsHTML = buildChartsHTML(paper);

  return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body {
      font-family: 'Times New Roman', Times, serif;
      font-size: 13px;
      padding: 32px 40px;
      color: #000;
    }

    /* ── Header ──────────────────────────────── */
    .header {
      text-align: center;
      margin-bottom: 16px;
      border-bottom: 2px solid #000;
      padding-bottom: 10px;
    }
    .header .college-name {
      font-size: 18px;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.04em;
      margin-bottom: 2px;
    }
    .header .exam-title {
      font-size: 15px;
      font-weight: 400;
      margin-bottom: 2px;
    }
    .header .subject-line {
      font-size: 14px;
      font-weight: 600;
      margin-bottom: 2px;
    }

    /* ── Meta Row ─────────────────────────────── */
    .meta-row {
      display: flex;
      justify-content: space-between;
      margin-bottom: 6px;
      font-size: 13px;
      line-height: 1.7;
      border-bottom: 1px solid #999;
      padding-bottom: 8px;
    }
    .meta-row div { min-width: 33%; }
    .meta-row .center { text-align: center; }
    .meta-row .right { text-align: right; }

    /* ── Roll Number ──────────────────────────── */
    .roll-row {
      display: flex;
      justify-content: flex-end;
      margin-bottom: 10px;
      font-size: 12px;
    }
    .roll-box {
      border: 1px solid #000;
      padding: 4px 40px 4px 8px;
      font-weight: 600;
    }

    /* ── Instructions ─────────────────────────── */
    .instructions {
      margin-bottom: 14px;
      padding: 8px 12px;
      border: 1px solid #bbb;
      background: #fafafa;
      font-size: 12px;
    }
    .instructions ol { padding-left: 20px; margin-top: 4px; }
    .instructions li { margin-bottom: 2px; }

    /* ── Section ──────────────────────────────── */
    .section { margin-bottom: 18px; }
    .section-page-break { page-break-before: always; }
    .section-header {
      font-size: 14px;
      text-align: center;
      padding: 5px 0;
      background: #f0f0f0;
      border: 1px solid #999;
      border-bottom: none;
      text-transform: uppercase;
      letter-spacing: 0.03em;
    }
    .section-notes {
      font-size: 12px;
      color: #333;
      padding: 6px 10px;
      border-left: 1px solid #999;
      border-right: 1px solid #999;
      background: #fafafa;
      font-style: italic;
      line-height: 1.5;
    }
    .section-info {
      font-size: 12px;
      color: #444;
      text-align: center;
      padding: 4px 0;
      font-style: italic;
      border-left: 1px solid #999;
      border-right: 1px solid #999;
    }

    /* ── Question Table ───────────────────────── */
    .question-table {
      width: 100%;
      border-collapse: collapse;
      font-size: 13px;
      margin-bottom: 4px;
    }
    .question-table th {
      background: #e8e8e8;
      font-weight: 700;
      padding: 6px 8px;
      border: 1px solid #999;
      text-align: center;
      font-size: 12px;
    }
    .question-table td {
      padding: 6px 8px;
      border: 1px solid #bbb;
      vertical-align: top;
      line-height: 1.5;
    }
    .col-qno { width: 50px; text-align: center; font-weight: 600; }
    .col-question { text-align: left; }
    .col-marks { width: 50px; text-align: center; font-weight: 600; }
    .col-co { width: 50px; text-align: center; font-weight: 600; }
    .sub-label {
      font-weight: 600;
      margin-right: 4px;
    }
    .or-row td { border-top: 1px dashed #999; border-bottom: 1px dashed #999; }
    .or-cell {
      text-align: center;
      font-style: italic;
      padding: 3px 0;
      color: #555;
    }

    /* ── Footer ───────────────────────────────── */
    .footer {
      text-align: center;
      margin-top: 24px;
      font-size: 10px;
      color: #666;
      border-top: 1px solid #ccc;
      padding-top: 6px;
    }

    /* ── Analysis Page ─────────────────────────── */
    .analysis-page {
      page-break-before: always;
      padding-top: 20px;
      font-family: 'Segoe UI', Arial, sans-serif;
    }
    .analysis-page h2 {
      font-size: 18px;
      text-align: center;
      margin-bottom: 24px;
      color: #1e293b;
      font-weight: 700;
    }
    .charts-container {
      display: flex;
      gap: 32px;
      justify-content: center;
      flex-wrap: wrap;
    }
    .chart-box {
      flex: 1;
      min-width: 280px;
      max-width: 380px;
      border: 1px solid #e2e8f0;
      border-radius: 12px;
      padding: 20px;
      background: #fafbfc;
    }
    .chart-box h3 {
      text-align: center;
      font-size: 13px;
      font-weight: 700;
      color: #334155;
      margin-bottom: 16px;
    }

    /* ── Pie Chart (Bloom's) ──────────────────── */
    .pie-chart-wrapper {
      display: flex;
      justify-content: center;
      margin-bottom: 16px;
    }
    .pie-chart {
      width: 200px;
      height: 200px;
      border-radius: 50%;
      position: relative;
    }
    .pie-chart::after {
      content: '';
      position: absolute;
      top: 50%;
      left: 50%;
      transform: translate(-50%, -50%);
      width: 90px;
      height: 90px;
      background: #fafbfc;
      border-radius: 50%;
    }
    .pie-legend {
      display: flex;
      flex-wrap: wrap;
      gap: 6px 14px;
      justify-content: center;
    }
    .pie-legend-item {
      display: flex;
      align-items: center;
      gap: 5px;
      font-size: 10px;
      color: #475569;
    }
    .pie-legend-color {
      width: 10px;
      height: 10px;
      border-radius: 3px;
      flex-shrink: 0;
    }

    /* ── Bar Chart (CO) ──────────────────────── */
    .bar-chart { width: 100%; }
    .bar-row {
      display: flex;
      align-items: center;
      margin-bottom: 8px;
      font-size: 12px;
    }
    .bar-label {
      width: 70px;
      font-weight: 600;
      color: #475569;
      text-align: right;
      padding-right: 10px;
    }
    .bar-track {
      flex: 1;
      height: 22px;
      background: #f1f5f9;
      border-radius: 6px;
      overflow: hidden;
      position: relative;
    }
    .bar-fill {
      height: 100%;
      border-radius: 6px;
      display: flex;
      align-items: center;
      justify-content: flex-end;
      padding-right: 6px;
      font-size: 10px;
      font-weight: 700;
      color: #fff;
      min-width: 28px;
    }
    .bar-value {
      width: 70px;
      text-align: right;
      font-size: 11px;
      color: #64748b;
      padding-left: 8px;
    }
  </style>
</head>
<body>
  <!-- Header -->
  <div class="header">
    <div class="college-name">${collegeName}</div>
    <div class="exam-title">${examName}</div>
    <div class="subject-line">${subjectName}${subjectCode ? ` (${subjectCode})` : ""}</div>
  </div>

  <!-- Roll Number -->
  <div class="roll-row">
    <div class="roll-box">Roll No. ______________</div>
  </div>

  <!-- Meta -->
  <div class="meta-row">
    <div><strong>Subject:</strong> ${subjectName}${subjectCode ? `<br/><strong>Code:</strong> ${subjectCode}` : ""}</div>
    <div class="center"><strong>Time:</strong> ${duration}</div>
    <div class="right"><strong>Max. Marks:</strong> ${maxMarks}</div>
  </div>

  ${instructionsHTML}

  ${sectionsHTML}

  <div class="footer">
    Generated on ${new Date().toLocaleString("en-IN", { timeZone: "Asia/Kolkata" })}
    &bull; SmartPaper — AI Question Paper Generator
  </div>

  ${chartsHTML}

</body>
</html>`;
};

/**
 * Generate a PDF file for the given question paper document.
 */
const generatePDF = async (paper) => {
  ensurePDFDir();

  const safeId = path.basename(paper._id.toString());
  const filePath = path.join(PDF_DIR, `${safeId}.pdf`);

  const html = buildHTML(paper);

  const browser = await puppeteer.launch({
    headless: true,
    args: ["--no-sandbox", "--disable-setuid-sandbox"],
  });

  try {
    const page = await browser.newPage();
    await page.setContent(html, { waitUntil: "networkidle0" });
    await page.pdf({
      path: filePath,
      format: "A4",
      printBackground: true,
      margin: { top: "20mm", bottom: "20mm", left: "15mm", right: "15mm" },
    });
    logger.info(`PDF generated: ${filePath}`);
  } finally {
    await browser.close();
  }

  return filePath;
};

/**
 * Resolve the full file-system path for a paper's PDF.
 */
const getPDFPath = (paperId) => {
  const sanitized = path.basename(paperId);
  const filePath = path.join(PDF_DIR, `${sanitized}.pdf`);

  if (!filePath.startsWith(PDF_DIR)) {
    throw new Error("Invalid file path");
  }
  return filePath;
};

export { generatePDF, getPDFPath, ensurePDFDir };
