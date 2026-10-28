# MedBox: IoT Medication Reminder Box System
## Medication Reminder Box with ESP32 + Web Dashboard

ระบบแจ้งเตือนการรับประทานยาด้วยกล่องอัจฉริยะที่ผสาน ESP32, เว็บแอปพลิเคชัน และฐานข้อมูล MariaDB เพื่อช่วยติดตามเวลาและสถานะการรับประทานยาอย่างต่อเนื่องสำหรับผู้ดูแลและผู้ป่วย

พัฒนาขึ้นเพื่อการศึกษาและใช้งานจริงในโครงการระบบ IoT สำหรับการจัดการยาแบบอัตโนมัติ

---

## ✅ ภาพรวมของระบบ

ระบบนี้ประกอบด้วย 3 ส่วนหลัก ได้แก่:

- Web Application สำหรับผู้ดูแลและผู้ดูแลระบบ
- ESP32 Firmware สำหรับกล่องยาและเซ็นเซอร์
- MariaDB Database สำหรับจัดเก็บข้อมูลตารางเวลา, ประวัติการรับประทานยา, อุปกรณ์และ Log

ผู้ใช้งานสามารถ:
- ลงทะเบียน / เข้าสู่ระบบ
- ผูกกล่องยา ESP32 กับผู้ใช้แบบยืนยัน Serial Number
- กำหนดตารางเวลาแจ้งเตือนก่อนหรือหลังอาหาร
- ตรวจสอบสถานะออนไลน์/ออฟไลน์ของอุปกรณ์แบบเรียลไทม์
- ดูประวัติการรับประทานยา
- จัดการผู้ใช้งานและติดตาม Audit Log ในหน้าของ Admin

---

## 🌟 ฟีเจอร์หลักที่ใช้งานได้จริง

- 🔐 Authentication & Authorization
  - สมัครสมาชิกและเข้าสู่ระบบ
  - JWT Token-based authentication
  - Password hashing ด้วย bcryptjs
  - Role-based access control สำหรับ Caregiver และ Admin
  - Security middleware: Helmet, CORS, Rate Limiter

- 📱 Device Pairing & Verification
  - ยืนยัน Device Code หรือ Serial Number ของ ESP32
  - ผูกกล่องยาเข้ากับบัญชีผู้ใช้ด้วยอุปกรณ์จริง
  - บันทึกสถานะออนไลน์/ออฟไลน์จาก heartbeat

- ⏰ Medication Schedule Management
  - กำหนดเวลาแจ้งเตือนได้หลายช่วงต่อวัน
  - เลือกโหมดก่อนอาหารหรือหลังอาหาร
  - ตั้งค่ารอบเตือนซ้ำและช่วงเวลาห่างระหว่างการเตือน
  - รองรับการกำหนดวันในสัปดาห์หรือทำซ้ำทุกวัน

- 📟 ESP32 Smart Reminder Logic
  - LED และ buzzer ทำงานตามเวลาที่กำหนด
  - Reed switch ตรวจสอบการหยิบยาออกจากกล่อง
  - ปุ่มกดหยุดเสียงเตือนแบบชั่วคราวแล้วให้ LED ยังคงติดจนกว่าจะยกขวดยาออก
  - ระบบคำนึงถึงสถานะ Taken, Taken Early และ Missed

- 📊 History & Monitoring
  - บันทึกประวัติการรับประทานยาตามตารางเวลา
  - จัดแสดงประวัติย้อนหลัง
  - ดูข้อมูลกล่องยาใน dashboard และ device monitor

- 🛡️ Admin Features
  - Dashboard ภาพรวมผู้ใช้, กล่องยา, สถิติการใช้งาน
  - ดูประวัติการทำงานแบบรวมศูนย์และ Audit Log
  - ปิดใช้งานผู้ใช้หรือยกเลิกผูกอุปกรณ์ได้จากหน้า Admin
  - ดูข้อมูลอุปกรณ์ทั้งหมดในระบบ

---

## 🧩 หน้าเว็บที่มีในโปรเจกต์

- Login page
- Register page
- Dashboard
- Add box
- Edit box
- History
- Profile
- Verify device
- Device monitor
- Admin dashboard

---

## 🛠️ เทคโนโลยีที่ใช้

### Frontend
- HTML5, CSS3
- Bootstrap 5
- Vanilla JavaScript
- Fetch API

### Backend
- Node.js
- Express.js
- MariaDB / MySQL
- JWT and bcryptjs
- Multer
- Helmet, CORS, express-validator, rate-limit

### Firmware
- ESP32 Arduino / C++
- OLED SSD1306
- HTTP client and ArduinoJson

---

## 🔌 ESP32 Hardware Pin Mapping

| GPIO Pin | อุปกรณ์ | หน้าที่ |
| :--- | :--- | :--- |
| GPIO14 | Active Buzzer | ส่งเสียงเตือน |
| GPIO25 | LED ก่อนอาหาร | สถานะก่อนอาหาร |
| GPIO32 | LED หลังอาหาร | สถานะหลังอาหาร |
| GPIO27 | Reed Switch | ตรวจจับการหยิบยาออก |
| GPIO19 | Push Button | หยุด buzzer ชั่วคราว |
| GPIO21 | OLED SDA | ข้อมูลจอ OLED |
| GPIO22 | OLED SCL | สัญญาณ Clock ของ OLED |

---

## 🚀 วิธีเริ่มต้นใช้งาน

### 1. ติดตั้ง dependencies
```bash
npm install
```

### 2. สร้างฐานข้อมูล
```bash
mysql -u root -p < sql/schema.sql
```

### 3. ตั้งค่า environment
ตรวจสอบไฟล์ `.env` หรือค่าการตั้งค่าฐานข้อมูลในโค้ดให้ตรงกับสภาพแวดล้อมของคุณ

### 4. เริ่มต้นเซิร์ฟเวอร์
```bash
npm start
```

หรือรันแบบ development:
```bash
npm run dev
```

### 5. เปิดใช้งานในเบราว์เซอร์
```text
http://localhost:3000
```

---

## 👤 บัญชีทดสอบ

| บทบาท | Username | Password |
| :--- | :--- | :--- |
| Caregiver | PON | 123456 |
| Admin | admin | 12345 |

---

## 📘 เอกสารประกอบ

- [docs/INSTALLATION.md](docs/INSTALLATION.md)
- [docs/API_DOCUMENTATION.md](docs/API_DOCUMENTATION.md)
- [docs/FOLDER_STRUCTURE.md](docs/FOLDER_STRUCTURE.md)
- [README_DEVICE.md](README_DEVICE.md)

---

## 📌 หมายเหตุการใช้งาน

- ESP32 จะส่ง heartbeat ต่อเนื่องเพื่ออัปเดตสถานะออนไลน์/ออฟไลน์
- ระบบรองรับการอัปเดตตารางเวลาให้ ESP32 โหลดข้อมูลใหม่ทันทีเมื่อมีการเปลี่ยนแปลง
- ภาพรวมและรายงานต่าง ๆ ถูกเก็บไว้ในฐานข้อมูลเพื่ออำนวยความสะดวกสำหรับการจัดการในระดับผู้ดูแลระบบ

---

## 🏷️ Repository Info

Project Name: MedBox
Type: IoT + Healthcare + Web Application
Platform: ESP32 + Node.js + MariaDB
Status: Active development / working prototype
