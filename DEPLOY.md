# GitHub Pages 公网发布指南

推送代码到 GitHub 后，会自动打包并发布。访问地址一般为：

```text
https://你的GitHub用户名.github.io/仓库名/
```

例如仓库名为 `guoxin-portfolio`，用户名为 `guoxin-dev`，则地址为：

```text
https://guoxin-dev.github.io/guoxin-portfolio/
```

配图管理页：`https://你的GitHub用户名.github.io/仓库名/image-admin.html`

---

## 你需要准备的东西

| 项目 | 说明 |
|------|------|
| GitHub 账号 | 免费注册：https://github.com/signup |
| Git | 本机安装：https://git-scm.com/download/win |
| 仓库 | 在 GitHub 新建一个**公开**仓库（建议名：`guoxin-portfolio`） |

> 若不想用命令行，可安装 [GitHub Desktop](https://desktop.github.com/)，下面「方式 B」有对应说明。

---

## 方式 A：命令行（推荐）

### 第一步：安装 Git

1. 下载并安装 [Git for Windows](https://git-scm.com/download/win)
2. 安装时保持默认选项即可
3. 安装完成后，**重新打开** PowerShell 或 Cursor 终端
4. 验证是否成功：

```powershell
git --version
```

能显示版本号（如 `git version 2.x`）即可。

### 第二步：注册 / 登录 GitHub

1. 打开 https://github.com 注册账号
2. 记住你的 **用户名**（例如 `zhangsan`）

### 第三步：在 GitHub 创建仓库

1. 登录后点击右上角 **+** → **New repository**
2. 填写：
   - **Repository name**：`guoxin-portfolio`（可自定，访问地址会包含这个名字）
   - **Public**（公开，Pages 免费版需要）
   - **不要**勾选 “Add a README”（避免和本地冲突）
3. 点击 **Create repository**
4. 记下页面上的仓库地址，形如：

```text
https://github.com/你的用户名/guoxin-portfolio.git
```

### 第四步：把本地作品集推送到 GitHub

在 PowerShell 中执行（路径按你的实际目录修改）：

```powershell
cd "C:\Users\Administrator\.cursor\projects\empty-window\guoxin-portfolio"

git init
git add .
git commit -m "作品集上线：GitHub Pages"
git branch -M main
git remote add origin https://github.com/你的用户名/guoxin-portfolio.git
git push -u origin main
```

第一次 `git push` 会弹出浏览器或窗口要求 **登录 GitHub**（可用浏览器账号授权）。

> 若提示需要用户名密码：GitHub 已不支持密码推送，请使用 **Personal Access Token** 作为密码，或改用 GitHub Desktop。  
> 创建 Token：GitHub → Settings → Developer settings → Personal access tokens → Generate new token（勾选 `repo` 权限）。

### 第五步：开启 GitHub Pages

1. 打开你的仓库页面：`https://github.com/你的用户名/guoxin-portfolio`
2. 进入 **Settings** → 左侧 **Pages**
3. **Build and deployment** → **Source** 选择 **GitHub Actions**
4. 若看不到已运行的流程，到 **Actions** 标签页，确认 **Deploy GitHub Pages** 工作流正在运行或已成功

### 第六步：等待发布并访问

1. 在 **Actions** 里等待绿色 ✓（通常 1～3 分钟）
2. 再回到 **Settings → Pages**，顶部会显示：

```text
Your site is live at https://你的用户名.github.io/guoxin-portfolio/
```

3. 用浏览器打开该链接即可分享给别人

---

## 方式 B：GitHub Desktop（不用记命令）

1. 安装 [GitHub Desktop](https://desktop.github.com/) 并登录 GitHub 账号
2. **File → Add local repository**，选择文件夹：

   `C:\Users\Administrator\.cursor\projects\empty-window\guoxin-portfolio`

3. 若提示不是 Git 仓库，点 **create a repository**
4. **Publish repository**：
   - Name：`guoxin-portfolio`
   - 取消勾选 “Keep this code private”（需公开才能免费 Pages）
   - 点击 Publish
5. 在 GitHub 网页打开该仓库 → **Settings → Pages → Source** 选 **GitHub Actions**
6. 在 **Actions** 等待部署完成，按 Pages 页显示的网址访问

---

## 以后如何更新网站

改完 `resume-data.js`、样式或图片后，重新提交并推送：

```powershell
cd "C:\Users\Administrator\.cursor\projects\empty-window\guoxin-portfolio"
git add .
git commit -m "更新作品集内容"
git push
```

推送后 Actions 会自动重新发布，约 1～3 分钟生效。

---

## 配图上线说明（重要）

本机 **配图管理** 里上传的图片存在浏览器 IndexedDB，**不会**随 Git 上传。

公网访客要看到配图，请用下面 **推荐流程**（一次导出 + 同步 + 推送）：

### 推荐：本地导出 → 同步到仓库 → 推送

1. **本地**打开 `image-admin.html`（双击或用本地服务器）
2. 点击 **「导出 ZIP 包」**，得到 `guoxin-portfolio-images.zip`
3. 在项目目录执行（把 ZIP 路径换成你的下载位置）：

```powershell
cd "C:\Users\Administrator\.cursor\projects\empty-window\guoxin-portfolio"
node scripts/sync-images-from-zip.mjs "C:\Users\Administrator\Downloads\guoxin-portfolio-images.zip"
```

4. 提交并推送：

```powershell
git add images/projects resume-data.js
git commit -m "同步项目配图到公网"
git push
```

5. 等待 GitHub Actions 部署完成（约 1～3 分钟），刷新线上站点即可

脚本会自动：

- 解压图片到 `images/projects/`
- 在 `resume-data.js` 各项目下写入 `images: { user, admin, mobile }` 路径

### 备选：仅导入到某个浏览器（不适合给访客看）

在 **线上** 打开 `.../image-admin.html` → **「导入 ZIP 包」**，图片只存在该浏览器 IndexedDB，**其他设备/访客仍看不到**。要给所有人看请用上面的推荐流程。

### 为什么本机有图、别的设备没有？

| 存储位置 | 谁能看到 |
|----------|----------|
| 浏览器 IndexedDB（配图管理上传） | **仅本机该浏览器** |
| `images/projects/` + `resume-data.js`（git push） | **所有设备、所有访客** |

本机打开线上地址时，浏览器会读本机 IndexedDB 里的图，所以你能看到；手机或同事电脑没有这份数据，就显示空白。**必须执行上面的「导出 → sync → push」流程。**

---

## 常见问题

### 打开 Pages 地址是 404

- 确认 **Settings → Pages** 的 Source 为 **GitHub Actions**，不是 “Deploy from a branch”
- 到 **Actions** 查看最近一次部署是否失败（红色 ×）
- 新站有时需等待 5～10 分钟再刷新

### `git` 命令找不到

- 安装 Git 后**重启终端**，或重启 Cursor

### 想用自己的域名

- 仓库 **Settings → Pages → Custom domain** 填写域名，并按提示在域名服务商添加 DNS 记录

---

## 仓库里和发布相关的文件

| 文件 | 作用 |
|------|------|
| `.github/workflows/deploy-pages.yml` | 自动打包 `dist` 并发布 |
| `scripts/build-deploy.mjs` | 生成可上线的静态文件 |
| `.gitignore` | 排除 `node_modules`、`dist` 等 |

本地可手动试打包：

```powershell
d:\cursor\cursor\resources\app\resources\helpers\node.exe scripts/build-deploy.mjs
```

会在 `dist/` 生成与线上一致的文件（仅用于检查，不必手动上传）。
