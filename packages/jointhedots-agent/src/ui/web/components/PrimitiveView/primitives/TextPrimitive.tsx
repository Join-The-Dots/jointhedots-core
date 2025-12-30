import { TextPrimitive } from "../../../../service/generative/primitive"

export type Props = {
   data: TextPrimitive
}

export function TextPrimitiveView(props: Props) {
   const { data } = props
   return <div>text: {data.text}</div>
}
