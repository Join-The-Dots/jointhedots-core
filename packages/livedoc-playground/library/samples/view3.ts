export default {
  "type": "dataflow",
  "layout": {
     "type": "std:markdown",
     "blocks": [
        "# title\nbigblarebla",
        {
           "type": "std:mermaid",
           "code": "graph TD;\n    A-->B;\n    A-->C;\n    B-->D;\n    C-->D;\n"
        },
        `
# Heading 1

Some **bold** text and some _italic_ text.

- Item 1
- Item 2

> A blockquote

\`\`\`typescript
console.log('Hello, world!');
\`\`\`
`
     ]
  }
}