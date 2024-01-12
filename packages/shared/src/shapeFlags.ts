export const enum ShapeFlags {
    /**
     * type = Element 1
     */
    ELEMENT = 1,
    /**
     * 函数组件 10
     */
    FUNCTIONAL_COMPONENT = 1 << 1,
    /**
     * 有状态（响应数据）组件 100
     */
    STATEFUL_COMPONENT = 1 << 2,
    /**
     * children = Text 1000
     */
    TEXT_CHILDREN = 1 << 3,
    /**
     * children = Array 10000
     */
    ARRAY_CHILDREN = 1 << 4,
    /**
     * children = slot 100000
     */
    SLOTS_CHILDREN = 1 << 5,
    /**
     * 组件：有状态（响应数据）组件 | 函数组件
     */
    COMPONENT = ShapeFlags.STATEFUL_COMPONENT | ShapeFlags.FUNCTIONAL_COMPONENT
}
