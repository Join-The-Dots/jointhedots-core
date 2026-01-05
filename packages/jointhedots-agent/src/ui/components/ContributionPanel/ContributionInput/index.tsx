import { Contribution } from "../../../../services/generative/context"

export type Props = {
   contribution: Contribution
   onContribute: (contrib: Contribution) => void
}

export function ContributionInput(props: Props) {
   return <div>ContributionInput</div>
}
