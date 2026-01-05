import { Contribution } from "../../../../services/generative/context"

export type Props = {
   thread: Contribution
   onCheckout: (contrib: Contribution) => void
}

export function ContributionThread(props: Props) {
   return <div>ContributionThread</div>
}
