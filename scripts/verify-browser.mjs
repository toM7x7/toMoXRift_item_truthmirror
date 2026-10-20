import { chromium } from 'playwright'
import { mkdir, writeFile } from 'node:fs/promises'
import assert from 'node:assert/strict'

const out = new URL('../output/playwright/', import.meta.url)
await mkdir(out, { recursive: true })
const browser = await chromium.launch({ executablePath: process.env.TRUTH_MIRROR_CHROME, headless: true, args: ['--use-fake-device-for-media-stream', '--use-fake-ui-for-media-stream'] })
const results = []
const errors = []
try {
  const context = await browser.newContext({ viewport: { width: 1280, height: 900 } })
  await context.addInitScript(() => {
    window.__streams = []
    window.__constraints = []
    const original = navigator.mediaDevices.getUserMedia.bind(navigator.mediaDevices)
    navigator.mediaDevices.getUserMedia = async constraints => {
      window.__constraints.push(constraints)
      const stream = await original(constraints)
      window.__streams.push(stream)
      return stream
    }
  })
  const page = await context.newPage()
  page.on('pageerror', error => errors.push(error.message))
  const network = []
  page.on('request', request => network.push(request.url()))
  await page.goto('http://127.0.0.1:5193/')
  await page.locator('canvas').waitFor()
  await page.waitForFunction(() => document.querySelector('canvas')?.dataset.ready === 'true')
  await page.screenshot({ path: new URL('idle.png', out).pathname.replace(/^\/(.:)/, '$1') })
  assert.equal(await page.evaluate(() => window.__streams.length), 0)
  results.push('No camera access on initial load')
  // Actual 3D button, at its verified screenshot position in this fixed viewport.
  await page.mouse.click(454, 620)
  await page.locator('[data-phase="live"]').waitFor()
  assert.equal(await page.evaluate(() => window.__streams[0].getVideoTracks()[0].readyState), 'live')
  assert.equal(await page.evaluate(() => window.__constraints[0].audio), false)
  await page.screenshot({ path: new URL('fake-camera.png', out).pathname.replace(/^\/(.:)/, '$1') })
  results.push('Clicking the 3D mirror button starts fake live video; audio disabled')
  await page.getByRole('button', { name: 'カメラを停止', exact: true }).click()
  await page.locator('[data-phase="idle"]').waitFor()
  assert.equal(await page.evaluate(() => window.__streams[0].getTracks().every(t => t.readyState === 'ended')), true)
  results.push('Stop ends every media track')
  await page.getByRole('button', { name: 'カメラを許可して映す' }).click()
  await page.locator('[data-phase="live"]').waitFor()
  await page.getByRole('button', { name: '鏡を取り外す', exact: true }).click()
  assert.equal(await page.evaluate(() => window.__streams.every(s => s.getTracks().every(t => t.readyState === 'ended'))), true)
  await page.getByRole('button', { name: '鏡を置き直す', exact: true }).click()
  await page.locator('[data-phase="idle"]').waitFor()
  results.push('Unmount ends tracks; replacing mirror does not auto-start')
  await page.getByRole('button', { name: 'カメラを許可して映す' }).click()
  await page.locator('[data-phase="live"]').waitFor()
  await page.evaluate(() => {
    Object.defineProperty(document, 'hidden', { configurable: true, get: () => true })
    document.dispatchEvent(new Event('visibilitychange'))
  })
  await page.locator('[data-phase="idle"]').waitFor()
  assert.equal(await page.evaluate(() => window.__streams.every(s => s.getTracks().every(t => t.readyState === 'ended'))), true)
  await page.evaluate(() => {
    Object.defineProperty(document, 'hidden', { configurable: true, get: () => false })
    document.dispatchEvent(new Event('visibilitychange'))
  })
  assert.equal(await page.locator('[data-phase="idle"]').count(), 1)
  results.push('Hidden-tab event stops tracks; visibility restore does not restart (synthetic visibility event)')
  // Cancel a permission request, then let it resolve: the late stream must stop.
  await page.evaluate(() => {
    const previous = navigator.mediaDevices.getUserMedia.bind(navigator.mediaDevices)
    navigator.mediaDevices.getUserMedia = constraints => new Promise(resolve => { window.__allowLater = async () => resolve(await previous(constraints)) })
  })
  await page.getByRole('button', { name: 'カメラを許可して映す' }).click()
  await page.locator('[data-phase="requesting"]').waitFor()
  await page.getByRole('button', { name: 'カメラを停止', exact: true }).click()
  await page.evaluate(() => window.__allowLater())
  await page.waitForFunction(() => window.__streams.every(s => s.getTracks().every(t => t.readyState === 'ended')))
  results.push('Cancelled request stops a stream arriving after cancellation')
  await page.evaluate(() => {
    navigator.mediaDevices.getUserMedia = async () => { throw new DOMException('denied for test', 'NotAllowedError') }
  })
  await page.getByRole('button', { name: 'カメラを許可して映す' }).click()
  await page.locator('[data-phase="error"]').waitFor()
  assert.match(await page.getByRole('status').textContent(), /許可されていません/)
  results.push('Permission denial displays recovery guidance')
  assert.deepEqual(network.filter(url => !url.startsWith('http://127.0.0.1:5193/') && !url.startsWith('data:') && !url.startsWith('blob:')), [])
  assert.deepEqual(errors, [])
  results.push('No off-origin requests and no page errors during verification')
  await writeFile(new URL('verification.json', out), JSON.stringify({ results, errors, realCameraVerified: false, xriftPlacementVerified: false }, null, 2))
  console.log(JSON.stringify({ results, errors }, null, 2))
} finally { await browser.close() }
