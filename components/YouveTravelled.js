import { useEffect, useState } from "react";
import {
  monarchies,
  getCountryById,
  worldLand,
  europeanUnion,
} from "../utils/mapData";

const YouveTravelled = ({ countries }) => {
  const [currentDisplay, setCurrentDisplay] = useState("land");
  const [displayPercentage, setDisplayPercentage] = useState(0);

  useEffect(() => {
    switch (currentDisplay) {
      case "land":
        var landPercentage = 0;
        countries.forEach((country) => {
          landPercentage += getCountryById(country).land;
        });
        setDisplayPercentage(landPercentage / worldLand);
        break;
      case "monarchies":
        var monCount = 0;
        countries.forEach((country) => {
          if (monarchies.includes(country)) monCount++;
        });
        setDisplayPercentage((monCount / monarchies.length) * 100);
        break;
      case "eu":
        var euCount = 0;
        countries.forEach((country) => {
          if (europeanUnion.includes(country)) euCount++;
        });
        setDisplayPercentage((euCount / europeanUnion.length) * 100);
        break;
      default:
        setDisplayPercentage(0);
        break;
    }
  }, [countries, currentDisplay]);

  function handleSelectChange(event) {
    setCurrentDisplay(event.target.value);
  }

  return (
    <>
      <div className="panels percentage">
        <p>
          You've travelled{" "}
          <strong>
            {displayPercentage > 0 ? displayPercentage.toFixed(1) : 0}%
          </strong>{" "}
          of the{" "}
          <select
            value={currentDisplay}
            onChange={handleSelectChange}
            className="selectDisplay"
          >
            <option value="land">World Land</option>
            <option value="monarchies">World Monarchies</option>
            {/* <option value="north">North Hemisphere</option>
            <option value="south">South Hemisphere</option> */}
            <option value="eu">European Union</option>
          </select>
        </p>
      </div>
      <style jsx>{`
        .selectDisplay {
          border: 1px solid #46e992;
          border-radius: 5px;
          background: no-repeat;
          color: white;
          font-size: 17px;
          appearance: none;
          padding: 3px 7px;
          margin-left: 2px;
        }
        .selectDisplay:focus {
          outline: none;
        }

        .selectDisplay option {
          background: #2d2d2d;
          color: white;
        }

        .percentage {
          right: -1px;
          width: 400px;
          top: 119px;
          border-radius: 0 0 0 20px;
        }
        .percentage strong {
          color: #46e992;
        }
      `}</style>
    </>
  );
};

export default YouveTravelled;
