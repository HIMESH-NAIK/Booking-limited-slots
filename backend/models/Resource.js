/**
 * Resource Model
 * Manages resource definitions and availability
 */

export const createResourceModel = (db) => {
    return {
        async create(resourceData) {
            const resourcesCollection = db.collection('resources');
            
            const newResource = {
                name: resourceData.name,
                type: resourceData.type,
                slots: resourceData.slots || 8,
                description: resourceData.description || '',
                isActive: true,
                createdAt: new Date(),
                updatedAt: new Date()
            };

            const result = await resourcesCollection.insertOne(newResource);
            return { ...newResource, _id: result.insertedId };
        },

        async findAll() {
            const resourcesCollection = db.collection('resources');
            return await resourcesCollection.find({ isActive: true }).toArray();
        },

        async findById(resourceId) {
            const resourcesCollection = db.collection('resources');
            const { ObjectId } = require('mongodb');
            return await resourcesCollection.findOne({ _id: new ObjectId(resourceId), isActive: true });
        },

        async findByName(name) {
            const resourcesCollection = db.collection('resources');
            return await resourcesCollection.findOne({ name, isActive: true });
        },

        async getAccessibleResources(role) {
            const resourcesCollection = db.collection('resources');
            
            if (role === 'student') {
                // Students can only access 2 resources
                return await resourcesCollection
                    .find({ type: { $in: ['medical', 'meeting'] }, isActive: true })
                    .toArray();
            }

            // Teachers and admins can access all resources
            return await resourcesCollection.find({ isActive: true }).toArray();
        },

        async updateSlots(resourceId, newSlotCount) {
            const resourcesCollection = db.collection('resources');
            const { ObjectId } = require('mongodb');
            
            const result = await resourcesCollection.updateOne(
                { _id: new ObjectId(resourceId) },
                { 
                    $set: {
                        slots: newSlotCount,
                        updatedAt: new Date()
                    }
                }
            );

            return result.modifiedCount > 0;
        }
    };
};
