import { EMPTY_OBJ, isString } from '@vue/shared'
import { ReactiveEffect } from 'packages/reactivity/src/effect'
import { ShapeFlags } from 'packages/shared/src/shapeFlags'
import { createAppAPI } from './apiCreateApp'
import { createComponentInstance, setupComponent } from './component'
import {
  cloneIfMounted,
  normalizeVNode,
  renderComponentRoot
} from './componentRenderUtils'
import { queuePreFlushCb } from './scheduler'
import { Comment, Fragment, isSameVNodeType, Text } from './vnode'

/**
 * 渲染器配置对象
 * 这个接口定义了渲染器需要的所有平台相关的操作方法
 * 不同平台（如浏览器DOM、移动端、小程序等）可以提供不同的实现
 */
export interface RendererOptions {
  /**
   * 为指定 element 的 prop 打补丁
   * @param el 目标元素
   * @param key 属性名
   * @param prevValue 旧属性值
   * @param nextValue 新属性值
   */
  patchProp(el: Element, key: string, prevValue: any, nextValue: any): void
  /**
   * 为指定的 Element 设置文本内容
   * @param node 目标节点
   * @param text 文本内容
   */
  setElementText(node: Element, text: string): void
  /**
   * 插入指定的 el 到 parent 中，anchor 表示插入的位置，即：锚点
   * @param el 要插入的元素
   * @param parent 父容器
   * @param anchor 锚点，插入位置的参考元素
   */
  insert(el, parent: Element, anchor?): void
  /**
   * 创建指定类型的 Element
   * @param type 元素类型（如 'div', 'span' 等）
   */
  createElement(type: string)
  /**
   * 卸载指定的 DOM 元素
   * @param el 要移除的元素
   */
  remove(el): void
  /**
   * 创建文本节点
   * @param text 文本内容
   */
  createText(text: string)
  /**
   * 设置文本节点的内容
   * @param node 文本节点
   * @param text 新的文本内容
   */
  setText(node, text): void
  /**
   * 创建注释节点
   * @param text 注释内容
   */
  createComment(text: string)
}

/**
 * 对外暴露的创建渲染器的方法
 * 这是渲染器的入口函数，接受平台相关的配置对象
 * @param options 渲染器配置选项
 * @returns 渲染器实例
 */
export function createRenderer(options: RendererOptions) {
  return baseCreateRenderer(options)
}

/**
 * 生成 renderer 渲染器的核心实现
 * 这是整个渲染系统的核心，包含了所有的渲染逻辑
 * @param options 兼容性操作配置对象
 * @returns 渲染器对象，包含 render 方法和 createApp 方法
 */
function baseCreateRenderer(options: RendererOptions): any {
  /**
   * 解构 options，获取所有的兼容性方法
   * 这些方法是平台相关的具体实现，如 DOM 操作、原生组件操作等
   */
  const {
    insert: hostInsert,
    patchProp: hostPatchProp,
    createElement: hostCreateElement,
    setElementText: hostSetElementText,
    remove: hostRemove,
    createText: hostCreateText,
    setText: hostSetText,
    createComment: hostCreateComment
  } = options

  /**
   * Comment 节点的打补丁操作
   * 注释节点一般用于开发时的标记或条件渲染的占位
   * @param oldVNode 旧的虚拟节点
   * @param newVNode 新的虚拟节点
   * @param container 父容器
   * @param anchor 锚点
   */
  const processCommentNode = (oldVNode, newVNode, container, anchor) => {
    if (oldVNode == null) {
      // 初次挂载：创建注释节点并插入到容器中
      newVNode.el = hostCreateComment((newVNode.children as string) || '')
      hostInsert(newVNode.el, container, anchor)
    } else {
      // 更新阶段：注释节点内容不变，直接复用旧节点的 DOM 元素
      newVNode.el = oldVNode.el
    }
  }

  /**
   * Text 节点的打补丁操作
   * 处理纯文本节点的创建和更新
   * @param oldVNode 旧的虚拟节点
   * @param newVNode 新的虚拟节点
   * @param container 父容器
   * @param anchor 锚点
   */
  const processText = (oldVNode, newVNode, container, anchor) => {
    // 不存在旧的节点，则为挂载操作
    if (oldVNode == null) {
      // 创建文本节点
      newVNode.el = hostCreateText(newVNode.children as string)
      // 将文本节点插入到容器中
      hostInsert(newVNode.el, container, anchor)
    }
    // 存在旧的节点，则为更新操作
    else {
      // 复用旧节点的 DOM 元素
      const el = (newVNode.el = oldVNode.el!)
      // 如果文本内容发生变化，则更新文本
      if (newVNode.children !== oldVNode.children) {
        hostSetText(el, newVNode.children as string)
      }
    }
  }

  /**
   * Element 元素节点的打补丁操作
   * 处理普通 HTML 元素的挂载和更新
   * @param oldVNode 旧的虚拟节点
   * @param newVNode 新的虚拟节点
   * @param container 父容器
   * @param anchor 锚点
   */
  const processElement = (oldVNode, newVNode, container, anchor) => {
    if (oldVNode == null) {
      // 挂载操作：创建新元素
      mountElement(newVNode, container, anchor)
    } else {
      // 更新操作：比较新旧元素的差异并更新
      patchElement(oldVNode, newVNode)
    }
  }

  /**
   * Fragment 片段的打补丁操作
   * Fragment 是一个虚拟的容器，它本身不会渲染成 DOM 元素
   * 常用于包裹多个子节点而不增加额外的 DOM 层级
   * @param oldVNode 旧的虚拟节点
   * @param newVNode 新的虚拟节点
   * @param container 父容器
   * @param anchor 锚点
   */
  const processFragment = (oldVNode, newVNode, container, anchor) => {
    if (oldVNode == null) {
      // 挂载：直接挂载所有子节点
      mountChildren(newVNode.children, container, anchor)
    } else {
      // 更新：对比新旧子节点列表
      patchChildren(oldVNode, newVNode, container, anchor)
    }
  }

  /**
   * 组件的打补丁操作
   * 处理 Vue 组件的挂载和更新逻辑
   * @param oldVNode 旧的虚拟节点
   * @param newVNode 新的虚拟节点
   * @param container 父容器
   * @param anchor 锚点
   */
  const processComponent = (oldVNode, newVNode, container, anchor) => {
    if (oldVNode == null) {
      // 挂载组件：创建组件实例并进行初始化
      mountComponent(newVNode, container, anchor)
    }
    // TODO: 这里应该还有组件更新的逻辑，但在这个 mini 版本中暂未实现
  }

  /**
   * 挂载组件的具体实现
   * 这是组件生命周期的开始，包括实例创建、setup 执行、首次渲染等
   * @param initialVNode 组件的虚拟节点
   * @param container 父容器
   * @param anchor 锚点
   */
  const mountComponent = (initialVNode, container, anchor) => {
    // 生成组件实例，这个实例包含了组件的所有状态和方法
    initialVNode.component = createComponentInstance(initialVNode)
    // 浅拷贝，绑定同一块内存空间，方便后续操作
    const instance = initialVNode.component

    // 标准化组件实例数据，包括 props、slots、setup 等的处理
    setupComponent(instance)

    // 设置组件的渲染副作用，建立响应式更新机制
    setupRenderEffect(instance, initialVNode, container, anchor)
  }

  /**
   * 设置组件渲染副作用
   * 这是响应式系统的核心，当组件的响应式数据发生变化时，会自动触发重新渲染
   * @param instance 组件实例
   * @param initialVNode 初始虚拟节点
   * @param container 父容器
   * @param anchor 锚点
   */
  const setupRenderEffect = (instance, initialVNode, container, anchor) => {
    // 组件挂载和更新的核心方法
    const componentUpdateFn = () => {
      // 当前处于 mounted 之前，即执行挂载逻辑
      if (!instance.isMounted) {
        // 获取生命周期钩子
        const { bm, m } = instance

        // 执行 beforeMount 钩子
        if (bm) {
          bm()
        }

        // 从组件的 render 函数中获取需要渲染的虚拟 DOM 树
        const subTree = (instance.subTree = renderComponentRoot(instance))

        // 通过 patch 对 subTree 进行打补丁，即渲染组件的内容
        patch(null, subTree, container, anchor)

        // 执行 mounted 钩子
        if (m) {
          m()
        }

        // 把组件根节点的真实 DOM 元素作为组件的 el
        // 这样可以通过组件实例访问到对应的 DOM 元素
        initialVNode.el = subTree.el

        // 标记组件已挂载
        instance.isMounted = true
      } else {
        // 组件更新逻辑
        let { next, vnode } = instance
        if (!next) {
          next = vnode
        }

        // 获取新的虚拟 DOM 树
        const nextTree = renderComponentRoot(instance)

        // 保存旧的虚拟 DOM 树，用于对比
        const prevTree = instance.subTree
        instance.subTree = nextTree

        // 通过 patch 进行新旧虚拟 DOM 的对比和更新
        patch(prevTree, nextTree, container, anchor)

        // 更新组件的根元素引用
        next.el = nextTree.el
      }
    }

    // 创建包含调度器的响应式副作用实例
    // 当组件的响应式数据发生变化时，会自动触发 componentUpdateFn
    const effect = (instance.effect = new ReactiveEffect(
      componentUpdateFn,
      () => queuePreFlushCb(update) // 调度器：将更新任务加入队列，避免同步更新造成的性能问题
    ))

    // 生成 update 函数，这是触发组件更新的入口
    const update = (instance.update = () => effect.run())

    // 首次执行 update 函数，触发组件的初始渲染
    update()
  }

  /**
   * Element 元素的更新操作
   * 对比新旧元素节点，更新发生变化的属性和子节点
   * @param oldVNode 旧的虚拟节点
   * @param newVNode 新的虚拟节点
   */
  const patchElement = (oldVNode, newVNode) => {
    // 复用旧元素的 DOM 节点
    const el = (newVNode.el = oldVNode.el!)

    // 获取新旧 props，用于对比
    const oldProps = oldVNode.props || EMPTY_OBJ
    const newProps = newVNode.props || EMPTY_OBJ

    // 更新子节点：这里会进行 diff 算法的核心逻辑
    patchChildren(oldVNode, newVNode, el, null)

    // 更新元素的属性
    patchProps(el, newVNode, oldProps, newProps)
  }

  /**
   * Element 元素的挂载操作
   * 创建真实的 DOM 元素并挂载到页面上
   * @param vnode 虚拟节点
   * @param container 父容器
   * @param anchor 锚点
   */
  const mountElement = (vnode, container, anchor) => {
    const { type, props, shapeFlag } = vnode

    // 创建真实的 DOM 元素
    const el = (vnode.el = hostCreateElement(type))

    // 处理子节点
    if (shapeFlag & ShapeFlags.TEXT_CHILDREN) {
      // 如果子节点是文本，直接设置文本内容
      hostSetElementText(el, vnode.children as string)
    } else if (shapeFlag & ShapeFlags.ARRAY_CHILDREN) {
      // 如果子节点是数组，递归挂载每个子节点
      mountChildren(vnode.children, el, anchor)
    }

    // 处理元素的属性
    if (props) {
      // 遍历 props 对象，为每个属性调用 hostPatchProp
      for (const key in props) {
        hostPatchProp(el, key, null, props[key])
      }
    }

    // 将创建好的元素插入到指定位置
    hostInsert(el, container, anchor)
  }

  /**
   * 为元素的属性打补丁
   * 对比新旧属性，更新发生变化的属性，删除不存在的旧属性
   * @param el DOM 元素
   * @param vnode 虚拟节点
   * @param oldProps 旧属性对象
   * @param newProps 新属性对象
   */
  const patchProps = (el: Element, vnode, oldProps, newProps) => {
    // 只有新旧 props 不相同时才进行处理，避免无意义的操作
    if (oldProps !== newProps) {
      // 遍历新的 props，更新或添加属性
      for (const key in newProps) {
        const next = newProps[key]
        const prev = oldProps[key]
        // 只有属性值发生变化时才更新
        if (next !== prev) {
          hostPatchProp(el, key, prev, next)
        }
      }
      // 处理需要删除的旧属性
      if (oldProps !== EMPTY_OBJ) {
        // 遍历旧的 props，删除不存在于新 props 中的属性
        for (const key in oldProps) {
          if (!(key in newProps)) {
            hostPatchProp(el, key, oldProps[key], null)
          }
        }
      }
    }
  }

  /**
   * 挂载子节点列表
   * 遍历子节点数组，为每个子节点调用 patch 进行挂载
   * @param children 子节点数组
   * @param container 父容器
   * @param anchor 锚点
   */
  const mountChildren = (children, container, anchor) => {
    // 处理字符串情况：避免 "Cannot assign to read only property '0' of string" 错误
    if (isString(children)) {
      children = children.split('')
    }
    // 遍历子节点数组
    for (let i = 0; i < children.length; i++) {
      // 标准化子节点为虚拟节点格式
      const child = (children[i] = normalizeVNode(children[i]))
      // 挂载子节点（oldVNode 为 null 表示挂载操作）
      patch(null, child, container, anchor)
    }
  }

  /**
   * 为子节点打补丁 - diff 算法的入口
   * 这里实现了 Vue3 的子节点更新策略，根据子节点类型选择不同的处理方式
   * @param oldVNode 旧的虚拟节点
   * @param newVNode 新的虚拟节点
   * @param container 父容器
   * @param anchor 锚点
   */
  const patchChildren = (oldVNode, newVNode, container, anchor) => {
    // 获取旧节点的子节点
    const c1 = oldVNode && oldVNode.children
    // 获取旧节点的 shapeFlag，用于判断子节点类型
    const prevShapeFlag = oldVNode ? oldVNode.shapeFlag : 0
    // 获取新节点的子节点
    const c2 = newVNode.children
    // 获取新节点的 shapeFlag
    const { shapeFlag } = newVNode

    // 情况1：新子节点为文本节点
    if (shapeFlag & ShapeFlags.TEXT_CHILDREN) {
      // 如果旧子节点是数组，需要先卸载所有旧子节点
      if (prevShapeFlag & ShapeFlags.ARRAY_CHILDREN) {
        // TODO: 卸载旧子节点
      }
      // 如果新旧文本内容不同，更新文本
      if (c2 !== c1) {
        hostSetElementText(container, c2 as string)
      }
    } else {
      // 情况2：新子节点不是文本节点
      // 如果旧子节点是数组
      if (prevShapeFlag & ShapeFlags.ARRAY_CHILDREN) {
        // 如果新子节点也是数组，进行 diff 运算
        if (shapeFlag & ShapeFlags.ARRAY_CHILDREN) {
          // 核心 diff 算法：对比两个数组类型的子节点
          patchKeyedChildren(c1, c2, container, anchor)
        }
        // 如果新子节点不是数组，直接卸载所有旧子节点
        else {
          // TODO: 卸载旧子节点
        }
      } else {
        // 如果旧子节点是文本，先清除文本
        if (prevShapeFlag & ShapeFlags.TEXT_CHILDREN) {
          hostSetElementText(container, '')
        }
        // 如果新子节点是数组，挂载新子节点
        if (shapeFlag & ShapeFlags.ARRAY_CHILDREN) {
          // TODO: 单独挂载新子节点操作
        }
      }
    }
  }

  /**
   * diff 算法的核心实现 - 处理两个数组类型的子节点
   * 这是 Vue3 中最复杂也最重要的算法之一，用于高效地更新子节点列表
   * 算法分为5个主要步骤：
   * 1. 从前往后对比相同的节点
   * 2. 从后往前对比相同的节点  
   * 3. 处理新节点多于旧节点的情况
   * 4. 处理旧节点多于新节点的情况
   * 5. 处理乱序情况（最复杂的部分）
   */
  const patchKeyedChildren = (
    oldChildren,
    newChildren,
    container,
    parentAnchor
  ) => {
    /**
     * 定义各种索引变量
     */
    let i = 0 // 当前对比的索引
    const newChildrenLength = newChildren.length // 新子节点数组长度
    let oldChildrenEnd = oldChildren.length - 1 // 旧子节点的最后一个索引
    let newChildrenEnd = newChildrenLength - 1 // 新子节点的最后一个索引

    // 步骤1: 自前向后的 diff 对比
    // 从数组开头开始，找出连续相同的节点并进行 patch
    while (i <= oldChildrenEnd && i <= newChildrenEnd) {
      const oldVNode = oldChildren[i]
      const newVNode = normalizeVNode(newChildren[i])
      // 如果是相同类型的节点，直接 patch
      if (isSameVNodeType(oldVNode, newVNode)) {
        patch(oldVNode, newVNode, container, null)
      }
      // 如果不是相同类型，跳出循环
      else {
        break
      }
      i++
    }

    // 步骤2: 自后向前的 diff 对比
    // 从数组末尾开始，找出连续相同的节点并进行 patch
    while (i <= oldChildrenEnd && i <= newChildrenEnd) {
      const oldVNode = oldChildren[oldChildrenEnd]
      const newVNode = normalizeVNode(newChildren[newChildrenEnd])
      if (isSameVNodeType(oldVNode, newVNode)) {
        patch(oldVNode, newVNode, container, null)
      } else {
        break
      }
      oldChildrenEnd--
      newChildrenEnd--
    }

    // 步骤3: 新节点多于旧节点的情况
    // 经过前面两步后，如果 i > oldChildrenEnd，说明旧节点已经处理完
    // 但还有新节点需要挂载
    if (i > oldChildrenEnd) {
      if (i <= newChildrenEnd) {
        // 确定插入位置的锚点
        const nextPos = newChildrenEnd + 1
        const anchor =
          nextPos < newChildrenLength ? newChildren[nextPos].el : parentAnchor
        // 挂载剩余的新节点
        while (i <= newChildrenEnd) {
          patch(null, normalizeVNode(newChildren[i]), container, anchor)
          i++
        }
      }
    }
    // 步骤4: 旧节点多于新节点的情况
    // 如果 i > newChildrenEnd，说明新节点已经处理完
    // 但还有旧节点需要卸载
    else if (i > newChildrenEnd) {
      while (i <= oldChildrenEnd) {
        unmount(oldChildren[i])
        i++
      }
    }
    // 步骤5: 乱序的 diff 比对 - 最复杂的情况
    // 经过前面的处理，剩下的节点顺序可能发生了变化，需要进行复杂的对比
    else {
      const oldStartIndex = i // 旧子节点的开始索引
      const newStartIndex = i // 新子节点的开始索引
      
      // 5.1 创建一个 Map：key -> newIndex 的映射
      // 这个 Map 帮助我们快速找到新节点在新数组中的位置
      const keyToNewIndexMap = new Map()
      for (i = newStartIndex; i <= newChildrenEnd; i++) {
        const nextChild = normalizeVNode(newChildren[i])
        // 每个节点必须有 key（这就是为什么 v-for 需要 key 的原因）
        if (nextChild.key != null) {
          keyToNewIndexMap.set(nextChild.key, i)
        }
      }

      // 5.2 遍历旧节点，尝试进行 patch 或 unmount
      let j
      let patched = 0 // 已经处理的节点数量
      const toBePatched = newChildrenEnd - newStartIndex + 1 // 需要处理的节点数量
      let moved = false // 是否需要移动节点
      let maxNewIndexSoFar = 0 // 用于判断是否需要移动的辅助变量
      
      // 创建一个数组来建立新旧节点索引的映射关系
      // 用于后续的最长递增子序列计算
      const newIndexToOldIndexMap = new Array(toBePatched)
      // 初始化为 0，0 表示新节点没有对应的旧节点
      for (i = 0; i < toBePatched; i++) newIndexToOldIndexMap[i] = 0

      // 遍历所有旧节点
      for (i = oldStartIndex; i <= oldChildrenEnd; i++) {
        const prevChild = oldChildren[i]
        
        // 如果已处理的节点数超过了需要处理的数量，直接删除剩余旧节点
        if (patched >= toBePatched) {
          unmount(prevChild)
          continue
        }
        
        let newIndex // 旧节点在新数组中的位置
        
        // 如果旧节点有 key，直接从 Map 中查找
        if (prevChild.key != null) {
          newIndex = keyToNewIndexMap.get(prevChild.key)
        } else {
          // 如果没有 key，遍历所有新节点找到匹配的
          for (j = newStartIndex; j <= newChildrenEnd; j++) {
            if (
              newIndexToOldIndexMap[j - newStartIndex] === 0 &&
              isSameVNodeType(prevChild, newChildren[j])
            ) {
              newIndex = j
              break
            }
          }
        }
        
        // 如果没找到匹配的新节点，删除旧节点
        if (newIndex === undefined) {
          unmount(prevChild)
        }
        // 找到了匹配的新节点
        else {
          // 建立新旧索引的映射关系（+1 是因为 0 有特殊含义）
          newIndexToOldIndexMap[newIndex - newStartIndex] = i + 1
          
          // 判断是否需要移动：如果新索引不是递增的，说明需要移动
          if (newIndex >= maxNewIndexSoFar) {
            maxNewIndexSoFar = newIndex
          } else {
            moved = true
          }
          
          // 对找到的节点进行 patch
          patch(prevChild, newChildren[newIndex], container, null)
          patched++
        }
      }

      // 5.3 处理节点的移动和新增
      // 如果需要移动，计算最长递增子序列来最小化移动操作
      const increasingNewIndexSequence = moved
        ? getSequence(newIndexToOldIndexMap)
        : []
      j = increasingNewIndexSequence.length - 1
      
      // 从后向前遍历，这样可以使用已处理的节点作为锚点
      for (i = toBePatched - 1; i >= 0; i--) {
        const nextIndex = newStartIndex + i
        const nextChild = newChildren[nextIndex]
        // 确定锚点位置
        const anchor =
          nextIndex + 1 < newChildrenLength
            ? newChildren[nextIndex + 1].el
            : parentAnchor
            
        // 如果映射值为 0，说明这是新增的节点
        if (newIndexToOldIndexMap[i] === 0) {
          patch(null, nextChild, container, anchor)
        }
        // 如果需要移动
        else if (moved) {
          // 如果当前节点不在最长递增子序列中，需要移动
          if (j < 0 || i !== increasingNewIndexSequence[j]) {
            move(nextChild, container, anchor)
          } else {
            j--
          }
        }
      }
    }
  }

  /**
   * 移动节点到指定位置
   * @param vnode 要移动的虚拟节点
   * @param container 容器
   * @param anchor 锚点
   */
  const move = (vnode, container, anchor) => {
    const { el } = vnode
    hostInsert(el!, container, anchor)
  }

  /**
   * patch 函数 - 渲染器的核心调度函数
   * 根据虚拟节点的类型，选择相应的处理函数进行渲染或更新
   * @param oldVNode 旧的虚拟节点
   * @param newVNode 新的虚拟节点  
   * @param container 容器
   * @param anchor 锚点
   */
  const patch = (oldVNode, newVNode, container, anchor = null) => {
    // 如果新旧节点完全相同，无需处理
    if (oldVNode === newVNode) {
      return
    }

    /**
     * 如果新旧节点类型不同，直接卸载旧节点
     * 这样新节点就会走挂载流程
     */
    if (oldVNode && !isSameVNodeType(oldVNode, newVNode)) {
      unmount(oldVNode)
      oldVNode = null
    }

    // 根据新节点的类型和 shapeFlag 选择处理方式
    const { type, shapeFlag } = newVNode
    switch (type) {
      case Text:
        // 处理文本节点
        processText(oldVNode, newVNode, container, anchor)
        break
      case Comment:
        // 处理注释节点
        processCommentNode(oldVNode, newVNode, container, anchor)
        break
      case Fragment:
        // 处理片段节点
        processFragment(oldVNode, newVNode, container, anchor)
        break
      default:
        // 根据 shapeFlag 判断是元素还是组件
        if (shapeFlag & ShapeFlags.ELEMENT) {
          // 处理普通元素
          processElement(oldVNode, newVNode, container, anchor)
        } else if (shapeFlag & ShapeFlags.COMPONENT) {
          // 处理组件
          processComponent(oldVNode, newVNode, container, anchor)
        }
    }
  }

  /**
   * 卸载虚拟节点对应的 DOM 元素
   * @param vnode 要卸载的虚拟节点
   */
  const unmount = vnode => {
    hostRemove(vnode.el!)
  }

  /**
   * 渲染函数 - 渲染器的对外接口
   * @param vnode 要渲染的虚拟节点
   * @param container 渲染容器
   */
  const render = (vnode, container) => {
    if (vnode == null) {
      // 如果 vnode 为空且容器中有旧的 vnode，执行卸载操作
      if (container._vnode) {
        unmount(container._vnode)
      }
    } else {
      // 执行 patch 操作（包括挂载和更新）
      patch(container._vnode || null, vnode, container)
    }
    // 缓存当前的 vnode 到容器上，用于下次对比
    container._vnode = vnode
  }
  
  // 返回渲染器对象
  return {
    render,
    createApp: createAppAPI(render) // 创建应用实例的 API
  }
}

/**
 * 获取最长递增子序列的索引数组
 * 这个算法用于 diff 过程中最小化节点移动操作
 * 
 * 算法思路：
 * 1. 找到数组中最长的递增子序列
 * 2. 返回这个子序列中各元素在原数组中的索引
 * 3. 在 diff 算法中，属于最长递增子序列的节点不需要移动
 * 
 * 时间复杂度：O(n log n)
 * 空间复杂度：O(n)
 * 
 * 参考资料：
 * - 维基百科：https://en.wikipedia.org/wiki/Longest_increasing_subsequence
 * - 百度百科：https://baike.baidu.com/item/%E6%9C%80%E9%95%BF%E9%80%92%E5%A2%9E%E5%AD%90%E5%BA%8F%E5%88%97/22828111
 * 
 * @param arr 输入数组
 * @returns 最长递增子序列的索引数组
 */
function getSequence(arr) {
  // 创建数组的浅拷贝作为回溯数组
  // p[i] 记录的是 result 中每个位置更新前的前一个元素的索引
  const p = arr.slice()
  // result 存储最长递增子序列的索引
  const result = [0]
  let i, j, u, v, c
  const len = arr.length
  
  // 遍历数组中的每个元素
  for (i = 0; i < len; i++) {
    const arrI = arr[i]
    // 0 在这里有特殊含义（表示新节点），跳过
    if (arrI !== 0) {
      // 获取 result 中最后一个元素（当前最大值的索引）
      j = result[result.length - 1]
      // 如果当前元素大于 result 中最后一个元素对应的值
      // 说明可以直接扩展递增序列
      if (arr[j] < arrI) {
        p[i] = j // 记录前驱节点
        result.push(i) // 将当前索引加入结果
        continue
      }
      
      // 如果不能直接扩展，使用二分查找找到合适的插入位置
      u = 0 // 左边界
      v = result.length - 1 // 右边界
      
      // 二分查找
      while (u < v) {
        // 计算中间位置（位运算 >> 1 相当于除以2并向下取整）
        c = (u + v) >> 1
        if (arr[result[c]] < arrI) {
          u = c + 1 // 在右半部分查找
        } else {
          v = c // 在左半部分查找
        }
      }
      
      // 如果找到了更小的值，进行替换以保持递增序列的最优性
      if (arrI < arr[result[u]]) {
        if (u > 0) {
          p[i] = result[u - 1] // 记录前驱节点
        }
        result[u] = i // 替换为更优的索引
      }
    }
  }
  
  // 通过回溯数组重建最长递增子序列
  u = result.length
  v = result[u - 1]
  while (u-- > 0) {
    result[u] = v
    v = p[v] // 通过前驱节点回溯
  }
  
  return result
}