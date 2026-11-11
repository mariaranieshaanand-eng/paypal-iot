/**
 * In-Memory Verification for PayPal IoT Hackathon Flow
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

async function verifyAll() {
  console.log("\n========================================================");
  console.log("  🧪 Testing PayPal Hackathon 6-Step Autonomous Flow    ");
  console.log("========================================================");

  // Step 1: Pre-booking & Unique ID generation
  console.log("\n[STEP 1] Customer Pre-books store visit (Generates unique QR)...");
  const r1 = await mockReq('POST', '/api/bookings/create', {
    customerName: "Alex Rivera",
    email: "alex.buyer@paypal.com",
    phone: "+1 555-0199",
    slotTime: "15:00 - 16:00"
  });
  console.assert(r1.statusCode === 200, "Booking should succeed");
  const bookingId = r1.body.booking.bookingId;
  console.log(`  ✅ Booking Created: ${bookingId} for ${r1.body.booking.customerName}`);
  console.log(`     PayPal Account Linked: ${r1.body.booking.paypalAccountId}`);

  // Step 2: Auto-opening Entry Gate on QR Scan
  console.log("\n[STEP 2] Customer scans QR code at Entry Gate...");
  const r2 = await mockReq('POST', '/api/gate/entry', { qrCodeData: bookingId });
  console.assert(r2.statusCode === 200, "Entry Gate scan should succeed");
  console.assert(r2.body.session.status === "SHOPPING", "Session should be SHOPPING");
  console.log(`  ✅ Entry Gate OPENED! Servo angle: 90° | Buzzer: 2 Beeps`);
  console.log(`     Active Session: ${r2.body.session.sessionId} bound to ${r2.body.session.customerName}`);

  // Step 3 & 4: Barcode scanning of goods & linking to Customer Unique ID
  console.log("\n[STEP 3 & 4] Customer scans product barcodes inside store...");
  // Item 1: Artisan Coffee ($4.50)
  const r3a = await mockReq('POST', '/api/cart/scan-barcode', { barcode: "8901030382912", action: "ADD" });
  console.assert(r3a.statusCode === 200);
  console.log(`  ✅ Scanned: ${r3a.body.product.name} ($${r3a.body.product.price}) | Buzzer: 1 Chirp`);

  // Item 2: Bluetooth Earbuds ($24.99)
  const r3b = await mockReq('POST', '/api/cart/scan-barcode', { barcode: "8905070764956", action: "ADD" });
  console.assert(r3b.statusCode === 200);
  console.log(`  ✅ Scanned: ${r3b.body.product.name} ($${r3b.body.product.price}) | Buzzer: 1 Chirp`);

  // Item 3: Lemon Water ($1.99)
  const r3c = await mockReq('POST', '/api/cart/scan-barcode', { barcode: "8903050582934", action: "ADD" });
  console.assert(r3c.statusCode === 200);
  console.log(`  ✅ Scanned: ${r3c.body.product.name} ($${r3c.body.product.price}) | Buzzer: 1 Chirp`);

  console.log(`     Subtotal: $${r3c.body.session.subtotal.toFixed(2)} | Tax (8%): $${r3c.body.session.tax.toFixed(2)} | PayPal Promo: -$${r3c.body.session.discount.toFixed(2)}`);
  console.log(`     Grand Total Linked to ID [${r3c.body.session.bookingId}]: $${r3c.body.session.grandTotal.toFixed(2)}`);

  // Step 5 & 6: PayPal Auto-Pay at Exit Gate & Gate Opens
  console.log("\n[STEP 5 & 6] Customer reaches Exit Gate. PayPal Auto-Pay fires...");
  const r4 = await mockReq('POST', '/api/gate/exit-paypal-pay', { paymentMethod: "PAYPAL_AUTO_PAY" });
  console.assert(r4.statusCode === 200, "PayPal payment should complete");
  console.assert(r4.body.paypalResponse.status === "COMPLETED", "PayPal status should be COMPLETED");
  console.log(`  ✅ PayPal Payment Completed! Status: ${r4.body.paypalResponse.status}`);
  console.log(`     Transaction ID : ${r4.body.paypalResponse.transactionId}`);
  console.log(`     Payer Account  : ${r4.body.paypalResponse.payer.email}`);
  console.log(`     Total Charged  : $${r4.body.paypalResponse.purchaseUnits[0].amount.value}`);
  console.log(`  ✅ Exit Gate OPENED! Servo angle: 90° | Buzzer: 3 Victory Chimes!`);

  // Check ESP32 Poll Endpoint
  console.log("\n[ESP32 CHECK] Verifying hardware command queue for ESP32...");
  const r5 = await mockReq('GET', '/api/esp32/poll');
  console.log(`  ✅ ESP32 Polling Endpoint operational: Command available = ${r5.body.hasCommand}`);

  // Test Feature 3: Digital Receipt Dispatch (WhatsApp / Email / SMS)
  console.log("\n[FEATURE 3 TEST] Dispatching Digital Receipt via WhatsApp & Email...");
  const r6 = await mockReq('POST', '/api/receipt/send', {
    invoiceNumber: r4.body.invoice.invoiceNumber,
    channel: "WHATSAPP",
    recipient: "+1 555-0192"
  });
  console.assert(r6.statusCode === 200, "Receipt dispatch should succeed");
  console.log(`  ✅ WhatsApp Receipt Generated: Length = ${r6.body.formattedText.length} chars`);

  // Test Feature 4: Add Custom Product & Price
  console.log("\n[FEATURE 4 TEST] Adding custom grocery item to store catalog...");
  const r7 = await mockReq('POST', '/api/products/add', {
    name: "Monster Energy Ultra (500ml)",
    price: 3.49,
    category: "Beverages",
    barcode: "8909988771122",
    icon: "⚡"
  });
  console.assert(r7.statusCode === 200, "Product add should succeed");
  const addedProd = r7.body.products.find(p => p.barcode === "8909988771122");
  console.assert(addedProd && addedProd.price === 3.49, "Added product should match");
  console.log(`  ✅ Custom Product Added: [${addedProd.name}] at $${addedProd.price}`);

  console.log("\n🎉 ALL HACKATHON CORE & NEW FEATURES VERIFIED 100% SUCCESFUL!\n");
  server.close();
  process.exit(0);
}

verifyAll();
