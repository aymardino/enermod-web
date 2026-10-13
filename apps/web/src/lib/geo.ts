/** World geometry for the live maps (the world authorship map): Natural Earth 110m from the
 *  world-atlas package, converted from TopoJSON once, with ISO numeric ids mapped to ISO-3 codes.
 *
 *  The Africa plate does not use this at runtime: its geometry is precomputed by
 *  scripts/build-geo.mjs into src/data/geo-africa.json (docs/design-system.md). */
import { feature, merge } from "topojson-client";
import type { Feature, FeatureCollection, Geometry } from "geojson";
import type { Topology, GeometryCollection } from "topojson-specification";
import world from "world-atlas/countries-110m.json";
import iso from "@/data/iso.json";

export type CountryFeature = Feature<Geometry, { iso3: string; name: string }>;

const numericToIso3 = iso.numericToIso3 as Record<string, string>;
export const ISO3_NAMES = iso.names as Record<string, string>;

/** Natural Earth 110m has three features without an ISO numeric id. They are folded into their
 *  ISO3 (and merged with it, so no border is drawn): Somaliland into Somalia closes the hole in the
 *  Horn; Northern Cyprus and Kosovo matter only as context land. Same rule as build-geo.mjs. */
const NAME_FIX: Record<string, string> = { Somaliland: "SOM", "N. Cyprus": "CYP", Kosovo: "XKX" };

type CountryProps = { name: string };
type CountryTopology = Topology<{ countries: GeometryCollection<CountryProps> }>;

let cache: CountryFeature[] | null = null;

export function worldFeatures(): CountryFeature[] {
  if (cache) return cache;
  const topo = world as unknown as CountryTopology;
  const geometries = topo.objects.countries.geometries;
  const nameOf = (g: (typeof geometries)[number]) => (g.properties as CountryProps | undefined)?.name ?? "";
  const iso3Of = (g: (typeof geometries)[number]) =>
    g.id !== undefined && g.id !== null ? numericToIso3[String(g.id).padStart(3, "0")] ?? "" : NAME_FIX[nameOf(g)] ?? "";

  const groups = new Map<string, (typeof geometries)[number][]>();
  const order: string[] = [];
  for (const g of geometries) {
    const code = iso3Of(g);
    if (code === "ATA") continue;
    // keep unknown id-less features apart (keyed by name) rather than dropping land
    const key = code || `?${nameOf(g) || order.length}`;
    if (!groups.has(key)) { groups.set(key, []); order.push(key); }
    groups.get(key)!.push(g);
  }

  const features: CountryFeature[] = order.map((key) => {
    const members = groups.get(key)!;
    const iso3 = key.startsWith("?") ? "" : key;
    // the feature that carries the ISO id names the country (Somalia, not Somaliland)
    const named = members.find((g) => g.id !== undefined && g.id !== null) ?? members[0];
    const name = nameOf(named);
    if (members.length === 1) {
      const f = feature(topo, members[0]) as Feature<Geometry, CountryProps>;
      return { ...f, properties: { iso3, name } } as CountryFeature;
    }
    return { type: "Feature", id: named.id, geometry: merge(topo, members as never), properties: { iso3, name } } as CountryFeature;
  });
  cache = features;
  return features;
}

/** The 54 countries of the inventory plus Western Sahara (drawn, hatched: not in the inventory). */
export const AFRICA_ISO3 = new Set([
  "DZA", "AGO", "BEN", "BWA", "BFA", "BDI", "CPV", "CMR", "CAF", "TCD", "COM", "COD", "COG", "DJI", "EGY", "GNQ", "ERI", "SWZ", "ETH", "GAB",
  "GMB", "GHA", "GIN", "GNB", "CIV", "KEN", "LSO", "LBR", "LBY", "MDG", "MWI", "MLI", "MRT", "MUS", "MAR", "MOZ", "NAM", "NER", "NGA", "RWA",
  "STP", "SEN", "SYC", "SLE", "SOM", "ZAF", "SSD", "SDN", "TZA", "TGO", "TUN", "UGA", "ZMB", "ZWE", "ESH",
]);

export function africaFeatures(): CountryFeature[] {
  return worldFeatures().filter((f) => AFRICA_ISO3.has(f.properties.iso3));
}

/** Kept for callers that only need the collection type. */
export type CountryCollection = FeatureCollection<Geometry, { iso3: string; name: string }>;
