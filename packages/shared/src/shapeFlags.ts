/**
 * 用于描述 vnode 的类型和子节点类型
 * 位运算模拟集合
 * 1 1 1 1 1 1 
 * 第一位表示 ELEMENT
 * 第二位表示 FUNCTIONAL_COMPONENT
 * 第三位表示 STATEFUL_COMPONENT
 * 第四位表示 TEXT_CHILDREN
 * 第五位表示 ARRAY_CHILDREN
 * 第六位表示 SLOTS_CHILDREN
 * 
 */
export const enum ShapeFlags {
	/**
	 * type = Element
	 */
	ELEMENT = 1,
	/**
	 * 函数组件
	 */
	FUNCTIONAL_COMPONENT = 1 << 1,
	/**
	 * 有状态（响应数据）组件
	 */
	STATEFUL_COMPONENT = 1 << 2,
	/**
	 * children = Text
	 */
	TEXT_CHILDREN = 1 << 3,
	/**
	 * children = Array
	 */
	ARRAY_CHILDREN = 1 << 4,
	/**
	 * children = slot
	 */
	SLOTS_CHILDREN = 1 << 5,
	/**
	 * 组件：有状态（响应数据）组件 | 函数组件
	 */
	COMPONENT = ShapeFlags.STATEFUL_COMPONENT | ShapeFlags.FUNCTIONAL_COMPONENT
}
