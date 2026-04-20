import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { SparseCreatorByline } from './SparseCreatorByline';

describe('SparseCreatorByline', () => {
  it('summarizes multiple collaborators while keeping avatar circles', () => {
    render(
      <SparseCreatorByline
        creatorName="Nova Studio"
        collaborators={[
          { name: 'Alex Kim' },
          { name: 'Rin Vale' },
        ]}
      />,
    );

    expect(screen.getByText('Nova Studio')).toBeInTheDocument();
    expect(screen.getByText('2 collaborators')).toBeInTheDocument();
    expect(screen.getByTestId('product-creators-primary-avatar')).toBeInTheDocument();
    expect(screen.getByTestId('product-creators-collaborator-avatars')).toBeInTheDocument();
    expect(screen.queryByText('Alex Kim')).not.toBeInTheDocument();
  });
});
