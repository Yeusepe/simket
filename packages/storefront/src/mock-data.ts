/**
 * Purpose: Mock data for the dev environment using picsum.photos for hero images.
 * Provides realistic sample products, editorial sections, discovery items, and dashboard data.
 * Governing docs:
 *   - docs/architecture.md
 *   - docs/domain-model.md
 * External references:
 *   - https://picsum.photos/images
 * Tests:
 *   - Type-only module; validated through component tests
 */
import type { ProductListItem } from '../types/product';
import type { EditorialSection, EditorialItem } from '../components/today/today-types';
import type { DiscoveryFeedItem } from '../components/discovery/discovery-types';
import type { DashboardStats, ActivityItem, QuickAction } from '../components/dashboard/dashboard-types';
import type { AppNotification } from '../types/notifications';

function picsumUrl(id: number, w = 800, h = 450): string {
  return `https://picsum.photos/id/${id}/${w}/${h}`;
}

// ---- Products ----

export const MOCK_PRODUCTS: readonly ProductListItem[] = [
  {
    id: 'prod-001',
    slug: 'ethereal-avatar-base',
    name: 'Ethereal Avatar Base',
    description: 'High-poly VRC avatar with full PhysBones and gesture setup.',
    priceMin: 2999,
    priceMax: 2999,
    currencyCode: 'USD',
    heroImageUrl: picsumUrl(1025, 800, 450),
    heroTransparentUrl: null,
    creatorName: 'Nova Studio',
    tags: ['avatar', 'vrchat', 'unity'],
    categorySlug: 'avatars',
  },
  {
    id: 'prod-002',
    slug: 'pixel-dust-shader-pack',
    name: 'Pixel Dust Shader Pack',
    description: 'Stylized toon shaders for Unity URP. Includes 12 presets.',
    priceMin: 1499,
    priceMax: 1499,
    currencyCode: 'USD',
    heroImageUrl: picsumUrl(1035, 800, 450),
    heroTransparentUrl: null,
    creatorName: 'ShaderLab',
    tags: ['shader', 'unity', 'urp'],
    categorySlug: 'tools',
  },
  {
    id: 'prod-003',
    slug: 'cozy-cabin-world',
    name: 'Cozy Cabin World',
    description: 'Fully optimized VRChat world with baked lighting and 4 rooms.',
    priceMin: 999,
    priceMax: 999,
    currencyCode: 'USD',
    heroImageUrl: picsumUrl(1040, 800, 450),
    heroTransparentUrl: null,
    creatorName: 'WorldCraft',
    tags: ['world', 'vrchat', 'environment'],
    categorySlug: 'worlds',
  },
  {
    id: 'prod-004',
    slug: 'neon-clothing-set',
    name: 'Neon Clothing Set',
    description: 'Cyberpunk-inspired outfit pack with emission maps and toggle.',
    priceMin: 799,
    priceMax: 1299,
    currencyCode: 'USD',
    heroImageUrl: picsumUrl(1062, 800, 450),
    heroTransparentUrl: null,
    creatorName: 'VoxelWear',
    tags: ['clothing', 'avatar', 'cyberpunk'],
    categorySlug: 'accessories',
  },
  {
    id: 'prod-005',
    slug: 'ambient-soundscape-vol-1',
    name: 'Ambient Soundscape Vol. 1',
    description: '30 royalty-free ambient loops for VR environments.',
    priceMin: 499,
    priceMax: 499,
    currencyCode: 'USD',
    heroImageUrl: picsumUrl(1076, 800, 450),
    heroTransparentUrl: null,
    creatorName: 'SoundSphere',
    tags: ['audio', 'ambient', 'sfx'],
    categorySlug: 'audio',
  },
  {
    id: 'prod-006',
    slug: 'particle-fx-toolkit',
    name: 'Particle FX Toolkit',
    description: '50+ hand-crafted particle systems for Unity.',
    priceMin: 1999,
    priceMax: 1999,
    currencyCode: 'USD',
    heroImageUrl: picsumUrl(1084, 800, 450),
    heroTransparentUrl: null,
    creatorName: 'FXForge',
    tags: ['particles', 'unity', 'vfx'],
    categorySlug: 'tools',
  },
  {
    id: 'prod-007',
    slug: 'retro-prop-collection',
    name: 'Retro Prop Collection',
    description: 'Low-poly retro furniture and arcade machines for worlds.',
    priceMin: 599,
    priceMax: 599,
    currencyCode: 'USD',
    heroImageUrl: picsumUrl(160, 800, 450),
    heroTransparentUrl: null,
    creatorName: 'PolyProps',
    tags: ['props', '3d', 'retro'],
    categorySlug: 'assets',
  },
  {
    id: 'prod-008',
    slug: 'dynamic-tail-physics',
    name: 'Dynamic Tail Physics',
    description: 'PhysBone-driven tail system with 8 presets.',
    priceMin: 399,
    priceMax: 399,
    currencyCode: 'USD',
    heroImageUrl: picsumUrl(237, 800, 450),
    heroTransparentUrl: null,
    creatorName: 'PhysicsWorks',
    tags: ['physbones', 'avatar', 'vrchat'],
    categorySlug: 'accessories',
  },
];

// ---- Editorial / Today ----

const MOCK_EDITORIAL_ITEMS: readonly EditorialItem[] = [
  {
    id: 'ed-001',
    title: 'The Rise of Community-Built Avatars',
    excerpt: 'How independent creators are reshaping virtual identity with open-source avatar bases and collaborative workflows.',
    heroImage: picsumUrl(1043, 1200, 600),
    heroTransparent: undefined,
    author: 'Simket Editorial',
    productName: 'Community Avatar Kit — Open Base',
    creatorName: 'Nova Studio',
    productThumbnailUrl: picsumUrl(1060, 256, 256),
    publishedAt: '2026-04-15T09:00:00Z',
    slug: 'rise-of-community-avatars',
    tags: ['avatars', 'community', 'featured'],
  },
  {
    id: 'ed-002',
    title: 'Shader Artists to Watch in 2026',
    excerpt: 'Five shader creators pushing the boundaries of real-time rendering in VR.',
    heroImage: picsumUrl(1044, 800, 600),
    author: 'Simket Editorial',
    publishedAt: '2026-04-14T12:00:00Z',
    slug: 'shader-artists-2026',
    tags: ['shaders', 'artists'],
  },
  {
    id: 'ed-003',
    title: 'Building Worlds That Feel Like Home',
    excerpt: 'What makes a virtual world truly cozy? We asked the top world builders.',
    heroImage: picsumUrl(1047, 800, 600),
    author: 'Simket Editorial',
    publishedAt: '2026-04-13T15:00:00Z',
    slug: 'cozy-worlds-guide',
    tags: ['worlds', 'design'],
  },
  {
    id: 'ed-004',
    title: 'The Audio Revolution in VR',
    excerpt: 'Spatial audio and soundscapes are transforming immersion.',
    heroImage: picsumUrl(1055, 800, 600),
    author: 'Simket Editorial',
    publishedAt: '2026-04-12T10:00:00Z',
    slug: 'audio-revolution-vr',
    tags: ['audio', 'vr'],
  },
  {
    id: 'ed-005',
    title: 'Creator Spotlights: April 2026',
    excerpt: 'Meet this month\'s standout creators from across the Simket marketplace.',
    heroImage: picsumUrl(1059, 800, 600),
    author: 'Simket Editorial',
    publishedAt: '2026-04-11T08:00:00Z',
    slug: 'creator-spotlights-april',
    tags: ['creators', 'spotlight'],
  },
];

export const MOCK_EDITORIAL_SECTIONS: readonly EditorialSection[] = [
  {
    id: 'section-hero',
    name: 'Featured',
    slug: 'featured',
    layout: 'hero-banner',
    sortOrder: 0,
    items: [MOCK_EDITORIAL_ITEMS[0]!],
  },
  {
    id: 'section-picks',
    name: 'Editor\'s Picks',
    slug: 'editors-picks',
    layout: 'card-grid-4',
    sortOrder: 1,
    items: MOCK_EDITORIAL_ITEMS.slice(1, 5),
  },
  {
    id: 'section-trending',
    name: 'Trending This Week',
    slug: 'trending',
    layout: 'horizontal-scroll',
    sortOrder: 2,
    items: MOCK_EDITORIAL_ITEMS,
  },
];

// ---- Discovery Feed ----

export const MOCK_DISCOVERY_ITEMS: readonly DiscoveryFeedItem[] = [
  {
    productId: 'prod-001',
    slug: 'ethereal-avatar-base',
    name: 'Ethereal Avatar Base',
    imageUrl: picsumUrl(1025, 600, 340),
    price: 2999,
    currencyCode: 'USD',
    creatorName: 'Nova Studio',
    reason: 'Because you bought avatar tools',
    score: 0.95,
    source: 'collaborative-filtering',
    variantId: 'var-001',
  },
  {
    productId: 'prod-002',
    slug: 'pixel-dust-shader-pack',
    name: 'Pixel Dust Shader Pack',
    imageUrl: picsumUrl(1035, 600, 340),
    price: 1499,
    currencyCode: 'USD',
    creatorName: 'ShaderLab',
    reason: 'Popular in Unity tools',
    score: 0.88,
    source: 'content-based',
    variantId: 'var-002',
  },
  {
    productId: 'prod-003',
    slug: 'cozy-cabin-world',
    name: 'Cozy Cabin World',
    imageUrl: picsumUrl(1040, 600, 340),
    price: 999,
    currencyCode: 'USD',
    creatorName: 'WorldCraft',
    reason: 'Trending in worlds',
    score: 0.82,
    source: 'popularity',
    variantId: 'var-003',
  },
  {
    productId: 'prod-004',
    slug: 'neon-clothing-set',
    name: 'Neon Clothing Set',
    imageUrl: picsumUrl(1062, 600, 340),
    price: 799,
    currencyCode: 'USD',
    creatorName: 'VoxelWear',
    reason: 'Matches your style',
    score: 0.79,
    source: 'collaborative-filtering',
    variantId: 'var-004',
  },
  {
    productId: 'prod-005',
    slug: 'ambient-soundscape-vol-1',
    name: 'Ambient Soundscape Vol. 1',
    imageUrl: picsumUrl(1076, 600, 340),
    price: 499,
    currencyCode: 'USD',
    creatorName: 'SoundSphere',
    reason: 'World builders also bought',
    score: 0.74,
    source: 'collaborative-filtering',
    variantId: 'var-005',
  },
  {
    productId: 'prod-006',
    slug: 'particle-fx-toolkit',
    name: 'Particle FX Toolkit',
    imageUrl: picsumUrl(1084, 600, 340),
    price: 1999,
    currencyCode: 'USD',
    creatorName: 'FXForge',
    reason: 'Top rated in VFX',
    score: 0.71,
    source: 'content-based',
    variantId: 'var-006',
  },
  {
    productId: 'prod-007',
    slug: 'retro-prop-collection',
    name: 'Retro Prop Collection',
    imageUrl: picsumUrl(160, 600, 340),
    price: 599,
    currencyCode: 'USD',
    creatorName: 'PolyProps',
    reason: 'New release',
    score: 0.68,
    source: 'recency',
    variantId: 'var-007',
  },
  {
    productId: 'prod-008',
    slug: 'dynamic-tail-physics',
    name: 'Dynamic Tail Physics',
    imageUrl: picsumUrl(237, 600, 340),
    price: 399,
    currencyCode: 'USD',
    creatorName: 'PhysicsWorks',
    reason: 'Avatar creators love this',
    score: 0.65,
    source: 'collaborative-filtering',
    variantId: 'var-008',
  },
];

// ---- Dashboard ----

export const MOCK_DASHBOARD_STATS: DashboardStats = {
  totalRevenue: 1_245_600,
  totalSales: 387,
  totalViews: 14_820,
  conversionRate: 2.6,
  revenueChange: 12.4,
  salesChange: 8.7,
};

export const MOCK_ACTIVITY_ITEMS: readonly ActivityItem[] = [
  {
    id: 'act-001',
    type: 'sale',
    title: 'New sale',
    description: 'Ethereal Avatar Base purchased by user_42',
    timestamp: new Date(Date.now() - 1000 * 60 * 23).toISOString(),
  },
  {
    id: 'act-002',
    type: 'review',
    title: 'New review',
    description: 'Pixel Dust Shader Pack received a 5-star review',
    timestamp: new Date(Date.now() - 1000 * 60 * 60 * 2).toISOString(),
  },
  {
    id: 'act-003',
    type: 'collaboration',
    title: 'Collaboration accepted',
    description: 'ShaderLab accepted your collab invite for Neon Bundle',
    timestamp: new Date(Date.now() - 1000 * 60 * 60 * 5).toISOString(),
  },
  {
    id: 'act-004',
    type: 'product_update',
    title: 'Product updated',
    description: 'Cozy Cabin World v1.2 uploaded successfully',
    timestamp: new Date(Date.now() - 1000 * 60 * 60 * 24).toISOString(),
  },
];

export const MOCK_QUICK_ACTIONS: readonly QuickAction[] = [
  { id: 'qa-new-product', label: 'New Product', icon: 'plus', href: '/dashboard/products/new' },
  { id: 'qa-analytics', label: 'View Analytics', icon: 'chart', href: '/dashboard/analytics' },
  { id: 'qa-collab', label: 'Start Collaboration', icon: 'collaboration', href: '/dashboard/collaborations/new' },
  { id: 'qa-edit', label: 'Edit Storefront', icon: 'edit', href: '/dashboard/templates' },
];

// ---- Notifications ----

export const MOCK_NOTIFICATIONS: readonly AppNotification[] = [
  {
    id: 'notif-001',
    type: 'purchase',
    title: 'New purchase',
    body: 'user_42 bought Ethereal Avatar Base',
    read: false,
    createdAt: new Date(Date.now() - 1000 * 60 * 5).toISOString(),
    data: { productSlug: 'ethereal-avatar-base' },
  },
  {
    id: 'notif-002',
    type: 'collaboration_invite',
    title: 'Collaboration invite',
    body: 'ShaderLab invited you to collaborate on Neon Bundle',
    read: false,
    createdAt: new Date(Date.now() - 1000 * 60 * 30).toISOString(),
    data: {},
  },
  {
    id: 'notif-003',
    type: 'price_drop',
    title: 'Price drop on your wishlist',
    body: 'Particle FX Toolkit is now $14.99',
    read: true,
    createdAt: new Date(Date.now() - 1000 * 60 * 60 * 3).toISOString(),
    data: { productSlug: 'particle-fx-toolkit' },
  },
  {
    id: 'notif-004',
    type: 'gift_received',
    title: 'You received a gift!',
    body: 'friend_99 gifted you Ambient Soundscape Vol. 1',
    read: true,
    createdAt: new Date(Date.now() - 1000 * 60 * 60 * 24).toISOString(),
    data: { productSlug: 'ambient-soundscape-vol-1' },
  },
];
