import { useState } from 'react';
import { Section } from '@/types/crm';
import { useCRMStore } from '@/hooks/useCRMStore';
import { Header } from '@/components/crm/Header';
import { Dashboard } from '@/components/crm/Dashboard';
import { CustomersSection } from '@/components/crm/CustomersSection';
import { ProjectsSection } from '@/components/crm/ProjectsSection';
import { InventorySection } from '@/components/crm/InventorySection';
import { InteractionsSection } from '@/components/crm/InteractionsSection';
import { ReceiptsSection } from '@/components/crm/ReceiptsSection';
import { ReportsSection } from '@/components/crm/ReportsSection';
import { AddCustomerModal } from '@/components/crm/modals/AddCustomerModal';
import { AddProjectModal } from '@/components/crm/modals/AddProjectModal';
import { AddInteractionModal } from '@/components/crm/modals/AddInteractionModal';
import { AddReceiptModal } from '@/components/crm/modals/AddReceiptModal';
import { Toaster } from 'sonner';

const Index = () => {
  const [activeSection, setActiveSection] = useState<Section>('dashboard');
  const [showAddCustomerModal, setShowAddCustomerModal] = useState(false);
  const [showAddProjectModal, setShowAddProjectModal] = useState(false);
  const [showAddInteractionModal, setShowAddInteractionModal] = useState(false);
  const [showAddReceiptModal, setShowAddReceiptModal] = useState(false);

  const {
    customers,
    projects,
    inventory,
    interactions,
    receipts,
    stats,
    addCustomer,
    addProject,
    addInventoryItem,
    addInteraction,
    addReceipt,
    deleteCustomer,
    deleteProject,
    deleteInventoryItem,
    deleteInteraction,
    deleteReceipt,
  } = useCRMStore();

  const renderSection = () => {
    switch (activeSection) {
      case 'dashboard':
        return (
          <Dashboard
            stats={stats}
            interactions={interactions}
            projects={projects}
            onSectionChange={setActiveSection}
            onAddCustomer={() => setShowAddCustomerModal(true)}
            onAddProject={() => setShowAddProjectModal(true)}
            onAddInteraction={() => setShowAddInteractionModal(true)}
            onAddReceipt={() => setShowAddReceiptModal(true)}
          />
        );
      case 'customers':
        return (
          <CustomersSection
            customers={customers}
            onAddCustomer={() => setShowAddCustomerModal(true)}
            onDeleteCustomer={deleteCustomer}
          />
        );
      case 'projects':
        return (
          <ProjectsSection
            projects={projects}
            onAddProject={() => setShowAddProjectModal(true)}
            onDeleteProject={deleteProject}
          />
        );
      case 'inventory':
        return (
          <InventorySection
            inventory={inventory}
            onAddInventory={() => {}}
            onDeleteInventory={deleteInventoryItem}
          />
        );
      case 'interactions':
        return (
          <InteractionsSection
            interactions={interactions}
            onAddInteraction={() => setShowAddInteractionModal(true)}
            onDeleteInteraction={deleteInteraction}
          />
        );
      case 'receipts':
        return (
          <ReceiptsSection
            receipts={receipts}
            onAddReceipt={() => setShowAddReceiptModal(true)}
            onDeleteReceipt={deleteReceipt}
          />
        );
      case 'reports':
        return <ReportsSection stats={stats} />;
      default:
        return null;
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <Toaster position="top-right" richColors />
      
      <Header activeSection={activeSection} onSectionChange={setActiveSection} />
      
      <main className="max-w-[1600px] mx-auto px-4 md:px-6 py-6 md:py-8">
        {renderSection()}
      </main>

      {/* Modals */}
      <AddCustomerModal
        open={showAddCustomerModal}
        onClose={() => setShowAddCustomerModal(false)}
        onAdd={addCustomer}
      />

      <AddProjectModal
        open={showAddProjectModal}
        onClose={() => setShowAddProjectModal(false)}
        onAdd={addProject}
        customers={customers}
      />

      <AddInteractionModal
        open={showAddInteractionModal}
        onClose={() => setShowAddInteractionModal(false)}
        onAdd={addInteraction}
        customers={customers}
      />

      <AddReceiptModal
        open={showAddReceiptModal}
        onClose={() => setShowAddReceiptModal(false)}
        onAdd={addReceipt}
        customers={customers}
        projects={projects}
      />
    </div>
  );
};

export default Index;
