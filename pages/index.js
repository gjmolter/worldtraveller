import { useEffect, useRef, useState } from "react";
import Head from "next/head";

//Components
import Tooltip from "../components/Tooltip";
import Toast from "../components/Toast";
import ComboBox from "../components/Combobox";
import YouveTravelled from "../components/YouveTravelled";

//Data
import { worldSVGs, getCountryById, getCountryByName } from "../utils/mapData";

//Libs
import { VectorMap } from "@south-paw/react-vector-maps";
import Draggable from "react-draggable";

//Icons
import {
  FiShare,
  FiX,
  FiPlus,
  FiMinus,
  FiChevronUp,
  FiChevronDown,
} from "react-icons/fi";

const normalBtns = {
  margin: "13px 13px 10px",
  fontSize: "20px",
};
const zoomEnabled = {
  margin: "13px 5px 10px",
  fontSize: "20px",
  color: "white",
  cursor: "pointer",
};
const zoomDisabled = {
  margin: "13px 5px 10px",
  fontSize: "20px",
  color: "gray",
};
const countryArrowsEnabled = {
  fontSize: "30px",
  margin: "8px 5px",
  color: "white",
  cursor: "pointer",
};
const countryArrowsDisabled = {
  fontSize: "30px",
  margin: "8px 5px",
  color: "gray",
};
const flagEmoji = {
  margin: "0 5px 0 0",
  cursor: "pointer",
  fontSize: 18,
};

// Non-reactive variables
let dbClickTimer = null;
const minZoom = 2.9;
const maxZoom = 120;
const zoomBy = 1.5;

const Home = () => {
  // Country List
  const [selected, setSelected] = useState([]);

  // Display Helpers
  const [scale, setScale] = useState(minZoom);
  const [hoveredCountryName, setHoveredCountryName] = useState("");
  const [hoveredFlagName, setHoveredFlagName] = useState("");
  const [toast, setToast] = useState("");
  const [toastWait, setToastWait] = useState();
  const [chevronUp, setChevronUp] = useState(countryArrowsDisabled);
  const [chevronDown, setChevronDown] = useState(countryArrowsDisabled);

  // Refs
  const countryListRef = useRef();

  /* Country List Scolling */

  // Change button styles according to list size
  function chevronScroll() {
    let listEl = countryListRef.current;
    var maxScrollTop = listEl.scrollHeight - listEl.offsetHeight;

    setChevronUp(
      maxScrollTop > 0 && listEl.scrollTop !== 0
        ? countryArrowsEnabled
        : countryArrowsDisabled
    );
    setChevronDown(
      maxScrollTop > 0 && listEl.scrollTop !== maxScrollTop
        ? countryArrowsEnabled
        : countryArrowsDisabled
    );
  }

  // Scroll buttons
  const scrollUp = () =>
    countryListRef.current.scrollBy({ top: -100, behavior: "smooth" });
  const scrollDown = () =>
    countryListRef.current.scrollBy({ top: 100, behavior: "smooth" });

  /* Zoom */

  const scaleUp = () => setScale(scale < maxZoom ? scale * zoomBy : scale);
  const scaleDown = () => setScale(scale > minZoom ? scale / zoomBy : scale);

  // Mouse wheel handler
  function wheelZoom(deltaY) {
    if (deltaY < 0) scaleUp();
    if (deltaY > 0) scaleDown();
  }

  // Custom double click on map Handler
  function onDoubleClickHandler() {
    if (dbClickTimer === null) {
      dbClickTimer = setTimeout(() => {
        dbClickTimer = null;
      }, 200);
    } else {
      scaleUp();
    }
  }

  /* Toasts */

  // Hide Toasts after 2s
  useEffect(() => {
    if (toast !== "") {
      if (toastWait) {
        clearTimeout(toastWait);
      }
      var timeout = setTimeout(() => {
        setToast("");
        setToastWait(null);
      }, 2000);
      setToastWait(timeout);
    }
  }, [toast]);

  /* Main Map Functions */

  const addCountry = (id) => {
    setSelected([...selected, id]);
    chevronScroll();
  };

  const removeCountry = (id) => {
    setSelected(selected.filter((countryId) => countryId !== id));
    chevronScroll();
  };

  /* Map Selection */

  // Country click handler
  const clickCountry = ({ target }) => {
    const id = target.attributes.id.value;
    selected.includes(id) ? removeCountry(id) : addCountry(id);
  };

  // Clear button handler
  const clearMap = () => {
    setSelected([]);
    setToast("Cleared Map");
  };

  /* Share */

  // Share button handler
  function shareMap() {
    //TODO
    console.log("shareMap");
  }

  return (
    <div>
      <Head>
        <meta
          name="viewport"
          content="width=device-width, initial-scale=1.0, maximum-scale=1.0, 
     user-scalable=0"
        ></meta>
      </Head>
      <header>
        <img src="/img/logo.png"></img>
      </header>
      <main>
        <YouveTravelled countries={selected} />
        <div className="panels addCountry">
          <div className="plusContainer">
            <FiPlus />
          </div>
          <ComboBox
            selectedList={selected}
            selectedCountry={(country) => {
              var codigo = getCountryByName(country).id;
              if (!selected.includes(codigo)) {
                addCountry(codigo.toLowerCase());
                setToast(`Added ${country}`);
              }
            }}
          />
        </div>
        <div className="panels share" onClick={shareMap}>
          <FiShare style={normalBtns} />
        </div>
        <div className="panels removeCountries">
          <FiChevronUp style={chevronUp} onClick={scrollUp} />
          <div ref={countryListRef} onScroll={chevronScroll}>
            {selected.map((country) => (
              <p
                key={country}
                style={flagEmoji}
                onClick={() => {
                  removeCountry(country);
                  setToast(`Removed ${getCountryById(country).name}`);
                  setHoveredFlagName("");
                }}
                onMouseOver={() =>
                  setHoveredFlagName(getCountryById(country).name)
                }
                onMouseLeave={() => setHoveredFlagName("")}
              >
                {getCountryById(country).flag}
              </p>
            ))}
          </div>
          <FiChevronDown style={chevronDown} onClick={scrollDown} />
        </div>
        <div className="panels zoom">
          <FiMinus
            style={scale > minZoom ? zoomEnabled : zoomDisabled}
            onClick={scaleDown}
          />
          <FiPlus
            style={scale < maxZoom ? zoomEnabled : zoomDisabled}
            onClick={scaleUp}
          />
        </div>
        <div className="panels clear" onClick={clearMap}>
          <FiX style={normalBtns} />
        </div>

        <div className="mapWrapper">
          <Draggable
            scale={scale}
            bounds={{ top: -150, left: -220, right: 220, bottom: 100 }}
          >
            <div
              className="map"
              data-tip
              data-for="mapTooltips"
              onWheel={(e) => wheelZoom(e.deltaY)}
              onClick={onDoubleClickHandler}
            >
              <VectorMap
                {...worldSVGs}
                checkedLayers={selected}
                layerProps={{
                  onClick: clickCountry,
                  onMouseEnter: ({ target }) =>
                    setHoveredCountryName(target.attributes.name.value),
                  onMouseLeave: () => setHoveredCountryName(""),
                }}
              />
            </div>
          </Draggable>
        </div>
      </main>

      <Tooltip visible={hoveredCountryName !== ""} offsetX={0} offsetY={-25}>
        <span className="tooltip">{hoveredCountryName}</span>
      </Tooltip>
      <Tooltip visible={hoveredFlagName !== ""} offsetX={20} offsetY={-5}>
        <span className="tooltip">{hoveredFlagName}</span>
      </Tooltip>
      <Toast text={toast} />

      <style jsx global>{`
        * {
          box-sizing: border-box;
          font-family: "Roboto";
        }

        body {
          margin: 0;
          padding: 0;
          background-image: url(img/textured-paper.png);
          background-repeat: repeat;
          height: 100vh;
          width: 100vw;
          overflow: hidden;
        }

        header {
          display: flex;
          justify-content: center;
          background: #2d2d2d;
          height: 120px;
        }

        header img {
          padding: 15px 0;
          max-width: 220px;
        }

        main {
          position: relative;
          padding: 30px;
          height: calc(100vh - 120px);
          overflow: hidden;
        }

        .mapWrapper {
          display: flex;
          justify-content: center;
          align-items: center;
          width: 100%;
          height: 100%;
          transform: scale(${scale});
        }

        .panels {
          position: fixed;
          background: #2d2d2d;
          color: white;
          text-align: center;
          z-index: 1;
          display: flex;
          justify-content: center;
        }

        .zoom {
          left: -1px;
          bottom: -1px;
          width: 70px;
          border-radius: 0 20px 0 0;
        }

        .removeCountries {
          left: -1px;
          top: 225px;
          bottom: 100px;
          width: 40px;
          border-radius: 0 20px 20px 0;
          display: flex;
          flex-direction: column;
        }
        .removeCountries div {
          overflow: scroll;
          scrollbar-width: none;
          -ms-overflow-style: none;
          flex: 1;
          -webkit-user-select: none;
          -moz-user-select: none;
          -ms-user-select: none;
          user-select: none;
        }
        .removeCountries div::-webkit-scrollbar {
          display: none;
        }

        .share {
          right: -1px;
          width: 45px;
          cursor: pointer;
          bottom: -1px;
          border-radius: 20px 0 0 0;
        }
        .share:hover,
        .clear:hover,
        .zoom:hover {
          background: #3d3d3d;
        }

        .clear {
          right: calc(50% - 23px);
          width: 45px;
          cursor: pointer;
          bottom: -1px;
          border-radius: 20px 20px 0 0;
        }

        .addCountry {
          left: -1px;
          width: 300px;
          top: 119px;
          border-radius: 0 0 20px 0;
          display: flex;
          justify-content: space-between;
          align-items: center;
          height: 50px;
        }

        .map {
          width: 80%;
          min-width: 850px;
          max-width: 1000px;
          padding: 200px 300px;
          display: flex;
          justify-content: center;
          align-items: center;
        }

        .map svg {
          stroke: #c2bfa6;
          stroke-width: 0.01px;
        }

        .map path {
          fill: #2d2d2dee;
          cursor: pointer;
          outline: none;
          stroke: rgba(0, 0, 0, 0);
          stroke-width: 0.5px;
          cursor: pointer;
        }

        .map path:hover {
          fill: #37825a99;
        }

        .map path[aria-checked="true"] {
          fill: #37825a;
        }

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

        .comboBox:focus {
          outline: none;
        }

        .plusContainer {
          width: 30px;
          justify-content: center;
          align-items: center;
          display: flex;
          margin-left: 10px;
          margin-top: 3px;
        }
        .plusContainer svg {
          font-size: 22px;
          color: gray;
        }
      `}</style>
    </div>
  );
};

export default Home;
