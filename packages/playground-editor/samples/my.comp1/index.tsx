import { AST, LDXDisplayExpr, serializeElement } from "@jointhedots/core"
import { useInstrumentation } from "@jointhedots/ui/Instrumentation"
import Button from "@jointhedots/editors/ui/Button"

export default function (props) {
    const instr = useInstrumentation()

    const onClick = () => {
        const element = instr.getElement() as LDXDisplayExpr
        const xprops = serializeElement(element.props)
        xprops.properties[0].value = {
            $type: "LiteralExpr",
            value: "oo",
        }
        element.props.update(xprops)
    }

    return <div style={{ border: "solid thin #484", backgroundColor: "#8b8" }}>
        <div>My Component 1</div>
        <pre>{JSON.stringify(props, null, 2)}</pre>
        <Button onClick={onClick}>Ok</Button>
    </div>
}

