/**
 * PayPal IoT Auto-Billing & Smart Store Management System
 * Dual Portal Controller: Customer Self-Checkout Kiosk & Protected Store Owner Portal
 */

// ==========================================================================
// 1. SOUND SYNTHESIZER (Simulates Physical Hardware Buzzer)
// ==========================================================================
const audioCtx = new (window.AudioContext || window.webkitAudioContext)();

function playBuzzerTone(type) {
  try {
    if (audioCtx.state === 'suspended') audioCtx.resume();
    const now = audioCtx.currentTime;

    if (type === 'SCAN_BEEP' || type === 'ITEM_ADD') {
      // 1 Short high-pitch chirp (1800Hz, 90ms)
      const osc = audioCtx.createOscillator();
      const gain = audioCtx.createGain();
      osc.connect(gain);
      gain.connect(audioCtx.destination);
      osc.frequency.setValueAtTime(1800, now);
      gain.gain.setValueAtTime(0.2, now);
      gain.gain.exponentialRampToValueAtTime(0.01, now + 0.09);
      osc.start(now);
      osc.stop(now + 0.09);
      updateHwMonitor("1x Short Chirp (1800 Hz)");
    } 
    else if (type === 'ITEM_REMOVE') {
      // 2 Quick warning chirps (900Hz)
      [0, 100].forEach(delay => {
        setTimeout(() => {
          const osc = audioCtx.createOscillator();
          const gain = audioCtx.createGain();
          osc.connect(gain);
          gain.connect(audioCtx.destination);
          osc.frequency.setValueAtTime(900, audioCtx.currentTime);
          gain.gain.setValueAtTime(0.25, audioCtx.currentTime);
          gain.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.08);
          osc.start(audioCtx.currentTime);
          osc.stop(audioCtx.currentTime + 0.08);
        }, delay);
      });
      updateHwMonitor("2x Warning Beeps (900 Hz)");
    }
    else if (type === 'GATE_OPEN' || type === 'ENTRY_OPEN') {
      // 2 Upward mid beeps (1000Hz -> 1400Hz)
      [1000, 1400].forEach((freq, idx) => {
        setTimeout(() => {
          const osc = audioCtx.createOscillator();
          const gain = audioCtx.createGain();
          osc.connect(gain);
          gain.connect(audioCtx.destination);
          osc.frequency.setValueAtTime(freq, audioCtx.currentTime);
          gain.gain.setValueAtTime(0.25, audioCtx.currentTime);
          gain.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.12);
          osc.start(audioCtx.currentTime);
          osc.stop(audioCtx.currentTime + 0.12);
        }, idx * 140);
      });
      updateHwMonitor("2x Gate Open Chimes (1000-1400 Hz)");
    } 
    else if (type === 'PAYMENT_SUCCESS' || type === 'EXIT_OPEN') {
      // PayPal Victory Melody (Major Arpeggio: C5 - E5 - G5 - C6)
      [523.25, 659.25, 783.99, 1046.50].forEach((freq, idx) => {
        setTimeout(() => {
          const osc = audioCtx.createOscillator();
          const gain = audioCtx.createGain();
          osc.connect(gain);
          gain.connect(audioCtx.destination);
          osc.type = 'triangle';
          osc.frequency.setValueAtTime(freq, audioCtx.currentTime);
          gain.gain.setValueAtTime(0.3, audioCtx.currentTime);
          gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.35);
          osc.start(audioCtx.currentTime);
          osc.stop(audioCtx.currentTime + 0.35);
        }, idx * 110);
      });
      updateHwMonitor("3x PayPal Victory Chimes (523 - 1046 Hz)");
    }
    else if (type === 'ERROR') {
      // 1 Long Low Error Buzz (380Hz, 400ms)
      const osc = audioCtx.createOscillator();
      const gain = audioCtx.createGain();
      osc.connect(gain);
      gain.connect(audioCtx.destination);
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(380, now);
      gain.gain.setValueAtTime(0.3, now);
      gain.gain.exponentialRampToValueAtTime(0.01, now + 0.4);
      osc.start(now);
      osc.stop(now + 0.4);
      updateHwMonitor("1x Long Low Buzz (380 Hz ERROR)");
    }
    else if (type === 'ALARM_THEFT' || type === 'ALARM') {
      // Alternating Emergency Police / Anti-Theft Siren (900Hz <-> 1300Hz in 6 alternating bursts)
      const pitches = [900, 1300, 900, 1300, 900, 1300];
      pitches.forEach((f, i) => {
        setTimeout(() => {
          try {
            const osc = audioCtx.createOscillator();
            const gain = audioCtx.createGain();
            osc.connect(gain);
            gain.connect(audioCtx.destination);
            osc.type = 'sawtooth';
            osc.frequency.setValueAtTime(f, audioCtx.currentTime);
            gain.gain.setValueAtTime(0.35, audioCtx.currentTime);
            gain.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.16);
            osc.start(audioCtx.currentTime);
            osc.stop(audioCtx.currentTime + 0.16);
          } catch(e) {}
        }, i * 160);
      });
      updateHwMonitor("🚨 SIREN: Anti-Theft Siren Alarm (900-1300 Hz)");
    }
  } catch(e) {
    console.warn("Audio Context sound error:", e);
  }
}

function updateHwMonitor(buzzerTxt, servoTxt = null) {
  const hwBuzzer = document.getElementById('hwBuzzerText');
  const hwServo = document.getElementById('hwServoText');
  if (buzzerTxt && hwBuzzer) hwBuzzer.textContent = buzzerTxt;
  if (servoTxt && hwServo) hwServo.textContent = servoTxt;
}

// ==========================================================================
// 2. LIGHTWEIGHT SVG QR CODE GENERATOR (Zero Dependencies)
// ==========================================================================
function generateQRCodeSVG(text, size = 180) {
  const hash = Array.from(text).reduce((acc, char) => (acc * 31 + char.charCodeAt(0)) | 0, 0);
  const matrixSize = 21;
  const cellSize = size / matrixSize;

  let rects = '';

  const drawFinder = (startX, startY) => {
    for (let r = 0; r < 7; r++) {
      for (let c = 0; c < 7; c++) {
        if (r === 0 || r === 6 || c === 0 || c === 6 || (r >= 2 && r <= 4 && c >= 2 && c <= 4)) {
          rects += `<rect x="${(startX + c) * cellSize}" y="${(startY + r) * cellSize}" width="${cellSize}" height="${cellSize}" fill="#003087" />`;
        }
      }
    }
  };

  drawFinder(0, 0);
  drawFinder(14, 0);
  drawFinder(0, 14);

  let bitIndex = 0;
  for (let r = 0; r < matrixSize; r++) {
    for (let c = 0; c < matrixSize; c++) {
      const inTL = r < 8 && c < 8;
      const inTR = r < 8 && c >= 13;
      const inBL = r >= 13 && c < 8;
      if (inTL || inTR || inBL) continue;

      const pseudoBit = ((hash >> (bitIndex % 31)) & 1) ^ (((r * 7 + c * 13) % 2) === 0);
      bitIndex++;

      if (pseudoBit) {
        rects += `<rect x="${c * cellSize}" y="${r * cellSize}" width="${cellSize}" height="${cellSize}" fill="#0f172a" />`;
      }
    }
  }

  return `<svg width="${size}" height="${size}" viewBox="0 0 ${size} ${size}" xmlns="http://www.w3.org/2000/svg" style="background:#ffffff; padding:4px; border-radius:6px;">${rects}</svg>`;
}

// ==========================================================================
// 3. GLOBAL STATE & INITIALIZATION
// ==========================================================================
let currentScanMode = 'ADD'; // 'ADD' or 'REMOVE'
let productsList = [];
let activeSessionsList = []; // Concurrent shoppers currently in store
let activeSession = null;    // Focused customer session
let selectedShopperId = null; // ID of focused shopper
let latestInvoice = null;
let currentDispatchAction = null;
let isOwnerAuthenticated = false;

// Format price with discount helper
function getProductPriceDetails(p) {
  const isDiscountActive = p.discountPercent > 0 && (!p.discountEndsAt || p.discountEndsAt > Date.now());
  const effectivePrice = isDiscountActive ? Math.round(p.price * (1 - p.discountPercent / 100) * 100) / 100 : p.price;
  return {
    isDiscountActive,
    effectivePrice,
    originalPrice: p.price,
    discountPercent: p.discountPercent,
    discountEndsAt: p.discountEndsAt
  };
}

// ==========================================================================
// 4. PORTAL ROLE SWITCHER & AUTHENTICATION (PIN: 8899)
// ==========================================================================
window.switchPortal = (role) => {
  const btnCustomer = document.getElementById('btnRoleCustomer');
  const btnOwner = document.getElementById('btnRoleOwner');
  const customerView = document.getElementById('customerPortalContainer');
  const ownerView = document.getElementById('ownerPortalContainer');

  if (role === 'customer') {
    btnCustomer.classList.add('active');
    btnOwner.classList.remove('active');
    customerView.style.display = 'block';
    ownerView.style.display = 'none';
  } else if (role === 'owner') {
    if (isOwnerAuthenticated) {
      btnCustomer.classList.remove('active');
      btnOwner.classList.add('active');
      customerView.style.display = 'none';
      ownerView.style.display = 'block';
      refreshOwnerDashboard();
    } else {
      // Prompt for Owner PIN
      openOwnerPinModal();
    }
  }
};

// ==========================================================================
// 4B. STEP-BY-STEP GUIDED CUSTOMER JOURNEY CONTROLLER
// ==========================================================================
let currentGuidedStep = 'entry'; // 'entry', 'shopping', 'exit', 'receipt'
let isGuidedMode = true;
let goodbyeAutoTimer = null;
let goodbyeSecondsLeft = 15;

window.setGuidedStep = function(step) {
  currentGuidedStep = step;

  const tabStore = document.getElementById('tab-store');
  if (tabStore) tabStore.setAttribute('data-guided-step', step);

  // Update Progress Tracker Buttons
  const stepBtns = {
    entry: document.getElementById('stepBtnEntry'),
    shopping: document.getElementById('stepBtnShopping'),
    exit: document.getElementById('stepBtnExit'),
    receipt: document.getElementById('stepBtnReceipt')
  };

  Object.keys(stepBtns).forEach(k => {
    if (stepBtns[k]) stepBtns[k].classList.remove('active', 'completed');
  });

  if (stepBtns[step]) stepBtns[step].classList.add('active');

  const order = ['entry', 'shopping', 'exit', 'receipt'];
  const curIdx = order.indexOf(step);
  for (let i = 0; i < curIdx; i++) {
    const prevKey = order[i];
    if (stepBtns[prevKey]) stepBtns[prevKey].classList.add('completed');
  }

  // Handle Stage Visibility
  const stages = {
    entry: document.getElementById('stageEntryView'),
    shopping: document.getElementById('stageShoppingView'),
    exit: document.getElementById('stageExitView'),
    receipt: document.getElementById('stageReceiptView')
  };

  if (isGuidedMode) {
    Object.keys(stages).forEach(k => {
      if (stages[k]) {
        stages[k].style.display = (k === step) ? 'block' : 'none';
      }
    });
  }

  syncStepUI(step);
};

window.toggleViewLayoutMode = function() {
  isGuidedMode = !isGuidedMode;
  const tabStore = document.getElementById('tab-store');
  const icon = document.getElementById('viewModeIcon');
  const label = document.getElementById('viewModeLabel');

  if (!isGuidedMode) {
    if (tabStore) tabStore.classList.add('layout-all-in-one');
    if (icon) icon.textContent = '▦';
    if (label) label.textContent = '3-Column Overview';
    const stages = ['stageEntryView', 'stageShoppingView', 'stageExitView', 'stageReceiptView'];
    stages.forEach(id => {
      const el = document.getElementById(id);
      if (el) el.style.display = 'block';
    });
  } else {
    if (tabStore) tabStore.classList.remove('layout-all-in-one');
    if (icon) icon.textContent = '✨';
    if (label) label.textContent = 'Guided Mode (Active)';
    window.setGuidedStep(currentGuidedStep);
  }
};

function syncStepUI(step) {
  const currentShopper = activeSessionsList.find(s => s.sessionId === selectedShopperId) || activeSession;

  if (currentShopper) {
    const welcomeName = document.getElementById('shoppingWelcomeName');
    if (welcomeName) {
      welcomeName.textContent = `Welcome inside, ${currentShopper.customerName}! (${currentShopper.tier || 'Member'} • Visit #${currentShopper.visitCount || 1})`;
    }

    const payTotal = document.getElementById('shoppingPayableTotal');
    if (payTotal) {
      payTotal.textContent = `$${(currentShopper.grandTotal || 0).toFixed(2)}`;
    }

    const sub = document.getElementById('stepShoppingSub');
    if (sub) {
      sub.textContent = `${currentShopper.customerName} ($${(currentShopper.grandTotal || 0).toFixed(2)})`;
    }
  }

  if (step === 'receipt') {
    startGoodbyeCountdown();
  } else {
    clearGoodbyeCountdown();
  }
}

function startGoodbyeCountdown() {
  clearGoodbyeCountdown();
  goodbyeSecondsLeft = 15;
  const countEl = document.getElementById('goodbyeCountdown');
  if (countEl) countEl.textContent = `${goodbyeSecondsLeft}s`;

  goodbyeAutoTimer = setInterval(() => {
    goodbyeSecondsLeft -= 1;
    if (countEl) countEl.textContent = `${goodbyeSecondsLeft}s`;
    if (goodbyeSecondsLeft <= 0) {
      clearGoodbyeCountdown();
      window.finishAndReturnToEntry();
    }
  }, 1000);
}

function clearGoodbyeCountdown() {
  if (goodbyeAutoTimer) {
    clearInterval(goodbyeAutoTimer);
    goodbyeAutoTimer = null;
  }
}

window.finishAndReturnToEntry = function() {
  clearGoodbyeCountdown();
  if (activeSessionsList.length > 0) {
    selectedShopperId = activeSessionsList[0].sessionId;
    window.setGuidedStep('shopping');
  } else {
    window.setGuidedStep('entry');
  }
};

function openOwnerPinModal() {
  const modal = document.getElementById('ownerPinModalOverlay');
  const input = document.getElementById('ownerPinInput');
  const err = document.getElementById('pinErrorMsg');
  modal.style.display = 'flex';
  input.value = '';
  err.style.display = 'none';
  setTimeout(() => input.focus(), 100);
}

window.closeOwnerPinModal = () => {
  document.getElementById('ownerPinModalOverlay').style.display = 'none';
};

window.submitOwnerPin = async () => {
  const pin = document.getElementById('ownerPinInput').value.trim();
  const err = document.getElementById('pinErrorMsg');

  try {
    const res = await fetch('/api/owner/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ pin })
    });
    const data = await res.json();

    if (data.success && data.authenticated) {
      isOwnerAuthenticated = true;
      document.getElementById('ownerPinModalOverlay').style.display = 'none';
      
      // Update Lock Badge
      const lockBadge = document.getElementById('ownerLockStatus');
      lockBadge.textContent = '🔓 UNLOCKED';
      lockBadge.style.color = '#34d399';

      // Switch to Owner View
      window.switchPortal('owner');
      showCustomerNotification('WELCOME', 'Owner Mode Activated', `Welcome Elena Vance! Store management dashboard unlocked.`);
    } else {
      err.style.display = 'block';
      err.textContent = data.message || '⚠️ Incorrect PIN! Please enter 8899.';
      playBuzzerTone('ERROR');
    }
  } catch (e) {
    console.error(e);
    err.style.display = 'block';
    err.textContent = 'Connection error checking owner credentials.';
  }
};

window.ownerLogout = () => {
  isOwnerAuthenticated = false;
  const lockBadge = document.getElementById('ownerLockStatus');
  lockBadge.textContent = '🔒 LOCKED';
  lockBadge.style.color = 'var(--pp-gold)';
  window.switchPortal('customer');
  showCustomerNotification('ALERT', 'Owner Logged Out', 'Switched back to Customer Self-Checkout Kiosk.');
};

// ==========================================================================
// 5. CUSTOMER NOTIFICATION TOAST STREAM
// ==========================================================================
function showCustomerNotification(type, title, message) {
  const banner = document.getElementById('customerNotifBanner');
  const icon = document.getElementById('notifIcon');
  const titleEl = document.getElementById('notifTitle');
  const msgEl = document.getElementById('notifMessage');
  const timeEl = document.getElementById('notifTime');

  if (!banner) return;

  const iconMap = {
    'WELCOME': '🚪',
    'SCAN': '🛍️',
    'CHECKOUT': '💳',
    'ALERT': '⚠️',
    'INFO': '💡'
  };

  icon.textContent = iconMap[type] || '💡';
  titleEl.textContent = title;
  msgEl.textContent = message;
  timeEl.textContent = new Date().toLocaleTimeString();

  // Subtle bounce animation
  banner.style.animation = 'none';
  banner.offsetHeight; // trigger reflow
  banner.style.animation = 'slideDownToast 0.4s cubic-bezier(0.16, 1, 0.3, 1)';
}

// ==========================================================================
// 6. CUSTOMER KIOSK NAVIGATION TABS & SCANNER MODES
// ==========================================================================
document.querySelectorAll('.nav-tab').forEach(tab => {
  tab.addEventListener('click', () => {
    document.querySelectorAll('.nav-tab').forEach(t => t.classList.remove('active'));
    document.querySelectorAll('.tab-pane').forEach(p => p.classList.remove('active'));
    tab.classList.add('active');
    const target = document.getElementById(tab.getAttribute('data-tab'));
    if (target) target.classList.add('active');
  });
});

const modeAddBtn = document.getElementById('modeAddBtn');
const modeRemoveBtn = document.getElementById('modeRemoveBtn');

modeAddBtn.addEventListener('click', () => {
  currentScanMode = 'ADD';
  modeAddBtn.classList.add('active');
  modeRemoveBtn.classList.remove('active');
});

modeRemoveBtn.addEventListener('click', () => {
  currentScanMode = 'REMOVE';
  modeRemoveBtn.classList.add('active');
  modeAddBtn.classList.remove('active');
});

window.setEntryQr = (code) => {
  document.getElementById('entryQrInput').value = code;
};

// Format remaining countdown time (e.g. 1h 24m or 34m 12s)
function formatTimeRemaining(ms) {
  if (ms <= 0) return "Expired";
  const totalSecs = Math.floor(ms / 1000);
  const hours = Math.floor(totalSecs / 3600);
  const mins = Math.floor((totalSecs % 3600) / 60);
  const secs = totalSecs % 60;
  if (hours > 0) return `${hours}h ${mins}m`;
  return `${mins}m ${secs}s`;
}

// ==========================================================================
// 7. RENDER PRODUCT SHELF & BARCODE CARDS (WITH FLASH DISCOUNTS & STOCKS)
// ==========================================================================
function renderProducts(products) {
  productsList = products;
  const shelf = document.getElementById('productShelfGrid');
  const printableGrid = document.getElementById('printableBarcodeGrid');
  if (!shelf || !printableGrid) return;

  shelf.innerHTML = '';
  printableGrid.innerHTML = '';

  let hasAnyFlashDiscounts = false;

  products.forEach(p => {
    const priceDetails = getProductPriceDetails(p);
    if (priceDetails.isDiscountActive) hasAnyFlashDiscounts = true;

    // Shelf item for simulator
    const el = document.createElement('div');
    el.className = 'product-shelf-item';
    
    // Low stock indicator
    const isLowStock = p.stock < 5;
    const stockPillHtml = isLowStock 
      ? `<span class="stock-pill low">⚠️ Only ${p.stock} left</span>`
      : `<span class="stock-pill healthy">Stock: ${p.stock}</span>`;

    // Price and Flash Discount badge
    let priceHtml = '';
    if (priceDetails.isDiscountActive) {
      const remainingMs = p.discountEndsAt - Date.now();
      priceHtml = `
        <div>
          <span class="price-struck">$${p.price.toFixed(2)}</span>
          <span class="p-price" style="color:#059669;">$${priceDetails.effectivePrice.toFixed(2)}</span>
        </div>
        <div style="display:flex; gap:4px; align-items:center;">
          <span class="flash-badge">⚡ ${p.discountPercent}% OFF</span>
          <span class="flash-countdown">${formatTimeRemaining(remainingMs)}</span>
        </div>
      `;
    } else {
      priceHtml = `<span class="p-price">$${p.price.toFixed(2)}</span>`;
    }

    el.innerHTML = `
      <div class="p-top">
        <span class="p-icon">${p.icon}</span>
        <div style="flex:1;">
          <div class="p-name">${p.name}</div>
          <div style="font-size:0.68rem; color:var(--text-dim);">${p.category}</div>
        </div>
        ${stockPillHtml}
      </div>
      <div class="p-bottom" style="margin-top: 8px;">
        ${priceHtml}
        <span class="p-code">${p.barcode}</span>
      </div>
    `;

    el.addEventListener('click', () => triggerBarcodeScan(p.barcode));
    shelf.appendChild(el);

    // Printable card for demo table
    const card = document.createElement('div');
    card.className = 'barcode-card';
    card.innerHTML = `
      <div style="font-size:24px;">${p.icon}</div>
      <div class="bc-name">${p.name}</div>
      <div class="bc-price">${priceDetails.isDiscountActive ? `<span class="price-struck">$${p.price.toFixed(2)}</span> $${priceDetails.effectivePrice.toFixed(2)}` : `$${p.price.toFixed(2)}`}</div>
      ${priceDetails.isDiscountActive ? `<div class="flash-badge" style="margin: 2px auto;">⚡ ${p.discountPercent}% OFF</div>` : ''}
      <div class="barcode-mock-bars">|||| ||||| |||||||</div>
      <div class="bc-number">${p.barcode}</div>
      <button class="btn btn-secondary btn-sm" onclick="triggerBarcodeScan('${p.barcode}')">Simulate Scan</button>
    `;
    printableGrid.appendChild(card);
  });

  const flashIndicator = document.getElementById('activeDiscountsBanner');
  if (flashIndicator) {
    flashIndicator.style.display = hasAnyFlashDiscounts ? 'flex' : 'none';
  }

  // Update Owner Inventory Table if owner portal is currently visible
  if (isOwnerAuthenticated) {
    renderOwnerInventoryTable(products);
  }
}

// Live timer tick for flash sales (every 10 seconds)
setInterval(() => {
  if (productsList && productsList.length > 0) {
    renderProducts(productsList);
  }
}, 10000);

// ==========================================================================
// 8. MULTI-CUSTOMER CONCURRENT IN-STORE SHOPPERS & SEPARATE BILLS
// ==========================================================================

function syncShoppersUI(sessions) {
  activeSessionsList = sessions || [];

  const inStoreCountEl = document.getElementById('inStoreCount');
  if (inStoreCountEl) inStoreCountEl.textContent = activeSessionsList.length;

  // Sync Store Occupancy & Capacity Meter
  if (typeof updateOccupancyUI === 'function') {
    updateOccupancyUI({
      current: activeSessionsList.length,
      max: currentStoreCapacity,
      percentage: Math.min(100, Math.round((activeSessionsList.length / currentStoreCapacity) * 100))
    });
  }

  // If currently selected shopper left or is null, default to the latest shopper in store
  if (!selectedShopperId || !activeSessionsList.some(s => s.sessionId === selectedShopperId)) {
    selectedShopperId = activeSessionsList.length > 0 ? activeSessionsList[activeSessionsList.length - 1].sessionId : null;
  }

  // 1. Render Shopper Tab Pills in Customer Kiosk (Active Bill Column)
  const pillList = document.getElementById('shoppersPillList');
  if (pillList) {
    if (activeSessionsList.length === 0) {
      pillList.innerHTML = `<span class="no-shoppers-txt">Store is currently empty. Scan QR at Entry Gate to enter.</span>`;
    } else {
      pillList.innerHTML = '';
      activeSessionsList.forEach(s => {
        const isCurrent = s.sessionId === selectedShopperId;
        const pill = document.createElement('div');
        pill.className = `shopper-pill ${isCurrent ? 'active' : ''}`;
        pill.title = `Click to view bill for ${s.customerName} (${s.bookingId})`;
        pill.innerHTML = `
          <span class="pill-dot"></span>
          <span>👤 ${s.customerName}</span>
          <span class="pill-price">$${s.grandTotal.toFixed(2)}</span>
        `;
        pill.addEventListener('click', () => window.selectShopper(s.sessionId));
        pillList.appendChild(pill);
      });
    }
  }

  // 2. Render Scanner Target Dropdown (Column 2)
  const scannerSelect = document.getElementById('scannerShopperSelect');
  if (scannerSelect) {
    scannerSelect.innerHTML = '';
    if (activeSessionsList.length === 0) {
      scannerSelect.innerHTML = `<option value="">Awaiting customer entry at Gate...</option>`;
    } else {
      activeSessionsList.forEach(s => {
        const opt = document.createElement('option');
        opt.value = s.sessionId;
        opt.textContent = `👤 ${s.customerName} (${s.bookingId}) - $${s.grandTotal.toFixed(2)}`;
        if (s.sessionId === selectedShopperId) opt.selected = true;
        scannerSelect.appendChild(opt);
      });
    }
  }

  // 3. Render Exit Gate Customer Dropdown (Column 1)
  const exitSelect = document.getElementById('exitShopperSelect');
  if (exitSelect) {
    const currentExitVal = exitSelect.value;
    exitSelect.innerHTML = '';
    if (activeSessionsList.length === 0) {
      exitSelect.innerHTML = `<option value="">-- No Customers In Store --</option>`;
      const exitPriceEl = document.getElementById('exitPayablePrice');
      if (exitPriceEl) exitPriceEl.textContent = `$0.00`;
    } else {
      activeSessionsList.forEach(s => {
        const opt = document.createElement('option');
        opt.value = s.sessionId;
        opt.textContent = `👤 ${s.customerName} (${s.bookingId}) - Payable: $${s.grandTotal.toFixed(2)}`;
        if (s.sessionId === currentExitVal || s.sessionId === selectedShopperId) {
          opt.selected = true;
        }
        exitSelect.appendChild(opt);
      });
      // Update Exit Payable Price to match the selected exit shopper
      const activeExitSess = activeSessionsList.find(s => s.sessionId === exitSelect.value) || activeSessionsList[0];
      const exitPriceEl = document.getElementById('exitPayablePrice');
      if (exitPriceEl && activeExitSess) {
        exitPriceEl.textContent = `$${activeExitSess.grandTotal.toFixed(2)}`;
      }
    }
  }

  // 4. Render Owner Live Shopper Monitor (Owner Portal)
  renderOwnerLiveShoppers();

  // 5. Update the Active Bill View with the focused shopper's bill
  const currentFocused = activeSessionsList.find(s => s.sessionId === selectedShopperId) || null;
  updateBillUI(currentFocused);
}

window.selectShopper = (sessionId) => {
  selectedShopperId = sessionId;
  const sess = activeSessionsList.find(s => s.sessionId === sessionId) || null;
  updateBillUI(sess);

  // Sync pills highlight
  const pillList = document.getElementById('shoppersPillList');
  if (pillList) {
    const pills = pillList.querySelectorAll('.shopper-pill');
    activeSessionsList.forEach((s, idx) => {
      if (pills[idx]) {
        if (s.sessionId === selectedShopperId) pills[idx].classList.add('active');
        else pills[idx].classList.remove('active');
      }
    });
  }

  // Sync scanner select
  const scannerSelect = document.getElementById('scannerShopperSelect');
  if (scannerSelect) scannerSelect.value = sessionId;

  // Sync exit select
  const exitSelect = document.getElementById('exitShopperSelect');
  if (exitSelect) {
    exitSelect.value = sessionId;
    const exitPriceEl = document.getElementById('exitPayablePrice');
    if (exitPriceEl && sess) exitPriceEl.textContent = `$${sess.grandTotal.toFixed(2)}`;
  }
};

window.onScannerShopperChanged = (sessionId) => {
  window.selectShopper(sessionId);
};

window.onExitShopperChanged = (sessionId) => {
  const exitSess = activeSessionsList.find(s => s.sessionId === sessionId) || null;
  const exitPriceEl = document.getElementById('exitPayablePrice');
  if (exitPriceEl) {
    exitPriceEl.textContent = exitSess ? `$${exitSess.grandTotal.toFixed(2)}` : `$0.00`;
  }
};

function renderOwnerLiveShoppers() {
  const tbody = document.getElementById('ownerLiveShoppersTableBody');
  const badge = document.getElementById('ownerLiveShopperBadge');
  if (!tbody || !badge) return;

  badge.textContent = `${activeSessionsList.length} ACTIVE SHOPPER${activeSessionsList.length === 1 ? '' : 'S'}`;

  if (activeSessionsList.length === 0) {
    tbody.innerHTML = `<tr><td colspan="7" style="text-align:center; color:#94a3b8; padding:16px;">No customers currently inside the store.</td></tr>`;
    return;
  }

  tbody.innerHTML = '';
  activeSessionsList.forEach(s => {
    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td><strong>${s.customerName}</strong> <div style="font-size:0.7rem; color:var(--text-dim);">${s.customerId}</div></td>
      <td><code>${s.bookingId}</code></td>
      <td><span class="vip-badge gold">${s.tier || 'Member'}</span></td>
      <td>${s.checkInTime || 'Just Now'}</td>
      <td><strong>${s.items.length} items</strong></td>
      <td><strong style="color:var(--pp-navy); font-size:0.95rem;">$${s.grandTotal.toFixed(2)}</strong></td>
      <td>
        <button class="btn btn-secondary btn-sm" onclick="window.switchPortal('customer'); window.selectShopper('${s.sessionId}');">
          👁️ View Bill
        </button>
      </td>
    `;
    tbody.appendChild(tr);
  });
}

function updateBillUI(session) {
  activeSession = session;

  const custNameDisplay = document.getElementById('custNameDisplay');
  const custMetaDisplay = document.getElementById('custMetaDisplay');
  const custTierBadge = document.getElementById('custTierBadge');
  const custLoyaltyRow = document.getElementById('custLoyaltyRow');
  const custVisitCount = document.getElementById('custVisitCount');
  const custTotalSpent = document.getElementById('custTotalSpent');
  const topActivePassId = document.getElementById('topActivePassId');
  const activeCustomerTag = document.getElementById('activeCustomerTag');
  const billTableBody = document.getElementById('billTableBody');
  const billSubtotal = document.getElementById('billSubtotal');
  const billTax = document.getElementById('billTax');
  const promoRow = document.getElementById('promoRow');
  const billDiscount = document.getElementById('billDiscount');
  const billGrandTotal = document.getElementById('billGrandTotal');
  const exitPayablePrice = document.getElementById('exitPayablePrice');

  if (!session || session.status !== "SHOPPING") {
    custNameDisplay.textContent = "No Shopper In Store";
    custMetaDisplay.textContent = "Scan Pre-Booked QR at Entry Gate to begin";
    custTierBadge.style.display = "none";
    custLoyaltyRow.style.display = "none";
    topActivePassId.textContent = "None (Awaiting Scan)";
    activeCustomerTag.textContent = "NO ACTIVE USER";
    activeCustomerTag.style.color = "#94a3b8";

    billTableBody.innerHTML = `
      <div class="bill-empty">
        <div class="empty-icon">🛍️</div>
        <p>No items in cart</p>
        <span class="micro-text">Scan product barcodes in Step 3 to add to this bill.</span>
      </div>
    `;

    billSubtotal.textContent = "$0.00";
    billTax.textContent = "$0.00";
    promoRow.style.display = 'none';
    billGrandTotal.textContent = "$0.00";
    exitPayablePrice.textContent = "$0.00";
    const shoppingPayableTotal = document.getElementById('shoppingPayableTotal');
    if (shoppingPayableTotal) shoppingPayableTotal.textContent = "$0.00";
    const stepShoppingSub = document.getElementById('stepShoppingSub');
    if (stepShoppingSub) stepShoppingSub.textContent = "Goods in Stock";
    return;
  }

  // Active Recognized Customer Found
  custNameDisplay.textContent = session.customerName;
  custMetaDisplay.textContent = `ID: ${session.customerId || 'CUST-001'} • Pass: ${session.bookingId} • ${session.email}`;
  topActivePassId.textContent = `${session.customerName} (${session.bookingId})`;
  activeCustomerTag.textContent = `LINKED: ${session.bookingId}`;
  activeCustomerTag.style.color = "#0070ba";

  // Tier Badge
  const tier = session.tier || "Silver Member";
  custTierBadge.textContent = tier;
  custTierBadge.style.display = "inline-block";
  custTierBadge.className = "vip-badge";
  if (tier.includes("Platinum")) custTierBadge.classList.add("platinum");
  else if (tier.includes("Gold")) custTierBadge.classList.add("gold");
  else if (tier.includes("New")) custTierBadge.classList.add("new");
  else custTierBadge.classList.add("silver");

  // Loyalty Details
  custLoyaltyRow.style.display = "flex";
  custVisitCount.textContent = session.visitCount || 1;
  custTotalSpent.textContent = `$${(session.grandTotal || 0).toFixed(2)}`;

  // Items List
  if (!session.items || session.items.length === 0) {
    billTableBody.innerHTML = `
      <div class="bill-empty">
        <div class="empty-icon">🛒</div>
        <p>Cart is Empty</p>
        <span class="micro-text">Select products from the shelf to scan barcodes.</span>
      </div>
    `;
  } else {
    billTableBody.innerHTML = '';
    session.items.forEach(i => {
      const row = document.createElement('div');
      row.className = 'bill-row';
      row.innerHTML = `
        <div>
          <strong>${i.name}</strong>
          ${i.hasDiscount ? `<span class="flash-badge" style="font-size:0.6rem;">⚡ ${i.discountPercent}% OFF</span>` : ''}
          <div style="font-family:var(--font-mono); font-size:0.68rem; color:var(--text-dim);">${i.barcode}</div>
        </div>
        <div><strong>x${i.quantity}</strong></div>
        <div>$${i.price.toFixed(2)}</div>
        <div><strong style="color:var(--pp-navy);">$${(i.price * i.quantity).toFixed(2)}</strong></div>
      `;
      billTableBody.appendChild(row);
    });
  }

  billSubtotal.textContent = `$${(session.subtotal || 0).toFixed(2)}`;
  billTax.textContent = `$${(session.tax || 0).toFixed(2)}`;

  if (session.discount && session.discount > 0) {
    promoRow.style.display = 'flex';
    billDiscount.textContent = `-$${session.discount.toFixed(2)}`;
  } else {
    promoRow.style.display = 'none';
  }

  const grandTotalStr = `$${(session.grandTotal || 0).toFixed(2)}`;
  billGrandTotal.textContent = grandTotalStr;
  exitPayablePrice.textContent = grandTotalStr;
  const shoppingPayableTotal = document.getElementById('shoppingPayableTotal');
  if (shoppingPayableTotal) shoppingPayableTotal.textContent = grandTotalStr;
  const stepShoppingSub = document.getElementById('stepShoppingSub');
  if (stepShoppingSub) stepShoppingSub.textContent = `${session.customerName} (${grandTotalStr})`;
}

// Real-Time Log Appender
function appendLog(log) {
  const box = document.getElementById('logStreamBox');
  if (!box) return;
  const line = document.createElement('div');
  line.className = `log-line ${log.type || 'info'}`;
  line.innerHTML = `<span style="color:#64748b;">[${log.time || new Date().toLocaleTimeString()}]</span> <strong>[${log.source}]</strong> ${log.message}`;
  box.prepend(line);
}

// ==========================================================================
// 9. API CALLS: CUSTOMER SHOPPING FLOW
// ==========================================================================

// STEP 1: Pre-Booking Form Submit
window.submitBooking = async () => {
  const name = document.getElementById('bName').value;
  const email = document.getElementById('bEmail').value;
  const phone = document.getElementById('bPhone').value;
  const slot = document.getElementById('bSlot').value;

  try {
    const res = await fetch('/api/bookings/create', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ customerName: name, email, phone, slotTime: slot })
    });
    const data = await res.json();
    if (data.success) {
      playBuzzerTone('GATE_OPEN');
      displayPass(data.booking);
      showCustomerNotification('WELCOME', 'Booking Pass Confirmed', `Welcome ${data.booking.name}! Your Customer ID is ${data.booking.id}. QR pass ready.`);
      document.getElementById('entryQrInput').value = data.booking.bookingId;
    } else {
      alert(data.message || 'Booking failed');
    }
  } catch (e) {
    console.error(e);
  }
};

function displayPass(booking) {
  document.getElementById('passIdText').textContent = booking.bookingId;
  document.getElementById('passCustIdText').textContent = booking.id;
  document.getElementById('passHolderText').textContent = booking.name;
  document.getElementById('passEmailText').textContent = booking.email;
  document.getElementById('passSlotText').textContent = booking.slotTime || "Today: Next Available";

  const qrBox = document.getElementById('qrCanvasWrapper');
  qrBox.innerHTML = generateQRCodeSVG(booking.bookingId, 180);
}

// STEP 2: Scan QR at Entry Gate (Called by Button OR Optical Camera Scanner)
window.triggerEntryScan = async (qrCodeData) => {
  if (!qrCodeData) return { success: false, message: 'QR Code is empty' };
  try {
    const res = await fetch('/api/gate/entry', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ qrCodeData: qrCodeData.trim() })
    });
    const data = await res.json();
    if (data.success) {
      updateEspStatus(true);
      playBuzzerTone('GATE_OPEN');
      triggerGateAnimation('entry', true);
      selectedShopperId = data.session.sessionId;
      syncShoppersUI(data.activeSessions);
      showCustomerNotification('WELCOME', 'Door Unlocked!', data.message);
      // Automatically advance into the store (Goods in stock become visible!)
      if (typeof setGuidedStep === 'function') {
        setTimeout(() => {
          setGuidedStep('shopping');
        }, 600);
      }
      return { success: true, data };
    } else {
      playBuzzerTone('ERROR');
      showCustomerNotification('ALERT', 'Access Denied', data.message || 'QR validation failed');
      alert(data.message || 'QR validation failed');
      return { success: false, data };
    }
  } catch (e) {
    console.error(e);
    return { success: false, error: e };
  }
};

document.getElementById('btnScanEntry').addEventListener('click', async () => {
  const qrCodeData = document.getElementById('entryQrInput').value;
  await window.triggerEntryScan(qrCodeData);
});

// STEP 3 & 4: Barcode Scanning of Goods
window.triggerBarcodeScan = async (barcode) => {
  const scannerSelect = document.getElementById('scannerShopperSelect');
  const targetSessionId = (scannerSelect && scannerSelect.value) ? scannerSelect.value : selectedShopperId;

  if (!targetSessionId && activeSessionsList.length === 0) {
    playBuzzerTone('ERROR');
    alert("No customer currently inside the store! Scan a Pre-Booked QR code at the Entry Gate first.");
    return;
  }

  try {
    const res = await fetch('/api/cart/scan-barcode', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ 
        barcode, 
        action: currentScanMode,
        sessionId: targetSessionId
      })
    });
    const data = await res.json();
    if (data.success) {
      updateEspStatus(true);
      playBuzzerTone(currentScanMode === 'ADD' ? 'ITEM_ADD' : 'ITEM_REMOVE');
      syncShoppersUI(data.activeSessions);
      showCustomerNotification('SCAN', currentScanMode === 'ADD' ? 'Item Added' : 'Item Removed', `${currentScanMode === 'ADD' ? 'Scanned' : 'Removed'} ${data.product.name} for ${data.session.customerName} • Bill Total: $${data.session.grandTotal.toFixed(2)}`);
    } else {
      playBuzzerTone('ERROR');
      showCustomerNotification('ALERT', 'Scan Notice', data.message || 'Scan error');
      alert(data.message || 'Scan error');
    }
  } catch (e) {
    console.error(e);
  }
};

document.getElementById('btnSubmitBarcode').addEventListener('click', () => {
  const code = document.getElementById('manualBarcodeInput').value.trim();
  if (code) {
    triggerBarcodeScan(code);
    document.getElementById('manualBarcodeInput').value = '';
  }
});

document.getElementById('manualBarcodeInput').addEventListener('keydown', (e) => {
  if (e.key === 'Enter') {
    const code = e.target.value.trim();
    if (code) {
      triggerBarcodeScan(code);
      e.target.value = '';
    }
  }
});

// ==========================================================================
// 10. PAYPAL AUTO-PAY CHECKOUT MODAL & EXIT FLOW
// ==========================================================================
const paypalModalOverlay = document.getElementById('paypalModalOverlay');
const btnExitPayPal = document.getElementById('btnExitPayPal');
const btnConfirmPayPalPay = document.getElementById('btnConfirmPayPalPay');
const btnClosePayPalModal = document.getElementById('btnClosePayPalModal');
const ppPaySpinner = document.getElementById('ppPaySpinner');
const ppPayBtnText = document.getElementById('ppPayBtnText');
let payingShopperSession = null;

btnExitPayPal.addEventListener('click', () => {
  const exitSelect = document.getElementById('exitShopperSelect');
  const targetId = (exitSelect && exitSelect.value) ? exitSelect.value : selectedShopperId;
  payingShopperSession = activeSessionsList.find(s => s.sessionId === targetId) || activeSession;

  if (!payingShopperSession || payingShopperSession.status !== 'SHOPPING') {
    alert("No active shopper selected at the Exit Gate! Please scan a customer pass at the Entry Gate first.");
    return;
  }

  document.getElementById('ppModalUserName').textContent = payingShopperSession.customerName || "Jordan Smith";
  document.getElementById('ppModalUserEmail').textContent = payingShopperSession.email || "jordan.smith@example.com";
  document.getElementById('ppModalSubtotal').textContent = `$${(payingShopperSession.subtotal || 0).toFixed(2)}`;
  document.getElementById('ppModalTax').textContent = `$${(payingShopperSession.tax || 0).toFixed(2)}`;

  if (payingShopperSession.discount && payingShopperSession.discount > 0) {
    document.getElementById('ppModalDiscountRow').style.display = 'flex';
    document.getElementById('ppModalDiscount').textContent = `-$${payingShopperSession.discount.toFixed(2)}`;
  } else {
    document.getElementById('ppModalDiscountRow').style.display = 'none';
  }

  document.getElementById('ppModalTotal').textContent = `$${(payingShopperSession.grandTotal || 0).toFixed(2)}`;

  paypalModalOverlay.style.display = 'flex';
  ppPaySpinner.style.display = 'none';
  ppPayBtnText.textContent = `Pay $${payingShopperSession.grandTotal.toFixed(2)} & Unlock Exit Gate`;
  btnConfirmPayPalPay.disabled = false;
});

// Funding Source selection
document.querySelectorAll('.pp-funding-option').forEach(opt => {
  opt.addEventListener('click', () => {
    document.querySelectorAll('.pp-funding-option').forEach(o => o.classList.remove('selected'));
    opt.classList.add('selected');
    const radio = opt.querySelector('input[type="radio"]');
    if (radio) radio.checked = true;
  });
});

btnClosePayPalModal.addEventListener('click', () => {
  paypalModalOverlay.style.display = 'none';
});

// Execute PayPal Payment & Exit Gate
btnConfirmPayPalPay.addEventListener('click', async () => {
  if (!payingShopperSession) return;

  try {
    ppPaySpinner.style.display = 'inline-block';
    ppPayBtnText.textContent = `Authorizing PayPal for ${payingShopperSession.customerName}...`;
    btnConfirmPayPalPay.disabled = true;

    const res = await fetch('/api/gate/exit-paypal-pay', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ 
        paymentMethod: "PAYPAL_AUTO_PAY",
        sessionId: payingShopperSession.sessionId 
      })
    });
    const data = await res.json();

    setTimeout(() => {
      paypalModalOverlay.style.display = 'none';

      if (data.success) {
        updateEspStatus(true);
        playBuzzerTone('PAYMENT_SUCCESS');
        triggerGateAnimation('exit', true);

        if (data.invoice) {
          latestInvoice = data.invoice;
          const rcptBox = document.getElementById('paypalReceiptPreview');
          const rcptTxn = document.getElementById('rcptTxnId');
          if (rcptBox) rcptBox.style.display = 'block';
          if (rcptTxn) rcptTxn.textContent = `PayPal Txn: ${data.invoice.paypalTransactionId} • Paid: $${data.invoice.grandTotal.toFixed(2)} (${data.invoice.customerName})`;
          populateTaxInvoiceModal(latestInvoice);
        }

        // Update Goodbye & Thank You headers
        const gbTitle = document.getElementById('goodbyeCustomerTitle');
        const gbSub = document.getElementById('goodbyeCustomerSub');
        if (gbTitle && payingShopperSession) {
          gbTitle.textContent = `Thank You for Shopping with Us, ${payingShopperSession.customerName}!`;
        }
        if (gbSub && payingShopperSession) {
          gbSub.textContent = `Payment of $${payingShopperSession.grandTotal.toFixed(2)} USD verified via PayPal Auto-Pay. Exit Gate barrier unlocked and safely re-locked.`;
        }

        // Update remaining concurrent shoppers
        syncShoppersUI(data.activeSessions);
        showCustomerNotification('CHECKOUT', 'Payment Settled • Gate Unlocked', data.message);

        // Advance to Step 4: Goodbye & Receipt (Goods are completely hidden from customer!)
        if (typeof setGuidedStep === 'function') {
          setGuidedStep('receipt');
        }
      } else {
        playBuzzerTone('ERROR');
        alert(data.message || 'Payment failed');
      }
    }, 1000);

  } catch (e) {
    console.error(e);
    ppPaySpinner.style.display = 'none';
    ppPayBtnText.textContent = "Pay Now & Unlock Exit Gate";
    btnConfirmPayPalPay.disabled = false;
  }
});

// ==========================================================================
// 11. OFFICIAL TAX INVOICE & PRINT SYSTEM (FIXES 0 AMOUNT BUG)
// ==========================================================================
const taxInvoiceModalOverlay = document.getElementById('taxInvoiceModalOverlay');
const btnOpenPrintInvoice = document.getElementById('btnOpenPrintInvoice');
const btnCloseTaxInvoice = document.getElementById('btnCloseTaxInvoice');

function populateTaxInvoiceModal(inv) {
  if (!inv) return;
  document.getElementById('invNumberText').textContent = inv.invoiceNumber;
  document.getElementById('invDateTimeText').textContent = `${inv.date} • ${inv.time}`;
  document.getElementById('invCustomerName').textContent = inv.customerName;
  document.getElementById('invCustomerEmail').textContent = inv.customerEmail;
  document.getElementById('invCustomerPhone').textContent = inv.customerPhone || "+1 555-0199";
  document.getElementById('invCustomerId').textContent = inv.customerId || "CUST-001";
  document.getElementById('invBookingId').textContent = inv.bookingId;
  document.getElementById('invTxnId').textContent = inv.paypalTransactionId;

  const rows = document.getElementById('invItemsTableRows');
  rows.innerHTML = '';
  inv.items.forEach(item => {
    const r = document.createElement('div');
    r.className = 'inv-row';
    r.innerHTML = `
      <span><strong>${item.name}</strong></span>
      <span style="text-align:center;">x${item.quantity}</span>
      <span style="text-align:right;">$${item.price.toFixed(2)}</span>
      <span style="text-align:right;"><strong>$${(item.price * item.quantity).toFixed(2)}</strong></span>
    `;
    rows.appendChild(r);
  });

  document.getElementById('invSubtotal').textContent = `$${inv.subtotal.toFixed(2)}`;
  document.getElementById('invTax').textContent = `$${inv.tax.toFixed(2)}`;

  if (inv.discount && inv.discount > 0) {
    document.getElementById('invDiscountRow').style.display = 'flex';
    document.getElementById('invDiscount').textContent = `-$${inv.discount.toFixed(2)}`;
  } else {
    document.getElementById('invDiscountRow').style.display = 'none';
  }

  document.getElementById('invGrandTotal').textContent = `$${inv.grandTotal.toFixed(2)}`;
  document.getElementById('invBarcodeNumber').textContent = inv.paypalTransactionId;
}

btnOpenPrintInvoice.addEventListener('click', () => {
  if (!latestInvoice) {
    alert("Please complete a purchase at the Exit Gate first to generate your Tax Invoice!");
    return;
  }
  populateTaxInvoiceModal(latestInvoice);
  taxInvoiceModalOverlay.style.display = 'flex';
});

btnCloseTaxInvoice.addEventListener('click', () => {
  taxInvoiceModalOverlay.style.display = 'none';
});

window.triggerActualPrint = () => {
  window.print();
};

// ==========================================================================
// 12. DIGITAL RECEIPT DISPATCH (WHATSAPP, EMAIL, SMS)
// ==========================================================================
const dispatchPreviewModalOverlay = document.getElementById('dispatchPreviewModalOverlay');
const dispatchModalTitle = document.getElementById('dispatchModalTitle');
const dispatchBannerText = document.getElementById('dispatchBannerText');
const dispatchTextPreview = document.getElementById('dispatchTextPreview');
const btnExecuteDispatch = document.getElementById('btnExecuteDispatch');
const btnCloseDispatchPreview = document.getElementById('btnCloseDispatchPreview');

function formatWhatsAppReceipt(inv) {
  let itemsTxt = '';
  inv.items.forEach(i => {
    itemsTxt += `• ${i.name} (x${i.quantity}) ... $${(i.price * i.quantity).toFixed(2)}\n`;
  });

  return `🌟 *PAYPAL SMART STORE • OFFICIAL TAX RECEIPT* 🌟\n` +
    `══════════════════════════════════════\n` +
    `🧾 *Tax Invoice:* ${inv.invoiceNumber}\n` +
    `📅 *Date & Time:* ${inv.date}, ${inv.time}\n` +
    `👤 *Customer:* ${inv.customerName} (ID: ${inv.customerId || 'CUST-001'})\n` +
    `🎫 *Booking Pass:* ${inv.bookingId}\n` +
    `💳 *PayPal Txn:* ${inv.paypalTransactionId}\n` +
    `══════════════════════════════════════\n\n` +
    `🛍️ *PURCHASED ITEMS:*\n${itemsTxt}\n` +
    `──────────────────────────────────────\n` +
    `💵 *Subtotal:* $${inv.subtotal.toFixed(2)}\n` +
    `🏛️ *State Sales Tax (8%):* $${inv.tax.toFixed(2)}\n` +
    `🎁 *PayPal Promo Discount:* -$${inv.discount.toFixed(2)}\n` +
    `══════════════════════════════════════\n` +
    `💰 *TOTAL PAID VIA PAYPAL:* *$${inv.grandTotal.toFixed(2)} USD*\n` +
    `══════════════════════════════════════\n` +
    `✅ *Payment Status:* VERIFIED & COMPLETED\n` +
    `🚪 *Exit Gate:* AUTOMATICALLY UNLOCKED\n\n` +
    `🙏 _Thank you for shopping at PayPal Autonomous Micro-Store!_\n` +
    `🛡️ _100% Protected by PayPal Buyer Protection_`;
}

function formatEmailReceipt(inv) {
  let itemsTxt = '';
  inv.items.forEach(i => {
    itemsTxt += `  - ${i.name.padEnd(36)} x${i.quantity}   $${(i.price * i.quantity).toFixed(2)}\n`;
  });

  return `PAYPAL SMART STORE - OFFICIAL TAX INVOICE\n` +
    `============================================================\n` +
    `Invoice Number      : ${inv.invoiceNumber}\n` +
    `Date & Timestamp    : ${inv.date} at ${inv.time}\n` +
    `Customer Name       : ${inv.customerName} (ID: ${inv.customerId || 'CUST-001'})\n` +
    `Account Email       : ${inv.customerEmail}\n` +
    `Booking Pass ID     : ${inv.bookingId}\n` +
    `PayPal Txn Hash     : ${inv.paypalTransactionId}\n` +
    `Payment Status      : APPROVED & PAID VIA PAYPAL ONE-TOUCH\n` +
    `============================================================\n\n` +
    `ITEMIZED BREAKDOWN:\n` +
    `------------------------------------------------------------\n` +
    itemsTxt +
    `------------------------------------------------------------\n` +
    `Subtotal            : $${inv.subtotal.toFixed(2)}\n` +
    `Sales Tax (8%)      : $${inv.tax.toFixed(2)}\n` +
    `PayPal Promo        : -$${inv.discount.toFixed(2)}\n` +
    `GRAND TOTAL CHARGED : $${inv.grandTotal.toFixed(2)} USD\n` +
    `============================================================\n\n` +
    `Your exit barrier was automatically unlocked. Safe travels!\n` +
    `PayPal Customer Care: support@paypal.com | 1-888-221-1161\n`;
}

function formatSmsReceipt(inv) {
  return `PayPal Smart Store: Paid $${inv.grandTotal.toFixed(2)} USD via PayPal Auto-Pay for ${inv.items.length} items. Inv #${inv.invoiceNumber}. Txn: ${inv.paypalTransactionId}. Exit gate unlocked. Customer: ${inv.customerName} (${inv.customerId || 'CUST-001'}). Thank you!`;
}

document.getElementById('btnShareWhatsApp').addEventListener('click', async () => {
  if (!latestInvoice) return alert("Please complete checkout first!");
  const text = formatWhatsAppReceipt(latestInvoice);
  await fetch('/api/receipt/send', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ invoiceNumber: latestInvoice.invoiceNumber, channel: 'WHATSAPP' })
  });
  window.open(`https://api.whatsapp.com/send?text=${encodeURIComponent(text)}`, '_blank');
});

document.getElementById('btnShareEmail').addEventListener('click', async () => {
  if (!latestInvoice) return alert("Please complete checkout first!");
  const text = formatEmailReceipt(latestInvoice);
  dispatchModalTitle.textContent = "📧 Email Receipt Preview";
  dispatchBannerText.textContent = `Ready to dispatch to: ${latestInvoice.customerEmail}`;
  dispatchTextPreview.textContent = text;
  btnExecuteDispatch.textContent = "Open in Email App";
  btnExecuteDispatch.className = "btn btn-primary full-width";
  currentDispatchAction = () => {
    window.location.href = `mailto:${latestInvoice.customerEmail}?subject=Your PayPal Smart Store Receipt (${latestInvoice.invoiceNumber})&body=${encodeURIComponent(text)}`;
  };
  dispatchPreviewModalOverlay.style.display = 'flex';
});

document.getElementById('btnShareSms').addEventListener('click', async () => {
  if (!latestInvoice) return alert("Please complete checkout first!");
  const text = formatSmsReceipt(latestInvoice);
  dispatchModalTitle.textContent = "💬 SMS Receipt Preview";
  dispatchBannerText.textContent = `Ready to send to: ${latestInvoice.customerPhone || "+1 555-0199"}`;
  dispatchTextPreview.textContent = text;
  btnExecuteDispatch.textContent = "Send SMS Notification";
  btnExecuteDispatch.className = "btn btn-sms full-width";
  currentDispatchAction = () => {
    window.location.href = `sms:${latestInvoice.customerPhone || "+15550199"}?body=${encodeURIComponent(text)}`;
  };
  dispatchPreviewModalOverlay.style.display = 'flex';
});

btnExecuteDispatch.addEventListener('click', () => {
  if (currentDispatchAction) currentDispatchAction();
  dispatchPreviewModalOverlay.style.display = 'none';
});

btnCloseDispatchPreview.addEventListener('click', () => {
  dispatchPreviewModalOverlay.style.display = 'none';
});

window.copyDispatchText = () => {
  navigator.clipboard.writeText(dispatchTextPreview.textContent).then(() => {
    alert("Receipt text copied to clipboard!");
  });
};

// ==========================================================================
// 13. STORE OWNER PORTAL LOGIC & VISUAL ANALYTICS (GRAPHS & PIE CHART)
// ==========================================================================

window.refreshOwnerDashboard = async () => {
  try {
    const res = await fetch('/api/owner/analytics');
    const data = await res.json();

    // 1. KPI Cards
    document.getElementById('ownerKpiRevenue').textContent = `$${data.totalRevenue.toFixed(2)}`;
    document.getElementById('ownerKpiOrders').textContent = data.totalOrders;
    document.getElementById('ownerKpiProducts').textContent = productsList.length;
    document.getElementById('ownerKpiLowStock').textContent = data.lowStockCount;

    // 2. Critical Low-Stock Warning Banner
    const lowStockBanner = document.getElementById('lowStockAlertBanner');
    const lowStockDetails = document.getElementById('lowStockAlertDetails');
    if (data.lowStockCount > 0) {
      lowStockBanner.style.display = 'flex';
      const itemNames = data.lowStockItems.map(i => `${i.name} (Only ${i.stock} left)`).join(', ');
      lowStockDetails.textContent = `Low stock alert on: ${itemNames}. Quick restock available below.`;
    } else {
      lowStockBanner.style.display = 'none';
    }

    // 3. Render Bar Chart (Best-Selling vs Lowest-Selling Goods)
    renderSalesBarChart(data.topSold, data.lowSold);

    // 4. Render Pie Chart (Category Revenue Distribution)
    renderCategoryPieChart(data.categoryTotals);

    // 5. Render Inventory Table
    renderOwnerInventoryTable(productsList);

    // 6. Fetch & Render Frequent Customers
    fetchAndRenderFrequentCustomers();

    // 7. Security Incident Logs & Store Occupancy
    if (data.securityLogs) renderSecurityLogs(data.securityLogs);

    // Initial Stage Positioning based on in-store shoppers
    if (typeof setGuidedStep === 'function') {
      if (data.activeSessions && data.activeSessions.length > 0) {
        setGuidedStep('shopping');
      } else {
        setGuidedStep('entry');
      }
    }
    if (data.occupancy) updateOccupancyUI(data.occupancy);

  } catch (e) {
    console.error("Owner Dashboard refresh error:", e);
  }
};

window.scrollToInventory = () => {
  const section = document.getElementById('inventorySection');
  if (section) section.scrollIntoView({ behavior: 'smooth' });
};

// --- Bar Chart Rendering with HTML5 Canvas (Zero CDN Dependencies) ---
function renderSalesBarChart(topSold, lowSold) {
  const canvas = document.getElementById('salesBarChartCanvas');
  const legendBox = document.getElementById('salesBarChartLegend');
  if (!canvas || !canvas.getContext) return;
  const ctx = canvas.getContext('2d');

  // Handle high-DPI displays
  const width = canvas.width;
  const height = canvas.height;
  ctx.clearRect(0, 0, width, height);

  // Combine top sold and lowest sold (avoid duplicates)
  const chartItems = [];
  const addedCodes = new Set();
  
  // Top 3 best-sellers
  (topSold || []).slice(0, 3).forEach(p => {
    chartItems.push({ name: p.name, count: p.salesCount || 0, isTop: true, barcode: p.barcode });
    addedCodes.add(p.barcode);
  });

  // Lowest 3 sellers
  (lowSold || []).slice(0, 3).forEach(p => {
    if (!addedCodes.has(p.barcode)) {
      chartItems.push({ name: p.name, count: p.salesCount || 0, isTop: false, barcode: p.barcode });
      addedCodes.add(p.barcode);
    }
  });

  if (chartItems.length === 0) return;

  const maxVal = Math.max(...chartItems.map(i => i.count), 10);
  const paddingLeft = 140;
  const paddingRight = 40;
  const paddingTop = 25;
  const paddingBottom = 25;
  const chartWidth = width - paddingLeft - paddingRight;
  const chartHeight = height - paddingTop - paddingBottom;
  const barHeight = Math.min(26, Math.floor(chartHeight / chartItems.length) - 8);

  chartItems.forEach((item, idx) => {
    const y = paddingTop + idx * (chartHeight / chartItems.length);
    const barW = Math.max(12, (item.count / maxVal) * chartWidth);

    // Label
    ctx.fillStyle = '#0f172a';
    ctx.font = '600 11px Inter, sans-serif';
    ctx.textAlign = 'right';
    ctx.textBaseline = 'middle';
    const truncatedName = item.name.length > 17 ? item.name.substring(0, 15) + '…' : item.name;
    ctx.fillText(truncatedName, paddingLeft - 10, y + barHeight / 2);

    // Bar Gradient
    const grad = ctx.createLinearGradient(paddingLeft, 0, paddingLeft + barW, 0);
    if (item.isTop) {
      grad.addColorStop(0, '#0070ba');
      grad.addColorStop(1, '#059669'); // Emerald top seller
    } else {
      grad.addColorStop(0, '#f59e0b');
      grad.addColorStop(1, '#ef4444'); // Crimson lowest seller
    }

    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.roundRect(paddingLeft, y, barW, barHeight, 4);
    ctx.fill();

    // Value text
    ctx.fillStyle = '#ffffff';
    ctx.font = '700 11px JetBrains Mono, monospace';
    ctx.textAlign = 'right';
    if (barW > 35) {
      ctx.fillText(`${item.count}`, paddingLeft + barW - 6, y + barHeight / 2);
    } else {
      ctx.fillStyle = '#475569';
      ctx.textAlign = 'left';
      ctx.fillText(`${item.count}`, paddingLeft + barW + 6, y + barHeight / 2);
    }
  });

  // Legend
  legendBox.innerHTML = `
    <div class="legend-item"><span class="legend-dot" style="background:#059669;"></span> <strong>High-Selling Goods</strong> (Fast Moving)</div>
    <div class="legend-item"><span class="legend-dot" style="background:#ef4444;"></span> <strong>Lowest-Selling Goods</strong> (Candidates for Flash Sale)</div>
  `;
}

// --- Pie Chart Rendering with HTML5 Canvas (Zero CDN Dependencies) ---
function renderCategoryPieChart(categoryTotals) {
  const canvas = document.getElementById('categoryPieChartCanvas');
  const legendBox = document.getElementById('categoryPieLegend');
  if (!canvas || !canvas.getContext) return;
  const ctx = canvas.getContext('2d');

  const width = canvas.width;
  const height = canvas.height;
  ctx.clearRect(0, 0, width, height);

  const categories = Object.keys(categoryTotals || {});
  const totalVolume = Object.values(categoryTotals || {}).reduce((a, b) => a + b, 0) || 1;

  const colors = [
    '#003087', // Navy
    '#0070ba', // PayPal Blue
    '#ffc439', // PayPal Gold
    '#10b981', // Emerald
    '#8b5cf6', // Violet
    '#f97316'  // Orange
  ];

  const centerX = width / 2;
  const centerY = height / 2;
  const radius = Math.min(centerX, centerY) - 20;

  let startAngle = -0.5 * Math.PI;
  legendBox.innerHTML = '';

  categories.forEach((cat, idx) => {
    const count = categoryTotals[cat];
    const sliceAngle = (count / totalVolume) * 2 * Math.PI;
    const color = colors[idx % colors.length];

    // Draw Slice
    ctx.beginPath();
    ctx.moveTo(centerX, centerY);
    ctx.arc(centerX, centerY, radius, startAngle, startAngle + sliceAngle);
    ctx.closePath();
    ctx.fillStyle = color;
    ctx.fill();

    // Subtle border
    ctx.lineWidth = 2;
    ctx.strokeStyle = '#ffffff';
    ctx.stroke();

    startAngle += sliceAngle;

    // Legend item
    const pct = Math.round((count / totalVolume) * 100);
    const item = document.createElement('div');
    item.className = 'legend-item';
    item.innerHTML = `<span class="legend-dot" style="background:${color};"></span> <span><strong>${cat}</strong>: ${count} units (${pct}%)</span>`;
    legendBox.appendChild(item);
  });
}

// --- Render Owner Inventory Table ---
function renderOwnerInventoryTable(products) {
  const tbody = document.getElementById('inventoryTableBody');
  if (!tbody) return;
  tbody.innerHTML = '';

  products.forEach(p => {
    const isLowStock = p.stock < 5;
    const tr = document.createElement('tr');
    if (isLowStock) tr.className = 'row-low-stock';

    const priceDetails = getProductPriceDetails(p);

    tr.innerHTML = `
      <td>
        <div style="display:flex; align-items:center; gap:8px;">
          <span style="font-size:1.4rem;">${p.icon}</span>
          <div>
            <strong>${p.name}</strong>
            <div style="font-family:var(--font-mono); font-size:0.7rem; color:var(--text-dim);">${p.barcode}</div>
          </div>
        </div>
      </td>
      <td><span class="badge-tag" style="background:#f1f5f9; color:#475569;">${p.category}</span></td>
      <td>
        ${isLowStock 
          ? `<span class="stock-pill low">⚠️ ${p.stock} units (LOW STOCK)</span>`
          : `<span class="stock-pill healthy">✔ ${p.stock} units</span>`
        }
      </td>
      <td><strong>${p.salesCount || 0} sold</strong></td>
      <td>
        ${priceDetails.isDiscountActive
          ? `<span class="price-struck">$${p.price.toFixed(2)}</span> <strong style="color:#059669;">$${priceDetails.effectivePrice.toFixed(2)}</strong>`
          : `<strong>$${p.price.toFixed(2)}</strong>`
        }
      </td>
      <td>
        ${priceDetails.isDiscountActive
          ? `<span class="flash-badge">⚡ ${p.discountPercent}% OFF</span><div class="flash-countdown">${formatTimeRemaining(p.discountEndsAt - Date.now())}</div>`
          : `<span style="color:#94a3b8; font-size:0.75rem;">None</span>`
        }
      </td>
      <td>
        <div class="action-btns">
          <button class="btn-restock" onclick="quickRestockProduct('${p.barcode}')" title="Add 10 units to stock">⚡ Restock (+10)</button>
          <button class="btn-discount" onclick="openFlashDiscountModal('${p.barcode}', '${p.name.replace(/'/g, "\\'")}')" title="Set promo discount">⏰ Discount</button>
          <button class="btn-delete" onclick="deleteProduct('${p.barcode}', '${p.name.replace(/'/g, "\\'")}')" title="Remove from catalog">🗑️ Delete</button>
        </div>
      </td>
    `;
    tbody.appendChild(tr);
  });
}

// Quick Restock Action (+10)
window.quickRestockProduct = async (barcode) => {
  try {
    const res = await fetch('/api/owner/restock', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ barcode, addQuantity: 10 })
    });
    const data = await res.json();
    if (data.success) {
      playBuzzerTone('ITEM_ADD');
      refreshOwnerDashboard();
      showCustomerNotification('WELCOME', 'Inventory Restocked', data.message);
    }
  } catch (e) {
    console.error(e);
  }
};

// Delete Product Action (Owner Exclusive)
window.deleteProduct = async (barcode, name) => {
  if (!confirm(`Are you sure you want to permanently delete "${name}" from store shelves?`)) return;
  try {
    const res = await fetch('/api/owner/delete-product', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ barcode })
    });
    const data = await res.json();
    if (data.success) {
      playBuzzerTone('ITEM_REMOVE');
      refreshOwnerDashboard();
      showCustomerNotification('ALERT', 'Product Removed', data.message);
    }
  } catch (e) {
    console.error(e);
  }
};

// Flash Discount Manager
window.openFlashDiscountModal = (barcode, name) => {
  document.getElementById('discountBarcode').value = barcode;
  document.getElementById('discountProductName').value = name;
  document.getElementById('discountModalOverlay').style.display = 'flex';
};

window.closeDiscountModal = () => {
  document.getElementById('discountModalOverlay').style.display = 'none';
};

window.submitFlashDiscount = async () => {
  const barcode = document.getElementById('discountBarcode').value;
  const discountPercent = document.getElementById('discountPercentSelect').value;
  const durationMinutes = document.getElementById('discountDurationSelect').value;

  try {
    const res = await fetch('/api/owner/discount', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ barcode, discountPercent, durationMinutes })
    });
    const data = await res.json();
    if (data.success) {
      playBuzzerTone('GATE_OPEN');
      closeDiscountModal();
      refreshOwnerDashboard();
      showCustomerNotification('SCAN', 'Flash Discount Launched', data.message);
    }
  } catch (e) {
    console.error(e);
  }
};

// --- Frequent Customers VIP Directory ---
async function fetchAndRenderFrequentCustomers() {
  try {
    const res = await fetch('/api/owner/frequent-customers');
    const customers = await res.json();
    const tbody = document.getElementById('frequentCustomersTableBody');
    if (!tbody) return;
    tbody.innerHTML = '';

    customers.forEach(c => {
      const tr = document.createElement('tr');
      let tierClass = 'silver';
      if (c.tier.includes('Platinum')) tierClass = 'platinum';
      else if (c.tier.includes('Gold')) tierClass = 'gold';
      else if (c.tier.includes('New')) tierClass = 'new';

      tr.innerHTML = `
        <td>
          <strong>${c.id}</strong>
          <div style="font-family:var(--font-mono); font-size:0.7rem; color:var(--text-dim);">${c.bookingId}</div>
        </td>
        <td>
          <strong>${c.name}</strong>
          <div style="font-size:0.7rem; color:var(--text-dim);">${c.email}</div>
        </td>
        <td><span class="vip-badge ${tierClass}">${c.tier}</span></td>
        <td><strong>${c.visitCount} visits</strong></td>
        <td><strong style="color:#0070ba;">$${c.totalSpend.toFixed(2)}</strong></td>
        <td>${c.favoriteItem || 'N/A'}</td>
        <td style="font-size:0.75rem; color:var(--text-dim);">${c.lastVisit || 'Today'}</td>
      `;
      tbody.appendChild(tr);
    });
  } catch (e) {
    console.error("Fetch frequent customers error:", e);
  }
}

// Add Custom Product (Owner exclusive)
window.openAddProductModal = () => {
  document.getElementById('addProductModalOverlay').style.display = 'flex';
};

window.closeAddProductModal = () => {
  document.getElementById('addProductModalOverlay').style.display = 'none';
};

window.generateRandomBarcode = () => {
  const randomCode = "890" + Math.floor(1000000000 + Math.random() * 9000000000);
  document.getElementById('cpBarcode').value = randomCode;
};

window.submitCustomProduct = async () => {
  const name = document.getElementById('cpName').value.trim();
  const price = document.getElementById('cpPrice').value;
  const icon = document.getElementById('cpIcon').value.trim() || "📦";
  const category = document.getElementById('cpCategory').value;
  const initialStock = document.getElementById('cpStock').value;
  const barcode = document.getElementById('cpBarcode').value.trim();

  try {
    const res = await fetch('/api/products/add', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, price, icon, category, barcode, initialStock })
    });
    const data = await res.json();
    if (data.success) {
      playBuzzerTone('ITEM_ADD');
      closeAddProductModal();
      refreshOwnerDashboard();
      showCustomerNotification('SCAN', 'Product Added', `"${name}" ($${parseFloat(price).toFixed(2)}) is now on store shelves!`);
    } else {
      alert(data.message || 'Error adding product');
    }
  } catch (e) {
    console.error(e);
  }
};

// ==========================================================================
// 14. ESP32 HARDWARE HEALTH CHECK & ANIMATIONS
// ==========================================================================
document.getElementById('resetDemoBtn').addEventListener('click', async () => {
  try {
    await fetch('/api/reset', { method: 'POST' });
    syncShoppersUI([]);
    updateBillUI(null);
    document.getElementById('paypalReceiptPreview').style.display = 'none';
    triggerGateAnimation('entry', false);
    triggerGateAnimation('exit', false);
    updateHwMonitor("IDLE", "LOCKED (LED OFF)");
    showCustomerNotification('INFO', 'Demo Reset', 'All in-store shoppers cleared and system reset.');
  } catch (e) {
    console.error(e);
  }
});

function triggerGateAnimation(gate, isOpen) {
  const widget = document.getElementById(gate === 'entry' ? 'entryGateWidget' : 'exitGateWidget');
  const badge = document.getElementById(gate === 'entry' ? 'entryGateBadge' : 'exitGateBadge');
  const sub = document.getElementById(gate === 'entry' ? 'entryGateSub' : 'exitGateSub');

  if (isOpen) {
    widget.classList.add('open');
    badge.textContent = 'OPEN';
    badge.className = 'gate-badge open';
    sub.textContent = 'Lock: RELEASED (Gate Open)';
    updateHwMonitor(null, "UNLOCKED (LED ON)");

    setTimeout(() => {
      triggerGateAnimation(gate, false);
    }, 4500);
  } else {
    widget.classList.remove('open');
    badge.textContent = 'CLOSED';
    badge.className = 'gate-badge closed';
    sub.textContent = 'Lock: ENGAGED (Closed)';
    updateHwMonitor(null, "LOCKED (LED OFF)");
  }
}

let lastEspPing = Date.now();

function updateEspStatus(isConnected) {
  const chip = document.getElementById('esp32StatusChip');
  const txt = document.getElementById('esp32StatusText');
  if (!chip || !txt) return;

  if (isConnected) {
    chip.style.background = 'rgba(16, 185, 129, 0.15)';
    chip.style.borderColor = 'rgba(16, 185, 129, 0.4)';
    chip.style.color = '#34d399';
    txt.textContent = 'HARDWARE LINKED & POLLING';
  } else {
    chip.style.background = 'rgba(239, 68, 68, 0.15)';
    chip.style.borderColor = 'rgba(239, 68, 68, 0.4)';
    chip.style.color = '#f87171';
    txt.textContent = 'OFFLINE (Check IP/Hotspot)';
  }
}

async function checkEspOnlineStatus() {
  try {
    const res = await fetch('/api/esp32/status');
    const data = await res.json();
    if (data.online) {
      lastEspPing = Date.now();
      updateEspStatus(true);
    } else if (Date.now() - lastEspPing > 6000) {
      updateEspStatus(false);
    }
  } catch (e) {}
}

setInterval(checkEspOnlineStatus, 2000);
setTimeout(checkEspOnlineStatus, 500);

// ==========================================================================
// 16. LIVE OPTICAL WEBCAM & PHONE CAMERA BARCODE/QR SCANNER
// ==========================================================================
let cameraStream = null;
let currentCameraFacing = 'environment'; // 'environment' (back) or 'user' (front)
let currentScannerTargetMode = 'PRODUCT_BARCODE'; // 'ENTRY_PASS' or 'PRODUCT_BARCODE'
let barcodeDetector = null;
let cameraScanInterval = null;
let lastDetectedBarcode = null;
let lastBarcodeScanTime = 0;
let isScanningActive = false;

// Store Capacity & Anti-Theft state
let currentStoreCapacity = 4;
let currentShopperCount = 0;
let isAntiTheftAlarmActive = false;
let currentTheftIncident = null;
let securityLogsList = [];

// Initialize Native BarcodeDetector if available in browser
if ('BarcodeDetector' in window) {
  try {
    barcodeDetector = new BarcodeDetector({
      formats: ['qr_code', 'ean_13', 'ean_8', 'code_128', 'code_39', 'upc_a', 'upc_e']
    });
  } catch (e) {
    console.warn("BarcodeDetector format initialization note:", e);
  }
}

window.openCameraScanner = async function(mode = 'PRODUCT_BARCODE') {
  currentScannerTargetMode = mode;
  const modal = document.getElementById('cameraScannerModalOverlay');
  const modeLabel = document.getElementById('cameraModeLabel');
  const shopperLabel = document.getElementById('camTargetShopperDisplay');
  const statusMsg = document.getElementById('cameraStatusMsg');
  const loadingIndicator = document.getElementById('cameraLoadingIndicator');
  const guidance = document.getElementById('scannerGuidanceText');

  if (mode === 'ENTRY_PASS') {
    modeLabel.textContent = "Target: Pre-Booked Customer Pass QR";
    guidance.textContent = "Hold up Customer Pre-Booked Pass QR (e.g. PP-BOOK-1001) to Camera";
    shopperLabel.innerHTML = `Scanning Mode: <strong>Entry Gate Pass</strong>`;
  } else {
    modeLabel.textContent = "Target: Product Barcode & Shelf Items";
    guidance.textContent = "Point camera at any product barcode to scan item into cart";
    const curShopper = activeSessionsList.find(s => s.sessionId === selectedShopperId) || activeSession;
    shopperLabel.innerHTML = `Scanning For: <strong>${curShopper ? curShopper.customerName : 'Awaiting Entry'}</strong>`;
  }

  populateCameraQuickTargets(mode);

  modal.style.display = 'flex';
  if (loadingIndicator) loadingIndicator.style.display = 'flex';
  if (statusMsg) statusMsg.textContent = "Initializing Camera Stream...";

  await startCameraStream();
};

window.closeCameraScanner = function() {
  stopCameraStream();
  const modal = document.getElementById('cameraScannerModalOverlay');
  if (modal) modal.style.display = 'none';
};

window.switchCameraFacing = async function() {
  currentCameraFacing = (currentCameraFacing === 'environment') ? 'user' : 'environment';
  stopCameraStream();
  await startCameraStream();
};

window.toggleScannerMode = function() {
  const newMode = (currentScannerTargetMode === 'ENTRY_PASS') ? 'PRODUCT_BARCODE' : 'ENTRY_PASS';
  openCameraScanner(newMode);
};

async function startCameraStream() {
  const video = document.getElementById('scannerVideo');
  const loadingIndicator = document.getElementById('cameraLoadingIndicator');
  const statusMsg = document.getElementById('cameraStatusMsg');

  try {
    const constraints = {
      video: {
        facingMode: { ideal: currentCameraFacing },
        width: { ideal: 1280 },
        height: { ideal: 720 }
      },
      audio: false
    };

    let stream = null;
    try {
      stream = await navigator.mediaDevices.getUserMedia(constraints);
    } catch(err) {
      stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: false });
    }

    cameraStream = stream;
    video.srcObject = stream;
    await video.play();

    if (loadingIndicator) loadingIndicator.style.display = 'none';
    isScanningActive = true;
    startDetectionLoop();
  } catch (err) {
    console.warn("Camera stream unavailable:", err);
    if (loadingIndicator) {
      loadingIndicator.style.display = 'flex';
      statusMsg.innerHTML = `<span style="color:#fca5a5;">Camera Permission Denied or Unavailable</span><br><small style="color:#cbd5e1;">Use the Quick-Tap targets below or product shelf buttons</small>`;
    }
  }
}

function stopCameraStream() {
  isScanningActive = false;
  if (cameraScanInterval) {
    clearInterval(cameraScanInterval);
    cameraScanInterval = null;
  }
  if (cameraStream) {
    cameraStream.getTracks().forEach(track => track.stop());
    cameraStream = null;
  }
  const video = document.getElementById('scannerVideo');
  if (video) video.srcObject = null;
}

function startDetectionLoop() {
  if (cameraScanInterval) clearInterval(cameraScanInterval);

  cameraScanInterval = setInterval(async () => {
    if (!isScanningActive) return;
    const video = document.getElementById('scannerVideo');
    if (!video || video.readyState !== video.HAVE_ENOUGH_DATA) return;

    if (barcodeDetector) {
      try {
        const barcodes = await barcodeDetector.detect(video);
        if (barcodes && barcodes.length > 0) {
          const code = barcodes[0].rawValue;
          if (code) handleDetectedCode(code);
        }
      } catch(e) {}
    }
  }, 250);
}

window.handleDetectedCode = async function(rawValue) {
  if (!rawValue) return;
  const now = Date.now();
  if (rawValue === lastDetectedBarcode && (now - lastBarcodeScanTime) < 1600) {
    return; // Debounce rapid triggers
  }
  lastDetectedBarcode = rawValue;
  lastBarcodeScanTime = now;

  showCameraDetectionFeedback(rawValue);

  if (currentScannerTargetMode === 'ENTRY_PASS') {
    document.getElementById('entryQrInput').value = rawValue;
    const res = await window.triggerEntryScan(rawValue);
    if (res && res.success) {
      setTimeout(() => {
        closeCameraScanner();
      }, 1000);
    }
  } else {
    await window.triggerBarcodeScan(rawValue);
  }
};

function showCameraDetectionFeedback(code) {
  const toast = document.getElementById('camDetectionToast');
  const msg = document.getElementById('camDetectionMsg');
  if (!toast || !msg) return;

  const prod = productsList.find(p => p.barcode === (code || '').trim());
  if (prod) {
    msg.textContent = `✓ Scanned: ${prod.name} ($${prod.price.toFixed(2)})`;
  } else {
    msg.textContent = `✓ Detected Pass/Code: ${code}`;
  }

  toast.style.display = 'flex';
  setTimeout(() => {
    if (toast) toast.style.display = 'none';
  }, 1800);
}

function populateCameraQuickTargets(mode) {
  const container = document.getElementById('cameraTargetPills');
  if (!container) return;
  container.innerHTML = '';

  if (mode === 'ENTRY_PASS') {
    const passes = [
      { id: "PP-BOOK-1001", name: "Alex Rivera (VIP)" },
      { id: "PP-BOOK-1002", name: "Samira Khan (Gold)" },
      { id: "PP-BOOK-1003", name: "Jordan Smith (Silver)" }
    ];
    passes.forEach(p => {
      const btn = document.createElement('button');
      btn.className = 'q-target-btn';
      btn.textContent = `🎯 ${p.name} [${p.id}]`;
      btn.onclick = () => handleDetectedCode(p.id);
      container.appendChild(btn);
    });
  } else {
    productsList.slice(0, 5).forEach(p => {
      const btn = document.createElement('button');
      btn.className = 'q-target-btn';
      btn.textContent = `${p.icon} ${p.name} ($${p.price.toFixed(2)})`;
      btn.onclick = () => handleDetectedCode(p.barcode);
      container.appendChild(btn);
    });
  }
}

// ==========================================================================
// 17. ANTI-THEFT SHOPLIFTING SECURITY & STORE OCCUPANCY
// ==========================================================================

window.simulateShopliftingBreach = async function() {
  const exitSelect = document.getElementById('exitShopperSelect');
  const targetId = (exitSelect && exitSelect.value) ? exitSelect.value : selectedShopperId;
  const shopper = activeSessionsList.find(s => s.sessionId === targetId) || activeSession;

  try {
    const res = await fetch('/api/security/trigger-alarm', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        reason: (shopper && shopper.items.length > 0) ? "UNPAID_CART_EXIT_BREACH" : "BARRIER_TAMPER",
        sessionId: shopper ? shopper.sessionId : null,
        customerId: shopper ? shopper.customerId : null,
        bookingId: shopper ? shopper.bookingId : null
      })
    });
    const data = await res.json();
    if (data.alarm && data.incident) {
      triggerAntiTheftAlarm(data.incident);
    }
  } catch (e) {
    console.error("Security alarm simulation error:", e);
  }
};

window.triggerAntiTheftAlarm = function(incident) {
  isAntiTheftAlarmActive = true;
  currentTheftIncident = incident;

  // Sound sirens
  playBuzzerTone('ALARM_THEFT');

  // Update Top Banner
  const banner = document.getElementById('theftEmergencyBanner');
  const bannerTitle = document.getElementById('theftBannerTitle');
  const bannerMsg = document.getElementById('theftBannerMessage');
  if (banner) {
    banner.style.display = 'block';
    if (bannerTitle) bannerTitle.textContent = `🚨 ANTI-THEFT ALARM TRIGGERED: ${(incident.customerName || 'Intruder').toUpperCase()} INTERCEPTED!`;
    if (bannerMsg) bannerMsg.textContent = `${incident.reason}. Unpaid value: $${(incident.unpaidTotal || 0).toFixed(2)}. Gate barrier locked!`;
  }

  // Update Modal
  const modal = document.getElementById('antiTheftModalOverlay');
  if (modal) {
    document.getElementById('theftSubjectName').textContent = `${incident.customerName} (${incident.bookingId || incident.customerId})`;
    document.getElementById('theftReasonText').textContent = incident.reason;
    document.getElementById('theftUnpaidAmount').textContent = `$${(incident.unpaidTotal || 0).toFixed(2)} USD`;
    
    const itemsBox = document.getElementById('theftItemsContainer');
    if (itemsBox) {
      itemsBox.innerHTML = '';
      (incident.unpaidItems || []).forEach(itm => {
        const d = document.createElement('div');
        d.className = 'theft-item-pill';
        d.textContent = `• ${itm}`;
        itemsBox.appendChild(d);
      });
    }
    modal.style.display = 'flex';
  }

  // Update Hardware monitor
  updateHwMonitor("🚨 SIREN (900-1300 Hz)", "DEADBOLTED (LED FLASHING)");

  // Update Owner status
  const pill = document.getElementById('ownerSecurityStatusPill');
  const disarmBtn = document.getElementById('btnOwnerDisarmSecurity');
  if (pill) {
    pill.className = 'security-status-pill alarm-active';
    pill.textContent = '🚨 LOCKDOWN ACTIVE';
  }
  if (disarmBtn) disarmBtn.style.display = 'inline-block';
};

window.disarmSecurityAlarm = async function() {
  try {
    await fetch('/api/security/reset-alarm', { method: 'POST' });
    clearSecurityAlarmUI();
  } catch(e) {
    console.error("Disarm alarm error:", e);
  }
};

window.clearSecurityAlarmUI = function() {
  isAntiTheftAlarmActive = false;
  currentTheftIncident = null;

  const banner = document.getElementById('theftEmergencyBanner');
  if (banner) banner.style.display = 'none';

  const modal = document.getElementById('antiTheftModalOverlay');
  if (modal) modal.style.display = 'none';

  updateHwMonitor("IDLE", "Locked (LED OFF)");

  const pill = document.getElementById('ownerSecurityStatusPill');
  const disarmBtn = document.getElementById('btnOwnerDisarmSecurity');
  if (pill) {
    pill.className = 'security-status-pill';
    pill.textContent = '🟢 ALL PERIMETERS SECURE';
  }
  if (disarmBtn) disarmBtn.style.display = 'none';

  showCustomerNotification('WELCOME', 'Security Restored', 'Anti-theft alarm disarmed. Gates returned to normal standby.');
};

window.promptPaypalForUnpaid = function() {
  const modal = document.getElementById('antiTheftModalOverlay');
  if (modal) modal.style.display = 'none';
  const exitBtn = document.getElementById('btnExitPayPal');
  if (exitBtn) exitBtn.click();
};

window.resolveTheftWithPayPal = function() {
  promptPaypalForUnpaid();
};

window.updateOccupancyUI = function(occ) {
  if (!occ) return;
  currentStoreCapacity = occ.max || 4;
  currentShopperCount = occ.current || 0;

  const textEl = document.getElementById('occupancyText');
  const fillEl = document.getElementById('occupancyBarFill');
  const badgeEl = document.getElementById('occupancyStatusBadge');
  const scanBtn = document.getElementById('btnScanEntry');
  const camBtn = document.getElementById('btnOpenEntryCam');

  const pct = Math.min(100, Math.round((currentShopperCount / currentStoreCapacity) * 100));

  if (textEl) textEl.textContent = `${currentShopperCount} / ${currentStoreCapacity} Shoppers (${pct}%)`;
  if (fillEl) {
    fillEl.style.width = `${pct}%`;
    if (pct >= 100) fillEl.className = 'capacity-bar-fill fill-danger';
    else if (pct >= 60) fillEl.className = 'capacity-bar-fill fill-warning';
    else fillEl.className = 'capacity-bar-fill';
  }

  if (badgeEl) {
    if (pct >= 100) {
      badgeEl.className = 'occupancy-status-badge badge-red';
      badgeEl.textContent = `🔴 FULL CAPACITY (${currentStoreCapacity}/${currentStoreCapacity}) • ENTRY LOCKED`;
      if (scanBtn) {
        scanBtn.disabled = true;
        scanBtn.title = "Store is at full capacity. Wait for a customer to exit.";
      }
      if (camBtn) {
        camBtn.disabled = true;
        camBtn.title = "Store is at full capacity.";
      }
    } else if (pct >= 60) {
      badgeEl.className = 'occupancy-status-badge badge-yellow';
      badgeEl.textContent = `🟡 Moderate Density • Entry Allowed`;
      if (scanBtn) { scanBtn.disabled = false; scanBtn.title = ""; }
      if (camBtn) { camBtn.disabled = false; camBtn.title = ""; }
    } else {
      badgeEl.className = 'occupancy-status-badge badge-green';
      badgeEl.textContent = `🟢 Low Crowding • Normal Entry Open`;
      if (scanBtn) { scanBtn.disabled = false; scanBtn.title = ""; }
      if (camBtn) { camBtn.disabled = false; camBtn.title = ""; }
    }
  }

  // Owner Portal sync
  const ownerCount = document.getElementById('ownerCurrentShopperCount');
  const ownerCapSelect = document.getElementById('ownerCapacitySelect');
  if (ownerCount) ownerCount.textContent = currentShopperCount;
  if (ownerCapSelect) ownerCapSelect.value = String(currentStoreCapacity);
};

window.updateMaxCapacity = async function(newCap) {
  try {
    const res = await fetch('/api/owner/capacity', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ maxCapacity: newCap })
    });
    const data = await res.json();
    if (data.success) {
      currentStoreCapacity = data.maxCapacity;
      updateOccupancyUI({
        current: activeSessionsList.length,
        max: currentStoreCapacity,
        percentage: Math.min(100, Math.round((activeSessionsList.length / currentStoreCapacity) * 100))
      });
      showCustomerNotification('WELCOME', 'Store Capacity Updated', `Store capacity set to ${currentStoreCapacity} concurrent shoppers.`);
    }
  } catch(e) {
    console.error(e);
  }
};

window.renderSecurityLogs = function(logs) {
  securityLogsList = logs || [];
  const tbody = document.getElementById('securityLogsTableBody');
  const countEl = document.getElementById('ownerTotalIncidentsCount');

  if (countEl) countEl.textContent = securityLogsList.length;
  if (!tbody) return;

  if (securityLogsList.length === 0) {
    tbody.innerHTML = `<tr><td colspan="7" style="text-align:center; color:#94a3b8; font-style:italic;">No security incidents recorded. Store perimeter is 100% secure.</td></tr>`;
    return;
  }

  tbody.innerHTML = '';
  securityLogsList.forEach(log => {
    const tr = document.createElement('tr');
    const isLock = log.lockdownActive || (log.status && log.status.includes('LOCKDOWN'));
    tr.innerHTML = `
      <td><strong>${log.id}</strong><br><small style="color:#64748b;">${log.time} • ${log.date}</small></td>
      <td><strong>${log.customerName}</strong><br><small style="color:#64748b;">${log.customerId}</small></td>
      <td><span style="color:#b91c1c; font-weight:600;">${log.reason}</span></td>
      <td><small>${(log.unpaidItems || []).join(', ')}</small></td>
      <td><strong style="color:#ef4444;">$${(log.unpaidTotal || 0).toFixed(2)}</strong></td>
      <td><small style="color:#475569;">${log.actionTaken || 'Solenoid Deadbolted'}</small></td>
      <td><span class="stock-pill ${isLock ? 'pill-low' : 'pill-ok'}">${log.status}</span></td>
    `;
    tbody.appendChild(tr);
  });
};

// ==========================================================================
// 15. SERVER-SENT EVENTS (SSE) REAL-TIME PIPELINE
// ==========================================================================
function initSSE() {
  const evt = new EventSource('/api/events');

  evt.addEventListener('snapshot', e => {
    const data = JSON.parse(e.data);
    if (data.products) renderProducts(data.products);
    if (data.activeSessions) syncShoppersUI(data.activeSessions);
    else if (data.activeSession) syncShoppersUI([data.activeSession]);
    else syncShoppersUI([]);
    if (data.logs) data.logs.forEach(appendLog);
    if (data.customers && data.customers.length > 0) {
      displayPass(data.customers[0]);
    }
    if (data.storeConfig && data.storeConfig.maxCapacity) {
      currentStoreCapacity = data.storeConfig.maxCapacity;
    }
    if (data.occupancy) updateOccupancyUI(data.occupancy);
    if (data.alarmActive && data.securityLogs && data.securityLogs.length > 0) {
      triggerAntiTheftAlarm(data.securityLogs[0]);
    }
    if (data.securityLogs) renderSecurityLogs(data.securityLogs);

    // Initial Stage Positioning based on in-store shoppers
    if (typeof setGuidedStep === 'function') {
      if (data.activeSessions && data.activeSessions.length > 0) {
        setGuidedStep('shopping');
      } else {
        setGuidedStep('entry');
      }
    }
  });

  evt.addEventListener('sessions_updated', e => {
    const sessions = JSON.parse(e.data);
    syncShoppersUI(sessions);
  });

  evt.addEventListener('session_updated', e => {
    const session = JSON.parse(e.data);
    if (session) {
      const idx = activeSessionsList.findIndex(s => s.sessionId === session.sessionId);
      if (idx >= 0) activeSessionsList[idx] = session;
      else activeSessionsList.push(session);
      syncShoppersUI(activeSessionsList);
    }
  });

  evt.addEventListener('occupancy_updated', e => {
    const occ = JSON.parse(e.data);
    updateOccupancyUI(occ);
  });

  evt.addEventListener('security_alarm', e => {
    const payload = JSON.parse(e.data);
    triggerAntiTheftAlarm(payload.incident);
  });

  evt.addEventListener('security_alarm_cleared', e => {
    clearSecurityAlarmUI();
  });

  evt.addEventListener('security_logs_updated', e => {
    const logs = JSON.parse(e.data);
    renderSecurityLogs(logs);
  });

  evt.addEventListener('products_updated', e => {
    const products = JSON.parse(e.data);
    renderProducts(products);
  });

  evt.addEventListener('customer_notification', e => {
    const notif = JSON.parse(e.data);
    showCustomerNotification(notif.type, notif.title, notif.message);
  });

  evt.addEventListener('esp32_heartbeat', e => {
    lastEspPing = Date.now();
    updateEspStatus(true);
  });

  evt.addEventListener('hardware_update', e => {
    const payload = JSON.parse(e.data);
    if (payload.command) {
      if (payload.command.action === 'OPEN_ENTRY_GATE') triggerGateAnimation('entry', true);
      if (payload.command.action === 'OPEN_EXIT_GATE') triggerGateAnimation('exit', true);
      if (payload.command.action === 'ALARM_THEFT') {
        playBuzzerTone('ALARM_THEFT');
      }
    }
  });

  evt.addEventListener('log', e => {
    appendLog(JSON.parse(e.data));
  });

  evt.onerror = () => {
    console.warn("SSE connection reconnecting in 2s...");
  };
}

window.addEventListener('DOMContentLoaded', () => {
  initSSE();
});
