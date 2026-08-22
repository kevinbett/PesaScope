/**
 * Save a generated text file for the user, wherever the app is running:
 * - On claude.ai (published artifact): the `downloads` runtime capability,
 *   falling back from .csv to .txt when extended extensions are disabled.
 * - Standalone file / normal hosting (e.g. Vercel): a classic browser download.
 * Returns true when a save/download was started or the viewer declined;
 * false when nothing worked (caller should point at Copy instead).
 */
export async function saveTextFile(filename, text) {
  // claude.ai artifact runtime, when present
  try {
    if (typeof window.claude?.use === 'function') {
      const dl = await window.claude.use('downloads')
      if (dl) {
        try {
          await dl.save({ filename, data: text })
          return true
        } catch (e) {
          if (e && e.code === 'extension_not_enabled' && /\.csv$/i.test(filename)) {
            try {
              await dl.save({ filename: filename.replace(/\.csv$/i, '.txt'), data: text })
              return true
            } catch (e2) {
              if (e2 && e2.code === 'declined') return true
            }
          } else if (e && e.code === 'declined') {
            return true   // the viewer said no — that's a completed interaction
          }
          // other codes: fall through to the classic path
        }
      }
    }
  } catch { /* fall through */ }

  // classic browser download
  try {
    const blob = new Blob([text], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = filename
    document.body.appendChild(a)
    a.click()
    a.remove()
    setTimeout(() => URL.revokeObjectURL(url), 5000)
    return true
  } catch {
    return false
  }
}
