/* eslint-env node */

// Run after `npm run build`. Puts the Electron app, the python backend and the
// models side by side, then zips them for GitHub Releases.
//
//   WallFluxer/
//     WallFluxer.exe  (+ Electron support files)
//     backend/        <- contents of WallFluxerService/dist-backend/api
//     models/         <- WallFluxerService/models

import { cpSync, existsSync, readFileSync, rmSync, statSync } from 'node:fs'
import { execFileSync } from 'node:child_process'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const clientRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const serviceRoot = path.resolve(clientRoot, '..', 'WallFluxerService')

const { version } = JSON.parse(
  readFileSync(path.join(clientRoot, 'package.json'), 'utf8')
)

const releaseDir = path.join(clientRoot, 'release', version)
const unpacked = path.join(releaseDir, 'win-unpacked')
const outDir = path.join(releaseDir, 'WallFluxer')
const zipPath = path.join(releaseDir, `WallFluxer-v${version}-win-x64.zip`)

const backendSrc = path.join(serviceRoot, 'dist-backend', 'api')
const modelsSrc = path.join(serviceRoot, 'models')


function mustExist(p, hint) {
  if (!existsSync(p)) {
    console.error(`\nMissing: ${p}\n${hint}\n`)
    process.exit(1)
  }
}

mustExist(unpacked, 'Run "npm run build" first.')
mustExist(path.join(backendSrc, 'api.exe'), 'Build the python backend with PyInstaller first.')
mustExist(modelsSrc, 'Models folder not found.')


console.log('Assembling release folder...')

rmSync(outDir, { recursive: true, force: true })
rmSync(zipPath, { force: true })

cpSync(unpacked, outDir, { recursive: true })
cpSync(backendSrc, path.join(outDir, 'backend'), { recursive: true })
cpSync(modelsSrc, path.join(outDir, 'models'), { recursive: true })


console.log('Zipping (this can take a while with the models)...')

// Windows 10+ ships bsdtar, which writes zips and handles files > 2 GB.
execFileSync(
  'tar',
  ['-a', '-c', '-f', zipPath, '-C', releaseDir, 'WallFluxer'],
  { stdio: 'inherit' }
)


const sizeGiB = statSync(zipPath).size / 1024 ** 3

console.log(`\nDone: ${zipPath}`)
console.log(`Size: ${sizeGiB.toFixed(2)} GiB`)

if (sizeGiB > 1.9) {
  console.warn(
    '\nWarning: GitHub Releases allows under 2 GiB per file. ' +
    'Split this into an app zip and a models zip.'
  )
}
