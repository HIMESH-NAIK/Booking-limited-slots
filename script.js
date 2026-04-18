/* ===================================
   SMART RESOURCE BOOKING SYSTEM - JAVASCRIPT
   =================================== */

// ===================================
// DATA MANAGEMENT
// ===================================

// Initialize localStorage with default data
function initializeData() {
    if (!localStorage.getItem('bookings')) {
        localStorage.setItem('bookings', JSON.stringify([]));
    }
    if (!localStorage.getItem('users')) {
        localStorage.setItem('users', JSON.stringify([]));
    }
}

// Get all bookings from localStorage
function getBookings() {
    return JSON.parse(localStorage.getItem('bookings') || '[]');
}

// Save bookings to localStorage
function saveBookings(bookings) {
    localStorage.setItem('bookings', JSON.stringify(bookings));
    updateDashboardStats();
}

// Get all users from localStorage
function getUsers() {
    return JSON.parse(localStorage.getItem('users') || '[]');
}

// Save users to localStorage
function saveUsers(users) {
    localStorage.setItem('users', JSON.stringify(users));
}

// Get current logged-in user
function getCurrentUser() {
    const user = localStorage.getItem('currentUser');
    return user ? JSON.parse(user) : null;
}

// ===================================
// OTP & AUTHENTICATION
// ===================================

let generatedOTP = '';
let registeredEmail = '';

// ===================================
// MAIN INITIALIZATION
// ===================================

document.addEventListener('DOMContentLoaded', function() {
    // Initialize login page
    initializeLoginPage();
    // Initialize dashboard page
    initializeDashboardPage();
});

// ===================================
// LOGIN PAGE INITIALIZATION
// ===================================

function initializeLoginPage() {
    const adminLoginForm = document.getElementById('adminLoginForm');
    if (!adminLoginForm) return; // Not on login page

    // Handle Admin Login Form
    adminLoginForm.addEventListener('submit', function(e) {
        e.preventDefault();
        const username = document.getElementById('username').value.trim();
        const password = document.getElementById('password').value.trim();
        
        // Simple validation - default credentials
        if (username === 'admin' && password === 'admin123') {
            // Login successful
            const user = {
                email: 'admin@booking.com',
                name: 'Admin',
                role: 'Admin',
                id: Date.now()
            };

            // Save user if not exists
            const users = getUsers();
            const userExists = users.some(u => u.email === user.email);
            if (!userExists) {
                users.push(user);
                saveUsers(users);
            }

            // Save current session
            localStorage.setItem('currentUser', JSON.stringify(user));

            // Redirect to dashboard
            setTimeout(() => {
                window.location.href = 'dashboard.html';
            }, 500);
        } else {
            // Login failed
            const errorDiv = document.getElementById('loginError');
            errorDiv.textContent = '❌ Invalid username or password. Try admin/admin123';
            errorDiv.classList.add('show');
            document.getElementById('password').value = '';
            document.getElementById('password').focus();
        }
    });
}

// ===================================
// SESSION MANAGEMENT
// ===================================

// Check if user is logged in
function checkAuthenticationStatus() {
    const currentUser = getCurrentUser();
    if (!currentUser) {
        window.location.href = 'index.html';
        return null;
    }
    return currentUser;
}

// Logout user
function logout() {
    localStorage.removeItem('currentUser');
    window.location.href = 'index.html';
}

// ===================================
// DASHBOARD PAGE INITIALIZATION
// ===================================

function initializeDashboardPage() {
    const bookingForm = document.getElementById('bookingForm');
    if (!bookingForm) return; // Not on dashboard page

    // Check authentication
    const currentUser = checkAuthenticationStatus();
    if (!currentUser) return;

    // Initialize data
    initializeData();

    // Set user info in header
    const userNameElement = document.getElementById('userName');
    const userRoleElement = document.getElementById('userRole');
    if (userNameElement) userNameElement.textContent = currentUser.name;
    if (userRoleElement) userRoleElement.textContent = currentUser.role;

    // Show/hide admin panel based on role
    const adminLinks = document.querySelectorAll('.admin-only');
    if (currentUser.role === 'Admin') {
        adminLinks.forEach(link => link.classList.add('show'));
        const adminView = document.querySelector('[data-view="admin"]');
        if (adminView) adminView.style.display = 'flex';
    }

    // Set minimum date to today
    const today = new Date().toISOString().split('T')[0];
    const dateInput = document.getElementById('bookingDate');
    if (dateInput) {
        dateInput.min = today;
    }

    // Setup navigation
    setupNavigation();

    // Setup booking form
    setupBookingForm(currentUser);

    // Setup my bookings view
    setupMyBookingsView(currentUser);

    // Setup admin panel
    if (currentUser.role === 'Admin') {
        setupAdminPanel();
    }

    // Setup logout
    const logoutBtn = document.getElementById('logoutBtn');
    if (logoutBtn) {
        logoutBtn.addEventListener('click', logout);
    }

    // Setup modal handlers
    setupModalHandlers();

    // Update dashboard stats
    updateDashboardStats();

    // Display recent bookings
    displayRecentBookings(currentUser);
}

// ===================================
// NAVIGATION
// ===================================

function setupNavigation() {
    const navLinks = document.querySelectorAll('.nav-link');

    navLinks.forEach(link => {
        link.addEventListener('click', function(e) {
            e.preventDefault();

            // Remove active class from all links
            navLinks.forEach(l => l.classList.remove('active'));

            // Add active class to clicked link
            this.classList.add('active');

            // Get view name
            const viewName = this.getAttribute('data-view');
            showView(viewName);
        });
    });
}

function showView(viewName) {
    // Hide all views
    const views = document.querySelectorAll('.view');
    views.forEach(view => view.classList.remove('active'));

    // Show selected view
    const selectedView = document.getElementById(viewName + 'View');
    if (selectedView) {
        selectedView.classList.add('active');
    }

    // Load view-specific data
    if (viewName === 'my-bookings') {
        loadMyBookings();
    } else if (viewName === 'admin') {
        loadAllBookings();
    }
}

// ===================================
// BOOKING FORM
// ===================================

function setupBookingForm(currentUser) {
    const bookingForm = document.getElementById('bookingForm');
    if (!bookingForm) return;

    // Auto-fill user info
    document.getElementById('formUserName').value = currentUser.name;
    document.getElementById('formUserEmail').value = currentUser.email;

    // Handle form submission
    bookingForm.addEventListener('submit', function(e) {
        e.preventDefault();

        const room = document.getElementById('roomSelect').value;
        const date = document.getElementById('bookingDate').value;
        const time = document.getElementById('bookingTime').value;

        if (!room || !date || !time) {
            showBookingError('Please fill all fields');
            return;
        }

        // Check for double booking
        const bookings = getBookings();
        const existingBooking = bookings.find(b => 
            b.room === room && b.date === date && b.time === time && b.status !== 'cancelled'
        );

        if (existingBooking) {
            // If current user is Admin, allow override
            if (currentUser.role === 'Admin') {
                showOverrideModal(room, date, time, existingBooking, currentUser);
                return;
            } else {
                // Regular user cannot override
                showBookingError('This slot is already booked. Please select another time.');
                return;
            }
        }

        // Create booking
        const booking = {
            id: Date.now(),
            user: currentUser.name,
            email: currentUser.email,
            room: room,
            date: date,
            time: time,
            role: currentUser.role,
            status: 'active',
            bookedAt: new Date().toISOString()
        };

        // Save booking
        bookings.push(booking);
        saveBookings(bookings);

        // Show success message
        showBookingSuccess(`✅ Room ${room} booked successfully for ${date} at ${time}`);

        // Reset form
        bookingForm.reset();
    });

    // Update availability when room or date changes
    const roomSelect = document.getElementById('roomSelect');
    const dateInput = document.getElementById('bookingDate');

    if (roomSelect) {
        roomSelect.addEventListener('change', updateAvailability);
    }
    if (dateInput) {
        dateInput.addEventListener('change', updateAvailability);
    }
}

function updateAvailability() {
    const room = document.getElementById('roomSelect').value;
    const date = document.getElementById('bookingDate').value;
    const availabilityDiv = document.getElementById('availabilityDisplay');

    if (!room || !date) {
        availabilityDiv.innerHTML = '<p>Select room and date to see availability</p>';
        return;
    }

    const bookings = getBookings();
    const timeSlots = [
        '09:00', '10:00', '11:00', '12:00',
        '13:00', '14:00', '15:00', '16:00'
    ];

    let html = '';
    timeSlots.forEach(time => {
        const isBooked = bookings.some(b => 
            b.room === room && b.date === date && b.time === time && b.status !== 'cancelled'
        );

        const slotClass = isBooked ? 'booked' : 'available';
        const slotText = isBooked ? '🔴 ' : '🟢 ';
        html += `<div class="time-slot ${slotClass}">${slotText}${time}</div>`;
    });

    availabilityDiv.innerHTML = html;
}

function showBookingError(message) {
    const errorDiv = document.getElementById('bookingError');
    errorDiv.textContent = message;
    errorDiv.classList.add('show');

    setTimeout(() => {
        errorDiv.classList.remove('show');
    }, 5000);
}

function showBookingSuccess(message) {
    const successDiv = document.getElementById('bookingSuccess');
    successDiv.textContent = message;
    successDiv.classList.add('show');

    setTimeout(() => {
        successDiv.classList.remove('show');
    }, 5000);

    // Also show toast
    showToast(message, 'success');
}

// ===================================
// MY BOOKINGS VIEW
// ===================================

function setupMyBookingsView(currentUser) {
    const filterRoom = document.getElementById('filterRoom');
    if (filterRoom) {
        filterRoom.addEventListener('input', loadMyBookings);
    }
}

function loadMyBookings() {
    const currentUser = getCurrentUser();
    const bookings = getBookings();
    const filter = document.getElementById('filterRoom')?.value.toLowerCase() || '';

    // Filter bookings for current user
    let userBookings = bookings.filter(b => b.email === currentUser.email);

    // Apply filter
    if (filter) {
        userBookings = userBookings.filter(b => 
            b.room.toLowerCase().includes(filter)
        );
    }

    // Sort by date
    userBookings.sort((a, b) => new Date(b.bookedAt) - new Date(a.bookedAt));

    // Display in table
    const tableBody = document.getElementById('myBookingsTable');
    if (!tableBody) return;

    if (userBookings.length === 0) {
        tableBody.innerHTML = '<tr><td colspan="6" class="empty-state">No bookings found</td></tr>';
        return;
    }

    tableBody.innerHTML = userBookings.map(booking => `
        <tr>
            <td>${booking.user}</td>
            <td>${booking.room}</td>
            <td>${formatDate(booking.date)}</td>
            <td>${booking.time}</td>
            <td>
                <span class="status-badge status-${booking.status.toLowerCase()}">
                    ${booking.status === 'overridden' ? '⚠️ Overridden' : booking.status === 'cancelled' ? '❌ Cancelled' : '✅ Active'}
                </span>
            </td>
            <td>
                ${booking.status === 'active' ? `
                    <div class="action-buttons">
                        <button class="btn btn-small" onclick="showCancelModal(${booking.id})">Cancel</button>
                    </div>
                ` : '<span style="color: var(--text-secondary); font-size: 12px;">No action</span>'}
            </td>
        </tr>
    `).join('');
}

// ===================================
// ADMIN PANEL
// ===================================

function setupAdminPanel() {
    const adminTabs = document.querySelectorAll('.admin-tab-btn');

    adminTabs.forEach(btn => {
        btn.addEventListener('click', function() {
            const tabName = this.getAttribute('data-tab');

            // Remove active from all tabs
            adminTabs.forEach(b => b.classList.remove('active'));
            this.classList.add('active');

            // Hide all tab contents
            document.querySelectorAll('.admin-tab-content').forEach(content => {
                content.classList.remove('active');
            });

            // Show selected tab content
            const tabContent = document.getElementById(tabName + 'Tab');
            if (tabContent) {
                tabContent.classList.add('active');
            }

            // Load data if switching to bookings tab
            if (tabName === 'all-bookings') {
                loadAllBookings();
            }
        });
    });
}

function loadAllBookings() {
    const bookings = getBookings();

    // Sort by date
    bookings.sort((a, b) => new Date(b.bookedAt) - new Date(a.bookedAt));

    const tableBody = document.getElementById('allBookingsTable');
    if (!tableBody) return;

    if (bookings.length === 0) {
        tableBody.innerHTML = '<tr><td colspan="7" class="empty-state">No bookings found</td></tr>';
        return;
    }

    tableBody.innerHTML = bookings.map(booking => `
        <tr>
            <td>${booking.user}</td>
            <td>${booking.room}</td>
            <td>${formatDate(booking.date)}</td>
            <td>${booking.time}</td>
            <td>
                <span class="status-badge">${booking.role}</span>
            </td>
            <td>
                <span class="status-badge status-${booking.status.toLowerCase()}">
                    ${booking.status === 'overridden' ? '⚠️ Overridden' : booking.status === 'cancelled' ? '❌ Cancelled' : '✅ Active'}
                </span>
            </td>
            <td>
                <div class="action-buttons">
                    ${booking.status === 'active' ? `
                        <button class="btn btn-small" onclick="showCancelModal(${booking.id})">Cancel</button>
                    ` : ''}
                    <button class="btn btn-small" onclick="deleteBooking(${booking.id})">Delete</button>
                </div>
            </td>
        </tr>
    `).join('');
}

function deleteBooking(bookingId) {
    if (confirm('Are you sure you want to permanently delete this booking?')) {
        const bookings = getBookings();
        const filtered = bookings.filter(b => b.id !== bookingId);
        saveBookings(filtered);
        loadAllBookings();
        showToast('Booking deleted', 'success');
    }
}

// ===================================
// OVERRIDE & CANCEL BOOKING
// ===================================

let pendingOverride = null;
let pendingCancel = null;

function showOverrideModal(room, date, time, existingBooking, adminUser) {
    pendingOverride = {
        room, date, time, existingBooking, adminUser
    };

    const modal = document.getElementById('overrideModal');
    const info = document.getElementById('overrideInfo');

    info.innerHTML = `
        <p><strong>Current Booking:</strong></p>
        <p>User: ${existingBooking.user}</p>
        <p>Room: ${existingBooking.room}</p>
        <p>Date: ${formatDate(existingBooking.date)}</p>
        <p>Time: ${existingBooking.time}</p>
    `;

    modal.style.display = 'flex';
}

function showCancelModal(bookingId) {
    pendingCancel = bookingId;

    const bookings = getBookings();
    const booking = bookings.find(b => b.id === bookingId);

    if (!booking) return;

    const modal = document.getElementById('cancelModal');
    const info = document.getElementById('cancelInfo');

    info.innerHTML = `
        <p><strong>Booking Details:</strong></p>
        <p>Room: ${booking.room}</p>
        <p>Date: ${formatDate(booking.date)}</p>
        <p>Time: ${booking.time}</p>
    `;

    modal.style.display = 'flex';
}

function setupModalHandlers() {
    // Override modal handlers
    const confirmOverride = document.getElementById('confirmOverride');
    if (confirmOverride) {
        confirmOverride.addEventListener('click', function() {
            if (pendingOverride) {
                executeOverride();
            }
        });
    }

    const cancelOverride = document.getElementById('cancelOverride');
    if (cancelOverride) {
        cancelOverride.addEventListener('click', function() {
            closeModal('overrideModal');
            pendingOverride = null;
        });
    }

    // Cancel modal handlers
    const cancelDelete = document.getElementById('cancelDelete');
    if (cancelDelete) {
        cancelDelete.addEventListener('click', function() {
            if (pendingCancel) {
                executeCancelBooking();
            }
        });
    }

    const cancelConfirm = document.getElementById('cancelConfirm');
    if (cancelConfirm) {
        cancelConfirm.addEventListener('click', function() {
            closeModal('cancelModal');
            pendingCancel = null;
        });
    }

    // Close modal handlers
    const closeModals = document.querySelectorAll('.close-modal');
    closeModals.forEach(btn => {
        btn.addEventListener('click', function() {
            this.closest('.modal').style.display = 'none';
        });
    });

    // Close modal when clicking outside
    const modals = document.querySelectorAll('.modal');
    modals.forEach(modal => {
        modal.addEventListener('click', function(e) {
            if (e.target === this) {
                this.style.display = 'none';
            }
        });
    });
}

function executeOverride() {
    const { room, date, time, existingBooking, adminUser } = pendingOverride;

    const bookings = getBookings();

    // Cancel existing booking
    const existingIndex = bookings.findIndex(b => b.id === existingBooking.id);
    if (existingIndex !== -1) {
        bookings[existingIndex].status = 'overridden';
        bookings[existingIndex].overriddenAt = new Date().toISOString();
        bookings[existingIndex].overriddenBy = adminUser.name;
    }

    // Create new admin booking
    const adminBooking = {
        id: Date.now(),
        user: adminUser.name,
        email: adminUser.email,
        room: room,
        date: date,
        time: time,
        role: 'Admin',
        status: 'active',
        bookedAt: new Date().toISOString(),
        overridingUser: existingBooking.user
    };

    bookings.push(adminBooking);
    saveBookings(bookings);

    // Close modal
    closeModal('overrideModal');

    // Show success toast
    showToast(`⚠️ Admin priority applied. Previous booking overridden.`, 'warning');

    pendingOverride = null;
}

function executeCancelBooking() {
    const bookings = getBookings();
    const index = bookings.findIndex(b => b.id === pendingCancel);

    if (index !== -1) {
        bookings[index].status = 'cancelled';
        bookings[index].cancelledAt = new Date().toISOString();
        saveBookings(bookings);

        closeModal('cancelModal');
        showToast('Booking cancelled successfully', 'success');

        // Refresh current view
        const currentUser = getCurrentUser();
        if (currentUser) {
            loadMyBookings();
            loadAllBookings();
        }
    }

    pendingCancel = null;
}

function closeModal(modalId) {
    const modal = document.getElementById(modalId);
    if (modal) {
        modal.style.display = 'none';
    }
}

// ===================================
// DASHBOARD STATS
// ===================================

function updateDashboardStats() {
    const bookings = getBookings();
    const users = getUsers();
    const activeBookings = bookings.filter(b => b.status === 'active');
    const availableSlots = (3 * 8) - activeBookings.length; // 3 rooms, 8 slots each

    const totalRoomsEl = document.getElementById('totalRooms');
    const availableSlotsEl = document.getElementById('availableSlots');
    const activeBookingsEl = document.getElementById('activeBookings');
    const totalUsersEl = document.getElementById('totalUsers');

    if (totalRoomsEl) totalRoomsEl.textContent = '3';
    if (availableSlotsEl) availableSlotsEl.textContent = Math.max(0, availableSlots);
    if (activeBookingsEl) activeBookingsEl.textContent = activeBookings.length;
    if (totalUsersEl) totalUsersEl.textContent = users.length;
}

function displayRecentBookings(currentUser) {
    const bookings = getBookings();
    let recentBookings;

    if (currentUser.role === 'Admin') {
        // Show all recent bookings for admin
        recentBookings = bookings.filter(b => b.status === 'active');
    } else {
        // Show only user's recent bookings
        recentBookings = bookings.filter(b => 
            b.email === currentUser.email && b.status === 'active'
        );
    }

    recentBookings.sort((a, b) => new Date(b.bookedAt) - new Date(a.bookedAt));
    recentBookings = recentBookings.slice(0, 5);

    const container = document.getElementById('recentBookingsContainer');
    if (!container) return;

    if (recentBookings.length === 0) {
        container.innerHTML = '<p class="empty-state">No active bookings</p>';
        return;
    }

    container.innerHTML = recentBookings.map(booking => `
        <div class="booking-item">
            <div class="booking-info">
                <h4>${booking.room}</h4>
                <p>${booking.user} • ${formatDate(booking.date)}</p>
            </div>
            <div class="booking-time">
                <p>${booking.time}</p>
            </div>
        </div>
    `).join('');
}

// ===================================
// UTILITIES
// ===================================

// Format date to readable format
function formatDate(dateString) {
    const options = { year: 'numeric', month: 'short', day: 'numeric' };
    return new Date(dateString + 'T00:00:00').toLocaleDateString('en-US', options);
}

// Show toast notification
function showToast(message, type = 'success') {
    const toast = document.getElementById('toast');
    if (!toast) return;

    toast.textContent = message;
    toast.className = `toast ${type} show`;

    setTimeout(() => {
        toast.classList.remove('show');
    }, 4000);
}
/* ===================================
   SMART RESOURCE BOOKING SYSTEM - JAVASCRIPT
   =================================== */

// ===================================
// DATA MANAGEMENT
// ===================================

// Initialize localStorage with default data
function initializeData() {
    if (!localStorage.getItem('bookings')) {
        localStorage.setItem('bookings', JSON.stringify([]));
    }
    if (!localStorage.getItem('users')) {
        localStorage.setItem('users', JSON.stringify([]));
    }
}

// Get all bookings from localStorage
function getBookings() {
    return JSON.parse(localStorage.getItem('bookings') || '[]');
}

// Save bookings to localStorage
function saveBookings(bookings) {
    localStorage.setItem('bookings', JSON.stringify(bookings));
    updateDashboardStats();
}

// Get all users from localStorage
function getUsers() {
    return JSON.parse(localStorage.getItem('users') || '[]');
}

// Save users to localStorage
function saveUsers(users) {
    localStorage.setItem('users', JSON.stringify(users));
}

// Get current logged-in user
function getCurrentUser() {
    const user = localStorage.getItem('currentUser');
    return user ? JSON.parse(user) : null;
}

// ===================================
// OTP & AUTHENTICATION
// ===================================

let generatedOTP = '';
let registeredEmail = '';

// Generate random 6-digit OTP
function generateOTP() {
    return Math.floor(100000 + Math.random() * 900000).toString();
}

// Setup OTP and Login handlers
function setupLoginHandlers() {
    const sendOtpForm = document.getElementById('sendOtpForm');
    if (sendOtpForm) {
        sendOtpForm.addEventListener('submit', function(e) {
            e.preventDefault();
            const email = document.getElementById('email').value.trim();
            
            if (!email) {
                showToast('Please enter email or phone', 'error');
                return;
            }

            // Generate OTP
            generatedOTP = generateOTP();
            registeredEmail = email;

            // Show alert with OTP (for demo purposes)
            alert(`📋 Demo OTP: ${generatedOTP}\n\nCopy this code and paste it in the verification field.`);

            // Switch to OTP verification step
            document.getElementById('step1').style.display = 'none';
            document.getElementById('step2').style.display = 'block';
            document.getElementById('sentTo').textContent = email;
            
            // Focus on OTP input
            setTimeout(() => document.getElementById('otpInput').focus(), 100);
        });
    }

    // Handle Back button
    const backBtn = document.getElementById('backBtn');
    if (backBtn) {
        backBtn.addEventListener('click', function(e) {
            e.preventDefault();
            document.getElementById('step1').style.display = 'block';
            document.getElementById('step2').style.display = 'none';
            document.getElementById('otpInput').value = '';
            document.getElementById('otpError').textContent = '';
            document.getElementById('otpError').classList.remove('show');
        });
    }

    // Handle Verify OTP
    const verifyOtpForm = document.getElementById('verifyOtpForm');
    if (verifyOtpForm) {
        verifyOtpForm.addEventListener('submit', function(e) {
            e.preventDefault();
            const enteredOTP = document.getElementById('otpInput').value.trim();

            if (enteredOTP === generatedOTP) {
                // OTP is correct - show role selection
                document.getElementById('step2').style.display = 'none';
                document.getElementById('step3').style.display = 'block';
            } else {
                // OTP is incorrect
                const errorDiv = document.getElementById('otpError');
                errorDiv.textContent = '❌ Invalid OTP. Please try again.';
                errorDiv.classList.add('show');
                document.getElementById('otpInput').value = '';
                document.getElementById('otpInput').focus();
            }
        });
    }

    // Handle Resend OTP
    const resendBtn = document.getElementById('resendBtn');
    if (resendBtn) {
        resendBtn.addEventListener('click', function(e) {
            e.preventDefault();
            generatedOTP = generateOTP();
            alert(`📋 New OTP: ${generatedOTP}`);
            document.getElementById('otpInput').value = '';
            document.getElementById('otpError').textContent = '';
            document.getElementById('otpError').classList.remove('show');
            document.getElementById('otpInput').focus();
        });
    }

    // Handle Role Selection
    const userRoleBtn = document.getElementById('userRole');
    const adminRoleBtn = document.getElementById('adminRole');

    if (userRoleBtn) {
        userRoleBtn.addEventListener('click', function() {
            selectRole('User');
        });
    }

    if (adminRoleBtn) {
        adminRoleBtn.addEventListener('click', function() {
            selectRole('Admin');
        });
    }
}

// Select role and complete login
function selectRole(role) {
    const user = {
        email: registeredEmail,
        name: registeredEmail.split('@')[0],
        role: role,
        id: Date.now()
    };

    // Save user if not exists
    const users = getUsers();
    const userExists = users.some(u => u.email === user.email);
    if (!userExists) {
        users.push(user);
        saveUsers(users);
    }

    // Save current session
    localStorage.setItem('currentUser', JSON.stringify(user));

    // Redirect to dashboard
    setTimeout(() => {
        window.location.href = 'dashboard.html';
    }, 500);
}

// ===================================
// SESSION MANAGEMENT
// ===================================

// Check if user is logged in
function checkAuthenticationStatus() {
    const currentUser = getCurrentUser();
    if (!currentUser) {
        window.location.href = 'index.html';
        return null;
    }
    return currentUser;
}

// Logout user
function logout() {
    localStorage.removeItem('currentUser');
    window.location.href = 'index.html';
}

// ===================================
// DASHBOARD INITIALIZATION
// ===================================

// Setup Dashboard and Modal Handlers
function setupDashboard(currentUser) {
    // Initialize data
    initializeData();

    // Set user info in header
    const userNameElement = document.getElementById('userName');
    const userRoleElement = document.getElementById('userRole');
    if (userNameElement) userNameElement.textContent = currentUser.name;
    if (userRoleElement) userRoleElement.textContent = currentUser.role;

    // Show/hide admin panel based on role
    const adminLinks = document.querySelectorAll('.admin-only');
    if (currentUser.role === 'Admin') {
        adminLinks.forEach(link => link.classList.add('show'));
        const adminView = document.querySelector('[data-view="admin"]');
        if (adminView) adminView.style.display = 'flex';
    }

    // Set minimum date to today
    const today = new Date().toISOString().split('T')[0];
    const dateInput = document.getElementById('bookingDate');
    if (dateInput) {
        dateInput.min = today;
    }

    // Setup navigation
    setupNavigation();

    // Setup booking form
    setupBookingForm(currentUser);

    // Setup my bookings view
    setupMyBookingsView(currentUser);

    // Setup admin panel
    if (currentUser.role === 'Admin') {
        setupAdminPanel();
    }

    // Setup logout
    const logoutBtn = document.getElementById('logoutBtn');
    if (logoutBtn) {
        logoutBtn.addEventListener('click', logout);
    }

    // Update dashboard stats
    updateDashboardStats();

    // Display recent bookings
    displayRecentBookings(currentUser);
}

document.addEventListener('DOMContentLoaded', function() {
    // Check if we're on login page
    if (document.getElementById('sendOtpForm')) {
        // Setup login handlers
        setupLoginHandlers();
        return;
    }
    
    // Check if we're on dashboard page
    if (document.getElementById('bookingForm')) {
        // Check authentication
        const currentUser = checkAuthenticationStatus();
        if (!currentUser) return;

        // Setup dashboard
        setupDashboard(currentUser);
    }

    // Setup modal handlers for both pages
    setupModalHandlers();
});

// ===================================
// NAVIGATION
// ===================================

function setupNavigation() {
    const navLinks = document.querySelectorAll('.nav-link');

    navLinks.forEach(link => {
        link.addEventListener('click', function(e) {
            e.preventDefault();

            // Remove active class from all links
            navLinks.forEach(l => l.classList.remove('active'));

            // Add active class to clicked link
            this.classList.add('active');

            // Get view name
            const viewName = this.getAttribute('data-view');
            showView(viewName);
        });
    });
}

function showView(viewName) {
    // Hide all views
    const views = document.querySelectorAll('.view');
    views.forEach(view => view.classList.remove('active'));

    // Show selected view
    const selectedView = document.getElementById(viewName + 'View');
    if (selectedView) {
        selectedView.classList.add('active');
    }

    // Load view-specific data
    if (viewName === 'my-bookings') {
        loadMyBookings();
    } else if (viewName === 'admin') {
        loadAllBookings();
    }
}

// ===================================
// BOOKING FORM
// ===================================

function setupBookingForm(currentUser) {
    const bookingForm = document.getElementById('bookingForm');
    if (!bookingForm) return;

    // Auto-fill user info
    document.getElementById('formUserName').value = currentUser.name;
    document.getElementById('formUserEmail').value = currentUser.email;

    // Handle form submission
    bookingForm.addEventListener('submit', function(e) {
        e.preventDefault();

        const room = document.getElementById('roomSelect').value;
        const date = document.getElementById('bookingDate').value;
        const time = document.getElementById('bookingTime').value;

        if (!room || !date || !time) {
            showBookingError('Please fill all fields');
            return;
        }

        // Check for double booking
        const bookings = getBookings();
        const existingBooking = bookings.find(b => 
            b.room === room && b.date === date && b.time === time && b.status !== 'cancelled'
        );

        if (existingBooking) {
            // If current user is Admin, allow override
            if (currentUser.role === 'Admin') {
                showOverrideModal(room, date, time, existingBooking, currentUser);
                return;
            } else {
                // Regular user cannot override
                showBookingError('This slot is already booked. Please select another time.');
                return;
            }
        }

        // Create booking
        const booking = {
            id: Date.now(),
            user: currentUser.name,
            email: currentUser.email,
            room: room,
            date: date,
            time: time,
            role: currentUser.role,
            status: 'active',
            bookedAt: new Date().toISOString()
        };

        // Save booking
        bookings.push(booking);
        saveBookings(bookings);

        // Show success message
        showBookingSuccess(`✅ Room ${room} booked successfully for ${date} at ${time}`);

        // Reset form
        bookingForm.reset();
    });

    // Update availability when room or date changes
    const roomSelect = document.getElementById('roomSelect');
    const dateInput = document.getElementById('bookingDate');

    if (roomSelect) {
        roomSelect.addEventListener('change', updateAvailability);
    }
    if (dateInput) {
        dateInput.addEventListener('change', updateAvailability);
    }
}

function updateAvailability() {
    const room = document.getElementById('roomSelect').value;
    const date = document.getElementById('bookingDate').value;
    const availabilityDiv = document.getElementById('availabilityDisplay');

    if (!room || !date) {
        availabilityDiv.innerHTML = '<p>Select room and date to see availability</p>';
        return;
    }

    const bookings = getBookings();
    const timeSlots = [
        '09:00', '10:00', '11:00', '12:00',
        '13:00', '14:00', '15:00', '16:00'
    ];

    let html = '';
    timeSlots.forEach(time => {
        const isBooked = bookings.some(b => 
            b.room === room && b.date === date && b.time === time && b.status !== 'cancelled'
        );

        const slotClass = isBooked ? 'booked' : 'available';
        const slotText = isBooked ? '🔴 ' : '🟢 ';
        html += `<div class="time-slot ${slotClass}">${slotText}${time}</div>`;
    });

    availabilityDiv.innerHTML = html;
}

function showBookingError(message) {
    const errorDiv = document.getElementById('bookingError');
    errorDiv.textContent = message;
    errorDiv.classList.add('show');

    setTimeout(() => {
        errorDiv.classList.remove('show');
    }, 5000);
}

function showBookingSuccess(message) {
    const successDiv = document.getElementById('bookingSuccess');
    successDiv.textContent = message;
    successDiv.classList.add('show');

    setTimeout(() => {
        successDiv.classList.remove('show');
    }, 5000);

    // Also show toast
    showToast(message, 'success');
}

// ===================================
// MY BOOKINGS VIEW
// ===================================

function setupMyBookingsView(currentUser) {
    const filterRoom = document.getElementById('filterRoom');
    if (filterRoom) {
        filterRoom.addEventListener('input', loadMyBookings);
    }
}

function loadMyBookings() {
    const currentUser = getCurrentUser();
    const bookings = getBookings();
    const filter = document.getElementById('filterRoom')?.value.toLowerCase() || '';

    // Filter bookings for current user
    let userBookings = bookings.filter(b => b.email === currentUser.email);

    // Apply filter
    if (filter) {
        userBookings = userBookings.filter(b => 
            b.room.toLowerCase().includes(filter)
        );
    }

    // Sort by date
    userBookings.sort((a, b) => new Date(b.bookedAt) - new Date(a.bookedAt));

    // Display in table
    const tableBody = document.getElementById('myBookingsTable');
    if (!tableBody) return;

    if (userBookings.length === 0) {
        tableBody.innerHTML = '<tr><td colspan="6" class="empty-state">No bookings found</td></tr>';
        return;
    }

    tableBody.innerHTML = userBookings.map(booking => `
        <tr>
            <td>${booking.user}</td>
            <td>${booking.room}</td>
            <td>${formatDate(booking.date)}</td>
            <td>${booking.time}</td>
            <td>
                <span class="status-badge status-${booking.status.toLowerCase()}">
                    ${booking.status === 'overridden' ? '⚠️ Overridden' : booking.status === 'cancelled' ? '❌ Cancelled' : '✅ Active'}
                </span>
            </td>
            <td>
                ${booking.status === 'active' ? `
                    <div class="action-buttons">
                        <button class="btn btn-small" onclick="showCancelModal(${booking.id})">Cancel</button>
                    </div>
                ` : '<span style="color: var(--text-secondary); font-size: 12px;">No action</span>'}
            </td>
        </tr>
    `).join('');
}

// ===================================
// ADMIN PANEL
// ===================================

function setupAdminPanel() {
    const adminTabs = document.querySelectorAll('.admin-tab-btn');

    adminTabs.forEach(btn => {
        btn.addEventListener('click', function() {
            const tabName = this.getAttribute('data-tab');

            // Remove active from all tabs
            adminTabs.forEach(b => b.classList.remove('active'));
            this.classList.add('active');

            // Hide all tab contents
            document.querySelectorAll('.admin-tab-content').forEach(content => {
                content.classList.remove('active');
            });

            // Show selected tab content
            const tabContent = document.getElementById(tabName + 'Tab');
            if (tabContent) {
                tabContent.classList.add('active');
            }

            // Load data if switching to bookings tab
            if (tabName === 'all-bookings') {
                loadAllBookings();
            }
        });
    });
}

function loadAllBookings() {
    const bookings = getBookings();

    // Sort by date
    bookings.sort((a, b) => new Date(b.bookedAt) - new Date(a.bookedAt));

    const tableBody = document.getElementById('allBookingsTable');
    if (!tableBody) return;

    if (bookings.length === 0) {
        tableBody.innerHTML = '<tr><td colspan="7" class="empty-state">No bookings found</td></tr>';
        return;
    }

    tableBody.innerHTML = bookings.map(booking => `
        <tr>
            <td>${booking.user}</td>
            <td>${booking.room}</td>
            <td>${formatDate(booking.date)}</td>
            <td>${booking.time}</td>
            <td>
                <span class="status-badge">${booking.role}</span>
            </td>
            <td>
                <span class="status-badge status-${booking.status.toLowerCase()}">
                    ${booking.status === 'overridden' ? '⚠️ Overridden' : booking.status === 'cancelled' ? '❌ Cancelled' : '✅ Active'}
                </span>
            </td>
            <td>
                <div class="action-buttons">
                    ${booking.status === 'active' ? `
                        <button class="btn btn-small" onclick="showCancelModal(${booking.id})">Cancel</button>
                    ` : ''}
                    <button class="btn btn-small" onclick="deleteBooking(${booking.id})">Delete</button>
                </div>
            </td>
        </tr>
    `).join('');
}

function deleteBooking(bookingId) {
    if (confirm('Are you sure you want to permanently delete this booking?')) {
        const bookings = getBookings();
        const filtered = bookings.filter(b => b.id !== bookingId);
        saveBookings(filtered);
        loadAllBookings();
        showToast('Booking deleted', 'success');
    }
}

// ===================================
// OVERRIDE & CANCEL BOOKING
// ===================================

let pendingOverride = null;
let pendingCancel = null;

function showOverrideModal(room, date, time, existingBooking, adminUser) {
    pendingOverride = {
        room, date, time, existingBooking, adminUser
    };

    const modal = document.getElementById('overrideModal');
    const info = document.getElementById('overrideInfo');

    info.innerHTML = `
        <p><strong>Current Booking:</strong></p>
        <p>User: ${existingBooking.user}</p>
        <p>Room: ${existingBooking.room}</p>
        <p>Date: ${formatDate(existingBooking.date)}</p>
        <p>Time: ${existingBooking.time}</p>
    `;

    modal.style.display = 'flex';
}

function setupModalHandlers() {
    // Override modal handlers
    const confirmOverride = document.getElementById('confirmOverride');
    if (confirmOverride) {
        confirmOverride.addEventListener('click', function() {
            if (pendingOverride) {
                executeOverride();
            }
        });
    }

    const cancelOverride = document.getElementById('cancelOverride');
    if (cancelOverride) {
        cancelOverride.addEventListener('click', function() {
            closeModal('overrideModal');
            pendingOverride = null;
        });
    }

    // Cancel modal handlers
    const cancelDelete = document.getElementById('cancelDelete');
    if (cancelDelete) {
        cancelDelete.addEventListener('click', function() {
            if (pendingCancel) {
                executeCancelBooking();
            }
        });
    }

    const cancelConfirm = document.getElementById('cancelConfirm');
    if (cancelConfirm) {
        cancelConfirm.addEventListener('click', function() {
            closeModal('cancelModal');
            pendingCancel = null;
        });
    }

    // Close modal handlers
    const closeModals = document.querySelectorAll('.close-modal');
    closeModals.forEach(btn => {
        btn.addEventListener('click', function() {
            this.closest('.modal').style.display = 'none';
        });
    });

    // Close modal when clicking outside
    const modals = document.querySelectorAll('.modal');
    modals.forEach(modal => {
        modal.addEventListener('click', function(e) {
            if (e.target === this) {
                this.style.display = 'none';
            }
        });
    });
}

function executeOverride() {
    const { room, date, time, existingBooking, adminUser } = pendingOverride;

    const bookings = getBookings();

    // Cancel existing booking
    const existingIndex = bookings.findIndex(b => b.id === existingBooking.id);
    if (existingIndex !== -1) {
        bookings[existingIndex].status = 'overridden';
        bookings[existingIndex].overriddenAt = new Date().toISOString();
        bookings[existingIndex].overriddenBy = adminUser.name;
    }

    // Create new admin booking
    const adminBooking = {
        id: Date.now(),
        user: adminUser.name,
        email: adminUser.email,
        room: room,
        date: date,
        time: time,
        role: 'Admin',
        status: 'active',
        bookedAt: new Date().toISOString(),
        overridingUser: existingBooking.user
    };

    bookings.push(adminBooking);
    saveBookings(bookings);

    // Close modal
    closeModal('overrideModal');

    // Show success toast
    showToast(`⚠️ Admin priority applied. Previous booking overridden.`, 'warning');

    pendingOverride = null;
}

let pendingCancel = null;

function showCancelModal(bookingId) {
    pendingCancel = bookingId;

    const bookings = getBookings();
    const booking = bookings.find(b => b.id === bookingId);

    if (!booking) return;

    const modal = document.getElementById('cancelModal');
    const info = document.getElementById('cancelInfo');

    info.innerHTML = `
        <p><strong>Booking Details:</strong></p>
        <p>Room: ${booking.room}</p>
        <p>Date: ${formatDate(booking.date)}</p>
        <p>Time: ${booking.time}</p>
    `;

    modal.style.display = 'flex';
}

function executeCancelBooking() {
    const bookings = getBookings();
    const index = bookings.findIndex(b => b.id === pendingCancel);

    if (index !== -1) {
        bookings[index].status = 'cancelled';
        bookings[index].cancelledAt = new Date().toISOString();
        saveBookings(bookings);

        closeModal('cancelModal');
        showToast('Booking cancelled successfully', 'success');

        // Refresh current view
        const currentUser = getCurrentUser();
        if (currentUser) {
            loadMyBookings();
            loadAllBookings();
        }
    }

    pendingCancel = null;
}

function closeModal(modalId) {
    const modal = document.getElementById(modalId);
    if (modal) {
        modal.style.display = 'none';
    }
}

// ===================================
// DASHBOARD STATS
// ===================================

function updateDashboardStats() {
    const bookings = getBookings();
    const users = getUsers();
    const activeBookings = bookings.filter(b => b.status === 'active');
    const availableSlots = (3 * 8) - activeBookings.length; // 3 rooms, 8 slots each

    document.getElementById('totalRooms').textContent = '3';
    document.getElementById('availableSlots').textContent = Math.max(0, availableSlots);
    document.getElementById('activeBookings').textContent = activeBookings.length;
    document.getElementById('totalUsers').textContent = users.length;
}

function displayRecentBookings(currentUser) {
    const bookings = getBookings();
    let recentBookings;

    if (currentUser.role === 'Admin') {
        // Show all recent bookings for admin
        recentBookings = bookings.filter(b => b.status === 'active');
    } else {
        // Show only user's recent bookings
        recentBookings = bookings.filter(b => 
            b.email === currentUser.email && b.status === 'active'
        );
    }

    recentBookings.sort((a, b) => new Date(b.bookedAt) - new Date(a.bookedAt));
    recentBookings = recentBookings.slice(0, 5);

    const container = document.getElementById('recentBookingsContainer');
    if (!container) return;

    if (recentBookings.length === 0) {
        container.innerHTML = '<p class="empty-state">No active bookings</p>';
        return;
    }

    container.innerHTML = recentBookings.map(booking => `
        <div class="booking-item">
            <div class="booking-info">
                <h4>${booking.room}</h4>
                <p>${booking.user} • ${formatDate(booking.date)}</p>
            </div>
            <div class="booking-time">
                <p>${booking.time}</p>
            </div>
        </div>
    `).join('');
}

// ===================================
// UTILITIES
// ===================================

// Format date to readable format
function formatDate(dateString) {
    const options = { year: 'numeric', month: 'short', day: 'numeric' };
    return new Date(dateString + 'T00:00:00').toLocaleDateString('en-US', options);
}

// Show toast notification
function showToast(message, type = 'success') {
    const toast = document.getElementById('toast');
    if (!toast) return;

    toast.textContent = message;
    toast.className = `toast ${type} show`;

    setTimeout(() => {
        toast.classList.remove('show');
    }, 4000);
}
