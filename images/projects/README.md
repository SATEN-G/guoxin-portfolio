# Banner 项目配图说明

把每个项目的展示图放在本目录，然后在 `resume-data.js` 里为对应项目填写 `image` 字段。

## 操作步骤

1. 准备图片（建议 **16:9 或 4:3**，宽度 ≥ 1200px，JPG/PNG/WebP）
2. 复制到本文件夹，例如：`ganghang.jpg`
3. 打开项目根目录的 `resume-data.js`
4. 在对应项目对象里增加一行：

```javascript
{
  icon: "GOV",
  image: "images/projects/ganghang.jpg",  // ← 添加这一行
  tag: "G端 · 港航 · 2022-2025",
  title: "台州港航警戒潮位系统",
  desc: "..."
}
```

5. 保存后刷新浏览器中的 `index.html`

## 命名建议

| 文件名示例 | 对应项目 |
|-----------|---------|
| `01-ganghang.jpg` | 台州港航警戒潮位 |
| `02-metaverse.jpg` | 米果元宇宙数字园区 |
| `03-cangqiong.jpg` | 苍穹内部管理系统 |

不填 `image` 时，Banner 左侧仍显示原来的文字图标（如 CRM、GOV）。

## 注意

- 路径相对于网站根目录（与 `index.html` 同级）
- 用 `file://` 直接打开页面时，部分浏览器对本地图片限制较严；若图片不显示，可用本地服务器打开（见根目录 README）
