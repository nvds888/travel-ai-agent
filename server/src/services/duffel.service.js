// server/src/services/duffel.service.js
const { Duffel } = require('@duffel/api');
const { FlightSearchParams } = require('../models/FlightSearch');
const validationService = require('./validation.service');

class DuffelService {
  constructor() {
    this.duffel = new Duffel({
      token: process.env.DUFFEL_API_KEY,
      debug: process.env.NODE_ENV === 'development'
    });
  }

  async searchFlights(searchParams) {
    try {
      // Validate search parameters
      const flightSearch = new FlightSearchParams(searchParams);
      const validationResult = validationService.validateFlightSearch(flightSearch);
      
      if (validationResult.errors.length > 0) {
        throw new Error(`Validation errors: ${validationResult.errors.map(e => e.message).join(', ')}`);
      }

      // Log warnings if any
      if (validationResult.warnings.length > 0) {
        console.log('Search warnings:', validationResult.warnings);
      }

      // Convert to Duffel format
      const duffelRequest = flightSearch.toDuffelFormat();
      console.log('Duffel request:', JSON.stringify(duffelRequest, null, 2));

      // Create offer request
      const offerRequest = await this.duffel.offerRequests.create({
        ...duffelRequest,
        return_offers: false,
        supplier_timeout: searchParams.supplierTimeout || 30000
      });

      // Get offers with pagination support
      const offerParams = {
        offer_request_id: offerRequest.data.id,
        sort: searchParams.sort || 'total_amount',
        limit: searchParams.limit || 10
      };

      // Add filters if provided
      if (searchParams.maxPrice) {
        offerParams.max_price = searchParams.maxPrice;
      }

      if (searchParams.airlines) {
        offerParams.airlines = searchParams.airlines;
      }

      const offers = await this.duffel.offers.list(offerParams);

      // Fetch detailed offers with services
      const detailedOffers = await Promise.all(
        offers.data.map(async (offer) => {
          try {
            const fullOffer = await this.duffel.offers.get(offer.id, {
              return_available_services: true
            });
            return fullOffer.data;
          } catch (error) {
            console.error(`Error fetching offer ${offer.id}:`, error);
            return offer; // Return basic offer if detailed fetch fails
          }
        })
      );

      return this.formatOffers(detailedOffers);
    } catch (error) {
      console.error('Duffel search error:', error);
      if (error.errors && error.errors.length > 0) {
        throw {
          errors: error.errors.map(e => ({
            code: e.code,
            message: e.message,
            type: e.type
          }))
        };
      }
      throw error;
    }
  }

  async searchMultiCity(segments) {
    try {
      // Validate multi-city segments
      const multiCityParams = {
        type: 'multi_city',
        origin: segments[0].origin,
        destination: segments[0].destination,
        departureDate: segments[0].departureDate,
        additionalStops: segments.slice(1),
        passengers: segments[0].passengers || { adults: 1, children: 0, infants: 0 },
        cabinClass: segments[0].cabinClass || 'economy'
      };

      const validationResult = validationService.validateFlightSearch(multiCityParams);
      
      if (validationResult.errors.length > 0) {
        throw new Error(`Validation errors: ${validationResult.errors.map(e => e.message).join(', ')}`);
      }

      // Format slices for Duffel
      const slices = segments.map(segment => {
        const slice = {
          origin: segment.origin,
          destination: segment.destination,
          departure_date: this.formatDate(segment.departureDate)
        };

        if (segment.departureTime) {
          slice.departure_time = {
            from: segment.departureTime.from,
            to: segment.departureTime.to
          };
        }

        return slice;
      });

      const offerRequest = await this.duffel.offerRequests.create({
        slices,
        passengers: this.formatPassengers(segments[0].passengers),
        cabin_class: segments[0].cabinClass || 'economy',
        return_offers: false,
        supplier_timeout: 45000 // Longer timeout for multi-city
      });

      const offers = await this.duffel.offers.list({
        offer_request_id: offerRequest.data.id,
        sort: 'total_amount',
        limit: 10
      });

      return this.formatOffers(offers.data);
    } catch (error) {
      console.error('Multi-city search error:', error);
      throw error;
    }
  }

  async getOfferDetails(offerId, options = {}) {
    try {
      const offerParams = {
        return_available_services: options.includeServices !== false,
        return_seat_maps: options.includeSeatMaps === true,
        return_brand_attributes: options.includeBrandAttributes === true
      };

      const offer = await this.duffel.offers.get(offerId, offerParams);
      return this.formatDetailedOffer(offer.data);
    } catch (error) {
      console.error('Get offer details error:', error);
      throw error;
    }
  }

  formatDetailedOffer(offer) {
    const baseOffer = this.formatOffers([offer])[0];
    
    const detailed = {
      ...baseOffer,
      conditions: {
        refundable: offer.conditions?.refund_before_departure?.allowed || false,
        changeable: offer.conditions?.change_before_departure?.allowed || false,
        refundPenalty: offer.conditions?.refund_before_departure?.penalty_amount,
        changePenalty: offer.conditions?.change_before_departure?.penalty_amount
      }
    };

    if (offer.available_services) {
      detailed.availableServices = this.formatAvailableServices(offer.available_services);
    }

    if (offer.seat_maps) {
      detailed.seatMaps = this.formatSeatMaps(offer.seat_maps);
    }

    if (offer.brand_attributes) {
      detailed.brandAttributes = offer.brand_attributes;
    }

    return detailed;
  }

  formatSeatMaps(seatMaps) {
    return seatMaps.map(seatMap => ({
      segmentId: seatMap.segment_id,
      aircraftType: seatMap.aircraft?.name,
      cabins: seatMap.cabins.map(cabin => ({
        cabinClass: cabin.cabin_class,
        rows: cabin.rows.map(row => ({
          rowNumber: row.row,
          seats: row.seats.map(seat => ({
            designator: seat.designator,
            available: seat.available,
            type: seat.type,
            amenities: seat.amenities,
            price: seat.price ? {
              amount: parseFloat(seat.price.amount),
              currency: seat.price.currency
            } : null
          }))
        }))
      }))
    }));
  }

  async filterOffers(offers, criteria) {
    let filtered = [...offers];

    // Time-based filtering
    if (criteria.departureTime) {
      filtered = filtered.filter(offer => {
        const departureTime = new Date(offer.slices[0].departureDateTime);
        const hour = departureTime.getHours();
        const fromHour = parseInt(criteria.departureTime.from.split(':')[0]);
        const toHour = parseInt(criteria.departureTime.to.split(':')[0]);
        
        if (toHour < fromHour) { // Handles overnight times like 23:00 to 05:00
          return hour >= fromHour || hour <= toHour;
        } else {
          return hour >= fromHour && hour <= toHour;
        }
      });
    }

    // Connection filtering
    if (criteria.maxConnections !== undefined && criteria.maxConnections !== null) {
      filtered = filtered.filter(offer => 
        offer.slices.every(slice => slice.segments.length - 1 <= criteria.maxConnections)
      );
    }

    // Airline filtering
    if (criteria.airlines && criteria.airlines.length > 0) {
      const airlineCodes = criteria.airlines.map(a => a.toUpperCase());
      filtered = filtered.filter(offer =>
        offer.slices.some(slice =>
          slice.segments.some(segment =>
            airlineCodes.includes(segment.airline.iataCode)
          )
        )
      );
    }

    // Price filtering
    if (criteria.maxPrice) {
      filtered = filtered.filter(offer => offer.totalAmount <= criteria.maxPrice);
    }

    if (criteria.minPrice) {
      filtered = filtered.filter(offer => offer.totalAmount >= criteria.minPrice);
    }

    // Duration filtering
    if (criteria.maxDuration) {
      filtered = filtered.filter(offer => {
        const totalMinutes = offer.slices.reduce((total, slice) => 
          total + this.parseDurationToMinutes(slice.duration), 0
        );
        return totalMinutes <= criteria.maxDuration;
      });
    }

    // Sort results
    if (criteria.sort) {
      switch (criteria.sort) {
        case 'price_low':
          filtered.sort((a, b) => a.totalAmount - b.totalAmount);
          break;
        case 'price_high':
          filtered.sort((a, b) => b.totalAmount - a.totalAmount);
          break;
        case 'duration_short':
          filtered.sort((a, b) => {
            const aDuration = a.slices.reduce((total, slice) => 
              total + this.parseDurationToMinutes(slice.duration), 0
            );
            const bDuration = b.slices.reduce((total, slice) => 
              total + this.parseDurationToMinutes(slice.duration), 0
            );
            return aDuration - bDuration;
          });
          break;
        case 'duration_long':
          filtered.sort((a, b) => {
            const aDuration = a.slices.reduce((total, slice) => 
              total + this.parseDurationToMinutes(slice.duration), 0
            );
            const bDuration = b.slices.reduce((total, slice) => 
              total + this.parseDurationToMinutes(slice.duration), 0
            );
            return bDuration - aDuration;
          });
          break;
        case 'departure_early':
          filtered.sort((a, b) => 
            new Date(a.slices[0].departureDateTime) - new Date(b.slices[0].departureDateTime)
          );
          break;
        case 'departure_late':
          filtered.sort((a, b) => 
            new Date(b.slices[0].departureDateTime) - new Date(a.slices[0].departureDateTime)
          );
          break;
      }
    }

    return filtered;
  }

  async getOfferServices(offerId) {
    try {
      const offer = await this.duffel.offers.get(offerId, {
        return_available_services: true
      });

      return this.formatAvailableServices(offer.data.available_services || []);
    } catch (error) {
      console.error('Duffel get services error:', error);
      throw error;
    }
  }

  async createOffer(offerId) {
    try {
      const offer = await this.duffel.offers.get(offerId);
      return offer.data;
    } catch (error) {
      console.error('Duffel get offer error:', error);
      throw error;
    }
  }

  async createOrder(offerId, passengers, paymentDetails, services = []) {
    try {
      console.log('Creating order for offer:', offerId);
      console.log('With payment type:', paymentDetails.type);

      // Format dates safely
      const formatDate = (dateInput) => {
        if (!dateInput) return undefined;
        try {
          if (typeof dateInput === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(dateInput)) {
            return dateInput;
          }
          if (typeof dateInput === 'string' && dateInput.includes('T')) {
            return dateInput.split('T')[0];
          }
          const date = new Date(dateInput);
          if (!isNaN(date.getTime())) {
            return date.toISOString().split('T')[0];
          }
          console.warn('Could not format date:', dateInput);
          return undefined;
        } catch (error) {
          console.error('Error formatting date:', error);
          return undefined;
        }
      };

      // Format phone number
      const formatPhoneNumber = (phoneNumber) => {
        if (!phoneNumber) return '';
        let cleaned = phoneNumber.replace(/\D/g, '');
        if (!cleaned.startsWith('+')) {
          if (cleaned.length <= 10) {
            cleaned = '31' + cleaned;
          }
          cleaned = '+' + cleaned;
        }
        return cleaned;
      };

      // Fetch full offer details
      console.log('Fetching full offer details for:', offerId);
      const offerResponse = await this.duffel.offers.get(offerId, { 
        return_available_services: true 
      });
      const offer = offerResponse.data;

      // Use the exact amount from the offer
      const exactAmount = offer.total_amount;
      const currency = offer.total_currency;
      console.log(`Using exact amount from Duffel API: ${currency} ${exactAmount}`);

      // Validate services
      let validServices = [];
      if (services && services.length > 0 && offer.available_services) {
        console.log('Validating requested services against available services...');
        const availableServiceIds = offer.available_services.map(s => s.id);
        validServices = services.filter(service => {
          const isValid = availableServiceIds.includes(service.id);
          if (!isValid) {
            console.warn(`Service ID ${service.id} not found in available services - skipping`);
          }
          return isValid;
        });
        if (validServices.length !== services.length) {
          console.warn(`Some services were invalid: ${services.length - validServices.length} removed`);
        }
      }

      // Get passenger IDs from the offer
      const offerPassengerIds = offer.passengers.map(p => p.id);
      if (passengers.length !== offerPassengerIds.length) {
        throw new Error(`Passenger count mismatch: expected ${offerPassengerIds.length}, got ${passengers.length}`);
      }

      // Format passengers using offer's passenger IDs
      const formattedPassengers = passengers.map((passenger, index) => {
        if (index >= offerPassengerIds.length) {
          throw new Error(`No matching passenger ID for passenger at index ${index}`);
        }
        
        // Map gender correctly
        let duffelGender = 'other';
        if (passenger.gender === 'male' || passenger.gender === 'm') {
          duffelGender = 'm';
        } else if (passenger.gender === 'female' || passenger.gender === 'f') {
          duffelGender = 'f';
        } else if (passenger.title === 'Mr') {
          duffelGender = 'm';
        } else if (['Mrs', 'Ms', 'Miss'].includes(passenger.title)) {
          duffelGender = 'f';
        }
        
        const passengerData = {
          id: offerPassengerIds[index], // Use the passenger ID from the offer
          phone_number: formatPhoneNumber(passenger.phoneNumber),
          email: passenger.email,
          born_on: formatDate(passenger.dateOfBirth),
          title: passenger.title,
          gender: duffelGender,
          given_name: passenger.firstName,
          family_name: passenger.lastName
        };

        // Add identity documents if available
        if (passenger.passportNumber) {
          passengerData.identity_documents = [{
            unique_identifier: passenger.passportNumber,
            expires_on: formatDate(passenger.passportExpiry),
            issuing_country_code: passenger.nationality,
            type: 'passport'
          }];
        }

        return passengerData;
      });

      // Format services
      let formattedServices = [];
      if (validServices.length > 0) {
        formattedServices = validServices.map(service => ({
          id: service.id,
          quantity: service.quantity || 1
        }));
      }

      // Determine payment type
      const paymentType = paymentDetails.type === 'card' ? 'balance' : paymentDetails.type;

      // Create order data
      const orderData = {
        selected_offers: [offerId],
        passengers: formattedPassengers,
        payments: [
          {
            type: paymentType,
            currency: currency,
            amount: exactAmount
          }
        ]
      };

      if (formattedServices.length > 0) {
        orderData.services = formattedServices;
      }

      console.log('Creating order with data:', JSON.stringify(orderData, null, 2));

      // Create the order
      const order = await this.duffel.orders.create(orderData);
      console.log('Order created successfully:', order.data.id);
      return order.data;
    } catch (error) {
      console.error('Duffel create order error:', error);
      if (error.errors && error.errors.length > 0) {
        console.error('Validation errors:');
        error.errors.forEach((err, index) => {
          console.error(`Error ${index + 1}: ${err.title} - ${err.message} (${err.code})`);
        });
      }
      throw error;
    }
  }
  
  // For hold orders (pay later)
  async createHoldOrder(offerId, passengers, services = []) {
    try {
      const holdOrderData = {
        selected_offers: [offerId],
        passengers: passengers.map(passenger => ({
          phone_number: passenger.phoneNumber,
          email: passenger.email,
          born_on: passenger.dateOfBirth,
          title: passenger.title,
          gender: passenger.gender || this.mapTitleToGender(passenger.title),
          given_name: passenger.firstName,
          family_name: passenger.lastName,
          identity_documents: passenger.passportNumber ? [{
            unique_identifier: passenger.passportNumber,
            expires_on: passenger.passportExpiry,
            issuing_country_code: passenger.nationality,
            type: 'passport'
          }] : undefined
        })),
        // Mark as hold order by not including payments
        // Include services if provided
        ...(services.length > 0 && { services: services.map(service => ({
          id: service.id,
          quantity: service.quantity || 1
        }))})
      };

      const order = await this.duffel.orders.create(holdOrderData);
      return order.data;
    } catch (error) {
      console.error('Duffel create hold order error:', error);
      throw error;
    }
  }
  
  // For paying a hold order later
  async payForHoldOrder(orderId, paymentDetails) {
    try {
      // Always get the latest price before paying
      const order = await this.duffel.orders.get(orderId);
      
      const payment = await this.duffel.payments.create({
        order_id: orderId,
        payment: {
          type: paymentDetails.type || 'balance',
          amount: paymentDetails.amount.toString(),
          currency: paymentDetails.currency
        }
      });
      
      return payment.data;
    } catch (error) {
      console.error('Duffel payment error:', error);
      throw error;
    }
  }

  async cancelOrder(orderId) {
    try {
      const cancellation = await this.duffel.orderCancellations.create({
        order_id: orderId
      });
      
      return await this.duffel.orderCancellations.confirm(cancellation.data.id);
    } catch (error) {
      console.error('Duffel cancel order error:', error);
      throw error;
    }
  }

  /**
   * Get order details
   * @param {string} orderId - Duffel order ID
   * @returns {Promise} - Order details
   */
  async getOrder(orderId) {
    try {
      const order = await this.duffel.orders.get(orderId);
      return order;
    } catch (error) {
      console.error('Duffel get order error:', error);
      throw error;
    }
  }

  /**
   * Get orders by email
   * @param {string} email - Email to search for
   * @param {number} limit - Number of orders to return
   * @returns {Promise} - List of orders
   */
  async getOrdersByEmail(email, limit = 10) {
    try {
      const orders = await this.duffel.orders.list({
        limit,
        passenger_email: email
      });
      return orders;
    } catch (error) {
      console.error('Duffel get orders by email error:', error);
      throw error;
    }
  }

  /**
   * Update passenger details on order
   * @param {string} orderId - Duffel order ID
   * @param {string} passengerId - Passenger ID
   * @param {object} passengerData - Updated passenger data
   * @returns {Promise} - Updated order
   */
  async updatePassenger(orderId, passengerId, passengerData) {
    try {
      const updated = await this.duffel.orderChangeRequests.create({
        order_id: orderId,
        passengers: [{
          id: passengerId,
          ...passengerData
        }]
      });
      return updated;
    } catch (error) {
      console.error('Duffel update passenger error:', error);
      throw error;
    }
  }

  /**
   * Map title to gender when gender is not provided
   * @param {string} title - Passenger title (Mr, Mrs, Ms, etc.)
   * @returns {string} - Mapped gender
   */
  mapTitleToGender(title) {
    if (!title) return 'other';
    
    const titleLower = title.toLowerCase();
    if (titleLower === 'mr') return 'male';
    if (['mrs', 'ms', 'miss'].includes(titleLower)) return 'female';
    return 'other';
  }

  formatPassengers(passengers) {
    // Default if no passengers provided or invalid
    if (!passengers || typeof passengers !== 'object') {
      return [{ type: 'adult' }];
    }
    
    const result = [];
    
    // Make sure adults is a valid number
    const adults = typeof passengers.adults === 'number' ? passengers.adults : 1;
    
    // Make sure children and infants are valid numbers  
    const children = typeof passengers.children === 'number' ? passengers.children : 0;
    const infants = typeof passengers.infants === 'number' ? passengers.infants : 0;
    
    // Ensure at least one adult
    if (adults < 1) {
      result.push({ type: 'adult' });
    } else {
      for (let i = 0; i < adults; i++) {
        result.push({ type: 'adult' });
      }
    }
    
    if (children > 0) {
      for (let i = 0; i < children; i++) {
        result.push({ 
          type: 'child',
          age: 10 // Default age for children
        });
      }
    }
    
    if (infants > 0) {
      for (let i = 0; i < infants; i++) {
        result.push({ 
          type: 'infant_without_seat',
          age: 1 // Default age for infants
        });
      }
    }
    
    return result;
  }

  formatDuration(duration) {
    // Convert ISO 8601 duration to readable format
    // Example: PT12H30M -> 12h 30m
    if (!duration) return '';
    
    const match = duration.match(/PT(?:(\d+)H)?(?:(\d+)M)?/);
    if (!match) return duration;
    
    const hours = match[1] ? parseInt(match[1]) : 0;
    const minutes = match[2] ? parseInt(match[2]) : 0;
    
    const parts = [];
    if (hours > 0) parts.push(`${hours}h`);
    if (minutes > 0) parts.push(`${minutes}m`);
    
    return parts.join(' ') || '0m';
  }

  parseDurationToMinutes(duration) {
    if (!duration) return 0;
    
    const match = duration.match(/PT(?:(\d+)H)?(?:(\d+)M)?/);
    if (!match) return 0;
    
    const hours = match[1] ? parseInt(match[1]) : 0;
    const minutes = match[2] ? parseInt(match[2]) : 0;
    
    return hours * 60 + minutes;
  }

  formatDate(date) {
    if (typeof date === 'string' && date.match(/^\d{4}-\d{2}-\d{2}$/)) {
      return date;
    }
    const d = new Date(date);
    return d.toISOString().split('T')[0];
  }

  formatOffers(offers) {
    return offers.map(offer => {
      const formatted = {
        id: offer.id,
        totalAmount: parseFloat(offer.total_amount),
        totalCurrency: offer.total_currency,
        expiresAt: offer.expires_at,
        slices: offer.slices.map(slice => ({
          origin: {
            iataCode: slice.origin.iata_code,
            name: slice.origin.name,
            cityName: slice.origin.city_name,
            timeZone: slice.origin.time_zone
          },
          destination: {
            iataCode: slice.destination.iata_code,
            name: slice.destination.name,
            cityName: slice.destination.city_name,
            timeZone: slice.destination.time_zone
          },
          departureDateTime: slice.segments[0].departing_at,
          arrivalDateTime: slice.segments[slice.segments.length - 1].arriving_at,
          duration: this.formatDuration(slice.duration),
          durationMinutes: this.parseDurationToMinutes(slice.duration),
          segments: slice.segments.map(segment => ({
            airline: {
              name: segment.operating_carrier.name,
              iataCode: segment.operating_carrier.iata_code,
              logoUrl: segment.operating_carrier.logo_symbol_url
            },
            flightNumber: segment.operating_carrier_flight_number,
            aircraft: segment.aircraft?.name,
            departureAirport: {
              iataCode: segment.origin.iata_code,
              name: segment.origin.name,
              terminal: segment.origin_terminal
            },
            arrivalAirport: {
              iataCode: segment.destination.iata_code,
              name: segment.destination.name,
              terminal: segment.destination_terminal
            },
            departureTime: segment.departing_at,
            arrivalTime: segment.arriving_at,
            duration: this.formatDuration(segment.duration)
          }))
        })),
        baggageAllowance: offer.passengers[0]?.baggages?.map(baggage => ({
          type: baggage.type,
          quantity: baggage.quantity
        })),
        cabinClass: offer.slices[0]?.segments[0]?.passengers[0]?.cabin_class,
        conditions: {
          refundable: offer.conditions?.refund_before_departure?.allowed,
          changeable: offer.conditions?.change_before_departure?.allowed
        }
      };

      // Add available services if they exist
      if (offer.available_services) {
        formatted.availableServices = this.formatAvailableServices(offer.available_services);
      }

      return formatted;
    });
  }

  formatAvailableServices(services) {
    const formattedServices = {
      seats: [],
      baggage: [],
      other: []
    };

    // Check if services is an array and has content
    if (!Array.isArray(services) || services.length === 0) {
      return formattedServices;
    }

    // Process services
    services.forEach(service => {
      if (!service || !service.id) return;

      if (service.type === 'seat') {
        const seatInfo = {
          id: service.id,
          segmentId: service.metadata?.segment_id,
          passengerId: service.metadata?.passenger_id,
          designator: service.metadata?.designator,
          row: service.metadata?.row,
          column: service.metadata?.column,
          totalAmount: parseFloat(service.total_amount),
          totalCurrency: service.total_currency,
          type: this.determineSeatType(service.metadata),
          available: true
        };
        formattedServices.seats.push(seatInfo);
      } else if (service.type === 'baggage') {
        formattedServices.baggage.push({
          id: service.id,
          type: service.metadata?.type || 'checked',
          weight: service.metadata?.maximum_weight_kg || service.metadata?.weight,
          totalAmount: parseFloat(service.total_amount),
          totalCurrency: service.total_currency,
          maxWeight: service.metadata?.maximum_weight_kg,
          maximumQuantity: service.maximum_quantity || 1
        });
      } else {
        formattedServices.other.push({
          id: service.id,
          type: service.type,
          name: service.metadata?.name || service.type,
          description: service.metadata?.description,
          totalAmount: parseFloat(service.total_amount),
          totalCurrency: service.total_currency,
          maximumQuantity: service.maximum_quantity || 1
        });
      }
    });

    return formattedServices;
  }

  determineSeatType(metadata) {
    if (!metadata) return 'standard';
    
    const amenities = metadata.amenities || [];
    const seatCharacteristics = metadata.disclosures || [];
    
    // Check amenities and disclosures for seat type
    if (amenities.includes('extra_legroom') || seatCharacteristics.includes('extra_legroom')) {
      return 'extra_legroom';
    }
    
    // Try to determine from position
    const column = metadata.column;
    if (column) {
      if (column === 'A' || column === 'F' || column === 'K') return 'window';
      if (column === 'C' || column === 'D' || column === 'E' || column === 'H') return 'aisle';
      return 'middle';
    }
    
    return 'standard';
  }

  async refreshOffer(originalOffer) {
    // Extract the original request parameters
    const slices = originalOffer.slices.map(slice => ({
      origin: slice.origin.iataCode,
      destination: slice.destination.iataCode, 
      departure_date: slice.departureDateTime.split('T')[0]
    }));
    
    // Create a new offer request
    const offerRequest = await this.duffel.offerRequests.create({
      slices,
      passengers: this.formatPassengers(originalOffer.passengers),
      cabin_class: originalOffer.cabinClass
    });
    
    // Get the refreshed offers
    const offers = await this.duffel.offers.list({
      offer_request_id: offerRequest.data.id,
      sort: 'total_amount',
      limit: 1
    });
    
    return offers.data[0];
  }
}

module.exports = new DuffelService();