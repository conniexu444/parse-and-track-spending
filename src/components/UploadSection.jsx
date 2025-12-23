import React from 'react'

function UploadSection({
  uploading,
  message,
  handleFileUpload,
  handleClearData
}) {
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
      <p className="upload-note">PDF support: American Express only (for now).</p>
      {message.text && <p className={`message ${message.type}`}>{message.text}</p>}
    </section>
  )
}

export default React.memo(UploadSection)
