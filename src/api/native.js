/* eslint-disable */

// Electron IPC bridge
const api = window.electronAPI

window.cr = {}
cr.__callbacks = {}
cr.webUIResponse = function (cb, status, data) {
  const callbackFn = cr.__callbacks[cb]
  callbackFn && callbackFn(data)
}

window.updateLaunchState = function () {
  updateRuningState()
}

export async function chromeSend(name, ...params) {
  return chromeSendTimeout(name, 10000, ...params)
}

export async function chromeSendTimeout(name, timeout = 2000, ...params) {
  // 去掉 callbackName 参数（Electron IPC 不需要）
  const args = params.filter(p => typeof p !== 'string' || !p.startsWith('callback_'))

  // 映射 chrome.send 命令到 electronAPI 方法
  const cmdMap = {
    getBrowserList: () => api.getBrowserList(),
    setBrowserList: data => api.setBrowserList(data),
    deleteBrowser: id => api.deleteBrowser(id),
    launchBrowser: id => api.launchBrowser(id),
    getRuningBrowser: () => api.getRuningBrowser(),
    getBrowserVersion: () => api.getBrowserVersion(),
    getGlobalData: () => api.getGlobalData(),
    setGlobalData: jsonStr => api.setGlobalData(jsonStr),
    checkProxy: url => api.checkProxy(url),
    getGroupList: () => api.getGroupList(),
    setGroupList: data => api.setGroupList(data),
    getExtensions: () => api.getExtensions(),
    installExtension: data => api.installExtension(data),
    uninstallExtension: extId => api.uninstallExtension(extId),
    toggleExtension: extId => api.toggleExtension(extId)
  }

  console.log(`chrome.send("${name}", `, args, `)`)

  const handler = cmdMap[name]
  if (handler) {
    return await handler(...args)
  }
  console.warn(`Unknown command: ${name}`)
  return null
}

export async function getGlobalData() {
  let GlobalData
  try {
    GlobalData = JSON.parse(localStorage.getItem('GlobalData'))
    if (Object.prototype.toString.call(GlobalData) === '[object Array]') {
      GlobalData = {}
    }
    const ret = await chromeSend('getGlobalData')
    GlobalData = JSON.parse(ret.data)
    if (Object.prototype.toString.call(GlobalData) === '[object Array]') {
      GlobalData = {}
    }
  } catch {
    //
  }

  return GlobalData || {}
}

export async function setGlobalData(key, value) {
  const GlobalData = await getGlobalData()
  GlobalData[key] = value

  localStorage.setItem('GlobalData', JSON.stringify(GlobalData))
  await chromeSend('setGlobalData', JSON.stringify(GlobalData)).catch(console.warn)
}

export async function getBrowserList() {
  let list
  try {
    const ret = await chromeSend('getBrowserList')
    list = ret.data
  } catch {
    //
  }

  return (list && list.users) || []
}

export async function addBrowser(item, defaultName) {
  const prefix = defaultName ? defaultName + ' ' : ''
  const list = await getBrowserList()
  const maxId = Math.max(0, Math.max(...list.map(item => item.id)))
  item.id = maxId + 1
  item.name = item.name || prefix + item.id

  list.push(item)

  const data = { users: list }
  localStorage.setItem('list', JSON.stringify(data))
  await chromeSend('setBrowserList', data).catch(err => {
    console.warn(err)
  })
}

export async function updateBrowser(item) {
  const list = await getBrowserList()
  const idx = list.findIndex(it => it.id === item.id)
  if (idx === -1) {
    list.push(item)
  } else {
    list[idx] = item
  }

  const data = { users: list }
  localStorage.setItem('list', JSON.stringify(data))
  await chromeSend('setBrowserList', data).catch(err => {
    console.warn(err)
  })
}

export async function deleteBrowser(id) {
  await chromeSend('deleteBrowser', id).catch(() => {})

  const list = await getBrowserList()
  const idx = list.findIndex(it => it.id === id)

  if (idx !== -1) {
    list.splice(idx, 1)
  }

  const data = { users: list }
  localStorage.setItem('list', JSON.stringify(data))
  await chromeSend('setBrowserList', data).catch(err => {
    console.warn(err)
  })
}

export async function updateRuningState() {
  const runingIds = await chromeSend('getRuningBrowser').catch(() => [])
  const idStrs = (runingIds || []).map(id => String(id))
  window._updateState && window._updateState(idStrs)
}

export async function getBrowserVersion() {
  const ret = await chromeSend('getBrowserVersion')
  return ret
}

export async function getGroupList() {
  let list
  try {
    const ret = await chromeSend('getGroupList')
    list = ret.data
  } catch {
    //
  }

  return list || []
}

export async function addGroup(item, defaultName) {
  const list = await getGroupList()
  const maxId = Math.max(0, Math.max(...list.map(item => item.id)))
  item.id = maxId + 1
  item.name = item.name || defaultName + ' ' + item.id

  list.push(item)

  localStorage.setItem('group', JSON.stringify(list))
  await chromeSend('setGroupList', list).catch(console.warn)
}

export async function updateGroup(item) {
  const list = await getGroupList()
  const idx = list.findIndex(it => it.id === item.id)
  if (idx === -1) {
    list.push(item)
  } else {
    list[idx] = item
  }

  localStorage.setItem('group', JSON.stringify(list))
  await chromeSend('setGroupList', list).catch(console.warn)
}

export async function deleteGroup(id) {
  const list = await getGroupList()
  const idx = list.findIndex(it => it.id === id)

  if (idx !== -1) {
    list.splice(idx, 1)
  }

  localStorage.setItem('group', JSON.stringify(list))
  await chromeSend('setGroupList', list).catch(console.warn)
}
