import type { Component, ComponentClass } from 'react';

type EffectDestructor = undefined | (() => void);

type EffectDepsFn = undefined | (() => any[]);

type EffectDeps = undefined | any[] | EffectDepsFn;

type EffectDescriptor = {
    effectFn: () => EffectDestructor;
    deps: EffectDeps;
    prevDeps: undefined | any[];
    destructor: EffectDestructor;
}

const STATIC_EFFECTS = Symbol("static_effects");
const DYNAMIC_EFFECTS = Symbol("dynamic_effects");

let componentInstance: Component<any> | null = null;
let isInConstructor = false;
let isInRender = false;
let tempEffectsList: EffectDescriptor[] = [];
let effectIdx = 0;

export function classEffect(effectFn: () => EffectDestructor, deps: EffectDeps): void {
    if (isInRender && componentInstance) {
        const effectDescriptors = componentInstance[DYNAMIC_EFFECTS];
        const effectDescriptor = effectDescriptors[effectIdx++];

        if (!effectDescriptor) {
            effectDescriptors.push({
                effectFn,
                deps,
                prevDeps: undefined,
                destructor: undefined
            });
        } else {
            effectDescriptor.effectFn = effectFn;
            effectDescriptor.deps = deps;
        }
    } else if (isInConstructor) {
        if (Array.isArray(deps)) {
            throw new Error(
                "Can use array dependency list for 'classEffect()' only in 'render()' method"
            );
        }

        tempEffectsList.push({
            effectFn,
            deps,
            prevDeps: undefined,
            destructor: undefined
        });
    } else {
        throw new Error(
            "'classEffect()' should be used from class wrapped in 'withEffects()' and only from 'render()' method or constructor"
        )
    }
}

export function withEffects<T extends ComponentClass<any>>(Component: T): T {
    // @ts-expect-error
    return class WithEffects extends Component {
        private declare [STATIC_EFFECTS]: EffectDescriptor[];
        private declare [DYNAMIC_EFFECTS]: EffectDescriptor[];

        static displayName = `withEffects(${Component.displayName || Component.name})`

        constructor(props, context) {
            try {
                isInConstructor = true;

                super(props, context);

                this[STATIC_EFFECTS] = tempEffectsList;
                this[DYNAMIC_EFFECTS] = [];
            } finally {
                tempEffectsList = [];
                isInConstructor = false;
            }
        }

        componentDidMount() {
            super.componentDidMount?.();

            this[STATIC_EFFECTS].forEach((eff) => {
                const deps = (eff.deps as EffectDepsFn)?.();

                eff.destructor?.();

                const destructor = eff.effectFn();

                eff.prevDeps = deps;
                eff.destructor = destructor;
            });

            this[DYNAMIC_EFFECTS].forEach((eff) => {
                const deps = Array.isArray(eff.deps) ? eff.deps : eff.deps?.();

                eff.destructor?.();

                const destructor = eff.effectFn();

                eff.prevDeps = deps;
                eff.destructor = destructor;
            });
        }

        componentDidUpdate(prevProps, prevState, snapshot) {
            super.componentDidUpdate?.(prevProps, prevState, snapshot);

            this[STATIC_EFFECTS].forEach((eff) => {
                const deps = (eff.deps as EffectDepsFn)?.();

                if (!deps || !equals(deps, eff.prevDeps!)) {
                    eff.destructor?.();

                    const destructor = eff.effectFn();

                    eff.prevDeps = deps;
                    eff.destructor = destructor;
                }
            });

            this[DYNAMIC_EFFECTS].forEach((eff) => {
                const deps = Array.isArray(eff.deps) ? eff.deps : eff.deps?.();

                if (!deps || !equals(deps, eff.prevDeps!)) {
                    eff.destructor?.();

                    const destructor = eff.effectFn();

                    eff.prevDeps = deps;
                    eff.destructor = destructor;
                }
            });
        }

        componentWillUnmount(): void {
            super.componentWillUnmount?.();

            this[STATIC_EFFECTS].forEach((eff) => {
                eff.destructor?.();
                eff.destructor = undefined;
            });

            this[DYNAMIC_EFFECTS].forEach((eff) => {
                eff.destructor?.();
                eff.destructor = undefined;
            });
        }

        render() {
            effectIdx = 0;
            isInRender = true;
            componentInstance = this;

            try {
                return super.render();
            } finally {
                isInRender = false;
                componentInstance = null;
            }
        }
    };
}

function equals<T extends any[]>(prev: T, next: T): boolean {
    if (prev === next) return true;

    if (prev.length !== next.length) return false;

    for (let i = 0; i < prev.length; i++) {
        if (prev[i] !== next[i]) return false;
    }

    return true;
}
