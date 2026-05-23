const CATS = ProjectImageStore.CATEGORIES;

const CAT_UI = {
  user: {
    label: "用户端",
    hint: "PC / Web 用户界面",
    icon: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><rect x="2" y="3" width="20" height="14" rx="1"/><path d="M8 21h8M12 17v4"/></svg>`,
  },
  admin: {
    label: "后台",
    hint: "管理后台系统",
    icon: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><rect x="3" y="3" width="18" height="18" rx="1"/><path d="M3 9h18M9 21V9"/></svg>`,
  },
  mobile: {
    label: "手机端",
    hint: "小程序 / H5 / App",
    icon: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><rect x="5" y="2" width="14" height="20" rx="2"/><path d="M12 18h.01"/></svg>`,
  },
};

function escapeHtml(str) {
  return String(str)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function getProjects() {
  return (window.RESUME_DATA && window.RESUME_DATA.projects) || [];
}

function showToast(msg) {
  const old = document.querySelector(".toast");
  if (old) old.remove();
  const el = document.createElement("div");
  el.className = "toast";
  el.textContent = msg;
  document.body.appendChild(el);
  setTimeout(() => el.remove(), 3200);
}

function renderThumbGallery(images) {
  if (!images.length) {
    return `<div class="gallery-empty-state">
      <span>暂无图片</span>
      <small>点击下方按钮一次选择多张上传</small>
    </div>`;
  }
  return `
    <div class="upload-gallery">
      ${images
        .map(
          (img, i) => `
        <div class="gallery-item" data-id="${img.id}">
          <img src="${img.url}" alt="图 ${i + 1}" />
          <span class="gallery-item-num">${i + 1}</span>
          <button type="button" class="gallery-del" data-action="del-img" data-id="${img.id}" title="删除">×</button>
        </div>`
        )
        .join("")}
    </div>`;
}

function renderModuleColumn(projectIndex, cat, images) {
  const ui = CAT_UI[cat.id] || { label: cat.label, hint: "", icon: "" };

  return `
    <div class="module-panel module-${cat.id}" data-category="${cat.id}">
      <div class="module-header">
        <span class="module-icon">${ui.icon}</span>
        <div class="module-title-wrap">
          <h4 class="module-title">${ui.label}</h4>
          <span class="module-hint">${ui.hint}</span>
        </div>
        <span class="module-count">${images.length} 张</span>
      </div>

      ${renderThumbGallery(images)}

      <div class="module-upload">
        <input class="file-input" type="file" multiple accept="image/jpeg,image/png,image/webp,image/gif"
          id="file-${projectIndex}-${cat.id}"
          data-index="${projectIndex}" data-category="${cat.id}" />
        <label class="upload-btn" for="file-${projectIndex}-${cat.id}">
          <span class="upload-btn-icon">+</span>
          <span>一次选择多张图片</span>
        </label>
        <div class="module-drop" data-index="${projectIndex}" data-category="${cat.id}">
          <p>或将图片拖拽到本模块区域内</p>
        </div>
      </div>
    </div>`;
}

function renderBatchBar(projectIndex) {
  const tabs = CATS.map(
    (c, i) => `
    <button type="button" class="batch-tab${i === 0 ? " active" : ""}" data-category="${c.id}">
      ${CAT_UI[c.id].icon}
      <span>${c.label}</span>
    </button>`
  ).join("");

  return `
    <div class="batch-upload-bar" data-project="${projectIndex}">
      <div class="batch-label">
        <strong>批量上传</strong>
        <span>先选择模块，再一次上传多张图片</span>
      </div>
      <div class="batch-tabs" data-index="${projectIndex}">${tabs}</div>
      <input class="file-input batch-file-input" type="file" multiple accept="image/jpeg,image/png,image/webp,image/gif"
        data-index="${projectIndex}" data-category="user" id="batch-file-${projectIndex}" />
      <label class="batch-drop" for="batch-file-${projectIndex}">
        <span class="batch-drop-title">拖拽多张图片到此处，或点击选择文件</span>
        <span class="batch-drop-target">当前上传到：<em class="batch-target-name">用户端</em></span>
      </label>
    </div>`;
}

function renderCard(project, index, grouped) {
  const total = CATS.reduce((n, c) => n + (grouped[c.id]?.length || 0), 0);
  const cover = grouped.user?.[0] || grouped.admin?.[0] || grouped.mobile?.[0];

  return `
    <article class="project-upload-card${total ? " has-image" : ""}" data-index="${index}">
      <div class="card-top">
        <div class="card-meta">
          <span class="card-index">PROJECT ${String(index + 1).padStart(2, "0")}</span>
          <h3 class="card-title">${escapeHtml(project.title)}</h3>
          <p class="card-tag">${escapeHtml(project.tag)}</p>
        </div>
        <div class="card-cover-mini">
          ${
            cover
              ? `<img src="${cover.url}" alt="" />`
              : `<span class="placeholder-icon">${project.icon || "—"}</span>`
          }
          <span class="status-badge ${total ? "ok" : "empty"}">${total ? `${total} 张` : "待上传"}</span>
        </div>
      </div>

      ${renderBatchBar(index)}

      <div class="modules-row">
        ${CATS.map((c) => renderModuleColumn(index, c, grouped[c.id] || [])).join("")}
      </div>

      <div class="card-actions">
        <button type="button" class="admin-btn admin-btn-danger" data-action="clear-project" data-index="${index}">清空本项目全部图片</button>
      </div>
    </article>`;
}

async function handleUploadBatch(index, category, files) {
  const valid = files.filter((f) => f.type.startsWith("image/"));
  if (!valid.length) {
    showToast("请选择图片文件（JPG / PNG / WebP）");
    return 0;
  }

  const oversized = valid.filter((f) => f.size > 8 * 1024 * 1024);
  if (oversized.length) {
    showToast(`${oversized.length} 张超过 8MB 已跳过`);
  }

  const toUpload = valid.filter((f) => f.size <= 8 * 1024 * 1024);
  let done = 0;

  for (const file of toUpload) {
    await ProjectImageStore.add(index, category, file);
    done++;
  }

  return done;
}

async function refreshUI() {
  const projects = getProjects();
  const grid = document.getElementById("projectGrid");
  const statsEl = document.getElementById("statsBar");
  if (!grid) return;

  const cards = await Promise.all(
    projects.map(async (p, i) => {
      let grouped = await ProjectImageStore.getGrouped(i);
      grouped = ProjectImageStore.mergeWithStatic(p, grouped);
      return renderCard(p, i, grouped);
    })
  );

  grid.innerHTML = cards.join("");

  const stats = await ProjectImageStore.getStats(projects.length);
  if (statsEl) {
    statsEl.innerHTML = `
      <div class="stat-item"><strong>${stats.imageCount}</strong> 张已上传</div>
      <div class="stat-item"><strong>${stats.projectsWithImages}</strong> 个项目已配图</div>
      <div class="stat-item">共 <strong>${stats.total}</strong> 个项目 · 用户端 / 后台 / 手机端</div>`;
  }

  showStorageNotice(stats);
  bindCardEvents();
}

function bindCardEvents() {
  const grid = document.getElementById("projectGrid");
  if (!grid) return;

  grid.querySelectorAll(".file-input:not(.batch-file-input)").forEach((input) => {
    input.addEventListener("change", async (e) => {
      const files = Array.from(e.target.files || []);
      const index = Number(e.target.dataset.index);
      const category = e.target.dataset.category;
      const n = await handleUploadBatch(index, category, files);
      e.target.value = "";
      if (n > 0) {
        showToast(`已上传 ${n} 张至【${CAT_UI[category].label}】`);
        await refreshUI();
      }
    });
  });

  grid.querySelectorAll(".batch-file-input").forEach((input) => {
    input.addEventListener("change", async (e) => {
      const files = Array.from(e.target.files || []);
      const index = Number(e.target.dataset.index);
      const category = e.target.dataset.category;
      const n = await handleUploadBatch(index, category, files);
      e.target.value = "";
      if (n > 0) {
        showToast(`批量上传 ${n} 张 →【${CAT_UI[category].label}】`);
        await refreshUI();
      }
    });
  });

  grid.querySelectorAll(".batch-tab").forEach((tab) => {
    tab.addEventListener("click", () => {
      const bar = tab.closest(".batch-upload-bar");
      const index = bar.dataset.project;
      const category = tab.dataset.category;
      bar.querySelectorAll(".batch-tab").forEach((t) => t.classList.remove("active"));
      tab.classList.add("active");
      const input = bar.querySelector(".batch-file-input");
      input.dataset.category = category;
      input.id = `batch-file-${index}-${category}`;
      const label = bar.querySelector(".batch-drop");
      label.setAttribute("for", input.id);
      bar.querySelector(".batch-target-name").textContent = CAT_UI[category].label;
    });
  });

  grid.querySelectorAll('[data-action="del-img"]').forEach((btn) => {
    btn.addEventListener("click", async (e) => {
      e.stopPropagation();
      await ProjectImageStore.removeById(btn.dataset.id);
      showToast("已删除");
      await refreshUI();
    });
  });

  grid.querySelectorAll('[data-action="clear-project"]').forEach((btn) => {
    btn.addEventListener("click", async () => {
      const index = Number(btn.dataset.index);
      if (!confirm("确定清空该项目的全部图片？")) return;
      await ProjectImageStore.removeAllForProject(index);
      showToast("已清空");
      await refreshUI();
    });
  });

  grid.querySelectorAll(".module-panel").forEach((panel) => {
    const index = Number(panel.querySelector(".file-input")?.dataset.index);
    const category = panel.dataset.category;
    const drop = panel.querySelector(".module-drop");

    panel.addEventListener("dragover", (e) => {
      e.preventDefault();
      panel.classList.add("dragover");
    });
    panel.addEventListener("dragleave", (e) => {
      if (!panel.contains(e.relatedTarget)) panel.classList.remove("dragover");
    });
    panel.addEventListener("drop", async (e) => {
      e.preventDefault();
      panel.classList.remove("dragover");
      const files = Array.from(e.dataTransfer?.files || []).filter((f) =>
        f.type.startsWith("image/")
      );
      const n = await handleUploadBatch(index, category, files);
      if (n > 0) {
        showToast(`已上传 ${n} 张至【${CAT_UI[category].label}】`);
        await refreshUI();
      }
    });

    if (drop) {
      drop.addEventListener("dragover", (e) => {
        e.preventDefault();
        panel.classList.add("dragover");
      });
    }
  });

  grid.querySelectorAll(".batch-drop").forEach((zone) => {
    const bar = zone.closest(".batch-upload-bar");
    zone.addEventListener("dragover", (e) => {
      e.preventDefault();
      bar.classList.add("dragover");
    });
    zone.addEventListener("dragleave", () => bar.classList.remove("dragover"));
    zone.addEventListener("drop", async (e) => {
      e.preventDefault();
      bar.classList.remove("dragover");
      const input = bar.querySelector(".batch-file-input");
      const index = Number(input.dataset.index);
      const category = input.dataset.category;
      const files = Array.from(e.dataTransfer?.files || []).filter((f) =>
        f.type.startsWith("image/")
      );
      const n = await handleUploadBatch(index, category, files);
      if (n > 0) {
        showToast(`批量上传 ${n} 张 →【${CAT_UI[category].label}】`);
        await refreshUI();
      }
    });
  });
}

function guessMimeType(fileName) {
  const ext = String(fileName).split(".").pop()?.toLowerCase();
  const map = {
    jpg: "image/jpeg",
    jpeg: "image/jpeg",
    png: "image/png",
    webp: "image/webp",
    gif: "image/gif",
  };
  return map[ext] || "image/jpeg";
}

async function importZip(file) {
  if (!file) return;
  if (typeof JSZip === "undefined") {
    showToast("打包组件加载失败");
    return;
  }

  const existing = await ProjectImageStore.getAll();
  if (existing.length && !confirm("导入会与现有图片合并（不会自动删除旧图）。确定继续？")) {
    return;
  }

  const zip = await JSZip.loadAsync(await file.arrayBuffer());
  let manifest = null;
  const manifestFile = zip.file("image-manifest.json");
  if (manifestFile) {
    try {
      manifest = JSON.parse(await manifestFile.async("string"));
    } catch {
      showToast("manifest 解析失败");
      return;
    }
  }

  let imported = 0;

  if (manifest?.projects?.length) {
    for (const entry of manifest.projects) {
      const zipPath = entry.path.replace(/^\/+/, "");
      const zf = zip.file(zipPath) || zip.file(zipPath.replace(/\//g, "\\"));
      if (!zf) continue;
      const blob = await zf.async("blob");
      const fileName = zipPath.split("/").pop() || `${entry.category}.jpg`;
      const fileObj = new File([blob], fileName, { type: guessMimeType(fileName) });
      await ProjectImageStore.add(entry.projectIndex, entry.category, fileObj);
      imported += 1;
    }
  } else {
    const tasks = [];
    zip.forEach((relativePath, zf) => {
      if (zf.dir) return;
      const m = relativePath.match(
        /^images\/projects\/[^/]+\/(user|admin|mobile)\/[^/]+\.(jpe?g|png|webp|gif)$/i
      );
      if (!m) return;
      const category = m[1];
      tasks.push(
        (async () => {
          const parts = relativePath.split("/");
          const slug = parts[2];
          const projectIndex = Math.max(0, parseInt(slug, 10) - 1);
          const blob = await zf.async("blob");
          const fileName = parts[parts.length - 1];
          const fileObj = new File([blob], fileName, { type: guessMimeType(fileName) });
          await ProjectImageStore.add(projectIndex, category, fileObj);
          imported += 1;
        })()
      );
    });
    await Promise.all(tasks);
  }

  if (!imported) {
    showToast("ZIP 中未找到可导入的图片");
    return;
  }

  showToast(`已导入 ${imported} 张图片`);
  await refreshUI();
}

async function exportZip() {
  const projects = getProjects();
  const records = await ProjectImageStore.getAll();
  if (!records.length) {
    showToast("暂无图片");
    return;
  }
  if (typeof JSZip === "undefined") {
    showToast("打包组件加载失败");
    return;
  }

  const zip = new JSZip();
  const root = zip.folder("images/projects");
  const manifest = [];
  const byProject = {};
  records.forEach((r) => {
    if (!byProject[r.projectIndex]) byProject[r.projectIndex] = [];
    byProject[r.projectIndex].push(r);
  });

  Object.keys(byProject).forEach((idx) => {
    const i = Number(idx);
    const p = projects[i];
    const title = p?.title || "project";
    const slug = String(i + 1).padStart(2, "0") + "-" + title.slice(0, 12).replace(/\s/g, "-");
    const projectFolder = root.folder(slug);
    byProject[idx].forEach((rec, seq) => {
      const ext =
        ((rec.fileName && rec.fileName.split(".").pop()) || "jpg").replace(/[^a-z0-9]/gi, "") ||
        "jpg";
      const fileName = `${rec.category}-${seq + 1}.${ext}`;
      projectFolder.folder(rec.category).file(fileName, rec.blob);
      manifest.push({
        projectIndex: i,
        title: p?.title,
        category: rec.category,
        path: `images/projects/${slug}/${rec.category}/${fileName}`,
      });
    });
  });

  zip.file("image-manifest.json", JSON.stringify({ projects: manifest }, null, 2));
  const blob = await zip.generateAsync({ type: "blob" });
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = "guoxin-portfolio-images.zip";
  a.click();
  URL.revokeObjectURL(a.href);
  showToast("已导出 ZIP");
}

function showStorageNotice(stats) {
  const el = document.getElementById("storageNotice");
  if (!el) return;

  const origin = location.origin || "file://";
  const isHttp = location.protocol.startsWith("http");
  const fileRecoveryUrl =
    "file:///C:/Users/Administrator/.cursor/projects/empty-window/guoxin-portfolio/image-admin.html";

  if (stats.imageCount > 0) {
    el.hidden = true;
    return;
  }

  el.hidden = false;
  if (isHttp) {
    el.innerHTML = `
      <strong>为什么之前上传的图片不见了？</strong><br>
      配图存在浏览器 IndexedDB，且按「访问地址」分开保存。
      以前若用 <strong>双击 HTML（file://）</strong> 上传，现在用 <strong>${origin}</strong> 打开会是<strong>另一份空库</strong>，不是被删了。<br>
      <strong>找回步骤：</strong>① 用<strong>同一浏览器</strong>打开旧地址
      <code>${fileRecoveryUrl}</code>
      → ② 点「导出 ZIP 包」→ ③ 回到本页点「导入 ZIP 包」。<br>
      以后请固定用 <a href="http://localhost:5173/image-admin.html">http://localhost:5173/image-admin.html</a>（先运行 start-local.bat），避免再丢图。`;
  } else {
    el.innerHTML = `
      <strong>当前为 file:// 模式</strong>：与 localhost 本地服务器的数据不互通。
      上传完成后请点「导出 ZIP 包」，再在
      <a href="http://localhost:5173/image-admin.html">http://localhost:5173/image-admin.html</a>
      导入（需先运行 start-local.bat）。`;
  }
}

document.addEventListener("DOMContentLoaded", async () => {
  if (window.ProjectImageStore?.runPendingMigrations) {
    const mig = await ProjectImageStore.runPendingMigrations();
    if (mig.cangqiong > 0) {
      showToast(`已将 ${mig.cangqiong} 张苍穹配图迁移至「昆山社保大厅数字孪生」`);
    }
    if (mig.miguo?.shifted > 0 || mig.miguo?.deleted > 0) {
      showToast(`已移除米果项目配图，并重排 ${mig.miguo.shifted} 张其余项目图片`);
    }
  }

  document.getElementById("btnRefresh")?.addEventListener("click", refreshUI);
  document.getElementById("btnExportZip")?.addEventListener("click", exportZip);
  const importInput = document.getElementById("importZipInput");
  document.getElementById("btnImportZip")?.addEventListener("click", () => importInput?.click());
  importInput?.addEventListener("change", async (e) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (file) await importZip(file);
  });
  document.getElementById("btnExportSnippet")?.addEventListener("click", () => {
    showToast("请使用「导出 ZIP」备份；部署时按 manifest 配置 resume-data.js");
  });
  document.getElementById("btnClearAll")?.addEventListener("click", async () => {
    if (!confirm("确定清空全部项目图片？")) return;
    await ProjectImageStore.clearAll();
    showToast("已清空");
    await refreshUI();
  });
  await refreshUI();
});
