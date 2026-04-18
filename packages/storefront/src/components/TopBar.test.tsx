import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { TopBar } from './TopBar';

vi.mock('./notifications', () => ({
  NotificationBell: () => <button aria-label="Notifications">🔔</button>,
}));

function renderWithRouter(ui: React.ReactElement, { route = '/' } = {}) {
  return render(<MemoryRouter initialEntries={[route]}>{ui}</MemoryRouter>);
}

describe('TopBar', () => {
  it('renders the Simket logo link', () => {
    renderWithRouter(<TopBar />);
    expect(screen.getByText('Simket')).toBeInTheDocument();
  });

  it('renders search input', () => {
    renderWithRouter(<TopBar />);
    // HeroUI SearchField renders an input — find by placeholder
    const input = screen.getByPlaceholderText('Search products…');
    expect(input).toBeInTheDocument();
  });

  it('renders Home button', () => {
    renderWithRouter(<TopBar />);
    expect(screen.getByText('Home')).toBeInTheDocument();
  });

  it('renders theme toggle button', () => {
    renderWithRouter(<TopBar />);
    const toggle = screen.getByLabelText(/switch to .* mode/i);
    expect(toggle).toBeInTheDocument();
  });

  it('renders Cart button', () => {
    renderWithRouter(<TopBar />);
    expect(screen.getByText('Cart')).toBeInTheDocument();
  });

  it('renders Notifications button', () => {
    renderWithRouter(<TopBar />);
    expect(screen.getByLabelText('Notifications')).toBeInTheDocument();
  });

  it('renders Library button', () => {
    renderWithRouter(<TopBar />);
    expect(screen.getByText('Library')).toBeInTheDocument();
  });

  it('renders profile avatar', () => {
    renderWithRouter(<TopBar />);
    expect(screen.getByTestId('profile-avatar')).toBeInTheDocument();
  });
});
