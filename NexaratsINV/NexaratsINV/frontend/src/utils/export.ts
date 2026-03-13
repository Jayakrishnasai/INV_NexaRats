import { Product, Customer, Vendor, Transaction } from '../types';

export const generateMasterCSV = (
    products: Product[],
    customers: Customer[],
    vendors: Vendor[],
    transactions: Transaction[],
    dateRangeLabel: string = 'FULL'
) => {
    // 1. Calculate Metrics (Simplified for report)
    let totalRevenue = 0;
    let totalGst = 0;
    let totalCogs = 0;
    const productMap = new Map(products.map(p => [p.id, p]));

    transactions.forEach(t => {
        totalRevenue += Number(t.total) || 0;
        totalGst += Number(t.gstAmount) || 0;
        t.items.forEach(item => {
            const product = productMap.get(item.id);
            if (product) totalCogs += (Number(product.purchasePrice) || 0) * (Number(item.quantity) || 0);
        });
    });

    const netProfit = totalRevenue - totalGst - totalCogs;

    let csvContent = "NEXA POS - COMPLETE BUSINESS MASTER REPORT\n";
    csvContent += `Generated: ${new Date().toLocaleString('en-IN')}\n`;
    csvContent += `Range: ${dateRangeLabel.toUpperCase()}\n\n`;

    // 1. Profit Summary
    csvContent += "REPORT 1: PROFIT & LOSS SUMMARY\n";
    csvContent += "Category,Label,Amount\n";
    csvContent += `Income,Gross Sales,${totalRevenue}\n`;
    csvContent += `Income,Tax Collected,${totalGst}\n`;
    csvContent += `Income,Net Revenue,${totalRevenue - totalGst}\n`;
    csvContent += `Expense,COGS,${totalCogs}\n`;
    csvContent += `Final,Net Profit/Loss,${netProfit}\n\n`;

    // 2. Sales
    csvContent += "REPORT 2: SALES DATA\n";
    csvContent += "Date,Invoice,Customer,Source,Status,Total\n";
    transactions.forEach(t => {
        const customer = customers.find(c => c.id === t.customerId);
        csvContent += `${t.date},${t.displayId || t.id},${customer?.name || 'Walk-in'},${t.source},${t.status},${t.total}\n`;
    });
    csvContent += "\n";

    // 3. Inventory
    csvContent += "REPORT 3: INVENTORY SNAPSHOT\n";
    csvContent += "Product Name,SKU,Stock,Price,Asset Value\n";
    products.forEach(p => {
        csvContent += `${p.name},${p.sku},${p.stock},${p.price},${p.price * p.stock}\n`;
    });
    csvContent += "\n";

    // 4. Customers
    csvContent += "REPORT 4: CUSTOMER DATABASE\n";
    csvContent += "Name,Phone,Total Paid,Pending,Last Visit\n";
    customers.forEach(c => {
        csvContent += `${c.name},${c.phone || ''},${c.totalPaid || 0},${c.pending || 0},${c.lastTransaction || 'Never'}\n`;
    });
    csvContent += "\n";

    // 5. Vendors
    csvContent += "REPORT 5: VENDOR ACCOUNTS\n";
    csvContent += "Vendor,Phone,Total Procurement,Pending Payable\n";
    vendors.forEach(v => {
        csvContent += `${v.name},${v.phone || ''},${v.totalPaid || 0},${v.pendingAmount || 0}\n`;
    });

    return csvContent;
};

export const triggerDownload = (content: string, fileName: string) => {
    const blob = new Blob([content], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement("a");
    const url = URL.createObjectURL(blob);
    link.setAttribute("href", url);
    link.setAttribute("download", fileName);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
};
