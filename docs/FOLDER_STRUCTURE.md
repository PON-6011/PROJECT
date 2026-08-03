# โครงสร้างโปรเจกต์ (Folder Structure)

```
c:\Users\phonp\Desktop\เว็บโปรเจกต์
├── docs/
│   ├── INSTALLATION.md         # คู่มือการติดตั้งและรันระบบ
│   ├── API_DOCUMENTATION.md    # เอกสาร REST API
│   └── FOLDER_STRUCTURE.md     # เอกสารอธิบายโครงสร้างไฟล์
├── firmware/
│   └── esp32_medbox/
│       └── esp32_medbox.ino    # ซอร์สโค้ด ESP32 Microcontroller (C++)
├── public/                     # Frontend Static Web Application
│   ├── css/
│   │   └── style.css           # Custom Bootstrap 5 Modern Minimal Theme
│   ├── js/
│   │   ├── api.js              # Fetch API Client Module + JWT
│   │   ├── auth.js             # Authentication Logic
│   │   ├── dashboard.js        # Dashboard & Live Telemetry Logic
│   │   ├── verify-device.js    # Device Pairing Logic
│   │   ├── add-box.js          # Add Box & Schedule Setup Logic
│   │   ├── edit-box.js         # Edit Box & Schedule Logic
│   │   ├── history.js          # Medication History Logic
│   │   └── profile.js          # User Profile Logic
│   ├── 404.html                # Page Not Found Error Page
│   ├── 500.html                # Server Error Page
│   ├── add-box.html            # หน้าเพิ่มกล่องยา
│   ├── dashboard.html          # หน้าแดชบอร์ดหลัก
│   ├── edit-box.html           # หน้าแก้ไขกล่องยา
│   ├── history.html            # หน้าประวัติการหยิบยา
│   ├── index.html              # Entry Page Redirector
│   ├── login.html              # หน้าเข้าสู่ระบบ
│   ├── profile.html            # หน้าจัดการโปรไฟล์
│   ├── register.html           # หน้าลงทะเบียน
│   └── verify-device.html      # หน้าผูกและยืนยัน Serial อุปกรณ์
├── sql/
│   └── schema.sql              # สคริปต์ MariaDB SQL พร้อม Seed Data
├── src/                        # Backend Application (MVC + Repository Pattern)
│   ├── config/
│   │   ├── db.js               # MariaDB Connection Pool & Auto-Initialization
│   │   └── env.js              # Environment Variables Wrapper
│   ├── controllers/
│   │   ├── auditController.js
│   │   ├── authController.js
│   │   ├── deviceController.js
│   │   ├── esp32Controller.js
│   │   ├── historyController.js
│   │   └── scheduleController.js
│   ├── middlewares/
│   │   ├── auth.js             # JWT Verification & Role Check
│   │   ├── errorHandler.js     # Centralized Error & 404 Handler
│   │   ├── upload.js           # Multer Storage for Medicine Images
│   │   └── validate.js         # Express Validator Schemas
│   ├── repositories/
│   │   ├── auditRepository.js
│   │   ├── deviceRepository.js
│   │   ├── historyRepository.js
│   │   ├── scheduleRepository.js
│   │   └── userRepository.js
│   ├── routes/
│   │   ├── auditRoutes.js
│   │   ├── authRoutes.js
│   │   ├── deviceRoutes.js
│   │   ├── esp32Routes.js
│   │   ├── historyRoutes.js
│   │   └── scheduleRoutes.js
│   ├── services/
│   │   ├── auditService.js
│   │   ├── authService.js
│   │   ├── deviceService.js
│   │   ├── historyService.js
│   │   └── scheduleService.js
│   └── app.js                  # Express Application Configuration
├── uploads/                    # โฟลเดอร์เก็บรูปภาพยาที่อัปโหลด
│   └── default_medicine.png
├── .env                        # ไฟล์กำหนดค่าระบบ
├── .env.example                # ไฟล์ตัวอย่าง Environment Variables
├── .gitignore                  # GitHub Gitignore Rules
├── package.json                # Project Dependencies & Scripts
├── README.md                   # เอกสารอธิบายโปรเจกต์
└── server.js                   # Server Entry Point
```
