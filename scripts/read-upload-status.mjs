import { readFile, writeFile } from 'node:fs/promises'
import { pathToFileURL } from 'node:url'

// Reuse the official CLI's authenticated session without printing credentials.
const cliRoot = process.env.TRUTH_MIRROR_CLI_ROOT
if (!cliRoot) throw new Error('Set TRUTH_MIRROR_CLI_ROOT to the installed @xrift/cli directory')
const { getVerifiedToken } = await import(pathToFileURL(`${cliRoot}/dist/lib/api.js`).href)
const { API_BASE_URL } = await import(pathToFileURL(`${cliRoot}/dist/lib/constants.js`).href)
const { id } = JSON.parse(await readFile(new URL('../.xrift/item.json', import.meta.url), 'utf8'))
const token = await getVerifiedToken()
const observations = []
for (const path of [`/api/public/v1/items/${id}`, `/api/items/${id}`]) {
  const response = await fetch(`${API_BASE_URL}${path}`, { headers: { Authorization: `Bearer ${token}` } })
  const body = await response.json().catch(() => null)
  const data = body?.data ?? body?.item ?? body
  const observation = { path, httpStatus: response.status }
  if (response.ok && data) {
    for (const key of ['id', 'name', 'title', 'status', 'reviewStatus', 'sceneUrl', 'thumbnailUrl', 'currentVersion', 'latestVersion', 'publishedVersion']) {
      if (key in data) observation[key] = data[key]
    }
    observation.responseKeys = Object.keys(data)
  }
  observations.push(observation)
  if (response.ok) break
}
const report = { checkedAt: new Date().toISOString(), itemId: id, observations }
await writeFile(new URL('../output/playwright/upload-status.json', import.meta.url), JSON.stringify(report, null, 2))
console.log(JSON.stringify(report, null, 2))
