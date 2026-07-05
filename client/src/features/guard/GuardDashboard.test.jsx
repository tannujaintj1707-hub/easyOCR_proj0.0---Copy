// client/src/features/guard/GuardDashboard.test.jsx
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach, beforeAll } from 'vitest';
import GuardDashboard from './GuardDashboard';

beforeAll(() => {
  window.HTMLMediaElement.prototype.play = vi.fn();
  window.HTMLCanvasElement.prototype.getContext = vi.fn(() => ({ drawImage: vi.fn() }));
  window.HTMLCanvasElement.prototype.toDataURL = vi.fn(() => 'data:image/jpeg;base64,mock');
  window.alert = vi.fn();
  window.open = vi.fn(() => ({ document: { write: vi.fn(), close: vi.fn() }, focus: vi.fn() }));
});

describe('GuardDashboard Integration', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    
    const mockStream = { getTracks: () => [{ stop: vi.fn() }] };
    Object.defineProperty(global.navigator, 'mediaDevices', { 
      value: { getUserMedia: vi.fn().mockResolvedValue(mockStream) }, 
      writable: true 
    });

    global.fetch = vi.fn().mockImplementation(async (url) => {
      if (url.includes('/api/admin/visitors')) {
        return { ok: true, json: async () => [
          { _id: 'PEND-1', name: 'Pending Parent', status: 'pending_review', visitorType: 'parent', vehicleNo: 'MH12' },
          { _id: 'PEND-2', name: 'Pending Student', status: 'pending_review', visitorType: 'student', studentId: 'STU1' },
          { _id: 'PEND-3', status: 'pending_review', visitorType: 'parent' } // Nameless visitor for search branch coverage
        ]};
      }
      if (url.includes('/verify-face')) {
        return { ok: true, json: async () => ({
          success: true, message: 'Verified',
          person: { visitorName: 'Test Face Visitor', relation: 'Parent' },
          visitor: { _id: 'V1', status: 'approved', name: 'Test Face Visitor', visitorType: 'parent' }
        })};
      }
      if (url.includes('/scan')) {
         return { ok: true, json: async () => ({
            success: true, message: 'Plate Verified',
            visitor: { _id: 'PLATE123', vehicleNo: 'MH12AB1234', name: 'Test Plate Visitor', visitorType: 'student', studentId: 'STU999', status: 'approved' }
         })};
      }
      if (url.includes('/status')) {
         return { ok: true, json: async () => ({ success: true }) };
      }
      return { ok: true, json: async () => [] };
    });
  });

  it('renders pending table, handles filters, and unmounts safely', async () => {
    const { unmount } = render(<GuardDashboard />);
    await waitFor(() => expect(screen.getByText('Pending Parent')).toBeInTheDocument());

    // Test filtering (Hits lines 380-391)
    const filterInput = screen.getByPlaceholderText(/Search pending by name.../i);
    fireEvent.change(filterInput, { target: { value: 'Student' } });
    await waitFor(() => expect(screen.queryByText('Pending Parent')).not.toBeInTheDocument());
    
    fireEvent.change(filterInput, { target: { value: '' } });
    await waitFor(() => expect(screen.getByText('Pending Parent')).toBeInTheDocument());

    fireEvent.click(screen.getAllByRole('button', { name: /Approve/i })[0]);
    await waitFor(() => expect(global.fetch).toHaveBeenCalledWith(expect.stringContaining('/api/admin/status/PEND-1'), expect.any(Object)));

    fireEvent.click(screen.getAllByRole('button', { name: /Reject/i })[1]);
    await waitFor(() => expect(global.fetch).toHaveBeenCalledWith(expect.stringContaining('/api/admin/status/PEND-2'), expect.any(Object)));
    
    unmount();
  });

  it('handles API network errors for table updates', async () => {
    render(<GuardDashboard />);
    await waitFor(() => expect(screen.getByText('Pending Parent')).toBeInTheDocument());

    global.fetch.mockRejectedValueOnce(new Error("Network Update Error"));
    fireEvent.click(screen.getAllByRole('button', { name: /Approve/i })[0]);
    await waitFor(() => expect(screen.getByText(/Server error while updating status/i)).toBeInTheDocument());
  });

  it('verifies a face, opens HTML Receipt, and stops camera', async () => {
    render(<GuardDashboard />);
    
    fireEvent.click(screen.getByRole('button', { name: /Start Live Feed/i }));
    await waitFor(() => expect(screen.getByRole('button', { name: /Verify Face/i })).not.toBeDisabled());
    
    fireEvent.click(screen.getByRole('button', { name: /Verify Face/i }));
    await waitFor(() => expect(screen.getByText('Test Face Visitor')).toBeInTheDocument());
    
    fireEvent.click(screen.getByRole('button', { name: /View Official Receipt/i }));
    expect(window.open).toHaveBeenCalled();
  });

  it('scans a plate successfully and opens student receipt', async () => {
    render(<GuardDashboard />);
    fireEvent.click(screen.getByRole('button', { name: /Start Live Feed/i }));
    await waitFor(() => expect(screen.getByRole('button', { name: /Scan Plate/i })).not.toBeDisabled());
    
    fireEvent.click(screen.getByRole('button', { name: /Scan Plate/i }));
    await waitFor(() => expect(screen.getByText('Test Plate Visitor')).toBeInTheDocument());
  });

  it('handles face and plate scan errors', async () => {
    render(<GuardDashboard />);
    fireEvent.click(screen.getByRole('button', { name: /Start Live Feed/i }));
    await waitFor(() => expect(screen.getByRole('button', { name: /Scan Plate/i })).not.toBeDisabled());

    // Plate error
    global.fetch.mockRejectedValueOnce(new Error("Network Scan Error"));
    fireEvent.click(screen.getByRole('button', { name: /Scan Plate/i }));
    await waitFor(() => expect(screen.getByText(/Server error or timeout during scanning/i)).toBeInTheDocument());

    // Face error
    global.fetch.mockRejectedValueOnce(new Error("Network Face Error"));
    fireEvent.click(screen.getByRole('button', { name: /Verify Face/i }));
    await waitFor(() => expect(screen.getByText(/Server error during face verification/i)).toBeInTheDocument());
  });

  it('tests rejected plate scan status color rendering', async () => {
    render(<GuardDashboard />);
    fireEvent.click(screen.getByRole('button', { name: /Start Live Feed/i }));
    await waitFor(() => expect(screen.getByRole('button', { name: /Scan Plate/i })).not.toBeDisabled());

    global.fetch.mockImplementationOnce(async () => {
       return { ok: true, json: async () => ({
          success: true, message: 'Plate Verified',
          visitor: { _id: 'REJ123', vehicleNo: 'MH12', name: 'Rejected Person', status: 'rejected' }
       })};
    });

    fireEvent.click(screen.getByRole('button', { name: /Scan Plate/i }));
    await waitFor(() => expect(screen.getByText('Rejected Person')).toBeInTheDocument());
  });

  it('handles popup blocked when generating receipt', async () => {
    window.open.mockReturnValueOnce(null); // Return null to simulate block
    render(<GuardDashboard />);
    
    const searchInput = screen.getByPlaceholderText(/Enter Receipt ID/i);
    fireEvent.change(searchInput, { target: { value: 'PEND-1' } });
    
    global.fetch.mockImplementationOnce(async () => {
       return { ok: true, json: async () => [{ _id: 'PEND-1', name: 'Blocked Popup Guy', status: 'approved' }] };
    });

    fireEvent.click(screen.getByRole('button', { name: /Search/i }));
    await waitFor(() => expect(screen.getByText('Blocked Popup Guy')).toBeInTheDocument());
    
    fireEvent.click(screen.getByRole('button', { name: /View Official Receipt/i }));
    expect(window.alert).toHaveBeenCalledWith(expect.stringContaining("Popup blocked"));
  });

  it('simulates manual receipt search, enter key execution, and failure branches', async () => {
    render(<GuardDashboard />);
    const searchInput = screen.getByPlaceholderText(/Enter Receipt ID/i);
    fireEvent.change(searchInput, { target: { value: 'PEND-1' } });
    
    global.fetch.mockImplementationOnce(async () => {
       return { ok: true, json: async () => [{ _id: 'PEND-1', name: 'Search Result Parent', status: 'approved' }] };
    });

    fireEvent.keyDown(searchInput, { key: 'Enter', code: 'Enter', charCode: 13 });
    await waitFor(() => expect(screen.getByText('Search Result Parent')).toBeInTheDocument());
    
    fireEvent.change(searchInput, { target: { value: 'PEND-ERROR' } });
    global.fetch.mockRejectedValueOnce(new Error("Network Search Error"));
    fireEvent.click(screen.getByRole('button', { name: /Search/i }));
    await waitFor(() => expect(screen.getByText(/Server error during search/i)).toBeInTheDocument());

    fireEvent.click(screen.getByRole('button', { name: /Start Live Feed/i }));
    await waitFor(() => expect(screen.getByRole('button', { name: /Verify Face/i })).not.toBeDisabled());

    global.fetch.mockImplementationOnce(async () => {
        return { ok: true, json: async () => ({ success: false, message: 'Unauthorized Entry' }) };
    });

    fireEvent.click(screen.getByRole('button', { name: /Verify Face/i }));
    await waitFor(() => expect(screen.getByText(/Unauthorized Entry/i)).toBeInTheDocument());
  });
});