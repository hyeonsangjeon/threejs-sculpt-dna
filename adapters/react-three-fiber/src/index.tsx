import {
  forwardRef,
  useImperativeHandle,
  useLayoutEffect,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import { useFrame, type ThreeElements } from '@react-three/fiber';
import type { Object3D } from 'three';

export type FactoryOptions = Record<string, unknown>;

export type SculptDNARuntime = {
  nodes: Record<string, Object3D>;
  meshes: Record<string, Object3D>;
  instances: Record<string, Object3D>;
  sockets: Record<string, Object3D>;
  colliders: Record<string, unknown>;
  destructionGroups: Record<string, Object3D[]>;
  [key: string]: unknown;
};

export type StructuredFactoryResult = {
  root: Object3D;
  runtime?: Partial<SculptDNARuntime> & Record<string, unknown>;
  stats?: Record<string, unknown>;
  update?: (elapsedSeconds: number, deltaSeconds?: number) => void;
  dispose?: () => void;
  [key: string]: unknown;
};

export type SculptDNAFactory<TOptions extends FactoryOptions = FactoryOptions> = (
  options: TOptions,
) => Object3D | StructuredFactoryResult;

export type SculptDNAInstance = {
  root: Object3D;
  runtime: SculptDNARuntime;
  stats: Readonly<Record<string, unknown>>;
  source: Object3D | StructuredFactoryResult;
  update: (elapsedSeconds: number, deltaSeconds: number) => void;
  dispose: () => void;
};

export type SculptDNALifecycle = {
  onReady?: (instance: SculptDNAInstance) => void;
  onDispose?: (instance: SculptDNAInstance) => void;
};

type PrimitiveProps = Omit<ThreeElements['primitive'], 'object' | 'dispose'>;

export type SculptDNAAssetProps = PrimitiveProps & SculptDNALifecycle & {
  factory: SculptDNAFactory;
  options?: FactoryOptions;
  seed?: number | string;
  variant?: number | string;
  stage?: string;
  fallback?: ReactNode;
};

const EMPTY_RUNTIME_MAP = Object.freeze({}) as Record<string, never>;

function isRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

function isObject3D(value: unknown): value is Object3D {
  return isRecord(value) && value.isObject3D === true;
}

function objectMap(value: unknown): Record<string, Object3D> {
  if (!isRecord(value)) return EMPTY_RUNTIME_MAP;
  const entries = Object.entries(value).filter((entry): entry is [string, Object3D] => (
    isObject3D(entry[1])
  ));
  return Object.fromEntries(entries);
}

function destructionMap(value: unknown): Record<string, Object3D[]> {
  if (!isRecord(value)) return EMPTY_RUNTIME_MAP;
  const entries = Object.entries(value).map(([key, members]) => {
    if (!Array.isArray(members) || !members.every(isObject3D)) {
      throw new TypeError(`runtime.destructionGroups.${key} must contain Object3D values`);
    }
    return [key, members] as const;
  });
  return Object.fromEntries(entries);
}

function normalizeRuntime(value: unknown): SculptDNARuntime {
  const runtime = isRecord(value) ? value : {};
  return {
    ...runtime,
    nodes: objectMap(runtime.nodes),
    meshes: objectMap(runtime.meshes),
    instances: objectMap(runtime.instances),
    sockets: objectMap(runtime.sockets),
    colliders: isRecord(runtime.colliders) ? runtime.colliders : EMPTY_RUNTIME_MAP,
    destructionGroups: destructionMap(runtime.destructionGroups),
  };
}

function disposeTextureValues(
  value: unknown,
  disposed: Set<object>,
  visited: Set<object>,
): void {
  if (value === null || typeof value !== 'object') return;
  if (disposed.has(value) || visited.has(value)) return;
  if (isRecord(value) && value.isTexture === true && typeof value.dispose === 'function') {
    disposed.add(value);
    value.dispose();
    return;
  }
  visited.add(value);
  if (Array.isArray(value)) {
    for (const item of value) disposeTextureValues(item, disposed, visited);
    return;
  }
  if (!isRecord(value)) return;
  for (const item of Object.values(value)) {
    disposeTextureValues(item, disposed, visited);
  }
}

function disposeResource(value: unknown, disposed: Set<object>): void {
  if (!isRecord(value) || disposed.has(value) || typeof value.dispose !== 'function') return;
  disposed.add(value);
  value.dispose();
}

function disposeObject3DResources(root: Object3D): void {
  const disposed = new Set<object>();
  root.traverse((object) => {
    const candidate = object as Object3D & {
      geometry?: unknown;
      material?: unknown | unknown[];
      skeleton?: { boneTexture?: unknown };
      dispose?: () => void;
    };
    disposeResource(candidate.geometry, disposed);
    const materials = Array.isArray(candidate.material)
      ? candidate.material
      : candidate.material === undefined
        ? []
        : [candidate.material];
    for (const material of materials) {
      disposeTextureValues(material, disposed, new Set());
      disposeResource(material, disposed);
    }
    disposeResource(candidate.skeleton?.boneTexture, disposed);
    disposeResource(candidate, disposed);
  });
}

function canonicalize(value: unknown, path: string, seen: Set<object>): unknown {
  if (value === null || typeof value === 'string' || typeof value === 'boolean') {
    return value;
  }
  if (typeof value === 'number') {
    if (!Number.isFinite(value)) {
      throw new TypeError(`${path} must not contain a non-finite number`);
    }
    return value;
  }
  if (typeof value !== 'object') {
    throw new TypeError(`${path} must contain only JSON-compatible values`);
  }
  if (seen.has(value)) throw new TypeError(`${path} must not contain a cycle`);
  seen.add(value);
  try {
    if (Array.isArray(value)) {
      return value.map((item, index) => {
        if (item === undefined) {
          throw new TypeError(`${path}[${index}] must not be undefined`);
        }
        return canonicalize(item, `${path}[${index}]`, seen);
      });
    }
    const prototype = Object.getPrototypeOf(value);
    if (prototype !== Object.prototype && prototype !== null) {
      throw new TypeError(`${path} must contain only plain objects`);
    }
    const result: Record<string, unknown> = {};
    for (const key of Object.keys(value).sort()) {
      const item = (value as Record<string, unknown>)[key];
      if (item !== undefined) result[key] = canonicalize(item, `${path}.${key}`, seen);
    }
    return result;
  } finally {
    seen.delete(value);
  }
}

export function stableFactoryKey(options: FactoryOptions): string {
  return JSON.stringify(canonicalize(options, 'factory options', new Set()));
}

export function normalizeFactoryOutput(
  output: Object3D | StructuredFactoryResult,
): SculptDNAInstance {
  const structured = !isObject3D(output) && isRecord(output) && isObject3D(output.root)
    ? output as StructuredFactoryResult
    : null;
  const root = isObject3D(output) ? output : structured?.root;
  if (!root) {
    throw new TypeError('Sculpt DNA factory must return an Object3D or { root: Object3D }');
  }

  const embeddedRuntime = isRecord(root.userData) ? root.userData.sculptRuntime : null;
  const runtimeSource = structured?.runtime ?? embeddedRuntime;
  const runtime = normalizeRuntime(runtimeSource);
  const updateSource = typeof structured?.update === 'function'
    ? structured.update.bind(structured)
    : isRecord(runtimeSource) && typeof runtimeSource.update === 'function'
      ? (runtimeSource.update as NonNullable<StructuredFactoryResult['update']>)
        .bind(runtimeSource)
      : undefined;
  const disposeSource = typeof structured?.dispose === 'function'
    ? structured.dispose.bind(structured)
    : isRecord(runtimeSource) && typeof runtimeSource.dispose === 'function'
      ? (runtimeSource.dispose as NonNullable<StructuredFactoryResult['dispose']>)
        .bind(runtimeSource)
      : undefined;

  const statsSource = structured?.stats
    ?? (isRecord(root.userData) && isRecord(root.userData.sculptStats)
      ? root.userData.sculptStats
      : EMPTY_RUNTIME_MAP);
  let disposed = false;
  return {
    root,
    runtime,
    stats: Object.freeze({ ...statsSource }),
    source: output,
    update(elapsedSeconds, deltaSeconds) {
      if (!disposed && typeof updateSource === 'function') {
        updateSource(elapsedSeconds, deltaSeconds);
      }
    },
    dispose() {
      if (disposed) return;
      disposed = true;
      root.removeFromParent();
      if (disposeSource) disposeSource();
      else disposeObject3DResources(root);
    },
  };
}

function useLatest<T>(value: T) {
  const ref = useRef(value);
  ref.current = value;
  return ref;
}

export function useSculptDNA(
  factory: SculptDNAFactory,
  options: FactoryOptions,
  lifecycle: SculptDNALifecycle = {},
): SculptDNAInstance | null {
  const optionsKey = stableFactoryKey(options);
  const optionsRef = useLatest(options);
  const onReadyRef = useLatest(lifecycle.onReady);
  const onDisposeRef = useLatest(lifecycle.onDispose);
  const activeRef = useRef<SculptDNAInstance | null>(null);
  const [instance, setInstance] = useState<SculptDNAInstance | null>(null);

  useLayoutEffect(() => {
    const created = normalizeFactoryOutput(factory(optionsRef.current));
    activeRef.current = created;
    setInstance(created);
    try {
      onReadyRef.current?.(created);
    } catch (error) {
      activeRef.current = null;
      created.dispose();
      throw error;
    }
    return () => {
      if (activeRef.current === created) activeRef.current = null;
      created.dispose();
      onDisposeRef.current?.(created);
    };
  }, [factory, optionsKey, optionsRef, onReadyRef, onDisposeRef]);

  useFrame((state, deltaSeconds) => {
    activeRef.current?.update(state.clock.elapsedTime, deltaSeconds);
  });

  return instance;
}

export const SculptDNAAsset = forwardRef<SculptDNAInstance, SculptDNAAssetProps>(
  function SculptDNAAsset(
    {
      factory,
      options = EMPTY_RUNTIME_MAP,
      seed,
      variant,
      stage,
      fallback = null,
      onReady,
      onDispose,
      ...primitiveProps
    },
    ref,
  ) {
    const factoryOptions: FactoryOptions = { ...options };
    if (seed !== undefined) factoryOptions.seed = seed;
    if (variant !== undefined) factoryOptions.variant = variant;
    if (stage !== undefined) factoryOptions.stage = stage;
    const instance = useSculptDNA(factory, factoryOptions, { onReady, onDispose });
    useImperativeHandle(ref, () => instance as SculptDNAInstance, [instance]);
    if (!instance) return fallback;
    return <primitive {...primitiveProps} object={instance.root} dispose={null} />;
  },
);

export function bindSculptDNAFactory(factory: SculptDNAFactory) {
  return forwardRef<SculptDNAInstance, Omit<SculptDNAAssetProps, 'factory'>>(
    function BoundSculptDNAAsset(props, ref) {
      return <SculptDNAAsset {...props} factory={factory} ref={ref} />;
    },
  );
}
