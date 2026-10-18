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

console.log(`schedule day filter tests passed: ${cases.length}/${cases.length}`);
