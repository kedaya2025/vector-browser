const { rcedit } = require('rcedit')
const path = require('path')

const iconPath = path.join(__dirname, '..', 'static', 'logo.ico')
const unpackedExe = path.join(__dirname, '..', 'release', 'win-unpacked', 'IOBrowser.exe')

async function fixIcons() {
  try {
    // 只修复解压版 exe 图标
    // 安装包图标由 NSIS 配置处理（installerIcon, installerHeaderIcon）
    console.log('Setting icon on unpacked exe...')
    await rcedit(unpackedExe, { icon: iconPath })
    console.log('✓ Unpacked exe icon updated')

    console.log('\nIcon updated successfully!')
    console.log('Note: Installer icon is handled by NSIS configuration.')
  } catch (err) {
    console.error('Error:', err.message)
    process.exit(1)
  }
}

fixIcons()
