// server/src/models/User.js
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const userSchema = new mongoose.Schema({
  email: {
    type: String,
    required: [true, 'Please add an email'],
    unique: true,
    lowercase: true,
    match: [
      /^\w+([\.-]?\w+)*@\w+([\.-]?\w+)*(\.\w{2,3})+$/,
      'Please add a valid email'
    ]
  },
  password: {
    type: String,
    required: [true, 'Please add a password'],
    minlength: 6,
    select: false
  },
  firstName: {
    type: String,
    required: [true, 'Please add a first name'],
    trim: true
  },
  lastName: {
    type: String,
    required: [true, 'Please add a last name'],
    trim: true
  },
  title: {
    type: String,
    enum: ['Mr', 'Mrs', 'Ms', 'Dr', 'Prof'],
    default: 'Mr'
  },
  dateOfBirth: {
    type: Date,
    required: function() {
      return this.registrationType !== 'quick';
    }
  },
  gender: {
    type: String,
    enum: ['male', 'female', 'other'],
    required: function() {
      return this.registrationType !== 'quick';
    }
  },
  phoneNumber: {
    type: String,
    required: [true, 'Please add a phone number']
  },
  nationality: {
    type: String,
    uppercase: true,
    match: /^[A-Z]{2}$/
  },
  passportNumber: String,
  passportExpiry: Date,
  passportIssuingCountry: String,
  knownTravelerNumber: String,
  preferences: {
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
        enum: ['window', 'aisle', 'middle', 'no_preference'],
        default: 'no_preference'
      },
      location: {
        type: String,
        enum: ['front', 'middle', 'back', 'no_preference'],
        default: 'no_preference'
      },
      extraLegroom: {
        type: Boolean,
        default: false
      }
    },
    mealPreferences: {
      type: String,
      enum: ['standard', 'vegetarian', 'vegan', 'kosher', 'halal', 'gluten_free', 'no_meal'],
      default: 'standard'
    },
    notificationPreferences: {
      priceAlerts: {
        type: Boolean,
        default: true
      },
      flightStatusUpdates: {
        type: Boolean,
        default: true
      },
      checkInReminders: {
        type: Boolean,
        default: true
      },
      marketingEmails: {
        type: Boolean,
        default: false
      }
    },
    specialAssistance: [String],
    loyaltyPrograms: [{
      airline: String,
      programName: String,
      memberNumber: String,
      tier: String
    }]
  },
  address: {
    street: String,
    city: String,
    state: String,
    postalCode: String,
    country: String
  },
  emergencyContact: {
    name: String,
    relationship: String,
    phoneNumber: String,
    email: String
  },
  profilePicture: String,
  socialAccounts: [{
    provider: {
      type: String,
      enum: ['google', 'facebook', 'apple']
    },
    providerId: String,
    connectedAt: {
      type: Date,
      default: Date.now
    }
  }],
  travelDocuments: [{
    type: {
      type: String,
      enum: ['passport', 'visa', 'identity_card']
    },
    number: String,
    issuingCountry: String,
    expiryDate: Date,
    uploadedFile: String
  }],
  paymentMethods: [{
    type: {
      type: String,
      enum: ['credit_card', 'debit_card', 'paypal', 'apple_pay', 'google_pay']
    },
    lastFourDigits: String,
    expiryMonth: Number,
    expiryYear: Number,
    isDefault: Boolean,
    nickname: String
  }],
  bookingHistory: [{
    bookingReference: String,
    duffelOrderId: String,
    bookedAt: Date,
    totalAmount: Number,
    currency: String,
    status: String
  }],
  searchHistory: [{
    searchParams: mongoose.Schema.Types.Mixed,
    searchedAt: {
      type: Date,
      default: Date.now
    }
  }],
  role: {
    type: String,
    enum: ['user', 'admin'],
    default: 'user'
  },
  isVerified: {
    type: Boolean,
    default: false
  },
  verificationToken: String,
  verificationExpire: Date,
  registrationType: {
    type: String,
    enum: ['full', 'quick', 'social'],
    default: 'full'
  },
  lastLogin: Date,
  loginAttempts: {
    type: Number,
    default: 0
  },
  lockUntil: Date,
  twoFactorEnabled: {
    type: Boolean,
    default: false
  },
  twoFactorSecret: String,
  activeDevices: [{
    deviceId: String,
    deviceName: String,
    lastSeen: Date,
    ipAddress: String,
    userAgent: String
  }],
  privacySettings: {
    shareDataWithPartners: {
      type: Boolean,
      default: false
    },
    allowProfileViewing: {
      type: Boolean,
      default: true
    },
    dataRetentionPeriod: {
      type: Number,
      default: 365 // days
    }
  },
  deletedAt: Date,
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Indexes
userSchema.index({ email: 1, isVerified: 1 });
userSchema.index({ 'socialAccounts.provider': 1, 'socialAccounts.providerId': 1 });
userSchema.index({ createdAt: -1 });

// Virtual for full name
userSchema.virtual('fullName').get(function() {
  return `${this.firstName} ${this.lastName}`;
});

// Virtual for age
userSchema.virtual('age').get(function() {
  if (!this.dateOfBirth) return null;
  const today = new Date();
  const birthDate = new Date(this.dateOfBirth);
  let age = today.getFullYear() - birthDate.getFullYear();
  const m = today.getMonth() - birthDate.getMonth();
  if (m < 0 || (m === 0 && today.getDate() < birthDate.getDate())) {
    age--;
  }
  return age;
});

// Instance methods
userSchema.methods.matchPassword = async function(enteredPassword) {
  return await bcrypt.compare(enteredPassword, this.password);
};

userSchema.methods.toPassengerFormat = function() {
  return {
    title: this.title,
    firstName: this.firstName,
    lastName: this.lastName,
    dateOfBirth: this.dateOfBirth ? this.dateOfBirth.toISOString().split('T')[0] : null,
    gender: this.gender,
    email: this.email,
    phoneNumber: this.phoneNumber,
    nationality: this.nationality,
    passportNumber: this.passportNumber,
    passportExpiry: this.passportExpiry ? this.passportExpiry.toISOString().split('T')[0] : null,
    passportIssuingCountry: this.passportIssuingCountry || this.nationality,
    knownTravelerNumber: this.knownTravelerNumber,
    seatPreference: this.preferences?.seatPreferences?.position || 'no_preference',
    mealPreference: this.preferences?.mealPreferences || 'standard',
    specialAssistance: this.preferences?.specialAssistance || []
  };
};

userSchema.methods.isLockedOut = function() {
  return this.lockUntil && this.lockUntil > Date.now();
};

userSchema.methods.incLoginAttempts = function() {
  // Reset attempts if lock has expired
  if (this.lockUntil && this.lockUntil < Date.now()) {
    return this.updateOne({
      $set: { loginAttempts: 1 },
      $unset: { lockUntil: 1 }
    });
  }
  
  const updates = { $inc: { loginAttempts: 1 } };
  
  // Lock account after 5 attempts for 2 hours
  if (this.loginAttempts + 1 >= 5 && !this.lockUntil) {
    updates.$set = { lockUntil: Date.now() + 2 * 60 * 60 * 1000 };
  }
  
  return this.updateOne(updates);
};

userSchema.methods.resetLoginAttempts = function() {
  return this.updateOne({
    $set: { loginAttempts: 0 },
    $unset: { lockUntil: 1 }
  });
};

userSchema.methods.addDevice = function(deviceInfo) {
  const device = {
    deviceId: deviceInfo.deviceId,
    deviceName: deviceInfo.deviceName || 'Unknown Device',
    lastSeen: new Date(),
    ipAddress: deviceInfo.ipAddress,
    userAgent: deviceInfo.userAgent
  };
  
  // Remove device if it already exists
  this.activeDevices = this.activeDevices.filter(d => d.deviceId !== deviceInfo.deviceId);
  
  // Add new device
  this.activeDevices.push(device);
  
  // Keep only last 10 devices
  if (this.activeDevices.length > 10) {
    this.activeDevices = this.activeDevices.slice(-10);
  }
  
  return this.save();
};

userSchema.methods.addSearchToHistory = function(searchParams) {
  this.searchHistory.push({
    searchParams,
    searchedAt: new Date()
  });
  
  // Keep only last 50 searches
  if (this.searchHistory.length > 50) {
    this.searchHistory = this.searchHistory.slice(-50);
  }
  
  return this.save();
};

userSchema.methods.addBookingToHistory = function(bookingData) {
  this.bookingHistory.push({
    bookingReference: bookingData.bookingReference,
    duffelOrderId: bookingData.duffelOrderId,
    bookedAt: new Date(),
    totalAmount: bookingData.totalAmount,
    currency: bookingData.currency,
    status: bookingData.status || 'confirmed'
  });
  
  return this.save();
};

userSchema.methods.calculateLoyaltyStatus = function() {
  const bookingsLastYear = this.bookingHistory.filter(booking => {
    const oneYearAgo = new Date();
    oneYearAgo.setFullYear(oneYearAgo.getFullYear() - 1);
    return new Date(booking.bookedAt) > oneYearAgo;
  });
  
  const totalSpent = bookingsLastYear.reduce((sum, booking) => sum + booking.totalAmount, 0);
  
  if (totalSpent > 10000) return 'platinum';
  if (totalSpent > 5000) return 'gold';
  if (totalSpent > 2000) return 'silver';
  return 'bronze';
};

// Static methods
userSchema.statics.findByEmail = function(email) {
  return this.findOne({ email: email.toLowerCase() });
};

userSchema.statics.findBySocialAccount = function(provider, providerId) {
  return this.findOne({
    'socialAccounts.provider': provider,
    'socialAccounts.providerId': providerId
  });
};

userSchema.statics.getActiveUsers = function(days = 30) {
  const since = new Date();
  since.setDate(since.getDate() - days);
  
  return this.find({
    lastLogin: { $gte: since },
    isVerified: true
  });
};

// Pre-save middleware
userSchema.pre('save', async function(next) {
  if (!this.isModified('password')) {
    next();
  }
  
  const salt = await bcrypt.genSalt(10);
  this.password = await bcrypt.hash(this.password, salt);
});

const User = mongoose.model('User', userSchema);

module.exports = User;