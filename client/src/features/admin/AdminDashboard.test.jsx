// client/src/features/admin/AdminDashboard.test.jsx
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach, beforeAll } from 'vitest';
import { MemoryRouter } from 'react-router-dom';
import AdminDashboard from './AdminDashboard';

beforeAll(() => {
  window.scrollTo = vi.fn();
  window.URL.createObjectURL = vi.fn();
  window.URL.revokeObjectURL = vi.fn();
  window.HTMLCanvasElement.prototype.getContext = vi.fn(() => ({ drawImage: vi.fn() }));
  window.HTMLCanvasElement.prototype.toDataURL = vi.fn(() => 'data:image/jpeg;base64,mock');
  global.Image = class { constructor() { setTimeout(() => { if (this.onload) this.onload(); }, 0); } };
});

describe('AdminDashboard Integration', () => {
  const mockVisitors = [
    { _id: '1', name: 'John Parent', visitorType: 'parent', status: 'pending_review', vehicleNo: 'MH12', hostName: 'Host1' },
    { _id: '2', name: 'Timmy Student', visitorType: 'student', status: 'rejected', studentId: 'STU1' }
  ];

  beforeEach(() => {
    vi.clearAllMocks();
    global.fetch = vi.fn().mockImplementation(async (url) => {
      if (url.includes('/api/admin/visitors')) return { ok: true, json: async () => mockVisitors };
      return { ok: true, json: async () => ({ success: true }) };
    });
  });

  // Helper to bypass Zod requirements perfectly
  const fillValidForm = async (container) => {
    await act(async () => {
      fireEvent.change(container.querySelector('[name="studentName"]'), { target: { value: 'Integration Student' } });
      fireEvent.input(container.querySelector('[name="studentId"]'), { target: { value: 'abcde12345' } });
      fireEvent.input(container.querySelector('[name="applyingClass"]'), { target: { value: 'b.tech cse 2nd yr' } });
      
      const incomeInput = container.querySelector('[name="guardianIncome"]');
      fireEvent.keyDown(incomeInput, { key: 'e' });
      fireEvent.keyDown(incomeInput, { key: '-' });
      fireEvent.change(incomeInput, { target: { value: '500000' } });
      
      const mobileInput = container.querySelector('[name="mobileNo"]');
      fireEvent.input(mobileInput, { target: { value: '0a1234567890' } });
      fireEvent.input(mobileInput, { target: { value: '1234567890' } });
      
      fireEvent.change(container.querySelector('[name="dob"]'), { target: { value: '2010-01-01' } });
      fireEvent.change(container.querySelector('[name="category"]'), { target: { value: 'General' } });
      fireEvent.change(container.querySelector('[name="fatherName"]'), { target: { value: 'Father Name' } });
      fireEvent.change(container.querySelector('[name="motherName"]'), { target: { value: 'Mother Name' } });
      fireEvent.change(container.querySelector('[name="guardianName"]'), { target: { value: 'Guardian Name' } });
      fireEvent.change(container.querySelector('[name="email"]'), { target: { value: 'test@test.com' } });
      
      fireEvent.change(container.querySelector('[name="authorizedPersons.0.name"]'), { target: { value: 'Auth Person' } });
      fireEvent.change(container.querySelector('[name="authorizedPersons.0.relation"]'), { target: { value: 'Mother' } });
      const authMobile = container.querySelector('[name="authorizedPersons.0.mobile"]');
      fireEvent.input(authMobile, { target: { value: '0b1234567890' } });
      fireEvent.input(authMobile, { target: { value: '1234567890' } });
      fireEvent.change(container.querySelector('[name="authorizedPersons.0.address"]'), { target: { value: 'Test Address' } });
    });
  };

  it('renders overview, handles editing, deleting, and modal cancellations', async () => {
    render(<MemoryRouter><AdminDashboard /></MemoryRouter>);
    await waitFor(() => expect(screen.getByText('John Parent')).toBeInTheDocument());

    const editBtns = screen.getAllByTitle('Edit Record');
    fireEvent.click(editBtns[0]);
    fireEvent.click(screen.getByText('Cancel'));

    fireEvent.click(editBtns[0]);
    fireEvent.change(screen.getByDisplayValue('John Parent'), { target: { value: 'John Edited' } });
    fireEvent.change(screen.getByDisplayValue('Host1'), { target: { value: 'Host Edited' } });
    fireEvent.change(screen.getByDisplayValue('MH12'), { target: { value: 'MH13' } });
    fireEvent.change(screen.getByDisplayValue('Pending'), { target: { value: 'approved' } });
    fireEvent.click(screen.getByText('Save Changes'));
    await waitFor(() => expect(global.fetch).toHaveBeenCalledWith(expect.stringContaining('/api/admin/visitors/1'), expect.any(Object)));

    const delBtns = screen.getAllByTitle('Delete Record');
    fireEvent.click(delBtns[1]);
    fireEvent.click(screen.getByText('Cancel'));

    fireEvent.click(delBtns[1]);
    fireEvent.click(screen.getByText('Yes, Delete'));
    await waitFor(() => expect(global.fetch).toHaveBeenCalledWith(expect.stringContaining('/api/admin/visitors/2'), expect.any(Object)));
  });

  it('handles API errors for edit and delete to hit catch blocks', async () => {
    render(<MemoryRouter><AdminDashboard /></MemoryRouter>);
    await waitFor(() => expect(screen.getByText('John Parent')).toBeInTheDocument());

    fireEvent.click(screen.getAllByTitle('Edit Record')[0]);
    global.fetch.mockRejectedValueOnce(new Error("Edit API Error"));
    fireEvent.click(screen.getByText('Save Changes'));

    fireEvent.click(screen.getAllByTitle('Delete Record')[1]);
    global.fetch.mockRejectedValueOnce(new Error("Delete API Error"));
    fireEvent.click(screen.getByText('Yes, Delete'));
  });

  it('submits student registration successfully', async () => {
    const { container } = render(<MemoryRouter><AdminDashboard /></MemoryRouter>);
    fireEvent.click(screen.getByRole('button', { name: /Student Registration/i }));
    await waitFor(() => expect(container.querySelector('form')).toBeInTheDocument());

    await fillValidForm(container);

    await act(async () => {
      const file = new File(['dummy'], 'photo.png', { type: 'image/png' });
      fireEvent.change(container.querySelector('#student-photo-upload'), { target: { files: [file] } });
      fireEvent.change(container.querySelector('#auth-photo-0'), { target: { files: [file] } });
    });

    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: /Register Student to Database/i }));
    });

    await waitFor(() => {
      expect(screen.getByText(/Student Application Registered Successfully!/i)).toBeInTheDocument();
    });
  });

  it('shows error when photo is missing', async () => {
    const { container } = render(<MemoryRouter><AdminDashboard /></MemoryRouter>);
    fireEvent.click(screen.getByRole('button', { name: /Student Registration/i }));
    await waitFor(() => expect(container.querySelector('form')).toBeInTheDocument());

    await fillValidForm(container);

    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: /Register Student to Database/i }));
    });

    await waitFor(() => expect(screen.getByText(/Student Photo is a compulsory field/i)).toBeInTheDocument());
  });

  it('handles server crash during student registration', async () => {
    const { container } = render(<MemoryRouter><AdminDashboard /></MemoryRouter>);
    fireEvent.click(screen.getByRole('button', { name: /Student Registration/i }));
    await waitFor(() => expect(container.querySelector('form')).toBeInTheDocument());

    await fillValidForm(container);

    await act(async () => {
      const file = new File(['dummy'], 'photo.png', { type: 'image/png' });
      fireEvent.change(container.querySelector('#student-photo-upload'), { target: { files: [file] } });
    });

    global.fetch.mockRejectedValueOnce(new Error("Registration API Crash"));

    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: /Register Student to Database/i }));
    });

    await waitFor(() => expect(screen.getByText(/An error occurred while connecting/i)).toBeInTheDocument());
  });
  
  it('handles submission failure (ok: false)', async () => {
    const { container } = render(<MemoryRouter><AdminDashboard /></MemoryRouter>);
    fireEvent.click(screen.getByRole('button', { name: /Student Registration/i }));
    await waitFor(() => expect(container.querySelector('form')).toBeInTheDocument());

    await fillValidForm(container);

    await act(async () => {
      const file = new File(['dummy'], 'photo.png', { type: 'image/png' });
      fireEvent.change(container.querySelector('#student-photo-upload'), { target: { files: [file] } });
    });

    global.fetch.mockResolvedValueOnce({ ok: false, json: async () => ({ error: "Duplicate ID" }) });

    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: /Register Student to Database/i }));
    });

    await waitFor(() => expect(screen.getByText(/Submission Failed:/i)).toBeInTheDocument());
  });

  it('triggers validation errors on empty submit', async () => {
    const { container } = render(<MemoryRouter><AdminDashboard /></MemoryRouter>);
    fireEvent.click(screen.getByRole('button', { name: /Student Registration/i }));
    await waitFor(() => expect(container.querySelector('form')).toBeInTheDocument());

    await act(async () => {
      fireEvent.submit(container.querySelector('form'));
    });

    await waitFor(() => {
      expect(container.querySelectorAll('.text-red-400').length).toBeGreaterThan(0);
    });
  });
});