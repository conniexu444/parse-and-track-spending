import './App.css'
import { useState } from 'react'
import { useTransactions } from './hooks/useTransactions'
import UploadSection from './components/UploadSection'
import FiltersSection from './components/FiltersSection'
import SummarySection from './components/SummarySection'
import TransactionsTable from './components/TransactionsTable'
import HowItWorksModal from './components/HowItWorksModal'

function App() {
  const [showHowItWorks, setShowHowItWorks] = useState(false)
  const {
    transactions,
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
    handleFileUpload,
    handleClearData,
    handleCategoryChange,
    handleSort,
    resetFilters
  } = useTransactions()

  return (
    <div className="app">
      <header>
        <h1>Spending</h1>
        <button
          className="how-it-works-btn"
          onClick={() => setShowHowItWorks(true)}
          aria-label="How this site works"
        >
          How This Works
        </button>
      </header>

      <UploadSection
        uploading={uploading}
        message={message}
        handleFileUpload={handleFileUpload}
        handleClearData={handleClearData}
      />

      <FiltersSection
        startDate={startDate}
        setStartDate={setStartDate}
        endDate={endDate}
        setEndDate={setEndDate}
        selectedCategory={selectedCategory}
        setSelectedCategory={setSelectedCategory}
        categories={categories}
        resetFilters={resetFilters}
      />

      <SummarySection
        summary={summary}
        selectedCategory={selectedCategory}
        setSelectedCategory={setSelectedCategory}
      />

      <TransactionsTable
        transactions={transactions}
        editingId={editingId}
        setEditingId={setEditingId}
        handleCategoryChange={handleCategoryChange}
        sortField={sortField}
        sortDirection={sortDirection}
        handleSort={handleSort}
      />

      <HowItWorksModal
        isOpen={showHowItWorks}
        onClose={() => setShowHowItWorks(false)}
      />
    </div>
  )
}

export default App
