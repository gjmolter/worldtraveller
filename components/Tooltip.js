import { useState, useEffect } from "react";

const Tooltip = ({ visible = true, offsetX = 0, offsetY = 0, children }) => {
  const [xPos, setXPos] = useState(0);
  const [yPos, setYPos] = useState(0);

  function getTooltipPosition({ clientX: xPosition, clientY: yPosition }) {
    setXPos(xPosition);
    setYPos(yPosition);
  }

  useEffect(() => {
    if (visible) {
      window.addEventListener("mousemove", getTooltipPosition);
    } else {
      window.removeEventListener("mousemove", getTooltipPosition);
    }

    return () => {
      if (visible) {
        window.removeEventListener("mousemove", getTooltipPosition);
      }
    };
  }, [visible]);

  return (
    <div
      style={{
        display: visible ? "block" : "none",
        position: "fixed",
        top: yPos + offsetY,
        left: xPos + offsetX,
        zIndex: 10,
        pointerEvents: "none",
        whiteSpace: "nowrap",
      }}
    >
      {children}
    </div>
  );
};

export default Tooltip;
