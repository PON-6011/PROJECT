# คู่มือการติดตั้งและใช้งานระบบ (Installation Guide)

ระบบกล่องแจ้งเตือนการรับประทานยาและระบบตั้งเวลาผ่านเว็บแอปพลิเคชัน (IoT Medication Reminder Box System)

---

## 1. ข้อกำหนดของระบบ (System Requirements)

- **Node.js**: เวอร์ชัน v18.x หรือใหม่กว่า
- **MariaDB / MySQL**: เวอร์ชัน 10.5+ หรือ 8.0+
- **Arduino IDE**: เวอร์ชัน 2.x สำหรับคอมไพล์ ESP32 Firmware
- **ESP32 Microcontroller Board**: ESP32 NodeMCU / ESP WROOM 32

---

## 2. ขั้นตอนการเตรียมและติดตั้งฐานข้อมูล (Database Setup)

1. เปิดโปรแกรม MariaDB / MySQL Command Line หรือ phpMyAdmin / DBeaver
2. รันคำสั่งจากไฟล์ SQL ที่เตรียมไว้ในโฟลเดอร์ `sql/schema.sql`:
   ```bash
   mysql -u root -p < sql/schema.sql
   ```
   *หมายเหตุ: สคริปต์ SQL จะทำการสร้างฐานข้อมูล `medbox_db` พร้อมตาราง, Foreign Keys, Indexes และข้อมูลตัวอย่าง (Seed Data) โดยอัตโนมัติ*

---

## 3. ขั้นตอนการติดตั้งและรัน Web Server (Node.js & Express)

1. เปิด Terminal ในโฟลเดอร์โปรเจกต์ `C:\Users\phonp\Desktop\เว็บโปรเจกต์`
2. ติดตั้ง Dependencies:
   ```bash
   npm install
   ```
3. ตรวจสอบไฟล์ `.env` สำหรับกำหนดค่าตั้งต้น:
   ```env
   PORT=3000
   NODE_ENV=development

   DB_HOST=localhost
   DB_PORT=3306
   DB_USER=root
   DB_PASSWORD=root
   DB_NAME=medbox_db

   JWT_SECRET=medbox_super_secret_jwt_key_2026
   JWT_EXPIRES_IN=7d
   ```
4. เริ่มต้นรันเซิร์ฟเวอร์:
   ```bash
   npm start
   ```
5. เข้าใช้งานผ่านเว็บเบราว์เซอร์:
   👉 **http://localhost:3000**

---

## 4. บัญชีผู้ใช้ทดสอบ (Demo User Credentials)

- **ผู้ดูแลผู้ป่วย (Caregiver)**:
  - Username: `somchai`
  - Password: `Password123!`
- **ผู้ดูแลระบบ (Admin)**:
  - Username: `admin`
  - Password: `Password123!`

---

## 5. การอัปโหลดโปรแกรมลง ESP32 Firmware

1. เปิดโปรแกรม Arduino IDE
2. เปิดไฟล์ `firmware/esp32_medbox/esp32_medbox.ino`
3. ติดตั้งไลบรารีที่จำเป็นผ่าน Library Manager:
   - `ArduinoJson` (v6.x)
   - `Adafruit SSD1306` & `Adafruit GFX Library`
4. แก้ไขชื่อ Wi-Fi และ IP Address ของเครื่องเซิร์ฟเวอร์ในโค้ด:
   ```cpp
   const char* WIFI_SSID     = "ชื่อไวไฟของคุณ";
   const char* WIFI_PASSWORD = "รหัสผ่านไวไฟ";
   const char* SERVER_URL    = "http://192.168.1.XX:3000"; // IP เครื่องที่รัน Node.js
   const char* DEVICE_CODE   = "BOX-CEB123";
   ```
5. เลือก Board `ESP32 Dev Module` และพอร์ต COM Port แล้วทำการ **Upload**
