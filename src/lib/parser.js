// pdf.js wiring for the browser; all parsing logic lives in parser-core.js
import * as pdfjsLib from 'pdfjs-dist'
import workerUrl from 'pdfjs-dist/build/pdf.worker.min.mjs?url'
import { extractLines, parseStatement } from './parser-core.js'
export { categorize, counterparty, enrich } from './parser-core.js'

pdfjsLib.GlobalWorkerOptions.workerSrc = workerUrl

/** name of the error pdf.js throws for missing/wrong passwords */
export function isPasswordError(e) {
  return e && (e.name === 'PasswordException' || /password/i.test(String(e.message)))
}

/**
 * Parse an M-Pesa statement PDF.
 * @param {ArrayBuffer} buf  the PDF bytes
 * @param {string} [password]
 * @param {(page:number, pages:number, phase?:string)=>void} [onProgress]
 * @returns {Promise<{meta: object, summary: object, txns: object[]}>}
 */
export async function parsePdf(buf, password, onProgress) {
  const doc = await pdfjsLib.getDocument({ data: buf.slice(0), password: password || undefined }).promise
  const lines = await extractLines(doc, onProgress)
  if (onProgress) onProgress(doc.numPages, doc.numPages, 'parsing')
  return parseStatement(lines)
}
