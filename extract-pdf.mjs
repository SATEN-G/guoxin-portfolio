import fs from "fs";
import path from "path";
import { createRequire } from "module";

const require = createRequire(import.meta.url);

async function main() {
  const pdfPath = process.argv[2];
  if (!pdfPath) {
    console.error("Usage: node extract-pdf.mjs <pdf-path>");
    process.exit(1);
  }

  let pdfParse;
  try {
    pdfParse = require("pdf-parse");
  } catch {
    console.error("MISSING_PDF_PARSE");
    process.exit(2);
  }

  const buffer = fs.readFileSync(pdfPath);
  const data = await pdfParse(buffer);
  console.log(data.text);
}

main().catch((err) => {
  console.error(err.message);
  process.exit(1);
});
