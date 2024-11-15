import { LDXElementExpr } from "@sf-explorer/core/interpreter/exprs"
import { useInstrumentation } from "@sf-explorer/core/ui/Instrumentation/instrumentation"
import Button from "@sf-explorer/editors/ui/Button"


export default function (props) {
    const instr = useInstrumentation()

    const onClick = () => {
        const xpr = instr.getElement() as LDXElementExpr
        xpr.update(async (self, B) => {
            //builder.modify(xpr)
            xpr.props.properties[0].value = await xpr.props.NewFrom({
                type: "Literal",
                value: "oo",
            } as any)
            return xpr
        })
    }

    return <div style={{ border: "solid thin #484", backgroundColor: "#8b8" }}>
        <div>My Component 1</div>
        <pre>{JSON.stringify(props, null, 2)}</pre>
        <Button onClick={onClick}>Ok</Button>
    </div>
}

