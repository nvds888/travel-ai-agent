// client/src/components/Profile/BookingDetails.js
import React from 'react';
import {
  Dialog,
  DialogContent,
  DialogTitle,
  IconButton,
  Box,
  Typography,
  Divider,
  Grid,
  Paper,
  Chip,
  Button,
  Alert,
  Stack,
  Card,
  CardContent
} from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import FlightTakeoffIcon from '@mui/icons-material/FlightTakeoff';
import FlightLandIcon from '@mui/icons-material/FlightLand';
import AccessTimeIcon from '@mui/icons-material/AccessTime';
import PersonIcon from '@mui/icons-material/Person';
import AirlineSeatReclineExtraIcon from '@mui/icons-material/AirlineSeatReclineExtra';
import LuggageIcon from '@mui/icons-material/Luggage';
import { format, formatDistanceToNow } from 'date-fns';

const BookingDetails = ({ booking, open, onClose }) => {
  const formatDate = (dateString) => {
    try {
      if (!dateString) return 'N/A';
      return format(new Date(dateString), 'MMM d, yyyy');
    } catch (error) {
      return 'Invalid date';
    }
  };

  const formatTime = (dateString) => {
    try {
      if (!dateString) return 'N/A';
      return format(new Date(dateString), 'HH:mm');
    } catch (error) {
      return 'N/A';
    }
  };

  const formatDateTime = (dateString) => {
    try {
      if (!dateString) return 'N/A';
      return format(new Date(dateString), 'MMM d, yyyy HH:mm');
    } catch (error) {
      return 'Invalid date';
    }
  };

  const formatTimeDistance = (dateString) => {
    try {
      if (!dateString) return '';
      return formatDistanceToNow(new Date(dateString), { addSuffix: true });
    } catch (error) {
      return '';
    }
  };

  const formatDuration = (duration) => {
    if (!duration) return 'N/A';
    
    // Handle ISO 8601 duration format (e.g., "PT1H30M")
    const isoMatch = duration.match(/PT(?:(\d+)H)?(?:(\d+)M)?/);
    
    if (isoMatch) {
      const hours = isoMatch[1] ? parseInt(isoMatch[1]) : 0;
      const minutes = isoMatch[2] ? parseInt(isoMatch[2]) : 0;
      
      const parts = [];
      if (hours > 0) parts.push(`${hours}h`);
      if (minutes > 0) parts.push(`${minutes}m`);
      
      return parts.join(' ') || '0m';
    }
    
    // If it doesn't match the ISO format, just return as is
    return duration;
  };

  const getStatusChip = (status) => {
    let color = 'default';
    
    switch (status?.toLowerCase()) {
      case 'confirmed':
        color = 'success';
        break;
      case 'cancelled':
        color = 'error';
        break;
      case 'pending':
        color = 'warning';
        break;
      default:
        color = 'default';
    }
    
    return (
      <Chip 
        label={status?.charAt(0).toUpperCase() + status?.slice(1) || 'Unknown'} 
        color={color}
        size="small"
      />
    );
  };

  if (!booking) {
    return null;
  }

  const flight = booking.flightDetails || {};
  const slices = booking.duffelDetails?.slices || [];
  const passengers = booking.passengers || [];
  const services = booking.additionalServices || [];

  return (
    <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
      <DialogTitle>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Typography variant="h6">Booking Details</Typography>
          <IconButton onClick={onClose} aria-label="close">
            <CloseIcon />
          </IconButton>
        </Box>
      </DialogTitle>
      <DialogContent>
        {/* Booking Summary */}
        <Box sx={{ mb: 4 }}>
          <Paper sx={{ p: 3, borderRadius: 2 }}>
            <Grid container spacing={2} alignItems="center">
              <Grid item xs={12} sm={8}>
                <Typography variant="h5" fontWeight="bold">
                  {flight.origin?.city || 'Origin'} to {flight.destination?.city || 'Destination'}
                </Typography>
                <Typography variant="body1" color="text.secondary">
                  {formatDate(flight.departure)}
                  {flight.arrival && ` - ${formatDate(flight.arrival)}`}
                </Typography>
                <Box sx={{ display: 'flex', alignItems: 'center', mt: 1 }}>
                  <Typography variant="body2" sx={{ mr: 2 }}>
                    Booking Reference: <strong>{booking.bookingReference}</strong>
                  </Typography>
                  {getStatusChip(booking.status)}
                </Box>
              </Grid>
              <Grid item xs={12} sm={4} sx={{ textAlign: 'right' }}>
                <Typography variant="h5" fontWeight="bold" color="primary">
                  {booking.pricing?.currency || '$'} {booking.pricing?.totalAmount || 'N/A'}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Booked {formatTimeDistance(booking.createdAt)}
                </Typography>
              </Grid>
            </Grid>
          </Paper>
        </Box>
        
        {/* Flight Details */}
        <Typography variant="h6" fontWeight="bold" gutterBottom>
          Flight Details
        </Typography>
        
        {slices.length > 0 ? (
          // Duffel detailed slices if available
          slices.map((slice, index) => (
            <Card key={index} sx={{ mb: 3, borderRadius: 2 }}>
              <CardContent>
                <Typography variant="subtitle1" fontWeight="bold" color="primary" gutterBottom>
                  {index === 0 ? 'Outbound Flight' : 'Return Flight'}
                </Typography>
                
                <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                  <AccessTimeIcon sx={{ mr: 1, color: 'text.secondary' }} />
                  <Typography variant="body2" color="text.secondary">
                    {formatDuration(slice.duration)}
                  </Typography>
                </Box>
                
                {/* Implement Duffel slice details here if needed */}
              </CardContent>
            </Card>
          ))
        ) : (
          // Basic flight info from our database
          <Card sx={{ mb: 3, borderRadius: 2 }}>
            <CardContent>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                <Box>
                  <Typography variant="subtitle1" fontWeight="bold" color="primary">
                    {flight.airline || 'Flight'} {flight.flightNumber || ''}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    {flight.cabinClass && flight.cabinClass.charAt(0).toUpperCase() + flight.cabinClass.slice(1)} Class
                  </Typography>
                </Box>
                <Box>
                  <Typography variant="body2" sx={{ display: 'flex', alignItems: 'center' }}>
                    <AccessTimeIcon sx={{ mr: 1, fontSize: 'small' }} />
                    {formatDuration(flight.duration)}
                  </Typography>
                </Box>
              </Box>
              
              <Grid container spacing={2}>
                <Grid item xs={5}>
                  <Box sx={{ display: 'flex', alignItems: 'center' }}>
                    <FlightTakeoffIcon sx={{ mr: 1, color: 'primary.main' }} />
                    <Box>
                      <Typography variant="h6">
                        {formatTime(flight.departure)}
                      </Typography>
                      <Typography variant="body1" fontWeight="medium">
                        {flight.origin?.airport}
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
                        {flight.origin?.city}
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        {formatDate(flight.departure)}
                      </Typography>
                    </Box>
                  </Box>
                </Grid>
                
                <Grid item xs={2} sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
                  <Divider sx={{ width: '100%' }} />
                </Grid>
                
                <Grid item xs={5}>
                  <Box sx={{ display: 'flex', alignItems: 'center' }}>
                    <FlightLandIcon sx={{ mr: 1, color: 'primary.main' }} />
                    <Box>
                      <Typography variant="h6">
                        {formatTime(flight.arrival)}
                      </Typography>
                      <Typography variant="body1" fontWeight="medium">
                        {flight.destination?.airport}
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
                        {flight.destination?.city}
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        {formatDate(flight.arrival)}
                      </Typography>
                    </Box>
                  </Box>
                </Grid>
              </Grid>
            </CardContent>
          </Card>
        )}
        
        {/* Passenger Details */}
        <Typography variant="h6" fontWeight="bold" gutterBottom sx={{ mt: 2 }}>
          Passenger Information
        </Typography>
        
        {passengers.length > 0 ? (
          <Stack spacing={2} sx={{ mb: 3 }}>
            {passengers.map((passenger, index) => (
              <Paper key={index} sx={{ p: 2, borderRadius: 2 }}>
                <Box sx={{ display: 'flex', alignItems: 'center' }}>
                  <PersonIcon sx={{ mr: 2, color: 'primary.main' }} />
                  <Box>
                    <Typography variant="subtitle1" fontWeight="medium">
                      {passenger.title} {passenger.firstName} {passenger.lastName}
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      {passenger.email} • {passenger.phoneNumber}
                    </Typography>
                    {passenger.passportNumber && (
                      <Typography variant="body2" color="text.secondary">
                        Passport: {passenger.passportNumber} 
                        {passenger.passportExpiry && ` (Expires: ${formatDate(passenger.passportExpiry)})`}
                      </Typography>
                    )}
                  </Box>
                </Box>
              </Paper>
            ))}
          </Stack>
        ) : (
          <Alert severity="info" sx={{ mb: 3 }}>
            No passenger information available
          </Alert>
        )}
        
        {/* Additional Services */}
        {services && services.length > 0 && (
          <>
            <Typography variant="h6" fontWeight="bold" gutterBottom sx={{ mt: 2 }}>
              Additional Services
            </Typography>
            <Grid container spacing={2} sx={{ mb: 3 }}>
              {services.map((service, index) => (
                <Grid item xs={12} sm={6} key={index}>
                  <Paper sx={{ p: 2, borderRadius: 2, height: '100%' }}>
                    <Box sx={{ display: 'flex', alignItems: 'center' }}>
                      {service.type === 'seat' ? (
                        <AirlineSeatReclineExtraIcon sx={{ mr: 2, color: 'primary.main' }} />
                      ) : service.type === 'baggage' ? (
                        <LuggageIcon sx={{ mr: 2, color: 'primary.main' }} />
                      ) : (
                        <FlightTakeoffIcon sx={{ mr: 2, color: 'primary.main' }} />
                      )}
                      <Box>
                        <Typography variant="subtitle1" fontWeight="medium">
                          {service.name || service.type}
                        </Typography>
                        {(service.quantity > 1 || service.amount) && (
                          <Typography variant="body2" color="text.secondary">
                            {service.quantity > 1 && `Quantity: ${service.quantity}`}
                            {service.amount && ` • ${service.currency || '$'} ${service.amount}`}
                          </Typography>
                        )}
                      </Box>
                    </Box>
                  </Paper>
                </Grid>
              ))}
            </Grid>
          </>
        )}
        
        {/* Payment Details */}
        <Typography variant="h6" fontWeight="bold" gutterBottom sx={{ mt: 2 }}>
          Payment Information
        </Typography>
        
        <Paper sx={{ p: 3, mb: 3, borderRadius: 2 }}>
          <Grid container spacing={2}>
            <Grid item xs={12} sm={6}>
              <Typography variant="body2" color="text.secondary">
                Payment Method
              </Typography>
              <Typography variant="body1">
                {booking.paymentDetails?.method === 'card' ? 'Card Payment' : 
                 booking.paymentDetails?.method === 'balance' ? 'Account Balance' :
                 booking.paymentDetails?.method || 'N/A'}
              </Typography>
            </Grid>
            <Grid item xs={12} sm={6}>
              <Typography variant="body2" color="text.secondary">
                Payment Date
              </Typography>
              <Typography variant="body1">
                {booking.paymentDetails?.paidAt ? 
                  formatDateTime(booking.paymentDetails.paidAt) : 
                  formatDateTime(booking.createdAt)}
              </Typography>
            </Grid>
            <Grid item xs={12} sm={6}>
              <Typography variant="body2" color="text.secondary">
                Total Price
              </Typography>
              <Typography variant="h6" color="primary" fontWeight="bold">
                {booking.pricing?.currency || '$'} {booking.pricing?.totalAmount || 'N/A'}
              </Typography>
            </Grid>
            <Grid item xs={12} sm={6}>
              <Typography variant="body2" color="text.secondary">
                Status
              </Typography>
              <Typography variant="body1">
                {getStatusChip(booking.paymentDetails?.status || booking.status)}
              </Typography>
            </Grid>
          </Grid>
        </Paper>
        
        {/* Actions */}
        <Box sx={{ display: 'flex', justifyContent: 'flex-end', mt: 2 }}>
          <Button
            variant="outlined"
            color="primary"
            onClick={onClose}
          >
            Close
          </Button>
        </Box>
      </DialogContent>
    </Dialog>
  );
};

export default BookingDetails;