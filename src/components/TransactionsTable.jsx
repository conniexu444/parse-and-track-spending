import React from 'react'
import { ALL_CATEGORIES } from '../utils/storage'
import { formatCurrency, formatDate, getCategoryClassName } from '../utils/formatters'
import SortHeader from './SortHeader'

function TransactionsTable({
  transactions,
  editingId,
  setEditingId,
  handleCategoryChange,
  sortField,
  sortDirection,
  handleSort,
  deletingId,
  setDeletingId,
  setDeleteConfirmOpen
}) {

  return (
    <section className="transactions-section">
      <h2>Transactions ({transactions.length})</h2>
      <div className="transactions-list">
        {transactions.length === 0 ? (
          <p className="no-data">No transactions found. Upload a CSV or PDF file to get started.</p>
        ) : (
          <table>
            <thead>
              <tr>
                <SortHeader field="timestamp" label="Date" sortField={sortField} sortDirection={sortDirection} onSort={handleSort} />
                <SortHeader field="title" label="Description" sortField={sortField} sortDirection={sortDirection} onSort={handleSort} />
                <SortHeader field="category" label="Category" sortField={sortField} sortDirection={sortDirection} onSort={handleSort} />
                <SortHeader field="source" label="Source" sortField={sortField} sortDirection={sortDirection} onSort={handleSort} />
                <SortHeader field="amount" label="Amount" sortField={sortField} sortDirection={sortDirection} onSort={handleSort} />
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {transactions.map((tx, index) => (
                <tr key={tx.id || index}>
                  <td>{formatDate(tx.timestamp)}</td>
                  <td>{tx.title}</td>
                  <td>
                    {editingId === tx.id ? (
                      <select
                        className="category-select"
                        value={tx.category}
                        onChange={(e) => handleCategoryChange(tx.id, e.target.value)}
                        onBlur={() => setEditingId(null)}
                        autoFocus
                      >
                        {ALL_CATEGORIES.map((cat) => (
                          <option key={cat} value={cat}>{cat}</option>
                        ))}
                      </select>
                    ) : (
                      <button
                        type="button"
                        className={`category-badge editable category-${getCategoryClassName(tx.category)}`}
                        onClick={() => setEditingId(tx.id)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter' || e.key === ' ') {
                            e.preventDefault()
                            setEditingId(tx.id)
                          }
                        }}
                        aria-label={`Change category for ${tx.title}, currently ${tx.category}`}
                      >
                        {tx.category}
                      </button>
                    )}
                  </td>
                  <td><span className={`source-badge source-${(tx.source || 'unknown').toLowerCase().replace(/\s+/g, '-')}`}>{tx.source || 'Unknown'}</span></td>
                  <td className="amount-cell">{formatCurrency(tx.amount)}</td>
                  <td className="actions-cell">
                    <button
                      type="button"
                      className="delete-btn"
                      onClick={() => {
                        setDeletingId(tx.id)
                        setDeleteConfirmOpen(true)
                      }}
                      aria-label={`Delete transaction for ${tx.title}`}
                      title="Delete this transaction"
                    >
                      <span className="delete-icon">×</span>
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </section>
  )
}

export default React.memo(TransactionsTable)
