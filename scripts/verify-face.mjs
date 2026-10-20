import { chromium } from 'playwright'
import assert from 'node:assert/strict'
import { mkdir, writeFile } from 'node:fs/promises'
import { fileURLToPath } from 'node:url'

const out = new URL('../output/playwright/', import.meta.url)
await mkdir(out, { recursive: true })
const browser = await chromium.launch({ executablePath: process.env.TRUTH_MIRROR_CHROME, headless: true })
const results = []
const errors = []
const baseUrl = process.env.TRUTH_MIRROR_BASE_URL ?? 'http://127.0.0.1:5193'
try {
  const page = await browser.newPage({ viewport: { width: 1280, height: 1000 } })
  page.on('pageerror', error => { errors.push(error.message); console.log('PAGE ERROR:', error.message) })
  const requests = []
  page.on('request', request => requests.push(request.url()))
  await page.route(`${baseUrl}/output/test-fixtures/portrait.jpg`, route => route.fulfill({ path: fileURLToPath(new URL('../output/test-fixtures/portrait.jpg', import.meta.url)), contentType: 'image/jpeg' }))
  const response = await page.goto(`${baseUrl}/?mode=face`)
  console.log('Face verification target:', page.url(), response?.status())
  await page.waitForFunction(() => document.querySelector('canvas')?.dataset.ready === 'true')
  await page.evaluate(async () => {
    const image = new Image()
    image.src = '/output/test-fixtures/portrait.jpg'
    await image.decode()
    window.__faceFixture = { mode: 'one', streams: [] }
    navigator.mediaDevices.getUserMedia = async constraints => {
      if (constraints.audio !== false) throw new Error('Audio must be disabled')
      const canvas = document.createElement('canvas')
      canvas.width = 1280; canvas.height = 720
      const ctx = canvas.getContext('2d')
      window.__faceFixture.canvas = canvas
      const paint = () => {
        ctx.fillStyle = '#777'; ctx.fillRect(0, 0, 1280, 720)
        if (window.__faceFixture.mode === 'one') ctx.drawImage(image, 365, 0, 550, 720)
        if (window.__faceFixture.mode === 'two') {
          ctx.drawImage(image, 170, 0, 480, 480, 50, 40, 540, 600)
          ctx.drawImage(image, 170, 0, 480, 480, 690, 40, 540, 600)
        }
        if (stream.getVideoTracks()[0].readyState === 'live') requestAnimationFrame(paint)
      }
      const stream = canvas.captureStream(15)
      window.__faceFixture.streams.push(stream)
      paint()
      return stream
    }
  })
  await page.getByRole('button', { name: 'カメラを許可して映す' }).click()
  await page.locator('[data-face-phase="found"]').waitFor({ timeout: 60000 })
  results.push('Real MediaPipe model detects one public sample face; transparent face cutout appears over reflected stand-in avatar')
  await page.screenshot({ path: fileURLToPath(new URL('face-found.png', out)) })
  const slider = page.getByRole('slider', { name: '顔の大きさ' })
  await slider.fill('0.18')
  await page.waitForFunction(() => document.querySelector('[aria-label="顔の大きさ"]').value === '0.18')
  assert.equal(await slider.inputValue(), '0.18')
  await page.getByRole('button', { name: '顔位置をリセット', exact: true }).click()
  await page.waitForFunction(() => document.querySelector('[aria-label="顔の大きさ"]').value === '0.115')
  assert.equal(await slider.inputValue(), '0.115')
  results.push('Manual size adjustment and reset work')
  await page.getByRole('button', { name: '一歩横へ移動して確認', exact: true }).click()
  await page.locator('[data-face-phase="position"]').waitFor()
  await page.screenshot({ path: fileURLToPath(new URL('face-out-of-position.png', out)) })
  await page.getByRole('button', { name: '正面の立ち位置に戻る', exact: true }).click()
  await page.locator('[data-face-phase="found"]').waitFor()
  results.push('Leaving the fixed standing position hides the overlay; returning restores it')
  await page.evaluate(() => { window.__faceFixture.mode = 'none' })
  await page.locator('[data-face-phase="missing"]').waitFor({ timeout: 20000 })
  await page.screenshot({ path: fileURLToPath(new URL('face-missing.png', out)) })
  results.push('No-face input hides the real-face overlay')
  await page.evaluate(() => { window.__faceFixture.mode = 'two' })
  await page.locator('[data-face-phase="multiple"]').waitFor({ timeout: 20000 })
  results.push('Two faces hide the overlay instead of selecting a person')
  await page.evaluate(() => { window.__faceFixture.mode = 'one' })
  await page.locator('[data-face-phase="found"]').waitFor({ timeout: 20000 })
  await page.getByRole('button', { name: 'カメラを停止', exact: true }).click()
  await page.locator('[data-face-phase="off"]').waitFor()
  assert.equal(await page.evaluate(() => window.__faceFixture.streams.every(stream => stream.getTracks().every(track => track.readyState === 'ended'))), true)
  results.push('Stop ends camera tracks and face inference returns to off')
  await page.getByRole('button', { name: 'カメラを許可して映す' }).click()
  await page.locator('[data-face-phase="found"]').waitFor({ timeout: 60000 })
  await page.getByRole('button', { name: '鏡を取り外す', exact: true }).click()
  assert.equal(await page.evaluate(() => window.__faceFixture.streams.every(stream => stream.getTracks().every(track => track.readyState === 'ended'))), true)
  results.push('Restart and unmount release the camera and model lifecycle')
  const outside = requests.filter(url => !url.startsWith(`${baseUrl}/`) && !url.startsWith('blob:') && !url.startsWith('data:'))
  const stockSdkFonts = outside.filter(url => url.startsWith('https://public.xrift.net/fonts/msdf/NotoSansJP/'))
  assert.deepEqual(outside.filter(url => !stockSdkFonts.includes(url)), [])
  assert.deepEqual(errors, [])
  results.push(stockSdkFonts.length ? 'Only standard SDK font asset requests off-origin; no other off-origin requests or page errors' : 'No off-origin requests and no page errors')
  const report = { baseUrl, results, errors, stockSdkFonts, fixture: 'Google MediaPipe public portrait sample, substituted camera stream', actualUserCameraTested: false, actualXriftAvatarTested: false }
  await writeFile(new URL(baseUrl.endsWith(':5193') ? 'face-verification.json' : 'face-production-verification.json', out), JSON.stringify(report, null, 2))
  console.log(JSON.stringify(report, null, 2))
} catch (error) {
  const pages = browser.contexts().flatMap(context => context.pages())
  if (pages[0]) {
    console.log({ error: String(error), pageErrors: errors, faceStatus: await pages[0].locator('[data-face-phase]').allTextContents() })
    await pages[0].screenshot({ path: fileURLToPath(new URL('face-failed.png', out)) })
    const frame = await pages[0].evaluate(() => window.__faceFixture?.canvas?.toDataURL())
    if (frame) await writeFile(new URL('face-failed-input.png', out), Buffer.from(frame.split(',')[1], 'base64'))
  }
  throw error
} finally { await browser.close() }
