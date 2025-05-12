import { track, trigger } from './effect'
import { isObject } from '@vue/shared'
import { toReactive } from './reactive'

/**
 * getter 回调方法
 */
const get = createGetter()

/**
 * 创建 getter 回调方法
 */
function createGetter() {
	return function get(target: object, key: string | symbol, receiver: object) {
		// 利用 Reflect 得到返回值
		const res = Reflect.get(target, key, receiver)
		// 收集依赖
		track(target, key)
		// 如果结果是对象，则将其转换为响应式对象再返回
		return isObject(res) ? toReactive(res) : res
	}
}

/**
 * setter 回调方法
 */
const set = createSetter()

/**
 * 创建 setter 回调方法
 */
function createSetter() {
	return function set(
		target: object,
		key: string | symbol,
		value: unknown,
		receiver: object
	) {
		// 利用 Reflect.set 设置新值
		const result = Reflect.set(target, key, value, receiver)
		// 触发依赖
		trigger(target, key)
		return result
	}
}

/**
 * 响应性的 handler
 */
export const mutableHandlers: ProxyHandler<object> = {
	get,
	set
}
