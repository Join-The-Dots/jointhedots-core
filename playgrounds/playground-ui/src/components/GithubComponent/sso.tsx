// App.jsx
import { Button } from "@jointhedots/button"
import React, { useEffect } from "react"

const CLIENT_ID = "Ov23lisD79eMabcUX7SQ" // Replace with actual client ID
const REDIRECT_URI = "http://localhost:3001/callback.html?from=github"

export function GithubSSOEditor(props) {

   const loginWithGitHub = () => {
      const githubAuthUrl = `https://github.com/login/oauth/authorize?client_id=${CLIENT_ID}&redirect_uri=${encodeURIComponent(REDIRECT_URI)}&scope=read:user`
      window.open(githubAuthUrl)
   }

   return <div style={{ padding: "2rem" }}>
      <h1>GitHub SSO (Frontend Only)</h1>
      <button onClick={loginWithGitHub}>Login with GitHub</button>
      <Button label="Save" onClick={()=>props.onValidate(props.manifest)}/>
   </div>
}
