import { isOn } from "@vue/shared"
import { patchClass } from "./modules/class"

 /**
    * 为 prop 进行打补丁操作
    */
 export const patchProp = (el, key, prevValue, nextValue) => {
    if (key === 'class') {
        patchClass(el, nextValue)
    } else if (key === 'style') {
        // TODO: style
    } else if (isOn(key)) {
        // TODO: 事件
    } else {
        // TODO: 其他属性
    }
}