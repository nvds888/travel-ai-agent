// client/src/components/Payment/PaymentForm.js
import React, { useState, useEffect } from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Button,
  Alert,
  TextField,
  Grid,
  Divider,
  CircularProgress,
  Stepper,
  Step,
  StepLabel,
  Paper,
} from '@mui/material';
import PaymentIcon from '@mui/icons-material/Payment';
import ConfirmationNumberIcon from '@mui/icons-material/ConfirmationNumber';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';

const PaymentForm = ({ selectedFlight, additionalServices = [], passengerDetails, onSubmit, loading }) => {
  const [paymentStep, setPaymentStep] = useState(0);
  const [cardDetails, setCardDetails] = useState({
    cardNumber: '',
    cardholderName: '',
    expiryDate: '',
    cvv: '',
  });
  const [processingPayment, setProcessingPayment] = useState(false);
  const [paymentError, setPaymentError] = useState(null);
  const [timeRemaining, setTimeRemaining] = useState(null);
  const [offerExpired, setOfferExpired] = useState(false);

  useEffect(() => {
    if (selectedFlight && selectedFlight.expiresAt) {
      const expiryTime = new Date(selectedFlight.expiresAt).getTime();
      const currentTime = new Date().getTime();

      setTimeRemaining(Math.max(0, Math.floor((expiryTime - currentTime) / 1000)));

      const timer = setInterval(() => {
        setTimeRemaining(prev => {
          if (prev <= 1) {
            clearInterval(timer);
            setOfferExpired(true);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);

      return () => clearInterval(timer);
    }
  }, [selectedFlight]);

  const calculateTotalAmount = () => {
    // Calculate flight cost
    const flightCost = parseFloat(selectedFlight.totalAmount);
    
    // Calculate additional services cost
    const servicesCost = additionalServices.reduce((total, service) => {
      const quantity = service.quantity || 1;
      return total + (parseFloat(service.totalAmount) * quantity);
    }, 0);
    
    return (flightCost + servicesCost).toFixed(2);
  };

  const handleCardDetailsChange = (field) => (event) => {
    setCardDetails({
      ...cardDetails,
      [field]: event.target.value,
    });
  };

  const handleBalancePayment = () => {
    setProcessingPayment(true);
    setPaymentError(null);
    
    // For this implementation, we're using Duffel's balance payment
    setTimeout(() => {
      onSubmit({
        type: 'balance',
        amount: calculateTotalAmount(),
        currency: selectedFlight.totalCurrency,
      });
      setProcessingPayment(false);
    }, 1500);
  };

  const handleCardPayment = () => {
    // Validate card details
    if (!cardDetails.cardNumber || !cardDetails.cardholderName || !cardDetails.expiryDate || !cardDetails.cvv) {
      setPaymentError('Please fill in all card details');
      return;
    }
    
    setProcessingPayment(true);
    setPaymentError(null);
    
    // In a real implementation, you would handle card payment processing here
    // For our demo, we'll simulate a successful payment
    setTimeout(() => {
      setPaymentStep(1); // Move to confirmation step
      setProcessingPayment(false);
    }, 2000);
  };

  const handleConfirmPayment = () => {
    // Submit the payment to the server
    onSubmit({
      type: 'card',
      amount: calculateTotalAmount(),
      currency: selectedFlight.totalCurrency,
      cardDetails: {
        // In a real implementation, you would securely handle card details
        // This is just for demonstration purposes
        lastFour: cardDetails.cardNumber.slice(-4),
        cardholderName: cardDetails.cardholderName,
      }
    });
  };

  const getAdditionalServicesSummary = () => {
    if (!additionalServices || additionalServices.length === 0) {
      return 'No additional services selected';
    }
    
    return additionalServices.map(service => {
      const quantity = service.quantity || 1;
      const serviceType = service.type === 'seat' ? `Seat ${service.designator}` : 
                          service.name || service.type;
      return `${serviceType} ${quantity > 1 ? `(x${quantity})` : ''}: ${service.totalCurrency} ${(parseFloat(service.totalAmount) * quantity).toFixed(2)}`;
    }).join(', ');
  };

  const renderPaymentMethodStep = () => (
    <>
      <Typography variant="h6" gutterBottom>
        Payment Details
      </Typography>
      
      <Alert severity="info" sx={{ mb: 3 }}>
        This is a demo environment. You can use the test payment methods below.
      </Alert>

      <Grid container spacing={3}>
        <Grid item xs={12}>
          <Paper variant="outlined" sx={{ p: 3, mb: 3 }}>
            <Typography variant="subtitle1" fontWeight="bold" gutterBottom>
              Credit/Debit Card
            </Typography>
            
            <Grid container spacing={2}>
              <Grid item xs={12}>
                <TextField
                  fullWidth
                  label="Card Number"
                  value={cardDetails.cardNumber}
                  onChange={handleCardDetailsChange('cardNumber')}
                  placeholder="4111 1111 1111 1111"
                />
              </Grid>
              
              <Grid item xs={12}>
                <TextField
                  fullWidth
                  label="Cardholder Name"
                  value={cardDetails.cardholderName}
                  onChange={handleCardDetailsChange('cardholderName')}
                />
              </Grid>
              
              <Grid item xs={6}>
                <TextField
                  fullWidth
                  label="Expiry Date"
                  value={cardDetails.expiryDate}
                  onChange={handleCardDetailsChange('expiryDate')}
                  placeholder="MM/YY"
                />
              </Grid>
              
              <Grid item xs={6}>
                <TextField
                  fullWidth
                  label="CVV"
                  value={cardDetails.cvv}
                  onChange={handleCardDetailsChange('cvv')}
                  type="password"
                />
              </Grid>
            </Grid>
            
            <Button
              variant="contained"
              color="primary"
              fullWidth
              onClick={handleCardPayment}
              disabled={processingPayment}
              sx={{ mt: 2 }}
            >
              {processingPayment ? <CircularProgress size={24} /> : 'Pay with Card'}
            </Button>
          </Paper>
        </Grid>
        
        <Grid item xs={12}>
          <Paper variant="outlined" sx={{ p: 3 }}>
            <Typography variant="subtitle1" fontWeight="bold" gutterBottom>
              Duffel Balance Payment
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
              For demo purposes, this payment method completes instantly.
            </Typography>
            
            <Button
              variant="outlined"
              color="primary"
              fullWidth
              startIcon={<PaymentIcon />}
              onClick={handleBalancePayment}
              disabled={processingPayment || loading}
            >
              {processingPayment ? <CircularProgress size={24} /> : 'Pay with Balance'}
            </Button>
          </Paper>
        </Grid>
      </Grid>
      
      {paymentError && (
        <Alert severity="error" sx={{ mt: 2 }}>
          {paymentError}
        </Alert>
      )}
    </>
  );

  const renderConfirmationStep = () => (
    <>
      <Typography variant="h6" gutterBottom>
        Confirm Payment
      </Typography>
      
      <Alert severity="success" sx={{ mb: 3 }}>
        Card validation successful! Please review your booking details and confirm payment.
      </Alert>

      <Paper variant="outlined" sx={{ p: 3, mb: 3 }}>
        <Typography variant="subtitle1" fontWeight="bold" gutterBottom>
          Booking Summary
        </Typography>
        
        <Box sx={{ mb: 2 }}>
          <Typography variant="body2" color="text.secondary">
            Flight
          </Typography>
          <Typography variant="body1">
            {selectedFlight.slices[0].origin.cityName} to {selectedFlight.slices[0].destination.cityName}
            {selectedFlight.slices.length > 1 ? ' (Round Trip)' : ' (One Way)'}
          </Typography>
        </Box>
        
        <Box sx={{ mb: 2 }}>
          <Typography variant="body2" color="text.secondary">
            Departure
          </Typography>
          <Typography variant="body1">
            {new Date(selectedFlight.slices[0].departureDateTime).toLocaleString()}
          </Typography>
        </Box>
        
        {selectedFlight.slices.length > 1 && (
          <Box sx={{ mb: 2 }}>
            <Typography variant="body2" color="text.secondary">
              Return
            </Typography>
            <Typography variant="body1">
              {new Date(selectedFlight.slices[1].departureDateTime).toLocaleString()}
            </Typography>
          </Box>
        )}
        
        <Box sx={{ mb: 2 }}>
          <Typography variant="body2" color="text.secondary">
            Passengers
          </Typography>
          <Typography variant="body1">
            {passengerDetails ? passengerDetails.length : 1} Passenger(s)
          </Typography>
        </Box>
        
        <Box sx={{ mb: 2 }}>
          <Typography variant="body2" color="text.secondary">
            Additional Services
          </Typography>
          <Typography variant="body1">
            {getAdditionalServicesSummary()}
          </Typography>
        </Box>
        
        <Divider sx={{ my: 2 }} />
        
        <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
          <Typography variant="body1">Flight Price:</Typography>
          <Typography variant="body1">{selectedFlight.totalCurrency} {selectedFlight.totalAmount}</Typography>
        </Box>
        
        <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 2 }}>
          <Typography variant="body1">Additional Services:</Typography>
          <Typography variant="body1">
            {selectedFlight.totalCurrency} {additionalServices.reduce((total, service) => {
              const quantity = service.quantity || 1;
              return total + (parseFloat(service.totalAmount) * quantity);
            }, 0).toFixed(2)}
          </Typography>
        </Box>
        
        <Box sx={{ display: 'flex', justifyContent: 'space-between', fontWeight: 'bold' }}>
          <Typography variant="h6">Total:</Typography>
          <Typography variant="h6">{selectedFlight.totalCurrency} {calculateTotalAmount()}</Typography>
        </Box>
      </Paper>

      <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
        <Button
          variant="outlined"
          onClick={() => setPaymentStep(0)}
          disabled={processingPayment || loading}
        >
          Back
        </Button>
        
        <Button
          variant="contained"
          color="primary"
          startIcon={<ConfirmationNumberIcon />}
          onClick={handleConfirmPayment}
          disabled={processingPayment || loading}
        >
          {loading || processingPayment ? (
            <CircularProgress size={24} />
          ) : (
            `Confirm and Pay ${selectedFlight.totalCurrency} ${calculateTotalAmount()}`
          )}
        </Button>
      </Box>
    </>
  );

  return (
    <Card sx={{ my: 2 }}>
      <CardContent>
        {timeRemaining !== null && !offerExpired && (
          <Alert severity="warning" sx={{ mb: 2 }}>
            Offer expires in: {Math.floor(timeRemaining / 60)}:{(timeRemaining % 60).toString().padStart(2, '0')}
          </Alert>
        )}
        {offerExpired && (
          <Alert severity="error" sx={{ mb: 2 }}>
            This offer has expired. Please refresh to get a new offer.
          </Alert>
        )}

        <Stepper activeStep={paymentStep} sx={{ mb: 4 }}>
          <Step>
            <StepLabel>Payment Method</StepLabel>
          </Step>
          <Step>
            <StepLabel>Confirmation</StepLabel>
          </Step>
          <Step>
            <StepLabel>Booking Complete</StepLabel>
          </Step>
        </Stepper>

        {paymentStep === 0 && renderPaymentMethodStep()}
        {paymentStep === 1 && renderConfirmationStep()}

        <Typography variant="caption" color="text.secondary" sx={{ mt: 2, display: 'block', textAlign: 'center' }}>
          By proceeding with payment, you agree to our terms and conditions
        </Typography>
      </CardContent>
    </Card>
  );
};

export default PaymentForm;