import { Platform, Share } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

interface InvoiceData {
  // Company Information
  companyName: string;
  companyLogo?: string;
  companyAddress: string;
  companyPhone: string;
  companyEmail: string;
  companyWebsite?: string;
  gstNumber: string;
  businessNumber: string;
  
  // Invoice Details
  invoiceNumber: string;
  invoiceDate: string;
  dueDate: string;
  
  // Client Information
  clientName: string;
  clientAddress: string;
  clientPhone: string;
  clientEmail: string;
  
  // Service Details
  serviceTitle: string;
  serviceDescription: string;
  serviceDate: string;
  serviceDuration: string;
  servicePrice: number;
  
  // Additional Charges
  gstRate: number;
  discountAmount?: number;
  additionalFees?: Array<{
    id: string;
    name: string;
    amount: number;
  }>;
  
  // Terms and Conditions
  termsAndConditions: string;
  notes?: string;
  
  // Payment Information
  paymentMethod?: string;
  paymentTerms: string;
}

interface InvoiceTotals {
  subtotal: number;
  discount: number;
  subtotalAfterDiscount: number;
  gstAmount: number;
  total: number;
}

export class InvoiceGenerator {
  static formatCurrency(amount: number): string {
    return `$${amount.toFixed(2)}`;
  }

  static generateTextInvoice(invoiceData: InvoiceData, totals: InvoiceTotals): string {
    const separator = '═'.repeat(50);
    const thinSeparator = '─'.repeat(50);
    
    let invoice = `
${separator}
                    INVOICE
${separator}

${invoiceData.companyName.toUpperCase()}
${invoiceData.companyAddress}
Phone: ${invoiceData.companyPhone}
Email: ${invoiceData.companyEmail}
${invoiceData.companyWebsite ? `Web: ${invoiceData.companyWebsite}` : ''}

GST: ${invoiceData.gstNumber}
Business #: ${invoiceData.businessNumber}

${thinSeparator}

Invoice #: ${invoiceData.invoiceNumber}
Date: ${invoiceData.invoiceDate}
Due Date: ${invoiceData.dueDate}
Payment Terms: ${invoiceData.paymentTerms}

${separator}
BILL TO:
${separator}

${invoiceData.clientName}
${invoiceData.clientAddress}
Phone: ${invoiceData.clientPhone}
Email: ${invoiceData.clientEmail}

${separator}
SERVICE DETAILS:
${separator}

Service: ${invoiceData.serviceTitle}
Date: ${invoiceData.serviceDate}
Duration: ${invoiceData.serviceDuration}
${invoiceData.serviceDescription ? `\nDescription:\n${invoiceData.serviceDescription}` : ''}

${separator}
CHARGES:
${separator}

${invoiceData.serviceTitle.padEnd(35, ' ')} ${this.formatCurrency(invoiceData.servicePrice).padStart(15, ' ')}`;

    // Add additional fees
    if (invoiceData.additionalFees && invoiceData.additionalFees.length > 0) {
      invoiceData.additionalFees.forEach(fee => {
        invoice += `\n${fee.name.padEnd(35, ' ')} ${this.formatCurrency(fee.amount).padStart(15, ' ')}`;
      });
    }

    invoice += `\n${thinSeparator}`;
    invoice += `\nSubtotal:`.padEnd(35, ' ') + `${this.formatCurrency(totals.subtotal).padStart(15, ' ')}`;
    
    if (totals.discount > 0) {
      invoice += `\nDiscount:`.padEnd(35, ' ') + `-${this.formatCurrency(totals.discount).padStart(14, ' ')}`;
    }
    
    if (invoiceData.gstRate > 0) {
      invoice += `\nGST (${invoiceData.gstRate}%):`.padEnd(35, ' ') + `${this.formatCurrency(totals.gstAmount).padStart(15, ' ')}`;
    }
    
    invoice += `\n${separator}`;
    invoice += `\nTOTAL DUE:`.padEnd(35, ' ') + `${this.formatCurrency(totals.total).padStart(15, ' ')}`;
    invoice += `\n${separator}`;

    // Add notes if present
    if (invoiceData.notes) {
      invoice += `\n\nNOTES:\n${invoiceData.notes}`;
    }

    // Add terms
    invoice += `\n\n${thinSeparator}\nTERMS & CONDITIONS:\n${thinSeparator}\n${invoiceData.termsAndConditions}`;

    // Footer
    invoice += `\n\n${separator}
Thank you for your business!
Payment is due within ${invoiceData.paymentTerms}

${invoiceData.companyName}
${invoiceData.companyEmail}
${separator}

Generated with Qwiken • ${new Date().toISOString().split('T')[0]}`;

    return invoice;
  }

  static generateFormattedMessage(invoiceData: InvoiceData, totals: InvoiceTotals): string {
    return `📧 *INVOICE #${invoiceData.invoiceNumber}*

*From:* ${invoiceData.companyName}
*To:* ${invoiceData.clientName}

📅 *Date:* ${invoiceData.invoiceDate}
⏰ *Due:* ${invoiceData.dueDate}

*Service:* ${invoiceData.serviceTitle}
*Amount:* ${this.formatCurrency(totals.total)}

${invoiceData.notes ? `📝 *Notes:* ${invoiceData.notes}\n` : ''}
Payment Terms: ${invoiceData.paymentTerms}

Thank you for your business!

---
${invoiceData.companyName}
${invoiceData.companyPhone} | ${invoiceData.companyEmail}`;
  }

  static async shareInvoice(
    invoiceData: InvoiceData, 
    totals: InvoiceTotals,
    customerViewUrl?: string
  ): Promise<boolean> {
    try {
      const textInvoice = this.generateTextInvoice(invoiceData, totals);
      const formattedMessage = this.generateFormattedMessage(invoiceData, totals);
      
      let message = formattedMessage;
      
      if (customerViewUrl) {
        message += `\n\n🔗 View and pay online:\n${customerViewUrl}`;
      }
      
      message += `\n\n--- Full Invoice Details ---\n${textInvoice}`;

      const shareOptions = {
        title: `Invoice ${invoiceData.invoiceNumber}`,
        message: message,
        subject: `Invoice ${invoiceData.invoiceNumber} from ${invoiceData.companyName}`,
      };

      const result = await Share.share(shareOptions);
      
      return result.action === Share.sharedAction;
    } catch (error) {
      console.error('Error sharing invoice:', error);
      return false;
    }
  }

  static async saveInvoiceData(invoiceData: InvoiceData, totals: InvoiceTotals): Promise<void> {
    try {
      const invoiceRecord = {
        ...invoiceData,
        totals,
        generatedAt: new Date().toISOString(),
      };
      
      // Get existing invoices
      const existingInvoices = await AsyncStorage.getItem('savedInvoices');
      const invoices = existingInvoices ? JSON.parse(existingInvoices) : [];
      
      // Add new invoice
      invoices.unshift(invoiceRecord);
      
      // Keep only last 50 invoices
      if (invoices.length > 50) {
        invoices.pop();
      }
      
      await AsyncStorage.setItem('savedInvoices', JSON.stringify(invoices));
    } catch (error) {
      console.error('Error saving invoice:', error);
    }
  }
}