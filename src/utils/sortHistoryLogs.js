function getHistoryTimestamp(log) {
  const candidates = [
    log?.taken_time,
    log?.created_at,
    log?.scheduled_time,
    log?.recorded_at
  ];

  for (const value of candidates) {
    if (value === null || value === undefined || value === '') continue;
    const timestamp = new Date(value).getTime();
    if (!Number.isNaN(timestamp)) {
      return timestamp;
    }
  }

  return 0;
}

function sortHistoryLogs(logs = []) {
  return [...logs].sort((a, b) => getHistoryTimestamp(b) - getHistoryTimestamp(a));
}

module.exports = {
  getHistoryTimestamp,
  sortHistoryLogs
};
