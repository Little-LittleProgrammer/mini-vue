import { extend, isArray } from "@vue/shared";
import { Dep, createDep } from "./dep";
import { ComputedRefImpl } from "./computed";

type KeyToDepMap = Map<any, Set<ReactiveEffect>>;

export type EffectScheduler = (...args: any[]) => any
 
export interface ReactiveEffectOptions {
    lazy?: boolean;
    scheduler?: (...args: any[]) => any
}

/**
 * 收集所有依赖的 WeakMap
 * 1. key 响应式对象
 * 2. value： map 对象
 *      key： 响应式对象的指定属性
 *      value： 指定对象的执行函数数组 set
 */
const targetMap = new WeakMap<any, KeyToDepMap>()

export function effect<T =any>(fn: () => T, options?: ReactiveEffectOptions) {
    const _effect = new ReactiveEffect(fn);

    if (options) {
        extend(_effect, options);
    }
    if (!options || !options.lazy) {
        _effect.run()  
    }
}

export let activeEffect: ReactiveEffect | undefined;

export class ReactiveEffect<T = any>{

    computed?: ComputedRefImpl<T>
    constructor(
        public fn: () => T,
        public scheduler: EffectScheduler | null = null
    ) {
    }
    run() {
        activeEffect = this;
        return this.fn()
    }
}

/**
 * 用于收集的依赖
 * @param target weakMap 的 key
 * @param key 代理对象的 key， 当依赖被触发时，需要根据该 key 获取
 */
export function track(target: object, key: unknown) {
    console.log('tarck, 依赖收集');
    if (!activeEffect) {
        return;
    }

    let depsMap = targetMap.get(target);
    if (!depsMap) {
        targetMap.set(target, (depsMap = new Map()))
    }

    let dep = depsMap.get(key);
    if (!dep) {
        depsMap.set(key, (dep = createDep()))
    }
    trackEffects(dep)

}

/**
 * 利用 dep 依次跟踪指定 key 的所有 effect
 */
export function trackEffects(dep: Dep) {
    dep.add(activeEffect!)
}

/**
 * 依赖触发的方法
 * @param target  weakMap 的 key
 * @param key 代理对象的 key， 当依赖被触发时，需要根据该 key 获取
 * @param newValue  新值
 * @param oldValue 旧值
 */
export function trigger(
    target: object,
    key?: unknown,
    newValue?: unknown
) { 
    console.log('trigger: 触发依赖');
    const depsMap = targetMap.get(target);
    if (!depsMap) return;

    const dep:Dep | undefined = depsMap.get(key);
    if (!dep) return;

    triggerEffects(dep)

}


/**
 * 依次触发  dep 中保存 的依赖
 */
export function triggerEffects(dep: Dep){
    const effects = isArray(dep) ? dep : [...dep]
    // 先执行 computed 的 effect，后执行不是 computed 的 effect，控制执行顺序。避免死循环
    for (const effect of effects) {
        if (effect.computed) {
            triggerEffect(effect)
        }
    }
    for (const effect of effects) {
        if (!effect.computed) {
            triggerEffect(effect)
        }
    }
}

export function triggerEffect(effect: ReactiveEffect) {
    if (effect.scheduler) {
        effect.scheduler()
    } else {
        effect.run()
    }
}