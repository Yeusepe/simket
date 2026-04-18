import { describe, it, expect } from 'vitest';

describe('@simket/recommend-service', () => {
  it('re-exports the recommendation pipeline surface', async () => {
    const mod = await import('./index.js');

    expect(mod).toBeDefined();
    expect(mod.PipelineExecutor).toBeDefined();
    expect(mod.PopularCandidateSource).toBeDefined();
    expect(mod.TakeRateBoostRanker).toBeDefined();
    expect(mod.DiversityPostProcessor).toBeDefined();
  });
});
