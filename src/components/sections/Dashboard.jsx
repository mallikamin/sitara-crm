import React, { useMemo } from 'react';
import { useData } from '../../contexts/DataContext';
import { formatCurrency } from '../../utils/formatters';
import './Dashboard.css';

const Dashboard = () => {
  const { db, calculateOverallFinancials } = useData();
  
  const financials = useMemo(() => calculateOverallFinancials(), [calculateOverallFinancials]);
  
  const stats = [
    { label: 'Total Customers', value: db.customers.length },
    { label: 'Active Projects', value: db.projects.length },
    { label: 'Total Sale Value', value: formatCurrency(financials.totalSale) },
    { label: 'Total Received', value: formatCurrency(financials.totalReceived) },
    { label: 'Total Receivable', value: formatCurrency(financials.totalReceivable) },
    { label: 'Total Overdue', value: formatCurrency(financials.totalOverdue), isDanger: true },
    { label: 'Future Receivable', value: formatCurrency(financials.totalFuture), isPrimary: true },
    { label: 'Total Brokers', value: db.customers.filter(c => c.type === 'broker' || c.type === 'both').length }
  ];

  return (
    <div className="dashboard">
      {/* Stats Grid */}
      <div className="stats-grid">
        {stats.map((stat, index) => (
          <div key={index} className="stat-card">
            <div className="stat-label">{stat.label}</div>
            <div 
              className="stat-value"
              style={stat.isDanger ? { color: 'var(--danger)' } : stat.isPrimary ? { color: 'var(--primary)' } : {}}
            >
              {stat.value}
            </div>
          </div>
        ))}
      </div>
      
      {/* Quick Actions */}
      <div className="card mb-4">
        <h2 className="mb-3">⚡ Quick Actions</h2>
        <div className="d-flex gap-2 flex-wrap">
          <button className="btn btn-primary">
            👤 Add Customer
          </button>
          <button className="btn btn-primary">
            🏗 Add Project
          </button>
          <button className="btn btn-primary">
            💬 Log Interaction
          </button>
          <button className="btn btn-primary">
            💰 Add Receipt
          </button>
          <button className="btn btn-success">
            📊 Generate Report
          </button>
        </div>
      </div>
      
      {/* Recent Activities */}
      <div className="card">
        <h2 className="mb-3">📋 Recent Activities</h2>
        <div className="table-container">
          <table className="table">
            <thead>
              <tr>
                <th>Date</th>
                <th>Type</th>
                <th>Description</th>
                <th>Contact</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td colSpan="5" style={{ textAlign: 'center', color: 'var(--gray-400)', padding: '40px' }}>
                  No recent activities
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;