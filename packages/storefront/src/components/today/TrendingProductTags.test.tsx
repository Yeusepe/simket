import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { TrendingProductTags } from './TrendingProductTags';

describe('TrendingProductTags', () => {
  it('compresses overflow into a compact summary', () => {
    render(
      <TrendingProductTags
        tags={['shader', 'unity', 'urp', 'stylized']}
        size="md"
      />,
    );

    expect(screen.getByText('shader')).toBeInTheDocument();
    expect(screen.getByText('unity')).toBeInTheDocument();
    expect(screen.queryByText('urp')).not.toBeInTheDocument();
    expect(screen.getByText('+2')).toBeInTheDocument();
  });
});
