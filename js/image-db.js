/**
 * 项目配图本地存储（IndexedDB）— 支持用户端 / 后台 / 手机端多图
 */
const IMAGE_CATEGORIES = [
  { id: "user", label: "用户端" },
  { id: "admin", label: "后台" },
  { id: "mobile", label: "手机端" },
];

const ProjectImageStore = (() => {
  const DB_NAME = "guoxin-portfolio-images";
  const DB_VERSION = 2;
  const STORE = "images";
  const urlCache = new Map();

  function imageId(projectIndex, category, suffix) {
    return `p${projectIndex}-${category}-${suffix}`;
  }

  function parseImageId(id) {
    const m = String(id).match(/^p(\d+)-(user|admin|mobile)-(.+)$/);
    if (!m) return null;
    return { projectIndex: Number(m[1]), category: m[2], suffix: m[3] };
  }

  function openDB() {
    return new Promise((resolve, reject) => {
      const req = indexedDB.open(DB_NAME, DB_VERSION);
      req.onerror = () => reject(req.error);
      req.onsuccess = () => resolve(req.result);
      req.onupgradeneeded = (e) => {
        const db = e.target.result;
        let store;
        if (db.objectStoreNames.contains(STORE)) {
          db.deleteObjectStore(STORE);
        }
        store = db.createObjectStore(STORE, { keyPath: "id" });
        store.createIndex("byProject", "projectIndex", { unique: false });
        store.createIndex("byProjectCategory", ["projectIndex", "category"], {
          unique: false,
        });
      };
    });
  }

  function revokeUrl(id) {
    const url = urlCache.get(id);
    if (url) {
      URL.revokeObjectURL(url);
      urlCache.delete(id);
    }
  }

  function blobToUrl(id, blob) {
    revokeUrl(id);
    const url = URL.createObjectURL(blob);
    urlCache.set(id, url);
    return url;
  }

  async function add(projectIndex, category, file) {
    const suffix = Date.now() + "-" + Math.random().toString(36).slice(2, 8);
    const id = imageId(projectIndex, category, suffix);
    const db = await openDB();
    const record = {
      id,
      projectIndex,
      category,
      blob: file,
      mimeType: file.type || "image/jpeg",
      fileName: file.name,
      updatedAt: Date.now(),
    };
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE, "readwrite");
      tx.objectStore(STORE).put(record);
      tx.oncomplete = () => resolve(record);
      tx.onerror = () => reject(tx.error);
    });
  }

  async function removeById(id) {
    revokeUrl(id);
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE, "readwrite");
      tx.objectStore(STORE).delete(id);
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  }

  async function removeAllForProject(projectIndex) {
    const all = await getByProject(projectIndex);
    await Promise.all(all.map((r) => removeById(r.id)));
  }

  async function getByProject(projectIndex) {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE, "readonly");
      const idx = tx.objectStore(STORE).index("byProject");
      const req = idx.getAll(projectIndex);
      req.onsuccess = () => resolve(req.result || []);
      req.onerror = () => reject(req.error);
    });
  }

  async function getAll() {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE, "readonly");
      const req = tx.objectStore(STORE).getAll();
      req.onsuccess = () => resolve(req.result || []);
      req.onerror = () => reject(req.error);
    });
  }

  async function getObjectUrlById(id, blob) {
    if (urlCache.has(id)) return urlCache.get(id);
    const db = await openDB();
    const record = await new Promise((resolve, reject) => {
      const tx = db.transaction(STORE, "readonly");
      const req = tx.objectStore(STORE).get(id);
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => reject(req.error);
    });
    if (!record?.blob) return null;
    return blobToUrl(id, record.blob);
  }

  async function getGrouped(projectIndex) {
    const records = await getByProject(projectIndex);
    const grouped = { user: [], admin: [], mobile: [] };
    const sorted = records.sort((a, b) => a.updatedAt - b.updatedAt);
    for (const rec of sorted) {
      if (!grouped[rec.category]) grouped[rec.category] = [];
      const url = blobToUrl(rec.id, rec.blob);
      grouped[rec.category].push({
        id: rec.id,
        url,
        fileName: rec.fileName,
      });
    }
    return grouped;
  }

  /** 项目详情首图：用户端 → 后台 → 手机端，与详情模块一致 */
  async function getFirstDetailImage(projectIndex, project) {
    let grouped = await getGrouped(projectIndex);
    if (project) grouped = mergeWithStatic(project, grouped);
    for (const cat of ["user", "admin", "mobile"]) {
      if (grouped[cat]?.length) return grouped[cat][0];
    }
    return null;
  }

  /** @deprecated 使用 getFirstDetailImage */
  async function getCoverUrl(projectIndex, project) {
    const first = await getFirstDetailImage(projectIndex, project);
    return first?.url ?? null;
  }

  async function getStats(totalProjects) {
    const all = await getAll();
    const projectSet = new Set(all.map((r) => r.projectIndex));
    return {
      imageCount: all.length,
      projectsWithImages: projectSet.size,
      total: totalProjects,
      missing: totalProjects - projectSet.size,
    };
  }

  async function clearAll() {
    const all = await getAll();
    all.forEach((r) => revokeUrl(r.id));
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE, "readwrite");
      tx.objectStore(STORE).clear();
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  }

  function suggestFileName(projectIndex, title, category, seq) {
    const num = String(projectIndex + 1).padStart(2, "0");
    const slug = title.replace(/[「」"'""]/g, "").slice(0, 16).replace(/\s+/g, "-");
    return `${num}-${slug || "project"}-${category}-${seq}.jpg`;
  }

  /**
   * 将若干项目序号下的配图迁移到目标项目（更新 id 与 projectIndex）
   * @returns {Promise<number>} 迁移条数
   */
  async function migrateProjectImages(fromIndices, toIndex) {
    const fromList = (Array.isArray(fromIndices) ? fromIndices : [fromIndices]).filter(
      (i) => i !== toIndex
    );
    if (!fromList.length) return 0;

    const all = await getAll();
    const records = all.filter((r) => fromList.includes(r.projectIndex));
    if (!records.length) return 0;

    const db = await openDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE, "readwrite");
      const store = tx.objectStore(STORE);
      let moved = 0;

      for (const rec of records) {
        revokeUrl(rec.id);
        const parsed = parseImageId(rec.id);
        const suffix = `${parsed?.suffix || rec.updatedAt}-mv${toIndex}`;
        const newId = imageId(toIndex, rec.category, suffix);
        store.delete(rec.id);
        store.put({
          ...rec,
          id: newId,
          projectIndex: toIndex,
        });
        moved += 1;
      }

      tx.oncomplete = () => resolve(moved);
      tx.onerror = () => reject(tx.error);
    });
  }

  const MIGRATION_CANGQIONG_TO_KUNSHAN = "guoxin-mig-cangqiong-to-kunshan-v1";
  const MIGRATION_REMOVE_MIGUO = "guoxin-mig-remove-miguo-v1";

  /** 删除指定序号项目配图，并将更大序号的项目整体前移 */
  async function removeProjectAndReindex(removedIndex) {
    const all = await getAll();
    const toDelete = all.filter((r) => r.projectIndex === removedIndex);
    const toShift = all.filter((r) => r.projectIndex > removedIndex);
    if (!toDelete.length && !toShift.length) return { deleted: 0, shifted: 0 };

    const db = await openDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE, "readwrite");
      const store = tx.objectStore(STORE);
      let deleted = 0;
      let shifted = 0;

      for (const rec of toDelete) {
        revokeUrl(rec.id);
        store.delete(rec.id);
        deleted += 1;
      }

      toShift.sort((a, b) => a.projectIndex - b.projectIndex);
      for (const rec of toShift) {
        revokeUrl(rec.id);
        const newIndex = rec.projectIndex - 1;
        const parsed = parseImageId(rec.id);
        const suffix = `${parsed?.suffix || rec.updatedAt}-ri${newIndex}`;
        const newId = imageId(newIndex, rec.category, suffix);
        store.delete(rec.id);
        store.put({
          ...rec,
          id: newId,
          projectIndex: newIndex,
        });
        shifted += 1;
      }

      tx.oncomplete = () => resolve({ deleted, shifted });
      tx.onerror = () => reject(tx.error);
    });
  }

  /** 苍穹 → 昆山；移除米果并重排配图序号 */
  async function runPendingMigrations() {
    const summary = { cangqiong: 0, miguo: { deleted: 0, shifted: 0 }, skipped: [] };

    try {
      if (!localStorage.getItem(MIGRATION_CANGQIONG_TO_KUNSHAN)) {
        summary.cangqiong = await migrateProjectImages([2, 3], 1);
        localStorage.setItem(MIGRATION_CANGQIONG_TO_KUNSHAN, String(summary.cangqiong));
      } else {
        summary.skipped.push("cangqiong");
      }

      if (!localStorage.getItem(MIGRATION_REMOVE_MIGUO)) {
        summary.miguo = await removeProjectAndReindex(0);
        localStorage.setItem(MIGRATION_REMOVE_MIGUO, JSON.stringify(summary.miguo));
      } else {
        summary.skipped.push("miguo");
      }

      return summary;
    } catch (e) {
      console.warn("[ProjectImageStore] migration failed", e);
      return { ...summary, error: e };
    }
  }

  function mergeWithStatic(project, grouped) {
    const staticMap = project.images || {};
    IMAGE_CATEGORIES.forEach(({ id }) => {
      const paths = staticMap[id];
      if (!paths?.length) return;
      paths.forEach((path, i) => {
        grouped[id].push({
          id: `static-${id}-${i}`,
          url: path,
          fileName: path.split("/").pop(),
          static: true,
        });
      });
    });
    return grouped;
  }

  return {
    CATEGORIES: IMAGE_CATEGORIES,
    add,
    removeById,
    removeAllForProject,
    getByProject,
    getGrouped,
    getFirstDetailImage,
    getCoverUrl,
    getAll,
    clearAll,
    getStats,
    suggestFileName,
    mergeWithStatic,
    migrateProjectImages,
    removeProjectAndReindex,
    runPendingMigrations,
    revokeAll() {
      urlCache.forEach((url) => URL.revokeObjectURL(url));
      urlCache.clear();
    },
  };
})();

window.ProjectImageStore = ProjectImageStore;
window.IMAGE_CATEGORIES = IMAGE_CATEGORIES;
