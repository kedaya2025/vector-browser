const { rcedit } = require('rcedit')
const path = require('path')

// electron-builder afterPack 钩子
// 在 exe 打包完成后、NSIS 构建前执行
module.exports = async function(context) {
  console.log('\n[fix-icons] afterPack hook triggered!')

  const appOutDir = context.appOutDir
  const platform = context.packager.platform.name

  console.log(`[fix-icons] Platform: "${platform}", AppOutDir: ${appOutDir}`)

  // Windows 平台名称可能是 'windows' 或 'win32'
  if (platform === 'windows' || platform === 'win32' || process.platform === 'win32') {
    const exePath = path.join(appOutDir, 'Vector Browser.exe')
    const iconPath = path.join(__dirname, '..', 'static', 'logo.ico')

    console.log(`[fix-icons] Setting icon on ${exePath}...`)
    console.log(`[fix-icons] Icon path: ${iconPath}`)

    try {
      await rcedit(exePath, { icon: iconPath })
      console.log('[fix-icons] ✓ Icon updated successfully')
    } catch (err) {
      console.error('[fix-icons] Error:', err.message)
    }
  } else {
    console.log('[fix-icons] Skipping non-Windows platform')
  }
}
