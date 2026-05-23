/**
 * 将 images/projects 中文目录重命名为 ASCII，并更新 resume-data.js 路径
 */
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, "..");
const projectsDir = path.join(root, "images", "projects");
const resumePath = path.join(root, "resume-data.js");

const SLUGS = ["p01-kunshan", "p02-cangqiong", "p03-xingzhu", "p04-congpu", "p05-expo"];

function countPng(dir) {
  let n = 0;
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, entry.name);
    if (entry.isDirectory()) n += countPng(p);
    else if (/\.png$/i.test(entry.name)) n += 1;
  }
  return n;
}

function pickBestDirs() {
  const groups = {};
  for (const name of fs.readdirSync(projectsDir)) {
    const full = path.join(projectsDir, name);
    if (!fs.statSync(full).isDirectory()) continue;
    const m = name.match(/^(\d{2})-/);
    if (!m) continue;
    const key = m[1];
    const count = countPng(full);
    if (!groups[key] || count > groups[key].count) {
      groups[key] = { name, count };
    }
  }
  return Object.keys(groups)
    .sort()
    .map((k) => groups[k].name);
}

function removeOtherChineseDirs(keepNames) {
  const keep = new Set(keepNames);
  for (const name of fs.readdirSync(projectsDir)) {
    const full = path.join(projectsDir, name);
    if (!fs.statSync(full).isDirectory()) continue;
    if (!/^\d{2}-/.test(name)) continue;
    if (!keep.has(name)) {
      fs.rmSync(full, { recursive: true, force: true });
      console.log("removed duplicate:", name);
    }
  }
}

function renameToAscii() {
  removeOtherChineseDirs(pickBestDirs());
  const dirs = pickBestDirs();
  const mapping = {};

  dirs.forEach((oldName, i) => {
    const slug = SLUGS[i] || `p${String(i + 1).padStart(2, "0")}`;
    const from = path.join(projectsDir, oldName);
    const to = path.join(projectsDir, slug);
    if (!fs.existsSync(from)) return;
    if (fs.existsSync(to)) fs.rmSync(to, { recursive: true, force: true });
    fs.renameSync(from, to);
    mapping[oldName] = slug;
    console.log(`${oldName} -> ${slug} (${countPng(to)} png)`);
  });

  return mapping;
}

function patchResumeData(mapping) {
  let content = fs.readFileSync(resumePath, "utf8");
  for (const [oldName, slug] of Object.entries(mapping)) {
    content = content.split(`images/projects/${oldName}/`).join(`images/projects/${slug}/`);
  }
  // 兜底：按项目序号替换仍残留的中文目录前缀
  content = content.replace(/images\/projects\/\d{2}-[^/]+\//g, (match) => {
    const idx = parseInt(match.match(/\d{2}/)[0], 10) - 1;
    return `images/projects/${SLUGS[idx] || `p${String(idx + 1).padStart(2, "0")}`}/`;
  });
  fs.writeFileSync(resumePath, content, "utf8");
}

const mapping = renameToAscii();
patchResumeData(mapping);
console.log("done");
