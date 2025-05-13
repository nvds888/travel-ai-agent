// server/src/services/openai.service.js - Secured version
const OpenAI = require('openai');
const validationService = require('./validation.service');

class OpenAIService {
  constructor() {
    this.openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY
    });
  }

  async processMessage(messages, context) {
    try {
      const systemPrompt = this.generateSystemPrompt(context);
      
      const model = process.env.OPENAI_MODEL || 'gpt-3.5-turbo';
      console.log('Using model:', model);
      
      const completion = await this.openai.chat.completions.create({
        model: model,
        messages: [
          { role: 'system', content: systemPrompt },
          ...messages
        ],
        temperature: 0.7,
        functions: this.getFunctions(),
        function_call: 'auto'
      });

      console.log('OpenAI response:', JSON.stringify(completion.choices[0], null, 2));
      return completion.choices[0];
    } catch (error) {
      console.error('OpenAI API error:', error);
      throw error;
    }
  }

  generateSystemPrompt(context) {
    const today = new Date().toISOString().split('T')[0];
    
    const stages = {
      initial: this.getInitialStagePrompt(today, context.flightSearchParams),
      selection: this.getSelectionStagePrompt(),
      authentication: this.getAuthenticationStagePrompt(),
      passenger_details: this.getPassengerDetailsPrompt(context),
      additional_services: this.getAdditionalServicesPrompt(context),
      payment: this.getPaymentStagePrompt(context),
      confirmation: this.getConfirmationStagePrompt()
    };
    
    return stages[context.currentStage] || this.getInitialStagePrompt(today, context.flightSearchParams);
  }

  getInitialStagePrompt(today, flightParams = {}) {
    return `You are a helpful travel assistant AI that helps users search and book flights.
    You are integrated with the Duffel API for flight searches and bookings.
    
    Current conversation stage: initial
    Today's date: ${today}
    
    IMPORTANT PRIVACY RULES:
    1. DO NOT ask for or collect personal information in the chat
    2. Personal details are collected through secure forms, not chat
    3. Guide users through the booking process without requesting personal data
    
    CONVERSATION RULES:
    1. Collect flight information conversationally, one or two questions at a time
    2. Support ONE-WAY, ROUND-TRIP, and MULTI-CITY flights
    3. Parse natural language time preferences (e.g., "morning flight", "red-eye")
    4. Follow this order when collecting information:
       a. Ask what kind of trip they're planning or where they want to go
       b. Determine trip type (one-way, round-trip, multi-city)
       c. For multi-city: collect all segments in order
       d. Ask for departure date(s)
       e. Confirm passenger count and cabin class
       f. Ask about any time preferences or constraints
    
    5. Time handling:
       - Convert "morning", "evening", etc. to time ranges
       - If user mentions specific times, use them
       - Default to full day if no preference given
    
    6. IMPORTANT: When all information is collected:
       - Summarize ALL details including any time preferences
       - Ask for confirmation
       - Only call extractFlightSearchParams AFTER confirmation
    
    Current collected information:
    - Type: ${flightParams.type || 'not specified'}
    - Origin: ${flightParams.origin || 'not provided'}
    - Destination: ${flightParams.destination || 'not provided'}
    - Departure Date: ${flightParams.departureDate || 'not provided'}
    - Return Date: ${flightParams.returnDate || 'not provided'}
    - Time Preferences: ${flightParams.departureTime ? JSON.stringify(flightParams.departureTime) : 'none'}
    - Passengers: ${flightParams.passengers ? JSON.stringify(flightParams.passengers) : 'not provided'}
    - Cabin Class: ${flightParams.cabinClass || 'not provided'}`;
  }

  getSelectionStagePrompt() {
    return `You are a helpful travel assistant AI helping users select flights.
    
    Current stage: Flight Selection
    Flight search results are being displayed to the user visually.
    
    PRIVACY RULES:
    - Do not mention or ask for personal information
    - Focus only on flight selection and preferences
    
    IMPORTANT RULES:
    1. Users can request more options or filter existing results
    2. Support natural language filters like:
       - "Show me morning flights only"
       - "I prefer direct flights"
       - "Find me cheaper options"
       - "Show flights with one stop or less"
    3. When filtering, call filterFlightOptions with appropriate criteria
    4. When user selects (e.g., "option 1", "first one"), call selectFlightOffer
    5. If user wants more options beyond displayed, call searchMoreFlights
    
    Do not describe flight details as they are shown visually.`;
  }

  getAuthenticationStagePrompt() {
    return `You are a helpful travel assistant AI.
    
    Current stage: Authentication Required
    
    The user has selected a flight and needs to sign in or create an account to continue.
    
    PRIVACY RULES:
    - Do not ask for login credentials in chat
    - Authentication is handled through secure forms
    
    Explain that authentication is required to:
    - Securely store booking information
    - Access booking details later
    - Make future bookings faster
    - Receive important flight updates
    
    Keep the message brief and friendly.`;
  }

  getPassengerDetailsPrompt(context) {
    return `You are a helpful travel assistant AI collecting passenger details.
    
    Current stage: Passenger Details Collection
    Flight selected: ${context.hasSelectedFlight ? 'Yes' : 'No'}
    
    CRITICAL PRIVACY RULES:
    1. DO NOT ask for any personal information in the chat
    2. DO NOT request names, dates of birth, passport numbers, etc.
    3. The passenger form interface handles all personal data collection
    4. Only provide guidance about what information is needed
    
    Your role is to:
    - Explain what information the form requires
    - Answer questions about document requirements
    - Clarify what details are needed for international vs domestic flights
    - Guide users through the form process
    
    If users try to provide personal information in chat, politely redirect them to use the form.`;
  }

  getAdditionalServicesPrompt(context) {
    return `You are a helpful travel assistant AI helping users select additional services.
    
    Current stage: Additional Services
    Flight selected: ${context.hasSelectedFlight ? 'Yes' : 'No'}
    Passenger details provided: ${context.hasPassengerDetails ? 'Yes' : 'No'}
    
    PRIVACY RULES:
    - Do not reference any personal passenger information
    - Focus on service options and preferences only
    
    Available services may include:
    1. Seat selection (window/aisle/extra legroom)
    2. Extra baggage
    3. Meal preferences
    4. Travel insurance
    5. Priority boarding
    6. Lounge access
    
    Present options based on what's available for their flight.
    Allow users to skip if they don't want any extras.
    Explain pricing clearly when asked.`;
  }

  getPaymentStagePrompt(context) {
    return `You are a helpful travel assistant AI processing payment.
    
    Current stage: Payment
    Flight selected: ${context.hasSelectedFlight ? 'Yes' : 'No'}
    
    CRITICAL PRIVACY RULES:
    1. DO NOT ask for payment details in chat
    2. Payment is handled through secure forms only
    3. Never request credit card numbers, CVV, etc.
    
    Your role is to:
    - Explain the total cost including any additional services
    - Guide users to the secure payment form
    - Answer questions about payment methods
    - Explain the booking process
    
    If the total amount is available: ${context.selectedFlightInfo?.totalCurrency || ''} ${context.selectedFlightInfo?.totalAmount || ''}`;
  }

  getConfirmationStagePrompt() {
    return `You are a helpful travel assistant AI.
    
    Current stage: Booking Confirmation
    
    The booking is complete. Your role is to:
    - Confirm the booking was successful
    - Explain how to access booking details
    - Provide general next steps (check-in, arrive at airport, etc.)
    - Answer any follow-up questions
    
    PRIVACY RULES:
    - Do not display personal information
    - Reference booking by confirmation number only
    - Keep responses general and helpful`;
  }

  getFunctions() {
    return [
      {
        name: 'extractFlightSearchParams',
        description: 'Extract flight search parameters from conversation. Only call AFTER user confirms all details.',
        parameters: {
          type: 'object',
          properties: {
            type: { 
              type: 'string',
              enum: ['one_way', 'round_trip', 'multi_city'],
              description: 'Type of flight journey'
            },
            origin: { 
              type: 'string', 
              description: 'Origin airport code (e.g., NYC, JFK, LHR)',
              pattern: '^[A-Z]{3}$'
            },
            destination: { 
              type: 'string', 
              description: 'Destination airport code',
              pattern: '^[A-Z]{3}$'
            },
            departureDate: { 
              type: 'string', 
              description: 'Departure date in YYYY-MM-DD format',
              pattern: '^\\d{4}-\\d{2}-\\d{2}$'
            },
            returnDate: { 
              type: 'string', 
              description: 'Return date for round trips (YYYY-MM-DD)',
              pattern: '^\\d{4}-\\d{2}-\\d{2}$'
            },
            departureTime: {
              type: 'object',
              description: 'Preferred departure time range',
              properties: {
                from: { type: 'string', pattern: '^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$' },
                to: { type: 'string', pattern: '^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$' }
              }
            },
            arrivalTime: {
              type: 'object',
              description: 'Preferred arrival time range',
              properties: {
                from: { type: 'string', pattern: '^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$' },
                to: { type: 'string', pattern: '^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$' }
              }
            },
            passengers: {
              type: 'object',
              properties: {
                adults: { type: 'number', default: 1, minimum: 1, maximum: 9 },
                children: { type: 'number', default: 0, minimum: 0, maximum: 9 },
                infants: { type: 'number', default: 0, minimum: 0, maximum: 9 }
              }
            },
            cabinClass: { 
              type: 'string', 
              enum: ['economy', 'premium_economy', 'business', 'first'],
              default: 'economy'
            },
            maxConnections: {
              type: 'number',
              description: 'Maximum number of connections (0 for direct only)',
              minimum: 0,
              maximum: 3
            },
            additionalStops: {
              type: 'array',
              description: 'Additional stops for multi-city trips',
              items: {
                type: 'object',
                properties: {
                  origin: { type: 'string', pattern: '^[A-Z]{3}$' },
                  destination: { type: 'string', pattern: '^[A-Z]{3}$' },
                  departureDate: { type: 'string', pattern: '^\\d{4}-\\d{2}-\\d{2}$' },
                  departureTime: {
                    type: 'object',
                    properties: {
                      from: { type: 'string' },
                      to: { type: 'string' }
                    }
                  }
                },
                required: ['origin', 'destination', 'departureDate']
              }
            }
          },
          required: ['type', 'origin', 'destination', 'departureDate']
        }
      },
      {
        name: 'filterFlightOptions',
        description: 'Filter displayed flight options based on user preferences',
        parameters: {
          type: 'object',
          properties: {
            timeOfDay: {
              type: 'string',
              enum: ['morning', 'afternoon', 'evening', 'night', 'red_eye'],
              description: 'Preferred time of day for departure'
            },
            maxConnections: {
              type: 'number',
              description: 'Maximum stops (0 for direct only)',
              minimum: 0,
              maximum: 3
            },
            airlines: {
              type: 'array',
              description: 'Preferred airlines',
              items: { type: 'string' }
            },
            priceSort: {
              type: 'string',
              enum: ['lowest', 'highest'],
              description: 'Sort by price'
            },
            durationSort: {
              type: 'string',
              enum: ['shortest', 'longest'],
              description: 'Sort by duration'
            }
          }
        }
      },
      {
        name: 'searchMoreFlights',
        description: 'Search for additional flight options beyond currently displayed',
        parameters: {
          type: 'object',
          properties: {
            criteria: {
              type: 'object',
              properties: {
                excludeCurrentResults: { type: 'boolean', default: true },
                focusOn: {
                  type: 'string',
                  enum: ['cheaper', 'faster', 'premium', 'different_times'],
                  description: 'What type of alternatives to find'
                }
              }
            }
          }
        }
      },
      {
        name: 'selectFlightOffer',
        description: 'Select a flight offer when user chooses an option',
        parameters: {
          type: 'object',
          properties: {
            optionNumber: {
              type: 'number',
              description: 'The option number selected by the user (1, 2, 3, etc.)',
              minimum: 1
            }
          },
          required: ['optionNumber']
        }
      }
    ];
  }

  parseResponse(response) {
    if (response.message?.function_call) {
      const functionName = response.message.function_call.name;
      const args = JSON.parse(response.message.function_call.arguments);
      
      // Special handling for time preferences
      if (functionName === 'extractFlightSearchParams' && response.message.content) {
        const timePreference = validationService.parseTimePreference(response.message.content);
        if (timePreference && !args.departureTime) {
          args.departureTime = timePreference;
        }
      }
      
      return {
        type: 'function',
        functionName,
        arguments: args,
        message: response.message.content
      };
    }
    
    return {
      type: 'message',
      content: response.message?.content || 'How can I help you with your travel plans today?'
    };
  }

  // Helper to convert natural language to structured data
  parseNaturalLanguage(message) {
    const patterns = {
      date: /(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{2,4})/,
      time: /(\d{1,2}):?(\d{2})?\s*(am|pm|AM|PM)?/,
      airport: /\b([A-Z]{3})\b/g,
      flightType: /(one[\s-]?way|round[\s-]?trip|multi[\s-]?city)/i,
      passengers: /(\d+)\s*(adult|child|infant)/gi,
      cabin: /(economy|premium economy|business|first)[\s-]?class/i
    };
    
    const extracted = {};
    
    // Extract dates
    const dateMatch = message.match(patterns.date);
    if (dateMatch) {
      const [_, month, day, year] = dateMatch;
      const fullYear = year.length === 2 ? `20${year}` : year;
      extracted.date = `${fullYear}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
    }
    
    // Extract time preferences
    const timePreference = validationService.parseTimePreference(message);
    if (timePreference) {
      extracted.timePreference = timePreference;
    }
    
    // Extract airports
    const airports = [];
    let airportMatch;
    while ((airportMatch = patterns.airport.exec(message)) !== null) {
      airports.push(airportMatch[1]);
    }
    if (airports.length > 0) {
      extracted.airports = airports;
    }
    
    // Extract flight type
    const typeMatch = message.match(patterns.flightType);
    if (typeMatch) {
      extracted.flightType = typeMatch[1].toLowerCase().replace(/[\s-]/g, '_');
    }
    
    // Extract passenger counts
    const passengers = { adults: 1, children: 0, infants: 0 };
    let passengerMatch;
    while ((passengerMatch = patterns.passengers.exec(message)) !== null) {
      const count = parseInt(passengerMatch[1]);
      const type = passengerMatch[2].toLowerCase();
      if (type.includes('adult')) passengers.adults = count;
      else if (type.includes('child')) passengers.children = count;
      else if (type.includes('infant')) passengers.infants = count;
    }
    extracted.passengers = passengers;
    
    // Extract cabin class
    const cabinMatch = message.match(patterns.cabin);
    if (cabinMatch) {
      extracted.cabinClass = cabinMatch[1].toLowerCase().replace(/[\s-]class/, '').replace(' ', '_');
    }
    
    return extracted;
  }
}

module.exports = new OpenAIService();