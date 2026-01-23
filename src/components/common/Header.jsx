import React, { useState, useRef } from 'react';
import { useData } from '../../contexts/DataContextAPI';

const Header = ({ 
  currentSection, 
  onSectionChange, 
  onExport = () => console.log('Export not provided'),
  onImport = () => console.log('Import not provided'),
  onBackup = () => console.log('Backup not provided')
}) => {
  const { storageInfo, saveStatus, lastSaved } = useData();
  const [showMenu, setShowMenu] = useState(false);

  // ========== UPDATED NAV ITEMS - Added Company Reps & Payments ==========
  const navItems = [
    { id: 'dashboard', label: 'Dashboard', icon: '📊' },
    { id: 'customers', label: 'Customers', icon: '👥' },
    { id: 'brokers', label: 'Brokers', icon: '🤵' },
    { id: 'companyReps', label: 'Company Reps', icon: '👔' },  // NEW
    { id: 'projects', label: 'Transactions', icon: '📋' },
    { id: 'inventory', label: 'Inventory', icon: '📦' },
    { id: 'interactions', label: 'Interactions', icon: '💬' },
    { id: 'receipts', label: 'Receipts', icon: '🧾' },
    { id: 'payments', label: 'Payments', icon: '💰' },  // NEW
    { id: 'reports', label: 'Reports', icon: '📈' },
  ];

  const navRef = useRef(null);

  const scrollNav = (direction) => {
    if (!navRef.current) return;
    navRef.current.scrollBy({
      left: direction === 'left' ? -200 : 200,
      behavior: 'smooth',
    });
  };

  const formatLastSaved = () => {
    if (!lastSaved || lastSaved === 'Never') return 'Never';
    try {
      const date = new Date(lastSaved);
      return date.toLocaleTimeString('en-PK', { hour: '2-digit', minute: '2-digit' });
    } catch {
      return 'Unknown';
    }
  };

  return (
    <header style={styles.header}>
      <div style={styles.headerContent}>
        {/* Logo / Brand */}
        <div style={styles.brand}>
          <span style={styles.logo}>🏢</span>
          <div style={styles.brandText}>
            <h1 style={styles.brandName}>Radius </h1>
            <span style={styles.brandTagline}>SBL Intelligence Hub</span>
          </div>
        </div>

        {/* Left Scroll Button */}
        <button
          style={styles.navScrollButton}
          onClick={() => scrollNav('left')}
          aria-label="Scroll left"
        >
          ◀
        </button>

        {/* Navigation */}
        <nav style={styles.nav} ref={navRef}>
          {navItems.map(item => (
            <button
              key={item.id}
              onClick={() => onSectionChange(item.id)}
              style={{
                ...styles.navItem,
                ...(currentSection === item.id ? styles.navItemActive : {})
              }}
            >
              <span style={styles.navIcon}>{item.icon}</span>
              <span style={styles.navLabel}>{item.label}</span>
            </button>
          ))}
        </nav>

        {/* Right Scroll Button */}
        <button
          style={styles.navScrollButton}
          onClick={() => scrollNav('right')}
          aria-label="Scroll right"
        >
          ▶
        </button>

        {/* Right Side - Status & Menu */}
        <div style={styles.rightSection}>
          {/* Save Status */}
          <div style={styles.saveStatus}>
            <span style={{
              ...styles.statusDot,
              backgroundColor: saveStatus === 'saved' ? '#10b981' : saveStatus === 'saving' ? '#f59e0b' : '#ef4444'
            }}></span>
            <span style={styles.statusText}>
              {saveStatus === 'saved' ? `Saved ${formatLastSaved()}` : saveStatus === 'saving' ? 'Saving...' : 'Error'}
            </span>
          </div>

          {/* Storage Info */}
          {storageInfo && (
            <div style={styles.storageInfo}>
              <span style={styles.storageIcon}>💾</span>
              <span style={styles.storageText}>{storageInfo.crmDataSizeFormatted}</span>
            </div>
          )}

          {/* Menu Button */}
          <div style={styles.menuContainer}>
            <button 
              style={styles.menuButton}
              onClick={() => setShowMenu(!showMenu)}
            >
              <span>⚙️</span>
            </button>
            
            {showMenu && (
              <>
                <div style={styles.menuOverlay} onClick={() => setShowMenu(false)}></div>
                <div style={styles.menuDropdown}>
                  <button style={styles.menuItem} onClick={() => { 
                    if (onExport) onExport(); 
                    setShowMenu(false); 
                  }}>
                    <span>📤</span> Export Data
                  </button>
                  <button style={styles.menuItem} onClick={() => { 
                    if (onImport) onImport(); 
                    setShowMenu(false); 
                  }}>
                    <span>📥</span> Import Data
                  </button>
                  <button style={styles.menuItem} onClick={() => { 
                    if (onBackup) onBackup(); 
                    setShowMenu(false); 
                  }}>
                    <span>💾</span> Backup Manager
                  </button>
                  <div style={styles.menuDivider}></div>
                  <div style={styles.menuInfo}>
                    <span style={styles.menuInfoLabel}>Version</span>
                    <span style={styles.menuInfoValue}>4.0</span>
                  </div>
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </header>
  );
};

const styles = {
  header: {
    backgroundColor: '#0f172a',
    borderBottom: '1px solid rgba(255,255,255,0.1)',
    position: 'sticky',
    top: 0,
    zIndex: 50,  // FIXED: Reduced from 100 so modals can appear above
  },
  headerContent: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '0 16px',
    minHeight: '64px',
    height: 'auto',
    maxWidth: '1800px',
    margin: '0 auto',
    gap: '12px',
  },
  brand: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    flexShrink: 0,
  },
  logo: {
    fontSize: '28px',
  },
  brandText: {
    display: 'flex',
    flexDirection: 'column',
    maxWidth: '220px',
    overflow: 'hidden',
  },
  brandName: {
    fontSize: '18px',
    fontWeight: '700',
    color: '#fff',
    margin: 0,
    letterSpacing: '0.75px',
    whiteSpace: 'nowrap',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    fontFamily: "'Poppins', Verdana",
  textTransform: 'uppercase',
  },
  brandTagline: {
    fontSize: '11px',
    color: 'rgba(255,255,255,0.6)',
    letterSpacing: '0.5px',
    whiteSpace: 'nowrap',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
  },
  nav: {
    display: 'flex',
    alignItems: 'center',
    gap: '4px',
    flexWrap: 'nowrap',
    overflowX: 'auto',
    maxWidth: '100%',
    scrollbarWidth: 'none',
    flex: 1,
    minWidth: 0,
  },
  navItem: {
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
    padding: '8px 12px',
    backgroundColor: 'transparent',
    border: 'none',
    borderRadius: '8px',
    color: 'rgba(255,255,255,0.7)',
    fontSize: '13px',
    fontWeight: '500',
    cursor: 'pointer',
    transition: 'all 0.2s ease',
    whiteSpace: 'nowrap',
    flexShrink: 0,
  },
  navScrollButton: {
    backgroundColor: 'rgba(255,255,255,0.1)',
    border: 'none',
    color: '#fff',
    width: '32px',
    height: '32px',
    borderRadius: '50%',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: '14px',
    flexShrink: 0,
    transition: 'background-color 0.2s ease',
  },
  navItemActive: {
    backgroundColor: 'rgba(59, 130, 246, 0.2)',
    color: '#60a5fa',
  },
  navIcon: {
    fontSize: '16px',
    lineHeight: 1,
    flexShrink: 0,
  },
  navLabel: {
    display: 'block',
    maxWidth: '90px',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
  },
  rightSection: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    flexShrink: 0,
    maxWidth: '420px',
  },
  saveStatus: {
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
    padding: '6px 12px',
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderRadius: '6px',
  },
  statusDot: {
    width: '8px',
    height: '8px',
    borderRadius: '50%',
  },
  statusText: {
    fontSize: '12px',
    color: 'rgba(255,255,255,0.7)',
  },
  storageInfo: {
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
    padding: '6px 12px',
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderRadius: '6px',
  },
  storageIcon: {
    fontSize: '14px',
  },
  storageText: {
    fontSize: '12px',
    color: 'rgba(255,255,255,0.7)',
  },
  menuContainer: {
    position: 'relative',
  },
  menuButton: {
    width: '40px',
    height: '40px',
    backgroundColor: 'rgba(255,255,255,0.1)',
    border: 'none',
    borderRadius: '10px',
    fontSize: '18px',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    transition: 'all 0.2s ease',
  },
  menuOverlay: {
    position: 'fixed',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 98,  // Below dropdown but catches clicks
  },
  menuDropdown: {
    position: 'absolute',
    top: '100%',
    right: 0,
    marginTop: '8px',
    backgroundColor: '#fff',
    borderRadius: '12px',
    boxShadow: '0 10px 40px rgba(0,0,0,0.2)',
    minWidth: '200px',
    overflow: 'hidden',
    zIndex: 99,
    animation: 'slideDown 0.2s ease',
  },
  menuItem: {
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
    width: '100%',
    padding: '12px 16px',
    backgroundColor: 'transparent',
    border: 'none',
    fontSize: '14px',
    color: '#1e293b',
    cursor: 'pointer',
    transition: 'background-color 0.2s ease',
    textAlign: 'left',
  },
  menuDivider: {
    height: '1px',
    backgroundColor: '#f1f5f9',
    margin: '4px 0',
  },
  menuInfo: {
    display: 'flex',
    justifyContent: 'space-between',
    padding: '12px 16px',
    fontSize: '13px',
  },
  menuInfoLabel: {
    color: '#64748b',
  },
  menuInfoValue: {
    color: '#1e293b',
    fontWeight: '600',
  },
};

// Add animation and styles
const styleSheet = document.createElement('style');
styleSheet.textContent = `
  @keyframes slideDown {
    from { opacity: 0; transform: translateY(-10px); }
    to { opacity: 1; transform: translateY(0); }
  }
  nav::-webkit-scrollbar {
    display: none;
  }
`;
if (!document.querySelector('#header-styles')) {
  styleSheet.id = 'header-styles';
  document.head.appendChild(styleSheet);
}

export default Header;