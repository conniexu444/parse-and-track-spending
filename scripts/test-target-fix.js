// Quick test to verify the Target date fix
/* eslint-env node, es2021 */
import process from 'process'
import { parsePDF } from '../src/utils/parsers.js'
import fs from 'fs/promises'
import path from 'path'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const DEFAULT_PDF_PATH = path.resolve(__dirname, '..', 'testdata', 'statements', 'sample-01.pdf')
const PDF_PATH = process.env.PDF_PATH || DEFAULT_PDF_PATH

async function testTargetFix() {
  const pdfPath = PDF_PATH

  try {
    await fs.access(pdfPath)
  } catch {
    console.log(`PDF not found. Set PDF_PATH or add a fixture at ${DEFAULT_PDF_PATH}.`)
    return
  }

  // Read the PDF as a File-like object
  const buffer = await fs.readFile(pdfPath)
  const file = new File([buffer], path.basename(pdfPath), { type: 'application/pdf' })

  console.log(`Parsing ${path.basename(pdfPath)}...\n`)
  const { transactions } = await parsePDF(file)

  // Find Target transactions
  const targetTransactions = transactions.filter(t =>
    t.title.toLowerCase().includes('target')
  )

  console.log(`Found ${targetTransactions.length} Target transactions:\n`)

  for (const txn of targetTransactions) {
    const date = new Date(txn.timestamp)
    const formattedDate = date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    })
    console.log(`${formattedDate} - ${txn.title} - $${txn.amount.toFixed(2)}`)
  }

  // Specifically check the $40.51 Target transaction
  const targetProblem = targetTransactions.find(t => t.amount === 40.51)
  if (targetProblem) {
    const date = new Date(targetProblem.timestamp)
    const month = date.getMonth() + 1
    const day = date.getDate()
    const year = date.getFullYear()
    console.log(`\n✓ The $40.51 Target transaction is now dated: ${month}/${day}/${year}`)

    if (month === 4 && day === 19 && year === 2025) {
      console.log('✓ SUCCESS! Date is now correct (04/19/2025)')
    } else {
      console.log(`✗ FAIL! Expected 04/19/2025 but got ${month}/${day}/${year}`)
    }
  } else {
    console.log('\n✗ Could not find the $40.51 Target transaction')
  }
}

testTargetFix().catch(console.error)
