export const validateEmail = (email: string): boolean => {
  if (!email) return true // Email is optional
  const regex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
  return regex.test(email)
}

export const validatePhone = (phone: string): boolean => {
  if (!phone) return false
  const regex = /^[\+]?[0-9\s\-\(\)]{10,15}$/
  return regex.test(phone)
}

export const validateCNIC = (cnic: string): boolean => {
  if (!cnic) return true // CNIC is optional
  const regex = /^[0-9]{5}-[0-9]{7}-[0-9]{1}$/
  return regex.test(cnic)
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

  if (!validateNumber(data.rate, 0)) {
    errors.push('Valid rate per marla is required')
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

  if (!validatePhone(data.phone)) {
    errors.push('Valid phone number is required')
  }

  if (data.email && !validateEmail(data.email)) {
    errors.push('Invalid email format')
  }

  if (data.cnic && !validateCNIC(data.cnic)) {
    errors.push('Invalid CNIC format (XXXXX-XXXXXXX-X)')
  }

  return {
    isValid: errors.length === 0,
    errors,
  }
}