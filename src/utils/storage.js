let memoryTransactions = []

export function getTransactions() {
  return memoryTransactions
}

export function saveTransactions(transactions) {
  memoryTransactions = [...transactions]
}

export function addTransactions(newTransactions) {
  const existing = getTransactions()

  // Count occurrences of each key in existing transactions
  const existingKeyCounts = {}
  existing.forEach(t => {
    const key = `${t.timestamp}-${t.amount}-${t.title}`
    existingKeyCounts[key] = (existingKeyCounts[key] || 0) + 1
  })

  // Count occurrences in new transactions
  const newKeyCounts = {}
  newTransactions.forEach(tx => {
    const key = `${tx.timestamp}-${tx.amount}-${tx.title}`
    newKeyCounts[key] = (newKeyCounts[key] || 0) + 1
  })

  let insertedCount = 0
  let skippedCount = 0

  // Track how many of each key we've processed from new transactions
  const processedCounts = {}

  newTransactions.forEach(tx => {
    const key = `${tx.timestamp}-${tx.amount}-${tx.title}`
    processedCounts[key] = (processedCounts[key] || 0) + 1

    const existingCount = existingKeyCounts[key] || 0
    const currentProcessed = processedCounts[key]

    // Only add if this occurrence number exceeds what we already have
    if (currentProcessed > existingCount) {
      // Generate unique ID with occurrence number
      const uniqueId = `${tx.id}-${existingCount + (currentProcessed - existingCount)}`
      existing.push({ ...tx, id: uniqueId })
      existingKeyCounts[key] = (existingKeyCounts[key] || 0) + 1
      insertedCount++
    } else {
      skippedCount++
    }
  })

  saveTransactions(existing)
  return { insertedCount, skippedCount }
}

export function clearTransactions() {
  memoryTransactions = []
}

export function getFilteredTransactions(startDate, endDate, category) {
  let transactions = getTransactions()

  if (startDate) {
    const startDateTime = new Date(startDate).getTime()
    transactions = transactions.filter(t => new Date(t.timestamp).getTime() >= startDateTime)
  }

  if (endDate) {
    const endDateTime = new Date(endDate + 'T23:59:59.999Z').getTime()
    transactions = transactions.filter(t => new Date(t.timestamp).getTime() <= endDateTime)
  }

  if (category && category !== 'All') {
    transactions = transactions.filter(t => t.category === category)
  }

  // Sort by date descending
  transactions.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp))

  return transactions
}

export function getSummary(startDate, endDate) {
  let transactions = getTransactions()

  if (startDate) {
    const startDateTime = new Date(startDate).getTime()
    transactions = transactions.filter(t => new Date(t.timestamp).getTime() >= startDateTime)
  }

  if (endDate) {
    const endDateTime = new Date(endDate + 'T23:59:59.999Z').getTime()
    transactions = transactions.filter(t => new Date(t.timestamp).getTime() <= endDateTime)
  }

  // Group by category and track charges vs credits
  const categoryMap = {}
  let totalCharges = 0
  let totalCredits = 0

  transactions.forEach(tx => {
    const isCredit = tx.title.startsWith('[CREDIT]')

    if (!categoryMap[tx.category]) {
      categoryMap[tx.category] = { category: tx.category, total: 0, count: 0 }
    }
    categoryMap[tx.category].total += tx.amount
    categoryMap[tx.category].count++

    // Track charges and credits separately
    if (isCredit) {
      totalCredits += tx.amount
    } else {
      totalCharges += tx.amount
    }
  })

  // Convert to array and sort by total descending
  const categories = Object.values(categoryMap).sort((a, b) => b.total - a.total)

  return {
    categories,
    grand_total: totalCharges + totalCredits, // for backwards compatibility
    total_charges: totalCharges,
    total_credits: totalCredits,
    net_spending: totalCharges - totalCredits
  }
}

export function getCategories() {
  const transactions = getTransactions()
  const categories = new Set(transactions.map(t => t.category))
  return ['All', ...Array.from(categories).sort()]
}

export function updateTransactionCategory(transactionId, newCategory) {
  const transactions = getTransactions()
  const index = transactions.findIndex(t => t.id === transactionId)
  if (index !== -1) {
    transactions[index].category = newCategory
    saveTransactions(transactions)
    return true
  }
  return false
}

export function deleteTransaction(transactionId) {
  const transactions = getTransactions()
  const index = transactions.findIndex(t => t.id === transactionId)
  if (index !== -1) {
    transactions.splice(index, 1)
    saveTransactions(transactions)
    return true
  }
  return false
}

export const ALL_CATEGORIES = [
  'Food & Dining',
  'Transportation',
  'Shopping',
  'Entertainment',
  'Subscriptions',
  'Bills & Utilities',
  'Health',
  'Travel',
  'Other'
]
