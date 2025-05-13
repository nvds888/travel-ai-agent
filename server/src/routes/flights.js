// server/src/routes/flights.js
const express = require('express');
const router = express.Router();
const Conversation = require('../models/Conversation');
const duffelService = require('../services/duffel.service');
const validationService = require('../services/validation.service');
const { optionalAuth } = require('../middleware/auth');

// Add optionalAuth middleware to all routes
router.use(optionalAuth);

// Search flights with advanced options
router.post('/search', async (req, res) => {
  try {
    const { sessionId, searchParams } = req.body;
    
    const conversation = await Conversation.findOne({ sessionId });
    
    if (!conversation) {
      return res.status(404).json({
        success: false,
        message: 'Conversation not found'
      });
    }
    
    // Validate search parameters
    const validationResult = validationService.validateFlightSearch(searchParams);
    
    if (validationResult.errors.length > 0) {
      return res.status(400).json({
        success: false,
        message: 'Invalid search parameters',
        errors: validationResult.errors,
        warnings: validationResult.warnings
      });
    }
    
    // Log warnings if any
    if (validationResult.warnings.length > 0) {
      console.log('Search warnings:', validationResult.warnings);
    }
    
    const offers = await duffelService.searchFlights(searchParams);
    
    conversation.searchResults = offers;
    conversation.flightSearchParams = searchParams;
    conversation.currentStage = 'selection';
    
    // Track search in history
    await conversation.updateSearchParams(searchParams);
    
    res.json({
      success: true,
      offers: offers,
      warnings: validationResult.warnings
    });
  } catch (error) {
    console.error('Error searching flights:', error);
    res.status(500).json({
      success: false,
      message: 'Error searching flights',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// Search multi-city flights
router.post('/search-multi-city', async (req, res) => {
  try {
    const { sessionId, segments } = req.body;
    
    const conversation = await Conversation.findOne({ sessionId });
    
    if (!conversation) {
      return res.status(404).json({
        success: false,
        message: 'Conversation not found'
      });
    }
    
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
      return res.status(400).json({
        success: false,
        message: 'Invalid multi-city parameters',
        errors: validationResult.errors
      });
    }
    
    const offers = await duffelService.searchMultiCity(segments);
    
    conversation.searchResults = offers;
    conversation.flightSearchParams = multiCityParams;
    conversation.currentStage = 'selection';
    
    await conversation.updateSearchParams(multiCityParams);
    
    res.json({
      success: true,
      offers: offers
    });
  } catch (error) {
    console.error('Error searching multi-city flights:', error);
    res.status(500).json({
      success: false,
      message: 'Error searching multi-city flights',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// Get more flight options with intelligent filtering
router.post('/more-options', async (req, res) => {
  try {
    const { sessionId, criteria } = req.body;
    
    const conversation = await Conversation.findOne({ sessionId });
    
    if (!conversation) {
      return res.status(404).json({
        success: false,
        message: 'Conversation not found'
      });
    }
    
    if (!conversation.flightSearchParams) {
      return res.status(400).json({
        success: false,
        message: 'No search parameters found'
      });
    }
    
    // Clone search params and apply modifications
    const searchParams = { ...conversation.flightSearchParams };
    
    // Increase limit
    searchParams.limit = 20;
    
    // Apply focus criteria
    if (criteria?.focusOn) {
      switch (criteria.focusOn) {
        case 'cheaper':
          searchParams.sort = 'total_amount';
          break;
        case 'faster':
          searchParams.sort = 'duration';
          break;
        case 'premium':
          searchParams.cabinClass = 'business';
          break;
        case 'different_times':
          // Modify time windows if they exist
          if (searchParams.departureTime) {
            const currentFrom = parseInt(searchParams.departureTime.from.split(':')[0]);
            searchParams.departureTime = {
              from: `${(currentFrom + 12) % 24}:00`.padStart(5, '0'),
              to: `${(currentFrom + 18) % 24}:00`.padStart(5, '0')
            };
          }
          break;
      }
    }
    
    const offers = await duffelService.searchFlights(searchParams);
    
    // Filter out already shown offers
    const existingOfferIds = conversation.searchResults.map(offer => offer.id);
    const newOffers = offers.filter(offer => !existingOfferIds.includes(offer.id));
    
    // Select diverse options
    const diverseOffers = selectDiverseOffers(newOffers, 3);
    
    res.json({
      success: true,
      offers: diverseOffers
    });
  } catch (error) {
    console.error('Error getting more flight options:', error);
    res.status(500).json({
      success: false,
      message: 'Error getting more flight options',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// Filter flight options
router.post('/filter', async (req, res) => {
  try {
    const { sessionId, filterCriteria } = req.body;
    
    const conversation = await Conversation.findOne({ sessionId });
    
    if (!conversation) {
      return res.status(404).json({
        success: false,
        message: 'Conversation not found'
      });
    }
    
    if (!conversation.searchResults || conversation.searchResults.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'No search results to filter'
      });
    }
    
    // Apply filters
    const filteredOffers = await duffelService.filterOffers(
      conversation.searchResults,
      filterCriteria
    );
    
    // Track applied filters
    await conversation.applyFilter(filterCriteria);
    
    res.json({
      success: true,
      offers: filteredOffers,
      appliedFilters: filterCriteria
    });
  } catch (error) {
    console.error('Error filtering flights:', error);
    res.status(500).json({
      success: false,
      message: 'Error filtering flights',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// Get offer details with all available information
router.get('/offers/:offerId', async (req, res) => {
  try {
    const { offerId } = req.params;
    const { includeServices, includeSeatMaps, includeBrandAttributes } = req.query;
    
    const offerDetails = await duffelService.getOfferDetails(offerId, {
      includeServices: includeServices !== 'false',
      includeSeatMaps: includeSeatMaps === 'true',
      includeBrandAttributes: includeBrandAttributes === 'true'
    });
    
    res.json({
      success: true,
      offer: offerDetails
    });
  } catch (error) {
    console.error('Error fetching offer details:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching offer details',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// Get available services for an offer
router.get('/offers/:offerId/services', async (req, res) => {
  try {
    const { offerId } = req.params;
    
    const services = await duffelService.getOfferServices(offerId);
    
    res.json({
      success: true,
      services: services
    });
  } catch (error) {
    console.error('Error fetching offer services:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching offer services',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// Select a flight offer
router.post('/select', async (req, res) => {
  try {
    const { sessionId, offerId } = req.body;
    
    const conversation = await Conversation.findOne({ sessionId });
    
    if (!conversation) {
      return res.status(404).json({
        success: false,
        message: 'Conversation not found'
      });
    }
    
    // Find the selected offer from search results
    const selectedOffer = conversation.searchResults.find(offer => offer.id === offerId);
    
    if (!selectedOffer) {
      return res.status(404).json({
        success: false,
        message: 'Selected offer not found'
      });
    }
    
    // Fetch available services for this offer
    try {
      const services = await duffelService.getOfferServices(offerId);
      selectedOffer.availableServices = services;
    } catch (serviceError) {
      console.error('Error fetching services:', serviceError);
      // Continue without services if there's an error
    }
    
    // Fetch detailed offer information
    try {
      const detailedOffer = await duffelService.getOfferDetails(offerId, {
        includeServices: true,
        includeSeatMaps: false,
        includeBrandAttributes: true
      });
      
      // Merge detailed information
      Object.assign(selectedOffer, detailedOffer);
    } catch (detailError) {
      console.error('Error fetching offer details:', detailError);
    }
    
    conversation.selectedOffer = selectedOffer;
    
    // Track viewed offer
    await conversation.trackViewedOffer(offerId);
    
    // Check if the user is logged in
    if (req.user) {
      // Set the passenger details from the user profile
      conversation.passengerDetails = [req.user.toPassengerFormat()];
      conversation.currentStage = 'additional_services';
      conversation.user = req.user._id;
    } else {
      // Set stage to authentication if user is not logged in
      conversation.currentStage = 'authentication';
    }
    
    await conversation.save();
    
    res.json({
      success: true,
      offer: selectedOffer,
      authRequired: !req.user,
      currentStage: conversation.currentStage,
      passengerDetails: conversation.passengerDetails
    });
  } catch (error) {
    console.error('Error selecting flight:', error);
    res.status(500).json({
      success: false,
      message: 'Error selecting flight',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// Refresh offer price (before payment)
router.post('/offers/:offerId/refresh', async (req, res) => {
  try {
    const { offerId } = req.params;
    const { sessionId } = req.body;
    
    const conversation = await Conversation.findOne({ sessionId });
    
    if (!conversation || !conversation.selectedOffer || conversation.selectedOffer.id !== offerId) {
      return res.status(400).json({
        success: false,
        message: 'Invalid offer or session'
      });
    }
    
    const refreshedOffer = await duffelService.refreshOffer(conversation.selectedOffer);
    
    // Update the selected offer with new price
    conversation.selectedOffer = refreshedOffer;
    await conversation.save();
    
    res.json({
      success: true,
      offer: refreshedOffer,
      priceChanged: refreshedOffer.totalAmount !== conversation.selectedOffer.totalAmount
    });
  } catch (error) {
    console.error('Error refreshing offer:', error);
    res.status(500).json({
      success: false,
      message: 'Error refreshing offer price',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// Intelligent offer recommendation
router.post('/recommend', async (req, res) => {
  try {
    const { sessionId } = req.body;
    
    const conversation = await Conversation.findOne({ sessionId });
    
    if (!conversation || !conversation.searchResults) {
      return res.status(400).json({
        success: false,
        message: 'No search results available for recommendations'
      });
    }
    
    // Analyze user preferences and behavior
    const userPreferences = conversation.userPreferences || {};
    const viewedOffers = conversation.refinements?.viewedOffers || [];
    const appliedFilters = conversation.refinements?.appliedFilters || {};
    
    // Score offers based on preferences
    const scoredOffers = conversation.searchResults.map(offer => {
      let score = 0;
      
      // Price score (lower is better)
      const priceScore = 1 / (offer.totalAmount / 1000);
      score += priceScore * 0.3;
      
      // Duration score (shorter is better)
      const durationScore = 1 / (offer.slices[0].durationMinutes / 60);
      score += durationScore * 0.2;
      
      // Direct flight bonus
      const isDirect = offer.slices.every(slice => slice.segments.length === 1);
      if (isDirect) score += 0.2;
      
      // Preferred airline bonus
      if (userPreferences.preferredAirlines?.length > 0) {
        const hasPreferredAirline = offer.slices.some(slice =>
          slice.segments.some(segment =>
            userPreferences.preferredAirlines.includes(segment.airline.iataCode)
          )
        );
        if (hasPreferredAirline) score += 0.15;
      }
      
      // Time preference match
      if (appliedFilters.timeOfDay) {
        const departureHour = new Date(offer.slices[0].departureDateTime).getHours();
        const matchesTimePreference = checkTimeMatch(departureHour, appliedFilters.timeOfDay);
        if (matchesTimePreference) score += 0.15;
      }
      
      // Penalty for already viewed
      if (viewedOffers.includes(offer.id)) score -= 0.1;
      
      return { ...offer, score };
    });
    
    // Sort by score and take top 3
    const recommendations = scoredOffers
      .sort((a, b) => b.score - a.score)
      .slice(0, 3);
    
    res.json({
      success: true,
      recommendations: recommendations,
      reasoning: generateRecommendationReasoning(recommendations, userPreferences)
    });
  } catch (error) {
    console.error('Error generating recommendations:', error);
    res.status(500).json({
      success: false,
      message: 'Error generating recommendations',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// Helper functions
function selectDiverseOffers(offers, count) {
  if (offers.length <= count) return offers;
  
  const selected = [];
  
  // Sort by different criteria
  const byPrice = [...offers].sort((a, b) => a.totalAmount - b.totalAmount);
  const byDuration = [...offers].sort((a, b) => {
    const aDuration = a.slices.reduce((total, slice) => total + slice.durationMinutes, 0);
    const bDuration = b.slices.reduce((total, slice) => total + slice.durationMinutes, 0);
    return aDuration - bDuration;
  });
  const byTime = [...offers].sort((a, b) => 
    new Date(a.slices[0].departureDateTime) - new Date(b.slices[0].departureDateTime)
  );
  
  // Pick diverse options
  if (byPrice[0]) selected.push(byPrice[0]);
  
  const fastestUnique = byDuration.find(offer => !selected.find(s => s.id === offer.id));
  if (fastestUnique) selected.push(fastestUnique);
  
  const differentTimeUnique = byTime.find(offer => !selected.find(s => s.id === offer.id));
  if (differentTimeUnique) selected.push(differentTimeUnique);
  
  // Fill remaining slots with other offers
  for (const offer of offers) {
    if (selected.length >= count) break;
    if (!selected.find(s => s.id === offer.id)) {
      selected.push(offer);
    }
  }
  
  return selected.slice(0, count);
}

function checkTimeMatch(hour, timeOfDay) {
  const timeRanges = {
    'morning': [6, 12],
    'afternoon': [12, 17],
    'evening': [17, 21],
    'night': [21, 24, 0, 5]
  };
  
  const range = timeRanges[timeOfDay];
  if (!range) return false;
  
  if (range.length === 2) {
    return hour >= range[0] && hour < range[1];
  } else {
    // Handle overnight range
    return hour >= range[0] || hour < range[3];
  }
}

function generateRecommendationReasoning(recommendations, preferences) {
  const reasons = recommendations.map((rec, index) => {
    const points = [];
    
    if (index === 0) points.push('Best overall value');
    
    const isDirect = rec.slices.every(slice => slice.segments.length === 1);
    if (isDirect) points.push('Direct flight');
    
    if (rec.score > 0.7) points.push('Highly matches your preferences');
    
    const departureHour = new Date(rec.slices[0].departureDateTime).getHours();
    if (departureHour >= 6 && departureHour < 12) points.push('Morning departure');
    else if (departureHour >= 12 && departureHour < 17) points.push('Afternoon departure');
    else if (departureHour >= 17 && departureHour < 21) points.push('Evening departure');
    else points.push('Night departure');
    
    if (preferences.preferredAirlines?.includes(rec.slices[0].segments[0].airline.iataCode)) {
      points.push('Your preferred airline');
    }
    
    return {
      offerId: rec.id,
      reasons: points
    };
  });
  
  return reasons;
}

module.exports = router;