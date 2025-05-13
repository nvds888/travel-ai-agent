// server/src/services/validation.service.js
class ValidationService {
    constructor() {
      this.timeRegex = /^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/;
      this.airportCodeRegex = /^[A-Z]{3}$/;
      this.dateRegex = /^\d{4}-\d{2}-\d{2}$/;
    }
  
    validateFlightSearch(params) {
      const errors = [];
      const warnings = [];
      
      // Basic field validation
      if (!params.origin) {
        errors.push({ field: 'origin', message: 'Origin airport is required' });
      } else if (!this.isValidAirportCode(params.origin)) {
        errors.push({ field: 'origin', message: 'Invalid origin airport code format' });
      }
  
      if (!params.destination) {
        errors.push({ field: 'destination', message: 'Destination airport is required' });
      } else if (!this.isValidAirportCode(params.destination)) {
        errors.push({ field: 'destination', message: 'Invalid destination airport code format' });
      }
  
      if (params.origin === params.destination) {
        errors.push({ field: 'destination', message: 'Origin and destination cannot be the same' });
      }
  
      // Date validation
      const dateErrors = this.validateDates(params);
      errors.push(...dateErrors);
  
      // Time validation
      if (params.departureTime) {
        const timeErrors = this.validateTimeRange(params.departureTime, 'departureTime');
        errors.push(...timeErrors);
      }
  
      if (params.arrivalTime) {
        const timeErrors = this.validateTimeRange(params.arrivalTime, 'arrivalTime');
        errors.push(...timeErrors);
      }
  
      // Flight type specific validation
      if (params.type === 'round_trip' && !params.returnDate) {
        errors.push({ field: 'returnDate', message: 'Return date is required for round-trip flights' });
      }
  
      if (params.type === 'multi_city') {
        const multiCityErrors = this.validateMultiCity(params);
        errors.push(...multiCityErrors);
      }
  
      // Passenger validation
      const passengerErrors = this.validatePassengers(params.passengers);
      errors.push(...passengerErrors);
  
      // Connection validation
      if (params.maxConnections !== null && params.maxConnections !== undefined) {
        if (!Number.isInteger(params.maxConnections) || params.maxConnections < 0 || params.maxConnections > 3) {
          errors.push({ field: 'maxConnections', message: 'Max connections must be between 0 and 3' });
        }
      }
  
      // Add warnings for edge cases
      const depDate = new Date(params.departureDate);
      const today = new Date();
      const daysDiff = Math.ceil((depDate - today) / (1000 * 60 * 60 * 24));
      
      if (daysDiff < 2) {
        warnings.push('Booking very close to departure date may have limited availability');
      }
  
      if (daysDiff > 365) {
        warnings.push('Booking more than a year in advance may have limited availability');
      }
  
      return { errors, warnings, isValid: errors.length === 0 };
    }
  
    validateDates(params) {
      const errors = [];
      const today = new Date();
      today.setHours(0, 0, 0, 0);
  
      if (!params.departureDate) {
        errors.push({ field: 'departureDate', message: 'Departure date is required' });
        return errors;
      }
  
      const depDate = new Date(params.departureDate);
      if (isNaN(depDate.getTime())) {
        errors.push({ field: 'departureDate', message: 'Invalid departure date format' });
        return errors;
      }
  
      if (depDate < today) {
        errors.push({ field: 'departureDate', message: 'Departure date must be in the future' });
      }
  
      // Validate return date for round trips
      if (params.type === 'round_trip' && params.returnDate) {
        const retDate = new Date(params.returnDate);
        if (isNaN(retDate.getTime())) {
          errors.push({ field: 'returnDate', message: 'Invalid return date format' });
        } else if (retDate <= depDate) {
          errors.push({ field: 'returnDate', message: 'Return date must be after departure date' });
        }
      }
  
      return errors;
    }
  
    validateTimeRange(timeRange, fieldName) {
      const errors = [];
  
      if (!timeRange || typeof timeRange !== 'object') {
        errors.push({ field: fieldName, message: 'Time range must be an object with from and to properties' });
        return errors;
      }
  
      if (!timeRange.from || !timeRange.to) {
        errors.push({ field: fieldName, message: 'Time range must have both from and to times' });
        return errors;
      }
  
      if (!this.timeRegex.test(timeRange.from)) {
        errors.push({ field: fieldName, message: 'Invalid "from" time format. Use HH:MM format' });
      }
  
      if (!this.timeRegex.test(timeRange.to)) {
        errors.push({ field: fieldName, message: 'Invalid "to" time format. Use HH:MM format' });
      }
  
      if (errors.length === 0) {
        const fromMinutes = this.timeToMinutes(timeRange.from);
        const toMinutes = this.timeToMinutes(timeRange.to);
        
        if (fromMinutes >= toMinutes) {
          errors.push({ field: fieldName, message: '"From" time must be before "to" time' });
        }
      }
  
      return errors;
    }
  
    validateMultiCity(params) {
      const errors = [];
  
      if (!params.additionalStops || !Array.isArray(params.additionalStops)) {
        errors.push({ field: 'additionalStops', message: 'Additional stops are required for multi-city trips' });
        return errors;
      }
  
      if (params.additionalStops.length === 0) {
        errors.push({ field: 'additionalStops', message: 'At least one additional stop is required for multi-city trips' });
        return errors;
      }
  
      const allSegments = [
        { origin: params.origin, destination: params.destination, date: params.departureDate },
        ...params.additionalStops
      ];
  
      // Validate continuity of segments
      for (let i = 0; i < allSegments.length - 1; i++) {
        const currentSegment = allSegments[i];
        const nextSegment = allSegments[i + 1];
  
        // Check that segments connect
        if (i > 0 && currentSegment.destination !== nextSegment.origin) {
          errors.push({
            field: 'additionalStops',
            message: `Segment ${i + 1} destination doesn't match segment ${i + 2} origin`
          });
        }
  
        // Validate airport codes
        if (!this.isValidAirportCode(currentSegment.origin)) {
          errors.push({
            field: 'additionalStops',
            message: `Invalid airport code in segment ${i + 1} origin`
          });
        }
  
        if (!this.isValidAirportCode(currentSegment.destination)) {
          errors.push({
            field: 'additionalStops',
            message: `Invalid airport code in segment ${i + 1} destination`
          });
        }
  
        // Validate dates are in sequence
        const currentDate = new Date(currentSegment.date || currentSegment.departureDate);
        const nextDate = new Date(nextSegment.date || nextSegment.departureDate);
  
        if (nextDate <= currentDate) {
          errors.push({
            field: 'additionalStops',
            message: `Segment ${i + 2} departure must be after segment ${i + 1}`
          });
        }
      }
  
      return errors;
    }
  
    validatePassengers(passengers) {
      const errors = [];
  
      if (!passengers || typeof passengers !== 'object') {
        errors.push({ field: 'passengers', message: 'Passengers must be specified' });
        return errors;
      }
  
      const { adults = 0, children = 0, infants = 0 } = passengers;
  
      // Validate passenger counts
      if (!Number.isInteger(adults) || adults < 1) {
        errors.push({ field: 'passengers.adults', message: 'At least one adult passenger is required' });
      }
  
      if (!Number.isInteger(children) || children < 0) {
        errors.push({ field: 'passengers.children', message: 'Number of children must be a non-negative integer' });
      }
  
      if (!Number.isInteger(infants) || infants < 0) {
        errors.push({ field: 'passengers.infants', message: 'Number of infants must be a non-negative integer' });
      }
  
      // Total passenger limit
      const total = adults + children + infants;
      if (total > 9) {
        errors.push({ field: 'passengers', message: 'Maximum 9 passengers allowed' });
      }
  
      // Infant to adult ratio
      if (infants > adults) {
        errors.push({ field: 'passengers.infants', message: 'Number of infants cannot exceed number of adults' });
      }
  
      return errors;
    }
  
    validatePassengerDetails(passengers) {
      const errors = [];
  
      if (!Array.isArray(passengers) || passengers.length === 0) {
        errors.push({ field: 'passengers', message: 'Passenger details are required' });
        return errors;
      }
  
      passengers.forEach((passenger, index) => {
        const passengerErrors = [];
  
        // Required fields
        if (!passenger.firstName) {
          passengerErrors.push({ field: `passengers[${index}].firstName`, message: 'First name is required' });
        }
  
        if (!passenger.lastName) {
          passengerErrors.push({ field: `passengers[${index}].lastName`, message: 'Last name is required' });
        }
  
        if (!passenger.dateOfBirth) {
          passengerErrors.push({ field: `passengers[${index}].dateOfBirth`, message: 'Date of birth is required' });
        } else {
          const dob = new Date(passenger.dateOfBirth);
          const today = new Date();
          
          if (dob >= today) {
            passengerErrors.push({ field: `passengers[${index}].dateOfBirth`, message: 'Date of birth must be in the past' });
          }
  
          // Age validation
          const age = Math.floor((today - dob) / (365.25 * 24 * 60 * 60 * 1000));
          if (passenger.type === 'child' && (age < 2 || age > 11)) {
            passengerErrors.push({ field: `passengers[${index}].dateOfBirth`, message: 'Child must be between 2-11 years old' });
          }
          if (passenger.type === 'infant' && age >= 2) {
            passengerErrors.push({ field: `passengers[${index}].dateOfBirth`, message: 'Infant must be under 2 years old' });
          }
        }
  
        if (!passenger.email) {
          passengerErrors.push({ field: `passengers[${index}].email`, message: 'Email is required' });
        } else if (!this.isValidEmail(passenger.email)) {
          passengerErrors.push({ field: `passengers[${index}].email`, message: 'Invalid email format' });
        }
  
        if (!passenger.phoneNumber) {
          passengerErrors.push({ field: `passengers[${index}].phoneNumber`, message: 'Phone number is required' });
        }
  
        // For international flights, passport is required
        if (passenger.requiresPassport) {
          if (!passenger.passportNumber) {
            passengerErrors.push({ field: `passengers[${index}].passportNumber`, message: 'Passport number is required for international flights' });
          }
  
          if (!passenger.passportExpiry) {
            passengerErrors.push({ field: `passengers[${index}].passportExpiry`, message: 'Passport expiry date is required' });
          } else {
            const expiryDate = new Date(passenger.passportExpiry);
            const departureDate = new Date(passenger.departureDate || new Date());
            const sixMonthsFromDeparture = new Date(departureDate);
            sixMonthsFromDeparture.setMonth(sixMonthsFromDeparture.getMonth() + 6);
  
            if (expiryDate < sixMonthsFromDeparture) {
              passengerErrors.push({ 
                field: `passengers[${index}].passportExpiry`, 
                message: 'Passport must be valid for at least 6 months from departure date' 
              });
            }
          }
  
          if (!passenger.nationality) {
            passengerErrors.push({ field: `passengers[${index}].nationality`, message: 'Nationality is required for international flights' });
          }
        }
  
        errors.push(...passengerErrors);
      });
  
      return errors;
    }
  
    // Helper methods
    isValidAirportCode(code) {
      return this.airportCodeRegex.test(code);
    }
  
    isValidEmail(email) {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      return emailRegex.test(email);
    }
  
    timeToMinutes(time) {
      const [hours, minutes] = time.split(':').map(Number);
      return hours * 60 + minutes;
    }
  
    // Validate time preferences from natural language
    parseTimePreference(text) {
      const preferences = {
        'early morning': { from: '05:00', to: '08:00' },
        'morning': { from: '06:00', to: '12:00' },
        'afternoon': { from: '12:00', to: '17:00' },
        'evening': { from: '17:00', to: '21:00' },
        'night': { from: '21:00', to: '23:59' },
        'late night': { from: '22:00', to: '23:59' },
        'red eye': { from: '23:00', to: '05:00' },
        'business hours': { from: '08:00', to: '18:00' },
        'daytime': { from: '06:00', to: '18:00' }
      };
  
      const lowerText = text.toLowerCase();
      
      for (const [key, value] of Object.entries(preferences)) {
        if (lowerText.includes(key)) {
          return value;
        }
      }
  
      // Try to parse specific time mentions
      const timeMatch = lowerText.match(/(\d{1,2})\s*(am|pm)/i);
      if (timeMatch) {
        let hour = parseInt(timeMatch[1]);
        const period = timeMatch[2].toLowerCase();
        
        if (period === 'pm' && hour !== 12) hour += 12;
        if (period === 'am' && hour === 12) hour = 0;
        
        const timeStr = `${hour.toString().padStart(2, '0')}:00`;
        return {
          from: timeStr,
          to: `${(hour + 2).toString().padStart(2, '0')}:00`
        };
      }
  
      return null;
    }
  }
  
  module.exports = new ValidationService();