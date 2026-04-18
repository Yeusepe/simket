/**
 * Purpose: Modal picker for starting a new page from scratch, a saved template, or an existing page duplicate.
 * Governing docs:
 *   - docs/architecture.md (§5 Storefront plugin, §7 HeroUI everywhere)
 *   - docs/service-architecture.md (§1.1 Vendure gateway)
 * External references:
 *   - https://heroui.com/docs/react/components/modal.mdx
 *   - https://heroui.com/docs/react/components/tabs.mdx
 * Tests:
 *   - packages/storefront/src/components/dashboard/templates/TemplatePicker.test.tsx
 */
import { Button, Card, Modal, Tabs } from '@heroui/react';
import type { PageTemplate, TemplatePageSource } from './template-types';
import { TEMPLATE_CATEGORY_LABELS } from './template-types';

interface TemplatePickerProps {
  readonly triggerLabel?: string;
  readonly systemTemplates: readonly PageTemplate[];
  readonly personalTemplates: readonly PageTemplate[];
  readonly existingPages?: readonly TemplatePageSource[];
  readonly onStartFromScratch: () => void;
  readonly onUseTemplate: (template: PageTemplate) => void;
  readonly onDuplicatePage?: (page: TemplatePageSource) => void;
}

function TemplateOptionCard({
  title,
  description,
  actionLabel,
  onPress,
}: {
  readonly title: string;
  readonly description: string;
  readonly actionLabel: string;
  readonly onPress: () => void;
}) {
  return (
    <Card variant="secondary">
      <Card.Header className="space-y-1">
        <Card.Title>{title}</Card.Title>
        <Card.Description>{description}</Card.Description>
      </Card.Header>
      <Card.Footer>
        <Button slot="close" onPress={onPress}>
          {actionLabel}
        </Button>
      </Card.Footer>
    </Card>
  );
}

export function TemplatePicker({
  triggerLabel = 'Create Page',
  systemTemplates,
  personalTemplates,
  existingPages = [],
  onStartFromScratch,
  onUseTemplate,
  onDuplicatePage,
}: TemplatePickerProps) {
  return (
    <Modal>
      <Button>{triggerLabel}</Button>
      <Modal.Backdrop>
        <Modal.Container size="lg">
          <Modal.Dialog aria-label="Choose how to start your new page">
            <Modal.CloseTrigger />
            <Modal.Header>
              <Modal.Heading>Create a new page</Modal.Heading>
            </Modal.Header>
            <Modal.Body className="space-y-6">
              <TemplateOptionCard
                title="Start from scratch"
                description="Open an empty builder canvas and compose the page block by block."
                actionLabel="Blank Page"
                onPress={onStartFromScratch}
              />

              <Tabs className="w-full" defaultSelectedKey="system">
                <Tabs.ListContainer>
                  <Tabs.List aria-label="Page starting points">
                    <Tabs.Tab id="system">
                      System Templates
                      <Tabs.Indicator />
                    </Tabs.Tab>
                    <Tabs.Tab id="saved">
                      Saved Templates
                      <Tabs.Indicator />
                    </Tabs.Tab>
                    <Tabs.Tab id="pages">
                      Duplicate Page
                      <Tabs.Indicator />
                    </Tabs.Tab>
                  </Tabs.List>
                </Tabs.ListContainer>
                <Tabs.Panel id="system" className="pt-4">
                  <div className="grid gap-4 md:grid-cols-2">
                    {systemTemplates.length === 0 ? (
                      <p className="text-sm text-muted-foreground">No system templates are available yet.</p>
                    ) : (
                      systemTemplates.map((template) => (
                        <TemplateOptionCard
                          key={template.id}
                          title={template.name}
                          description={template.description || TEMPLATE_CATEGORY_LABELS[template.category]}
                          actionLabel="Use Template"
                          onPress={() => onUseTemplate(template)}
                        />
                      ))
                    )}
                  </div>
                </Tabs.Panel>
                <Tabs.Panel id="saved" className="pt-4">
                  <div className="grid gap-4 md:grid-cols-2">
                    {personalTemplates.length === 0 ? (
                      <p className="text-sm text-muted-foreground">You have not saved any personal templates yet.</p>
                    ) : (
                      personalTemplates.map((template) => (
                        <TemplateOptionCard
                          key={template.id}
                          title={template.name}
                          description={template.description || 'Use one of your previously saved builder layouts.'}
                          actionLabel="Use Saved Template"
                          onPress={() => onUseTemplate(template)}
                        />
                      ))
                    )}
                  </div>
                </Tabs.Panel>
                <Tabs.Panel id="pages" className="pt-4">
                  <div className="grid gap-4 md:grid-cols-2">
                    {existingPages.length === 0 || !onDuplicatePage ? (
                      <p className="text-sm text-muted-foreground">No existing pages are available for duplication.</p>
                    ) : (
                      existingPages.map((page) => (
                        <TemplateOptionCard
                          key={page.id}
                          title={page.name}
                          description={`Duplicate the latest ${TEMPLATE_CATEGORY_LABELS[page.category].toLowerCase()} draft.`}
                          actionLabel="Duplicate Page"
                          onPress={() => onDuplicatePage(page)}
                        />
                      ))
                    )}
                  </div>
                </Tabs.Panel>
              </Tabs>
            </Modal.Body>
          </Modal.Dialog>
        </Modal.Container>
      </Modal.Backdrop>
    </Modal>
  );
}
