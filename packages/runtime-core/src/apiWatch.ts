import { EMPTY_OBJ, hasChanged, isObject } from '@vue/shared'
import { ReactiveEffect } from 'packages/reactivity/src/effect'
import { isReactive } from 'packages/reactivity/src/reactive'
import { queuePreFlushCb } from './scheduler'

/**
 * watch 配置项属性
 */
export interface WatchOptions<Immediate = boolean> {
	immediate?: Immediate
	deep?: boolean
}

/**
 * 指定的 watch 函数
 * @param source 监听的响应性数据
 * @param cb 回调函数
 * @param options 配置对象
 * @returns
 */
export function watch(source, cb: Function, options?: WatchOptions) {
	return doWatch(source as any, cb, options)
}

function doWatch(
	source,
	cb: Function,
	{ immediate, deep }: WatchOptions = EMPTY_OBJ
) {
	// 触发 getter 的指定函数
	let getter: () => any

	// 判断 source 的数据类型
	if (isReactive(source)) {
		// 指定 getter
		getter = () => source
		// 深度
		deep = true
	} else {
		getter = () => {}
	}

	// 存在回调函数和deep
	if (cb && deep) {
		// TODO
		const baseGetter = getter
		getter = () => traverse(baseGetter())
	}

	// 旧值
	let oldValue = {}
	// job 执行方法
	const job = () => {
		if (cb) {
			// watch(source, cb)
			const newValue = effect.run()
			if (deep || hasChanged(newValue, oldValue)) {
				cb(newValue, oldValue)
				oldValue = newValue
			}
		}
	}

	// 调度器
	let scheduler = () => queuePreFlushCb(job)

	const effect = new ReactiveEffect(getter, scheduler)

	if (cb) {
		if (immediate) {
            // immediate 情况下, oldValue = undefined
			job()
		} else {
            // 赋值old value, 不会触发 cb的执行
			oldValue = effect.run()
		}
	} else {
		effect.run()
	}

	return () => {
		effect.stop()
	}
}

/**
 * 深度遍历一个对象的所有嵌套属性，从而触发依赖收集
 * 
 * 这个函数的主要用途：
 * 1. 实现深度监听（deep watch）- 当watch选项中deep:true时被调用
 * 2. 确保对象的所有嵌套属性都被响应式系统追踪
 * 3. 通过主动访问每个属性触发它们的getter，从而触发依赖收集
 * 
 * 工作原理：
 * - 递归访问对象的每个属性和子属性
 * - 每次属性访问都会隐式触发Vue的track函数
 * - 使用Set防止循环引用导致的无限递归
 * 
 * @param value 要遍历的对象
 * @param seen 已访问对象的集合，用于防止循环引用
 * @returns 返回原始值，便于链式调用
 */
export function traverse(value: unknown, seen?: Set<unknown>) {
	// 如果不是对象类型，无需遍历，直接返回
	if (!isObject(value)) {
		return value
	}
	// 如果没有传入seen集合，则创建一个新的
	seen = seen || new Set()

	// 如果已经遍历过该值，避免循环引用导致的无限递归
	if (seen.has(value)) {
		return value
	}

	// 将当前对象添加到seen中，防止重复遍历
	seen.add(value)

	// 处理不同类型的集合
	if (Array.isArray(value)) {
		// 数组需要遍历每个元素
		for (let i = 0; i < value.length; i++) {
			// 访问数组元素触发track
			traverse(value[i], seen)
		}
	} else if (value instanceof Map) {
		// Map需要遍历所有的键和值
		value.forEach((val, key) => {
			// 访问Map的键和值都会触发依赖收集
			traverse(key, seen)
			traverse(val, seen)
		})
	} else if (value instanceof Set) {
		// Set需要遍历所有值
		value.forEach(val => {
			traverse(val, seen)
		})
	} else {
		// 普通对象遍历所有可枚举属性
		for (const key in value as object) {
			// 访问属性会触发getter，从而触发track操作将当前activeEffect收集为依赖
			// 递归调用traverse继续深度遍历子属性
			traverse((value as any)[key], seen)
		}
	}
	
	return value
}
