import Papa from 'papaparse'
import * as pdfjsLib from 'pdfjs-dist'
import pdfjsWorker from 'pdfjs-dist/build/pdf.worker.min.mjs?url'
import categoryConfig from './category-config.json'

// Set up PDF.js worker
pdfjsLib.GlobalWorkerOptions.workerSrc = pdfjsWorker

// Load category keywords from config
const CATEGORY_KEYWORDS = categoryConfig.categoryKeywords

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
  for (const [pattern, friendlyName] of Object.entries(categoryConfig.merchantMappings)) {
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

  // Remove SP prefix (Square POS)
  name = name.replace(/^SP\s+/i, '')

  // Remove common POS system patterns
  name = name.replace(/\s+squareup\.com\/receipts$/i, '')

  // Remove store numbers and IDs
  name = name.replace(/\s+#?\d{3,}\s+\d{6,}/g, '') // Store # + long number
  name = name.replace(/\s+\d{10,}/g, '') // Long numbers (10+ digits)
  name = name.replace(/\s+0{4,}\d+/g, '') // Numbers with leading zeros

  // Remove location info - city and state patterns
  name = name.replace(/\s+[A-Z][a-z]+\s+[A-Z]{2}$/i, '') // "Princeton NJ"
  name = name.replace(/\s+[A-Z\s]+\s+[A-Z]{2}$/i, '') // "NEW YORK NY"

  // Remove phone numbers (various formats)
  name = name.replace(/\s+\d{3}-\d{3}-\d{4}/g, '') // 123-456-7890
  name = name.replace(/\s+\d{3}-\d{7}/g, '') // 612-3044357
  name = name.replace(/\s+\d{3}\s+\d{3}-\d{4}/g, '') // 888 432-3299
  name = name.replace(/\s+\d{10}/g, '') // 1234567890
  name = name.replace(/\s+\+\d+/g, '') // +1234567890

  // Remove email addresses
  name = name.replace(/\s+[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/i, '')

  // Remove URLs
  name = name.replace(/\s+https?:\/\/\S+/gi, '')
  name = name.replace(/\s+\S+\.(com|net|org|info)\/\S*/gi, '')

  // Remove trailing metadata in ALL CAPS or numbers
  name = name.replace(/\s+[A-Z\s]{10,}$/i, '') // Long uppercase text at end
  name = name.replace(/\s+\d{4,}\s*$/, '') // Trailing numbers

  // Remove common suffixes
  name = name.replace(/\s+(RESTAURANT|FAST FOOD|CABLE & PAY TV|LOCAL TRANSPORTATION|MISC|NONE|GROCERY STOR|PHARMACIES)$/i, '')

  // Clean up extra whitespace
  name = name.replace(/\s+/g, ' ').trim()

  // Capitalize first letter of each word for consistency
  name = name.split(' ')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(' ')

  return name
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
  return isNaN(num) ? 0 : Math.abs(num)
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

export function detectSource(filename, content = '') {
  const lowerFilename = filename.toLowerCase()

  if (lowerFilename.includes('amex') || lowerFilename.includes('american') || lowerFilename.includes('american-express')) {
    return 'American Express'
  } else if (lowerFilename.includes('chase')) {
    return 'Chase'
  } else if (lowerFilename.includes('wells') || lowerFilename.includes('fargo')) {
    return 'Wells Fargo'
  } else if (lowerFilename.includes('citi')) {
    return 'Citi'
  } else if (lowerFilename.includes('discover')) {
    return 'Discover'
  } else if (lowerFilename.includes('capital') || lowerFilename.includes('capitalone')) {
    return 'Capital One'
  } else if (lowerFilename.includes('apple')) {
    return 'Apple Card'
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

function parseWellsFargoPDF(pages) {
  const transactions = []
  const fullText = pages.join(' ')

  // Get statement year from first page
  const yearMatch = fullText.match(/Statement Period \d{2}\/\d{2}\/(\d{4})/)
  const statementYear = yearMatch ? yearMatch[1] : new Date().getFullYear().toString()

  // Use regex to find all transactions globally
  // Pattern: 4-digit card ending, MM/DD date, MM/DD date, ref number, description, amount
  const txPattern = /(\d{4})\s+(\d{2}\/\d{2})\s+(\d{2}\/\d{2})\s+([A-Z0-9]+)\s+(.+?)\s+([\d,]+\.\d{2})(?=\s+\d{4}\s+\d{2}\/\d{2}|\s+TOTAL|\s+Fees|$)/g

  // Track seen reference numbers to avoid duplicates
  const seenRefs = new Set()

  let match
  while ((match = txPattern.exec(fullText)) !== null) {
    const [, , transDate, , refNum, description, amount] = match

    // Skip if we've already seen this reference number
    if (seenRefs.has(refNum)) {
      continue
    }
    seenRefs.add(refNum)

    const fullDate = `${transDate}/${statementYear}`
    const timestamp = parseDate(fullDate)
    const amountFloat = parseAmount(amount)

    if (amountFloat > 0) {
      transactions.push({
        id: `${timestamp}-${amountFloat}-${refNum}`.replace(/[^a-zA-Z0-9]/g, ''),
        timestamp,
        amount: amountFloat,
        title: description.trim(),
        category: categorizeTransaction(description),
        source: 'Wells Fargo'
      })
    }
  }

  return transactions
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

  // Apple Card format: date, description, cashback %, daily cash amount, transaction amount
  // The key pattern is: MM/DD/YYYY followed by text, then X% $X.XX $XX.XX
  // We need to find each transaction by looking for the pattern: date...percentage $amount $amount

  // Find all dates in the text first
  const datePattern = /(\d{2}\/\d{2}\/\d{4})/g
  const dates = []
  let dateMatch
  while ((dateMatch = datePattern.exec(fullText)) !== null) {
    dates.push({ date: dateMatch[1], index: dateMatch.index })
  }

  // For each date, try to extract the transaction ending with X% $X.XX $XX.XX
  for (let i = 0; i < dates.length; i++) {
    const startIndex = dates[i].index
    const endIndex = dates[i + 1]?.index || fullText.length
    const segment = fullText.substring(startIndex, endIndex)

    // Match: date + description + percentage + cashback + amount
    // The description ends when we hit the pattern: digit% $digit
    const txMatch = segment.match(/^(\d{2}\/\d{2}\/\d{4})\s+(.+?)\s+(\d+%)\s+\$([\d.]+)\s+\$([\d,]+\.\d{2})/)

    if (txMatch) {
      const [, dateStr, description, , , amount] = txMatch

      // Clean up description - remove any trailing payment/header text that got mixed in
      let cleanDesc = description.trim()

      // If description contains another date pattern, truncate before it
      const extraDateMatch = cleanDesc.match(/\d{2}\/\d{2}\/\d{4}/)
      if (extraDateMatch) {
        cleanDesc = cleanDesc.substring(0, extraDateMatch.index).trim()
      }

      // Remove common PDF artifacts that shouldn't be in description
      const artifactPatterns = [
        /ACH Deposit.*$/i,
        /Total payments.*$/i,
        /Transactions Date Description.*$/i,
        /Daily Cash Amount.*$/i,
      ]
      for (const pattern of artifactPatterns) {
        cleanDesc = cleanDesc.replace(pattern, '').trim()
      }

      const timestamp = parseDate(dateStr)
      const amountFloat = parseAmount(amount)

      if (amountFloat > 0 && cleanDesc.length > 0) {
        transactions.push({
          id: `${timestamp}-${amountFloat}-${cleanDesc}`.replace(/[^a-zA-Z0-9]/g, ''),
          timestamp,
          amount: amountFloat,
          title: cleanDesc,
          category: categorizeTransaction(cleanDesc),
          source: 'Apple Card'
        })
      }
    }
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

    if (fullText.includes('American Express') || fullText.includes('AMERICAN EXPRESS')) {
      transactions = parseAmexPDF(pages)
      source = 'American Express'
    } else if (fullText.includes('Apple Card') || fullText.includes('Goldman Sachs')) {
      transactions = parseAppleCardPDF(pages)
      source = 'Apple Card'
    } else if (fullText.includes('WELLS FARGO') || fullText.includes('Wells Fargo')) {
      transactions = parseWellsFargoPDF(pages)
      source = 'Wells Fargo'
    } else {
      throw new Error('Unknown PDF format. Supported formats: American Express, Wells Fargo, Apple Card')
    }

    if (transactions.length === 0) {
      throw new Error(`No transactions found in PDF. Make sure this is a valid ${source} credit card statement.`)
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
