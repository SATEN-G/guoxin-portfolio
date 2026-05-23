/**
 * 从本机《郭鑫简历.pdf》提取文本并更新 resume-data.js 中的项目列表（可选运行）
 * 用法：node extract-resume-to-data.mjs
 */
import fs from "fs";
import path from "path";
import { createRequire } from "module";

const require = createRequire(import.meta.url);
const pdfParse = require("pdf-parse");

const PDF_CANDIDATES = [
  "C:\\Users\\Administrator\\Documents\\xwechat_files\\wxid_flfxbsdiqegc22_c58b\\msg\\file\\2026-03",
  "C:\\Users\\Administrator\\Documents\\xwechat_files\\wxid_flfxbsdiqegc22_c58b\\msg\\file\\2026-01",
];

function findResumePdf() {
  for (const dir of PDF_CANDIDATES) {
    if (!fs.existsSync(dir)) continue;
    const files = fs.readdirSync(dir).filter((f) => f.endsWith(".pdf"));
    const match = files.find((f) => f.includes("简历") || f.length < 20);
    const bySize = files.filter((f) => {
      const stat = fs.statSync(path.join(dir, f));
      return stat.size > 200000 && stat.size < 300000;
    });
    const target = match || bySize[0];
    if (target) return path.join(dir, target);
  }
  throw new Error("未找到郭鑫简历.pdf，请检查微信文件目录");
}

async function main() {
  const pdfPath = findResumePdf();
  const buffer = fs.readFileSync(pdfPath);
  const { text } = await pdfParse(buffer);
  const outPath = path.join(process.cwd(), "resume-text-latest.txt");
  fs.writeFileSync(outPath, text, "utf8");
  console.log("已提取简历文本至:", outPath);
  console.log("PDF 路径:", pdfPath);
  console.log("字符数:", text.length);
}

main().catch((e) => {
  console.error(e.message);
  process.exit(1);
});
