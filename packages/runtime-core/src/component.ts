import { ReactiveEffect } from "@vue/reactivity";
import { VNode } from "./vnode";
import { NOOP, isFunction, isObject } from "@vue/shared";
import { reactive } from "@vue/reactivity";
import { onBeforeMount, onMounted } from "./apiLifecycle";

type LifecycleHook<TFn = Function> = TFn[] | null

export interface ComponentInternalInstance {
    uid: number
    type: any
    parent: ComponentInternalInstance | null
    root: ComponentInternalInstance
    appContext?: any
    /**
     * Vnode representing this component in its parent's vdom tree
     */
    vnode: VNode
    /**
     * The pending new vnode from parent updates
     * @internal
     */
    next?: VNode | null
    /**
     * Root vnode of this component's own vdom tree
     */
    subTree: VNode
    /**
     * Render effect instance
     */
    effect: ReactiveEffect
    /**
     * The render function that returns vdom tree.
     * @internal
     */
    render: any;
    update: any;
    isMounted: boolean;
    data: Record<string, unknown>;
    [LifecycleHooks.BEFORE_CREATE]: LifecycleHook;
    [LifecycleHooks.CREATED]: LifecycleHook;
    [LifecycleHooks.BEFORE_MOUNT]: LifecycleHook;
    [LifecycleHooks.MOUNTED]: LifecycleHook;
}

/**
  * 生命周期钩子
*/
export const enum LifecycleHooks {
    BEFORE_CREATE = 'bc',
    CREATED = 'c',
    BEFORE_MOUNT = 'bm',
    MOUNTED = 'm'
}


let uid = 0

/**
 * 创建组件实例
 *  */ 
export function createComponentInstance(
    vnode: VNode    
): ComponentInternalInstance {
    const type = vnode.type;
    const instance: ComponentInternalInstance = {
        uid: uid++, // 唯一标记
        vnode, // 虚拟节点
        type, // 组件类型
        parent: null, 
        effect: null, // ReactiveEffect 实例
        render: null,
        subTree: null!, // render函数的返回值
        root: null!, 
        update: null, // update函数, 触发effect.run
        isMounted: false
    }
    return instance
}

// 规范化组件实例数据
export function setupComponent(instance: ComponentInternalInstance) {
    const setupResult = setupStatefulComponent(instance);
    return setupResult
}

function setupStatefulComponent(instance: ComponentInternalInstance) {
    const Component = instance.type;
    const {setup} = Component;
    if (setup) {
        const setupResult = setup()
        handleSetupResult(instance, setupResult)
    } else {
        finishComponentSetup(instance)
    }
    
}

export function handleSetupResult(instance: ComponentInternalInstance, setupResult) {
    if (isFunction(setupResult)) {
        instance.render = setupResult
    }
    finishComponentSetup(instance)
}

function finishComponentSetup(instance) {
    const Component = instance.type;
    if (!instance.render) {
        instance.render = (Component.render || NOOP)
    }

    applyOptions(instance)
}

/**
 * 触发hooks
 */
function callHook(hook: Function, proxy) {
    hook.bind(proxy)()
}

function applyOptions(instance: ComponentInternalInstance) {
    const {
        data:dataOptions,
        beforeCreate,
        created,
        beforeMount,
        mounted
    } = instance.type;

    // hooks
    if (beforeCreate) {
        callHook(beforeCreate, instance.data)
    }

    // 如果存在data选项
    if (dataOptions) {
        const data =dataOptions();
        if (isObject(data)) {
            instance.data = reactive(data)
        }
    }

    // hooks
    if (created) {
        callHook(created, instance.data);
    }

    function registerLifecycleHook(register: Function, hook?: Function) {
        register(hook?.bind(instance.data), instance)
    }

    // 注册 hooks
    registerLifecycleHook(onBeforeMount, beforeMount);
    registerLifecycleHook(onMounted, mounted)
}