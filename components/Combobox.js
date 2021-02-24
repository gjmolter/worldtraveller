import { useState, useEffect } from "react";
import {
  Combobox,
  ComboboxInput,
  ComboboxPopover,
  ComboboxList,
  ComboboxOption,
} from "@reach/combobox";
import "@reach/combobox/styles.css";

import { worldJSON } from "../utils/mapData";

const ComboBox = ({ selectedCountry, selectedList = [] }) => {
  const [term, setTerm] = useState("");
  const [results, setResults] = useState(worldJSON);

  useEffect(() => {
    var tempCountries = worldJSON.filter((country) => {
      return (
        country.name.toLowerCase().includes(term.trim().toLowerCase()) &&
        !selectedList.includes(country.id.toLowerCase())
      );
    });
    setResults(tempCountries);
  }, [term]);

  return (
    <Combobox
      openOnFocus
      onSelect={(item) => {
        selectedCountry(item);
        setTerm("");
      }}
    >
      <ComboboxInput
        value={term}
        onChange={(e) => setTerm(e.target.value)}
        selectOnClick
        className="addCountryInput"
        placeholder="Add Country..."
      />
      {results && (
        <ComboboxPopover className="comboPopOver">
          {results.length > 0 ? (
            <ComboboxList>
              {results.map((country, index) => (
                <ComboboxOption
                  key={index}
                  value={country.name}
                  className="comboOption"
                >
                  <span style={{ marginRight: "8px" }}>{country.flag}</span>
                  {country.name}
                </ComboboxOption>
              ))}
            </ComboboxList>
          ) : (
            <span style={{ display: "block", margin: 8 }}>
              No results found
            </span>
          )}
        </ComboboxPopover>
      )}
      <style jsx global>{`
        .addCountryInput {
          width: 250px;
          margin: 10px;
          border: none;
          background: none;
          color: white;
          font-size: 18px;
          padding: 5px;
        }
        .addCountryInput:focus {
          outline: none;
        }

        .comboPopOver {
          margin-top: 14px;
          margin-left: -5px;
          z-index: 10;
          background: #2d2d2d;
          color: white;
          max-height: 200px;
          overflow: scroll;
          -ms-overflow-style: none;
          scrollbar-width: none;
        }
        .comboPopOver::-webkit-scrollbar {
          display: none; /* Safari and Chrome */
        }

        .comboOption:hover,
        [data-reach-combobox-option][aria-selected="true"] {
          background: #46e992;
          color: #2d2d2d;
          font-weight: bold;
        }
      `}</style>
    </Combobox>
  );
};

export default ComboBox;
