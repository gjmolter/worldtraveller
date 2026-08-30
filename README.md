# CPBR Atlas

CPBR Atlas (Capybara Atlas) is an interactive travel map for marking the places you have visited, exploring geographic and cultural groupings, and sharing your progress.

The app is intended to live at [atlas.cpbr.digital](https://atlas.cpbr.digital).

There is a very simple explanation for why it exists:

### I ❤ Geography!

If you think it could be improved in any way, go ahead and make a Pull Request! 

## Map data builds

The runtime uses pinned local GeoJSON for interaction layers. Regenerate them
from their upstream sources with:

```bash
npm run build:subnational
npm run build:subdivision-data
npm run build:subdivisions
npm run build:maritime
```

`build:subdivisions` uses official national sources, Eurostat GISCO and
geoBoundaries data, with every source and review date listed in the app's
About panel. The generated layer contains 751 first-level subdivisions:
the 50 U.S. states and D.C.; Canada's 10 provinces and 3 territories; Brazil's
26 states and Federal District; Mexico's 31 states and Mexico City; Australia's
6 states and 2 internal territories; Argentina's 23 provinces and CABA;
Germany's 16 states; Italy's 20 regions; Japan's 47 prefectures; South Africa's
9 provinces; Switzerland's 26 cantons; Austria's 9 states; Spain's 17
autonomous communities; the Netherlands' 12 provinces;
Poland's 16 voivodeships; Colombia's 32 departments and Bogotá; Chile's 16
regions; Norway's 15 counties; Sweden's 21 counties; New Zealand's 16
regional-council areas; France's 13 metropolitan regions; Portugal's 18
districts and 2 autonomous regions; India's 28 states and 8 union territories;
mainland China's 31 provincial-level divisions; and Russia's 83 internationally
undisputed federal subjects within its pre-2014 border; Uruguay's 19
departments; Paraguay's 17 departments and Asunción; Bolivia's 9 departments;
Peru's 24 departments and Callao; Ecuador's 24 provinces; Venezuela's 23
states, Capital District and Federal Dependencies; Guyana's 10 regions; and
Suriname's 10 districts.
Normalized land shares are generated from the same polygons so partial-country
progress sums to exactly one parent country.
Australian external territories remain separately selectable places. The
Tierra del Fuego geometry is restricted to Argentine-administered land so the
app does not duplicate disputed or separately selectable South Atlantic and
Antarctic places. Hokkaido likewise excludes the disputed Northern Territories
from its interaction geometry.
Chile's Magallanes interaction geometry excludes the Antarctic claim. New
Zealand's land shares use Stats NZ's official land-area field rather than the
regional polygons' statutory coastal-water extent.
France's overseas regions, Hong Kong, Macao and Taiwan remain standalone Atlas
places. Russia's subdivision layer excludes Crimea, Sevastopol and the four
Ukrainian regions claimed by Russia.

## Data validation

Run the integrity checks after changing place, sovereign-association,
subdivision, geometry or flag data:

```bash
npm run audit:data
npm run audit:flags
npm run audit:subdivision-flags
npm run audit:categories
npm run audit:continents
```

`audit:data` rejects duplicate or unknown sovereign associations, mismatched
subdivision definitions and map geometries, invalid parent IDs, missing land
shares and parent shares that no longer total one. The continent audit compares
the local policy against the current UN M49 table and reports the app's reviewed
exceptions explicitly.
