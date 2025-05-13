// client/src/contexts/UserContext.js
import React, { createContext, useState, useContext, useEffect, useCallback } from 'react';
import api from '../services/api';
import { useAuth } from './AuthContext';

const UserContext = createContext();

export const useUser = () => useContext(UserContext);

export const UserProvider = ({ children }) => {
  const [userProfile, setUserProfile] = useState(null);
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const { isAuthenticated, user } = useAuth();

  // Fetch user profile when authenticate
  useEffect(() => {
    const fetchUserProfile = async () => {
      if (isAuthenticated && user) {
        setLoading(true);
        try {
          const res = await api.get('/users/profile');
          
          if (res.data.success) {
            setUserProfile(res.data.data);
          }
          setError(null);
        } catch (err) {
          console.error('Error fetching user profile:', err);
          setError('Failed to load profile data');
        } finally {
          setLoading(false);
        }
      } else {
        // Reset state when logged out
        setUserProfile(null);
        setBookings([]);
      }
    };
    
    fetchUserProfile();
  }, [isAuthenticated, user]);

  // Update user profile
  const updateProfile = async (profileData) => {
    setLoading(true);
    setError(null);
    try {
      const res = await api.put('/users/profile', profileData);
      
      if (res.data.success) {
        setUserProfile(res.data.data);
        return res.data.data;
      }
    } catch (err) {
      console.error('Error updating profile:', err);
      const errorMessage = err.response?.data?.message || 'Failed to update profile';
      setError(errorMessage);
      throw new Error(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  // Fetch user bookings - Updated to use the correct endpoint
  const fetchBookings = useCallback(async () => {
    if (!isAuthenticated) {
      console.warn('Cannot fetch bookings: User not authenticated');
      return [];
    }

    setLoading(true);
    setError(null);
    try {
      const res = await api.get('/users/bookings');
      
      if (res.data.success) {
        const fetchedBookings = res.data.data || res.data.bookings || [];
        setBookings(fetchedBookings);
        return fetchedBookings;
      }
      return [];
    } catch (err) {
      console.error('Error fetching bookings:', err);
      const errorMessage = err.response?.data?.message || 'Failed to load bookings';
      setError(errorMessage);
      throw new Error(errorMessage);
    } finally {
      setLoading(false);
    }
  }, [isAuthenticated]);

  // Get single booking
  const getBooking = async (bookingId) => {
    setLoading(true);
    setError(null);
    try {
      const res = await api.get(`/users/bookings/${bookingId}`);
      
      if (res.data.success) {
        return res.data.data;
      }
    } catch (err) {
      console.error('Error fetching booking:', err);
      const errorMessage = err.response?.data?.message || 'Failed to load booking details';
      setError(errorMessage);
      throw new Error(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  // Cancel booking
  const cancelBooking = async (bookingId, reason) => {
    setLoading(true);
    setError(null);
    try {
      const res = await api.put(`/users/bookings/${bookingId}/cancel`, { reason });
      
      if (res.data.success) {
        // Update bookings list
        setBookings(prevBookings => 
          prevBookings.map(booking => 
            booking._id === bookingId 
              ? { ...booking, status: 'cancelled' } 
              : booking
          )
        );
        
        return res.data.data;
      }
    } catch (err) {
      console.error('Error cancelling booking:', err);
      const errorMessage = err.response?.data?.message || 'Failed to cancel booking';
      setError(errorMessage);
      throw new Error(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  return (
    <UserContext.Provider 
      value={{
        userProfile,
        bookings,
        loading,
        error,
        updateProfile,
        fetchBookings,
        getBooking,
        cancelBooking
      }}
    >
      {children}
    </UserContext.Provider>
  );
};

export default UserContext;