# Language Style And Documentation

## 1. Style precedence

1. Local repo docs and conventions (this suite, architecture docs)
2. Surrounding package precedent
3. [Google TypeScript Style Guide](https://google.github.io/styleguide/tsguide.html)
4. [Google JavaScript Style Guide](https://google.github.io/styleguide/jsguide.html)
5. [Google Markdown Style Guide](https://google.github.io/styleguide/docguide/style.html)

## 2. Local rules

- TypeScript-first for all runtime code
- ES modules only (`import`/`export`, no `require`, no namespaces)
- Named exports by default (no default exports for first-party modules)
- Responsibility-based filenames
- No vague `helpers`, `misc`, or `utils` modules
- Document constraints and reasoning, not obvious code
- Keep docs portable and scrubbed of machine-local details
- `const` and `let` only, no `var`
- One variable per declaration
- UTF-8 encoding, spaces not tabs

## 3. Naming guidance

Prefer names by responsibility:

- `resolve-product-pricing.ts`
- `validate-checkout-bundle.ts`
- `sync-typesense-index.ts`
- `process-collaboration-split.ts`
- `verify-stripe-webhook.ts`

Avoid names by implementation trivia:

- `utils.ts`
- `manager2.ts`
- `data-handler.ts`
- `helpers.ts`
- `service.ts`

## 4. Export rules

- Prefer named exports over default exports for first-party modules
- Keep exported API surface small
- Use `import type` for type-only imports
- Named imports for small sets, namespace imports for many related symbols
- Avoid import aliasing unless resolving genuine name collisions

## 5. Object shapes over arrays

Return object shapes, not array positions, for multiple return values:

```typescript
// Good
return { product, pricing, availability };

// Bad
return [product, pricing, availability];
```

## 6. Comment rules

Comments exist to explain:

- why a rule or constraint exists
- security reasoning that would be hard to recover from context
- non-obvious domain invariants

Comments do NOT exist to:

- restate what the syntax already says
- mark sections like `// --- helpers ---`
- disable linting without documented reason

## 7. Markdown rules

- One H1 per file
- Clear H2+ section hierarchy
- Fenced code blocks with language identifiers
- Informative link text (not "click here")
- Repo-relative paths for internal references
- Mermaid for all diagrams (never ASCII art)

## 8. Bebop schema style

- Use PascalCase for message and enum names
- Use camelCase for field names
- Group related messages in the same `.bop` file
- Add doc comments for non-obvious fields
- Keep backward-compatible evolution: add fields, never remove or renumber

## 9. Portable artefacts

Do NOT commit:

- absolute paths (`C:\Users\...`, `/home/...`)
- usernames or machine names
- OneDrive, Downloads, or Desktop references
- workstation-specific URLs
- IDE-specific configuration that encodes machine layout

This applies to source code, docs, fixtures, examples, and tests.
