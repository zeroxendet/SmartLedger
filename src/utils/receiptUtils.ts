import { Sale, CurrencyCode } from '../types';
import { formatCurrency } from './calculations';

/**
 * Constructs clean, professional formatted plain-text receipt for WhatsApp and SMS
 */
export function generateWhatsAppReceiptText(
  sale: Sale,
  businessName: string,
  currency: CurrencyCode,
  businessPhone?: string
): string {
  const dateStr = new Date(sale.date).toLocaleDateString([], {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
  const timeStr = new Date(sale.date).toLocaleTimeString([], {
    hour: '2-digit',
    minute: '2-digit',
  });

  const divider = '--------------------------------';
  const lines: string[] = [];

  lines.push(`🧾 *${businessName.toUpperCase()}*`);
  lines.push(`*RECEIPT #${sale.invoiceNumber || sale.id.substring(0, 8)}*`);
  lines.push(`📅 ${dateStr} at ${timeStr}`);
  if (sale.customerName) {
    lines.push(`👤 Customer: *${sale.customerName}*`);
  }
  lines.push(divider);

  // Items
  sale.items.forEach((item) => {
    const itemTotal = item.total ?? ((item.sellingPrice || 0) * item.quantity);
    lines.push(`• ${item.productName}`);
    lines.push(`  ${item.quantity} x ${formatCurrency(item.sellingPrice || 0, currency)} = *${formatCurrency(itemTotal, currency)}*`);
  });

  lines.push(divider);
  if (sale.discount && sale.discount > 0) {
    if (sale.subtotal) {
      lines.push(`Subtotal: ${formatCurrency(sale.subtotal, currency)}`);
    }
    lines.push(`Discount: -${formatCurrency(sale.discount, currency)}`);
  }
  lines.push(`*TOTAL: ${formatCurrency(sale.totalAmount, currency)}*`);
  lines.push(`💳 Paid via: ${sale.paymentMethod} (${sale.paymentStatus || 'PAID'})`);
  
  if (businessPhone) {
    lines.push(`📞 Support: ${businessPhone}`);
  }
  lines.push('');
  lines.push('🙏 Thank you for your business!');

  return lines.join('\n');
}

/**
 * Download formatted invoice text receipt as a file
 */
export function downloadReceiptFile(sale: Sale, receiptText: string) {
  const invoiceNum = sale.invoiceNumber || sale.id.substring(0, 8);
  const blob = new Blob([receiptText], { type: 'text/plain;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `Invoice-${invoiceNum}.txt`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

/**
 * Open WhatsApp with pre-filled receipt
 */
export function openWhatsAppReceipt(customerPhone: string | undefined, receiptText: string) {
  const encodedText = encodeURIComponent(receiptText);
  let cleanPhone = (customerPhone || '').replace(/[^0-9+]/g, '');

  if (cleanPhone.startsWith('+')) {
    cleanPhone = cleanPhone.substring(1);
  } else if (cleanPhone.startsWith('0') && cleanPhone.length === 10) {
    // Local Rwanda/Kenya default prefix if starts with 0
    cleanPhone = '250' + cleanPhone.substring(1);
  }

  const url = cleanPhone 
    ? `https://wa.me/${cleanPhone}?text=${encodedText}`
    : `https://wa.me/?text=${encodedText}`;

  window.open(url, '_blank', 'noopener,noreferrer');
}
