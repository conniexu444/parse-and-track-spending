import React, { useState } from 'react'
import amex1 from '../assets/amex1.png'
import amex2 from '../assets/amex2.png'
import amex3 from '../assets/amex3.png'
import amex4 from '../assets/amex4.png'
import apple1 from '../assets/apple1.png'
import apple2 from '../assets/apple2.png'

function UploadSection({
  uploading,
  message,
  handleFileUpload,
  handleClearData
}) {
  const [showAmexHelp, setShowAmexHelp] = useState(false)
  const [showAppleHelp, setShowAppleHelp] = useState(false)

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
        <p className="upload-note">PDF support: American Express</p>
        <button
          type="button"
          className="info-btn"
          onClick={() => setShowAmexHelp(true)}
          aria-label="How to find and download your American Express PDF statement"
        >
          i
        </button>
      </div>
      <div className="upload-note-row">
        <p className="upload-note">CSV/PDF support: Apple Card</p>
        <button
          type="button"
          className="info-btn"
          onClick={() => setShowAppleHelp(true)}
          aria-label="How to find and download your Apple Card PDF statement"
        >
          i
        </button>
      </div>
      {showAmexHelp && (
        <div className="modal-overlay" role="dialog" aria-modal="true" aria-label="American Express PDF instructions">
          <div className="modal">
            <div className="modal-header">
              <h3>How to find your American Express PDF</h3>
              <button
                type="button"
                className="modal-close"
                onClick={() => setShowAmexHelp(false)}
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
      {showAppleHelp && (
        <div className="modal-overlay" role="dialog" aria-modal="true" aria-label="Apple Card PDF instructions">
          <div className="modal">
            <div className="modal-header">
              <h3>How to find your Apple Card statement</h3>
              <button
                type="button"
                className="modal-close"
                onClick={() => setShowAppleHelp(false)}
                aria-label="Close instructions"
              >
                ×
              </button>
            </div>
            <div className="modal-body">
              <ol className="pdf-instructions">
                <li>
                  <p>Open the Wallet app on your iPhone and tap on your Apple Card, then tap <strong>Statements</strong></p>
                  <img src={apple1} alt="Apple Card menu showing Statements option" className="instruction-img" />
                </li>
                <li>
                  <p>Find the statement you want and tap the <strong>download icon</strong> on the right</p>
                  <img src={apple2} alt="Statements list with download icons" className="instruction-img" />
                </li>
                <li>
                  <p>Save the PDF to your device, then use the upload button above to select and upload it</p>
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
