import { useEffect, useRef } from "react";

const Tooltip = ({ text = "", offsetX = 0, offsetY = 0, children }) => {
  const tooltipRef = useRef(null);

  useEffect(() => {
    let animationFrame = null;
    let nextPosition = null;
    const updateTooltipPosition = ({ clientX, clientY }) => {
      nextPosition = { x: clientX + offsetX, y: clientY + offsetY };
      if (animationFrame != null) return;

      animationFrame = window.requestAnimationFrame(() => {
        animationFrame = null;
        if (!tooltipRef.current || !nextPosition) return;
        tooltipRef.current.style.transform =
          `translate3d(${nextPosition.x}px, ${nextPosition.y}px, 0)`;
      });
    };

    window.addEventListener("mousemove", updateTooltipPosition, {
      passive: true,
    });

    return () => {
      window.removeEventListener("mousemove", updateTooltipPosition);
      if (animationFrame != null) {
        window.cancelAnimationFrame(animationFrame);
      }
    };
  }, [offsetX, offsetY]);

  return (
    <div
      ref={tooltipRef}
      role="tooltip"
      aria-hidden={text === ""}
      data-visible={text !== ""}
      style={{
        display: text !== "" ? "block" : "none",
        position: "fixed",
        top: 0,
        left: 0,
        zIndex: 10,
        pointerEvents: "none",
        whiteSpace: "nowrap",
        willChange: "transform",
      }}
    >
      <span className="tooltip">{text}</span>
      <style jsx>{`
        .tooltip {
          background: #363533bb;
          padding: 4px 7px;
          border-radius: 5px;
          color: var(--accent-on-dark, #8fc9a7);
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
