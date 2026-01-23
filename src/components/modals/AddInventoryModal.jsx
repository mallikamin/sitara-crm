import React, { useState } from 'react';

const AddInventoryModal = ({ open, onClose, onSave }) => {
  const [formData, setFormData] = useState({
    projectName: '',
    block: '',
    unitShopNumber: '',
    unitType: 'plot',
    marlas: '',
    ratePerMarla: '',
    plotFeatures: [],
    otherFeatures: '',
    status: 'available',
    notes: ''
  });

  if (!open) return null;

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleFeatureToggle = (feature) => {
    setFormData(prev => ({
      ...prev,
      plotFeatures: prev.plotFeatures.includes(feature)
        ? prev.plotFeatures.filter(f => f !== feature)
        : [...prev.plotFeatures, feature]
    }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    
    if (!formData.projectName || !formData.unitShopNumber) {
      alert('Please fill in required fields');
      return;
    }

    const marlas = parseFloat(formData.marlas) || 0;
    const ratePerMarla = parseFloat(formData.ratePerMarla) || 0;
    const totalValue = marlas && ratePerMarla ? marlas * ratePerMarla : 0;

    const inventoryData = {
      ...formData,
      marlas,
      ratePerMarla,
      totalValue,
      saleValue: totalValue
    };

    onSave(inventoryData);
    onClose();
    
    // Reset form
    setFormData({
      projectName: '',
      block: '',
      unitShopNumber: '',
      unitType: 'plot',
      marlas: '',
      ratePerMarla: '',
      plotFeatures: [],
      otherFeatures: '',
      status: 'available',
      notes: ''
    });
  };

  const features = ['Corner', 'Park Facing', 'Main Road', 'Possession', 'Developed'];

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-container" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2>Add Inventory Item</h2>
          <button className="close-btn" onClick={onClose}>×</button>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="modal-body">
            <div className="form-grid">
              <div className="form-group">
                <label>Project Name *</label>
                <input
                  type="text"
                  name="projectName"
                  value={formData.projectName}
                  onChange={handleChange}
                  placeholder="e.g., Park View Housing"
                  required
                />
              </div>

              <div className="form-group">
                <label>Block</label>
                <input
                  type="text"
                  name="block"
                  value={formData.block}
                  onChange={handleChange}
                  placeholder="e.g., A, B, C"
                />
              </div>

              <div className="form-group">
                <label>Unit/Shop Number *</label>
                <input
                  type="text"
                  name="unitShopNumber"
                  value={formData.unitShopNumber}
                  onChange={handleChange}
                  placeholder="e.g., 101, A-45"
                  required
                />
              </div>

              <div className="form-group">
                <label>Unit Type</label>
                <select name="unitType" value={formData.unitType} onChange={handleChange}>
                  <option value="plot">Plot</option>
                  <option value="shop">Shop</option>
                  <option value="apartment">Apartment</option>
                  <option value="office">Office</option>
                  <option value="warehouse">Warehouse</option>
                </select>
              </div>

              <div className="form-group">
                <label>Marlas</label>
                <input
                  type="number"
                  name="marlas"
                  value={formData.marlas}
                  onChange={handleChange}
                  placeholder="10"
                  step="0.01"
                />
              </div>

              <div className="form-group">
                <label>Rate per Marla</label>
                <input
                  type="number"
                  name="ratePerMarla"
                  value={formData.ratePerMarla}
                  onChange={handleChange}
                  placeholder="500000"
                  step="1000"
                />
              </div>
            </div>

            {formData.marlas && formData.ratePerMarla && (
              <div className="value-display">
                <span>Total Value:</span>
                <strong>₨ {(parseFloat(formData.marlas) * parseFloat(formData.ratePerMarla)).toLocaleString()}</strong>
              </div>
            )}

            <div className="form-group full-width">
              <label>Plot Features</label>
              <div className="feature-chips">
                {features.map(feature => (
                  <button
                    key={feature}
                    type="button"
                    className={`chip ${formData.plotFeatures.includes(feature) ? 'active' : ''}`}
                    onClick={() => handleFeatureToggle(feature)}
                  >
                    {feature}
                  </button>
                ))}
              </div>
            </div>

            <div className="form-group full-width">
              <label>Other Features</label>
              <input
                type="text"
                name="otherFeatures"
                value={formData.otherFeatures}
                onChange={handleChange}
                placeholder="Additional features..."
              />
            </div>

            <div className="form-group full-width">
              <label>Status</label>
              <select name="status" value={formData.status} onChange={handleChange}>
                <option value="available">Available</option>
                <option value="reserved">Reserved</option>
                <option value="blocked">Blocked</option>
              </select>
            </div>

            <div className="form-group full-width">
              <label>Notes</label>
              <textarea
                name="notes"
                value={formData.notes}
                onChange={handleChange}
                placeholder="Additional notes..."
                rows="3"
              />
            </div>
          </div>

          <div className="modal-footer">
            <button type="button" className="btn-secondary" onClick={onClose}>
              Cancel
            </button>
            <button type="submit" className="btn-primary">
              Add Item
            </button>
          </div>
        </form>
      </div>

      <style>{`
        .modal-overlay {
          position: fixed;
          inset: 0;
          background: rgba(0, 0, 0, 0.4);
          backdrop-filter: blur(4px);
          display: flex;
          align-items: center;
          justify-content: center;
          z-index: 1000;
          padding: 20px;
        }

        .modal-container {
          background: white;
          border-radius: 16px;
          max-width: 700px;
          width: 100%;
          max-height: 90vh;
          overflow: hidden;
          box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.25);
          animation: slideUp 0.3s ease-out;
        }

        @keyframes slideUp {
          from {
            opacity: 0;
            transform: translateY(20px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }

        .modal-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 24px 28px;
          border-bottom: 1px solid #f0f0f0;
        }

        .modal-header h2 {
          margin: 0;
          font-size: 20px;
          font-weight: 600;
          color: #1a1a1a;
        }

        .close-btn {
          background: none;
          border: none;
          font-size: 28px;
          color: #999;
          cursor: pointer;
          width: 32px;
          height: 32px;
          display: flex;
          align-items: center;
          justify-content: center;
          border-radius: 8px;
          transition: all 0.2s;
        }

        .close-btn:hover {
          background: #f5f5f5;
          color: #333;
        }

        .modal-body {
          padding: 28px;
          overflow-y: auto;
          max-height: calc(90vh - 160px);
        }

        .form-grid {
          display: grid;
          grid-template-columns: repeat(2, 1fr);
          gap: 20px;
          margin-bottom: 20px;
        }

        .form-group {
          display: flex;
          flex-direction: column;
          gap: 8px;
        }

        .form-group.full-width {
          grid-column: 1 / -1;
        }

        .form-group label {
          font-size: 13px;
          font-weight: 500;
          color: #666;
          letter-spacing: 0.01em;
        }

        .form-group input,
        .form-group select,
        .form-group textarea {
          padding: 12px 14px;
          border: 1.5px solid #e8e8e8;
          border-radius: 10px;
          font-size: 15px;
          transition: all 0.2s;
          font-family: inherit;
        }

        .form-group input:focus,
        .form-group select:focus,
        .form-group textarea:focus {
          outline: none;
          border-color: #3b82f6;
          box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1);
        }

        .value-display {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 16px 20px;
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          border-radius: 12px;
          color: white;
          margin-bottom: 20px;
          font-size: 15px;
        }

        .value-display strong {
          font-size: 20px;
          font-weight: 600;
        }

        .feature-chips {
          display: flex;
          flex-wrap: wrap;
          gap: 8px;
        }

        .chip {
          padding: 8px 16px;
          border: 1.5px solid #e8e8e8;
          border-radius: 20px;
          background: white;
          font-size: 13px;
          font-weight: 500;
          cursor: pointer;
          transition: all 0.2s;
          color: #666;
        }

        .chip:hover {
          border-color: #3b82f6;
          background: #eff6ff;
        }

        .chip.active {
          background: #3b82f6;
          border-color: #3b82f6;
          color: white;
        }

        .modal-footer {
          display: flex;
          justify-content: flex-end;
          gap: 12px;
          padding: 20px 28px;
          border-top: 1px solid #f0f0f0;
        }

        .btn-primary,
        .btn-secondary {
          padding: 12px 24px;
          border-radius: 10px;
          font-size: 14px;
          font-weight: 500;
          cursor: pointer;
          border: none;
          transition: all 0.2s;
        }

        .btn-primary {
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          color: white;
        }

        .btn-primary:hover {
          transform: translateY(-1px);
          box-shadow: 0 10px 25px -5px rgba(102, 126, 234, 0.5);
        }

        .btn-secondary {
          background: #f5f5f5;
          color: #666;
        }

        .btn-secondary:hover {
          background: #e8e8e8;
        }

        @media (max-width: 768px) {
          .form-grid {
            grid-template-columns: 1fr;
          }
        }
      `}</style>
    </div>
  );
};

export default AddInventoryModal;