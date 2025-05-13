// server/src/routes/bookings.js
const express = require('express');
const router = express.Router();
const Conversation = require('../models/Conversation');
const Booking = require('../models/Booking');
const duffelService = require('../services/duffel.service');
const { optionalAuth } = require('../middleware/auth');

// Add optionalAuth middleware to all routes
router.use(optionalAuth);

// Create booking
router.post('/create', async (req, res) => {
  try {
    const { sessionId, paymentDetails, additionalServices = [] } = req.body;
    
    const conversation = await Conversation.findOne({ sessionId });
    
    if (!conversation || !conversation.selectedOffer) {
      return res.status(400).json({
        success: false,
        message: 'No flight selected for booking'
      });
    }
    
    // Validate we have all required passenger information
    if (!conversation.passengerDetails || conversation.passengerDetails.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Passenger details required'
      });
    }
    
    try {
      console.log('Creating order with Duffel API');
      
      // Process payment and create order with Duffel
      const order = await duffelService.createOrder(
        conversation.selectedOffer.id,
        conversation.passengerDetails,
        {
          type: paymentDetails?.type || 'balance',
          amount: conversation.selectedOffer.totalAmount, 
          currency: conversation.selectedOffer.totalCurrency
        },
        additionalServices
      );
      
      console.log('Duffel order created:', order.id);
      
      // Create booking record in our database
      const booking = new Booking({
        conversationId: conversation._id,
        duffelOrderId: order.id,
        bookingReference: order.booking_reference,
        status: 'confirmed',
        flightDetails: {
          airline: conversation.selectedOffer.slices[0].segments[0].airline.name,
          flightNumber: conversation.selectedOffer.slices[0].segments[0].flightNumber,
          origin: {
            airport: conversation.selectedOffer.slices[0].origin.iataCode,
            city: conversation.selectedOffer.slices[0].origin.cityName
          },
          destination: {
            airport: conversation.selectedOffer.slices[0].destination.iataCode,
            city: conversation.selectedOffer.slices[0].destination.cityName
          },
          departure: conversation.selectedOffer.slices[0].departureDateTime,
          arrival: conversation.selectedOffer.slices[0].arrivalDateTime,
          duration: conversation.selectedOffer.slices[0].duration,
          cabinClass: conversation.selectedOffer.cabinClass
        },
        passengers: conversation.passengerDetails,
        pricing: {
          totalAmount: conversation.selectedOffer.totalAmount,
          currency: conversation.selectedOffer.totalCurrency,
          additionalServicesAmount: additionalServices.reduce((total, service) => {
            const serviceAmount = parseFloat(service.totalAmount) || 0;
            const quantity = service.quantity || 1;
            return total + (serviceAmount * quantity);
          }, 0)
        },
        paymentDetails: {
          method: paymentDetails?.type || 'balance',
          status: 'completed',
          paidAt: new Date()
        },
        additionalServices: additionalServices.map(service => ({
          type: service.type,
          name: service.type === 'seat' ? `Seat ${service.designator}` : (service.name || service.type),
          amount: service.totalAmount,
          currency: service.totalCurrency,
          quantity: service.quantity || 1
        }))
      });
      
      // Associate booking with user if authenticated
      if (req.user) {
        booking.userId = req.user._id;
      }
      
      await booking.save();
      
      // Update conversation
      conversation.bookingReference = order.booking_reference;
      conversation.duffelOrderId = order.id;
      conversation.currentStage = 'confirmation';
      conversation.paymentStatus = 'completed';
      await conversation.save();
      
      res.json({
        success: true,
        booking: {
          bookingReference: order.booking_reference,
          orderId: order.id,
          status: 'confirmed',
          totalAmount: (
            parseFloat(conversation.selectedOffer.totalAmount) + 
            booking.pricing.additionalServicesAmount
          ).toFixed(2),
          currency: conversation.selectedOffer.totalCurrency,
          pnr: order.booking_reference,
          ticketingDeadline: order.ticket_by || null,
        }
      });
    } catch (orderError) {
      console.error('Error creating order with Duffel:', orderError);
      
      // Handle specific Duffel API errors
      if (orderError.errors && orderError.errors[0]) {
        const duffelError = orderError.errors[0];
        
        return res.status(400).json({
          success: false,
          message: duffelError.message || 'Error creating booking',
          code: duffelError.code,
          type: duffelError.type,
          orderId: null
        });
      }
      
      return res.status(500).json({
        success: false,
        message: 'Error processing payment or creating booking',
        error: process.env.NODE_ENV === 'development' ? orderError.message : undefined
      });
    }
  } catch (error) {
    console.error('Error creating booking:', error);
    res.status(500).json({
      success: false,
      message: 'Error creating booking',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// Get booking by reference
router.get('/:bookingReference', async (req, res) => {
  try {
    const { bookingReference } = req.params;
    
    const booking = await Booking.findOne({ bookingReference });
    
    if (!booking) {
      return res.status(404).json({
        success: false,
        message: 'Booking not found'
      });
    }
    
    // Check if the user is authorized to view this booking
    if (req.user && booking.userId && booking.userId.toString() !== req.user._id.toString()) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to view this booking'
      });
    }
    
    // Get the latest booking details from Duffel
    let duffelOrder = null;
    try {
      duffelOrder = await duffelService.getOrder(booking.duffelOrderId);
    } catch (duffelError) {
      console.error('Error fetching Duffel order:', duffelError);
      // Continue with our local data if Duffel API fails
    }
    
    // Merge local booking data with Duffel data if available
    const enhancedBooking = {
      ...booking.toObject(),
      duffelData: duffelOrder ? duffelOrder.data : null
    };
    
    res.json({
      success: true,
      booking: enhancedBooking
    });
  } catch (error) {
    console.error('Error fetching booking:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching booking',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// Get user's bookings
router.get('/user/bookings', async (req, res) => {
  try {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: 'Authentication required'
      });
    }
    
    const bookings = await Booking.find({ userId: req.user._id })
      .sort({ createdAt: -1 });
    
    res.json({
      success: true,
      bookings
    });
  } catch (error) {
    console.error('Error fetching user bookings:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching bookings',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// Cancel booking
router.post('/:bookingReference/cancel', async (req, res) => {
  try {
    const { bookingReference } = req.params;
    const { reason } = req.body;
    
    const booking = await Booking.findOne({ bookingReference });
    
    if (!booking) {
      return res.status(404).json({
        success: false,
        message: 'Booking not found'
      });
    }
    
    // Check if the user is authorized to cancel this booking
    if (req.user && booking.userId && booking.userId.toString() !== req.user._id.toString()) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to cancel this booking'
      });
    }
    
    try {
      // Cancel order with Duffel
      const cancellation = await duffelService.cancelOrder(booking.duffelOrderId);
      
      // Update booking status
      booking.status = 'cancelled';
      booking.cancellationDetails = {
        reason: reason || 'Customer requested cancellation',
        cancelledAt: new Date(),
        refundAmount: cancellation?.data?.refund_amount || null,
        refundCurrency: cancellation?.data?.refund_currency || null
      };
      
      await booking.save();
      
      res.json({
        success: true,
        message: 'Booking cancelled successfully',
        refundDetails: booking.cancellationDetails
      });
    } catch (cancelError) {
      console.error('Error cancelling with Duffel:', cancelError);
      
      // Handle specific Duffel API errors
      if (cancelError.errors && cancelError.errors[0]) {
        const duffelError = cancelError.errors[0];
        
        return res.status(400).json({
          success: false,
          message: duffelError.message || 'Error cancelling booking',
          code: duffelError.code,
          type: duffelError.type
        });
      }
      
      return res.status(500).json({
        success: false,
        message: 'Error cancelling booking with airline',
        error: process.env.NODE_ENV === 'development' ? cancelError.message : undefined
      });
    }
  } catch (error) {
    console.error('Error cancelling booking:', error);
    res.status(500).json({
      success: false,
      message: 'Error cancelling booking',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

module.exports = router;