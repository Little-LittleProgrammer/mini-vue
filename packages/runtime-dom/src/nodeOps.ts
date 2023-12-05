import { RendererOptions } from "packages/runtime-core/src/renderer";

export const nodeOps: Omit<RendererOptions, 'patchProp'> = {
    /**
   	 * 插入指定元素到指定位置
   	 */
    insert:(el, parent, anchor) => {
        parent.insertBefore(el, anchor || null)
    },

    /**
   	 * 创建指定 Element
   	 */
    createElement: (tag) => {
        const el = document.createElement(tag);
        return el
    },

    /**
   	 * 为指定的 element 设置 textContent
   	 */
    setElementText: (el, text) => {
        el.textContent = text
    },

    /**
     * 删除指定元素
     */
    remove: (child) => {
        const parent = child.parentNode
        if (parent) {
            parent.removeChild(child)
        }
    },

    createText: (text) =>  {
        return document.createTextNode(text)
    },

    setText: (node, text) => {
        node.nodeValue = text
    },

    createComment: (text) => document.createComment(text)

}