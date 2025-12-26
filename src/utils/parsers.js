import Papa from 'papaparse'
import * as pdfjsLib from 'pdfjs-dist'
import pdfjsWorker from 'pdfjs-dist/build/pdf.worker.min.mjs?url'
import categoryConfig from './category-config.json'

// Set up PDF.js worker
pdfjsLib.GlobalWorkerOptions.workerSrc = pdfjsWorker

// Load category keywords and merchant mappings from config
// Note: category-config.json is git-ignored for privacy
// If you clone this repo, copy category-config.example.json to category-config.json
const CATEGORY_KEYWORDS = categoryConfig.categoryKeywords
const MERCHANT_MAPPINGS = categoryConfig.merchantMappings

export function categorizeTransaction(title) {
  const titleLower = title.toLowerCase()
  for (const [category, keywords] of Object.entries(CATEGORY_KEYWORDS)) {
    for (const keyword of keywords) {
      if (titleLower.includes(keyword)) {
        return category
      }
    }
  }
  return 'Other'
}

export function cleanMerchantName(rawDescription) {
  let name = rawDescription.trim()

  // Decode HTML entities
  name = name.replace(/&#039;/g, "'")
  name = name.replace(/&amp;/g, "&")
  name = name.replace(/&quot;/g, '"')
  name = name.replace(/&lt;/g, '<')
  name = name.replace(/&gt;/g, '>')

  // Check for mapped merchant names from config
  for (const [pattern, friendlyName] of Object.entries(MERCHANT_MAPPINGS)) {
    if (new RegExp(pattern, 'i').test(name)) {
      return friendlyName
    }
  }

  // Remove leading date patterns (MM/DD/YY, MM/DD/YYYY, etc.)
  name = name.replace(/^\d{1,2}\/\d{1,2}\/\d{2,4}\s+/g, '')

  // Remove "AplPay " prefix
  name = name.replace(/^AplPay\s+/i, '')

  // Remove TST* prefix (Toast POS system)
  name = name.replace(/^TST\*\s*/i, '')

  // Remove BT* prefix (Bill.com/payment processor)
  name = name.replace(/^BT\*\s*/i, '')

  // Remove PY* prefix (payment processor)
  name = name.replace(/^PY\s*\*\s*/i, '')

  // Remove WIX* prefix (Wix payment processor)
  name = name.replace(/^WIX\*[^*]*\*/i, '')

  // Remove DD* prefix (DoorDash)
  name = name.replace(/^DD\s*\*/i, '')

  // Remove TM* prefix (Ticketmaster)
  name = name.replace(/^TM\s*\*/i, '')

  // Remove PT* prefix (payment processor)
  name = name.replace(/^PT\s*\*/i, '')

  // Remove SP prefix (Square POS)
  name = name.replace(/^SP\s+/i, '')

  // Remove common POS system patterns
  name = name.replace(/\s+squareup\.com\/receipts$/i, '')

  // Remove phone numbers (various formats)
  name = name.replace(/\s+\d{3}-\d{3}-\d{4}/g, '') // 123-456-7890
  name = name.replace(/\s+\(\d{3}\)\s*\d{3}-\d{4}/g, '') // (800) 555-1234
  name = name.replace(/\s+\+\d{11,}/g, '') // +18005551234

  // Remove email addresses
  name = name.replace(/\s+[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/i, '')

  // Remove URLs
  name = name.replace(/\s+https?:\/\/\S+/gi, '')
  name = name.replace(/\s+[a-z]+\.com\/\S*/gi, '')

  // Remove very long transaction IDs (alphanumeric strings 20+ chars)
  name = name.replace(/\s+[A-Z0-9_-]{20,}/gi, '')

  // Remove common category suffixes only if they're clearly metadata
  name = name.replace(/\s+(GOODS\/SERVICES|LOCAL TRANSPORTATION|CABLE & PAY TV)$/i, '')

  // Clean up extra whitespace
  name = name.replace(/\s+/g, ' ').trim()

  // Capitalize first letter of each word for consistency
  name = name.split(' ')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(' ')

  return name
}

function cleanAppleCardDescription(rawDescription) {
  // First apply standard cleaning (removes TST*, PAYPAL *, etc.)
  let desc = cleanMerchantName(rawDescription)

  // Remove full addresses (number + street + city + ZIP + state + country)
  desc = desc.replace(/\s+\d+[\s\S]*?\d{5}\s+[A-Z]{2}\s+(?:USA|US)/gi, '')

  // Remove remaining address artifacts
  desc = desc.replace(/\s+\d{5}(?:-\d{4})?\s*$/, '')  // Trailing ZIP
  desc = desc.replace(/\s+[A-Z]{2}\s*$/, '')           // Trailing state
  desc = desc.replace(/\s+(?:USA|US)\s*$/i, '')        // Trailing country

  // Clean up extra whitespace
  desc = desc.replace(/\s+/g, ' ').trim()

  return desc
}

export function isTransferOrPayment(description) {
  const lowerDesc = description.toLowerCase()

  // For checking accounts: Only filter actual transfers, not bill payments/subscriptions
  // Credit card payments (paying off credit cards - already counted on CC statements)
  const creditCardPayments = [
    'amex epayment',
    'amex payment',
    'american express ach',
    'american express pmt',
    'applecard gsbank',
    'apple card payment',
    'chase payment',
    'citi payment',
    'discover payment',
    'capital one payment',
    'credit card payment'
  ]

  // P2P and account transfers (money movement, not spending)
  const accountTransfers = [
    'zelle',
    'venmo',
    'paypal transfer',
    'account transfer',
    'transfer to',
    'transfer from',
    'robinhood',           // Investment transfers
    'debits xxxxx',        // Investment/brokerage transfers
    'internal transfer',
    'external transfer'
  ]

  // Check credit card payments
  if (creditCardPayments.some(keyword => lowerDesc.includes(keyword))) {
    return true
  }

  // Check account transfers
  if (accountTransfers.some(keyword => lowerDesc.includes(keyword))) {
    return true
  }

  return false
}

export function parseAmount(amountStr) {
  if (typeof amountStr === 'number') {
    return Math.abs(amountStr)
  }

  // Remove currency symbols and whitespace
  let cleaned = String(amountStr).replace(/[^\d.\-,]/g, '')

  // Handle comma as thousands separator
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
  return (isNaN(num) || !isFinite(num)) ? 0 : Math.abs(num)
}

export function parseDate(dateStr) {
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

export function detectSource(filename = '', content = '') {
  const lowerFilename = (filename || '').toLowerCase()

  if (lowerFilename.includes('amex') || lowerFilename.includes('american') || lowerFilename.includes('american-express')) {
    return 'American Express'
  } else if (lowerFilename.includes('chase')) {
    return 'Chase'
  } else if (lowerFilename.includes('citi')) {
    return 'Citi'
  } else if (lowerFilename.includes('discover')) {
    return 'Discover'
  } else if (lowerFilename.includes('capital') || lowerFilename.includes('capitalone')) {
    return 'Capital One'
  } else if (lowerFilename.includes('apple')) {
    return 'Apple Card'
  } else if (lowerFilename.includes('usb') || lowerFilename.includes('us bank') || lowerFilename.includes('usbank')) {
    return 'US Bank'
  }

  // Try to detect from content patterns
  if (content.includes('AplPay') || content.includes('AMEX')) {
    return 'American Express'
  }

  return 'Unknown'
}

export function parseCSVText(text, filename = '') {
  return new Promise((resolve, reject) => {
    Papa.parse(text, {
      header: true,
      skipEmptyLines: true,
      complete: (results) => {
        if (!results.data || results.data.length === 0) {
          reject(new Error('Empty CSV file'))
          return
        }

        const fields = results.meta.fields || []
        const normalizedFields = {}
        fields.forEach(f => {
          normalizedFields[f.toLowerCase().trim()] = f
        })

        // Find date column
        let dateCol = null
        for (const key of ['date', 'timestamp', 'time', 'transaction date', 'trans date']) {
          if (normalizedFields[key]) {
            dateCol = normalizedFields[key]
            break
          }
        }

        // Find amount column
        let amountCol = null
        for (const key of ['amount', 'value', 'total', 'price', 'cost', 'debit', 'transaction amount']) {
          if (normalizedFields[key]) {
            amountCol = normalizedFields[key]
            break
          }
        }

        // Find title/description column
        let titleCol = null
        for (const key of ['title', 'description', 'name', 'merchant', 'vendor', 'payee', 'transaction description']) {
          if (normalizedFields[key]) {
            titleCol = normalizedFields[key]
            break
          }
        }

        if (!dateCol || !amountCol || !titleCol) {
          reject(new Error(`Could not identify required columns. Found: ${fields.join(', ')}. Need date, amount, and title/description columns.`))
          return
        }

        const source = detectSource(filename, results.data.map(r => Object.values(r).join(' ')).join(' '))

        const transactions = results.data
          .map(row => {
            const timestamp = parseDate(row[dateCol])
            const amount = parseAmount(row[amountCol])
            const title = (row[titleCol] || '').trim()

            if (amount > 0 && title) {
              return {
                id: `${timestamp}-${amount}-${title}`.replace(/[^a-zA-Z0-9]/g, ''),
                timestamp,
                amount,
                title,
                category: categorizeTransaction(title),
                source
              }
            }
            return null
          })
          .filter(Boolean)

        resolve({ transactions, source })
      },
      error: (error) => {
        reject(error)
      }
    })
  })
}

export async function parseCSV(file) {
  const text = await file.text()
  return parseCSVText(text, file.name)
}

async function extractTextFromPDFBuffer(arrayBuffer, { disableWorker = false, maxPages = 60 } = {}) {
  const pdf = await pdfjsLib.getDocument({ data: arrayBuffer, disableWorker }).promise
  if (Number.isFinite(maxPages) && pdf.numPages > maxPages) {
    throw new Error(`PDF has ${pdf.numPages} pages. Max allowed is ${maxPages}.`)
  }

  const pages = []
  for (let i = 1; i <= pdf.numPages; i++) {
    const page = await pdf.getPage(i)
    const textContent = await page.getTextContent()
    const text = textContent.items.map(item => item.str).join(' ')
    pages.push(text)
  }

  return pages
}

function parseAmexPDF(pages) {
  const transactions = []
  const fullText = pages.join(' ')

  // Find the Credits and New Charges sections
  // We only want to parse transactions from these specific sections
  const creditsMatch = fullText.match(/Credits\s+Amount([\s\S]*?)(?=New Charges|$)/i)
  const chargesMatch = fullText.match(/New Charges[\s\S]*?Detail[\s\S]*?Amount([\s\S]*?)(?=Fees\s+Amount|Interest Charged|2025 Fees and Interest|$)/i)

  const seenTransactions = new Set()
  const transactionCounts = new Map() // Track occurrence count for each transaction key

  // Helper function to parse transactions from a text section
  function parseSection(sectionText, isCredit = false) {
    // Pattern: MM/DD/YY (with optional *) ... description ... Amount ⧫
    // The * indicates posting date and should be handled
    // Use [\s\S] instead of . to match across newlines for complex transaction details
    // Match the last dollar amount before ⧫ (no other ⧫ should appear in between)
    const txPattern = /(\d{2}\/\d{2}\/\d{2})\*?\s+([\s\S]*?)(-?\$[\d,]+\.\d{2})\s*⧫/g

    let match
    while ((match = txPattern.exec(sectionText)) !== null) {
      let [, dateStr, rawDescription, amountStr] = match

      // Skip negative amounts in Charges section (they're credits that belong in Credits section)
      if (!isCredit && amountStr.startsWith('-')) {
        continue
      }

      // Only skip obvious header/metadata text (but not "Account Ending" which can be in real transactions due to page breaks)
      const descTrim = rawDescription.trim()
      if (descTrim.includes('Customer Care') ||
          descTrim.includes('Payment Due Date') ||
          descTrim.includes('Website: americanexpress') ||
          descTrim.length < 3) {
        continue
      }

      // Check if this is a page break artifact by looking for the telltale pattern
      // If the description contains "Account Ending...Detail Continued...Amount" followed by another date,
      // extract the real transaction date from within the description
      const pageBreakPattern = /Account Ending.*?Detail Continued\s+⧫\s+-\s+Pay Over Time.*?Amount\s+(\d{2}\/\d{2}\/\d{2})/
      const pageBreakMatch = rawDescription.match(pageBreakPattern)
      if (pageBreakMatch) {
        // Use the date from within the description (the actual transaction date)
        dateStr = pageBreakMatch[1]
      }

      // Parse date
      const [month, day, year] = dateStr.split('/')
      const fullYear = parseInt(year, 10) + 2000
      const fullDate = `${month}/${day}/${fullYear}`
      const timestamp = parseDate(fullDate)

      // Initial cleanup - collapse whitespace and remove page break artifacts
      let rawClean = rawDescription
        .replace(/\s+/g, ' ')  // Collapse multiple spaces/newlines to single space
        .replace(/Account Ending.*?Detail Continued\s+⧫\s+-\s+Pay Over Time.*?Amount\s+/, '') // Remove page break artifacts
        .trim()

      // Apply comprehensive merchant name cleanup
      const description = cleanMerchantName(rawClean)

      // Skip transfers and payments (not actual spending)
      if (isTransferOrPayment(description)) {
        continue
      }

      // Parse amount
      const amountFloat = parseAmount(amountStr)

      // Create unique ID with occurrence counter to handle legitimate duplicate transactions
      const creditFlag = isCredit ? 'CR' : 'CH'
      const baseKey = `${creditFlag}-${timestamp}-${amountFloat}-${description}`.replace(/[^a-zA-Z0-9]/g, '')

      // Get occurrence count for this transaction
      const occurrenceCount = (transactionCounts.get(baseKey) || 0) + 1
      transactionCounts.set(baseKey, occurrenceCount)

      // Add occurrence counter to ID to make same-day duplicates unique
      const txId = `${baseKey}-${occurrenceCount}`

      if (amountFloat > 0 && description.length > 2 && !seenTransactions.has(txId)) {
        seenTransactions.add(txId)

        const title = isCredit ? `[CREDIT] ${description}` : description

        transactions.push({
          id: txId,
          timestamp,
          amount: amountFloat,
          title,
          category: categorizeTransaction(description),
          source: 'American Express'
        })
      }
    }
  }

  // Parse Credits section
  if (creditsMatch && creditsMatch[1]) {
    parseSection(creditsMatch[1], true)
  }

  // Parse New Charges section
  if (chargesMatch && chargesMatch[1]) {
    parseSection(chargesMatch[1], false)
  }

  return transactions
}

function parseAppleCardPDF(pages) {
  const transactions = []
  const fullText = pages.join(' ')

  const seenTransactions = new Set()
  const transactionCounts = new Map()

  // Helper to create unique transaction
  // Note: description should already be cleaned and pre-filtered for transfers
  function addTransaction(dateStr, description, amount, isCredit = false) {
    const timestamp = parseDate(dateStr)
    const amountFloat = parseAmount(amount)

    if (amountFloat === 0 || !description || description.length < 2) {
      return
    }

    // Create unique ID with occurrence counter
    const creditFlag = isCredit ? 'CREDIT' : 'TXN'
    const baseKey = `${creditFlag}-${timestamp}-${amountFloat}-${description}`.replace(/[^a-zA-Z0-9]/g, '')
    const occurrenceCount = (transactionCounts.get(baseKey) || 0) + 1
    transactionCounts.set(baseKey, occurrenceCount)
    const txId = `${baseKey}-${occurrenceCount}`

    if (!seenTransactions.has(txId)) {
      seenTransactions.add(txId)

      const title = isCredit ? `[CREDIT] ${description}` : description

      transactions.push({
        id: txId,
        timestamp,
        amount: amountFloat,
        title,
        category: categorizeTransaction(title),
        source: 'Apple Card'
      })
    }
  }

  // Parse Transactions section
  const transactionsMatch = fullText.match(/Transactions[\s\S]*?Date[\s\S]*?Description[\s\S]*?Daily Cash[\s\S]*?Amount([\s\S]*?)(?=Payments|Daily Cash Summary|Total Daily Cash|$)/i)

  if (transactionsMatch && transactionsMatch[1]) {
    let transactionsText = transactionsMatch[1]

    // Normalize whitespace to improve matching consistency across PDF libraries
    // Replace multiple spaces/tabs with single space, but preserve line breaks
    transactionsText = transactionsText
      .replace(/[ \t]+/g, ' ')  // Multiple spaces/tabs -> single space
      .replace(/ *\n */g, '\n')  // Remove spaces around newlines
      .trim()

    // Primary pattern: date + description + percentage + cashback + amount
    // Made more flexible to handle PDF extraction variations
    const txPattern = /(\d{2}\/\d{2}\/\d{4})\s+([\s\S]+?)\s+(\d+%)\s*\$\d+\.\d{2}\s+\$(\d{1,3}(?:,\d{3})*\.\d{2})/g

    const matchedDates = new Set()
    let match
    let primaryCount = 0

    // First pass: Primary pattern
    while ((match = txPattern.exec(transactionsText)) !== null) {
      const [, dateStr, rawDescription, , amount] = match

      // Skip if description is suspiciously short or looks like a header
      if (rawDescription.length < 3 ||
          rawDescription.match(/^(Date|Description|Amount|Daily Cash|Total)$/i)) {
        continue
      }

      // IMPORTANT: Check for transfers on RAW description BEFORE cleaning
      // This prevents merchant mappings (e.g., "SQ *" -> "Square Payment") from triggering false positives
      if (isTransferOrPayment(rawDescription)) {
        continue
      }

      // Clean the merchant description AFTER transfer check
      const description = cleanAppleCardDescription(rawDescription)

      matchedDates.add(dateStr + '-' + amount)
      addTransaction(dateStr, description, amount, false)
      primaryCount++
    }

    // Second pass: Fallback pattern for missed transactions
    // More flexible pattern that handles edge cases (e.g., SQ * transactions)
    const fallbackPattern = /(\d{2}\/\d{2}\/\d{4})[\s\n]+([\s\S]+?)[\s\n]+(\d+%)[\s\n]*\$[\d,]+\.(\d{2})[\s\n]+\$(\d{1,3}(?:,\d{3})*\.\d{2})/g

    let fallbackCount = 0
    while ((match = fallbackPattern.exec(transactionsText)) !== null) {
      const [, dateStr, rawDescription, , , amount] = match
      const txKey = dateStr + '-' + amount

      // Skip if already matched in first pass
      if (matchedDates.has(txKey)) {
        continue
      }

      // Skip if raw description is too short or looks like a header
      if (rawDescription.length < 3 ||
          rawDescription.match(/^(Date|Description|Amount|Daily Cash|Total)$/i)) {
        continue
      }

      // Check for transfers on raw description before cleaning
      if (isTransferOrPayment(rawDescription)) {
        continue
      }

      const description = cleanAppleCardDescription(rawDescription)

      addTransaction(dateStr, description, amount, false)
      fallbackCount++
    }
  }

  // Parse Payments section
  const paymentsMatch = fullText.match(/Payments[\s\S]*?Date[\s\S]*?Description[\s\S]*?Amount([\s\S]*?)(?=Daily Cash Summary|Interest Charged|Total|Transactions|$)/i)

  if (paymentsMatch && paymentsMatch[1]) {
    const paymentsText = paymentsMatch[1]

    // Pattern: date + ACH Deposit + description + -$amount
    const paymentPattern = /(\d{2}\/\d{2}\/\d{4})\s+ACH Deposit\s+([^-\$]+?)\s+-\$(\d{1,3}(?:,\d{3})*\.\d{2})/g

    let match
    while ((match = paymentPattern.exec(paymentsText)) !== null) {
      const [, dateStr, rawDescription, amount] = match

      // Skip if raw description indicates a transfer (should filter all ACH deposits)
      if (isTransferOrPayment(rawDescription)) {
        continue
      }

      const description = cleanAppleCardDescription(rawDescription)

      if (description.length >= 3) {
        addTransaction(dateStr, description, amount, true)
      }
    }
  }

  return transactions
}

function parseUSBankPDF(pages) {
  const transactions = []
  const fullText = pages.join(' ')

  // Extract the statement period to get the year (accounting for spaces in PDF text)
  // Pattern matches: "09 / 26 / 20 25" format from PDFs
  const periodMatch = fullText.match(/(\d{2})\s*\/\s*(\d{2})\s*\/\s*(\d{2})\s+(\d{2})\s*-\s*(\d{2})\s*\/\s*(\d{2})\s*\/\s*(\d{2})\s+(\d{2})/)

  let statementStartMonth, statementEndMonth, statementStartYear, statementEndYear
  if (periodMatch) {
    statementStartMonth = parseInt(periodMatch[1], 10)
    statementStartYear = `${periodMatch[3]}${periodMatch[4]}`
    statementEndMonth = parseInt(periodMatch[5], 10)
    statementEndYear = `${periodMatch[7]}${periodMatch[8]}`
  } else {
    // Fallback to current year if pattern not found
    const currentYear = new Date().getFullYear().toString()
    statementStartYear = currentYear
    statementEndYear = currentYear
    statementStartMonth = 1
    statementEndMonth = 12
  }

  const seenTransactions = new Set()
  const transactionCounts = new Map()

  // Helper to determine the correct year for a transaction
  function getTransactionYear(month) {
    // If statement crosses year boundary (e.g., Dec 2024 - Jan 2025)
    if (statementStartMonth > statementEndMonth) {
      // December transactions belong to start year, January to end year
      return month >= statementStartMonth ? statementStartYear : statementEndYear
    }
    // Otherwise, all transactions use end year
    return statementEndYear
  }

  // Helper to add transaction
  function addTransaction(dateStr, description, amountStr) {
    // Clean the date string - remove extra spaces
    const cleanDate = dateStr.replace(/\s+/g, '')

    // Parse the date - dateStr is MM/DD format, need to add year
    const [month, day] = cleanDate.split('/')
    const transactionYear = getTransactionYear(parseInt(month, 10))
    const fullDate = `${month}/${day}/${transactionYear}`
    const timestamp = parseDate(fullDate)

    // Clean the merchant description (remove extra spaces first)
    const normalizedDescription = description.replace(/\s+/g, ' ').trim()
    const cleanedDescription = cleanMerchantName(normalizedDescription)

    // Skip transfers and payments (double-check in case any slip through)
    if (isTransferOrPayment(cleanedDescription)) {
      return
    }

    // Parse amount
    const amountFloat = parseAmount(amountStr)

    if (amountFloat === 0 || !cleanedDescription || cleanedDescription.length < 2) {
      return
    }

    // Create unique ID with occurrence counter
    const baseKey = `PURCHASE-${timestamp}-${amountFloat}-${cleanedDescription}`.replace(/[^a-zA-Z0-9]/g, '')
    const occurrenceCount = (transactionCounts.get(baseKey) || 0) + 1
    transactionCounts.set(baseKey, occurrenceCount)
    const txId = `${baseKey}-${occurrenceCount}`

    if (!seenTransactions.has(txId)) {
      seenTransactions.add(txId)

      transactions.push({
        id: txId,
        timestamp,
        amount: amountFloat,
        title: cleanedDescription,
        category: categorizeTransaction(cleanedDescription),
        source: 'US Bank'
      })
    }
  }

  // Find all transaction lines in the document
  // Pattern accounts for spaces in dates: "10 / 22   10 / 22   MTC   PAYMENT THANK YOU   $524.77"
  // Flexible pattern to match: MM / DD   MM / DD   REF   DESCRIPTION   $AMOUNT
  const txPattern = /(\d{1,2}\s*\/\s*\d{1,2})\s+(\d{1,2}\s*\/\s*\d{1,2})\s+([A-Z0-9]+)\s+([\s\S]+?)\s+\$(\d{1,3}(?:,\d{3})*\.\d{2})/g

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
      continue
    }

    // All remaining transactions are purchases
    // Use the transaction date (not post date) for more accurate tracking
    addTransaction(transDate, description.trim(), amount, false)
  }

  return transactions
}

export async function parsePDFBuffer(arrayBuffer, filename = '', { disableWorker = false, maxPages = 60 } = {}) {
  try {
    const pages = await extractTextFromPDFBuffer(arrayBuffer, { disableWorker, maxPages })
    const fullText = pages.join(' ')

    // Detect PDF type
    let transactions = []
    let source = 'Unknown'

    if (fullText.includes('Apple Card') || fullText.includes('Goldman Sachs')) {
      transactions = parseAppleCardPDF(pages)
      source = 'Apple Card'
    } else if (fullText.includes('American Express') || fullText.includes('AMERICAN EXPRESS')) {
      transactions = parseAmexPDF(pages)
      source = 'American Express'
    } else if (fullText.includes('U.S. Bank') || fullText.includes('US Bank') || fullText.includes('usbank.com') || fullText.includes('Altitude Go')) {
      transactions = parseUSBankPDF(pages)
      source = 'US Bank'
    } else {
      throw new Error('Unknown PDF format. Supported formats: American Express, Apple Card, US Bank')
    }

    if (transactions.length === 0) {
      throw new Error('No transactions found in PDF. Make sure this is a valid credit card statement.')
    }

    return { transactions, source, filename }
  } catch (error) {
    throw new Error(`Failed to parse PDF: ${error.message}`)
  }
}

export async function parsePDF(file, { maxPages = 60 } = {}) {
  const arrayBuffer = await file.arrayBuffer()
  return parsePDFBuffer(arrayBuffer, file.name, { maxPages })
}
