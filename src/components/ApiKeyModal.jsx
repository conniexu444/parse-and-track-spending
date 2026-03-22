import { useState, useEffect, useRef, useId } from 'react'
import PropTypes from 'prop-types'

const STORAGE_KEY_PROVIDER = 'ai_provider'
const STORAGE_KEY_ANTHROPIC = 'ai_key_anthropic'
const STORAGE_KEY_OPENAI = 'ai_key_openai'

export function loadApiSettings() {
  return {
    provider: sessionStorage.getItem(STORAGE_KEY_PROVIDER) || 'anthropic',
    anthropicKey: sessionStorage.getItem(STORAGE_KEY_ANTHROPIC) || '',
    openaiKey: sessionStorage.getItem(STORAGE_KEY_OPENAI) || '',
  }
}

export function hasApiKey() {
  const { provider, anthropicKey, openaiKey } = loadApiSettings()
  return provider === 'anthropic' ? !!anthropicKey : !!openaiKey
}

function ApiKeyModal({ isOpen, onClose, onSave }) {
  const [provider, setProvider] = useState('anthropic')
  const [anthropicKey, setAnthropicKey] = useState('')
  const [openaiKey, setOpenaiKey] = useState('')
  const [showAnthropicKey, setShowAnthropicKey] = useState(false)
  const [showOpenaiKey, setShowOpenaiKey] = useState(false)

  const modalRef = useRef(null)
  const triggerRef = useRef(null)
  const onCloseRef = useRef(onClose)
  const titleId = useId()

  useEffect(() => {
    onCloseRef.current = onClose
  }, [onClose])

  useEffect(() => {
    if (isOpen) {
      const saved = loadApiSettings()
      setProvider(saved.provider)
      setAnthropicKey(saved.anthropicKey)
      setOpenaiKey(saved.openaiKey)
    }
  }, [isOpen])

  useEffect(() => {
    if (!isOpen) return

    const modal = modalRef.current
    if (!modal) return

    if (!triggerRef.current) {
      triggerRef.current = document.activeElement
    }

    const focusable = modal.querySelectorAll(
      'button, input, [tabindex]:not([tabindex="-1"])'
    )
    focusable[0]?.focus()
    document.body.style.overflow = 'hidden'

    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        onCloseRef.current()
        return
      }
      if (e.key === 'Tab') {
        const first = focusable[0]
        const last = focusable[focusable.length - 1]
        if (e.shiftKey && document.activeElement === first) {
          e.preventDefault()
          last?.focus()
        } else if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault()
          first?.focus()
        }
      }
    }

    document.addEventListener('keydown', handleKeyDown)
    return () => {
      document.removeEventListener('keydown', handleKeyDown)
      document.body.style.overflow = ''
      if (triggerRef.current) {
        triggerRef.current.focus()
        triggerRef.current = null
      }
    }
  }, [isOpen])

  if (!isOpen) return null

  const handleOverlayClick = (e) => {
    if (e.target === e.currentTarget) onClose()
  }

  const handleSave = () => {
    sessionStorage.setItem(STORAGE_KEY_PROVIDER, provider)
    if (anthropicKey) sessionStorage.setItem(STORAGE_KEY_ANTHROPIC, anthropicKey)
    else sessionStorage.removeItem(STORAGE_KEY_ANTHROPIC)
    if (openaiKey) sessionStorage.setItem(STORAGE_KEY_OPENAI, openaiKey)
    else sessionStorage.removeItem(STORAGE_KEY_OPENAI)
    onSave()
    onClose()
  }

  const handleClearAll = () => {
    sessionStorage.removeItem(STORAGE_KEY_PROVIDER)
    sessionStorage.removeItem(STORAGE_KEY_ANTHROPIC)
    sessionStorage.removeItem(STORAGE_KEY_OPENAI)
    setAnthropicKey('')
    setOpenaiKey('')
    setProvider('anthropic')
    onSave()
  }

  const activeKey = provider === 'anthropic' ? anthropicKey : openaiKey
  const canSave = !!activeKey.trim()

  return (
    <div
      className="modal-overlay"
      role="dialog"
      aria-modal="true"
      aria-labelledby={titleId}
      onClick={handleOverlayClick}
    >
      <div className="modal api-key-modal" ref={modalRef}>
        <div className="modal-header">
          <h3 id={titleId}>AI Analysis Settings</h3>
          <button
            type="button"
            className="modal-close"
            onClick={onClose}
            aria-label="Close settings"
          >
            ×
          </button>
        </div>

        <div className="modal-body">
          <div className="api-key-notice">
            <strong>Privacy note:</strong> When you run an analysis, your transaction data is
            sent to the selected AI provider. Keys are stored in session storage and cleared
            when you close the tab.
          </div>

          <div className="api-provider-tabs">
            <button
              type="button"
              className={`provider-tab${provider === 'anthropic' ? ' active' : ''}`}
              onClick={() => setProvider('anthropic')}
            >
              Anthropic Claude
            </button>
            <button
              type="button"
              className={`provider-tab${provider === 'openai' ? ' active' : ''}`}
              onClick={() => setProvider('openai')}
            >
              OpenAI
            </button>
          </div>

          {provider === 'anthropic' && (
            <div className="api-key-field">
              <label htmlFor="anthropic-key">Anthropic API Key</label>
              <p className="api-key-hint">
                Find your key at console.anthropic.com → API Keys
              </p>
              <div className="api-key-input-row">
                <input
                  id="anthropic-key"
                  type={showAnthropicKey ? 'text' : 'password'}
                  value={anthropicKey}
                  onChange={(e) => setAnthropicKey(e.target.value)}
                  placeholder="sk-ant-..."
                  autoComplete="off"
                  spellCheck="false"
                />
                <button
                  type="button"
                  className="toggle-visibility-btn"
                  onClick={() => setShowAnthropicKey((v) => !v)}
                  aria-label={showAnthropicKey ? 'Hide key' : 'Show key'}
                >
                  {showAnthropicKey ? 'Hide' : 'Show'}
                </button>
              </div>
              <p className="api-key-model-note">Uses model: claude-sonnet-4-6</p>
            </div>
          )}

          {provider === 'openai' && (
            <div className="api-key-field">
              <label htmlFor="openai-key">OpenAI API Key</label>
              <p className="api-key-hint">
                Find your key at platform.openai.com → API Keys
              </p>
              <div className="api-key-input-row">
                <input
                  id="openai-key"
                  type={showOpenaiKey ? 'text' : 'password'}
                  value={openaiKey}
                  onChange={(e) => setOpenaiKey(e.target.value)}
                  placeholder="sk-..."
                  autoComplete="off"
                  spellCheck="false"
                />
                <button
                  type="button"
                  className="toggle-visibility-btn"
                  onClick={() => setShowOpenaiKey((v) => !v)}
                  aria-label={showOpenaiKey ? 'Hide key' : 'Show key'}
                >
                  {showOpenaiKey ? 'Hide' : 'Show'}
                </button>
              </div>
              <p className="api-key-model-note">Uses model: gpt-4o-mini</p>
            </div>
          )}
        </div>

        <div className="modal-footer">
          <button type="button" className="confirm-cancel" onClick={handleClearAll}>
            Clear All Keys
          </button>
          <button
            type="button"
            className="upload-btn"
            onClick={handleSave}
            disabled={!canSave}
          >
            Save
          </button>
        </div>
      </div>
    </div>
  )
}

ApiKeyModal.propTypes = {
  isOpen: PropTypes.bool.isRequired,
  onClose: PropTypes.func.isRequired,
  onSave: PropTypes.func.isRequired,
}

export default ApiKeyModal
