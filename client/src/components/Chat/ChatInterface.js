// client/src/components/Chat/ChatInterface.js
import React, { useState, useEffect, useRef } from 'react';
import {
  Box,
  Paper,
  Typography,
  TextField,
  IconButton,
  CircularProgress,
  Alert,
  Fade,
  Container,
  Chip,
  Stack,
  Button,
  Avatar,
} from '@mui/material';
import SendIcon from '@mui/icons-material/Send';
import FlightIcon from '@mui/icons-material/Flight';
import PersonIcon from '@mui/icons-material/Person';
import PaymentIcon from '@mui/icons-material/Payment';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import AutoFixHighIcon from '@mui/icons-material/AutoFixHigh';
import LoginIcon from '@mui/icons-material/Login';
import AccountCircleIcon from '@mui/icons-material/AccountCircle';
import ProfileModal from '../Profile/ProfileModal';
import { useChat } from '../../contexts/ChatContext';
import { useAuth } from '../../contexts/AuthContext';
import MessageBubble from './MessageBubble';
import FlightResults from '../FlightSearch/FlightResults';
import PassengerForm from '../Booking/PassengerForm';
import AdditionalServices from '../Booking/AdditionalServices';
import PaymentForm from '../Payment/PaymentForm';
import BookingConfirmation from '../Booking/BookingConfirmation';
import AuthModal from '../Auth/AuthModal';

const ChatInterface = () => {
  const [input, setInput] = useState('');
  const [authModalOpen, setAuthModalOpen] = useState(false);
  const [profileModalOpen, setProfileModalOpen] = useState(false);
  const messagesEndRef = useRef(null);
  const resultsRef = useRef(null);
  const {
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
    refreshConversation,
  } = useChat();
  
  const { isAuthenticated, user } = useAuth();

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const scrollToResults = () => {
    if (resultsRef.current) {
      resultsRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  useEffect(() => {
    if (showFlightResults && searchResults) {
      setTimeout(scrollToResults, 100);
    }
  }, [showFlightResults, searchResults]);

  // Update the effect for authentication modal
  useEffect(() => {
    // Only show the auth modal if we're in authentication stage, not authenticated,
    // and the modal isn't already open
    if (currentStage === 'authentication' && !isAuthenticated && !authModalOpen) {
      setAuthModalOpen(true);
    }
  }, [currentStage, isAuthenticated, authModalOpen]);

  // Handle successful authentication (separate effect)
  useEffect(() => {
    // When user becomes authenticated, close modal if open
    if (isAuthenticated && authModalOpen) {
      setAuthModalOpen(false);
      // Important: Do NOT send any message here automatically
    }
  }, [isAuthenticated, authModalOpen]);

  const handleSend = () => {
    if (input.trim() && !loading) {
      sendMessage(input);
      setInput('');
    }
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleFlightSelect = async (offerId) => {
    await selectFlight(offerId);
    toggleFlightResults(false);
  };

  const handleLoadMoreOptions = async () => {
    await sendMessage("Show me more flight options");
  };

  const handleFilterOptions = async (filterType) => {
    await sendMessage(`Show me ${filterType} flights`);
  };

  const handlePassengerFormSubmit = async (passengers) => {
    updatePassengerDetails(passengers);
    await sendMessage('passenger_details_completed');
  };

  const handleAdditionalServicesSubmit = async (services) => {
    updateAdditionalServices(services);
    await sendMessage('additional_services_completed');
  };

  const handlePaymentSubmit = async (paymentDetails) => {
    await createBooking(passengerDetails, paymentDetails);
  };

  const handleAuthModalClose = () => {
    setAuthModalOpen(false);
    
    // Only send the "continue without login" message if still not authenticated
    // and we're still in the authentication stage
    if (currentStage === 'authentication' && !isAuthenticated) {
      // This should only happen if the user explicitly closes the modal
      // without logging in
      sendMessage('I would like to continue without logging in');
    }
    // If user is already authenticated, don't send any message
  };

  // Create a separate "Continue as Guest" function
  const handleContinueAsGuest = () => {
    setAuthModalOpen(false); 
    sendMessage('I would like to continue without logging in');
  };

  // Add function to open auth modal manually
  const handleOpenAuthModal = () => {
    setAuthModalOpen(true);
  };

  const handleProfileClick = () => {
    setProfileModalOpen(true);
  };

  const handleProfileModalClose = () => {
    setProfileModalOpen(false);
  };

  const getStageIcon = () => {
    switch (currentStage) {
      case 'search':
      case 'selection':
        return <FlightIcon />;
      case 'authentication':
        return <LoginIcon />;
      case 'passenger_details':
        return <PersonIcon />;
      case 'additional_services':
        return <FlightIcon />;
      case 'payment':
        return <PaymentIcon />;
      case 'confirmation':
      case 'completed':
        return <CheckCircleIcon />;
      default:
        return <FlightIcon />;
    }
  };

  const getStageTitle = () => {
    switch (currentStage) {
      case 'initial':
        return 'AI Travel Assistant';
      case 'search':
        return 'Finding Your Perfect Flight';
      case 'selection':
        return 'Choose Your Flight';
      case 'authentication':
        return 'Account Authentication';
      case 'passenger_details':
        return 'Passenger Information';
      case 'additional_services':
        return 'Enhance Your Journey';
      case 'payment':
        return 'Secure Payment';
      case 'confirmation':
        return 'Booking Confirmed';
      case 'completed':
        return 'Thank You for Booking';
      default:
        return 'AI Travel Assistant';
    }
  };

  const renderStageContent = () => {
    switch (currentStage) {
      case 'selection':
        return searchResults && showFlightResults && (
          <Fade in={true}>
            <Box ref={resultsRef}>
              <FlightResults
                flights={searchResults}
                onSelect={handleFlightSelect}
                onLoadMore={handleLoadMoreOptions}
                onFilterOptions={handleFilterOptions}
                loading={loading}
              />
            </Box>
          </Fade>
        );
        case 'authentication':
          return (
            <Fade in={true}>
              <Box sx={{ my: 3, textAlign: 'center' }}>
                <Paper sx={{ p: 4, borderRadius: 3, border: '1px solid', borderColor: 'divider' }}>
                  <LoginIcon sx={{ fontSize: 60, color: 'primary.main', mb: 2 }} />
                  <Typography variant="h5" fontWeight="bold" gutterBottom>
                    Authentication Required
                  </Typography>
                  <Typography variant="body1" sx={{ mb: 3 }}>
                    To continue with your booking, please sign in to your account or create a new one.
                  </Typography>
                  <Stack direction="row" spacing={2} justifyContent="center">
                    <Button
                      variant="contained"
                      color="primary"
                      size="large"
                      startIcon={<LoginIcon />}
                      onClick={() => setAuthModalOpen(true)}
                    >
                      Sign In / Register
                    </Button>
                    <Button
                      variant="outlined"
                      color="primary"
                      size="large"
                      onClick={handleContinueAsGuest}
                    >
                      Continue as Guest
                    </Button>
                  </Stack>
                </Paper>
              </Box>
            </Fade>
          );
      case 'passenger_details':
        return selectedFlight && (
          <Fade in={true}>
            <Box>
              <PassengerForm
                selectedFlight={selectedFlight}
                onSubmit={handlePassengerFormSubmit}
                loading={loading}
                initialData={isAuthenticated && user ? {
                  title: user.title,
                  firstName: user.firstName,
                  lastName: user.lastName,
                  dateOfBirth: new Date(user.dateOfBirth),
                  gender: user.gender,
                  email: user.email,
                  phoneNumber: user.phoneNumber,
                  nationality: user.nationality,
                  passportNumber: user.passportNumber,
                  passportExpiry: user.passportExpiry ? new Date(user.passportExpiry) : null
                } : null}
              />
            </Box>
          </Fade>
        );
      case 'additional_services':
        return selectedFlight && (
          <Fade in={true}>
            <Box>
              <AdditionalServices
                selectedFlight={selectedFlight}
                onSubmit={handleAdditionalServicesSubmit}
                loading={loading}
              />
            </Box>
          </Fade>
        );
      case 'payment':
        return selectedFlight && (
          <Fade in={true}>
            <Box>
              <PaymentForm
                selectedFlight={selectedFlight}
                additionalServices={additionalServices}
                onSubmit={handlePaymentSubmit}
                loading={loading}
              />
            </Box>
          </Fade>
        );
      case 'confirmation':
      case 'completed':
        return bookingReference && (
          <Fade in={true}>
            <Box>
              <BookingConfirmation
                bookingReference={bookingReference}
                selectedFlight={selectedFlight}
                passengerDetails={passengerDetails}
                additionalServices={additionalServices}
              />
            </Box>
          </Fade>
        );
      default:
        return null;
    }
  };

  return (
    <Container maxWidth="lg" sx={{ py: 0 }}>
      <Paper
        elevation={0}
        sx={{
          height: 'calc(100vh - 64px)',
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
          borderRadius: 3,
          border: '1px solid',
          borderColor: 'divider',
          backgroundColor: 'background.paper',
        }}
      >
        {/* Header */}
        <Box
          sx={{
            p: 3,
            borderBottom: 1,
            borderColor: 'divider',
            backgroundColor: 'background.paper',
          }}
        >
          <Stack direction="row" alignItems="center" justifyContent="space-between">
            <Stack direction="row" alignItems="center" spacing={2}>
              <Avatar
                sx={{
                  bgcolor: 'primary.main',
                  width: 40,
                  height: 40,
                }}
              >
                {getStageIcon()}
              </Avatar>
              <Box>
                <Typography variant="h6" fontWeight="bold" color="text.primary">
                  {getStageTitle()}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Experience seamless flight booking with AI
                </Typography>
              </Box>
            </Stack>
            <Stack direction="row" spacing={2} alignItems="center">
              {isAuthenticated ? (
                // Show user profile chip when authenticated
                <Chip
                  icon={<PersonIcon />}
                  label={`${user.firstName} ${user.lastName}`}
                  variant="outlined"
                  color="primary"
                  onClick={handleProfileClick}
                  sx={{ cursor: 'pointer' }}
                />
              ) : (
                // Show login button when not authenticated
                <Button
                  variant="outlined"
                  color="primary"
                  size="small"
                  startIcon={<LoginIcon />}
                  onClick={handleOpenAuthModal}
                  sx={{ 
                    borderRadius: '20px',
                    textTransform: 'none',
                    fontWeight: 600
                  }}
                >
                  Sign In / Register
                </Button>
              )}
              {currentStage !== 'initial' && (
                <Chip
                  label={currentStage.replace('_', ' ').toUpperCase()}
                  size="small"
                  color="primary"
                  sx={{
                    fontWeight: 600,
                    px: 2,
                  }}
                />
              )}
            </Stack>
          </Stack>
        </Box>

        {/* Messages and Content */}
        <Box
          sx={{
            flexGrow: 1,
            overflow: 'auto',
            p: 3,
            display: 'flex',
            flexDirection: 'column',
            gap: 3,
            height: '100%',
          }}
        >
          {messages.length === 0 && (
            <Box sx={{ textAlign: 'center', py: 8 }}>
              <AutoFixHighIcon sx={{ fontSize: 60, color: 'primary.main', mb: 3 }} />
              <Typography variant="h4" fontWeight="bold" gutterBottom>
                Your AI Travel Assistant
              </Typography>
              <Typography variant="body1" color="text.secondary" sx={{ mb: 4, maxWidth: 600, mx: 'auto' }}>
                Book flights instantly with AI. Simply tell me where you want to go, and I'll handle everything from finding the best flights to completing your booking.
              </Typography>
              {!isAuthenticated && (
                <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
                  <Button
                    color="primary"
                    sx={{ textTransform: 'none', textDecoration: 'underline' }}
                    onClick={handleOpenAuthModal}
                  >
                    Sign in
                  </Button>
                  {' '}to access your bookings and save your preferences
                </Typography>
              )}
              <Stack direction="row" spacing={2} justifyContent="center" flexWrap="wrap">
                <Chip
                  label="Find flights to Paris"
                  variant="outlined"
                  onClick={() => setInput('Find flights to Paris')}
                  sx={{ cursor: 'pointer' }}
                />
                <Chip
                  label="Book a trip to Bali"
                  variant="outlined"
                  onClick={() => setInput('Book a trip to Bali')}
                  sx={{ cursor: 'pointer' }}
                />
                <Chip
                  label="One-way flight to Tokyo"
                  variant="outlined"
                  onClick={() => setInput('One-way flight to Tokyo')}
                  sx={{ cursor: 'pointer' }}
                />
              </Stack>
            </Box>
          )}
          
          {messages.map((message, index) => (
            <MessageBubble
              key={index}
              message={message}
              isLast={index === messages.length - 1}
            />
          ))}
          
          {loading && !showFlightResults && (
            <Box sx={{ display: 'flex', justifyContent: 'center', p: 3 }}>
              <CircularProgress size={24} />
            </Box>
          )}
          
          {error && (
            <Alert severity="error" sx={{ borderRadius: 2 }}>
              {error}
            </Alert>
          )}
          
          {renderStageContent()}
          
          <div ref={messagesEndRef} />
        </Box>

        {/* Input Area */}
        <Box
          sx={{
            p: 3,
            borderTop: 1,
            borderColor: 'divider',
            backgroundColor: 'background.paper',
          }}
        >
          <Stack direction="row" spacing={2}>
            <TextField
              fullWidth
              variant="outlined"
              placeholder={
                loading ? "Processing your request..." :
                currentStage === 'selection' ? "Select a flight or ask for more options..." :
                currentStage === 'authentication' ? "Sign in to continue or ask me for help..." :
                currentStage === 'passenger_details' ? "Complete the passenger form above..." :
                currentStage === 'additional_services' ? "Choose services or continue to payment..." :
                currentStage === 'payment' ? "Enter your payment details..." :
                "Where would you like to fly?"
              }
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyPress={handleKeyPress}
              disabled={loading || ['passenger_details', 'additional_services', 'payment'].includes(currentStage)}
              sx={{
                '& .MuiOutlinedInput-root': {
                  borderRadius: '24px',
                  backgroundColor: 'background.paper',
                }
              }}
            />
            <Button
              variant="contained"
              color="primary"
              onClick={handleSend}
              disabled={loading || !input.trim() || ['passenger_details', 'additional_services', 'payment'].includes(currentStage)}
              startIcon={<SendIcon />}
              sx={{
                borderRadius: '24px',
                px: 3,
                minWidth: '120px',
              }}
            >
              Send
            </Button>
          </Stack>
        </Box>
      </Paper>
      
      {/* Authentication Modal */}
      <AuthModal 
        open={authModalOpen} 
        onClose={handleAuthModalClose}
        sessionId={sessionId}
      />

      {/* Profile Modal */}
      <ProfileModal 
        open={profileModalOpen}
        onClose={handleProfileModalClose}
      />
    </Container>
  );
};

export default ChatInterface;