import { app, BrowserWindow, Menu, globalShortcut, protocol, net, ipcMain, dialog } from 'electron'
import { fileURLToPath, pathToFileURL } from 'node:url'
import path from 'node:path'

import { startBackend, stopBackend } from './backend'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

process.env.APP_ROOT = path.join(__dirname, '..')

// Vite
export const VITE_DEV_SERVER_URL = process.env['VITE_DEV_SERVER_URL']
export const MAIN_DIST = path.join(process.env.APP_ROOT, 'dist-electron')
export const RENDERER_DIST = path.join(process.env.APP_ROOT, 'dist')

process.env.VITE_PUBLIC = VITE_DEV_SERVER_URL
  ? path.join(process.env.APP_ROOT, 'public')
  : RENDERER_DIST


let win: BrowserWindow | null = null

// Port the python backend was started on (set once at launch)
let apiPort = 0

// Only one copy of the app (and therefore one backend) at a time
const gotSingleInstanceLock = app.requestSingleInstanceLock()

// Last-resort safety net: never leave api.exe running
process.on('exit', stopBackend)


// -----------------------------
// Create Main Window
// -----------------------------

function createWindow() {
  win = new BrowserWindow({
    width: 1200,
    height: 800,

    // Window title (title bar / taskbar hover text)
    title: 'WallFluxer',

    // Remove File / Edit / View menu
    autoHideMenuBar: true,

    // Window + taskbar icon (public/icon.png)
    icon: path.join(
      process.env.VITE_PUBLIC,
      'icon.png'
    ),

    webPreferences: {
      preload: path.join(__dirname, 'preload.mjs'),

      // Hands the backend port to preload.ts (read from process.argv)
      additionalArguments: [`--api-port=${apiPort}`],
    },
  })

  // Keep the title as "WallFluxer" even if the page's <title> changes
  win.on('page-title-updated', (event) => {
    event.preventDefault()
  })

  win.webContents.on('did-finish-load', () => {
    win?.webContents.send(
      'main-process-message',
      new Date().toLocaleString()
    )
  })

  if (VITE_DEV_SERVER_URL) {
    win.webContents.openDevTools()
    win.loadURL(VITE_DEV_SERVER_URL)
  } else {
    win.loadFile(
      path.join(RENDERER_DIST, 'index.html')
    )
  }

  win.on('closed', () => {
    win = null
  })
}


// -----------------------------
// App Ready
// -----------------------------

protocol.registerSchemesAsPrivileged([
  {
    scheme: 'wallfluxer',
    privileges: {
      standard: true,
      secure: true,
      supportFetchAPI: true,
      corsEnabled: true,
    },
  },
])

app.whenReady().then(async () => {

  // A second copy was launched: just quit it, the first one keeps running
  if (!gotSingleInstanceLock) {
    app.quit()
    return
  }

  // Lets Windows group the taskbar icon and show the right name
  // in notifications. Must match "appId" in electron-builder.json5.
  app.setAppUserModelId('com.yourname.wallfluxer')

  // macOS dock icon (ignored on Windows/Linux)
  if (process.platform === 'darwin') {
    app.dock?.setIcon(path.join(process.env.VITE_PUBLIC, 'icon.png'))
  }

  // Completely remove
  // File / Edit / View menu.
  Menu.setApplicationMenu(null)

  protocol.handle('wallfluxer', (request) => {

    const url = new URL(request.url)

    if (url.hostname !== 'local-image') {
      return new Response('Not Found', {
        status: 404,
      })
    }

    const filePath = url.searchParams.get('path')

    if (!filePath) {
      return new Response('Missing path', {
        status: 400,
      })
    }

    return net.fetch(
      pathToFileURL(filePath).toString()
    )
  })

  ipcMain.handle('select-model-file', async () => {

    const result = await dialog.showOpenDialog({
      title: 'Select Stable Diffusion Model',

      properties: [
        'openFile',
      ],

      filters: [
        {
          name: 'Stable Diffusion Models',
          extensions: ['safetensors'],
        },
      ],
    })

    if (
      result.canceled ||
      result.filePaths.length === 0
    ) {
      return null
    }

    return result.filePaths[0]
  })

  // Start the python backend on a free port before the UI opens.
  // The UI's startup screen then waits for /health.
  try {
    apiPort = await startBackend()
  } catch (err) {
    dialog.showErrorBox(
      'WallFluxer could not start',
      err instanceof Error ? err.message : String(err)
    )
    app.quit()
    return
  }

  createWindow()

  globalShortcut.register('CommandOrControl+Shift+I', () => {
    win?.webContents.toggleDevTools()
  })
})


// -----------------------------
// Second launch -> focus existing window
// -----------------------------

app.on('second-instance', () => {
  if (win) {
    if (win.isMinimized()) win.restore()
    win.focus()
  }
})


// -----------------------------
// Window Closed
// -----------------------------

// Closing the last window quits the app
// (macOS keeps the app running until Cmd+Q, as is the convention).
app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit()
  }
})

app.on('will-quit', () => {
  globalShortcut.unregisterAll()
  stopBackend()
})


// -----------------------------
// macOS Activation
// -----------------------------

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow()
  } else {
    win?.show()
    win?.focus()
  }
})