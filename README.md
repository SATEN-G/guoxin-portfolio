# 郭鑫 · 产品经理作品集

黄黑科技风单页作品集网站，包含项目轮播 Banner、个人简介与专业技能展示。

## 公网发布（GitHub Pages）

详见 **[DEPLOY.md](./DEPLOY.md)**：安装 Git → 创建 GitHub 仓库 → 推送代码 → 在仓库 Settings 里开启 **Pages → GitHub Actions**，即可获得 `https://用户名.github.io/仓库名/` 访问地址。

## 本地预览

在项目目录下启动静态服务器，例如：

```bash
npx serve .
```

或直接用浏览器打开 `index.html`。

## 结构

- `index.html` — 页面结构
- `styles.css` — 黄黑科技风样式
- `script.js` — Banner 每 5 秒自动翻页、技能卡片渲染

## 数据来源

项目与简介内容来自本机 **《郭鑫简历.pdf》**（微信文件目录），结构化后写入 `resume-data.js`。

更新简历后重新同步文本：

```bash
node extract-resume-to-data.mjs
```

然后按 `resume-text-latest.txt` 更新 `resume-data.js` 中的 `projects` 等字段。

## 项目配图管理站（推荐）

打开 **`image-admin.html`** — 专用配图网站：

- 每个项目按 **用户端 / 后台 / 手机端** 分类，支持**多张图片**
- 点击或拖拽上传（可多选），即时预览与删除
- 作品集 **Banner** 与 **项目详情** 板块自动同步展示
- 支持「导出 ZIP 包」备份图片，用于部署或换电脑

作品集页脚也有「项目配图管理」入口。

### 手动放文件（可选）

1. 把图片放到 `images/projects/`
2. 在 `resume-data.js` 添加 `image: "images/projects/xxx.jpg"`

详见 `images/projects/README.md`。

## 自定义

- 在 `resume-data.js` 中增删项目、修改简介与技能
- 在 `styles.css` 的 `:root` 中调整主题色
