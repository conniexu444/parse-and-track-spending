/* eslint-env node, es2021 */
import process from 'process'
import * as pdfjsLib from 'pdfjs-dist/legacy/build/pdf.mjs'
import fs from 'fs/promises'
import path from 'path'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

// Configuration
const DEFAULT_STATEMENTS_DIR = path.resolve(__dirname, '..', 'testdata', 'statements')
const STATEMENTS_DIR = process.env.STATEMENTS_DIR || DEFAULT_STATEMENTS_DIR

// Example expected values (replace with your own fixtures)
const EXPECTED_VALUES = {
  'sample-01.pdf': {
    totalSpent: 1234.56,
    totalCredits: 78.9,
    netSpending: 1155.66
  }
}

// PDFs to test
const PDFS = [
  'sample-01.pdf'
]

// Copy of parseAmount from parsers.js
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

// Copy of parseDate from parsers.js
function parseDate(dateStr) {
  try {
    const date = new Date(dateStr)
    if (isNaN(date.getTime())) {
      return new Date().toISOString()
    }
    return date.toISOString()
  } catch {
    return new Date().toISOString()
  }
}

// Copy of cleanMerchantName from parsers.js
function cleanMerchantName(rawDescription) {
  let name = rawDescription.trim()

  const merchantMappings = {
    'NYCT PAYGO': 'MTA Subway',
    'NJT RAIL MY-TIX': 'NJ Transit',
    'VENTRA ACCOUNT': 'Chicago Ventra',
    'PATH TAPP PAYGO': 'PATH Train',
    'PABT': 'Port Authority Bus',
    'TRADER JOE S': "Trader Joe's",
    'WHOLEFDS': 'Whole Foods',
    'SHOPRITE': 'ShopRite'
  }

  for (const [pattern, friendlyName] of Object.entries(merchantMappings)) {
    if (new RegExp(pattern, 'i').test(name)) {
      return friendlyName
    }
  }

  name = name.replace(/^AplPay\s+/i, '')
  name = name.replace(/^TST\*\s*/i, '')
  name = name.replace(/^SP\s+/i, '')
  name = name.replace(/\s+squareup\.com\/receipts$/i, '')
  name = name.replace(/\s+#?\d{3,}\s+\d{6,}/g, '')
  name = name.replace(/\s+\d{10,}/g, '')
  name = name.replace(/\s+0{4,}\d+/g, '')
  name = name.replace(/\s+[A-Z][a-z]+\s+[A-Z]{2}$/i, '')
  name = name.replace(/\s+[A-Z\s]+\s+[A-Z]{2}$/i, '')
  name = name.replace(/\s+\d{3}-\d{3}-\d{4}/, '')
  name = name.replace(/\s+\d{10}/, '')
  name = name.replace(/\s+\+\d+/, '')
  name = name.replace(/\s+[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/i, '')
  name = name.replace(/\s+https?:\/\/\S+/gi, '')
  name = name.replace(/\s+\S+\.(com|net|org|info)\/\S*/gi, '')
  name = name.replace(/\s+[A-Z\s]{10,}$/i, '')
  name = name.replace(/\s+\d{4,}\s*$/, '')
  name = name.replace(/\s+(RESTAURANT|FAST FOOD|CABLE & PAY TV|LOCAL TRANSPORTATION|MISC|NONE|GROCERY STOR|PHARMACIES)$/i, '')
  name = name.replace(/\s+/g, ' ').trim()

  name = name.split(' ')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(' ')

  return name
}

// Extract text from PDF
async function extractTextFromPDF(filePath) {
  const data = new Uint8Array(await fs.readFile(filePath))
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

// Copy of parseAmexPDF from parsers.js
function parseAmexPDF(pages) {
  const transactions = []
  const fullText = pages.join(' ')

  const creditsMatch = fullText.match(/Credits\s+Amount([\s\S]*?)(?=New Charges|$)/i)
  const chargesMatch = fullText.match(/New Charges[\s\S]*?Detail[\s\S]*?Amount([\s\S]*?)(?=Fees\s+Amount|Interest Charged|2025 Fees and Interest|$)/i)

  const seenTransactions = new Set()
  const transactionCounts = new Map()

  function parseSection(sectionText, isCredit = false) {
    const txPattern = /(\d{2}\/\d{2}\/\d{2})\*?\s+([\s\S]*?)(-?\$[\d,]+\.\d{2})\s*⧫/g

    let match
    while ((match = txPattern.exec(sectionText)) !== null) {
      const [, dateStr, rawDescription, amountStr] = match

      if (!isCredit && amountStr.startsWith('-')) {
        continue
      }

      const descTrim = rawDescription.trim()
      if (descTrim.includes('Customer Care') ||
          descTrim.includes('Payment Due Date') ||
          descTrim.includes('Website: americanexpress') ||
          descTrim.length < 3) {
        continue
      }

      const [month, day, year] = dateStr.split('/')
      const fullYear = parseInt(year, 10) + 2000
      const fullDate = `${month}/${day}/${fullYear}`
      const timestamp = parseDate(fullDate)

      let rawClean = rawDescription
        .replace(/\s+/g, ' ')
        .replace(/Account Ending.*?Detail Continued\s+⧫\s+-\s+Pay Over Time.*?Amount\s+/, '')
        .trim()

      const description = cleanMerchantName(rawClean)
      const amountFloat = parseAmount(amountStr)

      const creditFlag = isCredit ? 'CR' : 'CH'
      const baseKey = `${creditFlag}-${timestamp}-${amountFloat}-${description}`.replace(/[^a-zA-Z0-9]/g, '')

      const occurrenceCount = (transactionCounts.get(baseKey) || 0) + 1
      transactionCounts.set(baseKey, occurrenceCount)

      const txId = `${baseKey}-${occurrenceCount}`

      if (amountFloat > 0 && description.length > 2 && !seenTransactions.has(txId)) {
        seenTransactions.add(txId)

        const title = isCredit ? `[CREDIT] ${description}` : description
        const type = isCredit ? 'credit' : 'debit'

        transactions.push({
          id: txId,
          timestamp,
          amount: amountFloat,
          title,
          type
        })
      }
    }
  }

  if (creditsMatch && creditsMatch[1]) {
    parseSection(creditsMatch[1], true)
  }

  if (chargesMatch && chargesMatch[1]) {
    parseSection(chargesMatch[1], false)
  }

  return transactions
}

// Calculate totals from transactions
function calculateTotals(transactions) {
  let totalSpent = 0
  let totalCredits = 0

  for (const txn of transactions) {
    if (txn.type === 'debit') {
      totalSpent += txn.amount
    } else if (txn.type === 'credit') {
      totalCredits += txn.amount
    }
  }

  return {
    totalSpent: Math.round(totalSpent * 100) / 100,
    totalCredits: Math.round(totalCredits * 100) / 100,
    netSpending: Math.round((totalSpent - totalCredits) * 100) / 100
  }
}

// Test a single PDF
async function testPDF(pdfName) {
  const pdfPath = path.join(STATEMENTS_DIR, pdfName)

  console.log(`\n${'='.repeat(60)}`)
  console.log(`Testing: ${pdfName}`)
  console.log(`${'='.repeat(60)}`)

  try {
    // Check if file exists
    await fs.access(pdfPath)

    // Extract and parse PDF
    console.log('Extracting text from PDF...')
    const pages = await extractTextFromPDF(pdfPath)

    console.log('Parsing Amex transactions...')
    const transactions = parseAmexPDF(pages)

    console.log(`Found ${transactions.length} transactions`)
    console.log(`  - Credits: ${transactions.filter(t => t.type === 'credit').length}`)
    console.log(`  - Charges: ${transactions.filter(t => t.type === 'debit').length}`)

    // Calculate totals
    const calculated = calculateTotals(transactions)

    console.log(`\nCalculated values:`)
    console.log(`  Total Spent:   $${calculated.totalSpent.toFixed(2)}`)
    console.log(`  Total Credits: $${calculated.totalCredits.toFixed(2)}`)
    console.log(`  Net Spending:  $${calculated.netSpending.toFixed(2)}`)

    // Check against expected values if available
    if (EXPECTED_VALUES[pdfName]) {
      const expected = EXPECTED_VALUES[pdfName]
      console.log(`\nExpected values:`)
      console.log(`  Total Spent:   $${expected.totalSpent.toFixed(2)}`)
      console.log(`  Total Credits: $${expected.totalCredits.toFixed(2)}`)
      console.log(`  Net Spending:  $${expected.netSpending.toFixed(2)}`)

      const tolerance = 0.01
      const spentMatch = Math.abs(calculated.totalSpent - expected.totalSpent) < tolerance
      const creditsMatch = Math.abs(calculated.totalCredits - expected.totalCredits) < tolerance
      const netMatch = Math.abs(calculated.netSpending - expected.netSpending) < tolerance

      if (spentMatch && creditsMatch && netMatch) {
        console.log(`\n✓ PASS - All values match!`)
        return {
          pdf: pdfName,
          status: 'PASS',
          calculated,
          expected
        }
      } else {
        console.log(`\n✗ FAIL - Values don't match!`)
        const mismatches = []
        if (!spentMatch) {
          const diff = calculated.totalSpent - expected.totalSpent
          mismatches.push(`Total Spent: expected $${expected.totalSpent.toFixed(2)}, got $${calculated.totalSpent.toFixed(2)} (diff: ${diff > 0 ? '+' : ''}$${diff.toFixed(2)})`)
        }
        if (!creditsMatch) {
          const diff = calculated.totalCredits - expected.totalCredits
          mismatches.push(`Total Credits: expected $${expected.totalCredits.toFixed(2)}, got $${calculated.totalCredits.toFixed(2)} (diff: ${diff > 0 ? '+' : ''}$${diff.toFixed(2)})`)
        }
        if (!netMatch) {
          const diff = calculated.netSpending - expected.netSpending
          mismatches.push(`Net Spending: expected $${expected.netSpending.toFixed(2)}, got $${calculated.netSpending.toFixed(2)} (diff: ${diff > 0 ? '+' : ''}$${diff.toFixed(2)})`)
        }

        for (const mismatch of mismatches) {
          console.log(`  - ${mismatch}`)
        }

        return {
          pdf: pdfName,
          status: 'FAIL',
          calculated,
          expected,
          mismatches
        }
      }
    } else {
      console.log(`\n⚠ NO EXPECTED VALUES - Manual verification needed`)
      console.log(`Please verify these numbers manually in the PDF`)
      return {
        pdf: pdfName,
        status: 'NO_EXPECTED',
        calculated
      }
    }
  } catch (error) {
    console.log(`\n✗ ERROR: ${error.message}`)
    return {
      pdf: pdfName,
      status: 'ERROR',
      message: error.message
    }
  }
}

// Main function
async function main() {
  console.log('Starting automated Amex PDF statement testing...')
  console.log(`Statements directory: ${STATEMENTS_DIR}`)
  console.log(`Testing ${PDFS.length} PDFs...`)

  try {
    await fs.access(STATEMENTS_DIR)
  } catch {
    console.log(`\n⚠ Statements directory not found. Set STATEMENTS_DIR or add fixtures to ${DEFAULT_STATEMENTS_DIR}.`)
    return
  }

  const results = []
  for (const pdfName of PDFS) {
    const result = await testPDF(pdfName)
    results.push(result)
  }

  // Print summary
  console.log(`\n${'='.repeat(60)}`)
  console.log('TEST SUMMARY')
  console.log(`${'='.repeat(60)}`)

  const passed = results.filter(r => r.status === 'PASS')
  const failed = results.filter(r => r.status === 'FAIL')
  const noExpected = results.filter(r => r.status === 'NO_EXPECTED')
  const errors = results.filter(r => r.status === 'ERROR')

  console.log(`\n✓ PASSED: ${passed.length}`)
  for (const r of passed) {
    console.log(`  - ${r.pdf}`)
  }

  if (failed.length > 0) {
    console.log(`\n✗ FAILED: ${failed.length}`)
    for (const r of failed) {
      console.log(`  - ${r.pdf}`)
      if (r.mismatches) {
        for (const mismatch of r.mismatches) {
          console.log(`    • ${mismatch}`)
        }
      }
    }
  }

  if (noExpected.length > 0) {
    console.log(`\n⚠ NO EXPECTED VALUES: ${noExpected.length}`)
    for (const r of noExpected) {
      console.log(`  - ${r.pdf}`)
      const calc = r.calculated
      console.log(`    Spent: $${calc.totalSpent.toFixed(2)}, Credits: $${calc.totalCredits.toFixed(2)}, Net: $${calc.netSpending.toFixed(2)}`)
    }
  }

  if (errors.length > 0) {
    console.log(`\n✗ ERRORS: ${errors.length}`)
    for (const r of errors) {
      console.log(`  - ${r.pdf}: ${r.message}`)
    }
  }

  console.log(`\nTotal: ${passed.length} passed, ${failed.length} failed, ${noExpected.length} need verification, ${errors.length} errors`)
}

main().catch(console.error)
