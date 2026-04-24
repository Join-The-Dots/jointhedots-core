import Icon from "@jointhedots/ui/Icon"
import { renderRoot } from "../components/config"
import { ButtonIcon } from "@jointhedots/ui/Inputs"

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

      <Icon name="standard:account" />
      <Icon size="lg" name="standard:account" />
      <Icon size="5.0em" name="utility:salesforce_page" />
      <Icon size="5.0em" name="standard:account[primary]|utility:einstein[badge,info]" />

      <ButtonIcon size="5.0em" icon="avatar:Hello World" />
      <ButtonIcon size="5.0em" icon={42 as any} />
      <ButtonIcon size="5.0em" icon={[] as any} />
      <ButtonIcon size="5.0em" icon="bad:Hello World" />
      <ButtonIcon size="5.0em" icon="[error]bi:house-door-fill" />
      
      <ButtonIcon icon="avatar:Hello World" />
      <ButtonIcon icon="bad:Hello World" />
      <ButtonIcon icon="[error]bi:house-door-fill" />
      <ButtonIcon icon="standard:account" />
      <ButtonIcon icon="utility:salesforce_page" />
      
   </>
}

renderRoot(<ApplicationRoot />)
