import { useState, useEffect } from "react";

const Tooltip = ({ text = "", offsetX = 0, offsetY = 0, children }) => {
  const [xPos, setXPos] = useState(0);
  const [yPos, setYPos] = useState(0);

  function getTooltipPosition({ clientX: xPosition, clientY: yPosition }) {
    setXPos(xPosition);
    setYPos(yPosition);
  }

  useEffect(() => {
    if (text !== "") {
      window.addEventListener("mousemove", getTooltipPosition);
    } else {
      window.removeEventListener("mousemove", getTooltipPosition);
    }

    return () => {
      if (text !== "") {
        window.removeEventListener("mousemove", getTooltipPosition);
      }
    };
  }, [text]);

  return (
    <div
      style={{
        display: text !== "" ? "block" : "none",
        position: "fixed",
        top: yPos + offsetY,
        left: xPos + offsetX,
        zIndex: 10,
        pointerEvents: "none",
        whiteSpace: "nowrap",
      }}
    >
      <span className="tooltip">{text}</span>
      <style jsx>{`
        .tooltip {
          background: #363533bb;
          padding: 4px 7px;
          border-radius: 5px;
          color: #46e992;
          font-size: 12px;
          -webkit-user-select: none;
          -moz-user-select: none;
          -ms-user-select: none;
          user-select: none;
        }
      `}</style>
    </div>
  );
};

export default Tooltip;
