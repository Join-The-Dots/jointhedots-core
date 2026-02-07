import { useCallback, useEffect, useRef, useState } from 'react'

const WIDGET_SCRIPT_URL = 'https://platform.twitter.com/widgets.js'

type TweetComponentProps = Readonly<{
  tweetID: string
  onError?: (error: string) => void
  onLoad?: () => void
}>

let isTwitterScriptLoading = true

export function TweetComponent({
  tweetID,
  onError,
  onLoad,
}: TweetComponentProps) {
  const containerRef = useRef<HTMLDivElement | null>(null)

  const previousTweetIDRef = useRef<string>('')
  const [isTweetLoading, setIsTweetLoading] = useState(false)

  const createTweet = useCallback(async () => {
    try {
      // @ts-expect-error Twitter is attached to the window.
      await window.twttr.widgets.createTweet(tweetID, containerRef.current)

      setIsTweetLoading(false)
      isTwitterScriptLoading = false

      if (onLoad) {
        onLoad()
      }
    } catch (error) {
      if (onError) {
        onError(String(error))
      }
    }
  }, [onError, onLoad, tweetID])

  useEffect(() => {
    if (tweetID !== previousTweetIDRef.current) {
      setIsTweetLoading(true)

      if (isTwitterScriptLoading) {
        import(WIDGET_SCRIPT_URL).then(createTweet, onError)
      } else {
        createTweet()
      }

      if (previousTweetIDRef) {
        previousTweetIDRef.current = tweetID
      }
    }
  }, [createTweet, onError, tweetID])

  return (<>
    {isTweetLoading ? "Loading..." : null}
    <div
      style={{ display: 'inline-block', width: '550px' }}
      ref={containerRef}
    />
  </>)
}

