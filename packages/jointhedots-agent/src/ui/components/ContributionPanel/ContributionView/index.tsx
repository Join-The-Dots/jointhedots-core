import { Contribution } from "../../../../services/generative/context"

export type Props = {
   contrib: Contribution
   onCheckout: (contrib: Contribution) => void
}

export function ContributionView(props: Props) {
   return <div>ContributionView</div>
}
