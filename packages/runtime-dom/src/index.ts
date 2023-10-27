import {
    Renderer,
    RootRenderFunction,
    createRenderer,
} from '@vue/runtime-core'
import { extend } from '@vue/shared'
import { patchProp } from './patchProp'
import { nodeOps } from './nodeOps'


const rendererOptions = extend({ patchProp }, nodeOps)

let renderer: Renderer<Element | ShadowRoot>

function ensureRenderer() {
    return (
      renderer ||
      (renderer = createRenderer(rendererOptions))
    )
  }

export const render = ((...args) => {
    ensureRenderer().render(...args)
}) as RootRenderFunction<Element | ShadowRoot>