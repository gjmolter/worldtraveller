import { writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const reviewedOn = "2026-08-24";

const countries = [
  {
    parentId: "uy",
    groupId: "uy-subdivisions",
    label: "Uruguayan Departments",
    description: "Uruguay’s 19 departments.",
    source: {
      id: "uruguay-departments",
      label: "Uruguay IDE — Límites departamentales; geometry via pinned geoBoundaries",
      url: "https://catalogodatos.gub.uy/dataset/9bfa6e97-f40f-437e-aa13-a3406c50f762/resource/3c1b430a-c010-4db1-880d-bdc0f11e4ce9",
      dateLabel: `19 departments; reviewed ${reviewedOn}`,
    },
    kind: "Department",
    places: [
      ["AR", "Artigas"], ["CA", "Canelones"], ["CL", "Cerro Largo"],
      ["CO", "Colonia"], ["DU", "Durazno"], ["FD", "Florida"],
      ["FS", "Flores"], ["LA", "Lavalleja"], ["MA", "Maldonado"],
      ["MO", "Montevideo"], ["PA", "Paysandú"], ["RN", "Río Negro"],
      ["RO", "Rocha"], ["RV", "Rivera"], ["SA", "Salto"],
      ["SJ", "San José"], ["SO", "Soriano"], ["TA", "Tacuarembó"],
      ["TT", "Treinta y Tres"],
    ],
  },
  {
    parentId: "py",
    groupId: "py-subdivisions",
    label: "Paraguayan Departments & Capital",
    description: "Paraguay’s 17 departments plus the autonomous capital, Asunción.",
    source: {
      id: "paraguay-departments",
      label: "Paraguay INE — Atlas Cartográfico; geometry via pinned geoBoundaries",
      url: "https://www.ine.gov.py/resumen/35/atlas-cartografico-del-paraguay-2012",
      dateLabel: `17 departments and Asunción; reviewed ${reviewedOn}`,
    },
    kind: "Department",
    places: [
      ["ASU", "Asunción", "Capital District"], ["1", "Concepción"],
      ["2", "San Pedro"], ["3", "Cordillera"], ["4", "Guairá"],
      ["5", "Caaguazú"], ["6", "Caazapá"], ["7", "Itapúa"],
      ["8", "Misiones"], ["9", "Paraguarí"], ["10", "Alto Paraná"],
      ["11", "Central"], ["12", "Ñeembucú"], ["13", "Amambay"],
      ["14", "Canindeyú"], ["15", "Presidente Hayes"],
      ["16", "Alto Paraguay"], ["19", "Boquerón"],
    ],
  },
  {
    parentId: "bo",
    groupId: "bo-subdivisions",
    label: "Bolivian Departments",
    description: "Bolivia’s nine departments.",
    source: {
      id: "bolivia-departments",
      label: "Bolivia INE — nine-department cartography; geometry via pinned geoBoundaries",
      url: "https://www.ine.gob.bo/index.php/actualizacion-cartografica-para-el-censo-llega-a-44-municipios-de-los-9-departamentos/",
      dateLabel: `9 departments; reviewed ${reviewedOn}`,
    },
    kind: "Department",
    places: [
      ["B", "Beni"], ["H", "Chuquisaca"], ["C", "Cochabamba"],
      ["L", "La Paz"], ["O", "Oruro"], ["N", "Pando"],
      ["P", "Potosí"], ["S", "Santa Cruz"], ["T", "Tarija"],
    ],
  },
  {
    parentId: "pe",
    groupId: "pe-subdivisions",
    label: "Peruvian Departments & Callao",
    description: "Peru’s 24 departments plus the Constitutional Province of Callao, represented as 25 first-level units.",
    source: {
      id: "peru-departments",
      label: "Peru INEI — political-administrative division; geometry via pinned geoBoundaries",
      url: "https://ide.inei.gob.pe/",
      dateLabel: `24 departments and Callao; reviewed ${reviewedOn}`,
    },
    kind: "Department",
    places: [
      ["AMA", "Amazonas"], ["ANC", "Áncash"], ["APU", "Apurímac"],
      ["ARE", "Arequipa"], ["AYA", "Ayacucho"], ["CAJ", "Cajamarca"],
      ["CAL", "Callao", "Constitutional Province"], ["CUS", "Cusco"],
      ["HUC", "Huánuco"], ["HUV", "Huancavelica"], ["ICA", "Ica"],
      ["JUN", "Junín"], ["LAL", "La Libertad"], ["LAM", "Lambayeque"],
      ["LIM", "Lima"], ["LOR", "Loreto"], ["MDD", "Madre de Dios"],
      ["MOQ", "Moquegua"], ["PAS", "Pasco"], ["PIU", "Piura"],
      ["PUN", "Puno"], ["SAM", "San Martín"], ["TAC", "Tacna"],
      ["TUM", "Tumbes"], ["UCA", "Ucayali"],
    ],
  },
  {
    parentId: "ec",
    groupId: "ec-subdivisions",
    label: "Ecuadorian Provinces",
    description: "Ecuador’s 24 provinces.",
    source: {
      id: "ecuador-provinces",
      label: "Ecuador INEC — Marco Geoestadístico; geometry via pinned geoBoundaries",
      url: "https://idgn.ecuadorencifras.gob.ec/server/rest/services/Hosted/Marco_Geoestadistico_2022/FeatureServer/0",
      dateLabel: `24 provinces; reviewed ${reviewedOn}`,
    },
    kind: "Province",
    sourceByName: true,
    places: [
      ["A", "Azuay"], ["B", "Bolívar"], ["F", "Cañar"], ["C", "Carchi"],
      ["H", "Chimborazo"], ["X", "Cotopaxi"], ["O", "El Oro"],
      ["E", "Esmeraldas"], ["W", "Galápagos"], ["G", "Guayas"],
      ["I", "Imbabura"], ["L", "Loja"], ["R", "Los Ríos"],
      ["M", "Manabí"], ["S", "Morona Santiago"], ["N", "Napo"],
      ["D", "Orellana"], ["Y", "Pastaza"], ["P", "Pichincha"],
      ["SE", "Santa Elena"], ["SD", "Santo Domingo de los Tsáchilas"],
      ["U", "Sucumbíos"], ["T", "Tungurahua"], ["Z", "Zamora Chinchipe"],
    ],
  },
  {
    parentId: "ve",
    groupId: "ve-subdivisions",
    label: "Venezuelan States & Federal Areas",
    description: "Venezuela’s 23 states, Capital District and Federal Dependencies within the app’s internationally recognized country outline.",
    source: {
      id: "venezuela-states",
      label: "ISO 3166-2 Venezuela roster; geometry via pinned geoBoundaries",
      url: "https://www.iso.org/obp/ui/#iso:code:3166:VE",
      dateLabel: `23 states, Capital District and Federal Dependencies; reviewed ${reviewedOn}`,
    },
    kind: "State",
    places: [
      ["Z", "Amazonas"], ["B", "Anzoátegui"], ["C", "Apure"],
      ["D", "Aragua"], ["E", "Barinas"], ["F", "Bolívar"],
      ["G", "Carabobo"], ["H", "Cojedes"], ["Y", "Delta Amacuro"],
      ["A", "Distrito Capital", "Capital District"], ["W", "Dependencias Federales", "Federal Dependencies"],
      ["I", "Falcón"], ["J", "Guárico"], ["X", "La Guaira"],
      ["K", "Lara"], ["L", "Mérida"], ["M", "Miranda"],
      ["N", "Monagas"], ["O", "Nueva Esparta"], ["P", "Portuguesa"],
      ["R", "Sucre"], ["S", "Táchira"], ["T", "Trujillo"],
      ["U", "Yaracuy"], ["V", "Zulia"],
    ],
  },
  {
    parentId: "gy",
    groupId: "gy-subdivisions",
    label: "Guyanese Regions",
    description: "Guyana’s ten administrative regions.",
    source: {
      id: "guyana-regions",
      label: "Bureau of Statistics Guyana — 2022 census regions; geometry via pinned geoBoundaries",
      url: "https://statisticsguyana.gov.gy/wp-content/uploads/2019/10/Preliminary-Report-Guyana-National-Population-and-Housing-Census-2022.pdf",
      dateLabel: `10 regions; reviewed ${reviewedOn}`,
    },
    kind: "Region",
    places: [
      ["BA", "Barima-Waini"], ["CU", "Cuyuni-Mazaruni"],
      ["DE", "Demerara-Mahaica"], ["EB", "East Berbice-Corentyne"],
      ["ES", "Essequibo Islands-West Demerara"], ["MA", "Mahaica-Berbice"],
      ["PM", "Pomeroon-Supenaam"], ["PT", "Potaro-Siparuni"],
      ["UD", "Upper Demerara-Berbice"], ["UT", "Upper Takutu-Upper Essequibo"],
    ],
  },
  {
    parentId: "sr",
    groupId: "sr-subdivisions",
    label: "Surinamese Districts",
    description: "Suriname’s ten districts.",
    source: {
      id: "suriname-districts",
      label: "General Bureau of Statistics Suriname — cartography; geometry via pinned geoBoundaries",
      url: "https://statistics-suriname.org/cartografie/",
      dateLabel: `10 districts; reviewed ${reviewedOn}`,
    },
    kind: "District",
    places: [
      ["BR", "Brokopondo"], ["CM", "Commewijne"], ["CR", "Coronie"],
      ["MA", "Marowijne"], ["NI", "Nickerie"], ["PR", "Para"],
      ["PM", "Paramaribo"], ["SA", "Saramacca"], ["SI", "Sipaliwini"],
      ["WA", "Wanica"],
    ],
  },
];

const output = {
  reviewedOn,
  sources: countries.map(({ source }) => source),
  groups: countries.map(({ groupId, label, description, source }) => ({
    id: groupId,
    label,
    description,
    sourceId: source.id,
  })),
  places: countries.flatMap((country) =>
    country.places.map(([code, name, kind]) => ({
      id: `${country.parentId}-${code.toLowerCase()}`,
      parentId: country.parentId,
      groupId: country.groupId,
      name,
      code,
      kind: kind || country.kind,
      sourceCode: country.sourceByName ? name.normalize("NFD").replace(/\p{Diacritic}/gu, "") : code,
    })),
  ),
};

await writeFile(
  resolve(root, "data/subdivision-south-america.json"),
  `${JSON.stringify(output, null, 2)}\n`,
);

console.log(`Wrote ${output.places.length} South American subdivisions.`);
