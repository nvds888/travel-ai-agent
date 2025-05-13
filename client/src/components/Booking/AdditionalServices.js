// client/src/components/Booking/AdditionalServices.js
import React, { useState, useEffect } from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Button,
  Grid,
  FormControl,
  FormControlLabel,
  Radio,
  RadioGroup,
  Select,
  MenuItem,
  InputLabel,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  Chip,
  Stack,
  Divider,
  Alert,
  CircularProgress,
  List,
  ListItem,
  ListItemText,
  ListItemSecondaryAction,
  IconButton,
} from '@mui/material';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import AirlineSeatReclineExtraIcon from '@mui/icons-material/AirlineSeatReclineExtra';
import LuggageIcon from '@mui/icons-material/Luggage';
import RestaurantIcon from '@mui/icons-material/Restaurant';
import AttachMoneyIcon from '@mui/icons-material/AttachMoney';
import AddIcon from '@mui/icons-material/Add';
import RemoveIcon from '@mui/icons-material/Remove';

const AdditionalServices = ({ selectedFlight, onSubmit, loading }) => {
  const [selectedServices, setSelectedServices] = useState([]);
  const [expandedPanel, setExpandedPanel] = useState(null);
  const [servicesLoading, setServicesLoading] = useState(false);

  const availableServices = selectedFlight?.availableServices || {};

  const handlePanelChange = (panel) => (event, isExpanded) => {
    setExpandedPanel(isExpanded ? panel : null);
  };

  const handleSeatSelection = (seat) => {
    setSelectedServices(prev => {
      const existingSeatIndex = prev.findIndex(
        service => service.type === 'seat' && service.segmentId === seat.segmentId
      );
      
      if (existingSeatIndex >= 0) {
        // Replace existing seat selection
        const updated = [...prev];
        updated[existingSeatIndex] = seat;
        return updated;
      } else {
        // Add new seat selection
        return [...prev, { ...seat, type: 'seat' }];
      }
    });
  };

  const handleBaggageSelection = (baggage, action) => {
    setSelectedServices(prev => {
      const existingBaggageIndex = prev.findIndex(
        service => service.id === baggage.id
      );
      
      if (action === 'add') {
        if (existingBaggageIndex >= 0) {
          // Increase quantity
          const updated = [...prev];
          updated[existingBaggageIndex] = {
            ...updated[existingBaggageIndex],
            quantity: (updated[existingBaggageIndex].quantity || 1) + 1
          };
          return updated;
        } else {
          // Add new baggage
          return [...prev, { ...baggage, type: 'baggage', quantity: 1 }];
        }
      } else if (action === 'remove') {
        if (existingBaggageIndex >= 0) {
          const updated = [...prev];
          const currentQuantity = updated[existingBaggageIndex].quantity || 1;
          
          if (currentQuantity > 1) {
            // Decrease quantity
            updated[existingBaggageIndex] = {
              ...updated[existingBaggageIndex],
              quantity: currentQuantity - 1
            };
            return updated;
          } else {
            // Remove baggage
            return prev.filter((_, index) => index !== existingBaggageIndex);
          }
        }
      }
      
      return prev;
    });
  };

  const handleOtherServiceToggle = (service) => {
    setSelectedServices(prev => {
      const existingServiceIndex = prev.findIndex(s => s.id === service.id);
      
      if (existingServiceIndex >= 0) {
        // Remove service
        return prev.filter((_, index) => index !== existingServiceIndex);
      } else {
        // Add service
        return [...prev, { ...service, quantity: 1 }];
      }
    });
  };

  const calculateTotal = () => {
    return selectedServices.reduce((total, service) => {
      const quantity = service.quantity || 1;
      const amount = parseFloat(service.totalAmount) || 0;
      return total + (amount * quantity);
    }, 0);
  };

  const handleSubmit = () => {
    onSubmit(selectedServices);
  };

  const getBaggageQuantity = (baggageId) => {
    const service = selectedServices.find(s => s.id === baggageId);
    return service?.quantity || 0;
  };

  const isServiceSelected = (serviceId) => {
    return selectedServices.some(s => s.id === serviceId);
  };

  if (!availableServices || Object.keys(availableServices).length === 0) {
    return (
      <Card sx={{ mt: 2 }}>
        <CardContent>
          <Typography variant="h6" gutterBottom>
            Additional Services
          </Typography>
          <Alert severity="info" sx={{ mb: 2 }}>
            No additional services are available for this flight.
          </Alert>
          <Button
            variant="contained"
            fullWidth
            size="large"
            onClick={() => onSubmit([])}
          >
            Continue to Payment
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card sx={{ mt: 2 }}>
      <CardContent>
        <Typography variant="h6" gutterBottom>
          Additional Services
        </Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
          Enhance your travel experience with these optional services
        </Typography>

        {/* Seat Selection */}
        {availableServices.seats && availableServices.seats.length > 0 && (
          <Accordion expanded={expandedPanel === 'seats'} onChange={handlePanelChange('seats')}>
            <AccordionSummary expandIcon={<ExpandMoreIcon />}>
              <Stack direction="row" spacing={2} alignItems="center">
                <AirlineSeatReclineExtraIcon color="primary" />
                <Typography>Seat Selection</Typography>
              </Stack>
            </AccordionSummary>
            <AccordionDetails>
              <Grid container spacing={2}>
                {availableServices.seats.map((seat) => (
                  <Grid item xs={12} sm={6} md={4} key={seat.id}>
                    <Card
                      variant="outlined"
                      sx={{
                        cursor: 'pointer',
                        borderColor: isServiceSelected(seat.id) ? 'primary.main' : 'divider',
                        borderWidth: isServiceSelected(seat.id) ? 2 : 1,
                      }}
                      onClick={() => handleSeatSelection(seat)}
                    >
                      <CardContent>
                        <Typography variant="subtitle1">
                          Seat {seat.designator}
                        </Typography>
                        <Typography variant="body2" color="text.secondary">
                          {seat.type.replace('_', ' ').toUpperCase()}
                        </Typography>
                        <Typography variant="h6" color="primary" sx={{ mt: 1 }}>
                          {seat.totalCurrency} {seat.totalAmount}
                        </Typography>
                      </CardContent>
                    </Card>
                  </Grid>
                ))}
              </Grid>
            </AccordionDetails>
          </Accordion>
        )}

        {/* Extra Baggage */}
        {availableServices.baggage && availableServices.baggage.length > 0 && (
          <Accordion expanded={expandedPanel === 'baggage'} onChange={handlePanelChange('baggage')}>
            <AccordionSummary expandIcon={<ExpandMoreIcon />}>
              <Stack direction="row" spacing={2} alignItems="center">
                <LuggageIcon color="primary" />
                <Typography>Extra Baggage</Typography>
              </Stack>
            </AccordionSummary>
            <AccordionDetails>
              <List>
                {availableServices.baggage.map((baggage) => (
                  <ListItem key={baggage.id} divider>
                    <ListItemText
                      primary={`${baggage.type} Baggage`}
                      secondary={`Max weight: ${baggage.maxWeight || baggage.weight}kg`}
                    />
                    <Typography variant="h6" color="primary" sx={{ mr: 2 }}>
                      {baggage.totalCurrency} {baggage.totalAmount}
                    </Typography>
                    <ListItemSecondaryAction>
                      <Stack direction="row" alignItems="center" spacing={1}>
                        <IconButton
                          edge="end"
                          onClick={() => handleBaggageSelection(baggage, 'remove')}
                          disabled={getBaggageQuantity(baggage.id) === 0}
                          size="small"
                        >
                          <RemoveIcon />
                        </IconButton>
                        <Typography sx={{ minWidth: 20, textAlign: 'center' }}>
                          {getBaggageQuantity(baggage.id)}
                        </Typography>
                        <IconButton
                          edge="end"
                          onClick={() => handleBaggageSelection(baggage, 'add')}
                          size="small"
                        >
                          <AddIcon />
                        </IconButton>
                      </Stack>
                    </ListItemSecondaryAction>
                  </ListItem>
                ))}
              </List>
            </AccordionDetails>
          </Accordion>
        )}

        {/* Other Services */}
        {availableServices.other && availableServices.other.length > 0 && (
          <Accordion expanded={expandedPanel === 'other'} onChange={handlePanelChange('other')}>
            <AccordionSummary expandIcon={<ExpandMoreIcon />}>
              <Stack direction="row" spacing={2} alignItems="center">
                <RestaurantIcon color="primary" />
                <Typography>Other Services</Typography>
              </Stack>
            </AccordionSummary>
            <AccordionDetails>
              <List>
                {availableServices.other.map((service) => (
                  <ListItem
                    key={service.id}
                    divider
                    button
                    onClick={() => handleOtherServiceToggle(service)}
                    selected={isServiceSelected(service.id)}
                  >
                    <ListItemText
                      primary={service.name}
                      secondary={service.description}
                    />
                    <Typography variant="h6" color="primary">
                      {service.totalCurrency} {service.totalAmount}
                    </Typography>
                  </ListItem>
                ))}
              </List>
            </AccordionDetails>
          </Accordion>
        )}

        <Divider sx={{ my: 3 }} />

        {/* Summary */}
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
          <Typography variant="h6">
            Additional Services Total:
          </Typography>
          <Typography variant="h6" color="primary">
            {selectedFlight.totalCurrency} {calculateTotal().toFixed(2)}
          </Typography>
        </Box>

        {selectedServices.length > 0 && (
          <Box sx={{ mb: 2 }}>
            <Typography variant="subtitle2" gutterBottom>
              Selected Services:
            </Typography>
            <Stack direction="row" spacing={1} flexWrap="wrap">
              {selectedServices.map((service, index) => (
                <Chip
                  key={index}
                  label={`${service.type === 'seat' ? `Seat ${service.designator}` : service.name || service.type} ${service.quantity > 1 ? `(x${service.quantity})` : ''}`}
                  onDelete={() => {
                    if (service.type === 'seat') {
                      handleSeatSelection(null);
                    } else if (service.type === 'baggage') {
                      handleBaggageSelection(service, 'remove');
                    } else {
                      handleOtherServiceToggle(service);
                    }
                  }}
                  color="primary"
                  variant="outlined"
                />
              ))}
            </Stack>
          </Box>
        )}

        <Button
          variant="contained"
          fullWidth
          size="large"
          onClick={handleSubmit}
          disabled={loading}
          startIcon={<AttachMoneyIcon />}
        >
          Continue to Payment ({selectedFlight.totalCurrency} {(parseFloat(selectedFlight.totalAmount) + calculateTotal()).toFixed(2)})
        </Button>
      </CardContent>
    </Card>
  );
};


export default AdditionalServices;