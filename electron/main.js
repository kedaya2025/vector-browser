const { app, BrowserWindow, ipcMain, shell } = require('electron')
const path = require('path')
const fs = require('fs')
const { spawn } = require('child_process')

const isDev = !app.isPackaged
const VERSION = '1.0.0'

// 数据目录：便携模式下放在应用同级
const DATA_DIR = isDev
  ? path.join(__dirname, '..', 'data')
  : path.join(path.dirname(app.getPath('exe')), 'data')
const PROFILES_DIR = path.join(DATA_DIR, 'Profiles')
const CONFIG_FILE = path.join(DATA_DIR, 'config.json')
const BROWSER_LIST_FILE = path.join(DATA_DIR, 'browserList.json')
const GLOBAL_DATA_FILE = path.join(DATA_DIR, 'globalData.json')

// 浏览器内核路径：Chrome-bin 文件夹
const CHROME_BIN_DIR = isDev
  ? path.join(__dirname, '..', '..', '..', 'cloakbrowser')
  : path.join(path.dirname(app.getPath('exe')), 'Chrome-bin')

let mainWindow = null
const runningBrowsers = new Map() // id -> ChildProcess

function ensureDir(dir) {
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true })
}

function readJSON(filePath, fallback = {}) {
  try {
    if (fs.existsSync(filePath)) {
      return JSON.parse(fs.readFileSync(filePath, 'utf-8'))
    }
  } catch (e) {
    console.error(`readJSON error: ${filePath}`, e)
  }
  return fallback
}

function writeJSON(filePath, data) {
  ensureDir(path.dirname(filePath))
  fs.writeFileSync(filePath, JSON.stringify(data, null, 2), 'utf-8')
}

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1400,
    height: 900,
    minWidth: 1000,
    minHeight: 600,
    title: 'VirtualBrowser',
    icon: path.join(__dirname, '..', 'public', 'favicon.ico'),
    autoHideMenuBar: true,
    menuBarVisible: false,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
      webSecurity: false,
    },
  })

  // 完全移除原生菜单栏
  mainWindow.setMenu(null)

  if (isDev) {
    mainWindow.loadURL('http://localhost:9527')
    // mainWindow.webContents.openDevTools()
  } else {
    mainWindow.loadFile(path.join(__dirname, '..', 'dist', 'server', 'index.html'))
  }

  mainWindow.on('closed', () => {
    mainWindow = null
    // 关闭所有浏览器进程
    for (const [id, proc] of runningBrowsers) {
      try { proc.kill() } catch {}
    }
    runningBrowsers.clear()
  })
}

// ============ IPC Handlers ============

// 获取浏览器环境列表
ipcMain.handle('getBrowserList', async () => {
  const data = readJSON(BROWSER_LIST_FILE, { users: [] })
  return { data }
})

// 保存浏览器环境列表
ipcMain.handle('setBrowserList', async (event, data) => {
  writeJSON(BROWSER_LIST_FILE, data)
  return { success: true }
})

// 删除浏览器环境
ipcMain.handle('deleteBrowser', async (event, id) => {
  // 先关闭运行中的进程
  if (runningBrowsers.has(id)) {
    try { runningBrowsers.get(id).kill() } catch {}
    runningBrowsers.delete(id)
  }
  // 删除 profile 目录
  const profileDir = path.join(PROFILES_DIR, String(id))
  if (fs.existsSync(profileDir)) {
    fs.rmSync(profileDir, { recursive: true, force: true })
  }
  return { success: true }
})

// 启动浏览器
ipcMain.handle('launchBrowser', async (event, idStr) => {
  const id = parseInt(idStr, 10)
  const profileDir = path.join(PROFILES_DIR, String(id))
  ensureDir(profileDir)

  // 读取浏览器配置获取指纹参数
  const browserList = readJSON(BROWSER_LIST_FILE, { users: [] })
  const profile = browserList.users.find(u => u.id === id)

  const chromeExe = path.join(CHROME_BIN_DIR, 'chrome.exe')
  if (!fs.existsSync(chromeExe)) {
    return { success: false, error: `Chrome executable not found: ${chromeExe}` }
  }

  // 构建启动参数
  const args = [
    `--user-data-dir=${profileDir}`,
    '--no-first-run',
    '--disable-default-apps',
    '--disable-extensions',
    '--disable-popup-blocking',
  ]

  if (profile) {
    // 代理
    if (profile.proxy && profile.proxy.host) {
      const { protocol = 'http', host, port, username, password } = profile.proxy
      let proxyUrl = `${protocol}://${host}:${port}`
      args.push(`--proxy-server=${proxyUrl}`)
    }
  }

  // 启动进程
  const child = spawn(chromeExe, args, {
    detached: false,
    stdio: 'ignore',
  })

  runningBrowsers.set(id, child)
  child.on('exit', () => {
    runningBrowsers.delete(id)
    // 通知前端更新状态
    if (mainWindow && !mainWindow.isDestroyed()) {
      mainWindow.webContents.send('browserClosed', id)
    }
  })
  child.on('error', (err) => {
    console.error(`Browser ${id} launch error:`, err)
    runningBrowsers.delete(id)
  })

  return { success: true }
})

// 获取运行中的浏览器 ID
ipcMain.handle('getRuningBrowser', async () => {
  return Array.from(runningBrowsers.keys())
})

// 获取版本号
ipcMain.handle('getBrowserVersion', async () => {
  return { version: VERSION }
})

// 获取全局数据
ipcMain.handle('getGlobalData', async () => {
  const data = readJSON(GLOBAL_DATA_FILE, {})
  return { data: JSON.stringify(data) }
})

// 设置全局数据
ipcMain.handle('setGlobalData', async (event, jsonStr) => {
  try {
    const data = JSON.parse(jsonStr)
    writeJSON(GLOBAL_DATA_FILE, data)
  } catch {}
  return { success: true }
})

// 检测代理
ipcMain.handle('checkProxy', async (event, proxyUrl) => {
  try {
    // 简单检测：用 fetch 测试
    const resp = await fetch('http://httpbin.org/ip', {
      // 注意：实际代理检测需要更复杂的实现
      signal: AbortSignal.timeout(5000),
    })
    const data = await resp.json()
    return { success: true, ip: data.origin }
  } catch (e) {
    return { success: false, error: e.message }
  }
})

// 打开外部链接
ipcMain.handle('openExternal', async (event, url) => {
  shell.openExternal(url)
})

// 打开文件夹
ipcMain.handle('openFolder', async (event, folderPath) => {
  shell.openPath(folderPath)
})

// ============ App Lifecycle ============

app.whenReady().then(() => {
  ensureDir(DATA_DIR)
  ensureDir(PROFILES_DIR)
  createWindow()
})

app.on('window-all-closed', () => {
  app.quit()
})

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow()
  }
})
