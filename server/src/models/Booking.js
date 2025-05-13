// server/src/models/Booking.js
const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const BookingSchema = new Schema({
  conversationId: {
    type: Schema.Types.ObjectId,
    ref: 'Conversation',
    required: true
  },
  userId: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: false // Not required for guest bookings
  },
  duffelOrderId: {
    type: String,
    required: true
  },
  bookingReference: {
    type: String,
    required: true,
    unique: true
  },
  status: {
    type: String,
    enum: ['pending', 'confirmed', 'cancelled', 'completed'],
    default: 'pending'
  },
  flightDetails: {
    airline: {
      type: String,
      required: true
    },
    flightNumber: {
      type: String,
      required: true
    },
    origin: {
      airport: {
        type: String,
        required: true
      },
      city: {
        type: String,
        required: true
      }
    },
    destination: {
      airport: {
        type: String,
        required: true
      },
      city: {
        type: String,
        required: true
      }
    },
    departure: {
      type: Date,
      required: true
    },
    arrival: {
      type: Date,
      required: true
    },
    duration: {
      type: String,
      required: true
    },
    cabinClass: {
      type: String,
      enum: ['economy', 'premium_economy', 'business', 'first'],
      default: 'economy'
    }
  },
  passengers: [{
    title: {
      type: String,
      enum: ['Mr', 'Mrs', 'Ms', 'Dr', 'Miss'],
      required: true
    },
    firstName: {
      type: String,
      required: true
    },
    lastName: {
      type: String,
      required: true
    },
    dateOfBirth: {
      type: String,
      required: true
    },
    gender: {
      type: String,
      enum: ['male', 'female', 'other', 'unknown'],
      default: 'unknown'
    },
    email: {
      type: String,
      required: true
    },
    phoneNumber: {
      type: String,
      required: true
    },
    nationality: {
      type: String
    },
    passportNumber: {
      type: String
    },
    passportExpiry: {
      type: String
    }
  }],
  pricing: {
    totalAmount: {
      type: Number,
      required: true
    },
    currency: {
      type: String,
      required: true
    },
    additionalServicesAmount: {
      type: Number,
      default: 0
    }
  },
  paymentDetails: {
    method: {
      type: String,
      enum: ['card', 'balance', 'arc_bsp_cash'],
      required: true
    },
    status: {
      type: String,
      enum: ['pending', 'completed', 'failed', 'refunded'],
      default: 'pending'
    },
    paidAt: {
      type: Date
    },
    cardDetails: {
      lastFour: String,
      cardholderName: String
    }
  },
  additionalServices: [{
    type: {
      type: String,
      required: true
    },
    name: {
      type: String,
      required: true
    },
    amount: {
      type: Number,
      required: true
    },
    currency: {
      type: String,
      required: true
    },
    quantity: {
      type: Number,
      default: 1
    }
  }],
  cancellationDetails: {
    reason: String,
    cancelledAt: Date,
    refundAmount: Number,
    refundCurrency: String
  },
  ticketingDeadline: {
    type: Date
  },
  metadata: {
    type: Map,
    of: String
  }
}, { timestamps: true });

module.exports = mongoose.model('Booking', BookingSchema);