/**
 * Purpose: Regression tests for creator product form composition, validation, and save actions.
 * Governing docs:
 *   - docs/architecture.md
 *   - docs/service-architecture.md
 *   - docs/domain-model.md
 * External references:
 *   - https://heroui.com/react/llms.txt
 *   - https://www.heroui.com/docs/react/components/card
 *   - https://www.heroui.com/docs/react/components/button
 * Tests:
 *   - packages/storefront/src/components/dashboard/products/ProductForm.test.tsx
 */
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { ProductForm } from './ProductForm';
import type { AssetUploaderProps } from '../../AssetUploader';
import type { TipTapEditorProps } from '../../TipTapEditor';

function TestUploader(_props: AssetUploaderProps) {
  return <div>Uploader mounted</div>;
}

function TestEditor({ content, onChange, placeholder }: TipTapEditorProps) {
  return (
    <textarea
      aria-label={placeholder ?? 'Rich text editor'}
      defaultValue={typeof content === 'string' ? content : ''}
      onChange={(event) =>
        onChange?.({
          type: 'doc',
          content: [
            {
              type: 'paragraph',
              content: [{ type: 'text', text: event.currentTarget.value }],
            },
          ],
          text: event.currentTarget.value,
        })
      }
    />
  );
}

describe('ProductForm', () => {
  it('renders all product form sections', () => {
    render(
      <ProductForm
        uploaderConfig={{
          presignEndpoint: '/api/uploads/presign',
          tusEndpoint: '/files',
          maxFileSize: 5 * 1024 * 1024,
          allowedMimeTypes: ['image/png', 'image/webp'],
        }}
        onSave={() => undefined}
        AssetUploaderComponent={TestUploader}
        RichTextEditorComponent={TestEditor}
      />,
    );

    expect(screen.getByText('Basic info')).toBeInTheDocument();
    expect(screen.getByText('Description')).toBeInTheDocument();
    expect(screen.getByText('Pricing')).toBeInTheDocument();
    expect(screen.getByText('Media')).toBeInTheDocument();
    expect(screen.getByText('Settings')).toBeInTheDocument();
  });

  it('shows validation errors when publishing invalid data', async () => {
    const user = userEvent.setup();
    render(
      <ProductForm
        uploaderConfig={{
          presignEndpoint: '/api/uploads/presign',
          tusEndpoint: '/files',
          maxFileSize: 5 * 1024 * 1024,
          allowedMimeTypes: ['image/png', 'image/webp'],
        }}
        onSave={() => undefined}
        AssetUploaderComponent={TestUploader}
        RichTextEditorComponent={TestEditor}
      />,
    );

    await user.click(screen.getByRole('button', { name: 'Publish' }));

    expect(screen.getByText('Product name is required.')).toBeInTheDocument();
    expect(screen.getByText('Price must be greater than 0.')).toBeInTheDocument();
  });

  it('submits a valid product payload', async () => {
    const user = userEvent.setup();
    const onSave = vi.fn();

    render(
      <ProductForm
        uploaderConfig={{
          presignEndpoint: '/api/uploads/presign',
          tusEndpoint: '/files',
          maxFileSize: 5 * 1024 * 1024,
          allowedMimeTypes: ['image/png', 'image/webp'],
        }}
        onSave={onSave}
        AssetUploaderComponent={TestUploader}
        RichTextEditorComponent={TestEditor}
      />,
    );

    await user.type(screen.getByLabelText('Product name'), 'Creator Bundle');
    await user.type(screen.getByLabelText('Short description'), 'A premium creator bundle.');
    await user.clear(screen.getByLabelText('Price'));
    await user.type(screen.getByLabelText('Price'), '49.00');
    await user.type(screen.getByLabelText('Product description'), 'Full product description');
    await user.type(screen.getByLabelText('Terms of service'), 'Terms apply');
    await user.click(screen.getByRole('button', { name: 'Publish' }));

    await waitFor(() => {
      expect(onSave).toHaveBeenCalledWith(
        expect.objectContaining({
          name: 'Creator Bundle',
          slug: 'creator-bundle',
          price: 4900,
          visibility: 'published',
        }),
      );
    });
  });
});
