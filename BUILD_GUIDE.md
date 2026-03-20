# OpenNovel IDE 构建指南

## 方案一：GitHub Actions 完整编译（推荐）

由于 VS Code 完整编译需要大量内存（>8GB），推荐使用 GitHub Actions 进行编译。

### 触发构建

1. **推送触发**：推送到 main 分支自动触发
2. **手动触发**：
   - 进入 Actions 页面
   - 选择 "Build VS Code" workflow
   - 点击 "Run workflow"
   - 选择构建目标：`compile` / `compile-web` / `compile-client`

### 下载构建产物

构建完成后，在 Actions 页面的 Artifacts 中下载：

```
vscode-build-{commit-sha}  # 编译产物（out/ 目录）
vscode-sourcemaps-{commit-sha}  # Source maps
```

### 使用 gh CLI 下载

```bash
# 列出最近的 workflow runs
gh run list --workflow=build.yml --limit 5

# 下载产物
gh run download {run-id} --name vscode-build-{commit-sha} --dir ./out
```

---

## 方案二：本地编译（需要大内存机器）

如果本地有足够内存的机器（16GB+ 推荐）：

```bash
# 安装依赖
yarn install

# 编译（需要约 8-12GB 内存）
NODE_OPTIONS="--max-old-space-size=8192" yarn gulp compile

# 或编译 Web 版本
NODE_OPTIONS="--max-old-space-size=8192" yarn gulp compile-web
```

---

## 方案三：Electron + Monaco 方案（轻量级）

如果只需要编辑器和基础功能，可以使用轻量级方案：

```bash
cd /opennovel-ide/packages
yarn install
yarn dev
```

---

## 开发 OpenNovel 扩展

在 VS Code 源码中添加自定义扩展：

```bash
# 创建扩展目录
mkdir -p src/vs/workbench/contrib/opennovel

# 扩展结构
src/vs/workbench/contrib/opennovel/
├── browser/
│   ├── opennovel.contribution.ts
│   ├── opennovelPanel.ts
│   └── media/
│       └── opennovel.css
├── common/
│   └── opennovel.ts
```

---

## 配置后端连接

在 `src/vs/workbench/contrib/opennovel/browser/connection.ts` 中配置：

```typescript
const OPENNOVEL_SERVER_URL = 'http://localhost:6688';
```

---

## 相关文件

| 文件 | 用途 |
|------|------|
| `.github/workflows/build.yml` | CI/CD 构建配置 |
| `.github/workflows/release.yml` | Release 构建配置 |
| `build/gulpfile.js` | Gulp 构建任务 |
| `scripts/code-web.sh` | Web 版本启动脚本 |