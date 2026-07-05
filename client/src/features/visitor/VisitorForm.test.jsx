import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { BrowserRouter } from 'react-router-dom';
import VisitorForm from './VisitorForm';

// --- 1. MOCK ROUTER ---
const mockNavigate = vi.fn();
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return { ...actual, useNavigate: () => mockNavigate };
});

// --- 2. IMPROVED MOCK CANVAS & FILE READER ---
global.FileReader = class {
  readAsDataURL() {
    setTimeout(() => {
      if (typeof this.onload === 'function') {
        this.onload({ target: { result: 'data:image/jpeg;base64,fake' } });
      }
    }, 10); // Safe delay to ensure onload is attached
  }
};

global.Image = class {
  constructor() {
    this.width = 100;
    this.height = 100;
  }
  // We use a setter for src to simulate the browser loading the image
  set src(url) {
    setTimeout(() => {
      if (typeof this.onload === 'function') {
        this.onload();
      }
    }, 10);
  }
};

HTMLCanvasElement.prototype.getContext = vi.fn(() => ({
  drawImage: vi.fn(),
}));
HTMLCanvasElement.prototype.toDataURL = vi.fn(() => 'data:image/jpeg;base64,mocked');

// --- 3. MOCK FETCH & LOCALSTORAGE ---
beforeEach(() => {
    vi.clearAllMocks(); 
    // Re-create the mock from scratch before every test to stop the domino effect!
    global.fetch = vi.fn(); 
    localStorage.clear();
  });

const localStorageMock = (() => {
  let store = {};
  return {
    getItem: vi.fn(key => store[key] || null),
    setItem: vi.fn((key, value) => { store[key] = value.toString(); }),
    clear: vi.fn(() => { store = {}; })
  };
})();
Object.defineProperty(window, 'localStorage', { value: localStorageMock });

describe('VisitorForm Component', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
  });

  const renderForm = () => render(
    <BrowserRouter>
      <VisitorForm />
    </BrowserRouter>
  );

  it('renders correctly with default Parent category', () => {
    renderForm();
    expect(screen.getByText(/Gate Pass/i)).toBeInTheDocument();
  });

  it('switches to Student category when clicked', async () => {
    const user = userEvent.setup();
    renderForm();
    
    await user.click(screen.getByText('Student'));

    await waitFor(() => {
      expect(screen.queryByText(/Meeting Student Details/i)).not.toBeInTheDocument();
      expect(screen.getByPlaceholderText('ABCDE12345')).toBeInTheDocument();
    });
  });

  it('sanitizes the full name input', async () => {
    const user = userEvent.setup();
    renderForm();
    
    const nameInput = screen.getByPlaceholderText(/Enter your full name/i);
    await user.type(nameInput, 'John123 Doe@!');
    
    expect(nameInput.value).toBe('John Doe');
  });

  it('submits successfully and navigates to receipts page', async () => {
    const user = userEvent.setup();
    
    fetch.mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve({ success: true }),
    });

    renderForm();

    // 1. Fill Text Fields
    await user.type(screen.getByPlaceholderText(/Enter your full name/i), 'Jane Doe');
    await user.type(screen.getByPlaceholderText('Student Name'), 'John Junior');
    await user.type(screen.getByPlaceholderText('e.g. ABCDE12345'), 'ABCDE12345');

    // 2. Upload Photo (Using safer userEvent.upload)
    const file = new File(['(⌐□_□)'], 'photo.png', { type: 'image/png' });
    const photoInput = document.querySelector('#photo-0');
    await user.upload(photoInput, file);

    // 3. Set Future Dates
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    const dayAfter = new Date();
    dayAfter.setDate(dayAfter.getDate() + 2);
    
    const formatDateTime = (date) => {
      const d = new Date(date);
      d.setMinutes(d.getMinutes() - d.getTimezoneOffset());
      return d.toISOString().slice(0, 16);
    };

    fireEvent.change(document.querySelector('input[name="arrivalDate"]'), { 
      target: { value: formatDateTime(tomorrow) } 
    });
    fireEvent.change(document.querySelector('input[name="departureDate"]'), { 
      target: { value: formatDateTime(dayAfter) } 
    });

    // 4. Fill Custom Selects
    const transportLabel = screen.getByText(/Transport Mode/i);
    await user.click(transportLabel.parentElement.querySelector('button'));
    await user.click(await screen.findByText('Bus'));

    const courseLabel = screen.getByText(/Student Course/i);
    await user.click(courseLabel.parentElement.querySelector('button'));
    await user.click(await screen.findByText('B.Tech'));

    const hostelLabel = screen.getByText(/Student Hostel/i);
    await user.click(hostelLabel.parentElement.querySelector('button'));
    await user.click(await screen.findByText('Main Hostel'));

    // 5. Submit the Form
    const submitBtn = screen.getByText(/Submit Application/i);
    
    await waitFor(() => {
      expect(submitBtn).not.toBeDisabled();
    });

    await user.click(submitBtn);

    // 6. Verify Success state!
    await waitFor(() => {
      expect(fetch).toHaveBeenCalledTimes(1);
      expect(screen.getByText(/Form Submitted/i)).toBeInTheDocument();
    });
    
    expect(localStorage.setItem).toHaveBeenCalledWith('all_receipts', expect.any(String));
  });
  it('submits successfully as a Student', async () => {
    const user = userEvent.setup();
    fetch.mockResolvedValueOnce({ ok: true, json: () => Promise.resolve({ success: true }) });
    renderForm();

    // Switch to Student mode
    await user.click(screen.getByText('Student'));

    // Fill Student Fields (INCLUDING THE PREVIOUSLY MISSING NAME FIELD!)
    await user.type(screen.getByPlaceholderText(/Enter your full name/i), 'Jane Student');
    await user.type(screen.getByPlaceholderText('ABCDE12345'), 'ABCDE12345');

    const file = new File([''], 'photo.png', { type: 'image/png' });
    await user.upload(document.querySelector('#student-photo'), file);

    const tomorrow = new Date(); tomorrow.setDate(tomorrow.getDate() + 1);
    const formatDateTime = (date) => new Date(date.getTime() - date.getTimezoneOffset() * 60000).toISOString().slice(0, 16);
    fireEvent.change(document.querySelector('input[name="arrivalDate"]'), { target: { value: formatDateTime(tomorrow) } });

    // Custom Selects
    await user.click(screen.getByText(/Transport Mode/i).parentElement.querySelector('button'));
    await user.click(await screen.findByText('Bus'));
    await user.click(screen.getByText(/Course/i).parentElement.querySelector('button'));
    await user.click(await screen.findByText('B.Tech'));
    await user.click(screen.getByText(/Hostel Name/i).parentElement.querySelector('button'));
    await user.click(await screen.findByText('Main Hostel'));

    const submitBtn = screen.getByText(/Submit Application/i);
    await waitFor(() => expect(submitBtn).not.toBeDisabled());
    await user.click(submitBtn);

    await waitFor(() => expect(screen.getByText(/Form Submitted/i)).toBeInTheDocument());
  });

  it('shows an alert when network crashes during submission', async () => {
    const user = userEvent.setup();
    
    // Simulate a network crash!
    global.fetch.mockRejectedValueOnce(new Error('Network Down'));
    renderForm();

    // Fill minimum parent data
    await user.type(screen.getByPlaceholderText(/Enter your full name/i), 'Jane Doe');
    await user.type(screen.getByPlaceholderText('Student Name'), 'John Junior');
    await user.type(screen.getByPlaceholderText('e.g. ABCDE12345'), 'ABCDE12345');
    
    const file = new File([''], 'photo.png', { type: 'image/png' });
    await user.upload(document.querySelector('#photo-0'), file);
    
    const tomorrow = new Date(); tomorrow.setDate(tomorrow.getDate() + 1);
    const dayAfter = new Date(); dayAfter.setDate(dayAfter.getDate() + 2);
    const formatDateTime = (date) => new Date(date.getTime() - date.getTimezoneOffset() * 60000).toISOString().slice(0, 16);
    fireEvent.change(document.querySelector('input[name="arrivalDate"]'), { target: { value: formatDateTime(tomorrow) } });
    fireEvent.change(document.querySelector('input[name="departureDate"]'), { target: { value: formatDateTime(dayAfter) } });

    await user.click(screen.getByText(/Transport Mode/i).parentElement.querySelector('button'));
    await user.click(await screen.findByText('Bus'));
    await user.click(screen.getByText(/Student Course/i).parentElement.querySelector('button'));
    await user.click(await screen.findByText('B.Tech'));
    await user.click(screen.getByText(/Student Hostel/i).parentElement.querySelector('button'));
    await user.click(await screen.findByText('Main Hostel'));

    const submitBtn = screen.getByText(/Submit Application/i);
    await waitFor(() => expect(submitBtn).not.toBeDisabled());
    await user.click(submitBtn);

    // Verify the catch block triggers the UI error banner!
    await waitFor(() => {
      expect(screen.getByText("Error processing submission. Please check form data.")).toBeInTheDocument();
    });
  });
  it('shows an alert when the database rejects the submission (ok: false)', async () => {
    const user = userEvent.setup();
    
    // Simulate backend returning a Database Error
    global.fetch.mockResolvedValueOnce({
      ok: false,
      json: () => Promise.resolve({ error: "Invalid Student ID" }),
    });
    
    renderForm();

    await user.click(screen.getByText('Student'));
    await user.type(screen.getByPlaceholderText(/Enter your full name/i), 'Jane Student');
    await user.type(screen.getByPlaceholderText('ABCDE12345'), 'ABCDE12345');
    
    const file = new File([''], 'photo.png', { type: 'image/png' });
    await user.upload(document.querySelector('#student-photo'), file);
    
    const tomorrow = new Date(); tomorrow.setDate(tomorrow.getDate() + 1);
    const formatDateTime = (date) => new Date(date.getTime() - date.getTimezoneOffset() * 60000).toISOString().slice(0, 16);
    fireEvent.change(document.querySelector('input[name="arrivalDate"]'), { target: { value: formatDateTime(tomorrow) } });

    await user.click(screen.getByText(/Transport Mode/i).parentElement.querySelector('button'));
    await user.click(await screen.findByText('Bus'));
    await user.click(screen.getByText(/Course/i).parentElement.querySelector('button'));
    await user.click(await screen.findByText('B.Tech'));
    await user.click(screen.getByText(/Hostel Name/i).parentElement.querySelector('button'));
    await user.click(await screen.findByText('Main Hostel'));

    const submitBtn = screen.getByText(/Submit Application/i);
    await waitFor(() => expect(submitBtn).not.toBeDisabled());
    await user.click(submitBtn);

    // Look for the beautiful custom toast in the DOM instead of window.alert!
    await waitFor(() => {
      expect(screen.getByText("Database Error: Invalid Student ID")).toBeInTheDocument();
    });
  });
});