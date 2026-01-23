import React from 'react';
import { InventorySection } from '@/components/crm/InventorySection';
import { useCRMStore } from '@/store/useCRMStore';
import { InventoryItem } from '@/types/crm';

export default function TestInventory() {
  const { db, addInventory, deleteInventory, bulkImportInventory, addNotification } = useCRMStore();
  
  const handleAddInventory = () => {
    const newItem = {
      projectName: 'Test Project ' + Date.now(),
      block: 'Test',
      unitShopNumber: 'T' + Math.floor(Math.random() * 1000),
      unitType: 'Residential' as const,
      marlas: Math.floor(Math.random() * 10) + 1,
      ratePerMarla: 500000,
      totalValue: 2500000,
      saleValue: 2500000,
      plotFeatures: ['Test'],
      plotFeature: 'Test',
      status: 'available' as const,
    };
    
    addInventory(newItem);
    addNotification({
      type: 'success',
      message: 'Test item added',
      timestamp: new Date().toISOString()
    });
  };
  
  const handleImportInventory = (items: Partial<InventoryItem>[]) => {
    bulkImportInventory(items);
    addNotification({
      type: 'success',
      message: `Imported ${items.length} test items`,
      timestamp: new Date().toISOString()
    });
  };
  
  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-4">Test Inventory Page</h1>
      <InventorySection
        inventory={db.inventory}
        onAddInventory={handleAddInventory}
        onDeleteInventory={deleteInventory}
        onImportInventory={handleImportInventory}
      />
    </div>
  );
}