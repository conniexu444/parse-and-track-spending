import { parseCSVText, parsePDFBuffer } from '../utils/parsers'

self.onmessage = async (event) => {
  const { id, filename, kind, payload } = event.data || {}

  try {
    if (!id || !filename || !kind || !payload) {
      throw new Error('Invalid worker message')
    }

    let result
    if (kind === 'csv') {
      result = await parseCSVText(payload.text, filename)
    } else if (kind === 'pdf') {
      const maxPages = payload.maxPages
      result = await parsePDFBuffer(payload.arrayBuffer, filename, { disableWorker: true, maxPages })
    } else {
      throw new Error(`Unsupported file type: ${kind}`)
    }

    self.postMessage({ id, ok: true, result })
  } catch (error) {
    self.postMessage({ id, ok: false, error: error.message || String(error) })
  }
}
