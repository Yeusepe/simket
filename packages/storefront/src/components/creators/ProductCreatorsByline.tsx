/**
 * Purpose: Compact creator / collaborator line for product surfaces (Leonardo-themed cards).
 * One collaborator: primary **name** and **collaborator**. Multiple: primary **name** + stacked avatars.
 * Governing docs:
 *   - docs/architecture.md
 * Tests:
 *   - packages/storefront/src/components/creators/ProductCreatorsByline.test.tsx
 */
import type { BentoSpotlightFooterColors } from '../../color/leonardo-theme';
import type { ProductCreatorRef } from '../../types/product';
import { Icon } from '../common/Icon';

export interface ProductCreatorsBylineProps {
  readonly creatorName: string;
  readonly creatorAvatarUrl?: string | null;
  readonly collaborators?: readonly ProductCreatorRef[] | undefined;
  readonly footerColors: BentoSpotlightFooterColors;
  /** Shell / frame color for avatar rings (matches bento border). */
  readonly shellColor: string;
  /** When false, hides profile / collaboration glyph icons (avatars + names stay). */
  readonly showRoleIcons?: boolean;
  /** `compact` = dense single line. `comfortable` = trending tiles: one line, proportional type, truncate + title if tight. */
  readonly density?: 'default' | 'compact' | 'comfortable';
  readonly className?: string;
}

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
  ringColor,
  inkColor,
}: {
  readonly name: string;
  readonly src?: string | null;
  readonly size: number;
  readonly ringColor: string;
  readonly inkColor: string;
}) {
  const initialClass =
    size <= 13 ? 'text-[0.5rem]' : size <= 16 ? 'text-[0.6rem]' : 'text-[0.55rem]';
  return (
    <span
      className="relative inline-flex shrink-0 items-center justify-center overflow-hidden rounded-full bg-white/15"
      style={{
        width: size,
        height: size,
        boxShadow: `0 0 0 2px ${ringColor}`,
      }}
      title={name}
    >
      {src ? (
        <img src={src} alt="" className="size-full object-cover" loading="lazy" decoding="async" />
      ) : (
        <span className={`font-semibold leading-none ${initialClass}`} style={{ color: inkColor }}>
          {initials(name)}
        </span>
      )}
    </span>
  );
}

/** Trending tiles: one horizontal row, avatars + names + “and”, no wrap between segments. */
function ComfortableByline({
  creatorName,
  creatorAvatarUrl,
  collaborators,
  footerColors,
  shellColor,
  showRoleIcons,
}: {
  readonly creatorName: string;
  readonly creatorAvatarUrl?: string | null;
  readonly collaborators: readonly ProductCreatorRef[];
  readonly footerColors: BentoSpotlightFooterColors;
  readonly shellColor: string;
  readonly showRoleIcons: boolean;
}) {
  const iconSize = 14;
  const avatar = 16;
  const stack = 18;
  const collabs = collaborators;
  const multiStack = collabs.length > 1;

  return (
    <div
      className="flex min-w-0 flex-nowrap items-center gap-x-1 overflow-hidden text-sm leading-tight"
      data-testid="product-creators-byline"
    >
      {showRoleIcons ? (
        <span className="inline-flex shrink-0 opacity-90" style={{ color: footerColors.creator }}>
          <Icon name="profile" size={iconSize} />
        </span>
      ) : null}
      <SmallAvatar
        name={creatorName}
        src={creatorAvatarUrl}
        size={avatar}
        ringColor={shellColor}
        inkColor={footerColors.product}
      />
      <span
        className="min-w-0 shrink font-semibold truncate"
        style={{ color: footerColors.product }}
        title={creatorName}
      >
        {creatorName}
      </span>

      {collabs.length === 1 ? (
        <>
          <span style={{ color: footerColors.creator }} className="shrink-0 font-normal">
            and
          </span>
          {showRoleIcons ? (
            <span className="inline-flex shrink-0 opacity-90" style={{ color: footerColors.creator }}>
              <Icon name="collaborations" size={iconSize} />
            </span>
          ) : null}
          <SmallAvatar
            name={collabs[0]!.name}
            src={collabs[0]!.avatarUrl}
            size={avatar}
            ringColor={shellColor}
            inkColor={footerColors.product}
          />
          <span
            className="min-w-0 flex-1 truncate font-semibold"
            style={{ color: footerColors.product }}
            title={collabs[0]!.name}
          >
            {collabs[0]!.name}
          </span>
        </>
      ) : null}

      {multiStack ? (
        <>
          <span style={{ color: footerColors.creator }} className="shrink-0 font-normal">
            ·
          </span>
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
                <SmallAvatar
                  name={c.name}
                  src={c.avatarUrl}
                  size={stack}
                  ringColor={shellColor}
                  inkColor={footerColors.product}
                />
              </span>
            ))}
          </span>
        </>
      ) : null}
    </div>
  );
}

export function ProductCreatorsByline({
  creatorName,
  creatorAvatarUrl,
  collaborators,
  footerColors,
  shellColor,
  showRoleIcons = true,
  density = 'default',
  className,
}: ProductCreatorsBylineProps) {
  const collabs = collaborators ?? [];
  const multiStack = collabs.length > 1;
  const compact = density === 'compact';
  const comfortable = density === 'comfortable';

  if (comfortable) {
    return (
      <ComfortableByline
        creatorName={creatorName}
        creatorAvatarUrl={creatorAvatarUrl}
        collaborators={collabs}
        footerColors={footerColors}
        shellColor={shellColor}
        showRoleIcons={showRoleIcons}
      />
    );
  }

  const iconSize = compact ? 12 : 14;
  const primaryAvatar = compact ? 14 : 18;
  const stackAvatar = compact ? 16 : 22;
  const textClass = compact
    ? 'text-[0.575rem] leading-none'
    : 'text-[0.65rem] leading-snug sm:text-[0.7rem]';
  const rowClass = compact
    ? 'flex min-w-0 flex-nowrap items-center gap-x-0.5 overflow-hidden'
    : 'flex min-w-0 flex-wrap items-center gap-x-1 gap-y-1';

  const nameClamp = compact ? 'truncate' : '[overflow-wrap:anywhere]';

  return (
    <div className={`${rowClass} ${textClass} ${className ?? ''}`} data-testid="product-creators-byline">
      <span className={`inline-flex min-w-0 items-center gap-0.5 ${compact ? 'max-w-[50%]' : ''}`}>
        {showRoleIcons ? (
          <span className="inline-flex shrink-0 opacity-90" style={{ color: footerColors.creator }}>
            <Icon name="profile" size={iconSize} />
          </span>
        ) : null}
        <SmallAvatar
          name={creatorName}
          src={creatorAvatarUrl}
          size={primaryAvatar}
          ringColor={shellColor}
          inkColor={footerColors.product}
        />
        <span
          className={`min-w-0 font-semibold ${nameClamp}`}
          style={{ color: footerColors.product }}
          title={creatorName}
        >
          {creatorName}
        </span>
      </span>

      {collabs.length === 1 ? (
        <span className="inline-flex min-w-0 flex-1 items-center gap-0.5 overflow-hidden">
          <span style={{ color: footerColors.creator }} className="shrink-0 font-normal">
            {' '}
            and{' '}
          </span>
          {showRoleIcons ? (
            <span className="inline-flex shrink-0 opacity-90" style={{ color: footerColors.creator }}>
              <Icon name="collaborations" size={iconSize} />
            </span>
          ) : null}
          <SmallAvatar
            name={collabs[0]!.name}
            src={collabs[0]!.avatarUrl}
            size={primaryAvatar}
            ringColor={shellColor}
            inkColor={footerColors.product}
          />
          <span
            className={`min-w-0 font-semibold ${nameClamp}`}
            style={{ color: footerColors.product }}
            title={collabs[0]!.name}
          >
            {collabs[0]!.name}
          </span>
        </span>
      ) : null}

      {multiStack ? (
        <span
          className="inline-flex min-w-0 shrink-0 items-center gap-0.5 overflow-hidden pl-0.5"
          aria-label={collabs.map((c) => c.name).join(', ')}
        >
          <span style={{ color: footerColors.creator }} className="shrink-0 font-normal">
            ·
          </span>
          <span className="inline-flex min-w-0 items-center -space-x-1.5">
            {collabs.map((c, i) => (
              <span
                key={`${c.name}-${i}`}
                className="relative shrink-0"
                style={{ zIndex: collabs.length - i }}
              >
                <SmallAvatar
                  name={c.name}
                  src={c.avatarUrl}
                  size={stackAvatar}
                  ringColor={shellColor}
                  inkColor={footerColors.product}
                />
              </span>
            ))}
          </span>
        </span>
      ) : null}
    </div>
  );
}
