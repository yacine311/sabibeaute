// Configuration Backend (remplace les appels Firebase directs)
const API_BASE = window.location.hostname === 'localhost' 
  ? 'http://localhost:3001/api'
  : '/.netlify/functions';

// Classe pour gérer les API calls
class BookingAPI {
  static getStoredCsrfToken() {
    const token = sessionStorage.getItem('csrfToken');
    const expires = Number(sessionStorage.getItem('csrfTokenExpires'));
    if (token && expires && Date.now() < expires) {
      return token;
    }
    return null;
  }

  static async getCsrfToken() {
    try {
      const response = await fetch(`${API_BASE}/csrf`);
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Impossible de récupérer CSRF token');
      }
      const data = await response.json();
      sessionStorage.setItem('csrfToken', data.token);
      sessionStorage.setItem('csrfTokenExpires', (Date.now() + (data.expiresIn * 1000)).toString());
      return data;
    } catch (error) {
      console.error('Erreur API CSRF:', error);
      throw error;
    }
  }

  static async ensureCsrfToken() {
    const storedToken = BookingAPI.getStoredCsrfToken();
    if (storedToken) {
      return storedToken;
    }
    const data = await BookingAPI.getCsrfToken();
    return data.token;
  }

  static async createBooking(bookingData, csrfToken) {
    try {
      const token = csrfToken || await BookingAPI.ensureCsrfToken();
      const response = await fetch(`${API_BASE}/bookings`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-CSRF-Token': token
        },
        body: JSON.stringify(bookingData)
      });
      
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Erreur lors de la création');
      }
      
      return await response.json();
    } catch (error) {
      console.error('Erreur API:', error);
      throw error;
    }
  }
  
  static async getBookings() {
    try {
      const response = await fetch(`${API_BASE}/bookings`);
      if (!response.ok) throw new Error('Erreur lors de la lecture');
      return await response.json();
    } catch (error) {
      console.error('Erreur API:', error);
      return [];
    }
  }
  
  static async deleteBooking(id, adminToken, csrfToken) {
    try {
      const token = csrfToken || await BookingAPI.ensureCsrfToken();
      const response = await fetch(`${API_BASE}/bookings/${id}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${adminToken}`,
          'Content-Type': 'application/json',
          'X-CSRF-Token': token
        }
      });
      
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Erreur suppression');
      }
      
      return await response.json();
    } catch (error) {
      console.error('Erreur API:', error);
      throw error;
    }
  }
  
  static async adminLogin(username, password) {
    try {
      const response = await fetch(`${API_BASE}/admin/login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ username, password })
      });
      
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Erreur authentification');
      }
      
      return await response.json();
    } catch (error) {
      console.error('Erreur API:', error);
      throw error;
    }
  }
  
  static async getSettings() {
    try {
      const response = await fetch(`${API_BASE}/settings/hours`);
      if (!response.ok) throw new Error('Erreur lecture paramètres');
      return await response.json();
    } catch (error) {
      console.error('Erreur API:', error);
      return {};
    }
  }
  
  static async updateSettings(settings, adminToken, csrfToken) {
    try {
      const token = csrfToken || await BookingAPI.ensureCsrfToken();
      const response = await fetch(`${API_BASE}/settings/hours`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${adminToken}`,
          'Content-Type': 'application/json',
          'X-CSRF-Token': token
        },
        body: JSON.stringify(settings)
      });
      
      if (!response.ok) throw new Error('Erreur sauvegarde');
      return await response.json();
    } catch (error) {
      console.error('Erreur API:', error);
      throw error;
    }
  }
}

// Exporter pour utiliser dans booking-script.js
window.BookingAPI = BookingAPI;
