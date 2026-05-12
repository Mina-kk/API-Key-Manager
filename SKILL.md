---
name: API Key Manager
description: Build Android APK, run desktop/web versions for the API Key Manager project (Python pywebview + Android WebView app)
---

# API Key Manager 技能文档

## 项目概述

API Key Manager 是一个 API 密钥管理工具，支持三种运行形态：

| 形态 | 技术栈 | 用途 |
|------|--------|------|
| **桌面应用** | Python + pywebview (Chromium) | Windows 原生窗口，带无边框拖拽、最小化/最大化/关闭 |
| **Web 服务器** | Python http.server | 手机/局域网浏览器访问，PWA 可离线缓存 |
| **Android APK** | Android WebView + Gradle | Android 安装包，封装 Web 前端 |

## 项目结构

```
.
├── main.py                  # 入口：判断 --server 参数切换桌面/服务器模式
├── server.py                # HTTP 服务器 + API 端点 + pywebview 桌面窗口
├── data_manager.py          # pywebview JS 桥接 API（导入/导出/窗口控制）
├── index.html               # Web 前端（桌面版，含导入导出、窗口控制按钮）
├── app.js                   # 前端 JS 逻辑
├── style.css                # 前端样式（深色/浅色主题）
├── sw.js                    # Service Worker（PWA 离线缓存）
├── requirements.txt         # Python 依赖：pywebview, pywin32
├── Mina.ico                 # 桌面窗口图标
├── Mina.png                 # APK 图标源文件（用于生成各密度 ic_launcher）
├── README.md
├── SKILL.md                 # 本文件
│
└── apk/                     # Android APK 构建项目
    ├── build.gradle             # 根 Gradle 配置（AGP 8.2.0）
    ├── settings.gradle          # Gradle 设置
    ├── gradle.properties        # JVM 参数、AndroidX、路径检查跳过
    ├── local.properties         # Android SDK 路径
    ├── gradlew.bat              # Gradle Wrapper
    ├── gradle/wrapper/
    │   └── gradle-wrapper.properties  # Gradle 8.2
    └── app/
        ├── build.gradle             # 模块配置（namespace, SDK 34, minSdk 21）
        └── src/main/
            ├── AndroidManifest.xml  # INTERNET 权限, 全屏主题
            ├── java/com/apikeymanager/app/
            │   └── MainActivity.java    # WebView 加载 assets/web/index.html
            ├── res/
            │   ├── mipmap-mdpi/         # 48×48
            │   ├── mipmap-hdpi/         # 72×72
            │   ├── mipmap-xhdpi/        # 96×96
            │   ├── mipmap-xxhdpi/       # 144×144
            │   ├── mipmap-xxxhdpi/      # 192×192
            │   └── values/
            │       ├── strings.xml
            │       └── themes.xml
            └── assets/web/             # APK 的 Web 前端（与桌面版不同）
                ├── index.html              # 移动版：无导入导出、无窗口控制
                ├── app.js                  # 同根目录 app.js（不含 pywebview API）
                ├── style.css               # 同根目录 style.css
                ├── sw.js                   # 同根目录 sw.js
                └── manifest.json           # PWA manifest
```

## 所需工具

### 桌面版/服务器版
| 工具 | 版本 | 说明 |
|------|------|------|
| Python | 3.8+ | 运行时 |
| pip | - | 安装依赖 |
| WebView2 | 系统自带 | pywebview 依赖的 Chromium 运行时 |

安装依赖：
```powershell
pip install -r requirements.txt
```

### Android APK 构建
| 工具 | 版本 | 说明 |
|------|------|------|
| JDK | 17 | 需设置 `JAVA_HOME` 环境变量 |
| Gradle | 8.2 | 可用项目内 `gradlew.bat` 或独立安装 |
| cmdline-tools | 最新 | 含 `sdkmanager`，用于安装 SDK |
| Android SDK | platform 34 + build-tools 34.0.0 | 需设置 `ANDROID_HOME` 环境变量 |

## 运行方式

### 桌面模式（默认）
```powershell
python main.py
```

### 服务器模式（手机/局域网访问）
```powershell
python main.py --server
```
默认端口 `8765`，自定义端口：
```powershell
python main.py --server --port 8080
```

## 构建 APK

### 1. 设置环境变量
```powershell
$env:JAVA_HOME = "JDK安装路径"   # 例如: C:\Program Files\Java\jdk-17
$env:PATH = "$env:JAVA_HOME\bin;$env:PATH"
$env:ANDROID_HOME = "Android SDK路径"  # 例如: C:\Users\用户名\AppData\Local\Android\Sdk
```

### 2. 安装 Android SDK 组件（仅首次）
```powershell
sdkmanager --sdk_root="$env:ANDROID_HOME" --install "platforms;android-34" "build-tools;34.0.0"
```

### 3. 构建 APK
```powershell
# 方式 A：使用项目内的 Gradle Wrapper（推荐）
& ".\apk\gradlew.bat" assembleRelease

# 方式 B：使用独立安装的 Gradle
# & "Gradle安装路径\bin\gradle.bat" assembleRelease --daemon -p ".\apk"
```
输出：`apk/app/build/outputs/apk/release/app-release-unsigned.apk`

### 4. 签名
APK 未签名，需使用 MT 管理器、uber-apk-signer 或 Android Studio 签名后方可安装。

## 双前端说明

项目维护了两套 Web 前端：

| 文件 | 桌面版 (根目录) | APK版 (assets/web/) |
|------|----------------|-------------------|
| `index.html` | 含导入导出按钮、窗口控制按钮 | 仅保留搜索 + 主题切换 |
| `app.js` | 含 `pywebview` API 调用 | 不含 `pywebview` API |
| `style.css` | 完全相同 | 完全相同 |
| `sw.js` | 完全相同 | 完全相同 |

**修改桌面版前端** → 编辑根目录文件
**修改 APK 版前端** → 编辑 `apk/app/src/main/assets/web/` 下文件

> APK 版前端是桌面版的精简版，移除导入导出和窗口控制（手机端不适用）。两套文件是独立副本，需分别修改。

## 更换图标

使用 Pillow 生成各密度 Android 图标：

```powershell
python -c "
from PIL import Image
import os

src = r'Mina.png'                          # 项目根目录的源图标
res_dir = r'apk/app/src/main/res'          # APK 资源目录

sizes = {
    'mipmap-mdpi': 48,
    'mipmap-hdpi': 72,
    'mipmap-xhdpi': 96,
    'mipmap-xxhdpi': 144,
    'mipmap-xxxhdpi': 192
}

img = Image.open(src)
for folder, size in sizes.items():
    out = os.path.join(res_dir, folder, 'ic_launcher.png')
    resized = img.resize((size, size), Image.LANCZOS)
    resized.save(out, 'PNG')
print('Done')
"
```

## 常见问题

### 闪退 (ClassNotFoundException)
- **原因**: `MainActivity.java` 的 `package` 声明与 `build.gradle` 的 `namespace` 不一致
- **修复**: 确保 `namespace = 'com.apikeymanager.app'`，`MainActivity.java` 在 `java/com/apikeymanager/app/` 下，包声明为 `package com.apikeymanager.app;`

### 非 ASCII 路径错误
- **原因**: 项目路径含中文，AGP 8.x 在 Windows 上报错
- **修复**: `gradle.properties` 已包含 `android.overridePathCheck=true`

### WebView 白屏/无法加载
- **原因**: Android 9+ 默认禁用 `file://` 协议
- **修复**: `MainActivity.java` 已包含 `setAllowFileAccess(true)`

### pywebview 窗口不显示
- **原因**: 系统缺少 WebView2 Runtime
- **修复**: 从 Microsoft 官网安装 WebView2 Runtime（或通过 Edge 自动获取）

## 关键文件速查

| 用途 | 路径 |
|------|------|
| Gradle 项目配置 | `apk/build.gradle` |
| App 模块配置 | `apk/app/build.gradle` |
| Manifest | `apk/app/src/main/AndroidManifest.xml` |
| Activity 源码 | `apk/app/src/main/java/com/apikeymanager/app/MainActivity.java` |
| 图标文件 | `apk/app/src/main/res/mipmap-*/ic_launcher.png` |
| APK Web 前端 | `apk/app/src/main/assets/web/` |
| 桌面 Web 前端 | `index.html`, `app.js`, `style.css` |
| 构建产物 (APK) | `apk/app/build/outputs/apk/release/app-release-unsigned.apk` |
