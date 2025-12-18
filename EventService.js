/**
 * Event Service
 * Business logic for event management
 */

const Logger = require('../utils/logger');
const Validators = require('../utils/validators');

class EventService {
  constructor() {
    this.events = this.initializeDefaultEvents();
    this.nextEventId = 3;
  }

  initializeDefaultEvents() {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    tomorrow.setHours(14, 0, 0, 0);

    const nextWeek = new Date();
    nextWeek.setDate(nextWeek.getDate() + 7);
    nextWeek.setHours(18, 30, 0, 0);

    return [
      {
        id: 1,
        title: 'Tech Conference 2024',
        description: 'Join us for an exciting technology conference featuring the latest innovations in web development, AI, and cloud computing. Network with industry professionals and learn from expert speakers.',
        date: tomorrow.toISOString(),
        location: 'Convention Center, Downtown',
        capacity: 150,
        currentAttendees: 23,
        creator: 'admin',
        creatorName: 'Event Admin',
        attendees: [],
        createdAt: new Date().toISOString()
      },
      {
        id: 2,
        title: 'Community Meetup',
        description: 'Monthly community meetup for developers and tech enthusiasts. Come share your projects, learn new skills, and connect with like-minded people in a casual environment.',
        date: nextWeek.toISOString(),
        location: 'Community Center, Main Street',
        capacity: 50,
        currentAttendees: 12,
        creator: 'admin',
        creatorName: 'Event Admin',
        attendees: [],
        createdAt: new Date().toISOString()
      }
    ];
  }

  getAllEvents(filters = {}) {
    try {
      let filteredEvents = [...this.events];

      // Filter by search term
      if (filters.search) {
        const searchTerm = filters.search.toLowerCase();
        filteredEvents = filteredEvents.filter(event =>
          event.title.toLowerCase().includes(searchTerm) ||
          event.description.toLowerCase().includes(searchTerm) ||
          event.location.toLowerCase().includes(searchTerm)
        );
      }

      // Filter future events only
      filteredEvents = filteredEvents.filter(event => new Date(event.date) > new Date());

      Logger.info(`Retrieved ${filteredEvents.length} events`);
      return { success: true, events: filteredEvents };
    } catch (error) {
      Logger.error('Error retrieving events', error);
      return { success: false, error: 'Failed to retrieve events' };
    }
  }

  getEventById(eventId) {
    try {
      const event = this.events.find(e => e.id === parseInt(eventId));
      
      if (!event) {
        return { success: false, error: 'Event not found' };
      }

      // Format for frontend compatibility
      const formattedEvent = {
        ...event,
        _id: event.id,
        creator: {
          _id: event.creator,
          name: event.creatorName || 'Event Admin',
          email: 'admin@example.com'
        }
      };

      Logger.info(`Retrieved event: ${event.title}`);
      return { success: true, event: formattedEvent };
    } catch (error) {
      Logger.error('Error retrieving event', error);
      return { success: false, error: 'Failed to retrieve event' };
    }
  }

  createEvent(eventData, userId) {
    try {
      const validation = Validators.validateEventData(eventData);
      
      if (!validation.isValid) {
        return { success: false, errors: validation.errors };
      }

      const newEvent = {
        id: this.nextEventId++,
        title: Validators.sanitizeString(eventData.title),
        description: Validators.sanitizeString(eventData.description),
        date: eventData.date,
        location: Validators.sanitizeString(eventData.location),
        capacity: parseInt(eventData.capacity),
        currentAttendees: 0,
        creator: userId,
        creatorName: 'User',
        attendees: [],
        createdAt: new Date().toISOString()
      };

      this.events.push(newEvent);
      Logger.info(`Event created: ${newEvent.title} by user ${userId}`);
      
      return { success: true, event: newEvent };
    } catch (error) {
      Logger.error('Error creating event', error);
      return { success: false, error: 'Failed to create event' };
    }
  }

  updateEvent(eventId, updateData, userId) {
    try {
      const eventIndex = this.events.findIndex(e => e.id === parseInt(eventId));
      
      if (eventIndex === -1) {
        return { success: false, error: 'Event not found' };
      }

      const event = this.events[eventIndex];
      
      if (event.creator !== userId) {
        return { success: false, error: 'Not authorized to update this event' };
      }

      // Validate updates
      if (updateData.capacity && updateData.capacity < event.currentAttendees) {
        return { 
          success: false, 
          error: `Cannot reduce capacity below current attendees (${event.currentAttendees})` 
        };
      }

      // Apply updates
      Object.keys(updateData).forEach(key => {
        if (updateData[key] !== undefined) {
          event[key] = typeof updateData[key] === 'string' 
            ? Validators.sanitizeString(updateData[key]) 
            : updateData[key];
        }
      });

      Logger.info(`Event updated: ${event.title}`);
      return { success: true, event };
    } catch (error) {
      Logger.error('Error updating event', error);
      return { success: false, error: 'Failed to update event' };
    }
  }

  deleteEvent(eventId, userId) {
    try {
      const eventIndex = this.events.findIndex(e => e.id === parseInt(eventId));
      
      if (eventIndex === -1) {
        return { success: false, error: 'Event not found' };
      }

      const event = this.events[eventIndex];
      
      if (event.creator !== userId) {
        return { success: false, error: 'Not authorized to delete this event' };
      }

      this.events.splice(eventIndex, 1);
      Logger.info(`Event deleted: ${event.title}`);
      
      return { success: true, message: 'Event deleted successfully' };
    } catch (error) {
      Logger.error('Error deleting event', error);
      return { success: false, error: 'Failed to delete event' };
    }
  }

  getUserEvents(userId) {
    try {
      const userEvents = this.events.filter(e => e.creator === userId);
      Logger.info(`Retrieved ${userEvents.length} events for user ${userId}`);
      return { success: true, events: userEvents };
    } catch (error) {
      Logger.error('Error retrieving user events', error);
      return { success: false, error: 'Failed to retrieve user events' };
    }
  }
}

module.exports = new EventService();