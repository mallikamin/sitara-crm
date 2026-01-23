import React, { useState, useMemo } from 'react';
import { useData } from '../../contexts/DataContext';
import { formatCurrency } from '../../utils/formatters';
import ImportInventoryModal from '../modals/ImportInventoryModal';
import AddInventoryModal from '../modals/AddInventoryModal';
import EditInventoryModal from '../modals/EditInventoryModal';
import SellInventoryModal from '../modals/SellInventoryModal';

const Inventory = () => {
  // Get all required functions from DataContext
  const { 
    db, 
    customers,
    inventory,
    addInventoryItem, 
    updateInventory, 
    deleteInventory, 
    bulkImportInventory, 
    addTransaction 
  } = useData();
  
  const [searchTerm, setSearchTerm] = useState('');
  const [projectFilter, setProjectFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [currentPage, setCurrentPage] = useState(1);
  const [showImportModal, setShowImportModal] = useState(false);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showSellModal, setShowSellModal] = useState(false);
  const [selectedItem, setSelectedItem] = useState(null);
  const itemsPerPage = 15;

  // Use inventory directly from context or fallback to db
  const inventoryItems = inventory || db?.inventory || [];
  const customersList = customers || db?.customers || [];

  // Get unique projects for filter - filter out undefined/null values
  const uniqueProjects = useMemo(() => {
    const projects = new Set();
    inventoryItems.forEach(item => {
      if (item.projectName) {
        projects.add(item.projectName);
      }
    });
    return Array.from(projects).sort();
  }, [inventoryItems]);

  // Filter inventory
  const filteredInventory = useMemo(() => {
    return inventoryItems.filter(item => {
      if (searchTerm) {
        const searchFields = [
          item.projectName || '',
          item.unit || '',
          item.unitShopNumber || '',
          item.block || '',
          item.plotFeature || '',
          item.otherFeature || '',
          item.notes || ''
        ].join(' ').toLowerCase();
        
        if (!searchFields.includes(searchTerm.toLowerCase())) return false;
      }
      
      if (projectFilter !== 'all' && item.projectName !== projectFilter) return false;
      if (statusFilter !== 'all' && item.status !== statusFilter) return false;
      
      return true;
    }).sort((a, b) => {
      // Safe string comparison with fallbacks
      const projectA = (a.projectName || '').toLowerCase();
      const projectB = (b.projectName || '').toLowerCase();
      
      if (projectA !== projectB) {
        return projectA.localeCompare(projectB);
      }
      
      const unitA = String(a.unitShopNumber || a.unit || '').toLowerCase();
      const unitB = String(b.unitShopNumber || b.unit || '').toLowerCase();
      return unitA.localeCompare(unitB);
    });
  }, [inventoryItems, searchTerm, projectFilter, statusFilter]);

  // Pagination
  const totalPages = Math.ceil(filteredInventory.length / itemsPerPage);
  const startIdx = (currentPage - 1) * itemsPerPage;
  const pageItems = filteredInventory.slice(startIdx, startIdx + itemsPerPage);

  // Stats
  const stats = useMemo(() => ({
    available: inventoryItems.filter(i => i.status === 'available').length,
    reserved: inventoryItems.filter(i => i.status === 'reserved').length,
    blocked: inventoryItems.filter(i => i.status === 'blocked').length,
    sold: inventoryItems.filter(i => i.status === 'sold').length
  }), [inventoryItems]);

  const handleAddItem = (itemData) => {
    addInventoryItem(itemData);
    setShowAddModal(false);
  };

  const handleEditItem = (itemId) => {
    const item = inventoryItems.find(i => i.id === itemId);
    if (item) {
      setSelectedItem(item);
      setShowEditModal(true);
    }
  };

  const handleSaveEdit = (itemId, updatedData) => {
    updateInventory(itemId, updatedData);
    setShowEditModal(false);
    setSelectedItem(null);
  };

  const handleImport = (items) => {
    bulkImportInventory(items);
    setShowImportModal(false);
  };

  const handleSellItem = (itemId) => {
    const item = inventoryItems.find(i => i.id === itemId);
    if (item) {
      setSelectedItem(item);
      setShowSellModal(true);
    }
  };

  const handleSaveTransaction = (transactionData, inventoryId) => {
    console.log('=== Creating Transaction ===');
    console.log('Transaction Data:', transactionData);
    console.log('Inventory ID:', inventoryId);
    
    try {
      // Create the transaction/project
      const createdTransaction = addTransaction(transactionData);
      console.log('Created Transaction:', createdTransaction);
      
      // Mark inventory as sold
      updateInventory(inventoryId, { 
        status: 'sold', 
        customerId: transactionData.customerId,
        customerName: transactionData.customerName,
        soldAt: new Date().toISOString(),
        transactionId: createdTransaction?.id
      });
      
      console.log('✅ Inventory updated to sold');
      
      // Close modal
      setShowSellModal(false);
      setSelectedItem(null);
      
      // Show success message
      alert(`✅ Transaction created successfully!\n\nCustomer: ${transactionData.customerName}\nUnit: ${transactionData.unitNumber}\nValue: ₨ ${(transactionData.saleValue || transactionData.sale || 0).toLocaleString()}`);
      
    } catch (error) {
      console.error('❌ Error creating transaction:', error);
      alert('Failed to create transaction. Please try again.');
    }
  };

  const handleDeleteItem = (itemId) => {
    const item = inventoryItems.find(i => i.id === itemId);
    const itemName = item ? `${item.projectName} - ${item.unitShopNumber || item.unit}` : 'this item';
    
    if (window.confirm(`Are you sure you want to delete "${itemName}"?\n\nThis action cannot be undone.`)) {
      deleteInventory(itemId);
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'available': return '#10b981';
      case 'sold': return '#6366f1';
      case 'reserved': return '#f59e0b';
      case 'blocked': return '#ef4444';
      default: return '#6b7280';
    }
  };

  // Get brokers from customers list
  const brokers = customersList.filter(c => c.type === 'broker' || c.type === 'both');

  return (
    <div className="inventory-container">
      {/* Header */}
      <div className="header-section">
        <div className="header-content">
          <div className="title-group">
            <h1>Inventory</h1>
            <span className="subtitle">{filteredInventory.length} items {inventoryItems.length !== filteredInventory.length ? `(of ${inventoryItems.length} total)` : ''}</span>
          </div>
          <div className="header-actions">
            <button className="btn-secondary" onClick={() => setShowImportModal(true)}>
              <span className="icon">↑</span>
              Bulk Import
            </button>
            <button className="btn-primary" onClick={() => setShowAddModal(true)}>
              <span className="icon">+</span>
              Add Item
            </button>
          </div>
        </div>
      </div>

      {/* Stats */}
      <div className="stats-grid">
        <div className="stat-card" style={{ '--color': '#10b981' }}>
          <div className="stat-label">Available</div>
          <div className="stat-value">{stats.available}</div>
        </div>
        <div className="stat-card" style={{ '--color': '#f59e0b' }}>
          <div className="stat-label">Reserved</div>
          <div className="stat-value">{stats.reserved}</div>
        </div>
        <div className="stat-card" style={{ '--color': '#ef4444' }}>
          <div className="stat-label">Blocked</div>
          <div className="stat-value">{stats.blocked}</div>
        </div>
        <div className="stat-card" style={{ '--color': '#6366f1' }}>
          <div className="stat-label">Sold</div>
          <div className="stat-value">{stats.sold}</div>
        </div>
      </div>

      {/* Filters */}
      <div className="filters-section">
        <div className="search-box">
          <span className="search-icon">🔍</span>
          <input
            type="text"
            placeholder="Search by project, unit, block..."
            value={searchTerm}
            onChange={(e) => {
              setSearchTerm(e.target.value);
              setCurrentPage(1); // Reset to first page on search
            }}
          />
          {searchTerm && (
            <button 
              className="clear-search"
              onClick={() => {
                setSearchTerm('');
                setCurrentPage(1);
              }}
            >
              ×
            </button>
          )}
        </div>
        <div className="filter-group">
          <select 
            value={projectFilter} 
            onChange={(e) => {
              setProjectFilter(e.target.value);
              setCurrentPage(1);
            }}
          >
            <option value="all">All Projects</option>
            {uniqueProjects.map((project, index) => (
              <option key={project || `project-${index}`} value={project}>{project}</option>
            ))}
          </select>
          <select 
            value={statusFilter} 
            onChange={(e) => {
              setStatusFilter(e.target.value);
              setCurrentPage(1);
            }}
          >
            <option value="all">All Status</option>
            <option value="available">Available</option>
            <option value="reserved">Reserved</option>
            <option value="blocked">Blocked</option>
            <option value="sold">Sold</option>
          </select>
        </div>
      </div>

      {/* Table */}
      <div className="table-container">
        <table className="inventory-table">
          <thead>
            <tr>
              <th>Project</th>
              <th>Unit</th>
              <th>Type</th>
              <th>Marlas</th>
              <th>Rate/Marla</th>
              <th>Total Value</th>
              <th>Status</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {pageItems.length === 0 ? (
              <tr>
                <td colSpan="8" className="empty-state">
                  <div className="empty-content">
                    <span className="empty-icon">📦</span>
                    <p>
                      {searchTerm || projectFilter !== 'all' || statusFilter !== 'all' 
                        ? 'No items match your filters' 
                        : 'No inventory items yet'}
                    </p>
                    {!searchTerm && projectFilter === 'all' && statusFilter === 'all' && (
                      <button 
                        className="btn-primary small"
                        onClick={() => setShowAddModal(true)}
                      >
                        Add First Item
                      </button>
                    )}
                  </div>
                </td>
              </tr>
            ) : (
              pageItems.map(item => {
                const displayValue = item.totalValue || item.saleValue || 
                  (parseFloat(item.ratePerMarla || 0) * parseFloat(item.marlas || 0)) || 0;
                const unitDisplay = item.unitShopNumber || item.unit || '-';
                const customer = item.customerId ? customersList.find(c => c.id === item.customerId) : null;
                
                return (
                  <tr key={item.id}>
                    <td>
                      <div className="project-cell">
                        <div className="project-name">{item.projectName || '-'}</div>
                        {item.block && <div className="project-block">Block {item.block}</div>}
                      </div>
                    </td>
                    <td className="unit-cell">{unitDisplay}</td>
                    <td className="type-cell">{item.unitType || item.type || '-'}</td>
                    <td>{item.marlas || '-'}</td>
                    <td>{item.ratePerMarla ? formatCurrency(item.ratePerMarla) : '-'}</td>
                    <td className="value-cell">{formatCurrency(displayValue)}</td>
                    <td>
                      <div className="status-column">
                        <span 
                          className="status-badge" 
                          style={{ '--status-color': getStatusColor(item.status) }}
                        >
                          {item.status || 'unknown'}
                        </span>
                        {customer && (
                          <div className="customer-info">
                            Sold to: <strong>{customer.name}</strong>
                          </div>
                        )}
                        {item.customerName && !customer && (
                          <div className="customer-info">
                            Sold to: <strong>{item.customerName}</strong>
                          </div>
                        )}
                      </div>
                    </td>
                    <td>
                      <div className="action-buttons">
                        {item.status === 'available' && (
                          <button 
                            className="action-btn sell-btn"
                            onClick={() => handleSellItem(item.id)}
                            title="Sell this item"
                          >
                            <span>$</span>
                          </button>
                        )}
                        <button 
                          className="action-btn edit-btn"
                          onClick={() => handleEditItem(item.id)}
                          title="Edit"
                        >
                          <span>✎</span>
                        </button>
                        <button 
                          className="action-btn delete-btn"
                          onClick={() => handleDeleteItem(item.id)}
                          title="Delete"
                        >
                          <span>×</span>
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="pagination">
          <button 
            className="page-btn"
            disabled={currentPage === 1}
            onClick={() => setCurrentPage(1)}
            title="First page"
          >
            ««
          </button>
          <button 
            className="page-btn"
            disabled={currentPage === 1}
            onClick={() => setCurrentPage(prev => prev - 1)}
            title="Previous page"
          >
            ←
          </button>
          
          <div className="page-numbers">
            {Array.from({ length: totalPages }, (_, i) => i + 1)
              .filter(pageNum => {
                // Show first page, last page, current page, and pages around current
                return pageNum === 1 || 
                       pageNum === totalPages || 
                       Math.abs(pageNum - currentPage) <= 1;
              })
              .map((pageNum, index, array) => (
                <React.Fragment key={pageNum}>
                  {index > 0 && array[index - 1] !== pageNum - 1 && (
                    <span className="page-ellipsis">...</span>
                  )}
                  <button
                    className={`page-number ${currentPage === pageNum ? 'active' : ''}`}
                    onClick={() => setCurrentPage(pageNum)}
                  >
                    {pageNum}
                  </button>
                </React.Fragment>
              ))}
          </div>
          
          <button 
            className="page-btn"
            disabled={currentPage === totalPages}
            onClick={() => setCurrentPage(prev => prev + 1)}
            title="Next page"
          >
            →
          </button>
          <button 
            className="page-btn"
            disabled={currentPage === totalPages}
            onClick={() => setCurrentPage(totalPages)}
            title="Last page"
          >
            »»
          </button>
          
          <span className="page-info">
            Page {currentPage} of {totalPages}
          </span>
        </div>
      )}

      {/* Modals */}
      <ImportInventoryModal
        open={showImportModal}
        onClose={() => setShowImportModal(false)}
        onImport={handleImport}
      />
      
      <AddInventoryModal
        open={showAddModal}
        onClose={() => setShowAddModal(false)}
        onSave={handleAddItem}
      />
      
      <EditInventoryModal
        open={showEditModal}
        onClose={() => {
          setShowEditModal(false);
          setSelectedItem(null);
        }}
        inventoryItem={selectedItem}
        onSave={handleSaveEdit}
      />
      
      <SellInventoryModal
        open={showSellModal}
        onClose={() => {
          setShowSellModal(false);
          setSelectedItem(null);
        }}
        inventoryItem={selectedItem}
        customers={customersList}
        brokers={brokers}
        onSave={handleSaveTransaction}
      />

      <style>{`
        .inventory-container {
          max-width: 1400px;
          margin: 0 auto;
          padding: 32px;
        }

        .header-section {
          margin-bottom: 32px;
        }

        .header-content {
          display: flex;
          justify-content: space-between;
          align-items: center;
        }

        .title-group h1 {
          font-size: 32px;
          font-weight: 700;
          margin: 0 0 4px 0;
          color: #0a0a0a;
          letter-spacing: -0.02em;
        }

        .subtitle {
          font-size: 14px;
          color: #999;
          font-weight: 500;
        }

        .header-actions {
          display: flex;
          gap: 12px;
        }

        .btn-primary,
        .btn-secondary {
          display: flex;
          align-items: center;
          gap: 8px;
          padding: 10px 20px;
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
          transform: translateY(-2px);
          box-shadow: 0 10px 25px -5px rgba(102, 126, 234, 0.5);
        }

        .btn-primary.small {
          padding: 8px 16px;
          font-size: 13px;
          margin-top: 12px;
        }

        .btn-secondary {
          background: white;
          color: #666;
          border: 1.5px solid #e8e8e8;
        }

        .btn-secondary:hover {
          border-color: #d0d0d0;
          background: #fafafa;
        }

        .icon {
          font-size: 18px;
          font-weight: 600;
        }

        .stats-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
          gap: 16px;
          margin-bottom: 28px;
        }

        .stat-card {
          background: white;
          border: 1.5px solid #f0f0f0;
          border-radius: 12px;
          padding: 20px;
          transition: all 0.2s;
        }

        .stat-card:hover {
          border-color: var(--color);
          box-shadow: 0 8px 20px -4px rgba(0, 0, 0, 0.1);
          transform: translateY(-2px);
        }

        .stat-label {
          font-size: 12px;
          font-weight: 600;
          color: #999;
          text-transform: uppercase;
          letter-spacing: 0.05em;
          margin-bottom: 8px;
        }

        .stat-value {
          font-size: 32px;
          font-weight: 700;
          color: var(--color);
          line-height: 1;
        }

        .filters-section {
          display: flex;
          gap: 12px;
          margin-bottom: 24px;
          flex-wrap: wrap;
        }

        .search-box {
          flex: 1;
          min-width: 250px;
          position: relative;
        }

        .search-icon {
          position: absolute;
          left: 14px;
          top: 50%;
          transform: translateY(-50%);
          font-size: 16px;
        }

        .search-box input {
          width: 100%;
          padding: 12px 40px 12px 42px;
          border: 1.5px solid #e8e8e8;
          border-radius: 10px;
          font-size: 14px;
          transition: all 0.2s;
        }

        .search-box input:focus {
          outline: none;
          border-color: #3b82f6;
          box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1);
        }

        .clear-search {
          position: absolute;
          right: 12px;
          top: 50%;
          transform: translateY(-50%);
          background: #e8e8e8;
          border: none;
          width: 20px;
          height: 20px;
          border-radius: 50%;
          font-size: 14px;
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          color: #666;
        }

        .clear-search:hover {
          background: #ddd;
        }

        .filter-group {
          display: flex;
          gap: 12px;
        }

        .filter-group select {
          padding: 12px 14px;
          border: 1.5px solid #e8e8e8;
          border-radius: 10px;
          font-size: 14px;
          background: white;
          cursor: pointer;
          transition: all 0.2s;
          min-width: 140px;
        }

        .filter-group select:focus {
          outline: none;
          border-color: #3b82f6;
        }

        .table-container {
          background: white;
          border: 1.5px solid #f0f0f0;
          border-radius: 12px;
          overflow: hidden;
          margin-bottom: 24px;
        }

        .inventory-table {
          width: 100%;
          border-collapse: collapse;
        }

        .inventory-table thead {
          background: #fafafa;
          border-bottom: 1.5px solid #f0f0f0;
        }

        .inventory-table th {
          padding: 16px 20px;
          text-align: left;
          font-size: 12px;
          font-weight: 600;
          color: #666;
          text-transform: uppercase;
          letter-spacing: 0.05em;
        }

        .inventory-table td {
          padding: 16px 20px;
          font-size: 14px;
          color: #333;
          border-bottom: 1px solid #f5f5f5;
        }

        .inventory-table tbody tr:hover {
          background: #fafafa;
        }

        .inventory-table tbody tr:last-child td {
          border-bottom: none;
        }

        .project-cell {
          display: flex;
          flex-direction: column;
          gap: 4px;
        }

        .project-name {
          font-weight: 600;
          color: #1a1a1a;
        }

        .project-block {
          font-size: 12px;
          color: #999;
        }

        .unit-cell {
          font-weight: 600;
          color: #667eea;
        }

        .type-cell {
          text-transform: capitalize;
          color: #666;
        }

        .value-cell {
          font-weight: 600;
          color: #1a1a1a;
        }

        .status-badge {
          display: inline-block;
          padding: 6px 12px;
          border-radius: 6px;
          font-size: 11px;
          font-weight: 600;
          text-transform: uppercase;
          letter-spacing: 0.03em;
          background: color-mix(in srgb, var(--status-color) 15%, white);
          color: var(--status-color);
          border: 1px solid color-mix(in srgb, var(--status-color) 30%, white);
        }

        .status-column {
          display: flex;
          flex-direction: column;
          gap: 6px;
        }

        .customer-info {
          font-size: 12px;
          color: #666;
        }

        .customer-info strong {
          color: #667eea;
        }

        .action-buttons {
          display: flex;
          gap: 6px;
        }

        .action-btn {
          width: 32px;
          height: 32px;
          border-radius: 8px;
          border: none;
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 16px;
          font-weight: 600;
          transition: all 0.2s;
        }

        .sell-btn {
          background: #10b981;
          color: white;
        }

        .sell-btn:hover {
          background: #059669;
          transform: translateY(-2px);
          box-shadow: 0 4px 12px rgba(16, 185, 129, 0.3);
        }

        .edit-btn {
          background: #3b82f6;
          color: white;
        }

        .edit-btn:hover {
          background: #2563eb;
          transform: translateY(-2px);
          box-shadow: 0 4px 12px rgba(59, 130, 246, 0.3);
        }

        .delete-btn {
          background: #f5f5f5;
          color: #999;
        }

        .delete-btn:hover {
          background: #fee;
          color: #ef4444;
        }

        .empty-state {
          padding: 60px 20px !important;
        }

        .empty-content {
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 12px;
        }

        .empty-icon {
          font-size: 48px;
          opacity: 0.5;
        }

        .empty-content p {
          margin: 0;
          color: #999;
          font-size: 14px;
        }

        .pagination {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
          flex-wrap: wrap;
        }

        .page-btn,
        .page-number {
          min-width: 36px;
          height: 36px;
          padding: 0 8px;
          border-radius: 8px;
          border: none;
          background: white;
          border: 1.5px solid #e8e8e8;
          color: #666;
          cursor: pointer;
          font-size: 14px;
          font-weight: 500;
          transition: all 0.2s;
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .page-btn:hover:not(:disabled),
        .page-number:hover {
          border-color: #667eea;
          color: #667eea;
        }

        .page-btn:disabled {
          opacity: 0.4;
          cursor: not-allowed;
        }

        .page-number.active {
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          color: white;
          border-color: transparent;
        }

        .page-numbers {
          display: flex;
          gap: 4px;
          align-items: center;
        }

        .page-ellipsis {
          padding: 0 4px;
          color: #999;
        }

        .page-info {
          font-size: 13px;
          color: #999;
          margin-left: 12px;
        }

        @media (max-width: 768px) {
          .inventory-container {
            padding: 20px;
          }

          .header-content {
            flex-direction: column;
            align-items: flex-start;
            gap: 16px;
          }

          .filters-section {
            flex-direction: column;
          }

          .filter-group {
            width: 100%;
          }

          .filter-group select {
            flex: 1;
          }

          .table-container {
            overflow-x: auto;
          }

          .inventory-table {
            min-width: 800px;
          }

          .page-info {
            width: 100%;
            text-align: center;
            margin-left: 0;
            margin-top: 8px;
          }
        }
      `}</style>
    </div>
  );
};

export default Inventory;