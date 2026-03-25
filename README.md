# OpenNovel IDE

<p align="center">
  <img src="docs/images/logo.png" alt="OpenNovel IDE Logo" width="200">
</p>

<p align="center">
  <strong>AI 驱动的小说创作 IDE</strong>
</p>

<p align="center">
  <a href="#特性">特性</a> •
  <a href="#安装">安装</a> •
  <a href="#快速开始">快速开始</a> •
  <a href="#架构">架构</a> •
  <a href="#文档">文档</a> •
  <a href="#贡献">贡献</a>
</p>

---

## 简介

OpenNovel IDE 是一款基于 [VS Code (MIT)](https://github.com/microsoft/vscode) 二次开发的 AI 辅助小说创作工具。它将 AI Agent 协作能力深度集成到 IDE 中，为小说创作者提供从构思到完稿的全流程辅助。

### 核心理念

- **Agent 协作**：多个专业 Agent 分工协作，各司其职
- **群聊驱动**：用户通过与 Agent 群聊完成创作全流程
- **知识库驱动**：人物、世界观、伏笔自动管理
- **批注审阅**：Agent 批注 + 用户决策的审阅机制

---

## 特性

### 🤖 八大专业 Agent

| Agent | 职责 | 维护的知识库 |
|-------|------|-------------|
| **天道** | 剧情推演、伏笔管理 | 伏笔数据库 |
| **执笔** | 章节撰写 | - |
| **刘和平** | 人物塑造、一致性检查 | 人物数据库 |
| **世界观守护者** | 世界观一致性检查 | 地图/世界观数据库 |
| **审阅** | 阅读体验评估 | - |
| **观察者** | 知识库更新 | 各知识库 |
| **规划者** | 书籍构思规划（阶段一） | - |
| **调研者** | 外部资料搜索 | - |

### 💬 群聊协作界面

- 类似 QQ/钉钉的群聊 UI
- @Agent 定向提问
- 思考过程折叠显示
- 流式输出（逐字显示）
- 消息引用回复

### 📚 知识库系统

- **人物数据库**：人物属性、关系网络
- **世界观数据库**：设定、地理、势力
- **伏笔池**：埋设、触发状态管理
- **会话记录**：群聊历史存档

### 📖 书籍管理

- 创建书籍并配置目标字数、类型
- 章节进度可视化
- 多格式导出（TXT/Markdown/PDF/Word）
- WebDAV 同步（规划中）

### 🎨 三种使用模式

| 模式 | 启动命令 | 说明 |
|------|---------|------|
| IDE 模式 | `opennovel` | 桌面客户端（Electron） |
| Web 模式 | `opennovel -web` | 浏览器访问 |
| 扩展模式 | `opennovel -ext` | VS Code 插件 |

---

## 安装

### 前置要求

- Node.js 18.x 或更高版本
- Yarn 1.22.x
- Python 3.8+（用于 native 模块编译）
- C++ 编译工具链

### 从源码构建

```bash
# 克隆仓库
git clone https://github.com/your-org/opennovel-ide.git
cd opennovel-ide

# 安装依赖
yarn install

# 构建
yarn gulp vscode-win32-x64-min  # Windows
yarn gulp vscode-darwin-x64-min # macOS
yarn gulp vscode-linux-x64-min  # Linux

# Web 版本
yarn gulp vscode-web
```

### 下载预构建版本

前往 [Releases](https://github.com/your-org/opennovel-ide/releases) 页面下载对应平台的安装包。

---

## 快速开始

### 1. 连接服务器

首次启动时，输入 OpenNovel 后端服务器地址：

```
服务器地址: your-server.com
端口: 6688
```

### 2. 创建书籍

在资源管理器中点击「+ 新建书籍」，填写：
- 书名
- 类型/题材
- 目标字数
- 简介

### 3. 构思阶段（阶段一）

与**规划者** Agent 群聊讨论：
- 书籍类型和风格
- 主要人物设定
- 剧情梗概

满意后点击「构思完成」进入撰写阶段。

### 4. 撰写阶段（阶段二/三）

1. 在群聊中请求「推演」
2. **天道**推演剧情走向，给出多个选项
3. 用户选择或提出修改意见
4. **刘和平**审阅人物一致性
5. **世界观守护者**审阅设定一致性
6. 用户确认后，**执笔**撰写章节
7. 各 Agent 更新知识库

### 5. 导出书籍

右键书籍节点 → 导出 → 选择格式

---

## 架构

```
┌─────────────────────────────────────────────────────────────┐
│                    部署机 (后端 opennovel-core)              │
│                                                             │
│   ┌─────────────────────────────────────────────────────┐  │
│   │              OpenNovel 后端服务                      │  │
│   │  ┌─────────┐  ┌─────────┐  ┌─────────────────────┐  │  │
│   │  │ IDE端口 │  │ Web端口 │  │ Extension端口       │  │  │
│   │  │  :6688  │  │  :80    │  │  :6689              │  │  │
│   │  └────┬────┘  └────┬────┘  └─────────┬───────────┘  │  │
│   └───────┼────────────┼─────────────────┼──────────────┘  │
│           │            │                 │                  │
└───────────┼────────────┼─────────────────┼──────────────────┘
            │            │                 │
   ┌────────┴───┐  ┌─────┴─────┐   ┌──────┴──────┐
   │ OpenNovel  │  │  浏览器   │   │ VS Code +   │
   │ -ide 客户端│  │  (Web)    │   │ OpenNovel   │
   │ (Electron) │  │           │   │ 插件        │
   └────────────┘  └───────────┘   └─────────────┘
```

### 目录结构

```
opennovel-ide/
├── src/vs/workbench/contrib/opennovel/  # OpenNovel 核心模块
│   ├── browser/
│   │   ├── panels/           # 面板组件
│   │   │   ├── chatPanel.ts  # 群聊面板
│   │   │   └── agentPanel.ts # Agent 状态面板
│   │   ├── views/            # 视图组件
│   │   │   └── bookExplorerView.ts  # 书籍资源管理器
│   │   └── pages/            # 页面组件
│   │       └── welcomePage.ts       # 欢迎页
│   └── common/
│       └── opennovel.ts      # 服务接口定义
├── docs/                     # 文档
│   └── DESIGN_SPEC_V1.md     # 设计规格说明书
└── extensions/               # 内置扩展
```

---

## 文档

- [设计规格说明书 v1.0](docs/DESIGN_SPEC_V1.md) - 完整的产品设计文档
- [API 文档](docs/API.md) - 后端 API 接口说明（规划中）
- [开发指南](docs/DEVELOPMENT.md) - 本地开发环境搭建（规划中）

---

## 技术栈

- **前端框架**：VS Code (Code - OSS)
- **桌面框架**：Electron
- **语言**：TypeScript
- **样式**：CSS
- **后端通信**：HTTP + SSE (Server-Sent Events)

---

## 贡献

我们欢迎各种形式的贡献！

### 贡献方式

1. Fork 本仓库
2. 创建特性分支 (`git checkout -b feature/amazing-feature`)
3. 提交更改 (`git commit -m 'feat: add amazing feature'`)
4. 推送到分支 (`git push origin feature/amazing-feature`)
5. 创建 Pull Request

### 代码规范

- 遵循 VS Code 代码规范
- 使用 TypeScript 编写新代码
- 添加必要的注释和文档

---

## 许可证

本项目基于 [GNU Affero General Public License v3.0 (AGPL-3.0)](LICENSE) 开源。

### AGPL-3.0 关键条款

- **Copyleft**：任何对本项目的修改和衍生作品必须以相同许可证开源
- **网络条款**：通过网络提供服务时，必须向用户提供源代码
- **专利授权**：贡献者自动授予专利许可

部分代码源自 [Visual Studio Code](https://github.com/microsoft/vscode)，遵循其原始 MIT 许可证。

---

## 致谢

- [Microsoft VS Code](https://github.com/microsoft/vscode) - 强大的开源代码编辑器
- [Electron](https://www.electronjs.org/) - 跨平台桌面应用框架
- 所有贡献者和用户

---

<p align="center">
  Made with ❤️ by OpenNovel Team
</p>
