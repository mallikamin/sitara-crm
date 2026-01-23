import { useRef } from 'react';
import { Button } from '../ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '../ui/dialog';
import { Receipt, Customer, Project } from '../../types/crm';

interface PrintReceiptModalProps {
  open: boolean;
  onClose: () => void;
  receipt: Receipt | null;
  customer: Customer | null;
  project: Project | null;
  companyInfo?: {
    name: string;
    address?: string;
    phone?: string;
    email?: string;
    logo?: string;
  };
}

function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('en-PK', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
}

function formatDate(date: Date | string): string {
  return new Date(date).toLocaleDateString('en-PK', {
    day: '2-digit',
    month: 'long',
    year: 'numeric',
  });
}

function numberToWords(num: number): string {
  const ones = ['', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine', 'Ten',
    'Eleven', 'Twelve', 'Thirteen', 'Fourteen', 'Fifteen', 'Sixteen', 'Seventeen', 'Eighteen', 'Nineteen'];
  const tens = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety'];

  if (num === 0) return 'Zero';

  function convertHundreds(n: number): string {
    let str = '';
    if (n >= 100) {
      str += ones[Math.floor(n / 100)] + ' Hundred ';
      n %= 100;
    }
    if (n >= 20) {
      str += tens[Math.floor(n / 10)] + ' ';
      n %= 10;
    }
    if (n > 0) {
      str += ones[n] + ' ';
    }
    return str;
  }

  let result = '';
  
  if (num >= 10000000) {
    result += convertHundreds(Math.floor(num / 10000000)) + 'Crore ';
    num %= 10000000;
  }
  if (num >= 100000) {
    result += convertHundreds(Math.floor(num / 100000)) + 'Lakh ';
    num %= 100000;
  }
  if (num >= 1000) {
    result += convertHundreds(Math.floor(num / 1000)) + 'Thousand ';
    num %= 1000;
  }
  if (num > 0) {
    result += convertHundreds(num);
  }

  return result.trim() + ' Rupees Only';
}

const methodLabels: Record<string, string> = {
  cash: 'Cash',
  bank_transfer: 'Bank Transfer',
  cheque: 'Cheque',
  online: 'Online Payment',
};

export function PrintReceiptModal({ 
  open, 
  onClose, 
  receipt, 
  customer, 
  project,
  companyInfo = {
    name: 'Your Company Name',
    address: 'Company Address, City',
    phone: '+92 XXX XXXXXXX',
    email: 'info@company.com',
  }
}: PrintReceiptModalProps) {
  const printRef = useRef<HTMLDivElement>(null);

  const handlePrint = () => {
    if (!printRef.current) return;
    
    const printContent = printRef.current.innerHTML;
    const printWindow = window.open('', '_blank');
    
    if (printWindow) {
      printWindow.document.write(`
        <!DOCTYPE html>
        <html>
        <head>
          <title>Receipt - ${receipt?.receiptNumber}</title>
          <style>
            * {
              margin: 0;
              padding: 0;
              box-sizing: border-box;
            }
            body {
              font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
              line-height: 1.6;
              color: #1a1a1a;
              background: #fff;
              padding: 20px;
            }
            .receipt-container {
              max-width: 800px;
              margin: 0 auto;
              border: 2px solid #1a1a1a;
              padding: 30px;
            }
            .header {
              text-align: center;
              border-bottom: 2px solid #1a1a1a;
              padding-bottom: 20px;
              margin-bottom: 20px;
            }
            .company-name {
              font-size: 28px;
              font-weight: bold;
              color: #1a1a1a;
              margin-bottom: 5px;
            }
            .company-info {
              font-size: 12px;
              color: #666;
            }
            .receipt-title {
              text-align: center;
              margin: 20px 0;
            }
            .receipt-title h2 {
              font-size: 24px;
              text-transform: uppercase;
              letter-spacing: 3px;
              border: 2px solid #1a1a1a;
              display: inline-block;
              padding: 8px 30px;
            }
            .receipt-meta {
              display: flex;
              justify-content: space-between;
              margin-bottom: 25px;
              padding: 15px;
              background: #f8f9fa;
              border: 1px solid #e9ecef;
            }
            .meta-item {
              text-align: center;
            }
            .meta-label {
              font-size: 11px;
              color: #666;
              text-transform: uppercase;
              letter-spacing: 1px;
            }
            .meta-value {
              font-size: 16px;
              font-weight: bold;
              margin-top: 3px;
            }
            .details-section {
              margin-bottom: 25px;
            }
            .section-title {
              font-size: 12px;
              text-transform: uppercase;
              letter-spacing: 1px;
              color: #666;
              border-bottom: 1px solid #e9ecef;
              padding-bottom: 5px;
              margin-bottom: 10px;
            }
            .details-grid {
              display: grid;
              grid-template-columns: 1fr 1fr;
              gap: 15px;
            }
            .detail-item {
              padding: 10px;
              background: #f8f9fa;
              border-left: 3px solid #1a1a1a;
            }
            .detail-label {
              font-size: 11px;
              color: #666;
              text-transform: uppercase;
            }
            .detail-value {
              font-size: 15px;
              font-weight: 600;
              margin-top: 3px;
            }
            .amount-section {
              text-align: center;
              padding: 25px;
              background: linear-gradient(135deg, #1a1a1a 0%, #333 100%);
              color: white;
              margin: 25px 0;
            }
            .amount-label {
              font-size: 12px;
              text-transform: uppercase;
              letter-spacing: 2px;
              opacity: 0.8;
            }
            .amount-value {
              font-size: 42px;
              font-weight: bold;
              margin: 10px 0;
            }
            .amount-words {
              font-size: 13px;
              font-style: italic;
              opacity: 0.9;
            }
            .signature-section {
              display: flex;
              justify-content: space-between;
              margin-top: 50px;
              padding-top: 30px;
            }
            .signature-box {
              text-align: center;
              width: 200px;
            }
            .signature-line {
              border-top: 1px solid #1a1a1a;
              margin-top: 50px;
              padding-top: 8px;
              font-size: 12px;
              color: #666;
            }
            .footer {
              text-align: center;
              margin-top: 30px;
              padding-top: 20px;
              border-top: 1px dashed #ccc;
              font-size: 11px;
              color: #999;
            }
            .watermark {
              position: absolute;
              top: 50%;
              left: 50%;
              transform: translate(-50%, -50%) rotate(-45deg);
              font-size: 100px;
              color: rgba(0,0,0,0.03);
              pointer-events: none;
              text-transform: uppercase;
              font-weight: bold;
              letter-spacing: 20px;
            }
            @media print {
              body { padding: 0; }
              .receipt-container { border: 1px solid #000; }
            }
          </style>
        </head>
        <body>
          ${printContent}
        </body>
        </html>
      `);
      printWindow.document.close();
      printWindow.focus();
      setTimeout(() => {
        printWindow.print();
        printWindow.close();
      }, 250);
    }
  };

  if (!receipt) return null;

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[850px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-xl font-bold flex items-center gap-2">
            <span className="text-2xl">🖨️</span>
            Print Receipt Preview
          </DialogTitle>
        </DialogHeader>

        <div className="border rounded-lg overflow-hidden bg-white">
          <div ref={printRef}>
            <div className="receipt-container" style={{ 
              maxWidth: '800px', 
              margin: '0 auto', 
              border: '2px solid #1a1a1a',
              padding: '30px',
              position: 'relative',
              fontFamily: "'Segoe UI', Tahoma, Geneva, Verdana, sans-serif"
            }}>
              {/* Watermark */}
              <div style={{
                position: 'absolute',
                top: '50%',
                left: '50%',
                transform: 'translate(-50%, -50%) rotate(-45deg)',
                fontSize: '80px',
                color: 'rgba(0,0,0,0.03)',
                pointerEvents: 'none',
                textTransform: 'uppercase',
                fontWeight: 'bold',
                letterSpacing: '15px'
              }}>
                PAID
              </div>

              {/* Header */}
              <div style={{ 
                textAlign: 'center', 
                borderBottom: '2px solid #1a1a1a',
                paddingBottom: '20px',
                marginBottom: '20px'
              }}>
                <div style={{ fontSize: '28px', fontWeight: 'bold', color: '#1a1a1a', marginBottom: '5px' }}>
                  {companyInfo.name}
                </div>
                <div style={{ fontSize: '12px', color: '#666' }}>
                  {companyInfo.address && <div>{companyInfo.address}</div>}
                  {companyInfo.phone && <span>📞 {companyInfo.phone}</span>}
                  {companyInfo.email && <span style={{ marginLeft: '15px' }}>✉️ {companyInfo.email}</span>}
                </div>
              </div>

              {/* Receipt Title */}
              <div style={{ textAlign: 'center', margin: '20px 0' }}>
                <h2 style={{ 
                  fontSize: '24px', 
                  textTransform: 'uppercase', 
                  letterSpacing: '3px',
                  border: '2px solid #1a1a1a',
                  display: 'inline-block',
                  padding: '8px 30px'
                }}>
                  Payment Receipt
                </h2>
              </div>

              {/* Receipt Meta */}
              <div style={{ 
                display: 'flex', 
                justifyContent: 'space-between',
                marginBottom: '25px',
                padding: '15px',
                background: '#f8f9fa',
                border: '1px solid #e9ecef'
              }}>
                <div style={{ textAlign: 'center' }}>
                  <div style={{ fontSize: '11px', color: '#666', textTransform: 'uppercase', letterSpacing: '1px' }}>
                    Receipt No.
                  </div>
                  <div style={{ fontSize: '16px', fontWeight: 'bold', marginTop: '3px' }}>
                    {receipt.receiptNumber}
                  </div>
                </div>
                <div style={{ textAlign: 'center' }}>
                  <div style={{ fontSize: '11px', color: '#666', textTransform: 'uppercase', letterSpacing: '1px' }}>
                    Date
                  </div>
                  <div style={{ fontSize: '16px', fontWeight: 'bold', marginTop: '3px' }}>
                    {formatDate(receipt.date)}
                  </div>
                </div>
                <div style={{ textAlign: 'center' }}>
                  <div style={{ fontSize: '11px', color: '#666', textTransform: 'uppercase', letterSpacing: '1px' }}>
                    Payment Method
                  </div>
                  <div style={{ fontSize: '16px', fontWeight: 'bold', marginTop: '3px' }}>
                    {methodLabels[receipt.method]}
                  </div>
                </div>
              </div>

              {/* Customer & Project Details */}
              <div style={{ marginBottom: '25px' }}>
                <div style={{ 
                  fontSize: '12px', 
                  textTransform: 'uppercase', 
                  letterSpacing: '1px', 
                  color: '#666',
                  borderBottom: '1px solid #e9ecef',
                  paddingBottom: '5px',
                  marginBottom: '10px'
                }}>
                  Payment Details
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px' }}>
                  <div style={{ padding: '10px', background: '#f8f9fa', borderLeft: '3px solid #1a1a1a' }}>
                    <div style={{ fontSize: '11px', color: '#666', textTransform: 'uppercase' }}>Received From</div>
                    <div style={{ fontSize: '15px', fontWeight: '600', marginTop: '3px' }}>
                      {receipt.customerName || customer?.name || 'N/A'}
                    </div>
                  </div>
                  <div style={{ padding: '10px', background: '#f8f9fa', borderLeft: '3px solid #1a1a1a' }}>
                    <div style={{ fontSize: '11px', color: '#666', textTransform: 'uppercase' }}>Project</div>
                    <div style={{ fontSize: '15px', fontWeight: '600', marginTop: '3px' }}>
                      {receipt.projectName || (project ? `${project.name} - ${project.unit}` : 'N/A')}
                    </div>
                  </div>
                  {receipt.reference && (
                    <div style={{ padding: '10px', background: '#f8f9fa', borderLeft: '3px solid #1a1a1a' }}>
                      <div style={{ fontSize: '11px', color: '#666', textTransform: 'uppercase' }}>Reference No.</div>
                      <div style={{ fontSize: '15px', fontWeight: '600', marginTop: '3px', fontFamily: 'monospace' }}>
                        {receipt.reference}
                      </div>
                    </div>
                  )}
                  {customer?.phone && (
                    <div style={{ padding: '10px', background: '#f8f9fa', borderLeft: '3px solid #1a1a1a' }}>
                      <div style={{ fontSize: '11px', color: '#666', textTransform: 'uppercase' }}>Contact</div>
                      <div style={{ fontSize: '15px', fontWeight: '600', marginTop: '3px' }}>
                        {customer.phone}
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Amount Section */}
              <div style={{ 
                textAlign: 'center', 
                padding: '25px',
                background: 'linear-gradient(135deg, #1a1a1a 0%, #333 100%)',
                color: 'white',
                margin: '25px 0'
              }}>
                <div style={{ fontSize: '12px', textTransform: 'uppercase', letterSpacing: '2px', opacity: '0.8' }}>
                  Amount Received
                </div>
                <div style={{ fontSize: '42px', fontWeight: 'bold', margin: '10px 0' }}>
                  ₨ {formatCurrency(receipt.amount)}
                </div>
                <div style={{ fontSize: '13px', fontStyle: 'italic', opacity: '0.9' }}>
                  {numberToWords(receipt.amount)}
                </div>
              </div>

              {/* Signatures */}
              <div style={{ 
                display: 'flex', 
                justifyContent: 'space-between',
                marginTop: '50px',
                paddingTop: '30px'
              }}>
                <div style={{ textAlign: 'center', width: '200px' }}>
                  <div style={{ 
                    borderTop: '1px solid #1a1a1a',
                    marginTop: '50px',
                    paddingTop: '8px',
                    fontSize: '12px',
                    color: '#666'
                  }}>
                    Customer Signature
                  </div>
                </div>
                <div style={{ textAlign: 'center', width: '200px' }}>
                  <div style={{ 
                    borderTop: '1px solid #1a1a1a',
                    marginTop: '50px',
                    paddingTop: '8px',
                    fontSize: '12px',
                    color: '#666'
                  }}>
                    Authorized Signature
                  </div>
                </div>
              </div>

              {/* Footer */}
              <div style={{ 
                textAlign: 'center',
                marginTop: '30px',
                paddingTop: '20px',
                borderTop: '1px dashed #ccc',
                fontSize: '11px',
                color: '#999'
              }}>
                This is a computer-generated receipt. Thank you for your payment.
              </div>
            </div>
          </div>
        </div>

        <DialogFooter className="gap-2 pt-4">
          <Button variant="outline" onClick={onClose}>
            Close
          </Button>
          <Button 
            onClick={handlePrint}
            className="bg-gradient-to-r from-slate-700 to-slate-800 hover:from-slate-800 hover:to-slate-900 text-white"
          >
            <span className="mr-2">🖨️</span>
            Print Receipt
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export default PrintReceiptModal;