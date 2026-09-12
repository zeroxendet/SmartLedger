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
