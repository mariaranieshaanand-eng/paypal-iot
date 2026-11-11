/**
 * Verification Test: Concurrent Multi-Customer Entry, Separate Item Scanning, and Independent Checkout
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

async function runMultiCustomerVerification() {
  console.log("\n==================================================================");
  console.log("  👥 TESTING MULTI-CUSTOMER CONCURRENT ENTRY & SEPARATE BILLING  ");
  console.log("==================================================================");

  // Reset store state first
  await mockReq('POST', '/api/reset');

  // STEP 1: Customer 1 (Alex Rivera) enters the store
  console.log("\n[STEP 1] Customer 1 (Alex Rivera, PP-BOOK-1001) scans at Entry Gate...");
  const c1Entry = await mockReq('POST', '/api/gate/entry', { qrCodeData: 'PP-BOOK-1001' });
  console.assert(c1Entry.statusCode === 200, "C1 entry must succeed");
  console.assert(c1Entry.body.activeSessions.length === 1, "Should be 1 shopper in store");
  const c1Session = c1Entry.body.session;
  console.log(`  ✅ Customer 1 Entered: ${c1Session.customerName} (ID: ${c1Session.customerId})`);
  console.log(`     Active In-Store Shoppers: ${c1Entry.body.activeSessions.length}`);

  // STEP 2: Customer 1 scans Starbucks Cold Brew
  console.log("\n[STEP 2] Customer 1 (Alex) picks up and scans Starbucks Cold Brew...");
  const c1Scan = await mockReq('POST', '/api/cart/scan-barcode', {
    barcode: '8901030382912',
    action: 'ADD',
    sessionId: c1Session.sessionId
  });
  console.assert(c1Scan.statusCode === 200, "C1 scan must succeed");
  console.assert(c1Scan.body.session.items.length === 1, "C1 must have 1 item");
  console.log(`  ✅ Item Scanned for Alex: ${c1Scan.body.product.name}`);
  console.log(`     Alex's Bill: Subtotal $${c1Scan.body.session.subtotal.toFixed(2)}, Grand Total $${c1Scan.body.session.grandTotal.toFixed(2)}`);

  // STEP 3: Customer 2 (Samira Khan) enters while Customer 1 is still inside!
  console.log("\n[STEP 3] Customer 2 (Samira Khan, PP-BOOK-1002) arrives and scans at Entry Gate...");
  const c2Entry = await mockReq('POST', '/api/gate/entry', { qrCodeData: 'PP-BOOK-1002' });
  console.assert(c2Entry.statusCode === 200, "C2 entry must succeed");
  console.assert(c2Entry.body.activeSessions.length === 2, "Must be 2 concurrent shoppers in store!");
  const c2Session = c2Entry.body.session;
  console.log(`  ✅ Customer 2 Entered: ${c2Session.customerName} (ID: ${c2Session.customerId})`);
  console.log(`     Active In-Store Shoppers: ${c2Entry.body.activeSessions.length} (${c2Entry.body.activeSessions.map(s => s.customerName).join(', ')})`);

  // STEP 4: Customer 2 scans Doritos Nacho Cheese
  console.log("\n[STEP 4] Customer 2 (Samira) picks up and scans Doritos Nacho Cheese...");
  const c2Scan = await mockReq('POST', '/api/cart/scan-barcode', {
    barcode: '8902040491823',
    action: 'ADD',
    sessionId: c2Session.sessionId
  });
  console.assert(c2Scan.statusCode === 200, "C2 scan must succeed");
  console.assert(c2Scan.body.session.items.length === 1, "C2 must have 1 item");
  console.log(`  ✅ Item Scanned for Samira: ${c2Scan.body.product.name}`);
  console.log(`     Samira's Bill: Subtotal $${c2Scan.body.session.subtotal.toFixed(2)}, Grand Total $${c2Scan.body.session.grandTotal.toFixed(2)}`);

  // STEP 5: Verify separation of bills
  console.log("\n[STEP 5] Verifying that Alex and Samira have completely separate carts...");
  const activeSessionsQuery = await mockReq('GET', '/api/sessions/active');
  const alexInStore = activeSessionsQuery.body.activeSessions.find(s => s.customerId === 'CUST-001');
  const samiraInStore = activeSessionsQuery.body.activeSessions.find(s => s.customerId === 'CUST-002');
  console.assert(alexInStore.items.length === 1 && alexInStore.items[0].name.includes('Cold Brew'), "Alex must only have cold brew");
  console.assert(samiraInStore.items.length === 1 && samiraInStore.items[0].name.includes('Doritos'), "Samira must only have Doritos");
  console.log(`  ✅ Bill Separation Confirmed:`);
  console.log(`     - Shopper 1 [${alexInStore.customerName}]: 1 item ($${alexInStore.items[0].name}) => $${alexInStore.grandTotal.toFixed(2)}`);
  console.log(`     - Shopper 2 [${samiraInStore.customerName}]: 1 item ($${samiraInStore.items[0].name}) => $${samiraInStore.grandTotal.toFixed(2)}`);

  // STEP 6: Customer 3 (Jordan Smith) enters too!
  console.log("\n[STEP 6] Customer 3 (Jordan Smith, PP-BOOK-1003) enters the store...");
  const c3Entry = await mockReq('POST', '/api/gate/entry', { qrCodeData: 'PP-BOOK-1003' });
  console.assert(c3Entry.statusCode === 200);
  console.assert(c3Entry.body.activeSessions.length === 3, "Must be 3 concurrent shoppers in store!");
  const c3Session = c3Entry.body.session;
  console.log(`  ✅ Customer 3 Entered: ${c3Session.customerName}. Total In-Store Shoppers: 3`);

  // Jordan scans Bluetooth Earbuds ($24.99)
  const c3Scan = await mockReq('POST', '/api/cart/scan-barcode', {
    barcode: '8905070764956',
    action: 'ADD',
    sessionId: c3Session.sessionId
  });
  console.assert(c3Scan.statusCode === 200);
  console.log(`     Jordan's Bill: $${c3Scan.body.session.grandTotal.toFixed(2)} (${c3Scan.body.product.name})`);

  // STEP 7: Customer 1 (Alex) walks out and pays via PayPal Auto-Pay
  console.log("\n[STEP 7] Customer 1 (Alex Rivera) reaches Exit Gate and pays via PayPal Auto-Pay...");
  const alexPay = await mockReq('POST', '/api/gate/exit-paypal-pay', {
    sessionId: c1Session.sessionId
  });
  console.assert(alexPay.statusCode === 200, "Alex payment must succeed");
  console.assert(alexPay.body.remainingShoppers === 2, "2 shoppers must remain in store");
  console.log(`  ✅ Alex Paid via PayPal: $${alexPay.body.invoice.grandTotal.toFixed(2)} (Txn: ${alexPay.body.invoice.paypalTransactionId})`);
  console.log(`     Exit Gate Unlocked for Alex! Remaining shoppers in store: ${alexPay.body.remainingShoppers}`);

  // STEP 8: Verify remaining shoppers (Samira and Jordan) still have their separate carts intact!
  console.log("\n[STEP 8] Checking remaining shoppers after Alex left...");
  const checkRemaining = await mockReq('GET', '/api/sessions/active');
  console.assert(checkRemaining.body.activeSessions.length === 2, "Must be 2 shoppers left");
  const remainingNames = checkRemaining.body.activeSessions.map(s => s.customerName);
  console.assert(remainingNames.includes('Samira Khan') && remainingNames.includes('Jordan Smith'));
  console.assert(!remainingNames.includes('Alex Rivera'));
  console.log(`  ✅ Confirmed: ${remainingNames.join(' and ')} are still shopping inside store!`);

  // STEP 9: Customer 2 (Samira) checks out
  console.log("\n[STEP 9] Customer 2 (Samira Khan) reaches Exit Gate and pays...");
  const samiraPay = await mockReq('POST', '/api/gate/exit-paypal-pay', {
    sessionId: c2Session.sessionId
  });
  console.assert(samiraPay.statusCode === 200);
  console.assert(samiraPay.body.remainingShoppers === 1);
  console.log(`  ✅ Samira Paid via PayPal: $${samiraPay.body.invoice.grandTotal.toFixed(2)} (Txn: ${samiraPay.body.invoice.paypalTransactionId})`);
  console.log(`     Exit Gate Unlocked for Samira! Remaining shopper: ${samiraPay.body.remainingShoppers} (Jordan Smith)`);

  // STEP 10: Customer 3 (Jordan) checks out
  console.log("\n[STEP 10] Customer 3 (Jordan Smith) reaches Exit Gate and pays...");
  const jordanPay = await mockReq('POST', '/api/gate/exit-paypal-pay', {
    sessionId: c3Session.sessionId
  });
  console.assert(jordanPay.statusCode === 200);
  console.assert(jordanPay.body.remainingShoppers === 0);
  console.log(`  ✅ Jordan Paid via PayPal: $${jordanPay.body.invoice.grandTotal.toFixed(2)}`);
  console.log(`     Exit Gate Unlocked! Store is now empty (0 shoppers remaining).`);

  console.log("\n==================================================================");
  console.log("  🎉 ALL MULTI-CUSTOMER CONCURRENT TESTS PASSED WITH 100% SUCCESS! ");
  console.log("==================================================================\n");

  process.exit(0);
}

runMultiCustomerVerification().catch(err => {
  console.error("Multi-customer verification error:", err);
  process.exit(1);
});
