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
      className="relative inline-flex shrink-0 items-center justify-center overflow-hidden rounded-full bg-muted"
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
  const multiStack = collabs.length > 1;
  const avatar = 16;
  const stack = 18;

  return (
    <div
      className="flex min-w-0 flex-nowrap items-center gap-x-1 overflow-hidden text-[0.8125rem] leading-none text-muted-foreground"
      data-testid="product-creators-byline"
    >
      <SmallAvatar name={creatorName} src={creatorAvatarUrl} size={avatar} />
      <span
        className="min-w-0 shrink truncate py-px font-medium leading-tight text-foreground/85"
        title={creatorName}
      >
        {creatorName}
      </span>

      {collabs.length === 1 ? (
        <>
          <span className="shrink-0 font-normal">and</span>
          <SmallAvatar name={collabs[0]!.name} src={collabs[0]!.avatarUrl} size={avatar} />
          <span
            className="min-w-0 flex-1 truncate py-px font-medium leading-tight text-foreground/85"
            title={collabs[0]!.name}
          >
            {collabs[0]!.name}
          </span>
        </>
      ) : null}

      {multiStack ? (
        <>
          <span className="shrink-0 font-normal">·</span>
          <span
            className="inline-flex min-w-0 shrink items-center -space-x-1.5 overflow-hidden"
            aria-label={collabs.map((c) => c.name).join(', ')}
          >
            {collabs.map((c, i) => (
              <span
                key={`${c.name}-${i}`}
                className="relative shrink-0"
                style={{ zIndex: collabs.length - i }}
              >
                <SmallAvatar name={c.name} src={c.avatarUrl} size={stack} />
              </span>
            ))}
          </span>
        </>
      ) : null}
    </div>
  );
}
