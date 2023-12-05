import { ShapeFlags } from "@vue/shared"
import { ComponentInternalInstance } from "./component"
import { createVNode } from "./vnode"

 /**
  * 标准化 VNode
  */
 export function normalizeVNode(child) {
    if (typeof child === 'object') {
        return cloneIfMounted(child)
    } else {
        return createVNode(Text, null, String(child))
    }
}

/**
 * clone VNode
 */
export function cloneIfMounted(child) {
    return child
}

/**
 * 解析render函数的返回值
 * @param instance 
 */
export function renderComponentRoot(instance: ComponentInternalInstance) {
    const {vnode, render, data} = instance;
    let result;
    try {
        // 解析状态组件
        if (vnode.shapeFlag & ShapeFlags.STATEFUL_COMPONENT) {
            // 获取到result返回值
            result = normalizeVNode(render!.call(data))
        }
    } catch (error) {
        
    }
    return result
}