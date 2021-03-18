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
import html2canvas from "html2canvas";
import * as htmlToImage from "html-to-image";
import * as download from "downloadjs";

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
const closeShareBtn = {
  position: "absolute",
  right: 0,
  top: 0,
  fontSize: "50px",
  color: "#363533",
  cursor: "pointer",
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
  const [shareOpen, setShareOpen] = useState(false);
  const [shareText, setShareText] = useState("");
  const [buyMap, setBuyMap] = useState([
    "https://amzn.to/3bCUFJH",
    "Buy World Scratch Map",
  ]);

  // Refs
  const countryListRef = useRef();
  const shareMapRef = useRef();
  const shareWrapperRef = useRef();

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

  function mobileMapClick(e) {
    if (e.type === "touchstart") {
      var x = e.touches[0].clientX;
      var y = e.touches[0].clientY;
      var ev = document.createEvent("MouseEvent");
      var el = document.elementFromPoint(x, y);
      ev.initMouseEvent(
        "click",
        true,
        true,
        window,
        null,
        x,
        y,
        0,
        0,
        false,
        false,
        false,
        false,
        0,
        null
      );
      el.dispatchEvent(ev);
      document.activeElement.blur();
    }
  }

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
    setShareOpen(true);
    html2canvas(shareMapRef.current, { width: 750, height: 525 }).then(
      function (canvas) {
        shareWrapperRef.current.appendChild(canvas);
        var elPText = document.querySelector(".percentage p").textContent;
        var elSelectText = document.querySelector(".percentage select")
          .textContent;
        var elSelectedIndex = document.querySelector(".percentage select")
          .selectedIndex;
        elPText = elPText.replace(elSelectText, "").replace("You've", "I've");

        switch (elSelectedIndex) {
          case 0:
            setShareText(`${elPText} World Land`);
            break;
          case 1:
            setShareText(`${elPText} European Union`);
            break;
          case 2:
            setShareText(`${elPText} Ancient 7 Wonders Countries`);
            break;
          case 3:
            setShareText(`${elPText} New 7 Wonders Countries`);
            break;
          case 4:
            setShareText(`${elPText} World Monarchies`);
            break;

          default:
            break;
        }
      }
    );
  }

  //Save image
  function saveImage() {
    document.querySelector(".shareWrapper svg").style.display = "none";
    htmlToImage.toPng(shareWrapperRef.current).then((dataUrl) => {
      download(dataUrl, "ivetravelled-map.png");
      document.querySelector(".shareWrapper svg").style.display = "block";
    });
  }

  /* Amazon Links */

  //Set Brazilian Amazon Link based on Browser Language
  useEffect(() => {
    if (window && window.navigator?.language === "pt-BR") {
      setBuyMap(["https://amzn.to/2P12KjS", "Comprar Mapa de Raspar"]);
    }
  }, []);

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
        <img src="/img/logo.png" id="logo" />
        <div className="amazon">
          <a href={buyMap[0]} target="_blank">
            <img src="/img/scratchMap.png" />
            <span>{buyMap[1]}</span>
          </a>
        </div>
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
        <div
          className="panels removeCountries"
          style={{ left: selected.length > 0 ? "-1px" : "-50px" }}
        >
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
            onMouseDown={mobileMapClick}
          >
            <div
              className="map"
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
      <Tooltip text={hoveredCountryName} offsetX={0} offsetY={-25} />
      <Tooltip text={hoveredFlagName} offsetX={20} offsetY={-5} />
      <Toast text={toast} />

      <div
        ref={shareMapRef}
        className="map"
        style={{
          padding: 0,
          margin: "50px",
          backgroundImage: "url(img/textured-paper.png)",
          backgroundRepeat: "repeat",
        }}
      >
        <VectorMap
          {...worldSVGs}
          checkedLayers={selected}
          style={{ padding: 0 }}
        />
      </div>

      <div
        style={{ display: shareOpen ? "flex" : "none" }}
        className="shareWrapper"
      >
        <div ref={shareWrapperRef}>
          <FiX
            style={closeShareBtn}
            onClick={() => {
              setShareOpen(false);
              document.querySelector(".shareWrapper canvas").remove();
              setShareText("");
            }}
          />
          <p>{shareText}</p>
          <img src="/img/logo.png" />
        </div>
        <button onClick={saveImage}>Download Image</button>
      </div>

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

        .panels {
          position: fixed;
          background: #2d2d2d;
          color: white;
          text-align: center;
          z-index: 1;
          display: flex;
          justify-content: center;
        }

        header {
          display: flex;
          background: #2d2d2d;
          height: 120px;
        }

        header #logo {
          padding: 18px 0;
          max-width: 220px;
          margin: 0 5px;
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

        .zoom {
          left: -1px;
          bottom: -1px;
          width: 70px;
          border-radius: 0 20px 0 0;
        }

        .shareWrapper {
          position: fixed;
          top: 0px;
          left: 0px;
          width: 100vw;
          height: 100vh;
          display: flex;
          justify-content: center;
          flex-direction: column;
          align-items: center;
          z-index: 100;
          background: #0007;
        }
        .shareWrapper button {
          margin-top: 10px;
          padding: 5px 10px;
          border: #46e992 1px solid;
          background: #2d2d2d;
          color: #46e992;
          font-size: 16px;
        }
        .shareWrapper img {
          position: absolute;
          bottom: 10px;
          left: calc(50% - 60px);
          width: 120px;
          filter: drop-shadow(0px 0px 3px #0009);
        }
        .shareWrapper p {
          position: absolute;
          top: 0;
          left: 0;
          width: calc(100% - 110px);
          padding: 20px;
          margin: 0 55px;
          background: #363636;
          color: #46e992;
          border-radius: 0 0 25px 25px;
          text-align: center;
          font-size: 18px;
          font-weight: bold;
        }
        .shareWrapper > div {
          padding: 100px 20px 0px;
          background-image: url(img/textured-paper.png);
          background-repeat: repeat;
          border: 5px solid rgb(55, 54, 53);
          position: relative;
          box-shadow: rgb(0 0 0 / 47%) 0px 0px 40px 10px;
          overflow: hidden;
          width: 85% !important;
          height: auto !important;
          max-width: 800px;
          min-height: 220px;
        }
        .shareWrapper > div > canvas {
          width: 100% !important;
          height: auto !important;
        }

        .amazon {
          flex: 1;
          display: flex;
          justify-content: center;
          align-items: flex-end;
          flex-direction: column;
          padding: 8px;
        }

        .amazon a {
          display: flex;
          justify-content: flex-end;
          align-items: flex-end;
          flex-direction: column;
          max-width: 90px;
          border: 1px solid #46e99277;
          border-radius: 11px;
          padding: 7px;
        }

        .amazon img {
          max-width: 100%;
          max-height: 90px;
          border-radius: 5px;
        }

        .amazon span {
          color: white;
          text-align: center;
          margin-top: 6px;
          font-size: 11.5px;
        }

        .removeCountries {
          top: 225px;
          bottom: 100px;
          width: 40px;
          border-radius: 0 20px 20px 0;
          display: flex;
          flex-direction: column;
          transition: left 200ms ease;
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

        .plusContainer {
          width: 40px;
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

        @media only screen and (max-width: 768px) {
          .plusContainer {
            display: none;
          }
          .addCountry {
            width: 100%;
            left: 0;
            border-radius: 0;
            justify-content: center;
            top: 159px;
            height: 40px;
          }
        }
        @media (pointer: coarse) {
          .clear {
            right: -1px;
            width: 45px;
            cursor: pointer;
            bottom: -1px;
            border-radius: 20px 0 0 0;
          }
          .share {
            display: none;
          }
        }
      `}</style>
    </div>
  );
};

export default Home;
