import './App.css'
import { useTransactions } from './hooks/useTransactions'
import UploadSection from './components/UploadSection'
import FiltersSection from './components/FiltersSection'
import SummarySection from './components/SummarySection'
import TransactionsTable from './components/TransactionsTable'

function App() {
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
    </div>
  )
}

export default App
