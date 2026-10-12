/** World geometry for the maps: Natural Earth 110m from the world-atlas package, converted
 *  from TopoJSON once, with ISO numeric ids mapped to ISO-3 codes. */
import { feature } from "topojson-client";
import type { Feature, FeatureCollection, Geometry } from "geojson";
import type { Topology, GeometryCollection } from "topojson-specification";
import world from "world-atlas/countries-110m.json";
import iso from "@/data/iso.json";

export type CountryFeature = Feature<Geometry, { iso3: string; name: string }>;

const numericToIso3 = iso.numericToIso3 as Record<string, string>;
export const ISO3_NAMES = iso.names as Record<string, string>;

let cache: CountryFeature[] | null = null;

export function worldFeatures(): CountryFeature[] {
  if (cache) return cache;
  const topo = world as unknown as Topology<{ countries: GeometryCollection<{ name: string }> }>;
  const fc = feature(topo, topo.objects.countries) as FeatureCollection<Geometry, { name: string }>;
  const features: CountryFeature[] = fc.features
    .map((f) => {
      const id = String(f.id ?? "").padStart(3, "0");
      return { ...f, properties: { iso3: numericToIso3[id] ?? "", name: f.properties?.name ?? "" } } as CountryFeature;
    })
    .filter((f) => f.properties.iso3 !== "ATA");
  cache = features;
  return features;
}

export const AFRICA_ISO3 = new Set([
  "DZA", "AGO", "BEN", "BWA", "BFA", "BDI", "CPV", "CMR", "CAF", "TCD", "COM", "COD", "COG", "DJI", "EGY", "GNQ", "ERI", "SWZ", "ETH", "GAB",
  "GMB", "GHA", "GIN", "GNB", "CIV", "KEN", "LSO", "LBR", "LBY", "MDG", "MWI", "MLI", "MRT", "MUS", "MAR", "MOZ", "NAM", "NER", "NGA", "RWA",
  "STP", "SEN", "SYC", "SLE", "SOM", "ZAF", "SSD", "SDN", "TZA", "TGO", "TUN", "UGA", "ZMB", "ZWE", "ESH",
]);

export function africaFeatures(): CountryFeature[] {
  return worldFeatures().filter((f) => AFRICA_ISO3.has(f.properties.iso3));
}
