import React, { useRef, useEffect } from "react"
import mermaid from "mermaid"

mermaid.initialize({
   startOnLoad: true,
   theme: "default",
   securityLevel: "loose",
   themeCSS: `
    g.classGroup rect {
      fill: #282a36;
      stroke: #6272a4;
    } 
    g.classGroup text {
      fill: #f8f8f2;
    }
    g.classGroup line {
      stroke: #f8f8f2;
      stroke-width: 0.5;
    }
    .classLabel .box {
      stroke: #21222c;
      stroke-width: 3;
      fill: #21222c;
      opacity: 1;
    }
    .classLabel .label {
      fill: #f1fa8c;
    }
    .relation {
      stroke: #ff79c6;
      stroke-width: 1;
    }
    #compositionStart, #compositionEnd {
      fill: #bd93f9;
      stroke: #bd93f9;
      stroke-width: 1;
    }
    #aggregationEnd, #aggregationStart {
      fill: #21222c;
      stroke: #50fa7b;
      stroke-width: 1;
    }
    #dependencyStart, #dependencyEnd {
      fill: #00bcd4;
      stroke: #00bcd4;
      stroke-width: 1;
    } 
    #extensionStart, #extensionEnd {
      fill: #f8f8f2;
      stroke: #f8f8f2;
      stroke-width: 1;
    }`,
   fontFamily: "Fira Code"
});

const getCode = (arr = []) =>
   arr
      .map((dt) => {
         if (typeof dt === "string") {
            return dt;
         }
         if (dt.props && dt.props.children) {
            return getCode(dt.props.children);
         }
         return false;
      })
      .filter(Boolean)
      .join("");

const randomid = () => parseInt(String(Math.random() * 1e15), 10).toString(36)

export function MermaidDisplay({ code }: { code: string }) {
   const domid = `dome${randomid()}`
   const demoid = useRef(domid);

   const demo = useRef(null);

   useEffect(() => {
      if (demo.current) {
         try {
            // @ts-ignore
            console.log('mermaid')
            const str = mermaid.render(
               domid,
               code,
               demo.current
            ).then((res) => {
               demo.current.innerHTML = res.svg
            })
            // @ts-ignore
            //demo.current.innerHTML = str;
         } catch (error) {
            // @ts-ignore
            demo.current.innerHTML = error;
         }
      }
   }, [code, demo])

   return <div ref={demo} />
}



