/**
 * Minimal creator line for listing tiles — compact circular avatars + concise text.
 */
import type { ProductCreatorRef } from '../../types/product';

function initials(name: string): string {
  const t = name.trim();
  if (!t) {
    return '?';
  }
  return t.charAt(0).toUpperCase();
}

function SmallAvatar({
  name,
  src,
  size,
  testId,
}: {
  readonly name: string;
  readonly src?: string | null;
  readonly size: number;
  readonly testId?: string;
}) {
  const initialClass = size <= 15 ? 'text-[0.55rem]' : 'text-[0.6rem]';

  return (
    <span
      className="relative inline-flex shrink-0 items-center justify-center overflow-hidden rounded-full bg-default-100 ring-1 ring-black/8 dark:bg-default-900 dark:ring-white/10"
      style={{ width: size, height: size }}
      title={name}
      data-testid={testId}
    >
      {src ? (
        <img src={src} alt="" className="size-full object-cover" loading="lazy" decoding="async" />
      ) : (
        <span className={`font-medium leading-none text-muted-foreground ${initialClass}`}>
          {initials(name)}
        </span>
      )}
    </span>
  );
}

export interface SparseCreatorBylineProps {
  readonly creatorName: string;
  readonly creatorAvatarUrl?: string | null;
  readonly collaborators?: readonly ProductCreatorRef[] | undefined;
}

export function SparseCreatorByline({
  creatorName,
  creatorAvatarUrl,
  collaborators,
}: SparseCreatorBylineProps) {
  const collabs = collaborators ?? [];
  const singleCollaborator = collabs.length === 1 ? collabs[0]! : null;
  const multiCollaborators = collabs.length > 1 ? collabs.slice(0, 3) : [];
  const collaboratorLabel =
    singleCollaborator
      ? singleCollaborator.name
      : collabs.length > 1
        ? `${collabs.length} collaborators`
        : null;

  return (
    <div
      className="flex min-w-0 flex-nowrap items-center gap-x-1 overflow-hidden text-[0.765rem] leading-tight text-muted-foreground"
      data-testid="product-creators-byline"
    >
      <SmallAvatar
        name={creatorName}
        src={creatorAvatarUrl}
        size={16}
        testId="product-creators-primary-avatar"
      />
      <span
        className="min-w-0 shrink truncate font-medium text-foreground/74"
        title={creatorName}
      >
        {creatorName}
      </span>

      {collaboratorLabel ? (
        <>
          <span className="shrink-0 text-foreground/22" aria-hidden>
            ·
          </span>
          {singleCollaborator ? (
            <SmallAvatar
              name={singleCollaborator.name}
              src={singleCollaborator.avatarUrl}
              size={16}
            />
          ) : multiCollaborators.length > 0 ? (
            <span
              className="inline-flex shrink-0 -space-x-1 overflow-hidden"
              aria-label={collabs.map((c) => c.name).join(', ')}
              data-testid="product-creators-collaborator-avatars"
            >
              {multiCollaborators.map((collaborator, index) => (
                <span key={`${collaborator.name}-${index}`} className="relative">
                  <SmallAvatar
                    name={collaborator.name}
                    src={collaborator.avatarUrl}
                    size={15}
                  />
                </span>
              ))}
            </span>
          ) : null}
          <span
            className="min-w-0 flex-1 truncate font-normal text-foreground/52"
            title={collaboratorLabel}
          >
            {collaboratorLabel}
          </span>
        </>
      ) : null}
    </div>
  );
}
