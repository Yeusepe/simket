/**
 * Minimal creator line for listing tiles — neutral, no ring borders on avatars.
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
}: {
  readonly name: string;
  readonly src?: string | null;
  readonly size: number;
}) {
  const initialClass =
    size <= 13 ? 'text-[0.5rem]' : size <= 16 ? 'text-[0.6rem]' : 'text-[0.55rem]';
  return (
    <span
      className="relative inline-flex shrink-0 items-center justify-center overflow-hidden rounded-full border border-default-200/70 bg-default-100 dark:border-default-700/70 dark:bg-default-900/90"
      style={{ width: size, height: size }}
      title={name}
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
  const avatar = 16;
  const collaboratorLabel =
    collabs.length === 1
      ? collabs[0]!.name
      : collabs.length > 1
        ? `${collabs.length} collaborators`
        : null;

  return (
    <div
      className="flex min-w-0 flex-nowrap items-center gap-x-1.5 overflow-hidden text-[0.78rem] leading-none text-muted-foreground"
      data-testid="product-creators-byline"
    >
      <SmallAvatar name={creatorName} src={creatorAvatarUrl} size={avatar} />
      <span
        className="min-w-0 shrink truncate py-px font-medium leading-tight text-foreground/78"
        title={creatorName}
      >
        {creatorName}
      </span>

      {collaboratorLabel ? (
        <>
          <span className="shrink-0 text-foreground/28" aria-hidden>
            ·
          </span>
          <span
            className="min-w-0 flex-1 truncate py-px font-normal leading-tight text-foreground/56"
            title={collaboratorLabel}
          >
            {collaboratorLabel}
          </span>
        </>
      ) : null}
    </div>
  );
}
