const { execFileSync } = require('child_process')

function killProcess(imageName) {
  if (process.platform !== 'win32') return

  try {
    execFileSync('taskkill', ['/F', '/IM', imageName], { stdio: 'pipe' })
    console.log(`[kill-running-apps] killed ${imageName}`)
  } catch (error) {
    const output = Buffer.concat([
      error.stdout || Buffer.alloc(0),
      error.stderr || Buffer.alloc(0)
    ]).toString('utf8').trim()
    console.log(`[kill-running-apps] ${imageName}: ${output || 'not running'}`)
  }
}

if (process.platform === 'win32') {
  ;['iBrowser.exe', 'IOBrowser.exe', 'electron.exe'].forEach(killProcess)
} else {
  console.log('[kill-running-apps] skip on non-windows platform')
}
