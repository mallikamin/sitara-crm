export const STORAGE_CONFIG = {
  MAIN_KEY: 'sitara_crm_main',
  BACKUP_KEY: 'sitara_crm_backups',
  SESSION_KEY: 'sitara_crm_session',
  INDEXED_DB_NAME: 'SitaraBuildersCRM',
  INDEXED_DB_VERSION: 1,
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

export const INITIAL_DB = {
  version: '3.1',
  customers: [],
  projects: [],
  interactions: [],
  receipts: [],
  inventory: [],
  masterProjects: [],
  settings: {
    currency: 'PKR',
    defaultCycle: 'bi_annual',
    followUpDays: [1, 3, 7, 14, 30],
    commissionRate: 2.5,
  },
  lastUpdated: null,
} as const