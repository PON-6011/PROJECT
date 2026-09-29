document.addEventListener('DOMContentLoaded', async () => {
  const urlParams = new URLSearchParams(window.location.search);
  const boxId = urlParams.get('id');
  const alertBox = document.getElementById('alertBox');
  const editBoxForm = document.getElementById('editBoxForm');
  const scheduleContainer = document.getElementById('scheduleContainer');
  const addScheduleBtn = document.getElementById('addScheduleBtn');

  if (!boxId) {
    window.location.href = '/dashboard.html';
    return;
  }

  document.getElementById('box_id_hidden').value = boxId;
  let rowCounter = 0;

  // Load existing details
  try {
    const devicesRes = await API.request('/api/devices');
    const device = devicesRes.data.find(d => d.box_id == boxId);
    
    if (!device) {
      alert('ไม่พบข้อมูลกล่องยานี้ในระบบ');
      window.location.href = '/dashboard.html';
      return;
    }

    document.getElementById('device_code').value = device.device_code;
    document.getElementById('box_name').value = device.box_name;
    document.getElementById('location').value = device.location;
    document.getElementById('medicine_name').value = device.medicine_name;
    if (document.getElementById('current_image')) {
      document.getElementById('current_image').src = device.medicine_image || '/uploads/default_medicine.png';
    }

    // Load Schedules
    const scheduleRes = await API.request(`/api/schedules/box/${boxId}`);
    const schedules = scheduleRes.data || scheduleRes.schedules || [];

    renderSchedules(schedules);

  } catch (err) {
    console.error('Error loading device details:', err);
  }

  function renderSchedules(schedules) {
    scheduleContainer.innerHTML = '';
    if (!schedules || schedules.length === 0) {
      addScheduleRow('08:00:00', 'before_meal');
      return;
    }

    schedules.forEach(s => {
      const timeValue = s.time_slot || s.time || '08:00:00';
      const mealValue = s.meal_timing || 'before_meal';
      addScheduleRow(timeValue, mealValue);

      // Pre-fill repetition rules from first schedule item
      if (s.repeat_count !== undefined && s.repeat_count !== null) {
        if (Number(s.repeat_count) === 0) {
          const disabledRadio = document.getElementById('repeatTypeDisabled');
          if (disabledRadio) disabledRadio.checked = true;
        } else {
          const enabledRadio = document.getElementById('repeatTypeEnabled');
          if (enabledRadio) enabledRadio.checked = true;
          document.getElementById('repeat_count').value = s.repeat_count;
        }
      }
      if (s.repeat_interval_min !== undefined && s.repeat_interval_min !== null) {
        document.getElementById('repeat_interval_min').value = s.repeat_interval_min;
      }

      if (s.repeat_day && s.repeat_day !== 'Everyday') {
        document.getElementById('dayTypeSpecific').checked = true;
        document.getElementById('specificDaysContainer').classList.remove('d-none');
        const selectedDays = s.repeat_day.split(',');
        document.querySelectorAll('.day-checkbox').forEach(cb => {
          cb.checked = selectedDays.includes(cb.value);
        });
      }
    });

    updateRepeatConfigVisibility();
  }

  function addScheduleRow(timeVal = '08:00:00', mealVal = 'before_meal') {
    rowCounter++;
    const cleanTime = timeVal.length > 5 ? timeVal.substring(0, 5) : timeVal;
    const html = `
      <div class="row g-2 align-items-center mb-3 schedule-row" id="schedule_row_${rowCounter}">
        <div class="col-md-5">
          <label class="form-label small text-muted">เวลาแจ้งเตือน</label>
          <input type="time" class="form-control form-control-custom schedule-time" required value="${cleanTime}">
        </div>
        <div class="col-md-5">
          <label class="form-label small text-muted">ช่วงเวลารับประทาน</label>
          <select class="form-select form-control-custom schedule-meal">
            <option value="before_meal" ${mealVal === 'before_meal' ? 'selected' : ''}>ก่อนอาหาร (ไฟสีเหลือง)</option>
            <option value="after_meal" ${mealVal === 'after_meal' ? 'selected' : ''}>หลังอาหาร (ไฟสีเขียว)</option>
          </select>
        </div>
        <div class="col-md-2 text-end pt-4">
          <button type="button" class="btn btn-outline-danger btn-sm" onclick="removeRow(${rowCounter})">
            <i class="bi bi-trash"></i>
          </button>
        </div>
      </div>
    `;
    scheduleContainer.insertAdjacentHTML('beforeend', html);
  }

  if (addScheduleBtn) {
    addScheduleBtn.addEventListener('click', () => {
      const rows = document.querySelectorAll('.schedule-row');
      if (rows.length >= 4) {
        alert('ตั้งเวลาแจ้งเตือนได้สูงสุด 4 ช่วงเวลาต่อวัน');
        return;
      }
      addScheduleRow('12:00:00', 'after_meal');
    });
  }

  const repeatEnabledRadios = document.querySelectorAll('input[name="repeatEnabledType"]');
  const repeatConfigContainer = document.getElementById('repeatConfigContainer');
  const repeatCountSelect = document.getElementById('repeat_count');
  const repeatIntervalSelect = document.getElementById('repeat_interval_min');

  document.querySelectorAll('input[name="daySelectionType"]').forEach(radio => {
    radio.addEventListener('change', () => {
      if (document.getElementById('dayTypeSpecific').checked) {
        document.getElementById('specificDaysContainer').classList.remove('d-none');
      } else {
        document.getElementById('specificDaysContainer').classList.add('d-none');
        document.querySelectorAll('.day-checkbox').forEach(cb => cb.checked = true);
      }
    });
  });

  function updateRepeatConfigVisibility() {
    const isEnabled = document.querySelector('input[name="repeatEnabledType"]:checked')?.value === 'enabled';
    if (isEnabled) {
      if (repeatConfigContainer) repeatConfigContainer.classList.remove('d-none');
      if (repeatCountSelect) repeatCountSelect.disabled = false;
      if (repeatIntervalSelect) repeatIntervalSelect.disabled = false;
    } else {
      if (repeatConfigContainer) repeatConfigContainer.classList.add('d-none');
      if (repeatCountSelect) repeatCountSelect.disabled = true;
      if (repeatIntervalSelect) repeatIntervalSelect.disabled = true;
    }
  }

  repeatEnabledRadios.forEach(radio => {
    radio.addEventListener('change', updateRepeatConfigVisibility);
  });
  updateRepeatConfigVisibility();

  if (editBoxForm) {
    editBoxForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      alertBox.className = 'd-none';

      const box_name = document.getElementById('box_name').value.trim();
      const location = document.getElementById('location').value.trim();
      const medicine_name = document.getElementById('medicine_name').value.trim();
      const medicine_image = document.getElementById('medicine_image').files[0];
      const isRepeatEnabled = document.querySelector('input[name="repeatEnabledType"]:checked')?.value === 'enabled';
      const repeat_count = isRepeatEnabled ? (parseInt(document.getElementById('repeat_count').value, 10) || 3) : 0;
      const repeat_interval_min = isRepeatEnabled ? (parseInt(document.getElementById('repeat_interval_min').value, 10) || 5) : 5;

      const selectedDays = Array.from(document.querySelectorAll('.day-checkbox:checked')).map(cb => cb.value);
      const repeat_day = selectedDays.length === 7 ? 'Everyday' : (selectedDays.join(',') || 'Everyday');

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
        // Step 1: Update device info
        const formData = new FormData();
        formData.append('box_name', box_name);
        formData.append('location', location);
        formData.append('medicine_name', medicine_name);
        if (medicine_image) {
          formData.append('medicine_image', medicine_image);
        }

        await API.request(`/api/devices/${boxId}`, {
          method: 'PUT',
          body: formData
        });

        // Step 2: Update schedules
        await API.request('/api/schedules/save', {
          method: 'POST',
          body: JSON.stringify({
            box_id: parseInt(boxId, 10),
            medicine_name: medicine_name,
            schedules: schedules
          })
        });

        alertBox.className = 'alert alert-success mb-3';
        alertBox.innerHTML = '<i class="bi bi-check-circle-fill"></i> อัปเดตข้อมูลกล่องยาและตารางเวลาสำเร็จ!';

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

function removeRow(id) {
  const row = document.getElementById(`schedule_row_${id}`);
  if (row) row.remove();
}
