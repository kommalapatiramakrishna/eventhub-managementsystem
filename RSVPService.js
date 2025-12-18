/**
 * RSVP Service
 * Business logic for RSVP management with concurrency handling
 */

const Logger = require('../utils/logger');
const EventService = require('./EventService');

class RSVPService {
  constructor() {
    this.rsvps = [];
  }

  async createRSVP(eventId, userId) {
    try {
      const eventResult = EventService.getEventById(eventId);
      
      if (!eventResult.success) {
        return eventResult;
      }

      const event = eventResult.event;

      // Check if event is in the future
      if (new Date(event.date) <= new Date()) {
        return { success: false, error: 'Cannot RSVP to past events' };
      }

      // Check for existing RSVP
      const existingRsvp = this.rsvps.find(r => 
        r.userId === userId && r.eventId === parseInt(eventId) && r.status === 'attending'
      );

      if (existingRsvp) {
        return { success: false, error: 'You have already RSVP\'d to this event' };
      }

      // Check capacity (critical for concurrency)
      if (event.currentAttendees >= event.capacity) {
        return { success: false, error: 'Event is at full capacity' };
      }

      // Create RSVP (atomic operation simulation)
      const rsvp = {
        id: Date.now(),
        userId,
        eventId: parseInt(eventId),
        status: 'attending',
        createdAt: new Date().toISOString()
      };

      this.rsvps.push(rsvp);

      // Update event attendees
      const originalEvent = EventService.events.find(e => e.id === parseInt(eventId));
      if (originalEvent) {
        originalEvent.currentAttendees++;
        originalEvent.attendees.push(userId);
      }

      Logger.info(`RSVP created for event ${eventId} by user ${userId}`);
      
      return { 
        success: true, 
        message: 'RSVP successful',
        event: EventService.getEventById(eventId).event
      };
    } catch (error) {
      Logger.error('Error creating RSVP', error);
      return { success: false, error: 'Failed to process RSVP' };
    }
  }

  async cancelRSVP(eventId, userId) {
    try {
      const rsvpIndex = this.rsvps.findIndex(r => 
        r.userId === userId && r.eventId === parseInt(eventId) && r.status === 'attending'
      );

      if (rsvpIndex === -1) {
        return { success: false, error: 'No active RSVP found for this event' };
      }

      // Cancel RSVP
      this.rsvps[rsvpIndex].status = 'cancelled';

      // Update event attendees
      const event = EventService.events.find(e => e.id === parseInt(eventId));
      if (event) {
        event.currentAttendees--;
        event.attendees = event.attendees.filter(id => id !== userId);
      }

      Logger.info(`RSVP cancelled for event ${eventId} by user ${userId}`);
      
      return { 
        success: true, 
        message: 'RSVP cancelled successfully',
        event: EventService.getEventById(eventId).event
      };
    } catch (error) {
      Logger.error('Error cancelling RSVP', error);
      return { success: false, error: 'Failed to cancel RSVP' };
    }
  }

  getUserRSVPs(userId) {
    try {
      const userRsvps = this.rsvps.filter(r => r.userId === userId && r.status === 'attending');
      const attendingEvents = userRsvps
        .map(rsvp => EventService.getEventById(rsvp.eventId).event)
        .filter(event => event);

      Logger.info(`Retrieved ${attendingEvents.length} RSVPs for user ${userId}`);
      return { success: true, events: attendingEvents };
    } catch (error) {
      Logger.error('Error retrieving user RSVPs', error);
      return { success: false, error: 'Failed to retrieve RSVPs' };
    }
  }

  checkRSVPStatus(eventId, userId) {
    try {
      const rsvp = this.rsvps.find(r => 
        r.userId === userId && r.eventId === parseInt(eventId) && r.status === 'attending'
      );

      return { 
        success: true, 
        hasRSVP: !!rsvp,
        rsvp: rsvp || null
      };
    } catch (error) {
      Logger.error('Error checking RSVP status', error);
      return { success: false, error: 'Failed to check RSVP status' };
    }
  }
}

module.exports = new RSVPService();