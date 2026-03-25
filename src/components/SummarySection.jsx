import React from 'react'
import { formatCurrency, getCategoryClassName } from '../utils/formatters'
import GradientCard from './GradientCard'

function SummarySection({ summary, selectedCategory, setSelectedCategory }) {

  return (
    <section className="summary-section">
      <h2>Spending Summary</h2>
      <div className="totals-container">
        <GradientCard>
          <div className="total-card">
            <span>Total Spent</span>
            <span className="total-amount">{formatCurrency(summary.total_charges || summary.grand_total)}</span>
          </div>
        </GradientCard>
        {summary.total_credits > 0 && (
          <GradientCard>
            <div className="total-card credit-card">
              <span>Total Credits</span>
              <span className="credit-amount">{formatCurrency(summary.total_credits)}</span>
            </div>
          </GradientCard>
        )}
        {summary.total_credits > 0 && (
          <GradientCard>
            <div className="total-card net-card">
              <span>Net Spending</span>
              <span className="net-amount">{formatCurrency(summary.net_spending)}</span>
            </div>
          </GradientCard>
        )}
      </div>
      <div className="categories-grid">
        {summary.categories.map((cat) => (
          <GradientCard
            key={cat.category}
            className={selectedCategory === cat.category ? 'selected' : ''}
            onClick={() => setSelectedCategory(cat.category)}
          >
            <div className={`category-card category-card-${getCategoryClassName(cat.category)}`}>
              <h3>{cat.category}</h3>
              <p className="amount">{formatCurrency(cat.total)}</p>
              <p className="count">{cat.count} transactions</p>
            </div>
          </GradientCard>
        ))}
      </div>
    </section>
  )
}

export default React.memo(SummarySection)
