import React from 'react'

interface StatCardProps {
  label: string
  value: string | number
  change?: string
  isDanger?: boolean
  isPrimary?: boolean
  icon?: string
}

const StatCard: React.FC<StatCardProps> = ({ 
  label, 
  value, 
  change, 
  isDanger, 
  isPrimary, 
  icon 
}) => {
  return (
    <div className="bg-white rounded-xl shadow-md hover:shadow-lg transition-shadow p-6 relative overflow-hidden border border-gray-200">
      {/* Left border accent */}
      <div className={`absolute left-0 top-0 h-full w-1 ${
        isDanger ? 'bg-red-500' : 
        isPrimary ? 'bg-blue-500' : 
        'bg-green-500'
      }`}></div>
      
      <div className="flex items-center justify-between mb-4">
        <div className="text-sm font-semibold text-gray-500 uppercase tracking-wide">
          {label}
        </div>
        {icon && <div className="text-2xl">{icon}</div>}
      </div>
      
      <div className="flex items-baseline">
        <div className={`text-3xl font-bold ${
          isDanger ? 'text-red-600' : 
          isPrimary ? 'text-blue-600' : 
          'text-gray-900'
        }`}>
          {value}
        </div>
        
        {change && (
          <div className={`ml-2 text-sm font-medium ${
            change.startsWith('+') ? 'text-green-600' : 'text-red-600'
          }`}>
            {change}
          </div>
        )}
      </div>
      
      {change && (
        <div className="mt-2 text-xs text-gray-500">
          vs last period
        </div>
      )}
    </div>
  )
}

export default StatCard