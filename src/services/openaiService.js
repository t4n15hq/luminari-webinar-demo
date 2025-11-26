// src/services/openaiService.js - CORRECTED AND COMPLETE

import axios from 'axios';

const OPENAI_API_KEY = process.env.REACT_APP_OPENAI_API_KEY;

// Check if API key is available
if (!OPENAI_API_KEY) {
  console.warn('OpenAI API key not found. AI features will not work. Please set REACT_APP_OPENAI_API_KEY environment variable.');
}


// Enhanced OpenAI Configuration for Optimal Content Generation
const OPENAI_CONFIG = {
  // For regulatory documents - FIXED VERSION
  COMPREHENSIVE: {
    model: "gpt-4o",
    max_tokens: 4096,         // Increased for proper regulatory content
    temperature: 0.3,         
    presence_penalty: 0.1,    
    frequency_penalty: 0.3,   // Reduced to allow proper content generation
    stream: false,            
    top_p: 0.9,              
    stop: ["générations", "français"]  // Only stop language switching
  },
  
  // For shorter, more precise content
  PRECISE: {
    model: "gpt-4o",
    max_tokens: 4096,
    temperature: 0.3,         // Lower for precision
    presence_penalty: 0.05,
    frequency_penalty: 0.1,   // Light frequency penalty
    stream: false,
    top_p: 0.8
  },
  
  // For analysis and evaluation tasks
  ANALYTICAL: {
    model: "gpt-4o",
    max_tokens: 4096,
    temperature: 0.2,         // Very controlled for analysis
    presence_penalty: 0,
    frequency_penalty: 0.05,  // Minimal to avoid affecting technical terms
    stream: false,
    top_p: 0.85
  },

  // Specialized configuration for regulatory documents - FIXED
  REGULATORY: {
    model: "gpt-4o",
    max_tokens: 3500,         // SAFE limit to prevent runaway generation
    temperature: 0.2,         // LOW for professional consistency
    presence_penalty: 0.1,    // Reduced 
    frequency_penalty: 0.9,   // HIGH to prevent repetition loops
    stream: false,
    stop: ["---END---", "\n\n\n\n", "générations", "français", "STOP GENERATION", "SECTION END"],
    top_p: 0.9
  }
};

// Document type requirements and standards
const DOCUMENT_REQUIREMENTS = {
  protocol: { 
    minWords: 8000, 
    sections: 10,
    config: 'COMPREHENSIVE',
    type: 'Clinical Protocol'
  },
  ind: { 
    minWords: 4000, 
    sections: 12,
    config: 'REGULATORY',
    type: 'IND Application'
  },
  nda: { 
    minWords: 10000, 
    sections: 8,
    config: 'REGULATORY',
    type: 'NDA Submission'
  },
  bla: { 
    minWords: 10000, 
    sections: 8,
    config: 'REGULATORY',
    type: 'BLA Submission'
  },
  cta: { 
    minWords: 8000, 
    sections: 7,
    config: 'REGULATORY',
    type: 'CTA Application'
  },
  maa: { 
    minWords: 9000, 
    sections: 8,
    config: 'REGULATORY',
    type: 'MAA Application'
  },
  impd: { 
    minWords: 7000, 
    sections: 7,
    config: 'COMPREHENSIVE',
    type: 'IMPD Document'
  },
  // Large country-specific documents that benefit from section-based generation
  nds: { 
    minWords: 8000, 
    sections: 8,
    config: 'REGULATORY',
    type: 'Canadian NDS'
  },
  jnda: { 
    minWords: 9000, 
    sections: 8,
    config: 'REGULATORY',
    type: 'Japanese NDA'
  },
  nda_ch: { 
    minWords: 8000, 
    sections: 7,
    config: 'REGULATORY',
    type: 'Chinese NDA'
  },
  nda_kr: { 
    minWords: 7000, 
    sections: 6,
    config: 'REGULATORY',
    type: 'Korean NDA'
  },
  ma_uk: { 
    minWords: 8000, 
    sections: 7,
    config: 'REGULATORY',
    type: 'UK Marketing Authorization'
  },
  ma_ch: { 
    minWords: 7000, 
    sections: 6,
    config: 'REGULATORY',
    type: 'Swiss Marketing Authorization'
  },
  aus: { 
    minWords: 7000, 
    sections: 6,
    config: 'REGULATORY',
    type: 'Australian TGA Submission'
  },
  // Additional country-specific documents for section-based generation
  cta_uk: { 
    minWords: 7000, 
    sections: 7,
    config: 'REGULATORY',
    type: 'UK Clinical Trial Authorization'
  },
  cta_ca: { 
    minWords: 6000, 
    sections: 6,
    config: 'REGULATORY',
    type: 'Canadian Clinical Trial Application'
  },
  cta_ru: { 
    minWords: 6000, 
    sections: 6,
    config: 'REGULATORY',
    type: 'Russian Clinical Trial Permit'
  },
  ind_ch: { 
    minWords: 6000, 
    sections: 6,
    config: 'REGULATORY',
    type: 'Chinese IND Application'
  },
  ind_kr: { 
    minWords: 6000, 
    sections: 6,
    config: 'REGULATORY',
    type: 'Korean IND Application'
  },
  nda_in: { 
    minWords: 7000, 
    sections: 7,
    config: 'REGULATORY',
    type: 'Indian NDA Application'
  }
};

// Required parameters by document type
const REQUIRED_PARAMETERS = {
  protocol: ['trial_phase', 'primary_endpoint', 'study_duration'],
  ind: ['compound_name', 'indication', 'dosage_form'],
  nda: ['trade_name', 'active_ingredient', 'indication'],
  bla: ['product_name', 'indication', 'manufacturing_site'],
  cta: ['protocol_number', 'indication', 'trial_phase'],
  maa: ['trade_name', 'active_substance', 'therapeutic_indication'],
  impd: ['active_substance', 'dosage_form', 'route_of_administration']
};

// Standardized formatting requirements
const FORMATTING_STANDARDS = `
FORMATTING REQUIREMENTS:
- Use plain text formatting only - NO MARKDOWN, NO HTML
- Use ALL CAPS for main section headings (e.g., "1. PROTOCOL SUMMARY")
- Use Title Case for subsection headings with appropriate numbering (e.g., "1.1 Study Objectives")
- Include proper spacing between sections (double line break)
- Use professional document structure with consistent indentation
- Reference applicable regulatory guidance documents with proper citations
- Use standard medical and regulatory terminology throughout
- Maintain consistent numbering and bullet point formatting
`;

// Enhanced parameter processing functions
const validateDocumentRequirements = (diseaseData, docType) => {
  const requirements = DOCUMENT_REQUIREMENTS[docType];
  if (!requirements) {
    throw new Error(`Unsupported document type: ${docType}`);
  }

  const requiredParams = REQUIRED_PARAMETERS[docType] || [];
  const providedParams = diseaseData.additional_parameters || {};
  const missing = requiredParams.filter(param => !providedParams[param]);
  
  if (missing.length > 0) {
    // Only log in development and make it less verbose
    if (process.env.NODE_ENV === 'development') {
      console.log(`Note: Optional parameters not provided for ${docType}: ${missing.join(', ')}`);
    }
  }
  
  return requirements;
};

const formatParametersForDocument = (parameters, docType) => {
  if (!parameters || Object.keys(parameters).length === 0) {
    return 'No additional parameters provided.';
  }

  const relevantParams = Object.entries(parameters)
    .filter(([key, value]) => value && value.toString().trim())
    .map(([key, value]) => {
      const formattedKey = key.replace(/_/g, ' ')
        .replace(/\b\w/g, l => l.toUpperCase());
      return `- ${formattedKey}: ${value}`;
    });

  return relevantParams.length > 0 ? relevantParams.join('\n') : 'No valid parameters provided.';
};

const getConfigForDocumentType = (docType) => {
  const requirements = DOCUMENT_REQUIREMENTS[docType];
  const configType = requirements?.config || 'COMPREHENSIVE';
  return OPENAI_CONFIG[configType];
};

const createSystemPrompt = (expertise, docType, regulatoryFramework, detailedRequirements) => {
  const requirements = DOCUMENT_REQUIREMENTS[docType];
  const documentTypeDescription = requirements?.type || docType.toUpperCase();
  
  return `You are a ${expertise} with extensive experience in ${documentTypeDescription.toLowerCase()} preparation and regulatory submissions. You have knowledge of ${regulatoryFramework} requirements.

Your task is to generate a HIGH-QUALITY FOUNDATION PROTOCOL for a ${documentTypeDescription.toUpperCase()} that adheres to UNIVERSAL CLINICAL PROTOCOL GENERATION STANDARDS.

🔬 SCIENTIFIC INTEGRITY FRAMEWORK - MANDATORY:
${detailedRequirements}

🔬 UNIVERSAL SCIENTIFIC INTEGRITY REQUIREMENTS:
- NEVER generate fictional biomarkers, scores, or metrics - use ONLY established, literature-supported measures
- If proposing investigational elements, explicitly label as "[INVESTIGATIONAL - REQUIRES VALIDATION]"
- Base ALL mechanisms of action on published biological pathways with appropriate citations
- Include realistic data ranges derived from actual clinical experience, not arbitrary numbers
- Distinguish clearly between hypothesis-generating observations and validated clinical evidence
- Ground all therapeutic rationales in established pathophysiology

📋 REGULATORY COMPLIANCE CORE - MANDATORY:
- Use precise regulatory terminology (Phase I/II/III, not "pre-clinical" for human studies)
- Include phase-appropriate primary endpoints (safety for Phase I, efficacy for Phase II/III)
- Generate statistically justified sample sizes based on study objectives and power requirements
- Include comprehensive safety monitoring frameworks with predefined stopping rules
- Specify appropriate regulatory pathway (IND, IDE, etc.) with corresponding requirements
- Address relevant FDA guidance documents for the therapeutic area

🎯 STUDY DESIGN STANDARDS - MANDATORY:
- Base inclusion/exclusion criteria on scientific rationale, not data mining correlations
- Include standard eligibility requirements appropriate to indication and patient safety
- Provide specific, implementable procedures (dose escalation, randomization, blinding)
- Generate realistic timelines based on enrollment feasibility and endpoint assessment
- Include appropriate control groups and statistical analysis plans
- Specify meaningful clinical endpoints that align with regulatory expectations

📊 DATA UTILIZATION PRINCIPLES - MANDATORY:
- Frame retrospective analyses as "informing study design" not "proving efficacy"
- Acknowledge limitations of historical data and observational studies
- Include prospective validation plans for any derived hypotheses or biomarkers
- Avoid claiming superiority based on uncontrolled comparisons
- Distinguish between feasibility data and treatment validation
- Include appropriate statistical caveats for exploratory analyses

🏭 MANUFACTURING & QUALITY REQUIREMENTS - MANDATORY:
- Generate realistic specifications based on therapeutic class standards
- Include appropriate analytical methods and quality control procedures
- Provide feasible stability and storage requirements
- Remove placeholder information that could mislead (generic addresses, fictional facilities)
- Include proper chain of custody and accountability procedures
- Address container-closure system requirements appropriately

📝 DOCUMENTATION EXCELLENCE - MANDATORY:
- Replace boilerplate language with study-specific, meaningful content
- Provide concrete, actionable procedures rather than general statements
- Avoid excessive regulatory compliance claims without substance
- Use professional scientific language without overstatement or marketing language
- Include specific rather than generic safety and efficacy monitoring procedures
- Ensure internal consistency across all document sections
- KEEP PROTOCOLS CONCISE: Investigators prefer shorter, scannable protocols with key information easily accessible
- NO INTRODUCTION OR CONCLUSION SUBSECTIONS: Eliminate these space-wasting subsections from all sections
- ZERO DUPLICATION: Each piece of information should appear in ONLY ONE section - never repeat content across sections
- CONSOLIDATE INFORMATION: Study population, visit schedules, dose escalation should each be in ONE dedicated section only
- Reference G1 Therapeutics Phase 1 NSCLC protocol (ClinicalTrials.gov) as model for consolidated, efficient structure

🎯 THERAPEUTIC AREA ADAPTABILITY - MANDATORY:
- Include indication-specific standard of care considerations
- Address relevant disease-specific biomarkers and endpoints
- Incorporate appropriate patient reported outcome measures where relevant
- Consider indication-specific regulatory requirements (orphan designation, etc.)
- Include relevant pharmacovigilance considerations for the therapeutic class
- Address population-specific safety considerations (pediatric, geriatric, etc.)

✅ QUALITY ASSURANCE SYSTEM - MANDATORY:
- Flag any assumptions or hypothetical elements clearly
- Include review checkpoints for scientific accuracy verification
- Provide clear documentation of data sources and evidence levels
- Include validation requirements for any novel methodologies
- Specify areas requiring subject matter expert review before finalization
- Build in safeguards against propagation of erroneous information

📋 OUTPUT SPECIFICATIONS - MANDATORY:
- Generate protocols that serve as high-quality foundations requiring refinement, not reconstruction
- Ensure all generated content is either evidence-based or clearly marked as provisional
- Include appropriate caveats and limitations throughout
- Provide modular structure allowing for client-specific customization
- Maintain scientific credibility while allowing for rapid adaptation

⚖️ ETHICAL CONSIDERATIONS - MANDATORY:
- Prioritize patient safety in all design decisions
- Include appropriate risk-benefit assessments
- Address vulnerable populations appropriately
- Include informed consent considerations relevant to study procedures
- Consider health equity and diversity in recruitment strategies
- Address potential conflicts of interest transparently

🎯 CONTENT STRUCTURE REQUIREMENTS:
- Generate a well-structured document with ${requirements?.sections || 6} main sections
- Use professional clinical research and regulatory terminology
- Reference relevant regulatory guidance documents and industry standards
- Include regulatory justification using established precedents
- Maintain scientific rigor while acknowledging limitations

🔍 MANDATORY QUALITY CONTROLS:
- For every major recommendation, include clear reasoning explaining:
  * Why this approach was chosen over alternatives
  * What regulatory precedents support this decision
  * What risk factors were considered
  * How this aligns with regulatory expectations
- Use phrases like "This recommendation is based on..." and "The rationale for this approach is..."
- Provide confidence levels for key decisions where appropriate

${FORMATTING_STANDARDS}

QUALITY STANDARDS:
- Demonstrate understanding of regulatory requirements and industry best practices
- Provide actionable, specific recommendations with clear rationale
- Include risk assessments and mitigation strategies where appropriate
- Ensure content is suitable for regulatory review
- Maintain consistency with regulatory harmonization guidelines
- Write concisely and professionally without unnecessary repetition
- ALWAYS explain the reasoning behind your recommendations for transparency`;
};

// Create an Axios instance for OpenAI API with extended timeout
const openaiApi = axios.create({
  baseURL: 'https://api.openai.com/v1/',
  headers: {
    'Authorization': `Bearer ${OPENAI_API_KEY}`,
    'Content-Type': 'application/json',
  },
  timeout: 120000, // 2 minutes timeout for individual API calls
});

const openaiService = {
  /**
   * Transcribes audio files via OpenAI Whisper.
   */
  transcribeAudio: async (file) => {
    const formData = new FormData();
    formData.append("file", file);
    formData.append("model", "whisper-1");

    try {
      const response = await openaiApi.post(
        "audio/transcriptions",
        formData,
        {
          headers: {
            'Content-Type': undefined, 
          },
        }
      );
      return response.data.text;
    } catch (error) {
      // console.error("Error in transcribeAudio:", error.response?.data || error.message);
      throw error;
    }
  },

  /**
   * Diagnose conversation from transcript
   */
  diagnoseConversation: async (transcript) => {
    try {
      const response = await openaiApi.post(
        "chat/completions",
        {
          ...OPENAI_CONFIG.ANALYTICAL,
          messages: [
            {
              role: "system",
              content: `You are a board-certified medical specialist with extensive clinical experience. Analyze the transcript and provide diagnosis with extracted metadata.`
            },
            {
              role: "user",
              content: transcript
            }
          ]
        }
      );
      return response.data.choices[0].message.content.trim();
    } catch (error) {
      // console.error("Error in diagnoseConversation:", error.response?.data || error.message);
      throw error;
    }
  },

  /**
   * Generate Protocol - Enhanced version with standardized approach
   */
  /**
   * Clinical Protocol Generation - Section-Based Generation  
   */
  generateProtocol: async (diseaseData) => {
    return await openaiService.generateSectionBasedDocument('protocol', diseaseData);
  },
  
  // =============================================================================
  // UNITED STATES DOCUMENTS
  // =============================================================================
  
  // Generic helper function to generate individual document sections
  generateDocumentSection: async (docType, sectionNumber, diseaseData, previousSections = []) => {
    const config = getConfigForDocumentType(docType);
    const formattedParams = formatParametersForDocument(diseaseData.additional_parameters, docType);
    
    // Define sections for different document types
    const sectionDefinitions = {
      ind: {
        cmc: {
          1: { 
            title: "DRUG SUBSTANCE", 
            content: "ONLY generate chemistry data: molecular structure, chemical name, molecular formula, molecular weight, synthesis pathway, route of synthesis, physicochemical properties (pH, solubility, polymorphs), specifications, analytical methods for identity/purity/potency, reference standards, impurity profiles, degradation products. Do NOT include clinical, manufacturing, or regulatory information.",
            focus: "Chemical characterization only"
          },
          2: { 
            title: "DRUG PRODUCT", 
            content: "ONLY generate formulation data: formulation composition, excipient list and rationale, dosage form description, unit dose description, manufacturing process overview, in-process controls, finished product specifications, packaging and closure systems. Do NOT include clinical data or drug substance information.",
            focus: "Formulation and product composition only"
          },
          3: { 
            title: "MANUFACTURING INFORMATION", 
            content: "ONLY generate manufacturing data: facility information and address, equipment specifications, process descriptions, critical process parameters, process controls, batch size, manufacturing scale, GMP compliance status, personnel qualifications. Do NOT include analytical methods or clinical information.",
            focus: "Manufacturing process and facilities only"
          },
          4: { 
            title: "CONTROLS OF DRUG SUBSTANCE AND DRUG PRODUCT", 
            content: "ONLY generate analytical control data: analytical methods validation, test procedures, acceptance criteria, specifications justification, batch analysis data, quality control procedures, testing frequency, stability-indicating methods. Do NOT include manufacturing or clinical information.",
            focus: "Analytical methods and quality control only"
          },
          5: { 
            title: "STABILITY", 
            content: "ONLY generate stability data: stability study protocols, storage conditions, time points, degradation pathways, shelf-life justification, container-closure system evaluation, photostability, stress testing results. Do NOT include manufacturing or clinical information.",
            focus: "Stability studies and shelf-life only"
          },
          6: { 
            title: "ENVIRONMENTAL ASSESSMENT", 
            content: "ONLY generate environmental data: environmental impact evaluation, categorical exclusion justification under 21 CFR 25.31, environmental fate and transport, ecotoxicity data if required. Do NOT include clinical, manufacturing, or chemistry information.",
            focus: "Environmental impact assessment only"
          }
        },
        clinical: {
          1: { 
            title: "INTRODUCTION AND BACKGROUND", 
            content: "ONLY generate background information: disease pathophysiology, epidemiology statistics, current treatment landscape, unmet medical need description, investigational product scientific rationale, mechanism of action hypothesis. Do NOT include study design, procedures, or manufacturing information.",
            focus: "Disease background and rationale only"
          },
          2: { 
            title: "STUDY DESIGN AND RATIONALE", 
            content: "ONLY generate study design: study design justification, methodology description, randomization procedures, blinding techniques, visit schedules, study phases, study duration, treatment arms. Do NOT include population criteria, endpoints, or statistical analysis.",
            focus: "Study design methodology only"
          },
          3: { 
            title: "STUDY POPULATION", 
            content: "ONLY generate population criteria: inclusion criteria with medical rationale, exclusion criteria with safety rationale, screening procedures, recruitment strategy, population demographics, sample size target. Do NOT include study procedures, endpoints, or statistical methods.",
            focus: "Patient population and eligibility only"
          },
          4: { 
            title: "TREATMENTS AND INTERVENTIONS", 
            content: "ONLY generate treatment information: dosing rationale, dose selection justification, administration procedures, dose modifications/escalations, concomitant medications, compliance monitoring, drug accountability. Do NOT include endpoints, assessments, or statistical analysis.",
            focus: "Dosing and treatment administration only"
          },
          5: { 
            title: "EFFICACY ASSESSMENTS", 
            content: "ONLY generate efficacy endpoints: primary endpoint definition and rationale, secondary endpoints, exploratory endpoints, measurement methodologies, timing of assessments, regulatory acceptability of endpoints. Do NOT include safety assessments or statistical analysis.",
            focus: "Efficacy endpoints and measurements only"
          },
          6: { 
            title: "SAFETY ASSESSMENTS", 
            content: "ONLY generate safety monitoring: safety monitoring plan, adverse event classification and reporting, stopping rules, safety run-in procedures, pharmacovigilance procedures, safety committee structure. Do NOT include efficacy assessments or statistical analysis.",
            focus: "Safety monitoring and adverse events only"
          },
          7: { 
            title: "STATISTICAL CONSIDERATIONS", 
            content: "ONLY generate statistical information: sample size calculations with power analysis, primary analysis methods, secondary analysis plans, handling of missing data, interim analysis procedures, multiplicity adjustments. Do NOT include study design or endpoints definition.",
            focus: "Statistical methods and analysis only"
          },
          8: { 
            title: "DATA MANAGEMENT AND QUALITY ASSURANCE", 
            content: "ONLY generate data management: data collection systems, electronic data capture, data monitoring procedures, source data verification, quality control measures, audit procedures, database lock procedures. Do NOT include statistical analysis or study procedures.",
            focus: "Data collection and quality systems only"
          },
          9: { 
            title: "REGULATORY AND ETHICAL CONSIDERATIONS", 
            content: "ONLY generate regulatory compliance: IRB/IEC requirements, informed consent procedures, regulatory reporting requirements (IND safety reports), patient protection measures, regulatory submissions timeline. Do NOT include study design or data management.",
            focus: "Ethics and regulatory compliance only"
          },
          10: { 
            title: "RISK MANAGEMENT AND MITIGATION", 
            content: "ONLY generate risk assessment: comprehensive risk-benefit analysis, safety monitoring procedures, risk mitigation strategies, contingency plans, dose modification procedures, study stopping criteria. Do NOT include study design or statistical methods.",
            focus: "Risk assessment and mitigation only"
          }
        }
      },
      nda: {
        1: { 
          title: "ADMINISTRATIVE INFORMATION AND PRESCRIBING INFORMATION SUMMARY", 
          content: "ONLY generate FDA administrative data: NDA application number, regulatory pathway (505(b)(1) vs 505(b)(2)), FDA user fee status, proprietary/established names, dosage forms, routes of administration, applicant information, proposed indication statement, prescribing information highlights. Do NOT include quality, nonclinical, or clinical data.",
          focus: "FDA administrative and labeling summary only"
        },
        2: { 
          title: "OVERALL SUMMARY OF QUALITY", 
          content: "ONLY generate CTD Module 2.3 quality data: drug substance synthesis and characterization, drug product formulation and development, manufacturing process summary, control strategy, analytical procedures summary, stability summary, container closure system. Do NOT include nonclinical or clinical information.",
          focus: "Quality and manufacturing summary only"
        },
        3: { 
          title: "NONCLINICAL OVERVIEW AND SUMMARY", 
          content: "ONLY generate CTD Modules 2.4 & 2.6 nonclinical data: pharmacokinetics summary, pharmacodynamics, toxicology studies, carcinogenicity, genotoxicity, reproductive toxicity, safety pharmacology, integrated nonclinical risk assessment. Do NOT include clinical or quality data.",
          focus: "Preclinical and animal studies only"
        },
        4: { 
          title: "CLINICAL OVERVIEW AND SUMMARY", 
          content: "ONLY generate CTD Modules 2.5 & 2.7 clinical data: clinical development strategy, study design rationale, efficacy summary across studies, safety analysis summary, benefit-risk assessment, comparison to approved products, regulatory precedents. Do NOT include nonclinical or quality information.",
          focus: "Clinical development strategy and integrated analysis only"
        },
        5: { 
          title: "KEY CLINICAL STUDY REPORT SUMMARIES", 
          content: "ONLY generate pivotal study summaries: individual study methodologies, statistical analysis results, primary endpoint results, secondary endpoint results, safety results by study, subgroup analyses, study-specific conclusions. Do NOT include integrated analyses or quality data.",
          focus: "Individual pivotal study results only"
        }
      },
      bla: {
        1: { 
          title: "ADMINISTRATIVE INFORMATION AND PRODUCT INFORMATION", 
          content: "ONLY generate BLA administrative data: BLA application number, regulatory pathway under PHS Act 351, FDA user fees, biological product name, license holder information, proposed indication, manufacturing sites, labeling highlights. Do NOT include manufacturing details, nonclinical, or clinical data.",
          focus: "BLA administrative and product overview only"
        },
        2: { 
          title: "PRODUCT AND MANUFACTURING INFORMATION", 
          content: "ONLY generate biologics manufacturing data: biological product characterization, cell line information, manufacturing process description, facility qualifications, quality control testing, comparability assessments, adventitious agent testing, viral clearance. Do NOT include clinical or administrative information.",
          focus: "Biologics manufacturing and characterization only"
        },
        3: { 
          title: "NONCLINICAL STUDIES OVERVIEW", 
          content: "ONLY generate biologics nonclinical data: pharmacology studies, toxicology in relevant species, immunotoxicology, reproductive toxicity, local tolerance studies, integrated nonclinical safety assessment specific to biologics. Do NOT include clinical data or manufacturing information.",
          focus: "Biologics preclinical studies only"
        },
        4: { 
          title: "CLINICAL OVERVIEW AND EFFICACY", 
          content: "ONLY generate clinical efficacy data: clinical development program overview, dose selection rationale, efficacy analysis across studies, immunogenicity assessment, population-specific efficacy, comparison with standard of care. Do NOT include safety analysis or manufacturing information.",
          focus: "Clinical efficacy and immunogenicity only"
        },
        5: { 
          title: "SAFETY ANALYSIS AND RISK MANAGEMENT", 
          content: "ONLY generate safety and risk data: comprehensive safety profile, adverse events analysis, immunogenicity-related safety, risk mitigation strategies, pharmacovigilance plan, post-market surveillance commitments specific to biologics. Do NOT include efficacy or manufacturing data.",
          focus: "Safety analysis and risk management only"
        }
      },
      protocol: {
        1: {
          title: "BACKGROUND & RATIONALE",
          content: "NO INTRO/CONCLUSION subsections. Generate concise, scientifically sound background using ESTABLISHED data: disease pathophysiology from published literature, epidemiology statistics with references, current standard-of-care treatments, unmet medical need with clear gaps, investigational product rationale using proven mechanisms of action. Use PLACEHOLDER markers like '[SPECIFIC PRODUCT NAME]' and '[TO BE DETERMINED FROM PHASE I DATA]'. Keep concise - investigators want key information quickly accessible. DO NOT include study population, endpoints, or design details (those belong in other sections).",
          focus: "Concise, evidence-based background with NO duplication of content from other sections"
        },
        2: {
          title: "OBJECTIVES & ENDPOINTS",
          content: "NO INTRO/CONCLUSION subsections. Generate PHASE-APPROPRIATE objectives and established endpoints ONLY: **PHASE I**: Primary safety endpoints (dose-limiting toxicity, maximum tolerated dose), secondary PK/PD endpoints with validated biomarkers. **PHASE II**: Primary efficacy endpoints (objective response rate, progression-free survival), secondary safety/biomarker endpoints. **PHASE III**: Primary confirmatory efficacy endpoints with regulatory precedent, secondary quality of life/safety endpoints. Use ONLY literature-supported endpoints with established cutoffs or clear placeholders '[CLINICALLY MEANINGFUL DIFFERENCE: TO BE DETERMINED BASED ON REGULATORY GUIDANCE]'. DO NOT include study design, population criteria, or assessment schedules (those belong in other sections).",
          focus: "Concise, phase-appropriate objectives and endpoints ONLY - NO duplication"
        },
        3: {
          title: "STUDY DESIGN & SCHEMA",
          content: "NO INTRO/CONCLUSION subsections. Generate concise study design framework: overall study schema, randomization scheme (block, stratified), blinding procedures, treatment arms/cohorts. Include DOSE ESCALATION PLAN if applicable (3+3, BOIN, etc.) - ALL dose escalation details belong HERE ONLY. Clearly mark assumptions: 'ASSUMPTION: [X-week treatment period based on similar studies]'. DO NOT repeat population criteria, detailed visit schedules, or endpoint definitions (those belong in other sections). Keep concise and scannable.",
          focus: "Concise study schema with ALL dose escalation consolidated HERE - NO duplication"
        },
        4: {
          title: "STUDY POPULATION & ELIGIBILITY",
          content: "NO INTRO/CONCLUSION subsections. This is the ONLY section for ALL study population information. Generate COMPLETE eligibility criteria: inclusion criteria using validated diagnostic criteria (e.g., 'Disease severity score ≥ [TO BE DETERMINED based on regulatory precedent]'), ALL exclusion criteria for safety, screening procedures, enrollment targets, recruitment strategies. Mark assumptions: 'NOTE: Specific laboratory values require validation in target population'. DO NOT repeat this information anywhere else in the protocol. Keep concise but complete.",
          focus: "ALL study population details consolidated HERE ONLY - single source of truth"
        },
        5: {
          title: "TREATMENT & DOSING",
          content: "NO INTRO/CONCLUSION subsections. Generate concise treatment framework: specific dosing regimens, administration procedures, concomitant medication restrictions, dose modifications for toxicity, treatment duration. Use placeholders: '[STARTING DOSE: TO BE DETERMINED FROM PRECLINICAL DATA]'. If dose escalation is part of design, reference Section 3 (do NOT duplicate escalation scheme here). Include treatment compliance monitoring. Keep concise and actionable.",
          focus: "Concise dosing and administration details - reference but do NOT duplicate escalation from Section 3"
        },
        6: {
          title: "STUDY PROCEDURES & SCHEDULE OF ASSESSMENTS",
          content: "NO INTRO/CONCLUSION subsections. This is the ONLY section for visit schedules and ALL assessment timing. Generate consolidated schedule of events table format: screening, baseline, treatment visits (weeks 1, 2, 4, 8, 12, etc.), follow-up. Include ALL procedures per visit: physical exams, vital signs, laboratory tests (CBC, CMP, LFTs, etc.), imaging (CT, MRI per RECIST 1.1), biomarker collection, patient-reported outcomes. Use ONLY validated assessment tools with literature citations. This section consolidates ALL timing - DO NOT repeat visit schedules anywhere else. Model after G1 Therapeutics protocol structure for efficiency.",
          focus: "ALL visit schedules and assessment timing consolidated HERE ONLY - single comprehensive schedule"
        },
        7: {
          title: "SAFETY MONITORING & ADVERSE EVENT MANAGEMENT",
          content: "NO INTRO/CONCLUSION subsections. Generate concise safety framework: adverse event grading (CTCAE v5.0), DLT definitions appropriate for therapeutic class '[DLT DEFINITION: TO BE REFINED BASED ON PRECLINICAL SAFETY DATA]', stopping rules with statistical basis, DSMB/DMC structure and responsibilities, AE reporting timelines per regulatory requirements. Include management of specific toxicities. Keep practical and actionable for site staff.",
          focus: "Concise safety monitoring with clear DLT criteria and stopping rules - NO duplication"
        },
        8: {
          title: "STATISTICAL CONSIDERATIONS",
          content: "NO INTRO/CONCLUSION subsections. Generate concise statistical framework: sample size calculations with REALISTIC assumptions (power 80-90%, alpha 0.05), primary analysis methods (ITT, per-protocol), handling of missing data, interim analysis plans if applicable. Use placeholders: '[EFFECT SIZE: TO BE DETERMINED FROM PHASE II DATA OR LITERATURE]', '[DROPOUT RATE: BASED ON SIMILAR INDICATION STUDIES]'. Include phase-appropriate statistical approaches. Keep focused on statistical methodology only.",
          focus: "Concise statistical methods with justified sample size - NO duplication"
        },
        9: {
          title: "REGULATORY & ETHICAL CONSIDERATIONS",
          content: "NO INTRO/CONCLUSION subsections. Generate concise regulatory framework: GCP compliance (ICH E6(R2)), informed consent process (21 CFR 50), IRB/IEC approval requirements, regulatory reporting (IND safety reports, amendments), data protection compliance. Include realistic timelines: '[IND SUBMISSION: 30-DAY SAFETY REVIEW]', '[IRB APPROVAL: 2-4 WEEKS]'. Note indication-specific requirements (orphan designation, breakthrough therapy). Keep concise and practical.",
          focus: "Concise regulatory compliance essentials - NO duplication"
        },
        10: {
          title: "DATA MANAGEMENT & STUDY OVERSIGHT",
          content: "NO INTRO/CONCLUSION subsections. Generate concise consolidated section (model after G1 Therapeutics protocol): EDC system and data collection, source data verification, data monitoring procedures, quality assurance/quality control, database lock procedures, record retention, study committee responsibilities. Include placeholders: '[EDC SYSTEM: TO BE SELECTED]'. Keep practical for site implementation. This consolidates final administrative/operational elements efficiently.",
          focus: "Concise data management and oversight - consolidated final section per G1 model"
        }
      },
      cta: {
        1: { 
          title: "GENERAL INFORMATION", 
          content: "ONLY generate EU CTA administrative data: EudraCT number, CTIS submission details, sponsor information, legal representative in EU, trial title, trial phase, regulatory framework under EU CTR. Do NOT include study design, IMP details, or investigator information.",
          focus: "EU administrative and sponsor information only"
        },
        2: { 
          title: "INVESTIGATIONAL MEDICINAL PRODUCT", 
          content: "ONLY generate IMP information: IMP characterization, pharmaceutical form, manufacturing authorization holder, IMPD reference, GMP compliance, labeling details, supply and accountability. Do NOT include clinical protocol or administrative information.",
          focus: "IMP characterization and regulatory status only"
        },
        3: {
          title: "CLINICAL TRIAL PROTOCOL",
          content: "NO INTRO/CONCLUSION subsections. ONLY generate concise protocol information: study design schema, objectives and endpoints, methodology, complete eligibility criteria (all inclusion/exclusion), treatment arms/dosing, consolidated schedule of assessments table (screening through follow-up), safety monitoring. Keep concise and scannable - investigators want key information quickly. Model efficiency after G1 Therapeutics protocol. Do NOT duplicate visit schedules, population criteria, or dose escalation across multiple subsections. Do NOT include investigator details or separate risk assessment.",
          focus: "Complete but concise protocol with zero duplication - consolidated schedule"
        },
        4: { 
          title: "INVESTIGATOR AND SITE INFORMATION", 
          content: "ONLY generate investigator/site data: principal investigator qualifications and CV, co-investigator details, site facilities description, site authorization status, trial staff qualifications. Do NOT include protocol details or risk information.",
          focus: "Investigator and site qualifications only"
        },
        5: { 
          title: "RISK ASSESSMENT", 
          content: "ONLY generate risk analysis: risk categorization under EU CTR, risk-benefit assessment, safety considerations, known risks, risk mitigation measures, safety monitoring approach. Do NOT include protocol details or ethics information.",
          focus: "Risk-benefit analysis and safety assessment only"
        },
        6: { 
          title: "ETHICS AND REGULATORY", 
          content: "ONLY generate ethics/regulatory compliance: ethics committee details, informed consent procedures, patient protection measures, data protection compliance (GDPR), vulnerable population considerations. Do NOT include risk assessment or scientific rationale.",
          focus: "Ethics approval and patient protection only"
        },
        7: { 
          title: "SUPPORTING DOCUMENTATION", 
          content: "ONLY generate supporting scientific information: scientific advice received, literature review, precedent studies, regulatory guideline compliance, scientific rationale for trial conduct. Do NOT include administrative or protocol information.",
          focus: "Scientific rationale and literature support only"
        }
      },
      maa: {
        1: { 
          title: "ADMINISTRATIVE INFORMATION", 
          content: "ONLY generate EMA administrative data: MAA application number, centralized/decentralized procedure, orphan designation status, applicant information, product name, ATC code, legal basis for application, regulatory milestones. Do NOT include quality, clinical, or nonclinical information.",
          focus: "EMA administrative and regulatory pathway only"
        },
        2: { 
          title: "QUALITY MODULE SUMMARY", 
          content: "ONLY generate quality information: drug substance characterization, drug product development, manufacturing and controls, analytical procedures, specifications, stability data, pharmaceutical development rationale. Do NOT include nonclinical or clinical data.",
          focus: "CTD Module 2.3 quality summary only"
        },
        3: { 
          title: "NON-CLINICAL OVERVIEW", 
          content: "ONLY generate nonclinical data: pharmacology overview, toxicology studies summary, ADME studies, safety pharmacology, environmental risk assessment, integrated nonclinical evaluation. Do NOT include clinical or quality information.",
          focus: "CTD Modules 2.4 & 2.6 nonclinical overview only"
        },
        4: { 
          title: "CLINICAL OVERVIEW", 
          content: "ONLY generate clinical development overview: development strategy, study design rationale, clinical program overview, regulatory precedents, clinical pharmacology, dose selection rationale. Do NOT include detailed efficacy/safety results.",
          focus: "CTD Module 2.5 clinical development strategy only"
        },
        5: { 
          title: "EFFICACY AND SAFETY ANALYSIS", 
          content: "ONLY generate clinical results: efficacy analysis across studies, safety analysis, benefit-risk assessment, European population-specific data, comparison with existing treatments, clinical conclusions. Do NOT include development strategy or quality information.",
          focus: "CTD Module 2.7 clinical results and benefit-risk only"
        },
        6: { 
          title: "RISK MANAGEMENT PLAN", 
          content: "ONLY generate risk management information: safety specification, pharmacovigilance plan, risk minimization measures, additional monitoring, effectiveness indicators, post-authorization safety studies. Do NOT include clinical efficacy or quality data.",
          focus: "EU RMP and pharmacovigilance only"
        },
        7: { 
          title: "PEDIATRIC INVESTIGATION PLAN", 
          content: "ONLY generate pediatric information: PIP compliance status, pediatric development strategy, age-appropriate formulations, pediatric study requirements, waivers or deferrals obtained. Do NOT include adult clinical data or quality information.",
          focus: "EU pediatric requirements and PIP only"
        },
        8: { 
          title: "PRODUCT INFORMATION", 
          content: "ONLY generate labeling information: Summary of Product Characteristics (SmPC), Package Leaflet (PIL), labeling and packaging, contraindications, warnings, dosing recommendations, special populations. Do NOT include development or manufacturing information.",
          focus: "EU product labeling and prescribing information only"
        }
      },
      impd: {
        1: { 
          title: "INTRODUCTION AND REGULATORY FRAMEWORK", 
          content: "ONLY generate IMPD administrative information: IMPD structure overview, EU regulatory framework for IMPs, IMPD-Q vs IMPD-S/E scope, version control, regulatory submission context under EU CTR. Do NOT include substance characterization or clinical information.",
          focus: "IMPD structure and EU regulatory context only"
        },
        2: { 
          title: "DRUG SUBSTANCE CHARACTERIZATION", 
          content: "ONLY generate drug substance information: chemical name and structure, synthesis route, physicochemical properties, specifications, analytical methods for drug substance, impurities profile, reference standards. Do NOT include drug product or manufacturing information.",
          focus: "Chemical characterization of active substance only"
        },
        3: { 
          title: "DRUG PRODUCT FORMULATION", 
          content: "ONLY generate drug product information: formulation composition, excipients and rationale, dosage form description, pharmaceutical development rationale, compatibility studies, container closure system. Do NOT include manufacturing processes or clinical information.",
          focus: "Formulation development and drug product composition only"
        },
        4: { 
          title: "MANUFACTURING AND CONTROLS", 
          content: "ONLY generate manufacturing information: manufacturing sites and authorization, manufacturing process description, in-process controls, quality control testing, batch release procedures, GMP compliance status. Do NOT include formulation details or clinical information.",
          focus: "Manufacturing processes and quality control only"
        },
        5: { 
          title: "PLACEBO AND COMPARATORS", 
          content: "ONLY generate placebo/comparator information: placebo composition and matching, comparator product details, supply chain and sourcing, labeling and blinding procedures, accountability procedures. Do NOT include active product manufacturing or clinical design.",
          focus: "Placebo and comparator product details only"
        },
        6: { 
          title: "NON-CLINICAL SAFETY SUMMARY", 
          content: "ONLY generate IMPD-S nonclinical information: summary of pharmacology studies, toxicology studies relevant to clinical trial, safety margins, dose selection rationale from nonclinical data, integrated nonclinical assessment. Do NOT include clinical data or manufacturing information.",
          focus: "IMPD-S nonclinical safety summary only"
        },
        7: { 
          title: "CLINICAL DEVELOPMENT SUMMARY", 
          content: "ONLY generate IMPD-E clinical information: previous clinical experience summary, dose selection rationale from clinical data, safety data from previous studies, clinical development plan context, trial-specific clinical rationale. Do NOT include nonclinical or quality information.",
          focus: "IMPD-E clinical experience summary only"
        }
      },
      nds: {
        1: { 
          title: "ADMINISTRATIVE INFORMATION", 
          content: "ONLY generate Health Canada administrative data: NDS submission number, regulatory pathway, applicant information, product identification, submission type, user fees, regulatory timeline. Do NOT include quality, clinical, or nonclinical information.",
          focus: "Health Canada administrative requirements only"
        },
        2: { 
          title: "QUALITY OVERALL SUMMARY", 
          content: "ONLY generate quality summary: drug substance characterization, drug product development, manufacturing summary, analytical procedures, stability, quality overall summary per Canadian requirements. Do NOT include nonclinical or clinical data.",
          focus: "Canadian CTD Module 2.3 quality summary only"
        },
        3: { 
          title: "NON-CLINICAL EVALUATION", 
          content: "ONLY generate nonclinical data: pharmacology studies, toxicology evaluation, safety pharmacology, integrated nonclinical assessment, Canadian-specific nonclinical requirements. Do NOT include clinical or quality information.",
          focus: "Canadian nonclinical evaluation only"
        },
        4: { 
          title: "CLINICAL EVALUATION", 
          content: "ONLY generate clinical evaluation: clinical efficacy analysis, safety evaluation, study design rationale, Canadian population data, clinical development program. Do NOT include benefit-risk assessment or quality information.",
          focus: "Clinical studies evaluation only"
        },
        5: { 
          title: "BENEFIT-RISK ASSESSMENT", 
          content: "ONLY generate benefit-risk analysis: integrated benefit-risk assessment, Canadian population considerations, comparison to existing therapies, regulatory precedents, Health Canada-specific benefit-risk evaluation. Do NOT include clinical study details.",
          focus: "Integrated benefit-risk assessment only"
        },
        6: { 
          title: "RISK MANAGEMENT", 
          content: "ONLY generate risk management: risk mitigation strategies, pharmacovigilance plan, post-market commitments, additional monitoring, risk minimization measures per Health Canada requirements. Do NOT include clinical efficacy data.",
          focus: "Risk management and pharmacovigilance only"
        },
        7: { 
          title: "PRODUCT MONOGRAPH", 
          content: "ONLY generate Canadian labeling: Product Monograph content, indications and clinical use, contraindications, warnings and precautions, dosage and administration, Canadian-specific prescribing information. Do NOT include development or manufacturing information.",
          focus: "Canadian Product Monograph only"
        },
        8: { 
          title: "REGULATORY COMPLIANCE", 
          content: "ONLY generate regulatory compliance: Health Canada guideline compliance, regulatory strategy, post-market obligations, manufacturing compliance, Canadian regulatory framework adherence. Do NOT include clinical or quality details.",
          focus: "Health Canada regulatory compliance only"
        }
      },
      jnda: {
        1: { title: "ADMINISTRATIVE INFORMATION", content: "PMDA submission overview, regulatory pathway, and Japanese regulatory framework" },
        2: { title: "QUALITY MODULE", content: "Drug substance and product characterization, manufacturing controls, and Japanese specifications" },
        3: { title: "NON-CLINICAL STUDIES", content: "Pharmacology, toxicology, Japanese-specific studies, and integrated safety assessment" },
        4: { title: "CLINICAL STUDIES OVERVIEW", content: "Clinical development strategy, Japanese population data, and global study integration" },
        5: { title: "EFFICACY ANALYSIS", content: "Primary and secondary endpoint analysis, Japanese subgroup data, and regulatory endpoints" },
        6: { title: "SAFETY EVALUATION", content: "Safety profile analysis, Japanese population considerations, and risk characterization" },
        7: { title: "BENEFIT-RISK ASSESSMENT", content: "Japanese benefit-risk analysis, population-specific considerations, and regulatory precedents" },
        8: { title: "POST-MARKETING REQUIREMENTS", content: "Japanese post-marketing studies, surveillance plan, and regulatory commitments" }
      },
      nda_ch: {
        1: { title: "ADMINISTRATIVE INFORMATION", content: "NMPA submission details, regulatory pathway, and Chinese regulatory compliance" },
        2: { title: "QUALITY ASSESSMENT", content: "Drug substance and product quality, manufacturing information, and Chinese specifications" },
        3: { title: "NON-CLINICAL EVALUATION", content: "Pharmacology, toxicology studies, Chinese population considerations, and safety assessment" },
        4: { title: "CLINICAL DEVELOPMENT", content: "Clinical study design, Chinese population data, and regulatory compliance" },
        5: { title: "EFFICACY AND SAFETY", content: "Clinical efficacy analysis, safety profile, and Chinese population-specific data" },
        6: { title: "BENEFIT-RISK ANALYSIS", content: "Chinese benefit-risk assessment, population considerations, and regulatory strategy" },
        7: { title: "REGULATORY STRATEGY", content: "NMPA requirements, submission strategy, and post-approval commitments" }
      },
      nda_kr: {
        1: { title: "ADMINISTRATIVE INFORMATION", content: "K-FDA submission overview, regulatory pathway, and Korean regulatory framework" },
        2: { title: "QUALITY EVALUATION", content: "Drug substance and product quality, manufacturing controls, and Korean specifications" },
        3: { title: "NON-CLINICAL ASSESSMENT", content: "Pharmacology, toxicology studies, and Korean population safety considerations" },
        4: { title: "CLINICAL EVALUATION", content: "Clinical studies, Korean population data, and efficacy assessment" },
        5: { title: "SAFETY ANALYSIS", content: "Safety profile, Korean population-specific considerations, and risk evaluation" },
        6: { title: "REGULATORY COMPLIANCE", content: "K-FDA requirements, submission strategy, and post-marketing obligations" }
      },
      ma_uk: {
        1: { 
          title: "ADMINISTRATIVE INFORMATION", 
          content: "ONLY generate MHRA submission administrative details: application type, submission pathway, regulatory framework, MHRA reference numbers, Brexit regulatory changes, application fees, submission timeline, and UK-specific administrative requirements. Do NOT include clinical or quality information.",
          focus: "MHRA administrative requirements only"
        },
        2: { 
          title: "QUALITY ASSESSMENT", 
          content: "ONLY generate Chemistry, Manufacturing and Controls (CMC) information: drug substance characterization, chemical structure, synthesis, manufacturing process, UK GMP compliance, analytical methods, specifications, stability data, impurities, packaging. Do NOT include clinical or administrative information.",
          focus: "CMC and manufacturing quality only"
        },
        3: { 
          title: "NON-CLINICAL EVALUATION", 
          content: "ONLY generate preclinical data: animal studies, pharmacology, toxicology, ADME studies, safety pharmacology, genotoxicity, carcinogenicity, reproductive toxicity. Do NOT include clinical data or quality information.",
          focus: "Animal studies and preclinical safety only"
        },
        4: { 
          title: "CLINICAL DEVELOPMENT", 
          content: "ONLY generate clinical trial information: study designs, clinical protocols, trial populations, UK clinical sites, investigator qualifications, trial conduct, GCP compliance. Do NOT include efficacy/safety results.",
          focus: "Clinical trial design and conduct only"
        },
        5: { 
          title: "BENEFIT-RISK ANALYSIS", 
          content: "ONLY generate efficacy and safety analysis: clinical trial results, efficacy endpoints, safety profile, adverse events, UK population-specific data, benefit-risk assessment, comparison with existing treatments.",
          focus: "Clinical results and benefit-risk only"
        },
        6: { 
          title: "RISK MANAGEMENT", 
          content: "ONLY generate risk management information: risk minimization measures, pharmacovigilance plan, REMS if applicable, post-marketing surveillance, safety monitoring, risk communication strategies.",
          focus: "Risk management and pharmacovigilance only"
        },
        7: { 
          title: "PRODUCT INFORMATION", 
          content: "ONLY generate labeling information: Summary of Product Characteristics (SmPC), Patient Information Leaflet (PIL), prescribing information, indications, contraindications, dosing, warnings and precautions.",
          focus: "Product labeling and prescribing information only"
        }
      },
      ma_ch: {
        1: { 
          title: "ADMINISTRATIVE INFORMATION", 
          content: "ONLY generate Swissmedic administrative data: application number, submission pathway, applicant information, Swiss regulatory framework, product identification, submission timeline. Do NOT include quality, clinical, or nonclinical information.",
          focus: "Swissmedic administrative requirements only"
        },
        2: { 
          title: "QUALITY EVALUATION", 
          content: "ONLY generate Swiss quality assessment: drug substance quality, manufacturing evaluation, Swiss GMP requirements, analytical procedures, specifications, quality compliance with Swiss standards. Do NOT include clinical or nonclinical data.",
          focus: "Swiss quality and manufacturing assessment only"
        },
        3: { 
          title: "NON-CLINICAL ASSESSMENT", 
          content: "ONLY generate Swiss nonclinical evaluation: pharmacology assessment, toxicology evaluation, Swiss-specific safety requirements, nonclinical data assessment per Swissmedic guidelines. Do NOT include clinical or quality information.",
          focus: "Swiss nonclinical safety assessment only"
        },
        4: { 
          title: "CLINICAL EVALUATION", 
          content: "ONLY generate Swiss clinical assessment: clinical studies evaluation, Swiss population considerations, efficacy analysis, clinical data assessment per Swissmedic requirements. Do NOT include benefit-risk analysis.",
          focus: "Swiss clinical studies evaluation only"
        },
        5: { 
          title: "BENEFIT-RISK ANALYSIS", 
          content: "ONLY generate Swiss benefit-risk assessment: integrated benefit-risk evaluation, Swiss population-specific considerations, Swissmedic regulatory precedents, Swiss market context. Do NOT include detailed clinical study results.",
          focus: "Swiss benefit-risk assessment only"
        },
        6: { 
          title: "REGULATORY COMPLIANCE", 
          content: "ONLY generate Swissmedic compliance: Swiss regulatory requirements, Swissmedic guideline compliance, post-market obligations, Swiss submission strategy, regulatory framework adherence. Do NOT include clinical or quality details.",
          focus: "Swissmedic regulatory compliance only"
        }
      },
      aus: {
        1: { title: "ADMINISTRATIVE INFORMATION", content: "TGA submission details, Australian regulatory pathway, and administrative compliance" },
        2: { title: "QUALITY ASSESSMENT", content: "Drug substance and product quality, Australian manufacturing standards, and TGA specifications" },
        3: { title: "NON-CLINICAL EVALUATION", content: "Pharmacology, toxicology studies, and Australian safety requirements" },
        4: { title: "CLINICAL DEVELOPMENT", content: "Clinical studies, Australian population data, and TGA regulatory compliance" },
        5: { title: "BENEFIT-RISK ANALYSIS", content: "Australian benefit-risk assessment, population considerations, and TGA precedents" },
        6: { title: "REGULATORY STRATEGY", content: "TGA requirements, submission strategy, and post-approval commitments" }
      },
      cta_uk: {
        1: { title: "ADMINISTRATIVE INFORMATION", content: "NO INTRO/CONCLUSION subsections. ONLY generate concise MHRA CTA administrative details: application type, MHRA reference numbers, sponsor information, protocol overview, UK regulatory framework post-Brexit. Keep concise. Do NOT include clinical or quality information." },
        2: { title: "STUDY DESIGN", content: "NO INTRO/CONCLUSION subsections. ONLY generate concise clinical study design: objectives, endpoints, methodology, complete eligibility criteria, randomization, blinding, treatment schedule, consolidated assessment schedule (screening through follow-up), statistical plan. ZERO DUPLICATION - visit schedules and population criteria appear HERE ONLY. Keep scannable. Do NOT include manufacturing or administrative details." },
        3: { title: "INVESTIGATIONAL MEDICINAL PRODUCT", content: "NO INTRO/CONCLUSION subsections. ONLY generate concise IMP information: drug substance details, formulation, manufacturing, quality control, UK GMP compliance. Keep concise. Do NOT include clinical design or safety data." },
        4: { title: "SAFETY INFORMATION", content: "NO INTRO/CONCLUSION subsections. ONLY generate concise safety data: nonclinical safety summary, clinical safety experience, investigator brochure summary, risk assessment, DLT definitions, stopping rules. Keep concise. Do NOT include efficacy or quality information." },
        5: { title: "ETHICS AND PARTICIPANT PROTECTION", content: "NO INTRO/CONCLUSION subsections. ONLY generate concise ethics information: Research Ethics Committee approval, informed consent, participant insurance, data protection (UK GDPR compliance). Keep concise. Do NOT include study design or IMP details." },
        6: { title: "TRIAL MANAGEMENT", content: "NO INTRO/CONCLUSION subsections. ONLY generate concise trial management: site information, investigator qualifications, monitoring plan, pharmacovigilance system. Keep concise. Do NOT include study design or regulatory details." },
        7: { title: "UK REGULATORY COMPLIANCE", content: "NO INTRO/CONCLUSION subsections. ONLY generate concise UK regulatory compliance: Clinical Trials Regulations 2004 compliance, MHRA requirements, Good Clinical Practice adherence, post-Brexit regulatory framework. Keep concise. Do NOT include study-specific details." }
      },
      cta_ca: {
        1: { title: "ADMINISTRATIVE INFORMATION", content: "NO INTRO/CONCLUSION subsections. ONLY generate concise Health Canada CTA administrative details: NOC application pathway, sponsor information, Canadian regulatory framework, Health Canada reference numbers. Keep concise. Do NOT include clinical or quality information." },
        2: { title: "CLINICAL PROTOCOL SUMMARY", content: "NO INTRO/CONCLUSION subsections. ONLY generate concise clinical protocol: study objectives, design, endpoints, complete eligibility criteria (all inclusion/exclusion), treatment schedule, consolidated assessment schedule (screening through follow-up), statistical considerations. ZERO DUPLICATION - visit schedules and population criteria appear HERE ONLY. Keep scannable. Do NOT include manufacturing or regulatory details." },
        3: { title: "INVESTIGATIONAL PRODUCT INFORMATION", content: "NO INTRO/CONCLUSION subsections. ONLY generate concise drug product details: formulation, manufacturing, Canadian GMP compliance, quality specifications. Keep concise. Do NOT include clinical design or safety data." },
        4: { title: "SAFETY AND RISK ASSESSMENT", content: "NO INTRO/CONCLUSION subsections. ONLY generate concise safety information: nonclinical safety, clinical safety experience, risk-benefit assessment, Canadian population considerations, DLT definitions, stopping rules. Keep concise. Do NOT include efficacy or quality data." },
        5: { title: "INVESTIGATOR AND SITE INFORMATION", content: "NO INTRO/CONCLUSION subsections. ONLY generate concise Canadian site details: investigator qualifications, site capabilities, Canadian healthcare integration, provincial regulatory compliance. Keep concise. Do NOT include protocol or safety details." },
        6: { title: "REGULATORY AND ETHICAL COMPLIANCE", content: "NO INTRO/CONCLUSION subsections. ONLY generate concise Canadian regulatory compliance: ICH-GCP compliance, Research Ethics Board approval, Health Canada regulations, Canadian privacy legislation compliance. Keep concise. Do NOT include study-specific information." }
      },
      cta_ru: {
        1: { title: "ADMINISTRATIVE INFORMATION", content: "NO INTRO/CONCLUSION subsections. ONLY generate concise Roszdravnadzor administrative details: permit application type, Russian regulatory framework, sponsor information, authorization pathway. Keep concise. Do NOT include clinical or manufacturing information." },
        2: { title: "CLINICAL STUDY OVERVIEW", content: "NO INTRO/CONCLUSION subsections. ONLY generate concise clinical study information: objectives, design, complete eligibility criteria, Russian population considerations, endpoints, treatment schedule, consolidated assessment schedule (screening through follow-up), statistical approach. ZERO DUPLICATION - visit schedules and population criteria appear HERE ONLY. Keep scannable. Do NOT include regulatory or quality details." },
        3: { title: "INVESTIGATIONAL MEDICINAL PRODUCT", content: "NO INTRO/CONCLUSION subsections. ONLY generate concise IMP details: drug substance, manufacturing information, Russian GMP compliance, quality control measures. Keep concise. Do NOT include clinical design or safety information." },
        4: { title: "SAFETY ASSESSMENT", content: "NO INTRO/CONCLUSION subsections. ONLY generate concise safety data: nonclinical safety summary, clinical safety experience, Russian population safety considerations, risk evaluation, DLT definitions, stopping rules. Keep concise. Do NOT include efficacy or quality information." },
        5: { title: "RUSSIAN SITE AND INVESTIGATOR INFORMATION", content: "NO INTRO/CONCLUSION subsections. ONLY generate concise Russian site details: investigator qualifications, site authorization, Russian healthcare system integration, local regulatory compliance. Keep concise. Do NOT include protocol details." },
        6: { title: "REGULATORY COMPLIANCE", content: "NO INTRO/CONCLUSION subsections. ONLY generate concise Russian regulatory compliance: Federal Law compliance, Roszdravnadzor requirements, Russian GCP standards, ethics committee approval. Keep concise. Do NOT include study-specific details." }
      },
      ind_ch: {
        1: { title: "ADMINISTRATIVE INFORMATION", content: "NO INTRO/CONCLUSION subsections. ONLY generate concise NMPA IND administrative details: application type, Chinese regulatory pathway, sponsor information, NMPA reference numbers. Keep concise. Do NOT include clinical or manufacturing information." },
        2: { title: "DRUG SUBSTANCE INFORMATION", content: "NO INTRO/CONCLUSION subsections. ONLY generate concise drug substance details: chemical characterization, synthesis, Chinese manufacturing standards, quality specifications. Keep concise. Do NOT include clinical or formulation information." },
        3: { title: "NONCLINICAL SAFETY SUMMARY", content: "NO INTRO/CONCLUSION subsections. ONLY generate concise nonclinical safety data: pharmacology studies, toxicology assessment, Chinese population safety considerations, dose selection rationale. Keep concise. Do NOT include clinical or quality information." },
        4: { title: "CLINICAL DEVELOPMENT PLAN", content: "NO INTRO/CONCLUSION subsections. ONLY generate concise clinical plan: study objectives, design, complete eligibility criteria, Chinese population considerations, treatment schedule, consolidated assessment schedule, clinical development strategy, regulatory pathway in China. ZERO DUPLICATION - visit schedules and population criteria appear HERE ONLY. Keep scannable. Do NOT include manufacturing or safety details." },
        5: { title: "MANUFACTURING AND QUALITY", content: "NO INTRO/CONCLUSION subsections. ONLY generate concise manufacturing information: Chinese GMP compliance, production facilities, quality control, NMPA manufacturing requirements. Keep concise. Do NOT include clinical or nonclinical data." },
        6: { title: "CHINESE REGULATORY COMPLIANCE", content: "NO INTRO/CONCLUSION subsections. ONLY generate concise NMPA compliance: Chinese drug law compliance, NMPA guidelines adherence, Chinese clinical trial regulations, local regulatory requirements. Keep concise. Do NOT include study-specific details." }
      },
      ind_kr: {
        1: { title: "ADMINISTRATIVE INFORMATION", content: "NO INTRO/CONCLUSION subsections. ONLY generate concise K-FDA IND administrative details: application pathway, Korean regulatory framework, sponsor information, K-FDA reference numbers. Keep concise. Do NOT include clinical or manufacturing information." },
        2: { title: "DRUG SUBSTANCE CHARACTERIZATION", content: "NO INTRO/CONCLUSION subsections. ONLY generate concise drug substance information: chemical structure, synthesis, Korean manufacturing standards, analytical specifications. Keep concise. Do NOT include clinical or safety information." },
        3: { title: "NONCLINICAL SAFETY DATA", content: "NO INTRO/CONCLUSION subsections. ONLY generate concise nonclinical safety: pharmacology studies, toxicology assessment, Korean population safety considerations, safety margins. Keep concise. Do NOT include clinical or quality data." },
        4: { title: "CLINICAL STUDY PLAN", content: "NO INTRO/CONCLUSION subsections. ONLY generate concise clinical information: study objectives, design, complete eligibility criteria, Korean population considerations, treatment schedule, consolidated assessment schedule, clinical development strategy, K-FDA regulatory alignment. ZERO DUPLICATION - visit schedules and population criteria appear HERE ONLY. Keep scannable. Do NOT include manufacturing details." },
        5: { title: "QUALITY AND MANUFACTURING", content: "NO INTRO/CONCLUSION subsections. ONLY generate concise manufacturing data: Korean GMP compliance, production information, quality control measures, K-FDA manufacturing requirements. Keep concise. Do NOT include clinical information." },
        6: { title: "KOREAN REGULATORY COMPLIANCE", content: "NO INTRO/CONCLUSION subsections. ONLY generate concise K-FDA compliance: Korean pharmaceutical law compliance, K-FDA guidelines, Korean clinical trial regulations, regulatory submission strategy. Keep concise. Do NOT include study details." }
      },
      nda_in: {
        1: { title: "ADMINISTRATIVE INFORMATION", content: "ONLY generate CDSCO NDA administrative details: application type, Indian regulatory pathway, applicant information, CDSCO reference numbers. Do NOT include clinical or quality information." },
        2: { title: "DRUG SUBSTANCE AND PRODUCT", content: "ONLY generate drug information: active substance characterization, formulation details, Indian manufacturing standards, pharmaceutical development. Do NOT include clinical or regulatory information." },
        3: { title: "MANUFACTURING AND QUALITY CONTROL", content: "ONLY generate manufacturing information: Indian GMP compliance, production facilities, quality control testing, CDSCO manufacturing requirements. Do NOT include clinical or administrative data." },
        4: { title: "NONCLINICAL EVALUATION", content: "ONLY generate nonclinical data: pharmacology studies, toxicology assessment, Indian population safety considerations, nonclinical summary. Do NOT include clinical efficacy or quality information." },
        5: { title: "CLINICAL DATA SUMMARY", content: "ONLY generate clinical information: clinical studies, Indian population data, efficacy and safety results, clinical development overview. Do NOT include manufacturing or regulatory compliance." },
        6: { title: "BENEFIT-RISK ASSESSMENT", content: "ONLY generate benefit-risk analysis: Indian population benefit-risk, safety profile, therapeutic advantage, comparison with existing treatments. Do NOT include detailed clinical study results." },
        7: { title: "INDIAN REGULATORY COMPLIANCE", content: "ONLY generate CDSCO compliance: Indian pharmaceutical regulations, CDSCO guidelines compliance, Drugs and Cosmetics Act adherence, Indian regulatory framework. Do NOT include clinical or quality details." }
      }
    };

    // Determine section type and get section definition
    let sectionDef, sectionType = null;
    
    if (docType === 'ind') {
      // For IND, determine if CMC or Clinical section
      if (sectionNumber <= 6) {
        sectionType = 'cmc';
        sectionDef = sectionDefinitions.ind.cmc[sectionNumber];
      } else {
        sectionType = 'clinical';
        sectionDef = sectionDefinitions.ind.clinical[sectionNumber - 6];
      }
    } else {
      // For other document types, use direct section mapping
      sectionDef = sectionDefinitions[docType][sectionNumber];
    }

    if (!sectionDef) {
      throw new Error(`Invalid section: ${docType} section ${sectionNumber}`);
    }

    const contextInfo = previousSections.length > 0 
      ? `\nPREVIOUS SECTIONS CONTEXT:\n${previousSections.map(s => `${s.title}: ${s.summary}`).join('\n')}`
      : '';

    // Get document-specific system prompt details
    const docTypeMap = {
      ind: { role: 'Senior Regulatory Affairs Director and Principal Investigator', standard: 'FDA/21 CFR 312' },
      nda: { role: 'Senior Regulatory Affairs Director and NDA Specialist', standard: 'FDA/eCTD/ICH CTD' },
      bla: { role: 'Senior Regulatory Affairs Director and BLA Specialist', standard: 'FDA/eCTD/PHS Act 351' },
      protocol: { role: 'Principal Investigator and Clinical Research Director', standard: 'FDA/ICH GCP' },
      cta: { role: 'Senior Regulatory Affairs Director and EU CTA Specialist', standard: 'EU CTR/CTIS' },
      maa: { role: 'Senior Regulatory Affairs Director and EMA MAA Specialist', standard: 'EU/EMA/ICH CTD' },
      impd: { role: 'Senior Regulatory Affairs Director and EU IMPD Specialist', standard: 'EU CTR/EMA' },
      nds: { role: 'Senior Regulatory Affairs Director and Health Canada Specialist', standard: 'Health Canada/ICH CTD' },
      jnda: { role: 'Senior Regulatory Affairs Director and PMDA Specialist', standard: 'PMDA/ICH CTD' },
      nda_ch: { role: 'Senior Regulatory Affairs Director and NMPA Specialist', standard: 'NMPA/Chinese Regulatory' },
      nda_kr: { role: 'Senior Regulatory Affairs Director and K-FDA Specialist', standard: 'K-FDA/Korean Regulatory' },
      ma_uk: { role: 'Senior Regulatory Affairs Director and MHRA Specialist', standard: 'MHRA/UK Regulatory' },
      ma_ch: { role: 'Senior Regulatory Affairs Director and Swissmedic Specialist', standard: 'Swissmedic/Swiss Regulatory' },
      aus: { role: 'Senior Regulatory Affairs Director and TGA Specialist', standard: 'TGA/Australian Regulatory' }
    };

    const docInfo = docTypeMap[docType];
    if (!docInfo) {
      throw new Error(`Document type '${docType}' is not supported. Supported types: ${Object.keys(docTypeMap).join(', ')}`);
    }
    const systemPrompt = createSystemPrompt(
      docInfo.role,
      docType,
      docInfo.standard,
      `You are generating content for ONLY ONE SPECIFIC SECTION of a ${docType.toUpperCase()} document. 

🚫 CRITICAL: You must COMPLETELY IGNORE all other sections of the document.
🚫 CRITICAL: You must NOT provide any content that belongs in other sections.
🚫 CRITICAL: You must REJECT any request to include content outside this section's scope.

THIS SECTION ONLY: ${sectionDef.title}
ALLOWED CONTENT ONLY: ${sectionDef.content}
${sectionDef.focus ? `SECTION SCOPE: ${sectionDef.focus}` : ''}

MANDATORY RESTRICTIONS:
🚫 DO NOT mention other document sections
🚫 DO NOT provide background information unless this section specifically requires it
🚫 DO NOT include administrative details unless this is the administrative section
🚫 DO NOT include clinical data unless this is a clinical section
🚫 DO NOT include manufacturing data unless this is a manufacturing/quality section
🚫 DO NOT include regulatory compliance info unless this is a regulatory section
🚫 DO NOT provide study design details unless this is a study design section
🚫 DO NOT include safety data unless this is a safety section
🚫 DO NOT include efficacy data unless this is an efficacy section

VALIDATION CHECK: Before generating each paragraph, ask yourself:
"Does this content belong SPECIFICALLY in ${sectionDef.title}?"
If NO, DO NOT include it.

Generate 800-1500 words that address ONLY the scope of ${sectionDef.title}.`
    );

    try {
      const response = await openaiApi.post('chat/completions', {
        model: config.model,
        max_tokens: Math.min(config.max_tokens, 2000),
        temperature: 0.1, // Very low temperature for focused, consistent output
        top_p: 0.9, // Focused sampling
        messages: [
          {
            role: "system",
            content: systemPrompt
          },
          {
            role: "user", 
            content: `🎯 GENERATE CONTENT FOR THIS SECTION ONLY: ${sectionDef.title}

🚫 CRITICAL RESTRICTIONS:
- IGNORE all other sections of the document
- DO NOT mention study design unless this is the study design section
- DO NOT mention clinical results unless this is a clinical results section  
- DO NOT mention manufacturing unless this is a manufacturing section
- DO NOT mention administrative details unless this is an administrative section
- DO NOT mention regulatory compliance unless this is a regulatory section

DISEASE: ${diseaseData.disease_name}
STUDY PARAMETERS: ${formattedParams}${contextInfo}

🎯 YOUR ONLY JOB: Generate content about ${sectionDef.title}
🎯 ALLOWED CONTENT: ${sectionDef.content}
${sectionDef.focus ? `🎯 FOCUS AREA: ${sectionDef.focus}` : ''}

🚫 BEFORE WRITING EACH SENTENCE, ASK: "Does this belong in ${sectionDef.title}?"
🚫 IF NO, DON'T WRITE IT.

🚨 UNIVERSAL CLINICAL PROTOCOL STANDARDS - MANDATORY COMPLIANCE:

🔬 SCIENTIFIC INTEGRITY CHECKLIST:
✅ Use ONLY established, literature-supported biomarkers and measures (no fictional metrics)
✅ Label all investigational elements as "[INVESTIGATIONAL - REQUIRES VALIDATION]"
✅ Base mechanisms of action on published biological pathways with citations
✅ Include realistic data ranges from actual clinical experience
✅ Distinguish hypothesis-generating from validated clinical evidence
✅ Ground therapeutic rationales in established pathophysiology

📋 REGULATORY COMPLIANCE CHECKLIST:
✅ Use precise regulatory terminology (Phase I/II/III terminology)
✅ Include phase-appropriate endpoints (safety for Phase I, efficacy for Phase II/III)
✅ Provide statistically justified sample sizes with power calculations
✅ Include comprehensive safety monitoring with predefined stopping rules
✅ Specify appropriate regulatory pathway (IND, IDE) requirements
✅ Address relevant FDA guidance documents for therapeutic area

🎯 STUDY DESIGN QUALITY CHECKLIST:
✅ Base inclusion/exclusion criteria on scientific rationale (not data mining)
✅ Include standard eligibility requirements for indication and patient safety
✅ Provide specific, implementable procedures (dose escalation, randomization, blinding)
✅ Generate realistic timelines based on enrollment feasibility
✅ Include appropriate control groups and statistical analysis plans
✅ Specify meaningful clinical endpoints aligned with regulatory expectations

📊 DATA & EVIDENCE QUALITY CHECKLIST:
✅ Frame retrospective analyses as "informing study design" not "proving efficacy"
✅ Acknowledge limitations of historical data and observational studies
✅ Include prospective validation plans for derived hypotheses/biomarkers
✅ Avoid superiority claims based on uncontrolled comparisons
✅ Distinguish between feasibility data and treatment validation
✅ Include appropriate statistical caveats for exploratory analyses

⚖️ ETHICAL & SAFETY CHECKLIST:
✅ Prioritize patient safety in all design decisions
✅ Include appropriate risk-benefit assessments
✅ Address vulnerable populations appropriately
✅ Include informed consent considerations for study procedures
✅ Consider health equity and diversity in recruitment strategies
✅ Address potential conflicts of interest transparently

📝 DOCUMENTATION EXCELLENCE CHECKLIST:
✅ Replace boilerplate language with study-specific, meaningful content
✅ Provide concrete, actionable procedures (not general statements)
✅ Use professional scientific language without overstatement
✅ Include specific safety/efficacy monitoring procedures
✅ Ensure internal consistency across document sections
✅ Flag assumptions/hypothetical elements clearly
✅ NO INTRODUCTION OR CONCLUSION SUBSECTIONS - eliminate these space-wasters
✅ KEEP CONCISE - investigators prefer shorter, scannable protocols
✅ ZERO DUPLICATION - never repeat information that belongs in another section

🎯 THERAPEUTIC AREA ADAPTATION REQUIREMENTS:
- Include indication-specific standard of care considerations
- Address disease-specific biomarkers and endpoints
- Incorporate appropriate patient reported outcome measures
- Consider indication-specific regulatory requirements
- Include therapeutic class pharmacovigilance considerations
- Address population-specific safety considerations

🚨 CRITICAL CONSOLIDATION RULES FOR PROTOCOLS:
- Study population details appear ONLY in Section 4 (Study Population & Eligibility)
- Visit schedules and assessment timing appear ONLY in Section 6 (Study Procedures & Schedule of Assessments)
- Dose escalation schemes appear ONLY in Section 3 (Study Design & Schema)
- Do NOT duplicate these across multiple sections - reference other sections if needed
- Model efficiency after G1 Therapeutics Phase 1 NSCLC protocol (ClinicalTrials.gov)

Generate 800-1500 words about ${sectionDef.title} ONLY that demonstrates FULL COMPLIANCE with Universal Clinical Protocol Generation Standards.`
          }
        ]
      });

      return {
        title: sectionDef.title,
        content: response.data.choices[0].message.content.trim(),
        summary: `Section ${sectionNumber} focuses on ${sectionDef.content.split(',')[0].toLowerCase()}`,
        sectionType: sectionType // Only for IND documents
      };

    } catch (error) {
      console.error(`Error generating ${docType} section ${sectionNumber}:`, error);
      throw error;
    }
  },

  // Smart document generation - automatically uses section-based for large documents
  generateSmartDocument: async (docType, diseaseData, fallbackFunction) => {
    const sectionBasedTypes = ['ind', 'nda', 'bla', 'protocol', 'cta', 'maa', 'impd', 'nds', 'jnda', 'nda_ch', 'nda_kr', 'ma_uk', 'ma_ch', 'aus', 'cta_uk', 'cta_ca', 'cta_ru', 'ind_ch', 'ind_kr', 'nda_in'];
    
    if (sectionBasedTypes.includes(docType)) {
      console.log(`📊 Using section-based generation for ${docType.toUpperCase()}`);
      return await openaiService.generateSectionBasedDocument(docType, diseaseData);
    } else {
      console.log(`📄 Using single-call generation for ${docType.toUpperCase()}`);
      return await fallbackFunction(diseaseData);
    }
  },

  // Generic section-based document generation
  generateSectionBasedDocument: async (docType, diseaseData) => {
    try {
      // Validate requirements
      validateDocumentRequirements(diseaseData, docType);
      
      // Get section count for document type
      const sectionCounts = {
        ind: 10, // Frontend expects 10 sections
        nda: 5,
        bla: 5, 
        protocol: 10,
        cta: 7,
        maa: 8,
        impd: 7,
        nds: 8,
        jnda: 8,
        nda_ch: 7,
        nda_kr: 6,
        ma_uk: 7,
        ma_ch: 6,
        aus: 6,
        cta_uk: 7,
        cta_ca: 6,
        cta_ru: 6,
        ind_ch: 6,
        ind_kr: 6,
        nda_in: 7
      };
      
      const totalSections = sectionCounts[docType];
      if (!totalSections) {
        throw new Error(`Document type ${docType} not configured for section-based generation`);
      }
      
      const generatedSections = [];
      const sections = [];

      // Generate each section with progress tracking
      const startTime = Date.now();
      console.log(`🚀 Starting generation of ${totalSections} sections for ${docType.toUpperCase()} document...`);
      for (let i = 1; i <= totalSections; i++) {
        const sectionStartTime = Date.now();
        try {
          const section = await openaiService.generateDocumentSection(docType, i, diseaseData, generatedSections);
          sections.push(section);
          generatedSections.push(section);
          const sectionTime = Date.now() - sectionStartTime;
          console.log(`✅ Generated ${docType.toUpperCase()} section ${i}/${totalSections}: ${section.title} (${sectionTime}ms)`);
        } catch (sectionError) {
          console.error(`✗ Failed to generate ${docType.toUpperCase()} section ${i}:`, sectionError.message);
          // Add placeholder section to maintain structure
          const fallbackSection = {
            title: `${docType.toUpperCase()} SECTION ${i} (GENERATION FAILED)`,
            content: `Content generation failed for this section. Error: ${sectionError.message}. Please regenerate this section individually.`,
            summary: `Section ${i} generation failed`
          };
          sections.push(fallbackSection);
          generatedSections.push(fallbackSection);
        }
        
        // Reduced delay to avoid rate limits while preventing timeouts
        await new Promise(resolve => setTimeout(resolve, 25));
      }

      // Log total generation time
      const totalTime = Date.now() - startTime;
      console.log(`🎉 Completed generation of all ${totalSections} sections for ${docType.toUpperCase()} in ${totalTime}ms`);

      // Combine sections based on document type
      let response = {};
      
      if (docType === 'ind') {
        // IND returns direct section mapping for frontend
        response = {};
        
        // Frontend expects regulatory-section-1 through regulatory-section-10 format
        const frontendSectionMapping = {
          1: 'regulatory-section-1',  // CMC
          2: 'regulatory-section-2',  // Nonclinical
          3: 'regulatory-section-3',  // Clinical Pharmacology  
          4: 'regulatory-section-4',  // Clinical Study Reports
          5: 'regulatory-section-5',  // Statistical Analysis
          6: 'regulatory-section-6',  // Integrated Summary of Efficacy
          7: 'regulatory-section-7',  // Integrated Summary of Safety
          8: 'regulatory-section-8',  // Risk Assessment
          9: 'regulatory-section-9',  // Labeling
          10: 'regulatory-section-10' // Regulatory Compliance
        };
        
        // Populate sections directly in frontend format
        response.sectionsData = {};
        sections.forEach((section, index) => {
          const frontendId = frontendSectionMapping[index + 1];
          if (frontendId) {
            response.sectionsData[frontendId] = section.content;
          }
        });
        
        // Also provide legacy format for backward compatibility
        const cmcSections = sections.filter(s => s.sectionType === 'cmc' || sections.indexOf(s) < 6);
        const clinicalSections = sections.filter(s => s.sectionType === 'clinical' || sections.indexOf(s) >= 6);
        
        const cmcContent = cmcSections.map(s => `${s.title}\n\n${s.content}`).join('\n\n---\n\n');
        const clinicalContent = clinicalSections.map(s => `${s.title}\n\n${s.content}`).join('\n\n---\n\n');
        
        response.cmc_section = cmcContent;
        response.clinical_section = clinicalContent;
        response.document_content = `${cmcContent}\n\n${clinicalContent}`;
        response.sections = sections;
      } else if (docType === 'protocol') {
        // Protocol returns sections in frontend format
        response = {};
        
        // Frontend expects regulatory-section-1 through regulatory-section-10 format
        const frontendSectionMapping = {
          1: 'regulatory-section-1', 2: 'regulatory-section-2', 3: 'regulatory-section-3',
          4: 'regulatory-section-4', 5: 'regulatory-section-5', 6: 'regulatory-section-6',
          7: 'regulatory-section-7', 8: 'regulatory-section-8', 9: 'regulatory-section-9',
          10: 'regulatory-section-10'
        };
        
        // Populate sections directly in frontend format
        response.sectionsData = {};
        sections.forEach((section, index) => {
          const frontendId = frontendSectionMapping[index + 1];
          if (frontendId) {
            response.sectionsData[frontendId] = section.content;
          }
        });
        
        // Also provide legacy format
        sections.forEach((section, index) => {
          response[`section_${index + 1}`] = {
            title: section.title,
            content: section.content
          };
        });
        
        const protocolContent = sections.map(s => `${s.title}\n\n${s.content}`).join('\n\n---\n\n');
        response.protocol_id = `prot-${Date.now()}`;
        response.protocol = protocolContent;
        response.sections = sections;
      } else {
        // All other documents use the same frontend section mapping as IND
        response = {};
        
        // Frontend expects regulatory-section-1 through regulatory-section-10 format
        const frontendSectionMapping = {
          1: 'regulatory-section-1',   // Section 1
          2: 'regulatory-section-2',   // Section 2  
          3: 'regulatory-section-3',   // Section 3
          4: 'regulatory-section-4',   // Section 4
          5: 'regulatory-section-5',   // Section 5
          6: 'regulatory-section-6',   // Section 6
          7: 'regulatory-section-7',   // Section 7
          8: 'regulatory-section-8',   // Section 8
          9: 'regulatory-section-9',   // Section 9
          10: 'regulatory-section-10' // Section 10
        };
        
        // Populate sections directly in frontend format
        response.sectionsData = {};
        sections.forEach((section, index) => {
          const frontendId = frontendSectionMapping[index + 1];
          if (frontendId) {
            response.sectionsData[frontendId] = section.content;
          }
        });
        
        // Also provide backward compatibility format
        sections.forEach((section, index) => {
          response[`section_${index + 1}`] = {
            title: section.title,
            content: section.content
          };
        });
        
        const content = sections.map(s => `${s.title}\n\n${s.content}`).join('\n\n---\n\n');
        response.document_content = content;
        response.sections = sections;
      }

      // Add metadata
      const successful = sections.filter(s => !s.title.includes('GENERATION FAILED')).length;
      const failed = sections.length - successful;

      response.metadata = {
        sectionsGenerated: sections.length,
        successfulGenerations: successful,
        failedGenerations: failed,
        successRate: `${Math.round((successful / sections.length) * 100)}%`,
        generationMethod: 'section_based_api_calls',
        documentType: docType
      };

      return response;
      
    } catch (error) {
      console.error(`Error in generateSectionBasedDocument for ${docType}:`, error.response?.data || error.message);
      throw error;
    }
  },

  // Helper function to generate individual IND sections (backwards compatibility)
  generateIndSection: async (sectionType, sectionNumber, diseaseData, previousSections = []) => {
    const config = getConfigForDocumentType('ind');
    const formattedParams = formatParametersForDocument(diseaseData.additional_parameters, 'ind');
    
    const sectionDefinitions = {
      cmc: {
        1: {
          title: "DRUG SUBSTANCE",
          content: "Complete characterization including molecular structure, synthesis pathway, physicochemical properties, specifications, analytical methods, reference standards, and impurity profiles"
        },
        2: {
          title: "DRUG PRODUCT", 
          content: "Comprehensive formulation details, excipient justification, manufacturing process, in-process controls, finished product specifications, and packaging systems"
        },
        3: {
          title: "MANUFACTURING INFORMATION",
          content: "Detailed process descriptions, critical process parameters, facility information, equipment specifications, and GMP compliance documentation"
        },
        4: {
          title: "CONTROLS OF DRUG SUBSTANCE AND DRUG PRODUCT",
          content: "Analytical methods validation, specifications justification, batch analysis data, and quality control procedures"
        },
        5: {
          title: "STABILITY",
          content: "Complete stability study protocols, data analysis, degradation pathways, storage conditions, and shelf-life justification"
        },
        6: {
          title: "ENVIRONMENTAL ASSESSMENT",
          content: "Environmental impact evaluation and categorical exclusion justification"
        }
      },
      clinical: {
        1: {
          title: "INTRODUCTION AND BACKGROUND",
          content: "Disease pathophysiology, epidemiology, current treatments, unmet medical need, and investigational product rationale"
        },
        2: {
          title: "STUDY DESIGN AND RATIONALE",
          content: "Study design justification, methodology, randomization procedures, blinding techniques, visit schedules, and statistical considerations"
        },
        3: {
          title: "STUDY POPULATION",
          content: "Inclusion/exclusion criteria with medical and scientific rationale, screening procedures, and population justification"
        },
        4: {
          title: "TREATMENTS AND INTERVENTIONS",
          content: "Dosing rationale, administration procedures, dose modifications, concomitant medications, and compliance monitoring"
        },
        5: {
          title: "EFFICACY ASSESSMENTS",
          content: "Primary/secondary endpoints with measurement methodologies, timing considerations, and regulatory acceptability"
        },
        6: {
          title: "SAFETY ASSESSMENTS",
          content: "Comprehensive safety monitoring plan, adverse event classification, stopping rules, and pharmacovigilance procedures"
        },
        7: {
          title: "STATISTICAL CONSIDERATIONS",
          content: "Sample size calculations with power analysis, primary analysis methods, handling of missing data, and interim analyses"
        },
        8: {
          title: "DATA MANAGEMENT AND QUALITY ASSURANCE",
          content: "Data collection systems, monitoring procedures, quality control measures, and regulatory compliance"
        },
        9: {
          title: "REGULATORY AND ETHICAL CONSIDERATIONS",
          content: "IRB requirements, informed consent, regulatory reporting, and patient protection measures"
        },
        10: {
          title: "RISK MANAGEMENT AND MITIGATION",
          content: "Comprehensive risk-benefit analysis, safety monitoring, risk mitigation strategies, and contingency plans"
        }
      }
    };

    const section = sectionDefinitions[sectionType][sectionNumber];
    if (!section) {
      throw new Error(`Invalid section: ${sectionType} ${sectionNumber}`);
    }

    const contextInfo = previousSections.length > 0 
      ? `\nPREVIOUS SECTIONS CONTEXT:\n${previousSections.map(s => `${s.title}: ${s.summary}`).join('\n')}`
      : '';

    const systemPrompt = createSystemPrompt(
      'Senior Regulatory Affairs Director and Principal Investigator',
      'ind',
      'FDA/21 CFR 312',
      `Generate detailed, FDA-compliant content for a specific section of an IND application.

FOCUS: ${section.title}
REQUIREMENTS: ${section.content}

CRITICAL STANDARDS:
- Reference specific FDA guidance documents (ICH Q8, Q9, Q10, E6(R2), E9(R1))
- Include detailed technical specifications and numerical parameters
- Provide regulatory justification for all recommendations
- Use professional regulatory terminology
- Ensure content is suitable for FDA submission
- Generate 800-1500 words of comprehensive content
- Maintain consistency with other document sections`
    );

    try {
      const response = await openaiApi.post('chat/completions', {
        model: config.model,
        max_tokens: Math.min(config.max_tokens, 2000), // Smaller token limit per section
        temperature: config.temperature,
        messages: [
          {
            role: "system",
            content: systemPrompt
          },
          {
            role: "user",
            content: `Generate comprehensive content for IND ${sectionType.toUpperCase()} Section ${sectionNumber}: ${section.title}

STUDY: ${diseaseData.disease_name}
STUDY PARAMETERS:
${formattedParams}${contextInfo}

Create detailed, technical content that addresses all requirements for this specific section. Include regulatory references, technical specifications, and professional terminology suitable for FDA review.`
          }
        ]
      });

      return {
        title: section.title,
        content: response.data.choices[0].message.content.trim(),
        summary: `Section ${sectionNumber} focuses on ${section.content.split(',')[0].toLowerCase()}`
      };

    } catch (error) {
      console.error(`Error generating IND ${sectionType} section ${sectionNumber}:`, error);
      throw error;
    }
  },

  /**
   * US IND (Investigational New Drug) - Refactored with Section-Based Generation
   */
  generateIndModule: async (diseaseData) => {
    try {
      // Validate requirements and get configuration  
      validateDocumentRequirements(diseaseData, 'ind');
      
      const generatedSections = [];
      let cmcSections = [];
      let clinicalSections = [];

      // Generate CMC Sections (1-6) with error handling
      console.log('Generating CMC sections...');
      for (let i = 1; i <= 6; i++) {
        try {
          const section = await openaiService.generateIndSection('cmc', i, diseaseData, generatedSections);
          cmcSections.push(section);
          generatedSections.push(section);
          console.log(`✓ Generated CMC section ${i}: ${section.title}`);
        } catch (sectionError) {
          console.error(`✗ Failed to generate CMC section ${i}:`, sectionError.message);
          // Add placeholder section to maintain structure
          const fallbackSection = {
            title: `CMC SECTION ${i} (GENERATION FAILED)`,
            content: `Content generation failed for this section. Error: ${sectionError.message}. Please regenerate this section individually.`,
            summary: `Section ${i} generation failed`
          };
          cmcSections.push(fallbackSection);
          generatedSections.push(fallbackSection);
        }
        
        // Reduced delay to avoid rate limits while preventing timeouts
        await new Promise(resolve => setTimeout(resolve, 25));
      }

      // Generate Clinical Sections (1-10) with error handling
      console.log('Generating Clinical sections...');
      for (let i = 1; i <= 10; i++) {
        try {
          const section = await openaiService.generateIndSection('clinical', i, diseaseData, generatedSections);
          clinicalSections.push(section);
          generatedSections.push(section);
          console.log(`✓ Generated Clinical section ${i}: ${section.title}`);
        } catch (sectionError) {
          console.error(`✗ Failed to generate Clinical section ${i}:`, sectionError.message);
          // Add placeholder section to maintain structure
          const fallbackSection = {
            title: `CLINICAL SECTION ${i} (GENERATION FAILED)`,
            content: `Content generation failed for this section. Error: ${sectionError.message}. Please regenerate this section individually.`,
            summary: `Section ${i} generation failed`
          };
          clinicalSections.push(fallbackSection);
          generatedSections.push(fallbackSection);
        }
        
        // Reduced delay to avoid rate limits while preventing timeouts
        await new Promise(resolve => setTimeout(resolve, 25));
      }

      // Combine all sections into final document
      const cmcContent = cmcSections.map(s => `${s.title}\n\n${s.content}`).join('\n\n---\n\n');
      const clinicalContent = clinicalSections.map(s => `${s.title}\n\n${s.content}`).join('\n\n---\n\n');

      // Count successful vs failed generations
      const successfulCmc = cmcSections.filter(s => !s.title.includes('GENERATION FAILED')).length;
      const successfulClinical = clinicalSections.filter(s => !s.title.includes('GENERATION FAILED')).length;
      const failedCmc = cmcSections.length - successfulCmc;
      const failedClinical = clinicalSections.length - successfulClinical;

      return {
        cmc_section: cmcContent || "CMC sections could not be generated.",
        clinical_section: clinicalContent || "Clinical sections could not be generated.",
        metadata: {
          sectionsGenerated: cmcSections.length + clinicalSections.length,
          cmcSections: cmcSections.length,
          clinicalSections: clinicalSections.length,
          successfulGenerations: successfulCmc + successfulClinical,
          failedGenerations: failedCmc + failedClinical,
          successRate: `${Math.round((successfulCmc + successfulClinical) / (cmcSections.length + clinicalSections.length) * 100)}%`,
          generationMethod: 'section_based_api_calls',
          breakdown: {
            cmc: { successful: successfulCmc, failed: failedCmc },
            clinical: { successful: successfulClinical, failed: failedClinical }
          }
        }
      };
    } catch (error) {
      console.error('Error in generateIndModule:', error.response?.data || error.message);
      throw error;
    }
  },

  /**
   * US NDA (New Drug Application) - Section-Based Generation
   */
  generateNDA: async (diseaseData) => {
    return await openaiService.generateSectionBasedDocument('nda', diseaseData);
  },

  /**
   * US BLA (Biologics License Application) - Section-Based Generation
   */
  generateBLA: async (diseaseData) => {
    return await openaiService.generateSectionBasedDocument('bla', diseaseData);
  },

  // =============================================================================
  // RUSSIA DOCUMENTS - ENHANCED WITH DETAILED PROMPTS
  // =============================================================================

  /**
   * Russian Clinical Trial Permit (Roszdravnadzor) - ENHANCED
   */
  generateCTA_RU: async (diseaseData) => {
    try {
      const response = await openaiApi.post('chat/completions', {
        model: "gpt-4o", // UPGRADED
        messages: [
          {
            role: "system",
            content: `You are a senior regulatory affairs expert with 25+ years of experience specializing in Russian clinical trial permits for Roszdravnadzor submission and deep knowledge of Russian pharmaceutical regulations.
            
            Your task is to generate a comprehensive Russian clinical trial authorization document that meets professional standards for submission to Roszdravnadzor.

            CONTENT REQUIREMENTS:
            - Generate well-structured Russian regulatory content
            - Each section should contain relevant detail with specific methodologies, procedures, and regulatory compliance information
            - Include detailed subsections with numerical data, timelines, specific protocols, and regulatory justification
            - Provide complete regulatory rationale and scientific justification for all decisions according to Russian standards
            - Reference specific Russian regulatory requirements, Roszdravnadzor guidelines, and Russian Federation laws
            - Include both Russian terminology (in Cyrillic) and detailed English explanations
            - Incorporate specific Russian patient population considerations and healthcare system requirements
            - Address Russian GMP standards, local regulatory pathways, and compliance requirements

            STRUCTURE FOR RUSSIAN CLINICAL TRIAL PERMIT:
            1. ОБЗОР ЗАЯВЛЕНИЯ (Application Overview) - Comprehensive overview
               1.1. Информация об исследовании (Study Information) - Complete study design, methodology, and regulatory framework
               1.2. Спонсор и главный исследователь (Sponsor and Principal Investigator) - Detailed qualifications, experience, and regulatory standing
               1.3. Российские исследовательские центры (Russian Investigation Centers) - Complete site information, qualifications, and regulatory approvals
            2. ИНФОРМАЦИЯ ОБ ИССЛЕДУЕМОМ ПРЕПАРАТЕ (Detailed product information)
               2.1. Описание препарата (Product Description) - Comprehensive chemical, biological, and pharmaceutical characteristics
               2.2. Информация о качестве (Quality Information) - Detailed manufacturing, quality control, and Russian compliance standards
               2.3. Доклинические данные (Non-clinical Data) - Complete preclinical package with Russian regulatory analysis
               2.4. Предыдущий клинический опыт (Previous Clinical Experience) - Comprehensive global and Russian-relevant clinical data
            3. ПРОТОКОЛ КЛИНИЧЕСКОГО ИССЛЕДОВАНИЯ (Clinical protocol details)
               3.1. Цели и дизайн исследования (Study Objectives and Design) - Complete methodology and statistical planning
               3.2. Российская популяция пациентов (Russian Patient Population) - Detailed demographic analysis and Russian healthcare considerations
               3.3. План лечения (Treatment Plan) - Comprehensive dosing, administration, and monitoring protocols
               3.4. Оценка эффективности и безопасности (Efficacy and Safety Assessment) - Detailed endpoint definitions and measurement protocols
            4. РОССИЙСКИЕ РЕГУЛЯТОРНЫЕ СООБРАЖЕНИЯ (Russian regulatory considerations) - Complete regulatory compliance framework

            Use plain text formatting only - NO MARKDOWN.
            Include Russian terminology with detailed English explanations.
            Reference Russian regulatory requirements and Roszdravnadzor guidelines extensively.`
          },
          {
            role: "user",
            content: `Generate a comprehensive Russian Clinical Trial Permit application for ${diseaseData.disease_name} research in Russia.
            
            ${Object.entries(diseaseData.additional_parameters || {}).map(([key, value]) => 
              value ? `- ${key.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}: ${value}` : ''
            ).filter(Boolean).join('\n')}

            This application must meet Roszdravnadzor requirements for clinical trial authorization in Russia with detailed regulatory analysis and professional documentation suitable for regulatory submission. Each section should be well-developed with specific details, regulatory rationale, and compliance documentation.`
          }
        ],
        ...OPENAI_CONFIG.COMPREHENSIVE
      });
      return { document_content: response.data.choices[0].message.content.trim() };
    } catch (error) {
      console.error('Error in generateCTA_RU:', error.response?.data || error.message);
      throw error;
    }
  },

  /**
   * Russian Registration Dossier - ENHANCED
   */
  generateRD_RU: async (diseaseData) => {
    try {
      const response = await openaiApi.post('chat/completions', {
        model: "gpt-4o", // UPGRADED
        messages: [
          {
            role: "system",
            content: `You are a senior regulatory affairs expert with 25+ years of experience in Russian drug registration with Roszdravnadzor and deep expertise in Russian pharmaceutical regulations.
            
            Your task is to generate a comprehensive Russian registration dossier summary that meets professional standards for drug registration in the Russian Federation.

            CONTENT REQUIREMENTS:
            - Generate well-structured Russian regulatory content
            - Each section should contain relevant detail with specific data, methodologies, and regulatory compliance analysis
            - Include detailed subsections with quantitative data, analytical methods, regulatory justification, and compliance documentation
            - Provide complete regulatory rationale and scientific justification according to Russian Federation standards
            - Reference specific Russian regulatory requirements, Roszdravnadzor guidelines, Russian Pharmacopoeia, and Federal laws
            - Include both Russian terminology (in Cyrillic) and detailed English explanations
            - Incorporate specific Russian market considerations, healthcare system requirements, and patient population characteristics
            - Address Russian manufacturing standards, import requirements, and post-marketing obligations

            STRUCTURE FOR RUSSIAN REGISTRATION DOSSIER:
            1. АДМИНИСТРАТИВНАЯ ИНФОРМАЦИЯ И ИНСТРУКЦИЯ ПО ПРИМЕНЕНИЮ (Administrative information)
               1.1. Обзор заявления (Application Overview) - Complete regulatory pathway analysis and submission strategy
               1.2. Предлагаемая инструкция по применению (Proposed Instructions for Use) - Detailed Russian labeling and prescribing information
            2. ИНФОРМАЦИЯ О КАЧЕСТВЕ (Quality information)
               2.1. Лекарственное вещество (Drug Substance) - Comprehensive chemical and analytical characterization
               2.2. Лекарственный препарат (Drug Product) - Detailed formulation, manufacturing, and quality control
               2.3. Российское производство или импорт (Russian Manufacturing or Import) - Complete regulatory compliance framework
            3. ДОКЛИНИЧЕСКАЯ ИНФОРМАЦИЯ (Non-clinical information)
               3.1. Фармакология и фармакокинетика - Comprehensive preclinical pharmacology package
               3.2. Токсикология - Detailed toxicological assessment and safety evaluation
            4. КЛИНИЧЕСКАЯ ИНФОРМАЦИЯ (Clinical information)
               4.1. Клинический обзор (Clinical Overview) - Complete clinical development summary
               4.2. Клиническая эффективность (Clinical Efficacy) - Detailed efficacy analysis and statistical evaluation
               4.3. Клиническая безопасность (Clinical Safety) - Comprehensive safety profile and risk assessment
               4.4. Оценка соотношения польза-риск для российской популяции - Detailed benefit-risk analysis for Russian patients
            5. ОСОБЕННОСТИ ДЛЯ РОССИЙСКОГО РЫНКА (Russian market specifics) - Complete Russian market analysis and regulatory considerations

            Use plain text formatting only - NO MARKDOWN.
            Include extensive Russian terminology with detailed English explanations.
            Reference Russian regulatory framework and Roszdravnadzor requirements comprehensively.`
          },
          {
            role: "user",
            content: `Generate a comprehensive Russian Registration Dossier for drug registration of ${diseaseData.disease_name} treatment in Russia.
            
            ${Object.entries(diseaseData.additional_parameters || {}).map(([key, value]) => 
              value ? `- ${key.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}: ${value}` : ''
            ).filter(Boolean).join('\n')}

            This registration dossier must meet Roszdravnadzor requirements for Russian marketing authorization with detailed regulatory analysis and professional documentation suitable for regulatory submission. Each section should be well-developed with specific details, regulatory rationale, and compliance documentation.`
          }
        ],
        ...OPENAI_CONFIG.COMPREHENSIVE
      });
      return { document_content: response.data.choices[0].message.content.trim() };
    } catch (error) {
      console.error('Error in generateRD_RU:', error.response?.data || error.message);
      throw error;
    }
  },

  /**
   * Russian GMP Certificate - ENHANCED
   */
  generateGMP_RU: async (diseaseData) => {
    try {
      const response = await openaiApi.post('chat/completions', {
        model: "gpt-4o", // UPGRADED
        messages: [
          {
            role: "system",
            content: `You are a quality assurance expert with 25+ years of experience specializing in Russian GMP certification requirements and deep knowledge of Russian manufacturing standards.
            
            Your task is generate comprehensive supporting documentation for Russian GMP certificate application that meets professional standards for manufacturing authorization in the Russian Federation.

            CONTENT REQUIREMENTS:
            - Generate well-structured Russian GMP regulatory content
            - Each section should contain relevant detail with specific quality systems, procedures, and regulatory compliance analysis
            - Include detailed subsections with quality data, validation protocols, regulatory justification, and compliance documentation
            - Provide complete regulatory rationale and quality assurance justification according to Russian GMP standards
            - Reference specific Russian GMP requirements, Roszdravnadzor guidelines, Russian manufacturing standards, and Federal regulations
            - Include both Russian terminology (in Cyrillic) and detailed English explanations
            - Incorporate specific Russian manufacturing requirements, quality standards, and inspection preparedness
            - Address Russian validation requirements, documentation standards, and quality assurance obligations

            STRUCTURE FOR RUSSIAN GMP CERTIFICATE DOCUMENTATION:
            1. ОБЩАЯ ИНФОРМАЦИЯ О ПРОИЗВОДСТВЕ (General manufacturing information)
               1.1. Информация о производственной площадке (Manufacturing Site Information) - Complete facility description and qualification
               1.2. Организационная структура (Organizational Structure) - Detailed personnel qualifications and responsibilities
               1.3. Система качества (Quality System) - Comprehensive quality management system documentation
            2. ПРОИЗВОДСТВЕННЫЕ ПРОЦЕССЫ (Manufacturing processes)
               2.1. Описание производственного процесса (Manufacturing Process Description) - Complete process validation and control
               2.2. Контроль качества (Quality Control) - Detailed analytical methods and quality testing
               2.3. Валидация процессов (Process Validation) - Comprehensive validation protocols and documentation
            3. СООТВЕТСТВИЕ РОССИЙСКИМ GMP ТРЕБОВАНИЯМ (Russian GMP compliance)
               3.1. Соответствие российским стандартам (Compliance with Russian Standards) - Complete regulatory compliance framework
               3.2. Система документооборота (Documentation System) - Detailed documentation control and record keeping
               3.3. Обучение персонала (Personnel Training) - Comprehensive training programs and qualifications
            4. ПЛАН ИНСПЕКЦИИ И АУДИТА (Inspection and audit plan) - Complete inspection preparedness and audit protocols

            Use plain text formatting only - NO MARKDOWN.
            Include extensive Russian terminology with detailed English explanations.
            Reference Russian GMP requirements and manufacturing standards comprehensively.`
          },
          {
            role: "user",
            content: `Generate comprehensive Russian GMP Certificate supporting documentation for manufacturing authorization of ${diseaseData.disease_name} treatment in Russia.
            
            ${Object.entries(diseaseData.additional_parameters || {}).map(([key, value]) => 
              value ? `- ${key.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}: ${value}` : ''
            ).filter(Boolean).join('\n')}

            This documentation must support GMP certification requirements for Russian manufacturing authorization with detailed quality analysis and professional documentation suitable for regulatory submission. Each section should be well-developed with specific details, quality rationale, and compliance documentation.`
          }
        ],
        ...OPENAI_CONFIG.COMPREHENSIVE
      });
      return { document_content: response.data.choices[0].message.content.trim() };
    } catch (error) {
      console.error('Error in generateGMP_RU:', error.response?.data || error.message);
      throw error;
    }
  },

  // =============================================================================
  // EU DOCUMENTS
  // =============================================================================

  /**
   * EU CTA (Clinical Trial Application) - ENHANCED
   */
  /**
   * EU CTA (Clinical Trial Application) - Section-Based Generation
   */
  generateCTA: async (diseaseData) => {
    return await openaiService.generateSectionBasedDocument('cta', diseaseData);
  },
  
  /**
   * EU MAA (Marketing Authorization Application) - ENHANCED
   */
  /**
   * EU MAA (Marketing Authorization Application) - Section-Based Generation
   */
  generateMAA: async (diseaseData) => {
    return await openaiService.generateSectionBasedDocument('maa', diseaseData);
  },

  /**
   * EU IMPD (Investigational Medicinal Product Dossier) - Section-Based Generation
   */
  generateIMPD: async (diseaseData) => {
    return await openaiService.generateSectionBasedDocument('impd', diseaseData);
  },

  // =============================================================================
  // CANADA DOCUMENTS - ENHANCED
  // =============================================================================

  /**
   * Canadian Clinical Trial Application (Health Canada) - ENHANCED
   */
  generateCTA_CA: async (diseaseData) => {
    try {
      const response = await openaiApi.post('chat/completions', {
        model: "gpt-4o", // UPGRADED
        messages: [
          {
            role: "system",
            content: `You are a regulatory affairs expert specializing in Canadian Clinical Trial Applications for submission to Health Canada.
            Your task is to generate key sections of a Canadian CTA, following Health Canada requirements and guidelines.

            CRITICAL REQUIREMENTS FOR EXTREMELY DETAILED OUTPUT:
            - Generate comprehensive, well-structured Canadian regulatory content
            - Each section must contain extensive detail with specific methodologies, procedures, and regulatory compliance analysis
            - Include detailed subsections with quantitative data, protocols, and regulatory justification
            - Provide complete regulatory rationale and scientific justification according to Health Canada standards
            - Reference specific Health Canada guidelines, regulations, and Canadian regulatory framework extensively

            STRUCTURE FOR CANADIAN CTA (EXTREMELY DETAILED):
            1. APPLICATION SUMMARY - Complete submission overview and regulatory strategy
               1.1. Trial Information (Title, Phase, Health Canada Control Number if available)
               1.2. Sponsor and Principal Investigator Information
               1.3. Study Overview
            2. INVESTIGATIONAL PRODUCT INFORMATION - Comprehensive product characterization
               2.1. Product Description and Classification
               2.2. Quality Information Summary (Manufacturing, Specifications)
               2.3. Non-clinical Summary
               2.4. Previous Clinical Experience
            3. CLINICAL TRIAL PROTOCOL SYNOPSIS - Detailed protocol summary
               3.1. Study Objectives and Design
               3.2. Patient Population and Eligibility
               3.3. Treatment Plan and Duration
               3.4. Efficacy and Safety Assessments
            4. INVESTIGATOR QUALIFICATIONS AND SITE INFORMATION - Complete site documentation
            5. ETHICS AND REGULATORY COMPLIANCE - Comprehensive compliance framework

            Use plain text formatting only - NO MARKDOWN.
            Reference Health Canada guidelines and requirements where appropriate.`
          },
          {
            role: "user",
            content: `Generate a EXTREMELY DETAILED Canadian Clinical Trial Application (Health Canada) for ${diseaseData.disease_name}.
            
            ${Object.entries(diseaseData.additional_parameters || {}).map(([key, value]) => 
              value ? `- ${key.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}: ${value}` : ''
            ).filter(Boolean).join('\n')}

            This CTA must meet Health Canada requirements and include all necessary sections for Canadian clinical trial authorization with EXTREMELY DETAILED content and EXTREMELY DETAILED regulatory analysis.`
          }
        ],
        ...OPENAI_CONFIG.COMPREHENSIVE
      });
      return { document_content: response.data.choices[0].message.content.trim() };
    } catch (error) {
      console.error('Error in generateCTA_CA:', error.response?.data || error.message);
      throw error;
    }
  },

  /**
   * Canadian New Drug Submission (NDS) - ENHANCED
   */
  generateNDS: async (diseaseData) => {
    try {
      const response = await openaiApi.post('chat/completions', {
        model: "gpt-4o",
        messages: [
          {
            role: "system",
            content: `You are a senior regulatory affairs expert with extensive experience in preparing New Drug Submissions (NDS) for Health Canada.
            Your task is to generate a EXTREMELY DETAILED NDS SUMMARY document following Canadian regulatory requirements.

            CRITICAL REQUIREMENTS FOR EXTREMELY DETAILED OUTPUT:
            - Generate comprehensive, well-structured Canadian regulatory content
            - Each section must contain extensive detail with specific data, methodologies, and regulatory compliance analysis
            - Include detailed subsections with quantitative data, analytical methods, and regulatory justification
            - Provide complete regulatory rationale and scientific justification according to Health Canada standards
            - Reference specific Health Canada guidance documents, regulations, and Canadian regulatory framework extensively

            STRUCTURE FOR CANADIAN NDS (EXTREMELY DETAILED):
            1. ADMINISTRATIVE INFORMATION AND PRODUCT MONOGRAPH SUMMARY
               1.1. Application Overview - Complete regulatory pathway and submission strategy
               1.2. Proposed Product Monograph Highlights - Detailed Canadian labeling and prescribing information
            2. QUALITY INFORMATION SUMMARY
               2.1. Drug Substance Summary - Comprehensive chemical and analytical characterization
               2.2. Drug Product Summary - Detailed formulation, manufacturing, and quality control
               2.3. Canadian Manufacturing and Quality Considerations - Complete regulatory compliance framework
            3. NON-CLINICAL INFORMATION SUMMARY
               3.1. Pharmacology and Pharmacokinetics Summary - Comprehensive preclinical pharmacology package
               3.2. Toxicology Summary - Detailed toxicological assessment and safety evaluation
            4. CLINICAL INFORMATION SUMMARY
               4.1. Clinical Overview - Complete clinical development summary
               4.2. Clinical Efficacy Summary - Detailed efficacy analysis and statistical evaluation
               4.3. Clinical Safety Summary - Comprehensive safety profile and risk assessment
               4.4. Benefit-Risk Assessment for Canadian Population - Detailed benefit-risk analysis for Canadian patients
            5. RISK MANAGEMENT SUMMARY - Complete risk management and pharmacovigilance plan

            Use plain text formatting only - NO MARKDOWN.
            Reference Health Canada guidance documents and Canadian regulatory framework.`
          },
          {
            role: "user",
            content: `Generate a EXTREMELY DETAILED New Drug Submission (NDS) summary for Health Canada approval of ${diseaseData.disease_name} treatment.
            
            ${Object.entries(diseaseData.additional_parameters || {}).map(([key, value]) => 
              value ? `- ${key.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}: ${value}` : ''
            ).filter(Boolean).join('\n')}

            This NDS summary must meet Health Canada expectations and demonstrate compliance with Canadian regulatory requirements with EXTREMELY DETAILED content and EXTREMELY DETAILED regulatory analysis.`
          }
        ],
        temperature: 0.2,
        max_tokens: 8000
      });
      return { document_content: response.data.choices[0].message.content.trim() };
    } catch (error) {
      console.error('Error in generateNDS:', error.response?.data || error.message);
      throw error;
    }
  },

  /**
   * Canadian Notice of Compliance (NOC) - ENHANCED
   */
  generateNOC: async (diseaseData) => {
    try {
      const response = await openaiApi.post('chat/completions', {
        model: "gpt-4o",
        messages: [
          {
            role: "system",
            content: `You are a regulatory affairs expert specializing in Canadian Notice of Compliance (NOC) applications for Health Canada.
            Your task is to generate key documentation supporting an NOC application.

            CRITICAL REQUIREMENTS FOR EXTREMELY DETAILED OUTPUT:
            - Generate comprehensive, well-structured Canadian NOC regulatory content
            - Each section must contain extensive detail with specific authorization data, methodologies, and regulatory compliance analysis
            - Include detailed subsections with quality data, clinical evidence, and regulatory justification
            - Provide complete regulatory rationale and marketing authorization justification according to Health Canada standards
            - Reference specific Health Canada NOC requirements, regulations, and Canadian marketing authorization framework extensively

            STRUCTURE FOR NOC SUPPORTING DOCUMENTATION (EXTREMELY DETAILED):
            1. NOC APPLICATION OVERVIEW
               1.1. Product Information - Complete product characterization and regulatory classification
               1.2. Authorization Request Summary - Detailed marketing authorization strategy
               1.3. Regulatory Pathway (New Drug Submission, Abbreviated New Drug Submission, etc.) - Complete pathway analysis
            2. QUALITY DOCUMENTATION SUMMARY
               2.1. Product Quality Profile - Comprehensive quality assessment and control strategy
               2.2. Manufacturing Authorization Summary - Detailed manufacturing compliance and oversight
               2.3. Specifications and Testing Summary - Complete analytical control and release strategy
            3. CLINICAL DATA SUMMARY (if applicable)
               3.1. Efficacy Data Summary - Detailed clinical efficacy evidence and analysis
               3.2. Safety Data Summary - Comprehensive safety profile and risk assessment
               3.3. Comparative Studies (if biosimilar or generic) - Complete comparability assessment
            4. LABELING AND PRODUCT MONOGRAPH
               4.1. Proposed Canadian Product Monograph - Detailed prescribing information and labeling
               4.2. Patient Information Summary - Comprehensive patient education materials
            5. POST-MARKET COMMITMENTS - Complete post-authorization obligations and monitoring

            Use plain text formatting only - NO MARKDOWN.
            Focus on Canadian marketing authorization requirements.`
          },
          {
            role: "user",
            content: `Generate Notice of Compliance (NOC) supporting documentation for Canadian marketing authorization of ${diseaseData.disease_name} treatment.
            
            ${Object.entries(diseaseData.additional_parameters || {}).map(([key, value]) => 
              value ? `- ${key.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}: ${value}` : ''
            ).filter(Boolean).join('\n')}

            This NOC documentation must support Canadian marketing authorization and demonstrate regulatory compliance with EXTREMELY DETAILED content and EXTREMELY DETAILED regulatory analysis.`
          }
        ],
        temperature: 0.2,
        max_tokens: 8000
      });
      return { document_content: response.data.choices[0].message.content.trim() };
    } catch (error) {
      console.error('Error in generateNOC:', error.response?.data || error.message);
      throw error;
    }
  },

  // =============================================================================
  // MEXICO DOCUMENTS - ENHANCED
  // =============================================================================

  /**
   * COFEPRIS Clinical Trial Authorization - ENHANCED
   */
  generateCOFEPRIS_CTA: async (diseaseData) => {
    try {
      const response = await openaiApi.post('chat/completions', {
        model: "gpt-4o",
        messages: [
          {
            role: "system",
            content: `You are a regulatory affairs expert specializing in COFEPRIS (Mexican health authority) clinical trial authorizations.
            Your task is to generate key sections for a COFEPRIS Clinical Trial Authorization application.

            CRITICAL REQUIREMENTS FOR EXTREMELY DETAILED OUTPUT:
            - Generate comprehensive, well-structured Mexican regulatory content
            - Each section must contain extensive detail with specific methodologies, procedures, and regulatory compliance analysis
            - Include detailed subsections with quantitative data, protocols, and regulatory justification
            - Provide complete regulatory rationale and scientific justification according to COFEPRIS standards
            - Reference specific Mexican regulatory requirements, COFEPRIS guidelines, and Mexican healthcare framework extensively
            - Include both Spanish terminology and detailed English explanations

            STRUCTURE FOR COFEPRIS CTA (EXTREMELY DETAILED):
            1. INFORMACION ADMINISTRATIVA (Administrative Information) - COMPREHENSIVE
               1.1. Información del Estudio (Study Information) - Complete study design and regulatory framework
               1.2. Patrocinador y Investigador Principal (Sponsor and Principal Investigator) - Detailed qualifications and regulatory standing
               1.3. Sitios de Investigación en México (Mexican Investigation Sites) - Complete site information and qualifications
            2. INFORMACION DEL PRODUCTO INVESTIGACIONAL - EXTREMELY DETAILED
               2.1. Descripción del Producto (Product Description) - Comprehensive product characterization
               2.2. Información de Calidad (Quality Information) - Detailed quality control and Mexican compliance
               2.3. Información No-Clínica (Non-clinical Information) - Complete preclinical package
               2.4. Experiencia Clínica Previa (Previous Clinical Experience) - Comprehensive clinical data analysis
            3. PROTOCOLO DE INVESTIGACION - EXTREMELY DETAILED
               3.1. Objetivos y Diseño del Estudio (Study Objectives and Design) - Complete methodology and statistical planning
               3.2. Población y Criterios de Selección (Population and Selection Criteria) - Detailed demographic and clinical criteria
               3.3. Plan de Tratamiento (Treatment Plan) - Comprehensive treatment protocols and monitoring
               3.4. Evaluaciones de Eficacia y Seguridad (Efficacy and Safety Evaluations) - Detailed assessment protocols
            4. CONSIDERACIONES ETICAS Y REGULATORIAS MEXICANAS - Complete Mexican regulatory compliance framework

            Use plain text formatting only - NO MARKDOWN.
            Reference Mexican regulatory requirements and COFEPRIS guidelines.`
          },
          {
            role: "user",
            content: `Generate a COFEPRIS Clinical Trial Authorization application for ${diseaseData.disease_name} research in Mexico.
            
            ${Object.entries(diseaseData.additional_parameters || {}).map(([key, value]) => 
              value ? `- ${key.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}: ${value}` : ''
            ).filter(Boolean).join('\n')}

            This application must meet COFEPRIS requirements for clinical trial authorization in Mexico with EXTREMELY DETAILED content and EXTREMELY DETAILED regulatory analysis.`
          }
        ],
        temperature: 0.2,
        max_tokens: 8000
      });
      return { document_content: response.data.choices[0].message.content.trim() };
    } catch (error) {
      console.error('Error in generateCOFEPRIS_CTA:', error.response?.data || error.message);
      throw error;
    }
  },

  /**
   * COFEPRIS New Drug Registration - ENHANCED
   */
  generateCOFEPRIS_NDA: async (diseaseData) => {
    try {
      const response = await openaiApi.post('chat/completions', {
        model: "gpt-4o",
        messages: [
          {
            role: "system",
            content: `You are a senior regulatory affairs expert with experience in COFEPRIS new drug registrations for the Mexican market.
            Your task is to generate a EXTREMELY DETAILED summary for COFEPRIS new drug registration.

            CRITICAL REQUIREMENTS FOR EXTREMELY DETAILED OUTPUT:
            - Generate comprehensive, well-structured Mexican regulatory content
            - Each section must contain extensive detail with specific data, methodologies, and regulatory compliance analysis
            - Include detailed subsections with quantitative data, analytical methods, and regulatory justification
            - Provide complete regulatory rationale and marketing authorization justification according to COFEPRIS standards
            - Reference specific Mexican regulatory framework, COFEPRIS requirements, and Mexican healthcare considerations extensively
            - Include both Spanish terminology and detailed English explanations

            STRUCTURE FOR COFEPRIS NEW DRUG REGISTRATION (EXTREMELY DETAILED):
            1. INFORMACION ADMINISTRATIVA Y ETIQUETADO
               1.1. Resumen de la Solicitud (Application Summary) - Complete regulatory strategy and submission overview
               1.2. Etiquetado Propuesto (Proposed Labeling) - Detailed Mexican labeling and prescribing information
            2. INFORMACION DE CALIDAD
               2.1. Sustancia Activa (Active Substance) - Comprehensive chemical and analytical characterization
               2.2. Producto Terminado (Finished Product) - Detailed formulation, manufacturing, and quality control
               2.3. Manufactura en México o Importación (Mexican Manufacturing or Import) - Complete regulatory compliance framework
            3. INFORMACION NO-CLINICA
               3.1. Farmacología y Farmacocinética - Comprehensive preclinical pharmacology package
               3.2. Toxicología - Detailed toxicological assessment and safety evaluation
            4. INFORMACION CLINICA
               4.1. Resumen de Eficacia Clínica - Detailed clinical efficacy evidence and analysis
               4.2. Resumen de Seguridad Clínica - Comprehensive safety profile and risk assessment
               4.3. Evaluación Beneficio-Riesgo para Población Mexicana - Detailed benefit-risk analysis for Mexican patients
            5. CONSIDERACIONES ESPECIALES PARA MEXICO - Complete Mexican market analysis and regulatory considerations

            Use plain text formatting only - NO MARKDOWN.
            Reference Mexican regulatory framework and COFEPRIS requirements.`
          },
          {
            role: "user",
            content: `Generate a COFEPRIS New Drug Registration summary for marketing authorization of ${diseaseData.disease_name} treatment in Mexico.
            
            ${Object.entries(diseaseData.additional_parameters || {}).map(([key, value]) => 
              value ? `- ${key.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}: ${value}` : ''
            ).filter(Boolean).join('\n')}

            This registration summary must meet COFEPRIS requirements for Mexican marketing authorization with EXTREMELY DETAILED content and EXTREMELY DETAILED regulatory analysis.`
          }
        ],
        temperature: 0.2,
        max_tokens: 8000
      });
      return { document_content: response.data.choices[0].message.content.trim() };
    } catch (error) {
      console.error('Error in generateCOFEPRIS_NDA:', error.response?.data || error.message);
      throw error;
    }
  },

  // =============================================================================
  // UNITED KINGDOM DOCUMENTS - ENHANCED
  // =============================================================================

  /**
   * UK Clinical Trial Authorisation (MHRA) - ENHANCED
   */
  generateCTA_UK: async (diseaseData) => {
    try {
      const response = await openaiApi.post('chat/completions', {
        model: "gpt-4o",
        messages: [
          {
            role: "system",
            content: `You are a regulatory affairs expert specializing in UK Clinical Trial Authorisations for submission to the MHRA post-Brexit.
            Your task is to generate key sections for a UK CTA application.

            CRITICAL REQUIREMENTS FOR EXTREMELY DETAILED OUTPUT:
            - Generate comprehensive, well-structured UK regulatory content
            - Each section must contain extensive detail with specific methodologies, procedures, and regulatory compliance analysis
            - Include detailed subsections with quantitative data, protocols, and regulatory justification
            - Provide complete regulatory rationale and scientific justification according to MHRA standards
            - Reference specific UK/MHRA guidelines, post-Brexit regulatory framework, and UK healthcare considerations extensively

            STRUCTURE FOR UK CTA (EXTREMELY DETAILED):
            1. APPLICATION OVERVIEW
               1.1. Trial Information (Title, EudraCT number if transitional, MHRA reference) - Complete study identification and regulatory framework
               1.2. Sponsor and Principal Investigator Information - Detailed qualifications and UK regulatory standing
               1.3. Study Overview and UK-specific considerations - Comprehensive study design and UK healthcare integration
            2. INVESTIGATIONAL MEDICINAL PRODUCT INFORMATION
               2.1. Product Description and Classification - Comprehensive product characterization and UK regulatory classification
               2.2. Quality Information Summary (UK GMP compliance) - Detailed quality control and UK manufacturing standards
               2.3. Non-clinical Summary - Complete preclinical package with UK regulatory analysis
               2.4. Previous Clinical Experience - Comprehensive global and UK-relevant clinical data
            3. CLINICAL TRIAL PROTOCOL SYNOPSIS (UK-FOCUSED)
               3.1. Study Objectives and Design - Complete methodology and statistical planning
               3.2. UK Patient Population and Eligibility - Detailed demographic analysis and UK healthcare considerations
               3.3. Treatment Plan and Duration - Comprehensive treatment protocols and monitoring
               3.4. Efficacy and Safety Assessments - Detailed assessment protocols and UK-specific considerations
            4. UK INVESTIGATOR QUALIFICATIONS AND SITE INFORMATION - Complete UK site documentation and qualifications
            5. MHRA AND ETHICS COMPLIANCE - Comprehensive UK regulatory and ethical compliance framework

            Use plain text formatting only - NO MARKDOWN.
            Reference UK/MHRA guidelines and post-Brexit regulatory framework.`
          },
          {
            role: "user",
            content: `Generate a UK Clinical Trial Authorisation (MHRA) application for ${diseaseData.disease_name} research.
            
            ${Object.entries(diseaseData.additional_parameters || {}).map(([key, value]) => 
              value ? `- ${key.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}: ${value}` : ''
            ).filter(Boolean).join('\n')}

            This application must meet MHRA requirements for clinical trial authorization in the UK post-Brexit with EXTREMELY DETAILED content and EXTREMELY DETAILED regulatory analysis.`
          }
        ],
        temperature: 0.2,
        max_tokens: 8000
      });
      return { document_content: response.data.choices[0].message.content.trim() };
    } catch (error) {
      console.error('Error in generateCTA_UK:', error.response?.data || error.message);
      throw error;
    }
  },

  /**
   * UK Marketing Authorisation (MHRA) - ENHANCED
   */
  generateMA_UK: async (diseaseData) => {
    try {
      const response = await openaiApi.post('chat/completions', {
        model: "gpt-4o",
        messages: [
          {
            role: "system",
            content: `You are a senior regulatory affairs expert with experience in UK Marketing Authorisation applications for MHRA submission.
            Your task is to generate a EXTREMELY DETAILED summary for UK marketing authorization.

            CRITICAL REQUIREMENTS FOR EXTREMELY DETAILED OUTPUT:
            - Generate comprehensive, well-structured UK regulatory content
            - Each section must contain extensive detail with specific data, methodologies, and regulatory compliance analysis
            - Include detailed subsections with quantitative data, analytical methods, and regulatory justification
            - Provide complete regulatory rationale and marketing authorization justification according to MHRA standards
            - Reference specific UK regulatory framework, MHRA guidelines, and post-Brexit UK healthcare considerations extensively

            STRUCTURE FOR UK MARKETING AUTHORISATION (EXTREMELY DETAILED):
            1. ADMINISTRATIVE INFORMATION AND SUMMARY OF PRODUCT CHARACTERISTICS (SmPC)
               1.1. Application Overview - Complete regulatory strategy and UK submission framework
               1.2. Proposed UK SmPC Highlights - Detailed UK prescribing information and labeling
            2. QUALITY INFORMATION SUMMARY
               2.1. Drug Substance Summary - Comprehensive chemical and analytical characterization
               2.2. Drug Product Summary (UK-specific manufacturing considerations) - Detailed formulation and UK manufacturing compliance
            3. NON-CLINICAL INFORMATION SUMMARY
               3.1. Pharmacology and Pharmacokinetics Summary - Comprehensive preclinical pharmacology package
               3.2. Toxicology Summary - Detailed toxicological assessment and safety evaluation
            4. CLINICAL INFORMATION SUMMARY
               4.1. Clinical Overview - Complete clinical development summary
               4.2. Clinical Efficacy Summary (relevance to UK population) - Detailed efficacy analysis for UK healthcare context
               4.3. Clinical Safety Summary - Comprehensive safety profile and risk assessment
               4.4. Benefit-Risk Assessment for UK Population - Detailed benefit-risk analysis for UK patients
            5. UK-SPECIFIC REGULATORY CONSIDERATIONS - Complete UK regulatory framework and post-Brexit considerations

            Use plain text formatting only - NO MARKDOWN.
            Reference UK regulatory framework and MHRA guidelines.`
          },
          {
            role: "user",
            content: `Generate a UK Marketing Authorisation summary for MHRA approval of ${diseaseData.disease_name} treatment.
            
            ${Object.entries(diseaseData.additional_parameters || {}).map(([key, value]) => 
              value ? `- ${key.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}: ${value}` : ''
            ).filter(Boolean).join('\n')}

            This summary must meet MHRA expectations for UK marketing authorization with EXTREMELY DETAILED content and EXTREMELY DETAILED regulatory analysis.`
          }
        ],
        temperature: 0.2,
        max_tokens: 8000
      });
      return { document_content: response.data.choices[0].message.content.trim() };
    } catch (error) {
      console.error('Error in generateMA_UK:', error.response?.data || error.message);
      throw error;
    }
  },

  /**
   * UK Voluntary Scheme for Branded Medicines Pricing - ENHANCED
   */
  generateVIE: async (diseaseData) => {
    try {
      const response = await openaiApi.post('chat/completions', {
        model: "gpt-4o",
        messages: [
          {
            role: "system",
            content: `You are a regulatory and market access expert specializing in UK pricing and access frameworks.
            Your task is to generate documentation for the UK Voluntary Scheme for Branded Medicines Pricing and Access.

            CRITICAL REQUIREMENTS FOR EXTREMELY DETAILED OUTPUT:
            - Generate comprehensive, well-structured UK pricing and access content
            - Each section must contain extensive detail with specific economic data, methodologies, and access analysis
            - Include detailed subsections with health economic data, budget impact analysis, and access justification
            - Provide complete economic rationale and value demonstration according to UK healthcare standards
            - Reference specific UK health technology assessment, NICE considerations, and NHS framework extensively

            STRUCTURE FOR UK PRICING AND ACCESS (EXTREMELY DETAILED):
            1. PRODUCT AND PRICING OVERVIEW
               1.1. Product Information and Classification - Complete therapeutic and economic characterization
               1.2. Proposed Pricing Structure - Detailed pricing strategy and economic justification
               1.3. Value Proposition Summary - Comprehensive value demonstration and economic analysis
            2. CLINICAL AND ECONOMIC EVIDENCE
               2.1. Clinical Efficacy and Safety Evidence - Detailed clinical evidence base and outcomes analysis
               2.2. Health Economic Analysis - Comprehensive pharmacoeconomic evaluation and cost-effectiveness analysis
               2.3. Budget Impact Assessment - Detailed NHS budget impact and resource utilization analysis
            3. COMPARATIVE EFFECTIVENESS
               3.1. Comparison with Current Standard of Care - Complete comparative effectiveness and economic evaluation
               3.2. Place in Therapy Analysis - Detailed therapeutic positioning and clinical pathway integration
            4. ACCESS AND IMPLEMENTATION
               4.1. Patient Access Strategy - Comprehensive access plan and implementation framework
               4.2. Implementation Considerations for NHS - Detailed NHS integration and operational considerations
            5. RISK SHARING AND OUTCOME AGREEMENTS - Complete outcomes-based pricing and risk-sharing frameworks

            Use plain text formatting only - NO MARKDOWN.
            Reference UK health technology assessment and NICE considerations.`
          },
          {
            role: "user",
            content: `Generate UK Voluntary Scheme documentation for pricing and access of ${diseaseData.disease_name} treatment.
            
            ${Object.entries(diseaseData.additional_parameters || {}).map(([key, value]) => 
              value ? `- ${key.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}: ${value}` : ''
            ).filter(Boolean).join('\n')}

            This documentation must support pricing and access negotiations in the UK healthcare system with EXTREMELY DETAILED content and EXTREMELY DETAILED economic analysis.`
          }
        ],
        temperature: 0.2,
        max_tokens: 8000
      });
      return { document_content: response.data.choices[0].message.content.trim() };
    } catch (error) {
      console.error('Error in generateVIE:', error.response?.data || error.message);
      throw error;
    }
  },

  // =============================================================================
  // SWITZERLAND DOCUMENTS - ENHANCED
  // =============================================================================

  /**
   * Swiss Clinical Trial Authorisation (Swissmedic) - ENHANCED
   */
  generateCTA_CH: async (diseaseData) => {
    try {
      const response = await openaiApi.post('chat/completions', {
        model: "gpt-4o",
        messages: [
          {
            role: "system",
            content: `You are a regulatory affairs expert specializing in Swiss clinical trial authorizations for Swissmedic submission.
            Your task is to generate key sections for a Swiss CTA application.

            CRITICAL REQUIREMENTS FOR EXTREMELY DETAILED OUTPUT:
            - Generate comprehensive, well-structured Swiss regulatory content
            - Each section must contain extensive detail with specific methodologies, procedures, and regulatory compliance analysis
            - Include detailed subsections with quantitative data, protocols, and regulatory justification
            - Provide complete regulatory rationale and scientific justification according to Swissmedic standards
            - Reference specific Swiss regulatory requirements, Swissmedic guidelines, and Swiss healthcare framework extensively
            - Include both German terminology and detailed English explanations

            STRUCTURE FOR SWISS CTA (EXTREMELY DETAILED):
            1. ANTRAGSUBERSICHT (Application Overview)
               1.1. Studieninformationen (Study Information) - Complete study design and Swiss regulatory framework
               1.2. Sponsor und Hauptpruferin (Sponsor and Principal Investigator) - Detailed qualifications and Swiss regulatory standing
               1.3. Schweizer Standorte (Swiss Sites) - Complete Swiss site information and qualifications
            2. PRUFPRAPARAT-INFORMATIONEN (Investigational Product Information)
               2.1. Produktbeschreibung (Product Description) - Comprehensive product characterization
               2.2. Qualitatsinformationen (Quality Information) - Detailed quality control and Swiss compliance
               2.3. Nicht-klinische Zusammenfassung (Non-clinical Summary) - Complete preclinical package
               2.4. Fruehere klinische Erfahrung (Previous Clinical Experience) - Comprehensive clinical data analysis
            3. KLINISCHES STUDIENPROTOKOLL (Clinical Study Protocol Synopsis)
               3.1. Studienziele und -design (Study Objectives and Design) - Complete methodology and statistical planning
               3.2. Schweizer Patientenpopulation (Swiss Patient Population) - Detailed demographic and Swiss healthcare considerations
               3.3. Behandlungsplan (Treatment Plan) - Comprehensive treatment protocols and monitoring
               3.4. Wirksamkeits- und Sicherheitsbewertungen (Efficacy and Safety Assessments) - Detailed assessment protocols
            4. SCHWEIZER REGULATORISCHE UBERLEGUNGEN - Complete Swiss regulatory compliance framework

            Use plain text formatting only - NO MARKDOWN.
            Reference Swiss regulatory requirements and Swissmedic guidelines.`
          },
          {
            role: "user",
            content: `Generate a Swiss Clinical Trial Authorisation (Swissmedic) application for ${diseaseData.disease_name} research.
            
            ${Object.entries(diseaseData.additional_parameters || {}).map(([key, value]) => 
              value ? `- ${key.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}: ${value}` : ''
            ).filter(Boolean).join('\n')}

            This application must meet Swissmedic requirements for clinical trial authorization in Switzerland with EXTREMELY DETAILED content and EXTREMELY DETAILED regulatory analysis.`
          }
        ],
        temperature: 0.2,
        max_tokens: 8000
      });
      return { document_content: response.data.choices[0].message.content.trim() };
    } catch (error) {
      console.error('Error in generateCTA_CH:', error.response?.data || error.message);
      throw error;
    }
  },

  /**
   * Swiss Marketing Authorisation (Swissmedic) - ENHANCED
   */
  generateMA_CH: async (diseaseData) => {
    try {
      const response = await openaiApi.post('chat/completions', {
        model: "gpt-4o",
        messages: [
          {
            role: "system",
            content: `You are a senior regulatory affairs expert with experience in Swiss marketing authorizations for Swissmedic.
            Your task is to generate a EXTREMELY DETAILED summary for Swiss drug registration.

            CRITICAL REQUIREMENTS FOR EXTREMELY DETAILED OUTPUT:
            - Generate comprehensive, well-structured Swiss regulatory content
            - Each section must contain extensive detail with specific data, methodologies, and regulatory compliance analysis
            - Include detailed subsections with quantitative data, analytical methods, and regulatory justification
            - Provide complete regulatory rationale and marketing authorization justification according to Swissmedic standards
            - Reference specific Swiss regulatory framework, Swissmedic guidelines, and Swiss healthcare considerations extensively
            - Include both German terminology and detailed English explanations

            STRUCTURE FOR SWISS MARKETING AUTHORISATION (EXTREMELY DETAILED):
            1. ADMINISTRATIVE INFORMATIONEN UND FACHINFORMATIONEN
               1.1. Antragsubersicht (Application Overview) - Complete regulatory strategy and Swiss submission framework
               1.2. Vorgeschlagene Fachinformationen (Proposed Professional Information) - Detailed Swiss prescribing information
            2. QUALITATSINFORMATIONEN
               2.1. Wirkstoff-Zusammenfassung (Drug Substance Summary) - Comprehensive chemical and analytical characterization
               2.2. Arzneimittel-Zusammenfassung (Drug Product Summary) - Detailed formulation and Swiss manufacturing compliance
            3. NICHT-KLINISCHE INFORMATIONEN
               3.1. Pharmakologie und Pharmakokinetik - Comprehensive preclinical pharmacology package
               3.2. Toxikologie - Detailed toxicological assessment and safety evaluation
            4. KLINISCHE INFORMATIONEN
               4.1. Klinische Ubersicht (Clinical Overview) - Complete clinical development summary
               4.2. Klinische Wirksamkeit (Clinical Efficacy) - Detailed efficacy analysis for Swiss healthcare context
               4.3. Klinische Sicherheit (Clinical Safety) - Comprehensive safety profile and risk assessment
               4.4. Nutzen-Risiko-Bewertung fur Schweizer Population - Detailed benefit-risk analysis for Swiss patients
            5. SCHWEIZER BESONDERHEITEN - Complete Swiss regulatory framework and market considerations

            Use plain text formatting only - NO MARKDOWN.
            Reference Swiss regulatory framework and Swissmedic guidelines.`
          },
          {
            role: "user",
            content: `Generate a Swiss Marketing Authorisation summary for Swissmedic approval of ${diseaseData.disease_name} treatment.
            
            ${Object.entries(diseaseData.additional_parameters || {}).map(([key, value]) => 
              value ? `- ${key.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}: ${value}` : ''
            ).filter(Boolean).join('\n')}

            This summary must meet Swissmedic expectations for Swiss marketing authorization with EXTREMELY DETAILED content and EXTREMELY DETAILED regulatory analysis.`
          }
        ],
        temperature: 0.2,
        max_tokens: 8000
      });
      return { document_content: response.data.choices[0].message.content.trim() };
    } catch (error) {
      console.error('Error in generateMA_CH:', error.response?.data || error.message);
      throw error;
    }
  },

  // =============================================================================

  // =============================================================================
  // JAPAN DOCUMENTS - ENHANCED
  // =============================================================================

  /**
   * Japanese Clinical Trial Notification (CTN) - ENHANCED
   */
  generateCTN_JP: async (diseaseData) => {
    try {
      const response = await openaiApi.post('chat/completions', {
        model: "gpt-4o",
        messages: [
          {
            role: "system",
            content: `You are a regulatory affairs expert specializing in Japanese Clinical Trial Notifications (CTNs) for submission to the PMDA.
            Your task is to generate KEY SECTIONS of a Japanese CTN. This is a notification, not a full application dossier like an IND.

            CRITICAL REQUIREMENTS FOR EXTREMELY DETAILED OUTPUT:
            - Generate comprehensive, well-structured Japanese regulatory content
            - Each section must contain extensive detail with specific methodologies, procedures, and Japanese regulatory compliance analysis
            - Include detailed subsections with quantitative data, protocols, and regulatory justification
            - Provide complete regulatory rationale and scientific justification according to PMDA standards
            - Reference specific Japanese regulatory requirements, PMDA guidelines, and Japanese healthcare framework extensively

            KEY SECTIONS FOR A JAPANESE CTN SUMMARY (EXTREMELY DETAILED):
            1.  NOTIFICATION OVERVIEW
                1.1. Trial Title (Japanese and English if available) - Complete study identification and regulatory framework
                1.2. Investigational Product Name / Code - Detailed product characterization and classification
                1.3. Sponsor Information - Comprehensive sponsor qualifications and Japanese regulatory standing
                1.4. Phase of Trial - Complete phase justification and regulatory pathway
                1.5. Planned Number of Sites and Subjects in Japan - Detailed Japanese study population and site strategy
            2.  INVESTIGATIONAL PRODUCT INFORMATION SUMMARY - EXTREMELY DETAILED
                2.1. Brief Description (Type, class, proposed indication) - Comprehensive product characterization
                2.2. Manufacturing Summary (Manufacturer, GMP compliance statement) - Detailed quality and manufacturing compliance
                2.3. Brief Quality Summary (Key specifications, stability overview) - Complete quality control framework
                2.4. Brief Non-clinical Summary (Key findings supporting safety for human trials) - Comprehensive preclinical safety package
                2.5. Brief Clinical Summary (Previous human experience, if any) - Detailed global and Japanese-relevant clinical data
            3.  CLINICAL TRIAL PROTOCOL SYNOPSIS (JAPAN-SPECIFIC) - EXTREMELY DETAILED
                3.1. Objectives - Complete study objectives and Japanese regulatory alignment
                3.2. Study Design (e.g., randomized, placebo-controlled) - Detailed methodology and statistical planning
                3.3. Target Population and Key Eligibility Criteria - Comprehensive Japanese patient population analysis
                3.4. Investigational Plan (Dosage, route, duration) - Complete treatment protocols and monitoring
                3.5. Key Efficacy and Safety Endpoints - Detailed endpoint definitions and Japanese regulatory considerations
                3.6. Statistical Considerations (Briefly, sample size rationale) - Complete statistical framework and power analysis
            4.  LIST OF INVESTIGATIONAL SITES IN JAPAN (Illustrative) - Complete Japanese site information and qualifications
            5.  CONTACT INFORMATION FOR PMDA QUERIES - Comprehensive regulatory contact framework

            Use plain text formatting only - NO MARKDOWN.`
          },
          {
            role: "user",
            content: `Generate key sections for a Japanese Clinical Trial Notification (CTN) for a trial on ${diseaseData.disease_name}.
            
            ${Object.entries(diseaseData.additional_parameters || {}).map(([key, value]) => 
              value ? `- ${key.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}: ${value}` : ''
            ).filter(Boolean).join('\n')}

            Generate EXTREMELY DETAILED content for the key CTN sections reflecting PMDA submission requirements with EXTREMELY DETAILED regulatory analysis.`
          }
        ],
        temperature: 0.2,
        max_tokens: 8000
      });
      return { document_content: response.data.choices[0].message.content.trim() };
    } catch (error) {
      console.error('Error in generateCTN_JP:', error.response?.data || error.message);
      throw error;
    }
  },

  /**
   * Japanese New Drug Application (J-NDA) - ENHANCED
   */
  generateJNDA: async (diseaseData) => {
    try {
      const response = await openaiApi.post('chat/completions', {
        model: "gpt-4o",
        messages: [
          {
            role: "system",
            content: `You are a senior regulatory affairs expert with extensive experience in preparing Japanese New Drug Applications (J-NDAs) for submission to the PMDA/MHLW.
            Your task is to generate a J-NDA SUMMARY document. This should highlight key information structured similarly to the CTD, but with consideration for Japanese regulatory expectations.

            CRITICAL REQUIREMENTS FOR EXTREMELY DETAILED OUTPUT:
            - Generate comprehensive, well-structured Japanese regulatory content
            - Each section must contain extensive detail with specific data, methodologies, and Japanese regulatory compliance analysis
            - Include detailed subsections with quantitative data, analytical methods, and regulatory justification
            - Provide complete regulatory rationale and marketing authorization justification according to PMDA standards
            - Reference specific Japanese regulatory guidelines, PMDA requirements, and Japanese healthcare framework extensively
            - Emphasize data relevant to Japanese population and bridging strategies

            STRUCTURE (CTD-based, with J-NDA considerations) (EXTREMELY DETAILED):
            1. ADMINISTRATIVE INFORMATION AND PROPOSED PACKAGE INSERT SUMMARY (Japanese 'Tensu-Bunsho')
               - Complete Japanese regulatory submission framework and labeling strategy
            2. GAIYOU (OVERALL SUMMARY OF QUALITY - CTD Module 2.3)
               - Comprehensive quality assessment and Japanese manufacturing compliance
            3. NONCLINICAL OVERVIEW AND SUMMARY (CTD Modules 2.4 & 2.6)
               - Detailed preclinical package with Japanese regulatory analysis
            4. CLINICAL OVERVIEW AND SUMMARY (CTD Modules 2.5 & 2.7 - EMPHASIZE JAPANESE DATA)
               - Complete clinical development summary with Japanese population focus
            5. KEY JAPANESE CLINICAL STUDY REPORT SUMMARIES
               - Detailed Japanese clinical evidence and bridging strategy analysis

            Use plain text formatting only - NO MARKDOWN.
            Reference Japanese regulatory guidelines and emphasize data relevant to the Japanese population.`
          },
          {
            role: "user",
            content: `Generate a EXTREMELY DETAILED J-NDA SUMMARY document for ${diseaseData.disease_name}.
            
            ${Object.entries(diseaseData.additional_parameters || {}).map(([key, value]) => 
              value ? `- ${key.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}: ${value}` : ''
            ).filter(Boolean).join('\n')}

            This J-NDA SUMMARY must be EXTREMELY DETAILED and meet PMDA expectations, emphasizing data relevant to the Japanese population and bridging strategies with EXTREMELY DETAILED regulatory analysis.`
          }
        ],
        temperature: 0.2,
        max_tokens: 8000
      });
      return { document_content: response.data.choices[0].message.content.trim() };
    } catch (error) {
      console.error('Error in generateJNDA:', error.response?.data || error.message);
      throw error;
    }
  },

  /**
   * PMDA Scientific Advice - ENHANCED
   */
  generatePMDA_CONSULTATION: async (diseaseData) => {
    try {
      const response = await openaiApi.post('chat/completions', {
        model: "gpt-4o",
        messages: [
          {
            role: "system",
            content: `You are a regulatory strategy expert specializing in PMDA scientific advice consultations.
            Your task is to generate a PMDA scientific advice request document.

            CRITICAL REQUIREMENTS FOR EXTREMELY DETAILED OUTPUT:
            - Generate comprehensive, well-structured PMDA consultation content
            - Each section must contain extensive detail with specific strategic questions, methodologies, and regulatory analysis
            - Include detailed subsections with development data, strategic rationale, and regulatory justification
            - Provide complete regulatory strategy and scientific justification according to PMDA standards
            - Reference specific Japanese regulatory requirements, PMDA guidelines, and Japanese development considerations extensively

            STRUCTURE FOR PMDA SCIENTIFIC ADVICE (EXTREMELY DETAILED):
            1. CONSULTATION REQUEST OVERVIEW
               1.1. Product and Development Background - Complete product characterization and development history
               1.2. Specific Questions for PMDA - Detailed strategic questions and regulatory consultation objectives
               1.3. Regulatory Strategy Context - Comprehensive regulatory pathway analysis and strategic framework
            2. DEVELOPMENT PROGRAM SUMMARY
               2.1. Current Development Status - Complete development portfolio and regulatory standing
               2.2. Planned Clinical Development (Japan-specific considerations) - Detailed Japanese development strategy
               2.3. Global Development Strategy - Comprehensive global regulatory and development framework
            3. SPECIFIC SCIENTIFIC QUESTIONS
               3.1. Clinical Development Questions - Detailed clinical strategy and regulatory consultation objectives
               3.2. Regulatory Pathway Questions - Comprehensive regulatory strategy and pathway optimization
               3.3. Japanese Bridging Strategy - Complete bridging strategy and Japanese population considerations
            4. SUPPORTING DATA AND RATIONALE
               4.1. Available Non-clinical Data - Comprehensive preclinical package and Japanese regulatory analysis
               4.2. Available Clinical Data - Detailed clinical evidence and Japanese relevance assessment
               4.3. Relevance to Japanese Population - Complete Japanese population analysis and bridging rationale
            5. REQUESTED PMDA GUIDANCE - Comprehensive regulatory guidance requests and strategic objectives

            Use plain text formatting only - NO MARKDOWN.
            Focus on strategic regulatory questions relevant to Japanese development.`
          },
          {
            role: "user",
            content: `Generate a PMDA Scientific Advice request for development strategy of ${diseaseData.disease_name} treatment in Japan.
            
            ${Object.entries(diseaseData.additional_parameters || {}).map(([key, value]) => 
              value ? `- ${key.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}: ${value}` : ''
            ).filter(Boolean).join('\n')}

            This consultation request must address strategic development questions for Japanese regulatory pathway with EXTREMELY DETAILED content and EXTREMELY DETAILED regulatory analysis.`
          }
        ],
        temperature: 0.2,
        max_tokens: 8000
      });
      return { document_content: response.data.choices[0].message.content.trim() };
    } catch (error) {
      console.error('Error in generatePMDA_CONSULTATION:', error.response?.data || error.message);
      throw error;
    }
  },

  // =============================================================================
  // CHINA DOCUMENTS - ENHANCED
  // =============================================================================

  /**
   * Chinese IND Application - ENHANCED
   */
  generateIND_CH: async (diseaseData) => {
    try {
      const response = await openaiApi.post('chat/completions', {
        model: "gpt-4o",
        messages: [
          {
            role: "system",
            content: `You are a regulatory affairs expert specializing in Chinese Investigational New Drug (IND) applications for submission to the NMPA.
            Your task is to generate KEY SECTIONS of a Chinese IND application. The structure may differ from US INDs, focusing on specific NMPA requirements.

            CRITICAL REQUIREMENTS FOR EXTREMELY DETAILED OUTPUT:
            - Generate comprehensive, well-structured Chinese regulatory content
            - Each section must contain extensive detail with specific methodologies, procedures, and Chinese regulatory compliance analysis
            - Include detailed subsections with quantitative data, protocols, and regulatory justification
            - Provide complete regulatory rationale and scientific justification according to NMPA standards
            - Reference specific Chinese regulatory requirements, NMPA guidelines, and Chinese healthcare framework extensively
            - Include both Chinese terminology and detailed English explanations

            KEY SECTIONS FOR A CHINESE IND SUMMARY (EXTREMELY DETAILED):
            1.  APPLICATION OVERVIEW
                1.1. Drug Name (Chinese and English if available), Dosage Form, Strength - Complete product identification and classification
                1.2. Applicant Information - Comprehensive applicant qualifications and Chinese regulatory standing
                1.3. Proposed Indication - Detailed therapeutic area and Chinese market analysis
                1.4. Phase of Clinical Trial - Complete phase justification and regulatory pathway
            2.  INVESTIGATIONAL PRODUCT INFORMATION SUMMARY - EXTREMELY DETAILED
                2.1. Manufacturing and Quality Control (Summary of CMC, highlighting local testing if applicable) - Comprehensive quality framework
                2.2. Pharmacology and Toxicology Summary (Key non-clinical data, reference to any studies conducted in China or on similar populations) - Complete preclinical package
                2.3. Previous Clinical Experience (Global and any data from Chinese subjects) - Detailed clinical evidence and Chinese relevance
            3.  CLINICAL TRIAL PROTOCOL SYNOPSIS (CHINA-FOCUSED) - EXTREMELY DETAILED
                3.1. Trial Objectives and Endpoints - Complete study objectives and Chinese regulatory alignment
                3.2. Study Design (Considerations for Chinese patient population) - Detailed methodology and Chinese healthcare integration
                3.3. Subject Selection Criteria (Specific to Chinese context if needed) - Comprehensive Chinese patient population analysis
                3.4. Treatment Plan (Dosage, administration, duration) - Complete treatment protocols and monitoring
                3.5. Efficacy and Safety Assessment Plan - Detailed assessment protocols and Chinese regulatory considerations
                3.6. Risk Management Plan Highlights for Chinese Patients - Complete risk management framework for Chinese population
            4.  INVESTIGATOR'S BROCHURE SUMMARY (Key points relevant to Chinese investigators) - Comprehensive investigator information
            5.  ETHICS COMMITTEE APPROVAL STATUS - Complete Chinese ethical and regulatory compliance framework

            Use plain text formatting only - NO MARKDOWN.`
          },
          {
            role: "user",
            content: `Generate key sections for a Chinese IND application for a trial on ${diseaseData.disease_name}.
            
            ${Object.entries(diseaseData.additional_parameters || {}).map(([key, value]) => 
              value ? `- ${key.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}: ${value}` : ''
            ).filter(Boolean).join('\n')}

            Generate EXTREMELY DETAILED content for key Chinese IND sections, reflecting NMPA expectations and highlighting aspects relevant to the Chinese context with EXTREMELY DETAILED regulatory analysis.`
          }
        ],
        temperature: 0.2,
        max_tokens: 8000
      });
      return { document_content: response.data.choices[0].message.content.trim() };
    } catch (error) {
      console.error('Error in generateIND_CH:', error.response?.data || error.message);
      throw error;
    }
  },

  /**
   * Chinese NDA Application - ENHANCED
   */
  generateNDA_CH: async (diseaseData) => {
    try {
      const response = await openaiApi.post('chat/completions', {
        model: "gpt-4o",
        messages: [
          {
            role: "system",
            content: `You are a senior regulatory affairs expert with extensive experience in preparing Chinese New Drug Applications (NDAs) for submission to the NMPA.
            Your task is to generate a Chinese NDA SUMMARY document. This should be structured according to NMPA expectations, which may draw from CTD principles but have local nuances.

            CRITICAL REQUIREMENTS FOR EXTREMELY DETAILED OUTPUT:
            - Generate comprehensive, well-structured Chinese regulatory content
            - Each section must contain extensive detail with specific data, methodologies, and Chinese regulatory compliance analysis
            - Include detailed subsections with quantitative data, analytical methods, and regulatory justification
            - Provide complete regulatory rationale and marketing authorization justification according to NMPA standards
            - Reference specific Chinese regulatory guidelines, NMPA requirements, and Chinese healthcare framework extensively
            - Emphasize data from Chinese patients and alignment with NMPA guidelines

            STRUCTURE (CTD-based, with NMPA considerations) (EXTREMELY DETAILED):
            1. ADMINISTRATIVE INFORMATION AND PROPOSED DRUG INSERT SUMMARY
               - Complete Chinese regulatory submission framework and labeling strategy
            2. QUALITY INFORMATION SUMMARY (CMC)
               - Comprehensive quality assessment and Chinese manufacturing compliance
            3. NONCLINICAL STUDY SUMMARY
               - Detailed preclinical package with Chinese regulatory analysis
            4. CLINICAL STUDY SUMMARY (EMPHASIZE DATA IN CHINESE PATIENTS)
               - Complete clinical development summary with Chinese population focus
            5. KEY CLINICAL TRIAL SUMMARIES (Trials conducted in China, or pivotal global trials with significant Chinese cohort)
               - Detailed Chinese clinical evidence and regulatory analysis

            Use plain text formatting only - NO MARKDOWN.
            Reference Chinese regulatory guidelines and emphasize data from Chinese patients and alignment with NMPA guidelines.`
          },
          {
            role: "user",
            content: `Generate a EXTREMELY DETAILED Chinese NDA SUMMARY document for ${diseaseData.disease_name}.
            
            ${Object.entries(diseaseData.additional_parameters || {}).map(([key, value]) => 
              value ? `- ${key.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}: ${value}` : ''
            ).filter(Boolean).join('\n')}

            This Chinese NDA SUMMARY must be EXTREMELY DETAILED and meet NMPA expectations, emphasizing data from Chinese patients and alignment with NMPA guidelines with EXTREMELY DETAILED regulatory analysis.`
          }
        ],
        temperature: 0.2,
        max_tokens: 8000
      });
      return { document_content: response.data.choices[0].message.content.trim() };
    } catch (error) {
      console.error('Error in generateNDA_CH:', error.response?.data || error.message);
      throw error;
    }
  },

  /**
   * Chinese Drug Registration Certificate - ENHANCED
   */
  generateDRUG_LICENSE_CH: async (diseaseData) => {
    try {
      const response = await openaiApi.post('chat/completions', {
        model: "gpt-4o",
        messages: [
          {
            role: "system",
            content: `You are a regulatory affairs expert specializing in Chinese drug registration certificates for NMPA approval.
            Your task is to generate supporting documentation for Chinese drug license application.

            CRITICAL REQUIREMENTS FOR EXTREMELY DETAILED OUTPUT:
            - Generate comprehensive, well-structured Chinese drug licensing content
            - Each section must contain extensive detail with specific licensing data, methodologies, and Chinese regulatory compliance analysis
            - Include detailed subsections with quality data, clinical evidence, and regulatory justification
            - Provide complete regulatory rationale and commercialization justification according to NMPA standards
            - Reference specific Chinese regulatory framework, NMPA requirements, and Chinese market considerations extensively
            - Include both Chinese terminology and detailed English explanations

            STRUCTURE FOR CHINESE DRUG REGISTRATION CERTIFICATE (EXTREMELY DETAILED):
            1. 药品注册申请概述 (Drug Registration Application Overview)
               1.1. 产品信息 (Product Information) - Complete product characterization and Chinese market analysis
               1.2. 申请人信息 (Applicant Information) - Comprehensive applicant qualifications and Chinese regulatory standing
               1.3. 注册分类 (Registration Classification) - Detailed regulatory classification and pathway analysis
            2. 药品质量信息 (Drug Quality Information)
               2.1. 原料药信息 (API Information) - Comprehensive chemical and analytical characterization
               2.2. 制剂信息 (Formulation Information) - Detailed formulation and Chinese manufacturing compliance
               2.3. 中国生产或进口 (Chinese Manufacturing or Import) - Complete regulatory compliance framework
            3. 非临床研究信息 (Non-clinical Study Information)
               3.1. 药理毒理研究 (Pharmacology and Toxicology Studies) - Comprehensive preclinical package
               3.2. 药代动力学研究 (Pharmacokinetic Studies) - Detailed pharmacokinetic analysis and Chinese population considerations
            4. 临床试验信息 (Clinical Trial Information)
               4.1. 临床试验总结 (Clinical Trial Summary) - Complete clinical development summary
               4.2. 中国临床数据 (Chinese Clinical Data) - Detailed Chinese clinical evidence and analysis
               4.3. 获益风险评估 (Benefit-Risk Assessment) - Comprehensive benefit-risk analysis for Chinese patients
            5. 中国特殊考虑 (China-Specific Considerations) - Complete Chinese market analysis and regulatory considerations

            Use plain text formatting only - NO MARKDOWN.
            Reference Chinese regulatory framework and NMPA requirements for drug licensing.`
          },
          {
            role: "user",
            content: `Generate Chinese Drug Registration Certificate supporting documentation for ${diseaseData.disease_name} treatment licensing in China.
            
            ${Object.entries(diseaseData.additional_parameters || {}).map(([key, value]) => 
              value ? `- ${key.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}: ${value}` : ''
            ).filter(Boolean).join('\n')}

            This documentation must support drug registration certificate requirements for Chinese commercialization with EXTREMELY DETAILED content and EXTREMELY DETAILED regulatory analysis.`
          }
        ],
        temperature: 0.2,
        max_tokens: 8000
      });
      return { document_content: response.data.choices[0].message.content.trim() };
    } catch (error) {
      console.error('Error in generateDRUG_LICENSE_CH:', error.response?.data || error.message);
      throw error;
    }
  },

  // =============================================================================
  // SOUTH KOREA DOCUMENTS - ENHANCED
  // =============================================================================

  /**
   * Korean IND Application - ENHANCED
   */
  generateIND_KR: async (diseaseData) => {
    try {
      const response = await openaiApi.post('chat/completions', {
        model: "gpt-4o",
        messages: [
          {
            role: "system",
            content: `You are a regulatory affairs expert specializing in Korean Investigational New Drug (IND) applications for submission to the MFDS.
            Your task is to generate key sections for a Korean IND application.

            CRITICAL REQUIREMENTS FOR EXTREMELY DETAILED OUTPUT:
            - Generate comprehensive, well-structured Korean regulatory content
            - Each section must contain extensive detail with specific methodologies, procedures, and Korean regulatory compliance analysis
            - Include detailed subsections with quantitative data, protocols, and regulatory justification
            - Provide complete regulatory rationale and scientific justification according to MFDS standards
            - Reference specific Korean regulatory requirements, MFDS guidelines, and Korean healthcare framework extensively
            - Include both Korean terminology and detailed English explanations

            STRUCTURE FOR KOREAN IND (EXTREMELY DETAILED):
            1. 임상시험계획서 개요 (Clinical Trial Protocol Overview)
               1.1. 시험약물 정보 (Investigational Drug Information) - Complete product characterization and Korean regulatory classification
               1.2. 의뢰자 및 주요 연구자 정보 (Sponsor and Principal Investigator Information) - Detailed qualifications and Korean regulatory standing
               1.3. 한국 임상시험 개요 (Korean Clinical Trial Overview) - Comprehensive study design and Korean healthcare integration
            2. 시험약물 정보 (Investigational Product Information)
               2.1. 약물 설명 및 분류 (Drug Description and Classification) - Comprehensive product characterization
               2.2. 품질 정보 요약 (Quality Information Summary) - Detailed quality control and Korean compliance
               2.3. 비임상 정보 요약 (Non-clinical Information Summary) - Complete preclinical package
               2.4. 이전 임상 경험 (Previous Clinical Experience) - Comprehensive clinical data analysis
            3. 임상시험 프로토콜 개요 (Clinical Trial Protocol Synopsis)
               3.1. 연구 목적 및 설계 (Study Objectives and Design) - Complete methodology and statistical planning
               3.2. 한국 환자 집단 (Korean Patient Population) - Detailed Korean patient population analysis
               3.3. 치료 계획 (Treatment Plan) - Comprehensive treatment protocols and monitoring
               3.4. 유효성 및 안전성 평가 (Efficacy and Safety Assessment) - Detailed assessment protocols
            4. 한국 규제 고려사항 (Korean Regulatory Considerations) - Complete Korean regulatory compliance framework

            Use plain text formatting only - NO MARKDOWN.
            Reference Korean regulatory requirements and MFDS guidelines.`
          },
          {
            role: "user",
            content: `Generate a Korean IND application for ${diseaseData.disease_name} clinical trial in South Korea.
            
            ${Object.entries(diseaseData.additional_parameters || {}).map(([key, value]) => 
              value ? `- ${key.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}: ${value}` : ''
            ).filter(Boolean).join('\n')}

            This application must meet MFDS requirements for clinical trial authorization in South Korea with EXTREMELY DETAILED content and EXTREMELY DETAILED regulatory analysis.`
          }
        ],
        temperature: 0.2,
        max_tokens: 8000
      });
      return { document_content: response.data.choices[0].message.content.trim() };
    } catch (error) {
      console.error('Error in generateIND_KR:', error.response?.data || error.message);
      throw error;
    }
  },

  /**
   * Korean NDA Application - ENHANCED
   */
  generateNDA_KR: async (diseaseData) => {
    try {
      const response = await openaiApi.post('chat/completions', {
        model: "gpt-4o",
        messages: [
          {
            role: "system",
            content: `You are a senior regulatory affairs expert with experience in Korean New Drug Applications for MFDS submission.
           Your task is to generate a EXTREMELY DETAILED Korean NDA summary.

           CRITICAL REQUIREMENTS FOR EXTREMELY DETAILED OUTPUT:
           - Generate comprehensive, well-structured Korean regulatory content
           - Each section must contain extensive detail with specific data, methodologies, and Korean regulatory compliance analysis
           - Include detailed subsections with quantitative data, analytical methods, and regulatory justification
           - Provide complete regulatory rationale and marketing authorization justification according to MFDS standards
           - Reference specific Korean regulatory framework, MFDS requirements, and Korean healthcare considerations extensively
           - Include both Korean terminology and detailed English explanations

           STRUCTURE FOR KOREAN NDA (EXTREMELY DETAILED):
           1. 행정 정보 및 제품 정보 요약 (Administrative Information and Product Information Summary)
              1.1. 신청 개요 (Application Overview) - Complete regulatory strategy and Korean submission framework
              1.2. 제안된 제품 정보 (Proposed Product Information) - Detailed Korean labeling and prescribing information
           2. 품질 정보 요약 (Quality Information Summary)
              2.1. 원료의약품 요약 (Drug Substance Summary) - Comprehensive chemical and analytical characterization
              2.2. 완제의약품 요약 (Drug Product Summary) - Detailed formulation and Korean manufacturing compliance
           3. 비임상 정보 요약 (Non-clinical Information Summary)
              3.1. 약리학 및 약동학 요약 (Pharmacology and Pharmacokinetics Summary) - Comprehensive preclinical pharmacology package
              3.2. 독성학 요약 (Toxicology Summary) - Detailed toxicological assessment and safety evaluation
           4. 임상 정보 요약 (Clinical Information Summary)
              4.1. 임상 개요 (Clinical Overview) - Complete clinical development summary
              4.2. 임상 유효성 요약 (Clinical Efficacy Summary) - Detailed efficacy analysis for Korean healthcare context
              4.3. 임상 안전성 요약 (Clinical Safety Summary) - Comprehensive safety profile and risk assessment
              4.4. 한국 인구에 대한 이익-위험 평가 (Benefit-Risk Assessment for Korean Population) - Detailed benefit-risk analysis for Korean patients
           5. 한국 특별 고려사항 (Korea-Specific Considerations) - Complete Korean regulatory framework and market considerations

           Use plain text formatting only - NO MARKDOWN.
           Reference Korean regulatory framework and MFDS requirements.`
          },
          {
            role: "user",
            content: `Generate a Korean NDA summary for MFDS approval of ${diseaseData.disease_name} treatment.
           
           ${Object.entries(diseaseData.additional_parameters || {}).map(([key, value]) => 
              value ? `- ${key.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}: ${value}` : ''
           ).filter(Boolean).join('\n')}

           This NDA summary must meet MFDS expectations for Korean marketing authorization with EXTREMELY DETAILED content and EXTREMELY DETAILED regulatory analysis.`
          }
        ],
        temperature: 0.2,
        max_tokens: 8000
      });
      return { document_content: response.data.choices[0].message.content.trim() };
    } catch (error) {
      console.error('Error in generateNDA_KR:', error.response?.data || error.message);
      throw error;
    }
  },

  /**
   * Korean GMP Certificate - ENHANCED
   */
  generateKGMP: async (diseaseData) => {
    try {
      const response = await openaiApi.post('chat/completions', {
        model: "gpt-4o",
        messages: [
          {
            role: "system",
            content: `You are a quality assurance expert with experience in Korean GMP certification requirements for MFDS.
           Your task is to generate supporting documentation for Korean GMP certificate application.

           CRITICAL REQUIREMENTS FOR EXTREMELY DETAILED OUTPUT:
           - Generate comprehensive, well-structured Korean GMP regulatory content
           - Each section must contain extensive detail with specific quality systems, procedures, and Korean regulatory compliance analysis
           - Include detailed subsections with quality data, validation protocols, and regulatory justification
           - Provide complete regulatory rationale and quality assurance justification according to MFDS standards
           - Reference specific Korean GMP requirements, MFDS guidelines, and Korean manufacturing standards extensively
           - Include both Korean terminology and detailed English explanations

           STRUCTURE FOR KOREAN GMP CERTIFICATE (EXTREMELY DETAILED):
           1. 제조업체 일반 정보 (General Manufacturing Information)
              1.1. 제조시설 정보 (Manufacturing Facility Information) - Complete facility description and Korean qualification
              1.2. 조직 구조 (Organizational Structure) - Detailed personnel qualifications and Korean regulatory responsibilities
              1.3. 품질 시스템 (Quality System) - Comprehensive quality management system for Korean compliance
           2. 제조 공정 (Manufacturing Processes)
              2.1. 제조 공정 설명 (Manufacturing Process Description) - Complete process validation and Korean control standards
              2.2. 품질 관리 (Quality Control) - Detailed analytical methods and Korean quality testing requirements
              2.3. 공정 검증 (Process Validation) - Comprehensive validation protocols and Korean documentation standards
           3. 한국 GMP 요구사항 준수 (Korean GMP Requirements Compliance)
              3.1. 한국 표준 준수 (Korean Standards Compliance) - Complete Korean regulatory compliance framework
              3.2. 문서 시스템 (Documentation System) - Detailed Korean documentation control and record keeping
              3.3. 직원 교육 (Personnel Training) - Comprehensive Korean training programs and qualifications
           4. 검사 및 감사 준비 (Inspection and Audit Preparedness) - Complete Korean inspection preparedness and audit protocols

           Use plain text formatting only - NO MARKDOWN.
           Reference Korean GMP requirements and MFDS manufacturing standards.`
          },
          {
            role: "user",
            content: `Generate Korean GMP Certificate supporting documentation for manufacturing authorization of ${diseaseData.disease_name} treatment in South Korea.
           
           ${Object.entries(diseaseData.additional_parameters || {}).map(([key, value]) => 
              value ? `- ${key.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}: ${value}` : ''
           ).filter(Boolean).join('\n')}

           This documentation must support Korean GMP certification requirements with EXTREMELY DETAILED content and EXTREMELY DETAILED quality analysis.`
          }
        ],
        temperature: 0.2,
        max_tokens: 8000
      });
      return { document_content: response.data.choices[0].message.content.trim() };
    } catch (error) {
      console.error('Error in generateKGMP:', error.response?.data || error.message);
      throw error;
    }
  },

  // =============================================================================
  // AUSTRALIA DOCUMENTS - ENHANCED
  // =============================================================================

  /**
   * Australian Clinical Trial Notification (TGA) - ENHANCED
   */
  generateCTN_AU: async (diseaseData) => {
    try {
      const response = await openaiApi.post('chat/completions', {
        model: "gpt-4o",
        messages: [
          {
            role: "system",
            content: `You are a regulatory affairs expert specializing in Australian Clinical Trial Notifications for submission to the TGA.
           Your task is to generate key sections for an Australian CTN application.

           CRITICAL REQUIREMENTS FOR EXTREMELY DETAILED OUTPUT:
           - Generate comprehensive, well-structured Australian regulatory content
           - Each section must contain extensive detail with specific methodologies, procedures, and Australian regulatory compliance analysis
           - Include detailed subsections with quantitative data, protocols, and regulatory justification
           - Provide complete regulatory rationale and scientific justification according to TGA standards
           - Reference specific Australian regulatory requirements, TGA guidelines, and Australian healthcare framework extensively

           STRUCTURE FOR AUSTRALIAN CTN (EXTREMELY DETAILED):
           1. CTN APPLICATION OVERVIEW
              1.1. Trial Information (CTN number if available, Trial title) - Complete study identification and Australian regulatory framework
              1.2. Sponsor Information - Comprehensive sponsor qualifications and Australian regulatory standing
              1.3. Study Overview and Australian considerations - Detailed study design and Australian healthcare integration
           2. THERAPEUTIC GOODS INFORMATION
              2.1. Product Description and TGA Classification - Comprehensive product characterization and Australian regulatory classification
              2.2. Quality Information Summary (Australian GMP considerations) - Detailed quality control and Australian manufacturing standards
              2.3. Non-clinical Information Summary - Complete preclinical package with Australian regulatory analysis
              2.4. Previous Clinical Experience - Comprehensive global and Australian-relevant clinical data
           3. CLINICAL TRIAL PROTOCOL SYNOPSIS (AUSTRALIA-FOCUSED)
              3.1. Study Objectives and Design - Complete methodology and statistical planning
              3.2. Australian Patient Population and Eligibility - Detailed demographic analysis and Australian healthcare considerations
              3.3. Treatment Plan and Duration - Comprehensive treatment protocols and monitoring
              3.4. Efficacy and Safety Assessments - Detailed assessment protocols and Australian-specific considerations
           4. AUSTRALIAN INVESTIGATOR QUALIFICATIONS AND SITE INFORMATION
              4.1. Principal Investigator Information - Complete Australian investigator qualifications and experience
              4.2. Australian Site Information - Detailed Australian site capabilities and regulatory compliance
           5. TGA AND HREC COMPLIANCE - Comprehensive Australian regulatory and ethical compliance framework

           Use plain text formatting only - NO MARKDOWN.
           Reference Australian regulatory requirements and TGA guidelines.`
          },
          {
            role: "user",
            content: `Generate an Australian Clinical Trial Notification (CTN) for ${diseaseData.disease_name} research.
           
           ${Object.entries(diseaseData.additional_parameters || {}).map(([key, value]) => 
              value ? `- ${key.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}: ${value}` : ''
           ).filter(Boolean).join('\n')}

           This CTN must meet TGA requirements for clinical trial notification in Australia with EXTREMELY DETAILED content and EXTREMELY DETAILED regulatory analysis.`
          }
        ],
        temperature: 0.2,
        max_tokens: 8000
      });
      return { document_content: response.data.choices[0].message.content.trim() };
    } catch (error) {
      console.error('Error in generateCTN_AU:', error.response?.data || error.message);
      throw error;
    }
  },

  /**
   * Australian Submission (AUS) - ENHANCED
   */
  generateAUS: async (diseaseData) => {
    try {
      const response = await openaiApi.post('chat/completions', {
        model: "gpt-4o",
        messages: [
          {
            role: "system",
            content: `You are a senior regulatory affairs expert with experience in Australian submissions for TGA approval.
           Your task is to generate a EXTREMELY DETAILED AUS summary for ARTG registration.

           CRITICAL REQUIREMENTS FOR EXTREMELY DETAILED OUTPUT:
           - Generate comprehensive, well-structured Australian regulatory content
           - Each section must contain extensive detail with specific data, methodologies, and Australian regulatory compliance analysis
           - Include detailed subsections with quantitative data, analytical methods, and regulatory justification
           - Provide complete regulatory rationale and marketing authorization justification according to TGA standards
           - Reference specific Australian regulatory framework, TGA requirements, and Australian healthcare considerations extensively

           STRUCTURE FOR AUSTRALIAN SUBMISSION (EXTREMELY DETAILED):
           1. ADMINISTRATIVE INFORMATION AND PROPOSED PRODUCT INFORMATION
              1.1. Application Overview - Complete regulatory strategy and Australian submission framework
              1.2. Proposed Australian Product Information (PI) - Detailed Australian prescribing information and labeling
           2. QUALITY INFORMATION SUMMARY
              2.1. Drug Substance Summary - Comprehensive chemical and analytical characterization
              2.2. Drug Product Summary (Australian manufacturing considerations) - Detailed formulation and Australian manufacturing compliance
           3. NON-CLINICAL INFORMATION SUMMARY
              3.1. Pharmacology and Pharmacokinetics Summary - Comprehensive preclinical pharmacology package
              3.2. Toxicology Summary - Detailed toxicological assessment and safety evaluation
           4. CLINICAL INFORMATION SUMMARY
              4.1. Clinical Overview - Complete clinical development summary
              4.2. Clinical Efficacy Summary (relevance to Australian population) - Detailed efficacy analysis for Australian healthcare context
              4.3. Clinical Safety Summary - Comprehensive safety profile and risk assessment
              4.4. Benefit-Risk Assessment for Australian Population - Detailed benefit-risk analysis for Australian patients
           5. AUSTRALIAN-SPECIFIC REGULATORY CONSIDERATIONS - Complete Australian regulatory framework and TGA considerations

           Use plain text formatting only - NO MARKDOWN.
           Reference Australian regulatory framework and TGA requirements.`
          },
          {
            role: "user",
            content: `Generate an Australian Submission (AUS) summary for TGA approval and ARTG registration of ${diseaseData.disease_name} treatment.
           
           ${Object.entries(diseaseData.additional_parameters || {}).map(([key, value]) => 
              value ? `- ${key.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}: ${value}` : ''
           ).filter(Boolean).join('\n')}

           This AUS summary must meet TGA expectations for Australian marketing authorization with EXTREMELY DETAILED content and EXTREMELY DETAILED regulatory analysis.`
          }
        ],
        temperature: 0.2,
        max_tokens: 8000
      });
      return { document_content: response.data.choices[0].message.content.trim() };
    } catch (error) {
      console.error('Error in generateAUS:', error.response?.data || error.message);
      throw error;
    }
  },

  /**
   * TGA GMP Certificate - ENHANCED
   */
  generateTGA_GMP: async (diseaseData) => {
    try {
      const response = await openaiApi.post('chat/completions', {
        model: "gpt-4o",
        messages: [
          {
            role: "system",
            content: `You are a quality assurance expert with experience in TGA GMP certification requirements.
           Your task is to generate supporting documentation for TGA GMP certificate application.

           CRITICAL REQUIREMENTS FOR EXTREMELY DETAILED OUTPUT:
           - Generate comprehensive, well-structured Australian GMP regulatory content
           - Each section must contain extensive detail with specific quality systems, procedures, and Australian regulatory compliance analysis
           - Include detailed subsections with quality data, validation protocols, and regulatory justification
           - Provide complete regulatory rationale and quality assurance justification according to TGA standards
           - Reference specific Australian GMP requirements, TGA guidelines, and Australian manufacturing standards extensively

           STRUCTURE FOR TGA GMP CERTIFICATE (EXTREMELY DETAILED):
           1. MANUFACTURING FACILITY GENERAL INFORMATION
              1.1. Australian Manufacturing Site Information - Complete facility description and Australian qualification
              1.2. Organizational Structure - Detailed personnel qualifications and Australian regulatory responsibilities
              1.3. Quality System - Comprehensive quality management system for Australian compliance
           2. MANUFACTURING PROCESSES
              2.1. Manufacturing Process Description - Complete process validation and Australian control standards
              2.2. Quality Control - Detailed analytical methods and Australian quality testing requirements
              2.3. Process Validation - Comprehensive validation protocols and Australian documentation standards
           3. AUSTRALIAN GMP REQUIREMENTS COMPLIANCE
              3.1. Australian Standards Compliance - Complete Australian regulatory compliance framework
              3.2. Documentation System - Detailed Australian documentation control and record keeping
              3.3. Personnel Training - Comprehensive Australian training programs and qualifications
           4. TGA INSPECTION AND AUDIT PREPAREDNESS - Complete Australian inspection preparedness and audit protocols

           Use plain text formatting only - NO MARKDOWN.
           Reference Australian GMP requirements and TGA manufacturing standards.`
          },
          {
            role: "user",
            content: `Generate TGA GMP Certificate supporting documentation for Australian manufacturing authorization of ${diseaseData.disease_name} treatment.
           
           ${Object.entries(diseaseData.additional_parameters || {}).map(([key, value]) => 
              value ? `- ${key.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}: ${value}` : ''
           ).filter(Boolean).join('\n')}

           This documentation must support TGA GMP certification requirements with EXTREMELY DETAILED content and EXTREMELY DETAILED quality analysis.`
          }
        ],
        temperature: 0.2,
        max_tokens: 8000
      });
      return { document_content: response.data.choices[0].message.content.trim() };
    } catch (error) {
      console.error('Error in generateTGA_GMP:', error.response?.data || error.message);
      throw error;
    }
  },

  // =============================================================================
  // SINGAPORE DOCUMENTS - ENHANCED
  // =============================================================================

  /**
   * Singapore Clinical Trial Certificate (HSA) - ENHANCED
   */
  generateCTA_SG: async (diseaseData) => {
    try {
      const response = await openaiApi.post('chat/completions', {
        model: "gpt-4o",
        messages: [
          {
            role: "system",
            content: `You are a regulatory affairs expert specializing in Singapore Clinical Trial Certificates for HSA submission.
           Your task is to generate key sections for a Singapore CTC application.

           CRITICAL REQUIREMENTS FOR EXTREMELY DETAILED OUTPUT:
           - Generate comprehensive, well-structured Singapore regulatory content
           - Each section must contain extensive detail with specific methodologies, procedures, and Singapore regulatory compliance analysis
           - Include detailed subsections with quantitative data, protocols, and regulatory justification
           - Provide complete regulatory rationale and scientific justification according to HSA standards
           - Reference specific Singapore regulatory requirements, HSA guidelines, and Singapore healthcare framework extensively

           STRUCTURE FOR SINGAPORE CTC (EXTREMELY DETAILED):
           1. CTC APPLICATION OVERVIEW
              1.1. Trial Information (CTC reference, Trial title) - Complete study identification and Singapore regulatory framework
              1.2. Sponsor Information - Comprehensive sponsor qualifications and Singapore regulatory standing
              1.3. Study Overview and Singapore considerations - Detailed study design and Singapore healthcare integration
           2. INVESTIGATIONAL PRODUCT INFORMATION
              2.1. Product Description and HSA Classification - Comprehensive product characterization and Singapore regulatory classification
              2.2. Quality Information Summary (Singapore GMP considerations) - Detailed quality control and Singapore manufacturing standards
              2.3. Non-clinical Information Summary - Complete preclinical package with Singapore regulatory analysis
              2.4. Previous Clinical Experience - Comprehensive global and Singapore-relevant clinical data
           3. CLINICAL TRIAL PROTOCOL SYNOPSIS (SINGAPORE-FOCUSED)
              3.1. Study Objectives and Design - Complete methodology and statistical planning
              3.2. Singapore Patient Population and Eligibility - Detailed demographic analysis and Singapore healthcare considerations
              3.3. Treatment Plan and Duration - Comprehensive treatment protocols and monitoring
              3.4. Efficacy and Safety Assessments - Detailed assessment protocols and Singapore-specific considerations
           4. SINGAPORE INVESTIGATOR QUALIFICATIONS AND SITE INFORMATION
              4.1. Principal Investigator Information - Complete Singapore investigator qualifications and experience
              4.2. Singapore Site Information - Detailed Singapore site capabilities and regulatory compliance
           5. HSA AND IRB COMPLIANCE - Comprehensive Singapore regulatory and ethical compliance framework

           Use plain text formatting only - NO MARKDOWN.
           Reference Singapore regulatory requirements and HSA guidelines.`
          },
          {
            role: "user",
            content: `Generate a Singapore Clinical Trial Certificate (CTC) application for ${diseaseData.disease_name} research.
           
           ${Object.entries(diseaseData.additional_parameters || {}).map(([key, value]) => 
             value ? `- ${key.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}: ${value}` : ''
           ).filter(Boolean).join('\n')}

           This CTC must meet HSA requirements for clinical trial authorization in Singapore with EXTREMELY DETAILED content and EXTREMELY DETAILED regulatory analysis.`
          }
        ],
        temperature: 0.2,
        max_tokens: 8000
      });
      return { document_content: response.data.choices[0].message.content.trim() };
    } catch (error) {
      console.error('Error in generateCTA_SG:', error.response?.data || error.message);
      throw error;
    }
  },

  /**
   * Singapore Product License - ENHANCED
   */
  generatePRODUCT_LICENSE_SG: async (diseaseData) => {
    try {
      const response = await openaiApi.post('chat/completions', {
        model: "gpt-4o",
        messages: [
          {
            role: "system",
            content: `You are a senior regulatory affairs expert with experience in Singapore product licensing for HSA approval.
           Your task is to generate a EXTREMELY DETAILED product license summary.

           CRITICAL REQUIREMENTS FOR EXTREMELY DETAILED OUTPUT:
           - Generate comprehensive, well-structured Singapore regulatory content
           - Each section must contain extensive detail with specific data, methodologies, and Singapore regulatory compliance analysis
           - Include detailed subsections with quantitative data, analytical methods, and regulatory justification
           - Provide complete regulatory rationale and marketing authorization justification according to HSA standards
           - Reference specific Singapore regulatory framework, HSA requirements, and Singapore healthcare considerations extensively

           STRUCTURE FOR SINGAPORE PRODUCT LICENSE (EXTREMELY DETAILED):
           1. ADMINISTRATIVE INFORMATION AND PROPOSED PRODUCT INFORMATION
              1.1. Application Overview - Complete regulatory strategy and Singapore submission framework
              1.2. Proposed Singapore Product Information - Detailed Singapore prescribing information and labeling
           2. QUALITY INFORMATION SUMMARY
              2.1. Drug Substance Summary - Comprehensive chemical and analytical characterization
              2.2. Drug Product Summary (Singapore manufacturing considerations) - Detailed formulation and Singapore manufacturing compliance
           3. NON-CLINICAL INFORMATION SUMMARY
              3.1. Pharmacology and Pharmacokinetics Summary - Comprehensive preclinical pharmacology package
              3.2. Toxicology Summary - Detailed toxicological assessment and safety evaluation
           4. CLINICAL INFORMATION SUMMARY
              4.1. Clinical Overview - Complete clinical development summary
              4.2. Clinical Efficacy Summary (relevance to Singapore population) - Detailed efficacy analysis for Singapore healthcare context
              4.3. Clinical Safety Summary - Comprehensive safety profile and risk assessment
              4.4. Benefit-Risk Assessment for Singapore Population - Detailed benefit-risk analysis for Singapore patients
           5. SINGAPORE-SPECIFIC REGULATORY CONSIDERATIONS - Complete Singapore regulatory framework and HSA considerations

           Use plain text formatting only - NO MARKDOWN.
           Reference Singapore regulatory framework and HSA requirements.`
          },
          {
            role: "user",
            content: `Generate a Singapore Product License summary for HSA approval of ${diseaseData.disease_name} treatment.
           
           ${Object.entries(diseaseData.additional_parameters || {}).map(([key, value]) => 
              value ? `- ${key.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}: ${value}` : ''
           ).filter(Boolean).join('\n')}

           This product license summary must meet HSA expectations for Singapore marketing authorization with EXTREMELY DETAILED content and EXTREMELY DETAILED regulatory analysis.`
          }
        ],
        temperature: 0.2,
        max_tokens: 8000
      });
      return { document_content: response.data.choices[0].message.content.trim() };
    } catch (error) {
      console.error('Error in generatePRODUCT_LICENSE_SG:', error.response?.data || error.message);
      throw error;
    }
  },

  // =============================================================================
  // INDIA DOCUMENTS - ENHANCED
  // =============================================================================

  /**
   * Indian Clinical Trial Permission (CDSCO) - ENHANCED
   */
  generateCTA_IN: async (diseaseData) => {
    try {
      const response = await openaiApi.post('chat/completions', {
        model: "gpt-4o",
        messages: [
          {
            role: "system",
            content: `You are a regulatory affairs expert specializing in Indian Clinical Trial Permissions for CDSCO submission.
           Your task is to generate key sections for an Indian CTA application.

           CRITICAL REQUIREMENTS FOR EXTREMELY DETAILED OUTPUT:
           - Generate comprehensive, well-structured Indian regulatory content
           - Each section must contain extensive detail with specific methodologies, procedures, and Indian regulatory compliance analysis
           - Include detailed subsections with quantitative data, protocols, and regulatory justification
           - Provide complete regulatory rationale and scientific justification according to CDSCO standards
           - Reference specific Indian regulatory requirements, CDSCO guidelines, and Indian healthcare framework extensively

           STRUCTURE FOR INDIAN CTA (EXTREMELY DETAILED):
           1. CLINICAL TRIAL APPLICATION OVERVIEW
              1.1. Trial Information (CTRI registration, Trial title) - Complete study identification and Indian regulatory framework
              1.2. Sponsor Information - Comprehensive sponsor qualifications and Indian regulatory standing
              1.3. Study Overview and Indian considerations - Detailed study design and Indian healthcare integration
           2. INVESTIGATIONAL PRODUCT INFORMATION
              2.1. Product Description and CDSCO Classification - Comprehensive product characterization and Indian regulatory classification
              2.2. Quality Information Summary (Indian GMP considerations) - Detailed quality control and Indian manufacturing standards
              2.3. Non-clinical Information Summary - Complete preclinical package with Indian regulatory analysis
              2.4. Previous Clinical Experience - Comprehensive global and Indian-relevant clinical data
           3. CLINICAL TRIAL PROTOCOL SYNOPSIS (INDIA-FOCUSED)
              3.1. Study Objectives and Design - Complete methodology and statistical planning
              3.2. Indian Patient Population and Eligibility - Detailed demographic analysis and Indian healthcare considerations
              3.3. Treatment Plan and Duration - Comprehensive treatment protocols and monitoring
              3.4. Efficacy and Safety Assessments - Detailed assessment protocols and Indian-specific considerations
           4. INDIAN INVESTIGATOR QUALIFICATIONS AND SITE INFORMATION
              4.1. Principal Investigator Information - Complete Indian investigator qualifications and experience
              4.2. Indian Site Information - Detailed Indian site capabilities and regulatory compliance
           5. CDSCO AND ETHICS COMMITTEE COMPLIANCE - Comprehensive Indian regulatory and ethical compliance framework

           Use plain text formatting only - NO MARKDOWN.
           Reference Indian regulatory requirements and CDSCO guidelines.`
          },
          {
            role: "user",
            content: `Generate an Indian Clinical Trial Permission application for ${diseaseData.disease_name} research.
           
           ${Object.entries(diseaseData.additional_parameters || {}).map(([key, value]) => 
              value ? `- ${key.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}: ${value}` : ''
           ).filter(Boolean).join('\n')}

           This application must meet CDSCO requirements for clinical trial authorization in India with EXTREMELY DETAILED content and EXTREMELY DETAILED regulatory analysis.`
          }
        ],
        temperature: 0.2,
        max_tokens: 8000
      });
      return { document_content: response.data.choices[0].message.content.trim() };
    } catch (error) {
      console.error('Error in generateCTA_IN:', error.response?.data || error.message);
      throw error;
    }
  },

  /**
   * Indian New Drug Application - ENHANCED
   */
  generateNDA_IN: async (diseaseData) => {
    try {
      const response = await openaiApi.post('chat/completions', {
        model: "gpt-4o",
        messages: [
          {
            role: "system",
            content: `You are a senior regulatory affairs expert with experience in Indian New Drug Applications for CDSCO approval.
           Your task is to generate a EXTREMELY DETAILED Indian NDA summary.

           CRITICAL REQUIREMENTS FOR EXTREMELY DETAILED OUTPUT:
           - Generate comprehensive, well-structured Indian regulatory content
           - Each section must contain extensive detail with specific data, methodologies, and Indian regulatory compliance analysis
           - Include detailed subsections with quantitative data, analytical methods, and regulatory justification
           - Provide complete regulatory rationale and marketing authorization justification according to CDSCO standards
           - Reference specific Indian regulatory framework, CDSCO requirements, and Indian healthcare considerations extensively

           STRUCTURE FOR INDIAN NDA (EXTREMELY DETAILED):
           1. ADMINISTRATIVE INFORMATION AND PROPOSED PRODUCT INFORMATION
              1.1. Application Overview - Complete regulatory strategy and Indian submission framework
              1.2. Proposed Indian Product Information - Detailed Indian prescribing information and labeling
           2. QUALITY INFORMATION SUMMARY
              2.1. Drug Substance Summary - Comprehensive chemical and analytical characterization
              2.2. Drug Product Summary (Indian manufacturing considerations) - Detailed formulation and Indian manufacturing compliance
           3. NON-CLINICAL INFORMATION SUMMARY
              3.1. Pharmacology and Pharmacokinetics Summary - Comprehensive preclinical pharmacology package
              3.2. Toxicology Summary - Detailed toxicological assessment and safety evaluation
           4. CLINICAL INFORMATION SUMMARY
              4.1. Clinical Overview - Complete clinical development summary
              4.2. Clinical Efficacy Summary (relevance to Indian population) - Detailed efficacy analysis for Indian healthcare context
              4.3. Clinical Safety Summary - Comprehensive safety profile and risk assessment
              4.4. Benefit-Risk Assessment for Indian Population - Detailed benefit-risk analysis for Indian patients
           5. INDIAN-SPECIFIC REGULATORY CONSIDERATIONS - Complete Indian regulatory framework and CDSCO considerations

           Use plain text formatting only - NO MARKDOWN.
           Reference Indian regulatory framework and CDSCO requirements.`
          },
          {
            role: "user",
            content: `Generate an Indian New Drug Application summary for CDSCO approval of ${diseaseData.disease_name} treatment.
           
           ${Object.entries(diseaseData.additional_parameters || {}).map(([key, value]) => 
              value ? `- ${key.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}: ${value}` : ''
           ).filter(Boolean).join('\n')}

           This NDA summary must meet CDSCO expectations for Indian marketing authorization with EXTREMELY DETAILED content and EXTREMELY DETAILED regulatory analysis.`
          }
        ],
        temperature: 0.2,
        max_tokens: 8000
      });
      return { document_content: response.data.choices[0].message.content.trim() };
    } catch (error) {
      console.error('Error in generateNDA_IN:', error.response?.data || error.message);
      throw error;
    }
  },

  /**
   * Indian Import License - ENHANCED
   */
  generateIMPORT_LICENSE_IN: async (diseaseData) => {
    try {
      const response = await openaiApi.post('chat/completions', {
        model: "gpt-4o",
        messages: [
          {
            role: "system",
            content: `You are a regulatory affairs expert specializing in Indian import licenses for CDSCO approval.
           Your task is to generate supporting documentation for Indian drug import authorization.

           CRITICAL REQUIREMENTS FOR EXTREMELY DETAILED OUTPUT:
           - Generate comprehensive, well-structured Indian import licensing content
           - Each section must contain extensive detail with specific import data, methodologies, and Indian regulatory compliance analysis
           - Include detailed subsections with quality data, import protocols, and regulatory justification
           - Provide complete regulatory rationale and import authorization justification according to CDSCO standards
           - Reference specific Indian regulatory framework, CDSCO requirements, and Indian import considerations extensively

           STRUCTURE FOR INDIAN IMPORT LICENSE (EXTREMELY DETAILED):
           1. IMPORT LICENSE APPLICATION OVERVIEW
              1.1. Product Information - Complete product characterization and Indian import classification
              1.2. Importer Information - Comprehensive importer qualifications and Indian regulatory standing
              1.3. Import Strategy and Indian considerations - Detailed import strategy and Indian healthcare integration
           2. PRODUCT QUALITY AND MANUFACTURING INFORMATION
              2.1. Manufacturing Site Information - Comprehensive foreign manufacturing facility qualifications
              2.2. Quality Control and Testing - Detailed quality control protocols and Indian testing requirements
              2.3. Import Quality Assurance - Complete import quality assurance and Indian compliance framework
           3. REGULATORY COMPLIANCE AND AUTHORIZATION
              3.1. Foreign Regulatory Approvals - Comprehensive foreign regulatory status and approvals
              3.2. Indian Regulatory Compliance - Detailed Indian regulatory compliance and CDSCO requirements
              3.3. Import Documentation Requirements - Complete import documentation and Indian customs compliance
           4. DISTRIBUTION AND SUPPLY CHAIN
              4.1. Indian Distribution Plan - Comprehensive Indian distribution strategy and supply chain management
              4.2. Storage and Handling - Detailed storage protocols and Indian handling requirements
              4.3. Pharmacovigilance and Post-Market Surveillance - Complete Indian pharmacovigilance framework
           5. CDSCO IMPORT AUTHORIZATION REQUIREMENTS - Complete Indian import authorization framework and compliance

           Use plain text formatting only - NO MARKDOWN.
           Reference Indian regulatory framework and CDSCO import requirements.`
          },
          {
            role: "user",
            content: `Generate Indian Import License supporting documentation for ${diseaseData.disease_name} treatment import authorization.
           
           ${Object.entries(diseaseData.additional_parameters || {}).map(([key, value]) => 
              value ? `- ${key.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}: ${value}` : ''
           ).filter(Boolean).join('\n')}

           This documentation must support Indian import licensing requirements with EXTREMELY DETAILED content and EXTREMELY DETAILED regulatory analysis.`
          }
        ],
        temperature: 0.2,
        max_tokens: 8000
      });
      return { document_content: response.data.choices[0].message.content.trim() };
    } catch (error) {
      console.error('Error in generateIMPORT_LICENSE_IN:', error.response?.data || error.message);
      throw error;
    }
  },

  // =============================================================================
  // TAIWAN DOCUMENTS - ENHANCED
  // =============================================================================

  /**
   * Taiwan IND Application - ENHANCED
   */
  generateIND_TW: async (diseaseData) => {
    try {
      const response = await openaiApi.post('chat/completions', {
        model: "gpt-4o",
        messages: [
          {
            role: "system",
            content: `You are a regulatory affairs expert specializing in Taiwan Investigational New Drug applications for TFDA submission.
           Your task is to generate key sections for a Taiwan IND application.

           CRITICAL REQUIREMENTS FOR EXTREMELY DETAILED OUTPUT:
           - Generate comprehensive, well-structured Taiwan regulatory content
           - Each section must contain extensive detail with specific methodologies, procedures, and Taiwan regulatory compliance analysis
           - Include detailed subsections with quantitative data, protocols, and regulatory justification
           - Provide complete regulatory rationale and scientific justification according to TFDA standards
           - Reference specific Taiwan regulatory requirements, TFDA guidelines, and Taiwan healthcare framework extensively
           - Include both Traditional Chinese terminology and detailed English explanations

           STRUCTURE FOR TAIWAN IND (EXTREMELY DETAILED):
           1. 臨床試驗計畫書概要 (Clinical Trial Protocol Overview)
              1.1. 試驗藥物資訊 (Investigational Drug Information) - Complete product characterization and Taiwan regulatory classification
              1.2. 委託者及主要研究者資訊 (Sponsor and Principal Investigator Information) - Detailed qualifications and Taiwan regulatory standing
              1.3. 台灣臨床試驗概要 (Taiwan Clinical Trial Overview) - Comprehensive study design and Taiwan healthcare integration
           2. 試驗藥物資訊 (Investigational Product Information)
              2.1. 藥物說明及分類 (Drug Description and Classification) - Comprehensive product characterization
              2.2. 品質資訊摘要 (Quality Information Summary) - Detailed quality control and Taiwan compliance
              2.3. 非臨床資訊摘要 (Non-clinical Information Summary) - Complete preclinical package
              2.4. 先前臨床經驗 (Previous Clinical Experience) - Comprehensive clinical data analysis
           3. 臨床試驗方案概要 (Clinical Trial Protocol Synopsis)
              3.1. 研究目的及設計 (Study Objectives and Design) - Complete methodology and statistical planning
              3.2. 台灣病患族群 (Taiwan Patient Population) - Detailed Taiwan patient population analysis
              3.3. 治療計畫 (Treatment Plan) - Comprehensive treatment protocols and monitoring
              3.4. 療效及安全性評估 (Efficacy and Safety Assessment) - Detailed assessment protocols
           4. 台灣法規考量 (Taiwan Regulatory Considerations) - Complete Taiwan regulatory compliance framework

           Use plain text formatting only - NO MARKDOWN.
           Reference Taiwan regulatory requirements and TFDA guidelines.`
          },
          {
            role: "user",
            content: `Generate a Taiwan IND application for ${diseaseData.disease_name} clinical trial.
           
           ${Object.entries(diseaseData.additional_parameters || {}).map(([key, value]) => 
              value ? `- ${key.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}: ${value}` : ''
           ).filter(Boolean).join('\n')}

           This application must meet TFDA requirements for clinical trial authorization in Taiwan with EXTREMELY DETAILED content and EXTREMELY DETAILED regulatory analysis.`
          }
        ],
        temperature: 0.2,
        max_tokens: 8000
      });
      return { document_content: response.data.choices[0].message.content.trim() };
    } catch (error) {
      console.error('Error in generateIND_TW:', error.response?.data || error.message);
      throw error;
    }
  },

  /**
   * Taiwan NDA Application - ENHANCED
   */
  generateNDA_TW: async (diseaseData) => {
    try {
      const response = await openaiApi.post('chat/completions', {
        model: "gpt-4o",
        messages: [
          {
            role: "system",
            content: `You are a senior regulatory affairs expert with experience in Taiwan New Drug Applications for TFDA approval.
           Your task is to generate a EXTREMELY DETAILED Taiwan NDA summary.

           CRITICAL REQUIREMENTS FOR EXTREMELY DETAILED OUTPUT:
           - Generate comprehensive, well-structured Taiwan regulatory content
           - Each section must contain extensive detail with specific data, methodologies, and Taiwan regulatory compliance analysis
           - Include detailed subsections with quantitative data, analytical methods, and regulatory justification
           - Provide complete regulatory rationale and marketing authorization justification according to TFDA standards
           - Reference specific Taiwan regulatory framework, TFDA requirements, and Taiwan healthcare considerations extensively
           - Include both Traditional Chinese terminology and detailed English explanations

           STRUCTURE FOR TAIWAN NDA (EXTREMELY DETAILED):
           1. 行政資訊及產品資訊摘要 (Administrative Information and Product Information Summary)
              1.1. 申請概要 (Application Overview) - Complete regulatory strategy and Taiwan submission framework
              1.2. 建議產品資訊 (Proposed Product Information) - Detailed Taiwan prescribing information and labeling
           2. 品質資訊摘要 (Quality Information Summary)
              2.1. 原料藥摘要 (Drug Substance Summary) - Comprehensive chemical and analytical characterization
              2.2. 製劑摘要 (Drug Product Summary) - Detailed formulation and Taiwan manufacturing compliance
           3. 非臨床資訊摘要 (Non-clinical Information Summary)
              3.1. 藥理學及藥物動力學摘要 (Pharmacology and Pharmacokinetics Summary) - Comprehensive preclinical pharmacology package
              3.2. 毒理學摘要 (Toxicology Summary) - Detailed toxicological assessment and safety evaluation
           4. 臨床資訊摘要 (Clinical Information Summary)
              4.1. 臨床概要 (Clinical Overview) - Complete clinical development summary
              4.2. 臨床療效摘要 (Clinical Efficacy Summary) - Detailed efficacy analysis for Taiwan healthcare context
              4.3. 臨床安全性摘要 (Clinical Safety Summary) - Comprehensive safety profile and risk assessment
              4.4. 台灣人口效益風險評估 (Benefit-Risk Assessment for Taiwan Population) - Detailed benefit-risk analysis for Taiwan patients
           5. 台灣特殊考量 (Taiwan-Specific Considerations) - Complete Taiwan regulatory framework and market considerations

           Use plain text formatting only - NO MARKDOWN.
           Reference Taiwan regulatory framework and TFDA requirements.`
          },
          {
            role: "user",
            content: `Generate a Taiwan NDA summary for TFDA approval of ${diseaseData.disease_name} treatment.
           
           ${Object.entries(diseaseData.additional_parameters || {}).map(([key, value]) => 
              value ? `- ${key.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}: ${value}` : ''
           ).filter(Boolean).join('\n')}

           This NDA summary must meet TFDA expectations for Taiwan marketing authorization with EXTREMELY DETAILED content and EXTREMELY DETAILED regulatory analysis.`
          }
        ],
        temperature: 0.2,
        max_tokens: 8000
      });
      return { document_content: response.data.choices[0].message.content.trim() };
    } catch (error) {
      console.error('Error in generateNDA_TW:', error.response?.data || error.message);
      throw error;
    }
  },

  // =============================================================================
  // LATIN AMERICA DOCUMENTS - ENHANCED
  // =============================================================================

  /**
   * ANVISA Clinical Trial Authorization (Brazil) - ENHANCED
   */
  generateANVISA_CTA: async (diseaseData) => {
    try {
      const response = await openaiApi.post('chat/completions', {
        model: "gpt-4o",
        messages: [
          {
            role: "system",
            content: `You are a regulatory affairs expert specializing in ANVISA clinical trial authorizations for Brazil.
           Your task is to generate key sections for an ANVISA CTA application.

           CRITICAL REQUIREMENTS FOR EXTREMELY DETAILED OUTPUT:
           - Generate comprehensive, well-structured Brazilian regulatory content
           - Each section must contain extensive detail with specific methodologies, procedures, and Brazilian regulatory compliance analysis
           - Include detailed subsections with quantitative data, protocols, and regulatory justification
           - Provide complete regulatory rationale and scientific justification according to ANVISA standards
           - Reference specific Brazilian regulatory requirements, ANVISA guidelines, and Brazilian healthcare framework extensively
           - Include both Portuguese terminology and detailed English explanations

           STRUCTURE FOR ANVISA CTA (EXTREMELY DETAILED):
           1. VISÃO GERAL DA SOLICITAÇÃO (Application Overview)
              1.1. Informações do Estudo (Study Information) - Complete study design and Brazilian regulatory framework
              1.2. Patrocinador e Investigador Principal (Sponsor and Principal Investigator) - Detailed qualifications and Brazilian regulatory standing
              1.3. Centros Brasileiros (Brazilian Centers) - Complete Brazilian site information and qualifications
           2. INFORMAÇÕES DO PRODUTO INVESTIGACIONAL
              2.1. Descrição do Produto (Product Description) - Comprehensive product characterization
              2.2. Informações de Qualidade (Quality Information) - Detailed quality control and Brazilian compliance
              2.3. Informações Não-Clínicas (Non-clinical Information) - Complete preclinical package
              2.4. Experiência Clínica Anterior (Previous Clinical Experience) - Comprehensive clinical data analysis
           3. PROTOCOLO DE PESQUISA CLÍNICA
              3.1. Objetivos e Delineamento do Estudo (Study Objectives and Design) - Complete methodology and statistical planning
              3.2. População Brasileira e Critérios de Seleção (Brazilian Population and Selection Criteria) - Detailed Brazilian patient population analysis
              3.3. Plano de Tratamento (Treatment Plan) - Comprehensive treatment protocols and monitoring
              3.4. Avaliações de Eficácia e Segurança (Efficacy and Safety Evaluations) - Detailed assessment protocols
           4. CONSIDERAÇÕES REGULATÓRIAS BRASILEIRAS - Complete Brazilian regulatory compliance framework

           Use plain text formatting only - NO MARKDOWN.
           Reference Brazilian regulatory requirements and ANVISA guidelines.`
          },
          {
            role: "user",
            content: `Generate an ANVISA Clinical Trial Authorization for ${diseaseData.disease_name} research in Brazil.
           
           ${Object.entries(diseaseData.additional_parameters || {}).map(([key, value]) => 
              value ? `- ${key.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}: ${value}` : ''
           ).filter(Boolean).join('\n')}

           This application must meet ANVISA requirements for clinical trial authorization in Brazil with EXTREMELY DETAILED content and EXTREMELY DETAILED regulatory analysis.`
          }
        ],
        temperature: 0.2,
        max_tokens: 8000
      });
      return { document_content: response.data.choices[0].message.content.trim() };
    } catch (error) {
      console.error('Error in generateANVISA_CTA:', error.response?.data || error.message);
      throw error;
    }
  },

  /**
   * ANVISA Registration Dossier (Brazil) - ENHANCED
   */
  generateANVISA_NDA: async (diseaseData) => {
    try {
      const response = await openaiApi.post('chat/completions', {
        model: "gpt-4o",
        messages: [
          {
            role: "system",
            content: `You are a senior regulatory affairs expert with experience in ANVISA drug registrations for the Brazilian market.
           Your task is to generate a EXTREMELY DETAILED ANVISA registration dossier summary.

           CRITICAL REQUIREMENTS FOR EXTREMELY DETAILED OUTPUT:
           - Generate comprehensive, well-structured Brazilian regulatory content
           - Each section must contain extensive detail with specific data, methodologies, and Brazilian regulatory compliance analysis
           - Include detailed subsections with quantitative data, analytical methods, and regulatory justification
           - Provide complete regulatory rationale and marketing authorization justification according to ANVISA standards
           - Reference specific Brazilian regulatory framework, ANVISA requirements, and Brazilian healthcare considerations extensively
           - Include both Portuguese terminology and detailed English explanations

           STRUCTURE FOR ANVISA REGISTRATION DOSSIER (EXTREMELY DETAILED):
           1. INFORMAÇÕES ADMINISTRATIVAS E ROTULAGEM
              1.1. Resumo da Solicitação (Application Summary) - Complete regulatory strategy and Brazilian submission framework
              1.2. Rotulagem Proposta (Proposed Labeling) - Detailed Brazilian labeling and prescribing information
           2. INFORMAÇÕES DE QUALIDADE
              2.1. Substância Ativa (Active Substance) - Comprehensive chemical and analytical characterization
              2.2. Produto Acabado (Finished Product) - Detailed formulation and Brazilian manufacturing compliance
              2.3. Fabricação no Brasil ou Importação (Brazilian Manufacturing or Import) - Complete regulatory compliance framework
           3. INFORMAÇÕES NÃO-CLÍNICAS
              3.1. Farmacologia e Farmacocinética - Comprehensive preclinical pharmacology package
              3.2. Toxicologia - Detailed toxicological assessment and safety evaluation
           4. INFORMAÇÕES CLÍNICAS
              4.1. Resumo de Eficácia Clínica - Detailed clinical efficacy evidence and analysis
              4.2. Resumo de Segurança Clínica - Comprehensive safety profile and risk assessment
              4.3. Avaliação Benefício-Risco para População Brasileira - Detailed benefit-risk analysis for Brazilian patients
           5. CONSIDERAÇÕES ESPECIAIS PARA O BRASIL - Complete Brazilian market analysis and regulatory considerations

           Use plain text formatting only - NO MARKDOWN.
           Reference Brazilian regulatory framework and ANVISA requirements.`
          },
          {
            role: "user",
            content: `Generate an ANVISA Registration Dossier for marketing authorization of ${diseaseData.disease_name} treatment in Brazil.
           
           ${Object.entries(diseaseData.additional_parameters || {}).map(([key, value]) => 
              value ? `- ${key.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}: ${value}` : ''
           ).filter(Boolean).join('\n')}

           This registration dossier must meet ANVISA requirements for Brazilian marketing authorization with EXTREMELY DETAILED content and EXTREMELY DETAILED regulatory analysis.`
          }
        ],
        temperature: 0.2,
        max_tokens: 8000
      });
      return { document_content: response.data.choices[0].message.content.trim() };
    } catch (error) {
      console.error('Error in generateANVISA_NDA:', error.response?.data || error.message);
      throw error;
    }
  },

  /**
   * ANVISA GMP Certificate (Brazil) - ENHANCED
   */
  generateANVISA_GMP: async (diseaseData) => {
    try {
      const response = await openaiApi.post('chat/completions', {
        model: "gpt-4o",
        messages: [
          {
            role: "system",
            content: `You are a quality assurance expert with experience in ANVISA GMP certification requirements for Brazil.
           Your task is to generate supporting documentation for ANVISA GMP certificate application.

           CRITICAL REQUIREMENTS FOR EXTREMELY DETAILED OUTPUT:
           - Generate comprehensive, well-structured Brazilian GMP regulatory content
           - Each section must contain extensive detail with specific quality systems, procedures, and Brazilian regulatory compliance analysis
           - Include detailed subsections with quality data, validation protocols, and regulatory justification
           - Provide complete regulatory rationale and quality assurance justification according to ANVISA standards
           - Reference specific Brazilian GMP requirements, ANVISA guidelines, and Brazilian manufacturing standards extensively
           - Include both Portuguese terminology and detailed English explanations

           STRUCTURE FOR ANVISA GMP CERTIFICATE (EXTREMELY DETAILED):
           1. INFORMAÇÕES GERAIS DE FABRICAÇÃO
              1.1. Informações do Local de Fabricação (Manufacturing Site Information) - Complete facility description and Brazilian qualification
              1.2. Estrutura Organizacional (Organizational Structure) - Detailed personnel qualifications and Brazilian regulatory responsibilities
              1.3. Sistema de Qualidade (Quality System) - Comprehensive quality management system for Brazilian compliance
           2. PROCESSOS DE FABRICAÇÃO
              2.1. Descrição do Processo de Fabricação (Manufacturing Process Description) - Complete process validation and Brazilian control standards
              2.2. Controle de Qualidade (Quality Control) - Detailed analytical methods and Brazilian quality testing requirements
              2.3. Validação de Processos (Process Validation) - Comprehensive validation protocols and Brazilian documentation standards
           3. CONFORMIDADE COM REQUISITOS ANVISA BPF
              3.1. Conformidade com Padrões Brasileiros (Brazilian Standards Compliance) - Complete Brazilian regulatory compliance framework
              3.2. Sistema de Documentação (Documentation System) - Detailed Brazilian documentation control and record keeping
              3.3. Treinamento de Pessoal (Personnel Training) - Comprehensive Brazilian training programs and qualifications
           4. PREPARAÇÃO PARA INSPEÇÃO ANVISA - Complete Brazilian inspection preparedness and audit protocols

           Use plain text formatting only - NO MARKDOWN.
           Reference Brazilian GMP requirements and ANVISA manufacturing standards.`
          },
          {
            role: "user",
            content: `Generate ANVISA GMP Certificate supporting documentation for Brazilian manufacturing authorization of ${diseaseData.disease_name} treatment.
           
           ${Object.entries(diseaseData.additional_parameters || {}).map(([key, value]) => 
              value ? `- ${key.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}: ${value}` : ''
           ).filter(Boolean).join('\n')}

           This documentation must support ANVISA GMP certification requirements with EXTREMELY DETAILED content and EXTREMELY DETAILED quality analysis.`
          }
        ],
        temperature: 0.2,
        max_tokens: 8000
      });
      return { document_content: response.data.choices[0].message.content.trim() };
    } catch (error) {
      console.error('Error in generateANVISA_GMP:', error.response?.data || error.message);
      throw error;
    }
  },

  /**
   * ANMAT Clinical Trial Authorization (Argentina) - ENHANCED
   */
  generateANMAT_CTA: async (diseaseData) => {
    try {
      const response = await openaiApi.post('chat/completions', {
        model: "gpt-4o",
        messages: [
          {
            role: "system",
            content: `You are a regulatory affairs expert specializing in ANMAT clinical trial authorizations for Argentina.
           Your task is to generate key sections for an ANMAT CTA application.

           CRITICAL REQUIREMENTS FOR EXTREMELY DETAILED OUTPUT:
           - Generate comprehensive, well-structured Argentine regulatory content
           - Each section must contain extensive detail with specific methodologies, procedures, and Argentine regulatory compliance analysis
           - Include detailed subsections with quantitative data, protocols, and regulatory justification
           - Provide complete regulatory rationale and scientific justification according to ANMAT standards
           - Reference specific Argentine regulatory requirements, ANMAT guidelines, and Argentine healthcare framework extensively
           - Include both Spanish terminology and detailed English explanations

           STRUCTURE FOR ANMAT CTA (EXTREMELY DETAILED):
           1. RESUMEN DE LA SOLICITUD (Application Overview)
              1.1. Información del Estudio (Study Information) - Complete study design and Argentine regulatory framework
              1.2. Patrocinador e Investigador Principal (Sponsor and Principal Investigator) - Detailed qualifications and Argentine regulatory standing
              1.3. Centros Argentinos (Argentine Centers) - Complete Argentine site information and qualifications
           2. INFORMACIÓN DEL PRODUCTO EN INVESTIGACIÓN
              2.1. Descripción del Producto (Product Description) - Comprehensive product characterization
              2.2. Información de Calidad (Quality Information) - Detailed quality control and Argentine compliance
              2.3. Información No-Clínica (Non-clinical Information) - Complete preclinical package
              2.4. Experiencia Clínica Previa (Previous Clinical Experience) - Comprehensive clinical data analysis
           3. PROTOCOLO DE INVESTIGACIÓN CLÍNICA
              3.1. Objetivos y Diseño del Estudio (Study Objectives and Design) - Complete methodology and statistical planning
              3.2. Población Argentina y Criterios de Selección (Argentine Population and Selection Criteria) - Detailed Argentine patient population analysis
              3.3. Plan de Tratamiento (Treatment Plan) - Comprehensive treatment protocols and monitoring
              3.4. Evaluaciones de Eficacia y Seguridad (Efficacy and Safety Evaluations) - Detailed assessment protocols
           4. CONSIDERACIONES REGULATORIAS ARGENTINAS - Complete Argentine regulatory compliance framework

           Use plain text formatting only - NO MARKDOWN.
           Reference Argentine regulatory requirements and ANMAT guidelines.`
          },
          {
            role: "user",
            content: `Generate an ANMAT Clinical Trial Authorization for ${diseaseData.disease_name} research in Argentina.
           
           ${Object.entries(diseaseData.additional_parameters || {}).map(([key, value]) => 
              value ? `- ${key.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}: ${value}` : ''
           ).filter(Boolean).join('\n')}

           This application must meet ANMAT requirements for clinical trial authorization in Argentina with EXTREMELY DETAILED content and EXTREMELY DETAILED regulatory analysis.`
          }
        ],
        temperature: 0.2,
        max_tokens: 8000
      });
      return { document_content: response.data.choices[0].message.content.trim() };
    } catch (error) {
      console.error('Error in generateANMAT_CTA:', error.response?.data || error.message);
      throw error;
    }
  },

  /**
   * ANMAT Drug Registration (Argentina) - ENHANCED
   */
  generateANMAT_NDA: async (diseaseData) => {
    try {
      const response = await openaiApi.post('chat/completions', {
        model: "gpt-4o",
        messages: [
          {
            role: "system",
            content: `You are a senior regulatory affairs expert with experience in ANMAT drug registrations for Argentina.
           Your task is to generate a EXTREMELY DETAILED ANMAT registration summary.

           CRITICAL REQUIREMENTS FOR EXTREMELY DETAILED OUTPUT:
           - Generate comprehensive, well-structured Argentine regulatory content
           - Each section must contain extensive detail with specific data, methodologies, and Argentine regulatory compliance analysis
           - Include detailed subsections with quantitative data, analytical methods, and regulatory justification
           - Provide complete regulatory rationale and marketing authorization justification according to ANMAT standards
           - Reference specific Argentine regulatory framework, ANMAT requirements, and Argentine healthcare considerations extensively
           - Include both Spanish terminology and detailed English explanations

           STRUCTURE FOR ANMAT DRUG REGISTRATION (EXTREMELY DETAILED):
           1. INFORMACIÓN ADMINISTRATIVA Y ETIQUETADO
              1.1. Resumen de la Solicitud (Application Summary) - Complete regulatory strategy and Argentine submission framework
              1.2. Etiquetado Propuesto (Proposed Labeling) - Detailed Argentine labeling and prescribing information
           2. INFORMACIÓN DE CALIDAD
              2.1. Sustancia Activa (Active Substance) - Comprehensive chemical and analytical characterization
              2.2. Producto Terminado (Finished Product) - Detailed formulation and Argentine manufacturing compliance
           3. INFORMACIÓN NO-CLÍNICA
              3.1. Farmacología y Farmacocinética - Comprehensive preclinical pharmacology package
              3.2. Toxicología - Detailed toxicological assessment and safety evaluation
           4. INFORMACIÓN CLÍNICA
              4.1. Resumen de Eficacia Clínica - Detailed clinical efficacy evidence and analysis
              4.2. Resumen de Seguridad Clínica - Comprehensive safety profile and risk assessment
              4.3. Evaluación Beneficio-Riesgo para Población Argentina - Detailed benefit-risk analysis for Argentine patients
           5. CONSIDERACIONES ESPECIALES PARA ARGENTINA - Complete Argentine market analysis and regulatory considerations

           Use plain text formatting only - NO MARKDOWN.
           Reference Argentine regulatory framework and ANMAT requirements.`
          },
          {
            role: "user",
            content: `Generate an ANMAT Drug Registration summary for marketing authorization of ${diseaseData.disease_name} treatment in Argentina.
           
           ${Object.entries(diseaseData.additional_parameters || {}).map(([key, value]) => 
              value ? `- ${key.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}: ${value}` : ''
           ).filter(Boolean).join('\n')}

           This registration summary must meet ANMAT requirements for Argentine marketing authorization with EXTREMELY DETAILED content and EXTREMELY DETAILED regulatory analysis.`
          }
        ],
        temperature: 0.2,
        max_tokens: 8000
      });
      return { document_content: response.data.choices[0].message.content.trim() };
    } catch (error) {
      console.error('Error in generateANMAT_NDA:', error.response?.data || error.message);
      throw error;
    }
  },

  /**
   * INVIMA Clinical Trial Permit (Colombia) - ENHANCED
   */
  generateINVIMA_CTA: async (diseaseData) => {
    try {
      const response = await openaiApi.post('chat/completions', {
        model: "gpt-4o",
        messages: [
          {
            role: "system",
            content: `You are a regulatory affairs expert specializing in INVIMA clinical trial permits for Colombia.
           Your task is to generate key sections for an INVIMA CTA application.

           CRITICAL REQUIREMENTS FOR EXTREMELY DETAILED OUTPUT:
           - Generate comprehensive, well-structured Colombian regulatory content
           - Each section must contain extensive detail with specific methodologies, procedures, and Colombian regulatory compliance analysis
           - Include detailed subsections with quantitative data, protocols, and regulatory justification
           - Provide complete regulatory rationale and scientific justification according to INVIMA standards
           - Reference specific Colombian regulatory requirements, INVIMA guidelines, and Colombian healthcare framework extensively
           - Include both Spanish terminology and detailed English explanations

           Use plain text formatting only - NO MARKDOWN.
           Reference Colombian regulatory requirements and INVIMA guidelines.`
          },
          {
            role: "user",
            content: `Generate an INVIMA Clinical Trial Permit for ${diseaseData.disease_name} research in Colombia.
           
           ${Object.entries(diseaseData.additional_parameters || {}).map(([key, value]) => 
              value ? `- ${key.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}: ${value}` : ''
           ).filter(Boolean).join('\n')}

           This permit must meet INVIMA requirements for clinical trial authorization in Colombia with EXTREMELY DETAILED content and EXTREMELY DETAILED regulatory analysis.`
          }
        ],
        temperature: 0.2,
        max_tokens: 8000
      });
      return { document_content: response.data.choices[0].message.content.trim() };
    } catch (error) {
      console.error('Error in generateINVIMA_CTA:', error.response?.data || error.message);
      throw error;
    }
  },

  /**
   * INVIMA Drug Registration (Colombia) - ENHANCED
   */
  generateINVIMA_NDA: async (diseaseData) => {
    try {
      const response = await openaiApi.post('chat/completions', {
        model: "gpt-4o",
        messages: [
          {
            role: "system",
            content: `You are a senior regulatory affairs expert with experience in INVIMA drug registrations for Colombia.
           Your task is to generate a EXTREMELY DETAILED INVIMA registration summary.

           Use plain text formatting only - NO MARKDOWN.
           Reference Colombian regulatory framework and INVIMA requirements.`
          },
          {
            role: "user",
            content: `Generate an INVIMA Drug Registration summary for marketing authorization of ${diseaseData.disease_name} treatment in Colombia.
           
           ${Object.entries(diseaseData.additional_parameters || {}).map(([key, value]) => 
              value ? `- ${key.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}: ${value}` : ''
           ).filter(Boolean).join('\n')}`
          }
        ],
        temperature: 0.2,
        max_tokens: 8000
      });
      return { document_content: response.data.choices[0].message.content.trim() };
    } catch (error) {
      console.error('Error in generateINVIMA_NDA:', error.response?.data || error.message);
      throw error;
    }
  },

  /**
   * ISP Clinical Trial Authorization (Chile) - ENHANCED
   */
  generateISP_CTA: async (diseaseData) => {
    try {
      const response = await openaiApi.post('chat/completions', {
        model: "gpt-4o",
        messages: [
          {
            role: "system",
            content: `You are a regulatory affairs expert specializing in ISP clinical trial authorizations for Chile.
           Your task is to generate key sections for an ISP CTA application.

           Use plain text formatting only - NO MARKDOWN.
           Reference Chilean regulatory requirements and ISP guidelines.`
          },
          {
            role: "user",
            content: `Generate an ISP Clinical Trial Authorization for ${diseaseData.disease_name} research in Chile.
           
           ${Object.entries(diseaseData.additional_parameters || {}).map(([key, value]) => 
              value ? `- ${key.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}: ${value}` : ''
           ).filter(Boolean).join('\n')}`
          }
        ],
        temperature: 0.2,
        max_tokens: 8000
      });
      return { document_content: response.data.choices[0].message.content.trim() };
    } catch (error) {
      console.error('Error in generateISP_CTA:', error.response?.data || error.message);
      throw error;
    }
  },

  /**
   * ISP Drug Registration (Chile) - ENHANCED
   */
  generateISP_NDA: async (diseaseData) => {
    try {
      const response = await openaiApi.post('chat/completions', {
        model: "gpt-4o",
        messages: [
          {
            role: "system",
            content: `You are a senior regulatory affairs expert with experience in ISP drug registrations for Chile.
           Your task is to generate a EXTREMELY DETAILED ISP registration summary.

           Use plain text formatting only - NO MARKDOWN.
           Reference Chilean regulatory framework and ISP requirements.`
          },
          {
            role: "user",
            content: `Generate an ISP Drug Registration summary for marketing authorization of ${diseaseData.disease_name} treatment in Chile.
           
           ${Object.entries(diseaseData.additional_parameters || {}).map(([key, value]) => 
              value ? `- ${key.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}: ${value}` : ''
           ).filter(Boolean).join('\n')}`
          }
        ],
        temperature: 0.2,
        max_tokens: 8000
      });
      return { document_content: response.data.choices[0].message.content.trim() };
    } catch (error) {
      console.error('Error in generateISP_NDA:', error.response?.data || error.message);
      throw error;
    }
  },

  // =============================================================================
  // AFRICA & MIDDLE EAST DOCUMENTS - ENHANCED
  // =============================================================================

  /**
   * SAHPRA Clinical Trial Authorization (South Africa) - ENHANCED
   */
  generateSAHPRA_CTA: async (diseaseData) => {
    try {
      const response = await openaiApi.post('chat/completions', {
        model: "gpt-4o",
        messages: [
          {
            role: "system",
            content: `You are a regulatory affairs expert specializing in SAHPRA clinical trial authorizations for South Africa.
           Your task is to generate key sections for a SAHPRA CTA application.

           CRITICAL REQUIREMENTS FOR EXTREMELY DETAILED OUTPUT:
           - Generate comprehensive, well-structured South African regulatory content
           - Each section must contain extensive detail with specific methodologies, procedures, and South African regulatory compliance analysis
           - Include detailed subsections with quantitative data, protocols, and regulatory justification
           - Provide complete regulatory rationale and scientific justification according to SAHPRA standards
           - Reference specific South African regulatory requirements, SAHPRA guidelines, and South African healthcare framework extensively

           Use plain text formatting only - NO MARKDOWN.
           Reference South African regulatory requirements and SAHPRA guidelines.`
          },
          {
            role: "user",
            content: `Generate a SAHPRA Clinical Trial Authorization for ${diseaseData.disease_name} research in South Africa.
           
           ${Object.entries(diseaseData.additional_parameters || {}).map(([key, value]) => 
              value ? `- ${key.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}: ${value}` : ''
           ).filter(Boolean).join('\n')}

           This application must meet SAHPRA requirements for clinical trial authorization in South Africa with EXTREMELY DETAILED content and EXTREMELY DETAILED regulatory analysis.`
          }
        ],
        temperature: 0.2,
        max_tokens: 8000
      });
      return { document_content: response.data.choices[0].message.content.trim() };
    } catch (error) {
      console.error('Error in generateSAHPRA_CTA:', error.response?.data || error.message);
      throw error;
    }
  },

  /**
   * SAHPRA Medicine Registration (South Africa) - ENHANCED
   */
  generateSAHPRA_NDA: async (diseaseData) => {
    try {
      const response = await openaiApi.post('chat/completions', {
        model: "gpt-4o",
        messages: [
          {
            role: "system",
            content: `You are a senior regulatory affairs expert with experience in SAHPRA medicine registrations for South Africa.
           Your task is to generate a EXTREMELY DETAILED SAHPRA registration summary.

           CRITICAL REQUIREMENTS FOR EXTREMELY DETAILED OUTPUT:
           - Generate comprehensive, well-structured South African regulatory content
           - Each section must contain extensive detail with specific data, methodologies, and South African regulatory compliance analysis
           - Include detailed subsections with quantitative data, analytical methods, and regulatory justification
           - Provide complete regulatory rationale and marketing authorization justification according to SAHPRA standards
           - Reference specific South African regulatory framework, SAHPRA requirements, and South African healthcare considerations extensively

           Use plain text formatting only - NO MARKDOWN.
           Reference South African regulatory framework and SAHPRA requirements.`
          },
          {
            role: "user",
            content: `Generate a SAHPRA Medicine Registration summary for marketing authorization of ${diseaseData.disease_name} treatment in South Africa.
           
           ${Object.entries(diseaseData.additional_parameters || {}).map(([key, value]) => 
              value ? `- ${key.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}: ${value}` : ''
           ).filter(Boolean).join('\n')}

           This registration summary must meet SAHPRA requirements for South African marketing authorization with EXTREMELY DETAILED content and EXTREMELY DETAILED regulatory analysis.`
          }
        ],
        temperature: 0.2,
        max_tokens: 8000
      });
      return { document_content: response.data.choices[0].message.content.trim() };
    } catch (error) {
      console.error('Error in generateSAHPRA_NDA:', error.response?.data || error.message);
      throw error;
    }
  },

  /**
   * Israeli MOH Clinical Trial Permit - ENHANCED
   */
  generateMOH_ISRAEL_CTA: async (diseaseData) => {
    try {
      const response = await openaiApi.post('chat/completions', {
        model: "gpt-4o",
        messages: [
          {
            role: "system",
            content: `You are a regulatory affairs expert specializing in Israeli MOH clinical trial permits.
           Your task is to generate key sections for an Israeli MOH CTA application.

           CRITICAL REQUIREMENTS FOR EXTREMELY DETAILED OUTPUT:
           - Generate comprehensive, well-structured Israeli regulatory content
           - Each section must contain extensive detail with specific methodologies, procedures, and Israeli regulatory compliance analysis
           - Include detailed subsections with quantitative data, protocols, and regulatory justification
           - Provide complete regulatory rationale and scientific justification according to Israeli MOH standards
           - Reference specific Israeli regulatory requirements, MOH guidelines, and Israeli healthcare framework extensively
           - Include both Hebrew terminology and detailed English explanations

           Use plain text formatting only - NO MARKDOWN.
           Reference Israeli regulatory requirements and MOH guidelines.`
          },
          {
            role: "user",
            content: `Generate an Israeli MOH Clinical Trial Permit for ${diseaseData.disease_name} research in Israel.
           
           ${Object.entries(diseaseData.additional_parameters || {}).map(([key, value]) => 
              value ? `- ${key.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}: ${value}` : ''
           ).filter(Boolean).join('\n')}

           This permit must meet Israeli MOH requirements for clinical trial authorization with EXTREMELY DETAILED content and EXTREMELY DETAILED regulatory analysis.`
          }
        ],
        temperature: 0.2,
        max_tokens: 8000
      });
      return { document_content: response.data.choices[0].message.content.trim() };
    } catch (error) {
      console.error('Error in generateMOH_ISRAEL_CTA:', error.response?.data || error.message);
      throw error;
    }
  },

  /**
   * Israeli Drug Registration - ENHANCED
   */
  generateMOH_ISRAEL_NDA: async (diseaseData) => {
    try {
      const response = await openaiApi.post('chat/completions', {
        model: "gpt-4o",
        messages: [
          {
            role: "system",
            content: `You are a senior regulatory affairs expert with experience in Israeli drug registrations.
           Your task is to generate a EXTREMELY DETAILED Israeli registration summary.

           CRITICAL REQUIREMENTS FOR EXTREMELY DETAILED OUTPUT:
           - Generate comprehensive, well-structured Israeli regulatory content
           - Each section must contain extensive detail with specific data, methodologies, and Israeli regulatory compliance analysis
           - Include detailed subsections with quantitative data, analytical methods, and regulatory justification
           - Provide complete regulatory rationale and marketing authorization justification according to Israeli standards
           - Reference specific Israeli regulatory framework, MOH requirements, and Israeli healthcare considerations extensively
           - Include both Hebrew terminology and detailed English explanations

           Use plain text formatting only - NO MARKDOWN.
           Reference Israeli regulatory framework and MOH requirements.`
          },
          {
            role: "user",
            content: `Generate an Israeli Drug Registration summary for marketing authorization of ${diseaseData.disease_name} treatment in Israel.
           
           ${Object.entries(diseaseData.additional_parameters || {}).map(([key, value]) => 
              value ? `- ${key.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}: ${value}` : ''
           ).filter(Boolean).join('\n')}

           This registration summary must meet Israeli MOH requirements for marketing authorization with EXTREMELY DETAILED content and EXTREMELY DETAILED regulatory analysis.`
          }
        ],
        temperature: 0.2,
        max_tokens: 8000
      });
      return { document_content: response.data.choices[0].message.content.trim() };
    } catch (error) {
      console.error('Error in generateMOH_ISRAEL_NDA:', error.response?.data || error.message);
      throw error;
    }
  },

  /**
   * SFDA Clinical Trial Authorization (Saudi Arabia) - ENHANCED
   */
  generateSFDA_CTA: async (diseaseData) => {
    try {
      const response = await openaiApi.post('chat/completions', {
        model: "gpt-4o",
        messages: [
          {
            role: "system",
            content: `You are a regulatory affairs expert specializing in SFDA clinical trial authorizations for Saudi Arabia.
           Your task is to generate key sections for an SFDA CTA application.

           CRITICAL REQUIREMENTS FOR EXTREMELY DETAILED OUTPUT:
           - Generate comprehensive, well-structured Saudi regulatory content
           - Each section must contain extensive detail with specific methodologies, procedures, and Saudi regulatory compliance analysis
           - Include detailed subsections with quantitative data, protocols, and regulatory justification
           - Provide complete regulatory rationale and scientific justification according to SFDA standards
           - Reference specific Saudi regulatory requirements, SFDA guidelines, and Saudi healthcare framework extensively
           - Include both Arabic terminology and detailed English explanations

           Use plain text formatting only - NO MARKDOWN.
           Reference Saudi regulatory requirements and SFDA guidelines.`
          },
          {
            role: "user",
            content: `Generate an SFDA Clinical Trial Authorization for ${diseaseData.disease_name} research in Saudi Arabia.
           
           ${Object.entries(diseaseData.additional_parameters || {}).map(([key, value]) => 
              value ? `- ${key.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}: ${value}` : ''
           ).filter(Boolean).join('\n')}

           This authorization must meet SFDA requirements for clinical trial approval in Saudi Arabia with EXTREMELY DETAILED content and EXTREMELY DETAILED regulatory analysis.`
          }
        ],
        temperature: 0.2,
        max_tokens: 8000
      });
      return { document_content: response.data.choices[0].message.content.trim() };
    } catch (error) {
      console.error('Error in generateSFDA_CTA:', error.response?.data || error.message);
      throw error;
    }
  },

  /**
   * SFDA Drug Registration (Saudi Arabia) - ENHANCED
   */
  generateSFDA_NDA: async (diseaseData) => {
    try {
      const response = await openaiApi.post('chat/completions', {
        model: "gpt-4o",
        messages: [
          {
            role: "system",
            content: `You are a senior regulatory affairs expert with experience in SFDA drug registrations for Saudi Arabia.
           Your task is to generate a EXTREMELY DETAILED SFDA registration summary.

           CRITICAL REQUIREMENTS FOR EXTREMELY DETAILED OUTPUT:
           - Generate comprehensive, well-structured Saudi regulatory content
           - Each section must contain extensive detail with specific data, methodologies, and Saudi regulatory compliance analysis
           - Include detailed subsections with quantitative data, analytical methods, and regulatory justification
           - Provide complete regulatory rationale and marketing authorization justification according to SFDA standards
           - Reference specific Saudi regulatory framework, SFDA requirements, and Saudi healthcare considerations extensively
           - Include both Arabic terminology and detailed English explanations

           Use plain text formatting only - NO MARKDOWN.
           Reference Saudi regulatory framework and SFDA requirements.`
          },
          {
            role: "user",
            content: `Generate an SFDA Drug Registration summary for marketing authorization of ${diseaseData.disease_name} treatment in Saudi Arabia.
           
           ${Object.entries(diseaseData.additional_parameters || {}).map(([key, value]) => 
              value ? `- ${key.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}: ${value}` : ''
           ).filter(Boolean).join('\n')}

           This registration summary must meet SFDA requirements for Saudi marketing authorization with EXTREMELY DETAILED content and EXTREMELY DETAILED regulatory analysis.`
          }
        ],
        temperature: 0.2,
        max_tokens: 8000
      });
      return { document_content: response.data.choices[0].message.content.trim() };
    } catch (error) {
      console.error('Error in generateSFDA_NDA:', error.response?.data || error.message);
      throw error;
    }
  },

  /**
   * DHA Clinical Trial Permit (UAE) - ENHANCED
   */
  generateDHA_CTA: async (diseaseData) => {
    try {
      const response = await openaiApi.post('chat/completions', {
        model: "gpt-4o",
        messages: [
          {
            role: "system",
            content: `You are a regulatory affairs expert specializing in DHA clinical trial permits for UAE.
           Your task is to generate key sections for a DHA CTA application.

           CRITICAL REQUIREMENTS FOR EXTREMELY DETAILED OUTPUT:
           - Generate comprehensive, well-structured UAE regulatory content
           - Each section must contain extensive detail with specific methodologies, procedures, and UAE regulatory compliance analysis
           - Include detailed subsections with quantitative data, protocols, and regulatory justification
           - Provide complete regulatory rationale and scientific justification according to DHA standards
           - Reference specific UAE regulatory requirements, DHA guidelines, and UAE healthcare framework extensively
           - Include both Arabic terminology and detailed English explanations

           Use plain text formatting only - NO MARKDOWN.
           Reference UAE regulatory requirements and DHA guidelines.`
          },
          {
            role: "user",
            content: `Generate a DHA Clinical Trial Permit for ${diseaseData.disease_name} research in UAE.
           
           ${Object.entries(diseaseData.additional_parameters || {}).map(([key, value]) => 
              value ? `- ${key.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}: ${value}` : ''
           ).filter(Boolean).join('\n')}

           This permit must meet DHA requirements for clinical trial authorization in UAE with EXTREMELY DETAILED content and EXTREMELY DETAILED regulatory analysis.`
          }
        ],
        temperature: 0.2,
        max_tokens: 8000
      });
      return { document_content: response.data.choices[0].message.content.trim() };
    } catch (error) {
      console.error('Error in generateDHA_CTA:', error.response?.data || error.message);
      throw error;
    }
  },

  /**
   * UAE Drug Registration - ENHANCED
   */
  generateMOH_UAE_NDA: async (diseaseData) => {
    try {
      const response = await openaiApi.post('chat/completions', {
        model: "gpt-4o",
        messages: [
          {
            role: "system",
            content: `You are a senior regulatory affairs expert with experience in UAE drug registrations.
           Your task is to generate a EXTREMELY DETAILED UAE registration summary.

           CRITICAL REQUIREMENTS FOR EXTREMELY DETAILED OUTPUT:
           - Generate comprehensive, well-structured UAE regulatory content
           - Each section must contain extensive detail with specific data, methodologies, and UAE regulatory compliance analysis
           - Include detailed subsections with quantitative data, analytical methods, and regulatory justification
           - Provide complete regulatory rationale and marketing authorization justification according to UAE standards
           - Reference specific UAE regulatory framework, MOH requirements, and UAE healthcare considerations extensively
           - Include both Arabic terminology and detailed English explanations

           Use plain text formatting only - NO MARKDOWN.
           Reference UAE regulatory framework and MOH requirements.`
          },
          {
            role: "user",
            content: `Generate a UAE Drug Registration summary for marketing authorization of ${diseaseData.disease_name} treatment in UAE.
           
           ${Object.entries(diseaseData.additional_parameters || {}).map(([key, value]) => 
              value ? `- ${key.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}: ${value}` : ''
           ).filter(Boolean).join('\n')}

           This registration summary must meet UAE MOH requirements for marketing authorization with EXTREMELY DETAILED content and EXTREMELY DETAILED regulatory analysis.`
          }
        ],
        temperature: 0.2,
        max_tokens: 8000
      });
      return { document_content: response.data.choices[0].message.content.trim() };
    } catch (error) {
      console.error('Error in generateMOH_UAE_NDA:', error.response?.data || error.message);
      throw error;
    }
  },

  // =============================================================================
  // QUERY ASSISTANT & VALIDATION
  // =============================================================================
  
  queryAssistant: async (queryData) => {
    try {
      // Check if API key is available
      if (!OPENAI_API_KEY) {
        throw new Error('OpenAI API key is not configured');
      }

      // Enhanced theme restriction - only allow medical/clinical/regulatory questions
      const allowedThemes = [
        // Core medical research themes
        'clinical', 'trial', 'protocol', 'regulatory', 'medical', 'drug', 'medicine', 'treatment', 'therapy', 
        'patient', 'disease', 'condition', 'diagnosis', 'symptom', 'adverse', 'safety', 'efficacy',
        'pharmaceutical', 'biotech', 'fda', 'ema', 'approval', 'submission', 'dossier', 'documentation',
        
        // Regulatory terms
        'ind', 'nda', 'bla', 'cta', 'maa', 'impd', 'gcp', 'ich', 'gmp', 'pmda', 'tga', 'hsa', 'anvisa',
        'cofepris', 'anmat', 'invima', 'sahpra', 'roszdravnadzor', 'cdsco',
        
        // Study design terms  
        'randomized', 'blinded', 'placebo', 'endpoint', 'biomarker', 'inclusion', 'exclusion', 
        'population', 'enrollment', 'recruitment', 'statistical', 'power', 'sample size',
        
        // Document types
        'cmc', 'nonclinical', 'toxicology', 'pharmacology', 'manufacturing', 'quality', 'labeling',
        
        // Medical specialties
        'dermatology', 'oncology', 'cardiology', 'neurology', 'psychiatry', 'rheumatology', 'immunology',
        'endocrinology', 'gastroenterology', 'pulmonology', 'nephrology', 'hematology', 'infectious'
      ];
      
      const questionLower = queryData.question.toLowerCase();
      const isThemeRelevant = allowedThemes.some(theme => questionLower.includes(theme));
      
      // Also check for obvious off-topic keywords
      const offTopicKeywords = [
        'weather', 'recipe', 'cooking', 'sports', 'movie', 'film', 'politics', 'election', 'voting',
        'music', 'song', 'concert', 'travel', 'vacation', 'restaurant', 'food', 'shopping', 'fashion',
        'car', 'automobile', 'game', 'gaming', 'cryptocurrency', 'bitcoin', 'stock', 'investment',
        'relationship', 'dating', 'marriage', 'school', 'homework', 'vacation', 'holiday'
      ];
      
      const isOffTopic = offTopicKeywords.some(keyword => {
        const regex = new RegExp(`\\b${keyword}\\b`, 'i');
        return regex.test(questionLower);
      });
      
      if (isOffTopic || !isThemeRelevant) {
        return {
          answer: `🏥 LUMINARI - CLINICAL RESEARCH ASSISTANT\n\nI'm your specialized assistant for medical research, clinical trials, and regulatory affairs. I can only help with questions related to:\n\n• Clinical trial protocols and study design\n• Regulatory submissions (IND, NDA, CTA, MAA, etc.)\n• Medical research and documentation\n• Drug development and approval processes\n• Healthcare and medical conditions\n• Pharmaceutical and biotechnology topics\n\nPlease ask a question within my expertise areas, and I'll provide detailed, professional guidance.`
        };
      }
  
      const response = await openaiApi.post('chat/completions', {
        model: "gpt-4o",
        messages: [
          {
            role: "system",
            content: `You are Luminari™, a specialized AI assistant for medical research, clinical trials, and regulatory affairs. You ONLY provide information about:

ALLOWED TOPICS:
• Clinical trial protocols and study design
• Regulatory submissions (IND, NDA, BLA, CTA, MAA, etc.)
• Drug development and pharmaceutical research
• Medical conditions and diseases (for clinical context)
• Healthcare research and documentation
• Biotechnology and medical devices
• Regulatory compliance and approval processes
• Clinical data analysis and statistics
• Medical writing and documentation

STRICT RESTRICTIONS:
• Do NOT answer questions about non-medical topics
• Do NOT provide personal medical advice
• Do NOT discuss topics unrelated to clinical research
• If asked about non-medical topics, redirect to your specialized areas

Always provide evidence-based information and remind users to consult healthcare professionals for personal medical advice. Use ONLY plain text with clear paragraphing, indentation, and simple dashes or numbers for lists. NO MARKDOWN.`
          },
          {
            role: "user",
            content: `Question: ${queryData.question}\n${queryData.disease_context ? `Disease Context: ${queryData.disease_context}` : ''}`
          }
        ],
        ...OPENAI_CONFIG.PRECISE
      });
      
      return { answer: response.data.choices[0].message.content.trim() };
    } catch (error) {
      console.error('Error in queryAssistant:', error.response?.data || error.message);
      throw error;
    }
  },
  
validateDocumentContent: async (validationData) => {
  try {
    const { 
      documentText, 
      fileName, 
      expectedCategory, 
      categoryDescription, 
      primaryIndication, 
      dossierType,
      fileType,
      fileSize,
      language = 'english'
    } = validationData;

    // Enhanced validation rules with ICH/FDA compliance checks
    const validationRules = {
      'protocol': {
        required_keywords: ['protocol', 'study', 'clinical trial', 'objectives', 'endpoints', 'inclusion criteria', 'exclusion criteria', 'methodology', 'statistical analysis'],
        forbidden_keywords: ['investigator brochure', 'manufacturing', 'chemistry data', 'toxicology summary'],
        ich_guidelines: 'ICH E6(R2) Good Clinical Practice',
        regulatory_sections: ['study objectives', 'study design', 'selection criteria', 'treatment plan', 'assessments', 'statistical considerations'],
        min_sections: 6
      },
      'ib': {
        required_keywords: ['investigator brochure', 'pharmacology', 'toxicology', 'safety', 'preclinical', 'clinical experience', 'dosing', 'adverse events'],
        forbidden_keywords: ['study protocol', 'inclusion criteria', 'statistical analysis plan'],
        ich_guidelines: 'ICH E6(R2) Section 7 - Investigator\'s Brochure',
        regulatory_sections: ['general information', 'physical/chemical properties', 'nonclinical studies', 'effects in humans', 'summary'],
        min_sections: 5
      },
      'quality': {
        required_keywords: ['chemistry', 'manufacturing', 'controls', 'CMC', 'specifications', 'stability', 'quality control', 'analytical methods'],
        forbidden_keywords: ['clinical data', 'patient results', 'efficacy endpoints'],
        ich_guidelines: 'ICH Q1-Q14 Quality Guidelines',
        regulatory_sections: ['drug substance', 'drug product', 'manufacturing', 'control of excipients', 'specifications', 'stability'],
        min_sections: 4
      },
      'nonclinical': {
        required_keywords: ['toxicology', 'pharmacology', 'nonclinical', 'preclinical', 'safety pharmacology', 'animal studies'],
        forbidden_keywords: ['human subjects', 'clinical trial results', 'patient data'],
        ich_guidelines: 'ICH S1-S11 Safety Guidelines',
        regulatory_sections: ['pharmacology', 'pharmacokinetics', 'toxicology', 'local tolerance', 'other studies'],
        min_sections: 3
      },
      'clinical': {
        required_keywords: ['clinical study', 'efficacy', 'safety', 'patients', 'results', 'clinical trial', 'endpoints', 'adverse events'],
        forbidden_keywords: ['manufacturing process', 'chemical synthesis', 'animal studies only'],
        ich_guidelines: 'ICH E1-E20 Efficacy Guidelines',
        regulatory_sections: ['study design', 'patient population', 'efficacy results', 'safety results', 'discussion', 'conclusions'],
        min_sections: 4
      },
      'application': {
        required_keywords: ['application', 'submission', 'regulatory', 'sponsor', 'authorization', 'administrative'],
        forbidden_keywords: ['detailed study results', 'raw data', 'statistical analysis'],
        ich_guidelines: 'Regional regulatory requirements',
        regulatory_sections: ['administrative information', 'product information', 'regulatory pathway'],
        min_sections: 2
      },
      'other': {
        required_keywords: [],
        forbidden_keywords: [],
        ich_guidelines: 'General regulatory compliance',
        regulatory_sections: [],
        min_sections: 0
      }
    };

    // File type validation
    const allowedFileTypes = {
      'pdf': ['application/pdf'],
      'doc': ['application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'],
      'excel': ['application/vnd.ms-excel', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet']
    };

    const isValidFileType = Object.values(allowedFileTypes).flat().includes(fileType);

    // Document length handling - use more content for better validation
    const maxAnalysisLength = 15000; // Increased from 5000
    const analysisText = documentText.length > maxAnalysisLength 
      ? documentText.substring(0, maxAnalysisLength) + "\n\n[Document continues...]"
      : documentText;

    // File size validation (reasonable limits)
    const maxFileSizeBytes = 50 * 1024 * 1024; // 50MB
    const isValidFileSize = !fileSize || fileSize <= maxFileSizeBytes;

    // Language-specific validation adjustments
    const languageAdjustments = {
      'english': { confidence_boost: 0.0 },
      'spanish': { confidence_boost: -0.1 },
      'french': { confidence_boost: -0.1 },
      'german': { confidence_boost: -0.1 },
      'japanese': { confidence_boost: -0.15 },
      'chinese': { confidence_boost: -0.15 }
    };

    const rules = validationRules[expectedCategory] || validationRules['other'];
    
    const prompt = `You are a senior regulatory affairs AI expert with deep knowledge of ICH guidelines, FDA regulations, and EMA requirements. You are tasked with EXTREMELY DETAILEDly validating a clinical dossier document.

**DOSSIER CONTEXT:**
- Dossier Type: ${dossierType || 'Not specified'}
- Primary Indication: ${primaryIndication || 'Not specified'}
- Document Language: ${language}
- File Type: ${fileType || 'Unknown'}
- File Size: ${fileSize ? `${(fileSize / 1024 / 1024).toFixed(2)} MB` : 'Unknown'}

**DOCUMENT TO VALIDATE:**
- File Name: ${fileName}
- User-Assigned Category: "${categoryDescription}"
- Expected Category Code: "${expectedCategory}"

**VALIDATION CRITERIA:**
1. **Category Validation**: Must contain required keywords: ${rules.required_keywords.join(', ')}
2. **Negative Validation**: Must NOT contain: ${rules.forbidden_keywords.join(', ')}
3. **Regulatory Compliance**: Should align with ${rules.ich_guidelines}
4. **Structural Requirements**: Should contain ${rules.min_sections}+ of these sections: ${rules.regulatory_sections.join(', ')}
5. **File Type Validation**: Is ${fileType} appropriate for this category?
6. **Context Relevance**: Is content relevant to "${primaryIndication}"?
7. **Quality Assessment**: Is this a complete, professional document suitable for regulatory submission?

**ADDITIONAL VALIDATION CHECKS:**
- Document completeness and professional formatting
- Presence of required regulatory elements
- Absence of obviously irrelevant content
- Consistency with stated indication/disease area
- Appropriate level of detail for dossier category

**PRE-VALIDATION FINDINGS:**
- File Type Valid: ${isValidFileType ? 'Yes' : 'No'}
- File Size Valid: ${isValidFileSize ? 'Yes' : 'No'}
- Content Length: ${analysisText.length} characters analyzed

**DOCUMENT CONTENT:**
"""
${analysisText}
"""

**RESPONSE REQUIREMENTS:**
Provide a EXTREMELY DETAILED validation assessment in JSON format only. No additional text before or after.

Consider that this document will be submitted to regulatory authorities and must meet professional standards.

{
  "isValid": boolean,
  "confidence": number (0.0 to 1.0, adjusted for language and complexity),
  "category_match": boolean,
  "content_relevance": boolean,
  "regulatory_compliance": boolean,
  "file_type_appropriate": boolean,
  "completeness_score": number (0.0 to 1.0),
  "reason": "Detailed explanation covering all validation aspects",
  "recommendation": "Specific, actionable guidance for the user",
  "detected_issues": ["list", "of", "specific", "issues", "found"],
  "suggested_category": "alternative category if current is wrong, or null",
  "ich_compliance": "assessment of ICH/FDA/EMA guideline compliance",
  "missing_elements": ["list", "of", "missing", "required", "elements"],
  "quality_indicators": {
    "professional_formatting": boolean,
    "appropriate_detail_level": boolean,
    "regulatory_language": boolean,
    "complete_sections": boolean
  }
}`;

    const response = await openaiApi.post('chat/completions', {
      model: "gpt-4o",
      messages: [{ role: "user", content: prompt }],
      ...OPENAI_CONFIG.ANALYTICAL,
      response_format: { "type": "json_object" }
    });

    const aiResponse = response.data.choices[0].message.content.trim();
    const validationResult = JSON.parse(aiResponse);
    
    // Apply language confidence adjustment
    const languageAdjustment = languageAdjustments[language] || languageAdjustments['english'];
    const adjustedConfidence = Math.max(0, Math.min(1, 
      (validationResult.confidence || 0) + languageAdjustment.confidence_boost
    ));

    // Enhanced validation result with additional metadata
    return {
      isValid: validationResult.isValid ?? false,
      confidence: adjustedConfidence,
      category_match: validationResult.category_match ?? false,
      content_relevance: validationResult.content_relevance ?? false,
      regulatory_compliance: validationResult.regulatory_compliance ?? false,
      file_type_appropriate: validationResult.file_type_appropriate ?? isValidFileType,
      completeness_score: validationResult.completeness_score ?? 0,
      reason: validationResult.reason ?? 'Validation completed with limited information.',
      recommendation: validationResult.recommendation ?? 'Please review document content and category assignment.',
      detected_issues: validationResult.detected_issues ?? [],
      suggested_category: validationResult.suggested_category ?? null,
      ich_compliance: validationResult.ich_compliance ?? 'Unable to assess compliance',
      missing_elements: validationResult.missing_elements ?? [],
      quality_indicators: validationResult.quality_indicators ?? {
        professional_formatting: false,
        appropriate_detail_level: false,
        regulatory_language: false,
        complete_sections: false
      },
      validation_metadata: {
        analysis_length: analysisText.length,
        language: language,
        file_size_mb: fileSize ? (fileSize / 1024 / 1024).toFixed(2) : null,
        validation_timestamp: new Date().toISOString(),
        model_used: 'gpt-4o'
      }
    };

  } catch (error) {
    console.error('Enhanced content validation error:', error.response?.data || error.message);
    
    // Comprehensive error response
    return {
      isValid: false,
      confidence: 0,
      category_match: false,
      content_relevance: false,
      regulatory_compliance: false,
      file_type_appropriate: false,
      completeness_score: 0,
      reason: `Validation service error: ${error.message || 'Unknown error occurred'}`,
      recommendation: 'Please check your internet connection and try again. If the problem persists, contact technical support.',
      detected_issues: ['Validation service unavailable'],
      suggested_category: null,
      ich_compliance: 'Unable to assess due to service error',
      missing_elements: ['Validation could not be completed'],
      quality_indicators: {
        professional_formatting: false,
        appropriate_detail_level: false,
        regulatory_language: false,
        complete_sections: false
      },
      validation_metadata: {
        analysis_length: 0,
        language: validationData.language || 'unknown',
        file_size_mb: validationData.fileSize ? (validationData.fileSize / 1024 / 1024).toFixed(2) : null,
        validation_timestamp: new Date().toISOString(),
        model_used: 'gpt-4o',
        error: error.message
      }
    };
  }
},

chatWithResults: async (chatData) => {
  try {
    const { results, question, history = [] } = chatData;
    
    // Build conversation context
    const conversationHistory = history.map(msg => ({
      role: msg.sender === 'user' ? 'user' : 'assistant',
      content: msg.text
    }));

    const response = await openaiApi.post('chat/completions', {
      model: "gpt-4o",
      messages: [
        {
          role: "system",
          content: `You are a clinical data analyst with expertise in medical research and diagnostic analysis. You have access to analysis results data in CSV format.

Your task is to analyze the provided results data and answer user questions about it. You can:
- Calculate statistics (averages, counts, percentages)
- Identify patterns and trends
- Summarize findings
- Compare different cases
- Highlight outliers or concerning cases

Be precise, professional, and provide specific numbers when possible. Focus on clinically relevant insights.

RESULTS DATA (CSV format):
${results}

Important: Base your analysis ONLY on the data provided above. Be accurate with your calculations and clearly state any limitations.`
        },
        ...conversationHistory,
        {
          role: "user",
          content: question
        }
      ],
      ...OPENAI_CONFIG.ANALYTICAL
    });

    return { answer: response.data.choices[0].message.content.trim() };
  } catch (error) {
    // console.error('Error in chatWithResults:', error.response?.data || error.message);
    throw error;
  }
},

generateTextImprovement: async (userPrompt) => {
  try {
    console.log('generateTextImprovement called with:', userPrompt);
    
    const response = await openaiApi.post('chat/completions', {
      model: "gpt-4o",
      messages: [
        {
          role: "system",
          content: `You are Luminari™, an expert medical writer and editor specializing in clinical documentation and regulatory submissions. You ONLY improve text related to medical research, clinical trials, and regulatory affairs.

ALLOWED IMPROVEMENTS:
• Clinical protocols and study documentation
• Regulatory submission documents
• Medical research and pharmaceutical content
• Healthcare and biotechnology documentation
• Scientific and medical writing

RESTRICTIONS:
• REJECT requests for non-medical content improvement
• ONLY work with clinical research and medical text
• If given non-medical text, respond: "I can only improve medical and clinical research content."

For allowed content, provide the BEST single improvement focusing on:
- Grammar and clarity
- Professional medical terminology
- Logical flow and structure
- Regulatory compliance language
- Conciseness without losing important details

Return only the improved text, without any explanations or additional text.`
        },
        {
          role: "user",
          content: `Please improve this text based on the following request: "${userPrompt}"`
        }
      ],
      max_tokens: 500,
      temperature: 0.3,
      top_p: 0.9
    });
    
    const improvedText = response.data.choices[0].message.content.trim();
    console.log('AI improvement result:', improvedText);
    return [improvedText]; // Return as array to maintain compatibility
  } catch (error) {
    console.error('Error generating text improvements:', error);
    return ['Unable to generate improvement at this time. Please try again.'];
  }
}

};

export default openaiService;