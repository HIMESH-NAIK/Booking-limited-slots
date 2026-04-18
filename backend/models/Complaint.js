/**
 * Complaint Model
 * Handles user complaints about resources
 */

export const createComplaintModel = (db) => {
    return {
        async create(complaintData) {
            const complaintsCollection = db.collection('complaints');
            
            const newComplaint = {
                userId: complaintData.userId,
                userEmail: complaintData.userEmail,
                userName: complaintData.userName,
                userRole: complaintData.userRole,
                resourceId: complaintData.resourceId,
                resourceName: complaintData.resourceName,
                title: complaintData.title,
                description: complaintData.description,
                category: complaintData.category || 'general', // general, maintenance, unavailable, other
                priority: complaintData.priority || 'normal', // low, normal, high
                status: 'open', // open, in-progress, resolved, closed
                attachments: complaintData.attachments || [],
                createdAt: new Date(),
                updatedAt: new Date(),
                resolvedAt: null,
                adminNotes: ''
            };

            const result = await complaintsCollection.insertOne(newComplaint);
            return { ...newComplaint, _id: result.insertedId };
        },

        async findById(complaintId) {
            const complaintsCollection = db.collection('complaints');
            const { ObjectId } = require('mongodb');
            return await complaintsCollection.findOne({ _id: new ObjectId(complaintId) });
        },

        async findByUserEmail(email) {
            const complaintsCollection = db.collection('complaints');
            return await complaintsCollection
                .find({ userEmail: email })
                .sort({ createdAt: -1 })
                .toArray();
        },

        async findAll() {
            const complaintsCollection = db.collection('complaints');
            return await complaintsCollection
                .find({})
                .sort({ createdAt: -1 })
                .toArray();
        },

        async findByStatus(status) {
            const complaintsCollection = db.collection('complaints');
            return await complaintsCollection
                .find({ status })
                .sort({ createdAt: -1 })
                .toArray();
        },

        async updateStatus(complaintId, status, adminNotes = '') {
            const complaintsCollection = db.collection('complaints');
            const { ObjectId } = require('mongodb');
            
            const updateData = {
                status,
                adminNotes,
                updatedAt: new Date()
            };

            if (status === 'resolved' || status === 'closed') {
                updateData.resolvedAt = new Date();
            }

            const result = await complaintsCollection.updateOne(
                { _id: new ObjectId(complaintId) },
                { $set: updateData }
            );

            return result.modifiedCount > 0;
        },

        async getStats() {
            const complaintsCollection = db.collection('complaints');
            
            const stats = {
                total: await complaintsCollection.countDocuments(),
                open: await complaintsCollection.countDocuments({ status: 'open' }),
                inProgress: await complaintsCollection.countDocuments({ status: 'in-progress' }),
                resolved: await complaintsCollection.countDocuments({ status: 'resolved' })
            };

            return stats;
        }
    };
};
