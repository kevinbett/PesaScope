// npm on macOS records optional packages for *other* platforms (e.g. rollup's Linux
// build) in package-lock.json without a version, and npm on Linux then aborts with
// "Invalid Version". Drop those phantom entries; npm resolves them from the registry
// on the platform that actually needs them. Runs on postinstall so the lock stays clean.
const fs = require('fs')
const path = require('path')
const file = path.join(__dirname, '..', 'package-lock.json')
if (!fs.existsSync(file)) process.exit(0)
const lock = JSON.parse(fs.readFileSync(file, 'utf8'))
let removed = 0
for (const [key, entry] of Object.entries(lock.packages || {})) {
  if (key && !entry.version && !entry.link) { delete lock.packages[key]; removed++ }
}
if (removed) { fs.writeFileSync(file, JSON.stringify(lock, null, 2) + '\n'); console.log(`fix-lock: removed ${removed} versionless optional entr${removed === 1 ? 'y' : 'ies'}`) }
