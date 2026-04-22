/**
 * Purpose: Rich dashboard editing studio for Framely-backed store and product
 *          pages with palette browsing, layer management, inspector controls,
 *          and live device preview.
 * Governing docs:
 *   - docs/architecture.md (§2 HeroUI everywhere, §5 Framely integration)
 *   - docs/service-architecture.md (§7.7 Storefront plugin)
 *   - docs/domain-model.md (§4.5 StorePage)
 * External references:
 *   - https://heroui.com/react/llms.txt
 *   - https://heroui.com/docs/react/components/search-field
 *   - https://heroui.com/docs/react/components/text-area
 *   - https://heroui.com/docs/react/components/switch
 *   - https://github.com/belastrittmatter/Framely
 * Tests:
 *   - packages/storefront/src/components/dashboard/templates/TemplateBuilderStudio.test.tsx
 */
import { useMemo, useState } from 'react';
import {
  Button,
  Card,
  Chip,
  Input,
  Label,
  SearchField,
  Separator,
  Switch,
  TextArea,
} from '@heroui/react';
import { Segment } from '@heroui-pro/react';
import type { JSONContent } from '@tiptap/core';
import {
  PageRenderer,
  getAllBlocks,
  getBlock,
  type BlockDefinition,
  type FramelyRenderContext,
  type PageBlock,
  type PropField,
} from '../../../builder';
import type { DashboardPreviewDevice, DashboardPreviewMode } from '../dashboard-preferences';
import type { TemplateCategory } from './template-types';
import { Icon } from '../../common/Icon';

type BuilderHandle = ReturnType<typeof import('../../../builder').useBuilder>;

interface TemplateBuilderStudioProps {
  readonly builder: BuilderHandle;
  readonly surfaceLabel: string;
  readonly surfaceCategory: TemplateCategory;
  readonly previewContext: FramelyRenderContext;
  readonly previewDevice: DashboardPreviewDevice;
  readonly previewMode: DashboardPreviewMode;
  readonly onPreviewDeviceChange: (device: DashboardPreviewDevice) => void;
  readonly onPreviewModeChange: (mode: DashboardPreviewMode) => void;
}

interface PaletteGroupDefinition {
  readonly id: string;
  readonly label: string;
  readonly types: readonly string[];
}

const COMMON_PALETTE_GROUPS: readonly PaletteGroupDefinition[] = [
  {
    id: 'storytelling',
    label: 'Storytelling',
    types: ['hero', 'text', 'button', 'badge', 'alert', 'testimonial'],
  },
  {
    id: 'visuals',
    label: 'Visuals',
    types: ['gallery', 'avatar', 'card-grid', 'spacer'],
  },
  {
    id: 'utility',
    label: 'Utility',
    types: ['breadcrumb', 'progress', 'table', 'tabs', 'modal', 'tooltip'],
  },
];

const STORE_SURFACE_GROUPS: readonly PaletteGroupDefinition[] = [
  {
    id: 'live-data',
    label: 'Live store data',
    types: ['store-profile', 'store-catalog'],
  },
  ...COMMON_PALETTE_GROUPS,
];

const PRODUCT_SURFACE_GROUPS: readonly PaletteGroupDefinition[] = [
  {
    id: 'live-data',
    label: 'Live product data',
    types: ['product-detail'],
  },
  ...COMMON_PALETTE_GROUPS,
];

const PREVIEW_DEVICE_OPTIONS: readonly DashboardPreviewDevice[] = ['desktop', 'tablet', 'mobile'];
const PREVIEW_MODE_OPTIONS: readonly DashboardPreviewMode[] = ['split', 'focus'];

function flattenBlocks(
  blocks: readonly PageBlock[],
  depth = 0,
): ReadonlyArray<PageBlock & { readonly depth: number }> {
  return blocks.flatMap((block) => [
    { ...block, depth },
    ...(block.children ? flattenBlocks(block.children, depth + 1) : []),
  ]);
}

function extractRichTextValue(content: unknown): string {
  if (typeof content === 'string') {
    return content;
  }

  if (!content || typeof content !== 'object') {
    return '';
  }

  const node = content as JSONContent;
  if (!Array.isArray(node.content)) {
    return '';
  }

  return node.content
    .flatMap((child) => {
      if (!child) {
        return [];
      }

      if (Array.isArray(child.content)) {
        return child.content
          .map((grandChild) =>
            grandChild && typeof grandChild === 'object' && 'text' in grandChild
              ? String(grandChild.text ?? '')
              : '',
          )
          .filter(Boolean);
      }

      if (typeof child.text === 'string') {
        return [child.text];
      }

      return [];
    })
    .join('\n');
}

function createRichTextDocument(value: string): JSONContent {
  return {
    type: 'doc',
    content: [
      {
        type: 'paragraph',
        content: value.trim().length > 0 ? [{ type: 'text', text: value }] : [],
      },
    ],
  };
}

function getPreviewWidthClass(device: DashboardPreviewDevice): string {
  switch (device) {
    case 'mobile':
      return 'max-w-sm';
    case 'tablet':
      return 'max-w-3xl';
    case 'desktop':
    default:
      return 'max-w-6xl';
  }
}

function getPaletteGroups(surfaceCategory: TemplateCategory): readonly PaletteGroupDefinition[] {
  return surfaceCategory === 'product-page' ? PRODUCT_SURFACE_GROUPS : STORE_SURFACE_GROUPS;
}

function renderSelectField({
  field,
  value,
  onChange,
}: {
  readonly field: PropField;
  readonly value: unknown;
  readonly onChange: (value: string) => void;
}) {
  const options = field.options ?? [];

  return (
    <div className="space-y-2">
      <Label>{field.label}</Label>
      <Segment
        aria-label={field.label}
        selectedKey={String(value ?? options[0] ?? '')}
        onSelectionChange={(nextValue) => onChange(String(nextValue))}
        size="sm"
      >
        {options.map((option) => (
          <Segment.Item key={option} id={option}>
            {option}
          </Segment.Item>
        ))}
      </Segment>
    </div>
  );
}

function renderFieldControl({
  blockId,
  field,
  value,
  onChange,
}: {
  readonly blockId: string;
  readonly field: PropField;
  readonly value: unknown;
  readonly onChange: (value: unknown) => void;
}) {
  const fieldId = `${blockId}-${field.name}`;

  switch (field.type) {
    case 'number':
      return (
        <div className="space-y-2">
          <Label htmlFor={fieldId}>{field.label}</Label>
          <Input
            id={fieldId}
            type="number"
            value={String(value ?? field.defaultValue ?? '')}
            onChange={(event) => onChange(Number(event.currentTarget.value))}
            variant="secondary"
          />
        </div>
      );

    case 'select':
      return renderSelectField({
        field,
        value,
        onChange: (nextValue) => onChange(nextValue),
      });

    case 'boolean':
      return (
        <Switch
          aria-label={field.label}
          isSelected={Boolean(value)}
          onChange={(isSelected) => onChange(isSelected)}
        >
          <Switch.Control>
            <Switch.Thumb />
          </Switch.Control>
          <Switch.Content className="space-y-1">
            <p className="text-sm font-medium text-foreground">{field.label}</p>
          </Switch.Content>
        </Switch>
      );

    case 'richtext':
      return (
        <div className="space-y-2">
          <Label htmlFor={fieldId}>{field.label}</Label>
          <TextArea
            id={fieldId}
            rows={6}
            fullWidth
            variant="secondary"
            value={extractRichTextValue(value)}
            onChange={(event) => onChange(createRichTextDocument(event.currentTarget.value))}
          />
        </div>
      );

    case 'color':
      return (
        <div className="space-y-2">
          <Label htmlFor={fieldId}>{field.label}</Label>
          <Input
            id={fieldId}
            type="color"
            value={String(value ?? field.defaultValue ?? '#000000')}
            onChange={(event) => onChange(event.currentTarget.value)}
            variant="secondary"
          />
        </div>
      );

    case 'image':
    case 'url':
    case 'text':
    default:
      return (
        <div className="space-y-2">
          <Label htmlFor={fieldId}>{field.label}</Label>
          <Input
            id={fieldId}
            type={field.type === 'url' ? 'url' : 'text'}
            value={String(value ?? field.defaultValue ?? '')}
            onChange={(event) => onChange(event.currentTarget.value)}
            variant="secondary"
          />
        </div>
      );
  }
}

function ThemeControlPanel({
  onThemeChange,
  theme,
}: {
  readonly theme: BuilderHandle['schema']['theme'];
  readonly onThemeChange: (value: {
    readonly primaryColor?: string;
    readonly backgroundColor?: string;
    readonly borderRadius?: string;
    readonly fontFamily?: string;
  }) => void;
}) {
  return (
    <Card className="rounded-3xl border border-border/70 bg-background/70">
      <Card.Header className="space-y-1">
        <Card.Title>Surface theme</Card.Title>
        <Card.Description>
          Set the creator-facing page tokens that travel with the persisted Framely schema.
        </Card.Description>
      </Card.Header>
      <Card.Content className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="page-primary-color">Primary color</Label>
          <Input
            id="page-primary-color"
            type="color"
            variant="secondary"
            value={theme?.primaryColor ?? '#0f172a'}
            onChange={(event) => onThemeChange({ primaryColor: event.currentTarget.value })}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="page-background-color">Background color</Label>
          <Input
            id="page-background-color"
            type="color"
            variant="secondary"
            value={theme?.backgroundColor ?? '#ffffff'}
            onChange={(event) => onThemeChange({ backgroundColor: event.currentTarget.value })}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="page-border-radius">Border radius</Label>
          <Input
            id="page-border-radius"
            variant="secondary"
            value={theme?.borderRadius ?? '1.5rem'}
            onChange={(event) => onThemeChange({ borderRadius: event.currentTarget.value })}
            placeholder="1.5rem"
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="page-font-family">Font family</Label>
          <Input
            id="page-font-family"
            variant="secondary"
            value={theme?.fontFamily ?? ''}
            onChange={(event) => onThemeChange({ fontFamily: event.currentTarget.value })}
            placeholder="IBM Plex Sans, sans-serif"
          />
        </div>
      </Card.Content>
    </Card>
  );
}

export function TemplateBuilderStudio({
  builder,
  surfaceLabel,
  surfaceCategory,
  previewContext,
  previewDevice,
  previewMode,
  onPreviewDeviceChange,
  onPreviewModeChange,
}: TemplateBuilderStudioProps) {
  const [paletteSearch, setPaletteSearch] = useState('');
  const selectedDefinition = builder.selectedBlock ? getBlock(builder.selectedBlock.type)?.definition : undefined;
  const layerItems = useMemo(() => flattenBlocks(builder.schema.blocks), [builder.schema.blocks]);
  const paletteDefinitions = useMemo(() => {
    const registry = new Map(getAllBlocks().map((definition) => [definition.type, definition]));
    const normalizedQuery = paletteSearch.trim().toLowerCase();

    return getPaletteGroups(surfaceCategory)
      .map((group) => ({
        ...group,
        blocks: group.types
          .map((type) => registry.get(type))
          .filter((definition): definition is BlockDefinition => Boolean(definition))
          .filter((definition) =>
            normalizedQuery.length === 0
              ? true
              : definition.label.toLowerCase().includes(normalizedQuery) ||
                definition.type.toLowerCase().includes(normalizedQuery),
          ),
      }))
      .filter((group) => group.blocks.length > 0);
  }, [paletteSearch, surfaceCategory]);

  const selectedFields = selectedDefinition?.propSchema.fields ?? [];
  const previewWidthClass = getPreviewWidthClass(previewDevice);
  const isFocusMode = previewMode === 'focus';

  return (
    <div className="space-y-6">
      <Card className="rounded-[32px] border border-border/70 bg-[linear-gradient(135deg,color-mix(in_oklab,var(--simket-accent100)_70%,var(--surface))_0%,var(--surface)_60%,color-mix(in_oklab,var(--simket-neutral100)_80%,var(--surface))_100%)]">
        <Card.Content className="grid gap-6 p-6 xl:grid-cols-[minmax(0,1.6fr)_minmax(280px,0.9fr)] xl:items-end">
          <div className="space-y-3">
            <p className="text-xs font-semibold uppercase tracking-[0.24em] text-muted-foreground">
              Framely studio
            </p>
            <h2 className="text-2xl font-semibold text-foreground">{surfaceLabel}</h2>
            <p className="max-w-3xl text-sm text-muted-foreground">
              Add live data blocks, refine page tokens, and tune the preview layout for the creator-facing surface before saving it back to Vendure.
            </p>
            <div className="flex flex-wrap gap-2">
              <Chip variant="soft">
                <Chip.Label>{surfaceCategory === 'product-page' ? 'Product page' : 'Store page'}</Chip.Label>
              </Chip>
              <Chip variant="soft">
                <Chip.Label>{builder.schema.blocks.length} blocks</Chip.Label>
              </Chip>
            </div>
          </div>

          <div className="grid gap-3">
            <Segment
              aria-label="Builder preview mode"
              selectedKey={previewMode}
              onSelectionChange={(value) => onPreviewModeChange(String(value) as DashboardPreviewMode)}
              size="sm"
            >
              {PREVIEW_MODE_OPTIONS.map((option) => (
                <Segment.Item key={option} id={option}>
                  {option === 'split' ? 'Split' : 'Focus'}
                </Segment.Item>
              ))}
            </Segment>

            <Segment
              aria-label="Builder preview device"
              selectedKey={previewDevice}
              onSelectionChange={(value) => onPreviewDeviceChange(String(value) as DashboardPreviewDevice)}
              size="sm"
            >
              {PREVIEW_DEVICE_OPTIONS.map((option) => (
                <Segment.Item key={option} id={option}>
                  {option.charAt(0).toUpperCase() + option.slice(1)}
                </Segment.Item>
              ))}
            </Segment>
          </div>
        </Card.Content>
      </Card>

      <div className={`grid gap-6 ${isFocusMode ? 'xl:grid-cols-[320px_minmax(0,1fr)]' : 'xl:grid-cols-[320px_minmax(0,1fr)_360px]'}`}>
        <div className="space-y-6">
          <Card className="rounded-3xl border border-border/70 bg-surface/95">
            <Card.Header className="space-y-1">
              <Card.Title>Block palette</Card.Title>
              <Card.Description>
                Add reusable HeroUI blocks and the live product/store blocks wired for this surface.
              </Card.Description>
            </Card.Header>
            <Card.Content className="space-y-4">
              <SearchField
                aria-label="Search builder blocks"
                value={paletteSearch}
                onChange={setPaletteSearch}
                variant="secondary"
                fullWidth
              >
                <SearchField.Group className="rounded-2xl">
                  <SearchField.SearchIcon />
                  <SearchField.Input placeholder="Search blocks" />
                  <SearchField.ClearButton />
                </SearchField.Group>
              </SearchField>

              <div className="space-y-4">
                {paletteDefinitions.map((group) => (
                  <div key={group.id} className="space-y-3">
                    <div className="flex items-center justify-between gap-3">
                      <p className="text-sm font-medium text-foreground">{group.label}</p>
                      <span className="text-xs text-muted-foreground">{group.blocks.length} blocks</span>
                    </div>

                    <div className="grid gap-2">
                      {group.blocks.map((definition) => (
                        <Button
                          key={definition.type}
                          variant="secondary"
                          className="justify-start rounded-2xl"
                          onPress={() => builder.actions.addBlock(definition.type)}
                        >
                          <span className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-background text-sm">
                            {definition.icon}
                          </span>
                          <span>{definition.label}</span>
                        </Button>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </Card.Content>
          </Card>

          <Card className="rounded-3xl border border-border/70 bg-surface/95">
            <Card.Header className="space-y-1">
              <Card.Title>Layers</Card.Title>
              <Card.Description>
                Reorder blocks, jump directly to a layer, or remove unused content from the page.
              </Card.Description>
            </Card.Header>
            <Card.Content className="space-y-2">
              {layerItems.length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  No layers yet. Add a block from the palette to start building.
                </p>
              ) : (
                layerItems.map((block) => (
                  <Card
                    key={block.id}
                    className={`rounded-2xl border ${builder.selectedBlockId === block.id ? 'border-accent' : 'border-border/60'} bg-background/70`}
                  >
                    <Card.Content className="flex flex-wrap items-center justify-between gap-3 p-4">
                      <button
                        type="button"
                        className="min-w-0 flex-1 text-left"
                        onClick={() => builder.actions.selectBlock(block.id)}
                      >
                        <p className="font-medium text-foreground">{getBlock(block.type)?.definition.label ?? block.type}</p>
                        <p className="text-xs text-muted-foreground">{block.type}</p>
                      </button>

                      <div className="flex flex-wrap gap-2">
                        <Button size="sm" variant="ghost" aria-label={`Move ${block.type} up`} onPress={() => builder.actions.moveBlock(block.id, -1)}>
                          <Icon name="arrow-up" size={16} />
                        </Button>
                        <Button size="sm" variant="ghost" aria-label={`Move ${block.type} down`} onPress={() => builder.actions.moveBlock(block.id, 1)}>
                          <Icon name="arrow-down" size={16} />
                        </Button>
                        <Button size="sm" variant="ghost" aria-label={`Remove ${block.type}`} onPress={() => builder.actions.removeBlock(block.id)}>
                          <Icon name="close" size={16} />
                        </Button>
                      </div>
                    </Card.Content>
                  </Card>
                ))
              )}
            </Card.Content>
          </Card>
        </div>

        <Card className="overflow-hidden rounded-[32px] border border-border/70 bg-surface/95">
          <Card.Header className="items-center justify-between gap-3">
            <div className="space-y-1">
              <Card.Title>Live preview</Card.Title>
              <Card.Description>
                Preview the saved route against the active creator/product data.
              </Card.Description>
            </div>
            <Chip variant="soft">
              <Chip.Label>{previewDevice}</Chip.Label>
            </Chip>
          </Card.Header>
          <Card.Content className="bg-[linear-gradient(180deg,color-mix(in_oklab,var(--surface)_78%,var(--background))_0%,var(--background)_100%)] p-5">
            {builder.schema.blocks.length === 0 ? (
              <div className="rounded-[28px] border border-dashed border-default-300 px-6 py-16 text-center">
                <p className="text-lg font-medium">No blocks on the canvas yet</p>
                <p className="mt-1 text-sm text-muted-foreground">
                  Add a live store or product block from the palette to begin composing the page.
                </p>
              </div>
            ) : (
              <div className={`mx-auto w-full ${previewWidthClass}`}>
                <PageRenderer schema={builder.schema} context={previewContext} />
              </div>
            )}
          </Card.Content>
        </Card>

        {!isFocusMode ? (
          <div className="space-y-6">
            <ThemeControlPanel
              theme={builder.schema.theme}
              onThemeChange={(value) => builder.actions.setTheme(value)}
            />

            <Card className="rounded-3xl border border-border/70 bg-surface/95">
              <Card.Header className="space-y-1">
                <Card.Title>Selected block</Card.Title>
                <Card.Description>
                  Edit block properties directly from the studio inspector.
                </Card.Description>
              </Card.Header>
              <Card.Content className="space-y-4">
                {builder.selectedBlock && selectedDefinition ? (
                  <>
                    <div className="space-y-1">
                      <p className="text-sm font-medium text-foreground">{selectedDefinition.label}</p>
                      <p className="text-sm text-muted-foreground">{builder.selectedBlock.type}</p>
                    </div>
                    <Separator />
                    {selectedFields.length === 0 ? (
                      <p className="text-sm text-muted-foreground">
                        This block has no configurable props yet.
                      </p>
                    ) : (
                      selectedFields.map((field) => (
                        <div key={field.name}>
                          {renderFieldControl({
                            blockId: builder.selectedBlock!.id,
                            field,
                            value: builder.selectedBlock!.props[field.name],
                            onChange: (value) =>
                              builder.actions.updateBlockProps(builder.selectedBlock!.id, {
                                [field.name]: value,
                              }),
                          })}
                        </div>
                      ))
                    )}
                  </>
                ) : (
                  <p className="text-sm text-muted-foreground">
                    Select a layer to reveal its editable properties.
                  </p>
                )}
              </Card.Content>
            </Card>
          </div>
        ) : null}
      </div>
    </div>
  );
}
