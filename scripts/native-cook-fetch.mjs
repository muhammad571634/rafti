// Downloads one Native Cook block's source (the files its prompt links to) for reading, never for committing raw:
// their terms forbid republishing the prompts; the code we adapt is ours once it is in the app.
//
//   node scripts/native-cook-fetch.mjs <category>/<slug> <out-dir> <file...>
//   node scripts/native-cook-fetch.mjs modals/coin-drop-reward ../tmp/cdr index.tsx CoinDropReward.tsx cdr-motion.ts
//
// Binary files (fonts, images under assets/) are written as bytes. Also prints the versions the block was built with.
import { mkdirSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'

const [block, outDir, ...files] = process.argv.slice(2)
if (!block || !outDir || !files.length) {
  console.log('usage: node scripts/native-cook-fetch.mjs <category>/<slug> <out-dir> <file...>')
  process.exit(2)
}
const base = `https://raw.githubusercontent.com/Native-Cook/native-cook/main/react-native/src/blocks/${block}`
for (const file of files) {
  const res = await fetch(`${base}/${file}`)
  if (!res.ok) {
    console.log(`FAIL ${file} ${res.status}`)
    continue
  }
  const bytes = Buffer.from(await res.arrayBuffer())
  const path = join(outDir, file)
  mkdirSync(dirname(path), { recursive: true })
  writeFileSync(path, bytes)
  console.log(`ok ${file} ${bytes.length} bytes`)
}
const pkg = await fetch('https://raw.githubusercontent.com/Native-Cook/native-cook/main/react-native/package.json')
if (pkg.ok) {
  const deps = { ...(await pkg.json()).dependencies }
  for (const name of ['expo', 'react-native', '@shopify/react-native-skia', 'react-native-reanimated', 'react-native-gesture-handler']) {
    if (deps[name]) console.log(`built with ${name} ${deps[name]}`)
  }
}
