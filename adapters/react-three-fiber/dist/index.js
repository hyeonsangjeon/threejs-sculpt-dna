import { jsx as _jsx } from "react/jsx-runtime";
import { forwardRef, useImperativeHandle, useLayoutEffect, useRef, useState, } from 'react';
import { useFrame } from '@react-three/fiber';
const EMPTY_RUNTIME_MAP = Object.freeze({});
function isRecord(value) {
    return value !== null && typeof value === 'object' && !Array.isArray(value);
}
function isObject3D(value) {
    return isRecord(value) && value.isObject3D === true;
}
function objectMap(value) {
    if (!isRecord(value))
        return EMPTY_RUNTIME_MAP;
    const entries = Object.entries(value).filter((entry) => (isObject3D(entry[1])));
    return Object.fromEntries(entries);
}
function destructionMap(value) {
    if (!isRecord(value))
        return EMPTY_RUNTIME_MAP;
    const entries = Object.entries(value).map(([key, members]) => {
        if (!Array.isArray(members) || !members.every(isObject3D)) {
            throw new TypeError(`runtime.destructionGroups.${key} must contain Object3D values`);
        }
        return [key, members];
    });
    return Object.fromEntries(entries);
}
function normalizeRuntime(value) {
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
function disposeTextureValues(value, disposed, visited) {
    if (value === null || typeof value !== 'object')
        return;
    if (disposed.has(value) || visited.has(value))
        return;
    if (isRecord(value) && value.isTexture === true && typeof value.dispose === 'function') {
        disposed.add(value);
        value.dispose();
        return;
    }
    visited.add(value);
    if (Array.isArray(value)) {
        for (const item of value)
            disposeTextureValues(item, disposed, visited);
        return;
    }
    if (!isRecord(value))
        return;
    for (const item of Object.values(value)) {
        disposeTextureValues(item, disposed, visited);
    }
}
function disposeResource(value, disposed) {
    if (!isRecord(value) || disposed.has(value) || typeof value.dispose !== 'function')
        return;
    disposed.add(value);
    value.dispose();
}
function disposeObject3DResources(root) {
    const disposed = new Set();
    root.traverse((object) => {
        const candidate = object;
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
function canonicalize(value, path, seen) {
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
    if (seen.has(value))
        throw new TypeError(`${path} must not contain a cycle`);
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
        const result = {};
        for (const key of Object.keys(value).sort()) {
            const item = value[key];
            if (item !== undefined)
                result[key] = canonicalize(item, `${path}.${key}`, seen);
        }
        return result;
    }
    finally {
        seen.delete(value);
    }
}
export function stableFactoryKey(options) {
    return JSON.stringify(canonicalize(options, 'factory options', new Set()));
}
export function normalizeFactoryOutput(output) {
    const structured = !isObject3D(output) && isRecord(output) && isObject3D(output.root)
        ? output
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
            ? runtimeSource.update
                .bind(runtimeSource)
            : undefined;
    const disposeSource = typeof structured?.dispose === 'function'
        ? structured.dispose.bind(structured)
        : isRecord(runtimeSource) && typeof runtimeSource.dispose === 'function'
            ? runtimeSource.dispose
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
            if (disposed)
                return;
            disposed = true;
            root.removeFromParent();
            if (disposeSource)
                disposeSource();
            else
                disposeObject3DResources(root);
        },
    };
}
function useLatest(value) {
    const ref = useRef(value);
    ref.current = value;
    return ref;
}
export function useSculptDNA(factory, options, lifecycle = {}) {
    const optionsKey = stableFactoryKey(options);
    const optionsRef = useLatest(options);
    const onReadyRef = useLatest(lifecycle.onReady);
    const onDisposeRef = useLatest(lifecycle.onDispose);
    const activeRef = useRef(null);
    const [instance, setInstance] = useState(null);
    useLayoutEffect(() => {
        const created = normalizeFactoryOutput(factory(optionsRef.current));
        activeRef.current = created;
        setInstance(created);
        try {
            onReadyRef.current?.(created);
        }
        catch (error) {
            activeRef.current = null;
            created.dispose();
            throw error;
        }
        return () => {
            if (activeRef.current === created)
                activeRef.current = null;
            created.dispose();
            onDisposeRef.current?.(created);
        };
    }, [factory, optionsKey, optionsRef, onReadyRef, onDisposeRef]);
    useFrame((state, deltaSeconds) => {
        activeRef.current?.update(state.clock.elapsedTime, deltaSeconds);
    });
    return instance;
}
export const SculptDNAAsset = forwardRef(function SculptDNAAsset({ factory, options = EMPTY_RUNTIME_MAP, seed, variant, stage, fallback = null, onReady, onDispose, ...primitiveProps }, ref) {
    const factoryOptions = { ...options };
    if (seed !== undefined)
        factoryOptions.seed = seed;
    if (variant !== undefined)
        factoryOptions.variant = variant;
    if (stage !== undefined)
        factoryOptions.stage = stage;
    const instance = useSculptDNA(factory, factoryOptions, { onReady, onDispose });
    useImperativeHandle(ref, () => instance, [instance]);
    if (!instance)
        return fallback;
    return _jsx("primitive", { ...primitiveProps, object: instance.root, dispose: null });
});
export function bindSculptDNAFactory(factory) {
    return forwardRef(function BoundSculptDNAAsset(props, ref) {
        return _jsx(SculptDNAAsset, { ...props, factory: factory, ref: ref });
    });
}
//# sourceMappingURL=index.js.map