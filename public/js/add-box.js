document.addEventListener('DOMContentLoaded', () => {
  const addBoxForm = document.getElementById('addBoxForm');
  const alertBox = document.getElementById('alertBox');
  const scheduleContainer = document.getElementById('scheduleContainer');
  const addScheduleBtn = document.getElementById('addScheduleBtn');
  const nextStepBtn = document.getElementById('nextStepBtn');
  
  const step1Container = document.getElementById('step1Container');
  const step2Container = document.getElementById('step2Container');
  const formActionsContainer = document.getElementById('formActionsContainer');
  const submitBtn = document.getElementById('submitBtn');

  // Days selection toggle
  const dayRadios = document.querySelectorAll('input[name="daySelectionType"]');
  const specificDaysContainer = document.getElementById('specificDaysContainer');

  dayRadios.forEach(radio => {
    radio.addEventListener('change', (e) => {
      if (e.target.value === 'specific') {
        specificDaysContainer.classList.remove('d-none');
      } else {
        specificDaysContainer.classList.add('d-none');
      }
    });
  });

  // Step 1 -> Step 2
  if (nextStepBtn) {
    nextStepBtn.addEventListener('click', () => {
      const deviceCode = document.getElementById('device_code').value.trim();
      if (!deviceCode) {
        alert('กรุณาระบุ Serial Number อุปกรณ์');
        return;
      }
      step1Container.classList.add('d-none');
      step2Container.classList.remove('d-none');
      formActionsContainer.classList.remove('d-none');
      submitBtn.classList.remove('d-none');
    });
  }

  let idCounter = 1;

  if (addScheduleBtn) {
    addScheduleBtn.addEventListener('click', () => {
      const currentCount = document.querySelectorAll('.schedule-row').length;
      if (currentCount >= 4) {
        alert('กำหนดเวลาแจ้งเตือนได้สูงสุด 4 ช่วงเวลาต่อวัน');
        return;
      }
      
      idCounter++;
      // Auto-suggest time based on current count
      const suggestIndex = currentCount + 1;
      
      const itemHtml = `
        <div class="row g-2 align-items-center mb-3 schedule-row" id="schedule_row_${idCounter}">
          <div class="col-md-5">
            <label class="form-label small text-muted">เวลาที่ ${suggestIndex}</label>
            <input type="time" class="form-control form-control-custom schedule-time" required value="${getSuggestedTime(suggestIndex)}">
          </div>
          <div class="col-md-5">
            <label class="form-label small text-muted">ช่วงเวลารับประทาน</label>
            <select class="form-select form-control-custom schedule-meal">
              <option value="before_meal">ก่อนอาหาร (ไฟสีเหลือง)</option>
              <option value="after_meal" ${suggestIndex % 2 === 0 ? 'selected' : ''}>หลังอาหาร (ไฟสีน้ำเงิน)</option>
            </select>
          </div>
          <div class="col-md-2 text-end pt-4">
            <button type="button" class="btn btn-outline-danger btn-sm" onclick="removeScheduleRow(${idCounter})">
              <i class="bi bi-trash"></i>
            </button>
          </div>
        </div>
      `;
      scheduleContainer.insertAdjacentHTML('beforeend', itemHtml);
      updateScheduleLabels();
    });
  }

  if (addBoxForm) {
    addBoxForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      alertBox.className = 'd-none';

      const device_code = document.getElementById('device_code').value.trim();
      const box_name = document.getElementById('box_name').value.trim();
      const location = document.getElementById('location').value.trim();
      const medicine_name = document.getElementById('medicine_name').value.trim();
      const medicine_image = document.getElementById('medicine_image').files[0];
      const repeat_count = parseInt(document.getElementById('repeat_count').value, 10);
      const repeat_interval_min = parseInt(document.getElementById('repeat_interval_min').value, 10);

      // Selected repeat days
      const dayType = document.querySelector('input[name="daySelectionType"]:checked').value;
      let repeat_day = 'Everyday';
      
      if (dayType === 'specific') {
        const selectedDays = Array.from(document.querySelectorAll('.day-checkbox:checked')).map(cb => cb.value);
        if (selectedDays.length === 0) {
          alertBox.className = 'alert alert-danger mb-3';
          alertBox.innerText = 'กรุณาเลือกวันที่ต้องการแจ้งเตือนอย่างน้อย 1 วัน';
          return;
        }
        repeat_day = selectedDays.length === 7 ? 'Everyday' : selectedDays.join(',');
      }

      // Collect Schedule rows
      const scheduleRows = document.querySelectorAll('.schedule-row');
      const schedules = [];
      scheduleRows.forEach(row => {
        const timeVal = row.querySelector('.schedule-time').value;
        const mealVal = row.querySelector('.schedule-meal').value;
        if (timeVal) {
          schedules.push({
            time_slot: timeVal + ':00',
            meal_timing: mealVal,
            repeat_day: repeat_day,
            repeat_count: repeat_count,
            repeat_interval_min: repeat_interval_min
          });
        }
      });

      if (schedules.length === 0) {
        alertBox.className = 'alert alert-danger mb-3';
        alertBox.innerText = 'กรุณาตั้งเวลาอย่างน้อย 1 ช่วงเวลา';
        return;
      }

      try {
        // Step 1: Bind device
        const formData = new FormData();
        formData.append('device_code', device_code);
        formData.append('box_name', box_name);
        formData.append('location', location);
        formData.append('medicine_name', medicine_name);
        if (medicine_image) {
          formData.append('medicine_image', medicine_image);
        }

        const deviceRes = await API.request('/api/devices/verify', {
          method: 'POST',
          body: formData
        });

        const boxId = deviceRes.data.box_id;

        // Step 2: Save schedules
        await API.request('/api/schedules/save', {
          method: 'POST',
          body: JSON.stringify({
            box_id: boxId,
            medicine_name: medicine_name,
            schedules: schedules
          })
        });

        alertBox.className = 'alert alert-success mb-3';
        alertBox.innerHTML = '<i class="bi bi-check-circle-fill"></i> เพิ่มกล่องยาและบันทึกตารางเวลาเรียบร้อยแล้ว!';
        
        setTimeout(() => {
          window.location.href = '/dashboard.html';
        }, 1200);

      } catch (err) {
        alertBox.className = 'alert alert-danger mb-3';
        alertBox.innerText = err.message;
      }
    });
  }
});

function getSuggestedTime(index) {
  const times = ['08:00', '13:00', '18:00', '20:00'];
  return times[index - 1] || '12:00';
}

function removeScheduleRow(rowId) {
  const row = document.getElementById(`schedule_row_${rowId}`);
  if (row) {
    row.remove();
    updateScheduleLabels();
  }
}

function updateScheduleLabels() {
  const rows = document.querySelectorAll('.schedule-row');
  rows.forEach((row, index) => {
    const label = row.querySelector('label.text-muted');
    if (label) {
      label.innerText = `เวลาที่ ${index + 1}`;
    }
  });
}
