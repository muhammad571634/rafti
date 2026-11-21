// Drives the owner's Galaxy A51 through the Android SDK's adb (never the scrcpy adb on PATH: it drops the phone).
// Used to check a change on the device after an OTA: reload, open a screen, tap by text, take screenshots.
//
//   node scripts/a51.mjs reload                      force-stop and relaunch twice (takes a fresh `eas update`)
//   node scripts/a51.mjs open <path>                 deep link, e.g. secret-note/c_hana, profile, gifts
//   node scripts/a51.mjs texts                       the visible texts with their centres
//   node scripts/a51.mjs find "<text>" [scrolls] [up|down]   tap the element with exactly that text, scrolling to it
//   node scripts/a51.mjs tap <x> <y> | swipe <x1> <y1> <x2> <y2> [ms] | type "<text>"
//   node scripts/a51.mjs shot <out.png>              screenshot (1080x2400)
//
// The phone is shared by every agent: note it in .agents/now.md while you use it, and leave it as you found it.
import { spawnSync } from 'node:child_process'
import { writeFileSync } from 'node:fs'

const ADB = 'C:/Users/joray/AppData/Local/Android/Sdk/platform-tools/adb.exe'
const APP = 'com.sigmazam.app'
const adb = (...args) => spawnSync(ADB, args, { encoding: 'buffer', maxBuffer: 64 * 1024 * 1024 })
const sleep = (ms) => spawnSync(process.execPath, ['-e', `setTimeout(()=>{},${ms})`])
const dump = () => adb('exec-out', 'uiautomator', 'dump', '/dev/tty').stdout.toString('utf8')
const nodes = (xml) =>
  [...xml.matchAll(/<node [^>]*?text="([^"]*)"[^>]*?content-desc="([^"]*)"[^>]*?bounds="\[(\d+),(\d+)\]\[(\d+),(\d+)\]"/g)].map((m) => ({
    text: m[1] || m[2],
    x: Math.round((Number(m[3]) + Number(m[5])) / 2),
    y: Math.round((Number(m[4]) + Number(m[6])) / 2),
  }))

const [cmd, ...args] = process.argv.slice(2)
switch (cmd) {
  case 'reload':
    for (let i = 0; i < 2; i++) {
      adb('shell', 'am', 'force-stop', APP)
      adb('shell', 'monkey', '-p', APP, '-c', 'android.intent.category.LAUNCHER', '1')
      sleep(12000)
    }
    console.log('reloaded twice')
    break
  case 'open':
    adb('shell', 'am', 'start', '-a', 'android.intent.action.VIEW', '-d', `sigmazam://${args[0]}`, APP)
    sleep(3000)
    console.log('opened', args[0])
    break
  case 'texts':
    console.log(nodes(dump()).filter((n) => n.text.trim()).map((n) => `${n.text} @${n.x},${n.y}`).join('\n'))
    break
  case 'find': {
    const [text, scrollsArg, dir] = args
    for (let i = 0; i <= Number(scrollsArg || 0); i++) {
      const hit = nodes(dump()).find((n) => n.text === text)
      if (hit) {
        adb('shell', 'input', 'tap', String(hit.x), String(hit.y))
        console.log(`tapped "${text}" at ${hit.x},${hit.y}`)
        process.exit(0)
      }
      if (dir === 'up') adb('shell', 'input', 'swipe', '540', '700', '540', '1700', '300')
      else adb('shell', 'input', 'swipe', '540', '1700', '540', '700', '300')
      sleep(700)
    }
    console.log(`not found: "${text}"`)
    process.exit(1)
  }
  case 'tap':
    adb('shell', 'input', 'tap', args[0], args[1])
    break
  case 'swipe':
    adb('shell', 'input', 'swipe', args[0], args[1], args[2], args[3], args[4] ?? '600')
    break
  case 'type':
    adb('shell', 'input', 'text', args[0].replace(/ /g, '%s'))
    break
  case 'shot':
    writeFileSync(args[0], adb('exec-out', 'screencap', '-p').stdout)
    console.log('shot', args[0])
    break
  default:
    console.log('commands: reload | open <path> | texts | find "<text>" [scrolls] [up|down] | tap x y | swipe x1 y1 x2 y2 [ms] | type "<text>" | shot <png>')
}
