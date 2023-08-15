import { mutableHandlers } from "./baseHandles";

export const reactiveMap = new WeakMap<object, any>()

function createReactiveObject(target: object, baseHandlers: ProxyHandler<any>, proxyMap: WeakMap<object, any>) {
     
    const existingProxy = proxyMap.get(target);
    if (existingProxy) {
        return existingProxy
    }
    const proxy = new Proxy(target, baseHandlers);
    proxyMap.set(target, proxy)
    return proxy
}

export function reactive(target: object) {
    return createReactiveObject(target, mutableHandlers, reactiveMap)
}