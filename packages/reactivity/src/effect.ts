import { extend, isArray } from '@vue/shared'
import { ComputedRefImpl } from './computed'
import { createDep, Dep } from './dep'

export type EffectScheduler = (...args: any[]) => any

type KeyToDepMap = Map<any, Dep>
/**
 * 收集所有依赖的 WeakMap 实例：
 * 1. `key`：响应性对象
 * 2. `value`：`Map` 对象
 * 		1. `key`：响应性对象的指定属性
 * 		2. `value`：指定对象的指定属性的 执行函数
 */
const targetMap = new WeakMap<any, KeyToDepMap>()
/**
 * 用于收集依赖的方法
 * @param target WeakMap 的 key
 * @param key 代理对象的 key，当依赖被触发时，需要根据该 key 获取
 */
export function track(target: object, key: unknown) {
  // 如果当前不存在执行函数，则直接 return
  if (!activeEffect) return
  // 尝试从 targetMap 中，根据 target 获取 map
  let depsMap = targetMap.get(target)
  // 如果获取到的 map 不存在，则生成新的 map 对象，并把该对象赋值给对应的 value
  if (!depsMap) {
    targetMap.set(target, (depsMap = new Map()))
  }
  // 获取指定 key 的 dep
  let dep = depsMap.get(key)
  // 如果 dep 不存在，则生成一个新的 dep，并放入到 depsMap 中
  if (!dep) {
    depsMap.set(key, (dep = createDep()))
  }

  trackEffects(dep)
}

/**
 * 利用 dep 依次跟踪指定 key 的所有 effect
 * @param dep
 */
export function trackEffects(dep: Dep) {
  // activeEffect! ： 断言 activeEffect 不为 null
  dep.add(activeEffect!)
}

/**
 * 触发依赖的方法
 * @param target WeakMap 的 key
 * @param key 代理对象的 key，当依赖被触发时，需要根据该 key 获取
 */
export function trigger(target: object, key?: unknown) {
  // 依据 target 获取存储的 map 实例
  const depsMap = targetMap.get(target)
  // 如果 map 不存在，则直接 return
  if (!depsMap) {
    return
  }
  // 依据指定的 key，获取 dep 实例
  let dep: Dep | undefined = depsMap.get(key)
  // dep 不存在则直接 return
  if (!dep) {
    return
  }
  // 触发 dep
  triggerEffects(dep)
}

/**
 * 依次触发 dep 中保存的依赖
 */
export function triggerEffects(dep: Dep) {
  // 把 dep 构建为一个数组
  const effects = isArray(dep) ? dep : [...dep]
  // 依次触发
  // for (const effect of effects) {
  // 	triggerEffect(effect)
  // }

  // 不再依次触发，而是先触发所有的计算属性依赖，再触发所有的非计算属性依赖
  // 这样分开处理的原因：
  // 1. 确保计算属性优先更新 - 当一个值变化时，依赖此值的计算属性应该先更新
  // 2. 数据一致性 - 确保其他effect（如渲染函数）使用的是最新计算出的值
  // 3. 避免"脏读" - 防止普通effect读取到过时的计算属性值
  // 4. 减少重复计算 - 如果先执行普通effect，可能导致计算属性被多次触发
  // 5. 性能优化 - 符合Vue的响应式系统设计原则，确保依赖关系正确传播
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

/**
 * 触发指定的依赖
 */
export function triggerEffect(effect: ReactiveEffect) {
  // scheduler（调度器）的主要用途：
  // 1. 控制副作用函数的执行时机，允许延迟、异步或有条件地执行
  // 2. 对频繁触发的副作用进行批处理和去重，提高性能
  // 3. 实现计算属性的懒计算特性
  // 4. 支持 watch 的防抖和节流功能
  // 5. 在Vue组件更新中，用于协调多个组件的渲染顺序
  if (effect.scheduler) {
    // 如果effect有调度器，优先使用调度器来间接执行副作用
    effect.scheduler()
  } else {
    // 没有调度器时直接运行副作用函数
    effect.run()
  }
}

/**
 * 单例的，当前的 effect
 */
export let activeEffect: ReactiveEffect | undefined

/**
 * 响应性触发依赖时的执行类
 */
export class ReactiveEffect<T = any> {
  /**
   * 存在该属性，则表示当前的 effect 为计算属性的 effect
   */
  computed?: ComputedRefImpl<T>

  constructor(
    public fn: () => T,
    public scheduler: EffectScheduler | null = null
  ) {}

  run() {
    // 为 activeEffect 赋值
    activeEffect = this

    // 执行 fn 函数
    return this.fn()
  }

  stop() {}
}

export interface ReactiveEffectOptions {
  lazy?: boolean
  scheduler?: EffectScheduler
}

/**
 * effect 函数
 * @param fn 执行方法
 * @returns 以 ReactiveEffect 实例为 this 的执行函数
 */
export function effect<T = any>(fn: () => T, options?: ReactiveEffectOptions) {
  // 生成 ReactiveEffect 实例
  const _effect = new ReactiveEffect(fn)

  // 存在 options，则合并配置对象
  if (options) {
    extend(_effect, options)
  }

  if (!options || !options.lazy) {
    // 执行 run 函数
    _effect.run()
  }
}
