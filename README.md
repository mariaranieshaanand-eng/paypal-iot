# 🚀 PayPal IoT Auto-Billing & Smart Store Management System

> **PayPal Hackathon 2026 Project**  
> Autonomous Micro-Retail with Customer Recognition, Real-Time Low-Stock Inventory Alerts, Time-Limited Flash Discounts, Visual Sales Analytics (Bar & Pie Charts), Dual Portals, and ESP32 Smart Gate Barrier.

---

## 💳 How PayPal is Integrated (Sandbox Environment)
- **PayPal Orders & Checkout REST API (Sandbox):** Manages dynamic order pricing (items, promotions, sales tax) and generates instant One-Touch auto-settlements (`PAYPAL-TXN-xxxx`).
- **Cryptographic Gate Verification:** The physical ESP32 electromagnetic gate barrier is held locked and only receives the unlock pulse after receiving verified payment settlement confirmation.
- **PayPal Invoicing & Identity:** Links customer accounts (`PAYPAL-ACC-88219`) to their shopping history and generates official non-zero tax invoices with multi-channel receipts (WhatsApp, Email, SMS).

---

## 🤖 How AI is Integrated
- **Edge Optical Computer Vision & Barcode Detection Model (`BarcodeDetector` API):** Processes camera feeds in real time to recognize product barcodes and QR customer passes with laser targeting HUD, removing the need for physical scanners.
- **Predictive Sales Velocity & Inventory Intelligence:** Algorithmic retail engine that classifies fast-moving vs. slow-moving stock, flags low-stock warnings (`< 5` units), and generates dynamic flash discounts (10% to 30%) with countdown timers.
- **Antigravity Agentic AI Platform:** Used to design and orchestrate real-time state synchronization across the Node.js backend, client kiosks, and ESP32 embedded C++ firmware.

---

## 🌟 Key System Capabilities

### 1. 🛒 Customer Self-Checkout Kiosk
- **✨ Step-by-Step Guided Customer Journey**: Completely declutters the shopping experience by presenting only what the customer needs at each exact step:
  - **Step 1 (Entrance)**: Only the Entry Gate & Pass QR interface are displayed. Store goods are completely hidden.
  - **Step 2 (In-Store Shopping)**: Once the customer enters, the Goods Shelf, Barcode Scanner, and Active Live Cart appear with an instant "Proceed to Exit & Pay" option.
  - **Step 3 (Exit Barrier)**: Focused exit screen with One-Touch PayPal Auto-Pay and anti-theft barrier controls.
  - **Step 4 (Goodbye & Receipt)**: Once payment is made and the customer leaves, store goods are hidden! An official Tax Invoice and digital receipts (WhatsApp, Email, SMS) are presented before returning to the entrance for the next shopper.
- **📷 Real-Time Optical Camera Barcode & QR Scanner**: Shoppers can use their laptop webcam or mobile phone camera to scan physical QR passes and product barcodes directly in real time, with laser reticle HUD and audio scan chirps!
- **👥 Live Store Occupancy & Capacity Monitor**: Tracks in-store shoppers in real time (e.g. `2 / 4 Shoppers`). If the store reaches maximum capacity, the Entry Gate automatically locks to prevent overcrowding until a customer exits.
- **🚨 Anti-Theft Shoplifting Security System**: If a shopper attempts to breach the exit barrier with unpaid items in their cart, the system instantly engages **Security Lockdown**:
  - The electromagnetic gate deadbolts.
  - An emergency dual-tone police siren sounds through both the ESP32 hardware buzzer and web audio synthesizer.
  - The blue LED on GPIO 2 strobes rapidly.
  - The incident is logged in the Store Owner Portal with the customer's name, timestamp, and intercepted unpaid items!
- **Concurrent Multi-Customer Shopping**: Multiple shoppers can enter the store simultaneously! Each customer maintains an independent live cart and receives their own separate bill.
- **Pre-Booking Pass & Unique ID**: Customers book slots and receive unique customer IDs (`CUST-001`, `CUST-002`, `PP-BOOK-1001`).
- **Persistent Recognition & Loyalty**: Webpage remembers returning customers, tracks visit counts, dollar spend, and loyalty tiers (*VIP Platinum*, *Gold Member*, *Silver Member*).
- **Live Guidance Notifications**: Real-time instructions guide the shopper at every step:
  - 🚪 *"Door unlocked! Welcome to the shop, [Customer Name]!"*
  - 🛍️ *"Scanned [Item Name] ($X.XX) • Running Total: $Y.YY"*
  - 💳 *"Amount paid via PayPal! Exit barrier UNLOCKED. Now you may exit the shop."*
- **Barcode Item Scanning**: Contact-free item scanner with audio chimes.
- **PayPal One-Touch Auto-Pay**: Seamless exit gate unlock upon instant settlement.
- **Official Tax Invoice & Digital Receipts**: Dedicated non-zero Tax Invoice printing, executive itemized WhatsApp messages, Email drafts, and SMS notifications.

### 2. 🔐 Protected Store Owner Management Portal (PIN: `8899`)
- **Restricted Access**: Customers cannot tamper with store goods; only the authenticated Store Proprietor has access.
- **🛡️ Anti-Theft Security Incident Logs & Capacity Control**:
  - Live table of intercepted shoplifting attempts and barrier breaches with 1-click Disarm & Clear button.
  - Owner can dynamically adjust maximum store capacity (2, 3, 4, 6, 10 shoppers).
- **Visual Sales Analytics**:
  - 📊 **Bar Chart**: Real-time graph showing best-selling fast-moving goods vs. lowest-selling goods.
  - 🥧 **Pie Chart**: Category revenue distribution across Beverages, Snacks, Electronics, Produce, and Dry Fruits.
  - 💰 **Financial KPIs**: Total Store Revenue, Completed Walk-Out Orders, and Catalog counts.
- **Real-Time Inventory & Low-Stock Alerts**:
  - Automatically tracks remaining shelf stock.
  - ⚠️ **Low Stock Warning Alert**: Prominently highlights items when stock is `< 5` units.
  - **⚡ Quick Restock (+10 units)**: 1-click restock action.
  - **➕ Add / 🗑️ Delete Products**: Exclusive owner catalog controls.
- **⚡ Time-Limited Flash Discounts**:
  - Owner sets promotional discounts (10%, 15%, 20%, 25%, 30%) for a set duration (15m, 30m, 1h, 2h).
  - Product shelves display live countdown tickers and slashed pricing.
- **🌟 Frequent Customers / VIP Directory**:
  - Tracks top repeat shoppers by visit frequency, total revenue generated, and favorite items.

---

## ⚡ Quickstart Setup Instructions

### 1. Launch Server
- **Windows**: Double-click [`start_server.bat`](file:///C:/Users/maria/.gemini/antigravity/scratch/paypal_iot_checkout/start_server.bat).  
- **Mac / Linux / Terminal**: Run `node server.js`.
*(To stop, double-click [`stop_server.bat`](file:///C:/Users/maria/.gemini/antigravity/scratch/paypal_iot_checkout/stop_server.bat)).*

### 2. Open in Browser
Open `http://localhost:3000` (or `http://<YOUR_IP>:3000` on your mobile phone on the same hotspot).

### 3. Switch Roles
- Click **[🛒 Customer Self-Checkout Kiosk]** for customer shopping.
- Click **[🔐 Store Owner Management Portal]** and enter PIN **`8899`** to manage inventory, view charts, and launch flash discounts.

---

## 🔌 ESP32 Circuit (Zero Extra Hardware!)

| Component | Pin | ESP32 GPIO | Description |
|:---|:---|:---|:---|
| **Active/Passive Buzzer** | **(+) Longer Leg** | **D14 (GPIO 14)** | Audio Chimes for Scans & Sirens |
| **Active/Passive Buzzer** | **(-) Shorter Leg** | **GND** | Ground |
| **Magnetic Lock** | **Onboard Blue LED** | **GPIO 2** | OFF = Locked, ON = Gate Unlocked / Released |

Firmware source: [`firmware/paypal_esp32_gate.ino`](file:///C:/Users/maria/.gemini/antigravity/scratch/paypal_iot_checkout/firmware/paypal_esp32_gate.ino).

---

## 📜 License
This project is open-source and licensed under the **[MIT License](LICENSE)** (Approved by the Open Source Initiative - OSI).
