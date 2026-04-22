import { describe, it, expect } from 'vitest';
import { CedarAuthEngine, AuthorizationRequest } from './cedar-engine.js';

describe('CedarAuthEngine', () => {
  const simplePolicies = `
permit(
  principal,
  action == Simket::Action::"ViewProduct",
  resource
) when {
  resource.state == "Published"
};

permit(
  principal,
  action == Simket::Action::"ManageProduct",
  resource
) when {
  resource.creator == principal
};
  `.trim();

  it('should create an engine with policies', () => {
    const engine = new CedarAuthEngine(simplePolicies);
    expect(engine).toBeDefined();
  });

  it('should allow viewing published products', () => {
    const engine = new CedarAuthEngine(simplePolicies);
    const request: AuthorizationRequest = {
      principal: { type: 'Simket::User', id: 'user-1' },
      action: { type: 'Simket::Action', id: 'ViewProduct' },
      resource: { type: 'Simket::Product', id: 'prod-1' },
      context: {},
      entities: [
        {
          uid: { type: 'Simket::Product', id: 'prod-1' },
          attrs: { state: 'Published', creatorId: 'creator-1' },
          parents: [],
        },
        {
          uid: { type: 'Simket::User', id: 'user-1' },
          attrs: {},
          parents: [],
        },
      ],
    };
    const decision = engine.isAuthorized(request);
    expect(decision.allowed).toBe(true);
  });

  it('should deny viewing draft products', () => {
    const engine = new CedarAuthEngine(simplePolicies);
    const request: AuthorizationRequest = {
      principal: { type: 'Simket::User', id: 'user-1' },
      action: { type: 'Simket::Action', id: 'ViewProduct' },
      resource: { type: 'Simket::Product', id: 'prod-2' },
      context: {},
      entities: [
        {
          uid: { type: 'Simket::Product', id: 'prod-2' },
          attrs: { state: 'Draft', creatorId: 'creator-1' },
          parents: [],
        },
        {
          uid: { type: 'Simket::User', id: 'user-1' },
          attrs: {},
          parents: [],
        },
      ],
    };
    const decision = engine.isAuthorized(request);
    expect(decision.allowed).toBe(false);
  });

  it('should allow creator to manage their own product', () => {
    const engine = new CedarAuthEngine(simplePolicies);
    const request: AuthorizationRequest = {
      principal: { type: 'Simket::User', id: 'creator-1' },
      action: { type: 'Simket::Action', id: 'ManageProduct' },
      resource: { type: 'Simket::Product', id: 'prod-1' },
      context: {},
      entities: [
        {
          uid: { type: 'Simket::Product', id: 'prod-1' },
          attrs: {
            state: 'Published',
            creator: { __entity: { type: 'Simket::User', id: 'creator-1' } },
          },
          parents: [],
        },
        {
          uid: { type: 'Simket::User', id: 'creator-1' },
          attrs: {},
          parents: [],
        },
      ],
    };
    const decision = engine.isAuthorized(request);
    expect(decision.allowed).toBe(true);
  });

  it('should deny non-creator from managing a product', () => {
    const engine = new CedarAuthEngine(simplePolicies);
    const request: AuthorizationRequest = {
      principal: { type: 'Simket::User', id: 'other-user' },
      action: { type: 'Simket::Action', id: 'ManageProduct' },
      resource: { type: 'Simket::Product', id: 'prod-1' },
      context: {},
      entities: [
        {
          uid: { type: 'Simket::Product', id: 'prod-1' },
          attrs: {
            state: 'Published',
            creator: { __entity: { type: 'Simket::User', id: 'creator-1' } },
          },
          parents: [],
        },
        {
          uid: { type: 'Simket::User', id: 'other-user' },
          attrs: {},
          parents: [],
        },
      ],
    };
    const decision = engine.isAuthorized(request);
    expect(decision.allowed).toBe(false);
  });

  it('should fail-closed: deny if policies are invalid', () => {
    const engine = new CedarAuthEngine('this is not a valid policy');
    const request: AuthorizationRequest = {
      principal: { type: 'Simket::User', id: 'user-1' },
      action: { type: 'Simket::Action', id: 'ViewProduct' },
      resource: { type: 'Simket::Product', id: 'prod-1' },
      context: {},
      entities: [],
    };
    const decision = engine.isAuthorized(request);
    expect(decision.allowed).toBe(false);
    expect(decision.errors.length).toBeGreaterThan(0);
  });

  it('should fail-closed: deny if no matching policy exists', () => {
    const engine = new CedarAuthEngine(simplePolicies);
    const request: AuthorizationRequest = {
      principal: { type: 'Simket::User', id: 'user-1' },
      action: { type: 'Simket::Action', id: 'DeleteProduct' },
      resource: { type: 'Simket::Product', id: 'prod-1' },
      context: {},
      entities: [
        {
          uid: { type: 'Simket::Product', id: 'prod-1' },
          attrs: { state: 'Published', creatorId: 'creator-1' },
          parents: [],
        },
        {
          uid: { type: 'Simket::User', id: 'user-1' },
          attrs: {},
          parents: [],
        },
      ],
    };
    const decision = engine.isAuthorized(request);
    expect(decision.allowed).toBe(false);
  });
});
