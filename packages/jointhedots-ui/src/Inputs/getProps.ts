const formPropsSet = new Set([
   'form',
   'formAction',
   'formEncType',
   'formMethod',
   'formNoValidate',
   'formTarget',
])

export function getHtmlProps(props) {
   return Object.keys(props).reduce((prev, key) => {
      if (formPropsSet.has(key) || key.startsWith("aria-") || key.startsWith("data-")) {
         prev[key] = props[key]
      }
      return prev
   }, {})
}
