/** Trigger a browser download of a text file. Returns false if the browser blocked it. */
export async function saveTextFile(filename, text, type = 'text/csv') {
  try {
    const url = URL.createObjectURL(new Blob([text], { type }))
    const a = Object.assign(document.createElement('a'), { href: url, download: filename })
    document.body.appendChild(a); a.click(); a.remove()
    setTimeout(() => URL.revokeObjectURL(url), 5000)
    return true
  } catch { return false }
}
