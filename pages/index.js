import { useEffect, useRef, useState } from "react";
import Head from "next/head";
import dynamic from "next/dynamic";

//Components
import Tooltip from "../components/Tooltip";
import Toast from "../components/Toast";
import ComboBox from "../components/Combobox";
import YouveTravelled from "../components/YouveTravelled";

const WorldMap = dynamic(() => import("../components/WorldMap"), {
  ssr: false,
});

//Data
import { getCountryById, getCountryByName } from "../utils/mapData";

//Libs
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

const minZoom = -0.75;
const maxZoom = 8;

const Home = () => {
  // Country List
  const [selected, setSelected] = useState([]);

  // Display Helpers
  const [scale, setScale] = useState(1.15);
  const [hoveredCountryName, setHoveredCountryName] = useState("");
  const [hoveredFlagName, setHoveredFlagName] = useState("");
  const [toast, setToast] = useState("");
  const [toastWait, setToastWait] = useState();
  const [chevronUp, setChevronUp] = useState(countryArrowsDisabled);
  const [chevronDown, setChevronDown] = useState(countryArrowsDisabled);
  const [shareOpen, setShareOpen] = useState(false);
  const [shareText, setShareText] = useState("");
  const [shareImage, setShareImage] = useState("");
  const [travelSummary, setTravelSummary] = useState({
    label: "World Land",
    percentage: "0",
  });

  // Refs
  const countryListRef = useRef();
  const shareWrapperRef = useRef();
  const mapRef = useRef();

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

  const scaleUp = () => mapRef.current?.zoomIn();
  const scaleDown = () => mapRef.current?.zoomOut();

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
  const clickCountry = (id) => {
    selected.includes(id) ? removeCountry(id) : addCountry(id);
  };

  // Clear button handler
  const clearMap = () => {
    setSelected([]);
    setToast("Cleared Map");
  };

  /* Share */

  // Share button handler
  async function shareMap() {
    setShareOpen(true);
    setShareImage((await mapRef.current?.captureWorld()) || "");
    setShareText(
      `I've travelled ${travelSummary.percentage}% of the ${travelSummary.label}`,
    );
  }

  //Save image
  function saveImage() {
    document.querySelector(".shareWrapper .closeShare").style.display = "none";
    htmlToImage.toPng(shareWrapperRef.current).then((dataUrl) => {
      download(dataUrl, "ivetravelled-map.png");
      document.querySelector(".shareWrapper .closeShare").style.display = "block";
    });
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
        <div className="addCountry">
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
        <img src="/img/logo.png" id="logo" alt="I've Travelled" />
        <YouveTravelled
          countries={selected}
          onSummaryChange={setTravelSummary}
        />
      </header>
      <main>
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
          <WorldMap
            controlRef={mapRef}
            selected={selected}
            onCountryClick={clickCountry}
            onCountryEnter={setHoveredCountryName}
            onCountryLeave={() => setHoveredCountryName("")}
            onZoom={setScale}
          />
        </div>
      </main>
      <Tooltip text={hoveredCountryName} offsetX={0} offsetY={-25} />
      <Tooltip text={hoveredFlagName} offsetX={20} offsetY={-5} />
      <Toast text={toast} />

      <div
        style={{ display: shareOpen ? "flex" : "none" }}
        className="shareWrapper"
      >
        <div ref={shareWrapperRef}>
          <FiX
            className="closeShare"
            style={closeShareBtn}
            onClick={() => {
              setShareOpen(false);
              setShareImage("");
              setShareText("");
            }}
          />
          <p>{shareText}</p>
          {shareImage ? (
            <img className="shareMapImage" src={shareImage} alt="Your travel map" />
          ) : (
            <span className="shareLoading">Preparing your map…</span>
          )}
          <img className="shareLogo" src="/img/logo.png" alt="I've Travelled" />
          <small className="shareAttribution">
            © MapTiler · OpenFreeMap · © OpenMapTiles · © OpenStreetMap · Marine
            Regions EEZ v12 (CC BY 4.0)
          </small>
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
          z-index: 8;
          display: flex;
          justify-content: center;
        }

        header {
          position: relative;
          z-index: 10;
          display: grid;
          grid-template-areas: "search logo progress";
          grid-template-columns: minmax(280px, 1fr) auto minmax(420px, 1fr);
          align-items: center;
          gap: 24px;
          padding: 0 18px;
          background: #2d2d2d;
          height: 96px;
        }

        header #logo {
          grid-area: logo;
          width: 190px;
          max-height: 78px;
          justify-self: center;
          object-fit: contain;
        }

        main {
          position: relative;
          padding: 0;
          height: calc(100vh - 96px);
          overflow: hidden;
        }

        .mapWrapper {
          position: relative;
          width: 100%;
          height: 100%;
          overflow: hidden;
        }

        .worldMap {
          width: 100%;
          height: 100%;
        }

        .maplibregl-canvas {
          outline: none;
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
        .shareWrapper .shareLogo {
          position: absolute;
          bottom: 10px;
          left: calc(50% - 60px);
          width: 120px;
          filter: drop-shadow(0px 0px 3px #0009);
        }
        .shareAttribution {
          position: absolute;
          right: 10px;
          bottom: 8px;
          padding: 2px 5px;
          border-radius: 3px;
          background: rgba(244, 239, 223, 0.86);
          color: #4a4941;
          font-size: 8px;
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
        .shareWrapper .shareMapImage {
          position: static;
          display: block;
          width: 100% !important;
          height: auto !important;
        }

        .shareLoading {
          display: block;
          min-height: 260px;
          padding-top: 110px;
          color: #363636;
          text-align: center;
        }

        .removeCountries {
          top: 116px;
          bottom: 70px;
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
          grid-area: search;
          width: 280px;
          display: flex;
          justify-content: space-between;
          align-items: center;
          height: 50px;
          color: white;
        }

        header .percentage {
          grid-area: progress;
        }

        @media only screen and (max-width: 768px) {
          header {
            grid-template-areas:
              "logo"
              "progress"
              "search";
            grid-template-columns: 1fr;
            grid-template-rows: 64px 40px 40px;
            gap: 0;
            height: 144px;
            padding: 0 10px;
          }

          header #logo {
            width: 155px;
            max-height: 58px;
          }

          main {
            height: calc(100vh - 144px);
          }

          .plusContainer {
            display: none;
          }

          .addCountry {
            width: 100%;
            justify-content: center;
            height: 40px;
          }

          .removeCountries {
            top: 164px;
            bottom: 70px;
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
