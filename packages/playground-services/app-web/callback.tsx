/* 
const CLIENT_ID = "Ov23lisD79eMabcUX7SQ" // Replace with actual client ID
const CLIENT_SECRET = "a6b2fe4b060183b8635f68cbd06543c0077a7ecf"

async function auth() {
   try {
      const params = new URLSearchParams(window.location.search)
      const githubCode = params.get("code")
      localStorage.setItem('github_code', githubCode)

      const res = await fetch(`https://github.com/login/oauth/access_token?client_id=${CLIENT_ID}&client_secret=${CLIENT_SECRET}&code=${githubCode}`, {
         method: "POST"
      })

      localStorage.setItem('github_token', await res.text())
      window.close()
   }
   catch (e) {
      console.error(e)
      alert(e.message)
   }
}

auth() */