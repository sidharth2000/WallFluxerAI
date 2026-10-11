import { app } from 'electron'
import { spawn, spawnSync, type ChildProcess } from 'node:child_process'
import fs from 'node:fs'
import net from 'node:net'
import path from 'node:path'

let child: ChildProcess | null = null


// Ask the OS for a free port: bind to 0, read what we got, release it.
function getFreePort(): Promise<number> {
  return new Promise((resolve, reject) => {
    const server = net.createServer()
    server.unref()
    server.on('error', reject)
    server.listen(0, '127.0.0.1', () => {
      const { port } = server.address() as net.AddressInfo
      server.close(() => resolve(port))
    })
  })
}


// data/ beside the exe; if that folder isn't writable (e.g. extracted into
// Program Files) fall back to the user's AppData so the app still works.
function pickDataDir(root: string): string {

  const preferred = path.join(root, 'data')

  try {
    fs.mkdirSync(preferred, { recursive: true })
    fs.accessSync(preferred, fs.constants.W_OK)
    return preferred
  } catch {
    const fallback = path.join(app.getPath('userData'), 'data')
    fs.mkdirSync(fallback, { recursive: true })
    return fallback
  }
}


function resolveLayout() {

  // Packaged: everything sits beside WallFluxer.exe
  if (app.isPackaged) {
    const root = path.dirname(process.execPath)

    return {
      root,
      exe: path.join(root, 'backend', 'api.exe'),
      dataDir: pickDataDir(root),
      checkModelsDir: path.join(root, 'models'),
    }
  }

  // Dev: use your PyInstaller output next to the client folder
  const root = path.join(process.env.APP_ROOT!, '..', 'WallFluxerService')
  const dataDir = path.join(app.getPath('userData'), 'dev-data')
  fs.mkdirSync(dataDir, { recursive: true })

  return {
    root,
    exe: path.join(root, 'dist-backend', 'api', 'api.exe'),
    dataDir,
    checkModelsDir: path.join(root, 'models'),
  }
}


export async function startBackend(): Promise<number> {

  const { root, exe, dataDir, checkModelsDir } = resolveLayout()

  // Friendly errors for the most common mistakes
  if (!fs.existsSync(exe)) {
    throw new Error(
      `Backend not found:\n${exe}\n\nMake sure you extracted the whole zip and kept the "backend" folder next to WallFluxer.exe.`
    )
  }

  if (!fs.existsSync(checkModelsDir)) {
    throw new Error(
      `Models folder not found:\n${checkModelsDir}\n\nMake sure you extracted the models zip into the same folder as WallFluxer.exe.`
    )
  }

  const port = await getFreePort()

  // Packaged: write backend output to data/backend.log. Dev: show it in the terminal.
  const stdio: 'inherit' | ['ignore', number, number] = app.isPackaged
    ? (() => {
        const fd = fs.openSync(path.join(dataDir, 'backend.log'), 'a')
        return ['ignore', fd, fd] as ['ignore', number, number]
      })()
    : 'inherit'

  const proc = spawn(exe, [], {
    cwd: path.dirname(exe),
    env: {
      ...process.env,
      SERVICE_ROOT: root,
      DATA_DIR: dataDir,
      PORT: String(port),
    },
    windowsHide: true,
    stdio,
  })

  child = proc

  // spawn failures (e.g. blocked by antivirus) arrive as an async 'error' event
  await new Promise<void>((resolve, reject) => {
    proc.once('spawn', resolve)
    proc.once('error', reject)
  })

  proc.on('exit', (code) => {
    console.log(`[backend] exited with code ${code}`)
    if (child === proc) child = null
  })

  return port
}


// Kill api.exe AND anything it started (taskkill /T = whole process tree).
export function stopBackend() {

  if (!child || child.pid === undefined) return

  const pid = child.pid
  child = null

  if (process.platform === 'win32') {
    spawnSync('taskkill', ['/pid', String(pid), '/T', '/F'], { windowsHide: true })
  } else {
    try { process.kill(pid) } catch { /* already gone */ }
  }
}