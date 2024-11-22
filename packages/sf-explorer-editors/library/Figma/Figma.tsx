
export type FigmaComponentProps = Readonly<{
  documentID: string
}>

export function FigmaComponent({
  documentID,
}: FigmaComponentProps) {
  return (
    <iframe
      width="560"
      height="315"
      src={`https://www.figma.com/embed?embed_host=lexical&url=\
        https://www.figma.com/file/${documentID}`}
      allowFullScreen={true}
    />
  )
}
