function Header({ currentSection, onSectionChange, onExport, onImport, onBackup }) {
  const sections = [
    { id: 'dashboard', label: 'Dashboard', icon: '📊' },
    { id: 'customers', label: 'Customers', icon: '👥' },
    { id: 'projects', label: 'Projects', icon: '📋' },
    { id: 'inventory', label: 'Inventory', icon: '📦' },
    { id: 'interactions', label: 'Interactions', icon: '💬' },
    { id: 'receipts', label: 'Receipts', icon: '💰' },
    { id: 'reports', label: 'Reports', icon: '📈' },
  ];

  return (
    <header className="bg-white shadow-md border-b">
      <div className="container mx-auto px-4">
        <div className="flex flex-col md:flex-row items-center justify-between py-4">
          {/* Logo and Title */}
          <div className="flex items-center mb-4 md:mb-0">
            <div className="text-2xl mr-3">🚀</div>
            <div>
              <h1 className="text-xl font-bold text-gray-900">Sitara CRM</h1>
              <p className="text-sm text-gray-600">Customer Relationship Management</p>
            </div>
          </div>

          {/* Navigation */}
          <nav className="flex flex-wrap gap-2 mb-4 md:mb-0">
            {sections.map((section) => (
              <button
                key={section.id}
                onClick={() => onSectionChange(section.id)}
                className={`flex items-center px-4 py-2 rounded-lg transition-colors ${
                  currentSection === section.id
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                <span className="mr-2">{section.icon}</span>
                <span>{section.label}</span>
              </button>
            ))}
          </nav>

          {/* Action Buttons */}
          <div className="flex gap-3">
            <button
              onClick={onExport}
              className="px-4 py-2 border border-blue-600 text-blue-600 rounded-lg hover:bg-blue-50"
            >
              Export
            </button>
            <button
              onClick={onImport}
              className="px-4 py-2 border border-green-600 text-green-600 rounded-lg hover:bg-green-50"
            >
              Import
            </button>
            <button
              onClick={onBackup}
              className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700"
            >
              Backup
            </button>
          </div>
        </div>
      </div>
    </header>
  );
}

export default Header;