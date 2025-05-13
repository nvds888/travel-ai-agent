// client/src/components/Profile/BookingsList.js
import React, { useState } from 'react';
import {
  Box,
  Typography,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Chip,
  Button,
  Alert,
  Dialog,
  DialogActions,
  DialogContent,
  DialogContentText,
  DialogTitle,
  CircularProgress
} from '@mui/material';
import FlightTakeoffIcon from '@mui/icons-material/FlightTakeoff';
import CancelIcon from '@mui/icons-material/Cancel';
import InfoIcon from '@mui/icons-material/Info';
import RefreshIcon from '@mui/icons-material/Refresh';
import { format } from 'date-fns';
import { useUser } from '../../contexts/UserContext';
import BookingDetails from './BookingDetails';

const BookingsList = ({ bookings = [], onRefresh }) => {
  const { cancelBooking, loading } = useUser();
  const [selectedBooking, setSelectedBooking] = useState(null);
  const [cancelDialogOpen, setCancelDialogOpen] = useState(false);
  const [bookingToCancel, setBookingToCancel] = useState(null);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [isCancelling, setIsCancelling] = useState(false);

  const handleDetailsClick = (booking) => {
    // Pass the entire booking object to the details component
    setSelectedBooking(booking);
  };

  const handleCloseDetails = () => {
    setSelectedBooking(null);
  };

  const handleCancelClick = (booking) => {
    setBookingToCancel(booking);
    setCancelDialogOpen(true);
  };

  const handleCloseCancelDialog = () => {
    setCancelDialogOpen(false);
    setBookingToCancel(null);
  };

  const handleConfirmCancel = async () => {
    if (!bookingToCancel) return;
    
    try {
      setError('');
      setIsCancelling(true);
      await cancelBooking(bookingToCancel._id, 'Cancelled by user');
      setSuccess(`Booking ${bookingToCancel.bookingReference} has been cancelled`);
      setCancelDialogOpen(false);
      setBookingToCancel(null);
      
      // Refresh bookings after cancellation
      if (onRefresh) {
        await onRefresh();
      }
    } catch (err) {
      setError(err.message || 'Failed to cancel booking');
    } finally {
      setIsCancelling(false);
    }
  };

  const getStatusChip = (status) => {
    let color = 'default';
    let icon = null;
    
    switch (status?.toLowerCase()) {
      case 'confirmed':
        color = 'success';
        break;
      case 'cancelled':
        color = 'error';
        icon = <CancelIcon />;
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
        icon={icon}
        size="small"
        variant="outlined"
      />
    );
  };

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

  if (bookings.length === 0) {
    return (
      <Box sx={{ textAlign: 'center', py: 4 }}>
        <FlightTakeoffIcon sx={{ fontSize: 60, color: 'primary.main', opacity: 0.3, mb: 2 }} />
        <Typography variant="h6" gutterBottom>
          No bookings found
        </Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
          Your bookings will appear here after you complete a flight reservation
        </Typography>
        {onRefresh && (
          <Button
            variant="outlined"
            startIcon={<RefreshIcon />}
            onClick={onRefresh}
            size="small"
          >
            Refresh
          </Button>
        )}
      </Box>
    );
  }

  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Box>
          <Typography variant="h6" fontWeight="bold" gutterBottom>
            My Bookings
          </Typography>
          <Typography variant="body2" color="text.secondary">
            View and manage your flight bookings
          </Typography>
        </Box>
        {onRefresh && (
          <Button
            variant="outlined"
            startIcon={<RefreshIcon />}
            onClick={onRefresh}
            size="small"
            disabled={loading}
          >
            Refresh
          </Button>
        )}
      </Box>
      
      {error && (
        <Alert severity="error" onClose={() => setError('')} sx={{ mb: 3 }}>
          {error}
        </Alert>
      )}
      
      {success && (
        <Alert severity="success" onClose={() => setSuccess('')} sx={{ mb: 3 }}>
          {success}
        </Alert>
      )}
      
      <TableContainer component={Paper} sx={{ mb: 3, borderRadius: 2 }}>
        <Table sx={{ minWidth: 650 }}>
          <TableHead>
            <TableRow sx={{ backgroundColor: 'grey.50' }}>
              <TableCell sx={{ fontWeight: 'bold' }}>Booking Ref</TableCell>
              <TableCell sx={{ fontWeight: 'bold' }}>Route</TableCell>
              <TableCell sx={{ fontWeight: 'bold' }}>Date</TableCell>
              <TableCell sx={{ fontWeight: 'bold' }}>Status</TableCell>
              <TableCell sx={{ fontWeight: 'bold' }}>Price</TableCell>
              <TableCell sx={{ fontWeight: 'bold' }} align="right">Actions</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {bookings.map((booking) => (
              <TableRow
                key={booking._id}
                sx={{
                  '&:last-child td, &:last-child th': { border: 0 },
                  backgroundColor: booking.status === 'cancelled' ? 'grey.50' : 'inherit',
                  opacity: booking.status === 'cancelled' ? 0.7 : 1,
                }}
              >
                <TableCell>{booking.bookingReference || 'N/A'}</TableCell>
                <TableCell>
                  {booking.flightDetails?.origin?.city || 'N/A'} &rarr; {booking.flightDetails?.destination?.city || 'N/A'}
                </TableCell>
                <TableCell>
                  {formatDate(booking.flightDetails?.departure)}
                  <Typography variant="caption" display="block" color="text.secondary">
                    {formatTime(booking.flightDetails?.departure)}
                  </Typography>
                </TableCell>
                <TableCell>{getStatusChip(booking.status)}</TableCell>
                <TableCell>
                  {booking.pricing?.currency || '$'} {booking.pricing?.totalAmount || 'N/A'}
                  {booking.status === 'cancelled' && booking.cancellationDetails?.refundAmount && (
                    <Typography variant="caption" display="block" color="success.main">
                      Refund: {booking.cancellationDetails.refundCurrency || booking.pricing?.currency || '$'} {booking.cancellationDetails.refundAmount}
                    </Typography>
                  )}
                </TableCell>
                <TableCell align="right">
                  <Button
                    size="small"
                    startIcon={<InfoIcon />}
                    onClick={() => handleDetailsClick(booking)}
                    sx={{ mr: 1 }}
                  >
                    Details
                  </Button>
                  
                  {booking.status !== 'cancelled' && (
                    <Button
                      size="small"
                      color="error"
                      startIcon={<CancelIcon />}
                      onClick={() => handleCancelClick(booking)}
                      disabled={isCancelling}
                    >
                      Cancel
                    </Button>
                  )}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>
      
      {/* Booking Details Dialog */}
      {selectedBooking && (
        <BookingDetails 
          booking={selectedBooking} 
          open={!!selectedBooking} 
          onClose={handleCloseDetails} 
        />
      )}
      
      {/* Cancel Booking Confirmation Dialog */}
      <Dialog
        open={cancelDialogOpen}
        onClose={handleCloseCancelDialog}
      >
        <DialogTitle>Cancel Booking</DialogTitle>
        <DialogContent>
          <DialogContentText>
            Are you sure you want to cancel booking {bookingToCancel?.bookingReference}? 
            This action cannot be undone and cancellation fees may apply.
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseCancelDialog} disabled={isCancelling}>
            No, Keep Booking
          </Button>
          <Button 
            onClick={handleConfirmCancel} 
            color="error"
            disabled={isCancelling}
            startIcon={isCancelling ? <CircularProgress size={20} /> : <CancelIcon />}
          >
            Yes, Cancel Booking
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default BookingsList;