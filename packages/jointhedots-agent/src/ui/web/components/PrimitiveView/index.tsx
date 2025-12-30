import { AnyPrimitive } from "../../../service/generative/primitive"
import { TextPrimitiveView } from "./primitives/TextPrimitive"
import { ImagePrimitiveView } from "./primitives/ImagePrimitive"

export type Props = {
   data: AnyPrimitive
}

export function PrimitiveView(props: Props) {
   const { data } = props
   switch (data.type) {
      case "text":
         return <TextPrimitiveView data={data} />
      case "image":
         return <ImagePrimitiveView data={data} />
      default:
         return <></>
   }
}
