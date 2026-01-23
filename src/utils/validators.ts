import { ExcelInventoryRow, InventoryItem } from '@/types/crm';


export const validateEmail = (email: string): boolean => {
  if (!email) return true // Email is optional
  const regex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
  return regex.test(email)
}


export const validateRequired = (value: string): boolean => {
  return !!value && value.trim().length > 0
}

export const validateNumber = (value: string | number, min?: number, max?: number): boolean => {
  const num = Number(value)
  if (isNaN(num)) return false
  if (min !== undefined && num < min) return false
  if (max !== undefined && num > max) return false
  return true
}

export const validateProjectData = (data: any): { isValid: boolean; errors: string[] } => {
  const errors: string[] = []

  if (!validateRequired(data.name)) {
    errors.push('Project name is required')
  }

  if (!validateRequired(data.unit)) {
    errors.push('Unit number is required')
  }

  if (!validateNumber(data.marlas, 0)) {
    errors.push('Valid marlas amount is required')
  }

  
  if (!validateNumber(data.installments, 1, 36)) {
    errors.push('Installments must be between 1 and 36')
  }

  return {
    isValid: errors.length === 0,
    errors,
  }
}

export const validateCustomerData = (data: any): { isValid: boolean; errors: string[] } => {
  const errors: string[] = []

  if (!validateRequired(data.name)) {
    errors.push('Customer name is required')
  }

  
  if (data.email && !validateEmail(data.email)) {
    errors.push('Invalid email format')
  }

  
  return {
    isValid: errors.length === 0,
    errors,
  }
}



export const validateExcelInventoryRow = (row: ExcelInventoryRow): {
  isValid: boolean;
  errors: string[];
  validatedData: Partial<InventoryItem>;
} => {
  const errors: string[] = [];
  const validatedData: Partial<InventoryItem> = {};

  // Required fields
  if (!row['Project Name']?.trim()) {
    errors.push('Project Name is required');
  } else {
    validatedData.projectName = row['Project Name'].trim();
  }

  if (!row['Block']?.trim()) {
    errors.push('Block is required');
  } else {
    validatedData.block = row['Block'].trim();
  }

  if (!row['Unit/Shop#']?.trim()) {
    errors.push('Unit/Shop# is required');
  } else {
    validatedData.unitShopNumber = row['Unit/Shop#'].trim();
  }

  // Unit Type validation
  const validUnitTypes = ['Residential', 'Commercial', 'Apartment', 'Other'];
  const unitType = row['Unit Type']?.trim();
  if (unitType && !validUnitTypes.includes(unitType)) {
    errors.push(`Unit Type must be one of: ${validUnitTypes.join(', ')}`);
  } else if (unitType) {
    validatedData.unitType = unitType as InventoryItem['unitType'];
  }

  // Numeric validations
  if (row['Marlas']) {
    const marlas = parseFloat(row['Marlas']);
    if (isNaN(marlas) || marlas <= 0) {
      errors.push('Marlas must be a positive number');
    } else {
      validatedData.marlas = marlas;
    }
  }

  if (row['Rate per Marla']) {
    const rate = parseFloat(row['Rate per Marla']);
    if (isNaN(rate) || rate <= 0) {
      errors.push('Rate per Marla must be a positive number');
    } else {
      validatedData.ratePerMarla = rate;
    }
  }

  // Total Value validation
  const totalValue = parseFloat(row['Total Value'] || '');
  if (isNaN(totalValue) || totalValue <= 0) {
    errors.push('Total Value must be a positive number');
  } else {
    validatedData.totalValue = totalValue;
  }

  // Plot Features parsing (comma-separated or single)
  if (row['Plot Features']?.trim()) {
    const features = row['Plot Features']
      .split(/[,;]/)
      .map(f => f.trim())
      .filter(f => f.length > 0);
    validatedData.plotFeatures = features;
  } else {
    validatedData.plotFeatures = [];
  }

  return {
    isValid: errors.length === 0,
    errors,
    validatedData
  };
};