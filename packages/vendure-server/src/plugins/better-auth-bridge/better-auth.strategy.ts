/**
 * Purpose: Authenticate Vendure shop sessions using JWTs minted by Simket
 *          Better Auth, syncing local customers from Better Auth identities.
 * Governing docs:
 *   - docs/architecture.md
 *   - docs/service-architecture.md
 *   - docs/regular-programming-practices/security-and-threat-modeling.md
 * External references:
 *   - https://better-auth.com/docs/plugins/jwt
 *   - https://docs.vendure.io/guides/core-concepts/auth/
 * Tests:
 *   - packages/vendure-server/src/auth/better-auth.test.ts
 */
import { Customer, CustomerService, ExternalAuthenticationService, TransactionalConnection, type AuthenticationStrategy, type Injector, type RequestContext, type User } from '@vendure/core';
import { gql } from 'graphql-tag';
import { lookupBetterAuthIdentity, validateJwt } from '../../auth/better-auth.js';

interface BetterAuthInput {
  readonly token: string;
}

function splitName(name: string | undefined): { firstName: string; lastName: string } {
  const normalizedName = (name ?? '').trim();
  if (normalizedName.length === 0) {
    return { firstName: 'Simket', lastName: 'User' };
  }

  const [firstName, ...rest] = normalizedName.split(/\s+/);
  return {
    firstName: firstName ?? 'Simket',
    lastName: rest.join(' ').trim() || 'User',
  };
}

function getCustomerCustomFields(customer: Customer): Record<string, unknown> {
  return (customer.customFields ?? {}) as Record<string, unknown>;
}

export class BetterAuthAuthenticationStrategy implements AuthenticationStrategy<BetterAuthInput> {
  readonly name = 'better_auth';

  private externalAuthenticationService!: ExternalAuthenticationService;
  private customerService!: CustomerService;
  private connection!: TransactionalConnection;

  async init(injector: Injector): Promise<void> {
    this.externalAuthenticationService = injector.get(ExternalAuthenticationService);
    this.customerService = injector.get(CustomerService);
    this.connection = injector.get(TransactionalConnection);
  }

  defineInputType() {
    return gql`
      input BetterAuthInput {
        token: String!
      }
    `;
  }

  async authenticate(ctx: RequestContext, data: BetterAuthInput): Promise<User | false | string> {
    if (!data?.token || data.token.trim().length === 0) {
      return 'Better Auth JWT is required.';
    }

    const validation = await validateJwt(data.token);
    if (!validation.valid || !validation.userId || !validation.email) {
      return 'Better Auth JWT validation failed.';
    }

    const identity = await lookupBetterAuthIdentity(validation.userId);
    const effectiveRole = validation.role ?? identity?.role ?? 'buyer';
    const effectiveCreatorSlug = validation.creatorSlug ?? identity?.creatorSlug ?? null;
    const effectiveImage = validation.image ?? identity?.image ?? null;

    const { firstName, lastName } = splitName(validation.name);
    const existingUser = await this.externalAuthenticationService.findCustomerUser(
      ctx,
      this.name,
      validation.userId,
      false,
    );

    const user =
      existingUser
      ?? await this.externalAuthenticationService.createCustomerAndUser(ctx, {
        strategy: this.name,
        externalIdentifier: validation.userId,
        emailAddress: validation.email,
        firstName,
        lastName,
        verified: true,
      });

    const customer = await this.customerService.findOneByUserId(ctx, user.id, true);
    if (!customer) {
      throw new Error(`Better Auth user "${validation.userId}" does not have a Vendure customer.`);
    }

    customer.firstName = firstName;
    customer.lastName = lastName;
    customer.emailAddress = validation.email;
    customer.customFields = {
      ...getCustomerCustomFields(customer),
      betterAuthUserId: validation.userId,
      betterAuthRole: effectiveRole,
      creatorSlug: effectiveCreatorSlug,
      avatarUrl: effectiveImage,
    } as Customer['customFields'];

    await this.connection.getRepository(ctx, Customer).save(customer);
    return user;
  }
}
