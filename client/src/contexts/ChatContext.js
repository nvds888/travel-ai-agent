// client/src/contexts/ChatContext.js
import React, { createContext, useState, useContext, useEffect } from 'react';
import { v4 as uuidv4 } from 'uuid';
import api from '../services/api';
import { useAuth } from './AuthContext';

const ChatContext = createContext();

export const useChat = () => useContext(ChatContext);

export const ChatProvider = ({ children }) => {
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [currentStage, setCurrentStage] = useState('initial');
  const [searchResults, setSearchResults] = useState(null);
  const [selectedFlight, setSelectedFlight] = useState(null);
  const [passengerDetails, setPassengerDetails] = useState(null);
  const [additionalServices, setAdditionalServices] = useState([]);
  const [bookingReference, setBookingReference] = useState(null);
  const [showFlightResults, setShowFlightResults] = useState(false);
  const [sessionId, setSessionId] = useState(() => {
    return localStorage.getItem('chatSessionId') || uuidv4();
  });
  
  const { isAuthenticated, user } = useAuth();

  // Initialize or resume conversation
  useEffect(() => {
    const initializeChat = async () => {
      try {
        localStorage.setItem('chatSessionId', sessionId);
        
        const response = await api.post('/chat/start', { sessionId });
        
        if (response.data.success) {
          const conversation = response.data.conversation;
          setMessages(conversation.messages || []);
          setCurrentStage(conversation.currentStage || 'initial');
          
          // If user is authenticated but conversation is in authentication stage,
          // update the server and transition to the next stage
          if (isAuthenticated && conversation.currentStage === 'authentication') {
            await setAuthenticated();
          }
        }
      } catch (err) {
        console.error('Error initializing chat:', err);
        setError('Failed to initialize chat. Please refresh the page.');
      }
    };
    
    initializeChat();
  }, [sessionId, isAuthenticated]);

  // Effect to handle authentication stage changes
  useEffect(() => {
    const handleAuthStage = async () => {
      if (isAuthenticated && currentStage === 'authentication') {
        try {
          await setAuthenticated();
        } catch (err) {
          console.error('Error handling auth stage:', err);
        }
      }
    };
    
    handleAuthStage();
  }, [isAuthenticated, currentStage]);

  // Refresh conversation (used after authentication)
  const refreshConversation = async () => {
    setLoading(true);
    try {
      const response = await api.post('/chat/start', { sessionId });
      
      if (response.data.success) {
        const conversation = response.data.conversation;
        setMessages(conversation.messages || []);
        setCurrentStage(conversation.currentStage || 'initial');
        
        // If we're in authentication stage but user is authenticated,
        // we need to notify the server
        if (isAuthenticated && conversation.currentStage === 'authentication') {
          await setAuthenticated();
        }
      }
      setError(null);
    } catch (err) {
      console.error('Error refreshing conversation:', err);
      setError('Failed to refresh chat. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  // Set authenticated status
  const setAuthenticated = async () => {
    try {
      console.log("Setting authenticated status for session:", sessionId);
      const response = await api.post('/chat/set-authenticated', { sessionId });
      
      if (response.data.success) {
        console.log("Authentication status updated, new stage:", response.data.currentStage);
        setCurrentStage(response.data.currentStage);
        
        if (response.data.passengerDetails) {
          setPassengerDetails(response.data.passengerDetails);
        }
        
        if (response.data.message) {
          // Add the auth success message to the chat
          const newMessage = {
            role: 'assistant',
            content: response.data.message.content,
            timestamp: response.data.message.timestamp || new Date().toISOString()
          };
          
          setMessages(prev => [...prev, newMessage]);
        }
        
        return response.data;
      }
    } catch (err) {
      console.error('Error setting authenticated status:', err);
      throw err;
    }
  };

  // Send message to the assistant
  const sendMessage = async (message) => {
    setLoading(true);
    setError(null);
    
    // Add user message to UI immediately
    const userMessage = {
      role: 'user',
      content: message,
      timestamp: new Date().toISOString()
    };
    
    setMessages(prevMessages => [...prevMessages, userMessage]);
    
    try {
      const response = await api.post('/chat/message', {
        sessionId,
        message
      });
      
      if (response.data.success) {
        // Update UI with assistant response
        const assistantMessage = {
          role: 'assistant',
          content: response.data.message,
          timestamp: new Date().toISOString()
        };
        
        setMessages(prevMessages => [...prevMessages, assistantMessage]);
        
        // Update state based on response
        setCurrentStage(response.data.currentStage);
        
        if (response.data.data) {
          if (response.data.data.searchResults) {
            setSearchResults(response.data.data.searchResults);
            setShowFlightResults(true);
          }
          
          if (response.data.data.selectedOffer) {
            setSelectedFlight(response.data.data.selectedOffer);
          }
          
          if (response.data.data.passengerDetails) {
            setPassengerDetails(response.data.data.passengerDetails);
          }
          
          // If the API says we're in authentication but we're already 
          // authenticated, update the server
          if (response.data.currentStage === 'authentication' && isAuthenticated) {
            setTimeout(() => setAuthenticated(), 500);
          }
        }
      }
    } catch (err) {
      console.error('Error sending message:', err);
      setError('Failed to send message. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  // Select a flight
  const selectFlight = async (offerId) => {
    setLoading(true);
    setError(null);
    
    try {
      const response = await api.post('/flights/select', {
        sessionId,
        offerId
      });
      
      if (response.data.success) {
        setSelectedFlight(response.data.offer);
        setCurrentStage(response.data.currentStage);
        
        if (response.data.passengerDetails) {
          setPassengerDetails(response.data.passengerDetails);
        }
        
        // If current stage is authentication but we're already logged in,
        // transition immediately to the next stage
        if (response.data.currentStage === 'authentication' && isAuthenticated) {
          await setAuthenticated();
        }
        
        // Send message to AI to continue the conversation flow
        await sendMessage(`I'll take option with ID: ${offerId}`);
      }
    } catch (err) {
      console.error('Error selecting flight:', err);
      setError('Failed to select flight. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  // Update passenger details
  const updatePassengerDetails = (passengers) => {
    setPassengerDetails(passengers);
  };

  // Update additional services
  const updateAdditionalServices = (services) => {
    setAdditionalServices(services);
  };

  // Create booking
  const createBooking = async (passengers, paymentDetails) => {
    setLoading(true);
    setError(null);
    
    try {
      const response = await api.post('/bookings/create', {
        sessionId,
        passengers,
        paymentDetails,
        additionalServices
      });
      
      if (response.data.success) {
        setBookingReference(response.data.booking.bookingReference);
        setCurrentStage('confirmation');
        
        // Add booking confirmation message
        const confirmationMessage = {
          role: 'assistant',
          content: `Your booking is confirmed! Your reference number is ${response.data.booking.bookingReference}. Your e-tickets have been sent to your email address.`,
          timestamp: new Date().toISOString()
        };
        
        setMessages(prevMessages => [...prevMessages, confirmationMessage]);
      }
    } catch (err) {
      console.error('Error creating booking:', err);
      setError('Failed to create booking. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  // Toggle flight results visibility
  const toggleFlightResults = (visible) => {
    setShowFlightResults(visible);
  };

  // Reset chat
  const resetChat = () => {
    const newSessionId = uuidv4();
    localStorage.setItem('chatSessionId', newSessionId);
    setSessionId(newSessionId);
    setMessages([]);
    setCurrentStage('initial');
    setSearchResults(null);
    setSelectedFlight(null);
    setPassengerDetails(null);
    setAdditionalServices([]);
    setBookingReference(null);
    setShowFlightResults(false);
    setError(null);
  };

  return (
    <ChatContext.Provider
      value={{
        messages,
        loading,
        error,
        currentStage,
        searchResults,
        selectedFlight,
        passengerDetails,
        additionalServices,
        bookingReference,
        showFlightResults,
        sessionId,
        sendMessage,
        selectFlight,
        updatePassengerDetails,
        updateAdditionalServices,
        createBooking,
        toggleFlightResults,
        resetChat,
        refreshConversation
      }}
    >
      {children}
    </ChatContext.Provider>
  );
};

export default ChatContext;