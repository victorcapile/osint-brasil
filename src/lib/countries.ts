import { COUNTRY_DATA } from "./country-data";
import { normalize } from "./text";
import type { Continent } from "./types";

/**
 * Termos extras por país: gentílicos, capitais e grafias alternativas.
 * A base principal (nome em PT + nome em inglês) vem do Natural Earth.
 */
const EXTRA_TERMS: Record<string, string[]> = {
  BR: ["brasileiro", "brasileira", "brasileiros", "brasileiras", "brasilia", "itamaraty"],
  US: ["eua", "americano", "americana", "norte-americano", "norte-americana", "casa branca", "pentagono"],
  GB: ["uk", "britanico", "britanica", "ingles", "inglesa", "inglaterra", "londres", "gra-bretanha", "irlanda do norte", "escocia", "gales"],
  FR: ["frances", "francesa", "franceses", "francesas", "paris"],
  DE: ["alemao", "alema", "alemaes", "berlim"],
  IT: ["italiano", "italiana", "italianos", "roma"],
  ES: ["espanhol", "espanhola", "espanhois", "madri"],
  PT: ["portugues", "portuguesa", "portugueses", "lisboa"],
  CN: ["chines", "chinesa", "chineses", "chinesas", "pequim", "xangai"],
  RU: ["russo", "russa", "russos", "moscou", "kremlin"],
  UA: ["ucraniano", "ucraniana", "ucranianos", "kiev", "kyiv"],
  JP: ["japones", "japonesa", "japoneses", "toquio"],
  KR: ["sul-coreano", "sul-coreana", "seul"],
  KP: ["norte-coreano", "norte-coreana", "pyongyang"],
  IN: ["indiano", "indiana", "indianos", "nova deli"],
  IL: ["israelense", "israelenses", "tel aviv", "jerusalem"],
  PS: ["palestino", "palestina", "palestinos", "gaza", "cisjordania", "hamas"],
  IR: ["iran", "iraniano", "iraniana", "teera", "irao"],
  TR: ["turco", "turca", "turcos", "ancara", "istambul"],
  SA: ["saudita", "sauditas", "riade"],
  AE: ["dubai", "abu dhabi"],
  EG: ["egipcio", "egipcia", "egipcios", "cairo"],
  ZA: ["sul-africano", "sul-africana", "joanesburgo", "cidade do cabo"],
  NG: ["nigeriano", "nigeriana", "nigerianos", "abuja"],
  AR: ["argentino", "argentina", "argentinos", "buenos aires"],
  VE: ["venezuelano", "venezuelana", "caracas"],
  CO: ["colombiano", "colombiana", "colombianos", "bogota"],
  MX: ["mexicano", "mexicana", "mexicanos", "cidade do mexico"],
  CL: ["chileno", "chilena", "chilenos"],
  PE: ["peruano", "peruana", "peruanos"],
  BO: ["boliviano", "boliviana", "bolivianos", "la paz"],
  PY: ["paraguaio", "paraguaia", "paraguaios", "assuncao"],
  UY: ["uruguaio", "uruguaia", "uruguaios", "montevideu"],
  EC: ["equatoriano", "equatoriana", "quito"],
  CU: ["cubano", "cubana", "cubanos", "havana"],
  HT: ["haitiano", "haitiana", "haitianos", "porto principe"],
  CA: ["canadense", "canadenses", "ottawa", "toronto"],
  AU: ["australiano", "australiana", "australianos", "sydney", "canberra"],
  NZ: ["neozelandes", "neozelandesa", "wellington"],
  ID: ["indonesio", "indonesia", "indonesios", "jacarta"],
  PK: ["paquistanes", "paquistanesa", "islamabad"],
  AF: ["afegao", "afega", "afegaes", "cabul"],
  SY: ["sirio", "siria", "sirios", "damasco"],
  LB: ["libanes", "libanesa", "beirute"],
  IQ: ["iraquiano", "iraquiana", "bagda"],
  JO: ["jordaniano", "jordaniana", "amman"],
  QA: ["doha"],
  KW: ["kuwaitiano", "kuwaitiana"],
  OM: ["mascate"],
  YE: ["iemenita", "iemenitas", "sanaa"],
  MA: ["marroquino", "marroquina", "rabat"],
  DZ: ["argelino", "argelina", "argel"],
  TN: ["tunisino", "tunisina", "tunes"],
  LY: ["libio", "libia", "tripoli"],
  SD: ["sudanes", "sudanesa", "cartum"],
  ET: ["etiope", "etiopes", "adua"],
  KE: ["queniano", "queniana", "nairobi"],
  GH: ["ganes", "ganesa", "acra"],
  SN: ["senegales", "senegalesa", "dacar"],
  AO: ["angolano", "angolana", "angolanos", "luanda"],
  MZ: ["mocambicano", "mocambicana", "maputo"],
  CV: ["cabo-verdiano", "cabo-verdiana"],
  GW: ["guineense", "guineenses", "bissau"],
  ST: ["sao-tomense", "sao tome"],
  CD: ["congoles", "congolesa", "rd congo", "congo", "kinshasa"],
  CG: ["brazzaville"],
  UG: ["ugandense", "campala"],
  TZ: ["tanzaniano", "tanzaniana", "dodoma"],
  ZW: ["zimbabuano", "zimbabuana", "harare"],
  ZM: ["zambiano", "zambiana", "lusaka"],
  BW: ["botsuano", "botsuana", "gaborone"],
  NA: ["namibiano", "namibiana", "windhoek"],
  MG: ["malgaxe", "antananarivo"],
  RW: ["ruandes", "ruandesa", "kigali"],
  NL: ["holanda", "holandes", "holandesa", "amsterda", "haia"],
  CH: ["suico", "suica", "berna", "genebra", "zurique"],
  BE: ["belga", "belgas", "bruxelas"],
  SE: ["sueco", "sueca", "estocolmo"],
  NO: ["noruegues", "norueguesa", "oslo"],
  DK: ["dinamarques", "dinamarquesa", "copenhague"],
  FI: ["finlandes", "finlandesa", "helsinque"],
  PL: ["polones", "polonesa", "varsovia"],
  CZ: ["tcheco", "tcheca", "checo", "checa", "tchequia", "chequia", "republica tcheca", "republica checa", "praga"],
  SK: ["eslovaco", "eslovaca", "bratislava"],
  HU: ["hungaro", "hungara", "budapeste"],
  RO: ["romeno", "romena", "bucareste"],
  BG: ["bulgaro", "bulgara", "sofia"],
  GR: ["grego", "grega", "atenas"],
  RS: ["servio", "belgrado"],
  HR: ["croata", "croatas", "zagreb"],
  SI: ["esloveno", "eslovena", "liubliana"],
  BA: ["bosnio", "sarajevo"],
  AL: ["albanes", "albanesa", "tirana"],
  MK: ["macedonio", "escopie"],
  IS: ["islandes", "islandesa", "reiquiavique"],
  IE: ["irlandes", "irlandesa", "dublin"],
  MT: ["maltes", "valeta"],
  CY: ["cipriota", "nicosi"],
  EE: ["estonio", "tallinn"],
  LV: ["letonio", "riga"],
  LT: ["lituano", "vilnius"],
  MD: ["moldavo", "chisinau"],
  BY: ["belarus", "bielorrusso", "minsk"],
  GE: ["tbilisi", "tbilissi", "caucaso"],
  AM: ["armenio", "erevan"],
  AZ: ["azerbaijano", "baku"],
  KZ: ["cazaque", "astana", "almaty"],
  UZ: ["uzbeque", "tashkent"],
  TM: ["turcomeno", "asgabate"],
  TJ: ["tadjique", "dushanbe"],
  KG: ["quirguiz", "bisqueque"],
  MN: ["mongol", "ulaanbaatar"],
  NP: ["nepales", "catmandu"],
  BD: ["bengali", "daca"],
  LK: ["cingales", "colombo"],
  MM: ["birmanes", "birmania", "rangum", "naypyidaw"],
  TH: ["tailandes", "bangkok"],
  VN: ["vietnamita", "hanoi", "vietname"],
  KH: ["cambojano", "phnom penh"],
  LA: ["laosiano", "vientiane"],
  MY: ["malasio", "kuala lumpur"],
  SG: ["singapuriano"],
  PH: ["filipino", "filipina", "manila"],
  BN: ["bruneano"],
  TL: ["timor oriental", "dili"],
  PG: ["papua", "port moresby"],
  FJ: ["fijiano", "suva"],
  SB: ["salomao", "honiara"],
  VU: ["port vila"],
  NC: ["noumea"],
  GL: ["groenlandes", "nuuk"],
  GT: ["guatemalteco"],
  HN: ["hondurenho"],
  SV: ["salvadorenho"],
  NI: ["nicaraguense"],
  CR: ["costarriquenho"],
  PA: ["panamenho"],
  DO: ["dominicano"],
  JM: ["jamaicano"],
  PR: ["porto-riquenho"],
  GY: ["guianense"],
  SR: ["surinames"],
  TG: ["lome"],
  BJ: ["porto novo"],
  GM: ["banjul"],
  SL: ["freetown"],
  LR: ["monrovia"],
  BF: ["ouagadougou"],
  CI: ["abidjan", "ivory coast", "cote d ivoire"],
  CM: ["yaounde"],
  GA: ["libreville"],
  TD: ["djamena"],
  NE: ["niamey"],
  ML: ["bamako"],
  MR: ["nouakchott"],
  CF: ["bangui"],
  EH: ["sara ocidental", "western sahara"],
  FK: ["malvinas", "falkland"],
  TW: ["taipei", "taipe"],
  XK: ["pristina"],
};

const SKIP_TERMS = new Set(["ira", "usa", "jordan", "chad", "georgia", "turkey"]);
const SHORT_TERMS = new Set(["eua", "uk", "oma"]);

interface CompiledCountryTerm {
  code: string;
  continent: Continent;
  term: string;
  length: number;
}

const COUNTRY_TERMS: CompiledCountryTerm[] = [];

for (const country of COUNTRY_DATA) {
  const terms = new Set<string>([
    country.name,
    country.nameEn,
    ...(EXTRA_TERMS[country.code] ?? []),
  ]);

  for (const rawTerm of terms) {
    const normalized = normalize(rawTerm);
    if (!normalized) continue;
    if (SKIP_TERMS.has(normalized)) continue;
    if (normalized.length < 4 && !SHORT_TERMS.has(normalized)) continue;

    COUNTRY_TERMS.push({
      code: country.code,
      continent: country.continent,
      term: ` ${normalized} `,
      length: normalized.length,
    });
  }
}

// Termos mais longos primeiro: evita que "Sudão" case dentro de "Sudão do Sul".
COUNTRY_TERMS.sort((a, b) => b.length - a.length || a.code.localeCompare(b.code));

const COUNTRY_PRIORITY = [
  "BR", "US", "CN", "RU", "UA", "AR", "VE", "CO", "MX", "GB", "FR", "DE",
  "IN", "JP", "IL", "PS", "IR", "SA", "TR", "ZA", "NG", "EG", "AU", "CA",
];

const REGION_TERMS = [
  { continent: "oriente-medio" as Continent, term: "oriente medio" },
  { continent: "europa" as Continent, term: "europa" },
  { continent: "europa" as Continent, term: "uniao europeia" },
  { continent: "europa" as Continent, term: "zona do euro" },
  { continent: "america-sul" as Continent, term: "america latina" },
  { continent: "america-sul" as Continent, term: "latino america" },
  { continent: "america-sul" as Continent, term: "latam" },
  { continent: "america-central" as Continent, term: "caribe" },
  { continent: "america-central" as Continent, term: "caribenho" },
  { continent: "africa" as Continent, term: "africa" },
  { continent: "africa" as Continent, term: "africano" },
  { continent: "africa" as Continent, term: "africana" },
  { continent: "asia" as Continent, term: "asia" },
  { continent: "asia" as Continent, term: "asiatico" },
  { continent: "asia" as Continent, term: "asiatica" },
  { continent: "oceania" as Continent, term: "oceania" },
].map((entry) => ({ ...entry, term: ` ${entry.term} ` }));

const CONTINENT_PRIORITY: Continent[] = [
  "brasil",
  "oriente-medio",
  "europa",
  "asia",
  "africa",
  "america-sul",
  "america-norte",
  "america-central",
  "oceania",
  "global",
];

function priorityOf(code: string): number {
  const index = COUNTRY_PRIORITY.indexOf(code);
  return index === -1 ? 500 : index;
}

export interface DetectedGeography {
  country: string | null;
  continent: Continent;
}

export function detectCountryAndContinent(
  text: string,
  raw: string,
  fallback: Continent,
): DetectedGeography {
  let working = text;
  const countryHits = new Map<string, number>();
  const countryMaxTerm = new Map<string, number>();
  const continentHits = new Map<Continent, number>();

  for (const entry of COUNTRY_TERMS) {
    if (!working.includes(entry.term)) continue;

    working = working.split(entry.term).join(" ");
    countryHits.set(entry.code, (countryHits.get(entry.code) ?? 0) + 1);
    countryMaxTerm.set(
      entry.code,
      Math.max(countryMaxTerm.get(entry.code) ?? 0, entry.length),
    );
    continentHits.set(entry.continent, (continentHits.get(entry.continent) ?? 0) + 1);
  }

  // O termo normalizado de "Irã" seria "ira" e colidiria com o verbo "irá".
  if (/\birã\b/i.test(raw)) {
    countryHits.set("IR", (countryHits.get("IR") ?? 0) + 2);
    countryMaxTerm.set("IR", Math.max(countryMaxTerm.get("IR") ?? 0, 3));
    continentHits.set("oriente-medio", (continentHits.get("oriente-medio") ?? 0) + 2);
  }

  for (const entry of REGION_TERMS) {
    if (!working.includes(entry.term)) continue;
    working = working.split(entry.term).join(" ");
    continentHits.set(entry.continent, (continentHits.get(entry.continent) ?? 0) + 1);
  }

  let country: string | null = null;
  if (countryHits.size > 0) {
    const maxHits = Math.max(...countryHits.values());
    const candidates = [...countryHits.entries()]
      .filter(([, hits]) => hits === maxHits)
      .map(([code]) => code);

    if (candidates.includes("BR")) {
      country = "BR";
    } else {
      candidates.sort(
        (a, b) =>
          (countryMaxTerm.get(b) ?? 0) - (countryMaxTerm.get(a) ?? 0) ||
          priorityOf(a) - priorityOf(b),
      );
      country = candidates[0] ?? null;
    }
  }

  let continent: Continent | null = null;
  if (continentHits.size > 0) {
    const maxHits = Math.max(...continentHits.values());
    const candidates = [...continentHits.entries()]
      .filter(([, hits]) => hits === maxHits)
      .map(([key]) => key);

    if (candidates.includes("brasil")) {
      continent = "brasil";
    } else {
      continent = candidates.sort(
        (a, b) =>
          CONTINENT_PRIORITY.indexOf(a) - CONTINENT_PRIORITY.indexOf(b),
      )[0] ?? null;
    }
  }

  if (country === "BR") {
    return { country, continent: "brasil" };
  }

  return { country, continent: continent ?? fallback };
}
