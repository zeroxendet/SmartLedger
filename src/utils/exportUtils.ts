import * as XLSX from 'xlsx';
import { Sale, Expense, Product, TaxReportSummary, PurchaseOrder } from '../types';

/**
 * Generic Excel exporter
 */
export function exportToExcel(data: any[], fileName: string, sheetName: string = 'Data') {
  const worksheet = XLSX.utils.json_to_sheet(data);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, sheetName);
  XLSX.writeFile(workbook, `${fileName}.xlsx`);
}

/**
 * Generic CSV exporter with RFC-4180 escaping
 */
export function exportToCSV(data: any[], fileName: string) {
  if (!data || data.length === 0) return;
  const headers = Object.keys(data[0]);
  const csvRows: string[] = [];

  // Header row
  csvRows.push(headers.map((h) => `"${h.replace(/"/g, '""')}"`).join(','));

  // Data rows
  for (const row of data) {
    const values = headers.map((header) => {
      const val = row[header];
      const stringVal = val !== undefined && val !== null ? String(val) : '';
      return `"${stringVal.replace(/"/g, '""')}"`;
    });
    csvRows.push(values.join(','));
  }

  const blob = new Blob([csvRows.join('\r\n')], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.setAttribute('href', url);
  link.setAttribute('download', `${fileName}.csv`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

/**
 * Export Sales History
 */
export function exportSalesData(sales: Sale[], currency: string, format: 'xlsx' | 'csv' = 'xlsx') {
  const flattened = sales.map((s) => ({
    'Invoice #': s.invoiceNumber || s.id,
    'Date': new Date(s.date).toLocaleDateString(),
    'Time': new Date(s.date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    'Customer': s.customerName || 'Walk-in',
    'Items Sold': s.items.map((i) => `${i.quantity}x ${i.productName}`).join('; '),
    'Total Items': s.items.reduce((acc, i) => acc + i.quantity, 0),
    [`Total Amount (${currency})`]: s.totalAmount,
    'Payment Method': s.paymentMethod,
    'Payment Status': s.paymentStatus || 'PAID',
    [`Estimated Cost (${currency})`]: s.totalCost ?? 0,
    [`Net Profit (${currency})`]: s.profit ?? (s.totalAmount - (s.totalCost ?? 0)),
    'Notes': s.notes || '',
  }));

  const fileName = `SmartLedger_Sales_${new Date().toISOString().split('T')[0]}`;
  if (format === 'xlsx') {
    exportToExcel(flattened, fileName, 'Sales History');
  } else {
    exportToCSV(flattened, fileName);
  }
}

/**
 * Export Expenses History
 */
export function exportExpensesData(expenses: Expense[], currency: string, format: 'xlsx' | 'csv' = 'xlsx') {
  const rows = expenses.map((e) => ({
    'ID': e.id,
    'Date': new Date(e.date).toLocaleDateString(),
    'Category': e.category,
    [`Amount (${currency})`]: e.amount,
    'Payment Method': e.paymentMethod || e.paidVia || 'Cash',
    'Notes / Description': e.notes || '',
  }));

  const fileName = `SmartLedger_Expenses_${new Date().toISOString().split('T')[0]}`;
  if (format === 'xlsx') {
    exportToExcel(rows, fileName, 'Expenses');
  } else {
    exportToCSV(rows, fileName);
  }
}

/**
 * Export Products & Stock Catalog
 */
export function exportProductsData(products: Product[], currency: string, format: 'xlsx' | 'csv' = 'xlsx') {
  const rows = products.map((p) => {
    const cost = p.buyingPrice ?? p.costPrice ?? 0;
    const isLow = p.stock <= p.minStockLevel;
    return {
      'Product Name': p.name,
      'Category': p.category,
      'Barcode / SKU': p.barcode || 'N/A',
      'Unit': p.unit || 'pcs',
      [`Selling Price (${currency})`]: p.sellingPrice,
      [`Cost Price (${currency})`]: cost,
      'Current Stock': p.stock,
      'Min Reorder Level': p.minStockLevel,
      'Stock Status': isLow ? 'LOW STOCK' : 'IN STOCK',
      [`Total Stock Value (${currency})`]: p.stock * p.sellingPrice,
      [`Total Cost Value (${currency})`]: p.stock * cost,
      'Supplier': p.supplier || 'N/A',
    };
  });

  const fileName = `SmartLedger_Inventory_${new Date().toISOString().split('T')[0]}`;
  if (format === 'xlsx') {
    exportToExcel(rows, fileName, 'Inventory');
  } else {
    exportToCSV(rows, fileName);
  }
}

/**
 * Export Tax Summary Report
 */
export function exportTaxReportData(tax: TaxReportSummary, currency: string, format: 'xlsx' | 'csv' = 'xlsx') {
  const summaryRows = [
    { 'Tax Metric': 'Report Period', 'Value': tax.periodLabel },
    { 'Tax Metric': 'Date Range', 'Value': `${tax.startDate} to ${tax.endDate}` },
    { 'Tax Metric': 'Applied Tax Rate', 'Value': `${tax.taxRatePercent}%` },
    { 'Tax Metric': 'Total Sales Transactions', 'Value': tax.transactionsCount },
    { 'Tax Metric': `Gross Sales (Tax Inclusive, ${currency})`, 'Value': tax.grossSalesTaxInclusive },
    { 'Tax Metric': `Net Sales Subtotal (Tax Exclusive, ${currency})`, 'Value': tax.netSalesTaxExclusive },
    { 'Tax Metric': `Sales Output Tax Collected (${currency})`, 'Value': tax.outputTaxAmount },
    { 'Tax Metric': `Total Operating Expenses (${currency})`, 'Value': tax.totalExpenses },
    { 'Tax Metric': `Estimated Expense Input Tax (${currency})`, 'Value': tax.estimatedInputTaxAmount },
    { 'Tax Metric': `Net Tax Payable to Revenue Authority (${currency})`, 'Value': tax.netTaxPayable },
  ];

  const fileName = `SmartLedger_TaxReport_${tax.periodLabel.replace(/\s+/g, '_')}_${new Date().toISOString().split('T')[0]}`;
  if (format === 'xlsx') {
    exportToExcel(summaryRows, fileName, 'Tax Summary');
  } else {
    exportToCSV(summaryRows, fileName);
  }
}

/**
 * Export Purchase Order
 */
export function exportPurchaseOrder(po: PurchaseOrder, currency: string, format: 'xlsx' | 'csv' = 'xlsx') {
  const items = po.items.map((i) => ({
    'PO Number': po.poNumber,
    'Supplier': po.supplierName,
    'Date': new Date(po.createdAt).toLocaleDateString(),
    'Product': i.productName,
    'Current In Stock': i.currentStock,
    'Min Stock Level': i.minStockLevel,
    'Ordered Quantity': i.recommendedOrder,
    [`Unit Cost (${currency})`]: i.unitCost,
    [`Subtotal Cost (${currency})`]: i.totalCost,
  }));

  const fileName = `PurchaseOrder_${po.poNumber}_${new Date().toISOString().split('T')[0]}`;
  if (format === 'xlsx') {
    exportToExcel(items, fileName, 'Purchase Order');
  } else {
    exportToCSV(items, fileName);
  }
}
