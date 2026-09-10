import { existsSync, mkdirSync, copyFileSync } from 'node:fs'
import { homedir } from 'node:os'
import { resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { spawnSync } from 'node:child_process'

const root = fileURLToPath(new URL('../', import.meta.url))
const env = { ...process.env }
const javaCandidates = [
  env.JAVA_HOME,
  '/Applications/Android Studio.app/Contents/jbr/Contents/Home',
  '/opt/homebrew/opt/openjdk@21/libexec/openjdk.jdk/Contents/Home',
  '/usr/local/opt/openjdk@21/libexec/openjdk.jdk/Contents/Home',
]
env.JAVA_HOME = javaCandidates.find((path) => path && existsSync(resolve(path, 'bin/java')))
env.ANDROID_HOME = env.ANDROID_HOME || env.ANDROID_SDK_ROOT || resolve(homedir(), 'Library/Android/sdk')
if (!env.JAVA_HOME || !existsSync(resolve(env.ANDROID_HOME, 'platforms/android-36'))) {
  console.error('Install JDK 21 and Android SDK 36, or set JAVA_HOME and ANDROID_HOME. See docs/android-testing.md.')
  process.exit(1)
}
const result = spawnSync('./gradlew', [':app:assembleDebug', '--console=plain'], {
  cwd: resolve(root, 'android'), env, stdio: 'inherit',
})
if (result.error) console.error(result.error.message)
if (result.status !== 0) process.exit(result.status || 1)
const output = resolve(root, 'artifacts/pocket-ledger-debug.apk')
mkdirSync(resolve(root, 'artifacts'), { recursive: true })
copyFileSync(resolve(root, 'android/app/build/outputs/apk/debug/app-debug.apk'), output)
console.log(`\nAPK ready: ${output}`)
