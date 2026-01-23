import express from 'express';
import { pool } from '../config/database.js';

const router = express.Router();

// Export all data as backup
router.get('/export', async (req, res) => {
  try {
    const [customers, brokers, projects, receipts, interactions, inventory, masterProjects, commissionPayments, settings] = await Promise.all([
      pool.query('SELECT * FROM customers'),
      pool.query('SELECT * FROM brokers'),
      pool.query('SELECT * FROM projects'),
      pool.query('SELECT * FROM receipts'),
      pool.query('SELECT * FROM interactions'),
      pool.query('SELECT * FROM inventory'),
      pool.query('SELECT * FROM master_projects'),
      pool.query('SELECT * FROM commission_payments'),
      pool.query('SELECT key, value FROM settings')
    ]);

    const settingsObj = {};
    settings.rows.forEach(row => {
      settingsObj[row.key] = row.value;
    });

    const backup = {
      version: '4.0',
      exportDate: new Date().toISOString(),
      customers: customers.rows,
      brokers: brokers.rows,
      projects: projects.rows.map(p => ({
        ...p,
        installments: typeof p.installments === 'string' ? JSON.parse(p.installments) : p.installments
      })),
      receipts: receipts.rows,
      interactions: interactions.rows.map(i => ({
        ...i,
        contacts: typeof i.contacts === 'string' ? JSON.parse(i.contacts) : i.contacts
      })),
      inventory: inventory.rows.map(inv => ({
        ...inv,
        plotFeatures: typeof inv.plot_features === 'string' ? JSON.parse(inv.plot_features) : inv.plot_features
      })),
      masterProjects: masterProjects.rows,
      commissionPayments: commissionPayments.rows,
      settings: settingsObj
    };

    res.json({ success: true, data: backup });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Helper: Safe insert with SAVEPOINT (prevents one failure from aborting entire transaction)
async function safeInsert(client, savepointName, queryFn) {
  try {
    await client.query(`SAVEPOINT ${savepointName}`);
    await queryFn();
    await client.query(`RELEASE SAVEPOINT ${savepointName}`);
    return { success: true };
  } catch (err) {
    await client.query(`ROLLBACK TO SAVEPOINT ${savepointName}`);
    return { success: false, error: err.message };
  }
}

// Import backup data
router.post('/import', async (req, res) => {
  try {
    const backup = req.body;
    
    if (!backup) {
      return res.status(400).json({ success: false, error: 'No backup data provided' });
    }
    
    console.log('📥 Importing backup:', {
      hasCustomers: !!backup.customers,
      customersCount: backup.customers?.length || 0,
      hasBrokers: !!backup.brokers,
      brokersCount: backup.brokers?.length || 0,
      hasProjects: !!backup.projects,
      projectsCount: backup.projects?.length || 0,
      hasReceipts: !!backup.receipts,
      receiptsCount: backup.receipts?.length || 0,
      hasInteractions: !!backup.interactions,
      interactionsCount: backup.interactions?.length || 0,
      hasInventory: !!backup.inventory,
      inventoryCount: backup.inventory?.length || 0,
    });
    
    // Start transaction
    const client = await pool.connect();
    const stats = {
      customers: { imported: 0, skipped: 0, errors: 0 },
      brokers: { imported: 0, skipped: 0, errors: 0 },
      projects: { imported: 0, skipped: 0, errors: 0 },
      receipts: { imported: 0, skipped: 0, errors: 0 },
      interactions: { imported: 0, skipped: 0, errors: 0 },
      inventory: { imported: 0, skipped: 0, errors: 0 },
      masterProjects: { imported: 0, skipped: 0, errors: 0 },
      commissionPayments: { imported: 0, skipped: 0, errors: 0 },
    };

    try {
      await client.query('BEGIN');

      // ==================== IMPORT CUSTOMERS ====================
      if (backup.customers && Array.isArray(backup.customers)) {
        console.log(`📦 Importing ${backup.customers.length} customers...`);
        
        for (let i = 0; i < backup.customers.length; i++) {
          const customer = backup.customers[i];
          const customerId = String(customer.id || '').trim();
          
          if (!customerId) {
            console.warn('⚠️ Customer missing ID, skipping...');
            stats.customers.skipped++;
            continue;
          }
          
          const result = await safeInsert(client, `sp_cust_${i}`, async () => {
            await client.query(
              `INSERT INTO customers (id, name, cnic, phone, email, company, address, type, status, linked_broker_id, created_at, updated_at)
               VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
               ON CONFLICT (id) DO UPDATE SET
               name = EXCLUDED.name, cnic = EXCLUDED.cnic, phone = EXCLUDED.phone,
               email = EXCLUDED.email, company = EXCLUDED.company, address = EXCLUDED.address,
               type = EXCLUDED.type, status = EXCLUDED.status, linked_broker_id = EXCLUDED.linked_broker_id,
               updated_at = EXCLUDED.updated_at`,
              [
                customerId, 
                customer.name || '', 
                customer.cnic || null, 
                customer.phone || null, 
                customer.email || null,
                customer.company || null, 
                customer.address || null, 
                customer.type || 'customer', 
                customer.status || 'active',
                customer.linkedBrokerId || customer.linked_broker_id || null, 
                customer.createdAt || customer.created_at || new Date().toISOString(), 
                customer.updatedAt || customer.updated_at || new Date().toISOString()
              ]
            );
          });
          
          if (result.success) {
            stats.customers.imported++;
          } else {
            console.error(`Error importing customer ${customerId}:`, result.error);
            stats.customers.errors++;
          }
        }
        console.log(`✅ Imported ${stats.customers.imported} customers (${stats.customers.errors} errors, ${stats.customers.skipped} skipped)`);
      }

      // ==================== IMPORT BROKERS ====================
      if (backup.brokers && Array.isArray(backup.brokers)) {
        console.log(`📦 Importing ${backup.brokers.length} brokers...`);
        
        for (let i = 0; i < backup.brokers.length; i++) {
          const broker = backup.brokers[i];
          const brokerId = broker.id;
          
          if (!brokerId) {
            console.warn('⚠️ Broker missing ID, skipping...');
            stats.brokers.skipped++;
            continue;
          }
          
          const result = await safeInsert(client, `sp_broker_${i}`, async () => {
            await client.query(
              `INSERT INTO brokers (id, name, phone, cnic, email, address, company, commission_rate, bank_details, notes, status, linked_customer_id, created_at, updated_at)
               VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)
               ON CONFLICT (id) DO UPDATE SET
               name = EXCLUDED.name, phone = EXCLUDED.phone, cnic = EXCLUDED.cnic,
               email = EXCLUDED.email, address = EXCLUDED.address, company = EXCLUDED.company,
               commission_rate = EXCLUDED.commission_rate, bank_details = EXCLUDED.bank_details,
               notes = EXCLUDED.notes, status = EXCLUDED.status, linked_customer_id = EXCLUDED.linked_customer_id,
               updated_at = EXCLUDED.updated_at`,
              [
                brokerId, 
                broker.name || '', 
                broker.phone || null, 
                broker.cnic || null, 
                broker.email || null,
                broker.address || null, 
                broker.company || null, 
                broker.commissionRate || broker.commission_rate || 1, 
                broker.bankDetails || broker.bank_details || null,
                broker.notes || null, 
                broker.status || 'active', 
                broker.linkedCustomerId || broker.linked_customer_id || null, 
                broker.createdAt || broker.created_at || new Date().toISOString(), 
                broker.updatedAt || broker.updated_at || new Date().toISOString()
              ]
            );
          });
          
          if (result.success) {
            stats.brokers.imported++;
          } else {
            console.error(`Error importing broker ${brokerId}:`, result.error);
            stats.brokers.errors++;
          }
        }
        console.log(`✅ Imported ${stats.brokers.imported} brokers (${stats.brokers.errors} errors, ${stats.brokers.skipped} skipped)`);
      }

      // ==================== IMPORT PROJECTS ====================
      if (backup.projects && Array.isArray(backup.projects)) {
        console.log(`📦 Importing ${backup.projects.length} projects...`);
        
        // Get existing customer and broker IDs for validation
        const customerResult = await client.query('SELECT id FROM customers');
        const existingCustomerIds = new Set(customerResult.rows.map(r => String(r.id).trim()));
        
        const brokerResult = await client.query('SELECT id FROM brokers');
        const existingBrokerIds = new Set(brokerResult.rows.map(r => String(r.id).trim()));
        
        console.log(`Found ${existingCustomerIds.size} customers and ${existingBrokerIds.size} brokers in database`);
        
        for (let i = 0; i < backup.projects.length; i++) {
          const project = backup.projects[i];
          const customerIdRaw = project.customerId || project.customer_id;
          const brokerIdRaw = project.brokerId || project.broker_id;
          const customerId = customerIdRaw ? String(customerIdRaw).trim() : null;
          const brokerId = brokerIdRaw ? String(brokerIdRaw).trim() : null;
          
          // Skip projects with no customer ID
          if (!customerId || customerId === '' || customerId === 'null' || customerId === 'undefined') {
            console.warn(`⚠️ Project ${project.id} has no customer_id, skipping...`);
            stats.projects.skipped++;
            continue;
          }
          
          // Skip projects with non-existent customer
          if (!existingCustomerIds.has(customerId)) {
            console.warn(`⚠️ Project ${project.id} references non-existent customer "${customerId}", skipping...`);
            stats.projects.skipped++;
            continue;
          }
          
          // Set broker to null if it doesn't exist
          const finalBrokerId = (brokerId && existingBrokerIds.has(brokerId)) ? brokerId : null;
          
          const result = await safeInsert(client, `sp_proj_${i}`, async () => {
            await client.query(
              `INSERT INTO projects (id, customer_id, broker_id, broker_commission_rate, company_rep_id, company_rep_commission_rate,
                                     name, unit, marlas, rate, sale, received, status, cycle, notes, installments, created_at, updated_at)
               VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18)
               ON CONFLICT (id) DO UPDATE SET
               customer_id = EXCLUDED.customer_id, broker_id = EXCLUDED.broker_id,
               broker_commission_rate = EXCLUDED.broker_commission_rate,
               company_rep_id = EXCLUDED.company_rep_id, company_rep_commission_rate = EXCLUDED.company_rep_commission_rate,
               name = EXCLUDED.name, unit = EXCLUDED.unit, marlas = EXCLUDED.marlas, rate = EXCLUDED.rate,
               sale = EXCLUDED.sale, received = EXCLUDED.received, status = EXCLUDED.status,
               cycle = EXCLUDED.cycle, notes = EXCLUDED.notes, installments = EXCLUDED.installments,
               updated_at = EXCLUDED.updated_at`,
              [
                project.id, 
                customerId, 
                finalBrokerId, 
                project.brokerCommissionRate || project.broker_commission_rate || 1,
                project.companyRepId || project.company_rep_id || null, 
                project.companyRepCommissionRate || project.company_rep_commission_rate || 1, 
                project.name || '', 
                project.unit || null,
                project.marlas || 0, 
                project.rate || 0, 
                project.sale || project.saleValue || 0, 
                project.received || 0, 
                project.status || 'active',
                project.cycle || project.paymentCycle || 'bi_annual', 
                project.notes || null, 
                JSON.stringify(project.installments || []),
                project.createdAt || project.created_at || new Date().toISOString(), 
                project.updatedAt || project.updated_at || new Date().toISOString()
              ]
            );
          });
          
          if (result.success) {
            stats.projects.imported++;
          } else {
            console.error(`Error importing project ${project.id}:`, result.error);
            stats.projects.errors++;
          }
        }
        console.log(`✅ Imported ${stats.projects.imported} projects (${stats.projects.errors} errors, ${stats.projects.skipped} skipped)`);
      }

      // ==================== IMPORT RECEIPTS ====================
      if (backup.receipts && Array.isArray(backup.receipts)) {
        console.log(`📦 Importing ${backup.receipts.length} receipts...`);
        
        // Get existing project IDs for validation
        const projectResult = await client.query('SELECT id FROM projects');
        const existingProjectIds = new Set(projectResult.rows.map(r => String(r.id).trim()));
        
        for (let i = 0; i < backup.receipts.length; i++) {
          const receipt = backup.receipts[i];
          const receiptId = receipt.id;
          
          if (!receiptId) {
            stats.receipts.skipped++;
            continue;
          }
          
          // Validate project reference
          const projectId = receipt.projectId || receipt.project_id;
          if (projectId && !existingProjectIds.has(String(projectId).trim())) {
            console.warn(`⚠️ Receipt ${receiptId} references non-existent project "${projectId}", skipping...`);
            stats.receipts.skipped++;
            continue;
          }
          
          const result = await safeInsert(client, `sp_rcpt_${i}`, async () => {
            await client.query(
              `INSERT INTO receipts (id, customer_id, project_id, installment_id, amount, date, method, reference, notes, receipt_number, customer_name, project_name, created_at, updated_at)
               VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)
               ON CONFLICT (id) DO UPDATE SET
               customer_id = EXCLUDED.customer_id, project_id = EXCLUDED.project_id,
               installment_id = EXCLUDED.installment_id, amount = EXCLUDED.amount,
               date = EXCLUDED.date, method = EXCLUDED.method, reference = EXCLUDED.reference,
               notes = EXCLUDED.notes, receipt_number = EXCLUDED.receipt_number,
               customer_name = EXCLUDED.customer_name, project_name = EXCLUDED.project_name,
               updated_at = EXCLUDED.updated_at`,
              [
                receiptId,
                receipt.customerId || receipt.customer_id || null,
                projectId || null,
                receipt.installmentId || receipt.installment_id || null,
                receipt.amount || 0,
                receipt.date || new Date().toISOString(),
                receipt.method || 'cash',
                receipt.reference || null,
                receipt.notes || null,
                receipt.receiptNumber || receipt.receipt_number || null,
                receipt.customerName || receipt.customer_name || null,
                receipt.projectName || receipt.project_name || null,
                receipt.createdAt || receipt.created_at || new Date().toISOString(),
                receipt.updatedAt || receipt.updated_at || new Date().toISOString()
              ]
            );
          });
          
          if (result.success) {
            stats.receipts.imported++;
          } else {
            console.error(`Error importing receipt ${receiptId}:`, result.error);
            stats.receipts.errors++;
          }
        }
        console.log(`✅ Imported ${stats.receipts.imported} receipts (${stats.receipts.errors} errors, ${stats.receipts.skipped} skipped)`);
      }

      // ==================== IMPORT INTERACTIONS ====================
      if (backup.interactions && Array.isArray(backup.interactions)) {
        console.log(`📦 Importing ${backup.interactions.length} interactions...`);
        
        for (let i = 0; i < backup.interactions.length; i++) {
          const interaction = backup.interactions[i];
          const interactionId = interaction.id;
          
          if (!interactionId) {
            stats.interactions.skipped++;
            continue;
          }
          
          let contacts = interaction.contacts || [];
          if (typeof contacts === 'string') {
            try { contacts = JSON.parse(contacts); } catch (e) { contacts = []; }
          }
          
          const result = await safeInsert(client, `sp_int_${i}`, async () => {
            await client.query(
              `INSERT INTO interactions (id, contact_type, customer_id, broker_id, type, status, priority, date, notes, next_follow_up, contacts, created_at, updated_at)
               VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
               ON CONFLICT (id) DO UPDATE SET
               contact_type = EXCLUDED.contact_type, customer_id = EXCLUDED.customer_id,
               broker_id = EXCLUDED.broker_id, type = EXCLUDED.type, status = EXCLUDED.status,
               priority = EXCLUDED.priority, date = EXCLUDED.date, notes = EXCLUDED.notes,
               next_follow_up = EXCLUDED.next_follow_up, contacts = EXCLUDED.contacts,
               updated_at = EXCLUDED.updated_at`,
              [
                interactionId,
                interaction.contactType || interaction.contact_type || 'customer',
                interaction.customerId || interaction.customer_id || null,
                interaction.brokerId || interaction.broker_id || null,
                interaction.type || 'call',
                interaction.status || 'follow_up',
                interaction.priority || 'medium',
                interaction.date || new Date().toISOString(),
                interaction.notes || null,
                interaction.nextFollowUp || interaction.next_follow_up || null,
                JSON.stringify(contacts),
                interaction.createdAt || interaction.created_at || new Date().toISOString(),
                interaction.updatedAt || interaction.updated_at || new Date().toISOString()
              ]
            );
          });
          
          if (result.success) {
            stats.interactions.imported++;
          } else {
            console.error(`Error importing interaction ${interactionId}:`, result.error);
            stats.interactions.errors++;
          }
        }
        console.log(`✅ Imported ${stats.interactions.imported} interactions (${stats.interactions.errors} errors, ${stats.interactions.skipped} skipped)`);
      }

      // ==================== IMPORT INVENTORY ====================
      if (backup.inventory && Array.isArray(backup.inventory)) {
        console.log(`📦 Importing ${backup.inventory.length} inventory items...`);
        
        for (let i = 0; i < backup.inventory.length; i++) {
          const item = backup.inventory[i];
          const itemId = item.id;
          
          if (!itemId) {
            stats.inventory.skipped++;
            continue;
          }
          
          let plotFeatures = item.plotFeatures || item.plot_features || [];
          if (typeof plotFeatures === 'string') {
            try { plotFeatures = JSON.parse(plotFeatures); } catch (e) { plotFeatures = []; }
          }
          
          const result = await safeInsert(client, `sp_inv_${i}`, async () => {
            await client.query(
              `INSERT INTO inventory (id, project_name, block, unit_shop_number, unit, unit_type, marlas, rate_per_marla,
                                      total_value, sale_value, plot_features, plot_feature, status, transaction_id, created_at, updated_at)
               VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16)
               ON CONFLICT (id) DO UPDATE SET
               project_name = EXCLUDED.project_name, block = EXCLUDED.block,
               unit_shop_number = EXCLUDED.unit_shop_number, unit = EXCLUDED.unit,
               unit_type = EXCLUDED.unit_type, marlas = EXCLUDED.marlas,
               rate_per_marla = EXCLUDED.rate_per_marla, total_value = EXCLUDED.total_value,
               sale_value = EXCLUDED.sale_value, plot_features = EXCLUDED.plot_features,
               plot_feature = EXCLUDED.plot_feature, status = EXCLUDED.status,
               transaction_id = EXCLUDED.transaction_id, updated_at = EXCLUDED.updated_at`,
              [
                itemId,
                item.projectName || item.project_name || null,
                item.block || null,
                item.unitShopNumber || item.unit_shop_number || null,
                item.unit || null,
                item.unitType || item.unit_type || null,
                item.marlas || 0,
                item.ratePerMarla || item.rate_per_marla || 0,
                item.totalValue || item.total_value || 0,
                item.saleValue || item.sale_value || 0,
                JSON.stringify(plotFeatures),
                item.plotFeature || item.plot_feature || null,
                item.status || 'available',
                item.transactionId || item.transaction_id || null,
                item.createdAt || item.created_at || new Date().toISOString(),
                item.updatedAt || item.updated_at || new Date().toISOString()
              ]
            );
          });
          
          if (result.success) {
            stats.inventory.imported++;
          } else {
            console.error(`Error importing inventory ${itemId}:`, result.error);
            stats.inventory.errors++;
          }
        }
        console.log(`✅ Imported ${stats.inventory.imported} inventory (${stats.inventory.errors} errors, ${stats.inventory.skipped} skipped)`);
      }

      // ==================== IMPORT MASTER PROJECTS ====================
      if (backup.masterProjects && Array.isArray(backup.masterProjects)) {
        console.log(`📦 Importing ${backup.masterProjects.length} master projects...`);
        
        for (let i = 0; i < backup.masterProjects.length; i++) {
          const mp = backup.masterProjects[i];
          const mpId = mp.id;
          
          if (!mpId) {
            stats.masterProjects.skipped++;
            continue;
          }
          
          const result = await safeInsert(client, `sp_mp_${i}`, async () => {
            await client.query(
              `INSERT INTO master_projects (id, name, description, location, total_units, available_units, sold_units,
                                           reserved_units, blocked_units, total_sale_value, total_received, total_receivable,
                                           total_overdue, total_broker_commission, total_broker_commission_paid,
                                           total_company_rep_commission, total_company_rep_commission_paid, created_at, updated_at)
               VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19)
               ON CONFLICT (id) DO UPDATE SET
               name = EXCLUDED.name, description = EXCLUDED.description, location = EXCLUDED.location,
               total_units = EXCLUDED.total_units, available_units = EXCLUDED.available_units,
               sold_units = EXCLUDED.sold_units, reserved_units = EXCLUDED.reserved_units,
               blocked_units = EXCLUDED.blocked_units, total_sale_value = EXCLUDED.total_sale_value,
               total_received = EXCLUDED.total_received, total_receivable = EXCLUDED.total_receivable,
               total_overdue = EXCLUDED.total_overdue, total_broker_commission = EXCLUDED.total_broker_commission,
               total_broker_commission_paid = EXCLUDED.total_broker_commission_paid,
               total_company_rep_commission = EXCLUDED.total_company_rep_commission,
               total_company_rep_commission_paid = EXCLUDED.total_company_rep_commission_paid,
               updated_at = EXCLUDED.updated_at`,
              [
                mpId,
                mp.name || '',
                mp.description || null,
                mp.location || null,
                mp.totalUnits || mp.total_units || 0,
                mp.availableUnits || mp.available_units || 0,
                mp.soldUnits || mp.sold_units || 0,
                mp.reservedUnits || mp.reserved_units || 0,
                mp.blockedUnits || mp.blocked_units || 0,
                mp.totalSaleValue || mp.total_sale_value || 0,
                mp.totalReceived || mp.total_received || 0,
                mp.totalReceivable || mp.total_receivable || 0,
                mp.totalOverdue || mp.total_overdue || 0,
                mp.totalBrokerCommission || mp.total_broker_commission || 0,
                mp.totalBrokerCommissionPaid || mp.total_broker_commission_paid || 0,
                mp.totalCompanyRepCommission || mp.total_company_rep_commission || 0,
                mp.totalCompanyRepCommissionPaid || mp.total_company_rep_commission_paid || 0,
                mp.createdAt || mp.created_at || new Date().toISOString(),
                mp.updatedAt || mp.updated_at || new Date().toISOString()
              ]
            );
          });
          
          if (result.success) {
            stats.masterProjects.imported++;
          } else {
            console.error(`Error importing master project ${mpId}:`, result.error);
            stats.masterProjects.errors++;
          }
        }
        console.log(`✅ Imported ${stats.masterProjects.imported} master projects (${stats.masterProjects.errors} errors, ${stats.masterProjects.skipped} skipped)`);
      }

      // ==================== IMPORT COMMISSION PAYMENTS ====================
      if (backup.commissionPayments && Array.isArray(backup.commissionPayments)) {
        console.log(`📦 Importing ${backup.commissionPayments.length} commission payments...`);
        
        for (let i = 0; i < backup.commissionPayments.length; i++) {
          const payment = backup.commissionPayments[i];
          const paymentId = payment.id;
          
          if (!paymentId) {
            stats.commissionPayments.skipped++;
            continue;
          }
          
          const result = await safeInsert(client, `sp_cp_${i}`, async () => {
            await client.query(
              `INSERT INTO commission_payments (id, project_id, recipient_id, recipient_type, recipient_name, amount,
                                                 paid_amount, remaining_amount, payment_date, payment_method,
                                                 payment_reference, notes, status, created_at, updated_at)
               VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15)
               ON CONFLICT (id) DO UPDATE SET
               project_id = EXCLUDED.project_id, recipient_id = EXCLUDED.recipient_id,
               recipient_type = EXCLUDED.recipient_type, recipient_name = EXCLUDED.recipient_name,
               amount = EXCLUDED.amount, paid_amount = EXCLUDED.paid_amount,
               remaining_amount = EXCLUDED.remaining_amount, payment_date = EXCLUDED.payment_date,
               payment_method = EXCLUDED.payment_method, payment_reference = EXCLUDED.payment_reference,
               notes = EXCLUDED.notes, status = EXCLUDED.status, updated_at = EXCLUDED.updated_at`,
              [
                paymentId,
                payment.projectId || payment.project_id || null,
                payment.recipientId || payment.recipient_id || null,
                payment.recipientType || payment.recipient_type || null,
                payment.recipientName || payment.recipient_name || null,
                payment.amount || 0,
                payment.paidAmount || payment.paid_amount || 0,
                payment.remainingAmount || payment.remaining_amount || 0,
                payment.paymentDate || payment.payment_date || null,
                payment.paymentMethod || payment.payment_method || null,
                payment.paymentReference || payment.payment_reference || null,
                payment.notes || null,
                payment.status || 'pending',
                payment.createdAt || payment.created_at || new Date().toISOString(),
                payment.updatedAt || payment.updated_at || new Date().toISOString()
              ]
            );
          });
          
          if (result.success) {
            stats.commissionPayments.imported++;
          } else {
            console.error(`Error importing commission payment ${paymentId}:`, result.error);
            stats.commissionPayments.errors++;
          }
        }
        console.log(`✅ Imported ${stats.commissionPayments.imported} commission payments (${stats.commissionPayments.errors} errors, ${stats.commissionPayments.skipped} skipped)`);
      }

      // ==================== IMPORT SETTINGS ====================
      if (backup.settings && typeof backup.settings === 'object') {
        console.log(`📦 Importing settings...`);
        let settingsImported = 0;
        
        for (const [key, value] of Object.entries(backup.settings)) {
          const result = await safeInsert(client, `sp_set_${settingsImported}`, async () => {
            await client.query(
              `INSERT INTO settings (key, value) VALUES ($1, $2)
               ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value, updated_at = CURRENT_TIMESTAMP`,
              [key, JSON.stringify(value)]
            );
          });
          
          if (result.success) {
            settingsImported++;
          } else {
            console.error(`Error importing setting ${key}:`, result.error);
          }
        }
        console.log(`✅ Imported ${settingsImported} settings`);
      }

      await client.query('COMMIT');
      
      console.log('✅ Backup import completed successfully');
      console.log('📊 Import stats:', JSON.stringify(stats, null, 2));
      
      res.json({ 
        success: true, 
        message: 'Backup imported successfully',
        stats 
      });
    } catch (error) {
      await client.query('ROLLBACK');
      console.error('❌ Import transaction error:', error);
      throw error;
    } finally {
      client.release();
    }
  } catch (error) {
    console.error('❌ Import error:', error.message, error.stack);
    res.status(500).json({ 
      success: false, 
      error: error.message,
      details: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
  }
});

// Clear all data (for fresh import)
router.delete('/clear', async (req, res) => {
  try {
    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      
      // Delete in order to respect foreign key constraints
      await client.query('DELETE FROM commission_payments');
      await client.query('DELETE FROM receipts');
      await client.query('DELETE FROM interactions');
      await client.query('DELETE FROM inventory');
      await client.query('DELETE FROM projects');
      await client.query('DELETE FROM brokers');
      await client.query('DELETE FROM customers');
      await client.query('DELETE FROM master_projects');
      await client.query('DELETE FROM settings');
      
      await client.query('COMMIT');
      console.log('✅ All data cleared');
      res.json({ success: true, message: 'All data cleared successfully' });
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  } catch (error) {
    console.error('❌ Clear error:', error.message);
    res.status(500).json({ success: false, error: error.message });
  }
});

export default router;