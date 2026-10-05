module.exports = {
  port: Number(process.env.PORT) || 3000,
  loanDays: Number(process.env.LOAN_DAYS) || 14,
  finePerDay: Number(process.env.FINE_PER_DAY) || 1,
};
