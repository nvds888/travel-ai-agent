// server/src/models/Conversation.js
const mongoose = require('mongoose');

// Time specification schema
const timeSpecSchema = new mongoose.Schema({
  from: String,
  to: String
}, { _id: false });

// Multi-city segment schema
const multiCitySegmentSchema = new mongoose.Schema({
  origin: String,
  destination: String,
  departureDate: Date,
  departureTime: timeSpecSchema
}, { _id: false });

// Flight search parameters schema
const flightSearchParamsSchema = new mongoose.Schema({
  type: {
    type: String,
    enum: ['one_way', 'round_trip', 'multi_city'],
    default: 'one_way'
  },
  origin: String,
  destination: String,
  departureDate: Date,
  returnDate: Date,
  departureTime: timeSpecSchema,
  arrivalTime: timeSpecSchema,
  cabinClass: {
    type: String,
    enum: ['economy', 'premium_economy', 'business', 'first'],
    default: 'economy'
  },
  passengers: {
    adults: { type: Number, default: 1 },
    children: { type: Number, default: 0 },
    infants: { type: Number, default: 0 }
  },
  maxConnections: Number,
  additionalStops: [multiCitySegmentSchema],
  preferences: {
    preferredAirlines: [String],
    avoidAirlines: [String],
    flexibleDates: Boolean,
    nearbyAirports: Boolean
  }
}, { _id: false });

// User preferences schema
const userPreferencesSchema = new mongoose.Schema({
  preferredCabinClass: {
    type: String,
    enum: ['economy', 'premium_economy', 'business', 'first'],
    default: 'economy'
  },
  preferredAirlines: [String],
  avoidAirlines: [String],
  seatPreferences: {
    position: {
      type: String,
      enum: ['window', 'aisle', 'middle', 'no_preference']
    },
    location: {
      type: String,
      enum: ['front', 'middle', 'back', 'no_preference']
    },
    extraLegroom: Boolean
  },
  mealPreferences: {
    type: String,
    enum: ['standard', 'vegetarian', 'vegan', 'kosher', 'halal', 'gluten_free', 'no_meal']
  },
  notificationPreferences: {
    priceAlerts: Boolean,
    flightStatusUpdates: Boolean,
    checkInReminders: Boolean
  }
}, { _id: false });

// Search history item schema
const searchHistoryItemSchema = new mongoose.Schema({
  searchParams: flightSearchParamsSchema,
  searchedAt: {
    type: Date,
    default: Date.now
  },
  resultsCount: Number,
  selectedOfferId: String
}, { _id: false });

// Refinement tracking schema
const refinementsSchema = new mongoose.Schema({
  appliedFilters: {
    timeOfDay: String,
    maxConnections: Number,
    airlines: [String],
    priceRange: {
      min: Number,
      max: Number
    },
    durationRange: {
      min: Number,
      max: Number
    }
  },
  sortPreference: {
    type: String,
    enum: ['price_low', 'price_high', 'duration_short', 'duration_long', 'departure_early', 'departure_late']
  },
  viewedOffers: [String],
  rejectedOffers: [{
    offerId: String,
    reason: String
  }]
}, { _id: false });

// Main conversation schema
const conversationSchema = new mongoose.Schema({
  sessionId: {
    type: String,
    required: true,
    unique: true,
    index: true
  },
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    index: true
  },
  currentStage: {
    type: String,
    enum: ['initial', 'search', 'selection', 'authentication', 'passenger_details', 'additional_services', 'payment', 'confirmation'],
    default: 'initial',
    index: true
  },
  flightSearchParams: flightSearchParamsSchema,
  messages: [{
    role: {
      type: String,
      enum: ['user', 'assistant', 'system'],
      required: true
    },
    content: {
      type: String,
      required: true
    },
    timestamp: {
      type: Date,
      default: Date.now
    },
    metadata: {
      functionCall: String,
      functionArgs: mongoose.Schema.Types.Mixed,
      error: String
    }
  }],
  searchResults: [{
    id: String,
    totalAmount: Number,
    totalCurrency: String,
    expiresAt: Date,
    slices: [{
      origin: {
        iataCode: String,
        name: String,
        cityName: String,
        timeZone: String
      },
      destination: {
        iataCode: String,
        name: String,
        cityName: String,
        timeZone: String
      },
      departureDateTime: Date,
      arrivalDateTime: Date,
      duration: String,
      durationMinutes: Number,
      segments: [{
        airline: {
          name: String,
          iataCode: String,
          logoUrl: String
        },
        flightNumber: String,
        aircraft: String,
        departureAirport: {
          iataCode: String,
          name: String,
          terminal: String
        },
        arrivalAirport: {
          iataCode: String,
          name: String,
          terminal: String
        },
        departureTime: Date,
        arrivalTime: Date,
        duration: String
      }]
    }],
    baggageAllowance: [{
      type: String,
      quantity: Number
    }],
    cabinClass: String,
    conditions: {
      refundable: Boolean,
      changeable: Boolean
    },
    availableServices: {
      seats: mongoose.Schema.Types.Mixed,
      baggage: mongoose.Schema.Types.Mixed,
      other: mongoose.Schema.Types.Mixed
    }
  }],
  selectedOffer: {
    id: String,
    totalAmount: Number,
    totalCurrency: String,
    expiresAt: Date,
    slices: mongoose.Schema.Types.Mixed,
    baggageAllowance: mongoose.Schema.Types.Mixed,
    cabinClass: String,
    conditions: mongoose.Schema.Types.Mixed,
    availableServices: mongoose.Schema.Types.Mixed
  },
  passengerDetails: [{
    title: {
      type: String,
      enum: ['Mr', 'Mrs', 'Ms', 'Dr', 'Prof']
    },
    firstName: String,
    lastName: String,
    dateOfBirth: Date,
    gender: {
      type: String,
      enum: ['male', 'female', 'other']
    },
    email: String,
    phoneNumber: String,
    nationality: String,
    passportNumber: String,
    passportExpiry: Date,
    passportIssuingCountry: String,
    knownTravelerNumber: String,
    seatPreference: {
      type: String,
      enum: ['window', 'aisle', 'middle', 'no_preference']
    },
    mealPreference: {
      type: String,
      enum: ['standard', 'vegetarian', 'vegan', 'kosher', 'halal', 'gluten_free', 'no_meal']
    },
    specialAssistance: [String]
  }],
  selectedServices: [{
    type: {
      type: String,
      enum: ['seat', 'baggage', 'meal', 'insurance', 'priority', 'lounge']
    },
    details: mongoose.Schema.Types.Mixed,
    quantity: Number,
    totalAmount: Number,
    totalCurrency: String
  }],
  bookingReference: String,
  duffelOrderId: String,
  paymentStatus: {
    type: String,
    enum: ['pending', 'processing', 'completed', 'failed', 'refunded'],
    default: 'pending'
  },
  userPreferences: userPreferencesSchema,
  searchHistory: [searchHistoryItemSchema],
  refinements: refinementsSchema,
  createdAt: {
    type: Date,
    default: Date.now,
    index: true
  },
  updatedAt: {
    type: Date,
    default: Date.now
  },
  expiresAt: {
    type: Date,
    default: () => new Date(+new Date() + 24 * 60 * 60 * 1000), // 24 hours
    index: true
  }
}, {
  timestamps: true
});

// Indexes for performance
conversationSchema.index({ sessionId: 1, user: 1 });
conversationSchema.index({ currentStage: 1, createdAt: -1 });
conversationSchema.index({ user: 1, createdAt: -1 });
conversationSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

// Virtual for conversation duration
conversationSchema.virtual('duration').get(function() {
  if (this.messages.length < 2) return 0;
  const firstMessage = this.messages[0].timestamp;
  const lastMessage = this.messages[this.messages.length - 1].timestamp;
  return lastMessage - firstMessage;
});

// Virtual for conversation status
conversationSchema.virtual('status').get(function() {
  if (this.bookingReference) return 'completed';
  if (this.paymentStatus === 'processing') return 'processing';
  if (this.currentStage === 'confirmation') return 'confirmed';
  if (this.expiresAt < new Date()) return 'expired';
  return 'active';
});

// Methods
conversationSchema.methods.addMessage = function(role, content, metadata = {}) {
  this.messages.push({
    role,
    content,
    timestamp: new Date(),
    metadata
  });
  return this.save();
};

conversationSchema.methods.updateStage = function(newStage) {
  const validTransitions = {
    'initial': ['search'],
    'search': ['selection'],
    'selection': ['authentication', 'passenger_details'],
    'authentication': ['passenger_details', 'additional_services'],
    'passenger_details': ['additional_services'],
    'additional_services': ['payment'],
    'payment': ['confirmation'],
    'confirmation': []
  };
  
  const currentStageTransitions = validTransitions[this.currentStage] || [];
  
  if (currentStageTransitions.includes(newStage)) {
    this.currentStage = newStage;
    return true;
  }
  
  return false;
};

conversationSchema.methods.canTransitionTo = function(targetStage) {
  const validTransitions = {
    'initial': ['search'],
    'search': ['selection'],
    'selection': ['authentication', 'passenger_details'],
    'authentication': ['passenger_details', 'additional_services'],
    'passenger_details': ['additional_services'],
    'additional_services': ['payment'],
    'payment': ['confirmation'],
    'confirmation': []
  };
  
  const currentStageTransitions = validTransitions[this.currentStage] || [];
  return currentStageTransitions.includes(targetStage);
};

conversationSchema.methods.updateSearchParams = function(params) {
  this.flightSearchParams = {
    ...this.flightSearchParams,
    ...params
  };
  
  // Add to search history
  this.searchHistory.push({
    searchParams: this.flightSearchParams,
    searchedAt: new Date()
  });
  
  // Keep only last 10 searches
  if (this.searchHistory.length > 10) {
    this.searchHistory = this.searchHistory.slice(-10);
  }
  
  return this.save();
};

conversationSchema.methods.applyFilter = function(filterCriteria) {
  this.refinements = this.refinements || {};
  this.refinements.appliedFilters = {
    ...this.refinements.appliedFilters,
    ...filterCriteria
  };
  
  return this.save();
};

conversationSchema.methods.trackViewedOffer = function(offerId) {
  if (!this.refinements) {
    this.refinements = { viewedOffers: [] };
  }
  
  if (!this.refinements.viewedOffers.includes(offerId)) {
    this.refinements.viewedOffers.push(offerId);
  }
  
  return this.save();
};

conversationSchema.methods.calculateTotalAmount = function() {
  let total = this.selectedOffer ? this.selectedOffer.totalAmount : 0;
  
  if (this.selectedServices && this.selectedServices.length > 0) {
    total += this.selectedServices.reduce((sum, service) => {
      return sum + (service.totalAmount * (service.quantity || 1));
    }, 0);
  }
  
  return total;
};

// Statics
conversationSchema.statics.findBySessionId = function(sessionId) {
  return this.findOne({ sessionId });
};

conversationSchema.statics.findActiveByUser = function(userId) {
  return this.find({
    user: userId,
    expiresAt: { $gt: new Date() },
    bookingReference: { $exists: false }
  }).sort({ createdAt: -1 });
};

conversationSchema.statics.cleanupExpired = function() {
  return this.deleteMany({
    expiresAt: { $lt: new Date() },
    bookingReference: { $exists: false }
  });
};

// Pre-save middleware
conversationSchema.pre('save', function(next) {
  this.updatedAt = new Date();
  
  // Extend expiration on activity
  if (this.isModified('messages') || this.isModified('currentStage')) {
    this.expiresAt = new Date(+new Date() + 24 * 60 * 60 * 1000);
  }
  
  next();
});

const Conversation = mongoose.model('Conversation', conversationSchema);

module.exports = Conversation;