function Customers() {
    return (
      <div className="p-6">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl font-bold">Customers</h1>
          <button className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700">
            Add New Customer
          </button>
        </div>
        
        <div className="bg-white rounded-lg shadow p-6">
          <div className="mb-6">
            <div className="relative">
              <input
                type="text"
                placeholder="Search customers..."
                className="w-full px-4 py-2 pl-10 border rounded-lg"
              />
              <span className="absolute left-3 top-2.5">🔍</span>
            </div>
          </div>
          
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="bg-gray-50">
                  <th className="py-3 px-4 text-left">Name</th>
                  <th className="py-3 px-4 text-left">Email</th>
                  <th className="py-3 px-4 text-left">Phone</th>
                  <th className="py-3 px-4 text-left">Company</th>
                  <th className="py-3 px-4 text-left">Actions</th>
                </tr>
              </thead>
              <tbody>
                <tr className="border-b">
                  <td className="py-3 px-4">John Doe</td>
                  <td className="py-3 px-4">john@example.com</td>
                  <td className="py-3 px-4">+92 300 1234567</td>
                  <td className="py-3 px-4">ABC Corp</td>
                  <td className="py-3 px-4">
                    <button className="text-blue-600 hover:text-blue-800 mr-3">Edit</button>
                    <button className="text-red-600 hover:text-red-800">Delete</button>
                  </td>
                </tr>
                <tr className="border-b">
                  <td className="py-3 px-4">Jane Smith</td>
                  <td className="py-3 px-4">jane@example.com</td>
                  <td className="py-3 px-4">+92 321 7654321</td>
                  <td className="py-3 px-4">XYZ Ltd</td>
                  <td className="py-3 px-4">
                    <button className="text-blue-600 hover:text-blue-800 mr-3">Edit</button>
                    <button className="text-red-600 hover:text-red-800">Delete</button>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </div>
    );
  }
  
  export default Customers;