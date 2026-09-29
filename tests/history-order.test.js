const test = require('node:test');
const assert = require('node:assert/strict');

const { sortHistoryLogs } = require('../src/utils/sortHistoryLogs');

test('sortHistoryLogs keeps newest history entries at the top', () => {
  const logs = [
    { log_id: 1, created_at: '2024-01-01T08:00:00Z', status: 'Missed' },
    { log_id: 2, taken_time: '2024-01-10T09:30:00Z', status: 'Taken' },
    { log_id: 3, scheduled_time: '2024-01-08T06:00:00Z', status: 'Taken Early' },
    { log_id: 4, created_at: '2024-01-12T10:15:00Z', status: 'Taken' }
  ];

  const sorted = sortHistoryLogs(logs);

  assert.deepEqual(sorted.map(log => log.log_id), [4, 2, 3, 1]);
});

test('sortHistoryLogs falls back safely when some timestamps are missing', () => {
  const logs = [
    { log_id: 5, status: 'Missed' },
    { log_id: 6, scheduled_time: '2024-02-02T07:00:00Z' },
    { log_id: 7, taken_time: '2024-02-03T12:00:00Z' }
  ];

  const sorted = sortHistoryLogs(logs);

  assert.deepEqual(sorted.map(log => log.log_id), [7, 6, 5]);
});
