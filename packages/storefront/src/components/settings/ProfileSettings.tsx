/**
 * Purpose: Editable profile settings form for display name, avatar, bio, and public website.
 * Governing docs:
 *   - docs/architecture.md
 *   - docs/service-architecture.md
 *   - docs/domain-model.md
 * External references:
 *   - https://heroui.com/react/llms.txt
 *   - https://www.heroui.com/docs/react/components/avatar
 *   - https://www.heroui.com/docs/react/components/input
 *   - https://www.heroui.com/docs/react/components/textarea
 * Tests:
 *   - packages/storefront/src/components/settings/ProfileSettings.test.tsx
 */
import { useEffect, useRef, useState } from 'react';
import type { ChangeEvent, FormEvent } from 'react';
import { Avatar, Button, Card, Input, TextArea } from '@heroui/react';
import { validateDisplayName, validateWebsiteUrl } from './use-settings';
import type { ProfileUpdateInput, UserProfile } from './settings-types';

export interface ProfileSettingsProps {
  readonly profile: UserProfile;
  readonly onSave: (profile: ProfileUpdateInput) => Promise<void>;
}

type ProfileFormErrors = {
  readonly displayName?: string;
  readonly website?: string;
  readonly submit?: string;
};

export function ProfileSettings({
  profile,
  onSave,
}: ProfileSettingsProps) {
  const [draftProfile, setDraftProfile] = useState<ProfileUpdateInput>({
    displayName: profile.displayName,
    avatarUrl: profile.avatarUrl,
    bio: profile.bio,
    website: profile.website,
  });
  const [selectedAvatarName, setSelectedAvatarName] = useState<string>();
  const [errors, setErrors] = useState<ProfileFormErrors>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const generatedAvatarUrlRef = useRef<string | undefined>(undefined);

  useEffect(() => {
    setDraftProfile({
      displayName: profile.displayName,
      avatarUrl: profile.avatarUrl,
      bio: profile.bio,
      website: profile.website,
    });
    setSelectedAvatarName(undefined);
  }, [profile]);

  useEffect(() => {
    return () => {
      if (generatedAvatarUrlRef.current) {
        URL.revokeObjectURL(generatedAvatarUrlRef.current);
      }
    };
  }, []);

  function setDraftValue<Key extends keyof ProfileUpdateInput>(
    key: Key,
    value: ProfileUpdateInput[Key],
  ) {
    setDraftProfile((current) => ({
      ...current,
      [key]: value,
    }));
  }

  function handleAvatarChange(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) {
      return;
    }

    if (generatedAvatarUrlRef.current) {
      URL.revokeObjectURL(generatedAvatarUrlRef.current);
    }

    const nextAvatarUrl = URL.createObjectURL(file);
    generatedAvatarUrlRef.current = nextAvatarUrl;
    setSelectedAvatarName(file.name);
    setDraftValue('avatarUrl', nextAvatarUrl);
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const nextErrors: ProfileFormErrors = {
      displayName: validateDisplayName(draftProfile.displayName),
      website: validateWebsiteUrl(draftProfile.website ?? ''),
    };

    setErrors(nextErrors);

    if (nextErrors.displayName || nextErrors.website) {
      return;
    }

    setIsSubmitting(true);
    try {
      await onSave({
        displayName: draftProfile.displayName.trim(),
        avatarUrl: draftProfile.avatarUrl,
        bio: draftProfile.bio?.trim() || undefined,
        website: draftProfile.website?.trim() || undefined,
      });
      setErrors({});
    } catch (caughtError) {
      setErrors({
        submit:
          caughtError instanceof Error
            ? caughtError.message
            : 'Unable to save your profile settings.',
      });
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <Card>
      <Card.Header className="space-y-1">
        <Card.Title>Profile information</Card.Title>
        <Card.Description>
          Update how your account appears across your library, storefront profile, and connected services.
        </Card.Description>
      </Card.Header>
      <Card.Content>
        <form className="space-y-6" noValidate onSubmit={handleSubmit}>
          <div className="flex flex-col gap-4 md:flex-row md:items-center">
            <Avatar size="lg">
              {draftProfile.avatarUrl ? (
                <Avatar.Image
                  alt={`${draftProfile.displayName || profile.displayName} avatar`}
                  src={draftProfile.avatarUrl}
                />
              ) : null}
              <Avatar.Fallback>
                {(draftProfile.displayName || profile.displayName || 'U')
                  .slice(0, 1)
                  .toUpperCase()}
              </Avatar.Fallback>
            </Avatar>
            <div className="min-w-0 flex-1 space-y-2">
              <Input
                aria-label="Avatar upload"
                type="file"
                accept="image/*"
                onChange={handleAvatarChange}
              />
              <p className="text-sm text-muted-foreground">
                {selectedAvatarName
                  ? `Selected avatar: ${selectedAvatarName}`
                  : 'Upload a square avatar image to personalize your account.'}
              </p>
            </div>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <label className="text-sm font-medium" htmlFor="settings-display-name">
                Display name
              </label>
              <Input
                id="settings-display-name"
                aria-label="Display name"
                value={draftProfile.displayName}
                onChange={(event) => setDraftValue('displayName', event.target.value)}
              />
              {errors.displayName ? (
                <p className="text-sm text-danger" role="alert">
                  {errors.displayName}
                </p>
              ) : null}
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium" htmlFor="settings-email-address">
                Email address
              </label>
              <Input
                id="settings-email-address"
                aria-label="Email address"
                readOnly
                value={profile.email}
              />
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium" htmlFor="settings-bio">
              Bio
            </label>
            <TextArea
              id="settings-bio"
              aria-label="Bio"
              value={draftProfile.bio ?? ''}
              onChange={(event) => setDraftValue('bio', event.target.value)}
            />
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium" htmlFor="settings-website">
              Website
            </label>
            <Input
              id="settings-website"
              aria-label="Website"
              placeholder="https://example.com"
              type="url"
              value={draftProfile.website ?? ''}
              onChange={(event) => setDraftValue('website', event.target.value)}
            />
            {errors.website ? (
              <p className="text-sm text-danger" role="alert">
                {errors.website}
              </p>
            ) : null}
          </div>

          {errors.submit ? (
            <p className="text-sm text-danger" role="alert">
              {errors.submit}
            </p>
          ) : null}

          <div className="flex justify-end">
            <Button type="submit" isDisabled={isSubmitting}>
              Save profile
            </Button>
          </div>
        </form>
      </Card.Content>
    </Card>
  );
}
