import { DataProvider } from './contexts/DataContext';
import { TestDataLoading } from './components/test/TestDataLoading';

import React from 'react'

function App() {
  return (
      <DataProvider>
    <div className="min-h-screen bg-gray-50 p-8">
      <h1 className="text-3xl font-bold text-blue-600">
        Sitara Builders CRM
      </h1>
      <p className="mt-4 text-gray-600">
        Loading the application...
      </p>
      <TestDataLoading /> 
      </DataProvider>
    </div>
  )
}

export default App