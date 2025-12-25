/* eslint-env node, es2021 */
// Test script to debug US Bank parser
// Usage: PDF_PATH=/path/to/statement.pdf node scripts/test-usbank-parser.js
import process from 'process'
import * as pdfjsLib from 'pdfjs-dist/legacy/build/pdf.mjs'
import { readFileSync, existsSync } from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const PDF_PATH = process.env.PDF_PATH || 'test-statement.pdf'

// Set worker src to absolute path
pdfjsLib.GlobalWorkerOptions.workerSrc = path.resolve(__dirname, '..', 'node_modules', 'pdfjs-dist', 'legacy', 'build', 'pdf.worker.mjs')

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

async function debugUSBankPDF(filePath) {
  const pages = await extractTextFromPDF(filePath)
  const fullText = pages.join(' ')

  console.log('=== FULL TEXT (first 1000 chars) ===')
  console.log(fullText.substring(0, 1000))
  console.log('\n')

  console.log('=== SEARCHING FOR TRANSACTIONS SECTION ===')
  const transactionsSectionIndex = fullText.indexOf('Transactions')
  if (transactionsSectionIndex !== -1) {
    console.log(`Found "Transactions" at index ${transactionsSectionIndex}`)
    console.log(`Context: ${fullText.substring(transactionsSectionIndex, transactionsSectionIndex + 500)}`)
  }
  console.log('\n')

  console.log('=== SEARCHING FOR PURCHASES SECTION ===')
  const purchasesSectionIndex = fullText.indexOf('Purchases and Other Debits')
  if (purchasesSectionIndex !== -1) {
    console.log(`Found "Purchases and Other Debits" at index ${purchasesSectionIndex}`)
    console.log(`Context: ${fullText.substring(purchasesSectionIndex, purchasesSectionIndex + 1000)}`)
  }
  console.log('\n')

  // Extract statement period (with flexible spacing)
  const periodMatch = fullText.match(/(\d{2})\s*\/\s*(\d{2})\s*\/\s*(\d{2})\s+(\d{2})\s*-\s*(\d{2})\s*\/\s*(\d{2})\s*\/\s*(\d{2})\s+(\d{2})/)
  console.log('=== STATEMENT PERIOD ===')
  if (periodMatch) {
    console.log(`Period: ${periodMatch[0]}`)
    console.log(`Year: ${periodMatch[7]}${periodMatch[8]}`)
  } else {
    console.log('Could not find statement period')
  }
  console.log('\n')

  // Parse all transactions using the same pattern as the main parser
  console.log('=== PARSING ALL TRANSACTIONS ===')
  const txPattern = /(\d{1,2}\s*\/\s*\d{1,2})\s+(\d{1,2}\s*\/\s*\d{1,2})\s+([A-Z0-9]+)\s+([\s\S]+?)\s+\$(\d{1,3}(?:,\d{3})*\.\d{2})/g

  let purchaseTotal = 0
  let purchaseCount = 0
  let creditTotal = 0
  let creditCount = 0

  let match
  while ((match = txPattern.exec(fullText)) !== null) {
    const [, postDate, transDate, refNum, description, amount] = match

    // Skip obvious header text, metadata, or section labels
    // Match exact strings only (using $ anchor) to avoid filtering legitimate merchants
    // like "TOTAL WINE", "POST OFFICE", etc.
    if (description.match(/^(TOTAL|Continued|Post Date|Trans Date|Date|Ref|Transaction Date|Description|Amount|Page \d+|Statement Period|CR)$/i)) {
      continue
    }

    // Skip if description is too short (likely noise)
    if (description.trim().length < 3) {
      continue
    }

    // Skip payments entirely (not actual spending, just paying off the card)
    if (description.toUpperCase().includes('PAYMENT')) {
      console.log(`SKIPPED PAYMENT: ${transDate.replace(/\s+/g, '')} [${refNum}] ${description.substring(0, 50).trim()} $${parseAmount(amount)}`)
      continue
    }

    const amountFloat = parseAmount(amount)
    purchaseCount++
    purchaseTotal += amountFloat
    console.log(`PURCHASE ${purchaseCount}. ${transDate.replace(/\s+/g, '')} [${refNum}] ${description.substring(0, 50).trim()} $${amountFloat}`)
  }

  console.log(`\n=== SUMMARY ===`)
  console.log(`Credits: ${creditCount} transactions, $${creditTotal.toFixed(2)}`)
  console.log(`Purchases: ${purchaseCount} transactions, $${purchaseTotal.toFixed(2)}`)
  console.log(`Total transactions: ${creditCount + purchaseCount}`)
  console.log(`Net spending: $${(purchaseTotal - creditTotal).toFixed(2)}`)
}

if (!existsSync(PDF_PATH)) {
  console.log(`PDF not found at: ${PDF_PATH}`)
  console.log('Set PDF_PATH environment variable to the path of your US Bank statement.')
} else {
  console.log(`Testing with: ${PDF_PATH}\n`)
  debugUSBankPDF(PDF_PATH)
}
