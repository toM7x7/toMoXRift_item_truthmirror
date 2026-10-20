import { copyFile, mkdir, readFile, readdir, writeFile } from 'node:fs/promises'
import { createHash } from 'node:crypto'
import { fileURLToPath } from 'node:url'

const root = new URL('../public/', import.meta.url)
const modelUrl = 'https://storage.googleapis.com/mediapipe-models/face_landmarker/face_landmarker/float16/1/face_landmarker.task'
const expectedSha = '64184e229b263107bc2b804c6625db1341ff2bb731874b0bcc2fe6544e0bc9ff'
await mkdir(root, { recursive: true })
const wasmSource = new URL('../node_modules/@mediapipe/tasks-vision/wasm/', import.meta.url)
for (const name of await readdir(wasmSource)) {
  if (!/^vision_wasm_[\w.]+\.(?:js|wasm)$/.test(name)) continue
  await copyFile(fileURLToPath(new URL(name, wasmSource)), fileURLToPath(new URL(name, root)))
}
let model = await readFile(new URL('truth-face-landmarker.task', root)).catch(() => null)
if (!model || createHash('sha256').update(model).digest('hex') !== expectedSha) {
  const response = await fetch(modelUrl)
  if (!response.ok) throw new Error(`Face model download failed (${response.status})`)
  model = Buffer.from(await response.arrayBuffer())
  if (createHash('sha256').update(model).digest('hex') !== expectedSha) throw new Error('Face model checksum mismatch')
  await writeFile(new URL('truth-face-landmarker.task', root), model)
}
console.log('Local face assets prepared: MediaPipe 0.10.17 WASM + verified Face Landmarker v1 model')

if (process.argv.includes('--test-fixture')) {
  const fixtures = new URL('../output/test-fixtures/', import.meta.url)
  await mkdir(fixtures, { recursive: true })
  const response = await fetch('https://storage.googleapis.com/mediapipe-assets/portrait.jpg')
  if (!response.ok) throw new Error(`Test fixture download failed (${response.status})`)
  const portrait = Buffer.from(await response.arrayBuffer())
  if (createHash('sha256').update(portrait).digest('hex') !== 'a6f11efaa834706db23f275b6115058fa87fc7f14362681e6abe14e82749de3e') throw new Error('Test fixture checksum mismatch')
  await writeFile(new URL('portrait.jpg', fixtures), portrait)
  console.log('Downloaded public MediaPipe portrait fixture for local verification only')
}
