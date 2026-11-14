# NASA OSDR Data Audit — OSD-575 and OSD-569

**Status:** draft audit. Data acquisition and schema verification only.
**Prepared:** 2026-11-14
**Scope:** transformed tabular files and study metadata for two NASA OSDR
Inspiration4 biospecimen studies. No application code, assessment logic, or
analytics were changed. No integration has been written.

---

## 1. Why these two studies

LIMEN is a browser-local instrument for self-reported crew state plus a
visuomotor tracking task. OSD-575 (blood serum panels) and OSD-569 (whole
blood, including a complete blood count) are the two Inspiration4 studies that
contain small, already-processed, tabular measurements rather than sequencing
data. They are used here as a **public reference example of real pre/post-flight
crew biospecimen data** — not as a source of live telemetry and not as an input
to any readiness judgement.

## 2. Official records

| | OSD-575 | OSD-569 |
|---|---|---|
| Title | SpaceX Inspiration4 Blood Serum Metabolic Panel and Immune/Cardiac Cytokine Arrays (Comprehensive Metabolic Panel and Multiplex) | Whole Blood Measurements from the SpaceX Inspiration4 Mission (RNA-seq, epitranscriptome, WGS, clonal hematopoiesis, CBC) |
| OSDR record | https://osdr.nasa.gov/bio/repo/data/studies/OSD-575 | https://osdr.nasa.gov/bio/repo/data/studies/OSD-569 |
| DOI | 10.26030/mc5d-p710 | 10.26030/e0rx-sh52 |
| DOI resolution | https://doi.org/10.26030/mc5d-p710 | https://doi.org/10.26030/e0rx-sh52 |
| Dataset version (DOI registration) | 3 | 4 |
| Public release | 14 May 2024 | 14 May 2024 |
| Mission | SpaceX Inspiration4, 16–18 Sep 2021 | SpaceX Inspiration4, 16–18 Sep 2021 |
| Participants | 4 (pseudonymous C001–C004) | 4 (pseudonymous C001–C004) |
| Publisher registration | NASA GeneLab | NASA GeneLab |

Metadata endpoints used to derive file URLs (not guessed):

```
https://osdr.nasa.gov/osdr/data/osd/files/575
https://osdr.nasa.gov/osdr/data/osd/files/569
https://osdr.nasa.gov/osdr/data/osd/meta/575
https://osdr.nasa.gov/osdr/data/osd/meta/569
```

File download pattern returned by that API:

```
https://osdr.nasa.gov/geode-py/ws/studies/<OSD-ID>/download?source=datamanager&file=<filename>
```

## 3. Licence

Both DOIs are registered with rights metadata:

- **Creative Commons Zero v1.0 Universal (CC0 1.0)**
- `https://creativecommons.org/publicdomain/zero/1.0/legalcode`
- SPDX identifier: `cc0-1.0`

Source: DataCite registration records for the two DOIs (retrieved
2026-11-14). CC0 permits redistribution. Attribution is retained voluntarily
below regardless, because provenance is part of the scientific claim.

## 4. Files acquired

All files were fetched directly from the OSDR download endpoint above. Original
filenames are preserved; nothing was renamed or overwritten.

**LSDS-8_Comprehensive_Metabolic_Panel_CMP_TRANSFORMED.csv**

- Study: `OSD-575` — CMP
- Local path: `data/raw/osdr/OSD-575/LSDS-8_Comprehensive_Metabolic_Panel_CMP_TRANSFORMED.csv`
- Source URL: `https://osdr.nasa.gov/geode-py/ws/studies/OSD-575/download?source=datamanager&file=LSDS-8_Comprehensive_Metabolic_Panel_CMP_TRANSFORMED.csv`
- Size: 8,506 bytes
- SHA-256: `5eb1e7f025dd8443a9e70111e62bc32afae3432753024489c5c013e401d709d9`

**LSDS-8_Multiplex_serum_immune_EvePanel_TRANSFORMED.csv**

- Study: `OSD-575` — Eve immune (HD71)
- Local path: `data/raw/osdr/OSD-575/LSDS-8_Multiplex_serum_immune_EvePanel_TRANSFORMED.csv`
- Source URL: `https://osdr.nasa.gov/geode-py/ws/studies/OSD-575/download?source=datamanager&file=LSDS-8_Multiplex_serum_immune_EvePanel_TRANSFORMED.csv`
- Size: 41,214 bytes
- SHA-256: `efa8fb807e3b7e363df47f64f48d03c57d2397daf8fd22afc0ea4335d5d3d53e`

**LSDS-8_Multiplex_serum_cardiovascular_EvePanel_TRANSFORMED.csv**

- Study: `OSD-575` — Eve cardiovascular (HDCVD9)
- Local path: `data/raw/osdr/OSD-575/LSDS-8_Multiplex_serum_cardiovascular_EvePanel_TRANSFORMED.csv`
- Source URL: `https://osdr.nasa.gov/geode-py/ws/studies/OSD-575/download?source=datamanager&file=LSDS-8_Multiplex_serum_cardiovascular_EvePanel_TRANSFORMED.csv`
- Size: 6,207 bytes
- SHA-256: `fdba6c3ce45401c12ca9b699fa375303793959aa0391e2f3c722f354d9cfc75c`

**LSDS-8_Multiplex_serum.immune.AlamarPanel_TRANSFORMED.csv**

- Study: `OSD-575` — Alamar NULISA
- Local path: `data/raw/osdr/OSD-575/LSDS-8_Multiplex_serum.immune.AlamarPanel_TRANSFORMED.csv`
- Source URL: `https://osdr.nasa.gov/geode-py/ws/studies/OSD-575/download?source=datamanager&file=LSDS-8_Multiplex_serum.immune.AlamarPanel_TRANSFORMED.csv`
- Size: 141,783 bytes
- SHA-256: `b53bcf9c325ae1d86e6d0d16df31ddd123423f449c7d550ac026ee01659241bc`

**LSDS-7_Complete_Blood_Count_CBC_TRANSFORMED.csv**

- Study: `OSD-569` — CBC
- Local path: `data/raw/osdr/OSD-569/LSDS-7_Complete_Blood_Count_CBC_TRANSFORMED.csv`
- Source URL: `https://osdr.nasa.gov/geode-py/ws/studies/OSD-569/download?source=datamanager&file=LSDS-7_Complete_Blood_Count_CBC_TRANSFORMED.csv`
- Size: 9,317 bytes
- SHA-256: `32e4f9c97d3b636b5d5c2e72dab8c4d3319dee64c437508b092dad04603b2b8f`

**OSD-575_metadata_OSD-575-ISA.zip**

- Study: `OSD-575` — ISA study/sample/assay metadata
- Local path: `data/raw/osdr/OSD-575/OSD-575_metadata_OSD-575-ISA.zip`
- Source URL: `https://osdr.nasa.gov/geode-py/ws/studies/OSD-575/download?source=datamanager&file=OSD-575_metadata_OSD-575-ISA.zip`
- Size: 71,702 bytes
- SHA-256: `a1d3e49e2b61ab427a8760d0c98e0324a53272d0e1314632290266b014476f1d`

**OSD-569_metadata_OSD-569-ISA.zip**

- Study: `OSD-569` — ISA study/sample/assay metadata
- Local path: `data/raw/osdr/OSD-569/OSD-569_metadata_OSD-569-ISA.zip`
- Source URL: `https://osdr.nasa.gov/geode-py/ws/studies/OSD-569/download?source=datamanager&file=OSD-569_metadata_OSD-569-ISA.zip`
- Size: 123,512 bytes
- SHA-256: `5b3c19c5079816b283125caf4009db8e39d48377d92763e9e61e86e3e1b4c159`

Deliberately **not** downloaded (present in the records, out of scope for this
stage):

- `LSDS-8_Comprehensive_Metabolic_Panel_CMP.upload_SUBMITTED.csv` (25 KB)
- `LSDS-8_Multiplex_serum.immune.EvePanel_SUBMITTED.csv` (107 KB)
- `LSDS-8_Multiplex_serum.cardiovascular.EvePanel_SUBMITTED.csv` (15 KB)
- `LSDS-8_Multiplex_serum.immune.AlamarPanel_SUBMITTED.xlsx` (323 KB)
- `LSDS-7_Complete_Blood_Count_CBC.upload_SUBMITTED.csv` (26 KB)
- All sequencing, m6A, WGS and multiQC assets in OSD-569, including a 123 MB
  processed RNA-seq workbook and a 93 MB m6A workbook.

## 5. Assays and platforms

| File | Assay | Platform / vendor | Analytes |
|---|---|---|---|
| CMP | Comprehensive Metabolic Panel | Beckman Coulter AU5800, Quest Diagnostics | 19 |
| Eve immune | Human Cytokine/Chemokine 71-Plex Discovery Assay (HD71) | Eve Technologies, Calgary | 71 |
| Eve cardiovascular | Cardiovascular 9-plex (HDCVD9) | Eve Technologies, Calgary | 9 |
| Alamar | NULISA-seq 200plex v1 Inflammation Panel | Alamar Biosciences | 203 |
| CBC | Complete Blood Count | Sysmex XN Analyzer, Quest Diagnostics | 20 |

Platform, kit, target count, storage temperature, submitted-file name and
transformed-file name were read from the ISA assay tables, not inferred from
filenames.

### 5.1 The HD71 panel has no separate file

The ISA metadata describes a distinct assay, `Eve Technologies Panel HD71`,
but its `Parameter Value[Transformed Files]` entry points to
`LSDS-8_Multiplex_serum_immune_EvePanel_TRANSFORMED.csv` — the same file as the
immune Eve panel. That file contains exactly 71 concentration columns, which is
consistent with the 71-plex HD71 kit. **There is no separate HD71 download.**
The cardiovascular 9-plex is a separate file (9 analytes).

## 6. Format

All five CSVs are **wide**: one row per sample, one column group per analyte.
Encoding is UTF-8 with a byte-order mark. Delimiter is a comma. Line endings
were not modified.

## 7. Verified schemas

### 7.1 LSDS-8_Comprehensive_Metabolic_Panel_CMP_TRANSFORMED.csv

- Rows (excluding header): 28
- Columns: 58 (1 identifier + 57 measurement/reference columns)
- Identifier column: `Sample Name` (text)
- Wide format, one row per sample
- Missing cells: 56 `N/A`, 22 `NA`, 3 `<blank>`
- Malformed rows (field-count mismatch): 0
- Duplicate identifiers: 0

Column groups:

- 19 × `*_value*` columns (measured value)
- 19 × `*_range_min*` columns (laboratory reference range lower bound)
- 19 × `*_range_max*` columns (laboratory reference range upper bound)

Units are encoded in the column names only. No separate unit column exists
in any of these files.

<details><summary>Exact column names (58)</summary>

```
Sample Name, albumin_value_gram_per_deciliter, albumin_range_min_gram_per_deciliter,
albumin_range_max_gram_per_deciliter, albumin_to_globulin_ratio_value,
albumin_to_globulin_ratio_range_min, albumin_to_globulin_ratio_range_max,
alkaline_phosphatase_value_units_per_liter, alkaline_phosphatase_range_min_units_per_liter,
alkaline_phosphatase_range_max_units_per_liter, alt_value_units_per_liter,
alt_range_min_units_per_liter, alt_max_units_per_liter, ast_value_units_per_liter,
ast_range_min_units_per_liter, ast_max_units_per_liter,
total_bilirubin_value_milligram_per_deciliter, total_bilirubin_range_min_milligram_per_deciliter,
total_bilirubin_range_max_milligram_per_deciliter, bun_to_creatinine_ratio_value,
bun_to_creatinine_ratio_range_min, bun_to_creatinine_ratio_range_max,
calcium_value_milligram_per_deciliter, calcium_range_min_milligram_per_deciliter,
calcium_range_max_milligram_per_deciliter, carbon_dioxide_value_millimol_per_liter,
carbon_dioxide_range_min_millimol_per_liter, carbon_dioxide_range_max_millimol_per_liter,
chloride_value_millimol_per_liter, chloride_range_min_millimol_per_liter,
chloride_range_max_millimol_per_liter, creatinine_value_milligram_per_deciliter,
creatinine_range_min_milligram_per_deciliter, creatinine_range_max_milligram_per_deciliter,
egfr_african_american_value_milliliter_per_minute_per_1.73_meter_squared,
egfr_african_american_range_min_milliliter_per_minute_per_1.73_meter_squared,
egfr_african_american_range_max_milliliter_per_minute_per_1.73_meter_squared,
egfr_non_african_american_value_milliliter_per_minute_per_1.73_meter_squared,
egfr_non_african_american_range_min_milliliter_per_minute_per_1.73_meter_squared,
egfr_non_african_american_range_max_milliliter_per_minute_per_1.73_meter_squared,
globulin_value_gram_per_deciliter, globulin_range_min_gram_per_deciliter,
globulin_range_max_gram_per_deciliter, glucose_value_milligram_per_deciliter,
glucose_range_min_milligram_per_deciliter, glucose_range_max_milligram_per_deciliter,
potassium_value_millimol_per_liter, potassium_range_min_millimol_per_liter,
potassium_range_max_millimol_per_liter, total_protein_value_gram_per_deciliter,
total_protein_range_min_gram_per_deciliter, total_protein_range_max_gram_per_deciliter,
sodium_value_millimol_per_liter, sodium_range_min_millimol_per_liter,
sodium_range_max_millimol_per_liter, urea_nitrogen_bun_value_milligram_per_deciliter,
urea_nitrogen_bun_range_min_milligram_per_deciliter,
urea_nitrogen_bun_range_max_milligram_per_deciliter
```

</details>

### 7.2 LSDS-8_Multiplex_serum_immune_EvePanel_TRANSFORMED.csv

- Rows (excluding header): 28
- Columns: 143 (1 identifier + 142 measurement/reference columns)
- Identifier column: `Sample Name` (text)
- Wide format, one row per sample
- Missing cells: none
- Malformed rows (field-count mismatch): 0
- Duplicate identifiers: 0

Column groups:

- 71 × `*_concentration_*` columns (measured concentration)
- 71 × `*_percent*` columns (vendor-derived normalized value)

Units are encoded in the column names only. No separate unit column exists
in any of these files.

<details><summary>Exact column names (143)</summary>

```
Sample Name, 6ckine_concentration_picogram_per_milliliter, 6ckine_percent,
bca_1_concentration_picogram_per_milliliter, bca_1_percent,
ctack_concentration_picogram_per_milliliter, ctack_percent,
egf_concentration_picogram_per_milliliter, egf_percent,
ena_78_concentration_picogram_per_milliliter, ena_78_percent,
eotaxin_concentration_picogram_per_milliliter, eotaxin_percent,
eotaxin_2_concentration_picogram_per_milliliter, eotaxin_2_percent,
eotaxin_3_concentration_picogram_per_milliliter, eotaxin_3_percent,
fgf_2_concentration_picogram_per_milliliter, fgf_2_percent,
flt_3l_concentration_picogram_per_milliliter, flt_3l_percent,
fractalkine_concentration_picogram_per_milliliter, fractalkine_percent,
g_csf_concentration_picogram_per_milliliter, g_csf_percent,
gm_csf_concentration_picogram_per_milliliter, gm_csf_percent,
groα_concentration_picogram_per_milliliter, groα_percent,
i_309_concentration_picogram_per_milliliter, i_309_percent,
ifn_α2_concentration_picogram_per_milliliter, ifn_α2_percent,
ifnγ_concentration_picogram_per_milliliter, ifnγ_percent,
il_10_concentration_picogram_per_milliliter, il_10_percent,
il_12p40_concentration_picogram_per_milliliter, il_12p40_percent,
il_12p70_concentration_picogram_per_milliliter, il_12p70_percent,
il_13_concentration_picogram_per_milliliter, il_13_percent,
il_15_concentration_picogram_per_milliliter, il_15_percent,
il_16_concentration_picogram_per_milliliter, il_16_percent,
il_17a_concentration_picogram_per_milliliter, il_17a_percent,
il_17e_per_il_25_concentration_picogram_per_milliliter, il_17e_per_il_25_percent,
il_17f_concentration_picogram_per_milliliter, il_17f_percent,
il_18_concentration_picogram_per_milliliter, il_18_percent,
il_1ra_concentration_picogram_per_milliliter, il_1ra_percent,
il_1α_concentration_picogram_per_milliliter, il_1α_percent,
il_1β_concentration_picogram_per_milliliter, il_1β_percent,
il_2_concentration_picogram_per_milliliter, il_2_percent,
il_20_concentration_picogram_per_milliliter, il_20_percent,
il_21_concentration_picogram_per_milliliter, il_21_percent,
il_22_concentration_picogram_per_milliliter, il_22_percent,
il_23_concentration_picogram_per_milliliter, il_23_percent,
il_27_concentration_picogram_per_milliliter, il_27_percent,
il_28a_concentration_picogram_per_milliliter, il_28a_percent,
il_3_concentration_picogram_per_milliliter, il_3_percent,
il_33_concentration_picogram_per_milliliter, il_33_percent,
il_4_concentration_picogram_per_milliliter, il_4_percent,
il_5_concentration_picogram_per_milliliter, il_5_percent,
il_6_concentration_picogram_per_milliliter, il_6_percent,
il_7_concentration_picogram_per_milliliter, il_7_percent,
il_8_concentration_picogram_per_milliliter, il_8_percent,
il_9_concentration_picogram_per_milliliter, il_9_percent,
ip_10_concentration_picogram_per_milliliter, ip_10_percent,
lif_concentration_picogram_per_milliliter, lif_percent, m_csf_concentration_picogram_per_milliliter,
m_csf_percent, mcp_1_concentration_picogram_per_milliliter, mcp_1_percent,
mcp_2_concentration_picogram_per_milliliter, mcp_2_percent,
mcp_3_concentration_picogram_per_milliliter, mcp_3_percent,
mcp_4_concentration_picogram_per_milliliter, mcp_4_percent,
mdc_concentration_picogram_per_milliliter, mdc_percent,
mig_per_cxcl9_concentration_picogram_per_milliliter, mig_per_cxcl9_percent,
mip_1α_concentration_picogram_per_milliliter, mip_1α_percent,
mip_1β_concentration_picogram_per_milliliter, mip_1β_percent,
mip_1δ_concentration_picogram_per_milliliter, mip_1δ_percent,
pdgf_aa_concentration_picogram_per_milliliter, pdgf_aa_percent,
pdgf_ab_per_bb_concentration_picogram_per_milliliter, pdgf_ab_per_bb_percent,
rantes_concentration_picogram_per_milliliter, rantes_percent,
scd40l_concentration_picogram_per_milliliter, scd40l_percent,
scf_concentration_picogram_per_milliliter, scf_percent,
sdf_1α_plus_β_concentration_picogram_per_milliliter, sdf_1α_plus_β_percent,
tarc_concentration_picogram_per_milliliter, tarc_percent,
tgfα_concentration_picogram_per_milliliter, tgfα_percent,
tnfα_concentration_picogram_per_milliliter, tnfα_percent,
tnfβ_concentration_picogram_per_milliliter, tnfβ_percent, tpo_concentration_picogram_per_milliliter,
tpo_percent, trail_concentration_picogram_per_milliliter, trail_percent,
tslp_concentration_picogram_per_milliliter, tslp_percent,
vegf_a_concentration_picogram_per_milliliter, vegf_a_percent
```

</details>

### 7.3 LSDS-8_Multiplex_serum_cardiovascular_EvePanel_TRANSFORMED.csv

- Rows (excluding header): 28
- Columns: 19 (1 identifier + 18 measurement/reference columns)
- Identifier column: `Sample Name` (text)
- Wide format, one row per sample
- Missing cells: none
- Malformed rows (field-count mismatch): 0
- Duplicate identifiers: 0

Column groups:

- 9 × `*_concentration_*` columns (measured concentration)
- 9 × `*_percent*` columns (vendor-derived normalized value)

Units are encoded in the column names only. No separate unit column exists
in any of these files.

<details><summary>Exact column names (19)</summary>

```
Sample Name, a2_macroglobulin_concentration_nanogram_per_milliliter, a2_macroglobulin_percent,
agp_concentration_nanogram_per_milliliter, agp_percent, crp_concentration_picogram_per_milliliter,
crp_percent, fetuin_a36_concentration_nanogram_per_milliliter, fetuin_a36_percent,
fibrinogen_concentration_nanogram_per_milliliter, fibrinogen_percent,
haptoglobin_concentration_nanogram_per_milliliter, haptoglobin_percent,
l_selectin_concentration_picogram_per_milliliter, l_selectin_percent,
pf4_concentration_nanogram_per_milliliter, pf4_percent, sap_concentration_picogram_per_milliliter,
sap_percent
```

</details>

### 7.4 LSDS-8_Multiplex_serum.immune.AlamarPanel_TRANSFORMED.csv

- Rows (excluding header): 27
- Columns: 407 (1 identifier + 406 measurement/reference columns)
- Identifier column: `Sample ID` (text)
- Wide format, one row per sample
- Missing cells: none
- Malformed rows (field-count mismatch): 0
- Duplicate identifiers: 0

Column groups:

- 203 × `*_concentration_*` columns (measured concentration)
- 203 × `*_percent*` columns (vendor-derived normalized value)

Units are encoded in the column names only. No separate unit column exists
in any of these files.

<details><summary>Exact column names (407)</summary>

```
Sample ID, activin_a_concentration_npq, activin_a_percent_normalized_value,
activin_ab_concentration_npq, activin_ab_percent_normalized_value, activin_b_concentration_npq,
activin_b_percent_normalized_value, ager_concentration_npq, ager_percent_normalized_value,
agrp_concentration_npq, agrp_percent_normalized_value, angpt1_concentration_npq,
angpt1_percent_normalized_value, anxa1_concentration_npq, anxa1_percent_normalized_value,
bdnf_concentration_npq, bdnf_percent_normalized_value, bmp10_concentration_npq,
bmp10_percent_normalized_value, bmp7_concentration_npq, bmp7_percent_normalized_value,
c1qa_concentration_npq, c1qa_percent_normalized_value, ccl1_concentration_npq,
ccl1_percent_normalized_value, ccl13_concentration_npq, ccl13_percent_normalized_value,
ccl14_concentration_npq, ccl14_percent_normalized_value, ccl15_concentration_npq,
ccl15_percent_normalized_value, ccl16_concentration_npq, ccl16_percent_normalized_value,
ccl17_concentration_npq, ccl17_percent_normalized_value, ccl19_concentration_npq,
ccl19_percent_normalized_value, ccl2_concentration_npq, ccl2_percent_normalized_value,
ccl20_concentration_npq, ccl20_percent_normalized_value, ccl22_concentration_npq,
ccl22_percent_normalized_value, ccl23_concentration_npq, ccl23_percent_normalized_value,
ccl24_concentration_npq, ccl24_percent_normalized_value, ccl25_concentration_npq,
ccl25_percent_normalized_value, ccl28_concentration_npq, ccl28_percent_normalized_value,
ccl3_concentration_npq, ccl3_percent_normalized_value, ccl4_concentration_npq,
ccl4_percent_normalized_value, ccl5_concentration_npq, ccl5_percent_normalized_value,
ccl7_concentration_npq, ccl7_percent_normalized_value, ccl8_concentration_npq,
ccl8_percent_normalized_value, cd200_concentration_npq, cd200_percent_normalized_value,
cd200r1_concentration_npq, cd200r1_percent_normalized_value, cd274_concentration_npq,
cd274_percent_normalized_value, cd276_concentration_npq, cd276_percent_normalized_value,
cd40_concentration_npq, cd40_percent_normalized_value, cd70_concentration_npq,
cd70_percent_normalized_value, cd83_concentration_npq, cd83_percent_normalized_value,
cd93_concentration_npq, cd93_percent_normalized_value, ceacam5_concentration_npq,
ceacam5_percent_normalized_value, chi3l1_concentration_npq, chi3l1_percent_normalized_value,
clcf1_concentration_npq, clcf1_percent_normalized_value, clec4a_concentration_npq,
clec4a_percent_normalized_value, csf1_concentration_npq, csf1_percent_normalized_value,
csf2rb_concentration_npq, csf2rb_percent_normalized_value, csf3_concentration_npq,
csf3_percent_normalized_value, csf3r_concentration_npq, csf3r_percent_normalized_value,
cst7_concentration_npq, cst7_percent_normalized_value, ctf1_concentration_npq,
ctf1_percent_normalized_value, ctla4_concentration_npq, ctla4_percent_normalized_value,
ctss_concentration_npq, ctss_percent_normalized_value, cx3cl1_concentration_npq,
cx3cl1_percent_normalized_value, cxadr_concentration_npq, cxadr_percent_normalized_value,
cxcl1_concentration_npq, cxcl1_percent_normalized_value, cxcl10_concentration_npq,
cxcl10_percent_normalized_value, cxcl12_concentration_npq, cxcl12_percent_normalized_value,
cxcl13_concentration_npq, cxcl13_percent_normalized_value, cxcl14_concentration_npq,
cxcl14_percent_normalized_value, cxcl2_concentration_npq, cxcl2_percent_normalized_value,
cxcl3_concentration_npq, cxcl3_percent_normalized_value, cxcl5_concentration_npq,
cxcl5_percent_normalized_value, cxcl8_concentration_npq, cxcl8_percent_normalized_value,
cxcl9_concentration_npq, cxcl9_percent_normalized_value, egf_concentration_npq,
egf_percent_normalized_value, epo_concentration_npq, epo_percent_normalized_value,
fam3d_concentration_npq, fam3d_percent_normalized_value, faslg_concentration_npq,
faslg_percent_normalized_value, fgf19_concentration_npq, fgf19_percent_normalized_value,
fgf2_concentration_npq, fgf2_percent_normalized_value, fgf21_concentration_npq,
fgf21_percent_normalized_value, fgf23_concentration_npq, fgf23_percent_normalized_value,
flt1_concentration_npq, flt1_percent_normalized_value, flt3lg_concentration_npq,
flt3lg_percent_normalized_value, fth1_concentration_npq, fth1_percent_normalized_value,
gdf15_concentration_npq, gdf15_percent_normalized_value, gdf2_concentration_npq,
gdf2_percent_normalized_value, gfap_concentration_npq, gfap_percent_normalized_value,
grn_concentration_npq, grn_percent_normalized_value, gzmb_concentration_npq,
gzmb_percent_normalized_value, hgf_concentration_npq, hgf_percent_normalized_value,
ifna1;_ifna13_concentration_npq, ifna1;_ifna13_percent_normalized_value, ifna2_concentration_npq,
ifna2_percent_normalized_value, ifnb1_concentration_npq, ifnb1_percent_normalized_value,
ifng_concentration_npq, ifng_percent_normalized_value, ifnl1_concentration_npq,
ifnl1_percent_normalized_value, ifnw1_concentration_npq, ifnw1_percent_normalized_value,
il10_concentration_npq, il10_percent_normalized_value, il10rb_concentration_npq,
il10rb_percent_normalized_value, il11_concentration_npq, il11_percent_normalized_value,
il12b_concentration_npq, il12b_percent_normalized_value, il12p70_concentration_npq,
il12p70_percent_normalized_value, il12rb1_concentration_npq, il12rb1_percent_normalized_value,
il13_concentration_npq, il13_percent_normalized_value, il13ra2_concentration_npq,
il13ra2_percent_normalized_value, il15ra_concentration_npq, il15ra_percent_normalized_value,
il16_concentration_npq, il16_percent_normalized_value, il17a_concentration_npq,
il17a_percent_normalized_value, il17b_concentration_npq, il17b_percent_normalized_value,
il17c_concentration_npq, il17c_percent_normalized_value, il17f_concentration_npq,
il17f_percent_normalized_value, il17rb_concentration_npq, il17rb_percent_normalized_value,
il18_concentration_npq, il18_percent_normalized_value, il18bp_concentration_npq,
il18bp_percent_normalized_value, il18r1_concentration_npq, il18r1_percent_normalized_value,
il19_concentration_npq, il19_percent_normalized_value, il1b_concentration_npq,
il1b_percent_normalized_value, il1r2_concentration_npq, il1r2_percent_normalized_value,
il1rl1_concentration_npq, il1rl1_percent_normalized_value, il1rn_concentration_npq,
il1rn_percent_normalized_value, il20_concentration_npq, il20_percent_normalized_value,
il22_concentration_npq, il22_percent_normalized_value, il23_concentration_npq,
il23_percent_normalized_value, il27_concentration_npq, il27_percent_normalized_value,
il2ra_concentration_npq, il2ra_percent_normalized_value, il2rb_concentration_npq,
il2rb_percent_normalized_value, il32_concentration_npq, il32_percent_normalized_value,
il33_concentration_npq, il33_percent_normalized_value, il34_concentration_npq,
il34_percent_normalized_value, il35_concentration_npq, il35_percent_normalized_value,
il36a_concentration_npq, il36a_percent_normalized_value, il36g_concentration_npq,
il36g_percent_normalized_value, il39_concentration_npq, il39_percent_normalized_value,
il3ra_concentration_npq, il3ra_percent_normalized_value, il4_concentration_npq,
il4_percent_normalized_value, il4r_concentration_npq, il4r_percent_normalized_value,
il5_concentration_npq, il5_percent_normalized_value, il5ra_concentration_npq,
il5ra_percent_normalized_value, il6_concentration_npq, il6_percent_normalized_value,
il6r_concentration_npq, il6r_percent_normalized_value, il7_concentration_npq,
il7_percent_normalized_value, il7r_concentration_npq, il7r_percent_normalized_value,
il9_concentration_npq, il9_percent_normalized_value, inhibin_a_concentration_npq,
inhibin_a_percent_normalized_value, inhibin_b_concentration_npq, inhibin_b_percent_normalized_value,
irak4_concentration_npq, irak4_percent_normalized_value, kdr_concentration_npq,
kdr_percent_normalized_value, kitlg_concentration_npq, kitlg_percent_normalized_value,
lag3_concentration_npq, lag3_percent_normalized_value, lamp3_concentration_npq,
lamp3_percent_normalized_value, lcn2_concentration_npq, lcn2_percent_normalized_value,
lgals9_concentration_npq, lgals9_percent_normalized_value, lif_concentration_npq,
lif_percent_normalized_value, ltbr_concentration_npq, ltbr_percent_normalized_value,
mdk_concentration_npq, mdk_percent_normalized_value, mertk_concentration_npq,
mertk_percent_normalized_value, met_concentration_npq, met_percent_normalized_value,
mica_concentration_npq, mica_percent_normalized_value, micb_concentration_npq,
micb_percent_normalized_value, mif_concentration_npq, mif_percent_normalized_value,
mmp10_concentration_npq, mmp10_percent_normalized_value, mmp12_concentration_npq,
mmp12_percent_normalized_value, mmp3_concentration_npq, mmp3_percent_normalized_value,
mmp8_concentration_npq, mmp8_percent_normalized_value, mmp9_concentration_npq,
mmp9_percent_normalized_value, mpo_concentration_npq, mpo_percent_normalized_value,
muc16_concentration_npq, muc16_percent_normalized_value, ncr1_concentration_npq,
ncr1_percent_normalized_value, ngf_concentration_npq, ngf_percent_normalized_value,
osm_concentration_npq, osm_percent_normalized_value, pdcd1_concentration_npq,
pdcd1_percent_normalized_value, pdgfa_concentration_npq, pdgfa_percent_normalized_value,
ptx3_concentration_npq, ptx3_percent_normalized_value, s100a12_concentration_npq,
s100a12_percent_normalized_value, s100a9_concentration_npq, s100a9_percent_normalized_value,
scg2_concentration_npq, scg2_percent_normalized_value, sele_concentration_npq,
sele_percent_normalized_value, slurp1_concentration_npq, slurp1_percent_normalized_value,
spp1_concentration_npq, spp1_percent_normalized_value, tafa5_concentration_npq,
tafa5_percent_normalized_value, tgfb1_concentration_npq, tgfb1_percent_normalized_value,
tgfb3_concentration_npq, tgfb3_percent_normalized_value, thpo_concentration_npq,
thpo_percent_normalized_value, timp1_concentration_npq, timp1_percent_normalized_value,
timp2_concentration_npq, timp2_percent_normalized_value, tlr3_concentration_npq,
tlr3_percent_normalized_value, tnf_concentration_npq, tnf_percent_normalized_value,
tnfrsf11a_concentration_npq, tnfrsf11a_percent_normalized_value, tnfrsf13c_concentration_npq,
tnfrsf13c_percent_normalized_value, tnfrsf14_concentration_npq, tnfrsf14_percent_normalized_value,
tnfrsf17_concentration_npq, tnfrsf17_percent_normalized_value, tnfrsf18_concentration_npq,
tnfrsf18_percent_normalized_value, tnfrsf1a_concentration_npq, tnfrsf1a_percent_normalized_value,
tnfrsf1b_concentration_npq, tnfrsf1b_percent_normalized_value, tnfrsf4_concentration_npq,
tnfrsf4_percent_normalized_value, tnfrsf8_concentration_npq, tnfrsf8_percent_normalized_value,
tnfrsf9_concentration_npq, tnfrsf9_percent_normalized_value, tnfsf10_concentration_npq,
tnfsf10_percent_normalized_value, tnfsf11_concentration_npq, tnfsf11_percent_normalized_value,
tnfsf12_concentration_npq, tnfsf12_percent_normalized_value, tnfsf13b_concentration_npq,
tnfsf13b_percent_normalized_value, tnfsf15_concentration_npq, tnfsf15_percent_normalized_value,
tnfsf4_concentration_npq, tnfsf4_percent_normalized_value, tnfsf8_concentration_npq,
tnfsf8_percent_normalized_value, tnfsf9_concentration_npq, tnfsf9_percent_normalized_value,
trem1_concentration_npq, trem1_percent_normalized_value, tslp_concentration_npq,
tslp_percent_normalized_value, vcam1_concentration_npq, vcam1_percent_normalized_value,
vegfa_concentration_npq, vegfa_percent_normalized_value, vegfc_concentration_npq,
vegfc_percent_normalized_value, vegfd_concentration_npq, vegfd_percent_normalized_value,
vsnl1_concentration_npq, vsnl1_percent_normalized_value, vstm1_concentration_npq,
vstm1_percent_normalized_value, wnt16_concentration_npq, wnt16_percent_normalized_value,
wnt7a_concentration_npq, wnt7a_percent_normalized_value
```

</details>

### 7.5 LSDS-7_Complete_Blood_Count_CBC_TRANSFORMED.csv

- Rows (excluding header): 28
- Columns: 61 (1 identifier + 60 measurement/reference columns)
- Identifier column: `Sample Name` (text)
- Wide format, one row per sample
- Missing cells: 21 `<blank>`
- Malformed rows (field-count mismatch): 0
- Duplicate identifiers: 0

Column groups:

- 20 × `*_value*` columns (measured value)
- 20 × `*_range_min*` columns (laboratory reference range lower bound)
- 20 × `*_range_max*` columns (laboratory reference range upper bound)

Units are encoded in the column names only. No separate unit column exists
in any of these files.

<details><summary>Exact column names (61)</summary>

```
Sample Name, absolute_basophils_value_cells_per_microliter,
absolute_basophils_range_min_cells_per_microliter,
absolute_basophils_range_max_cells_per_microliter, absolute_eosinophils_value_cells_per_microliter,
absolute_eosinophils_range_min_cells_per_microliter,
absolute_eosinophils_range_max_cells_per_microliter,
absolute_lymphocytes_value_cells_per_microliter,
absolute_lymphocytes_range_min_cells_per_microliter,
absolute_lymphocytes_range_max_cells_per_microliter, absolute_monocytes_value_cells_per_microliter,
absolute_monocytes_range_min_cells_per_microliter,
absolute_monocytes_range_max_cells_per_microliter, absolute_neutrophils_value_cells_per_microliter,
absolute_neutrophils_range_min_cells_per_microliter,
absolute_neutrophils_range_max_cells_per_microliter, basophils_value_percent,
basophils_range_min_percent, basophils_range_max_percent, eosinophils_value_percent,
eosinophils_range_min_percent, eosinophils_range_max_percent, hematocrit_value_percent,
hematocrit_range_min_percent, hematocrit_range_max_percent, hemoglobin_value_percent,
hemoglobin_range_min_percent, hemoglobin_range_max_percent, lymphocytes_value_percent,
lymphocytes_range_min_percent, lymphocytes_range_max_percent, mch_value_picogram,
mch_range_min_picogram, mch_range_max_picogram, mchc_value_grams_per_deciliter,
mchc_range_min_grams_per_deciliter, mchc_range_max_grams_per_deciliter, mcv_value_femtoliter,
mcv_range_min_femtoliter, mcv_range_max_femtoliter, monocytes_value_percent,
monocytes_range_min_percent, monocytes_range_max_percent, mpv_value_femtoliter,
mpv_range_min_femtoliter, mpv_range_max_femtoliter, neutrophils_value_percent,
neutrophils_range_min_percent, neutrophils_range_max_percent,
platelet_count_value_thousand_per_microliter, platelet_count_range_min_thousand_per_microliter,
platelet_count_range_max_thousand_per_microliter, rdw_value_percent, rdw_range_min_percent,
rdw_range_max_percent, red_blood_cell_count_value_million_per_microliter,
red_blood_cell_count_range_min_million_per_microliter,
red_blood_cell_count_range_max_million_per_microliter,
white_blood_cell_count_value_thousand_per_microliter,
white_blood_cell_count_range_min_thousand_per_microliter,
white_blood_cell_count_range_max_thousand_per_microliter
```

</details>

### 7.6 Column-name unit vocabulary

| Token | Meaning as written |
|---|---|
| `_milligram_per_deciliter` | mg/dL |
| `_gram_per_deciliter` | g/dL |
| `_units_per_liter` | U/L |
| `_millimol_per_liter` | mmol/L (spelling as in the file) |
| `_milliliter_per_minute_per_1.73_meter_squared` | mL/min/1.73 m² |
| `_picogram_per_milliliter` | pg/mL |
| `_nanogram_per_milliliter` | ng/mL |
| `_cells_per_microliter` | cells/µL |
| `_thousand_per_microliter` | ×10³/µL |
| `_million_per_microliter` | ×10⁶/µL |
| `_femtoliter` | fL |
| `_picogram` | pg |
| `_percent` | percent (as labelled; see caveat) |
| `_npq` | NPQ (as labelled; Alamar relative units) |

Two columns carry no unit token: `albumin_to_globulin_ratio_value` and
`bun_to_creatinine_ratio_value` — both are ratios.

`hemoglobin_value_percent` is written as *percent* in the source header. It is
reported here exactly as written; no unit correction has been applied.

## 8. Sample structure and timepoints

**LSDS-8_Comprehensive_Metabolic_Panel_CMP_TRANSFORMED.csv** — 28 samples, 4 participants (C001, C002, C003, C004).

| Participant | Samples |
|---|---|
| C001 | 7 |
| C002 | 7 |
| C003 | 7 |
| C004 | 7 |

Timepoints present: L-3, L-44, L-92, R+1, R+194, R+45, R+82.

**LSDS-8_Multiplex_serum_immune_EvePanel_TRANSFORMED.csv** — 28 samples, 4 participants (C001, C002, C003, C004).

| Participant | Samples |
|---|---|
| C001 | 7 |
| C002 | 7 |
| C003 | 7 |
| C004 | 7 |

Timepoints present: L-3, L-44, L-92, R+1, R+194, R+45, R+82.

**LSDS-8_Multiplex_serum_cardiovascular_EvePanel_TRANSFORMED.csv** — 28 samples, 4 participants (C001, C002, C003, C004).

| Participant | Samples |
|---|---|
| C001 | 7 |
| C002 | 7 |
| C003 | 7 |
| C004 | 7 |

Timepoints present: L-3, L-44, L-92, R+1, R+194, R+45, R+82.

**LSDS-8_Multiplex_serum.immune.AlamarPanel_TRANSFORMED.csv** — 27 samples, 4 participants (C001, C002, C003, C004).

| Participant | Samples |
|---|---|
| C001 | 7 |
| C002 | 7 |
| C003 | 6 |
| C004 | 7 |

Timepoints present: L-3, L-44, L-92, R+1, R+194, R+45, R+82.

**LSDS-7_Complete_Blood_Count_CBC_TRANSFORMED.csv** — 28 samples, 4 participants (C001, C002, C003, C004).

| Participant | Samples |
|---|---|
| C001 | 7 |
| C002 | 7 |
| C003 | 7 |
| C004 | 7 |

Timepoints present: L-3, L-44, L-92, R+1, R+194, R+45, R+82.

Timepoint vocabulary in the ISA metadata is explicit:

| Label | ISA `Factor Value[Time]` |
|---|---|
| L-92 | Launch minus 92 |
| L-44 | Launch minus 44 |
| L-3 | Launch minus 3 |
| R+1 | Return plus 1 |
| R+45 | Return plus 45 |
| R+82 | Return plus 82 |
| R+194 | Return plus 194 |

**There is no in-flight timepoint.** The ISA `Factor Value[Spaceflight]`
values are only `Pre-flight` and `Post-flight` (12 and 16 samples respectively
in OSD-575). No serum or whole-blood measurement exists during the ~3-day
mission in these datasets.

## 9. Data quality findings

1. **Three different missing-value encodings.** The CMP file uses the literal
   strings `NA` (22 cells) and `N/A` (56 cells) as well as empty cells (3).
   The CBC file uses empty cells only (21). None of these semantics is
   documented in the files. Any loader must treat all three as missing and
   must never treat them as zero.
2. **Two CMP columns contain only `N/A`.**
   `egfr_african_american_range_max_milliliter_per_minute_per_1.73_meter_squared`
   and its non-African-American counterpart are `N/A` in all 28 rows. They are
   reference-range columns, not measurements, and carry no usable information.
3. **`bun_to_creatinine_ratio_value` is missing in 22 of 28 samples** (21 `NA`
   plus 1 empty cell), so this ratio cannot support a per-participant
   longitudinal comparison.
4. **CBC missingness is sparse and structured**: MCHC is missing for C002 at
   L-3, L-44, L-92 and R+1; MCV for C002 at R+194; MCH for C003 and C004 at
   L-92. 21 empty cells in total, always in value/range triplets.
5. **The Alamar panel has 27 samples, not 28.** Participant C003 has no L-44
   sample in this assay. Every other file has a complete 4 × 7 grid.
6. **`R+194` is present in the data but absent from the OSD-575 study
   description**, which lists only `R+1`, `R+45`, `R+82`. The ISA sample table
   and the transformed files both include `R+194`. The discrepancy is recorded,
   not resolved.
7. **Inconsistent range-column naming in the CMP file.** ALT and AST follow
   `alt_max_units_per_liter` / `ast_max_units_per_liter` instead of the
   `*_range_max_*` pattern used by the other 17 analytes. A parser keyed on
   `_range_max` will silently miss two columns.
8. No duplicate sample identifiers, no malformed rows, and no negative values
   in any file. Exact zeros occur (112 numeric cells in the CBC, 8 in the
   Alamar panel), which is plausible for cell counts and normalized signals;
   zero has not been treated as a sentinel.
9. **`percent` columns are not documented.** The Eve and Alamar files contain
   a second, normalized value per analyte. Neither the CSV nor the ISA metadata
   defines the transformation behind `_percent` / `_percent_normalized_value`.
   They are therefore reported as vendor-derived values of unknown formula.
10. **Reference ranges are vendor values.** Every CMP and CBC analyte carries
    `range_min` / `range_max`. These are laboratory reference intervals of
    unknown population and are not clinical decision limits for astronauts.

## 10. Cross-dataset compatibility

| Question | Finding |
|---|---|
| Shared participant identifiers? | Yes. Both studies use `C001`–`C004`. |
| Shared sample identifiers? | **No.** OSD-575 samples are `C00X_serum_<timepoint>`; OSD-569 CBC samples are `C00X_whole-blood_<timepoint>_cbc`. Different specimen, different ID string. |
| Shared timepoint vocabulary? | Yes. Both use `L-92`, `L-44`, `L-3`, `R+1`, `R+45`, `R+82`, `R+194`. |
| Direct row-level join possible? | **No.** Any linkage must be on `(participant, timepoint)` after parsing, and that is an analytic key, not a verified sample identity. |
| Participant identity across studies verified? | **Not independently.** The shared `C001`–`C004` tokens and the shared mission/DOI lineage are consistent with the same four crew members, but the audit did not attempt re-identification. |

A defensive join key would be a derived triple `(study, participant, timepoint)`
built at read time, never persisted as though it were a source identifier.

### 10.1 Last preflight sample

`L-3` (Launch minus 3) is the last preflight collection and is present for all
four participants in all five measurement files, including C003 in the Alamar
panel (where `L-44` is the missing one). `L-3` is therefore the only defensible
"last preflight" anchor, and this is supported by the metadata rather than
assumed.

### 10.2 Within-person preflight-to-postflight comparison

Possible for every analyte, descriptively, as four independent within-person
trajectories (`L-3` against `R+1`, `R+45`, `R+82`, `R+194`). Not possible for:

- any in-flight state — no in-flight sample exists;
- any population-level claim — n = 4, no control group;
- any causal claim about spaceflight — no randomisation, no counterfactual;
- the `bun_to_creatinine_ratio_value` analyte — missing in 22 of 28 samples;
- C003 in the Alamar panel at `L-44` — no sample.

## 11. Permitted descriptive analyses

- Per-analyte, per-participant line or dot plots across the seven labelled
  timepoints.
- Within-person descriptive differences between two named timepoints, with the
  participant count stated next to every figure.
- Missingness and sample-coverage displays.
- Ordering statements about an individual's own values at named timepoints.
- Explicit provenance labelling: official NASA OSDR data, transformed file,
  study DOI, retrieval date, checksum.

## 12. Claims that are not supported

- Any diagnosis, clinical interpretation, or medical risk estimate.
- Any inference of fatigue, stress, sleep, mood, or cognitive state from a
  biomarker.
- Any causal statement that spaceflight produced an observed change.
- Any population, demographic, or generalisable crew statement from n = 4.
- Any "readiness", "fitness", or composite health score.
- Any classification against the bundled reference ranges.
- Any claim of in-flight or real-time monitoring.
- Any claim that these markers concord with the LIMEN visuomotor task, since no
  paired dataset exists.
- Any interpolation between timepoints, or imputation of missing values.

## 13. Access limitations

- Only **transformed** tabular files were retrieved. The vendor **submitted**
  files exist in the record and were not inspected, so differences between the
  submitted and transformed representations are unverified.
- Raw sequencing, WGS, m6A and multiQC assets were not downloaded. They are
  large and irrelevant to a tabular demonstration.
- No in-flight measurement exists in either study.
- Four participants, seven ground timepoints, no control arm.
- The OSDR policy pages attempted (`/bio/about/data-policy`,
  `/bio/about/policies`) returned 404. Licence was therefore taken from the
  DOI registration, which is the authoritative record for the dataset.

## 14. Redistribution decision

- Licence: **CC0 1.0**, per the DataCite registration of both DOIs.
- Total acquired size: **402,241 bytes (393 KiB)** — five CSVs plus two metadata ZIPs.
- Redistribution is permitted and the volume is trivial, so these files **may**
  be committed to the public submission repository.
- Attribution and source metadata are retained in this document regardless of
  the CC0 waiver.
- No restricted, personal, or raw sequencing data is present.
- No `.gitignore` change is required for this dataset. Nothing under `data/`
  was blanket-ignored.

This stage did **not** commit the files. The decision above is a
recommendation for review.

## 15. Recommended minimal subset for the browser demonstration

If a demonstration surface is built later, the smallest defensible set is:

1. **CBC** (`LSDS-7_Complete_Blood_Count_CBC_TRANSFORMED.csv`, 9 KB) — 20
   analytes, complete 4 × 7 grid, familiar haematology names.
2. **CMP** (`LSDS-8_Comprehensive_Metabolic_Panel_CMP_TRANSFORMED.csv`, 8.5 KB)
   — 19 analytes, complete grid, one honest missing-data example.
3. One multiplex panel, either **cardiovascular** (6 KB, 9 analytes) or
   **immune HD71** (41 KB, 71 analytes). The cardiovascular panel is the
   smaller and simpler choice.

The Alamar file (142 KB, 203 analytes) is the largest and least documented and
is not needed for a demonstration.

Any browser surface must label these as **official NASA OSDR data**, name the
study DOI, and state that the values are four-person, ground-only,
pre/post-flight measurements.

## 16. Citation

> NASA Open Science Data Repository (OSDR). *SpaceX Inspiration4 Blood Serum
> Metabolic Panel and Immune/Cardiac Cytokine Arrays (Comprehensive Metabolic
> Panel and Multiplex)*. OSD-575. DOI: 10.26030/mc5d-p710.
> https://osdr.nasa.gov/bio/repo/data/studies/OSD-575

> NASA Open Science Data Repository (OSDR). *Whole Blood Measurements from the
> SpaceX Inspiration4 Mission (RNA-seq, epitranscriptome, WGS, clonal
> hematopoiesis, CBC)*. OSD-569. DOI: 10.26030/e0rx-sh52.
> https://osdr.nasa.gov/bio/repo/data/studies/OSD-569

Data licence: CC0 1.0 Universal. Retrieved 2026-11-14.

## 17. Reproduction

```bash
# File inventory
curl -sS 'https://osdr.nasa.gov/osdr/data/osd/files/575'
curl -sS 'https://osdr.nasa.gov/osdr/data/osd/files/569'

# Download (one file shown; repeat per filename from the inventory)
curl -L -o data/raw/osdr/OSD-575/LSDS-8_Comprehensive_Metabolic_Panel_CMP_TRANSFORMED.csv \
  'https://osdr.nasa.gov/geode-py/ws/studies/OSD-575/download?source=datamanager&file=LSDS-8_Comprehensive_Metabolic_Panel_CMP_TRANSFORMED.csv'

# Verify
shasum -a 256 data/raw/osdr/OSD-575/*.csv data/raw/osdr/OSD-569/*.csv
```

## 18. Files created by this stage

| Path | Purpose |
|---|---|
| `data/raw/osdr/OSD-575/` (5 files) | Transformed CSVs and ISA metadata ZIP for OSD-575 |
| `data/raw/osdr/OSD-569/` (2 files) | Transformed CBC CSV and ISA metadata ZIP for OSD-569 |
| `docs/NASA_DATA_AUDIT.md` | This document |

No application source, test, configuration, or existing documentation file was
modified.

---

## Amendments — Stage 3 implementation verification (2026-11-14)

**Amendment label:** all statements below were added during Stage 3 after implementing
and testing the typed data layer. They record *verified implementation findings only*.
Every conclusion in sections 1–18 above is preserved unchanged; where a note below
refines a count or a naming detail, it is a refinement of the measurement, not a
reversal.

### A. Column classification is complete

The closed header patterns used by `src/lib/osdr/columns.ts` classify **every**
measurement column in the three selected files, with zero `unexpected-column` findings:

| Dataset | Measurement columns | Classified | Unexpected |
|---|---|---|---|
| CMP | 57 | 57 | 0 |
| Cardiovascular | 18 | 18 | 0 |
| CBC | 60 | 60 | 0 |

### B. The `_max_` alias is confirmed by position and value

`alt_max_units_per_liter` and `ast_max_units_per_liter` are the only two headers that
break the `*_range_max_*` shape. Their values are constant across all 28 CMP rows:

- ALT upper bound: `46` (range `9`–`46` U/L)
- AST upper bound: `40` (range `10`–`40` U/L)

They are therefore classified as `range-max` via an explicit alias. No other header
requires an alias, and an unknown suffix is an `ambiguous-unit` error rather than a
guess.

### C. `gram_per_deciliter` and `grams_per_deciliter` are distinct source tokens

The CMP file writes `_gram_per_deciliter`; the CBC file writes `_grams_per_deciliter`.
Both are accepted, but they are **not** normalised into a single token. The typed model
stores whichever spelling the source header used, so the inconsistency remains visible
to any consumer.

### D. Record-level missingness counts

Section 9 counts *cells*; the implementation counts *emitted measurement records*. Both
are consistent:

- **CMP** — 532 measurement records, of which 23 carry a missing token:
  - 22 `NA` — 21 in `bun_to_creatinine_ratio_value`, 1 in
    `total_bilirubin_value_milligram_per_deciliter`;
  - 1 `empty` — `C002_serum_R+82` `bun_to_creatinine_ratio`, whose `range_min` and
    `range_max` are also blank (so `referenceRange.min` and `.max` are both `null`).
  - The 56 `N/A` cells do **not** create measurement records; they belong to the two
    `egfr_*_range_max_*` reference columns and surface as `referenceRange.max === null`
    on 28 records each (56 total).
- **CBC** — 560 measurement records, of which 7 carry `empty`, matching the 21 blank
  cells because value, `range_min` and `range_max` are blank together:
  - `mchc` for C002 at L-92, L-44, L-3, R+1;
  - `mcv` for C002 at R+194;
  - `mch` for C003 and C004 at L-92.
- **Cardiovascular** — 504 measurement records, no missing values.

### E. `R+194` produces a warning, not an error

`R+194` is observed in both OSD-575 files and absent from the OSD-575 description. The
builder emits exactly one `timepoint-not-documented` warning per OSD-575 dataset, keeps
`errorCount` at 0, and still publishes the dataset. The CBC dataset documents `R+194`,
so it emits no such warning. The discrepancy remains recorded, not resolved.

### F. Emitted measurement counts

Because the model is long-format and emits only measurable columns (not `range_min` /
`range_max`), the published counts differ from raw column counts:

| Dataset | Samples | Emitted columns per sample | Measurement records |
|---|---|---|---|
| CMP | 28 | 19 | 532 |
| Cardiovascular | 28 | 18 | 504 |
| CBC | 28 | 20 | 560 |

The cardiovascular panel emits both `concentration` and `percent` per analyte
(2 × 9 = 18).

### G. Vendor `percent` fields are preserved without interpretation

The cardiovascular panel's 9 `_percent` columns are stored as
`kind: "vendor-normalized-value"` with `unit: null`, `unitSource: null`, and
`referenceRange: null`. No formula or baseline is inferred.

### H. Determinism and checksum agreement

- Rebuilding the same source bytes produces byte-identical JSON (asserted by test).
- A fresh in-memory rebuild matches the committed processed files (asserted by test).
- The SHA-256 values in `manifest.json` equal the values recorded in section 4 above.

### I. Verification commands

```bash
npm run data:build                  # regenerate data/processed/osdr/
npm test                            # 150 tests, includes both OSDR suites
npx tsc --noEmit -p tsconfig.json   # typecheck
npm run lint                        # lint
```

At the time of this amendment all four pass.


