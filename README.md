# API Key Manager

一个功能丰富的 API 密钥管理桌面应用，支持多平台运行（Windows 桌面端 / Web 服务端 / Android APK）。

## 功能特性

- **API 密钥管理** — 集中管理多个 API Key，支持名称、基础 URL、密钥和模型列表
- **预设模板** — 内置 OpenAI、DeepSeek、Claude、Gemini 等主流 API 提供商预设
- **搜索筛选** — 实时搜索过滤 API Key（按名称、URL、密钥、模型）
- **连接测试** — 一键测试 API 连通性并自动导入可用模型
- **对话测试** — 直接调用模型聊天接口进行对话测试
- **操作日志** — 每条 API Key 独立记录操作历史（测试、对话、手动日志）
- **数据导入/导出** — 支持 JSON 文件导出/导入和剪贴板导入
- **深色/浅色主题** — 支持一键切换
- **PWA 支持** — 浏览器端支持离线缓存
- **桌面窗口控制** — 无边框窗口，支持拖拽、最小化、最大化、关闭
- **Android APK** — 内置 Android WebView 封装，可构建 APK 安装包

## 快速开始

### 环境要求

- Python 3.8+
- pip

### 安装依赖

```bash
pip install -r requirements.txt
```

### 运行

**桌面模式（默认）：**

```bash
python main.py
```

**服务器模式（手机/局域网访问）：**

```bash
python main.py --server
```

默认端口 `8765`，可通过 `--port` 指定：

```bash
python main.py --server --port 8080
```

## 项目结构

```
├── main.py              # 程序入口
├── server.py            # HTTP 服务器 & API 端点
├── data_manager.py      # 数据管理（pywebview JS 桥接）
├── index.html           # Web 前端页面
├── app.js               # 前端逻辑（CRUD、测试、导入导出）
├── style.css            # 前端样式（深色/浅色主题）
├── sw.js                # Service Worker（PWA 离线缓存）
├── requirements.txt     # Python 依赖
├── Mina.ico             # 桌面图标
├── Mina.png             # 应用图标
├── apk/                 # Android APK 项目
│   ├── build.gradle
│   ├── settings.gradle
│   ├── gradle.properties
│   ├── local.properties
│   ├── gradlew.bat
│   ├── gradle/
│   └── app/
│       ├── build.gradle
│       └── src/main/
│           ├── AndroidManifest.xml
│           ├── java/com/apikeymanager/app/MainActivity.java
│           ├── res/
│           └── assets/web/       # APK 使用的 Web 前端副本
└── README.md
```

## API 端点

| 端点 | 方法 | 说明 |
|------|------|------|
| `/api/save-file` | POST | 导出文件（系统保存对话框） |
| `/api/open-file` | POST | 导入文件（系统打开对话框） |
| `/api/persist-data` | POST | 持久化数据到本地文件 |
| `/api/load-persisted-data` | POST | 从本地文件加载持久化数据 |

## API Key 格式

```json
{
  "name": "OpenAI",
  "baseUrl": "https://api.openai.com",
  "apiKey": "sk-xxxx",
  "models": ["gpt-4", "gpt-3.5-turbo"]
}
```

## 构建 Android APK

详见 [SKILL.md](./SKILL.md) 中的 APK 构建指南。

## 技术栈

- **后端**: Python, pywebview, http.server
- **前端**: HTML, CSS, JavaScript (原生)
- **桌面**: pywebview (Chromium)
- **Android**: Android WebView, Gradle
