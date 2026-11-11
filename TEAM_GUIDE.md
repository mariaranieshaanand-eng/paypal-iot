# 👥 Team Collaboration & Setup Guide (PayPal Hackathon 2026)

Welcome to the **PayPal IoT Autonomous Retail & Auto-Billing System** team repository!

---

## 🚀 Quick Setup for Teammates (Getting Started in 2 Minutes)

### 1. Clone the Repository
Open your terminal or GitHub Desktop and clone:
```bash
git clone https://github.com/<YOUR_GITHUB_USERNAME>/paypal-iot-autonomous-retail.git
cd paypal-iot-autonomous-retail
```

### 2. Run the Server
- **Windows (Easiest)**: Double-click `start_server.bat`
- **Mac / Linux / Terminal**: Run:
  ```bash
  node server.js
  ```
- The terminal will display:
  - 💻 **Laptop UI**: `http://localhost:3000`
  - 📱 **Mobile UI**: `http://<YOUR_WIFI_IP>:3000`
  - 🔐 **Owner Portal PIN**: `8899`

---

## 🛠️ Project File Structure

```text
├── server.js               # Node.js backend & in-memory retail database
├── start_server.bat        # 1-click Windows server launcher with auto-port freeing
├── stop_server.bat         # 1-click port release utility
├── open_firewall_port.bat  # Opens Windows Firewall port 3000 for mobile testing
├── public/                 # Frontend Web Application (Zero Framework, Pure Web Standards)
│   ├── index.html          # Guided Customer Kiosk & Owner Portal UI
│   ├── app.js              # Kiosk flow, Camera scanner, Charts & PayPal checkout
│   └── style.css           # Bright PayPal-themed responsive styling
├── firmware/               # ESP32 IoT Code
│   ├── paypal_esp32_gate.ino  # Production firmware for Buzzer (D14) & Gate LED (GPIO 2)
│   └── quick_buzzer_test.ino  # 3-second hardware circuit diagnostic
└── simulation/             # Automated test suite (Tests all scenarios)
```

---

## 🌿 Git Branching Strategy for the Team

To avoid stepping on each other's toes during the hackathon:

1. **Keep `main` working and deployable at all times**.
2. **Create feature branches** for your assigned task:
   ```bash
   # Create and switch to your feature branch
   git checkout -b feature/your-name-task

   # Make changes and commit
   git add .
   git commit -m "Add new feature description"

   # Push your branch to GitHub
   git push -u origin feature/your-name-task
   ```
3. Open a **Pull Request (PR)** on GitHub to merge into `main`.

---

## 🔌 Hardware Circuit Reference (Zero-Shield Setup)

| Component | Pin | ESP32 GPIO | Function |
|:---|:---|:---|:---|
| **Piezo Buzzer (+)** | Longer Leg | **GPIO 14 (D14)** | Audio chimes & security sirens |
| **Piezo Buzzer (-)** | Shorter Leg | **GND** | Ground |
| **Gate Lock Indicator** | Onboard Blue LED | **GPIO 2** | OFF = Locked, ON = Unlocked |
