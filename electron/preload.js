const { contextBridge, ipcRenderer } = require('electron')

contextBridge.exposeInMainWorld('electronAPI', {
  // 浏览器环境管理
  getBrowserList: () => ipcRenderer.invoke('getBrowserList'),
  setBrowserList: (data) => ipcRenderer.invoke('setBrowserList', data),
  deleteBrowser: (id) => ipcRenderer.invoke('deleteBrowser', id),
  launchBrowser: (id) => ipcRenderer.invoke('launchBrowser', id),
  getRuningBrowser: () => ipcRenderer.invoke('getRuningBrowser'),
  getBrowserVersion: () => ipcRenderer.invoke('getBrowserVersion'),
  getEngineList: () => ipcRenderer.invoke('getEngineList'),

  // 分组管理
  getGroupList: () => ipcRenderer.invoke('getGroupList'),
  setGroupList: (data) => ipcRenderer.invoke('setGroupList', data),

  // 插件管理
  getExtensions: () => ipcRenderer.invoke('getExtensions'),
  installExtension: (data) => ipcRenderer.invoke('installExtension', data),
  uninstallExtension: (extId) => ipcRenderer.invoke('uninstallExtension', extId),
  toggleExtension: (extId) => ipcRenderer.invoke('toggleExtension', extId),

  // 全局数据
  getGlobalData: () => ipcRenderer.invoke('getGlobalData'),
  setGlobalData: (jsonStr) => ipcRenderer.invoke('setGlobalData', jsonStr),

  // 代理检测
  checkProxy: (proxyUrl) => ipcRenderer.invoke('checkProxy', proxyUrl),

  // 工具
  openExternal: (url) => ipcRenderer.invoke('openExternal', url),
  openFolder: (path) => ipcRenderer.invoke('openFolder', path),
  showOpenDialog: (options) => ipcRenderer.invoke('showOpenDialog', options),

  // 监听浏览器关闭事件
  onBrowserClosed: (callback) => {
    ipcRenderer.on('browserClosed', (event, id) => callback(id))
  },
})
