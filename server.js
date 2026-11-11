/**
 * PayPal IoT Auto-Billing & Smart Store Management Server
 * Dual Portal Architecture: Customer Kiosk & Secure Shop Owner Portal
 */

const http = require('http');
const fs = require('fs');
const path = require('path');
const os = require('os');

const PORT = process.env.PORT || 3000;
const PUBLIC_DIR = path.join(__dirname, 'public');

// --- In-Memory Database ---
const db = {
  // Store Owner Credentials
  ownerConfig: {
    pin: "8899",
    name: "Elena Vance (Store Proprietor)",
    storeId: "STORE-104",
    storeName: "PayPal Autonomous Micro-Store #104"
  },

  // Persistent Customer Profiles (Remembers customer history, visits, spend)
  customers: [
    {
      id: "CUST-001",
      bookingId: "PP-BOOK-1001",
      name: "Alex Rivera",
      email: "alex.buyer@example.com",
      phone: "+1 555-0192",
      paypalAccountId: "PAYPAL-ACC-88219",
      visitCount: 8,
      totalSpend: 248.50,
      tier: "VIP Platinum",
      favoriteItem: "Starbucks Cold Brew",
      lastVisit: new Date(Date.now() - 86400000 * 2).toLocaleDateString()
    },
    {
      id: "CUST-002",
      bookingId: "PP-BOOK-1002",
      name: "Samira Khan",
      email: "samira.k@example.com",
      phone: "+1 555-0144",
      paypalAccountId: "PAYPAL-ACC-99432",
      visitCount: 5,
      totalSpend: 142.20,
      tier: "Gold Member",
      favoriteItem: "Doritos Nacho Cheese",
      lastVisit: new Date(Date.now() - 86400000 * 5).toLocaleDateString()
    },
    {
      id: "CUST-003",
      bookingId: "PP-BOOK-1003",
      name: "Jordan Smith",
      email: "jordan.smith@example.com",
      phone: "+1 555-0199",
      paypalAccountId: "PAYPAL-ACC-77123",
      visitCount: 3,
      totalSpend: 86.40,
      tier: "Silver Member",
      favoriteItem: "Bluetooth Earbuds",
      lastVisit: new Date().toLocaleDateString()
    }
  ],

  // Store Products with Inventory Stock, Sales Tracking, and Time-Limited Flash Discounts
  products: [
    {
      barcode: "8901030382912",
      name: "Starbucks Cold Brew (250ml)",
      price: 4.50,
      category: "Beverages",
      icon: "☕",
      stock: 18,
      salesCount: 42,
      discountPercent: 15, // 15% Flash Discount active
      discountEndsAt: Date.now() + 3600000 * 2 // 2 hours remaining
    },
    {
      barcode: "8902040491823",
      name: "Doritos Nacho Cheese (150g)",
      price: 3.25,
      category: "Snacks",
      icon: "🧀",
      stock: 4, // LOW STOCK (< 5)
      salesCount: 38,
      discountPercent: 0,
      discountEndsAt: null
    },
    {
      barcode: "8903050582934",
      name: "Red Bull Energy Drink (250ml)",
      price: 3.99,
      category: "Beverages",
      icon: "⚡",
      stock: 12,
      salesCount: 31,
      discountPercent: 20, // 20% Flash Discount
      discountEndsAt: Date.now() + 3600000 * 3
    },
    {
      barcode: "8904060673845",
      name: "KitKat 4-Finger Milk Chocolate",
      price: 1.85,
      category: "Snacks",
      icon: "🍫",
      stock: 3, // LOW STOCK (< 5)
      salesCount: 29,
      discountPercent: 0,
      discountEndsAt: null
    },
    {
      barcode: "8905070764956",
      name: "Bluetooth Pocket Earbuds",
      price: 24.99,
      category: "Electronics",
      icon: "🎧",
      stock: 6,
      salesCount: 14,
      discountPercent: 0,
      discountEndsAt: null
    },
    {
      barcode: "8906080855067",
      name: "Fresh Fuji Apples (Pack of 4)",
      price: 3.80,
      category: "Produce",
      icon: "🍎",
      stock: 15,
      salesCount: 9, // Lowest selling
      discountPercent: 10,
      discountEndsAt: Date.now() + 3600000
    },
    {
      barcode: "8907090946178",
      name: "Coca-Cola Zero Sugar (500ml)",
      price: 2.20,
      category: "Beverages",
      icon: "🥤",
      stock: 22,
      salesCount: 25,
      discountPercent: 0,
      discountEndsAt: null
    },
    {
      barcode: "8908101037289",
      name: "Gourmet Roasted Cashews (100g)",
      price: 5.50,
      category: "Dry Fruits",
      icon: "🥜",
      stock: 2, // CRITICAL LOW STOCK
      salesCount: 7, // Lowest selling
      discountPercent: 0,
      discountEndsAt: null
    }
  ],

  // Active shopping sessions for multiple concurrent customers inside the store
  activeSessions: [],
  get activeSession() {
    return this.activeSessions.length > 0 ? this.activeSessions[this.activeSessions.length - 1] : null;
  },
  set activeSession(val) {
    if (!val) {
      this.activeSessions = [];
    } else {
      const idx = this.activeSessions.findIndex(s => s.sessionId === val.sessionId || s.customerId === val.customerId);
      if (idx >= 0) this.activeSessions[idx] = val;
      else this.activeSessions.push(val);
    }
  },

  // Store Configuration & Capacity Settings
  storeConfig: {
    maxCapacity: 4, // Max shoppers allowed concurrently
    alarmActive: false
  },

  // Anti-Theft & Shoplifting Security Incident Logs
  securityLogs: [
    {
      id: "SEC-LOG-001",
      time: new Date().toLocaleTimeString(),
      date: new Date().toLocaleDateString(),
      customerName: "System Calibration",
      customerId: "SYSTEM",
      bookingId: "CALIBRATION",
      reason: "Anti-Theft Optical Barrier & Solenoid Lock Calibrated",
      unpaidItems: ["Perimeter Check: Normal"],
      unpaidTotal: 0,
      status: "SECURED",
      lockdownActive: false
    }
  ],

  // Hardware Command Queue for ESP32
  hardwareQueue: [],
  hardwareState: {
    entryGate: "CLOSED",
    exitGate: "CLOSED",
    buzzerTrigger: null,
    lastActionTime: Date.now(),
    lastEsp32Ping: Date.now()
  },

  transactions: [],
  customerNotifications: [],
  logs: []
};

// Helper: Look up customer session across concurrent shoppers
function findSession(idOrPass) {
  if (!idOrPass) {
    return db.activeSessions.length > 0 ? db.activeSessions[db.activeSessions.length - 1] : null;
  }
  const trimmed = String(idOrPass).trim().toUpperCase();
  return db.activeSessions.find(s => 
    (s.sessionId && s.sessionId.toUpperCase() === trimmed) ||
    (s.customerId && s.customerId.toUpperCase() === trimmed) ||
    (s.bookingId && s.bookingId.toUpperCase() === trimmed) ||
    (s.customerName && s.customerName.toUpperCase() === trimmed) ||
    (s.email && s.email.toUpperCase() === trimmed)
  ) || null;
}

// SSE Subscribers
let sseClients = [];

function broadcast(eventType, data) {
  const payload = `event: ${eventType}\ndata: ${JSON.stringify(data)}\n\n`;
  sseClients.forEach(c => {
    try { c.write(payload); } catch(e) {}
  });
}

function addLog(source, message, type = "info") {
  const entry = {
    id: Date.now() + Math.random().toString(36).substring(2, 6),
    time: new Date().toLocaleTimeString(),
    source,
    message,
    type
  };
  db.logs.unshift(entry);
  if (db.logs.length > 50) db.logs.pop();
  broadcast("log", entry);
}

function pushCustomerNotification(type, title, message) {
  const notif = {
    id: Date.now(),
    time: new Date().toLocaleTimeString(),
    type, // "WELCOME", "SCAN", "CHECKOUT", "ALERT"
    title,
    message
  };
  db.customerNotifications.unshift(notif);
  if (db.customerNotifications.length > 20) db.customerNotifications.pop();
  broadcast("customer_notification", notif);
}

function triggerHardware(action, details = {}) {
  const cmd = {
    id: Date.now(),
    action,
    details,
    timestamp: Date.now()
  };
  if (action === "ALARM_THEFT") {
    // High-priority security interrupt: immediately clear queue and engage emergency alarm
    db.hardwareQueue = [cmd];
    db.hardwareState.entryGate = "LOCKED";
    db.hardwareState.exitGate = "LOCKED";
    db.hardwareState.buzzerTrigger = "ALARM_BURST";
  } else {
    db.hardwareQueue.push(cmd);
    if (action === "OPEN_ENTRY_GATE") {
      db.hardwareState.entryGate = "OPEN";
      db.hardwareState.buzzerTrigger = "GATE_OPEN";
    } else if (action === "OPEN_EXIT_GATE") {
      db.hardwareState.exitGate = "OPEN";
      db.hardwareState.buzzerTrigger = "PAYMENT_SUCCESS";
    } else if (action === "BEEP_SCAN") {
      db.hardwareState.buzzerTrigger = "SCAN_BEEP";
    } else if (action === "BEEP_ERROR") {
      db.hardwareState.buzzerTrigger = "ERROR";
    }
  }
  db.hardwareState.lastActionTime = Date.now();
  broadcast("hardware_update", { command: cmd, state: db.hardwareState });
}

function getEffectivePrice(product) {
  if (product.discountPercent > 0) {
    if (!product.discountEndsAt || product.discountEndsAt > Date.now()) {
      const discounted = product.price * (1 - product.discountPercent / 100);
      return Math.round(discounted * 100) / 100;
    }
  }
  return product.price;
}

function recalculateBill(session) {
  if (!session) return null;
  let subtotal = 0;
  session.items.forEach(item => {
    subtotal += item.price * item.quantity;
  });
  const tax = Math.round(subtotal * 0.08 * 100) / 100; // 8% sales tax
  const discount = subtotal >= 30.00 ? 3.00 : 0.00; // $3 PayPal promo discount
  const grandTotal = Math.max(0, Math.round((subtotal + tax - discount) * 100) / 100);

  session.subtotal = subtotal;
  session.tax = tax;
  session.discount = discount;
  session.grandTotal = grandTotal;
  session.lastUpdated = new Date().toISOString();
  return session;
}

function parseJson(req) {
  return new Promise((resolve, reject) => {
    let body = '';
    req.on('data', chunk => body += chunk);
    req.on('end', () => {
      try {
        resolve(body ? JSON.parse(body) : {});
      } catch (e) {
        reject(e);
      }
    });
    req.on('error', reject);
  });
}

function sendJson(res, status, data) {
  res.writeHead(status, {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, X-Owner-Pin'
  });
  res.end(JSON.stringify(data));
}

// HTTP Server
const server = http.createServer(async (req, res) => {
  const reqUrl = new URL(req.url, `http://${req.headers.host || 'localhost'}`);
  const pathname = reqUrl.pathname;
  const method = req.method;

  // CORS Preflight
  if (method === 'OPTIONS') {
    res.writeHead(204, {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, X-Owner-Pin'
    });
    return res.end();
  }

  // --- Real-Time Server-Sent Events (SSE) Stream ---
  if (pathname === '/api/events') {
    res.writeHead(200, {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
      'Access-Control-Allow-Origin': '*'
    });
    res.write('retry: 1500\n\n');
    sseClients.push(res);
    req.on('close', () => {
      sseClients = sseClients.filter(c => c !== res);
    });

    // Check low stock count
    const lowStockCount = db.products.filter(p => p.stock < 5).length;

    // Initial snapshot
    res.write(`event: snapshot\ndata: ${JSON.stringify({
      activeSessions: db.activeSessions,
      activeSession: db.activeSession,
      products: db.products,
      customers: db.customers,
      hardwareState: db.hardwareState,
      lowStockCount,
      storeConfig: db.storeConfig,
      occupancy: {
        current: db.activeSessions.length,
        max: db.storeConfig.maxCapacity,
        percentage: Math.min(100, Math.round((db.activeSessions.length / db.storeConfig.maxCapacity) * 100))
      },
      alarmActive: db.storeConfig.alarmActive,
      securityLogs: db.securityLogs.slice(0, 15),
      recentNotifications: db.customerNotifications.slice(0, 5),
      logs: db.logs.slice(0, 20),
      recentTransactions: db.transactions.slice(0, 5)
    })}\n\n`);
    return;
  }

  // --- 1. Customer Pre-Booking & ID Generation ---
  if (pathname === '/api/bookings/create' && method === 'POST') {
    try {
      const body = await parseJson(req);
      const { customerName, email, phone, slotTime = "Today - Next Slot" } = body;

      if (!customerName || !email) {
        return sendJson(res, 400, { success: false, message: "Customer name and email are required!" });
      }

      // Check if returning customer
      let customer = db.customers.find(c => c.email.toLowerCase() === email.toLowerCase());
      if (!customer) {
        const nextId = "CUST-00" + (db.customers.length + 1);
        const randomBooking = "PP-BOOK-" + Math.floor(1000 + Math.random() * 9000);
        customer = {
          id: nextId,
          bookingId: randomBooking,
          name: customerName,
          email,
          phone: phone || "+1 555-0199",
          paypalAccountId: `PAYPAL-ACC-${Math.random().toString(36).substring(2, 7).toUpperCase()}`,
          visitCount: 1,
          totalSpend: 0,
          tier: "New Member",
          favoriteItem: "N/A",
          lastVisit: new Date().toLocaleDateString()
        };
        db.customers.push(customer);
      } else {
        customer.name = customerName; // update latest name
        customer.phone = phone || customer.phone;
      }

      addLog("CUSTOMER_PORTAL", `Pre-booking created for [${customer.name}] (ID: ${customer.id}, Pass: ${customer.bookingId})`, "success");
      broadcast("customers_updated", db.customers);

      return sendJson(res, 200, {
        success: true,
        message: `Welcome ${customer.name}! Booking confirmed under ID ${customer.id}.`,
        booking: customer
      });
    } catch (e) {
      return sendJson(res, 400, { success: false, error: e.message });
    }
  }

  // --- 2. Entry Gate: Scan Customer QR / ID ---
  if (pathname === '/api/gate/entry' && method === 'POST') {
    try {
      const body = await parseJson(req);
      const { qrCodeData } = body;

      const trimmedCode = (qrCodeData || '').trim().toUpperCase();
      const customer = db.customers.find(c => 
        c.bookingId.toUpperCase() === trimmedCode || 
        c.id.toUpperCase() === trimmedCode
      );

      if (!customer) {
        triggerHardware("BEEP_ERROR");
        addLog("ENTRY_GATE", `Access Denied: Unrecognized Customer ID/Pass [${trimmedCode}]`, "error");
        pushCustomerNotification("ALERT", "Access Denied", "Unrecognized QR Pass. Please register or check your booking ID.");
        return sendJson(res, 404, { success: false, message: "Unrecognized Customer ID or Booking QR!" });
      }

      // Increment visit count & record arrival
      customer.visitCount += 1;
      customer.lastVisit = new Date().toLocaleDateString();

      // Determine VIP tier
      if (customer.visitCount >= 7) customer.tier = "VIP Platinum";
      else if (customer.visitCount >= 4) customer.tier = "Gold Member";
      else customer.tier = "Silver Member";

      // Look for existing session or create a new concurrent session for this customer
      let session = db.activeSessions.find(s => 
        s.customerId === customer.id || 
        s.bookingId.toUpperCase() === trimmedCode || 
        s.customerId.toUpperCase() === trimmedCode
      );

      // Check Store Maximum Capacity Constraint
      if (!session && db.activeSessions.length >= db.storeConfig.maxCapacity) {
        triggerHardware("BEEP_ERROR");
        const fullMsg = `Store at Maximum Capacity (${db.activeSessions.length}/${db.storeConfig.maxCapacity} shoppers inside). Please wait a moment for another customer to exit!`;
        addLog("ENTRY_GATE", `Entry Blocked for ${customer.name}: ${fullMsg}`, "warning");
        pushCustomerNotification("ALERT", "Store Full", fullMsg);
        return sendJson(res, 429, {
          success: false,
          code: "STORE_FULL",
          message: fullMsg,
          occupancy: {
            current: db.activeSessions.length,
            max: db.storeConfig.maxCapacity,
            percentage: 100
          }
        });
      }

      if (!session) {
        session = {
          sessionId: "SESS-" + customer.id + "-" + Date.now().toString().slice(-4),
          customerId: customer.id,
          bookingId: customer.bookingId,
          customerName: customer.name,
          email: customer.email,
          phone: customer.phone,
          paypalAccountId: customer.paypalAccountId,
          tier: customer.tier,
          visitCount: customer.visitCount,
          checkInTime: new Date().toLocaleTimeString(),
          items: [],
          subtotal: 0,
          tax: 0,
          discount: 0,
          grandTotal: 0,
          status: "SHOPPING",
          lastUpdated: new Date().toISOString()
        };
        db.activeSessions.push(session);
      }

      // Trigger ESP32 Gate & Buzzer
      triggerHardware("OPEN_ENTRY_GATE", { bookingId: customer.bookingId, customer: customer.name });
      
      const inStoreCount = db.activeSessions.length;
      const welcomeMsg = `Welcome ${customer.name}! (${customer.tier} • Visit #${customer.visitCount}). Gate barrier unlocked — please enter the shop! (${inStoreCount} shopper${inStoreCount > 1 ? 's' : ''} currently in store)`;
      addLog("ENTRY_GATE", welcomeMsg, "success");
      pushCustomerNotification("WELCOME", "Door Unlocked! Welcome to Shop", welcomeMsg);

      broadcast("sessions_updated", db.activeSessions);
      broadcast("session_updated", session);
      broadcast("customers_updated", db.customers);
      broadcast("occupancy_updated", {
        current: db.activeSessions.length,
        max: db.storeConfig.maxCapacity,
        percentage: Math.min(100, Math.round((db.activeSessions.length / db.storeConfig.maxCapacity) * 100))
      });

      return sendJson(res, 200, {
        success: true,
        message: welcomeMsg,
        customer,
        session,
        activeSessions: db.activeSessions
      });
    } catch (e) {
      return sendJson(res, 400, { success: false, error: e.message });
    }
  }

  // --- 3 & 4. Barcode Scanning & Item Addition (with Stock Validation & Timed Discounts) ---
  if (pathname === '/api/cart/scan-barcode' && method === 'POST') {
    try {
      const body = await parseJson(req);
      const { barcode, action = "ADD", customerId, bookingId, sessionId } = body;

      const targetId = sessionId || bookingId || customerId;
      const session = findSession(targetId);

      if (!session || session.status !== "SHOPPING") {
        triggerHardware("BEEP_ERROR");
        return sendJson(res, 400, {
          success: false,
          message: targetId
            ? `No active shopping session found for customer [${targetId}]! Scan your customer pass at the Entry Gate first.`
            : "No customer currently inside the store! Scan your customer pass at the Entry Gate first."
        });
      }

      const product = db.products.find(p => p.barcode === (barcode || '').trim());
      if (!product) {
        triggerHardware("BEEP_ERROR");
        addLog("BARCODE_SCAN", `Barcode not recognized: ${barcode}`, "warning");
        pushCustomerNotification("ALERT", "Unknown Item", `Barcode ${barcode} not found in store catalog.`);
        return sendJson(res, 404, { success: false, message: "Barcode not recognized in store inventory!" });
      }

      const effectivePrice = getEffectivePrice(product);
      const existingIndex = session.items.findIndex(i => i.barcode === product.barcode);

      if (action.toUpperCase() === "REMOVE") {
        if (existingIndex >= 0) {
          if (session.items[existingIndex].quantity > 1) {
            session.items[existingIndex].quantity -= 1;
          } else {
            session.items.splice(existingIndex, 1);
          }
          triggerHardware("BEEP_SCAN", { action: "REMOVE", item: product.name });
          addLog("CART_BILL", `Removed 1x [${product.name}] from cart of ${session.customerName} (${session.bookingId})`, "warning");
          pushCustomerNotification("SCAN", "Item Removed", `Removed ${product.name} from cart of ${session.customerName}.`);
        } else {
          return sendJson(res, 400, { success: false, message: `Item "${product.name}" is not in ${session.customerName}'s cart!` });
        }
      } else {
        // ADD: Check if stock is available across ALL active shoppers' carts
        let totalInAllCarts = 0;
        db.activeSessions.forEach(s => {
          const itm = s.items.find(i => i.barcode === product.barcode);
          if (itm) totalInAllCarts += itm.quantity;
        });

        if (product.stock <= totalInAllCarts) {
          triggerHardware("BEEP_ERROR");
          return sendJson(res, 400, { 
            success: false, 
            message: `Sorry, no more stock available for "${product.name}"! Only ${product.stock} units in store.` 
          });
        }

        if (existingIndex >= 0) {
          session.items[existingIndex].quantity += 1;
        } else {
          session.items.push({
            barcode: product.barcode,
            name: product.name,
            originalPrice: product.price,
            price: effectivePrice,
            hasDiscount: product.discountPercent > 0 && (!product.discountEndsAt || product.discountEndsAt > Date.now()),
            discountPercent: product.discountPercent,
            category: product.category,
            icon: product.icon,
            quantity: 1,
            addedAt: new Date().toLocaleTimeString()
          });
        }
        triggerHardware("BEEP_SCAN", { action: "ADD", item: product.name });
        addLog("CART_BILL", `Added [${product.name}] ($${effectivePrice}) to cart for ${session.customerName} (${session.bookingId})`, "success");
        pushCustomerNotification("SCAN", "Item Added", `Scanned ${product.name} ($${effectivePrice.toFixed(2)}) for ${session.customerName} • Running Total: $${(session.subtotal + effectivePrice).toFixed(2)}`);
      }

      recalculateBill(session);
      broadcast("sessions_updated", db.activeSessions);
      broadcast("session_updated", session);

      return sendJson(res, 200, {
        success: true,
        action,
        product,
        session,
        activeSessions: db.activeSessions
      });
    } catch (e) {
      return sendJson(res, 400, { success: false, error: e.message });
    }
  }

  // --- 5 & 6. Exit Gate: PayPal Payment, Stock Deduction & Gate Unlock ---
  if (pathname === '/api/gate/exit-paypal-pay' && method === 'POST') {
    try {
      const body = await parseJson(req);
      const { paymentMethod = "PAYPAL_AUTO_PAY", customerId, bookingId, sessionId } = body;
      const targetId = sessionId || bookingId || customerId;
      const session = findSession(targetId);

      if (!session || session.status !== "SHOPPING") {
        return sendJson(res, 400, { 
          success: false, 
          message: targetId
            ? `No active shopping session found for customer [${targetId}] to check out!`
            : "No active shopping session found to check out!"
        });
      }

      if (session.items.length === 0) {
        addLog("EXIT_GATE", `Customer [${session.customerName}] exited with 0 items. Exit Gate opened.`, "info");
        pushCustomerNotification("CHECKOUT", "Exit Gate Opened", `No items purchased by ${session.customerName}. Thank you for visiting!`);
        triggerHardware("OPEN_EXIT_GATE", { amount: 0, customer: session.customerName });
        
        // Remove this customer's session; other shoppers remain in store!
        db.activeSessions = db.activeSessions.filter(s => s.sessionId !== session.sessionId);
        broadcast("sessions_updated", db.activeSessions);
        broadcast("session_updated", db.activeSessions[db.activeSessions.length - 1] || null);
        broadcast("occupancy_updated", {
          current: db.activeSessions.length,
          max: db.storeConfig.maxCapacity,
          percentage: Math.min(100, Math.round((db.activeSessions.length / db.storeConfig.maxCapacity) * 100))
        });
        return sendJson(res, 200, { 
          success: true, 
          message: "No items purchased. Gate opened.", 
          transaction: null,
          remainingShoppers: db.activeSessions.length,
          activeSessions: db.activeSessions
        });
      }

      const totalAmount = session.grandTotal;
      const paypalTxnId = "PAYPAL-TXN-" + Math.random().toString(36).substring(2, 10).toUpperCase();

      // Deduct stock & increment sales metrics
      let lowStockAlertsTriggered = [];
      session.items.forEach(item => {
        const prod = db.products.find(p => p.barcode === item.barcode);
        if (prod) {
          prod.stock = Math.max(0, prod.stock - item.quantity);
          prod.salesCount = (prod.salesCount || 0) + item.quantity;
          if (prod.stock < 5) {
            lowStockAlertsTriggered.push(`${prod.name} (Only ${prod.stock} left!)`);
          }
        }
      });

      // Update customer total spend
      const customer = db.customers.find(c => c.id === session.customerId || c.bookingId === session.bookingId);
      if (customer) {
        customer.totalSpend = Math.round((customer.totalSpend + totalAmount) * 100) / 100;
        if (session.items.length > 0) {
          customer.favoriteItem = session.items[0].name;
        }
      }

      const finalInvoice = {
        invoiceNumber: "INV-" + Date.now().toString().slice(-6),
        customerId: session.customerId,
        bookingId: session.bookingId,
        customerName: session.customerName,
        customerEmail: session.email,
        customerPhone: session.phone || "+1 555-0199",
        paypalTransactionId: paypalTxnId,
        paypalOrderId: "PP-ORD-" + Date.now().toString().slice(-8),
        date: new Date().toLocaleDateString(),
        time: new Date().toLocaleTimeString(),
        items: JSON.parse(JSON.stringify(session.items)),
        subtotal: session.subtotal,
        tax: session.tax,
        discount: session.discount,
        grandTotal: session.grandTotal,
        paymentStatus: "PAID_VIA_PAYPAL_AUTOPAY"
      };

      db.transactions.unshift(finalInvoice);

      // Trigger ESP32 Exit Gate (Turns Blue LED ON & plays 3-Tone Victory Chime)
      triggerHardware("OPEN_EXIT_GATE", {
        amount: totalAmount,
        txnId: paypalTxnId,
        customer: session.customerName
      });

      // Remove this customer's session; other shoppers remain in store!
      db.activeSessions = db.activeSessions.filter(s => s.sessionId !== session.sessionId);
      const remainingShoppersCount = db.activeSessions.length;

      const exitNotice = `Amount of $${totalAmount.toFixed(2)} USD Paid via PayPal! Exit Gate UNLOCKED. Now you may exit the shop. Safe travels, ${session.customerName}! (${remainingShoppersCount} shopper${remainingShoppersCount === 1 ? '' : 's'} remaining in store)`;
      addLog("PAYPAL_API", exitNotice, "success");
      pushCustomerNotification("CHECKOUT", "Payment Completed • Exit Gate Unlocked", exitNotice);

      if (lowStockAlertsTriggered.length > 0) {
        addLog("INVENTORY_ALERT", `⚠️ LOW STOCK WARNING: ${lowStockAlertsTriggered.join(", ")}`, "warning");
      }

      // Mark session complete
      session.status = "COMPLETED";
      broadcast("sessions_updated", db.activeSessions);
      broadcast("session_updated", db.activeSessions[db.activeSessions.length - 1] || null);
      broadcast("payment_completed", finalInvoice);
      broadcast("products_updated", db.products);
      broadcast("customers_updated", db.customers);
      broadcast("occupancy_updated", {
        current: db.activeSessions.length,
        max: db.storeConfig.maxCapacity,
        percentage: Math.min(100, Math.round((db.activeSessions.length / db.storeConfig.maxCapacity) * 100))
      });

      return sendJson(res, 200, {
        success: true,
        message: exitNotice,
        invoice: finalInvoice,
        remainingShoppers: remainingShoppersCount,
        activeSessions: db.activeSessions
      });
    } catch (e) {
      return sendJson(res, 400, { success: false, error: e.message });
    }
  }

  // --- 7. SECURE SHOP OWNER PORTAL APIs ---

  // Owner Login PIN Check (PIN: 8899)
  if (pathname === '/api/owner/login' && method === 'POST') {
    try {
      const body = await parseJson(req);
      const { pin } = body;
      if (pin === db.ownerConfig.pin) {
        addLog("OWNER_PORTAL", "Store Owner authenticated successfully.", "info");
        return sendJson(res, 200, {
          success: true,
          authenticated: true,
          owner: { name: db.ownerConfig.name, storeId: db.ownerConfig.storeId, storeName: db.ownerConfig.storeName }
        });
      } else {
        addLog("OWNER_PORTAL", "Failed store owner PIN attempt.", "warning");
        return sendJson(res, 401, { success: false, message: "Invalid Owner PIN! Default demo PIN is 8899." });
      }
    } catch (e) {
      return sendJson(res, 400, { success: false, error: e.message });
    }
  }

  // Owner Analytics Data (Best selling, lowest selling, category distribution, revenue)
  if (pathname === '/api/owner/analytics' && method === 'GET') {
    // Sort products by salesCount
    const sorted = [...db.products].sort((a, b) => (b.salesCount || 0) - (a.salesCount || 0));
    const topSold = sorted.slice(0, 5);
    const lowSold = [...sorted].reverse().slice(0, 5);

    // Group sales by category
    const categoryTotals = {};
    db.products.forEach(p => {
      categoryTotals[p.category] = (categoryTotals[p.category] || 0) + (p.salesCount || 0);
    });

    // Total store revenue
    let totalRevenue = 0;
    db.transactions.forEach(t => { totalRevenue += t.grandTotal; });

    // Low stock items (< 5)
    const lowStockItems = db.products.filter(p => p.stock < 5);

    return sendJson(res, 200, {
      topSold,
      lowSold,
      categoryTotals,
      totalRevenue: Math.round(totalRevenue * 100) / 100,
      totalOrders: db.transactions.length,
      lowStockItems,
      lowStockCount: lowStockItems.length,
      activeShoppersCount: db.activeSessions.length,
      maxCapacity: db.storeConfig.maxCapacity,
      alarmActive: db.storeConfig.alarmActive,
      securityLogsCount: db.securityLogs.length,
      securityLogs: db.securityLogs.slice(0, 10),
      occupancy: {
        current: db.activeSessions.length,
        max: db.storeConfig.maxCapacity,
        percentage: Math.min(100, Math.round((db.activeSessions.length / db.storeConfig.maxCapacity) * 100))
      },
      activeShoppers: db.activeSessions.map(s => ({
        sessionId: s.sessionId,
        name: s.customerName,
        id: s.customerId,
        bookingId: s.bookingId,
        tier: s.tier,
        itemCount: s.items.length,
        grandTotal: s.grandTotal,
        checkInTime: s.checkInTime
      }))
    });
  }

  // Owner Action: Restock Quantity
  if (pathname === '/api/owner/restock' && method === 'POST') {
    try {
      const body = await parseJson(req);
      const { barcode, addQuantity } = body;
      const product = db.products.find(p => p.barcode === barcode);
      if (!product) return sendJson(res, 404, { success: false, message: "Product not found" });

      product.stock += parseInt(addQuantity, 10) || 10;
      addLog("INVENTORY", `Owner restocked [${product.name}]. New stock: ${product.stock} units.`, "success");
      broadcast("products_updated", db.products);

      return sendJson(res, 200, { success: true, message: `Restocked ${product.name}! Stock is now ${product.stock}.`, product });
    } catch (e) {
      return sendJson(res, 400, { success: false, error: e.message });
    }
  }

  // Owner Action: Apply Time-Limited Flash Discount
  if (pathname === '/api/owner/discount' && method === 'POST') {
    try {
      const body = await parseJson(req);
      const { barcode, discountPercent, durationMinutes = 60 } = body;
      const product = db.products.find(p => p.barcode === barcode);
      if (!product) return sendJson(res, 404, { success: false, message: "Product not found" });

      product.discountPercent = parseInt(discountPercent, 10) || 0;
      if (product.discountPercent > 0) {
        product.discountEndsAt = Date.now() + (parseInt(durationMinutes, 10) * 60000);
      } else {
        product.discountEndsAt = null;
      }

      addLog("DISCOUNT", `Owner set ${product.discountPercent}% Flash Discount on [${product.name}] for ${durationMinutes} mins!`, "success");
      broadcast("products_updated", db.products);

      return sendJson(res, 200, { 
        success: true, 
        message: `${product.discountPercent}% discount applied to ${product.name}!`,
        product 
      });
    } catch (e) {
      return sendJson(res, 400, { success: false, error: e.message });
    }
  }

  // Owner Action: Delete Product (Owner Exclusive)
  if (pathname === '/api/owner/delete-product' && method === 'POST') {
    try {
      const body = await parseJson(req);
      const { barcode } = body;
      const idx = db.products.findIndex(p => p.barcode === barcode);
      if (idx === -1) return sendJson(res, 404, { success: false, message: "Product not found" });

      const removed = db.products.splice(idx, 1)[0];
      addLog("CATALOG", `Owner deleted product [${removed.name}] from store.`, "warning");
      broadcast("products_updated", db.products);

      return sendJson(res, 200, { success: true, message: `Removed ${removed.name} from catalog!`, products: db.products });
    } catch (e) {
      return sendJson(res, 400, { success: false, error: e.message });
    }
  }

  // Owner Action: Frequent Customers / VIP Directory
  if (pathname === '/api/owner/frequent-customers' && method === 'GET') {
    // Sort customers by visitCount descending
    const sorted = [...db.customers].sort((a, b) => b.visitCount - a.visitCount);
    return sendJson(res, 200, sorted);
  }

  // Add Product (Owner or Authorized User)
  if (pathname === '/api/products/add' && method === 'POST') {
    try {
      const body = await parseJson(req);
      const { name, price, category = "General", barcode, icon = "📦", initialStock = 15 } = body;

      if (!name || !price || !barcode) {
        return sendJson(res, 400, { success: false, message: "Name, price, and barcode are required!" });
      }

      const existing = db.products.find(p => p.barcode === barcode.trim());
      if (existing) {
        existing.name = name;
        existing.price = parseFloat(price);
        existing.category = category;
        existing.icon = icon;
      } else {
        db.products.push({
          barcode: barcode.trim(),
          name,
          price: parseFloat(price),
          category,
          icon,
          stock: parseInt(initialStock, 10) || 15,
          salesCount: 0,
          discountPercent: 0,
          discountEndsAt: null
        });
      }

      addLog("CATALOG", `Product added/updated: [${name}] ($${parseFloat(price).toFixed(2)}) with barcode [${barcode}]`, "success");
      broadcast("products_updated", db.products);

      return sendJson(res, 200, { success: true, message: `Product "${name}" saved to catalog!`, products: db.products });
    } catch (e) {
      return sendJson(res, 400, { success: false, error: e.message });
    }
  }

  // Digital Receipt Dispatch
  if (pathname === '/api/receipt/send' && method === 'POST') {
    try {
      const body = await parseJson(req);
      const { invoiceNumber, channel = "WHATSAPP", recipient } = body;

      const invoice = db.transactions.find(t => t.invoiceNumber === invoiceNumber) || db.transactions[0];
      if (!invoice) return sendJson(res, 404, { success: false, message: "Invoice not found!" });

      addLog("RECEIPT_DISPATCH", `Digital Tax Receipt sent via ${channel} to ${recipient || invoice.customerEmail} for [${invoice.invoiceNumber}]`, "success");
      return sendJson(res, 200, { success: true, channel, invoice });
    } catch (e) {
      return sendJson(res, 400, { success: false, error: e.message });
    }
  }

  // --- 8. ANTI-THEFT & SHOPLIFTING SECURITY ALARM SYSTEM ---

  // Trigger Anti-Theft Shoplifting Alarm (Unpaid Cart Exit or Barrier Breach)
  if (pathname === '/api/security/trigger-alarm' && method === 'POST') {
    try {
      const body = await parseJson(req);
      const { reason = "UNPAID_CART_EXIT_BREACH", customerId, bookingId, sessionId } = body;

      const targetId = sessionId || bookingId || customerId;
      const session = findSession(targetId);

      const stolenItems = session && session.items.length > 0 
        ? session.items.map(i => `${i.quantity}x ${i.name} ($${(i.price * i.quantity).toFixed(2)})`)
        : ["Attempted Unauthorized Perimeter Barrier Breach"];
      const unpaidAmount = session ? session.grandTotal : 0.00;
      const violatorName = session ? session.customerName : "Unregistered Intruder";
      const violatorId = session ? session.customerId : (targetId || "UNKNOWN-SHOPPER");

      const incident = {
        id: "SEC-INC-" + Date.now().toString().slice(-5),
        time: new Date().toLocaleTimeString(),
        date: new Date().toLocaleDateString(),
        customerName: violatorName,
        customerId: violatorId,
        bookingId: session ? session.bookingId : "N/A",
        reason: reason === "UNPAID_CART_EXIT_BREACH"
          ? "Unpaid Cart Exit Breach: Attempted barrier crossing without PayPal settlement"
          : "Perimeter Barrier Tamper / Unauthorized Gate Breach",
        unpaidItems: stolenItems,
        unpaidTotal: unpaidAmount,
        status: "BLOCKED_LOCKDOWN",
        actionTaken: "Electromagnetic Solenoid Deadbolted • Siren Sounding • Incident Logged"
      };

      db.securityLogs.unshift(incident);
      if (db.securityLogs.length > 50) db.securityLogs.pop();
      db.storeConfig.alarmActive = true;

      // Trigger ESP32 Buzzer & GPIO 2 Emergency Strobe
      triggerHardware("ALARM_THEFT", { incident });

      const alertMsg = `🚨 SECURITY ALERT: Shoplifting breach intercepted! ${violatorName} attempted exit with $${unpaidAmount.toFixed(2)} in unpaid goods. Gate deadbolted!`;
      addLog("SECURITY_ALARM", alertMsg, "error");
      pushCustomerNotification("ALERT", "🚨 SECURITY ALARM ACTIVE", `Exit blocked! Please pay $${unpaidAmount.toFixed(2)} via PayPal Auto-Pay to release gate.`);

      broadcast("security_alarm", { incident, alarmActive: true });
      broadcast("security_logs_updated", db.securityLogs);

      return sendJson(res, 200, {
        success: true,
        alarm: true,
        incident,
        message: alertMsg
      });
    } catch (e) {
      return sendJson(res, 400, { success: false, error: e.message });
    }
  }

  // Disarm / Reset Anti-Theft Security Alarm
  if (pathname === '/api/security/reset-alarm' && method === 'POST') {
    db.storeConfig.alarmActive = false;
    db.hardwareState.entryGate = "CLOSED";
    db.hardwareState.exitGate = "CLOSED";
    db.hardwareState.buzzerTrigger = null;

    addLog("SECURITY", "Store Security Alarm disarmed by Store Owner. Normal standby restored.", "info");
    pushCustomerNotification("WELCOME", "Security Perimeter Cleared", "Store gates and sensors returned to normal standby.");

    broadcast("security_alarm_cleared", { alarmActive: false });
    broadcast("hardware_update", { command: null, state: db.hardwareState });

    return sendJson(res, 200, {
      success: true,
      alarmActive: false,
      message: "Security alarm disarmed. Gates in normal operational standby."
    });
  }

  // Fetch Security Incident Logs
  if (pathname === '/api/security/logs' && method === 'GET') {
    return sendJson(res, 200, {
      alarmActive: db.storeConfig.alarmActive,
      logs: db.securityLogs
    });
  }

  // Get Store Occupancy & Capacity Status
  if (pathname === '/api/store/occupancy' && method === 'GET') {
    return sendJson(res, 200, {
      current: db.activeSessions.length,
      max: db.storeConfig.maxCapacity,
      percentage: Math.min(100, Math.round((db.activeSessions.length / db.storeConfig.maxCapacity) * 100)),
      isFull: db.activeSessions.length >= db.storeConfig.maxCapacity,
      activeShoppers: db.activeSessions.map(s => s.customerName)
    });
  }

  // Update Store Max Capacity (Owner Config)
  if (pathname === '/api/owner/capacity' && method === 'POST') {
    try {
      const body = await parseJson(req);
      const newCapacity = parseInt(body.maxCapacity, 10);
      if (newCapacity && newCapacity >= 1 && newCapacity <= 20) {
        db.storeConfig.maxCapacity = newCapacity;
        addLog("OWNER_CONFIG", `Store max shopper capacity updated to ${newCapacity} concurrent shoppers.`, "info");
        broadcast("occupancy_updated", {
          current: db.activeSessions.length,
          max: db.storeConfig.maxCapacity,
          percentage: Math.min(100, Math.round((db.activeSessions.length / db.storeConfig.maxCapacity) * 100))
        });
        return sendJson(res, 200, { success: true, maxCapacity: db.storeConfig.maxCapacity });
      } else {
        return sendJson(res, 400, { success: false, message: "Capacity must be between 1 and 20." });
      }
    } catch (e) {
      return sendJson(res, 400, { success: false, error: e.message });
    }
  }

  // Hardware Poll for ESP32
  if (pathname === '/api/esp32/poll' && method === 'GET') {
    db.hardwareState.lastEsp32Ping = Date.now();
    let nextCmd = db.hardwareQueue.shift() || null;
    if (!nextCmd && db.storeConfig.alarmActive) {
      nextCmd = { id: Date.now(), action: "ALARM_THEFT", timestamp: Date.now() };
    }
    broadcast("esp32_heartbeat", { lastPing: Date.now() });
    const shopperNames = db.activeSessions.map(s => s.customerName).join(", ");
    return sendJson(res, 200, {
      hasCommand: nextCmd !== null,
      command: nextCmd,
      state: db.hardwareState,
      alarmActive: db.storeConfig.alarmActive,
      activeCustomer: shopperNames || (db.activeSession ? db.activeSession.customerName : null),
      activeShopperCount: db.activeSessions.length
    });
  }

  if (pathname === '/api/esp32/status' && method === 'GET') {
    const isOnline = (Date.now() - (db.hardwareState.lastEsp32Ping || 0)) < 4500;
    return sendJson(res, 200, {
      online: isOnline,
      lastPingAgoMs: Date.now() - (db.hardwareState.lastEsp32Ping || 0)
    });
  }

  // Reset Demo State
  if (pathname === '/api/reset' && method === 'POST') {
    db.activeSessions = [];
    db.hardwareQueue = [];
    db.storeConfig.alarmActive = false;
    db.hardwareState = {
      entryGate: "CLOSED",
      exitGate: "CLOSED",
      buzzerTrigger: null,
      lastActionTime: Date.now(),
      lastEsp32Ping: Date.now()
    };
    addLog("SYSTEM", "System state reset: all active shopping sessions cleared.", "info");
    broadcast("sessions_updated", []);
    broadcast("session_updated", null);
    broadcast("security_alarm_cleared", { alarmActive: false });
    broadcast("occupancy_updated", {
      current: 0,
      max: db.storeConfig.maxCapacity,
      percentage: 0
    });
    broadcast("hardware_update", { command: null, state: db.hardwareState });
    return sendJson(res, 200, { success: true, message: "System reset completed." });
  }

  // Catalog / Data Queries
  if (pathname === '/api/products' && method === 'GET') return sendJson(res, 200, db.products);
  if (pathname === '/api/customers' && method === 'GET') return sendJson(res, 200, db.customers);
  if (pathname === '/api/session/active' && method === 'GET') {
    const targetId = reqUrl.searchParams.get('id') || reqUrl.searchParams.get('customerId') || reqUrl.searchParams.get('bookingId');
    const sess = findSession(targetId);
    return sendJson(res, 200, { activeSession: sess, activeSessions: db.activeSessions });
  }
  if (pathname === '/api/sessions/active' && method === 'GET') {
    return sendJson(res, 200, { activeSessions: db.activeSessions, count: db.activeSessions.length });
  }

  // Serve Frontend Static Assets
  let filePath = path.join(PUBLIC_DIR, pathname === '/' ? 'index.html' : pathname);

  fs.stat(filePath, (err, stats) => {
    if (err || !stats.isFile()) {
      filePath = path.join(PUBLIC_DIR, 'index.html');
    }

    const ext = path.extname(filePath).toLowerCase();
    const mimeTypes = {
      '.html': 'text/html; charset=utf-8',
      '.css': 'text/css; charset=utf-8',
      '.js': 'application/javascript; charset=utf-8',
      '.json': 'application/json',
      '.png': 'image/png',
      '.svg': 'image/svg+xml'
    };

    const contentType = mimeTypes[ext] || 'application/octet-stream';
    fs.readFile(filePath, (readErr, content) => {
      if (readErr) {
        res.writeHead(500, { 'Content-Type': 'text/plain' });
        return res.end('500 Internal Error');
      }
      res.writeHead(200, { 'Content-Type': contentType });
      res.end(content);
    });
  });
});

server.on('error', (err) => {
  if (err.code === 'EADDRINUSE') {
    console.log(`\n[NOTE] Port ${PORT} is already running in another window.`);
    console.log(`Open http://localhost:${PORT} in your browser directly.\n`);
  } else {
    console.error("Server error:", err);
  }
});

function getLocalIpAddresses() {
  const interfaces = os.networkInterfaces();
  const addresses = [];
  for (const name of Object.keys(interfaces)) {
    for (const iface of interfaces[name]) {
      if (iface.family === 'IPv4' && !iface.internal) {
        addresses.push({ name, ip: iface.address });
      }
    }
  }
  return addresses;
}

server.listen(PORT, '0.0.0.0', () => {
  const localIps = getLocalIpAddresses();
  const wifiIface = localIps.find(i => /wi-fi|wireless|wlan/i.test(i.name)) || localIps[0] || { ip: '127.0.0.1' };

  console.log(`=================================================================`);
  console.log(`  🚀 PayPal IoT Autonomous Retail & Auto-Billing System Running `);
  console.log(`=================================================================`);
  console.log(`  💻 LAPTOP BROWSER : http://localhost:${PORT}`);
  console.log(`  📱 MOBILE PHONE   : http://${wifiIface.ip}:${PORT}`);
  console.log(`  🔐 OWNER PIN      : 8899`);
  console.log(`  🔌 ESP32 POLL URL : http://${wifiIface.ip}:${PORT}/api/esp32/poll`);
  console.log(`-----------------------------------------------------------------`);
  if (localIps.length > 1) {
    console.log(`  All detected IP addresses on this laptop:`);
    localIps.forEach(i => console.log(`   • ${i.name.padEnd(20)}: http://${i.ip}:${PORT}`));
    console.log(`-----------------------------------------------------------------`);
  }
  console.log(`  👉 HOW TO CONNECT YOUR MOBILE PHONE & ESP32:`);
  console.log(`     1. Ensure your phone and ESP32 are connected to the SAME Wi-Fi or Hotspot`);
  console.log(`     2. On your phone's browser, open: http://${wifiIface.ip}:${PORT}`);
  console.log(`=================================================================\n`);
});

module.exports = server;
