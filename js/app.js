/**
 * Smart Resource Booking System
 * Core Application Logic
 * 
 * IMPORTANT: This file ensures NO redirect loops, NO crashes, and NO undefined behavior
 */

// ============================================
// UTILITY: localStorage with Safety Checks
// ============================================

const Storage = {
    /**
     * Safely set a value in localStorage
     */
    set(key, value) {
        try {
            if (value === undefined || value === null) {
                localStorage.removeItem(key);
            } else {
                localStorage.setItem(key, JSON.stringify(value));
            }
            return true;
        } catch (error) {
            console.error(`Error setting localStorage[${key}]:`, error);
            return false;
        }
    },

    /**
     * Safely get a value from localStorage
     */
    get(key, defaultValue = null) {
        try {
            const value = localStorage.getItem(key);
            if (value === null) return defaultValue;
            return JSON.parse(value);
        } catch (error) {
            console.error(`Error getting localStorage[${key}]:`, error);
            return defaultValue;
        }
    },

    /**
     * Check if a key exists
     */
    has(key) {
        try {
            return localStorage.getItem(key) !== null;
        } catch (error) {
            return false;
        }
    },

    /**
     * Remove a key
     */
    remove(key) {
        try {
            localStorage.removeItem(key);
            return true;
        } catch (error) {
            console.error(`Error removing localStorage[${key}]:`, error);
            return false;
        }
    },

    /**
     * Clear all data
     */
    clear() {
        try {
            localStorage.clear();
            return true;
        } catch (error) {
            console.error('Error clearing localStorage:', error);
            return false;
        }
    }
};

// ============================================
// UTILITY: Authentication & State Management
// ============================================

const Auth = {
    /**
     * Check if user is logged in
     */
    isLoggedIn() {
        return Storage.get('isLoggedIn', false) === true;
    },

    /**
     * Get current user role
     */
    getRole() {
        return Storage.get('role', null);
    },

    /**
     * Get current user data
     */
    getUser() {
        return Storage.get('user', null);
    },

    /**
     * Login user
     */
    login(email, password) {
        // Simple validation (no backend required)
        if (!email || !password) {
            return { success: false, message: 'Email and password are required' };
        }

        // In production, this would validate against a backend
        // For now, we accept any email/password combination
        Storage.set('isLoggedIn', true);
        Storage.set('user', {
            email: email,
            loginTime: new Date().toISOString()
        });

        return { success: true, message: 'Login successful' };
    },

    /**
     * Select role
     */
    selectRole(role) {
        const validRoles = ['student', 'teacher', 'admin'];
        if (!validRoles.includes(role)) {
            return { success: false, message: 'Invalid role' };
        }

        Storage.set('role', role);
        return { success: true, message: 'Role selected' };
    },

    /**
     * Logout user
     */
    logout() {
        Storage.remove('isLoggedIn');
        Storage.remove('role');
        Storage.remove('user');
        Storage.remove('currentBooking');
        // NOTE: Do NOT remove bookings - they are system-wide data, not user-specific
        return { success: true, message: 'Logged out successfully' };
    }
};

// ============================================
// UTILITY: Navigation (NO LOOPS)
// ============================================

const Nav = {
    /**
     * Redirect to a page ONLY ONCE (prevent loops)
     * This function checks current location to prevent unnecessary redirects
     */
    goto(page) {
        const currentPage = window.location.pathname.split('/').pop() || 'index.html';
        const targetPage = page.split('/').pop();

        // Don't redirect if already on the target page
        if (currentPage === targetPage) {
            console.log(`Already on ${targetPage}, skipping redirect`);
            return;
        }

        // Use replace() instead of assign() to prevent back button issues
        window.location.replace(page);
    },

    /**
     * Safe redirect based on auth state
     * This ensures users can't get stuck in redirect loops
     */
    enforceAuth() {
        const currentPage = window.location.pathname.split('/').pop() || 'index.html';
        
        // If on login page, let it load
        if (currentPage === 'index.html' || currentPage === '') {
            return;
        }

        // If not logged in, must go to login
        if (!Auth.isLoggedIn()) {
            this.goto('index.html');
            return;
        }

        // If logged in but no role, must select role
        if (!Auth.getRole()) {
            if (currentPage !== 'role.html') {
                this.goto('role.html');
            }
            return;
        }

        // If has role, enforce role-based access
        this.enforceRoleAccess();
    },

    /**
     * Enforce role-based access control
     */
    enforceRoleAccess() {
        const role = Auth.getRole();
        const currentPage = window.location.pathname.split('/').pop() || 'index.html';

        const validPages = {
            'student': ['student.html', 'booking.html'],
            'teacher': ['teacher.html', 'booking.html'],
            'admin': ['admin.html', 'booking.html']
        };

        // Check if current page is allowed for user's role
        if (validPages[role] && !validPages[role].includes(currentPage)) {
            // Redirect to correct dashboard
            const dashboards = {
                'student': 'student.html',
                'teacher': 'teacher.html',
                'admin': 'admin.html'
            };
            this.goto(dashboards[role]);
        }
    }
};

// ============================================
// UTILITY: Booking System
// ============================================

const BookingSystem = {
    // Resource definitions
    RESOURCES: {
        'medical-room': {
            name: 'Medical Room',
            type: 'medical',
            slots: 8,
            description: 'Equipped for medical consultations'
        },
        'meeting-room': {
            name: 'Meeting Room',
            type: 'meeting',
            slots: 6,
            description: 'Standard conference room'
        },
        'lab': {
            name: 'Laboratory',
            type: 'lab',
            slots: 4,
            description: 'Science lab with equipment'
        },
        'auditorium': {
            name: 'Auditorium',
            type: 'auditorium',
            slots: 10,
            description: 'Large lecture hall'
        }
    },

    /**
     * Get all resources accessible by role
     */
    getAccessibleResources(role) {
        const allResources = this.RESOURCES;

        if (role === 'student') {
            // Students can only access medical and meeting rooms
            return {
                'medical-room': allResources['medical-room'],
                'meeting-room': allResources['meeting-room']
            };
        }

        // Teachers and admins can access all resources
        return allResources;
    },

    /**
     * Get time slots for a resource on a specific date
     */
    getTimeSlots(resourceId, date) {
        const resource = this.RESOURCES[resourceId];
        if (!resource) return [];

        const slots = [];
        const slotDuration = 60; // 60 minutes per slot

        for (let i = 0; i < resource.slots; i++) {
            const hour = 9 + i; // Starting at 9:00 AM
            slots.push({
                id: `${date}-${resourceId}-${i}`,
                time: `${String(hour).padStart(2, '0')}:00`,
                hour: hour,
                resourceId: resourceId,
                date: date,
                booked: this.isSlotBooked(resourceId, date, i),
                available: true
            });
        }

        return slots;
    },

    /**
     * Check if a specific time slot is booked
     */
    isSlotBooked(resourceId, date, slotIndex) {
        const bookings = Storage.get('bookings', []);
        return bookings.some(booking =>
            booking.resourceId === resourceId &&
            booking.date === date &&
            booking.slotIndex === slotIndex &&
            booking.status === 'confirmed'
        );
    },

    /**
     * Get all bookings for a specific user
     */
    getUserBookings(email) {
        const bookings = Storage.get('bookings', []);
        return bookings.filter(booking => booking.email === email);
    },

    /**
     * Get all bookings (admin view)
     */
    getAllBookings() {
        return Storage.get('bookings', []);
    },

    /**
     * Create a new booking
     */
    createBooking(resourceId, date, slotIndex, email, role) {
        // Validate resource accessibility
        const accessibleResources = this.getAccessibleResources(role);
        if (!accessibleResources[resourceId]) {
            return { success: false, message: 'You cannot access this resource' };
        }

        // Check if slot is available
        if (this.isSlotBooked(resourceId, date, slotIndex)) {
            return { success: false, message: 'This time slot is already booked' };
        }

        // Create booking
        const booking = {
            id: `booking-${Date.now()}`,
            resourceId: resourceId,
            resourceName: this.RESOURCES[resourceId].name,
            date: date,
            slotIndex: slotIndex,
            time: `${String(9 + slotIndex).padStart(2, '0')}:00`,
            email: email,
            role: role,
            status: 'confirmed',
            createdAt: new Date().toISOString()
        };

        // Save booking
        const bookings = Storage.get('bookings', []);
        bookings.push(booking);
        Storage.set('bookings', bookings);

        return { success: true, message: 'Booking confirmed', booking: booking };
    },

    /**
     * Cancel a booking
     */
    cancelBooking(bookingId, email) {
        let bookings = Storage.get('bookings', []);
        const bookingIndex = bookings.findIndex(b => b.id === bookingId && b.email === email);

        if (bookingIndex === -1) {
            return { success: false, message: 'Booking not found' };
        }

        bookings.splice(bookingIndex, 1);
        Storage.set('bookings', bookings);

        return { success: true, message: 'Booking cancelled' };
    },

    /**
     * Get bookings visible to a specific role
     * CRITICAL: Enforce strict role-based filtering
     */
    getVisibleBookings(role, userEmail) {
        const allBookings = Storage.get('bookings', []);

        if (role === 'student') {
            // Students ONLY see their own bookings
            return allBookings.filter(b => b.email === userEmail);
        } else if (role === 'teacher') {
            // Teachers see:
            // - Their own bookings
            // - All student bookings
            // - All admin bookings
            return allBookings.filter(b => 
                b.email === userEmail ||  // Own bookings
                b.role === 'student' ||   // Student bookings
                b.role === 'admin'        // Admin bookings
            );
        } else if (role === 'admin') {
            // Admin sees all bookings
            return allBookings;
        }

        return [];
    }
};

// ============================================
// PROFILE & SETTINGS MANAGEMENT
// ============================================

const ProfileSystem = {
    /**
     * Get user profile
     */
    getProfile(email) {
        const profiles = Storage.get('userProfiles', {});
        if (!profiles[email]) {
            profiles[email] = {
                email: email,
                name: email.split('@')[0],
                role: Auth.getRole(),
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString()
            };
            Storage.set('userProfiles', profiles);
        }
        return profiles[email];
    },

    /**
     * Update user profile
     */
    updateProfile(email, updates) {
        const profiles = Storage.get('userProfiles', {});
        if (profiles[email]) {
            profiles[email] = {
                ...profiles[email],
                ...updates,
                email: email, // Prevent email change
                role: Auth.getRole(), // Prevent role change
                updatedAt: new Date().toISOString()
            };
            Storage.set('userProfiles', profiles);
            return { success: true, message: 'Profile updated', profile: profiles[email] };
        }
        return { success: false, message: 'Profile not found' };
    }
};

// ============================================
// TEACHER MESSAGE & NOTIFICATION SYSTEM
// ============================================

const MessageSystem = {
    /**
     * Send message from teacher to students
     */
    sendTeacherMessage(teacherEmail, messageText, recipientType = 'all') {
        const message = {
            id: `msg-${Date.now()}`,
            from: teacherEmail,
            fromRole: 'teacher',
            text: messageText,
            recipientType: recipientType, // 'all' or specific student email
            createdAt: new Date().toISOString(),
            read: false
        };

        const messages = Storage.get('messages', []);
        messages.push(message);
        Storage.set('messages', messages);

        return { success: true, message: 'Message sent', messageId: message.id };
    },

    /**
     * Get messages for a user
     */
    getUserMessages(userEmail, userRole) {
        const messages = Storage.get('messages', []);

        if (userRole === 'teacher') {
            // Teachers see their own sent messages
            return messages.filter(m => m.from === userEmail).sort((a, b) => 
                new Date(b.createdAt) - new Date(a.createdAt)
            );
        } else if (userRole === 'student') {
            // Students see messages directed to them
            return messages.filter(m => 
                m.recipientType === 'all' || m.recipientType === userEmail
            ).sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
        }

        return [];
    },

    /**
     * Mark message as read
     */
    markAsRead(messageId) {
        const messages = Storage.get('messages', []);
        const message = messages.find(m => m.id === messageId);
        if (message) {
            message.read = true;
            Storage.set('messages', messages);
            return { success: true };
        }
        return { success: false };
    },

    /**
     * Get unread message count
     */
    getUnreadCount(userEmail, userRole) {
        const messages = this.getUserMessages(userEmail, userRole);
        return messages.filter(m => !m.read).length;
    }
};

// ============================================
// RESOURCE LIMIT MANAGEMENT (ADMIN + TEACHER)
// ============================================

const ResourceLimitSystem = {
    /**
     * Get resource limits
     */
    getResourceLimits() {
        return Storage.get('resourceLimits', {});
    },

    /**
     * Update resource limit (Admin/Teacher only)
     */
    updateResourceLimit(resourceId, newLimit, role) {
        if (!['admin', 'teacher'].includes(role)) {
            return { success: false, message: 'Insufficient permissions' };
        }

        const limits = this.getResourceLimits();
        limits[resourceId] = newLimit;
        Storage.set('resourceLimits', limits);

        return { success: true, message: 'Resource limit updated', limit: newLimit };
    },

    /**
     * Get limit for resource
     */
    getLimit(resourceId) {
        const limits = this.getResourceLimits();
        // Return custom limit or default (from RESOURCES definition)
        return limits[resourceId] || BookingSystem.RESOURCES[resourceId].slots;
    }
};

// ============================================
// CHAT BOT SYSTEM
// ============================================

const ChatBotSystem = {
    // Simple scripted responses
    responses: [
        {
            keywords: ['hello', 'hi', 'hey'],
            response: '👋 Hello! Welcome to ResBook. How can I help you today?'
        },
        {
            keywords: ['booking', 'how', 'book', 'reserve'],
            response: '📅 To book a resource:\n1. Go to "Book Resource"\n2. Select resource & date\n3. Pick a time slot\n4. Confirm your booking'
        },
        {
            keywords: ['cancel', 'delete', 'remove'],
            response: '❌ To cancel a booking, view it in your dashboard and click cancel. Your slot will be released.'
        },
        {
            keywords: ['resources', 'available', 'what'],
            response: '🏛️ Available resources depend on your role. Check your dashboard to see what you can access.'
        },
        {
            keywords: ['help', 'support', 'issue', 'problem'],
            response: '🆘 For support issues, please contact your administrator or check the FAQ section.'
        },
        {
            keywords: ['time', 'slot', 'hours', 'when'],
            response: '⏰ Booking slots run from 9:00 AM onwards. Each slot is 1 hour. Check availability when booking.'
        }
    ],

    /**
     * Get bot response
     */
    getResponse(userMessage) {
        const msg = userMessage.toLowerCase().trim();

        for (let item of this.responses) {
            if (item.keywords.some(keyword => msg.includes(keyword))) {
                return item.response;
            }
        }

        // Default response
        return '🤖 I didn\'t quite understand that. Try asking about bookings, resources, or cancellations!';
    }
};

// ============================================
// UI HELPERS
// ============================================

const UI = {
    /**
     * Show alert message
     */
    showAlert(message, type = 'info') {
        const alertContainer = document.getElementById('alertContainer');
        if (!alertContainer) return;

        const alert = document.createElement('div');
        alert.className = `alert alert-${type}`;
        alert.innerHTML = `
            <span>${message}</span>
            <button onclick="this.parentElement.remove()" style="background:none;border:none;color:inherit;cursor:pointer;font-size:1.2rem;padding:0;">×</button>
        `;

        alertContainer.innerHTML = '';
        alertContainer.appendChild(alert);

        // Auto-dismiss after 5 seconds
        setTimeout(() => {
            if (alert.parentElement) {
                alert.remove();
            }
        }, 5000);
    },

    /**
     * Update user info in header
     */
    updateUserInfo() {
        const user = Auth.getUser();
        const role = Auth.getRole();

        const userNameEl = document.getElementById('userName');
        const userRoleEl = document.getElementById('userRole');

        if (userNameEl && user && user.email) {
            userNameEl.textContent = user.email.split('@')[0];
        }

        if (userRoleEl && role) {
            userRoleEl.textContent = role.charAt(0).toUpperCase() + role.slice(1);
        }
    },

    /**
     * Format date for display
     */
    formatDate(dateStr) {
        const date = new Date(dateStr);
        return date.toLocaleDateString('en-US', { weekday: 'short', year: 'numeric', month: 'short', day: 'numeric' });
    }
};

// ============================================
// INITIALIZATION
// ============================================

document.addEventListener('DOMContentLoaded', function() {
    // Apply authentication checks
    Nav.enforceAuth();

    // Update user info if on a dashboard
    UI.updateUserInfo();

    // Initialize page-specific logic
    const currentPage = window.location.pathname.split('/').pop() || 'index.html';

    if (currentPage === 'index.html' || currentPage === '') {
        initLoginPage();
    } else if (currentPage === 'role.html') {
        initRolePage();
    } else if (currentPage === 'student.html') {
        initStudentDashboard();
    } else if (currentPage === 'teacher.html') {
        initTeacherDashboard();
    } else if (currentPage === 'admin.html') {
        initAdminDashboard();
    } else if (currentPage === 'booking.html') {
        initBookingPage();
    }
});

// ============================================
// LOGIN PAGE INITIALIZATION
// ============================================

function initLoginPage() {
    // Already logged in? Go to role selection
    if (Auth.isLoggedIn()) {
        Nav.goto('role.html');
        return;
    }

    const form = document.getElementById('loginForm');
    if (!form) return;

    form.addEventListener('submit', function(e) {
        e.preventDefault();

        const email = document.getElementById('email').value.trim();
        const password = document.getElementById('password').value;

        if (!email || !password) {
            UI.showAlert('Please fill in all fields', 'error');
            return;
        }

        // Simulate login (no backend)
        const result = Auth.login(email, password);

        if (result.success) {
            UI.showAlert('Login successful! Redirecting...', 'success');
            setTimeout(() => {
                Nav.goto('role.html');
            }, 500);
        } else {
            UI.showAlert(result.message, 'error');
        }
    });
}

// ============================================
// ROLE SELECTION PAGE INITIALIZATION
// ============================================

function initRolePage() {
    if (!Auth.isLoggedIn()) {
        Nav.goto('index.html');
        return;
    }

    const roleOptions = document.querySelectorAll('.role-option');
    let selectedRole = null;

    roleOptions.forEach(option => {
        option.addEventListener('click', function() {
            roleOptions.forEach(opt => opt.classList.remove('active'));
            this.classList.add('active');
            selectedRole = this.dataset.role;
        });
    });

    const selectBtn = document.getElementById('selectRoleBtn');
    if (selectBtn) {
        selectBtn.addEventListener('click', function() {
            if (!selectedRole) {
                UI.showAlert('Please select a role', 'error');
                return;
            }

            const result = Auth.selectRole(selectedRole);
            if (result.success) {
                UI.showAlert('Role selected!', 'success');
                setTimeout(() => {
                    const redirects = {
                        'student': 'student.html',
                        'teacher': 'teacher.html',
                        'admin': 'admin.html'
                    };
                    Nav.goto(redirects[selectedRole]);
                }, 500);
            }
        });
    }
}

// ============================================
// STUDENT DASHBOARD INITIALIZATION
// ============================================

function initStudentDashboard() {
    if (!Auth.isLoggedIn() || Auth.getRole() !== 'student') {
        Nav.goto('index.html');
        return;
    }

    setupDashboardLogout();
    setupStudentStats();
    setupBookingNavigation();
    setupProfileSection();
    setupChatBot();
    setupNotifications();
}

function setupStudentStats() {
    const user = Auth.getUser();
    const bookings = BookingSystem.getUserBookings(user.email);
    const resources = BookingSystem.getAccessibleResources('student');

    const stats = {
        availableResources: Object.keys(resources).length,
        myBookings: bookings.length,
        upcomingBookings: bookings.filter(b => new Date(b.date) >= new Date()).length
    };

    document.getElementById('availableResources').textContent = stats.availableResources;
    document.getElementById('myBookings').textContent = stats.myBookings;
    document.getElementById('upcomingBookings').textContent = stats.upcomingBookings;

    // Display recent bookings
    const recentBookings = bookings.slice(-3).reverse();
    const bookingsList = document.getElementById('recentBookingsList');
    
    if (bookingsList) {
        if (recentBookings.length === 0) {
            bookingsList.innerHTML = '<p class="text-muted">No bookings yet</p>';
        } else {
            bookingsList.innerHTML = recentBookings.map(booking => `
                <div class="card">
                    <strong>${booking.resourceName}</strong><br>
                    ${UI.formatDate(booking.date)} at ${booking.time}
                </div>
            `).join('');
        }
    }
}

function setupBookingNavigation() {
    const bookBtn = document.getElementById('bookBtn');
    if (bookBtn) {
        bookBtn.addEventListener('click', () => Nav.goto('booking.html'));
    }
}

// ============================================
// TEACHER DASHBOARD INITIALIZATION
// ============================================

function initTeacherDashboard() {
    if (!Auth.isLoggedIn() || Auth.getRole() !== 'teacher') {
        Nav.goto('index.html');
        return;
    }

    setupDashboardLogout();
    setupTeacherStats();
    setupBookingNavigation();
    setupProfileSection();
    setupChatBot();
    setupTeacherMessages();
    setupNotifications();
}

function setupTeacherStats() {
    const user = Auth.getUser();
    const bookings = BookingSystem.getUserBookings(user.email);
    const resources = BookingSystem.getAccessibleResources('teacher');

    const stats = {
        totalResources: Object.keys(resources).length,
        myBookings: bookings.length,
        upcomingBookings: bookings.filter(b => new Date(b.date) >= new Date()).length
    };

    document.getElementById('totalResources').textContent = stats.totalResources;
    document.getElementById('myBookings').textContent = stats.myBookings;
    document.getElementById('upcomingBookings').textContent = stats.upcomingBookings;

    const recentBookings = bookings.slice(-3).reverse();
    const bookingsList = document.getElementById('recentBookingsList');
    
    if (bookingsList) {
        if (recentBookings.length === 0) {
            bookingsList.innerHTML = '<p class="text-muted">No bookings yet</p>';
        } else {
            bookingsList.innerHTML = recentBookings.map(booking => `
                <div class="card">
                    <strong>${booking.resourceName}</strong><br>
                    ${UI.formatDate(booking.date)} at ${booking.time}
                </div>
            `).join('');
        }
    }
}

// ============================================
// ADMIN DASHBOARD INITIALIZATION
// ============================================

function initAdminDashboard() {
    if (!Auth.isLoggedIn() || Auth.getRole() !== 'admin') {
        Nav.goto('index.html');
        return;
    }

    setupDashboardLogout();
    setupAdminStats();
    setupAdminTabs();
    setupProfileSection();
    setupChatBot();
    setupNotifications();
}

function setupAdminStats() {
    const allBookings = BookingSystem.getAllBookings();
    const uniqueUsers = new Set(allBookings.map(b => b.email)).size;
    const totalBookings = allBookings.length;
    const totalResources = Object.keys(BookingSystem.RESOURCES).length;

    document.getElementById('totalResources').textContent = totalResources;
    document.getElementById('totalBookings').textContent = totalBookings;
    document.getElementById('totalUsers').textContent = uniqueUsers;

    // Show all bookings in table
    const bookingsTable = document.getElementById('allBookingsTable');
    if (bookingsTable) {
        if (allBookings.length === 0) {
            bookingsTable.innerHTML = '<tr><td colspan="6" class="text-center text-muted">No bookings yet</td></tr>';
        } else {
            bookingsTable.innerHTML = allBookings.map(booking => `
                <tr>
                    <td>${booking.email}</td>
                    <td>${booking.resourceName}</td>
                    <td>${UI.formatDate(booking.date)}</td>
                    <td>${booking.time}</td>
                    <td><span style="text-transform: capitalize;">${booking.role}</span></td>
                    <td>
                        <button class="btn btn-sm btn-danger" onclick="cancelBookingFromAdmin('${booking.id}')">Cancel</button>
                    </td>
                </tr>
            `).join('');
        }
    }
}

function setupAdminTabs() {
    const tabBtns = document.querySelectorAll('.tab-btn');
    const tabContents = document.querySelectorAll('.tab-content');

    tabBtns.forEach(btn => {
        btn.addEventListener('click', function() {
            const tabName = this.dataset.tab;

            tabBtns.forEach(b => b.classList.remove('active'));
            tabContents.forEach(c => c.classList.remove('active'));

            this.classList.add('active');
            document.getElementById(tabName).classList.add('active');
        });
    });
}

function cancelBookingFromAdmin(bookingId) {
    const allBookings = BookingSystem.getAllBookings();
    const booking = allBookings.find(b => b.id === bookingId);

    if (confirm(`Cancel booking for ${booking.email}?`)) {
        BookingSystem.cancelBooking(bookingId, booking.email);
        UI.showAlert('Booking cancelled', 'success');
        setTimeout(() => location.reload(), 500);
    }
}

// ============================================
// BOOKING PAGE INITIALIZATION
// ============================================

function initBookingPage() {
    if (!Auth.isLoggedIn()) {
        Nav.goto('index.html');
        return;
    }

    setupDashboardLogout();
    setupBookingForm();
    setupChatBot();
}

function setupBookingForm() {
    const user = Auth.getUser();
    const role = Auth.getRole();
    const resourceSelect = document.getElementById('resourceSelect');
    const dateInput = document.getElementById('bookingDate');
    const timeSlotsContainer = document.getElementById('timeSlotsContainer');
    const confirmBtn = document.getElementById('confirmBookingBtn');

    // Populate resources dropdown
    const resources = BookingSystem.getAccessibleResources(role);
    resourceSelect.innerHTML = '<option value="">-- Select a resource --</option>' +
        Object.entries(resources).map(([key, resource]) =>
            `<option value="${key}">${resource.name}</option>`
        ).join('');

    let selectedSlot = null;

    // When resource or date changes, show time slots
    resourceSelect.addEventListener('change', showTimeSlots);
    dateInput.addEventListener('change', showTimeSlots);

    function showTimeSlots() {
        const resourceId = resourceSelect.value;
        const date = dateInput.value;

        timeSlotsContainer.innerHTML = '';
        selectedSlot = null;

        if (!resourceId || !date) {
            timeSlotsContainer.innerHTML = '<p class="text-muted">Select resource and date to see available slots</p>';
            return;
        }

        const slots = BookingSystem.getTimeSlots(resourceId, date);
        const slotsGrid = document.createElement('div');
        slotsGrid.className = 'time-slots-grid';

        slots.forEach(slot => {
            const slotBtn = document.createElement('button');
            slotBtn.type = 'button';
            slotBtn.className = `time-slot ${slot.booked ? 'booked' : 'available'}`;
            slotBtn.textContent = slot.time;
            slotBtn.disabled = slot.booked;

            if (!slot.booked) {
                slotBtn.addEventListener('click', function() {
                    document.querySelectorAll('.time-slot').forEach(s => s.classList.remove('selected'));
                    this.classList.add('selected');
                    selectedSlot = slot;
                });
            }

            slotsGrid.appendChild(slotBtn);
        });

        timeSlotsContainer.appendChild(slotsGrid);
    }

    confirmBtn.addEventListener('click', function() {
        if (!selectedSlot) {
            UI.showAlert('Please select a time slot', 'error');
            return;
        }

        const result = BookingSystem.createBooking(
            selectedSlot.resourceId,
            selectedSlot.date,
            selectedSlot.hour - 9, // Convert hour to slot index
            user.email,
            role
        );

        if (result.success) {
            UI.showAlert('✓ Booking confirmed!', 'success');
            setTimeout(() => {
                const dashboards = {
                    'student': 'student.html',
                    'teacher': 'teacher.html',
                    'admin': 'admin.html'
                };
                Nav.goto(dashboards[role]);
            }, 1000);
        } else {
            UI.showAlert(result.message, 'error');
            showTimeSlots();
        }
    });
}

// ============================================
// SHARED DASHBOARD FUNCTIONS
// ============================================

function setupDashboardLogout() {
    const logoutBtn = document.getElementById('logoutBtn');
    if (logoutBtn) {
        logoutBtn.addEventListener('click', function() {
            if (confirm('Are you sure you want to logout?')) {
                Auth.logout();
                UI.showAlert('Logged out', 'success');
                setTimeout(() => Nav.goto('index.html'), 500);
            }
        });
    }
}

// ============================================
// PROFILE & SETTINGS INITIALIZATION
// ============================================

function setupProfileSection() {
    const user = Auth.getUser();
    const role = Auth.getRole();
    const profileNameEl = document.getElementById('profileName');
    const profileEmailEl = document.getElementById('profileEmail');
    const profileRoleEl = document.getElementById('profileRole');
    const editProfileBtn = document.getElementById('editProfileBtn');
    const profileForm = document.getElementById('profileForm');
    const saveProfileBtn = document.getElementById('saveProfileBtn');
    const cancelProfileBtn = document.getElementById('cancelProfileBtn');

    if (!user) return;

    // Load and display profile
    const profile = ProfileSystem.getProfile(user.email);

    if (profileNameEl) profileNameEl.textContent = profile.name;
    if (profileEmailEl) profileEmailEl.textContent = profile.email;
    if (profileRoleEl) profileRoleEl.textContent = role.charAt(0).toUpperCase() + role.slice(1);

    // Edit profile
    if (editProfileBtn) {
        editProfileBtn.addEventListener('click', function() {
            if (profileForm) {
                profileForm.style.display = profileForm.style.display === 'none' ? 'block' : 'none';
                const nameInput = document.getElementById('editProfileName');
                if (nameInput) nameInput.value = profile.name;
            }
        });
    }

    // Save profile changes
    if (saveProfileBtn) {
        saveProfileBtn.addEventListener('click', function() {
            const nameInput = document.getElementById('editProfileName');
            if (nameInput && nameInput.value.trim()) {
                const result = ProfileSystem.updateProfile(user.email, { name: nameInput.value.trim() });
                if (result.success) {
                    UI.showAlert('✓ Profile updated', 'success');
                    if (profileNameEl) profileNameEl.textContent = result.profile.name;
                    if (profileForm) profileForm.style.display = 'none';
                }
            }
        });
    }

    // Cancel edit
    if (cancelProfileBtn) {
        cancelProfileBtn.addEventListener('click', function() {
            if (profileForm) profileForm.style.display = 'none';
        });
    }
}

// ============================================
// CHAT BOT INITIALIZATION
// ============================================

function setupChatBot() {
    const chatContainer = document.getElementById('chatBotWidget');
    const chatToggle = document.getElementById('chatToggle');
    const chatMessages = document.getElementById('chatMessages');
    const chatInput = document.getElementById('chatInput');
    const chatSendBtn = document.getElementById('chatSendBtn');

    if (!chatToggle || !chatMessages || !chatInput) return;

    let chatOpen = false;

    // Toggle chat visibility
    chatToggle.addEventListener('click', function() {
        chatOpen = !chatOpen;
        if (chatContainer) {
            chatContainer.style.display = chatOpen ? 'flex' : 'none';
        }
        chatToggle.innerHTML = chatOpen ? '✕' : '💬';
    });

    // Send chat message
    function sendMessage() {
        const message = chatInput.value.trim();
        if (!message) return;

        // Add user message
        const userMsgEl = document.createElement('div');
        userMsgEl.className = 'chat-message user-message';
        userMsgEl.textContent = message;
        chatMessages.appendChild(userMsgEl);

        // Get bot response
        const botResponse = ChatBotSystem.getResponse(message);

        // Add bot response
        setTimeout(() => {
            const botMsgEl = document.createElement('div');
            botMsgEl.className = 'chat-message bot-message';
            botMsgEl.textContent = botResponse;
            chatMessages.appendChild(botMsgEl);
            chatMessages.scrollTop = chatMessages.scrollHeight;
        }, 500);

        chatInput.value = '';
        chatMessages.scrollTop = chatMessages.scrollHeight;
    }

    chatSendBtn.addEventListener('click', sendMessage);
    chatInput.addEventListener('keypress', function(e) {
        if (e.key === 'Enter') sendMessage();
    });
}

// ============================================
// NOTIFICATIONS INITIALIZATION
// ============================================

function setupNotifications() {
    const user = Auth.getUser();
    const role = Auth.getRole();
    const notifBell = document.getElementById('notificationBell');
    const notifDropdown = document.getElementById('notificationDropdown');
    const notifBadge = document.getElementById('notificationBadge');

    if (!notifBell || !notifDropdown) return;

    // Toggle notification dropdown
    notifBell.addEventListener('click', function(e) {
        e.stopPropagation();
        notifDropdown.style.display = notifDropdown.style.display === 'none' ? 'block' : 'none';
    });

    // Close dropdown when clicking outside
    document.addEventListener('click', function() {
        notifDropdown.style.display = 'none';
    });

    // Update unread count
    function updateNotifications() {
        const messages = MessageSystem.getUserMessages(user.email, role);
        const unreadCount = messages.filter(m => !m.read).length;

        if (notifBadge) {
            notifBadge.textContent = unreadCount;
            notifBadge.style.display = unreadCount > 0 ? 'block' : 'none';
        }

        // Display messages in dropdown
        notifDropdown.innerHTML = '';
        if (messages.length === 0) {
            notifDropdown.innerHTML = '<div class="notif-item">No notifications</div>';
        } else {
            messages.forEach(msg => {
                const notifEl = document.createElement('div');
                notifEl.className = `notif-item ${msg.read ? 'read' : 'unread'}`;
                notifEl.innerHTML = `
                    <p><strong>📧 Teacher Message</strong></p>
                    <p>${msg.text}</p>
                    <small>${new Date(msg.createdAt).toLocaleDateString()}</small>
                `;
                notifEl.addEventListener('click', () => {
                    MessageSystem.markAsRead(msg.id);
                    updateNotifications();
                });
                notifDropdown.appendChild(notifEl);
            });
        }
    }

    // Initial update and periodic refresh
    updateNotifications();
    setInterval(updateNotifications, 5000);
}

// ============================================
// TEACHER MESSAGE SYSTEM INITIALIZATION
// ============================================

function setupTeacherMessages() {
    const sendMsgBtn = document.getElementById('sendMessageBtn');
    const messageInput = document.getElementById('teacherMessageInput');
    const recipientSelect = document.getElementById('recipientSelect');

    if (!sendMsgBtn || !messageInput) return;

    const user = Auth.getUser();

    sendMsgBtn.addEventListener('click', function() {
        const text = messageInput.value.trim();
        const recipient = recipientSelect ? recipientSelect.value : 'all';

        if (!text) {
            UI.showAlert('Please type a message', 'error');
            return;
        }

        const result = MessageSystem.sendTeacherMessage(user.email, text, recipient);
        if (result.success) {
            UI.showAlert('✓ Message sent to ' + (recipient === 'all' ? 'all students' : 'student'), 'success');
            messageInput.value = '';
        }
    });
}

// ============================================
// GLOBAL FUNCTIONS (for inline event handlers)
// ============================================

window.goToDashboard = function() {
    const role = Auth.getRole();
    const dashboards = {
        'student': 'student.html',
        'teacher': 'teacher.html',
        'admin': 'admin.html'
    };
    Nav.goto(dashboards[role] || 'index.html');
};

window.goToBooking = function() {
    Nav.goto('booking.html');
};

window.logout = function() {
    if (confirm('Are you sure you want to logout?')) {
        Auth.logout();
        UI.showAlert('Logged out', 'success');
        setTimeout(() => Nav.goto('index.html'), 500);
    }
};
