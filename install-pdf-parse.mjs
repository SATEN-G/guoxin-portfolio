import fs from "fs";
import zlib from "zlib";
import path from "path";

const tgzPath = path.join(process.cwd(), "pdf-parse.tgz");
const outDir = path.join(process.cwd(), "node_modules", "pdf-parse");

const gz = fs.readFileSync(tgzPath);
const tar = zlib.gunzipSync(gz);

function parseTar(buffer) {
  let offset = 0;
  while (offset + 512 <= buffer.length) {
    const header = buffer.subarray(offset, offset + 512);
    if (header.every((b) => b === 0)) break;

    const name = header.subarray(0, 100).toString("utf8").replace(/\0/g, "");
    const sizeOct = header.subarray(124, 136).toString("utf8").replace(/\0/g, "").trim();
    const size = parseInt(sizeOct, 8) || 0;
    offset += 512;

    const content = buffer.subarray(offset, offset + size);
    offset += Math.ceil(size / 512) * 512;

    if (!name.startsWith("package/")) continue;
    const rel = name.replace(/^package\//, "");
    if (!rel || rel.endsWith("/")) continue;

    const target = path.join(outDir, rel);
    fs.mkdirSync(path.dirname(target), { recursive: true });
    fs.writeFileSync(target, content);
  }
}

fs.rmSync(outDir, { recursive: true, force: true });
parseTar(tar);
console.log("installed pdf-parse to", outDir);
