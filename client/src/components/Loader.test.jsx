import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import Loader from './Loader';

describe('Loader Component', () => {
  
  it('renders the standard loader correctly', () => {
    // Render the component with fullScreen = false
    const { container } = render(<Loader fullScreen={false} />);
    
    // Check if it rendered without crashing (the text shouldn't be there)
    expect(screen.queryByText(/Securing Connection.../i)).not.toBeInTheDocument();
    
    // Check if the container has the correct standard classes
    expect(container.firstChild).toHaveClass('p-10', 'w-full', 'h-full');
  });

  it('renders the fullscreen loader with portal text', () => {
    // Render the component with fullScreen = true
    render(<Loader fullScreen={true} />);
    
    // Check if the specific text is present in the document
    expect(screen.getByText(/Securing Connection.../i)).toBeInTheDocument();
    
    // Check if the fullscreen classes were applied
    const textElement = screen.getByText(/Securing Connection.../i);
    expect(textElement.parentElement).toHaveClass('fixed', 'inset-0', 'w-screen', 'h-screen');
  });
});