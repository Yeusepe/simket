/**
 * Purpose: Render Cavalry Web Player scenes inside TipTap and storefront content.
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
import { useEffect, useMemo, useRef, useState } from 'react';
import { Button, Card, Spinner } from '@heroui/react';
import { NodeViewWrapper, type ReactNodeViewProps } from '@tiptap/react';
import {
  buildCavalryPlayerConfig,
  type CavalryEmbedConfig,
} from '../services/cavalry-service';

const DEFAULT_CAVALRY_MODULE_URL = '/cavalry-web-player/CavalryWasm.js';
const DEFAULT_CAVALRY_WASM_BASE_URL = '/cavalry-web-player/wasm-lib';

interface CavalryRuntimeOptions {
  readonly moduleUrl?: string;
  readonly wasmBaseUrl?: string;
}

interface CavalrySceneResolution {
  readonly width: number;
  readonly height: number;
}

interface CavalryPlaybackStatus {
  readonly frameChanged: boolean;
  readonly currentFrame?: number;
}

interface CavalryPlayerInstance {
  getSceneResolution(): CavalrySceneResolution;
  render(surface: unknown): void;
  setLoop(loop: boolean): void;
  play?(): void;
  stop?(): void;
  toggle?(): void;
  isPlaying?(): boolean;
  tick?(surface: unknown, timestampMs: number): CavalryPlaybackStatus;
}

interface CavalryRuntimeModule {
  readonly FS: {
    writeFile(path: string, data: Uint8Array): void;
  };
  readonly Cavalry: {
    MakeWithPath(path: string): CavalryPlayerInstance;
  };
  makeWebGLSurfaceFromElement(
    canvas: HTMLCanvasElement,
    width: number,
    height: number,
  ): unknown;
}

type CavalryRuntimeLoader = (
  options?: CavalryRuntimeOptions,
) => Promise<CavalryRuntimeModule>;

interface CavalryModuleFactory {
  (
    options: Readonly<{
      locateFile: (path: string) => string;
      print?: (text: string) => void;
      printErr?: (text: string) => void;
    }>,
  ): Promise<CavalryRuntimeModule>;
}

interface CavalryModuleImport {
  default: CavalryModuleFactory;
}

export interface CavalryPlayerProps {
  config: CavalryEmbedConfig;
  moduleUrl?: string;
  wasmBaseUrl?: string;
  loadModule?: CavalryRuntimeLoader;
}

export async function loadCavalryModule(
  options: CavalryRuntimeOptions = {},
): Promise<CavalryRuntimeModule> {
  const moduleUrl = options.moduleUrl ?? DEFAULT_CAVALRY_MODULE_URL;
  const wasmBaseUrl = options.wasmBaseUrl ?? DEFAULT_CAVALRY_WASM_BASE_URL;
  const importedModule = (await import(
    /* @vite-ignore */ moduleUrl
  )) as CavalryModuleImport;

  return importedModule.default({
    locateFile: (path) => `${wasmBaseUrl}/${path}`,
    printErr: (text) => console.error(text),
  });
}

export function CavalryPlayer({
  config,
  moduleUrl,
  wasmBaseUrl,
  loadModule = loadCavalryModule,
}: CavalryPlayerProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const playerRef = useRef<CavalryPlayerInstance | null>(null);
  const animationFrameRef = useRef<number | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isPlaying, setIsPlaying] = useState(false);
  const playerConfig = useMemo(
    () => buildCavalryPlayerConfig(config),
    [config],
  );

  useEffect(() => {
    let isDisposed = false;

    const cancelPlaybackLoop = () => {
      if (animationFrameRef.current !== null) {
        cancelAnimationFrame(animationFrameRef.current);
        animationFrameRef.current = null;
      }
    };

    const stopPlayback = () => {
      cancelPlaybackLoop();
      playerRef.current?.stop?.();
      setIsPlaying(false);
    };

    const initialisePlayer = async () => {
      try {
        setIsLoading(true);
        setErrorMessage(null);

        const runtimeModule = await loadModule({ moduleUrl, wasmBaseUrl });

        if (isDisposed) {
          return;
        }

        const response = await fetch(playerConfig.src);

        if ('ok' in response && !response.ok) {
          throw new Error(`Failed to fetch scene (${response.status})`);
        }

        const sceneData = await response.arrayBuffer();

        if (isDisposed) {
          return;
        }

        runtimeModule.FS.writeFile('scene.cv', new Uint8Array(sceneData));

        const player = runtimeModule.Cavalry.MakeWithPath('scene.cv');
        const canvas = canvasRef.current;

        if (!canvas) {
          throw new Error('Missing Cavalry canvas container.');
        }

        const sceneResolution = player.getSceneResolution();
        const width = config.width ?? sceneResolution.width;
        const height = config.height ?? sceneResolution.height;

        canvas.width = width;
        canvas.height = height;

        const surface = runtimeModule.makeWebGLSurfaceFromElement(
          canvas,
          width,
          height,
        );

        player.setLoop(playerConfig.options.loop);
        player.render(surface);
        playerRef.current = player;

        const runPlaybackLoop = () => {
          const tick = (timestamp: number) => {
            if (isDisposed || !player.isPlaying?.()) {
              animationFrameRef.current = null;
              return;
            }

            player.tick?.(surface, timestamp);
            animationFrameRef.current = requestAnimationFrame(tick);
          };

          cancelPlaybackLoop();
          animationFrameRef.current = requestAnimationFrame(tick);
        };

        if (playerConfig.options.autoplay && player.play) {
          player.play();
          setIsPlaying(true);
          runPlaybackLoop();
        }

        if (!isDisposed) {
          setIsLoading(false);
        }
      } catch (error) {
        if (isDisposed) {
          return;
        }

        stopPlayback();
        setErrorMessage(
          error instanceof Error
            ? error.message
            : 'Unable to load the Cavalry animation.',
        );
        setIsLoading(false);
      }
    };

    void initialisePlayer();

    return () => {
      isDisposed = true;
      stopPlayback();
    };
  }, [config.height, config.width, loadModule, moduleUrl, playerConfig, wasmBaseUrl]);

  const handleTogglePlayback = () => {
    const player = playerRef.current;

    if (!player?.toggle) {
      return;
    }

    player.toggle();

    const nextIsPlaying = player.isPlaying?.() ?? !isPlaying;
    setIsPlaying(nextIsPlaying);
  };

  return (
    <Card className="cavalry-player">
      <Card.Content className="space-y-4 p-4">
        {isLoading ? (
          <div className="flex items-center gap-3 text-default-600">
            <Spinner size="sm" />
            <span>Loading Cavalry animation…</span>
          </div>
        ) : null}
        {errorMessage ? (
          <div
            className="rounded-lg border border-danger-200 bg-danger-50 px-3 py-2 text-sm text-danger"
            role="alert"
          >
            {errorMessage}
          </div>
        ) : null}
        <div
          className="overflow-hidden rounded-lg border border-default-200 bg-content2"
          data-cavalry-player-container
        >
          <canvas
            ref={canvasRef}
            aria-label="Cavalry animation"
            className="block h-auto max-w-full"
          />
        </div>
      </Card.Content>
      {playerConfig.options.controls && !errorMessage ? (
        <Card.Footer className="px-4 pb-4 pt-0">
          <Button onPress={handleTogglePlayback} variant="secondary">
            {isPlaying ? 'Pause animation' : 'Play animation'}
          </Button>
        </Card.Footer>
      ) : null}
    </Card>
  );
}

export function CavalryPlayerNodeView({
  node,
}: ReactNodeViewProps<HTMLDivElement>) {
  return (
    <NodeViewWrapper className="cavalry-embed-node">
      <CavalryPlayer config={node.attrs as CavalryEmbedConfig} />
    </NodeViewWrapper>
  );
}
