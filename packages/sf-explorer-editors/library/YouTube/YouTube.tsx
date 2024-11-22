
export type YouTubeComponentProps = Readonly<{
  videoID: string
}>

export function YouTubeComponent({
  videoID,
}: YouTubeComponentProps) {
  return (
    <iframe
      width="560"
      height="315"
      src={`https://www.youtube-nocookie.com/embed/${videoID}`}
      frameBorder="0"
      allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
      allowFullScreen={true}
      title="YouTube video"
    />
  )
}
