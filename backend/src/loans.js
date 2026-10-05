const config = require('./config');

const DAY = 24 * 60 * 60 * 1000;

// Fine = every started overdue day x FINE_PER_DAY.
function calcFine(dueAt, at = new Date()) {
  const overdueMs = at.getTime() - dueAt.getTime();
  if (overdueMs <= 0) return 0;
  return Math.ceil(overdueMs / DAY) * config.finePerDay;
}

function addDays(date, days) {
  return new Date(date.getTime() + days * DAY);
}

module.exports = { calcFine, addDays };
