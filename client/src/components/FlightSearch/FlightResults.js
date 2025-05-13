// client/src/components/FlightSearch/FlightResults.js
import React, { useState } from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Button,
  Grid,
  Chip,
  Divider,
  Stack,
  Tooltip,
  Paper,
  Menu,
  MenuItem,
  Collapse,
} from '@mui/material';
import FlightTakeoffIcon from '@mui/icons-material/FlightTakeoff';
import FlightLandIcon from '@mui/icons-material/FlightLand';
import LuggageIcon from '@mui/icons-material/Luggage';
import AttachMoneyIcon from '@mui/icons-material/AttachMoney';
import SpeedIcon from '@mui/icons-material/Speed';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import CancelIcon from '@mui/icons-material/Cancel';
import FilterListIcon from '@mui/icons-material/FilterList';
import MoreHorizIcon from '@mui/icons-material/MoreHoriz';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import AirlineIcon from '@mui/icons-material/AirplanemodeActive';
import AccessTimeFilledIcon from '@mui/icons-material/AccessTimeFilled';
import NightlightIcon from '@mui/icons-material/Nightlight';
import { format } from 'date-fns';

const FlightResults = ({ flights, onSelect, onLoadMore, onFilterOptions, loading }) => {
  const [expandedFlightId, setExpandedFlightId] = useState(null);
  const [anchorEl, setAnchorEl] = useState(null);
  const open = Boolean(anchorEl);

  const formatDuration = (duration) => {
    if (!duration) return 'N/A';
    
    if (typeof duration === 'string' && (duration.includes('h') || duration.includes('m'))) {
      return duration;
    }
    
    const match = duration.match(/PT(?:(\d+)H)?(?:(\d+)M)?/);
    
    if (!match) {
      return duration;
    }
    
    const hours = match[1] ? parseInt(match[1]) : 0;
    const minutes = match[2] ? parseInt(match[2]) : 0;
    
    const parts = [];
    if (hours > 0) parts.push(`${hours}h`);
    if (minutes > 0) parts.push(`${minutes}m`);
    
    return parts.length > 0 ? parts.join(' ') : '0m';
  };

  const formatTime = (dateString) => {
    try {
      return format(new Date(dateString), 'HH:mm');
    } catch (error) {
      console.error('Error formatting time:', dateString, error);
      return 'N/A';
    }
  };

  const formatDate = (dateString) => {
    try {
      return format(new Date(dateString), 'EEE, MMM d');
    } catch (error) {
      console.error('Error formatting date:', dateString, error);
      return 'N/A';
    }
  };

  const getBadgeInfo = (index) => {
    const badges = [
      { text: "Best Price", icon: <AttachMoneyIcon fontSize="small" />, color: "success" },
      { text: "Fastest", icon: <SpeedIcon fontSize="small" />, color: "primary" },
      { text: "Popular", icon: <CheckCircleIcon fontSize="small" />, color: "secondary" }
    ];
    return badges[index] || null;
  };

  const handleExpandClick = (flightId) => {
    setExpandedFlightId(expandedFlightId === flightId ? null : flightId);
  };

  const handleFilterClick = (event) => {
    setAnchorEl(event.currentTarget);
  };

  const handleFilterClose = () => {
    setAnchorEl(null);
  };

  const handleFilterSelect = (filterType) => {
    onFilterOptions(filterType);
    handleFilterClose();
  };

  // Helper to safely get slice data with fallbacks
  const getSafeSliceData = (flight, sliceIndex) => {
    if (!flight || !flight.slices || !flight.slices[sliceIndex]) {
      return {
        origin: { iataCode: 'N/A', cityName: 'Unknown' },
        destination: { iataCode: 'N/A', cityName: 'Unknown' },
        departureDateTime: null,
        arrivalDateTime: null,
        duration: '',
        segments: []
      };
    }
    return flight.slices[sliceIndex];
  };

  // Helper to safely get segment data
  const getSafeSegments = (slice) => {
    return slice && slice.segments ? slice.segments : [];
  };

  const renderFlightCard = (flight, index) => {
    if (!flight || !flight.slices || flight.slices.length === 0) {
      console.error('Invalid flight data:', flight);
      return null;
    }

    const badge = getBadgeInfo(index);
    const isExpanded = expandedFlightId === flight.id;
    
    // Get first slice safely with fallbacks
    const firstSlice = getSafeSliceData(flight, 0);
    
    return (
      <Card
        key={flight.id}
        sx={{
          height: '100%',
          position: 'relative',
          transition: 'all 0.2s ease',
          cursor: 'pointer',
          display: 'flex',
          flexDirection: 'column',
          '&:hover': {
            transform: 'translateY(-4px)',
            boxShadow: '0 12px 24px -10px rgba(79, 70, 229, 0.2)',
          }
        }}
      >
        {badge && (
          <Chip
            icon={badge.icon}
            label={badge.text}
            color={badge.color}
            size="small"
            sx={{
              position: 'absolute',
              top: 16,
              right: 16,
              fontWeight: 600,
              zIndex: 1,
            }}
          />
        )}
        
        <CardContent sx={{ p: 3, flexGrow: 1 }}>
          {/* Flight Header with Price */}
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
            <Typography variant="h5" fontWeight="bold" color="primary">
              {flight.totalCurrency} {flight.totalAmount}
            </Typography>
            <Typography variant="subtitle2" color="text.secondary">
              {flight.cabinClass || 'Economy'}
            </Typography>
          </Box>

          {/* Main Flight Info */}
          <Box>
              <Stack spacing={2}>
                {/* Origin to Destination */}
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <Typography variant="h6" fontWeight="bold">
                    {firstSlice.origin?.iataCode || 'N/A'}
                  </Typography>
                  <Box sx={{ flex: 1, height: 2, mx: 1, bgcolor: 'divider', position: 'relative' }}>
                    <FlightTakeoffIcon
                      sx={{
                        position: 'absolute',
                        top: '50%',
                        left: '50%',
                        transform: 'translate(-50%, -50%)',
                        fontSize: 20,
                        color: 'primary.main',
                        bgcolor: 'background.paper',
                        p: 0.5,
                        borderRadius: '50%',
                      }}
                    />
                  </Box>
                  <Typography variant="h6" fontWeight="bold">
                    {firstSlice.destination?.iataCode || 'N/A'}
                  </Typography>
                </Box>

                {/* Times and Duration */}
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <Box>
                    <Typography variant="h6" fontWeight="medium">
                      {firstSlice.departureDateTime ? formatTime(firstSlice.departureDateTime) : 'N/A'}
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      {firstSlice.departureDateTime ? formatDate(firstSlice.departureDateTime) : 'N/A'}
                    </Typography>
                  </Box>
                  <Box sx={{ textAlign: 'center' }}>
                    <Typography variant="body2" color="text.secondary">
                      {formatDuration(firstSlice.duration)}
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      {getSafeSegments(firstSlice).length === 1 ? 'Direct' : `${getSafeSegments(firstSlice).length - 1} Stop${getSafeSegments(firstSlice).length > 2 ? 's' : ''}`}
                    </Typography>
                  </Box>
                  <Box sx={{ textAlign: 'right' }}>
                    <Typography variant="h6" fontWeight="medium">
                      {firstSlice.arrivalDateTime ? formatTime(firstSlice.arrivalDateTime) : 'N/A'}
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      {firstSlice.arrivalDateTime ? formatDate(firstSlice.arrivalDateTime) : 'N/A'}
                    </Typography>
                  </Box>
                </Box>

                {/* Return flight summary (if exists) */}
                {flight.slices && flight.slices.length > 1 && (
                  <>
                    <Divider sx={{ my: 1 }} />
                    {/* Get return slice safely */}
                    {(() => {
                      const returnSlice = getSafeSliceData(flight, 1);
                      return (
                        <>
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                            <Typography variant="h6" fontWeight="bold">
                              {returnSlice.origin?.iataCode || 'N/A'}
                            </Typography>
                            <Box sx={{ flex: 1, height: 2, mx: 1, bgcolor: 'divider', position: 'relative' }}>
                              <FlightLandIcon
                                sx={{
                                  position: 'absolute',
                                  top: '50%',
                                  left: '50%',
                                  transform: 'translate(-50%, -50%) rotate(180deg)',
                                  fontSize: 20,
                                  color: 'primary.main',
                                  bgcolor: 'background.paper',
                                  p: 0.5,
                                  borderRadius: '50%',
                                }}
                              />
                            </Box>
                            <Typography variant="h6" fontWeight="bold">
                              {returnSlice.destination?.iataCode || 'N/A'}
                            </Typography>
                          </Box>

                          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <Typography variant="subtitle2">
                              {returnSlice.departureDateTime ? formatTime(returnSlice.departureDateTime) : 'N/A'}
                            </Typography>
                            <Typography variant="body2" color="text.secondary">
                              {formatDuration(returnSlice.duration)}
                            </Typography>
                            <Typography variant="subtitle2">
                              {returnSlice.arrivalDateTime ? formatTime(returnSlice.arrivalDateTime) : 'N/A'}
                            </Typography>
                          </Box>
                        </>
                      );
                    })()}
                  </>
                )}
              </Stack>
          </Box>

          {/* Flight info chips */}
          <Stack direction="row" spacing={1} sx={{ mt: 2, mb: 2, flexWrap: 'wrap', gap: 1 }}>
            {getSafeSegments(firstSlice).map((segment, i) => (
              <Chip
                key={i}
                label={segment?.airline?.name || 'Unknown Airline'}
                variant="outlined"
                size="small"
                icon={<AirlineIcon sx={{ fontSize: 16 }} />}
                sx={{ fontWeight: 500 }}
              />
            ))}
            
            {flight.baggageAllowance && (
              <Tooltip title="Baggage allowance">
                <Chip
                  icon={<LuggageIcon sx={{ fontSize: 16 }} />}
                  label={`${flight.baggageAllowance[0]?.quantity || 1} bag${flight.baggageAllowance[0]?.quantity > 1 ? 's' : ''}`}
                  size="small"
                  variant="outlined"
                />
              </Tooltip>
            )}
            
            <Tooltip title={flight.conditions?.refundable ? "Refundable" : "Non-refundable"}>
              <Chip
                icon={flight.conditions?.refundable ? <CheckCircleIcon sx={{ fontSize: 16 }} /> : <CancelIcon sx={{ fontSize: 16 }} />}
                label={flight.conditions?.refundable ? "Refundable" : "Non-refundable"}
                size="small"
                variant="outlined"
                color={flight.conditions?.refundable ? "success" : "error"}
              />
            </Tooltip>
          </Stack>

          {/* Expand/Collapse Detail Section */}
          <Collapse in={isExpanded} timeout="auto" unmountOnExit>
            <Divider sx={{ my: 2 }} />
            <Box sx={{ mt: 2 }}>
              <Typography variant="subtitle1" fontWeight="bold" gutterBottom>
                Flight Details
              </Typography>
              
              {flight.slices && flight.slices.map((slice, sliceIndex) => (
                <Box key={sliceIndex} sx={{ mb: 2 }}>
                  <Typography variant="subtitle2" color="text.secondary" fontWeight="medium" gutterBottom>
                    {sliceIndex === 0 ? 'Outbound' : 'Return'} Journey
                  </Typography>
                  
                  {getSafeSegments(slice).map((segment, i) => (
                    <Paper key={i} variant="outlined" sx={{ p: 2, mb: 1 }}>
                      <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                        <Box>
                          <Typography variant="body2" fontWeight="bold">
                            {segment?.airline?.name || 'Unknown Airline'} {segment?.flightNumber || ''}
                          </Typography>
                          <Typography variant="caption" color="text.secondary">
                            {segment?.departureTime ? formatDate(segment.departureTime) : 'N/A'}
                          </Typography>
                        </Box>
                        <Box>
                          <Typography variant="body2" color="text.secondary">
                            Duration: {formatDuration(segment?.duration || '')}
                          </Typography>
                        </Box>
                      </Box>
                      
                      <Box sx={{ display: 'flex', alignItems: 'center', mt: 2 }}>
                        <Box sx={{ textAlign: 'center', width: 80 }}>
                          <Typography variant="body2" fontWeight="bold">
                            {segment?.departureTime ? formatTime(segment.departureTime) : 'N/A'}
                          </Typography>
                          <Typography variant="caption" display="block">
                            {segment?.departureAirport?.iataCode || 'N/A'}
                          </Typography>
                          <Typography variant="caption" color="text.secondary">
                            {segment?.departureAirport?.name || 'Unknown'}
                          </Typography>
                        </Box>
                        
                        <Box sx={{ flex: 1, mx: 2, height: 2, bgcolor: 'divider', position: 'relative' }}>
                          <FlightTakeoffIcon
                            sx={{
                              position: 'absolute',
                              top: '50%',
                              left: '50%',
                              transform: 'translate(-50%, -50%)',
                              fontSize: 16,
                              color: 'primary.main',
                              bgcolor: 'background.paper',
                              p: 0.5,
                              borderRadius: '50%',
                            }}
                          />
                        </Box>
                        
                        <Box sx={{ textAlign: 'center', width: 80 }}>
                          <Typography variant="body2" fontWeight="bold">
                            {segment?.arrivalTime ? formatTime(segment.arrivalTime) : 'N/A'}
                          </Typography>
                          <Typography variant="caption" display="block">
                            {segment?.arrivalAirport?.iataCode || 'N/A'}
                          </Typography>
                          <Typography variant="caption" color="text.secondary">
                            {segment?.arrivalAirport?.name || 'Unknown'}
                          </Typography>
                        </Box>
                      </Box>
                    </Paper>
                  ))}
                </Box>
              ))}
            </Box>
          </Collapse>

          {/* Select Button & Expand Details */}
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mt: 'auto', pt: 2 }}>
            <Button
              variant="outlined"
              size="small"
              onClick={() => handleExpandClick(flight.id)}
              endIcon={<ExpandMoreIcon sx={{ transform: isExpanded ? 'rotate(180deg)' : 'rotate(0deg)', transition: 'transform 0.2s' }} />}
            >
              {isExpanded ? 'Hide Details' : 'View Details'}
            </Button>
            <Button
              variant="contained"
              color="primary"
              onClick={() => onSelect(flight.id)}
              disabled={loading}
            >
              Select
            </Button>
          </Box>
        </CardContent>
      </Card>
    );
  };

  return (
    <Box sx={{ my: 3 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h6" fontWeight="bold">
          {flights.length} Flight Options Found
        </Typography>
        <Stack direction="row" spacing={2}>
          <Button
            variant="outlined"
            startIcon={<FilterListIcon />}
            onClick={handleFilterClick}
            size="small"
          >
            Filter Options
          </Button>
          <Menu
            anchorEl={anchorEl}
            open={open}
            onClose={handleFilterClose}
            anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
            transformOrigin={{ vertical: 'top', horizontal: 'right' }}
          >
            <MenuItem onClick={() => handleFilterSelect('morning')}>
              <AccessTimeFilledIcon sx={{ mr: 1, fontSize: 18 }} />
              Morning Flights
            </MenuItem>
            <MenuItem onClick={() => handleFilterSelect('afternoon')}>
              <AccessTimeFilledIcon sx={{ mr: 1, fontSize: 18 }} />
              Afternoon Flights
            </MenuItem>
            <MenuItem onClick={() => handleFilterSelect('evening')}>
              <NightlightIcon sx={{ mr: 1, fontSize: 18 }} />
              Evening/Red-eye Flights
            </MenuItem>
            <MenuItem onClick={() => handleFilterSelect('direct')}>
              <FlightTakeoffIcon sx={{ mr: 1, fontSize: 18 }} />
              Direct Flights Only
            </MenuItem>
            <MenuItem onClick={() => handleFilterSelect('cheaper')}>
              <AttachMoneyIcon sx={{ mr: 1, fontSize: 18 }} />
              Cheaper Options
            </MenuItem>
            <MenuItem onClick={() => handleFilterSelect('shorter')}>
              <SpeedIcon sx={{ mr: 1, fontSize: 18 }} />
              Shorter Flight Time
            </MenuItem>
            <Divider />
            <MenuItem dense>
              <Typography variant="caption" color="text.secondary">
                Or type preferences in chat...
              </Typography>
            </MenuItem>
          </Menu>
        </Stack>
      </Box>

      {/* Flight Cards */}
      <Grid container spacing={3}>
        {flights.map((flight, index) => (
          <Grid item xs={12} md={4} key={flight?.id || index}>
            {renderFlightCard(flight, index)}
          </Grid>
        ))}
      </Grid>

      {/* Load More Button */}
      <Box sx={{ textAlign: 'center', mt: 4 }}>
        <Button
          variant="outlined"
          color="primary"
          onClick={onLoadMore}
          startIcon={<MoreHorizIcon />}
          disabled={loading}
          size="large"
          sx={{ px: 4 }}
        >
          Show More Options
        </Button>
        <Typography variant="caption" color="text.secondary" display="block" sx={{ mt: 1 }}>
          Want something specific? Just ask in the chat!
        </Typography>
      </Box>
    </Box>
  );
};

export default FlightResults;