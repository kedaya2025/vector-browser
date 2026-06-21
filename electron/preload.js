const { contextBridge, ipcRenderer } = require('electron')

contextBridge.exposeInMainWorld('electronAPI', {
  // 浏览器环境管理
  getBrowserList: () => ipcRenderer.invoke('getBrowserList'),
  setBrowserList: (data) => ipcRenderer.invoke('setBrowserList', data),
  deleteBrowser: (id) => ipcRenderer.invoke('deleteBrowser', id),
  launchBrowser: (id) => ipcRenderer.invoke('launchBrowser', id),
  getRuningBrowser: () => ipcRenderer.invoke('getRuningBrowser'),
  getBrowserVersion: () => ipcRenderer.invoke('getBrowserVersion'),

  // 全局数据
  getGlobalData: () => ipcRenderer.invoke('getGlobalData'),
  setGlobalData: (jsonStr) => ipcRenderer.invoke('setGlobalData', jsonStr),

  // 代理检测
  checkProxy: (proxyUrl) => ipcRenderer.invoke('checkProxy', proxyUrl),

  // 工具
  openExternal: (url) => ipcRenderer.invoke('openExternal', url),
  openFolder: (path) => ipcRenderer.invoke('openFolder', path),

  // 监听浏览器关闭事件
  onBrowserClosed: (callback) => {
    ipcRenderer.on('browserClosed', (event, id) => callback(id))
  },
})
