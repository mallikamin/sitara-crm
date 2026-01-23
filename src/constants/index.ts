export const STORAGE_CONFIG = {
  MAIN_KEY: 'sitara_crm_main',
  BACKUP_KEY: 'sitara_crm_backups',
  SESSION_KEY: 'sitara_crm_session',
  INDEXED_DB_NAME: 'SitaraBuildersCRM',
  INDEXED_DB_VERSION: 2,  // Incremented for schema changes
  MAX_MAIN_STORAGE: 2 * 1024 * 1024,
  MAX_SESSION_STORAGE: 1 * 1024 * 1024,
  MAX_INDEXED_DB_SIZE: 50 * 1024 * 1024,
  COMPRESS_THRESHOLD: 50000,
  AUTO_CLEANUP_THRESHOLD: 0.8,
  MAX_BACKUPS: 5,
} as const

export const ITEMS_PER_PAGE = 15

export const PLOT_FEATURES = [
  'Corner',
  'Boulevard',
  'Park Facing',
  'Mosque Facing',
  'Main Road',
  'Commercial',
  'Residential',
  'Other',
] as const

// UPDATED: Changed commissionRate from 2.5 to 1
export const INITIAL_DB = {
  version: '4.0',  // Incremented for breaking changes
  customers: [],
  projects: [],
  brokers: [],
  interactions: [],
  receipts: [],
  inventory: [],
  masterProjects: [],
  commissionPayments: [],  // NEW: Track commission payments
  settings: {
    currency: 'PKR',
    defaultCycle: 'bi_annual',
    followUpDays: [1, 3, 7, 14, 30],
    commissionRate: 1,  // CHANGED: From 2.5% to 1%
    defaultBrokerCommission: 1,  // NEW: Default broker commission
    defaultCompanyRepCommission: 1,  // NEW: Default company rep commission
  },
  lastUpdated: null,
} as const

// NEW: Commission rate options for flexibility
export const COMMISSION_RATE_OPTIONS = [
  { value: 0, label: '0% (No Commission)' },
  { value: 0.5, label: '0.5%' },
  { value: 1, label: '1% (Default)' },
  { value: 1.5, label: '1.5%' },
  { value: 2, label: '2%' },
  { value: 2.5, label: '2.5%' },
  { value: 3, label: '3%' },
  { value: 'custom', label: 'Custom Rate' },
] as const