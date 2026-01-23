import React from 'react';
import { AlertCircle, Download } from 'lucide-react';
import { Card } from '@/components/ui/card';

export default function ImportTemplateGuide() {
  return (
    <Card className="p-4">
      <h4 className="font-medium mb-3 flex items-center gap-2">
        <AlertCircle className="h-4 w-4" />
        Excel File Format Requirements
      </h4>
      <ul className="space-y-2 text-sm text-gray-600">
        <li>• <strong>Required columns:</strong> Project Name, Block, Unit/Shop#, Total Value</li>
        <li>• <strong>Optional columns:</strong> Unit Type, Marlas, Rate per Marla, Plot Features</li>
        <li>• <strong>Unit Type values:</strong> Residential, Commercial, Apartment, Other</li>
        <li>• <strong>Plot Features:</strong> Comma-separated (e.g., "Boulevard, Mosque, Park, Corner")</li>
        <li>• <strong>Total Value:</strong> Calculated automatically if Marlas and Rate provided</li>
        <li>• First row must contain column headers exactly as shown above</li>
      </ul>
    </Card>
  );
}