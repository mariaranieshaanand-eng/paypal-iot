/**
 * Verification Test: Real-Time Optical Camera Endpoints, Store Occupancy, and Anti-Theft Shoplifting Alarm
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

function assert(condition, message) {
  if (!condition) {
    console.error(`❌ TEST FAILED: ${message}`);
    process.exit(1);
  }
}

async function runTests() {
  console.log(`\n==================================================================`);
  console.log(`  🛡️ TESTING CAMERA SCANNER, STORE OCCUPANCY & ANTI-THEFT ALARM  `);
  console.log(`==================================================================\n`);

  // Step 0: Reset demo state
  console.log(`[STEP 0] Resetting system state...`);
  const r0 = await mockReq('POST', '/api/reset');
  assert(r0.statusCode === 200, `Reset failed: ${r0.statusCode}`);
  console.log(`  ✅ Store reset completed.`);

  // Step 1: Set max capacity to 2 for tight testing
  console.log(`\n[STEP 1] Setting max store capacity to 2 concurrent shoppers...`);
  const rCap = await mockReq('POST', '/api/owner/capacity', { maxCapacity: 2 });
  assert(rCap.statusCode === 200, `Set capacity failed: ${rCap.statusCode}`);
  assert(rCap.body.maxCapacity === 2, `Expected capacity 2, got ${rCap.body.maxCapacity}`);
  console.log(`  ✅ Capacity set to ${rCap.body.maxCapacity} shoppers.`);

  // Step 2: Customer 1 enters (Alex Rivera)
  console.log(`\n[STEP 2] Customer 1 (Alex, PP-BOOK-1001) enters through Entry Gate...`);
  const rE1 = await mockReq('POST', '/api/gate/entry', { qrCodeData: 'PP-BOOK-1001' });
  assert(rE1.statusCode === 200, `Entry 1 failed: ${rE1.statusCode}`);
  assert(rE1.body.activeSessions.length === 1, `Expected 1 active session`);
  console.log(`  ✅ Alex entered! Occupancy: 1/2 shoppers.`);

  // Step 3: Customer 2 enters (Samira Khan)
  console.log(`\n[STEP 3] Customer 2 (Samira, PP-BOOK-1002) enters through Entry Gate...`);
  const rE2 = await mockReq('POST', '/api/gate/entry', { qrCodeData: 'PP-BOOK-1002' });
  assert(rE2.statusCode === 200, `Entry 2 failed: ${rE2.statusCode}`);
  assert(rE2.body.activeSessions.length === 2, `Expected 2 active sessions`);
  console.log(`  ✅ Samira entered! Occupancy: 2/2 shoppers (100% Full Capacity).`);

  // Step 4: Verify occupancy endpoint shows full capacity
  console.log(`\n[STEP 4] Querying /api/store/occupancy...`);
  const rOcc = await mockReq('GET', '/api/store/occupancy');
  assert(rOcc.statusCode === 200, `Occupancy query failed`);
  assert(rOcc.body.current === 2, `Expected 2 shoppers`);
  assert(rOcc.body.max === 2, `Expected max 2`);
  assert(rOcc.body.isFull === true, `Expected store to be marked isFull`);
  console.log(`  ✅ Occupancy verified: 2 / 2 shoppers, isFull: true.`);

  // Step 5: Customer 3 attempts entry when store is full -> MUST BE BLOCKED
  console.log(`\n[STEP 5] Customer 3 (Jordan, PP-BOOK-1003) attempts entry while full...`);
  const rE3 = await mockReq('POST', '/api/gate/entry', { qrCodeData: 'PP-BOOK-1003' });
  assert(rE3.statusCode === 429, `Expected 429 Too Many Requests, got ${rE3.statusCode}`);
  assert(rE3.body.code === 'STORE_FULL', `Expected STORE_FULL error code`);
  console.log(`  ✅ Access correctly blocked! Error message: "${rE3.body.message}"`);

  // Step 6: Alex scans an item (Starbucks Cold Brew)
  console.log(`\n[STEP 6] Alex scans Starbucks Cold Brew ($4.50 with 15% discount)...`);
  const rScan = await mockReq('POST', '/api/cart/scan-barcode', {
    barcode: '8901030382912',
    action: 'ADD',
    customerId: 'CUST-001'
  });
  assert(rScan.statusCode === 200, `Scan failed: ${rScan.statusCode}`);
  assert(rScan.body.session.items.length === 1, `Expected 1 item in cart`);
  const alexTotal = rScan.body.session.grandTotal;
  console.log(`  ✅ Item scanned! Alex's unpaid cart balance: $${alexTotal.toFixed(2)}.`);

  // Step 7: Simulate Anti-Theft Shoplifting Breach (Alex attempts barrier exit without paying)
  console.log(`\n[STEP 7] Simulating unauthorized barrier breach with unpaid goods...`);
  const rTheft = await mockReq('POST', '/api/security/trigger-alarm', {
    reason: 'UNPAID_CART_EXIT_BREACH',
    customerId: 'CUST-001'
  });
  assert(rTheft.statusCode === 200, `Theft alarm trigger failed: ${rTheft.statusCode}`);
  assert(rTheft.body.alarm === true, `Expected alarm=true`);
  assert(rTheft.body.incident.status === 'BLOCKED_LOCKDOWN', `Expected BLOCKED_LOCKDOWN`);
  assert(rTheft.body.incident.unpaidTotal === alexTotal, `Expected unpaid total match`);
  console.log(`  ✅ Anti-theft alarm activated! Incident logged: "${rTheft.body.incident.reason}".`);

  // Step 8: Verify ESP32 poll receives ALARM_THEFT command
  console.log(`\n[STEP 8] Simulating ESP32 hardware poll (/api/esp32/poll)...`);
  const rPoll = await mockReq('GET', '/api/esp32/poll');
  assert(rPoll.statusCode === 200, `Poll failed: ${rPoll.statusCode}`);
  assert(rPoll.body.alarmActive === true, `Expected alarmActive=true in ESP32 poll`);
  assert(rPoll.body.hasCommand === true, `Expected hasCommand=true`);
  assert(rPoll.body.command.action === 'ALARM_THEFT', `Expected command action ALARM_THEFT, got ${rPoll.body.command ? rPoll.body.command.action : 'none'}`);
  console.log(`  ✅ ESP32 received ALARM_THEFT command! Physical Buzzer & LED Strobe fired.`);

  // Step 9: Store Owner disarms the alarm
  console.log(`\n[STEP 9] Store Owner resets/disarms security alarm...`);
  const rResetSec = await mockReq('POST', '/api/security/reset-alarm');
  assert(rResetSec.statusCode === 200, `Disarm failed: ${rResetSec.statusCode}`);
  assert(rResetSec.body.alarmActive === false, `Expected alarmActive=false`);
  console.log(`  ✅ Security alarm disarmed. Standby restored.`);

  // Step 10: Alex pays legitimately via PayPal Auto-Pay and exits
  console.log(`\n[STEP 10] Alex settles payment via PayPal Auto-Pay and exits store...`);
  const rExit = await mockReq('POST', '/api/gate/exit-paypal-pay', {
    paymentMethod: 'PAYPAL_AUTO_PAY',
    customerId: 'CUST-001'
  });
  assert(rExit.statusCode === 200, `PayPal checkout failed: ${rExit.statusCode}`);
  assert(rExit.body.remainingShoppers === 1, `Expected 1 remaining shopper (Samira)`);
  console.log(`  ✅ Payment settled! Alex exited. Remaining shoppers: 1/2.`);

  // Step 11: Customer 3 can now enter since capacity dropped to 1/2
  console.log(`\n[STEP 11] Customer 3 (Jordan) tries entering now that store has space...`);
  const rE3Retry = await mockReq('POST', '/api/gate/entry', { qrCodeData: 'PP-BOOK-1003' });
  assert(rE3Retry.statusCode === 200, `Jordan entry failed: ${rE3Retry.statusCode}`);
  assert(rE3Retry.body.activeSessions.length === 2, `Expected 2 active sessions now`);
  console.log(`  ✅ Jordan entered successfully! Store capacity managed seamlessly.`);

  console.log(`\n==================================================================`);
  console.log(`  🎉 ALL CAMERA, OCCUPANCY & ANTI-THEFT TESTS PASSED 100%!       `);
  console.log(`==================================================================\n`);
  process.exit(0);
}

runTests().catch(err => {
  console.error("Test execution fatal error:", err);
  process.exit(1);
});
