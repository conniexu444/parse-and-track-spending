import React, { useState } from 'react'
import amex1 from '/public/amex1.png'
import amex2 from '/public/amex2.png'
import amex3 from '/public/amex3.png'
import amex4 from '/public/amex4.png'

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
              <ol className="pdf-instructions">
                <li>
                  <p>Log in to your American Express account and click on <strong>Statements & Activity</strong></p>
                  <img src={amex1} alt="American Express navigation showing Statements & Activity tab" className="instruction-img" />
                </li>
                <li>
                  <p>Click the <strong>Go to PDF Statements</strong> button</p>
                  <img src={amex2} alt="Go to PDF Statements button" className="instruction-img" />
                </li>
                <li>
                  <p>Find the statement you want to download and click the <strong>Download</strong> button</p>
                  <img src={amex3} alt="Recent Statements list with Download buttons" className="instruction-img" />
                </li>
                <li>
                  <p>Select <strong>Billing Statement (PDF)</strong> and click <strong>Download</strong></p>
                  <img src={amex4} alt="File type selection dialog with Billing Statement PDF selected" className="instruction-img" />
                </li>
                <li>
                  <p>Once downloaded, use the upload button above to select and upload your PDF statement</p>
                </li>
              </ol>
            </div>
          </div>
        </div>
      )}
      {message.text && <p className={`message ${message.type}`}>{message.text}</p>}
    </section>
  )
}

export default React.memo(UploadSection)
