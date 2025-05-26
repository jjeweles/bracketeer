// API Service Layer - Centralized API calls
class ApiService {
  constructor() {
    this.api = window.api;
  }

  // Bowler operations
  async addBowler(bowlerData) {
    try {
      const result = await this.api.bowlers.add(bowlerData.name, bowlerData);
      return result;
    } catch (error) {
      console.error('API Service - Add bowler failed:', error);
      return { success: false, error: error.message };
    }
  }

  async getBowlers(filters = {}) {
    try {
      const result = await this.api.bowlers.getAll(filters);
      return result;
    } catch (error) {
      console.error('API Service - Get bowlers failed:', error);
      return { success: false, error: error.message };
    }
  }

  async updateBowler(id, updates) {
    try {
      const result = await this.api.bowlers.update(id, updates);
      return result;
    } catch (error) {
      console.error('API Service - Update bowler failed:', error);
      return { success: false, error: error.message };
    }
  }

  async deleteBowler(id) {
    try {
      const result = await this.api.bowlers.delete(id);
      return result;
    } catch (error) {
      console.error('API Service - Delete bowler failed:', error);
      return { success: false, error: error.message };
    }
  }

  // System operations
  async healthCheck() {
    try {
      const result = await this.api.system.healthCheck();
      return result;
    } catch (error) {
      console.error('API Service - Health check failed:', error);
      return { success: false, error: error.message };
    }
  }

  async getVersion() {
    try {
      const result = await this.api.system.getVersion();
      return result;
    } catch (error) {
      console.error('API Service - Get version failed:', error);
      return { success: false, error: error.message };
    }
  }

  // Session operations
  async createSession(sessionData) {
    try {
      const result = await this.api.sessions.create(sessionData);
      return result;
    } catch (error) {
      console.error('API Service - Create session failed:', error);
      return { success: false, error: error.message };
    }
  }

  async getSessions(filters = {}) {
    try {
      const result = await this.api.sessions.getAll(filters);
      return result;
    } catch (error) {
      console.error('API Service - Get sessions failed:', error);
      return { success: false, error: error.message };
    }
  }

  async updateSession(id, updates) {
    try {
      const result = await this.api.sessions.update(id, updates);
      return result;
    } catch (error) {
      console.error('API Service - Update session failed:', error);
      return { success: false, error: error.message };
    }
  }

  async deleteSession(id) {
    try {
      const result = await this.api.sessions.delete(id);
      return result;
    } catch (error) {
      console.error('API Service - Delete session failed:', error);
      return { success: false, error: error.message };
    }
  }

  // Session Bowler operations
  async addSessionBowler(sessionBowlerData) {
    try {
      const result = await this.api.sessionBowlers.add(sessionBowlerData);
      return result;
    } catch (error) {
      console.error('API Service - Add session bowler failed:', error);
      return { success: false, error: error.message };
    }
  }

  async getSessionBowlers(sessionId, filters = {}) {
    try {
      const result = await this.api.sessionBowlers.getAll(sessionId, filters);
      return result;
    } catch (error) {
      console.error('API Service - Get session bowlers failed:', error);
      return { success: false, error: error.message };
    }
  }

  async updateSessionBowler(id, updates) {
    try {
      const result = await this.api.sessionBowlers.update(id, updates);
      return result;
    } catch (error) {
      console.error('API Service - Update session bowler failed:', error);
      return { success: false, error: error.message };
    }
  }

  async deleteSessionBowler(id) {
    try {
      const result = await this.api.sessionBowlers.delete(id);
      return result;
    } catch (error) {
      console.error('API Service - Delete session bowler failed:', error);
      return { success: false, error: error.message };
    }
  }

  // Validation helpers
  validateBowlerData(data) {
    const errors = {};
    
    if (!data.name || data.name.trim().length === 0) {
      errors.name = 'Name is required';
    }
    
    if (data.name && data.name.length > 100) {
      errors.name = 'Name must be less than 100 characters';
    }
    
    if (data.average && (isNaN(data.average) || data.average < 0 || data.average > 300)) {
      errors.average = 'Average must be between 0 and 300';
    }
    
    if (data.handicap && (isNaN(data.handicap) || data.handicap < 0)) {
      errors.handicap = 'Handicap must be 0 or greater';
    }
    
    if (data.lane && (isNaN(data.lane) || data.lane < 1 || data.lane > 100)) {
      errors.lane = 'Lane must be between 1 and 100';
    }
    
    return {
      isValid: Object.keys(errors).length === 0,
      errors
    };
  }

  validateSessionData(data) {
    const errors = {};
    
    if (!data.name || data.name.trim().length === 0) {
      errors.name = 'Session name is required';
    }
    
    if (data.name && data.name.length > 100) {
      errors.name = 'Name must be less than 100 characters';
    }
    
    if (!['league', 'tournament'].includes(data.type)) {
      errors.type = 'Session type must be league or tournament';
    }
    
    if (data.handicap_percentage && (isNaN(data.handicap_percentage) || data.handicap_percentage < 0 || data.handicap_percentage > 100)) {
      errors.handicap_percentage = 'Handicap percentage must be between 0 and 100';
    }
    
    if (data.bracket_price && (isNaN(data.bracket_price) || data.bracket_price <= 0)) {
      errors.bracket_price = 'Bracket price must be greater than 0';
    }
    
    return {
      isValid: Object.keys(errors).length === 0,
      errors
    };
  }

  validateSessionBowlerData(data) {
    const errors = {};
    
    if (!data.name || data.name.trim().length === 0) {
      errors.name = 'Name is required';
    }
    
    if (data.name && data.name.length > 100) {
      errors.name = 'Name must be less than 100 characters';
    }
    
    if (!data.average || isNaN(data.average) || data.average < 0 || data.average > 300) {
      errors.average = 'Average must be between 0 and 300';
    }
    
    if (data.lane && (isNaN(data.lane) || data.lane < 1 || data.lane > 100)) {
      errors.lane = 'Lane must be between 1 and 100';
    }

    const scratchBrackets = parseInt(data.scratch_brackets) || 0;
    const handicapBrackets = parseInt(data.handicap_brackets) || 0;
    
    if (scratchBrackets < 0 || scratchBrackets > 10) {
      errors.scratch_brackets = 'Scratch brackets must be between 0 and 10';
    }
    
    if (handicapBrackets < 0 || handicapBrackets > 10) {
      errors.handicap_brackets = 'Handicap brackets must be between 0 and 10';
    }

    if (scratchBrackets === 0 && handicapBrackets === 0 && 
        !data.high_game_scratch && !data.high_game_handicap && !data.eliminator) {
      errors.entry = 'Bowler must enter at least one event';
    }
    
    return {
      isValid: Object.keys(errors).length === 0,
      errors
    };
  }

  // Format data for API
  formatBowlerData(formData) {
    return {
      name: formData.name.trim(),
      average: formData.average ? parseInt(formData.average) : 0,
      handicap: formData.handicap ? parseInt(formData.handicap) : 0,
      lane: formData.lane ? parseInt(formData.lane) : null,
      category: formData.category || 'brackets'
    };
  }

  formatSessionData(formData) {
    return {
      name: formData.name.trim(),
      type: formData.type,
      handicap_percentage: parseInt(formData.handicap_percentage),
      bracket_price: parseFloat(formData.bracket_price),
      first_place_payout: parseFloat(formData.first_place_payout),
      second_place_payout: parseFloat(formData.second_place_payout),
      status: formData.status || 'setup'
    };
  }

  formatSessionBowlerData(formData) {
    return {
      session_id: formData.session_id,
      name: formData.name.trim(),
      average: parseInt(formData.average),
      handicap: parseInt(formData.handicap) || 0,
      lane: formData.lane ? parseInt(formData.lane) : null,
      scratch_brackets: parseInt(formData.scratch_brackets) || 0,
      handicap_brackets: parseInt(formData.handicap_brackets) || 0,
      high_game_scratch: Boolean(formData.high_game_scratch),
      high_game_handicap: Boolean(formData.high_game_handicap),
      eliminator: Boolean(formData.eliminator)
    };
  }
}

// Create singleton instance
const apiService = new ApiService();

export default apiService;