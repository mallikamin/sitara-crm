import React, { useState } from 'react';
import { importBulkTransactions, generateTransactionTemplate } from '../../services/dataservice';

export default function BulkUploadTransactionsModal({ isOpen, onClose, onSuccess, customers, brokers }) {
  const [file, setFile] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState('');

  const handleFileChange = (e) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) {
      if (!selectedFile.name.match(/\.(xlsx|xls)$/i)) {
        setError('Please select an Excel file (.xlsx or .xls)');
        setFile(null);
        return;
      }
      setFile(selectedFile);
      setError('');
      setResult(null);
    }
  };

  const handleDownloadTemplate = () => {
    const blob = generateTransactionTemplate();
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'transaction_upload_template.xlsx';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    window.URL.revokeObjectURL(url);
  };

  const handleUpload = async () => {
    if (!file) {
      setError('Please select a file');
      return;
    }

    setUploading(true);
    setError('');
    setResult(null);

    try {
      const uploadResult = await importBulkTransactions(file, { customers, brokers });
      
      setResult(uploadResult);
      
      if (uploadResult.imported > 0) {
        setTimeout(() => {
          onSuccess?.(uploadResult);
          handleClose();
        }, 2000);
      }
    } catch (err) {
      setError(err.message || 'Failed to upload transactions');
    } finally {
      setUploading(false);
    }
  };

  const handleClose = () => {
    setFile(null);
    setError('');
    setResult(null);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div style={styles.overlay} onClick={handleClose}>
      <div style={styles.modal} onClick={e => e.stopPropagation()}>
        <button style={styles.closeBtn} onClick={handleClose}>×</button>
        
        <div style={styles.header}>
          <div style={styles.headerIcon}>📤</div>
          <div>
            <h2 style={styles.title}>Bulk Upload Transactions</h2>
            <p style={styles.subtitle}>Upload multiple transactions via Excel file</p>
          </div>
        </div>

        {/* Template Download Section */}
        <div style={styles.templateSection}>
          <div style={styles.templateHeader}>
            <span style={styles.templateIcon}>📋</span>
            <span style={styles.templateTitle}>Download Template</span>
          </div>
          <p style={styles.templateText}>
            First, download our Excel template to ensure your data is formatted correctly.
          </p>
          <button style={styles.downloadBtn} onClick={handleDownloadTemplate}>
            <span style={styles.downloadIcon}>⬇</span>
            Download Excel Template
          </button>
        </div>

        {/* Upload Section */}
        <div style={styles.uploadSection}>
          <label style={styles.uploadLabel}>
            <input
              type="file"
              accept=".xlsx,.xls"
              onChange={handleFileChange}
              style={styles.fileInput}
            />
            <div style={styles.uploadBox}>
              <span style={styles.uploadIcon}>📁</span>
              <span style={styles.uploadText}>
                {file ? file.name : 'Click to select Excel file or drag & drop'}
              </span>
              <span style={styles.uploadHint}>.xlsx or .xls files only</span>
            </div>
          </label>
        </div>

        {/* Instructions */}
        <div style={styles.instructions}>
          <div style={styles.instructionsTitle}>📌 Template Columns (18 total):</div>
          <div style={styles.columnGrid}>
            <div style={styles.column}>
              <strong>Required:</strong>
              <ul style={styles.columnList}>
                <li>Customer Name/Phone *</li>
                <li>Project Name *</li>
                <li>Unit/Shop Number *</li>
                <li>Sale Value *</li>
                <li>Installments *</li>
                <li>First Due Date *</li>
              </ul>
            </div>
            <div style={styles.column}>
              <strong>Optional:</strong>
              <ul style={styles.columnList}>
                <li>Broker Name/Phone</li>
                <li>Broker Commission %</li>
                <li>Company Rep Name/Phone</li>
                <li>Company Rep Commission %</li>
                <li>Marlas, Rate Per Marla</li>
                <li>Payment Cycle, Status, Notes</li>
              </ul>
            </div>
          </div>
          <div style={styles.note}>
            <strong>💡 Auto-Creation:</strong> New customers/brokers will be created automatically if not found
          </div>
        </div>

        {/* Error Display */}
        {error && (
          <div style={styles.errorBox}>
            <span>⚠️</span> {error}
          </div>
        )}

        {/* Result Display */}
        {result && (
          <div style={result.imported > 0 ? styles.successBox : styles.warningBox}>
            <div style={styles.resultTitle}>
              {result.imported > 0 ? '✅ Upload Successful!' : '⚠️ Upload Completed with Warnings'}
            </div>
            <div style={styles.resultStats}>
              <div style={styles.resultStat}>
                <span style={styles.resultNumber}>{result.imported}</span>
                <span style={styles.resultLabel}>Imported</span>
              </div>
              <div style={styles.resultStat}>
                <span style={styles.resultNumber}>{result.skipped}</span>
                <span style={styles.resultLabel}>Skipped</span>
              </div>
              <div style={styles.resultStat}>
                <span style={styles.resultNumber}>{result.errors?.length || 0}</span>
                <span style={styles.resultLabel}>Errors</span>
              </div>
            </div>
            {result.errors && result.errors.length > 0 && (
              <div style={styles.errorList}>
                <div style={styles.errorListTitle}>Errors:</div>
                {result.errors.slice(0, 5).map((err, idx) => (
                  <div key={idx} style={styles.errorItem}>Row {err.row}: {err.message}</div>
                ))}
                {result.errors.length > 5 && (
                  <div style={styles.errorMore}>...and {result.errors.length - 5} more</div>
                )}
              </div>
            )}
          </div>
        )}

        {/* Upload State */}
        {uploading && (
          <div style={styles.uploadingBox}>
            <div style={styles.spinner}></div>
            <span>Processing transactions...</span>
          </div>
        )}

        {/* Actions */}
        <div style={styles.actions}>
          <button 
            style={styles.cancelBtn} 
            onClick={handleClose}
            disabled={uploading}
          >
            Cancel
          </button>
          <button 
            style={{
              ...styles.uploadBtn,
              opacity: (!file || uploading) ? 0.5 : 1,
              cursor: (!file || uploading) ? 'not-allowed' : 'pointer'
            }}
            onClick={handleUpload}
            disabled={!file || uploading}
          >
            {uploading ? 'Uploading...' : 'Upload Transactions'}
          </button>
        </div>
      </div>
    </div>
  );
}

// ========== STYLES ==========
const styles = {
  overlay: {
    position: 'fixed',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.5)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 1000,
    padding: '20px',
    animation: 'fadeIn 0.2s ease',
  },
  modal: {
    backgroundColor: '#fff',
    borderRadius: '20px',
    width: '100%',
    maxWidth: '700px',
    maxHeight: '90vh',
    overflow: 'auto',
    padding: '32px',
    position: 'relative',
    animation: 'slideUp 0.3s ease',
  },
  closeBtn: {
    position: 'absolute',
    top: '16px',
    right: '16px',
    width: '36px',
    height: '36px',
    backgroundColor: '#f1f5f9',
    border: 'none',
    borderRadius: '10px',
    fontSize: '24px',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    color: '#64748b',
    transition: 'all 0.2s ease',
  },
  header: {
    display: 'flex',
    alignItems: 'center',
    gap: '16px',
    marginBottom: '24px',
  },
  headerIcon: {
    width: '56px',
    height: '56px',
    borderRadius: '14px',
    background: 'linear-gradient(135deg, #0891b2 0%, #06b6d4 100%)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: '28px',
  },
  title: {
    fontSize: '22px',
    fontWeight: '700',
    color: '#1e293b',
    margin: '0 0 4px 0',
  },
  subtitle: {
    fontSize: '14px',
    color: '#64748b',
    margin: 0,
  },
  templateSection: {
    backgroundColor: '#f0f9ff',
    border: '2px dashed #0ea5e9',
    borderRadius: '12px',
    padding: '20px',
    marginBottom: '20px',
  },
  templateHeader: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    marginBottom: '8px',
  },
  templateIcon: {
    fontSize: '20px',
  },
  templateTitle: {
    fontSize: '16px',
    fontWeight: '600',
    color: '#0c4a6e',
  },
  templateText: {
    fontSize: '14px',
    color: '#0369a1',
    marginBottom: '12px',
  },
  downloadBtn: {
    width: '100%',
    padding: '12px',
    backgroundColor: '#0ea5e9',
    color: '#fff',
    border: 'none',
    borderRadius: '8px',
    fontSize: '15px',
    fontWeight: '600',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '8px',
    transition: 'background-color 0.2s ease',
  },
  downloadIcon: {
    fontSize: '18px',
  },
  uploadSection: {
    marginBottom: '20px',
  },
  uploadLabel: {
    cursor: 'pointer',
  },
  fileInput: {
    display: 'none',
  },
  uploadBox: {
    border: '2px dashed #cbd5e1',
    borderRadius: '12px',
    padding: '32px 20px',
    textAlign: 'center',
    backgroundColor: '#f8fafc',
    transition: 'all 0.2s ease',
    cursor: 'pointer',
  },
  uploadIcon: {
    fontSize: '48px',
    display: 'block',
    marginBottom: '12px',
  },
  uploadText: {
    display: 'block',
    fontSize: '15px',
    fontWeight: '500',
    color: '#475569',
    marginBottom: '4px',
  },
  uploadHint: {
    display: 'block',
    fontSize: '13px',
    color: '#94a3b8',
  },
  instructions: {
    backgroundColor: '#fef3c7',
    border: '1px solid #fde047',
    borderRadius: '12px',
    padding: '16px',
    marginBottom: '20px',
  },
  instructionsTitle: {
    fontSize: '14px',
    fontWeight: '600',
    color: '#92400e',
    marginBottom: '12px',
  },
  columnGrid: {
    display: 'grid',
    gridTemplateColumns: '1fr 1fr',
    gap: '16px',
    marginBottom: '12px',
  },
  column: {
    fontSize: '13px',
    color: '#78350f',
  },
  columnList: {
    margin: '8px 0 0 0',
    paddingLeft: '20px',
  },
  note: {
    fontSize: '13px',
    color: '#92400e',
    backgroundColor: '#fef9c3',
    padding: '8px 12px',
    borderRadius: '6px',
  },
  errorBox: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    padding: '12px 16px',
    backgroundColor: '#fef2f2',
    border: '1px solid #fecaca',
    borderRadius: '10px',
    color: '#dc2626',
    fontSize: '14px',
    marginBottom: '16px',
  },
  successBox: {
    backgroundColor: '#f0fdf4',
    border: '2px solid #86efac',
    borderRadius: '12px',
    padding: '16px',
    marginBottom: '16px',
  },
  warningBox: {
    backgroundColor: '#fffbeb',
    border: '2px solid #fde047',
    borderRadius: '12px',
    padding: '16px',
    marginBottom: '16px',
  },
  resultTitle: {
    fontSize: '16px',
    fontWeight: '600',
    marginBottom: '12px',
  },
  resultStats: {
    display: 'grid',
    gridTemplateColumns: 'repeat(3, 1fr)',
    gap: '12px',
    marginBottom: '12px',
  },
  resultStat: {
    textAlign: 'center',
  },
  resultNumber: {
    display: 'block',
    fontSize: '24px',
    fontWeight: '700',
    color: '#059669',
  },
  resultLabel: {
    display: 'block',
    fontSize: '12px',
    color: '#6b7280',
  },
  errorList: {
    backgroundColor: '#fff',
    borderRadius: '8px',
    padding: '12px',
    marginTop: '12px',
  },
  errorListTitle: {
    fontSize: '13px',
    fontWeight: '600',
    color: '#dc2626',
    marginBottom: '8px',
  },
  errorItem: {
    fontSize: '12px',
    color: '#991b1b',
    padding: '4px 0',
    borderBottom: '1px solid #fee2e2',
  },
  errorMore: {
    fontSize: '12px',
    color: '#dc2626',
    fontStyle: 'italic',
    marginTop: '8px',
  },
  uploadingBox: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '12px',
    padding: '16px',
    backgroundColor: '#eff6ff',
    borderRadius: '10px',
    marginBottom: '16px',
    color: '#1e40af',
    fontWeight: '500',
  },
  spinner: {
    width: '20px',
    height: '20px',
    border: '3px solid #bfdbfe',
    borderTop: '3px solid #3b82f6',
    borderRadius: '50%',
    animation: 'spin 1s linear infinite',
  },
  actions: {
    display: 'flex',
    gap: '12px',
    justifyContent: 'flex-end',
    paddingTop: '20px',
    borderTop: '1px solid #f1f5f9',
  },
  cancelBtn: {
    padding: '12px 24px',
    backgroundColor: '#f1f5f9',
    color: '#475569',
    border: 'none',
    borderRadius: '10px',
    fontSize: '15px',
    fontWeight: '600',
    cursor: 'pointer',
    transition: 'all 0.2s ease',
  },
  uploadBtn: {
    padding: '12px 24px',
    background: 'linear-gradient(135deg, #0891b2 0%, #06b6d4 100%)',
    color: '#fff',
    border: 'none',
    borderRadius: '10px',
    fontSize: '15px',
    fontWeight: '600',
    cursor: 'pointer',
    transition: 'all 0.2s ease',
  },
};

// Add animations
const styleSheet = document.createElement('style');
styleSheet.textContent = `
  @keyframes fadeIn {
    from { opacity: 0; }
    to { opacity: 1; }
  }
  @keyframes slideUp {
    from { opacity: 0; transform: translateY(20px); }
    to { opacity: 1; transform: translateY(0); }
  }
  @keyframes spin {
    to { transform: rotate(360deg); }
  }
`;
if (!document.querySelector('#bulk-upload-styles')) {
  styleSheet.id = 'bulk-upload-styles';
  document.head.appendChild(styleSheet);
}