/* eslint-env node, es2021 */
// Test script to debug Amex parser
import process from 'process'
import * as pdfjsLib from 'pdfjs-dist'
import { readFileSync, existsSync } from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

pdfjsLib.GlobalWorkerOptions.workerSrc = './node_modules/pdfjs-dist/build/pdf.worker.mjs'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const DEFAULT_PDF_PATH = path.resolve(__dirname, '..', 'testdata', 'statements', 'sample-01.pdf')
const PDF_PATH = process.env.PDF_PATH || DEFAULT_PDF_PATH

function parseAmount(amountStr) {
  if (typeof amountStr === 'number') {
    return Math.abs(amountStr)
  }
  let cleaned = String(amountStr).replace(/[^\d.\-,]/g, '')
  if (cleaned.includes(',') && cleaned.includes('.')) {
    cleaned = cleaned.replace(/,/g, '')
  } else if (cleaned.includes(',')) {
    const parts = cleaned.split(',')
    if (parts[parts.length - 1].length === 2) {
      cleaned = cleaned.replace(',', '.')
    } else {
      cleaned = cleaned.replace(/,/g, '')
    }
  }
  const num = parseFloat(cleaned)
  return isNaN(num) ? 0 : Math.abs(num)
}

async function extractTextFromPDF(filePath) {
  const data = new Uint8Array(readFileSync(filePath))
  const pdf = await pdfjsLib.getDocument({ data }).promise
  const pages = []
  for (let i = 1; i <= pdf.numPages; i++) {
    const page = await pdf.getPage(i)
    const textContent = await page.getTextContent()
    const text = textContent.items.map(item => item.str).join(' ')
    pages.push(text)
  }
  return pages
}

async function debugAmexPDF(filePath) {
  const pages = await extractTextFromPDF(filePath)
  const fullText = pages.join(' ')

  const creditsMatch = fullText.match(/Credits\s+Amount([\s\S]*?)(?=New Charges|$)/i)
  const chargesMatch = fullText.match(/New Charges[\s\S]*?Detail[\s\S]*?Amount([\s\S]*?)(?=Fees\s+Amount|Interest Charged|2025 Fees and Interest|$)/i)

  const txPattern = /(\d{2}\/\d{2}\/\d{2})\s+(.{1,500}?)\s+(-?\$[\d,]+\.\d{2})\s*⧫/g

  console.log('=== CREDITS SECTION ===')
  let creditTotal = 0
  let creditCount = 0
  if (creditsMatch && creditsMatch[1]) {
    let match
    while ((match = txPattern.exec(creditsMatch[1])) !== null) {
      const [, date, desc, amount] = match
      const amountFloat = parseAmount(amount)
      creditTotal += amountFloat
      creditCount++
      console.log(`${date} ${desc.substring(0, 50).trim()} ${amount} -> $${amountFloat}`)
    }
  }
  console.log(`Total Credits: $${creditTotal.toFixed(2)} (${creditCount} transactions)\n`)

  console.log('=== CHARGES SECTION ===')
  let chargeTotal = 0
  let chargeCount = 0
  const seenIds = new Set()
  const duplicates = []

  if (chargesMatch && chargesMatch[1]) {
    txPattern.lastIndex = 0 // Reset regex
    let match
    while ((match = txPattern.exec(chargesMatch[1])) !== null) {
      const [, date, desc, amount] = match

      if (desc.includes('Account Ending') || desc.includes('Customer Care') || desc.length > 300) {
        continue
      }

      const amountFloat = parseAmount(amount)
      const cleanDesc = desc.substring(0, 50).trim()
      const txId = `${date}-${amountFloat}-${cleanDesc}`.replace(/[^a-zA-Z0-9]/g, '')

      if (seenIds.has(txId)) {
        duplicates.push(`DUPLICATE: ${date} ${cleanDesc} $${amountFloat}`)
        continue
      }

      seenIds.add(txId)
      chargeTotal += amountFloat
      chargeCount++
      console.log(`${chargeCount}. ${date} ${cleanDesc} ${amount} -> $${amountFloat}`)
    }
  }

  console.log(`\nTotal Charges: $${chargeTotal.toFixed(2)} (${chargeCount} transactions)`)
  console.log(`\n=== SUMMARY ===`)
  console.log(`Credits: ${creditCount} transactions, $${creditTotal.toFixed(2)}`)
  console.log(`Charges: ${chargeCount} transactions, $${chargeTotal.toFixed(2)}`)
  console.log(`Total transactions: ${creditCount + chargeCount}`)
  console.log(`Net spending: $${(chargeTotal - creditTotal).toFixed(2)}`)
  console.log(`\nExpected values:`)
  console.log(`- Set manually for your fixture if you want a comparison`)

  if (duplicates.length > 0) {
    console.log(`\n=== DUPLICATES FOUND ===`)
    duplicates.forEach(d => console.log(d))
  }
}

if (!existsSync(PDF_PATH)) {
  console.log(`PDF not found. Set PDF_PATH or add a fixture at ${DEFAULT_PDF_PATH}.`)
} else {
  debugAmexPDF(PDF_PATH)
}
