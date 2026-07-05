// src/services/api.js

const BASE_URL = "http://127.0.0.1:5000";

export const apiService = {
  // 1. Check if backend is live
  checkHealth: async () => {
    try {
      const response = await fetch(`${BASE_URL}/`);
      return await response.json();
    } catch (error) {
      console.error("Backend is not running", error);
      return null;
    }
  },

  // 2. Submit a new Gate Pass with Camera Photo (POST)
  submitGatePass: async (passData) => {
    try {
      const response = await fetch(`${BASE_URL}/api/visits`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(passData),
      });
      return await response.json();
    } catch (error) {
      console.error("Error submitting gate pass:", error);
      throw error;
    }
  },

  // 3. Get all past Gate Passes (GET)
  getAllVisits: async () => {
    try {
      const response = await fetch(`${BASE_URL}/api/visits`);
      return await response.json();
    } catch (error) {
      console.error("Error fetching visits:", error);
      throw error;
    }
  }
};