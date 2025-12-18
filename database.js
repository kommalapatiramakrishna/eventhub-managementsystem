/**
 * Database Configuration
 * Handles MongoDB connection and in-memory fallback
 */

const mongoose = require('mongoose');

class DatabaseManager {
  constructor() {
    this.isConnected = false;
    this.connectionString = process.env.MONGODB_URI || 'mongodb://localhost:27017/eventhub';
  }

  async connect() {
    try {
      await mongoose.connect(this.connectionString, {
        useNewUrlParser: true,
        useUnifiedTopology: true,
      });
      
      this.isConnected = true;
      console.log('✅ MongoDB Connected Successfully');
      return true;
    } catch (error) {
      console.error('❌ MongoDB Connection Failed:', error.message);
      console.log('⚠️  Falling back to in-memory storage');
      return false;
    }
  }

  async disconnect() {
    if (this.isConnected) {
      await mongoose.disconnect();
      this.isConnected = false;
      console.log('📴 MongoDB Disconnected');
    }
  }

  getConnectionStatus() {
    return this.isConnected;
  }
}

module.exports = new DatabaseManager();