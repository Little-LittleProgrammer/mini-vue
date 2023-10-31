import { ShapeFlags, isArray, isFunction, isObject, isString } from "@vue/shared";
import { RendererElement, RendererNode } from "./renderer";

export const Fragment = Symbol('Fragment' ) 
  export const Text = Symbol( 'Text')
  export const Comment = Symbol('Comment' )
  export const Static = Symbol('Static')

export interface VNode <
    HostNode = RendererNode,
    HostElement = RendererElement,
    ExtraProps = { [key: string]: any }
> {
    __v_isVNode: true;
    type: any,
    props: any;
    children: any;
    shapeFlag: number;
    el: HostNode | null;
    key: any
}

/**
* 生成一个 VNode 对象，并返回
* @param type vnode.type
* @param props 标签属性或自定义属性
* @param children 子节点
* @returns vnode 对象
*/
export function createVNode(type, props, children): VNode {
    // 通过 bit 位处理 shapeFlag 类型, dom, 第一次运算0代表先不处理, 
    const shapeFlag = isString(type) ? ShapeFlags.ELEMENT : 0

    return createBaseVNode(type, props, children, shapeFlag)
}

/**
 * 构建基础 vnode
 */
function createBaseVNode(type, props, children, shapeFlag) {
    const vnode = {
        __v_isVNode: true,
        type,
        props,
        shapeFlag
    } as VNode

    // 第二次 children
    normalizeChildren(vnode, children)

    return vnode
}

// 标准化 children
export function normalizeChildren(vnode: VNode, children: unknown) {
    let type = 0
    const { shapeFlag } = vnode
    if (children == null) {
        children = null
    } else if (isArray(children)) {
        type = ShapeFlags.ARRAY_CHILDREN
    } else if (isObject(children)) {
        // TODO: object
    } else if (isFunction(children)) {
        // TODO: function
    } else {
        // children 为 string
        children = String(children)
        // 为 type 指定 Flags
        type = ShapeFlags.TEXT_CHILDREN
    }
    // 修改 vnode 的 chidlren
    vnode.children = children
    // 按位或赋值
    vnode.shapeFlag |= type
}


export function isVNode(value): value is VNode {
    return value ? value.__v_isVNode === true : false
}

export function isSameVNodeType(n1: VNode, n2: VNode) {
    return n1.type === n2.type && n1.key === n2.key
}