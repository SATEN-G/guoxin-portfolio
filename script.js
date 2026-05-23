const INTERVAL_MS = 5000;
const RESUME_PDF_HINT = "郭鑫简历.pdf（本机微信文件）";

function getData() {
  return window.RESUME_DATA || { profile: {}, projects: [], skills: [] };
}

function escapeHtml(str) {
  return String(str)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

/** 与项目详情模块相同的首图：用户端 → 后台 → 手机端 */
async function resolveProjectImageSrc(project, index) {
  if (window.ProjectImageStore) {
    const first = await ProjectImageStore.getFirstDetailImage(index, project);
    if (first?.url) {
      return { src: first.url, fromLocal: !first.static };
    }
  }
  if (project.images) {
    for (const cat of ["user", "admin", "mobile"]) {
      const path = project.images[cat]?.[0];
      if (path) return { src: path, fromLocal: false };
    }
  }
  if (project.image) return { src: project.image, fromLocal: false };
  return null;
}

const DETAIL_CATS = [
  { id: "user", label: "用户端", short: "PC" },
  { id: "admin", label: "后台", short: "Admin" },
  { id: "mobile", label: "手机端", short: "App" },
];

let lightboxImages = [];
let lightboxIndex = 0;

function buildLightboxList(project, grouped) {
  const list = [];
  DETAIL_CATS.forEach((c) => {
    (grouped[c.id] || []).forEach((img, j) => {
      list.push({
        url: img.url,
        caption: `${project.title} · ${c.label} · 图 ${j + 1}`,
      });
    });
  });
  return list;
}

function renderDetailThumb(img, lbIndex, extraClass = "") {
  return `
    <button type="button" class="detail-thumb${extraClass}" data-lightbox-index="${lbIndex}" aria-label="放大查看">
      <img src="${escapeHtml(img.url)}" alt="" loading="lazy" />
      <span class="thumb-zoom">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="11" cy="11" r="8"/><path d="M21 21l-4.35-4.35M11 8v6M8 11h6"/></svg>
      </span>
    </button>`;
}

function renderDetailShowcase(project, grouped, lightboxList) {
  const sections = [];
  let offset = 0;
  let hasAny = false;

  DETAIL_CATS.forEach((cat) => {
    const imgs = grouped[cat.id] || [];
    if (!imgs.length) return;

    hasAny = true;
    const isFeatured = sections.length === 0;
    const cells = imgs
      .map((img, j) => {
        const lbIndex = offset + j;
        const leadClass =
          isFeatured && j === 0
            ? imgs.length === 1
              ? " detail-thumb--solo"
              : " detail-thumb--lead"
            : "";
        return renderDetailThumb(img, lbIndex, leadClass);
      })
      .join("");

    offset += imgs.length;
    sections.push(`
      <section class="detail-cat-section${isFeatured ? " detail-cat-section--featured" : ""}">
        <header class="detail-cat-head">
          <span class="tab-dot tab-dot-${cat.id}"></span>
          <h4>${escapeHtml(cat.label)}</h4>
          <em>${imgs.length}</em>
        </header>
        <div class="detail-grid${imgs.length === 1 ? " detail-grid--single" : ""}">${cells}</div>
      </section>`);
  });

  if (!hasAny) {
    return `<div class="gallery-empty"><span>暂无配图，请前往 <a href="image-admin.html">配图管理</a> 上传</span></div>`;
  }

  return `<div class="detail-showcase">${sections.join("")}</div>`;
}

function renderDetailStory(project) {
  const c = project.detailContent;
  if (!c) {
    return `
      <div class="detail-story">
        <h4 class="detail-story-title">项目详细内容</h4>
        <p class="detail-story-text">${escapeHtml(project.desc || "")}</p>
      </div>`;
  }

  const resp = (c.responsibilities || [])
    .map((item) => `<li>${escapeHtml(item)}</li>`)
    .join("");
  const modules = (c.modules || [])
    .map(
      (m) => `
      <div class="story-module">
        <h5>${escapeHtml(m.name)}</h5>
        <p>${escapeHtml(m.desc)}</p>
      </div>`
    )
    .join("");
  const results = (c.results || [])
    .map((item) => `<li>${escapeHtml(item)}</li>`)
    .join("");
  const metrics = (c.metrics || [])
    .map(
      (m) => `
      <div class="story-metric">
        <span class="story-metric-val">${escapeHtml(m.value)}</span>
        <span class="story-metric-label">${escapeHtml(m.label)}</span>
      </div>`
    )
    .join("");

  return `
    <div class="detail-story">
      <div class="detail-story-head">
        <h4 class="detail-story-title">项目详细内容</h4>
        <div class="detail-story-meta">
          ${c.role ? `<span class="story-tag">${escapeHtml(c.role)}</span>` : ""}
          ${c.period ? `<span class="story-tag story-tag--time">${escapeHtml(c.period)}</span>` : ""}
        </div>
      </div>
      ${c.background ? `<p class="detail-story-bg">${escapeHtml(c.background)}</p>` : ""}
      ${
        resp
          ? `<div class="story-block"><h5>工作职责</h5><ul class="story-list">${resp}</ul></div>`
          : ""
      }
      ${
        modules
          ? `<div class="story-block"><h5>核心模块</h5><div class="story-modules">${modules}</div></div>`
          : ""
      }
      ${
        results
          ? `<div class="story-block"><h5>项目成果</h5><ul class="story-list story-list--result">${results}</ul></div>`
          : ""
      }
      ${metrics ? `<div class="story-metrics">${metrics}</div>` : ""}
    </div>`;
}

async function renderProjectDetails() {
  const container = document.getElementById("projectDetailsList");
  const nav = document.getElementById("detailsNav");
  const projects = getData().projects;
  if (!container || !projects.length) return;

  const blocks = await Promise.all(
    projects.map(async (p, i) => {
      let grouped = { user: [], admin: [], mobile: [] };
      if (window.ProjectImageStore) {
        grouped = await ProjectImageStore.getGrouped(i);
        grouped = ProjectImageStore.mergeWithStatic(p, grouped);
      } else if (p.images) {
        ["user", "admin", "mobile"].forEach((id) => {
          (p.images[id] || []).forEach((path, j) => {
            grouped[id].push({ id: `static-${j}`, url: path, fileName: path });
          });
        });
      }

      const lightboxList = buildLightboxList(p, grouped);
      const totalImgs = lightboxList.length;
      const summary = p.desc || "";
      const lbData = encodeURIComponent(JSON.stringify(lightboxList));

      return `
      <article class="detail-block" id="project-${i}" data-project-index="${i}" data-lightbox="${lbData}">
        <header class="detail-block-head">
          <span class="detail-index">${String(i + 1).padStart(2, "0")}</span>
          <div class="detail-head-text">
            <span class="detail-tag">${escapeHtml(p.tag)}</span>
            <h3 class="detail-title">${escapeHtml(p.title)}</h3>
            <p class="detail-summary">${escapeHtml(summary)}</p>
          </div>
          <div class="detail-head-meta">
            <span class="detail-img-count">${totalImgs} 张配图</span>
          </div>
        </header>
        ${renderDetailShowcase(p, grouped, lightboxList)}
        ${renderDetailStory(p)}
      </article>`;
    })
  );

  container.innerHTML = blocks.join("");

  if (nav) {
    nav.innerHTML = projects
      .map(
        (p, i) =>
          `<a href="#project-${i}" class="details-nav-link" title="${escapeHtml(p.title)}">${String(i + 1).padStart(2, "0")}</a>`
      )
      .join("");
  }

  initDetailLightbox();
}

function openLightbox(images, index) {
  lightboxImages = images;
  lightboxIndex = index;
  const box = document.getElementById("lightbox");
  if (!box) return;
  box.classList.add("is-open");
  box.setAttribute("aria-hidden", "false");
  document.body.classList.add("lightbox-open");
  updateLightboxView();
}

function closeLightbox() {
  const box = document.getElementById("lightbox");
  if (!box) return;
  box.classList.remove("is-open");
  box.setAttribute("aria-hidden", "true");
  document.body.classList.remove("lightbox-open");
}

function updateLightboxView() {
  const img = document.getElementById("lightboxImg");
  const cap = document.getElementById("lightboxCaption");
  const counter = document.getElementById("lightboxCounter");
  const item = lightboxImages[lightboxIndex];
  if (!item || !img) return;
  img.src = item.url;
  img.alt = item.caption;
  if (cap) cap.textContent = item.caption;
  if (counter) counter.textContent = `${lightboxIndex + 1} / ${lightboxImages.length}`;
}

function initDetailLightbox() {
  document.querySelectorAll(".detail-block").forEach((block) => {
    let images = [];
    try {
      if (block.dataset.lightbox) {
        images = JSON.parse(decodeURIComponent(block.dataset.lightbox));
      }
    } catch {
      images = [];
    }

    block.querySelectorAll(".detail-thumb").forEach((btn) => {
      btn.addEventListener("click", () => {
        const idx = Number(btn.dataset.lightboxIndex);
        if (images.length) openLightbox(images, idx);
      });
    });
  });

  if (window.__lightboxBound) return;
  window.__lightboxBound = true;

  document.querySelectorAll("[data-action='close-lightbox']").forEach((el) => {
    el.addEventListener("click", closeLightbox);
  });
  document.querySelector("[data-action='lightbox-prev']")?.addEventListener("click", () => {
    if (!lightboxImages.length) return;
    lightboxIndex = (lightboxIndex - 1 + lightboxImages.length) % lightboxImages.length;
    updateLightboxView();
  });
  document.querySelector("[data-action='lightbox-next']")?.addEventListener("click", () => {
    if (!lightboxImages.length) return;
    lightboxIndex = (lightboxIndex + 1) % lightboxImages.length;
    updateLightboxView();
  });
  document.addEventListener("keydown", (e) => {
    const box = document.getElementById("lightbox");
    if (!box?.classList.contains("is-open")) return;
    if (e.key === "Escape") closeLightbox();
    if (e.key === "ArrowLeft") {
      lightboxIndex = (lightboxIndex - 1 + lightboxImages.length) % lightboxImages.length;
      updateLightboxView();
    }
    if (e.key === "ArrowRight") {
      lightboxIndex = (lightboxIndex + 1) % lightboxImages.length;
      updateLightboxView();
    }
  });
}

async function renderProjects() {
  const track = document.getElementById("carouselTrack");
  const source = document.getElementById("dataSource");
  const { projects } = getData();
  if (!track || !projects.length) return;

  ProjectImageStore?.revokeAll?.();

  const imageInfos = await Promise.all(
    projects.map((p, i) => resolveProjectImageSrc(p, i))
  );

  track.innerHTML = projects
    .map((p, i) => {
      const imgInfo = imageInfos[i];
      const hasImage = Boolean(imgInfo?.src);
      const visualInner = hasImage
        ? `<img class="slide-img" src="${escapeHtml(imgInfo.src)}" alt="${escapeHtml(p.title)}" loading="lazy" onerror="this.classList.add('is-error');this.style.display='none';this.nextElementSibling&&(this.nextElementSibling.style.display='flex');" />
           <div class="slide-icon slide-icon-fallback" style="display:none">${escapeHtml(p.icon)}</div>`
        : `<div class="slide-icon">${escapeHtml(p.icon)}</div>`;

      return `
    <article class="slide${i === 0 ? " active" : ""}" data-index="${i}">
      <div class="slide-visual slide-visual-${(i % 6) + 1}${hasImage ? " has-image" : ""}">
        ${visualInner}
      </div>
      <div class="slide-content">
        <span class="slide-tag">${escapeHtml(p.tag)}</span>
        <h3>${escapeHtml(p.title)}</h3>
        <p>${escapeHtml(p.desc)}</p>
      </div>
    </article>`;
    })
    .join("");

  const localCount = imageInfos.filter((x) => x?.fromLocal).length;
  const fileCount = projects.filter((p) => p.image).length;
  if (source) {
    let hint = `共 ${projects.length} 个项目`;
    if (localCount) hint += ` · ${localCount} 张详情首图`;
    else if (fileCount) hint += ` · ${fileCount} 张配图`;
    hint += ` · <a href="image-admin.html" style="color:var(--cyan)">管理配图</a>`;
    source.innerHTML = hint;
  }

  initCarousel();
}

const DOMAIN_META = [
  { key: "b", label: "B端", icon: "b" },
  { key: "c", label: "C端", icon: "c" },
  { key: "g", label: "G端", icon: "g" },
];

function getSkillIcon(iconKey) {
  const icons = window.SKILL_ICONS || {};
  return icons[iconKey] || icons.logic || "";
}

function renderProfile() {
  const p = getData().profile;
  if (!p.name) return;

  const nameEl = document.getElementById("profileName");
  const roleEl = document.getElementById("profileRole");
  const statsEl = document.getElementById("profileStats");
  const infoEl = document.getElementById("profileInfo");
  const certsEl = document.getElementById("profileCerts");
  const domainEl = document.getElementById("profileDomain");
  const abilitiesEl = document.getElementById("profileAbilities");
  const insightsEl = document.getElementById("profileInsights");
  const contactBtn = document.getElementById("profileContact");
  const domainIcons = window.DOMAIN_ICONS || {};

  if (nameEl) nameEl.textContent = p.name;
  if (roleEl) roleEl.textContent = p.targetRole || p.role;

  if (statsEl) {
    statsEl.innerHTML = `
      <div class="stat-chip"><span class="stat-value">${p.age}</span><span class="stat-label">岁</span></div>
      <div class="stat-chip"><span class="stat-value">${escapeHtml(p.education)}</span><span class="stat-label">学历</span></div>
      <div class="stat-chip highlight"><span class="stat-value">${p.experienceYears}</span><span class="stat-label">年经验</span></div>
      <div class="stat-chip"><span class="stat-value">30+</span><span class="stat-label">交付项目</span></div>`;
  }

  if (contactBtn) {
    contactBtn.href = `tel:${p.phone}`;
    const num = contactBtn.querySelector(".contact-num");
    if (num) num.textContent = p.phone;
  }

  if (infoEl) {
    infoEl.innerHTML = `
      <div class="info-cell"><dt>学校</dt><dd>${escapeHtml(p.school)}</dd></div>
      <div class="info-cell"><dt>学历</dt><dd>${escapeHtml(p.education)}</dd></div>
      <div class="info-cell"><dt>工作经验</dt><dd>${p.experienceYears} 年</dd></div>
      <div class="info-cell"><dt>应聘岗位</dt><dd>${escapeHtml(p.targetRole)}</dd></div>`;
  }

  if (certsEl && p.certs) {
    certsEl.innerHTML = p.certs
      .map(
        (c) => `
      <li class="cert-pill">
        <span class="cert-code">${escapeHtml(c.code)}</span>
        <span class="cert-name">${escapeHtml(c.name)}</span>
      </li>`
      )
      .join("");
  }

  if (domainEl && p.domainExperience) {
    domainEl.innerHTML = p.domainExperience
      .map((item, i) => {
        const meta = DOMAIN_META[i] || { label: "领域", icon: "b" };
        return `
        <div class="domain-card">
          <div class="domain-icon-wrap">${domainIcons[meta.icon] || ""}</div>
          <span class="domain-tag">${meta.label}</span>
          <p>${escapeHtml(item)}</p>
        </div>`;
      })
      .join("");
  }

  if (abilitiesEl && p.coreAbilities) {
    abilitiesEl.innerHTML = p.coreAbilities
      .map(
        (item, i) => `
      <li class="ability-step">
        <span class="step-index">${String(i + 1).padStart(2, "0")}</span>
        <span class="step-text">${escapeHtml(item)}</span>
      </li>`
      )
      .join("");
  }

  if (insightsEl && p.insights) {
    insightsEl.innerHTML = `<span class="quote-mark">"</span>${escapeHtml(p.insights)}`;
  }
}

const RADAR_CX = 120;
const RADAR_CY = 120;
const RADAR_R = 78;
const RADAR_LEVELS = [0.25, 0.5, 0.75, 1];

function radarAngle(i, total) {
  return (2 * Math.PI * i) / total - Math.PI / 2;
}

function radarPoint(i, ratio, total) {
  const a = radarAngle(i, total);
  return [
    RADAR_CX + RADAR_R * ratio * Math.cos(a),
    RADAR_CY + RADAR_R * ratio * Math.sin(a),
  ];
}

function initSkills() {
  const grid = document.getElementById("skillsGrid");
  const skills = getData().skills || [];
  if (!grid) return;

  grid.innerHTML = skills
    .map(
      (s, i) => `
    <article class="skill-card" style="--delay: ${i * 0.05}s">
      <div class="skill-icon-wrap" aria-hidden="true">${getSkillIcon(s.iconKey)}</div>
      <div class="skill-body">
        <span class="skill-num">${String(i + 1).padStart(2, "0")}</span>
        <h4>${escapeHtml(s.title)}</h4>
        <p>${escapeHtml(s.text)}</p>
      </div>
    </article>`
    )
    .join("");

  initRadarChart();
}

function initRadarChart() {
  const dims =
    getData().radarDimensions ||
    [
      { label: "原型设计", value: 90 },
      { label: "文档撰写", value: 92 },
      { label: "数据分析", value: 86 },
      { label: "AI 工具", value: 88 },
      { label: "跨部门协作", value: 90 },
      { label: "逻辑思维", value: 93 },
    ];
  const n = dims.length;
  if (!n) return;

  const gridG = document.getElementById("radarGrid");
  const axesG = document.getElementById("radarAxes");
  const fill = document.getElementById("radarFill");
  const vertsG = document.getElementById("radarVerts");
  const labelsEl = document.getElementById("radarLabels");
  const avgEl = document.getElementById("radarAvgValue");
  const hudStatus = document.getElementById("radarHudStatus");

  if (!gridG || !fill) return;

  const avg = Math.round(dims.reduce((s, d) => s + d.value, 0) / n);
  if (avgEl) avgEl.textContent = String(avg);
  if (hudStatus) {
    hudStatus.textContent = `LOCKED · ${n} AXIS`;
    setTimeout(() => {
      if (hudStatus) hudStatus.textContent = "SYNC OK";
    }, 2200);
  }

  gridG.innerHTML = RADAR_LEVELS.map((level, li) => {
    const pts = Array.from({ length: n }, (_, i) => radarPoint(i, level, n))
      .map(([x, y]) => `${x.toFixed(1)},${y.toFixed(1)}`)
      .join(" ");
    return `<polygon class="radar-ring${li === RADAR_LEVELS.length - 1 ? " radar-ring-outer" : ""}" points="${pts}" />`;
  }).join("");

  axesG.innerHTML = dims
    .map((_, i) => {
      const [x, y] = radarPoint(i, 1, n);
      return `<line class="radar-axis" x1="${RADAR_CX}" y1="${RADAR_CY}" x2="${x.toFixed(1)}" y2="${y.toFixed(1)}" />`;
    })
    .join("");

  const fillPts = dims
    .map((d, i) => {
      const [x, y] = radarPoint(i, Math.min(100, Math.max(0, d.value)) / 100, n);
      return `${x.toFixed(1)},${y.toFixed(1)}`;
    })
    .join(" ");

  fill.setAttribute("points", fillPts);

  if (vertsG) {
    vertsG.innerHTML = dims
      .map((d, i) => {
        const [x, y] = radarPoint(i, Math.min(100, Math.max(0, d.value)) / 100, n);
        return `<circle class="radar-vertex" cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" r="4" data-value="${d.value}">
          <title>${escapeHtml(d.label)}: ${d.value}</title>
        </circle>`;
      })
      .join("");
  }

  if (labelsEl) {
    labelsEl.innerHTML = dims
      .map((d, i) => {
        const a = radarAngle(i, n);
        const dist = 44;
        const left = 50 + dist * Math.cos(a);
        const top = 50 + dist * Math.sin(a);
        return `
        <li class="radar-label" style="left:${left.toFixed(1)}%;top:${top.toFixed(1)}%;--i:${i}">
          <span class="radar-label-name">${escapeHtml(d.label)}</span>
          <span class="radar-label-val">${d.value}</span>
        </li>`;
      })
      .join("");
  }

  const chart = document.getElementById("radarChart");
  if (chart) {
    chart.setAttribute(
      "aria-label",
      `六维能力雷达：${dims.map((d) => `${d.label}${d.value}`).join("，")}`
    );
  }
}

function initCarousel() {
  const track = document.getElementById("carouselTrack");
  const dotsContainer = document.getElementById("carouselDots");
  const timerBar = document.getElementById("timerBar");
  const prevBtn = document.getElementById("prevBtn");
  const nextBtn = document.getElementById("nextBtn");

  if (!track) return;

  const slides = Array.from(track.querySelectorAll(".slide"));
  if (!slides.length) return;

  dotsContainer.innerHTML = "";
  let current = 0;
  let timerId = null;
  let progressId = null;
  let progressStart = 0;

  slides.forEach((_, i) => {
    const dot = document.createElement("button");
    dot.type = "button";
    dot.className = "dot-btn" + (i === 0 ? " active" : "");
    dot.setAttribute("aria-label", `第 ${i + 1} 张`);
    dot.addEventListener("click", () => goTo(i, true));
    dotsContainer.appendChild(dot);
  });

  const dots = Array.from(dotsContainer.querySelectorAll(".dot-btn"));

  function setActive(index) {
    slides.forEach((s, i) => {
      s.classList.toggle("active", i === index);
    });
    dots.forEach((d, i) => {
      d.classList.toggle("active", i === index);
    });
    current = index;
  }

  function goTo(index, resetTimer = false) {
    const next = (index + slides.length) % slides.length;
    setActive(next);
    if (resetTimer) restartAutoPlay();
  }

  function next() {
    goTo(current + 1);
  }

  function prev() {
    goTo(current - 1);
  }

  function startProgress() {
    if (progressId) cancelAnimationFrame(progressId);
    progressStart = performance.now();
    timerBar.style.width = "0%";

    function tick(now) {
      const elapsed = now - progressStart;
      const pct = Math.min((elapsed / INTERVAL_MS) * 100, 100);
      timerBar.style.width = pct + "%";
      if (pct < 100) {
        progressId = requestAnimationFrame(tick);
      }
    }
    progressId = requestAnimationFrame(tick);
  }

  function restartAutoPlay() {
    clearInterval(timerId);
    startProgress();
    timerId = setInterval(() => {
      next();
      startProgress();
    }, INTERVAL_MS);
  }

  prevBtn.addEventListener("click", () => {
    prev();
    restartAutoPlay();
  });

  nextBtn.addEventListener("click", () => {
    next();
    restartAutoPlay();
  });

  let pauseOnHover = false;
  const carousel = document.querySelector(".carousel");
  carousel.addEventListener("mouseenter", () => {
    pauseOnHover = true;
    clearInterval(timerId);
    if (progressId) cancelAnimationFrame(progressId);
  });
  carousel.addEventListener("mouseleave", () => {
    if (pauseOnHover) {
      pauseOnHover = false;
      restartAutoPlay();
    }
  });

  restartAutoPlay();
}

document.addEventListener("DOMContentLoaded", async () => {
  if (window.ProjectImageStore?.runPendingMigrations) {
    await ProjectImageStore.runPendingMigrations();
  }
  renderProfile();
  initSkills();
  await renderProjects();
  await renderProjectDetails();
});
