// server/src/controllers/userController.js
const User = require('../models/User');
const Booking = require('../models/Booking');
const duffelService = require('../services/duffel.service');

// @desc    Get user profile
// @route   GET /api/users/profile
// @access  Private
exports.getProfile = async (req, res) => {
  try {
    const user = await User.findById(req.user.id).select('-password');
    
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }
    
    res.status(200).json({
      success: true,
      data: user
    });
  } catch (error) {
    console.error('Error getting user profile:', error);
    res.status(500).json({
      success: false,
      message: 'Error retrieving user profile',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

// @desc    Update user profile
// @route   PUT /api/users/profile
// @access  Private
exports.updateProfile = async (req, res) => {
  try {
    const {
      firstName,
      lastName,
      email,
      phoneNumber,
      title,
      dateOfBirth,
      gender,
      nationality,
      passportNumber,
      passportExpiry
    } = req.body;
    
    // Construct update object with only provided fields
    const updateFields = {};
    if (firstName) updateFields.firstName = firstName;
    if (lastName) updateFields.lastName = lastName;
    if (email) updateFields.email = email;
    if (phoneNumber) updateFields.phoneNumber = phoneNumber;
    if (title) updateFields.title = title;
    if (dateOfBirth) updateFields.dateOfBirth = dateOfBirth;
    if (gender) updateFields.gender = gender;
    if (nationality) updateFields.nationality = nationality;
    if (passportNumber) updateFields.passportNumber = passportNumber;
    if (passportExpiry) updateFields.passportExpiry = passportExpiry;
    
    // Find user and update
    const user = await User.findByIdAndUpdate(
      req.user.id,
      updateFields,
      { new: true, runValidators: true }
    ).select('-password');
    
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }
    
    res.status(200).json({
      success: true,
      message: 'Profile updated successfully',
      data: user
    });
  } catch (error) {
    console.error('Error updating user profile:', error);
    res.status(500).json({
      success: false,
      message: 'Error updating profile',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

// @desc    Get user bookings
// @route   GET /api/users/bookings
// @access  Private
exports.getUserBookings = async (req, res) => {
  try {
    console.log('Getting bookings for user:', req.user.id);
    
    // Get bookings from our database - FIX: Use userId instead of user
    const bookings = await Booking.find({ 
      userId: req.user.id 
    }).sort({ createdAt: -1 });
    
    console.log(`Found ${bookings.length} bookings for user ${req.user.id}`);
    
    // Enhanced bookings with Duffel order details if needed
    const enhancedBookings = await Promise.all(
      bookings.map(async (booking) => {
        // Only fetch details from Duffel for non-cancelled bookings
        if (booking.status !== 'cancelled' && booking.duffelOrderId) {
          try {
            const duffelOrder = await duffelService.getOrder(booking.duffelOrderId);
            
            if (duffelOrder) {
              // Update local booking status if it changed in Duffel
              if (duffelOrder.data.status !== booking.status) {
                booking.status = duffelOrder.data.status;
                await booking.save();
              }
              
              // Add detailed flight information
              return {
                ...booking.toJSON(),
                duffelDetails: duffelOrder.data
              };
            }
          } catch (duffelError) {
            console.error(`Error fetching Duffel order ${booking.duffelOrderId}:`, duffelError);
            // Continue with local booking data
          }
        }
        
        return booking.toJSON();
      })
    );
    
    res.status(200).json({
      success: true,
      count: enhancedBookings.length,
      data: enhancedBookings
    });
  } catch (error) {
    console.error('Error getting user bookings:', error);
    res.status(500).json({
      success: false,
      message: 'Error retrieving bookings',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

// @desc    Get specific booking details
// @route   GET /api/users/bookings/:bookingId
// @access  Private
exports.getBookingById = async (req, res) => {
  try {
    const { bookingId } = req.params;
    
    // Get booking from our database - FIX: Use userId instead of user
    const booking = await Booking.findOne({ 
      _id: bookingId,
      userId: req.user.id
    });
    
    if (!booking) {
      return res.status(404).json({
        success: false,
        message: 'Booking not found'
      });
    }
    
    // Fetch latest details from Duffel if available
    if (booking.duffelOrderId) {
      try {
        const duffelOrder = await duffelService.getOrder(booking.duffelOrderId);
        
        if (duffelOrder) {
          // Update local booking status if it changed in Duffel
          if (duffelOrder.data.status !== booking.status) {
            booking.status = duffelOrder.data.status;
            await booking.save();
          }
          
          return res.status(200).json({
            success: true,
            data: {
              ...booking.toJSON(),
              duffelDetails: duffelOrder.data
            }
          });
        }
      } catch (duffelError) {
        console.error(`Error fetching Duffel order ${booking.duffelOrderId}:`, duffelError);
        // Continue with local booking data
      }
    }
    
    res.status(200).json({
      success: true,
      data: booking
    });
  } catch (error) {
    console.error('Error getting booking details:', error);
    res.status(500).json({
      success: false,
      message: 'Error retrieving booking details',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

// @desc    Cancel booking
// @route   PUT /api/users/bookings/:bookingId/cancel
// @access  Private
exports.cancelBooking = async (req, res) => {
  try {
    const { bookingId } = req.params;
    
    // Get booking from our database - FIX: Use userId instead of user
    const booking = await Booking.findOne({ 
      _id: bookingId,
      userId: req.user.id
    });
    
    if (!booking) {
      return res.status(404).json({
        success: false,
        message: 'Booking not found'
      });
    }
    
    if (booking.status === 'cancelled') {
      return res.status(400).json({
        success: false,
        message: 'Booking is already cancelled'
      });
    }
    
    // Cancel with Duffel if we have an order ID
    if (booking.duffelOrderId) {
      try {
        const cancellationResult = await duffelService.cancelOrder(booking.duffelOrderId);
        
        // Update booking details in our database
        booking.status = 'cancelled';
        booking.cancellationDetails = {
          cancelledAt: new Date(),
          refundAmount: cancellationResult.data.refund_amount,
          refundCurrency: cancellationResult.data.refund_currency,
          cancellationReason: req.body.reason || 'User cancelled',
          reason: req.body.reason || 'User cancelled' // Keep both for compatibility
        };
        
        await booking.save();
        
        return res.status(200).json({
          success: true,
          message: 'Booking cancelled successfully',
          data: {
            ...booking.toJSON(),
            duffelCancellation: cancellationResult.data
          }
        });
      } catch (duffelError) {
        console.error(`Error cancelling Duffel order ${booking.duffelOrderId}:`, duffelError);
        
        return res.status(400).json({
          success: false,
          message: 'Unable to cancel booking with airline',
          error: duffelError.message || 'Airline cancellation failed'
        });
      }
    } else {
      // Just mark as cancelled in our database
      booking.status = 'cancelled';
      booking.cancellationDetails = {
        cancelledAt: new Date(),
        cancellationReason: req.body.reason || 'User cancelled'
      };
      
      await booking.save();
      
      return res.status(200).json({
        success: true,
        message: 'Booking marked as cancelled',
        data: booking
      });
    }
  } catch (error) {
    console.error('Error cancelling booking:', error);
    res.status(500).json({
      success: false,
      message: 'Error processing cancellation',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};