import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { HomePage } from './HomePage';

describe('HomePage', () => {
  it('renders the Today section', () => {
    render(
      <MemoryRouter>
        <HomePage />
      </MemoryRouter>,
    );
    expect(screen.getByText('Today')).toBeInTheDocument();
  });

  it('renders the Discover section', () => {
    render(
      <MemoryRouter>
        <HomePage />
      </MemoryRouter>,
    );
    expect(screen.getByText('Discover')).toBeInTheDocument();
  });

  it('renders 4 editorial pick cards', () => {
    render(
      <MemoryRouter>
        <HomePage />
      </MemoryRouter>,
    );
    for (let i = 1; i <= 4; i++) {
      expect(screen.getByText(`Editorial Pick #${i}`)).toBeInTheDocument();
    }
  });
});
