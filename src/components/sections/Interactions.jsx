function Interactions() {
    return (
      <div className="p-6">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl font-bold">Customer Interactions</h1>
          <button className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700">
            Log New Interaction
          </button>
        </div>
        
        <div className="bg-white rounded-lg shadow p-6">
          <div className="mb-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium mb-1">Customer</label>
                <select className="w-full px-3 py-2 border rounded">
                  <option>All Customers</option>
                  <option>John Doe</option>
                  <option>Jane Smith</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Type</label>
                <select className="w-full px-3 py-2 border rounded">
                  <option>All Types</option>
                  <option>Phone Call</option>
                  <option>Email</option>
                  <option>Meeting</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Date Range</label>
                <input type="date" className="w-full px-3 py-2 border rounded" />
              </div>
            </div>
          </div>
          
          <div className="space-y-4">
            <div className="p-4 border rounded-lg">
              <div className="flex justify-between items-start">
                <div>
                  <h3 className="font-medium">Follow-up call with John Doe</h3>
                  <p className="text-sm text-gray-600">Discussed project requirements and timeline</p>
                  <div className="flex items-center mt-2 space-x-4">
                    <span className="text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded">Phone Call</span>
                    <span className="text-xs text-gray-500">Today, 10:30 AM</span>
                  </div>
                </div>
                <button className="text-blue-600 hover:text-blue-800">View Details</button>
              </div>
            </div>
            
            <div className="p-4 border rounded-lg">
              <div className="flex justify-between items-start">
                <div>
                  <h3 className="font-medium">Project proposal sent to Jane Smith</h3>
                  <p className="text-sm text-gray-600">Sent detailed proposal for CRM implementation</p>
                  <div className="flex items-center mt-2 space-x-4">
                    <span className="text-xs bg-green-100 text-green-800 px-2 py-1 rounded">Email</span>
                    <span className="text-xs text-gray-500">Yesterday, 2:15 PM</span>
                  </div>
                </div>
                <button className="text-blue-600 hover:text-blue-800">View Details</button>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }
  
  export default Interactions;