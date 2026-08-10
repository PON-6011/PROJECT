# กล่องแจ้งเตือนการรับประทานยาและระบบตั้งเวลาผ่านเว็บแอปพลิเคชัน
## IoT Medication Alert Boxes and Scheduling System via Web Application

พัฒนาขึ้นเพื่อการศึกษาตามหลักสูตรวิศวกรรมศาสตรบัณฑิต สาขาวิชาวิศวกรรมคอมพิวเตอร์ คณะวิศวกรรมศาสตร์ มหาวิทยาลัยนราธิวาสราชนครินทร์ (2569)

---

## 🌟 ฟีเจอร์หลักของระบบ (System Features)

- 🔐 **ระบบบัญชีผู้ใช้และความปลอดภัย**: สมัครสมาชิก, เข้าสู่ระบบ, JWT Token, การเข้ารหัสรหัสผ่านด้วย bcrypt, Role-based Protection, Rate Limiting และ Helmet Security
- 📱 **การผูกและยืนยันอุปกรณ์ (Device Pairing)**: ตรวจสอบ Serial Number ประจำเครื่อง ESP32 (เช่น `BOX-CEB123`) เพื่อผูกกล่องยากับผู้ใช้อย่างถาวร
- ⏰ **การตั้งเวลาเตือนซ้ำและช่วงเวลารับประทาน**:
  - กำหนดเวลาเตือนได้ 1 - 4 ช่วงเวลาต่อวัน
  - กำหนดช่วงเวลาก่อนอาหาร (**ไฟ LED สีเหลือง GPIO15**) หรือ หลังอาหาร (**ไฟ LED สีน้ำเงิน GPIO25**)
  - กำหนดรอบเตือนซ้ำ (1-3 รอบ) และช่วงเวลาเว้นระยะการเตือนซ้ำ (5 นาที)
  - กำหนดวันในสัปดาห์ (ทุกวัน หรือ ระบุวัน)
- 🔋 **การติดตามสถานะและแบตเตอรี่ (Live Telemetry & Battery Monitoring)**:
  - ESP32 ส่ง Heartbeat ทุก 30 วินาที
  - แสดงสถานะ **ออนไลน์/ออฟไลน์** แบบเรียลไทม์บนแดชบอร์ด
  - วัดระดับแบตเตอรี่ 0-100% พร้อมบันทึกประวัติย้อนหลัง และแสดงผลบนหน้าจอ OLED
- 📊 **ประวัติการรับประทานยา (Medication History)**:
  - บันทึกสถานะการหยิบยา (`Taken` - ทานแล้ว, `Taken Early` - ทานก่อนเวลา, `Missed` - ลืมทาน)
  - จัดเก็บประวัติย้อนหลัง 30 วัน พร้อมระบบลบข้อมูลหมดอายุอัตโนมัติ
- 📜 **Audit Log**: บันทึกทุกกิจกรรมสำคัญของระบบ (เข้าสู่ระบบ, เพิ่ม/แก้ไข/ลบ กล่องยา, เปลี่ยนรหัสผ่าน)
- 📶 **รองรับการทำงานแบบ Local Offline Sync**: ESP32 ทำงานต่อได้ปกติแม้ Wi-Fi หลุด และทำการซิงก์ข้อมูลกับเซิร์ฟเวอร์โดยอัตโนมัติเมื่อ Wi-Fi กลับมาเชื่อมต่อ

---

## 🛠️ เทคโนโลยีที่ใช้ (Tech Stack)

### Frontend
- **HTML5 & CSS3** (Vanilla CSS Theme)
- **Bootstrap 5** (Responsive Layout)
- **Vanilla JavaScript (ES6)** & **Fetch API**

### Backend
- **Node.js** & **Express.js** (MVC + Repository Pattern)
- **MariaDB / MySQL** (Database Engine)
- **JWT (JSON Web Token)** & **bcryptjs** (Authentication)
- **Multer** (File Upload)
- **Helmet, CORS, Express Validator, Rate Limiter**

### Firmware (ESP32)
- **C++ (Arduino IDE)**
- **Adafruit SSD1306 OLED**
- **HTTP Client & ArduinoJson**

---

## 🔌 ผังการต่อพินฮาร์ดแวร์ ESP32 (Hardware Pinout Mapping)

| GPIO Pin | อุปกรณ์ (Hardware Component) | หน้าที่การทำงาน |
| :--- | :--- | :--- |
| **GPIO14** | Active Buzzer | ส่งสัญญาณเสียงเตือนเมื่อถึงเวลาทานยา |
| **GPIO15** | LED สีเหลือง | ไฟแสดงสถานะ "ก่อนอาหาร" (Before Meal) |
| **GPIO25** | LED สีน้ำเงิน | ไฟแสดงสถานะ "หลังอาหาร" (After Meal) |
| **GPIO32** | LED สีเขียว | ไฟแสดงสถานะ "รอการหยิบขวดยา" (Waiting for bottle removal) |
| **GPIO27** | Reed Switch Sensor | เซนเซอร์ตรวจจับการหยิบขวดยาออกจากตำแหน่ง |
| **GPIO19** | Push Button | ปุ่มกดสำหรับหยุดเสียงเตือน Buzzer (ไฟ LED ยังคงติดอยู่) |
| **GPIO21** | OLED SDA | สายข้อมูลจอแสดงผล OLED |
| **GPIO22** | OLED SCL | สายสัญญาณนาฬิกาจอแสดงผล OLED (แสดงผลระดับแบตเตอรี่ % เท่านั้น) |
| **GPIO34** | ADC Battery Input | วงจรแบ่งแรงดันสำหรับวัดระดับแบตเตอรี่ |

---

## 🚀 ขั้นตอนการเริ่มต้นใช้งานโปรเจกต์ (Quick Start)

### 1. ติดตั้ง Dependencies และสร้างฐานข้อมูล
```bash
# 1. ติดตั้ง Node.js Modules
npm install

# 2. นำเข้าไฟล์ SQL Schema เข้าสู่ MariaDB
mysql -u root -p < sql/schema.sql
```

### 2. เริ่มต้นรันระบบ (Run Application)
```bash
# เริ่มต้นรัน Web Server
npm start
```

### 3. ลิงก์สำหรับเข้าชมเว็บแอปพลิเคชัน
เปิดเบราว์เซอร์แล้วเข้าใช้งานได้ทันทีที่:
👉 **[http://localhost:3000](http://localhost:3000)**

---

## 👤 บัญชีผู้ใช้สำหรับทดสอบ (Demo User Accounts)

| บทบาท | Username | Password |
| :--- | :--- | :--- |
| **ผู้ดูแลผู้ป่วย (Caregiver)** | `PON` | `123456` |
| **ผู้ดูแลระบบ (Admin)** | `admin` | `12345` |

---

## 📄 เอกสารเพิ่มเติม (Documentation Links)

- 📖 [คู่มือการติดตั้ง (INSTALLATION.md)](file:///c:/Users/phonp/Desktop/เว็บโปรเจกต์/docs/INSTALLATION.md)
- 🔌 [รายละเอียด REST API (API_DOCUMENTATION.md)](file:///c:/Users/phonp/Desktop/เว็บโปรเจกต์/docs/API_DOCUMENTATION.md)
- 📁 [โครงสร้างโฟลเดอร์ (FOLDER_STRUCTURE.md)](file:///c:/Users/phonp/Desktop/เว็บโปรเจกต์/docs/FOLDER_STRUCTURE.md)
