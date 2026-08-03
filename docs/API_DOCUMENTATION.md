# เอกสารอธิบาย REST API (API Documentation)

ระบบ API ทั้งหมดแบ่งออกเป็น 2 หมวดหลัก:
1. **Web Application API** (สำหรับ Frontend หน้าเว็บ)
2. **ESP32 Device REST API** (สำหรับอุปกรณ์กล่องยา)

---

## 1. Web Application API (Authentication Required: Bearer JWT Token)

### 1.1 Authentication & Profile
- `POST /api/auth/register` - ลงทะเบียนผู้ใช้ใหม่
- `POST /api/auth/login` - เข้าสู่ระบบ (รับ JWT Token)
- `GET /api/auth/profile` - ดึงข้อมูลผู้ใช้ปัจจุบัน
- `PUT /api/auth/profile` - อัปเดตข้อมูลผู้ใช้ / เปลี่ยนรหัสผ่าน

### 1.2 Devices (Medication Boxes)
- `GET /api/devices` - ดึงรายการกล่องยาของผู้ใช้ทั้งหมด พร้อมสถานะ Online/Offline, แบตเตอรี่ และเวลาถัดไป
- `POST /api/devices/verify` - ยืนยัน Serial Number และผูกอุปกรณ์กับบัญชีผู้ใช้
- `PUT /api/devices/:id` - แก้ไขข้อมูลกล่องยา (ชื่อกล่อง, สถานที่, ชื่อยา, อัปโหลดรูปภาพ)
- `DELETE /api/devices/:id` - ลบกล่องยาออกจากระบบ

### 1.3 Schedules & Repetitions
- `GET /api/schedules/box/:boxId` - ดึงตารางเวลาแจ้งเตือนของกล่องยา
- `POST /api/schedules/save` - บันทึก/อัปเดตตารางเวลาการรับประทานยา (ก่อน/หลังอาหาร, รอบเตือนซ้ำ)

### 1.4 History & Telemetry
- `GET /api/history` - ดึงประวัติการรับประทานยา (รองรับตัวกรอง `box_id` และ `days`)
- `GET /api/history/battery/:boxId` - ดึงประวัติระดับแบตเตอรี่ย้อนหลัง

### 1.5 Audit Logs
- `GET /api/audit` - ดึงบันทึกประวัติการใช้งานระบบ (Login, Create Device, Edit Schedule, Profile Changes)

---

## 2. ESP32 Device REST API (No Session Token Required / Uses Hardware Device Code Header)

### 2.1 Telemetry Heartbeat
- **Endpoint**: `POST /api/esp32/heartbeat`
- **Header**: `x-device-code: BOX-CEB123`
- **Body**:
  ```json
  {
    "device_code": "BOX-CEB123",
    "battery_level": 85,
    "firmware_version": "v1.0.0"
  }
  ```
- **Response**:
  ```json
  {
    "status": "success",
    "box_id": 1,
    "schedule_version": 1700000001,
    "server_time": "2026-08-02T13:55:00.000Z"
  }
  ```

### 2.2 Download Schedule
- **Endpoint**: `GET /api/esp32/schedule?device_code=BOX-CEB123`
- **Response**:
  ```json
  {
    "device_code": "BOX-CEB123",
    "box_id": 1,
    "medicine_name": "พาราเซตามอล 500 mg",
    "schedule_version": 1700000001,
    "schedules": [
      {
        "schedule_id": 1,
        "time": "08:00:00",
        "meal_timing": "before_meal",
        "repeat_day": "Everyday",
        "repeat_count": 3,
        "repeat_interval_min": 5
      }
    ]
  }
  ```

### 2.3 Upload Intake Event Log
- **Endpoint**: `POST /api/esp32/intake`
- **Body**:
  ```json
  {
    "device_code": "BOX-CEB123",
    "schedule_id": 1,
    "status": "Taken"
  }
  ```

### 2.4 Firmware OTA Update Check
- **Endpoint**: `GET /api/esp32/firmware/check?version=v1.0.0`
