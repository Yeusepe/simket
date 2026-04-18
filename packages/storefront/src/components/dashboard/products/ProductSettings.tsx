/**
 * Purpose: Product publishing settings covering visibility, tags, terms, and slug editing.
 * Governing docs:
 *   - docs/architecture.md
 *   - docs/service-architecture.md
 *   - docs/domain-model.md
 * External references:
 *   - https://heroui.com/react/llms.txt
 *   - https://www.heroui.com/docs/react/components/radio-group
 *   - https://www.heroui.com/docs/react/components/input
 * Tests:
 *   - packages/storefront/src/components/dashboard/products/ProductForm.test.tsx
 */
import { useMemo, useState, type ComponentType } from 'react';
import { Button, Card, Chip, Input, Label, Radio, RadioGroup } from '@heroui/react';
import { TipTapEditor, type TipTapEditorProps } from '../../TipTapEditor';
import type { ProductFormData, ProductFormErrors } from './product-types';

interface ProductSettingsProps {
  readonly slug: string;
  readonly visibility: ProductFormData['visibility'];
  readonly tags: readonly string[];
  readonly termsOfService: string;
  readonly availableTags?: readonly string[];
  readonly errors?: Pick<ProductFormErrors, 'slug' | 'termsOfService'>;
  readonly onChange: (patch: Partial<ProductFormData>) => void;
  readonly RichTextEditorComponent?: ComponentType<TipTapEditorProps>;
}

export function ProductSettings({
  slug,
  visibility,
  tags,
  termsOfService,
  availableTags = [],
  errors,
  onChange,
  RichTextEditorComponent = TipTapEditor,
}: ProductSettingsProps) {
  const [tagDraft, setTagDraft] = useState('');

  const suggestedTags = useMemo(
    () =>
      availableTags.filter(
        (tag) =>
          tag.toLowerCase().includes(tagDraft.toLowerCase()) &&
          !tags.includes(tag),
      ),
    [availableTags, tagDraft, tags],
  );

  const addTag = (tag: string) => {
    const normalized = tag.trim().toLowerCase();
    if (normalized.length === 0 || tags.includes(normalized)) {
      return;
    }

    onChange({ tags: [...tags, normalized] });
    setTagDraft('');
  };

  return (
    <Card variant="secondary">
      <Card.Header className="space-y-1">
        <Card.Title>Settings</Card.Title>
        <Card.Description>Control publishing state, tag discovery, terms, and the canonical product URL.</Card.Description>
      </Card.Header>
      <Card.Content className="space-y-6">
        <RadioGroup value={visibility} onChange={(value) => onChange({ visibility: value as ProductFormData['visibility'] })}>
          <Label>Visibility</Label>
          {(['draft', 'published', 'archived'] as const).map((option) => (
            <Radio key={option} value={option}>
              <Radio.Control>
                <Radio.Indicator />
              </Radio.Control>
              <Radio.Content>
                <Label className="capitalize">{option}</Label>
              </Radio.Content>
            </Radio>
          ))}
        </RadioGroup>

        <div className="space-y-2">
          <Label htmlFor="product-slug">URL slug</Label>
          <Input
            id="product-slug"
            aria-label="URL slug"
            value={slug}
            onChange={(event) => onChange({ slug: event.currentTarget.value })}
          />
          {errors?.slug ? (
            <p className="text-sm text-danger">{errors.slug}</p>
          ) : (
            <p className="text-sm text-muted-foreground">This controls the creator-facing product URL.</p>
          )}
        </div>

        <div className="space-y-3">
          <div className="space-y-1">
            <Label htmlFor="product-tags">Tags</Label>
            <p className="text-sm text-muted-foreground">Add discovery tags and pick suggested matches below.</p>
          </div>
          <div className="flex gap-2">
            <Input
              id="product-tags"
              aria-label="Tags"
              placeholder="Add a tag"
              value={tagDraft}
              onChange={(event) => setTagDraft(event.currentTarget.value)}
              onKeyDown={(event) => {
                if (event.key === 'Enter') {
                  event.preventDefault();
                  addTag(tagDraft);
                }
              }}
            />
            <Button variant="secondary" onPress={() => addTag(tagDraft)}>
              Add tag
            </Button>
          </div>

          {tags.length > 0 ? (
            <div className="flex flex-wrap gap-2">
              {tags.map((tag) => (
                <div key={tag} className="flex items-center gap-1">
                  <Chip variant="soft">
                    <Chip.Label>{tag}</Chip.Label>
                  </Chip>
                  <Button
                    variant="ghost"
                    aria-label={`Remove ${tag}`}
                    onPress={() => onChange({ tags: tags.filter((existingTag) => existingTag !== tag) })}
                  >
                    ×
                  </Button>
                </div>
              ))}
            </div>
          ) : null}

          {suggestedTags.length > 0 ? (
            <div className="flex flex-wrap gap-2">
              {suggestedTags.slice(0, 6).map((tag) => (
                <Button key={tag} variant="ghost" size="sm" onPress={() => addTag(tag)}>
                  {tag}
                </Button>
              ))}
            </div>
          ) : null}
        </div>

        <div className="space-y-2">
          <Label>Terms of service</Label>
          <RichTextEditorComponent
            content={termsOfService}
            placeholder="Terms of service"
            onChange={(json) => onChange({ termsOfService: JSON.stringify(json) })}
          />
          {errors?.termsOfService ? (
            <p className="text-sm text-danger">{errors.termsOfService}</p>
          ) : null}
        </div>
      </Card.Content>
    </Card>
  );
}
