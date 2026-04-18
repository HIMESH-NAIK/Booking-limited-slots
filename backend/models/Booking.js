/**
 * Booking Model
 * Handles resource booking with priority system
 * 
 * Priority Levels:
 * - Emergency (100)
 * - Hospital Critical (90)
 * - Exam (80)
 * - Important (50)
 * - GD (30)
 * - Regular (20)
 */

export const createBookingModel = (db) => {
    return {
        async create(bookingData) {
            const bookingsCollection = db.collection('bookings');
            
            const newBooking = {
                userId: bookingData.userId,
                userEmail: bookingData.userEmail,
                userRole: bookingData.userRole,
                resourceId: bookingData.resourceId,
                resourceName: bookingData.resourceName,
                date: new Date(bookingData.date),
                slotIndex: bookingData.slotIndex,
                time: bookingData.time,
                priority: bookingData.priority || 20, // Default: Regular
                priorityReason: bookingData.priorityReason || '',
                status: 'confirmed',
                createdAt: new Date(),
                updatedAt: new Date()
            };

            const result = await bookingsCollection.insertOne(newBooking);
            return { ...newBooking, _id: result.insertedId };
        },

        async findByResourceAndSlot(resourceId, date, slotIndex) {
            const bookingsCollection = db.collection('bookings');
            return await bookingsCollection.findOne({
                resourceId,
                date: new Date(date),
                slotIndex,
                status: 'confirmed'
            });
        },

        async findByUserEmail(email) {
            const bookingsCollection = db.collection('bookings');
            return await bookingsCollection.find({ userEmail: email }).sort({ date: -1 }).toArray();
        },

        async findAll() {
            const bookingsCollection = db.collection('bookings');
            return await bookingsCollection.find({ status: 'confirmed' }).sort({ date: -1 }).toArray();
        },

        async findByResourceId(resourceId) {
            const bookingsCollection = db.collection('bookings');
            return await bookingsCollection.find({ resourceId, status: 'confirmed' }).toArray();
        },

        async cancel(bookingId) {
            const bookingsCollection = db.collection('bookings');
            const { ObjectId } = require('mongodb');
            
            const result = await bookingsCollection.updateOne(
                { _id: new ObjectId(bookingId) },
                { 
                    $set: {
                        status: 'cancelled',
                        updatedAt: new Date()
                    }
                }
            );

            return result.modifiedCount > 0;
        },

        async checkConflict(resourceId, date, slotIndex, priority) {
            const bookingsCollection = db.collection('bookings');
            
            const existingBooking = await bookingsCollection.findOne({
                resourceId,
                date: new Date(date),
                slotIndex,
                status: 'confirmed'
            });

            if (!existingBooking) {
                return { conflict: false };
            }

            // Check if new priority is higher
            if (priority > existingBooking.priority) {
                return {
                    conflict: true,
                    canOverride: true,
                    existingBookingId: existingBooking._id,
                    message: `Higher priority booking detected. Will override booking with priority ${existingBooking.priority}`
                };
            }

            return {
                conflict: true,
                canOverride: false,
                message: `Slot already booked with higher/equal priority (${existingBooking.priority})`
            };
        },

        async getBookingHistory(userEmail, limit = 10) {
            const bookingsCollection = db.collection('bookings');
            return await bookingsCollection
                .find({ userEmail })
                .sort({ date: -1 })
                .limit(limit)
                .toArray();
        }
    };
};
