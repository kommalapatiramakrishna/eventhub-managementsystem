const express = require('express');
const mongoose = require('mongoose');
const Event = require('../models/Event');
const RSVP = require('../models/RSVP');
const auth = require('../middleware/auth');

const router = express.Router();

// RSVP to an event (with concurrency handling)
router.post('/:eventId', auth, async (req, res) => {
  const session = await mongoose.startSession();
  
  try {
    await session.withTransaction(async () => {
      // Find the event with session for atomic operations
      const event = await Event.findById(req.params.eventId).session(session);
      
      if (!event) {
        throw new Error('Event not found');
      }

      // Check if event is in the future
      if (event.date <= new Date()) {
        throw new Error('Cannot RSVP to past events');
      }

      // Check if user already has an RSVP
      const existingRSVP = await RSVP.findOne({
        user: req.user._id,
        event: event._id,
        status: 'attending'
      }).session(session);

      if (existingRSVP) {
        throw new Error('You have already RSVP\'d to this event');
      }

      // Check capacity (critical for concurrency)
      if (event.currentAttendees >= event.capacity) {
        throw new Error('Event is at full capacity');
      }

      // Create RSVP
      const rsvp = new RSVP({
        user: req.user._id,
        event: event._id,
        status: 'attending'
      });

      await rsvp.save({ session });

      // Update event attendees count and add to attendees array
      await Event.findByIdAndUpdate(
        event._id,
        {
          $inc: { currentAttendees: 1 },
          $addToSet: { attendees: req.user._id }
        },
        { session }
      );
    });

    // Fetch updated event data
    const updatedEvent = await Event.findById(req.params.eventId)
      .populate('creator', 'name email');

    res.status(201).json({
      message: 'RSVP successful',
      event: updatedEvent
    });

  } catch (error) {
    console.error('RSVP error:', error);
    
    if (error.message === 'Event not found') {
      return res.status(404).json({ message: error.message });
    }
    if (error.message === 'Cannot RSVP to past events' || 
        error.message === 'You have already RSVP\'d to this event' ||
        error.message === 'Event is at full capacity') {
      return res.status(400).json({ message: error.message });
    }
    
    res.status(500).json({ message: 'Server error while processing RSVP' });
  } finally {
    await session.endSession();
  }
});

// Cancel RSVP
router.delete('/:eventId', auth, async (req, res) => {
  const session = await mongoose.startSession();
  
  try {
    await session.withTransaction(async () => {
      // Find the RSVP
      const rsvp = await RSVP.findOne({
        user: req.user._id,
        event: req.params.eventId,
        status: 'attending'
      }).session(session);

      if (!rsvp) {
        throw new Error('No active RSVP found for this event');
      }

      // Update RSVP status to cancelled
      rsvp.status = 'cancelled';
      await rsvp.save({ session });

      // Update event attendees count and remove from attendees array
      await Event.findByIdAndUpdate(
        req.params.eventId,
        {
          $inc: { currentAttendees: -1 },
          $pull: { attendees: req.user._id }
        },
        { session }
      );
    });

    // Fetch updated event data
    const updatedEvent = await Event.findById(req.params.eventId)
      .populate('creator', 'name email');

    res.json({
      message: 'RSVP cancelled successfully',
      event: updatedEvent
    });

  } catch (error) {
    console.error('Cancel RSVP error:', error);
    
    if (error.message === 'No active RSVP found for this event') {
      return res.status(404).json({ message: error.message });
    }
    
    res.status(500).json({ message: 'Server error while cancelling RSVP' });
  } finally {
    await session.endSession();
  }
});

// Get user's RSVPs
router.get('/user/attending', auth, async (req, res) => {
  try {
    const rsvps = await RSVP.find({
      user: req.user._id,
      status: 'attending'
    })
    .populate({
      path: 'event',
      populate: {
        path: 'creator',
        select: 'name email'
      }
    })
    .sort({ createdAt: -1 });

    const events = rsvps.map(rsvp => rsvp.event).filter(event => event !== null);

    res.json(events);
  } catch (error) {
    console.error('Get user RSVPs error:', error);
    res.status(500).json({ message: 'Server error while fetching RSVPs' });
  }
});

// Check RSVP status for a specific event
router.get('/:eventId/status', auth, async (req, res) => {
  try {
    const rsvp = await RSVP.findOne({
      user: req.user._id,
      event: req.params.eventId,
      status: 'attending'
    });

    res.json({
      hasRSVP: !!rsvp,
      rsvp: rsvp || null
    });
  } catch (error) {
    console.error('Check RSVP status error:', error);
    res.status(500).json({ message: 'Server error while checking RSVP status' });
  }
});

// Get event attendees (for event creators)
router.get('/:eventId/attendees', auth, async (req, res) => {
  try {
    const event = await Event.findById(req.params.eventId);
    
    if (!event) {
      return res.status(404).json({ message: 'Event not found' });
    }

    // Check if user is the event creator
    if (event.creator.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'Not authorized to view attendees' });
    }

    const rsvps = await RSVP.find({
      event: req.params.eventId,
      status: 'attending'
    })
    .populate('user', 'name email')
    .sort({ createdAt: 1 });

    const attendees = rsvps.map(rsvp => ({
      id: rsvp.user._id,
      name: rsvp.user.name,
      email: rsvp.user.email,
      rsvpDate: rsvp.createdAt
    }));

    res.json({
      attendees,
      count: attendees.length,
      capacity: event.capacity
    });
  } catch (error) {
    console.error('Get attendees error:', error);
    res.status(500).json({ message: 'Server error while fetching attendees' });
  }
});

module.exports = router;