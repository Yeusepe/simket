/**
 * Purpose: Render HeroUI v3 data tables for structured storefront comparisons and listings.
 * Governing docs:
 *   - docs/architecture.md (§2 HeroUI everywhere, §5 Framely integration, §13.3 Framely component extensions)
 *   - docs/domain-model.md (§1 FramelyProject, EditorElement)
 * External references:
 *   - https://heroui.com/docs/react/components/table.mdx
 *   - https://github.com/belastrittmatter/Framely
 * Tests:
 *   - packages/storefront/src/builder/blocks/TableBlock.test.tsx
 */
import { Table } from '@heroui/react';
import type { ReactNode } from 'react';
import type { BlockDefinition } from '../types';

type TableVariant = 'primary' | 'secondary';

export interface TableBlockColumn {
  readonly id: string;
  readonly label: string;
}

export interface TableBlockRow {
  readonly id: string;
  readonly cells: readonly string[];
}

export interface TableBlockProps {
  readonly heading?: string;
  readonly ariaLabel?: string;
  readonly variant?: TableVariant;
  readonly columns?: readonly TableBlockColumn[];
  readonly rows?: readonly TableBlockRow[];
  readonly showFooter?: boolean;
  readonly children?: ReactNode;
}

export const tableBlockDefinition: BlockDefinition = {
  type: 'table',
  label: 'Table',
  icon: 'table-properties',
  defaultProps: {
    heading: 'Compare packs',
    ariaLabel: 'Store comparison table',
    variant: 'primary',
    showFooter: true,
    columns: [
      { id: 'name', label: 'Pack' },
      { id: 'format', label: 'Format' },
      { id: 'price', label: 'Price' },
    ],
    rows: [
      { id: 'table-row-1', cells: ['Stylized VFX Pack', 'Unity package', '$29'] },
      { id: 'table-row-2', cells: ['UI Icon Bundle', 'SVG + PNG', '$18'] },
      { id: 'table-row-3', cells: ['Material Library', 'Substance + textures', '$34'] },
    ],
  },
  propSchema: {
    fields: [
      {
        name: 'heading',
        type: 'text',
        label: 'Heading',
        required: false,
        defaultValue: 'Compare packs',
      },
      {
        name: 'ariaLabel',
        type: 'text',
        label: 'Accessible label',
        required: true,
        defaultValue: 'Store comparison table',
      },
      {
        name: 'variant',
        type: 'select',
        label: 'Variant',
        required: true,
        defaultValue: 'primary',
        options: ['primary', 'secondary'],
      },
      {
        name: 'showFooter',
        type: 'boolean',
        label: 'Show footer',
        required: false,
        defaultValue: true,
      },
    ],
  },
};

export function TableBlock({
  heading = 'Compare packs',
  ariaLabel = 'Store comparison table',
  variant = 'primary',
  columns = tableBlockDefinition.defaultProps.columns as readonly TableBlockColumn[],
  rows = tableBlockDefinition.defaultProps.rows as readonly TableBlockRow[],
  showFooter = true,
  children,
}: TableBlockProps) {
  return (
    <section className="space-y-4">
      {heading ? <h2 className="text-2xl font-semibold tracking-tight">{heading}</h2> : null}
      <Table variant={variant}>
        <Table.ScrollContainer>
          <Table.Content aria-label={ariaLabel} className="min-w-[540px]">
            <Table.Header>
              {columns.map((column, index) => (
                <Table.Column isRowHeader={index === 0} key={column.id}>
                  {column.label}
                </Table.Column>
              ))}
            </Table.Header>
            <Table.Body>
              {rows.map((row) => (
                <Table.Row id={row.id} key={row.id}>
                  {columns.map((column, index) => (
                    <Table.Cell key={`${row.id}-${column.id}`}>
                      {row.cells[index] ?? ''}
                    </Table.Cell>
                  ))}
                </Table.Row>
              ))}
            </Table.Body>
          </Table.Content>
        </Table.ScrollContainer>
        {showFooter ? (
          <Table.Footer className="justify-end text-xs text-muted">
            {rows.length} rows
          </Table.Footer>
        ) : null}
      </Table>
      {children}
    </section>
  );
}
