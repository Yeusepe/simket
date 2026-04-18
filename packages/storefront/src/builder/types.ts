/**
 * Purpose: Define JSON-serializable schema contracts and validation helpers for creator store pages.
 * Governing docs:
 *   - docs/architecture.md (§2 HeroUI everywhere, §5 Framely integration)
 *   - docs/domain-model.md (§1 FramelyProject, EditorElement)
 *   - docs/regular-programming-practices/resilient-coding-debugging-and-performance.md (§2 invariants, §6 state and data rules)
 * External references:
 *   - https://github.com/belastrittmatter/Framely
 *   - https://dev.to/belastrittmatter/building-a-nextjs-website-editor-bj3
 *   - https://heroui.com/react/llms.txt
 * Tests:
 *   - packages/storefront/src/builder/builder.test.tsx
 *   - packages/storefront/src/builder/renderer.test.tsx
 */
export const CURRENT_PAGE_SCHEMA_VERSION = 1;

export interface BlockDefinition {
  readonly type: string;
  readonly label: string;
  readonly icon: string;
  readonly defaultProps: Record<string, unknown>;
  readonly propSchema: PropSchema;
}

export interface PropSchema {
  readonly fields: readonly PropField[];
}

export interface PropField {
  readonly name: string;
  readonly type:
    | 'text'
    | 'richtext'
    | 'image'
    | 'url'
    | 'number'
    | 'select'
    | 'boolean'
    | 'color';
  readonly label: string;
  readonly required: boolean;
  readonly defaultValue?: unknown;
  readonly options?: readonly string[];
}

export interface PageBlock {
  readonly id: string;
  readonly type: string;
  readonly props: Record<string, unknown>;
  readonly children?: readonly PageBlock[];
}

export interface ThemeOverrides {
  readonly primaryColor?: string;
  readonly backgroundColor?: string;
  readonly fontFamily?: string;
  readonly borderRadius?: string;
}

export interface PageSchema {
  readonly version: number;
  readonly blocks: readonly PageBlock[];
  readonly theme?: ThemeOverrides;
}

export interface PageSchemaValidationResult {
  readonly success: boolean;
  readonly errors: readonly string[];
}

export function createPageSchema(
  overrides: Partial<PageSchema> = {},
): PageSchema {
  return {
    version: CURRENT_PAGE_SCHEMA_VERSION,
    blocks: [],
    ...overrides,
  };
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function validatePageBlock(
  block: unknown,
  path: string,
): readonly string[] {
  if (!isRecord(block)) {
    return [`${path} must be an object.`];
  }

  const errors: string[] = [];

  if (typeof block.id !== 'string' || block.id.trim().length === 0) {
    errors.push(`${path} must include a non-empty id.`);
  }

  if (typeof block.type !== 'string' || block.type.trim().length === 0) {
    errors.push(`${path} must include a non-empty type.`);
  }

  if (!isRecord(block.props)) {
    errors.push(`${path} must include a props object.`);
  }

  if (block.children !== undefined) {
    if (!Array.isArray(block.children)) {
      errors.push(`${path} children must be an array when provided.`);
    } else {
      block.children.forEach((child, index) => {
        errors.push(...validatePageBlock(child, `${path} child at index ${index}`));
      });
    }
  }

  return errors;
}

export function validatePageSchema(
  schema: unknown,
): PageSchemaValidationResult {
  if (!isRecord(schema)) {
    return {
      success: false,
      errors: ['Page schema must be an object.'],
    };
  }

  const errors: string[] = [];

  if (schema.version !== CURRENT_PAGE_SCHEMA_VERSION) {
    errors.push(`Unsupported page schema version: ${String(schema.version)}`);
  }

  if (!Array.isArray(schema.blocks)) {
    errors.push('Page schema blocks must be an array.');
  } else {
    schema.blocks.forEach((block, index) => {
      errors.push(...validatePageBlock(block, `Block at index ${index}`));
    });
  }

  if (schema.theme !== undefined && !isRecord(schema.theme)) {
    errors.push('Page schema theme must be an object when provided.');
  }

  return {
    success: errors.length === 0,
    errors,
  };
}
