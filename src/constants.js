// Sitara Builders CRM - Constants and Initial Database

export const INITIAL_DB = {
  customers: [
    {
      id: 'cust_demo_001',
      name: 'Ahmed Khan',
      phone: '0321-1234567',
      email: 'ahmed.khan@email.com',
      cnic: '35201-1234567-1',
      address: 'DHA Phase 5, Lahore',
      createdAt: '2024-01-15T10:00:00Z'
    },
    {
      id: 'cust_demo_002',
      name: 'Fatima Ali',
      phone: '0300-9876543',
      email: 'fatima.ali@email.com',
      cnic: '35202-9876543-2',
      address: 'Gulberg III, Lahore',
      createdAt: '2024-02-20T14:30:00Z'
    },
    {
      id: 'cust_demo_003',
      name: 'Usman Malik',
      phone: '0333-5556667',
      email: 'usman.malik@email.com',
      cnic: '35203-5556667-3',
      address: 'Model Town, Lahore',
      createdAt: '2024-03-10T09:15:00Z'
    }
  ],
  
  brokers: [
    {
      id: 'broker_demo_001',
      name: 'Rashid Associates',
      phone: '0345-1112223',
      email: 'rashid@associates.com',
      commission: 2,
      createdAt: '2024-01-01T08:00:00Z'
    },
    {
      id: 'broker_demo_002',
      name: 'Prime Property Dealers',
      phone: '0312-4445556',
      email: 'info@primeproperty.pk',
      commission: 1.5,
      createdAt: '2024-01-05T11:00:00Z'
    }
  ],
  
  inventory: [
    {
      id: 'inv_demo_001',
      project: 'RUJ',
      plotNumber: 'A-101',
      size: '5 Marla',
      category: 'Residential',
      price: 5500000,
      status: 'available',
      createdAt: '2024-01-10T12:00:00Z'
    },
    {
      id: 'inv_demo_002',
      project: 'RUJ',
      plotNumber: 'A-102',
      size: '10 Marla',
      category: 'Residential',
      price: 9500000,
      status: 'available',
      createdAt: '2024-01-10T12:00:00Z'
    },
    {
      id: 'inv_demo_003',
      project: 'Sitara Heights',
      plotNumber: 'SH-201',
      size: '3 Marla',
      category: 'Commercial',
      price: 15000000,
      status: 'sold',
      customerId: 'cust_demo_001',
      createdAt: '2024-01-10T12:00:00Z'
    }
  ],
  
  projects: [
    {
      id: 'proj_ruj',
      name: 'RUJ',
      location: 'Main Boulevard, Lahore',
      description: 'Premium residential plots',
      transactions: [
        {
          id: 'txn_1704067200000_abc123',
          customerId: 'cust_demo_001',
          customerName: 'Ahmed Khan',
          brokerId: 'broker_demo_001',
          brokerName: 'Rashid Associates',
          plotNumber: 'A-105',
          size: '10 Marla',
          saleValue: 9500000,
          totalSale: 9500000,
          totalReceived: 3500000,
          totalReceivable: 6000000,
          installments: 12,
          paymentCycle: 'monthly',
          firstDueDate: '2024-02-01',
          nextDueDate: '2024-12-01',
          saleDate: '2024-01-01',
          createdAt: '2024-01-01T10:00:00Z'
        },
        {
          id: 'txn_1704153600000_def456',
          customerId: 'cust_demo_002',
          customerName: 'Fatima Ali',
          brokerId: null,
          brokerName: null,
          plotNumber: 'B-201',
          size: '5 Marla',
          saleValue: 5500000,
          totalSale: 5500000,
          totalReceived: 2000000,
          totalReceivable: 3500000,
          installments: 24,
          paymentCycle: 'monthly',
          firstDueDate: '2024-03-01',
          nextDueDate: '2025-02-01',
          saleDate: '2024-02-15',
          createdAt: '2024-02-15T14:00:00Z'
        }
      ],
      createdAt: '2024-01-01T08:00:00Z'
    },
    {
      id: 'proj_sitara_heights',
      name: 'Sitara Heights',
      location: 'Johar Town, Lahore',
      description: 'Commercial complex',
      transactions: [
        {
          id: 'txn_1709251200000_ghi789',
          customerId: 'cust_demo_003',
          customerName: 'Usman Malik',
          brokerId: 'broker_demo_002',
          brokerName: 'Prime Property Dealers',
          plotNumber: 'SH-Floor1-Shop3',
          size: '400 sqft',
          saleValue: 12000000,
          totalSale: 12000000,
          totalReceived: 5000000,
          totalReceivable: 7000000,
          installments: 18,
          paymentCycle: 'monthly',
          firstDueDate: '2024-04-01',
          nextDueDate: '2025-09-01',
          saleDate: '2024-03-01',
          createdAt: '2024-03-01T11:00:00Z'
        }
      ],
      createdAt: '2024-01-01T08:00:00Z'
    }
  ],
  
  interactions: [
    {
      id: 'int_demo_001',
      type: 'call',
      date: '2024-12-15',
      time: '10:30',
      subject: 'Payment reminder call',
      notes: 'Called customer to remind about upcoming installment payment. Customer confirmed will pay by the 20th.',
      outcome: 'Customer confirmed payment date',
      priority: 'medium',
      status: 'completed',
      followUpDate: null,
      contacts: [
        { id: 'cust_demo_001', name: 'Ahmed Khan', type: 'customer' }
      ],
      attachments: [],
      createdAt: '2024-12-15T10:30:00Z'
    },
    {
      id: 'int_demo_002',
      type: 'site_visit',
      date: '2024-12-18',
      time: '14:00',
      subject: 'Site visit for plot inspection',
      notes: 'Accompanied customer and broker to visit plot A-105. Customer was satisfied with the development progress.',
      outcome: 'Positive feedback, may refer friends',
      priority: 'high',
      status: 'completed',
      followUpDate: null,
      contacts: [
        { id: 'cust_demo_001', name: 'Ahmed Khan', type: 'customer' },
        { id: 'broker_demo_001', name: 'Rashid Associates', type: 'broker' }
      ],
      attachments: [],
      createdAt: '2024-12-18T14:00:00Z'
    },
    {
      id: 'int_demo_003',
      type: 'whatsapp',
      date: '2024-12-20',
      time: '11:15',
      subject: 'Payment confirmation received',
      notes: 'Customer sent payment screenshot via WhatsApp. Amount: PKR 500,000',
      outcome: 'Payment verified and recorded',
      priority: 'low',
      status: 'completed',
      followUpDate: null,
      contacts: [
        { id: 'cust_demo_002', name: 'Fatima Ali', type: 'customer' }
      ],
      attachments: [],
      createdAt: '2024-12-20T11:15:00Z'
    },
    {
      id: 'int_demo_004',
      type: 'meeting',
      date: '2024-12-22',
      time: '15:00',
      subject: 'Payment restructuring discussion',
      notes: 'Customer requested meeting to discuss restructuring payment plan due to business difficulties. Agreed to review options.',
      outcome: 'Will prepare alternative payment plan options',
      priority: 'urgent',
      status: 'follow_up',
      followUpDate: '2024-12-28',
      contacts: [
        { id: 'cust_demo_003', name: 'Usman Malik', type: 'customer' }
      ],
      attachments: [],
      createdAt: '2024-12-22T15:00:00Z'
    },
    {
      id: 'int_demo_005',
      type: 'email',
      date: '2024-12-25',
      time: '09:00',
      subject: 'Document request for transfer',
      notes: 'Customer requested copies of sale agreement and payment receipts for tax filing purposes.',
      outcome: 'Documents to be prepared and sent',
      priority: 'medium',
      status: 'pending',
      followUpDate: null,
      contacts: [
        { id: 'cust_demo_001', name: 'Ahmed Khan', type: 'customer' }
      ],
      attachments: [],
      createdAt: '2024-12-25T09:00:00Z'
    }
  ],
  
  receipts: [
    {
      id: 'rcpt_demo_001',
      transactionId: 'txn_1704067200000_abc123',
      customerId: 'cust_demo_001',
      customerName: 'Ahmed Khan',
      amount: 1500000,
      paymentMethod: 'bank_transfer',
      bank: 'HBL',
      referenceNo: 'HBL-2024-001234',
      date: '2024-01-05',
      notes: 'Down payment',
      createdAt: '2024-01-05T12:00:00Z'
    },
    {
      id: 'rcpt_demo_002',
      transactionId: 'txn_1704067200000_abc123',
      customerId: 'cust_demo_001',
      customerName: 'Ahmed Khan',
      amount: 2000000,
      paymentMethod: 'cheque',
      bank: 'MCB',
      referenceNo: 'MCB-CHQ-567890',
      date: '2024-06-01',
      notes: 'Installment payment',
      createdAt: '2024-06-01T10:00:00Z'
    },
    {
      id: 'rcpt_demo_003',
      transactionId: 'txn_1704153600000_def456',
      customerId: 'cust_demo_002',
      customerName: 'Fatima Ali',
      amount: 2000000,
      paymentMethod: 'cash',
      bank: null,
      referenceNo: 'CASH-2024-0215',
      date: '2024-02-15',
      notes: 'Initial payment',
      createdAt: '2024-02-15T14:30:00Z'
    },
    {
      id: 'rcpt_demo_004',
      transactionId: 'txn_1709251200000_ghi789',
      customerId: 'cust_demo_003',
      customerName: 'Usman Malik',
      amount: 5000000,
      paymentMethod: 'bank_transfer',
      bank: 'UBL',
      referenceNo: 'UBL-2024-789012',
      date: '2024-03-01',
      notes: 'Booking amount',
      createdAt: '2024-03-01T11:30:00Z'
    }
  ]
};

// Payment methods configuration
export const PAYMENT_METHODS = [
  { value: 'cash', label: 'Cash' },
  { value: 'cheque', label: 'Cheque' },
  { value: 'bank_transfer', label: 'Bank Transfer' },
  { value: 'online', label: 'Online Payment' },
  { value: 'other', label: 'Other' }
];

// Banks in Pakistan
export const BANKS = [
  'HBL', 'MCB', 'UBL', 'Allied Bank', 'Bank Alfalah',
  'Meezan Bank', 'Faysal Bank', 'Standard Chartered',
  'Askari Bank', 'Bank Al Habib', 'JS Bank', 'Other'
];

// Plot sizes
export const PLOT_SIZES = [
  '3 Marla', '5 Marla', '7 Marla', '10 Marla', '1 Kanal', '2 Kanal'
];

// Plot categories
export const PLOT_CATEGORIES = [
  'Residential', 'Commercial', 'Industrial', 'Agricultural'
];

// Payment cycles
export const PAYMENT_CYCLES = [
  { value: 'monthly', label: 'Monthly' },
  { value: 'quarterly', label: 'Quarterly' },
  { value: 'half_yearly', label: 'Half Yearly' },
  { value: 'yearly', label: 'Yearly' }
];

// Format currency (PKR)
export const formatCurrency = (amount) => {
  const num = parseFloat(amount) || 0;
  return new Intl.NumberFormat('en-PK', {
    style: 'currency',
    currency: 'PKR',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0
  }).format(num);
};

// Format number with commas
export const formatNumber = (num) => {
  return new Intl.NumberFormat('en-PK').format(parseFloat(num) || 0);
};

// Format date
export const formatDate = (dateStr) => {
  if (!dateStr) return '';
  const date = new Date(dateStr);
  return date.toLocaleDateString('en-PK', {
    day: 'numeric',
    month: 'short',
    year: 'numeric'
  });
};