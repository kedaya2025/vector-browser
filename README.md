# Vector Browser

<p align="center">
  <img src="static/Vector Browser.png" alt="Vector Browser" width="100%">
</p>

[![Build & Release](https://github.com/kedaya2025/vector-browser/actions/workflows/build.yml/badge.svg)](https://github.com/kedaya2025/vector-browser/actions/workflows/build.yml)
[![License: MIT](https://img.shields.io/badge/License-MIT-green.svg)](LICENSE)
[![Platform](https://img.shields.io/badge/Platform-Windows-blue.svg)]()
[![Electron](https://img.shields.io/badge/Electron-33-purple.svg)]()
[![Vue](https://img.shields.io/badge/Vue-2-brightgreen.svg)]()

[English](#english) | [中文](#中文)

---

## English

### Overview

Vector Browser is a Chromium-based browser environment management tool. It enables creating, isolating, and managing multiple independent browser profiles with unique fingerprints — ideal for multi-account management, web testing, and privacy protection.

### Features

- **Multi-Instance Management** — Create, edit, launch, and delete independent browser environments
- **Fingerprint Configuration** — User-Agent, language, timezone, WebRTC, geolocation, Canvas/WebGL, screen resolution, fonts, and more
- **Chrome for Testing** — Download and manage specific Chrome versions directly from Google's official CDN
- **IP Geolocation** — Automatic IP detection with 4 free query sources (ip-api.com, ipapi.co, ipwho.is, freeipapi.com) and per-instance override
- **Extension Management** — Install, enable, disable, and uninstall browser extensions (CRX format)
- **Group Organization** — Organize browser profiles into groups for batch operations
- **Batch Operations** — Batch create, start, delete, and manage groups
- **Import/Export** — JSON format environment configuration import and export
- **Profile Isolation** — Each instance has its own user data directory, cookies, cache, and session

### Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | Vue 2 + Element UI |
| Desktop | Electron 33 |
| Engine | Chromium (Chrome for Testing) |
| Build | electron-builder |
| Language | JavaScript |

### Getting Started

#### Prerequisites

- [Node.js](https://nodejs.org/) v18+
- npm v8+
- Windows 10/11 (x64)

#### Installation

```bash
git clone https://github.com/kedaya2025/vector-browser.git
cd vector-browser
npm install
```

#### Development

```bash
npm run electron:dev
```

#### Build

```bash
# Portable executable (no installer)
npm run electron:build:portable

# NSIS installer
npm run dist

# Unpacked directory (for debugging)
npm run electron:build
```

#### Build Output

```
build/
  win-unpacked/           # Unpacked app directory
    Vector Browser.exe    # Main executable
  VectorBrowser-x.x.x-portable.exe   # Portable build
  VectorBrowser-Setup-x.x.x.exe      # NSIS installer
```

### Project Structure

```
vector-browser/
├── electron/             # Electron main process
│   ├── main.js          # Main process entry, IPC handlers
│   └── preload.js       # Context bridge API
├── src/
│   ├── api/             # Native API bridge (IPC mapping)
│   ├── components/      # Reusable Vue components
│   │   └── ChromeVersionSelector.vue   # Chrome version picker
│   ├── lang/            # i18n language files (zh/en)
│   ├── styles/          # Global SCSS styles
│   ├── utils/           # Utility functions & fingerprint generators
│   └── views/
│       ├── browser/     # Browser management page
│       ├── settings/    # Settings page
│       └── group/       # Group management page
├── static/              # Static assets (icons, images)
├── scripts/             # Build & utility scripts
├── .github/workflows/   # GitHub Actions CI/CD
└── package.json
```

### Fingerprint Profiles

Each browser instance supports independent configuration of:

| Category | Fields |
|----------|--------|
| Identity | Name, Group, OS Platform |
| Browser | Chrome Version, User-Agent, Sec-CH-UA, UA Full Version |
| Network | IP Geolocation (auto-query), Language, Timezone |
| Hardware | Screen Resolution, CPU Cores, Memory, Device Name, MAC Address |
| Rendering | Canvas Noise, WebGL Vendor/Renderer, AudioContext |
| Privacy | WebRTC Policy, Do Not Track, Port Scan Protection |
| Content | Cookies (JSON import), Homepage, Extensions |

### IP Query Sources

Vector Browser includes 4 built-in free IP geolocation APIs with automatic failover:

| Source | URL | Rate Limit |
|--------|-----|------------|
| ip-api.com | http://ip-api.com/json/ | 45 req/min |
| ipapi.co | https://ipapi.co/json/ | 1K req/day |
| ipwho.is | https://ipwho.is/ | 10K req/month |
| freeipapi.com | https://freeipapi.com/api/json | Unlimited |

Query priority: Instance override > Global setting > Auto-failover

### GitHub Actions

The project uses GitHub Actions for automated builds. When you push a version tag:

```bash
git tag v1.0.0
git push origin v1.0.0
```

The workflow will automatically:
1. Build the frontend assets
2. Package the portable executable
3. Create the NSIS installer
4. Create a GitHub Release with both artifacts

### License

[MIT License](LICENSE) - Copyright (c) 2026 Vector Browser

---

## 中文

### 概述

Vector Browser 是一款基于 Chromium 的浏览器环境管理工具，支持创建、隔离和管理多个独立的浏览器配置文件，每个实例拥有独特的指纹信息。适用于多账号管理、网页测试和隐私保护等场景。

### 功能特性

- **多实例管理** — 创建、编辑、启动、删除独立浏览器环境
- **指纹配置** — User-Agent、语言、时区、WebRTC、地理位置、Canvas/WebGL、屏幕分辨率、字体等
- **Chrome 内核管理** — 直接从 Google 官方 CDN 下载和管理指定版本的 Chrome
- **IP 地理定位** — 自动 IP 检测，内置 4 个免费查询源（ip-api.com、ipapi.co、ipwho.is、freeipapi.com），支持实例级覆盖
- **插件管理** — 安装、启用、禁用、卸载浏览器扩展（CRX 格式）
- **分组管理** — 按分组组织浏览器配置，支持批量操作
- **批量操作** — 批量创建、启动、删除、分组管理
- **数据导入导出** — JSON 格式环境配置导入导出
- **配置隔离** — 每个实例拥有独立的用户数据目录、Cookie、缓存和会话

### 技术栈

| 层级 | 技术 |
|------|------|
| 前端 | Vue 2 + Element UI |
| 桌面框架 | Electron 33 |
| 浏览器内核 | Chromium (Chrome for Testing) |
| 构建工具 | electron-builder |
| 开发语言 | JavaScript |

### 快速开始

#### 环境要求

- [Node.js](https://nodejs.org/) v18+
- npm v8+
- Windows 10/11 (x64)

#### 安装

```bash
git clone https://github.com/kedaya2025/vector-browser.git
cd vector-browser
npm install
```

#### 开发

```bash
npm run electron:dev
```

#### 构建

```bash
# 便携版（免安装）
npm run electron:build:portable

# NSIS 安装包
npm run dist

# 解压版（调试用）
npm run electron:build
```

#### 构建产物

```
build/
  win-unpacked/           # 解压版应用目录
    Vector Browser.exe    # 主程序
  VectorBrowser-x.x.x-portable.exe   # 便携版
  VectorBrowser-Setup-x.x.x.exe      # NSIS 安装包
```

### 项目结构

```
vector-browser/
├── electron/             # Electron 主进程
│   ├── main.js          # 主进程入口，IPC 处理器
│   └── preload.js       # 上下文桥接 API
├── src/
│   ├── api/             # 原生 API 桥接（IPC 映射）
│   ├── components/      # 可复用 Vue 组件
│   │   └── ChromeVersionSelector.vue   # Chrome 版本选择器
│   ├── lang/            # 国际化语言文件（中/英）
│   ├── styles/          # 全局 SCSS 样式
│   ├── utils/           # 工具函数 & 指纹生成器
│   └── views/
│       ├── browser/     # 浏览器管理页面
│       ├── settings/    # 设置页面
│       └── group/       # 分组管理页面
├── static/              # 静态资源（图标、图片）
├── scripts/             # 构建 & 工具脚本
├── .github/workflows/   # GitHub Actions CI/CD
└── package.json
```

### 指纹配置文件

每个浏览器实例支持独立配置以下信息：

| 类别 | 字段 |
|------|------|
| 身份信息 | 名称、分组、操作系统平台 |
| 浏览器 | Chrome 版本、User-Agent、Sec-CH-UA、UA Full Version |
| 网络 | IP 地理定位（自动查询）、语言、时区 |
| 硬件 | 屏幕分辨率、CPU 核数、内存、设备名称、MAC 地址 |
| 渲染 | Canvas 噪声、WebGL 厂商/渲染器、AudioContext |
| 隐私 | WebRTC 策略、Do Not Track、端口扫描保护 |
| 内容 | Cookie（JSON 导入）、主页、扩展插件 |

### IP 查询源

Vector Browser 内置 4 个免费 IP 地理定位 API，支持自动容错：

| 来源 | 地址 | 频率限制 |
|------|------|----------|
| ip-api.com | http://ip-api.com/json/ | 45 次/分钟 |
| ipapi.co | https://ipapi.co/json/ | 1000 次/天 |
| ipwho.is | https://ipwho.is/ | 10000 次/月 |
| freeipapi.com | https://freeipapi.com/api/json | 无限制 |

查询优先级：实例级覆盖 > 全局设置 > 自动容错

### GitHub Actions 自动构建

项目使用 GitHub Actions 实现自动化构建。推送版本标签时自动触发：

```bash
git tag v1.0.0
git push origin v1.0.0
```

工作流将自动：
1. 构建前端资源
2. 打包便携版可执行文件
3. 创建 NSIS 安装包
4. 创建 GitHub Release 并上传两个构建产物

### 许可证

[MIT License](LICENSE) - Copyright (c) 2026 Vector Browser
