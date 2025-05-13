// server/src/routes/user.js
const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/auth');
const {
  getProfile,
  updateProfile,
  getUserBookings,
  getBookingById,
  cancelBooking
} = require('../controllers/userController');

// All routes are protected
router.use(protect);

// Profile routes
router.get('/profile', getProfile);
router.put('/profile', updateProfile);

// Booking routes
router.get('/bookings', getUserBookings);
router.get('/bookings/:bookingId', getBookingById);
router.put('/bookings/:bookingId/cancel', cancelBooking);

module.exports = router;