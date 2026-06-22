const { app, BrowserWindow, ipcMain, shell } = require('electron')
const path = require('path')
const fs = require('fs')
const { spawn } = require('child_process')
const AdmZip = require('adm-zip')

const isDev = !app.isPackaged
const VERSION = '1.0.0'

// 数据目录：便携模式下放在应用同级
const DATA_DIR = isDev
  ? path.join(__dirname, '..', 'data')
  : path.join(path.dirname(app.getPath('exe')), 'data')
const PROFILES_DIR = path.join(DATA_DIR, 'Profiles')
const CONFIG_FILE = path.join(DATA_DIR, 'config.json')
const BROWSER_LIST_FILE = path.join(DATA_DIR, 'browserList.json')
const GROUP_LIST_FILE = path.join(DATA_DIR, 'groupList.json')
const GLOBAL_DATA_FILE = path.join(DATA_DIR, 'globalData.json')
const EXTENSIONS_FILE = path.join(DATA_DIR, 'extensions.json')
const EXTENSIONS_DIR = path.join(DATA_DIR, 'extensions')

// 浏览器引擎根目录：browser 文件夹
const BROWSER_ENGINES_DIR = isDev
  ? path.join(__dirname, '..', '..', '..', 'browser')
  : path.join(path.dirname(app.getPath('exe')), 'browser')

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
    title: 'iBrowser',
    icon: isDev
      ? path.join(__dirname, '..', 'static', 'logo.ico')
      : path.join(path.dirname(app.getPath('exe')), 'resources', 'logo.ico'),
    autoHideMenuBar: true,
    menuBarVisible: false,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
      webSecurity: false
    }
  })

  // 完全移除原生菜单栏
  mainWindow.setMenu(null)

  if (isDev) {
    mainWindow.loadURL('http://localhost:9527')
    // mainWindow.webContents.openDevTools()
  } else {
    const indexFile = path.join(__dirname, '..', 'dist', 'index.html')
    console.log('Loading UI from:', indexFile, 'exists=', fs.existsSync(indexFile))
    mainWindow.loadFile(indexFile)
  }

  mainWindow.on('closed', () => {
    mainWindow = null
    // 关闭所有浏览器进程
    for (const [id, proc] of runningBrowsers) {
      try {
        proc.kill()
      } catch {}
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

// 获取分组列表
ipcMain.handle('getGroupList', async () => {
  const data = readJSON(GROUP_LIST_FILE, [])
  return { data }
})

// 保存分组列表
ipcMain.handle('setGroupList', async (event, data) => {
  writeJSON(GROUP_LIST_FILE, data)
  return { success: true }
})

// ============ 插件管理 ============

// 获取已安装插件列表
ipcMain.handle('getExtensions', async () => {
  const data = readJSON(EXTENSIONS_FILE, [])
  return { data }
})

// 从本地 CRX 文件安装插件
ipcMain.handle('installExtension', async (event, { crxPath, fileName }) => {
  try {
    // 读取 CRX 文件
    if (!fs.existsSync(crxPath)) {
      return { success: false, error: 'CRX 文件不存在' }
    }

    const crxBuffer = fs.readFileSync(crxPath)

    // CRX v3 格式: 前16字节是头部 (4魔数 + 4版本 + 4头部大小 + 4头部大小)
    // 跳过头部，解压 ZIP 部分
    let zipBuffer = crxBuffer
    if (
      crxBuffer[0] === 0x43 &&
      crxBuffer[1] === 0x72 &&
      crxBuffer[2] === 0x32 &&
      crxBuffer[3] === 0x34
    ) {
      // "Cr24" 魔数，CRX 格式
      const version = crxBuffer.readUInt32LE(4)
      const headerSize = crxBuffer.readUInt32LE(8)
      if (version === 3) {
        // CRX3: 头部大小在偏移8，实际头部从12开始
        const realHeaderSize = crxBuffer.readUInt32LE(12)
        zipBuffer = crxBuffer.slice(16 + realHeaderSize)
      } else {
        // CRX2: 头部大小在偏移8
        zipBuffer = crxBuffer.slice(16 + headerSize)
      }
    }

    // 解压到临时目录
    const AdmZip = require('adm-zip')
    const zip = new AdmZip(zipBuffer)
    const tempDir = path.join(DATA_DIR, '_temp_ext')
    ensureDir(tempDir)
    zip.extractAllTo(tempDir, true)

    // 读取 manifest.json 获取插件信息
    const manifestPath = path.join(tempDir, 'manifest.json')
    if (!fs.existsSync(manifestPath)) {
      fs.rmSync(tempDir, { recursive: true, force: true })
      return { success: false, error: '无效的 CRX 文件：缺少 manifest.json' }
    }

    const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf-8'))
    const extId = manifest.name.replace(/[^a-zA-Z0-9]/g, '_').toLowerCase() + '_' + Date.now()
    const extDir = path.join(EXTENSIONS_DIR, extId)

    // 移动到正式目录
    ensureDir(extDir)
    fs.cpSync(tempDir, extDir, { recursive: true })
    fs.rmSync(tempDir, { recursive: true, force: true })

    // 读取现有插件列表
    const extensions = readJSON(EXTENSIONS_FILE, [])

    // 创建插件记录
    const extRecord = {
      id: extId,
      name: manifest.name || fileName.replace('.crx', ''),
      version: manifest.version || '1.0.0',
      description: manifest.description || '',
      path: extDir,
      enabled: true,
      source: 'local',
      installDate: new Date().toISOString()
    }

    extensions.push(extRecord)
    writeJSON(EXTENSIONS_FILE, extensions)

    return { success: true, extension: extRecord }
  } catch (e) {
    return { success: false, error: e.message }
  }
})

// 卸载插件
ipcMain.handle('uninstallExtension', async (event, extId) => {
  try {
    const extensions = readJSON(EXTENSIONS_FILE, [])
    const ext = extensions.find(e => e.id === extId)
    if (!ext) {
      return { success: false, error: '插件不存在' }
    }

    // 删除插件目录
    if (fs.existsSync(ext.path)) {
      fs.rmSync(ext.path, { recursive: true, force: true })
    }

    // 从列表中移除
    const idx = extensions.findIndex(e => e.id === extId)
    extensions.splice(idx, 1)
    writeJSON(EXTENSIONS_FILE, extensions)

    return { success: true }
  } catch (e) {
    return { success: false, error: e.message }
  }
})

// 切换插件启用/禁用状态
ipcMain.handle('toggleExtension', async (event, extId) => {
  try {
    const extensions = readJSON(EXTENSIONS_FILE, [])
    const ext = extensions.find(e => e.id === extId)
    if (!ext) {
      return { success: false, error: '插件不存在' }
    }

    ext.enabled = !ext.enabled
    writeJSON(EXTENSIONS_FILE, extensions)

    return { success: true, enabled: ext.enabled }
  } catch (e) {
    return { success: false, error: e.message }
  }
})

// 删除浏览器环境
ipcMain.handle('deleteBrowser', async (event, id) => {
  // 先关闭运行中的进程
  if (runningBrowsers.has(id)) {
    try {
      runningBrowsers.get(id).kill()
    } catch {}
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

  // 根据配置的引擎查找可执行文件
  let chromeExe = null
  if (profile && profile.engine) {
    // 使用指定的引擎
    const engineDir = path.join(BROWSER_ENGINES_DIR, profile.engine)
    if (fs.existsSync(path.join(engineDir, 'chrome.exe'))) {
      chromeExe = path.join(engineDir, 'chrome.exe')
    } else if (fs.existsSync(path.join(engineDir, 'camoufox.exe'))) {
      chromeExe = path.join(engineDir, 'camoufox.exe')
    }
  }

  // 如果没有指定引擎或引擎不存在，使用默认引擎（第一个可用的）
  if (!chromeExe) {
    const engines = []
    if (fs.existsSync(BROWSER_ENGINES_DIR)) {
      const entries = fs.readdirSync(BROWSER_ENGINES_DIR, { withFileTypes: true })
      for (const entry of entries) {
        if (!entry.isDirectory()) continue
        const engineDir = path.join(BROWSER_ENGINES_DIR, entry.name)
        if (fs.existsSync(path.join(engineDir, 'chrome.exe'))) {
          chromeExe = path.join(engineDir, 'chrome.exe')
          break
        } else if (fs.existsSync(path.join(engineDir, 'camoufox.exe'))) {
          chromeExe = path.join(engineDir, 'camoufox.exe')
          break
        }
      }
    }
  }

  if (!chromeExe || !fs.existsSync(chromeExe)) {
    return { success: false, error: '未找到可用的浏览器引擎，请在 browser 目录中放置引擎文件夹' }
  }

  // 构建启动参数
  const args = [
    `--user-data-dir=${profileDir}`,
    '--no-first-run',
    '--disable-default-apps',
    '--disable-popup-blocking'
  ]

  // 加载已启用的插件
  const extensions = readJSON(EXTENSIONS_FILE, [])
  const enabledExts = extensions.filter(e => e.enabled && e.source === 'local')
  if (enabledExts.length > 0) {
    const extPaths = enabledExts.map(e => e.path).join(',')
    args.push(`--load-extension=${extPaths}`)
  }

  if (profile) {
    // 代理
    if (profile.proxy && profile.proxy.host) {
      const { protocol = 'http', host, port } = profile.proxy
      const proxyUrl = `${protocol}://${host}:${port}`
      args.push(`--proxy-server=${proxyUrl}`)
    }

    if (profile.userAgent) {
      args.push(`--user-agent=${profile.userAgent}`)
    }

    if (profile.language) {
      const lang = String(profile.language).split(',')[0].trim()
      if (lang) {
        args.push(`--lang=${lang}`)
      }
    }

    if (profile.screen) {
      const [width, height] = String(profile.screen)
        .split('x')
        .map(item => parseInt(item.trim(), 10))
      if (width && height) {
        args.push(`--window-size=${width},${height}`)
      }
    }
  }

  if (profile && profile.homepage) {
    args.push(profile.homepage)
  }

  // 启动进程
  const child = spawn(chromeExe, args, {
    detached: false,
    stdio: 'ignore'
  })

  runningBrowsers.set(id, child)
  child.on('exit', () => {
    runningBrowsers.delete(id)
    // 通知前端更新状态
    if (mainWindow && !mainWindow.isDestroyed()) {
      mainWindow.webContents.send('browserClosed', id)
    }
  })
  child.on('error', err => {
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

// 获取浏览器引擎列表
ipcMain.handle('getEngineList', async () => {
  const engines = []

  if (!fs.existsSync(BROWSER_ENGINES_DIR)) {
    return engines
  }

  // 扫描 browser/ 目录下的子文件夹
  const entries = fs.readdirSync(BROWSER_ENGINES_DIR, { withFileTypes: true })
  for (const entry of entries) {
    if (!entry.isDirectory()) continue

    const engineDir = path.join(BROWSER_ENGINES_DIR, entry.name)

    // 查找可执行文件：优先 chrome.exe，其次 camoufox.exe
    let exeName = null
    if (fs.existsSync(path.join(engineDir, 'chrome.exe'))) {
      exeName = 'chrome.exe'
    } else if (fs.existsSync(path.join(engineDir, 'camoufox.exe'))) {
      exeName = 'camoufox.exe'
    }

    if (exeName) {
      engines.push({
        name: entry.name,
        dir: entry.name,
        exe: exeName,
        path: path.join(engineDir, exeName),
        active: true
      })
    }
  }

  return engines
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
      signal: AbortSignal.timeout(5000)
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

// 打开文件选择对话框
ipcMain.handle('showOpenDialog', async (event, options) => {
  const { dialog } = require('electron')
  const result = await dialog.showOpenDialog(mainWindow, {
    properties: ['openFile'],
    filters: options.filters || [{ name: 'CRX Files', extensions: ['crx'] }]
  })
  return result
})

// ============ App Lifecycle ============

app.whenReady().then(() => {
  ensureDir(DATA_DIR)
  ensureDir(PROFILES_DIR)
  ensureDir(EXTENSIONS_DIR)
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
