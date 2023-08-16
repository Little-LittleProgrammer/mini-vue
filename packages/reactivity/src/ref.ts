import { hasChanged, isObject } from "@vue/shared"
import { Dep, createDep } from "./dep"
import { reactive, toReactive } from "./reactive"
import { activeEffect, trackEffects, triggerEffects } from "./effect"

export interface Ref<T = any> {
    value: T
}

export function ref(value?: unknown) {
    return createRef(value, false)
}

function createRef(rawValue:  unknown, shallow: boolean) {
    if (isRef(rawValue)) {
        return rawValue
    }

    return new RefImpl(rawValue, shallow)
}

class RefImpl<T> {
    private _value: T
    private _rawValue: T // 原值
    public dep?:Dep;
    public readonly __v_isRef = true
    constructor(value: T, public readonly __v_isShallow: boolean) {
        this._rawValue = value
        this._value = __v_isShallow ? value : toReactive(value)
    }

    get value() {
        trackRefValue(this)
        return this._value
    }

    set value(newValue) {
        if (hasChanged(newValue, this._rawValue)) {
            this._rawValue = newValue
            this._value = toReactive(newValue)
            triggerRefValue(this, newValue)
        }
        
    }
}

/**
 * 收集依赖
 */
export function trackRefValue(ref: RefImpl<any>) {
    if (activeEffect) {
        trackEffects(ref.dep || (ref.dep = createDep()))
    }
}

/**
 * 触发依赖
 */
export function triggerRefValue(ref: RefImpl<any>, newValue) {
    if (ref.dep) {
        triggerEffects(ref.dep)
    }
}

/**
 * 是否为 ref
 */
function isRef(r: any): r is Ref {
    return !!( r && r.__v_isRef === true)
}