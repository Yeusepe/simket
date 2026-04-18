/**
 * Purpose: Handle irreversible account actions like exporting personal data and confirming account deletion.
 * Governing docs:
 *   - docs/architecture.md
 *   - docs/service-architecture.md
 *   - docs/regular-programming-practices/security-and-threat-modeling.md
 * External references:
 *   - https://heroui.com/react/llms.txt
 *   - https://www.heroui.com/docs/react/components/modal
 * Tests:
 *   - packages/storefront/src/components/settings/DangerZone.test.tsx
 */
import { useState } from 'react';
import { Button, Card, Input, Modal, useOverlayState } from '@heroui/react';

export interface DangerZoneProps {
  readonly accountName: string;
  readonly onExportData: () => Promise<string>;
  readonly onDeleteAccount: (confirmationText: string) => Promise<void>;
}

export function DangerZone({
  accountName,
  onExportData,
  onDeleteAccount,
}: DangerZoneProps) {
  const deleteDialog = useOverlayState();
  const [confirmationText, setConfirmationText] = useState('');
  const [deleteError, setDeleteError] = useState<string>();
  const [exportError, setExportError] = useState<string>();

  async function handleExportData() {
    setExportError(undefined);

    try {
      const exportedData = await onExportData();
      const blob = new Blob([exportedData], { type: 'application/json' });
      const downloadUrl = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = downloadUrl;
      link.download = `simket-account-export-${new Date().toISOString()}.json`;
      document.body.append(link);
      link.click();
      link.remove();
      URL.revokeObjectURL(downloadUrl);
    } catch (caughtError) {
      setExportError(
        caughtError instanceof Error
          ? caughtError.message
          : 'Unable to export account data.',
      );
    }
  }

  async function handleDeleteAccount() {
    setDeleteError(undefined);

    if (confirmationText.trim() !== accountName) {
      setDeleteError('Type your account name exactly before deleting your account.');
      return;
    }

    try {
      await onDeleteAccount(confirmationText.trim());
      deleteDialog.close();
      setConfirmationText('');
    } catch (caughtError) {
      setDeleteError(
        caughtError instanceof Error
          ? caughtError.message
          : 'Unable to delete account.',
      );
    }
  }

  return (
    <Card>
      <Card.Header className="space-y-1">
        <Card.Title>Danger zone</Card.Title>
        <Card.Description>
          Export a copy of your account data or permanently delete your account after a double confirmation.
        </Card.Description>
      </Card.Header>
      <Card.Content className="space-y-6">
        <div className="flex flex-col gap-3 rounded-lg border border-divider p-4 md:flex-row md:items-center md:justify-between">
          <div>
            <p className="font-medium">Export account data</p>
            <p className="text-sm text-muted-foreground">
              Download your profile, notifications, sessions, and connected account metadata.
            </p>
          </div>
          <Button variant="ghost" onPress={handleExportData}>
            Export account data
          </Button>
        </div>

        <div className="flex flex-col gap-3 rounded-lg border border-danger/40 p-4 md:flex-row md:items-center md:justify-between">
          <div>
            <p className="font-medium">Delete account</p>
            <p className="text-sm text-muted-foreground">
              This removes account access and disconnects any active sessions.
            </p>
          </div>
          <Modal state={deleteDialog}>
            <Modal.Trigger>
              <Button>Delete account</Button>
            </Modal.Trigger>
            <Modal.Backdrop isDismissable={false}>
              <Modal.Container>
                <Modal.Dialog aria-label="Delete account">
                  <Modal.Header>
                    <Modal.Heading>Delete account</Modal.Heading>
                  </Modal.Header>
                  <Modal.Body className="space-y-4">
                    <p className="text-sm text-muted-foreground">
                      Type <strong>{accountName}</strong> to confirm permanent account deletion.
                    </p>
                    <div className="space-y-2">
                      <label
                        className="text-sm font-medium"
                        htmlFor="settings-delete-account-confirmation"
                      >
                        Type {accountName} to confirm
                      </label>
                      <Input
                        id="settings-delete-account-confirmation"
                        aria-label={`Type ${accountName} to confirm`}
                        value={confirmationText}
                        onChange={(event) => setConfirmationText(event.target.value)}
                      />
                    </div>
                    {deleteError ? (
                      <p className="text-sm text-danger" role="alert">
                        {deleteError}
                      </p>
                    ) : null}
                  </Modal.Body>
                  <Modal.Footer className="justify-end gap-3">
                    <Button
                      variant="ghost"
                      onPress={() => {
                        deleteDialog.close();
                        setDeleteError(undefined);
                        setConfirmationText('');
                      }}
                    >
                      Cancel
                    </Button>
                    <Button onPress={handleDeleteAccount}>
                      Permanently delete account
                    </Button>
                  </Modal.Footer>
                </Modal.Dialog>
              </Modal.Container>
            </Modal.Backdrop>
          </Modal>
        </div>

        {exportError ? (
          <p className="text-sm text-danger" role="alert">
            {exportError}
          </p>
        ) : null}
      </Card.Content>
    </Card>
  );
}
