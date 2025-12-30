import { Contribution, IContributionContext } from "../../../service/generative/context"

export type Props = {
   thread: IContributionContext
   onCheckout: (contrib: Contribution) => void
}

export function ContributionThread(props: Props) {
   return <div>ContributionThread</div>
}
