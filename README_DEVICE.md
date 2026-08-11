ESP32 ↔ Web (MariaDB) Integration
=================================

This document shows how the ESP32 firmware, Node.js server and MariaDB-backed web app communicate, and provides example URLs to use when configuring devices.

1) Server base URL (replace HOST with your server IP or domain):

   - Web UI / static site: http://HOST:3000/
   - Example device monitor page: http://HOST:3000/device-monitor.html

2) ESP32 API endpoints used by firmware (HTTP):

   - Heartbeat (ESP32 -> Server, POST):
     http://HOST:3000/api/esp32/heartbeat
     Headers: `x-device-code: <DEVICE_CODE>`
     Body: JSON { device_code, battery_level, firmware_version }

   - Get schedule (ESP32 -> Server, GET):
     http://HOST:3000/api/esp32/schedule?device_code=<DEVICE_CODE>
     Header `x-device-code` optional

   - Upload intake log (ESP32 -> Server, POST):
     http://HOST:3000/api/esp32/intake
     Headers: `x-device-code: <DEVICE_CODE>`
     Body: JSON { device_code, schedule_id, status }

   - Firmware OTA check (ESP32 -> Server, GET):
     http://HOST:3000/api/esp32/firmware/check?version=<CURRENT_VERSION>

3) Frontend helpers

  - Use `public/js/api.js` which now exposes these convenience methods:
    - `API.getMyDevices()` — GET `/api/devices`
    - `API.getDeviceSchedule(deviceCode)` — GET `/api/esp32/schedule?device_code=...`
    - `API.sendIntakeLog(deviceCode, body)` — POST `/api/esp32/intake`
    - `API.checkFirmware(version)` — GET `/api/esp32/firmware/check?version=...`

4) Quick GitHub push steps

  ```bash
  git add .
  git commit -m "Add device monitor and frontend helpers for ESP32 integration"
  git push origin main
  ```

5) MariaDB

  - Ensure the server `src/config/db.js` is configured to connect to your MariaDB instance and migrations/schema are applied (`sql/schema.sql`).

6) ESP32 configuration

  - Edit `firmware/esp32_medbox/esp32_medbox.ino` and set:
    - `WIFI_SSID`, `WIFI_PASSWORD`
    - `SERVER_URL` to `http://HOST:3000`
    - `DEVICE_CODE` to the device serial found in the web UI

7) Example full URLs (replace HOST and DEVICE_CODE):

  - Device monitor: http://192.168.1.100:3000/device-monitor.html
  - Get schedule: http://192.168.1.100:3000/api/esp32/schedule?device_code=BOX-CEB123
  - Heartbeat (POST): http://192.168.1.100:3000/api/esp32/heartbeat

If you want, I can:
 - Commit & push these changes to a GitHub repo (need remote URL and permission), or
 - Convert the HTTP flow to MQTT/WebSocket for real-time updates.
