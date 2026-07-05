import { describe, it, expect, vi, beforeEach } from 'vitest';
import { apiService } from './api';

// Mock the global fetch API so we don't actually make network requests during testing
global.fetch = vi.fn();

describe('apiService', () => {
  beforeEach(() => {
    // Clear previous mock data before each test runs
    fetch.mockClear();
  });

  it('checkHealth should return data on success', async () => {
    // Simulate a successful response from the server
    fetch.mockResolvedValueOnce({
      json: () => Promise.resolve({ status: 'ok' }),
    });
    
    const result = await apiService.checkHealth();
    
    expect(result).toEqual({ status: 'ok' });
    expect(fetch).toHaveBeenCalledWith('http://127.0.0.1:5000/');
  });

  it('checkHealth should return null on failure', async () => {
    // Simulate the server being down
    fetch.mockRejectedValueOnce(new Error('Network error'));
    
    const result = await apiService.checkHealth();
    expect(result).toBeNull();
  });

  it('submitGatePass should post data successfully', async () => {
    const mockData = { name: 'John Doe', visitorType: 'parent' };
    
    fetch.mockResolvedValueOnce({
      json: () => Promise.resolve({ success: true, receiptId: 'VIS-24-ABCD' }),
    });
    
    const result = await apiService.submitGatePass(mockData);
    
    expect(result).toEqual({ success: true, receiptId: 'VIS-24-ABCD' });
    expect(fetch).toHaveBeenCalledWith('http://127.0.0.1:5000/api/visits', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(mockData)
    });
  });

  it('getAllVisits should fetch visits successfully', async () => {
    const mockVisits = [{ id: 1, name: 'John Doe' }, { id: 2, name: 'Jane Smith' }];
    
    fetch.mockResolvedValueOnce({
      json: () => Promise.resolve(mockVisits),
    });
    
    const result = await apiService.getAllVisits();
    expect(result).toEqual(mockVisits);
  });
  it('submitGatePass should throw error on failure', async () => {
    fetch.mockRejectedValueOnce(new Error('API failed'));
    await expect(apiService.submitGatePass({})).rejects.toThrow('API failed');
  });

  it('getAllVisits should throw error on failure', async () => {
    fetch.mockRejectedValueOnce(new Error('Fetch failed'));
    await expect(apiService.getAllVisits()).rejects.toThrow('Fetch failed');
  });
});