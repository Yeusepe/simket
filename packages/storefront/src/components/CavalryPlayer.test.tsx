/**
 * Purpose: Verify the Cavalry player renderer lifecycle in the storefront.
 * Governing docs:
 *   - docs/architecture.md (§2 rich text = TipTap, §3 client apps)
 *   - docs/domain-model.md (§4.1 Product description)
 * External references:
 *   - https://cavalry.studio/docs/web-player/
 *   - https://cavalry.studio/docs/web-player/api/
 *   - https://heroui.com/react/llms.txt
 * Tests:
 *   - packages/storefront/src/components/CavalryPlayer.test.tsx
 */
import { render, screen, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { CavalryPlayer } from './CavalryPlayer';

function createDeferred<T>() {
  let resolve!: (value: T) => void;
  let reject!: (reason?: unknown) => void;
  const promise = new Promise<T>((resolvePromise, rejectPromise) => {
    resolve = resolvePromise;
    reject = rejectPromise;
  });

  return { promise, resolve, reject };
}

describe('CavalryPlayer', () => {
  afterEach(() => {
    vi.restoreAllMocks();
    delete (window as Window & { __cavalryTestInit?: unknown }).__cavalryTestInit;
  });

  it('renders a player container div', () => {
    const deferred = createDeferred<never>();

    const { container } = render(
      <CavalryPlayer
        config={{ src: 'https://cdn.example.com/animations/product-demo.cv' }}
        loadModule={() => deferred.promise}
      />,
    );

    expect(container.querySelector('[data-cavalry-player-container]')).toBeInTheDocument();
  });

  it('shows a loading state while the runtime is loading', () => {
    const deferred = createDeferred<unknown>();

    render(
      <CavalryPlayer
        config={{ src: 'https://cdn.example.com/animations/product-demo.cv' }}
        loadModule={() => deferred.promise as Promise<never>}
      />,
    );

    expect(screen.getByText('Loading Cavalry animation…')).toBeInTheDocument();
  });

  it('passes the scene config to the player initialisation flow', async () => {
    const writeFile = vi.fn();
    const setLoop = vi.fn();
    const play = vi.fn();
    const renderFrame = vi.fn();
    const makeWithPath = vi.fn(() => ({
      getSceneResolution: () => ({ width: 640, height: 360 }),
      render: renderFrame,
      setLoop,
      play,
      stop: vi.fn(),
      isPlaying: vi.fn(() => false),
      tick: vi.fn(() => ({ frameChanged: false })),
      toggle: vi.fn(),
    }));
    const makeWebGLSurfaceFromElement = vi.fn(() => ({}));
    const loadModule = vi.fn().mockResolvedValue({
      FS: { writeFile },
      Cavalry: {
        MakeWithPath: makeWithPath,
      },
      makeWebGLSurfaceFromElement,
    });
    const fetchSpy = vi.spyOn(globalThis, 'fetch').mockResolvedValue({
      arrayBuffer: vi.fn().mockResolvedValue(new ArrayBuffer(16)),
    } as never);

    render(
      <CavalryPlayer
        config={{
          src: 'https://cdn.example.com/animations/product-demo.cv',
          width: 1280,
          height: 720,
          autoplay: true,
          loop: false,
          controls: true,
        }}
        loadModule={loadModule}
      />,
    );

    await waitFor(() => {
      expect(loadModule).toHaveBeenCalled();
      expect(fetchSpy).toHaveBeenCalledWith(
        'https://cdn.example.com/animations/product-demo.cv',
      );
      expect(writeFile).toHaveBeenCalledWith(
        'scene.cv',
        expect.any(Uint8Array),
      );
      expect(makeWithPath).toHaveBeenCalledWith('scene.cv');
      expect(makeWebGLSurfaceFromElement).toHaveBeenCalledWith(
        expect.any(HTMLCanvasElement),
        1280,
        720,
      );
      expect(setLoop).toHaveBeenCalledWith(false);
      expect(renderFrame).toHaveBeenCalled();
      expect(play).toHaveBeenCalled();
    });

    expect(screen.getByRole('button', { name: 'Pause animation' })).toBeInTheDocument();
  });

  it('stops playback on unmount', async () => {
    const stop = vi.fn();
    const loadModule = vi.fn().mockResolvedValue({
      FS: { writeFile: vi.fn() },
      Cavalry: {
        MakeWithPath: vi.fn(() => ({
          getSceneResolution: () => ({ width: 640, height: 360 }),
          render: vi.fn(),
          setLoop: vi.fn(),
          play: vi.fn(),
          stop,
          isPlaying: vi.fn(() => false),
          tick: vi.fn(() => ({ frameChanged: false })),
          toggle: vi.fn(),
        })),
      },
      makeWebGLSurfaceFromElement: vi.fn(() => ({})),
    });
    vi.spyOn(globalThis, 'fetch').mockResolvedValue({
      arrayBuffer: vi.fn().mockResolvedValue(new ArrayBuffer(8)),
    } as never);

    const { unmount } = render(
      <CavalryPlayer
        config={{
          src: 'https://cdn.example.com/animations/product-demo.cv',
          autoplay: true,
        }}
        loadModule={loadModule}
      />,
    );

    await waitFor(() => {
      expect(loadModule).toHaveBeenCalled();
    });

    unmount();

    expect(stop).toHaveBeenCalled();
  });
});
