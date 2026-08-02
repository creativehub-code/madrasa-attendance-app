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
console.log(getISTDateBounds(new Date()));
