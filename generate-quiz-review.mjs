import { createClient } from "@supabase/supabase-js";
import ExcelJS from "exceljs";
import { readFileSync } from "fs";
import { resolve } from "path";

// Load env
const envPath = resolve(".", ".env.local");
const envContent = readFileSync(envPath, "utf-8");
const env = {};
for (const line of envContent.split("\n")) {
  const [key, ...rest] = line.split("=");
  if (key && rest.length) env[key.trim()] = rest.join("=").trim();
}

const supabase = createClient(
  env.NEXT_PUBLIC_SUPABASE_URL,
  env.SUPABASE_SERVICE_ROLE_KEY
);

// Colors
const DARK_BLUE = "1565C0";
const MED_BLUE = "0288D1";
const GREEN_BG = "E8F5E9";
const GREEN_TEXT = "1B5E20";
const YELLOW_BG = "FFFDE7";
const WHITE = "FFFFFF";
const LIGHT_GRAY = "F5F5F5";

function headerFill(color) {
  return { type: "pattern", pattern: "solid", fgColor: { argb: "FF" + color } };
}
function headerFont(size = 11) {
  return { name: "Arial", bold: true, color: { argb: "FF" + WHITE }, size };
}

async function main() {
  console.log("Fetching quiz questions...");

  // Fetch in pages to avoid Supabase 1000-row limit
  let allData = [];
  let from = 0;
  const pageSize = 500;
  while (true) {
    const { data: page, error: pageErr } = await supabase
      .from("quiz_questions")
      .select("question_type, prompt_en, options, subject_id")
      .order("id")
      .range(from, from + pageSize - 1);
    if (pageErr) { console.error(pageErr); process.exit(1); }
    allData = allData.concat(page);
    if (page.length < pageSize) break;
    from += pageSize;
  }
  const data = allData;
  const error = null;

  if (error) { console.error(error); process.exit(1); }

  const { data: subjects } = await supabase
    .from("subjects")
    .select("id, title_en, module")
    .eq("is_published", true)
    .order("module")
    .order("sort_order");

  const subjectMap = {};
  for (const s of subjects) subjectMap[s.id] = s;

  // Group by subject
  const grouped = {};
  for (const q of data) {
    const s = subjectMap[q.subject_id];
    if (!s) continue;
    const key = s.title_en;
    if (!grouped[key]) grouped[key] = { subject: s, questions: [] };
    grouped[key].questions.push(q);
  }

  const wb = new ExcelJS.Workbook();
  wb.creator = "English Stars";

  // ─── OVERVIEW SHEET ───
  const ov = wb.addWorksheet("Overview");
  ov.mergeCells("A1:H1");
  ov.getCell("A1").value = "English Stars Quiz Question Bank";
  ov.getCell("A1").font = { name: "Arial", bold: true, size: 18, color: { argb: "FF" + DARK_BLUE } };
  ov.getCell("A1").alignment = { horizontal: "center" };
  ov.getRow(1).height = 36;

  ov.mergeCells("A2:H2");
  ov.getCell("A2").value = "For review by Matt — mark issues in Notes column on each subject sheet";
  ov.getCell("A2").font = { name: "Arial", italic: true, size: 12, color: { argb: "FF666666" } };
  ov.getCell("A2").alignment = { horizontal: "center" };

  // Headers
  const ovHeaders = ["Subject", "Module", "Total", "Fill Blank", "Word to Letter", "Word to Picture"];
  const ovHeaderRow = ov.getRow(4);
  ovHeaders.forEach((h, i) => {
    const cell = ovHeaderRow.getCell(i + 1);
    cell.value = h;
    cell.fill = headerFill(DARK_BLUE);
    cell.font = headerFont();
    cell.alignment = { horizontal: "center", vertical: "middle" };
    cell.border = { bottom: { style: "thin" } };
  });
  ovHeaderRow.height = 28;

  ov.getColumn(1).width = 28;
  ov.getColumn(2).width = 10;
  for (let c = 3; c <= 6; c++) ov.getColumn(c).width = 16;

  let ovRow = 5;
  const sortedSubjects = subjects.filter(s => grouped[s.title_en]);
  for (const s of sortedSubjects) {
    const g = grouped[s.title_en];
    const qs = g.questions;
    const fb = qs.filter(q => q.question_type === "fill_blank").length;
    const wl = qs.filter(q => q.question_type === "word_to_letter").length;
    const wp = qs.filter(q => q.question_type === "word_to_picture").length;

    const row = ov.getRow(ovRow);
    row.getCell(1).value = s.title_en;
    row.getCell(1).font = { name: "Arial", bold: true, size: 11 };
    row.getCell(2).value = s.module;
    row.getCell(3).value = qs.length;
    row.getCell(4).value = fb;
    row.getCell(5).value = wl;
    row.getCell(6).value = wp;

    for (let c = 1; c <= 6; c++) {
      row.getCell(c).alignment = { horizontal: "center", vertical: "middle" };
      if (ovRow % 2 === 0) {
        row.getCell(c).fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF" + LIGHT_GRAY } };
      }
    }
    row.getCell(1).alignment = { horizontal: "left", vertical: "middle" };
    row.height = 24;
    ovRow++;
  }

  // Total row
  const totalRow = ov.getRow(ovRow);
  totalRow.getCell(1).value = "TOTAL";
  totalRow.getCell(1).font = { name: "Arial", bold: true, size: 12 };
  totalRow.getCell(3).value = data.length;
  totalRow.getCell(3).font = { name: "Arial", bold: true, size: 12 };
  for (let c = 1; c <= 6; c++) {
    totalRow.getCell(c).fill = headerFill(DARK_BLUE);
    totalRow.getCell(c).font = headerFont(12);
    totalRow.getCell(c).alignment = { horizontal: "center" };
  }
  totalRow.getCell(1).alignment = { horizontal: "left" };

  // ─── PER-SUBJECT SHEETS ───
  for (const s of sortedSubjects) {
    const g = grouped[s.title_en];
    const sheetName = s.title_en.replace(/[*?:\\/\[\]]/g, "-").substring(0, 31);
    const ws = wb.addWorksheet(sheetName);

    // Title
    ws.mergeCells("A1:I1");
    ws.getCell("A1").value = `${s.title_en} — Module ${s.module}`;
    ws.getCell("A1").font = { name: "Arial", bold: true, size: 16, color: { argb: "FF" + DARK_BLUE } };
    ws.getRow(1).height = 32;

    ws.mergeCells("A2:I2");
    ws.getCell("A2").value = `${g.questions.length} questions — Review and add notes in column I`;
    ws.getCell("A2").font = { name: "Arial", italic: true, size: 11, color: { argb: "FF999999" } };

    // Column widths
    ws.getColumn(1).width = 5;   // #
    ws.getColumn(2).width = 16;  // Type
    ws.getColumn(3).width = 50;  // Question
    ws.getColumn(4).width = 18;  // Option A
    ws.getColumn(5).width = 18;  // Option B
    ws.getColumn(6).width = 18;  // Option C
    ws.getColumn(7).width = 18;  // Option D
    ws.getColumn(8).width = 18;  // Correct
    ws.getColumn(9).width = 24;  // Notes

    // Headers row 4
    const headers = ["#", "Type", "Question", "Option A", "Option B", "Option C", "Option D", "Correct Answer", "Notes"];
    const hRow = ws.getRow(4);
    headers.forEach((h, i) => {
      const cell = hRow.getCell(i + 1);
      cell.value = h;
      cell.fill = headerFill(DARK_BLUE);
      cell.font = headerFont();
      cell.alignment = { horizontal: "center", vertical: "middle", wrapText: true };
    });
    hRow.height = 28;

    // Freeze panes at row 5
    ws.views = [{ state: "frozen", ySplit: 4 }];

    // Group by type
    const typeLabels = {
      fill_blank: "Fill in the Blank",
      word_to_letter: "Word to Letter",
      word_to_picture: "Word to Picture",
    };
    const typeOrder = ["fill_blank", "word_to_letter", "word_to_picture"];

    let rowNum = 5;
    let qNum = 1;

    for (const type of typeOrder) {
      const typeQs = g.questions.filter(q => q.question_type === type);
      if (typeQs.length === 0) continue;

      // Section header
      const secRow = ws.getRow(rowNum);
      ws.mergeCells(`A${rowNum}:I${rowNum}`);
      secRow.getCell(1).value = `${typeLabels[type]} (${typeQs.length} questions)`;
      secRow.getCell(1).fill = headerFill(MED_BLUE);
      secRow.getCell(1).font = headerFont(11);
      secRow.getCell(1).alignment = { horizontal: "left", vertical: "middle" };
      secRow.height = 26;
      rowNum++;

      for (const q of typeQs) {
        const row = ws.getRow(rowNum);
        const opts = q.options || [];

        // Find correct answer
        let correctText = "";
        for (const opt of opts) {
          if (opt.is_correct === true || opt.correct === true || opt.isCorrect === true) {
            correctText = opt.text;
            break;
          }
        }

        row.getCell(1).value = qNum;
        row.getCell(1).alignment = { horizontal: "center", vertical: "middle" };

        row.getCell(2).value = typeLabels[type];
        row.getCell(2).alignment = { horizontal: "center", vertical: "middle" };
        row.getCell(2).font = { name: "Arial", size: 10 };

        row.getCell(3).value = q.prompt_en;
        row.getCell(3).alignment = { wrapText: true, vertical: "middle" };
        row.getCell(3).font = { name: "Arial", size: 11 };

        for (let oi = 0; oi < 4; oi++) {
          const cell = row.getCell(4 + oi);
          cell.value = opts[oi]?.text || "";
          cell.alignment = { horizontal: "center", vertical: "middle", wrapText: true };
          cell.font = { name: "Arial", size: 10 };
        }

        // Correct answer column
        const correctCell = row.getCell(8);
        correctCell.value = correctText;
        correctCell.font = { name: "Arial", bold: true, size: 11, color: { argb: "FF" + GREEN_TEXT } };
        correctCell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF" + GREEN_BG } };
        correctCell.alignment = { horizontal: "center", vertical: "middle" };

        // Notes column
        const notesCell = row.getCell(9);
        notesCell.value = "";
        notesCell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF" + YELLOW_BG } };

        // Alternate row shading
        if (qNum % 2 === 0) {
          for (let c = 1; c <= 7; c++) {
            if (!row.getCell(c).fill || row.getCell(c).fill.type !== "pattern") {
              row.getCell(c).fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF" + LIGHT_GRAY } };
            }
          }
        }

        row.height = 30;
        qNum++;
        rowNum++;
      }

      // Blank separator row
      rowNum++;
    }
  }

  const outPath = resolve(".", "English_Stars_Quiz_Review.xlsx");
  await wb.xlsx.writeFile(outPath);
  console.log(`\n✅ Excel file saved to: ${outPath}`);
  console.log(`Total questions: ${data.length}`);
  console.log(`Total subjects: ${sortedSubjects.length}`);
}

main().catch(console.error);
