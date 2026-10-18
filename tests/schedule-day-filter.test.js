const assert = require('node:assert/strict');

function isScheduleAllowedToday(repeatDay, weekdayIndex) {
  if (!repeatDay || repeatDay.trim() === '') return true;

  const normalized = repeatDay.trim();
  const dayListUpper = normalized.toUpperCase();
  if (['EVERYDAY', 'ALL', 'ALLDAYS'].includes(dayListUpper)) return true;

  const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  const currentDay = dayNames[weekdayIndex] || 'Sun';

  for (const token of normalized.split(',')) {
    const clean = token.trim();
    if (!clean) continue;
    if (clean.toUpperCase() === currentDay.toUpperCase()) {
      return true;
    }
  }

  return false;
}

const cases = [
  ['Everyday', 1, true],
  ['Mon,Wed,Fri', 1, true],
  ['Mon,Wed,Fri', 2, false],
  ['Sun', 0, true],
  ['Sun', 1, false],
  ['Tue,Thu', 2, true],
  ['Tue,Thu', 3, false],
];

for (const [repeatDay, weekdayIndex, expected] of cases) {
  assert.equal(
    isScheduleAllowedToday(repeatDay, weekdayIndex),
    expected,
    `repeatDay=${repeatDay}, weekdayIndex=${weekdayIndex} should be ${expected}`
  );
}

function createOfflineQueue() {
  const queue = [];
  return {
    add(status, scheduleId) {
      queue.push({ schedule_id: scheduleId, status, timestamp_ms: Date.now() });
    },
    size() {
      return queue.length;
    },
    flush() {
      const pending = [...queue];
      queue.length = 0;
      return pending;
    }
  };
}

const offlineQueue = createOfflineQueue();
offlineQueue.add('Taken', 101);
offlineQueue.add('Taken Early', 102);
assert.equal(offlineQueue.size(), 2);
const flushed = offlineQueue.flush();
assert.equal(flushed.length, 2);
assert.equal(offlineQueue.size(), 0);

console.log(`schedule day filter tests passed: ${cases.length}/${cases.length}`);
console.log('offline queue retry tests passed: 2/2');
