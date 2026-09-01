const express = require('express');
const { protect, authorize } = require('../middleware/auth');
const {
  getHolidays,
  createHoliday,
  deleteHoliday,
} = require('../controllers/holiday.controller');

const router = express.Router();

router.use(protect);

router.get('/', getHolidays);
router.post('/', authorize('Admin', 'Teacher'), createHoliday);
router.delete('/:id', authorize('Admin', 'Teacher'), deleteHoliday);

module.exports = router;
