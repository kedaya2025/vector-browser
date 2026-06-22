const path = require('path')

// electron-builder afterPack hook
// Skip in CI — rcedit may not be available
// win.icon in package.json handles icon embedding
module.exports = async function(context) {
  if (process.env.CI) {
    console.log('[fix-icons] CI detected, skipping rcedit')
    return
  }

  try {
    const { rcedit } = require('rcedit')
    const exePath = path.join(context.appOutDir, 'Vector Browser.exe')
    const iconPath = path.join(__dirname, '..', 'static', 'logo.ico')
    await rcedit(exePath, { icon: iconPath })
    console.log('[fix-icons] ✓ Icon updated')
  } catch (err) {
    console.error('[fix-icons] Error:', err.message)
  }
}
