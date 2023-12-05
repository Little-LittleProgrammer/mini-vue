import { RendererElement } from "@vue/runtime-core";
import { isString } from "@vue/shared";

export function patchStyle(el: RendererElement, prevValue: any, nextValue: any) {
    const style = el.style;
    let isCssString = isString(nextValue)
    if (nextValue && !isCssString) {
        for (let key in nextValue) {
            setStyle(style, key, nextValue[key])
        }
        if (prevValue && !isString(prevValue)) {
            for (let key in prevValue) {
                if (nextValue[key] == null) {
                    setStyle(style, key, '')
                }
            }
        }
    }
}

function setStyle(style: CSSStyleDeclaration, key, value) {
    style[key] = value
}