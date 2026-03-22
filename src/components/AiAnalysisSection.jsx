import { useState } from 'react'
import PropTypes from 'prop-types'
import ReactMarkdown from 'react-markdown'
import { analyzeWithAnthropic, analyzeWithOpenAI } from '../utils/aiAnalysis'
import { loadApiSettings, hasApiKey } from './ApiKeyModal'

function AiAnalysisSection({ transactions, summary, onOpenSettings }) {
  const [result, setResult] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const keySet = hasApiKey()
  const { provider } = loadApiSettings()
  const providerLabel = provider === 'anthropic' ? 'Anthropic Claude' : 'OpenAI'

  const handleAnalyze = async () => {
    const { provider: p, anthropicKey, openaiKey } = loadApiSettings()
    const key = p === 'anthropic' ? anthropicKey : openaiKey

    if (!key) {
      onOpenSettings()
      return
    }

    setLoading(true)
    setError('')
    setResult('')

    try {
      const text =
        p === 'anthropic'
          ? await analyzeWithAnthropic(key, transactions, summary)
          : await analyzeWithOpenAI(key, transactions, summary)
      setResult(text)
    } catch (err) {
      setError(err.message || 'Something went wrong. Check your API key and try again.')
    } finally {
      setLoading(false)
    }
  }

  if (transactions.length === 0) return null

  return (
    <section className="ai-analysis-section">
      <h2>AI Analysis</h2>

      <div className="ai-analysis-controls">
        {keySet ? (
          <div className="ai-analysis-ready">
            <span className="ai-provider-badge">{providerLabel}</span>
            <button
              type="button"
              className="upload-btn"
              onClick={handleAnalyze}
              disabled={loading}
            >
              {loading ? 'Analyzing...' : 'Analyze Spending'}
            </button>
            <button
              type="button"
              className="clear-btn"
              onClick={onOpenSettings}
              aria-label="Change AI settings"
            >
              Settings
            </button>
          </div>
        ) : (
          <div className="ai-analysis-no-key">
            <span className="ai-no-key-text">
              Add an API key to get AI-powered spending insights.
            </span>
            <button type="button" className="upload-btn" onClick={onOpenSettings}>
              Add API Key
            </button>
          </div>
        )}
      </div>

      {error && (
        <div className="message error" role="alert">
          {error}
        </div>
      )}

      {loading && (
        <div className="ai-loading">
          <div className="ai-loading-spinner" aria-hidden="true" />
          <span>Analyzing {transactions.length} transactions...</span>
        </div>
      )}

      {result && (
        <div className="ai-result">
          <div className="ai-result-header">
            <span className="ai-provider-badge">{providerLabel}</span>
            <button
              type="button"
              className="clear-btn ai-result-clear"
              onClick={() => setResult('')}
            >
              Clear
            </button>
          </div>
          <div className="ai-result-body">
            <ReactMarkdown>{result}</ReactMarkdown>
          </div>
        </div>
      )}
    </section>
  )
}

AiAnalysisSection.propTypes = {
  transactions: PropTypes.array.isRequired,
  summary: PropTypes.object.isRequired,
  onOpenSettings: PropTypes.func.isRequired,
}

export default AiAnalysisSection
