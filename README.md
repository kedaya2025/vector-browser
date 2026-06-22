# IO Browser

基于 Chromium 的浏览器环境管理工具，支持多环境隔离与指纹配置管理。

## 功能

- **环境管理**：创建、编辑、启动、删除独立浏览器环境
- **环境分组**：按分组组织管理浏览器环境
- **插件管理**：浏览器扩展插件市场与安装管理
- **指纹配置**：User-Agent、代理、语言、时区、WebRTC、地理位置、Canvas/WebGL 等
- **批量操作**：批量创建、启动、删除、分组管理
- **数据导入导出**：JSON 格式环境配置导入导出

## 技术栈

- **前端**：Vue 2 + Element UI
- **桌面框架**：Electron

## 开发

```bash
# 安装依赖
cd server && npm install

# 开发模式
npm run electron:dev

# 构建
npm run electron:build
```

## 许可证

MIT License - 详见 [LICENSE](LICENSE)
