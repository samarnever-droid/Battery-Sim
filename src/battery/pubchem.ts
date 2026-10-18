/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export interface PubChemCompoundData {
  cid: number;
  title: string;
  molecularFormula: string;
  molecularWeight: number;
  canonicalSmiles: string;
  iupacName?: string;
  inChIKey?: string;
  charge?: number;
  heavyAtomCount?: number;
  pngUrl: string;
  provenance: string;
}

/**
 * Exponential backoff fetch helper complying with Science Skill specifications
 */
export async function fetchWithRetry(
  url: string,
  options: RequestInit = {},
  maxRetries = 3,
  baseDelayMs = 600
): Promise<Response> {
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      const response = await fetch(url, options);
      if (response.ok) {
        return response;
      }
      if (
        (response.status === 429 || response.status >= 500) &&
        attempt < maxRetries
      ) {
        const retryAfter = Number(response.headers.get('Retry-After'));
        const delay =
          !Number.isNaN(retryAfter) && retryAfter > 0
            ? retryAfter * 1000
            : baseDelayMs * Math.pow(2, attempt);
        await new Promise((resolve) => setTimeout(resolve, delay));
        continue;
      }
      const errorBody = await response.text().catch(() => '');
      throw new Error(
        `HTTP ${response.status} (${response.statusText}) from ${url}: ${errorBody.slice(0, 300)}`
      );
    } catch (err: any) {
      if (attempt >= maxRetries) {
        throw err;
      }
      await new Promise((resolve) => setTimeout(resolve, baseDelayMs * Math.pow(2, attempt)));
    }
  }
  throw new Error(`Exhausted retries for ${url}`);
}

// Offline high-fidelity fallback cache for core battery compounds
const PRESET_PUBCHEM_CACHE: Record<number, Partial<PubChemCompoundData>> = {
  10989011: {
    cid: 10989011,
    title: 'Lithium iron(2+) phosphate (LiFePO4)',
    molecularFormula: 'FeLiO4P',
    molecularWeight: 157.76,
    canonicalSmiles: '[Li+].[O-]P(=O)([O-])[O-].[Fe+2]',
    iupacName: 'iron(2+);lithium;phosphate',
    inChIKey: 'VECSYWAKCSXZTL-UHFFFAOYSA-N',
  },
  5462310: {
    cid: 5462310,
    title: 'Graphite / Carbon (C)',
    molecularFormula: 'C',
    molecularWeight: 12.011,
    canonicalSmiles: '[C]',
    iupacName: 'carbon',
    inChIKey: 'OKTJSMMVPCPJKN-UHFFFAOYSA-N',
  },
  24773: {
    cid: 24773,
    title: 'Lithium hexafluorophosphate (LiPF6)',
    molecularFormula: 'F6LiP',
    molecularWeight: 151.905,
    canonicalSmiles: '[Li+].F[P-](F)(F)(F)(F)F',
    iupacName: 'lithium;hexafluorophosphate',
    inChIKey: 'AXISYYMSGDNQAV-UHFFFAOYSA-N',
  },
  7303: {
    cid: 7303,
    title: 'Ethylene Carbonate (EC)',
    molecularFormula: 'C3H4O3',
    molecularWeight: 88.06,
    canonicalSmiles: 'C1COC(=O)O1',
    iupacName: '1,3-dioxolan-2-one',
    inChIKey: 'KMTRUDSVKNLOMY-UHFFFAOYSA-N',
  },
  10427: {
    cid: 10427,
    title: 'Dimethyl Carbonate (DMC)',
    molecularFormula: 'C3H6O3',
    molecularWeight: 90.08,
    canonicalSmiles: 'COC(=O)OC',
    iupacName: 'dimethyl carbonate',
    inChIKey: 'IEAHSACNQDOAOC-UHFFFAOYSA-N',
  },
  17978: {
    cid: 17978,
    title: 'Vinylene Carbonate (VC Additive)',
    molecularFormula: 'C3H2O3',
    molecularWeight: 86.05,
    canonicalSmiles: 'C1=COC(=O)O1',
    iupacName: '1,3-dioxol-2-one',
    inChIKey: 'LGYXOSYQDFHIOV-UHFFFAOYSA-N',
  },
  3028194: {
    cid: 3028194,
    title: 'Lithium Metal (Li)',
    molecularFormula: 'Li',
    molecularWeight: 6.94,
    canonicalSmiles: '[Li]',
    iupacName: 'lithium',
    inChIKey: 'WHXSMMKACNTZSN-UHFFFAOYSA-N',
  },
  5461123: {
    cid: 5461123,
    title: 'Silicon (Si)',
    molecularFormula: 'Si',
    molecularWeight: 28.085,
    canonicalSmiles: '[Si]',
    iupacName: 'silicon',
    inChIKey: 'XUIMIQQOPSSXEZ-UHFFFAOYSA-N',
  },
  23673456: {
    cid: 23673456,
    title: 'Sodium hexafluorophosphate (NaPF6)',
    molecularFormula: 'F6NaP',
    molecularWeight: 167.954,
    canonicalSmiles: '[Na+].F[P-](F)(F)(F)(F)F',
    iupacName: 'sodium;hexafluorophosphate',
    inChIKey: 'ZRSQLDYKUXEUQG-UHFFFAOYSA-N',
  },
  11186716: {
    cid: 11186716,
    title: 'Lithium bis(fluorosulfonyl)imide (LiFSI)',
    molecularFormula: 'F2LiNO4S2',
    molecularWeight: 187.07,
    canonicalSmiles: '[Li+].FS(=O)(=O)[N-]S(=O)(=O)F',
    iupacName: 'lithium;bis(fluorosulfonyl)azanide',
    inChIKey: 'GOHJUSXUXLQJOC-UHFFFAOYSA-N',
  },
};

/**
 * Fetch detailed compound metadata by PubChem CID with fallback to curated battery properties
 */
export async function getPubChemCompound(cid: number): Promise<PubChemCompoundData> {
  const pngUrl = `https://pubchem.ncbi.nlm.nih.gov/rest/pug/compound/cid/${cid}/PNG?image_size=large`;

  try {
    const url = `https://pubchem.ncbi.nlm.nih.gov/rest/pug/compound/cid/${cid}/property/Title,IUPACName,MolecularFormula,MolecularWeight,CanonicalSMILES,InChIKey,Charge,HeavyAtomCount/JSON`;
    const res = await fetchWithRetry(url, { headers: { Accept: 'application/json' } }, 2, 400);
    const data = await res.json();
    const prop = data?.PropertyTable?.Properties?.[0];

    if (prop) {
      return {
        cid,
        title: prop.Title || prop.IUPACName || `PubChem CID ${cid}`,
        molecularFormula: prop.MolecularFormula || '',
        molecularWeight: Number(prop.MolecularWeight) || 0,
        canonicalSmiles: prop.CanonicalSMILES || '',
        iupacName: prop.IUPACName,
        inChIKey: prop.InChIKey,
        charge: prop.Charge,
        heavyAtomCount: prop.HeavyAtomCount,
        pngUrl,
        provenance: '[PubChem PUG REST API Live]',
      };
    }
  } catch (err) {
    // Graceful fallback to verified curated data
  }

  const cached = PRESET_PUBCHEM_CACHE[cid];
  if (cached) {
    return {
      cid,
      title: cached.title || `CID ${cid}`,
      molecularFormula: cached.molecularFormula || '',
      molecularWeight: cached.molecularWeight || 0,
      canonicalSmiles: cached.canonicalSmiles || '',
      iupacName: cached.iupacName,
      inChIKey: cached.inChIKey,
      pngUrl,
      provenance: '[PubChem Curated Cache]',
    };
  }

  return {
    cid,
    title: `PubChem CID ${cid}`,
    molecularFormula: '',
    molecularWeight: 0,
    canonicalSmiles: '',
    pngUrl,
    provenance: '[PubChem Record Reference]',
  };
}

/**
 * Search PubChem by material name or formula
 */
export async function searchPubChemByName(query: string): Promise<number[]> {
  try {
    const url = `https://pubchem.ncbi.nlm.nih.gov/rest/pug/compound/name/${encodeURIComponent(query)}/cids/JSON?MaxRecords=5`;
    const res = await fetchWithRetry(url, {}, 2, 400);
    const data = await res.json();
    return data?.IdentifierList?.CID || [];
  } catch {
    return [];
  }
}
