const express = require('express');
const { body, validationResult } = require('express-validator');
const Event = require('../models/Event');
const RSVP = require('../models/RSVP');
const auth = require('../middleware/auth');

const router = express.Router();

// Get all events with pagination and search
router.get('/', async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const search = req.query.search || '';
    const sortBy = req.query.sortBy || 'date';
    const sortOrder = req.query.sortOrder === 'desc' ? -1 : 1;

    const skip = (page - 1) * limit;

    // Build search query
    let query = { date: { $gte: new Date() } }; // Only future events
    
    if (search) {
      query.$text = { $search: search };
    }

    // Build sort object
    const sort = {};
    sort[sortBy] = sortOrder;

    const events = await Event.find(query)
      .populate('creator', 'name email')
      .sort(sort)
      .skip(skip)
      .limit(limit);

    const total = await Event.countDocuments(query);

    res.json({
      events,
      pagination: {
        current: page,
        pages: Math.ceil(total / limit),
        total
      }
    });
  } catch (error) {
    console.error('Get events error:', error);
    res.status(500).json({ message: 'Server error while fetching events' });
  }
});

// Get single event
router.get('/:id', async (req, res) => {
  try {
    const event = await Event.findById(req.params.id)
      .populate('creator', 'name email')
      .populate('attendees', 'name email');

    if (!event) {
      return res.status(404).json({ message: 'Event not found' });
    }

    res.json(event);
  } catch (error) {
    console.error('Get event error:', error);
    res.status(500).json({ message: 'Server error while fetching event' });
  }
});

// Create event
router.post('/', auth, [
  body('title').trim().isLength({ min: 3, max: 100 }).withMessage('Title must be between 3 and 100 characters'),
  body('description').trim().isLength({ min: 10, max: 1000 }).withMessage('Description must be between 10 and 1000 characters'),
  body('date').isISO8601().withMessage('Please provide a valid date'),
  body('location').trim().isLength({ min: 3, max: 200 }).withMessage('Location must be between 3 and 200 characters'),
  body('capacity').isInt({ min: 1, max: 10000 }).withMessage('Capacity must be between 1 and 10,000')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ 
        message: 'Validation failed', 
        errors: errors.array() 
      });
    }

    const { title, description, date, location, capacity } = req.body;

    // Validate date is in the future
    if (new Date(date) <= new Date()) {
      return res.status(400).json({ message: 'Event date must be in the future' });
    }

    const event = new Event({
      title,
      description,
      date: new Date(date),
      location,
      capacity: parseInt(capacity),
      creator: req.user._id
    });

    await event.save();
    await event.populate('creator', 'name email');

    res.status(201).json({
      message: 'Event created successfully',
      event
    });
  } catch (error) {
    console.error('Create event error:', error);
    res.status(500).json({ message: 'Server error while creating event' });
  }
});

// Update event
router.put('/:id', auth, [
  body('title').optional().trim().isLength({ min: 3, max: 100 }).withMessage('Title must be between 3 and 100 characters'),
  body('description').optional().trim().isLength({ min: 10, max: 1000 }).withMessage('Description must be between 10 and 1000 characters'),
  body('date').optional().isISO8601().withMessage('Please provide a valid date'),
  body('location').optional().trim().isLength({ min: 3, max: 200 }).withMessage('Location must be between 3 and 200 characters'),
  body('capacity').optional().isInt({ min: 1, max: 10000 }).withMessage('Capacity must be between 1 and 10,000')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ 
        message: 'Validation failed', 
        errors: errors.array() 
      });
    }

    const event = await Event.findById(req.params.id);
    
    if (!event) {
      return res.status(404).json({ message: 'Event not found' });
    }

    // Check if user is the creator
    if (event.creator.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'Not authorized to update this event' });
    }

    const updates = req.body;

    // Validate date if provided
    if (updates.date && new Date(updates.date) <= new Date()) {
      return res.status(400).json({ message: 'Event date must be in the future' });
    }

    // Validate capacity doesn't go below current attendees
    if (updates.capacity && parseInt(updates.capacity) < event.currentAttendees) {
      return res.status(400).json({ 
        message: `Cannot reduce capacity below current attendees (${event.currentAttendees})` 
      });
    }

    Object.assign(event, updates);
    await event.save();
    await event.populate('creator', 'name email');

    res.json({
      message: 'Event updated successfully',
      event
    });
  } catch (error) {
    console.error('Update event error:', error);
    res.status(500).json({ message: 'Server error while updating event' });
  }
});

// Delete event
router.delete('/:id', auth, async (req, res) => {
  try {
    const event = await Event.findById(req.params.id);
    
    if (!event) {
      return res.status(404).json({ message: 'Event not found' });
    }

    // Check if user is the creator
    if (event.creator.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'Not authorized to delete this event' });
    }

    // Delete all RSVPs for this event
    await RSVP.deleteMany({ event: event._id });

    // Delete the event
    await Event.findByIdAndDelete(req.params.id);

    res.json({ message: 'Event deleted successfully' });
  } catch (error) {
    console.error('Delete event error:', error);
    res.status(500).json({ message: 'Server error while deleting event' });
  }
});

// Get user's created events
router.get('/user/created', auth, async (req, res) => {
  try {
    const events = await Event.find({ creator: req.user._id })
      .populate('creator', 'name email')
      .sort({ date: 1 });

    res.json(events);
  } catch (error) {
    console.error('Get user events error:', error);
    res.status(500).json({ message: 'Server error while fetching user events' });
  }
});

module.exports = router;