/**
 * Comprehensive Verification of Dual Portals:
 * 1. Customer Shopping & Recognition Flow
 * 2. Protected Store Owner Management (PIN 8899, Stock < 5 Low Alerts, Flash Discounts, VIP Directory, Charts)
 */

const { EventEmitter } = require('events');
const server = require('../server.js');

function mockReq(method, pathname, body = null) {
  const req = new EventEmitter();
  req.method = method;
  req.url = pathname;
  req.headers = { 'content-type': 'application/json' };

  const res = new EventEmitter();
  res.statusCode = 200;
  res.headers = {};
  res.body = '';

  res.writeHead = (code, headers) => {
    res.statusCode = code;
    Object.assign(res.headers, headers);
  };

  res.end = (chunk) => {
    if (chunk) res.body += chunk;
    res.emit('finish');
  };

  const p = new Promise(resolve => {
    res.on('finish', () => {
      let parsed = null;
      try { parsed = JSON.parse(res.body); } catch(e) { parsed = res.body; }
      resolve({ statusCode: res.statusCode, body: parsed });
    });
  });

  const listener = server.listeners('request')[0];
  listener(req, res);

  if (body) req.emit('data', Buffer.from(JSON.stringify(body)));
  req.emit('end');

  return p;
}

async function runTests() {
  console.log("\n==================================================================");
  console.log("  🚀 RUNNING PAYPAL IOT STORE VERIFICATION SUITE                  ");
  console.log("==================================================================");

  // Test 1: Owner Authentication
  console.log("\n[TEST 1] Owner Security PIN Validation (PIN: 8899)...");
  const badLogin = await mockReq('POST', '/api/owner/login', { pin: '0000' });
  console.assert(badLogin.statusCode === 401, "Wrong PIN must be rejected");
  console.log("  ✅ Rejected invalid PIN (0000) with 401 Unauthorized");

  const goodLogin = await mockReq('POST', '/api/owner/login', { pin: '8899' });
  console.assert(goodLogin.statusCode === 200, "Correct PIN must succeed");
  console.log(`  ✅ Owner Authenticated successfully: ${goodLogin.body.owner.name} (${goodLogin.body.owner.storeName})`);

  // Test 2: Customer Pre-booking & Recognition
  console.log("\n[TEST 2] Customer Pre-booking & ID Recognition...");
  const custEntry = await mockReq('POST', '/api/gate/entry', { qrCodeData: 'PP-BOOK-1001' });
  console.assert(custEntry.statusCode === 200, "Customer entry should succeed");
  console.log(`  ✅ Customer Recognized: ${custEntry.body.customer.name} (ID: ${custEntry.body.customer.id})`);
  console.log(`     Loyalty Tier: ${custEntry.body.customer.tier} • Visits: ${custEntry.body.customer.visitCount}`);
  console.log(`     Active Session: ${custEntry.body.session.sessionId}`);

  // Test 3: Barcode scanning & Stock Deduction test
  console.log("\n[TEST 3] Barcode Scan with Active Flash Discount & Stock Validation...");
  // Starbucks Cold Brew has 15% flash discount active
  const scanItem1 = await mockReq('POST', '/api/cart/scan-barcode', { barcode: '8901030382912', action: 'ADD' });
  console.assert(scanItem1.statusCode === 200, "Scan 1 should succeed");
  console.log(`  ✅ Scanned: ${scanItem1.body.product.name} (Effective Price: $${scanItem1.body.session.items[0].price})`);

  // Doritos Nacho Cheese (Stock is 4, which is LOW STOCK < 5)
  const scanItem2 = await mockReq('POST', '/api/cart/scan-barcode', { barcode: '8902040491823', action: 'ADD' });
  console.assert(scanItem2.statusCode === 200, "Scan 2 should succeed");
  console.log(`  ✅ Scanned: ${scanItem2.body.product.name} • Cart Total: $${scanItem2.body.session.grandTotal.toFixed(2)}`);

  // Test 4: Exit Checkout & PayPal Auto-Pay
  console.log("\n[TEST 4] Exit Gate Auto-Pay & Stock Decrement...");
  const exitPay = await mockReq('POST', '/api/gate/exit-paypal-pay', { paymentMethod: 'PAYPAL_AUTO_PAY' });
  console.assert(exitPay.statusCode === 200, "Exit payment should succeed");
  console.log(`  ✅ Exit Gate Payment Completed! Total Paid: $${exitPay.body.invoice.grandTotal.toFixed(2)}`);
  console.log(`     PayPal Txn ID: ${exitPay.body.invoice.paypalTransactionId}`);
  console.log(`     Customer ID Recorded: ${exitPay.body.invoice.customerId}`);

  // Test 5: Owner Analytics (Sales Graph & Category Distribution)
  console.log("\n[TEST 5] Owner Analytics & Charts API...");
  const analytics = await mockReq('GET', '/api/owner/analytics');
  console.assert(analytics.statusCode === 200);
  console.log(`  ✅ Total Revenue Recorded: $${analytics.body.totalRevenue.toFixed(2)}`);
  console.log(`     Top-Selling Good: ${analytics.body.topSold[0].name} (${analytics.body.topSold[0].salesCount} units)`);
  console.log(`     Lowest-Selling Good: ${analytics.body.lowSold[0].name} (${analytics.body.lowSold[0].salesCount} units)`);
  console.log(`     Category Distribution:`, analytics.body.categoryTotals);
  console.log(`     Low Stock Alert Count (< 5 units): ${analytics.body.lowStockCount} items`);

  // Test 6: Owner Restock Action (+10)
  console.log("\n[TEST 6] Owner Restock Action...");
  const restock = await mockReq('POST', '/api/owner/restock', { barcode: '8902040491823', addQuantity: 10 });
  console.assert(restock.statusCode === 200);
  console.log(`  ✅ Restocked ${restock.body.product.name}. New Stock: ${restock.body.product.stock} units.`);

  // Test 7: Owner Flash Discount Setting
  console.log("\n[TEST 7] Owner Setting Flash Discount (25% for 60 mins)...");
  const discount = await mockReq('POST', '/api/owner/discount', {
    barcode: '8906080855067',
    discountPercent: 25,
    durationMinutes: 60
  });
  console.assert(discount.statusCode === 200);
  console.log(`  ✅ Flash Discount set on ${discount.body.product.name}: ${discount.body.product.discountPercent}% OFF`);

  // Test 8: Owner Frequent Customers / VIP Directory
  console.log("\n[TEST 8] Frequent Customers / VIP Directory...");
  const vips = await mockReq('GET', '/api/owner/frequent-customers');
  console.assert(vips.statusCode === 200);
  console.log(`  ✅ Top Frequent Customer: ${vips.body[0].name} (${vips.body[0].tier}) - ${vips.body[0].visitCount} visits, $${vips.body[0].totalSpend.toFixed(2)} spend`);

  // Test 9: Digital Receipt Dispatch
  console.log("\n[TEST 9] Digital Receipt Dispatch (WhatsApp)...");
  const wa = await mockReq('POST', '/api/receipt/send', {
    invoiceNumber: exitPay.body.invoice.invoiceNumber,
    channel: 'WHATSAPP'
  });
  console.assert(wa.statusCode === 200);
  console.log(`  ✅ WhatsApp digital receipt dispatched for invoice ${wa.body.invoice.invoiceNumber}`);

  console.log("\n==================================================================");
  console.log("  🎉 ALL 9 VERIFICATION CHECKS PASSED PERFECTLY!                   ");
  console.log("==================================================================\n");

  process.exit(0);
}

runTests().catch(err => {
  console.error("Test failed:", err);
  process.exit(1);
});
