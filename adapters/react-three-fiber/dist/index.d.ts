import { type ReactNode } from 'react';
import { type ThreeElements } from '@react-three/fiber';
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
export type SculptDNAFactory<TOptions extends FactoryOptions = FactoryOptions> = (options: TOptions) => Object3D | StructuredFactoryResult;
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
export declare function stableFactoryKey(options: FactoryOptions): string;
export declare function normalizeFactoryOutput(output: Object3D | StructuredFactoryResult): SculptDNAInstance;
export declare function useSculptDNA(factory: SculptDNAFactory, options: FactoryOptions, lifecycle?: SculptDNALifecycle): SculptDNAInstance | null;
export declare const SculptDNAAsset: import("react").ForwardRefExoticComponent<Omit<SculptDNAAssetProps, "ref"> & import("react").RefAttributes<SculptDNAInstance>>;
export declare function bindSculptDNAFactory(factory: SculptDNAFactory): import("react").ForwardRefExoticComponent<Omit<Omit<SculptDNAAssetProps, "factory">, "ref"> & import("react").RefAttributes<SculptDNAInstance>>;
export {};
//# sourceMappingURL=index.d.ts.map