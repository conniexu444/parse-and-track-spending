import { useState, useEffect, useMemo, useCallback, useRef } from 'react'
import { parseCSV, parsePDF } from '../utils/parsers'
import {
  addTransactions,
  clearTransactions,
  getFilteredTransactions,
  getSummary,
  getCategories,
  updateTransactionCategory,
  deleteTransaction
} from '../utils/storage'

const MAX_FILE_SIZE_BYTES = 2 * 1024 * 1024
const MAX_FILE_SIZE_LABEL = '2 MB'
const MAX_PDF_PAGES = 60
const PARSE_TIMEOUT_MS = 60000 // 60 seconds

function formatFileSize(bytes) {
  if (!Number.isFinite(bytes)) return 'unknown size'
  const kb = Math.ceil(bytes / 1024)
  return `${kb} KB`
}

export function useTransactions() {
  const [transactions, setTransactions] = useState([])
  const [summary, setSummary] = useState({ categories: [], grand_total: 0 })
  const [categories, setCategories] = useState(['All'])
  const [selectedCategory, setSelectedCategory] = useState('All')
  const [startDate, setStartDate] = useState('')
  const [endDate, setEndDate] = useState('')
  const [uploading, setUploading] = useState(false)
  const [message, setMessage] = useState({ text: '', type: null })
  const [editingId, setEditingId] = useState(null)
  const [sortField, setSortField] = useState('timestamp')
  const [sortDirection, setSortDirection] = useState('desc')
  const [deletingId, setDeletingId] = useState(null)
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false)
  const workerRef = useRef(null)
  const pendingRef = useRef(new Map())
  const timeoutIdsRef = useRef(new Map())

  const refreshData = useCallback(({ startDate, endDate, selectedCategory }) => {
    setCategories(getCategories())
    setTransactions(getFilteredTransactions(startDate, endDate, selectedCategory))
    setSummary(getSummary(startDate, endDate))
  }, [])

  useEffect(() => {
    if (!window.Worker) return undefined

    const worker = new Worker(new URL('../workers/parserWorker.js', import.meta.url), {
      type: 'module'
    })

    const handleMessage = (event) => {
      const { id, ok, result, error } = event.data || {}
      const pending = pendingRef.current.get(id)
      if (!pending) return

      // Clear timeout if it exists
      const timeoutId = timeoutIdsRef.current.get(id)
      if (timeoutId !== undefined) {
        clearTimeout(timeoutId)
        timeoutIdsRef.current.delete(id)
      }

      pendingRef.current.delete(id)
      if (ok) {
        pending.resolve(result)
      } else {
        pending.reject(new Error(error || 'Worker error'))
      }
    }

    const handleError = (event) => {
      const error = event?.message || 'Worker error'

      // Clear all timeouts
      timeoutIdsRef.current.forEach((timeoutId) => clearTimeout(timeoutId))
      timeoutIdsRef.current.clear()

      pendingRef.current.forEach(({ reject }) => reject(new Error(error)))
      pendingRef.current.clear()
    }

    worker.addEventListener('message', handleMessage)
    worker.addEventListener('error', handleError)
    workerRef.current = worker

    return () => {
      // Clear all pending timeouts before cleanup
      timeoutIdsRef.current.forEach((timeoutId) => clearTimeout(timeoutId))
      timeoutIdsRef.current.clear()

      // Clear all pending promises
      pendingRef.current.clear()

      worker.removeEventListener('message', handleMessage)
      worker.removeEventListener('error', handleError)

      // Reject all pending promises before terminating to prevent memory leaks
      pendingRef.current.forEach(({ reject }) => {
        reject(new Error('Worker terminated during cleanup'))
      })
      pendingRef.current.clear()

      worker.terminate()
    }
  }, [])

  const parseFile = useCallback(async (file) => {
    const worker = workerRef.current
    const filename = file.name
    const kind = filename.toLowerCase().endsWith('.csv') ? 'csv' : 'pdf'

    if (!worker || !window.Worker) {
      return kind === 'csv' ? parseCSV(file) : parsePDF(file, { maxPages: MAX_PDF_PAGES })
    }

    const id = typeof crypto?.randomUUID === 'function'
      ? crypto.randomUUID()
      : `${Date.now()}-${Math.random().toString(16).slice(2)}`

    const payload = kind === 'csv'
      ? { text: await file.text() }
      : { arrayBuffer: await file.arrayBuffer(), maxPages: MAX_PDF_PAGES }

    const transfer = kind === 'pdf' ? [payload.arrayBuffer] : []

    return new Promise((resolve, reject) => {
      // Set up timeout to prevent orphaned promises
      const timeoutId = setTimeout(() => {
        const pending = pendingRef.current.get(id)
        if (pending) {
          pendingRef.current.delete(id)
          timeoutIdsRef.current.delete(id)
          reject(new Error(`File parsing timed out after ${PARSE_TIMEOUT_MS / 1000} seconds`))
        }
      }, PARSE_TIMEOUT_MS)

      // Store both the promise handlers and timeout ID
      timeoutIdsRef.current.set(id, timeoutId)
      pendingRef.current.set(id, { resolve, reject })

      worker.postMessage({ id, filename, kind, payload }, transfer)
    })
  }, [])

  useEffect(() => {
    refreshData({ startDate: '', endDate: '', selectedCategory: 'All' })
  }, [refreshData])

  useEffect(() => {
    refreshData({ startDate, endDate, selectedCategory })
  }, [startDate, endDate, selectedCategory, refreshData])

  const handleFileUpload = useCallback(async (e) => {
    const files = Array.from(e.target.files)
    if (files.length === 0) return

    setUploading(true)
    setMessage({ text: '', type: null })

    try {
      let totalInserted = 0
      let totalSkipped = 0
      const sources = []

      for (const file of files) {
        if (file.size > MAX_FILE_SIZE_BYTES) {
          throw new Error(`${file.name} is too large (${formatFileSize(file.size)}). Max file size is ${MAX_FILE_SIZE_LABEL}.`)
        }

        let result
        const filename = file.name.toLowerCase()

        if (filename.endsWith('.csv') || filename.endsWith('.pdf')) {
          result = await parseFile(file)
        } else {
          throw new Error(`${file.name} must be a CSV or PDF`)
        }

        const { insertedCount, skippedCount } = addTransactions(result.transactions)
        totalInserted += insertedCount
        totalSkipped += skippedCount
        sources.push(result.source)
      }

      refreshData({ startDate, endDate, selectedCategory })

      let msg = `Imported ${totalInserted} transactions from ${files.length} file${files.length > 1 ? 's' : ''}`
      if (totalSkipped > 0) {
        msg += ` (${totalSkipped} duplicates skipped)`
      }
      setMessage({ text: msg, type: 'success' })
    } catch (err) {
      setMessage({ text: err.message, type: 'error' })
    } finally {
      setUploading(false)
      e.target.value = ''
    }
  }, [startDate, endDate, selectedCategory, refreshData, parseFile])

  const handleClearData = useCallback(() => {
    if (!window.confirm('Are you sure you want to clear all transactions?')) return

    clearTransactions()
    setMessage({ text: 'All transactions cleared', type: 'success' })
    refreshData({ startDate, endDate, selectedCategory })
  }, [startDate, endDate, selectedCategory, refreshData])

  const handleCategoryChange = useCallback((transactionId, newCategory) => {
    updateTransactionCategory(transactionId, newCategory)
    setEditingId(null)
    refreshData({ startDate, endDate, selectedCategory })
  }, [startDate, endDate, selectedCategory, refreshData])

  const handleDeleteTransaction = useCallback((transactionId) => {
    if (deleteTransaction(transactionId)) {
      setMessage({ text: 'Transaction deleted', type: 'success' })
      setDeleteConfirmOpen(false)
      setDeletingId(null)
      refreshData({ startDate, endDate, selectedCategory })
    }
  }, [startDate, endDate, selectedCategory, refreshData])

  const handleSort = useCallback((field) => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc')
    } else {
      setSortField(field)
      setSortDirection('asc')
    }
  }, [sortField, sortDirection])

  const resetFilters = useCallback(() => {
    setStartDate('')
    setEndDate('')
    setSelectedCategory('All')
  }, [])

  const sortedTransactions = useMemo(() => {
    return [...transactions].sort((a, b) => {
      let aVal, bVal

      switch (sortField) {
        case 'timestamp':
          aVal = new Date(a.timestamp)
          bVal = new Date(b.timestamp)
          break
        case 'title':
          aVal = a.title.toLowerCase()
          bVal = b.title.toLowerCase()
          break
        case 'category':
          aVal = a.category.toLowerCase()
          bVal = b.category.toLowerCase()
          break
        case 'source':
          aVal = (a.source || '').toLowerCase()
          bVal = (b.source || '').toLowerCase()
          break
        case 'amount':
          aVal = a.amount
          bVal = b.amount
          break
        default:
          return 0
      }

      if (aVal < bVal) return sortDirection === 'asc' ? -1 : 1
      if (aVal > bVal) return sortDirection === 'asc' ? 1 : -1
      return 0
    })
  }, [transactions, sortField, sortDirection])

  return {
    transactions: sortedTransactions,
    summary,
    categories,
    selectedCategory,
    setSelectedCategory,
    startDate,
    setStartDate,
    endDate,
    setEndDate,
    uploading,
    message,
    editingId,
    setEditingId,
    sortField,
    sortDirection,
    deletingId,
    setDeletingId,
    deleteConfirmOpen,
    setDeleteConfirmOpen,
    handleFileUpload,
    handleClearData,
    handleCategoryChange,
    handleDeleteTransaction,
    handleSort,
    resetFilters
  }
}
