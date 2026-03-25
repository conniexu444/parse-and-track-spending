import { useState } from 'react'
import { loadApiSettings, hasApiKey } from '../components/ApiKeyModal'
import TransactionsTable from '../components/TransactionsTable'
import SummarySection from '../components/SummarySection'

function SmartExtract() {
  const [file, setFile] = useState(null)
  const [transactions, setTransactions] = useState([])
  const [summary, setSummary] = useState({ categories: [], total_charges: 0, total_credits: 0, net_spending: 0 })
  const [selectedCategory, setSelectedCategory] = useState('All')
  const [status, setStatus] = useState('')
  const keySet = hasApiKey()

  const handleFile = (e) => {
    const f = e.target.files[0]
    if (f) setFile(f)
  }

  return (
    <div className="app">
      <header>
        <h1>Smart Extract</h1>
        <p className="smart-extract-subtitle">
          Upload a bank statement PDF — we scrub your personal info before anything is sent to the AI.
        </p>
      </header>

      <section className="smart-extract-section">
        {!keySet && (
          <div className="message error">
            No API key set. Add one via AI Settings on the Spending Tracker page.
          </div>
        )}

        <div className="smart-extract-upload">
          <label className="upload-label" htmlFor="se-file">
            <span>Choose a PDF bank statement</span>
            <input
              id="se-file"
              type="file"
              accept=".pdf"
              onChange={handleFile}
              disabled={!keySet}
            />
          </label>
          {file && <span className="smart-extract-filename">{file.name}</span>}
        </div>

        {file && keySet && (
          <button
            type="button"
            className="upload-btn"
            onClick={() => setStatus('coming-soon')}
          >
            Extract Transactions
          </button>
        )}

        {status === 'coming-soon' && (
          <div className="message">Extraction pipeline coming soon.</div>
        )}
      </section>

      {transactions.length > 0 && (
        <>
          <SummarySection
            summary={summary}
            selectedCategory={selectedCategory}
            setSelectedCategory={setSelectedCategory}
          />
          <TransactionsTable
            transactions={transactions}
            readOnly={true}
            sortField="timestamp"
            sortDirection="desc"
            handleSort={() => {}}
          />
        </>
      )}
    </div>
  )
}

export default SmartExtract
