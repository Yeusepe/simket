/**
 * Purpose: Validate Cavalry scene URLs and normalize persisted embed metadata.
 * Governing docs:
 *   - docs/architecture.md (§2 rich text = TipTap)
 *   - docs/domain-model.md (§4.1 Product description)
 * External references:
 *   - https://cavalry.studio/docs/web-player/
 *   - https://cavalry.studio/docs/web-player/api/
 * Tests:
 *   - packages/storefront/src/services/cavalry-service.test.ts
 */
export interface CavalryEmbedConfig {
  readonly src: string;
  readonly width?: number;
  readonly height?: number;
  readonly autoplay?: boolean;
  readonly loop?: boolean;
  readonly controls?: boolean;
}

export interface PlayerConfig {
  readonly src: string;
  readonly container: string;
  readonly options: {
    readonly autoplay: boolean;
    readonly loop: boolean;
    readonly controls: boolean;
  };
}

const DEFAULT_CONTAINER_SELECTOR = '[data-cavalry-player-container]';

function parseDimension(value: string | null): number | undefined {
  if (!value) {
    return undefined;
  }

  const parsedValue = Number.parseInt(value, 10);

  return Number.isFinite(parsedValue) && parsedValue > 0 ? parsedValue : undefined;
}

function parseBoolean(value: string | null): boolean | undefined {
  if (value === null) {
    return undefined;
  }

  if (value === 'true') {
    return true;
  }

  if (value === 'false') {
    return false;
  }

  return undefined;
}

export function isValidCavalryUrl(url: string): boolean {
  try {
    const parsedUrl = new URL(url.trim());
    const isHttpUrl =
      parsedUrl.protocol === 'http:' || parsedUrl.protocol === 'https:';

    return isHttpUrl && parsedUrl.pathname.toLowerCase().endsWith('.cv');
  } catch {
    return false;
  }
}

export function parseCavalryEmbed(
  input: string,
): CavalryEmbedConfig | undefined {
  const trimmedInput = input.trim();

  if (isValidCavalryUrl(trimmedInput)) {
    return { src: trimmedInput };
  }

  if (typeof DOMParser === 'undefined' || !trimmedInput.includes('<')) {
    return undefined;
  }

  const document = new DOMParser().parseFromString(trimmedInput, 'text/html');
  const embedElement = document.querySelector<HTMLElement>('[data-cavalry-src]');
  const src = embedElement?.getAttribute('data-cavalry-src')?.trim();

  if (!embedElement || !src || !isValidCavalryUrl(src)) {
    return undefined;
  }

  return {
    src,
    width: parseDimension(embedElement.getAttribute('data-cavalry-width')),
    height: parseDimension(embedElement.getAttribute('data-cavalry-height')),
    autoplay: parseBoolean(embedElement.getAttribute('data-cavalry-autoplay')),
    loop: parseBoolean(embedElement.getAttribute('data-cavalry-loop')),
    controls: parseBoolean(embedElement.getAttribute('data-cavalry-controls')),
  };
}

export function buildCavalryPlayerConfig(
  config: CavalryEmbedConfig,
): PlayerConfig {
  if (!isValidCavalryUrl(config.src)) {
    throw new Error(`Invalid Cavalry scene URL: ${config.src}`);
  }

  return {
    src: config.src,
    container: DEFAULT_CONTAINER_SELECTOR,
    options: {
      autoplay: config.autoplay ?? false,
      loop: config.loop ?? true,
      controls: config.controls ?? false,
    },
  };
}
