import { DataService } from '../services/dataservice';
import type { Customer, Project, Interaction } from '../types/crm';

/**
 * This script cleans up any remaining broker data in customers table
 * after the DataContext migration has run
 */
export async function cleanUpBrokerData(): Promise<{
  migrated: number;
  errors: string[];
}> {
  const dataService = DataService.getInstance();
  const errors: string[] = [];
  let migratedCount = 0;

  try {
    // 1. Get all data
    const customers = await dataService.getAll('customers') as Customer[];
    const brokers = await dataService.getAll('brokers') as any[];
    const projects = await dataService.getAll('projects') as Project[];
    const interactions = await dataService.getAll('interactions') as Interaction[];

    console.log('Starting broker data cleanup...');
    console.log(`Found: ${customers.length} customers, ${brokers.length} brokers`);

    // 2. Identify customers that should be brokers but aren't migrated
    const brokerCustomers = customers.filter(c => 
      c.type === 'broker' && !brokers.some(b => b.phone === c.phone)
    );

    // 3. Migrate any remaining broker customers
    for (const customer of brokerCustomers) {
      try {
        // Create broker from customer
        const brokerData = {
          id: `broker_${customer.id.replace('cust_', '')}`,
          name: customer.name,
          phone: customer.phone,
          cnic: customer.cnic || '',
          email: customer.email || '',
          address: customer.address || '',
          company: customer.company || '',
          commissionRate: 1, // Default
          status: customer.status || 'active',
          linkedCustomerId: customer.id,
          createdAt: customer.createdAt,
          updatedAt: new Date().toISOString()
        };

        await dataService.add('brokers', brokerData);
        migratedCount++;
        
        // Update customer type to 'both' since it's now linked
        await dataService.update('customers', {
          ...customer,
          type: 'both',
          linkedBrokerId: brokerData.id
        });

        console.log(`Migrated broker: ${customer.name}`);
      } catch (error) {
        errors.push(`Failed to migrate ${customer.name}: ${error}`);
      }
    }

    // 4. Update project broker references
    for (const project of projects) {
      if (project.brokerId && project.brokerId.startsWith('cust_')) {
        // This is an old customer ID reference, need to find new broker ID
        const customer = customers.find(c => c.id === project.brokerId);
        if (customer && customer.type === 'broker') {
          const broker = brokers.find(b => b.phone === customer.phone || b.linkedCustomerId === customer.id);
          if (broker) {
            await dataService.update('projects', {
              ...project,
              brokerId: broker.id
            });
            console.log(`Updated project ${project.name} broker reference`);
          }
        }
      }
    }

    // 5. Update interaction broker references
    for (const interaction of interactions) {
      if (interaction.brokerId && interaction.brokerId.startsWith('cust_')) {
        const customer = customers.find(c => c.id === interaction.brokerId);
        if (customer && customer.type === 'broker') {
          const broker = brokers.find(b => b.phone === customer.phone || b.linkedCustomerId === customer.id);
          if (broker) {
            await dataService.update('interactions', {
              ...interaction,
              brokerId: broker.id
            });
          }
        }
      }
    }

    console.log(`Cleanup complete: ${migratedCount} brokers migrated`);
    return { migrated: migratedCount, errors };

  } catch (error) {
    errors.push(`Migration failed: ${error}`);
    return { migrated: migratedCount, errors };
  }
}

/**
 * Verification function to check data consistency
 */
export async function verifyBrokerData(): Promise<{
  consistent: boolean;
  issues: Array<{
    type: 'orphaned' | 'duplicate' | 'reference';
    message: string;
    data: any;
  }>;
}> {
  const dataService = DataService.getInstance();
  const issues = [];

  try {
    const customers = await dataService.getAll('customers') as Customer[];
    const brokers = await dataService.getAll('brokers') as any[];
    const projects = await dataService.getAll('projects') as Project[];

    // Check 1: Customers with type='broker' should have a linked broker
    const brokerCustomersWithoutLink = customers.filter(c => 
      c.type === 'broker' && !brokers.some(b => b.phone === c.phone)
    );
    brokerCustomersWithoutLink.forEach(c => {
      issues.push({
        type: 'orphaned',
        message: `Customer marked as broker but no broker record found`,
        data: { customer: c }
      });
    });

    // Check 2: Duplicate brokers (same phone)
    const phoneMap = new Map();
    brokers.forEach(broker => {
      if (phoneMap.has(broker.phone)) {
        issues.push({
          type: 'duplicate',
          message: `Multiple brokers with same phone number`,
          data: { phone: broker.phone, brokers: [phoneMap.get(broker.phone), broker] }
        });
      } else {
        phoneMap.set(broker.phone, broker);
      }
    });

    // Check 3: Projects with invalid broker references
    projects.forEach(project => {
      if (project.brokerId && !brokers.some(b => b.id === project.brokerId)) {
        issues.push({
          type: 'reference',
          message: `Project references non-existent broker`,
          data: { project: project, brokerId: project.brokerId }
        });
      }
    });

    return {
      consistent: issues.length === 0,
      issues
    };

  } catch (error) {
    issues.push({
      type: 'error',
      message: `Verification failed: ${error}`,
      data: null
    });
    return { consistent: false, issues };
  }
}