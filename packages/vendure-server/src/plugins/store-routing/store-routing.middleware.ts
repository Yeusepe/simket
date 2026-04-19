/**
 * Purpose: NestJS middleware that resolves the creator store from the request hostname.
 * Attaches the store slug to the request object for downstream resolvers/controllers.
 *
 * Routing strategy: creatorslug.simket.com → resolves to that creator's store.
 *
 * Governing docs:
 *   - docs/architecture.md §5 (Page Builder — Framely, subdomain routing)
 * External references:
 *   - https://docs.vendure.io/guides/developer-guide/plugins/#middleware
 *   - https://docs.nestjs.com/middleware
 * Tests:
 *   - packages/vendure-server/src/plugins/store-routing/store-routing.middleware.test.ts
 */
import { Injectable, NestMiddleware, Logger } from '@nestjs/common';
import type { Request, Response, NextFunction } from 'express';
import { parseStoreSubdomain } from './store-routing.service.js';

const loggerCtx = 'StoreRoutingMiddleware';

declare global {
  namespace Express {
    interface Request {
      storeSlug?: string;
    }
  }
}

/**
 * Middleware that parses the hostname to extract a store slug (subdomain).
 * If a valid store subdomain is found, it's attached as `req.storeSlug`.
 *
 * For the root domain or reserved subdomains, `req.storeSlug` remains undefined
 * and the request proceeds to the main storefront.
 */
@Injectable()
export class StoreRoutingMiddleware implements NestMiddleware {
  use(req: Request, _res: Response, next: NextFunction): void {
    const hostname = req.hostname ?? req.headers.host?.split(':')[0] ?? '';
    const storeSlug = parseStoreSubdomain(hostname);

    if (storeSlug) {
      req.storeSlug = storeSlug;
      Logger.debug(`Resolved store slug: ${storeSlug} from ${hostname}`, loggerCtx);
    }

    next();
  }
}
