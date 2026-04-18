// Cedar authorization docs: https://docs.cedarpolicy.com/
// Cedar WASM Node.js: https://github.com/cedar-policy/cedar/tree/main/cedar-wasm
import {
  isAuthorized as cedarIsAuthorized,
  checkParsePolicySet,
} from '@cedar-policy/cedar-wasm/nodejs';
import type {
  AuthorizationCall,
  AuthorizationAnswer,
  CedarValueJson,
} from '@cedar-policy/cedar-wasm/nodejs';

export interface EntityUid {
  type: string;
  id: string;
}

export interface EntityData {
  uid: EntityUid;
  attrs: Record<string, CedarValueJson>;
  parents: EntityUid[];
}

export interface AuthorizationRequest {
  principal: EntityUid;
  action: EntityUid;
  resource: EntityUid;
  context: Record<string, CedarValueJson>;
  entities: EntityData[];
}

export interface AuthorizationDecision {
  allowed: boolean;
  reasons: string[];
  errors: string[];
}

/**
 * In-process Cedar authorization engine.
 *
 * Fail-closed: any error in policy parsing or evaluation results in DENY.
 * Per architecture §2 rule 10.
 */
export class CedarAuthEngine {
  private readonly policies: string;
  private readonly policiesValid: boolean;
  private readonly parseErrors: string[];

  constructor(policies: string) {
    this.policies = policies;

    // Validate policies at construction time
    const parseResult = checkParsePolicySet({
      staticPolicies: policies,
    });

    if (parseResult.type === 'success') {
      this.policiesValid = true;
      this.parseErrors = [];
    } else {
      this.policiesValid = false;
      this.parseErrors = parseResult.errors.map(
        (e: { message: string }) => e.message,
      );
    }
  }

  isAuthorized(request: AuthorizationRequest): AuthorizationDecision {
    // Fail-closed: if policies are invalid, always deny
    if (!this.policiesValid) {
      return {
        allowed: false,
        reasons: [],
        errors: [`Policy parse errors: ${this.parseErrors.join('; ')}`],
      };
    }

    try {
      const call: AuthorizationCall = {
        principal: {
          type: request.principal.type,
          id: request.principal.id,
        },
        action: {
          type: request.action.type,
          id: request.action.id,
        },
        resource: {
          type: request.resource.type,
          id: request.resource.id,
        },
        context: request.context,
        policies: { staticPolicies: this.policies },
        entities: request.entities.map((e) => ({
          uid: { type: e.uid.type, id: e.uid.id },
          attrs: e.attrs,
          parents: e.parents.map((p) => ({ type: p.type, id: p.id })),
        })),
      };

      const answer: AuthorizationAnswer = cedarIsAuthorized(call);

      if (answer.type === 'success') {
        return {
          allowed: answer.response.decision === 'allow',
          reasons: answer.response.diagnostics.reason,
          errors: answer.response.diagnostics.errors.map(
            (e: { error: { message: string } }) => e.error.message,
          ),
        };
      }

      // Fail-closed: evaluation errors → deny
      return {
        allowed: false,
        reasons: [],
        errors: answer.errors.map(
          (e: { message: string }) => e.message,
        ),
      };
    } catch (error: unknown) {
      // Fail-closed: unexpected errors → deny
      return {
        allowed: false,
        reasons: [],
        errors: [error instanceof Error ? error.message : 'Unknown Cedar error'],
      };
    }
  }
}
