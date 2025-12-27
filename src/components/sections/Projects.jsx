function Projects() {
    const projects = [
      { id: 1, name: "CRM Implementation", client: "ABC Corp", status: "In Progress", deadline: "2024-03-15", budget: "₨500,000" },
      { id: 2, name: "Website Redesign", client: "XYZ Ltd", status: "Completed", deadline: "2024-02-28", budget: "₨250,000" },
      { id: 3, name: "Mobile App Development", client: "Tech Solutions", status: "Planning", deadline: "2024-04-30", budget: "₨750,000" },
      { id: 4, name: "ERP System Upgrade", client: "Manufacturing Inc", status: "On Hold", deadline: "2024-05-15", budget: "₨1,200,000" },
    ];
  
    const getStatusColor = (status) => {
      switch (status) {
        case "Completed": return "bg-green-100 text-green-800";
        case "In Progress": return "bg-blue-100 text-blue-800";
        case "Planning": return "bg-yellow-100 text-yellow-800";
        case "On Hold": return "bg-red-100 text-red-800";
        default: return "bg-gray-100 text-gray-800";
      }
    };
  
    return (
      <div className="p-6">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl font-bold">Projects</h1>
          <button className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700">
            + New Project
          </button>
        </div>
  
        <div className="bg-white rounded-lg shadow overflow-hidden">
          <div className="p-6 border-b">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div className="relative flex-1 max-w-md">
                <input
                  type="text"
                  placeholder="Search projects..."
                  className="w-full pl-10 pr-4 py-2 border rounded-lg"
                />
                <span className="absolute left-3 top-2.5">🔍</span>
              </div>
              <div className="flex gap-3">
                <select className="px-4 py-2 border rounded-lg">
                  <option>All Status</option>
                  <option>Planning</option>
                  <option>In Progress</option>
                  <option>Completed</option>
                  <option>On Hold</option>
                </select>
                <button className="px-4 py-2 border rounded-lg hover:bg-gray-50">
                  Filter
                </button>
              </div>
            </div>
          </div>
  
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="py-3 px-6 text-left text-sm font-medium text-gray-700">Project Name</th>
                  <th className="py-3 px-6 text-left text-sm font-medium text-gray-700">Client</th>
                  <th className="py-3 px-6 text-left text-sm font-medium text-gray-700">Status</th>
                  <th className="py-3 px-6 text-left text-sm font-medium text-gray-700">Deadline</th>
                  <th className="py-3 px-6 text-left text-sm font-medium text-gray-700">Budget</th>
                  <th className="py-3 px-6 text-left text-sm font-medium text-gray-700">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {projects.map((project) => (
                  <tr key={project.id} className="hover:bg-gray-50">
                    <td className="py-4 px-6">
                      <div className="font-medium">{project.name}</div>
                    </td>
                    <td className="py-4 px-6">{project.client}</td>
                    <td className="py-4 px-6">
                      <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-medium ${getStatusColor(project.status)}`}>
                        {project.status}
                      </span>
                    </td>
                    <td className="py-4 px-6">{project.deadline}</td>
                    <td className="py-4 px-6 font-medium">{project.budget}</td>
                    <td className="py-4 px-6">
                      <div className="flex gap-2">
                        <button className="text-blue-600 hover:text-blue-800">View</button>
                        <button className="text-green-600 hover:text-green-800">Edit</button>
                        <button className="text-red-600 hover:text-red-800">Delete</button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    );
  }
  
  export default Projects;