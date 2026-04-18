/**
 * Purpose: Render HeroUI v3 modal triggers for storefront announcements and confirmations.
 * Governing docs:
 *   - docs/architecture.md (§2 HeroUI everywhere, §5 Framely integration, §13.3 Framely component extensions)
 *   - docs/domain-model.md (§1 FramelyProject, EditorElement)
 * External references:
 *   - https://heroui.com/docs/react/components/modal.mdx
 *   - https://github.com/belastrittmatter/Framely
 * Tests:
 *   - packages/storefront/src/builder/blocks/ModalBlock.test.tsx
 */
import { Button, Modal } from '@heroui/react';
import type { ReactNode } from 'react';
import type { BlockDefinition } from '../types';

type ButtonVariant =
  | 'primary'
  | 'secondary'
  | 'tertiary'
  | 'outline'
  | 'ghost'
  | 'danger';
type ModalSize = 'xs' | 'sm' | 'md' | 'lg' | 'cover' | 'full';
type ModalPlacement = 'auto' | 'top' | 'center' | 'bottom';
type ModalBackdrop = 'opaque' | 'blur' | 'transparent';

export interface ModalBlockProps {
  readonly triggerLabel?: string;
  readonly triggerVariant?: ButtonVariant;
  readonly title?: string;
  readonly description?: string;
  readonly confirmLabel?: string;
  readonly cancelLabel?: string;
  readonly size?: ModalSize;
  readonly placement?: ModalPlacement;
  readonly backdrop?: ModalBackdrop;
  readonly isDismissable?: boolean;
  readonly children?: ReactNode;
}

export const modalBlockDefinition: BlockDefinition = {
  type: 'modal',
  label: 'Modal',
  icon: 'panel-top-open',
  defaultProps: {
    triggerLabel: 'Open announcement',
    triggerVariant: 'secondary',
    title: 'Limited-time creator drop',
    description:
      'Use a modal to spotlight bundle launches, subscriber perks, or time-sensitive storefront updates.',
    confirmLabel: 'Continue',
    cancelLabel: 'Close',
    size: 'md',
    placement: 'center',
    backdrop: 'opaque',
    isDismissable: true,
  },
  propSchema: {
    fields: [
      {
        name: 'triggerLabel',
        type: 'text',
        label: 'Trigger label',
        required: true,
        defaultValue: 'Open announcement',
      },
      {
        name: 'title',
        type: 'text',
        label: 'Title',
        required: true,
        defaultValue: 'Limited-time creator drop',
      },
      {
        name: 'description',
        type: 'text',
        label: 'Description',
        required: false,
        defaultValue:
          'Use a modal to spotlight bundle launches, subscriber perks, or time-sensitive storefront updates.',
      },
      {
        name: 'size',
        type: 'select',
        label: 'Size',
        required: true,
        defaultValue: 'md',
        options: ['xs', 'sm', 'md', 'lg', 'cover', 'full'],
      },
      {
        name: 'placement',
        type: 'select',
        label: 'Placement',
        required: true,
        defaultValue: 'center',
        options: ['auto', 'top', 'center', 'bottom'],
      },
      {
        name: 'backdrop',
        type: 'select',
        label: 'Backdrop',
        required: true,
        defaultValue: 'opaque',
        options: ['opaque', 'blur', 'transparent'],
      },
      {
        name: 'isDismissable',
        type: 'boolean',
        label: 'Dismissable overlay',
        required: false,
        defaultValue: true,
      },
    ],
  },
};

export function ModalBlock({
  triggerLabel = 'Open announcement',
  triggerVariant = 'secondary',
  title = 'Limited-time creator drop',
  description = 'Use a modal to spotlight bundle launches, subscriber perks, or time-sensitive storefront updates.',
  confirmLabel = 'Continue',
  cancelLabel = 'Close',
  size = 'md',
  placement = 'center',
  backdrop = 'opaque',
  isDismissable = true,
  children,
}: ModalBlockProps) {
  return (
    <Modal>
      <Button variant={triggerVariant}>{triggerLabel}</Button>
      <Modal.Backdrop isDismissable={isDismissable} variant={backdrop}>
        <Modal.Container placement={placement} size={size}>
          <Modal.Dialog>
            <Modal.CloseTrigger />
            <Modal.Header>
              <Modal.Heading>{title}</Modal.Heading>
            </Modal.Header>
            <Modal.Body>
              {description ? <p>{description}</p> : null}
              {children}
            </Modal.Body>
            <Modal.Footer>
              {cancelLabel ? (
                <Button slot="close" variant="secondary">
                  {cancelLabel}
                </Button>
              ) : null}
              {confirmLabel ? <Button slot="close">{confirmLabel}</Button> : null}
            </Modal.Footer>
          </Modal.Dialog>
        </Modal.Container>
      </Modal.Backdrop>
    </Modal>
  );
}
