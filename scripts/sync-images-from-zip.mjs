/**
 * 将 image-admin 导出的 ZIP 解压到 images/projects/，并写入 resume-data.js 的 images 字段
 *
 * 用法：
 *   node scripts/sync-images-from-zip.mjs guoxin-portfolio-images.zip
 */
import fs from "fs";
import path from "path";
import { execSync } from "child_process";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, "..");

function extractZip(zipPath, destDir) {
  const absZip = path.resolve(zipPath);
  if (!fs.existsSync(absZip)) {
    throw new Error(`找不到 ZIP：${absZip}`);
  }
  fs.mkdirSync(destDir, { recursive: true });
  if (process.platform === "win32") {
    execSync(
      `powershell -NoProfile -Command "Expand-Archive -LiteralPath '${absZip.replace(/'/g, "''")}' -DestinationPath '${destDir.replace(/'/g, "''")}' -Force"`,
      { stdio: "inherit" }
    );
    return;
  }
  execSync(`unzip -o "${absZip}" -d "${destDir}"`, { stdio: "inherit" });
}

function buildImagesMap(manifest) {
  const map = {};
  for (const entry of manifest.projects || []) {
    const i = entry.projectIndex;
    if (!map[i]) map[i] = { user: [], admin: [], mobile: [] };
    if (!map[i][entry.category]) map[i][entry.category] = [];
    map[i][entry.category].push(entry.path.replace(/\\/g, "/"));
  }
  return map;
}

function formatImagesBlock(images, indent) {
  const lines = [`${indent}images: {`];
  for (const cat of ["user", "admin", "mobile"]) {
    const arr = images[cat] || [];
    if (!arr.length) continue;
    lines.push(`${indent}  ${cat}: [`);
    for (const p of arr) {
      lines.push(`${indent}    "${p.replace(/\\/g, "/")}",`);
    }
    lines.push(`${indent}  ],`);
  }
  lines.push(`${indent}},`);
  return lines.join("\n");
}

function patchResumeData(content, imagesByIndex) {
  let cleaned = content.replace(/\n\s+images: \{[\s\S]*?\n\s+\},\n(?=\s+detailContent:)/g, "\n");

  let projectIndex = 0;
  return cleaned.replace(
    /^(\s+desc: "[^"]*",)\n(\s+detailContent:)/gm,
    (match, descLine, detailLine) => {
      const imgs = imagesByIndex[projectIndex];
      projectIndex += 1;
      if (!imgs) return match;
      const hasAny = ["user", "admin", "mobile"].some((c) => imgs[c]?.length);
      if (!hasAny) return match;
      const indent = detailLine.match(/^(\s+)/)[1];
      return `${descLine}\n${formatImagesBlock(imgs, indent)}\n${detailLine}`;
    }
  );
}

function main() {
  const zipArg = process.argv[2];
  if (!zipArg) {
    console.error("用法: node scripts/sync-images-from-zip.mjs <guoxin-portfolio-images.zip>");
    process.exit(1);
  }

  const zipPath = path.isAbsolute(zipArg) ? zipArg : path.join(process.cwd(), zipArg);
  const staging = path.join(root, ".sync-images-tmp");

  if (fs.existsSync(staging)) {
    fs.rmSync(staging, { recursive: true, force: true });
  }
  extractZip(zipPath, staging);

  const manifestPath = path.join(staging, "image-manifest.json");
  if (!fs.existsSync(manifestPath)) {
    throw new Error("ZIP 内缺少 image-manifest.json，请用 image-admin 的「导出 ZIP 包」");
  }

  const manifest = JSON.parse(fs.readFileSync(manifestPath, "utf8"));
  const imagesByIndex = buildImagesMap(manifest);
  const imageCount = (manifest.projects || []).length;

  const srcImages = path.join(staging, "images", "projects");
  const destImages = path.join(root, "images", "projects");
  if (fs.existsSync(srcImages)) {
    fs.mkdirSync(destImages, { recursive: true });
    for (const name of fs.readdirSync(srcImages)) {
      const from = path.join(srcImages, name);
      const to = path.join(destImages, name);
      fs.cpSync(from, to, { recursive: true, force: true });
    }
  }

  const resumePath = path.join(root, "resume-data.js");
  const original = fs.readFileSync(resumePath, "utf8");
  const patched = patchResumeData(original, imagesByIndex);
  fs.writeFileSync(resumePath, patched, "utf8");

  fs.rmSync(staging, { recursive: true, force: true });

  console.log(`已同步 ${imageCount} 张图片到 images/projects/`);
  console.log("已更新 resume-data.js 中的 images 配置");
  console.log("");
  console.log("下一步推送到 GitHub：");
  console.log('  git add images/projects resume-data.js');
  console.log('  git commit -m "同步项目配图到公网"');
  console.log("  git push");
}

main();
