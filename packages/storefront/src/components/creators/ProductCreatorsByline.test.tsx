/**
 * Tests:
 *   - packages/storefront/src/components/creators/ProductCreatorsByline.test.tsx
 */
import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { createBentoSpotlightFooterColors } from '../../color/leonardo-theme';
import { DEFAULT_BENTO_SHELL_COLOR } from '../today/BentoHeroFrame';
import { ProductCreatorsByline } from './ProductCreatorsByline';

const shell = DEFAULT_BENTO_SHELL_COLOR;
const colors = createBentoSpotlightFooterColors(shell);

describe('ProductCreatorsByline', () => {
  it('renders primary creator only when there are no collaborators', () => {
    render(
      <ProductCreatorsByline
        creatorName="Nova Studio"
        footerColors={colors}
        shellColor={shell}
      />,
    );
    expect(screen.getByText('Nova Studio')).toBeInTheDocument();
    expect(screen.queryByText(/and/i)).not.toBeInTheDocument();
  });

  it('renders one collaborator with “and” + name', () => {
    render(
      <ProductCreatorsByline
        creatorName="Nova Studio"
        collaborators={[{ name: 'Alex Kim', avatarUrl: null }]}
        footerColors={colors}
        shellColor={shell}
      />,
    );
    expect(screen.getByText('Nova Studio')).toBeInTheDocument();
    expect(screen.getByText('Alex Kim')).toBeInTheDocument();
    expect(screen.getByText(/\band\b/)).toBeInTheDocument();
  });

  it('omits profile/collaboration icons when showRoleIcons is false', () => {
    const { container } = render(
      <ProductCreatorsByline
        creatorName="Nova Studio"
        collaborators={[{ name: 'Alex Kim', avatarUrl: null }]}
        footerColors={colors}
        shellColor={shell}
        showRoleIcons={false}
      />,
    );
    expect(screen.getByText('Nova Studio')).toBeInTheDocument();
    expect(container.querySelector('svg')).toBeNull();
  });

  it('renders multiple collaborators as stacked avatars', () => {
    render(
      <ProductCreatorsByline
        creatorName="ShaderLab"
        collaborators={[
          { name: 'Mina Park', avatarUrl: null },
          { name: 'Jordan Lee', avatarUrl: null },
        ]}
        footerColors={colors}
        shellColor={shell}
      />,
    );
    expect(screen.getByText('ShaderLab')).toBeInTheDocument();
    const stack = screen.getByLabelText('Mina Park, Jordan Lee');
    expect(stack).toBeInTheDocument();
  });
});
