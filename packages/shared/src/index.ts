export * from './shapeFlags'

export function isString(val: unknown): val is string {
    return toString.call(val) === `[object String]`
}

export function isArray(target: unknown): target is Array<any> {
    return Array.isArray(target)
}

export function isObject(val: unknown): val is Object {
    return val !== null && typeof val === 'object'
}

// 对比值是否发生改变
export const hasChanged = (value: any, oldValue: any): boolean => {
    return !Object.is(value, oldValue)
}
  
export function isFunction(val: unknown): val is Function   {
    return typeof val === 'function'
}

export const extend = Object.assign


export const EMPTY_OBJ: {readonly [key: string]: any} = {}

const onReg = /^on[^a-z]/

export const isOn = (key: string) => {
    return onReg.test(key)
}