import React, { useState } from 'react';
import * as XLSX from 'xlsx';

const ImportInventoryModal = ({ open, onClose, onImport }) => {
  const [file, setFile] = useState(null);
  const [preview, setPreview] = useState([]);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  if (!open) return null;

  const handleFileChange = async (e) => {
    const selectedFile = e.target.files[0];
    if (!selectedFile) return;

    setFile(selectedFile);
    setError('');

    try {
      const data = await parseExcelFile(selectedFile);
      setPreview(data.slice(0, 5)); // Show first 5 rows as preview
    } catch (err) {
      setError(err.message);
      setPreview([]);
    }
  };

  const parseExcelFile = (file) => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();

      reader.onload = (e) => {
        try {
          const data = new Uint8Array(e.target.result);
          const workbook = XLSX.read(data, { type: 'array' });
          const sheetName = workbook.SheetNames[0];
          const worksheet = workbook.Sheets[sheetName];
          const json = XLSX.utils.sheet_to_json(worksheet);

          if (json.length === 0) {
            reject(new Error('Excel file is empty'));
            return;
          }

          // Map Excel columns to inventory fields
          const mappedData = json.map(row => {
            const marlas = parseFloat(row['Marlas'] || row['marlas'] || 0);
            const ratePerMarla = parseFloat(row['Rate per Marla'] || row['ratePerMarla'] || 0);
            const totalValue = marlas && ratePerMarla ? marlas * ratePerMarla : 0;
            
            return {
              projectName: row['Project Name'] || row['projectName'] || '',
              block: row['Block'] || row['block'] || '',
              unitShopNumber: row['Unit/Shop Number'] || row['unitShopNumber'] || row['Unit'] || '',
              unit: row['Unit'] || row['Unit/Shop Number'] || row['unitShopNumber'] || '', // backward compatibility
              unitType: row['Unit Type'] || row['unitType'] || 'plot',
              marlas: marlas || '',
              ratePerMarla: ratePerMarla || '',
              totalValue: totalValue,
              saleValue: totalValue, // backward compatibility
              plotFeatures: row['Plot Features'] ? 
                (typeof row['Plot Features'] === 'string' ? 
                  row['Plot Features'].split(',').map(f => f.trim()) : 
                  [row['Plot Features']]) : 
                [],
              plotFeature: row['Plot Features'] || '', // backward compatibility
              otherFeatures: row['Other Features'] || row['otherFeatures'] || '',
              status: (row['Status'] || row['status'] || 'available').toLowerCase(),
              customerId: '',
              notes: row['Notes'] || row['notes'] || ''
            };
          });

          resolve(mappedData);
        } catch (err) {
          reject(new Error('Failed to parse Excel file: ' + err.message));
        }
      };

      reader.onerror = () => {
        reject(new Error('Failed to read file'));
      };

      reader.readAsArrayBuffer(file);
    });
  };

  const handleImport = async () => {
    if (!file) {
      setError('Please select a file');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const data = await parseExcelFile(file);
      
      if (data.length === 0) {
        setError('No valid data found in the file');
        setLoading(false);
        return;
      }

      console.log('Importing data:', data);
      
      if (onImport && typeof onImport === 'function') {
        await onImport(data);
        
        // Reset state and close modal
        setFile(null);
        setPreview([]);
        setError('');
        onClose();
      } else {
        console.error('onImport is not a function');
        setError('Import function not available');
      }
    } catch (err) {
      console.error('Import error:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const downloadTemplate = () => {
    const template = [
      {
        'Project Name': 'Example Project',
        'Block': 'A',
        'Unit/Shop Number': '101',
        'Unit Type': 'plot',
        'Marlas': 10,
        'Rate per Marla': 500000,
        'Plot Features': 'Corner, Park Facing',
        'Other Features': 'Near Main Road',
        'Status': 'available',
        'Notes': 'Sample inventory item'
      }
    ];

    const ws = XLSX.utils.json_to_sheet(template);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Inventory');
    XLSX.writeFile(wb, 'inventory-template.xlsx');
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2>📋 Bulk Import Inventory</h2>
          <button className="modal-close" onClick={onClose}>✕</button>
        </div>

        <div className="modal-body">
          {/* Instructions */}
          <div className="import-instructions">
            <h3>📖 How to Import</h3>
            <ol>
              <li>Download the Excel template below</li>
              <li>Fill in your inventory data</li>
              <li>Upload the completed file</li>
              <li>Review the preview and click Import</li>
            </ol>
            <button className="btn btn-secondary" onClick={downloadTemplate}>
              📥 Download Template
            </button>
          </div>

          {/* File Upload */}
          <div className="file-upload-section">
            <label className="file-upload-label">
              <input
                type="file"
                accept=".xlsx,.xls"
                onChange={handleFileChange}
                className="file-upload-input"
              />
              <div className="file-upload-box">
                {file ? (
                  <>
                    <span className="file-icon">📄</span>
                    <span className="file-name">{file.name}</span>
                  </>
                ) : (
                  <>
                    <span className="upload-icon">📤</span>
                    <span>Click to select Excel file or drag and drop</span>
                  </>
                )}
              </div>
            </label>
          </div>

          {/* Error Message */}
          {error && (
            <div className="alert alert-error">
              <span>⚠️</span>
              <span>{error}</span>
            </div>
          )}

          {/* Preview */}
          {preview.length > 0 && (
            <div className="preview-section">
              <h3>👀 Preview (First 5 rows)</h3>
              <div className="preview-table-container">
                <table className="preview-table">
                  <thead>
                    <tr>
                      <th>Project</th>
                      <th>Block</th>
                      <th>Unit</th>
                      <th>Type</th>
                      <th>Marlas</th>
                      <th>Rate</th>
                      <th>Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {preview.map((row, idx) => (
                      <tr key={idx}>
                        <td>{row.projectName}</td>
                        <td>{row.block}</td>
                        <td>{row.unitShopNumber}</td>
                        <td>{row.unitType}</td>
                        <td>{row.marlas}</td>
                        <td>{row.ratePerMarla?.toLocaleString()}</td>
                        <td>
                          <span className={`badge badge-${row.status === 'available' ? 'success' : 'primary'}`}>
                            {row.status}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <p className="preview-info">
                Total rows to import: <strong>{preview.length}</strong>
              </p>
            </div>
          )}
        </div>

        <div className="modal-footer">
          <button className="btn btn-secondary" onClick={onClose}>
            Cancel
          </button>
          <button 
            className="btn btn-primary" 
            onClick={handleImport}
            disabled={!file || loading}
          >
            {loading ? 'Importing...' : '📥 Import Items'}
          </button>
        </div>
      </div>

      <style>{`
        .modal-overlay {
          position: fixed;
          inset: 0;
          background: rgba(0, 0, 0, 0.5);
          display: flex;
          align-items: center;
          justify-content: center;
          z-index: 1000;
          padding: 1rem;
        }

        .modal-content {
          background: white;
          border-radius: 8px;
          max-width: 800px;
          width: 100%;
          max-height: 90vh;
          overflow-y: auto;
          box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.1);
        }

        .modal-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 1.5rem;
          border-bottom: 1px solid #e5e7eb;
        }

        .modal-header h2 {
          margin: 0;
          font-size: 1.25rem;
          font-weight: 600;
        }

        .modal-close {
          background: none;
          border: none;
          font-size: 1.5rem;
          cursor: pointer;
          color: #6b7280;
          padding: 0;
          width: 32px;
          height: 32px;
          display: flex;
          align-items: center;
          justify-content: center;
          border-radius: 4px;
        }

        .modal-close:hover {
          background: #f3f4f6;
        }

        .modal-body {
          padding: 1.5rem;
        }

        .import-instructions {
          background: #f0f9ff;
          border: 1px solid #bae6fd;
          border-radius: 8px;
          padding: 1rem;
          margin-bottom: 1.5rem;
        }

        .import-instructions h3 {
          margin: 0 0 0.5rem 0;
          font-size: 1rem;
          font-weight: 600;
        }

        .import-instructions ol {
          margin: 0.5rem 0 1rem 1.5rem;
          padding: 0;
        }

        .import-instructions li {
          margin: 0.25rem 0;
          font-size: 0.875rem;
        }

        .file-upload-section {
          margin-bottom: 1.5rem;
        }

        .file-upload-label {
          display: block;
          cursor: pointer;
        }

        .file-upload-input {
          display: none;
        }

        .file-upload-box {
          border: 2px dashed #d1d5db;
          border-radius: 8px;
          padding: 2rem;
          text-align: center;
          transition: all 0.2s;
          background: #f9fafb;
        }

        .file-upload-box:hover {
          border-color: #3b82f6;
          background: #eff6ff;
        }

        .upload-icon,
        .file-icon {
          font-size: 2rem;
          display: block;
          margin-bottom: 0.5rem;
        }

        .file-name {
          color: #059669;
          font-weight: 500;
        }

        .alert {
          padding: 0.75rem 1rem;
          border-radius: 6px;
          margin-bottom: 1rem;
          display: flex;
          align-items: center;
          gap: 0.5rem;
        }

        .alert-error {
          background: #fef2f2;
          border: 1px solid #fecaca;
          color: #991b1b;
        }

        .preview-section {
          margin-top: 1.5rem;
        }

        .preview-section h3 {
          margin: 0 0 1rem 0;
          font-size: 1rem;
          font-weight: 600;
        }

        .preview-table-container {
          overflow-x: auto;
          border: 1px solid #e5e7eb;
          border-radius: 6px;
          margin-bottom: 0.5rem;
        }

        .preview-table {
          width: 100%;
          border-collapse: collapse;
        }

        .preview-table th,
        .preview-table td {
          padding: 0.75rem;
          text-align: left;
          font-size: 0.875rem;
          border-bottom: 1px solid #e5e7eb;
        }

        .preview-table th {
          background: #f9fafb;
          font-weight: 600;
          color: #374151;
        }

        .preview-table tbody tr:last-child td {
          border-bottom: none;
        }

        .preview-info {
          font-size: 0.875rem;
          color: #6b7280;
        }

        .modal-footer {
          display: flex;
          justify-content: flex-end;
          gap: 0.75rem;
          padding: 1.5rem;
          border-top: 1px solid #e5e7eb;
        }

        .btn {
          padding: 0.5rem 1rem;
          border-radius: 6px;
          font-weight: 500;
          cursor: pointer;
          border: 1px solid transparent;
          transition: all 0.2s;
        }

        .btn-primary {
          background: #3b82f6;
          color: white;
        }

        .btn-primary:hover:not(:disabled) {
          background: #2563eb;
        }

        .btn-primary:disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }

        .btn-secondary {
          background: white;
          border-color: #d1d5db;
          color: #374151;
        }

        .btn-secondary:hover {
          background: #f9fafb;
        }

        .badge {
          display: inline-block;
          padding: 0.25rem 0.5rem;
          border-radius: 4px;
          font-size: 0.75rem;
          font-weight: 600;
          text-transform: uppercase;
        }

        .badge-success {
          background: #d1fae5;
          color: #065f46;
        }

        .badge-primary {
          background: #dbeafe;
          color: #1e40af;
        }
      `}</style>
    </div>
  );
};

export default ImportInventoryModal;