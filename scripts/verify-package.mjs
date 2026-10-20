import { readFile } from 'node:fs/promises'
import { createHash } from 'node:crypto'
import assert from 'node:assert/strict'

// Release contract: the Windows SDK preserves backslashes in nested object keys.
// These runtime assets must therefore ship directly beside the exposed Item.
const files = ['vision_wasm_internal.js', 'vision_wasm_internal.wasm', 'vision_wasm_nosimd_internal.js', 'vision_wasm_nosimd_internal.wasm', 'truth-face-landmarker.task']
for (const file of files) {
  const bytes = await readFile(new URL(`../dist/${file}`, import.meta.url))
  assert.ok(bytes.byteLength > 1000, `Missing or empty root asset: ${file}; run npm run assets:face`)
  if (file.endsWith('.task')) assert.equal(createHash('sha256').update(bytes).digest('hex'), '64184e229b263107bc2b804c6625db1341ff2bb731874b0bcc2fe6544e0bc9ff')
}
const entry = await readFile(new URL('../dist/remoteEntry.js', import.meta.url), 'utf8')
assert.ok(entry.includes('dynamicLoadingCss([], false, "./Item")'), 'Exposed Item must not load standalone preview CSS under the XRift host CSP')
console.log('Package verified: five flat runtime assets, model checksum, no remote Item CSS')
