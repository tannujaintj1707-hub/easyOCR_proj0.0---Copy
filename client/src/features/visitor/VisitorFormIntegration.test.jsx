// client/src/features/visitor/VisitorFormIntegration.test.jsx
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach, beforeAll } from 'vitest';
import { MemoryRouter } from 'react-router-dom';
import VisitorForm from './VisitorForm';

beforeAll(() => { window.scrollTo = vi.fn(); });

describe('VisitorForm Integration', () => {
  beforeEach(() => { vi.clearAllMocks(); global.fetch = vi.fn(); });

  it('switches categories and checks for validation blocks', async () => {
    render(<MemoryRouter><VisitorForm /></MemoryRouter>);
    
    // Switch to Student
    fireEvent.click(screen.getByText('Student'));
    expect(screen.getByPlaceholderText(/e.g. ABCDE12345/i)).toBeInTheDocument();

    // Submit empty to cover error branches
    fireEvent.click(screen.getByRole('button', { name: /Submit Application/i }));
    
    await waitFor(() => {
      expect(global.fetch).not.toHaveBeenCalled();
    });
  });
});