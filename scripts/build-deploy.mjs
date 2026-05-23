/**
 * 打包公网部署用静态文件到 dist/（不含 node_modules 与开发脚本）
 */
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, "..");
const out = path.join(root, "dist");

const INCLUDE = [
  "index.html",
  "image-admin.html",
  "styles.css",
  "script.js",
  "resume-data.js",
  "icons.js",
  "css",
  "js",
  "images",
];

const SKIP_DIR = new Set(["node_modules", "dist", ".git", "scripts"]);

function copyRecursive(src, dest) {
  const stat = fs.statSync(src);
  if (stat.isDirectory()) {
    fs.mkdirSync(dest, { recursive: true });
    for (const name of fs.readdirSync(src)) {
      if (SKIP_DIR.has(name)) continue;
      copyRecursive(path.join(src, name), path.join(dest, name));
    }
    return;
  }
  fs.mkdirSync(path.dirname(dest), { recursive: true });
  fs.copyFileSync(src, dest);
}

function rmrf(dir) {
  if (!fs.existsSync(dir)) return;
  for (const name of fs.readdirSync(dir)) {
    const p = path.join(dir, name);
    if (fs.statSync(p).isDirectory()) rmrf(p);
    else fs.unlinkSync(p);
  }
  fs.rmdirSync(dir);
}

rmrf(out);
fs.mkdirSync(out, { recursive: true });

for (const item of INCLUDE) {
  const src = path.join(root, item);
  if (!fs.existsSync(src)) continue;
  const dest = path.join(out, item);
  copyRecursive(src, dest);
}

/* GitHub Pages 不处理 Jekyll，避免部分静态资源被忽略 */
fs.writeFileSync(path.join(out, ".nojekyll"), "", "utf8");

console.log("Deploy bundle ready:", out);
console.log("Files:", fs.readdirSync(out).join(", "));
