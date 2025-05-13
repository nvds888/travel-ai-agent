// client/src/components/Booking/BookingConfirmation.js
import React, { useState, useEffect } from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Button,
  Divider,
  Alert,
  Stack,
  Paper,
  Grid,
  Chip,
  CircularProgress,
  Stepper,
  Step,
  StepLabel,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
} from '@mui/material';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import EmailIcon from '@mui/icons-material/Email';
import AirplaneTicketIcon from '@mui/icons-material/AirplaneTicket';
import FlightTakeoffIcon from '@mui/icons-material/FlightTakeoff';
import FlightLandIcon from '@mui/icons-material/FlightLand';
import PersonIcon from '@mui/icons-material/Person';
import ReceiptIcon from '@mui/icons-material/Receipt';
import InfoIcon from '@mui/icons-material/Info';
import { format } from 'date-fns';
import { useChat } from '../../contexts/ChatContext';
import { useUser } from '../../contexts/UserContext';
import api from '../../services/api';
import BookingDetails from '../Profile/BookingDetails';

const BookingConfirmation = ({ bookingReference, selectedFlight, passengerDetails, additionalServices = [] }) => {
  const { resetChat } = useChat();
  const [bookingDetails, setBookingDetails] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showBookingDetails, setShowBookingDetails] = useState(false);

  useEffect(() => {
    const fetchBookingDetails = async () => {
      try {
        setLoading(true);
        const response = await api.get(`/bookings/${bookingReference}`);
        if (response.data.success) {
          setBookingDetails(response.data.booking);
        } else {
          setError('Unable to retrieve booking details');
        }
      } catch (err) {
        console.error('Error fetching booking details:', err);
        setError('Failed to load booking details');
      } finally {
        setLoading(false);
      }
    };

    if (bookingReference) {
      fetchBookingDetails();
    }
  }, [bookingReference]);

  const formatTime = (dateString) => {
    try {
      return format(new Date(dateString), 'HH:mm');
    } catch (error) {
      return 'N/A';
    }
  };

  const formatDate = (dateString) => {
    try {
      return format(new Date(dateString), 'MMM d, yyyy');
    } catch (error) {
      return 'N/A';
    }
  };

  const formatDateTime = (dateString) => {
    try {
      return format(new Date(dateString), 'MMM d, yyyy h:mm a');
    } catch (error) {
      return 'N/A';
    }
  };

  const calculateTotalCost = () => {
    if (!selectedFlight) return { amount: 0, currency: 'USD' };
    
    const flightCost = parseFloat(selectedFlight.totalAmount) || 0;
    const servicesCost = additionalServices.reduce((total, service) => {
      const quantity = service.quantity || 1;
      const amount = parseFloat(service.totalAmount) || 0;
      return total + (amount * quantity);
    }, 0);
    
    return {
      amount: (flightCost + servicesCost).toFixed(2),
      currency: selectedFlight.totalCurrency
    };
  };

  const handleManageBooking = () => {
    setShowBookingDetails(true);
  };

  const handleCloseBookingDetails = () => {
    setShowBookingDetails(false);
  };

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', my: 4 }}>
        <CircularProgress />
      </Box>
    );
  }

  if (error) {
    return (
      <Alert severity="error" sx={{ my: 3 }}>
        {error}
      </Alert>
    );
  }

  // Use booking details from API or fall back to props
  const flight = bookingDetails?.flightDetails || selectedFlight;
  const passengers = bookingDetails?.passengers || passengerDetails;
  const services = bookingDetails?.additionalServices || additionalServices;
  const totalCost = calculateTotalCost();

  // Extract flight information
  const flightInfo = flight?.slices || flight;
  const hasSlices = flight?.slices && Array.isArray(flight.slices);
  const isBasicFlight = !hasSlices && (flight?.origin || flight?.departure);

  return (
    <Card sx={{ my: 3, boxShadow: 0, border: '1px solid', borderColor: 'divider' }}>
      <CardContent sx={{ p: 4 }}>
        <Box sx={{ textAlign: 'center', mb: 4 }}>
          <CheckCircleIcon sx={{ fontSize: 60, color: 'success.main', mb: 2 }} />
          <Typography variant="h4" fontWeight="bold" gutterBottom>
            Booking Confirmed!
          </Typography>
          <Paper
            sx={{
              display: 'inline-block',
              p: 2,
              bgcolor: 'grey.50',
              borderRadius: 2,
            }}
          >
            <Typography variant="body2" color="text.secondary" gutterBottom>
              Booking Reference
            </Typography>
            <Typography variant="h5" fontWeight="bold" color="primary">
              {bookingReference}
            </Typography>
          </Paper>
        </Box>

        <Alert
          severity="success"
          icon={<EmailIcon />}
          sx={{
            mb: 4,
            borderRadius: 2,
            '& .MuiAlert-icon': {
              fontSize: 24,
            },
          }}
        >
          Your e-tickets have been sent to your email address. Please check your inbox.
        </Alert>

        <Box sx={{ my: 4 }}>
          <Stepper alternativeLabel>
            <Step completed>
              <StepLabel>Booked</StepLabel>
            </Step>
            <Step active>
              <StepLabel>Confirmed</StepLabel>
            </Step>
            <Step>
              <StepLabel>Check-in Available</StepLabel>
            </Step>
            <Step>
              <StepLabel>Ready to Fly</StepLabel>
            </Step>
          </Stepper>
        </Box>

        <Grid container spacing={4}>
          {/* Flight Details */}
          <Grid item xs={12}>
            <Paper 
              elevation={0} 
              sx={{ 
                p: 3, 
                border: '1px solid', 
                borderColor: 'divider',
                borderRadius: 2
              }}
            >
              <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                <AirplaneTicketIcon sx={{ mr: 1, color: 'primary.main' }} />
                <Typography variant="h6" fontWeight="bold">
                  Flight Details
                </Typography>
              </Box>
              
              <Divider sx={{ mb: 3 }} />
              
              {/* Flight details rendering */}
              {hasSlices ? (
                // Render slices if available
                flight.slices.map((slice, index) => (
                  <Box key={index} sx={{ mb: index < flight.slices.length - 1 ? 4 : 0 }}>
                    <Box sx={{ mb: 2 }}>
                      <Chip 
                        label={index === 0 ? "OUTBOUND" : "RETURN"} 
                        color="primary" 
                        size="small"
                        sx={{ fontWeight: 'bold' }}
                      />
                      <Typography variant="subtitle1" fontWeight="bold" sx={{ mt: 1 }}>
                        {slice.origin.cityName} ({slice.origin.iataCode}) to {slice.destination.cityName} ({slice.destination.iataCode})
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
                        {formatDate(slice.departureDateTime)}
                      </Typography>
                    </Box>
                    
                    <Box sx={{ display: 'flex', alignItems: 'center', mb: 3 }}>
                      <Box sx={{ textAlign: 'center', width: '100px' }}>
                        <Typography variant="h6" fontWeight="bold">
                          {formatTime(slice.departureDateTime)}
                        </Typography>
                        <Typography variant="body2">
                          {slice.origin.iataCode}
                        </Typography>
                      </Box>
                      
                      <Box sx={{ flex: 1, px: 2, position: 'relative' }}>
                        <Divider />
                        <Box sx={{ position: 'absolute', top: -10, left: '50%', transform: 'translateX(-50%)', bgcolor: 'background.paper', px: 1 }}>
                          <Typography variant="body2" color="text.secondary">
                            {slice.duration}
                          </Typography>
                        </Box>
                      </Box>
                      
                      <Box sx={{ textAlign: 'center', width: '100px' }}>
                        <Typography variant="h6" fontWeight="bold">
                          {formatTime(slice.arrivalDateTime)}
                        </Typography>
                        <Typography variant="body2">
                          {slice.destination.iataCode}
                        </Typography>
                      </Box>
                    </Box>
                    
                    {index < flight.slices.length - 1 && <Divider sx={{ my: 3 }} />}
                  </Box>
                ))
              ) : isBasicFlight ? (
                // Render basic flight info if no slices
                <Box>
                  <Box sx={{ mb: 2 }}>
                    <Typography variant="subtitle1" fontWeight="bold">
                      {flight.origin?.city || flight.origin?.cityName} ({flight.origin?.airport || flight.origin?.iataCode}) to {' '}
                      {flight.destination?.city || flight.destination?.cityName} ({flight.destination?.airport || flight.destination?.iataCode})
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      {formatDate(flight.departure || flight.departureDateTime)}
                    </Typography>
                    {flight.airline && (
                      <Typography variant="body2" color="text.secondary">
                        {flight.airline} {flight.flightNumber}
                      </Typography>
                    )}
                  </Box>
                  
                  <Box sx={{ display: 'flex', alignItems: 'center', mb: 3 }}>
                    <Box sx={{ textAlign: 'center', width: '100px' }}>
                      <Typography variant="h6" fontWeight="bold">
                        {formatTime(flight.departure || flight.departureDateTime)}
                      </Typography>
                      <Typography variant="body2">
                        {flight.origin?.airport || flight.origin?.iataCode}
                      </Typography>
                    </Box>
                    
                    <Box sx={{ flex: 1, px: 2, position: 'relative' }}>
                      <Divider />
                      <Box sx={{ position: 'absolute', top: -10, left: '50%', transform: 'translateX(-50%)', bgcolor: 'background.paper', px: 1 }}>
                        <Typography variant="body2" color="text.secondary">
                          {flight.duration || 'Direct'}
                        </Typography>
                      </Box>
                    </Box>
                    
                    <Box sx={{ textAlign: 'center', width: '100px' }}>
                      <Typography variant="h6" fontWeight="bold">
                        {formatTime(flight.arrival || flight.arrivalDateTime)}
                      </Typography>
                      <Typography variant="body2">
                        {flight.destination?.airport || flight.destination?.iataCode}
                      </Typography>
                    </Box>
                  </Box>
                </Box>
              ) : (
                // No flight data available
                <Alert severity="warning">
                  Flight details are not available. Please check your email for complete information.
                </Alert>
              )}
            </Paper>
          </Grid>
          
          {/* Passenger Details */}
          <Grid item xs={12} md={6}>
            <Paper 
              elevation={0} 
              sx={{ 
                p: 3, 
                border: '1px solid', 
                borderColor: 'divider',
                borderRadius: 2,
                height: '100%'
              }}
            >
              <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                <PersonIcon sx={{ mr: 1, color: 'primary.main' }} />
                <Typography variant="h6" fontWeight="bold">
                  Passenger Information
                </Typography>
              </Box>
              
              <Divider sx={{ mb: 3 }} />
              
              <TableContainer>
                <Table size="small">
                  <TableHead>
                    <TableRow>
                      <TableCell><Typography fontWeight="bold">Name</Typography></TableCell>
                      <TableCell><Typography fontWeight="bold">Type</Typography></TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {passengers && passengers.map((passenger, index) => (
                      <TableRow key={index}>
                        <TableCell>
                          {passenger.title} {passenger.firstName} {passenger.lastName}
                        </TableCell>
                        <TableCell>Adult</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
              
              <Box sx={{ mt: 3 }}>
                <Typography variant="subtitle2" fontWeight="bold">Contact Information</Typography>
                <Typography variant="body2">
                  Email: {passengers && passengers[0] ? passengers[0].email : 'N/A'}
                </Typography>
                <Typography variant="body2">
                  Phone: {passengers && passengers[0] ? passengers[0].phoneNumber : 'N/A'}
                </Typography>
              </Box>
            </Paper>
          </Grid>
          
          {/* Payment Details */}
          <Grid item xs={12} md={6}>
            <Paper 
              elevation={0} 
              sx={{ 
                p: 3, 
                border: '1px solid', 
                borderColor: 'divider',
                borderRadius: 2,
                height: '100%'
              }}
            >
              <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                <ReceiptIcon sx={{ mr: 1, color: 'primary.main' }} />
                <Typography variant="h6" fontWeight="bold">
                  Payment Information
                </Typography>
              </Box>
              
              <Divider sx={{ mb: 3 }} />
              
              <Box sx={{ mb: 2 }}>
                <Typography variant="body2" color="text.secondary">Flight Price</Typography>
                <Typography variant="body1">
                  {flight?.totalCurrency || flight?.pricing?.currency || totalCost.currency} {' '}
                  {flight?.totalAmount || flight?.pricing?.totalAmount || totalCost.amount}
                </Typography>
              </Box>
              
              {services && services.length > 0 && (
                <Box sx={{ mb: 2 }}>
                  <Typography variant="body2" color="text.secondary">Additional Services</Typography>
                  {services.map((service, index) => (
                    <Typography key={index} variant="body2">
                      {service.name}: {service.currency} {service.amount} {service.quantity > 1 ? `x ${service.quantity}` : ''}
                    </Typography>
                  ))}
                </Box>
              )}
              
              <Divider sx={{ my: 2 }} />
              
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <Typography variant="subtitle1" fontWeight="bold">Total Amount</Typography>
                <Typography variant="h6" color="primary" fontWeight="bold">
                  {totalCost.currency} {totalCost.amount}
                </Typography>
              </Box>
              
              <Box sx={{ mt: 3 }}>
                <Typography variant="subtitle2" fontWeight="bold">Payment Method</Typography>
                <Typography variant="body2">
                  {bookingDetails?.paymentDetails?.method === 'card' ? 'Credit Card' : 'Duffel Balance'}
                </Typography>
                <Typography variant="body2">
                  Status: {bookingDetails?.paymentDetails?.status === 'completed' ? 'Paid' : 'Pending'}
                </Typography>
                {bookingDetails?.paymentDetails?.paidAt && (
                  <Typography variant="body2">
                    Date: {formatDateTime(bookingDetails.paymentDetails.paidAt)}
                  </Typography>
                )}
              </Box>
            </Paper>
          </Grid>
        </Grid>

        <Typography variant="h6" fontWeight="bold" sx={{ mt: 4, mb: 2 }}>
          Important Information
        </Typography>

        <Alert severity="info" sx={{ mb: 2 }}>
          <Typography variant="body2">
            • Please arrive at the airport at least 2-3 hours before your flight departure time.
          </Typography>
          <Typography variant="body2">
            • Online check-in opens 24-48 hours before departure, depending on the airline.
          </Typography>
          <Typography variant="body2">
            • Don't forget to bring a valid ID or passport for all passengers.
          </Typography>
        </Alert>

        <Box sx={{ mt: 4, display: 'flex', gap: 2, justifyContent: 'center', flexWrap: 'wrap' }}>
          <Button
            variant="contained"
            color="primary"
            startIcon={<InfoIcon />}
            size="large"
            onClick={handleManageBooking}
          >
            Manage Booking
          </Button>
          <Button
            variant="outlined"
            color="primary"
            startIcon={<EmailIcon />}
            size="large"
            href={`mailto:?subject=Flight Booking Confirmation - ${bookingReference}&body=Your booking ${bookingReference} has been confirmed. Please save this reference number.`}
          >
            Email Confirmation
          </Button>
          <Button
            variant="outlined"
            color="secondary"
            onClick={resetChat}
            size="large"
          >
            Book Another Flight
          </Button>
        </Box>
        
        {/* Booking Details Dialog */}
        {showBookingDetails && bookingDetails && (
          <BookingDetails
            booking={bookingDetails}
            open={showBookingDetails}
            onClose={handleCloseBookingDetails}
          />
        )}
      </CardContent>
    </Card>
  );
};

export default BookingConfirmation;