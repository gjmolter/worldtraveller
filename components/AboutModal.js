import { useEffect, useRef } from "react";
import { FiExternalLink, FiX } from "react-icons/fi";
import {
  categoryReviewedOn,
  categorySources,
} from "../utils/categoryData";

const mapSources = [
  {
    id: "us-census-subdivisions",
    label: "U.S. Census Bureau — state cartographic boundaries",
    url: "https://www.census.gov/geographies/mapping-files/time-series/geo/cartographic-boundary.html",
    dateLabel: "January 1, 2025 vintage; reviewed 23 Aug 2026",
    detail: "Official generalized boundaries for the 50 states and District of Columbia, pinned locally for subdivision selection and progress.",
  },
  {
    id: "statcan-subdivisions",
    label: "Statistics Canada — province and territory boundaries",
    url: "https://www12.statcan.gc.ca/census-recensement/2021/geo/sip-pis/boundary-limites/index2021-eng.cfm?year=21",
    dateLabel: "2021 Census boundaries; reviewed 23 Aug 2026",
    detail: "Official cartographic boundaries for Canada's 10 provinces and 3 territories, pinned locally for subdivision selection and progress.",
  },
  {
    id: "ibge-subdivisions",
    label: "IBGE — Brazilian federation-unit boundaries",
    url: "https://www.ibge.gov.br/geociencias/organizacao-do-territorio/malhas-territoriais/15774-malhas.html",
    dateLabel: "2025 territorial mesh; reviewed 23 Aug 2026",
    detail: "Official current boundaries for Brazil's 26 states and Federal District, pinned locally for subdivision selection and progress.",
  },
  {
    id: "inegi-subdivisions",
    label: "INEGI — Mexican federal-entity boundaries",
    url: "https://www.inegi.org.mx/programas/mg/",
    dateLabel: "2025 Statistical Framework; reviewed 23 Aug 2026",
    detail: "Official boundaries for Mexico's 31 states and Mexico City, pinned locally for subdivision selection and progress.",
  },
  {
    id: "abs-subdivisions",
    label: "Australian Bureau of Statistics — states and territories",
    url: "https://www.abs.gov.au/statistics/standards/australian-statistical-geography-standard-asgs/edition-4-july-2026-june-2031/access-and-downloads/digital-boundary-files",
    dateLabel: "ASGS Edition 4, 2026; reviewed 23 Aug 2026",
    detail: "Official boundaries for Australia's six states and two internal territories. The combined Other Territories record is excluded because the external territories remain separate CPBR Atlas places.",
  },
  {
    id: "argentina-ign-subdivisions",
    label: "Argentina IGN — province boundaries",
    url: "https://www.ign.gob.ar/NuestrasActividades/InformacionGeoespacial/CapasSIG",
    dateLabel: "Official maintained layer; reviewed 23 Aug 2026",
    detail: "Official boundaries for Argentina's 23 provinces and the Autonomous City of Buenos Aires. Tierra del Fuego interaction geometry is limited to Argentine-administered land so disputed and separately selectable South Atlantic and Antarctic areas are not duplicated.",
  },
  {
    id: "bkg-subdivisions",
    label: "BKG — German Länder boundaries",
    url: "https://gdz.bkg.bund.de/index.php/default/open-data/wfs-verwaltungsgebiete-1-250-000-stand-01-01-wfs-vg250.html",
    dateLabel: "VG250, 1 January 2025; reviewed 23 Aug 2026",
    detail: "Official federal boundaries for Germany's 16 constituent states, supplied by the Federal Agency for Cartography and Geodesy under Data Licence Germany — attribution — version 2.0.",
  },
  {
    id: "istat-subdivisions",
    label: "Istat — Italian regional boundaries",
    url: "https://www.istat.it/notizia/confini-delle-unita-amministrative-a-fini-statistici-al-1-gennaio-2018-2/",
    dateLabel: "Generalized boundaries, 1 January 2026; reviewed 23 Aug 2026",
    detail: "Official statistical administrative boundaries for Italy's 20 regions.",
  },
  {
    id: "gsi-subdivisions",
    label: "GSI — Japanese prefecture boundaries",
    url: "https://www.gsi.go.jp/kankyochiri/gm_japan_e.html",
    dateLabel: "Global Map Japan version 2.1, 1 January 2015; reviewed 23 Aug 2026",
    detail: "Official Geospatial Information Authority of Japan boundary data. Its municipal polygons are dissolved into the 47 prefecture outlines; disputed Northern Territories are excluded from interaction geometry, and the source vintage is shown because the newer national municipal layer is unnecessarily large for this use.",
  },
  {
    id: "south-africa-subdivisions",
    label: "MDB-derived South African province boundaries",
    url: "https://dataportal-mdb-sa.opendata.arcgis.com/",
    dateLabel: "MDB-based nine-province geography; reviewed against Statistics South Africa on 23 Aug 2026",
    detail: "Provincial polygons carrying Municipal Demarcation Board codes, with the nine-province roster cross-checked against Statistics South Africa's official geography publications.",
  },
  {
    id: "swisstopo-subdivisions",
    label: "swisstopo — Swiss canton boundaries",
    url: "https://www.swisstopo.admin.ch/en/landscape-model-swissboundaries3d",
    dateLabel: "swissBOUNDARIES3D, 1 January 2026; reviewed 23 Aug 2026",
    detail: "The Federal Office of Topography's current official polygons for Switzerland's 26 cantons.",
  },
  {
    id: "statistik-austria-subdivisions",
    label: "Statistics Austria — Austrian state boundaries",
    url: "https://data.statistik.gv.at/web/meta.jsp?dataset=OGDEXT_REG_SRV_1",
    dateLabel: "NUTS-2 boundaries, 1 January 2026; reviewed 23 Aug 2026",
    detail: "Statistics Austria's official regional boundary service, using the nine NUTS-2 areas that correspond to Austria's federal states.",
  },
  {
    id: "gisco-spain-subdivisions",
    label: "Eurostat GISCO — Spanish regional boundaries",
    url: "https://ec.europa.eu/eurostat/web/gisco/geodata/statistical-units/territorial-units-statistics",
    dateLabel: "NUTS 2024 Level 2; reviewed 24 Aug 2026",
    detail: "Official statistical geometry for Spain's 17 autonomous communities. Ceuta and Melilla retain their existing standalone CPBR Atlas place records, avoiding duplicate selection and land accounting.",
  },
  {
    id: "kadaster-netherlands-subdivisions",
    label: "Kadaster / PDOK — Dutch provincial boundaries",
    url: "https://www.kadaster.nl/zakelijk/producten/percelen-en-grenzen/bestuurlijke-gebieden",
    dateLabel: "Official maintained WFS; reviewed 24 Aug 2026",
    detail: "Kadaster's official Bestuurlijke Gebieden service for the Netherlands' 12 provinces.",
  },
  {
    id: "gisco-poland-subdivisions",
    label: "Eurostat GISCO and Statistics Poland — Polish voivodeships",
    url: "https://stat.gov.pl/en/regional-statistics/classification-of-territorial-units/administrative-division-of-poland/",
    dateLabel: "NUTS 2024 geometry and current 16-voivodeship roster; reviewed 24 Aug 2026",
    detail: "Official NUTS-2 geometry cross-checked against Statistics Poland. Warszawski stołeczny and Mazowiecki regionalny are recombined to represent the administrative Masovian Voivodeship.",
  },
  {
    id: "igac-colombia-subdivisions",
    label: "IGAC — Colombian administrative boundaries",
    url: "https://www.igac.gov.co/datos-abiertos/datos-abiertos-geoespaciales",
    dateLabel: "Official maintained layers; reviewed 24 Aug 2026",
    detail: "The Instituto Geográfico Agustín Codazzi's official department layer plus the Bogotá municipality boundary for the Capital District: 32 departments and Bogotá, D.C.",
  },
  {
    id: "ine-chile-subdivisions",
    label: "Chile INE — regional boundaries",
    url: "https://www.ine.gob.cl/herramientas/portal-de-mapas/geodatos-abiertos",
    dateLabel: "Official simplified 16-region layer; reviewed 24 Aug 2026",
    detail: "Official political-administrative geometry for Chile's 16 regions. Magallanes interaction geometry is limited to administered territory north of 60°S so the Antarctic claim is not duplicated.",
  },
  {
    id: "gisco-norway-subdivisions",
    label: "Eurostat GISCO and Statistics Norway — Norwegian counties",
    url: "https://www.ssb.no/en/klass/klassifikasjoner/104",
    dateLabel: "Current 15-county roster with NUTS 2024 geometry; reviewed 24 Aug 2026",
    detail: "Official county-equivalent NUTS-3 geometry cross-checked against Statistics Norway's current county classification. Svalbard and Jan Mayen remain separate places.",
  },
  {
    id: "gisco-sweden-subdivisions",
    label: "Eurostat GISCO and Statistics Sweden — Swedish counties",
    url: "https://www.scb.se/hitta-statistik/regional-statistik-och-kartor/regionala-indelningar/digitala-granser/",
    dateLabel: "Current 21-county roster with NUTS 2024 geometry; reviewed 24 Aug 2026",
    detail: "Official county-equivalent NUTS-3 geometry cross-checked against Statistics Sweden's 21-county administrative geography.",
  },
  {
    id: "stats-nz-subdivisions",
    label: "Stats NZ — Regional Council 2025",
    url: "https://services2.arcgis.com/vKb0s8tBIA3bdocZ/arcgis/rest/services/Regional_Council_2025/FeatureServer/0",
    dateLabel: "2025 regional-council geography; reviewed 24 Aug 2026",
    detail: "Official geometry and land-area figures for New Zealand's 16 regional-council areas. Progress uses Stats NZ's LAND_AREA_SQ_KM values rather than the polygons' statutory coastal-water extent. Chatham Islands Territory remains a separate place outside this roster.",
  },
  {
    id: "geoboundaries-france-subdivisions",
    label: "geoBoundaries and IGN — French metropolitan regions",
    url: "https://www.geoboundaries.org/api/current/gbOpen/FRA/ADM1/",
    dateLabel: "2022 geometry; current INSEE roster reviewed 24 Aug 2026",
    detail: "IGN-sourced geometry for France's 13 metropolitan regions. Guadeloupe, French Guiana, Martinique, Mayotte and Réunion remain standalone CPBR Atlas places.",
  },
  {
    id: "geoboundaries-portugal-subdivisions",
    label: "geoBoundaries and DGT — Portuguese districts",
    url: "https://www.geoboundaries.org/api/current/gbOpen/PRT/ADM1/",
    dateLabel: "2016 geometry; roster checked against CAOP2025 on 24 Aug 2026",
    detail: "DGT-sourced geometry for Portugal's 18 districts plus the autonomous regions of the Azores and Madeira.",
  },
  {
    id: "geoboundaries-india-subdivisions",
    label: "geoBoundaries, DataMeet and ECI — Indian states and union territories",
    url: "https://www.geoboundaries.org/api/current/gbOpen/IND/ADM1/",
    dateLabel: "Current 36-unit MHA roster; reviewed 24 Aug 2026",
    detail: "Geometry sourced from DataMeet and the Election Commission of India for the current 28 states and eight union territories.",
  },
  {
    id: "geoboundaries-china-subdivisions",
    label: "geoBoundaries — mainland Chinese provincial-level divisions",
    url: "https://www.geoboundaries.org/api/current/gbOpen/CHN/ADM1/",
    dateLabel: "2019 geometry; NBS roster reviewed 24 Aug 2026",
    detail: "The 31 mainland provinces, autonomous regions and municipalities. Hong Kong, Macao and Taiwan remain standalone CPBR Atlas places.",
  },
  {
    id: "geoboundaries-russia-subdivisions",
    label: "geoBoundaries and OpenStreetMap — Russian federal subjects",
    url: "https://www.geoboundaries.org/api/current/gbOpen/RUS/ADM1/",
    dateLabel: "2017 geometry; reviewed 24 Aug 2026",
    detail: "The 83 federal subjects within Russia's internationally recognized pre-2014 border. Crimea, Sevastopol and the four Ukrainian regions claimed by Russia are excluded.",
  },
  {
    id: "nz-free-association-grouping",
    label: "New Zealand MFAT — Cook Islands and Niue constitutional relationships",
    url: "https://www.mfat.govt.nz/en/countries-and-regions/australia-and-pacific/cook-islands",
    dateLabel: "Current official descriptions; reviewed 24 Aug 2026",
    detail: "MFAT describes both the Cook Islands and Niue as self-governing states in free association with New Zealand. They therefore remain their own units even in Sovereign states grouping.",
  },
  {
    id: "tokelau-grouping",
    label: "New Zealand MFAT — Tokelau",
    url: "https://www.mfat.govt.nz/en/countries-and-regions/australia-and-pacific/tokelau",
    dateLabel: "Current official description; reviewed 24 Aug 2026",
    detail: "MFAT describes Tokelau as a non-self-governing territory within the Realm of New Zealand, so it rolls into New Zealand in Sovereign states grouping.",
  },
  {
    id: "uk-ons-boundaries",
    label: "UK ONS Geography — Countries boundaries",
    url: "https://www.data.gov.uk/dataset/5119b01e-1b9d-47e1-9fc2-76e95687d5f6/countries-december-2023-boundaries-uk-bgc",
    dateLabel: "December 2023 boundaries; reviewed 23 Aug 2026",
    detail: "Official UK country boundaries used to make England, Northern Ireland, Scotland and Wales independently selectable instead of approximating them with map markers.",
  },
  {
    id: "openfreemap",
    label: "OpenFreeMap Positron basemap",
    url: "https://openfreemap.org/",
    dateLabel: "Live service; accessed 22 Aug 2026",
    detail: "The visual basemap style and tile service used behind the interactive country layer.",
  },
  {
    id: "openmaptiles",
    label: "OpenMapTiles",
    url: "https://openmaptiles.org/",
    dateLabel: "Live tiles; accessed 22 Aug 2026",
    detail: "Open vector-tile schema and tooling used by the basemap; map data remains attributed to OpenStreetMap contributors.",
  },
  {
    id: "openstreetmap",
    label: "OpenStreetMap contributors",
    url: "https://www.openstreetmap.org/copyright",
    dateLabel: "Continuously updated; accessed 22 Aug 2026",
    detail: "Community-maintained geographic data used by the basemap, available under the Open Data Commons Open Database License.",
  },
  {
    id: "maptiler-countries",
    label: "MapTiler Countries",
    url: "https://docs.maptiler.com/schema/countries/",
    dateLabel: "Live tileset; accessed 22 Aug 2026",
    detail: "Country and territory polygons used for highlighting and land interaction.",
  },
  {
    id: "marine-regions",
    label: "Marine Regions EEZ v12, 24 NM Zones v4 and Territorial Seas v4",
    url: "https://www.marineregions.org/downloads.php",
    dateLabel: "Versions published 2023",
    detail: "Official maritime boundaries used for the optional EEZ overlay and to make small islands and coastal territories easier to select. The default shows only those selection aids; All EEZs also makes every available mapped maritime area selectable. Unambiguous no-ISO subdivision records such as Alaska, Hawaii, Easter Island and the Azores are associated with their CPBR Atlas place; disputed no-ISO zones are not guessed into a country. Brazilian islands that roll up into a larger state use compact 24 NM selection aids sourced from the official 24 NM layer where available, or 24 NM interaction circles anchored to official territorial-sea geometry. Separately selectable island regions such as Galapagos retain their complete EEZ. Bouvet uses its Norwegian 12 NM territorial sea because its former EEZ record was retired. Licensed CC BY 4.0 by the Flanders Marine Institute.",
  },
  {
    id: "maplibre",
    label: "MapLibre GL JS",
    url: "https://maplibre.org/maplibre-gl-js/docs/",
    dateLabel: "App engine version 6.4.0",
    detail: "Open-source map rendering engine.",
  },
  {
    id: "flag-icons",
    label: "flag-icons SVG collection",
    url: "https://github.com/lipis/flag-icons",
    dateLabel: "Version 7.5.0; reviewed 23 Aug 2026",
    detail: "Locally bundled, MIT-licensed SVG artwork for ISO country and territory flags and the constituent-country banners used for England, Northern Ireland, Scotland and Wales.",
  },
  {
    id: "subdivision-flags",
    label: "Wikidata and Wikimedia Commons — subdivision flags",
    url: "https://www.wikidata.org/wiki/Property:P41",
    dateLabel: "Locally bundled; reviewed 24 Aug 2026",
    detail: "Subdivision artwork is matched by ISO 3166-2 code through Wikidata's flag-image property, then pinned locally. Official status varies by jurisdiction: the Mexican state banners are conventional identifiers where no separately catalogued official flag exists, and Mpumalanga is the only South African province with an official provincial flag. Other South African banners are marked as conventional identifiers. Nelson and Otago use documented regional flags. Where no distinct official subdivision flag is catalogued, the parent-country flag is explicitly labelled as a fallback, including most New Zealand regions, mainland China and India, Portuguese districts and Grand Est.",
  },
  {
    id: "subdivision-flag-attribution",
    label: "Subdivision flag file-by-file attribution",
    url: "/data/subdivision-flag-attribution.json",
    dateLabel: "611 source and license records",
    detail: "Machine-readable source page, artist, license and status details for every bundled subdivision image.",
  },
  {
    id: "northern-ireland-flag",
    label: "Northern Ireland Assembly — Ulster Banner usage",
    url: "https://aims.niassembly.gov.uk/officialreport/report.aspx?docID=418423&eveDate=2024%2F11%2F25",
    dateLabel: "Assembly record 25 Nov 2024; reviewed 24 Aug 2026",
    detail: "The Ulster Banner is shown as Northern Ireland's familiar representative and sporting flag. It has not had official governmental status since 1973; the Union Flag remains the flag flown on designated days at Northern Ireland government buildings.",
  },
  {
    id: "ceuta-flag",
    label: "City of Ceuta institutional emblems",
    url: "https://www.ceuta.es/ceuta/la-institucion/emblemas-institucionales",
    dateLabel: "Official design; reviewed 23 Aug 2026",
    detail: "Official description of Ceuta's black-and-white gyronny flag and city arms. The SVG rendering is credited to Ulaidh via Wikimedia Commons under CC BY-SA 4.0.",
  },
  {
    id: "melilla-flag",
    label: "City of Melilla corporate identity manual",
    url: "https://www.melilla.es/melillaportal/RecursosWeb/DOCUMENTOS/1/0_3383_1.pdf",
    dateLabel: "Official design; reviewed 23 Aug 2026",
    detail: "Official description of Melilla's sky-blue flag with the city arms in the center. The SVG rendering is served from Wikimedia Commons with its file-page attribution.",
  },
  {
    id: "ceuta-flag-render",
    label: "Wikimedia Commons — Flag of Ceuta SVG",
    url: "https://commons.wikimedia.org/wiki/File:Flag_of_Ceuta.svg",
    dateLabel: "Ulaidh; CC BY-SA 4.0",
    detail: "SVG rendering used for Ceuta, matched against the city government's official design description.",
  },
  {
    id: "melilla-flag-render",
    label: "Wikimedia Commons — Flag of Melilla SVG",
    url: "https://commons.wikimedia.org/wiki/File:Flag_of_Melilla.svg",
    dateLabel: "License and attribution on file page",
    detail: "SVG rendering used for Melilla, matched against the city government's official identity manual.",
  },
  {
    id: "aland-boundary",
    label: "Government of Åland",
    url: "https://www.regeringen.ax/sites/default/files/attachments/article/Everyone%20Can%20Flourish%20on%20the%20Island%20of%20Peace%20-%20%C3%85land%20Voluntary%20Review%202024%20%281%29.pdf",
    dateLabel: "Reviewed 23 Aug 2026",
    detail: "Official description of the autonomous Åland archipelago. Its ISO-aligned land polygon is drawn above Finland so Åland remains separately selectable without inventing a separate sovereign EEZ.",
  },
  {
    id: "macao-boundary",
    label: "Macao SAR administrative boundary",
    url: "https://geomatics.dsscu.gov.mo/en/geo_land_boundary_details/article/geo_land_boundary.html",
    dateLabel: "Official boundary reference; reviewed 23 Aug 2026",
    detail: "Macao SAR government reference used to place its fixed-size interaction target within the territory's compact land boundary.",
  },
  {
    id: "gibraltar-geography",
    label: "Government of Gibraltar geography",
    url: "https://www.gibraltar.gov.gi/gibraltar-tourist-board/geography",
    dateLabel: "Reviewed 23 Aug 2026",
    detail: "Official location reference used for Gibraltar's fixed-size interaction target.",
  },
  {
    id: "ceuta-autonomy",
    label: "Ceuta Statute of Autonomy",
    url: "https://www.ceuta.es/ceuta/la-institucion/estatuto-de-autonomia",
    dateLabel: "Official city reference; reviewed 23 Aug 2026",
    detail: "Ceuta is exposed as a separately selectable autonomous city of Spain and can be grouped back with Spain in map settings.",
  },
  {
    id: "melilla-autonomy",
    label: "Melilla Statute of Autonomy",
    url: "https://www.melilla.es/melillaportal/contenedor.jsp?codMenu=614&codMenuPN=600&codResi=1&contenido=29347&evento=1&language=es&nivel=1400&seccion=s_fact_d4_v1.jsp&tipo=2",
    dateLabel: "Official city reference; reviewed 23 Aug 2026",
    detail: "Melilla is exposed as a separately selectable autonomous city of Spain and can be grouped back with Spain in map settings.",
  },
];

function SourceList({ sources }) {
  return (
    <div className="aboutSourceList">
      {sources.map((source) => (
        <article className="aboutSource" key={source.id}>
          <div>
            <a href={source.url} target="_blank" rel="noreferrer">
              {source.label}
              <FiExternalLink aria-hidden="true" />
            </a>
            <span>{source.dateLabel}</span>
          </div>
          <p>{source.detail}</p>
        </article>
      ))}
    </div>
  );
}

const AboutModal = ({ open, onClose }) => {
  const closeButtonRef = useRef(null);

  useEffect(() => {
    if (!open) return undefined;

    const previousFocus = document.activeElement;
    closeButtonRef.current?.focus();

    function closeOnEscape(event) {
      if (event.key === "Escape") onClose();
    }

    document.addEventListener("keydown", closeOnEscape);
    return () => {
      document.removeEventListener("keydown", closeOnEscape);
      previousFocus?.focus?.();
    };
  }, [onClose, open]);

  if (!open) return null;

  return (
    <div className="aboutBackdrop" onClick={onClose} role="presentation">
      <section
        className="aboutDialog"
        role="dialog"
        aria-modal="true"
        aria-labelledby="about-title"
        aria-describedby="about-summary"
        onClick={(event) => event.stopPropagation()}
      >
        <header className="aboutHeader">
          <div>
            <h2 id="about-title">About CPBR Atlas</h2>
            <p>Credits, data sources and methodology</p>
          </div>
          <button
            type="button"
            className="aboutClose"
            aria-label="Close map information"
            onClick={onClose}
            ref={closeButtonRef}
          >
            <FiX aria-hidden="true" />
          </button>
        </header>

        <div className="aboutBody">
          <p className="aboutSummary" id="about-summary">
            CPBR Atlas combines live third-party tiles with a pinned maritime
            dataset and manually reviewed travel categories. Boundaries and
            memberships can change, so every source below includes its version
            or latest review date.
          </p>

          <div className="aboutNotice">
            <strong>Category data reviewed {categoryReviewedOn}</strong>
            <span>
              The base selector contains the 249 ISO 3166-1 countries and areas
              plus Kosovo under the widely used user-assigned code XK. Ceuta,
              Melilla and the four UK constituent countries are added as
              finer-grained selectable places; the UK parent remains available
              for sovereign-state organization memberships.
            </span>
            <span>
              Continent lists use UN M49 as a statistical baseline, then add
              sourced overlaps for transcontinental places and a clearly named
              Antarctic and subantarctic travel grouping.
            </span>
            <span>
              Place grouping can treat every mapped division independently,
              roll subdivisions into countries while keeping territories
              distinct, or combine reviewed administered places under their
              highest sovereign state. Detailed selections remain unchanged
              when this presentation changes.
            </span>
            <span>
              First-level subdivisions in the U.S., Canada, Brazil, Mexico,
              Australia, Argentina, Germany, Italy, Japan, South Africa,
              Switzerland, Austria, Spain, the Netherlands, Poland, Colombia,
              Chile, Norway, Sweden, New Zealand, France, Portugal, India,
              mainland China and Russia can be tracked independently. Grouped
              views derive partial parent completion
              from the selected divisions: normalized area in Land mode and
              equal division fractions in Places mode.
            </span>
          </div>

          <h3>Map and interaction data</h3>
          <SourceList sources={mapSources} />

          <h3>Countries and category memberships</h3>
          <SourceList sources={categorySources} />

          <p className="aboutDisclaimer">
            This is a personal travel visualization, not a legal or political
            authority. Names, borders, and territorial designations do not
            imply endorsement of any claim.
          </p>
        </div>
      </section>

      <style jsx>{`
        .aboutBackdrop {
          position: fixed;
          z-index: 120;
          inset: 0;
          display: grid;
          place-items: center;
          padding: 24px;
          background: rgba(35, 34, 31, 0.56);
          backdrop-filter: blur(6px);
        }

        .aboutDialog {
          display: flex;
          width: min(760px, 100%);
          max-height: min(820px, calc(100vh - 48px));
          flex-direction: column;
          overflow: hidden;
          border: 1px solid rgba(54, 53, 51, 0.24);
          border-radius: 18px;
          background: #f8f4e8;
          box-shadow: 0 28px 80px rgba(25, 24, 22, 0.34);
          color: #363533;
        }

        .aboutHeader {
          display: flex;
          height: auto;
          flex: none;
          align-items: flex-start;
          justify-content: space-between;
          gap: 20px;
          padding: 22px 24px 18px;
          border-bottom: 1px solid rgba(54, 53, 51, 0.15);
          background: rgba(248, 244, 232, 0.96);
        }

        .aboutHeader h2,
        .aboutHeader p {
          margin: 0;
        }

        .aboutHeader h2 {
          font-size: 25px;
          line-height: 1.15;
        }

        .aboutHeader p {
          margin-top: 4px;
          color: #6f6b61;
          font-size: 12px;
        }

        .aboutClose {
          display: grid;
          width: 38px;
          height: 38px;
          flex: none;
          place-items: center;
          padding: 0;
          border: 1px solid rgba(54, 53, 51, 0.2);
          border-radius: 50%;
          background: transparent;
          color: #363533;
          cursor: pointer;
        }

        .aboutClose:hover {
          border-color: var(--accent, #4f9a6f);
          background: var(--accent, #4f9a6f);
          color: white;
        }

        .aboutClose:focus-visible,
        :global(.aboutSource a:focus-visible) {
          outline: 2px solid var(--accent, #4f9a6f);
          outline-offset: 2px;
        }

        .aboutBody {
          min-height: 0;
          padding: 20px 24px 26px;
          overflow-y: auto;
        }

        .aboutSummary {
          max-width: 68ch;
          margin: 0;
          color: #4f4c45;
          font-size: 14px;
          line-height: 1.55;
        }

        .aboutNotice {
          display: flex;
          flex-direction: column;
          gap: 3px;
          margin-top: 18px;
          padding: 13px 15px;
          border: 1px solid
            color-mix(in srgb, var(--accent-strong, #276944) 20%, transparent);
          border-radius: 12px;
          background: color-mix(in srgb, var(--accent, #4f9a6f) 7%, transparent);
          font-size: 13px;
          line-height: 1.45;
        }

        .aboutNotice strong {
          color: var(--accent-strong, #276944);
        }

        .aboutNotice span {
          color: #5d5950;
        }

        .aboutBody h3 {
          margin: 28px 0 0;
          padding-bottom: 8px;
          border-bottom: 1px solid rgba(54, 53, 51, 0.3);
          color: #363533;
          font-size: 13px;
          letter-spacing: 0.05em;
          text-transform: uppercase;
        }

        :global(.aboutSourceList) {
          display: grid;
          gap: 0;
        }

        :global(.aboutSource) {
          padding: 13px 2px 12px;
          border-bottom: 1px solid rgba(54, 53, 51, 0.2);
        }

        :global(.aboutSource > div) {
          display: flex;
          align-items: baseline;
          justify-content: space-between;
          gap: 12px;
        }

        :global(.aboutSource a) {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          color: var(--accent-strong, #276944);
          font-size: 13px;
          font-weight: 700;
          text-decoration: none;
        }

        :global(.aboutSource a:hover) {
          text-decoration: underline;
        }

        :global(.aboutSource span) {
          flex: none;
          color: #777269;
          font-size: 11px;
        }

        :global(.aboutSource p) {
          margin: 5px 0 0;
          color: #5a564e;
          font-size: 12px;
          line-height: 1.45;
        }

        .aboutDisclaimer {
          margin: 24px 0 0;
          padding-top: 12px;
          border-top: 1px solid rgba(54, 53, 51, 0.28);
          color: #746f65;
          font-size: 11px;
          line-height: 1.5;
        }

        @media only screen and (max-width: 768px) {
          .aboutBackdrop {
            padding: 12px;
          }

          .aboutDialog {
            max-height: calc(100vh - 24px);
          }

          .aboutHeader {
            padding: 18px 18px 15px;
          }

          .aboutBody {
            padding: 17px 18px 20px;
          }

          :global(.aboutSource > div) {
            align-items: flex-start;
            flex-direction: column;
            gap: 3px;
          }
        }
      `}</style>
    </div>
  );
};

export default AboutModal;
