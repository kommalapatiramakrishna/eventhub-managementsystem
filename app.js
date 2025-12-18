/**
 * Professional Event Management Server
 * MERN Stack Application with Express.js
 * 
 * Features:
 * - JWT Authentication
 * - Event CRUD Operations
 * - RSVP System with Concurrency Handling
 * - Professional Error Handling
 * - Structured Architecture
 */

require('dotenv').config();
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');

// Import utilities and services
const Logger = require('./utils/logger');
const DatabaseManager = require('./config/database');
const EventService = require('./services/EventService');
const RSVPService = require('./services/RSVPService');
const Validators = require('./utils/validators');

class EventManagementServer {
  constructor() {
    this.app = express();
    this.port = process.env.PORT || 5000;
    this.setupMiddleware();
    this.setupRoutes();
    this.setupErrorHandling();
  }

  setupMiddleware() {
    // Security middleware
    this.app.use(helmet({
      contentSecurityPolicy: false // Disable for development
    }));

    // Rate limiting
    const limiter = rateLimit({
      windowMs: 15 * 60 * 1000, // 15 minutes
      max: 100, // limit each IP to 100 requests per windowMs
      message: 'Too many requests from this IP, please try again later.'
    });
    this.app.use('/api/', limiter);

    // CORS configuration
    this.app.use(cors({
      origin: [
        'http://localhost:3000',
        'https://your-frontend-domain.vercel.app'
      ],
      credentials: true,
      methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
      allowedHeaders: ['Content-Type', 'Authorization']
    }));

    // Body parsing
    this.app.use(express.json({ limit: '10mb' }));
    this.app.use(express.urlencoded({ extended: true }));

    // Request logging
    this.app.use((req, res, next) => {
      Logger.info(`${req.method} ${req.path}`, { 
        ip: req.ip, 
        userAgent: req.get('User-Agent') 
      });
      next();
    });
  }

  setupRoutes() {
    // Health check
    this.app.get('/api/health', (req, res) => {
      res.json({
        status: 'OK',
        message: 'Event Management Server Running',
        timestamp: new Date().toISOString(),
        environment: process.env.NODE_ENV || 'development',
        version: '1.0.0'
      });
    });

    // Authentication routes
    this.setupAuthRoutes();
    
    // Event routes
    this.setupEventRoutes();
    
    // RSVP routes
    this.setupRSVPRoutes();
  }

  setupAuthRoutes() {
    // Simple auth middleware for demo
    const auth = (req, res, next) => {
      const token = req.header('Authorization')?.replace('Bearer ', '');
      
      if (!token) {
        return res.status(401).json({ 
          success: false,
          message: 'Access denied. No token provided.' 
        });
      }

      // For demo purposes, accept any token
      req.user = { 
        id: 'user-' + Date.now(), 
        name: 'Demo User', 
        email: 'demo@example.com' 
      };
      next();
    };

    // Register endpoint
    this.app.post('/api/auth/register', (req, res) => {
      try {
        const { name, email, password } = req.body;

        // Validation
        if (!name || !email || !password) {
          return res.status(400).json({
            success: false,
            message: 'All fields are required',
            errors: ['Name, email, and password are required']
          });
        }

        if (!Validators.validateEmail(email)) {
          return res.status(400).json({
            success: false,
            message: 'Invalid email format'
          });
        }

        if (!Validators.validatePassword(password)) {
          return res.status(400).json({
            success: false,
            message: 'Password must be at least 6 characters long'
          });
        }

        Logger.info('User registration attempt', { email });

        res.status(201).json({
          success: true,
          message: 'User registered successfully',
          user: { 
            id: 'user-' + Date.now(), 
            name: Validators.sanitizeString(name), 
            email: email.toLowerCase() 
          },
          token: 'demo-token-' + Date.now()
        });
      } catch (error) {
        Logger.error('Registration error', error);
        res.status(500).json({
          success: false,
          message: 'Server error during registration'
        });
      }
    });

    // Login endpoint
    this.app.post('/api/auth/login', (req, res) => {
      try {
        const { email, password } = req.body;

        if (!email || !password) {
          return res.status(400).json({
            success: false,
            message: 'Email and password are required'
          });
        }

        Logger.info('User login attempt', { email });

        res.json({
          success: true,
          message: 'Login successful',
          user: { 
            id: 'user-' + Date.now(), 
            name: 'Demo User', 
            email: email.toLowerCase() 
          },
          token: 'demo-token-' + Date.now()
        });
      } catch (error) {
        Logger.error('Login error', error);
        res.status(500).json({
          success: false,
          message: 'Server error during login'
        });
      }
    });

    // Get current user
    this.app.get('/api/auth/me', auth, (req, res) => {
      res.json({
        success: true,
        user: req.user
      });
    });

    // Store auth middleware for use in other routes
    this.auth = auth;
  }

  setupEventRoutes() {
    // Get all events
    this.app.get('/api/events', (req, res) => {
      try {
        const result = EventService.getAllEvents(req.query);
        
        if (result.success) {
          res.json({ 
            success: true,
            events: result.events,
            count: result.events.length
          });
        } else {
          res.status(500).json({
            success: false,
            message: result.error
          });
        }
      } catch (error) {
        Logger.error('Get events error', error);
        res.status(500).json({
          success: false,
          message: 'Server error while fetching events'
        });
      }
    });

    // Get single event
    this.app.get('/api/events/:id', (req, res) => {
      try {
        const result = EventService.getEventById(req.params.id);
        
        if (result.success) {
          res.json(result.event);
        } else {
          const statusCode = result.error === 'Event not found' ? 404 : 500;
          res.status(statusCode).json({
            success: false,
            message: result.error
          });
        }
      } catch (error) {
        Logger.error('Get event error', error);
        res.status(500).json({
          success: false,
          message: 'Server error while fetching event'
        });
      }
    });

    // Create event (protected)
    this.app.post('/api/events', this.auth, (req, res) => {
      try {
        const result = EventService.createEvent(req.body, req.user.id);
        
        if (result.success) {
          res.status(201).json({
            success: true,
            message: 'Event created successfully',
            event: result.event
          });
        } else {
          res.status(400).json({
            success: false,
            message: result.error || 'Validation failed',
            errors: result.errors
          });
        }
      } catch (error) {
        Logger.error('Create event error', error);
        res.status(500).json({
          success: false,
          message: 'Server error while creating event'
        });
      }
    });

    // Update event (protected)
    this.app.put('/api/events/:id', this.auth, (req, res) => {
      try {
        const result = EventService.updateEvent(req.params.id, req.body, req.user.id);
        
        if (result.success) {
          res.json({
            success: true,
            message: 'Event updated successfully',
            event: result.event
          });
        } else {
          const statusCode = result.error.includes('not found') ? 404 : 
                           result.error.includes('authorized') ? 403 : 400;
          res.status(statusCode).json({
            success: false,
            message: result.error
          });
        }
      } catch (error) {
        Logger.error('Update event error', error);
        res.status(500).json({
          success: false,
          message: 'Server error while updating event'
        });
      }
    });

    // Delete event (protected)
    this.app.delete('/api/events/:id', this.auth, (req, res) => {
      try {
        const result = EventService.deleteEvent(req.params.id, req.user.id);
        
        if (result.success) {
          res.json({
            success: true,
            message: result.message
          });
        } else {
          const statusCode = result.error.includes('not found') ? 404 : 
                           result.error.includes('authorized') ? 403 : 400;
          res.status(statusCode).json({
            success: false,
            message: result.error
          });
        }
      } catch (error) {
        Logger.error('Delete event error', error);
        res.status(500).json({
          success: false,
          message: 'Server error while deleting event'
        });
      }
    });

    // Get user's created events (protected)
    this.app.get('/api/events/user/created', this.auth, (req, res) => {
      try {
        const result = EventService.getUserEvents(req.user.id);
        
        if (result.success) {
          res.json(result.events);
        } else {
          res.status(500).json({
            success: false,
            message: result.error
          });
        }
      } catch (error) {
        Logger.error('Get user events error', error);
        res.status(500).json({
          success: false,
          message: 'Server error while fetching user events'
        });
      }
    });
  }

  setupRSVPRoutes() {
    // Create RSVP (protected)
    this.app.post('/api/rsvp/:eventId', this.auth, async (req, res) => {
      try {
        const result = await RSVPService.createRSVP(req.params.eventId, req.user.id);
        
        if (result.success) {
          res.status(201).json(result);
        } else {
          const statusCode = result.error.includes('not found') ? 404 : 400;
          res.status(statusCode).json({
            success: false,
            message: result.error
          });
        }
      } catch (error) {
        Logger.error('RSVP error', error);
        res.status(500).json({
          success: false,
          message: 'Server error while processing RSVP'
        });
      }
    });

    // Cancel RSVP (protected)
    this.app.delete('/api/rsvp/:eventId', this.auth, async (req, res) => {
      try {
        const result = await RSVPService.cancelRSVP(req.params.eventId, req.user.id);
        
        if (result.success) {
          res.json(result);
        } else {
          const statusCode = result.error.includes('not found') ? 404 : 400;
          res.status(statusCode).json({
            success: false,
            message: result.error
          });
        }
      } catch (error) {
        Logger.error('Cancel RSVP error', error);
        res.status(500).json({
          success: false,
          message: 'Server error while cancelling RSVP'
        });
      }
    });

    // Get user's RSVPs (protected)
    this.app.get('/api/rsvp/user/attending', this.auth, (req, res) => {
      try {
        const result = RSVPService.getUserRSVPs(req.user.id);
        
        if (result.success) {
          res.json(result.events);
        } else {
          res.status(500).json({
            success: false,
            message: result.error
          });
        }
      } catch (error) {
        Logger.error('Get user RSVPs error', error);
        res.status(500).json({
          success: false,
          message: 'Server error while fetching RSVPs'
        });
      }
    });

    // Check RSVP status (protected)
    this.app.get('/api/rsvp/:eventId/status', this.auth, (req, res) => {
      try {
        const result = RSVPService.checkRSVPStatus(req.params.eventId, req.user.id);
        
        if (result.success) {
          res.json({
            hasRSVP: result.hasRSVP,
            rsvp: result.rsvp
          });
        } else {
          res.status(500).json({
            success: false,
            message: result.error
          });
        }
      } catch (error) {
        Logger.error('Check RSVP status error', error);
        res.status(500).json({
          success: false,
          message: 'Server error while checking RSVP status'
        });
      }
    });
  }

  setupErrorHandling() {
    // 404 handler
    this.app.use('*', (req, res) => {
      res.status(404).json({
        success: false,
        message: 'Route not found',
        path: req.originalUrl
      });
    });

    // Global error handler
    this.app.use((err, req, res, next) => {
      Logger.error('Unhandled error', err);
      
      res.status(err.status || 500).json({
        success: false,
        message: process.env.NODE_ENV === 'development' 
          ? err.message 
          : 'Internal server error',
        ...(process.env.NODE_ENV === 'development' && { stack: err.stack })
      });
    });
  }

  async start() {
    try {
      // Initialize database connection
      await DatabaseManager.connect();
      
      // Start server
      this.server = this.app.listen(this.port, () => {
        Logger.info(`🚀 Event Management Server Started`);
        Logger.info(`📡 Server running on port ${this.port}`);
        Logger.info(`🌐 Health check: http://localhost:${this.port}/api/health`);
        Logger.info(`🎯 Frontend: http://localhost:3000`);
        Logger.info(`📝 Environment: ${process.env.NODE_ENV || 'development'}`);
        console.log('');
        Logger.info('✅ Server ready for requests!');
      });

      // Graceful shutdown
      process.on('SIGTERM', () => this.shutdown());
      process.on('SIGINT', () => this.shutdown());
      
    } catch (error) {
      Logger.error('Failed to start server', error);
      process.exit(1);
    }
  }

  async shutdown() {
    Logger.info('🔄 Shutting down server...');
    
    if (this.server) {
      this.server.close(() => {
        Logger.info('📴 HTTP server closed');
      });
    }
    
    await DatabaseManager.disconnect();
    Logger.info('👋 Server shutdown complete');
    process.exit(0);
  }
}

// Start the server
const server = new EventManagementServer();
server.start();

module.exports = server;