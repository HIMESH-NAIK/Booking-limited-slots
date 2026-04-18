/**
 * User Model
 * Represents system users with role-based access control
 */

export const createUserModel = (db) => {
    return {
        async create(userData) {
            const usersCollection = db.collection('users');
            
            const newUser = {
                email: userData.email,
                password: userData.password, // Should be hashed in controller
                name: userData.name || userData.email.split('@')[0],
                role: userData.role || 'student', // student, teacher, admin, cr
                createdAt: new Date(),
                updatedAt: new Date(),
                isActive: true,
                department: userData.department || '',
                enrollmentNumber: userData.enrollmentNumber || ''
            };

            const result = await usersCollection.insertOne(newUser);
            return { ...newUser, _id: result.insertedId };
        },

        async findByEmail(email) {
            const usersCollection = db.collection('users');
            return await usersCollection.findOne({ email });
        },

        async findById(userId) {
            const usersCollection = db.collection('users');
            const { ObjectId } = require('mongodb');
            return await usersCollection.findOne({ _id: new ObjectId(userId) });
        },

        async updateProfile(userId, updates) {
            const usersCollection = db.collection('users');
            const { ObjectId } = require('mongodb');
            
            const result = await usersCollection.updateOne(
                { _id: new ObjectId(userId) },
                { 
                    $set: {
                        ...updates,
                        updatedAt: new Date()
                    }
                }
            );

            return result.modifiedCount > 0;
        },

        async getAllByRole(role) {
            const usersCollection = db.collection('users');
            return await usersCollection.find({ role, isActive: true }).toArray();
        }
    };
};
