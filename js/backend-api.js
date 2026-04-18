/**
 * Smart Resource Booking System - Backend API Layer
 * 
 * IMPORTANT: This extends the system with optional backend support
 * Frontend continues to work with localStorage as fallback
 * 
 * If backend is available: Use database
 * If backend is unavailable: Use localStorage automatically
 */

const BackendAPI = {
    // Configuration
    API_URL: 'http://localhost:5000/api',
    token: localStorage.getItem('apiToken') || null,
    isBackendAvailable: false,

    /**
     * Initialize backend connection
     */
    async init() {
        try {
            const response = await fetch(`${this.API_URL}/health`);
            const data = await response.json();
            this.isBackendAvailable = data.success;
            console.log(this.isBackendAvailable ? '✅ Backend connected' : '⚠️  Backend unavailable (using localStorage)');
        } catch (err) {
            this.isBackendAvailable = false;
            console.warn('⚠️  Backend unavailable (using localStorage as fallback)');
        }
    },

    /**
     * Set JWT token from login response
     */
    setToken(token) {
        this.token = token;
        localStorage.setItem('apiToken', token);
    },

    /**
     * Get headers for API requests
     */
    getHeaders() {
        return {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${this.token}`
        };
    },

    // ============================================
    // AUTHENTICATION APIs
    // ============================================

    /**
     * Login with backend
     */
    async login(email, password) {
        if (!this.isBackendAvailable) {
            // Fallback: Accept any credentials for demo
            return {
                success: true,
                message: 'Login successful (localStorage mode)',
                token: 'local-token-' + Date.now(),
                user: {
                    email,
                    role: 'student',
                    name: email.split('@')[0]
                }
            };
        }

        try {
            const response = await fetch(`${this.API_URL}/auth/login`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email, password })
            });

            const data = await response.json();

            if (data.success) {
                this.setToken(data.token);
            }

            return data;
        } catch (err) {
            console.error('Backend login failed, using localStorage:', err);
            // Fallback
            return {
                success: true,
                message: 'Login successful (localStorage fallback)',
                token: 'local-token-' + Date.now(),
                user: {
                    email,
                    role: 'student',
                    name: email.split('@')[0]
                }
            };
        }
    },

    /**
     * Select role with backend
     */
    async selectRole(role) {
        if (!this.isBackendAvailable) {
            return {
                success: true,
                message: 'Role selected (localStorage mode)',
                token: this.token
            };
        }

        try {
            const response = await fetch(`${this.API_URL}/auth/select-role`, {
                method: 'POST',
                headers: this.getHeaders(),
                body: JSON.stringify({ role })
            });

            const data = await response.json();

            if (data.success) {
                this.setToken(data.token);
            }

            return data;
        } catch (err) {
            console.error('Backend role selection failed, using localStorage:', err);
            return {
                success: true,
                message: 'Role selected (localStorage fallback)',
                token: this.token
            };
        }
    },

    // ============================================
    // BOOKING APIs
    // ============================================

    /**
     * Create booking with priority support
     */
    async createBooking(bookingData) {
        if (!this.isBackendAvailable) {
            return {
                success: true,
                message: 'Booking confirmed (localStorage mode)',
                shouldUseFallback: true,
                booking: bookingData
            };
        }

        try {
            const response = await fetch(`${this.API_URL}/bookings/create`, {
                method: 'POST',
                headers: this.getHeaders(),
                body: JSON.stringify(bookingData)
            });

            const data = await response.json();
            return data;
        } catch (err) {
            console.error('Backend booking failed, using localStorage:', err);
            return {
                success: true,
                message: 'Booking confirmed (localStorage fallback)',
                shouldUseFallback: true,
                booking: bookingData
            };
        }
    },

    /**
     * Get user's bookings
     */
    async getMyBookings() {
        if (!this.isBackendAvailable) {
            return {
                success: true,
                bookings: BookingSystem.getUserBookings(Auth.getUser().email),
                fromStorage: 'localStorage'
            };
        }

        try {
            const response = await fetch(`${this.API_URL}/bookings/my-bookings`, {
                headers: this.getHeaders()
            });

            const data = await response.json();
            return data;
        } catch (err) {
            console.error('Failed to fetch bookings from backend:', err);
            return {
                success: true,
                bookings: BookingSystem.getUserBookings(Auth.getUser().email),
                fromStorage: 'localStorage'
            };
        }
    },

    /**
     * Get all bookings (admin only)
     */
    async getAllBookings() {
        if (!this.isBackendAvailable) {
            return {
                success: true,
                bookings: BookingSystem.getAllBookings(),
                fromStorage: 'localStorage'
            };
        }

        try {
            const response = await fetch(`${this.API_URL}/bookings/all`, {
                headers: this.getHeaders()
            });

            const data = await response.json();
            return data;
        } catch (err) {
            console.error('Failed to fetch bookings from backend:', err);
            return {
                success: true,
                bookings: BookingSystem.getAllBookings(),
                fromStorage: 'localStorage'
            };
        }
    },

    /**
     * Cancel booking
     */
    async cancelBooking(bookingId) {
        if (!this.isBackendAvailable) {
            return {
                success: true,
                message: 'Booking cancelled (localStorage mode)',
                shouldUseFallback: true
            };
        }

        try {
            const response = await fetch(`${this.API_URL}/bookings/${bookingId}`, {
                method: 'DELETE',
                headers: this.getHeaders()
            });

            const data = await response.json();
            return data;
        } catch (err) {
            console.error('Failed to cancel booking from backend:', err);
            return {
                success: true,
                message: 'Booking cancelled (localStorage fallback)',
                shouldUseFallback: true
            };
        }
    },

    // ============================================
    // COMPLAINT APIs
    // ============================================

    /**
     * Create complaint
     */
    async createComplaint(complaintData) {
        if (!this.isBackendAvailable) {
            return {
                success: true,
                message: 'Complaint submitted (localStorage mode)',
                complaint: { ...complaintData, _id: 'local-' + Date.now() }
            };
        }

        try {
            const response = await fetch(`${this.API_URL}/complaints/create`, {
                method: 'POST',
                headers: this.getHeaders(),
                body: JSON.stringify(complaintData)
            });

            const data = await response.json();
            return data;
        } catch (err) {
            console.error('Failed to submit complaint:', err);
            return {
                success: true,
                message: 'Complaint submitted (localStorage fallback)',
                complaint: { ...complaintData, _id: 'local-' + Date.now() }
            };
        }
    },

    /**
     * Get user's complaints
     */
    async getMyComplaints() {
        if (!this.isBackendAvailable) {
            const complaints = Storage.get('complaints', []);
            const userEmail = Auth.getUser().email;
            return {
                success: true,
                complaints: complaints.filter(c => c.userEmail === userEmail)
            };
        }

        try {
            const response = await fetch(`${this.API_URL}/complaints/my-complaints`, {
                headers: this.getHeaders()
            });

            const data = await response.json();
            return data;
        } catch (err) {
            console.error('Failed to fetch complaints:', err);
            const complaints = Storage.get('complaints', []);
            return {
                success: true,
                complaints: complaints.filter(c => c.userEmail === Auth.getUser().email)
            };
        }
    },

    /**
     * Get all complaints (admin only)
     */
    async getAllComplaints() {
        if (!this.isBackendAvailable) {
            return {
                success: true,
                complaints: Storage.get('complaints', [])
            };
        }

        try {
            const response = await fetch(`${this.API_URL}/complaints/all`, {
                headers: this.getHeaders()
            });

            const data = await response.json();
            return data;
        } catch (err) {
            console.error('Failed to fetch complaints:', err);
            return {
                success: true,
                complaints: Storage.get('complaints', [])
            };
        }
    },

    /**
     * Update complaint status (admin only)
     */
    async updateComplaintStatus(complaintId, status, adminNotes = '') {
        if (!this.isBackendAvailable) {
            // Update in localStorage
            const complaints = Storage.get('complaints', []);
            const complaint = complaints.find(c => c._id === complaintId);
            if (complaint) {
                complaint.status = status;
                complaint.adminNotes = adminNotes;
                complaint.updatedAt = new Date().toISOString();
                Storage.set('complaints', complaints);
            }
            return { success: true, message: 'Status updated' };
        }

        try {
            const response = await fetch(`${this.API_URL}/complaints/${complaintId}/status`, {
                method: 'PUT',
                headers: this.getHeaders(),
                body: JSON.stringify({ status, adminNotes })
            });

            const data = await response.json();
            return data;
        } catch (err) {
            console.error('Failed to update complaint status:', err);
            return { success: false, message: 'Update failed' };
        }
    }
};

/**
 * Initialize backend on page load
 */
document.addEventListener('DOMContentLoaded', () => {
    BackendAPI.init();
});
