# DOM 适配层（runtime-dom）

`runtime-dom` 模块为 mini-vue 提供了针对浏览器 DOM 的渲染适配。

## 主要内容

- **节点操作**：nodeOps.ts 封装了对 DOM 节点的增删改查。
- **属性/事件处理**：patchProp.ts 处理属性、事件、样式等的设置与更新。
- **模块扩展**：modules 目录可扩展更多 DOM 相关功能。

## 作用

- 作为 `runtime-core` 的平台适配层，将平台无关的渲染逻辑映射到浏览器 DOM。
- 通过 `createRenderer` 注入平台相关操作，实现跨平台能力。

## 示例

```js
import { render } from 'mini-vue/runtime-dom'

render(vnode, document.getElementById('root'))
``` 