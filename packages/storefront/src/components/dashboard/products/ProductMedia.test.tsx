/**
 * Purpose: Regression tests for creator product media upload sections and image previews.
 * Governing docs:
 *   - docs/architecture.md
 *   - docs/service-architecture.md
 *   - docs/domain-model.md
 * External references:
 *   - https://heroui.com/react/llms.txt
 *   - https://www.heroui.com/docs/react/components/card
 * Tests:
 *   - packages/storefront/src/components/dashboard/products/ProductMedia.test.tsx
 */
import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { ProductMedia } from './ProductMedia';
import type { AssetUploaderProps } from '../../AssetUploader';

function TestUploader(_props: AssetUploaderProps) {
  return <div>Uploader mounted</div>;
}

describe('ProductMedia', () => {
  it('renders upload sections and previews uploaded images', () => {
    render(
      <ProductMedia
        heroImageId="hero-1"
        heroTransparentId="hero-transparent-1"
        galleryImageIds={['gallery-1', 'gallery-2']}
        imageUrlsById={{
          'hero-1': 'https://cdn.example.com/hero-1.webp',
          'hero-transparent-1': 'https://cdn.example.com/hero-transparent-1.webp',
          'gallery-1': 'https://cdn.example.com/gallery-1.webp',
          'gallery-2': 'https://cdn.example.com/gallery-2.webp',
        }}
        uploaderConfig={{
          presignEndpoint: '/api/uploads/presign',
          tusEndpoint: '/files',
          maxFileSize: 5 * 1024 * 1024,
          allowedMimeTypes: ['image/png', 'image/webp'],
        }}
        AssetUploaderComponent={TestUploader}
      />,
    );

    expect(screen.getByText('Hero image')).toBeInTheDocument();
    expect(screen.getByText('Transparent hero image')).toBeInTheDocument();
    expect(screen.getByText('Gallery images')).toBeInTheDocument();
    expect(screen.getAllByText('Uploader mounted')).toHaveLength(3);
    expect(screen.getByRole('img', { name: 'Hero preview' })).toHaveAttribute(
      'src',
      'https://cdn.example.com/hero-1.webp',
    );
    expect(screen.getByRole('img', { name: 'Gallery preview 1' })).toBeInTheDocument();
  });
});
