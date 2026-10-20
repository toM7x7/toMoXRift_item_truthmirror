import { chromium } from 'playwright'
import { fileURLToPath } from 'node:url'

const browser = await chromium.launch({ executablePath: process.env.TRUTH_MIRROR_CHROME, headless: true })
try {
  const page = await browser.newPage({ viewport: { width: 512, height: 512 }, deviceScaleFactor: 1 })
  await page.goto('http://127.0.0.1:5193/')
  await page.addStyleTag({ content: 'main{display:block}aside,.scene-note{display:none}.scene{height:100vh;width:100vw}' })
  await page.waitForFunction(() => document.querySelector('canvas')?.dataset.ready === 'true')
  await page.locator('canvas').screenshot({ path: fileURLToPath(new URL('../public/thumbnail.png', import.meta.url)) })
  console.log('Captured actual local preview to public/thumbnail.png (512x512; camera off)')
} finally { await browser.close() }
