import React, { useState } from 'react'

function UploadSection({
  uploading,
  message,
  handleFileUpload,
  handleClearData
}) {
  const [showPdfHelp, setShowPdfHelp] = useState(false)

  return (
    <section className="upload-section">
      <div className="upload-controls">
        <label className="upload-btn">
          {uploading ? 'Processing...' : 'Upload PDF'}
          <input
            type="file"
            accept=".csv,.pdf"
            onChange={handleFileUpload}
            disabled={uploading}
            multiple
            hidden
          />
        </label>
        <button className="clear-btn" onClick={handleClearData}>
          Clear All Data
        </button>
      </div>
      <div className="upload-note-row">
        <p className="upload-note">PDF support: American Express only (for now).</p>
        <button
          type="button"
          className="info-btn"
          onClick={() => setShowPdfHelp(true)}
          aria-label="How to find and download your PDF statement"
        >
          i
        </button>
      </div>
      {showPdfHelp && (
        <div className="modal-overlay" role="dialog" aria-modal="true" aria-label="PDF instructions">
          <div className="modal">
            <div className="modal-header">
              <h3>How to find your American Express PDF</h3>
              <button
                type="button"
                className="modal-close"
                onClick={() => setShowPdfHelp(false)}
                aria-label="Close instructions"
              >
                ×
              </button>
            </div>
            <div className="modal-body">
              <p>Add your screenshots and steps here.</p>
              <p>We’ll show users how to download a PDF statement and upload it.</p>
            </div>
          </div>
        </div>
      )}
      {message.text && <p className={`message ${message.type}`}>{message.text}</p>}
    </section>
  )
}

export default React.memo(UploadSection)
