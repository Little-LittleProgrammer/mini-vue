import { ShapeFlags } from 'packages/shared/src/shapeFlags'
import { Fragment, Text, Comment, VNode} from './vnode'


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
    createElement(type: string):HostElement
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
        setElementText: hostSetElementText
    } = options

    const patch: PatchFn = (oldVNode, newVNode, container, anchor = null) => {
        if (oldVNode === newVNode) {
            return
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
     * 渲染函数
     */
    const render:RootRenderFunction = (vnode, container, isSvg) => {
        if (vnode == null) {
            // TODO: 卸载
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
