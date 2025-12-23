import React from 'react'
import { formatCurrency, getCategoryClassName } from '../utils/formatters'

function SummarySection({ summary, selectedCategory, setSelectedCategory }) {

  return (
    <section className="summary-section">
      <h2>Spending Summary</h2>
      <div className="totals-container">
        <div className="total-card">
          <span>Total Spent</span>
          <span className="total-amount">{formatCurrency(summary.total_charges || summary.grand_total)}</span>
        </div>
        {summary.total_credits > 0 && (
          <div className="total-card credit-card">
            <span>Total Credits</span>
            <span className="credit-amount">{formatCurrency(summary.total_credits)}</span>
          </div>
        )}
        {summary.total_credits > 0 && (
          <div className="total-card net-card">
            <span>Net Spending</span>
            <span className="net-amount">{formatCurrency(summary.net_spending)}</span>
          </div>
        )}
      </div>
      <div className="categories-grid">
        {summary.categories.map((cat) => (
          <div
            key={cat.category}
            className={`category-card category-card-${getCategoryClassName(cat.category)} ${selectedCategory === cat.category ? 'selected' : ''}`}
            onClick={() => setSelectedCategory(cat.category)}
          >
            <h3>{cat.category}</h3>
            <p className="amount">{formatCurrency(cat.total)}</p>
            <p className="count">{cat.count} transactions</p>
          </div>
        ))}
      </div>
    </section>
  )
}

export default React.memo(SummarySection)
