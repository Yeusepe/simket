/**
 * Purpose: Global NestJS guard that blocks requests using CrowdSec IP reputation checks.
 * Governing docs:
 *   - docs/architecture.md
 *   - docs/service-architecture.md
 *   - docs/regular-programming-practices/security-and-threat-modeling.md
 * External references:
 *   - https://docs.nestjs.com/guards
 *   - https://docs.crowdsec.net/docs/bouncers/nodejs/
 * Tests:
 *   - packages/vendure-server/src/security/crowdsec.guard.test.ts
 */
import { CanActivate, ExecutionContext, ForbiddenException, Injectable } from '@nestjs/common';
import { CrowdSecBouncer, extractClientIp, type CrowdSecRequest } from './crowdsec.js';

interface GraphqlLikeContext {
  req?: CrowdSecRequest;
}

function isCrowdSecRequest(value: unknown): value is CrowdSecRequest {
  return Boolean(
    value &&
      typeof value === 'object' &&
      'headers' in value &&
      typeof (value as CrowdSecRequest).headers === 'object',
  );
}

export function getRequestFromExecutionContext(
  context: ExecutionContext,
): CrowdSecRequest | undefined {
  const httpRequest = context.switchToHttp().getRequest<CrowdSecRequest>();
  if (isCrowdSecRequest(httpRequest)) {
    return httpRequest;
  }

  const graphqlContext = context.getArgByIndex<GraphqlLikeContext>(2);
  if (isCrowdSecRequest(graphqlContext?.req)) {
    return graphqlContext.req;
  }

  const firstArg = context.getArgByIndex(0);
  if (isCrowdSecRequest(firstArg)) {
    return firstArg;
  }

  return undefined;
}

@Injectable()
export class CrowdSecGuard implements CanActivate {
  constructor(private readonly bouncer: Pick<CrowdSecBouncer, 'checkIp'>) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = getRequestFromExecutionContext(context);

    if (!request) {
      return true;
    }

    const ip = extractClientIp(request);
    const decision = await this.bouncer.checkIp(ip);

    if (decision === 'allow') {
      return true;
    }

    throw new ForbiddenException('Request blocked by CrowdSec');
  }
}
