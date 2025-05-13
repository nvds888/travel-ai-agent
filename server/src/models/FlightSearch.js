// server/src/models/FlightSearch.js
const mongoose = require('mongoose');

// Time specification schema for departure/arrival time preferences
const timeSpecSchema = new mongoose.Schema({
  from: {
    type: String,
    required: true,
    match: /^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/
  },
  to: {
    type: String,
    required: true,
    match: /^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/
  }
}, { _id: false });

// Multi-city segment schema
const multiCitySegmentSchema = new mongoose.Schema({
  origin: {
    type: String,
    required: true,
    uppercase: true,
    match: /^[A-Z]{3}$/
  },
  destination: {
    type: String,
    required: true,
    uppercase: true,
    match: /^[A-Z]{3}$/
  },
  departureDate: {
    type: Date,
    required: true
  },
  departureTime: timeSpecSchema
}, { _id: false });

// Main flight search schema
const flightSearchSchema = new mongoose.Schema({
  type: {
    type: String,
    required: true,
    enum: ['one_way', 'round_trip', 'multi_city'],
    default: 'one_way'
  },
  origin: {
    type: String,
    required: true,
    uppercase: true,
    match: /^[A-Z]{3}$/
  },
  destination: {
    type: String,
    required: true,
    uppercase: true,
    match: /^[A-Z]{3}$/
  },
  departureDate: {
    type: Date,
    required: true
  },
  returnDate: {
    type: Date,
    required: function() { return this.type === 'round_trip'; }
  },
  departureTime: timeSpecSchema,
  arrivalTime: timeSpecSchema,
  cabinClass: {
    type: String,
    enum: ['economy', 'premium_economy', 'business', 'first'],
    default: 'economy'
  },
  passengers: {
    adults: { type: Number, default: 1, min: 1, max: 9 },
    children: { type: Number, default: 0, min: 0, max: 9 },
    infants: { type: Number, default: 0, min: 0, max: 9 }
  },
  maxConnections: {
    type: Number,
    min: 0,
    max: 3,
    default: null
  },
  additionalStops: [multiCitySegmentSchema],
  preferences: {
    preferredAirlines: [String],
    avoidAirlines: [String],
    flexibleDates: { type: Boolean, default: false },
    nearbyAirports: { type: Boolean, default: false }
  }
});

// Validation method
flightSearchSchema.methods.validate = function() {
  const errors = [];
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  // Date validation
  if (this.departureDate < today) {
    errors.push('Departure date must be in the future');
  }

  // Return date validation for round trips
  if (this.type === 'round_trip') {
    if (!this.returnDate) {
      errors.push('Return date is required for round-trip flights');
    } else if (this.returnDate <= this.departureDate) {
      errors.push('Return date must be after departure date');
    }
  }

  // Multi-city validation
  if (this.type === 'multi_city') {
    if (!this.additionalStops || this.additionalStops.length === 0) {
      errors.push('Multi-city trips require at least one additional stop');
    } else {
      // Validate multi-city segments
      let previousDate = this.departureDate;
      this.additionalStops.forEach((stop, index) => {
        if (stop.departureDate <= previousDate) {
          errors.push(`Stop ${index + 1} departure date must be after previous segment`);
        }
        previousDate = stop.departureDate;
      });
    }
  }

  // Time validation
  if (this.departureTime) {
    const fromTime = parseInt(this.departureTime.from.replace(':', ''));
    const toTime = parseInt(this.departureTime.to.replace(':', ''));
    if (fromTime >= toTime) {
      errors.push('Departure time range is invalid');
    }
  }

  // Passenger validation
  const totalPassengers = this.passengers.adults + this.passengers.children + this.passengers.infants;
  if (totalPassengers > 9) {
    errors.push('Maximum 9 passengers allowed');
  }
  if (this.passengers.infants > this.passengers.adults) {
    errors.push('Number of infants cannot exceed number of adults');
  }

  return errors;
};

// Format for Duffel API
flightSearchSchema.methods.toDuffelFormat = function() {
  const slices = [];
  
  // Main slice (outbound)
  const mainSlice = {
    origin: this.origin,
    destination: this.destination,
    departure_date: this.departureDate.toISOString().split('T')[0]
  };

  if (this.departureTime) {
    mainSlice.departure_time = {
      from: this.departureTime.from,
      to: this.departureTime.to
    };
  }

  if (this.arrivalTime) {
    mainSlice.arrival_time = {
      from: this.arrivalTime.from,
      to: this.arrivalTime.to
    };
  }

  slices.push(mainSlice);

  // Return slice for round trips
  if (this.type === 'round_trip' && this.returnDate) {
    const returnSlice = {
      origin: this.destination,
      destination: this.origin,
      departure_date: this.returnDate.toISOString().split('T')[0]
    };

    if (this.departureTime) {
      returnSlice.departure_time = {
        from: this.departureTime.from,
        to: this.departureTime.to
      };
    }

    slices.push(returnSlice);
  }

  // Multi-city slices
  if (this.type === 'multi_city' && this.additionalStops) {
    this.additionalStops.forEach(stop => {
      const slice = {
        origin: stop.origin,
        destination: stop.destination,
        departure_date: stop.departureDate.toISOString().split('T')[0]
      };

      if (stop.departureTime) {
        slice.departure_time = {
          from: stop.departureTime.from,
          to: stop.departureTime.to
        };
      }

      slices.push(slice);
    });
  }

  // Format passengers
  const passengers = [];
  
  for (let i = 0; i < this.passengers.adults; i++) {
    passengers.push({ type: 'adult' });
  }
  
  for (let i = 0; i < this.passengers.children; i++) {
    passengers.push({ type: 'child', age: 10 });
  }
  
  for (let i = 0; i < this.passengers.infants; i++) {
    passengers.push({ type: 'infant_without_seat', age: 1 });
  }

  const request = {
    slices,
    passengers,
    cabin_class: this.cabinClass
  };

  if (this.maxConnections !== null) {
    request.max_connections = this.maxConnections;
  }

  return request;
};

const FlightSearch = mongoose.model('FlightSearch', flightSearchSchema);

// FlightSearch class for non-database operations
class FlightSearchParams {
  constructor(params = {}) {
    this.type = params.type || 'one_way';
    this.origin = params.origin;
    this.destination = params.destination;
    this.departureDate = params.departureDate;
    this.returnDate = params.returnDate;
    this.departureTime = params.departureTime;
    this.arrivalTime = params.arrivalTime;
    this.cabinClass = params.cabinClass || 'economy';
    this.passengers = params.passengers || { adults: 1, children: 0, infants: 0 };
    this.maxConnections = params.maxConnections !== undefined ? params.maxConnections : null;
    this.additionalStops = params.additionalStops || [];
    this.preferences = params.preferences || {};
  }

  validate() {
    const errors = [];
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // Required fields
    if (!this.origin) errors.push('Origin is required');
    if (!this.destination) errors.push('Destination is required');
    if (!this.departureDate) errors.push('Departure date is required');

    // Date validation
    const depDate = new Date(this.departureDate);
    if (depDate < today) {
      errors.push('Departure date must be in the future');
    }

    // Return date validation
    if (this.type === 'round_trip') {
      if (!this.returnDate) {
        errors.push('Return date is required for round-trip flights');
      } else {
        const retDate = new Date(this.returnDate);
        if (retDate <= depDate) {
          errors.push('Return date must be after departure date');
        }
      }
    }

    // Multi-city validation
    if (this.type === 'multi_city') {
      if (!this.additionalStops || this.additionalStops.length === 0) {
        errors.push('Multi-city trips require at least one additional stop');
      }
    }

    // Time validation
    if (this.departureTime) {
      if (!this.isValidTimeRange(this.departureTime)) {
        errors.push('Invalid departure time range');
      }
    }

    if (this.arrivalTime) {
      if (!this.isValidTimeRange(this.arrivalTime)) {
        errors.push('Invalid arrival time range');
      }
    }

    return errors;
  }

  isValidTimeRange(timeRange) {
    if (!timeRange || !timeRange.from || !timeRange.to) return false;
    
    const timeRegex = /^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/;
    if (!timeRegex.test(timeRange.from) || !timeRegex.test(timeRange.to)) {
      return false;
    }

    const fromMinutes = this.timeToMinutes(timeRange.from);
    const toMinutes = this.timeToMinutes(timeRange.to);
    
    return fromMinutes < toMinutes;
  }

  timeToMinutes(time) {
    const [hours, minutes] = time.split(':').map(Number);
    return hours * 60 + minutes;
  }

  toDuffelFormat() {
    const errors = this.validate();
    if (errors.length > 0) {
      throw new Error(`Validation errors: ${errors.join(', ')}`);
    }

    return {
      slices: this.buildSlices(),
      passengers: this.formatPassengers(),
      cabin_class: this.cabinClass,
      ...(this.maxConnections !== null && { max_connections: this.maxConnections })
    };
  }

  buildSlices() {
    const slices = [];
    
    // Main outbound slice
    slices.push(this.createSlice(
      this.origin,
      this.destination,
      this.departureDate,
      this.departureTime,
      this.arrivalTime
    ));

    // Return slice for round trips
    if (this.type === 'round_trip' && this.returnDate) {
      slices.push(this.createSlice(
        this.destination,
        this.origin,
        this.returnDate,
        this.departureTime,
        this.arrivalTime
      ));
    }

    // Multi-city slices
    if (this.type === 'multi_city' && this.additionalStops) {
      this.additionalStops.forEach(stop => {
        slices.push(this.createSlice(
          stop.origin,
          stop.destination,
          stop.departureDate,
          stop.departureTime
        ));
      });
    }

    return slices;
  }

  createSlice(origin, destination, date, departureTime, arrivalTime) {
    const slice = {
      origin,
      destination,
      departure_date: this.formatDate(date)
    };

    if (departureTime) {
      slice.departure_time = {
        from: departureTime.from,
        to: departureTime.to
      };
    }

    if (arrivalTime) {
      slice.arrival_time = {
        from: arrivalTime.from,
        to: arrivalTime.to
      };
    }

    return slice;
  }

  formatDate(date) {
    if (typeof date === 'string' && date.match(/^\d{4}-\d{2}-\d{2}$/)) {
      return date;
    }
    const d = new Date(date);
    return d.toISOString().split('T')[0];
  }

  formatPassengers() {
    const passengers = [];
    
    for (let i = 0; i < this.passengers.adults; i++) {
      passengers.push({ type: 'adult' });
    }
    
    for (let i = 0; i < this.passengers.children; i++) {
      passengers.push({ type: 'child', age: 10 });
    }
    
    for (let i = 0; i < this.passengers.infants; i++) {
      passengers.push({ type: 'infant_without_seat', age: 1 });
    }

    return passengers;
  }
}

module.exports = {
  FlightSearch,
  FlightSearchParams
};