import React, { useState, useMemo } from 'react';
import { useData } from '../../contexts/DataContext';
import { formatCurrency } from '../../utils/formatters';
import './Inventory.css';

const Inventory = ({ onAddItem, onEditItem, onSellItem }) => {
  const { db } = useData();
  const [searchTerm, setSearchTerm] = useState('');
  const [projectFilter, setProjectFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 15;

  // Get unique projects for filter
  const uniqueProjects = useMemo(() => {
    const projects = new Set();
    db.inventory.forEach(item => projects.add(item.projectName));
    return Array.from(projects);
  }, [db.inventory]);

  // Filter inventory
  const filteredInventory = useMemo(() => {
    return db.inventory.filter(item => {
      // Search filter
      if (searchTerm) {
        const searchFields = [
          item.projectName,
          item.unit,
          item.block,
          item.plotFeature,
          item.otherFeature,
          item.notes
        ].join(' ').toLowerCase();
        
        if (!searchFields.includes(searchTerm.toLowerCase())) return false;
      }
      
      // Project filter
      if (projectFilter !== 'all' && item.projectName !== projectFilter) return false;
      
      // Status filter
      if (statusFilter !== 'all' && item.status !== statusFilter) return false;
      
      return true;
    }).sort((a, b) => {
      if (a.projectName !== b.projectName) {
        return a.projectName.localeCompare(b.projectName);
      }
      return a.unit.localeCompare(b.unit);
    });
  }, [db.inventory, searchTerm, projectFilter, statusFilter]);

  // Pagination
  const totalPages = Math.ceil(filteredInventory.length / itemsPerPage);
  const startIdx = (currentPage - 1) * itemsPerPage;
  const pageItems = filteredInventory.slice(startIdx, startIdx + itemsPerPage);

  const getStatusBadge = (status) => {
    switch (status) {
      case 'available': return 'badge-success';
      case 'sold': return 'badge-primary';
      case 'reserved': return 'badge-warning';
      case 'blocked': return 'badge-danger';
      default: return 'badge-info';
    }
  };

  return (
    <div className="inventory">
      <div className="card">
        <div className="d-flex justify-between align-center mb-4">
          <h2>📦 Inventory Management</h2>
          <div className="btn-group">
            <button className="btn btn-primary" onClick={onAddItem}>
              📦 Add Inventory Item
            </button>
            <button className="btn btn-success">
              📋 Bulk Import
            </button>
          </div>
        </div>
        
        {/* Filters */}
        <div className="d-flex justify-between align-center mb-4">
          <div className="search-box">
            <input
              type="text"
              className="search-input"
              placeholder="Search inventory..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
            <span className="search-icon">🔍</span>
          </div>
          
          <div className="filter-group">
            <select 
              className="filter-select"
              value={projectFilter}
              onChange={(e) => setProjectFilter(e.target.value)}
            >
              <option value="all">All Projects</option>
              {uniqueProjects.map(project => (
                <option key={project} value={project}>{project}</option>
              ))}
            </select>
            
            <select 
              className="filter-select"
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
            >
              <option value="all">All Status</option>
              <option value="available">Available</option>
              <option value="sold">Sold</option>
              <option value="reserved">Reserved</option>
              <option value="blocked">Blocked</option>
            </select>
            
            <button className="btn btn-success">
              📤 Export
            </button>
          </div>
        </div>
        
        {/* Inventory Table */}
        <div className="table-container">
          <table className="table">
            <thead>
              <tr>
                <th>ID</th>
                <th>Project</th>
                <th>Unit</th>
                <th>Type</th>
                <th>Marlas</th>
                <th>Rate</th>
                <th>Sale Value</th>
                <th>Status</th>
                <th>Customer</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {pageItems.map(item => {
                const customer = item.customerId ? 
                  db.customers.find(c => c.id === item.customerId) : null;
                
                return (
                  <tr key={item.id}>
                    <td><span className="text-muted">{item.id.substring(0, 8)}</span></td>
                    <td>
                      <strong>{item.projectName}</strong>
                      {item.block && <div className="text-xs text-muted">{item.block}</div>}
                    </td>
                    <td>{item.unit}</td>
                    <td>{item.unitType.replace('_', ' ').toUpperCase()}</td>
                    <td>{item.marlas}</td>
                    <td>{formatCurrency(item.rate)}</td>
                    <td className="font-semibold">{formatCurrency(item.saleValue)}</td>
                    <td>
                      <span className={`badge ${getStatusBadge(item.status)}`}>
                        {item.status.toUpperCase()}
                      </span>
                    </td>
                    <td>
                      {customer ? (
                        <span className="cursor-pointer text-primary">
                          {customer.name}
                        </span>
                      ) : (
                        <span className="text-muted">-</span>
                      )}
                    </td>
                    <td>
                      <div className="btn-group">
                        {item.status === 'available' && (
                          <button 
                            className="action-btn btn-primary"
                            onClick={() => onSellItem(item.id)}
                          >
                            Sell
                          </button>
                        )}
                        <button 
                          className="action-btn btn-edit"
                          onClick={() => onEditItem(item.id)}
                        >
                          Edit
                        </button>
                        <button className="action-btn btn-danger">
                          Delete
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
              
              {pageItems.length === 0 && (
                <tr>
                  <td colSpan="10" style={{ textAlign: 'center', color: 'var(--gray-400)', padding: '40px' }}>
                    No inventory items found
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
        
        {/* Pagination */}
        {totalPages > 1 && (
          <div className="d-flex justify-center align-center mt-3">
            <div className="btn-group">
              <button 
                className={`btn btn-sm ${currentPage === 1 ? 'btn-secondary' : 'btn-primary'}`}
                disabled={currentPage === 1}
                onClick={() => setCurrentPage(prev => prev - 1)}
              >
                ← Previous
              </button>
              
              {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                let pageNum;
                if (totalPages <= 5) {
                  pageNum = i + 1;
                } else if (currentPage <= 3) {
                  pageNum = i + 1;
                } else if (currentPage >= totalPages - 2) {
                  pageNum = totalPages - 4 + i;
                } else {
                  pageNum = currentPage - 2 + i;
                }
                
                return (
                  <button
                    key={pageNum}
                    className={`btn btn-sm ${currentPage === pageNum ? 'btn-primary' : 'btn-secondary'}`}
                    onClick={() => setCurrentPage(pageNum)}
                  >
                    {pageNum}
                  </button>
                );
              })}
              
              <button 
                className={`btn btn-sm ${currentPage === totalPages ? 'btn-secondary' : 'btn-primary'}`}
                disabled={currentPage === totalPages}
                onClick={() => setCurrentPage(prev => prev + 1)}
              >
                Next →
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default Inventory;