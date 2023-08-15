import { isArray } from "@vue/shared";
import { Dep, createDep } from "./dep";

type KeyToDepMap = Map<any, Set<ReactiveEffect>>;

/**
 * 收集所有依赖的 WeakMap
 * 1. key 响应式对象
 * 2. value： map 对象
 *      key： 响应式对象的指定属性
 *      value： 指定对象的执行函数数组 set
 */
const targetMap = new WeakMap<any, KeyToDepMap>()

export function effect<T =any>(fn: () => T) {
    const _effect = new ReactiveEffect(fn);

    _effect.run()
}

export let activeEffect: ReactiveEffect | undefined;

export class ReactiveEffect<T = any>{
    constructor(public fn: () => T) {
    
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
    for (const effect of effects) {
        triggerEffect(effect)
    }
}

export function triggerEffect(effect: ReactiveEffect) {
    effect.run()
}