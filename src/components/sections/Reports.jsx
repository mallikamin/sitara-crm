function Reports() {
  const reportTypes = [
    { id: 1, name: "Sales Report", description: "Monthly sales performance", icon: "📊" },
    { id: 2, name: "Customer Report", description: "Customer acquisition & retention", icon: "👥" },
    { id: 3, name: "Project Report", description: "Project progress & status", icon: "📋" },
    { id: 4, name: "Financial Report", description: "Revenue, expenses & profit", icon: "💰" },
    { id: 5, name: "Inventory Report", description: "Stock levels & movements", icon: "📦" },
    { id: 6, name: "Receipts Report", description: "Payment receipts summary", icon: "🧾" },
  ];

  const recentReports = [
    { id: 1, name: "Q4 Sales Report", type: "Sales", generated: "2024-01-15", size: "2.4 MB" },
    { id: 2, name: "Customer Analysis", type: "Customer", generated: "2024-01-10", size: "1.8 MB" },
    { id: 3, name: "Yearly Financial Summary", type: "Financial", generated: "2024-01-05", size: "3.2 MB" },
  ];

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">Reports & Analytics</h1>
        <button className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700">
          Generate Report
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
        <div className="lg:col-span-2">
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-lg font-semibold mb-4">Quick Stats</h2>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="p-4 bg-blue-50 rounded-lg">
                <div className="text-2xl font-bold">₨2.5M</div>
                <div className="text-sm text-gray-600">Total Revenue</div>
              </div>
              <div className="p-4 bg-green-50 rounded-lg">
                <div className="text-2xl font-bold">48</div>
                <div className="text-sm text-gray-600">Active Projects</div>
              </div>
              <div className="p-4 bg-purple-50 rounded-lg">
                <div className="text-2xl font-bold">1,248</div>
                <div className="text-sm text-gray-600">Total Customers</div>
              </div>
              <div className="p-4 bg-yellow-50 rounded-lg">
                <div className="text-2xl font-bold">94%</div>
                <div className="text-sm text-gray-600">Satisfaction Rate</div>
              </div>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-lg font-semibold mb-4">Export Options</h2>
          <div className="space-y-3">
            <button className="w-full px-4 py-3 border rounded-lg hover:bg-gray-50 flex items-center justify-between">
              <span>Export as PDF</span>
              <span>📄</span>
            </button>
            <button className="w-full px-4 py-3 border rounded-lg hover:bg-gray-50 flex items-center justify-between">
              <span>Export as Excel</span>
              <span>📊</span>
            </button>
            <button className="w-full px-4 py-3 border rounded-lg hover:bg-gray-50 flex items-center justify-between">
              <span>Export as CSV</span>
              <span>📑</span>
            </button>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-lg font-semibold mb-4">Report Types</h2>
          <div className="space-y-4">
            {reportTypes.map((report) => (
              <div key={report.id} className="flex items-center justify-between p-4 border rounded-lg hover:bg-gray-50">
                <div className="flex items-center">
                  <span className="text-2xl mr-4">{report.icon}</span>
                  <div>
                    <div className="font-medium">{report.name}</div>
                    <div className="text-sm text-gray-600">{report.description}</div>
                  </div>
                </div>
                <button className="px-3 py-1 text-sm bg-blue-600 text-white rounded hover:bg-blue-700">
                  Generate
                </button>
              </div>
            ))}
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-lg font-semibold mb-4">Recent Reports</h2>
          <div className="space-y-4">
            {recentReports.map((report) => (
              <div key={report.id} className="flex items-center justify-between p-4 border rounded-lg">
                <div>
                  <div className="font-medium">{report.name}</div>
                  <div className="text-sm text-gray-600">
                    {report.type} • Generated: {report.generated} • {report.size}
                  </div>
                </div>
                <div className="flex gap-2">
                  <button className="px-3 py-1 text-sm border rounded hover:bg-gray-50">View</button>
                  <button className="px-3 py-1 text-sm border rounded hover:bg-gray-50">Download</button>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

export default Reports;