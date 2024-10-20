import { useEffect } from "react";
import mermaid from "mermaid";

const MermaidComponent = ({ mermaidCode, id}) => {
  useEffect(() => {
    console.log("코드가 바뀌었어요.")
    // Set Mermaid configurations before running the diagram
    document.getElementById(id)?.removeAttribute("data-processed");

    mermaid.contentLoaded();
  }, [mermaidCode, id]);

  return <div id={id} className="mermaid">{mermaidCode}</div>;
};

export default MermaidComponent;