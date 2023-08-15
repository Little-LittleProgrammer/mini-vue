const get = createGetter()

function createGetter() {
    return function get(target: object, key: string | symbol, receiver: object) {
        const res = Reflect.get(target, key, receiver);
        return res
    }
}

const set = createSetter()

function createSetter() {
    return function set(target: object, key: string | symbol, value: any, receiver: object) {
        const result = Reflect.set(target, key, value, receiver);
        return result
    }
}


export const mutableHandlers: ProxyHandler<object> = {
    get,
    set
}