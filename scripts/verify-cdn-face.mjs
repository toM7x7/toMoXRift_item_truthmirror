import { chromium } from 'playwright'
import { writeFile } from 'node:fs/promises'

const assetBase = process.argv[2]?.replace(/\/$/, '')
if (!assetBase || !assetBase.startsWith('https://assets.xrift.net/')) throw new Error('Pass the actual uploaded item CDN directory')
const assets = ['vision_wasm_internal.js', 'vision_wasm_internal.wasm', 'vision_wasm_nosimd_internal.js', 'vision_wasm_nosimd_internal.wasm', 'truth-face-landmarker.task']
const checks = []
for (const asset of assets) {
  const response = await fetch(`${assetBase}/${asset}`, { method: 'HEAD' })
  checks.push({ asset, status: response.status, contentType: response.headers.get('content-type') })
  if (!response.ok) throw new Error(`CDN asset failed: ${asset} (${response.status})`)
}
const browser = await chromium.launch({ executablePath: process.env.TRUTH_MIRROR_CHROME, headless: true })
try {
  const page = await browser.newPage()
  await page.goto('http://127.0.0.1:5193/')
  const result = await page.evaluate(async assetBase => {
    const { FaceLandmarker, FilesetResolver } = await import('/node_modules/@mediapipe/tasks-vision/vision_bundle.mjs')
    const files = await FilesetResolver.forVisionTasks(assetBase)
    const model = await FaceLandmarker.createFromOptions(files, {
      baseOptions: { modelAssetPath: `${assetBase}/truth-face-landmarker.task`, delegate: 'CPU' }, runningMode: 'IMAGE', numFaces: 2,
    })
    try {
      const image = new Image()
      image.src = '/output/test-fixtures/portrait.jpg'
      await image.decode()
      const detected = model.detect(image)
      if (detected.faceLandmarks.length !== 1) throw new Error('Expected one sample face')
      return { faces: detected.faceLandmarks.length, landmarks: detected.faceLandmarks[0].length }
    } finally { model.close() }
  }, assetBase)
  const report = { assetBase, checks, detection: result, source: 'actual XRift CDN runtime and model; public sample image; no real camera' }
  await writeFile(new URL('../output/playwright/cdn-face-verification.json', import.meta.url), JSON.stringify(report, null, 2))
  console.log(JSON.stringify(report, null, 2))
} finally { await browser.close() }
