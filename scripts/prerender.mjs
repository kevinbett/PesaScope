// Prerender the landing UI to static HTML so AI crawlers / no-JS readers get
// real content, not an empty <div id="root">. Pure Node + react-dom/server.
// pdf.js and Vite's `?url` worker import are browser-only and only run when a
// file is dropped, so they're stubbed for the build-time render.
import { build } from 'esbuild'
import { readFileSync, writeFileSync, rmSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import path from 'node:path'

const dir = path.dirname(fileURLToPath(import.meta.url))
const root = path.join(dir, '..')
const tmp = path.join(dir, '.prerender-bundle.mjs')

const stub = {
  name: 'stub-browser-only',
  setup(b) {
    b.onResolve({ filter: /\?url$/ }, (a) => ({ path: a.path, namespace: 'stub-url' }))
    b.onLoad({ filter: /.*/, namespace: 'stub-url' }, () => ({ contents: 'export default ""', loader: 'js' }))
    b.onResolve({ filter: /^pdfjs-dist$/ }, (a) => ({ path: a.path, namespace: 'stub-pdfjs' }))
    b.onLoad({ filter: /.*/, namespace: 'stub-pdfjs' }, () => ({
      contents: 'export const GlobalWorkerOptions = {}; export function getDocument(){ return { promise: Promise.resolve(null) } }',
      loader: 'js',
    }))
  },
}

const entry = `
import React from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import App from ${JSON.stringify(path.join(root, 'src/App.jsx'))}
export const html = renderToStaticMarkup(React.createElement(App))
`
await build({
  stdin: { contents: entry, resolveDir: root, loader: 'js' },
  bundle: true, format: 'esm', platform: 'node', jsx: 'automatic',
  packages: 'external', plugins: [stub], outfile: tmp, logLevel: 'error',
})
const { html } = await import(`${tmp}?t=${Date.now()}`)
rmSync(tmp, { force: true })

const indexPath = path.join(root, 'dist/index.html')
const doc = readFileSync(indexPath, 'utf8')
const marker = '<div id="root"></div>'
if (!doc.includes(marker)) throw new Error('prerender: empty root div not found in dist/index.html')
writeFileSync(indexPath, doc.replace(marker, `<div id="root">${html}</div>`))
console.log(`prerender: injected ${html.length.toLocaleString()} chars into dist/index.html`)
