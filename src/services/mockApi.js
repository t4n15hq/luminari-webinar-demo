// Mock API responses
const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));

const generateMockProtocol = (diseaseData) => {
  const { disease_name, additional_parameters } = diseaseData;
  const population = additional_parameters.population || "general adult population";
  const duration = additional_parameters.treatment_duration || "12 weeks";
  
  return {
    protocol_id: "prot-" + Math.random().toString(36).substring(2, 10),
    protocol: `# CLINICAL STUDY PROTOCOL

## Protocol Title
A Phase 2, Randomized, Double-Blind, Placebo-Controlled Study to Evaluate the Efficacy and Safety of Drug-XYZ in Patients with ${disease_name}

## Protocol Synopsis
**Disease:** ${disease_name}
**Population:** ${population} 
**Treatment Duration:** ${duration}
**Primary Objective:** To evaluate the efficacy of Drug-XYZ compared to placebo in reducing the severity and extent of ${disease_name} lesions.

## 1. INTRODUCTION
### 1.1 Background
${disease_name} is a chronic inflammatory skin condition characterized by [disease characteristics]. Current treatment options include topical corticosteroids, phototherapy, and systemic immunosuppressants, but many patients experience inadequate disease control or treatment-related adverse events.

### 1.2 Investigational Drug
Drug-XYZ is a novel [drug class] that targets [mechanism of action], which has demonstrated promising results in preclinical studies and early clinical trials for inflammatory skin conditions.

## 2. STUDY OBJECTIVES
### 2.1 Primary Objective
- To evaluate the efficacy of Drug-XYZ compared to placebo in reducing ${disease_name} severity as measured by [appropriate disease scale] at Week 12.

### 2.2 Secondary Objectives
- To assess the safety and tolerability of Drug-XYZ
- To evaluate improvement in quality of life measures
- To determine the proportion of patients achieving clear or almost clear skin
- To assess time to clinical response

## 3. STUDY DESIGN
Randomized, double-blind, placebo-controlled, parallel-group study. Approximately 120 patients with moderate-to-severe ${disease_name} will be randomized 1:1 to receive either Drug-XYZ or placebo for ${duration}.

## 4. STUDY POPULATION
### 4.1 Inclusion Criteria
1. Male or female patients, aged 18-75 years
2. Diagnosis of ${disease_name} for at least 6 months
3. Moderate-to-severe disease as defined by [appropriate disease criteria]
4. Inadequate response to at least one standard systemic therapy
5. Willing and able to provide informed consent

### 4.2 Exclusion Criteria
1. Known hypersensitivity to Drug-XYZ or any of its components
2. Active skin infection or other dermatological condition that may interfere with assessments
3. Use of prohibited medications within specified washout periods
4. Significant medical conditions that may compromise patient safety
5. Pregnant or breastfeeding women`
  };
};

const generateMockIndModules = (diseaseData) => {
  const { disease_name, additional_parameters } = diseaseData;
  const drugClass = additional_parameters.drug_class || "small molecule inhibitor";
  
  return {
    cmc_section: `# CHEMISTRY, MANUFACTURING, AND CONTROLS (CMC) SECTION

## 1. DRUG SUBSTANCE
### 1.1 Nomenclature
- Chemical Name: [Chemical name]
- Code Name: Drug-XYZ
- CAS Registry Number: [CAS number]

### 1.2 Structure
Drug-XYZ is a ${drugClass} with molecular formula [formula] and molecular weight [weight] Da.

### 1.3 Physicochemical Properties
- Physical Description: White to off-white crystalline powder
- Solubility: [Solubility properties]
- pKa: [pKa value]
- Hygroscopicity: [Hygroscopicity description]

### 1.4 Manufacture
The drug substance is manufactured in compliance with current Good Manufacturing Practice (cGMP) regulations. The synthetic route consists of [number] steps starting from [starting material].

### 1.5 Specifications
- Appearance: White to off-white powder
- Identification: By IR spectroscopy and HPLC retention time
- Assay: 98.0-102.0% (HPLC)
- Impurities: Individual unknown impurity NMT 0.15%, Total impurities NMT 0.5%
- Residual Solvents: [Specifications]
- Heavy Metals: NMT 10 ppm

## 2. DRUG PRODUCT
### 2.1 Composition
The drug product for the treatment of ${disease_name} is formulated as [dosage form] containing [strength] of Drug-XYZ and the following excipients:
- [Excipient 1]
- [Excipient 2]
- [Excipient 3]
- [Excipient 4]

### 2.2 Manufacture
The manufacturing process for the drug product consists of the following operations:
1. [Manufacturing step 1]
2. [Manufacturing step 2]
3. [Manufacturing step 3]
4. Primary packaging in [packaging material]

### 2.3 Specifications
- Appearance: [Description]
- Identification: By HPLC retention time
- Assay: 95.0-105.0% of labeled content
- Content Uniformity: Meets USP <905>
- Dissolution: NLT 80% in 30 minutes
- Degradation Products: [Specifications]
- Microbial Limits: Meets USP <61> and <62>

### 2.4 Stability
Stability studies have been initiated according to ICH guidelines under the following conditions:
- Long-term: 25°C ± 2°C/60% RH ± 5% RH
- Intermediate: 30°C ± 2°C/65% RH ± 5% RH
- Accelerated: 40°C ± 2°C/75% RH ± 5% RH

Based on available stability data, a provisional shelf life of 24 months is proposed when stored at controlled room temperature.

## 3. PLACEBO
The placebo formulation is identical to the drug product in appearance and composition except for the active ingredient, which is replaced with [placebo material].

## 4. ENVIRONMENTAL ASSESSMENT
The quantities of Drug-XYZ to be used in clinical trials are not expected to result in significant environmental exposure. A request for categorical exclusion is being submitted in accordance with 21 CFR 25.31(a).`,

    clinical_section: `# CLINICAL PHARMACOLOGY SECTION

## 1. OVERVIEW OF CLINICAL PHARMACOLOGY
Drug-XYZ is a ${drugClass} being developed for the treatment of ${disease_name}. It acts by [mechanism of action], which leads to reduction in [disease parameters] and improvement in disease symptoms.

## 2. MECHANISM OF ACTION
Drug-XYZ selectively [mechanism details] resulting in inhibition of [pathway] signaling. This leads to decreased production of pro-inflammatory cytokines including [cytokines] that are implicated in the pathogenesis of ${disease_name}.

## 3. PHARMACOKINETICS

### 3.1 Absorption
Following topical administration to patients with ${disease_name}, Drug-XYZ demonstrates [absorption characteristics]. The absolute bioavailability is approximately [percentage]%. Maximum plasma concentrations (Cmax) are reached within [time] hours post-dose.

### 3.2 Distribution
The mean apparent volume of distribution (Vd/F) is approximately [volume] L, indicating [distribution characteristics]. Plasma protein binding is [percentage]%, primarily to [protein].

### 3.3 Metabolism
Drug-XYZ is primarily metabolized by CYP3A4 with minor contributions from CYP2C9. The main metabolic pathways include [metabolic processes]. The primary metabolite, M1, retains [percentage]% of the pharmacological activity of the parent compound.

### 3.4 Excretion
Drug-XYZ is primarily eliminated via [route] with an elimination half-life of approximately [time] hours. Approximately [percentage]% of the dose is recovered in urine as unchanged drug and metabolites, with the remainder eliminated in feces.

## 4. PHARMACODYNAMICS

### 4.1 Primary PD Effects
In preclinical models and early clinical studies, Drug-XYZ demonstrated dose-dependent inhibition of [markers]. Clinical biomarker studies have shown reductions in [biomarkers] that correlate with clinical improvement in ${disease_name}.

### 4.2 Secondary PD Effects
Beyond its primary effects, Drug-XYZ has demonstrated [additional effects] which may contribute to its therapeutic benefit in ${disease_name}.

### 4.3 Biomarkers
The following biomarkers have been identified as potentially useful for monitoring drug activity and predicting response:
- [Biomarker 1]
- [Biomarker 2]
- [Biomarker 3]

## 5. DOSE SELECTION RATIONALE
The proposed dose of [dose] was selected based on:
1. Results from Phase 1 dose-ranging studies showing optimal PK/PD relationships
2. Efficacy data from the proof-of-concept study in ${disease_name}
3. Safety profile observed across the clinical program
4. Model-based predictions of target engagement exceeding 80% at the proposed dose

This dose is expected to provide optimal efficacy while maintaining an acceptable safety profile.

## 6. DRUG-DRUG INTERACTION POTENTIAL
### 6.1 Effect of Other Drugs on Drug-XYZ
As Drug-XYZ is primarily metabolized by CYP3A4, strong inhibitors (e.g., ketoconazole, ritonavir) may increase Drug-XYZ exposure. Co-administration with strong CYP3A4 inducers (e.g., rifampin, carbamazepine) may decrease Drug-XYZ exposure.

### 6.2 Effect of Drug-XYZ on Other Drugs
Based on in vitro studies, Drug-XYZ is not expected to inhibit or induce major CYP enzymes or transporters at clinically relevant concentrations.

## 7. SPECIAL POPULATIONS CONSIDERATIONS

### 7.1 Pediatric
The pharmacokinetics of Drug-XYZ have not been evaluated in pediatric patients. Pediatric studies are planned but will commence after safety and efficacy are established in adults.

### 7.2 Geriatric
Preliminary data from Phase 1 studies suggest no clinically significant differences in pharmacokinetics between elderly (≥65 years) and younger adult patients.

### 7.3 Hepatic/Renal Impairment
Dedicated studies in patients with hepatic or renal impairment are planned. Based on the metabolic and elimination pathways, dose adjustments may be required in patients with moderate to severe hepatic impairment.

## 8. QT PROLONGATION ASSESSMENT
A thorough QT study was conducted in healthy volunteers at doses up to [dose] (2 times the therapeutic dose). No significant QTc prolongation was observed at any dose level. The upper bound of the 90% confidence interval for ΔΔQTcF was less than 10 ms at all time points.`
  };
};

const mockApiService = {
  generateProtocol: async (diseaseData) => {
    // Simulate network delay
    await delay(2000);
    return generateMockProtocol(diseaseData);
  },
  
  generateIndModule: async (diseaseData) => {
    // Simulate network delay
    await delay(3000);
    return generateMockIndModules(diseaseData);
  },
  
  queryAssistant: async (queryData) => {
    // Simulate network delay
    await delay(1500);
    
    const { question, disease_context } = queryData;
    const diseaseContext = disease_context || "dermatological conditions";
    
    return {
      answer: `Based on current clinical practice guidelines and regulatory expectations for ${diseaseContext}, I can provide the following guidance:

${question}

When designing clinical studies for ${diseaseContext}, it's important to consider:

1. Appropriate validated outcome measures such as PASI, EASI, or IGA scales depending on the specific condition
2. Patient-reported outcomes to capture quality of life impacts
3. Safety monitoring appropriate for the mechanism of action
4. Study duration sufficient to demonstrate both efficacy and maintenance of effect
5. Inclusion/exclusion criteria that define a well-characterized patient population

The most recent FDA and EMA guidance documents recommend [specific recommendation relevant to question].`
    };
  },
  
  listProtocols: async () => {
    // Simulate network delay
    await delay(800);
    
    return [
      {
        protocol_id: "prot-abc123",
        disease_name: "Psoriasis",
        generation_date: "2025-02-15T14:22:33Z",
        protocol_type: "Phase 2"
      },
      {
        protocol_id: "prot-def456",
        disease_name: "Atopic Dermatitis",
        generation_date: "2025-02-10T09:15:22Z",
        protocol_type: "Phase 2"
      }
    ];
  }
};

export default mockApiService;