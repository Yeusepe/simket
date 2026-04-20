/**
 * Purpose: Define reproducible development Better Auth users and Simket-owned
 *          catalog products for local authentication and storefront seeding.
 * Governing docs:
 *   - docs/architecture.md
 *   - docs/service-architecture.md
 *   - docs/domain-model.md
 * External references:
 *   - https://www.better-auth.com/docs
 * Tests:
 *   - packages/vendure-server/src/plugins/better-auth-bridge/better-auth-bridge.service.test.ts
 */
export type DevelopmentUserRole = 'buyer' | 'creator' | 'admin';

export interface DevelopmentUserSeed {
  readonly name: string;
  readonly email: string;
  readonly password: string;
  readonly role: DevelopmentUserRole;
  readonly authSource: 'local-dev' | 'yucp';
  readonly bio?: string;
  readonly website?: string;
  readonly image?: string;
  readonly creatorSlug?: string;
}

export interface DevelopmentProductSeed {
  readonly seedKey: string;
  readonly ownerEmail: string;
  readonly name: string;
  readonly slug: string;
  readonly description: string;
  readonly shortDescription: string;
  readonly price: number;
  readonly compareAtPrice?: number;
  readonly currencyCode: 'USD';
  readonly platformTakeRate: number;
  readonly visibility: 'draft' | 'published' | 'archived';
  readonly tags: readonly string[];
  readonly heroImageUrl: string;
  readonly heroTransparentUrl?: string;
  readonly heroBackgroundUrl?: string;
  readonly creatorName: string;
  readonly creatorAvatarUrl?: string;
  readonly creatorSlug: string;
  readonly previewColor: string;
  readonly termsOfService: string;
  readonly salesCount: number;
  readonly revenue: number;
  readonly viewCount: number;
}

function picsumSeed(seed: string, width: number, height: number): string {
  return `https://picsum.photos/seed/${encodeURIComponent(seed)}/${width}/${height}`;
}

export const DEVELOPMENT_USER_SEEDS: readonly DevelopmentUserSeed[] = [
  {
    name: 'Simket Buyer',
    email: 'buyer@simket.test',
    password: 'SimketBuyer123',
    role: 'buyer',
    authSource: 'local-dev',
    bio: 'Local buyer account for validating checkout-adjacent storefront flows.',
    website: 'https://simket.dev',
    image: picsumSeed('simket-buyer-avatar', 128, 128),
  },
  {
    name: 'Alex Creator',
    email: 'alex.creator@simket.test',
    password: 'SimketCreator123',
    role: 'creator',
    authSource: 'local-dev',
    bio: 'Creator seed account for storefront and dashboard validation.',
    website: 'https://alex-creator.simket.dev',
    image: picsumSeed('simket-creator-alex-avatar', 128, 128),
    creatorSlug: 'alex-creator',
  },
  {
    name: 'Pixel Works',
    email: 'pixel.works@simket.test',
    password: 'SimketCreator123',
    role: 'creator',
    authSource: 'local-dev',
    bio: 'Second creator seed account for collaborative catalog coverage.',
    website: 'https://pixel-works.simket.dev',
    image: picsumSeed('simket-creator-pixel-avatar', 128, 128),
    creatorSlug: 'pixel-works',
  },
  {
    name: 'Simket Admin',
    email: 'admin@simket.test',
    password: 'SimketAdmin123',
    role: 'admin',
    authSource: 'local-dev',
    bio: 'Internal account for local administration checks.',
    website: 'https://simket.dev/admin',
    image: picsumSeed('simket-admin-avatar', 128, 128),
  },
] as const;

export const DEVELOPMENT_PRODUCT_SEEDS: readonly DevelopmentProductSeed[] = [
  {
    seedKey: 'alex-ethereal-avatar-base',
    ownerEmail: 'alex.creator@simket.test',
    name: 'Ethereal Avatar Base',
    slug: 'ethereal-avatar-base',
    description: 'High-poly VRC avatar with full PhysBones, optimized materials, and creator-ready blendshape setup.',
    shortDescription: 'High-poly avatar base with full PhysBones and creator-ready customization.',
    price: 2999,
    compareAtPrice: 3499,
    currencyCode: 'USD',
    platformTakeRate: 7,
    visibility: 'published',
    tags: ['avatar', 'vrchat', 'unity'],
    heroImageUrl: picsumSeed('simket-prod-001-hero', 1200, 900),
    creatorName: 'Alex Creator',
    creatorAvatarUrl: picsumSeed('simket-prod-001-creator', 96, 96),
    creatorSlug: 'alex-creator',
    previewColor: '#8b5cf6',
    termsOfService: 'All sales are final. Redistribution of source files is prohibited.',
    salesCount: 214,
    revenue: 641786,
    viewCount: 7431,
  },
  {
    seedKey: 'alex-retro-prop-collection',
    ownerEmail: 'alex.creator@simket.test',
    name: 'Retro Prop Collection',
    slug: 'retro-prop-collection',
    description: 'Low-poly retro furniture and arcade machines tuned for creator stores and stylized worlds.',
    shortDescription: 'Low-poly retro props and arcade machines for creator stores and worlds.',
    price: 599,
    currencyCode: 'USD',
    platformTakeRate: 5,
    visibility: 'published',
    tags: ['props', '3d', 'retro'],
    heroImageUrl: picsumSeed('simket-prod-007-hero', 1200, 900),
    creatorName: 'Alex Creator',
    creatorAvatarUrl: picsumSeed('simket-prod-007-creator', 96, 96),
    creatorSlug: 'alex-creator',
    previewColor: '#14b8a6',
    termsOfService: 'Commercial use is allowed for finished worlds. Raw assets may not be resold.',
    salesCount: 53,
    revenue: 31747,
    viewCount: 1840,
  },
  {
    seedKey: 'pixel-shader-pack',
    ownerEmail: 'pixel.works@simket.test',
    name: 'Pixel Dust Shader Pack',
    slug: 'pixel-dust-shader-pack',
    description: 'Stylized toon shaders for Unity URP with twelve presets, masked rim lighting, and creator-tuned defaults.',
    shortDescription: 'Stylized Unity URP shader pack with twelve presets and creator-tuned defaults.',
    price: 1499,
    compareAtPrice: 1999,
    currencyCode: 'USD',
    platformTakeRate: 6,
    visibility: 'published',
    tags: ['shader', 'unity', 'urp'],
    heroImageUrl: picsumSeed('simket-prod-002-hero', 1200, 900),
    creatorName: 'Pixel Works',
    creatorAvatarUrl: picsumSeed('simket-prod-002-creator', 96, 96),
    creatorSlug: 'pixel-works',
    previewColor: '#0ea5e9',
    termsOfService: 'License covers one creator brand and unlimited shipped projects.',
    salesCount: 89,
    revenue: 133411,
    viewCount: 3924,
  },
  {
    seedKey: 'pixel-particle-fx-toolkit',
    ownerEmail: 'pixel.works@simket.test',
    name: 'Particle FX Toolkit',
    slug: 'particle-fx-toolkit',
    description: 'Fifty-plus particle systems for Unity with bundled presets for portals, trails, and ambient motion.',
    shortDescription: 'Fifty-plus Unity particle systems for portals, trails, and ambient motion.',
    price: 1999,
    currencyCode: 'USD',
    platformTakeRate: 8,
    visibility: 'draft',
    tags: ['particles', 'unity', 'vfx'],
    heroImageUrl: picsumSeed('simket-prod-006-hero', 1200, 900),
    creatorName: 'Pixel Works',
    creatorAvatarUrl: picsumSeed('simket-prod-006-creator', 96, 96),
    creatorSlug: 'pixel-works',
    previewColor: '#6366f1',
    termsOfService: 'Source assets may be used in shipped experiences but not redistributed as packs.',
    salesCount: 17,
    revenue: 33983,
    viewCount: 1257,
  },
] as const;
