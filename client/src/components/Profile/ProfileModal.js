// client/src/components/Profile/ProfileModal.js
import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogTitle,
  IconButton,
  Box,
  Typography,
  Divider,
  Tabs,
  Tab,
  CircularProgress,
  Alert
} from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import PersonIcon from '@mui/icons-material/Person';
import FlightIcon from '@mui/icons-material/Flight';
import { useAuth } from '../../contexts/AuthContext';
import { useUser } from '../../contexts/UserContext';
import ProfileForm from './ProfileForm';
import BookingsList from './BookingsList';

const ProfileModal = ({ open, onClose }) => {
  const [activeTab, setActiveTab] = useState(0);
  const { user, isAuthenticated } = useAuth();
  const { userProfile, bookings, loading, error, fetchBookings } = useUser();
  const [localBookings, setLocalBookings] = useState([]);
  const [isLoadingBookings, setIsLoadingBookings] = useState(false);
  const [hasLoadedBookings, setHasLoadedBookings] = useState(false);

  // Load bookings once when modal opens
  useEffect(() => {
    if (open && isAuthenticated && !hasLoadedBookings) {
      const loadBookings = async () => {
        try {
          setIsLoadingBookings(true);
          const fetchedBookings = await fetchBookings();
          setLocalBookings(fetchedBookings || []);
          setHasLoadedBookings(true);
        } catch (err) {
          console.error('Error loading bookings:', err);
        } finally {
          setIsLoadingBookings(false);
        }
      };
      
      loadBookings();
    }
  }, [open, isAuthenticated, hasLoadedBookings]);

  // Reset state when modal closes
  useEffect(() => {
    if (!open) {
      setHasLoadedBookings(false);
      setActiveTab(0);
      setLocalBookings([]);
    }
  }, [open]);

  const handleTabChange = (event, newValue) => {
    setActiveTab(newValue);
  };

  const handleSuccessfulUpdate = () => {
    // Show success message or additional actions on profile update
  };

  if (!isAuthenticated) {
    return null; // Don't show modal if not authenticated
  }

  return (
    <Dialog 
      open={open} 
      onClose={onClose}
      maxWidth="md"
      fullWidth
      PaperProps={{
        sx: {
          borderRadius: 3,
          overflow: 'hidden'
        }
      }}
    >
      <DialogTitle sx={{ p: 3, bgcolor: 'background.paper' }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Typography variant="h6" fontWeight="bold">
            My Account
          </Typography>
          <IconButton onClick={onClose} aria-label="close" edge="end">
            <CloseIcon />
          </IconButton>
        </Box>
      </DialogTitle>
      
      <Divider />
      
      <Tabs
        value={activeTab}
        onChange={handleTabChange}
        variant="fullWidth"
        sx={{ 
          borderBottom: 1, 
          borderColor: 'divider',
          '& .MuiTab-root': {
            py: 2,
            fontWeight: 600
          }
        }}
      >
        <Tab 
          label="Profile" 
          icon={<PersonIcon />} 
          iconPosition="start"
        />
        <Tab 
          label="My Bookings" 
          icon={<FlightIcon />} 
          iconPosition="start"
        />
      </Tabs>
      
      <DialogContent sx={{ p: 4, bgcolor: 'background.paper' }}>
        {activeTab === 0 && (
          <ProfileForm 
            initialData={userProfile || user} 
            onSuccess={handleSuccessfulUpdate}
          />
        )}
        
        {activeTab === 1 && (
          <>
            {isLoadingBookings ? (
              <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}>
                <CircularProgress />
              </Box>
            ) : error ? (
              <Alert severity="error" sx={{ mb: 3 }}>
                {error}
              </Alert>
            ) : (
              <BookingsList 
                bookings={localBookings} 
                onRefresh={async () => {
                  setIsLoadingBookings(true);
                  try {
                    const refreshedBookings = await fetchBookings();
                    setLocalBookings(refreshedBookings || []);
                  } catch (err) {
                    console.error('Error refreshing bookings:', err);
                  } finally {
                    setIsLoadingBookings(false);
                  }
                }}
              />
            )}
          </>
        )}
      </DialogContent>
    </Dialog>
  );
};

export default ProfileModal;