/**
 * Input Validation Utilities
 * Centralized validation functions
 */

class Validators {
  static validateEmail(email) {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  }

  static validatePassword(password) {
    return password && password.length >= 6;
  }

  static validateEventData(eventData) {
    const { title, description, date, location, capacity } = eventData;
    const errors = [];

    if (!title || title.trim().length < 3) {
      errors.push('Title must be at least 3 characters long');
    }

    if (!description || description.trim().length < 10) {
      errors.push('Description must be at least 10 characters long');
    }

    if (!date || new Date(date) <= new Date()) {
      errors.push('Event date must be in the future');
    }

    if (!location || location.trim().length < 3) {
      errors.push('Location must be at least 3 characters long');
    }

    if (!capacity || capacity < 1 || capacity > 10000) {
      errors.push('Capacity must be between 1 and 10,000');
    }

    return {
      isValid: errors.length === 0,
      errors
    };
  }

  static sanitizeString(str) {
    return str ? str.trim().replace(/[<>]/g, '') : '';
  }
}

module.exports = Validators;