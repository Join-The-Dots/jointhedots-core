import Icon, { IconButton } from "@jointhedots/ui/Icon"
import { renderRoot } from "../config"

const icon_0 = "bi:house-door-fill[primary]|bi:exclamation-triangle-fill[badge,error]"

function ApplicationRoot() {
   return <>
      <Icon name={icon_0} />
      <Icon size="sm" name={icon_0} />

      <Icon size="xs" name={icon_0} />
      <Icon size="sm" name={icon_0} />
      <Icon size="md" name={icon_0} />
      <Icon size="lg" name={icon_0} />
      <Icon size="5.0em" name={icon_0} />
      <Icon size="10.0em" name={icon_0} />

      <IconButton size="5.0em" name="avatar:Hello World" />
      <IconButton size="5.0em" name="bad:Hello World" />
      <IconButton size="5.0em" name="[error]bi:house-door-fill" />
      
      <IconButton name="avatar:Hello World" />
      <IconButton name="bad:Hello World" />
      <IconButton name="[error]bi:house-door-fill" />
      
   </>
}

renderRoot(<ApplicationRoot />)
