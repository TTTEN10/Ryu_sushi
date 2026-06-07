import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import CrisisResourceBanner from '../CrisisResourceBanner';

describe('CrisisResourceBanner', () => {
  it('renders crisis disclaimer and helpline link', () => {
    render(<CrisisResourceBanner />);

    expect(screen.getByRole('note', { name: /crisis support resources/i })).toBeInTheDocument();
    expect(screen.getByText(/dr\. safe is not a crisis service/i)).toBeInTheDocument();

    const link = screen.getByRole('link', { name: /findahelpline\.com/i });
    expect(link).toHaveAttribute('href', 'https://findahelpline.com');
    expect(link).toHaveAttribute('target', '_blank');
    expect(link).toHaveAttribute('rel', 'noopener noreferrer');
  });
});
