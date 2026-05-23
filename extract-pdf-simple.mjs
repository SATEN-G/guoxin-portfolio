import fs from "fs";

const pdfPath = process.argv[2];
if (!pdfPath) {
  console.error("Usage: node extract-pdf-simple.mjs <pdf>");
  process.exit(1);
}

const buf = fs.readFileSync(pdfPath);
const latin = buf.toString("latin1");

// Extract text in parentheses (common PDF literal strings)
const parenTexts = [...latin.matchAll(/\(([^\\)]{2,500})\)/g)].map((m) =>
  m[1]
    .replace(/\\n/g, "\n")
    .replace(/\\r/g, "")
    .replace(/\\\(/g, "(")
    .replace(/\\\)/g, ")")
    .replace(/\\\\/g, "\\")
);

// Extract hex strings <XXXX>
const hexTexts = [...latin.matchAll(/<([0-9A-Fa-f\s]{8,})>/g)].map((m) => {
  const hex = m[1].replace(/\s/g, "");
  let out = "";
  for (let i = 0; i < hex.length; i += 4) {
    const chunk = hex.slice(i, i + 4);
    if (chunk.length === 4) {
      const code = parseInt(chunk.slice(0, 2), 16);
      const code2 = parseInt(chunk.slice(2, 4), 16);
      if (code >= 0x20 && code < 0x7f) out += String.fromCharCode(code);
      if (code2 >= 0x20 && code2 < 0x7f) out += String.fromCharCode(code2);
    } else if (chunk.length === 2) {
      const code = parseInt(chunk, 16);
      if (code >= 0x20) out += String.fromCharCode(code);
    }
  }
  return out;
});

// UTF-16BE hex pairs (common for Chinese PDFs)
const utf16Texts = [...latin.matchAll(/<([0-9A-Fa-f\s]{16,})>/g)].map((m) => {
  const hex = m[1].replace(/\s/g, "");
  if (hex.length % 4 !== 0) return "";
  let out = "";
  for (let i = 0; i < hex.length; i += 4) {
    const code = parseInt(hex.slice(i, i + 4), 16);
    if (code >= 0x20 && code !== 0xfffe && code !== 0xfeff) {
      try {
        out += String.fromCharCode(code);
      } catch {
        /* skip */
      }
    }
  }
  return out;
});

const all = [...parenTexts, ...hexTexts, ...utf16Texts]
  .map((t) => t.trim())
  .filter((t) => t.length >= 2 && /[\u4e00-\u9fffA-Za-z0-9]/.test(t));

const seen = new Set();
for (const t of all) {
  if (!seen.has(t)) {
    seen.add(t);
    console.log(t);
  }
}
