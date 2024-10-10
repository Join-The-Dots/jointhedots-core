

export default function (props) {
    return <div style={{ border: "solid thin #844", backgroundColor: "#b88" }}>
        <div>My Component 1</div>
        <pre>{JSON.stringify(props, null, 2)}</pre>
    </div>
}

