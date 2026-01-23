import * as XLSX from 'xlsx';
import { ExcelInventoryRow, InventoryItem } from '@/types/crm';
import { validateExcelInventoryRow } from './validators';

export const parseInventoryExcel = async (
  file: File
): Promise<{
  success: boolean;
  data: Partial<InventoryItem>[];
  errors: Array<{ row: number; errors: string[] }>;
}> => {
  try {
    const arrayBuffer = await file.arrayBuffer();
    const workbook = XLSX.read(arrayBuffer, { type: 'array' });
    const worksheet = workbook.Sheets[workbook.SheetNames[0]];
    const jsonData = XLSX.utils.sheet_to_json<ExcelInventoryRow>(worksheet);

    const results = {
      success: true,
      data: [] as Partial<InventoryItem>[],
      errors: [] as Array<{ row: number; errors: string[] }>
    };

    jsonData.forEach((row, index) => {
      const validation = validateExcelInventoryRow(row);
      
      if (validation.isValid) {
        results.data.push(validation.validatedData);
      } else {
        results.success = false;
        results.errors.push({
          row: index + 2, // +2 because Excel is 1-indexed and header row is 1
          errors: validation.errors
        });
      }
    });

    return results;
  } catch (error) {
    console.error('Error parsing Excel file:', error);
    return {
      success: false,
      data: [],
      errors: [{ row: 0, errors: ['Failed to parse Excel file'] }]
    };
  }
};

export const generateExcelTemplate = (): void => {
  const templateData = [
    {
      'Project Name': 'Example Project',
      'Block': 'A',
      'Unit/Shop#': '101',
      'Unit Type': 'Residential',
      'Marlas': '5',
      'Rate per Marla': '500000',
      'Total Value': '2500000',
      'Plot Features': 'Corner, Park View'
    }
  ];

  const worksheet = XLSX.utils.json_to_sheet(templateData);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, 'Inventory Template');
  
  // Auto-size columns
  const maxWidth = templateData.reduce((w, r) => Math.max(w, r['Project Name'].length), 10);
  worksheet['!cols'] = [{ wch: maxWidth }];

  XLSX.writeFile(workbook, 'inventory-template.xlsx');
};