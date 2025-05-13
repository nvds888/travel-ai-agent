// server/src/routes/chat.js - Complete Secure Version
const express = require('express');
const router = express.Router();
const Conversation = require('../models/Conversation');
const openaiService = require('../services/openai.service');
const duffelService = require('../services/duffel.service');
const validationService = require('../services/validation.service');
const { optionalAuth } = require('../middleware/auth');
const User = require('../models/User');

// Add optionalAuth middleware to all routes
router.use(optionalAuth);

// Helper function to sanitize data before sending to AI
function sanitizeContextForAI(context) {
  // Create a clean copy without personal information
  const sanitized = {
    currentStage: context.currentStage,
    flightSearchParams: context.flightSearchParams ? {
      type: context.flightSearchParams.type,
      origin: context.flightSearchParams.origin,
      destination: context.flightSearchParams.destination,
      departureDate: context.flightSearchParams.departureDate,
      returnDate: context.flightSearchParams.returnDate,
      departureTime: context.flightSearchParams.departureTime,
      arrivalTime: context.flightSearchParams.arrivalTime,
      cabinClass: context.flightSearchParams.cabinClass,
      passengers: context.flightSearchParams.passengers,
      maxConnections: context.flightSearchParams.maxConnections
    } : {},
    hasSelectedFlight: !!context.selectedOffer,
    hasPassengerDetails: !!context.passengerDetails && context.passengerDetails.length > 0,
    hasAdditionalServices: !!context.additionalServices && context.additionalServices.length > 0
  };

  // Only include flight pricing and basic info, not passenger details
  if (context.selectedOffer) {
    sanitized.selectedFlightInfo = {
      totalAmount: context.selectedOffer.totalAmount,
      totalCurrency: context.selectedOffer.totalCurrency,
      flightType: context.selectedOffer.slices ? 
        (context.selectedOffer.slices.length > 1 ? 'round_trip' : 'one_way') : 'one_way'
    };
  }

  return sanitized;
}

// Create or get conversation
router.post('/start', async (req, res) => {
  try {
    const { sessionId } = req.body;
    
    let conversation = await Conversation.findOne({ sessionId });
    
    if (!conversation) {
      conversation = new Conversation({
        sessionId,
        messages: [],
        currentStage: 'initial',
        flightSearchParams: {
          type: 'one_way',
          passengers: { adults: 1, children: 0, infants: 0 },
          cabinClass: 'economy'
        }
      });
      
      // If user is logged in, associate conversation with user
      if (req.user) {
        conversation.user = req.user._id;
      }
      
      await conversation.save();
    } else if (req.user && !conversation.user) {
      // If user logged in after conversation started, associate the conversation
      conversation.user = req.user._id;
      await conversation.save();
    }
    
    res.json({
      success: true,
      conversation: {
        sessionId: conversation.sessionId,
        currentStage: conversation.currentStage,
        messages: conversation.messages,
        isAuthenticated: !!req.user
      }
    });
  } catch (error) {
    console.error('Error starting conversation:', error);
    res.status(500).json({
      success: false,
      message: 'Error starting conversation',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// Set authentication status - called after login/register
router.post('/set-authenticated', async (req, res) => {
  try {
    const { sessionId } = req.body;
    
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: 'Not authenticated'
      });
    }
    
    const conversation = await Conversation.findOne({ sessionId });
    
    if (!conversation) {
      return res.status(404).json({
        success: false,
        message: 'Conversation not found'
      });
    }
    
    // Associate user with conversation
    conversation.user = req.user._id;
    
    // Set passenger details from user profile regardless of stage
    const userPassengerDetails = {
      title: req.user.title,
      firstName: req.user.firstName,
      lastName: req.user.lastName,
      dateOfBirth: req.user.dateOfBirth.toISOString().split('T')[0],
      gender: req.user.gender,
      email: req.user.email,
      phoneNumber: req.user.phoneNumber,
      nationality: req.user.nationality || '',
      passportNumber: req.user.passportNumber || '',
      passportExpiry: req.user.passportExpiry ? req.user.passportExpiry.toISOString().split('T')[0] : ''
    };
    
    conversation.passengerDetails = [userPassengerDetails];
    
    // Check if we need to update the stage
    if (conversation.currentStage === 'authentication') {
      conversation.currentStage = 'additional_services';
      
      // Add system message about successful authentication
      conversation.messages.push({
        role: 'assistant',
        content: `Welcome back, ${req.user.firstName}! You're now logged in. We've pre-filled your passenger details and you can proceed to select additional services for your flight.`,
        timestamp: new Date()
      });
    }
    
    await conversation.save();
    
    console.log(`Authentication set for conversation ${sessionId}, new stage: ${conversation.currentStage}`);
    
    res.json({
      success: true,
      currentStage: conversation.currentStage,
      passengerDetails: conversation.passengerDetails,
      message: conversation.messages[conversation.messages.length - 1]
    });
  } catch (error) {
    console.error('Error setting authentication:', error);
    res.status(500).json({
      success: false,
      message: 'Error updating authentication status',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// Send message - MAKE SURE THIS IS ASYNC
router.post('/message', async (req, res) => {
  try {
    const { sessionId, message } = req.body;
    
    const conversation = await Conversation.findOne({ sessionId });
    
    if (!conversation) {
      return res.status(404).json({
        success: false,
        message: 'Conversation not found'
      });
    }
    
    // Handle user authenticated after flight selection if needed
    if (req.user && 
        conversation.currentStage === 'authentication' && 
        !conversation.user) {
      conversation.user = req.user._id;
      conversation.passengerDetails = [req.user.toPassengerFormat()];
      conversation.currentStage = 'additional_services';
      
      const authMessage = `Great! You're now logged in. We've pre-filled your passenger details and you can proceed to select additional services for your flight.`;
      
      conversation.messages.push({
        role: 'assistant',
        content: authMessage,
        timestamp: new Date()
      });
      
      await conversation.save();
      
      return res.json({
        success: true,
        message: authMessage,
        currentStage: conversation.currentStage,
        data: {
          passengerDetails: conversation.passengerDetails
        }
      });
    }
    
    // Check if this is a stage completion message
    if (message === 'passenger_details_completed') {
      conversation.currentStage = 'additional_services';
      
      const responseMessage = `Great! I've received your passenger details. Now let's talk about additional services that can enhance your travel experience. Would you like to:\n\n` +
        `1. Select your seat (window/aisle/extra legroom)\n` +
        `2. Add extra baggage\n` +
        `3. Choose meal preferences\n` +
        `4. Add travel insurance\n\n` +
        `You can choose any of these services or click "Continue" to proceed without any extras.`;
      
      conversation.messages.push({
        role: 'assistant',
        content: responseMessage,
        timestamp: new Date()
      });
      
      await conversation.save();
      
      return res.json({
        success: true,
        message: responseMessage,
        currentStage: conversation.currentStage
      });
    }
    
    if (message === 'additional_services_completed') {
      conversation.currentStage = 'payment';
      
      const totalAmount = conversation.selectedOffer.totalAmount;
      const currency = conversation.selectedOffer.totalCurrency;
      
      const responseMessage = `Perfect! I've noted your service preferences. Now let's proceed to the final step - payment. The total amount for your flight and selected services is ${currency} ${totalAmount}.\n\nPlease provide your payment details to complete the booking.`;
      
      conversation.messages.push({
        role: 'assistant',
        content: responseMessage,
        timestamp: new Date()
      });
      
      await conversation.save();
      
      return res.json({
        success: true,
        message: responseMessage,
        currentStage: conversation.currentStage
      });
    }

    // Filter flight options based on natural language
    if (conversation.currentStage === 'selection' && 
        (message.toLowerCase().includes('show') || 
         message.toLowerCase().includes('filter') || 
         message.toLowerCase().includes('only') || 
         message.toLowerCase().includes('prefer')) &&
        (message.toLowerCase().includes('flight') || 
         message.toLowerCase().includes('option'))) {
      
      return handleFlightFilter(conversation, message, res);
    }
    
    // Handle "Show me more flight options" and similar requests
    if (conversation.currentStage === 'selection' && 
        (message.toLowerCase().includes('more flight') || 
         message.toLowerCase().includes('more option'))) {
      
      return handleMoreFlightOptions(conversation, message, res);
    }
    
    // Add user message to conversation
    conversation.messages.push({
      role: 'user',
      content: message,
      timestamp: new Date()
    });
    
    // If in authentication stage, provide a specific response
    if (conversation.currentStage === 'authentication') {
      const authMessage = `To continue with your booking, please sign in or create an account. This will allow us to securely store your booking information and make future bookings faster.`;
      
      conversation.messages.push({
        role: 'assistant',
        content: authMessage,
        timestamp: new Date()
      });
      
      await conversation.save();
      
      return res.json({
        success: true,
        message: authMessage,
        currentStage: conversation.currentStage,
        requiresAuth: true
      });
    }
    
    // SECURITY FIX: Sanitize context before sending to OpenAI
    const sanitizedContext = sanitizeContextForAI({
      currentStage: conversation.currentStage,
      flightSearchParams: conversation.flightSearchParams,
      selectedOffer: conversation.selectedOffer,
      passengerDetails: conversation.passengerDetails,
      additionalServices: conversation.additionalServices
    });
    
    // Process regular message with OpenAI - with sanitized context
    const response = await openaiService.processMessage(
      conversation.messages.map(msg => ({
        role: msg.role,
        content: msg.content
      })),
      sanitizedContext
    );
    
    const parsedResponse = openaiService.parseResponse(response);
    console.log('Parsed OpenAI response:', parsedResponse);
    
    // Handle function calls
    if (parsedResponse.type === 'function') {
      return handleFunctionCall(parsedResponse, conversation, req, res);
    }
    
    // Regular message response
    const messageContent = parsedResponse.message || parsedResponse.content || 'I understand. Let me help you with your travel plans.';
    
    conversation.messages.push({
      role: 'assistant',
      content: messageContent,
      timestamp: new Date()
    });
    
    await conversation.save();
    
    res.json({
      success: true,
      message: messageContent,
      currentStage: conversation.currentStage,
      data: conversation.searchResults ? {
        searchResults: conversation.searchResults
      } : undefined
    });
  } catch (error) {
    console.error('Error processing message:', error);
    res.status(500).json({
      success: false,
      message: 'Error processing message',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// Helper function to handle flight filtering
async function handleFlightFilter(conversation, message, res) {
  try {
    // Extract filter criteria from message
    const filterCriteria = extractFilterCriteria(message);
    
    console.log('Filter criteria:', filterCriteria);
    
    const searchParams = conversation.flightSearchParams;
    
    if (!searchParams || !searchParams.origin || !searchParams.destination) {
      const errorMessage = "I don't have enough flight search information. Let's start over with your travel plans.";
      
      conversation.messages.push({
        role: 'user',
        content: message,
        timestamp: new Date()
      });
      
      conversation.messages.push({
        role: 'assistant',
        content: errorMessage,
        timestamp: new Date()
      });
      
      await conversation.save();
      
      return res.json({
        success: true,
        message: errorMessage,
        currentStage: conversation.currentStage
      });
    }
    
    conversation.messages.push({
      role: 'user',
      content: message,
      timestamp: new Date()
    });
    
    const loadingMessage = `Looking for flights that match your preferences...`;
    
    conversation.messages.push({
      role: 'assistant',
      content: loadingMessage,
      timestamp: new Date()
    });
    
    await conversation.save();
    
    // Get more flights with filtering
    searchParams.limit = 20;
    
    const offers = await duffelService.searchFlights(searchParams);
    const filteredOffers = await duffelService.filterOffers(offers, filterCriteria);
    
    // Take the top 3 results after filtering
    const bestFilteredOffers = filteredOffers.slice(0, 3);
    
    if (bestFilteredOffers.length === 0) {
      const noResultsMessage = `I couldn't find any flights matching all your criteria. Would you like to try a different filter or see all available options?`;
      
      conversation.messages.push({
        role: 'assistant',
        content: noResultsMessage,
        timestamp: new Date()
      });
      
      await conversation.save();
      
      return res.json({
        success: true,
        message: noResultsMessage,
        currentStage: conversation.currentStage
      });
    }
    
    // Update search results with the filtered options
    conversation.searchResults = bestFilteredOffers;
    
    const filterDescription = buildFilterDescription(filterCriteria);
    const filterResultsMessage = `Here are ${bestFilteredOffers.length} ${filterDescription} flight options that match your preferences. You can select any of these or refine your search further.`;
    
    conversation.messages.push({
      role: 'assistant',
      content: filterResultsMessage,
      timestamp: new Date()
    });
    
    await conversation.save();
    
    return res.json({
      success: true,
      message: filterResultsMessage,
      currentStage: conversation.currentStage,
      data: {
        searchResults: bestFilteredOffers
      }
    });
  } catch (error) {
    console.error('Error filtering flights:', error);
    
    const errorMessage = "I'm sorry, I encountered an error while filtering flights. Please try a different search or specify what you're looking for.";
    
    conversation.messages.push({
      role: 'assistant',
      content: errorMessage,
      timestamp: new Date()
    });
    
    await conversation.save();
    
    return res.json({
      success: true,
      message: errorMessage,
      currentStage: conversation.currentStage
    });
  }
}

// Extract filter criteria from natural language
function extractFilterCriteria(message) {
  const criteria = {};
  const lowerMessage = message.toLowerCase();
  
  // Time of day
  const timePreference = validationService.parseTimePreference(message);
  if (timePreference) {
    criteria.departureTime = timePreference;
  }
  
  // Direct/Non-stop flights
  if (lowerMessage.includes('direct') || lowerMessage.includes('non-stop') || lowerMessage.includes('nonstop')) {
    criteria.maxConnections = 0;
  } else if (lowerMessage.includes('one stop') || lowerMessage.includes('1 stop')) {
    criteria.maxConnections = 1;
  }
  
  // Airlines
  const airlineMatch = message.match(/\b(?:airline|with|on|by)\s+([A-Z][a-z]+(?:\s+[A-Z][a-z]+)?)\b/i);
  if (airlineMatch) {
    criteria.airlines = [airlineMatch[1]];
  }
  
  // Price preferences
  if (lowerMessage.includes('cheap') || lowerMessage.includes('budget') || lowerMessage.includes('lowest price')) {
    criteria.sort = 'price_low';
  } else if (lowerMessage.includes('premium') || lowerMessage.includes('expensive')) {
    criteria.sort = 'price_high';
  }
  
  // Duration preferences
  if (lowerMessage.includes('fast') || lowerMessage.includes('quick') || lowerMessage.includes('short')) {
    criteria.sort = 'duration_short';
  }
  
  return criteria;
}

// Build filter description
function buildFilterDescription(criteria) {
  const parts = [];
  
  if (criteria.departureTime) {
    if (criteria.departureTime.from === '06:00' && criteria.departureTime.to === '12:00') {
      parts.push('morning');
    } else if (criteria.departureTime.from === '12:00' && criteria.departureTime.to === '17:00') {
      parts.push('afternoon');
    } else if (criteria.departureTime.from === '17:00' && criteria.departureTime.to === '21:00') {
      parts.push('evening');
    } else if (criteria.departureTime.from === '21:00' || criteria.departureTime.from === '23:00') {
      parts.push('night');
    }
  }
  
  if (criteria.maxConnections === 0) {
    parts.push('direct');
  } else if (criteria.maxConnections === 1) {
    parts.push('one-stop');
  }
  
  if (criteria.airlines && criteria.airlines.length > 0) {
    parts.push(criteria.airlines.join(' or '));
  }
  
  if (criteria.sort === 'price_low') {
    parts.push('cheaper');
  } else if (criteria.sort === 'price_high') {
    parts.push('premium');
  } else if (criteria.sort === 'duration_short') {
    parts.push('shorter');
  }
  
  return parts.join(' ') || 'filtered';
}

// Helper function to handle more flight options
async function handleMoreFlightOptions(conversation, message, res) {
  try {
    const searchParams = conversation.flightSearchParams;
    
    if (!searchParams || !searchParams.origin || !searchParams.destination) {
      const errorMessage = "I'm sorry, I don't have enough information to search for more flights. Let's start over with your travel plans.";
      
      conversation.messages.push({
        role: 'user',
        content: message,
        timestamp: new Date()
      });
      
      conversation.messages.push({
        role: 'assistant',
        content: errorMessage,
        timestamp: new Date()
      });
      
      await conversation.save();
      
      return res.json({
        success: true,
        message: errorMessage,
        currentStage: conversation.currentStage
      });
    }
    
    conversation.messages.push({
      role: 'user',
      content: message,
      timestamp: new Date()
    });
    
    const loadingMessage = "Looking for more flight options for you...";
    
    conversation.messages.push({
      role: 'assistant',
      content: loadingMessage,
      timestamp: new Date()
    });
    
    await conversation.save();
    
    // Fetch more options with a higher limit
    searchParams.limit = 15;
    
    const offers = await duffelService.searchFlights(searchParams);
    
    // Filter out any offers that are already in searchResults
    const existingIds = conversation.searchResults.map(offer => offer.id);
    const newOffers = offers.filter(offer => !existingIds.includes(offer.id));
    
    // Select diverse options
    const diverseOffers = selectDiverseOffers(newOffers, 3);
    
    if (diverseOffers.length === 0) {
      const noMoreMessage = "I've shown you all the available options. Would you like to modify your search criteria to find different flights?";
      
      conversation.messages.push({
        role: 'assistant',
        content: noMoreMessage,
        timestamp: new Date()
      });
      
      await conversation.save();
      
      return res.json({
        success: true,
        message: noMoreMessage,
        currentStage: conversation.currentStage
      });
    }
    
    // Update search results
    conversation.searchResults = diverseOffers;
    
    const moreOptionsMessage = `Here are ${diverseOffers.length} more flight options for you. You can select any of these or ask for more specific options.`;
    
    conversation.messages.push({
      role: 'assistant',
      content: moreOptionsMessage,
      timestamp: new Date()
    });
    
    await conversation.save();
    
    return res.json({
      success: true,
      message: moreOptionsMessage,
      currentStage: conversation.currentStage,
      data: {
        searchResults: diverseOffers
      }
    });
  } catch (error) {
    console.error('Error searching more flights:', error);
    
    const errorMessage = "I'm sorry, I encountered an error while searching for more flight options. Please try a different search or specify what you're looking for.";
    
    conversation.messages.push({
      role: 'assistant',
      content: errorMessage,
      timestamp: new Date()
    });
    
    await conversation.save();
    
    return res.json({
      success: true,
      message: errorMessage,
      currentStage: conversation.currentStage
    });
  }
}

// Select diverse flight offers
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

// Handle function calls from OpenAI
async function handleFunctionCall(parsedResponse, conversation, req, res) {
  const { functionName, arguments: args } = parsedResponse;
  
  switch (functionName) {
    case 'extractFlightSearchParams':
      return handleFlightSearchParams(args, conversation, res);
    
    case 'filterFlightOptions':
      return handleFilterFlightOptions(args, conversation, res);
    
    case 'searchMoreFlights':
      return handleSearchMoreFlights(args, conversation, res);
    
    case 'selectFlightOffer':
      return handleSelectFlightOffer(args, conversation, req, res);
    
    case 'extractPassengerDetails':
      return handleExtractPassengerDetails(args, conversation, res);
    
    case 'selectAdditionalServices':
      return handleSelectAdditionalServices(args, conversation, res);
    
    default:
      console.error('Unknown function:', functionName);
      const errorMessage = "I'm sorry, I encountered an error processing your request. Please try again.";
      
      conversation.messages.push({
        role: 'assistant',
        content: errorMessage,
        timestamp: new Date()
      });
      
      await conversation.save();
      
      return res.json({
        success: true,
        message: errorMessage,
        currentStage: conversation.currentStage
      });
  }
}

// Handle flight search parameters extraction
async function handleFlightSearchParams(params, conversation, res) {
  try {
    console.log('Handling flight params extraction:', params);
    
    // Validate the search parameters
    const validationResult = validationService.validateFlightSearch(params);
    
    if (validationResult.errors.length > 0) {
      const errorMessage = `I need to correct some information:\n${validationResult.errors.map(e => `- ${e.message}`).join('\n')}`;
      
      conversation.messages.push({
        role: 'assistant',
        content: errorMessage,
        timestamp: new Date()
      });
      
      await conversation.save();
      
      return res.json({
        success: true,
        message: errorMessage,
        currentStage: conversation.currentStage
      });
    }
    
    // Update flight search parameters
    conversation.flightSearchParams = {
      ...conversation.flightSearchParams,
      ...params
    };
    
    // Search for flights
    console.log('Searching flights with params:', conversation.flightSearchParams);
    const offers = await duffelService.searchFlights(conversation.flightSearchParams);
    
    // Select diverse offers
    const diverseOffers = selectDiverseOffers(offers, 3);
    
    conversation.searchResults = diverseOffers;
    conversation.currentStage = 'selection';
    
    const flightMessage = `I found some great flight options for you. Please select the one that best suits your needs by clicking on it or telling me which option you prefer (1, 2, or 3). You can also ask for more options or specific preferences.`;
    
    conversation.messages.push({
      role: 'assistant',
      content: flightMessage,
      timestamp: new Date()
    });
    
    await conversation.save();
    
    return res.json({
      success: true,
      message: flightMessage,
      currentStage: conversation.currentStage,
      data: {
        searchResults: diverseOffers
      }
    });
  } catch (error) {
    console.error('Flight search error:', error);
    
    let errorMessage = 'I encountered an error while searching for flights. ';
    
    if (error.errors && error.errors[0]) {
      const duffelError = error.errors[0];
      errorMessage += duffelError.message || 'Please try again with different search criteria.';
    } else {
      errorMessage += 'Please try again or modify your search criteria.';
    }
    
    conversation.messages.push({
      role: 'assistant',
      content: errorMessage,
      timestamp: new Date()
    });
    
    await conversation.save();
    
    return res.json({
      success: true,
      message: errorMessage,
      currentStage: conversation.currentStage
    });
  }
}

// Handle filter flight options
async function handleFilterFlightOptions(criteria, conversation, res) {
  try {
    if (!conversation.searchResults || conversation.searchResults.length === 0) {
      const errorMessage = "I don't have any flight results to filter. Let me search for flights first.";
      
      conversation.messages.push({
        role: 'assistant',
        content: errorMessage,
        timestamp: new Date()
      });
      
      await conversation.save();
      
      return res.json({
        success: true,
        message: errorMessage,
        currentStage: conversation.currentStage
      });
    }
    
    const filteredResults = await duffelService.filterOffers(conversation.searchResults, criteria);
    
    if (filteredResults.length === 0) {
      const noResultsMessage = "No flights match your filter criteria. Would you like to try different filters or see all options?";
      
      conversation.messages.push({
        role: 'assistant',
        content: noResultsMessage,
        timestamp: new Date()
      });
      
      await conversation.save();
      
      return res.json({
        success: true,
        message: noResultsMessage,
        currentStage: conversation.currentStage
      });
    }
    
    conversation.searchResults = filteredResults;
    
    const filterMessage = `I've filtered the flights based on your preferences. Here are ${filteredResults.length} options that match your criteria.`;
    
    conversation.messages.push({
      role: 'assistant',
      content: filterMessage,
      timestamp: new Date()
    });
    
    await conversation.save();
    
    return res.json({
      success: true,
      message: filterMessage,
      currentStage: conversation.currentStage,
      data: {
        searchResults: filteredResults
      }
    });
  } catch (error) {
    console.error('Error filtering flights:', error);
    
    const errorMessage = "I encountered an error while filtering flights. Please try again.";
    
    conversation.messages.push({
      role: 'assistant',
      content: errorMessage,
      timestamp: new Date()
    });
    
    await conversation.save();
    
    return res.json({
      success: true,
      message: errorMessage,
      currentStage: conversation.currentStage
    });
  }
}

// Handle search more flights
async function handleSearchMoreFlights(criteria, conversation, res) {
  return handleMoreFlightOptions(conversation, 'more flights', res);
}

// Handle flight selection
async function handleSelectFlightOffer(args, conversation, req, res) {
  try {
    const { optionNumber } = args;
    
    if (!conversation.searchResults || conversation.searchResults.length < optionNumber) {
      const errorMessage = `Invalid option number. Please select from the available options (1-${conversation.searchResults?.length || 3}).`;
      
      conversation.messages.push({
        role: 'assistant',
        content: errorMessage,
        timestamp: new Date()
      });
      
      await conversation.save();
      
      return res.json({
        success: true,
        message: errorMessage,
        currentStage: conversation.currentStage
      });
    }
    
    const selectedOffer = conversation.searchResults[optionNumber - 1];
    
    // Fetch available services for this offer
    const services = await duffelService.getOfferServices(selectedOffer.id);
    selectedOffer.availableServices = services;
    
    conversation.selectedOffer = selectedOffer;
    
    // Check if user is authenticated
    if (req.user) {
      // Set passenger details from user profile
      conversation.passengerDetails = [req.user.toPassengerFormat()];
      conversation.currentStage = 'additional_services';
      conversation.user = req.user._id;
      
      const selectionMessage = `Perfect! You've selected option ${optionNumber}. Since you're already logged in, we've pre-filled your passenger details. You can proceed to select any additional services you'd like for your flight.`;
      
      conversation.messages.push({
        role: 'assistant',
        content: selectionMessage,
        timestamp: new Date()
      });
    } else {
      // Set stage to authentication if user is not logged in
      conversation.currentStage = 'authentication';
      
      const selectionMessage = `Perfect! You've selected option ${optionNumber}. To continue with your booking, you'll need to sign in or create an account. This helps us securely store your booking details and makes future bookings faster.`;
      
      conversation.messages.push({
        role: 'assistant',
        content: selectionMessage,
        timestamp: new Date()
      });
    }
    
    await conversation.save();
    
    return res.json({
      success: true,
      message: conversation.messages[conversation.messages.length - 1].content,
      currentStage: conversation.currentStage,
      data: {
        selectedOffer: selectedOffer,
        requiresAuth: !req.user,
        passengerDetails: conversation.passengerDetails
      }
    });
  } catch (error) {
    console.error('Error selecting flight:', error);
    
    const errorMessage = "I encountered an error while selecting the flight. Please try again.";
    
    conversation.messages.push({
      role: 'assistant',
      content: errorMessage,
      timestamp: new Date()
    });
    
    await conversation.save();
    
    return res.json({
      success: true,
      message: errorMessage,
      currentStage: conversation.currentStage
    });
  }
}

// Handle passenger details extraction
async function handleExtractPassengerDetails(args, conversation, res) {
  try {
    const { passengers } = args;
    
    // Validate passenger details
    const errors = validationService.validatePassengerDetails(passengers);
    
    if (errors.length > 0) {
      const errorMessage = `I need some additional information:\n${errors.map(e => `- ${e.message}`).join('\n')}`;
      
      conversation.messages.push({
        role: 'assistant',
        content: errorMessage,
        timestamp: new Date()
      });
      
      await conversation.save();
      
      return res.json({
        success: true,
        message: errorMessage,
        currentStage: conversation.currentStage
      });
    }
    
    conversation.passengerDetails = passengers;
    conversation.currentStage = 'additional_services';
    
    const successMessage = `Thank you! I've recorded all passenger details. Now let's enhance your travel experience with additional services. Would you like to select seats, add extra baggage, or choose other services?`;
    
    conversation.messages.push({
      role: 'assistant',
      content: successMessage,
      timestamp: new Date()
    });
    
    await conversation.save();
    
    return res.json({
      success: true,
      message: successMessage,
      currentStage: conversation.currentStage,
      data: {
        passengerDetails: passengers
      }
    });
  } catch (error) {
    console.error('Error extracting passenger details:', error);
    
    const errorMessage = "I encountered an error while processing passenger details. Please try again.";
    
    conversation.messages.push({
      role: 'assistant',
      content: errorMessage,
      timestamp: new Date()
    });
    
    await conversation.save();
    
    return res.json({
      success: true,
      message: errorMessage,
      currentStage: conversation.currentStage
    });
  }
}

// Handle additional services selection
async function handleSelectAdditionalServices(args, conversation, res) {
  try {
    const { services } = args;
    
    conversation.selectedServices = services;
    conversation.currentStage = 'payment';
    
    // Calculate total with services
    let totalAmount = conversation.selectedOffer.totalAmount;
    services.forEach(service => {
      totalAmount += service.details.totalAmount * (service.quantity || 1);
    });
    
    const currency = conversation.selectedOffer.totalCurrency;
    
    const paymentMessage = `Great choices! Your selected services have been added. The total amount for your flight and additional services is ${currency} ${totalAmount.toFixed(2)}. Let's proceed with payment to complete your booking.`;
    
    conversation.messages.push({
      role: 'assistant',
      content: paymentMessage,
      timestamp: new Date()
    });
    
    await conversation.save();
    
    return res.json({
      success: true,
      message: paymentMessage,
      currentStage: conversation.currentStage,
      data: {
        selectedServices: services,
        totalAmount: totalAmount
      }
    });
  } catch (error) {
    console.error('Error selecting additional services:', error);
    
    const errorMessage = "I encountered an error while processing your service selections. Please try again.";
    
    conversation.messages.push({
      role: 'assistant',
      content: errorMessage,
      timestamp: new Date()
    });
    
    await conversation.save();
    
    return res.json({
      success: true,
      message: errorMessage,
      currentStage: conversation.currentStage
    });
  }
}

module.exports = router;