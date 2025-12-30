import { ImagePrimitive } from "../../../../service/generative/primitive"

export type Props = {
   data: ImagePrimitive
}

export function ImagePrimitiveView(props: Props) {
   const { data } = props
   return <div>image</div>
}
