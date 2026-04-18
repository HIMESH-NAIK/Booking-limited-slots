/**
 * Smart Resource Booking System - Backend Server
 * 
 * Node.js + Express + MongoDB
 * Supports JWT authentication and priority-based booking system
 * 
 * IMPORTANT: Frontend remains completely unchanged and uses localStorage as fallback
 */

import express from 'express';
import cors from 'cors';
import bodyParser from 'body-parser';
import dotenv from 'dotenv';
import { MongoClient } from 'mongodb';
import { createUserModel } from './models/User.js';
import { createBookingModel } from './models/Booking.js';
import { createResourceModel } from './models/Resource.js';
import { createComplaintModel } from './models/Complaint.js';
import { authenticateToken, authorizeRoles, generateToken } from './middleware/auth.js';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors({
    origin: process.env.FRONTEND_URL || 'http://localhost:8000',
    credentials: true
}));
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

// MongoDB Connection
let db;
let models = {};

const connectMongoDB = async () => {
    try {
        const mongoUri = process.env.DB_MODE === 'cloud' 
            ? process.env.MONGODB_URI 
            : process.env.MONGODB_LOCAL;

        const client = new MongoClient(mongoUri);
        await client.connect();
        db = client.db('booking-system');

        // Initialize models
        models.User = createUserModel(db);
        models.Booking = createBookingModel(db);
        models.Resource = createResourceModel(db);
        models.Complaint = createComplaintModel(db);

        console.log('✅ MongoDB connected successfully');
    } catch (err) {
        console.error('❌ MongoDB connection error:', err);
        // Allow server to run without MongoDB (frontend will use localStorage)
    }
};

// ============================================
// HEALTH CHECK
// ============================================

app.get('/api/health', (req, res) => {
    res.json({
        success: true,
        message: 'Backend server is running',
        database: db ? 'connected' : 'disconnected',
        version: '2.0'
    });
});

// ============================================
// AUTHENTICATION ROUTES
// ============================================

/**
 * Login endpoint (frontend-compatible)
 * Accepts any email/password for demo mode
 */
app.post('/api/auth/login', async (req, res) => {
    try {
        const { email, password } = req.body;

        if (!email || !password) {
            return res.status(400).json({
                success: false,
                message: 'Email and password are required'
            });
        }

        let user;
        
        if (db) {
            user = await models.User.findByEmail(email);
            
            if (!user) {
                // Create new user on first login (demo mode)
                user = await models.User.create({
                    email,
                    password: password, // In production, hash this
                    role: 'student'
                });
            }
        } else {
            // Fallback when MongoDB not available
            user = {
                email,
                role: 'student',
                _id: 'local-' + Date.now()
            };
        }

        const token = generateToken(user);

        res.json({
            success: true,
            message: 'Login successful',
            token,
            user: {
                id: user._id,
                email: user.email,
                role: user.role,
                name: user.name || email.split('@')[0]
            }
        });
    } catch (err) {
        console.error('Login error:', err);
        res.status(500).json({
            success: false,
            message: 'Login failed'
        });
    }
});

/**
 * Role selection endpoint
 */
app.post('/api/auth/select-role', authenticateToken, async (req, res) => {
    try {
        const { role } = req.body;
        const validRoles = ['student', 'teacher', 'admin', 'cr'];

        if (!validRoles.includes(role)) {
            return res.status(400).json({
                success: false,
                message: 'Invalid role'
            });
        }

        if (db) {
            await models.User.updateProfile(req.userId, { role });
        }

        const token = generateToken({
            _id: req.userId,
            email: req.userEmail,
            role
        });

        res.json({
            success: true,
            message: 'Role selected',
            token
        });
    } catch (err) {
        console.error('Role selection error:', err);
        res.status(500).json({
            success: false,
            message: 'Role selection failed'
        });
    }
});

// ============================================
// BOOKING ROUTES
// ============================================

/**
 * Create booking with priority system
 * 
 * Priority levels:
 * - Emergency (100)
 * - Hospital Critical (90)
 * - Exam (80)
 * - Important (50)
 * - GD (30)
 * - Regular (20)
 */
app.post('/api/bookings/create', authenticateToken, async (req, res) => {
    try {
        const {
            resourceId,
            resourceName,
            date,
            slotIndex,
            time,
            priority = 20,
            priorityReason = ''
        } = req.body;

        if (!db) {
            return res.status(503).json({
                success: false,
                message: 'Database not available. Using localStorage.',
                shouldUseFallback: true
            });
        }

        // Check for conflicts
        const conflict = await models.Booking.checkConflict(
            resourceId,
            date,
            slotIndex,
            priority
        );

        if (conflict.conflict) {
            if (conflict.canOverride) {
                // Cancel existing lower-priority booking
                await models.Booking.cancel(conflict.existingBookingId);
            } else {
                return res.status(409).json({
                    success: false,
                    message: conflict.message,
                    canRetry: false
                });
            }
        }

        // Create new booking
        const booking = await models.Booking.create({
            userId: req.userId,
            userEmail: req.userEmail,
            userRole: req.userRole,
            resourceId,
            resourceName,
            date,
            slotIndex,
            time,
            priority,
            priorityReason
        });

        res.status(201).json({
            success: true,
            message: 'Booking confirmed',
            booking: {
                id: booking._id,
                resourceName: booking.resourceName,
                date: booking.date,
                time: booking.time,
                priority: booking.priority
            }
        });
    } catch (err) {
        console.error('Booking creation error:', err);
        res.status(500).json({
            success: false,
            message: 'Booking failed'
        });
    }
});

/**
 * Get user's bookings
 */
app.get('/api/bookings/my-bookings', authenticateToken, async (req, res) => {
    try {
        if (!db) {
            return res.status(503).json({
                success: false,
                message: 'Database not available',
                shouldUseFallback: true
            });
        }

        const bookings = await models.Booking.findByUserEmail(req.userEmail);

        res.json({
            success: true,
            bookings
        });
    } catch (err) {
        console.error('Get bookings error:', err);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch bookings'
        });
    }
});

/**
 * Get all bookings (admin only)
 */
app.get('/api/bookings/all', authenticateToken, authorizeRoles('admin'), async (req, res) => {
    try {
        if (!db) {
            return res.status(503).json({
                success: false,
                message: 'Database not available'
            });
        }

        const bookings = await models.Booking.findAll();

        res.json({
            success: true,
            bookings
        });
    } catch (err) {
        console.error('Get all bookings error:', err);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch bookings'
        });
    }
});

/**
 * Get bookings by resource
 */
app.get('/api/bookings/resource/:resourceId', authenticateToken, async (req, res) => {
    try {
        if (!db) {
            return res.status(503).json({
                success: false,
                message: 'Database not available'
            });
        }

        const bookings = await models.Booking.findByResourceId(req.params.resourceId);

        res.json({
            success: true,
            bookings
        });
    } catch (err) {
        console.error('Get resource bookings error:', err);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch bookings'
        });
    }
});

/**
 * Cancel booking
 */
app.delete('/api/bookings/:bookingId', authenticateToken, async (req, res) => {
    try {
        if (!db) {
            return res.status(503).json({
                success: false,
                message: 'Database not available. Using localStorage.',
                shouldUseFallback: true
            });
        }

        const success = await models.Booking.cancel(req.params.bookingId);

        if (!success) {
            return res.status(404).json({
                success: false,
                message: 'Booking not found'
            });
        }

        res.json({
            success: true,
            message: 'Booking cancelled'
        });
    } catch (err) {
        console.error('Cancel booking error:', err);
        res.status(500).json({
            success: false,
            message: 'Failed to cancel booking'
        });
    }
});

// ============================================
// RESOURCE ROUTES
// ============================================

/**
 * Get resources accessible by user role
 */
app.get('/api/resources', authenticateToken, async (req, res) => {
    try {
        if (!db) {
            return res.status(503).json({
                success: false,
                message: 'Database not available'
            });
        }

        const resources = await models.Resource.getAccessibleResources(req.userRole);

        res.json({
            success: true,
            resources
        });
    } catch (err) {
        console.error('Get resources error:', err);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch resources'
        });
    }
});

/**
 * Get all resources (admin only)
 */
app.get('/api/resources/all', authenticateToken, authorizeRoles('admin'), async (req, res) => {
    try {
        if (!db) {
            return res.status(503).json({
                success: false,
                message: 'Database not available'
            });
        }

        const resources = await models.Resource.findAll();

        res.json({
            success: true,
            resources
        });
    } catch (err) {
        console.error('Get all resources error:', err);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch resources'
        });
    }
});

/**
 * Update resource slots (admin only)
 */
app.put('/api/resources/:resourceId/slots', authenticateToken, authorizeRoles('admin'), async (req, res) => {
    try {
        if (!db) {
            return res.status(503).json({
                success: false,
                message: 'Database not available'
            });
        }

        const { slots } = req.body;
        const success = await models.Resource.updateSlots(req.params.resourceId, slots);

        if (!success) {
            return res.status(404).json({
                success: false,
                message: 'Resource not found'
            });
        }

        res.json({
            success: true,
            message: 'Slots updated'
        });
    } catch (err) {
        console.error('Update slots error:', err);
        res.status(500).json({
            success: false,
            message: 'Failed to update slots'
        });
    }
});

// ============================================
// COMPLAINT ROUTES
// ============================================

/**
 * Create complaint
 */
app.post('/api/complaints/create', authenticateToken, async (req, res) => {
    try {
        if (!db) {
            return res.status(503).json({
                success: false,
                message: 'Database not available',
                shouldUseFallback: true
            });
        }

        const {
            resourceId,
            resourceName,
            title,
            description,
            category = 'general',
            priority = 'normal'
        } = req.body;

        if (!title || !description) {
            return res.status(400).json({
                success: false,
                message: 'Title and description are required'
            });
        }

        const complaint = await models.Complaint.create({
            userId: req.userId,
            userEmail: req.userEmail,
            userName: req.userEmail.split('@')[0],
            userRole: req.userRole,
            resourceId,
            resourceName,
            title,
            description,
            category,
            priority
        });

        res.status(201).json({
            success: true,
            message: 'Complaint submitted successfully',
            complaint: {
                id: complaint._id,
                title: complaint.title,
                status: complaint.status,
                createdAt: complaint.createdAt
            }
        });
    } catch (err) {
        console.error('Complaint creation error:', err);
        res.status(500).json({
            success: false,
            message: 'Failed to submit complaint'
        });
    }
});

/**
 * Get user's complaints
 */
app.get('/api/complaints/my-complaints', authenticateToken, async (req, res) => {
    try {
        if (!db) {
            return res.status(503).json({
                success: false,
                message: 'Database not available'
            });
        }

        const complaints = await models.Complaint.findByUserEmail(req.userEmail);

        res.json({
            success: true,
            complaints
        });
    } catch (err) {
        console.error('Get complaints error:', err);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch complaints'
        });
    }
});

/**
 * Get all complaints (admin only)
 */
app.get('/api/complaints/all', authenticateToken, authorizeRoles('admin'), async (req, res) => {
    try {
        if (!db) {
            return res.status(503).json({
                success: false,
                message: 'Database not available'
            });
        }

        const complaints = await models.Complaint.findAll();
        const stats = await models.Complaint.getStats();

        res.json({
            success: true,
            complaints,
            stats
        });
    } catch (err) {
        console.error('Get all complaints error:', err);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch complaints'
        });
    }
});

/**
 * Update complaint status (admin only)
 */
app.put('/api/complaints/:complaintId/status', authenticateToken, authorizeRoles('admin'), async (req, res) => {
    try {
        if (!db) {
            return res.status(503).json({
                success: false,
                message: 'Database not available'
            });
        }

        const { status, adminNotes } = req.body;
        const validStatuses = ['open', 'in-progress', 'resolved', 'closed'];

        if (!validStatuses.includes(status)) {
            return res.status(400).json({
                success: false,
                message: 'Invalid status'
            });
        }

        const success = await models.Complaint.updateStatus(req.params.complaintId, status, adminNotes);

        if (!success) {
            return res.status(404).json({
                success: false,
                message: 'Complaint not found'
            });
        }

        res.json({
            success: true,
            message: 'Complaint status updated'
        });
    } catch (err) {
        console.error('Update complaint error:', err);
        res.status(500).json({
            success: false,
            message: 'Failed to update complaint'
        });
    }
});

// ============================================
// ERROR HANDLING
// ============================================

app.use((req, res) => {
    res.status(404).json({
        success: false,
        message: 'Endpoint not found'
    });
});

// ============================================
// START SERVER
// ============================================

const startServer = async () => {
    try {
        await connectMongoDB();
        
        app.listen(PORT, () => {
            console.log(`\n🚀 Backend Server running on http://localhost:${PORT}`);
            console.log(`📝 API Documentation: http://localhost:${PORT}/api/health`);
            console.log(`\n⚠️  IMPORTANT: Frontend continues to work with localStorage fallback`);
            console.log(`   If backend is unavailable, all features work normally\n`);
        });
    } catch (err) {
        console.error('Failed to start server:', err);
        process.exit(1);
    }
};

startServer();
