import { ShapeFlags } from 'packages/shared/src/shapeFlags'
import { Fragment, Text, Comment, VNode, isSameVNodeType} from './vnode'
import { EMPTY_OBJ } from '@vue/shared'


export interface Renderer<HostElement = RendererElement> {
    render: RootRenderFunction<HostElement>
    // createApp: CreateAppFunction<HostElement>
  }

export type RootRenderFunction<HostElement = RendererElement> = (
    vnode: VNode | null,
    container: HostElement,
    isSVG?: boolean
  ) => void

/**
 * 渲染器配置对象
 */
export interface RendererOptions<
    HostNode = RendererNode,
    HostElement = RendererElement
> {
    /**
     * 为指定 element 的 prop 打补丁
     */
    patchProp(el: HostNode, key: string, prevValue: any, nextValue: any): void
    /**
     * 为指定的 Element 设置 text
     */
    setElementText(node: HostElement, text: string): void
    /**
     * 插入指定的 el 到 parent 中，anchor 表示插入的位置，即：锚点
     */
    insert(el:HostNode, parent: HostElement, anchor?: HostNode | null): void
    /**
     * 创建指定的 Element
     */
    createElement(type: string):HostElement;
    /**
     * 卸载dom
     */
    remove(el:HostNode): void
}

export interface RendererNode {
    [key: string]: any
}

export interface RendererElement extends RendererNode {}

type PatchFn = (
    n1: VNode | null, // null means this is a mount
    n2: VNode,
    container: RendererElement,
    anchor?: RendererNode | null,
    // parentComponent?: ComponentInternalInstance | null,
    // parentSuspense?: SuspenseBoundary | null,
    // isSVG?: boolean,
    // slotScopeIds?: string[] | null,
    // optimized?: boolean
  ) => void
  

/**
 * 对外暴露的创建渲染器的方法
 */
export function createRenderer(options: RendererOptions) {
    return baseCreateRenderer(options)
}

/**
 * 生成 renderer 渲染器
 * @param options 兼容性操作配置对象
 * @returns
 */
function baseCreateRenderer<
HostNode extends RendererNode = RendererNode,
HostElement extends RendererElement = RendererElement 
>(options: RendererOptions<HostNode, HostElement>): Renderer<HostElement> {
    /**
     * 解构 options，获取所有的兼容性方法
     */
    const {
        insert: hostInsert,
        patchProp: hostPatchProp,
        createElement: hostCreateElement,
        setElementText: hostSetElementText,
        remove: hostRemove
    } = options

    const patch: PatchFn = (oldVNode, newVNode, container, anchor = null) => {
        if (oldVNode === newVNode) {
            return
        }

        if(oldVNode && !isSameVNodeType(oldVNode, newVNode)) {
            unmount(oldVNode);
            oldVNode = null
        }

        const { type, shapeFlag } = newVNode
        switch (type) {
            case Text:
                // TODO: Text
                break
            case Comment:
                // TODO: Comment
                break
            case Fragment:
                // TODO: Fragment
                break
            default:
                if (shapeFlag & ShapeFlags.ELEMENT) {
                    // TODO: Element
                    processElement(oldVNode, newVNode, container, anchor)
                } else if (shapeFlag & ShapeFlags.COMPONENT) {
                    // TODO: 组件
                }
        }
    }

    const processElement = (oldVNode: VNode | null, newVNode:VNode, container:RendererElement, anchor: RendererNode | null) => {
        if (oldVNode == null) {
            mountElement(newVNode, container, anchor)
        } else {
            // Todo: 更新
            patchElement(oldVNode, newVNode)
        }
    }

    const mountElement = (vnode:VNode, container:RendererElement, anchor: RendererNode | null) => {
        let el: RendererElement
        const { type, props, shapeFlag} = vnode
        el = vnode.el = hostCreateElement(vnode.type)

        if (shapeFlag & ShapeFlags.TEXT_CHILDREN) {
            hostSetElementText(el, vnode.children)
        }

        if (props) {
            for (let key in props) {
                hostPatchProp(el, key, null, props[key])
            }
        }
        hostInsert(el, container, anchor)
    }

       /**
    * element 的更新操作
    */
   const patchElement = (oldVNode: VNode, newVNode: VNode) => {
        // 获取指定的 el
        const el = (newVNode.el = oldVNode.el!)
    
        // 新旧 props
        const oldProps = oldVNode.props || EMPTY_OBJ
        const newProps = newVNode.props || EMPTY_OBJ
    
        // 更新子节点
        patchChildren(oldVNode, newVNode, el, null)
    
        // 更新 props
        patchProps(el, newVNode, oldProps, newProps)
    }

    /**
     * 为子节点打补丁 
     */
    const patchChildren = (oldVNode:VNode, newVnode:Vnode, container:RendererElement, anchor: RendererNode | null) => {
        // 旧节点的children
        const c1 = oldVNode && oldVNode.children;
        // 旧节点的 preShapeFlag
        const prevShapeFlag = oldVNode ? oldVNode.shapeFlag:0
        // 新节点的 children
        const c2 =  newVnode.children;
        // 新ShapeFlag
        const {shapeFlag} = newVnode;
        // 新子节点为 TExt_children
        if(shapeFlag & ShapeFlags.TEXT_CHILDREN) {
            // 旧子节点 为 Array_children
            if (prevShapeFlag & ShapeFlags.ARRAY_CHILDREN) {
                // 卸载旧子节点
            }
            // 新旧子节点不同
            if (c2 !== c1) {
                // 挂在新子节点的文本
                hostSetElementText(container, c2)
            }
        } else {
            // 旧子节点为 Array——children
            if(prevShapeFlag && ShapeFlags.ARRAY_CHILDREN) {
                // 新子节点也为 Array_children
                if (shapeFlag & ShapeFlags.ARRAY_CHILDREN) {
                    // ToDO: diff运算
                } else { // 新子节点不为 Array_children
                    // ToDo: 卸载旧子节点
                }
            } else {
                // 旧子节点为 Text_children
                if (prevShapeFlag & ShapeFlags.TEXT_CHILDREN) {
                    hostSetElementText(container, '')
                }

                // 新子节点为 Array_children
                if (shapeFlag & ShapeFlags.ARRAY_CHILDREN) {
                    // todo: 单独挂载新子节点
                }
            }
        }
    }

     /**
        * 为 props 打补丁
        */
    const patchProps = (el: Element, vnode, oldProps, newProps) => {
        // 新旧 props 不相同时才进行处理
        if (oldProps !== newProps) {
            // 遍历新的 props，依次触发 hostPatchProp ，赋值新属性
            for (const key in newProps) {
                const next = newProps[key]
                const prev = oldProps[key]
                if (next !== prev) {
                    hostPatchProp(el, key, prev, next)
                }
            }
            // 存在旧的 props 时
            if (oldProps !== EMPTY_OBJ) {
                // 遍历旧的 props，依次触发 hostPatchProp ，删除不存在于新props 中的旧属性
                for (const key in oldProps) {
                    if (!(key in newProps)) {
                        hostPatchProp(el, key, oldProps[key], null)
                    }
                }
            }
        }
    }

    /**
     * 卸载操作
     */
    const unmount = (vnode) => {
        hostRemove(vnode.el!)
    }

    /**
     * 渲染函数
     */
    const render:RootRenderFunction = (vnode, container, isSvg) => {
        if (vnode == null) {
            // 卸载
            if(container._vnode) { // 旧节点存在
                unmount(vnode)
            }
        } else {
            // 打补丁（包括了挂载和更新）
            patch(container._vnode || null, vnode, container)
        }
        container._vnode = vnode
    }
    return {
        render
    }
}
