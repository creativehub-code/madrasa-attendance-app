const { AppError } = require('./asyncHandler');

const normalizeDate = (dateInput) => {
  const date = dateInput ? new Date(dateInput) : new Date();
  if (Number.isNaN(date.getTime())) {
    throw new AppError('Invalid date', 400);
  }
  date.setHours(0, 0, 0, 0);
  return date;
};

const getISTDateBounds = (dateInput) => {
  const d = dateInput ? new Date(dateInput) : new Date();
  const istString = d.toLocaleString('en-US', { timeZone: 'Asia/Kolkata' });
  const istDate = new Date(istString);
  const year = istDate.getFullYear();
  const month = istDate.getMonth();
  const date = istDate.getDate();
  const pad = (n) => String(n).padStart(2, '0');
  const dateStr = `${year}-${pad(month + 1)}-${pad(date)}`;
  const start = new Date(`${dateStr}T00:00:00.000+05:30`);
  const end = new Date(`${dateStr}T23:59:59.999+05:30`);
  return { start, end };
};

module.exports = {
  normalizeDate,
  getISTDateBounds
};
