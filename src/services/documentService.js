import axios from 'axios';

const API_BASE_URL = process.env.REACT_APP_DOCUMENTS_API_URL || 'https://luminari-be.onrender.com';

/**
 * Document Service - Helper functions for saving and retrieving documents
 */

const getAuthHeaders = () => {
  const token = localStorage.getItem('authToken');
  return {
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json'
    }
  };
};

const getUserId = () => {
  const userStr = localStorage.getItem('user');
  if (userStr) {
    try {
      const user = JSON.parse(userStr);
      return user.id;
    } catch (e) {
      console.error('Error parsing user:', e);
    }
  }
  return null;
};

/**
 * Save a protocol document
 * Maps formData to specific Protocol schema fields
 */
export const saveProtocol = async ({
  title,
  description,
  disease,
  content,
  formData = {},
  studyDesign
}) => {
  try {
    // Map formData to specific protocol fields
    let protocolData = {
      title: title || `Protocol for ${formData.disease || disease || 'Untitled'}`,
      description: description || `${formData.studyType || ''} study for ${formData.population || ''}`.trim(),
      disease: disease || formData.disease || '',
      indication: formData.indication,

      // Study Design
      studyType: formData.studyType,
      studyPhase: formData.studyPhase,
      trialType: formData.trialType,
      blinding: formData.blinding,
      randomization: formData.randomization,

      // Population
      population: formData.population,
      minAge: formData.minAge ? parseInt(formData.minAge) : null,
      maxAge: formData.maxAge ? parseInt(formData.maxAge) : null,
      gender: formData.gender,
      targetSampleSize: formData.targetSampleSize ? parseInt(formData.targetSampleSize) : null,
      inclusionCriteria: formData.inclusionCriteria,
      exclusionCriteria: formData.exclusionCriteria,

      // Treatment
      treatment: formData.treatment,
      drugClass: formData.drugClass,
      mechanism: formData.mechanism,
      routeOfAdmin: formData.routeOfAdmin,
      dosingRegimen: formData.dosingRegimen,
      comparatorDrug: formData.comparatorDrug,
      controlGroup: formData.controlGroup,

      // Endpoints
      primaryEndpoints: formData.primaryEndpoints,
      secondaryEndpoints: formData.secondaryEndpoints,
      outcomeMeasures: formData.outcomeMeasures,

      // Statistical
      statisticalPower: formData.statisticalPower,
      significanceLevel: formData.significanceLevel,
      studyDuration: formData.studyDuration,

      // Preclinical
      animalModel: formData.animalModel,
      animalStrain: formData.animalStrain,

      // Content
      fullProtocol: content,

      // Metadata
      tags: [disease || formData.disease, formData.studyType, 'protocol'].filter(Boolean)
    };

    // Check payload size and truncate if necessary (limit to 4MB to prevent 413 errors)
    const payloadSize = JSON.stringify(protocolData).length;
    const maxSize = 4 * 1024 * 1024; // 4MB conservative limit

    if (payloadSize > maxSize) {
      console.warn(`Protocol payload (${Math.round(payloadSize / 1024 / 1024 * 100) / 100}MB) exceeds limit. Truncating content...`);

      // Calculate how much we need to truncate
      const maxContentLength = Math.floor(maxSize * 0.6); // Use 60% of limit for content field
      if (protocolData.fullProtocol && protocolData.fullProtocol.length > maxContentLength) {
        protocolData.fullProtocol = protocolData.fullProtocol.substring(0, maxContentLength) + '\n\n[CONTENT TRUNCATED DUE TO SIZE LIMIT - PROTOCOL TOO LARGE]';
      }
    }

    const response = await axios.post(
      `${API_BASE_URL}/protocols`,
      protocolData,
      {
        ...getAuthHeaders(),
        timeout: 30000, // 30 second timeout for large documents
        maxContentLength: maxSize,
        maxBodyLength: maxSize
      }
    );

    return { success: true, data: response.data };
  } catch (error) {
    console.error('Save protocol error:', error);
    return { success: false, error: error.response?.data?.message || error.message };
  }
};

/**
 * Save a study design
 * Maps formData and sections to specific StudyDesign schema fields
 */
export const saveStudyDesign = async ({
  title,
  description,
  disease,
  content,
  formData = {},
  cmcSection,
  clinicalSection
}) => {
  try {
    // Map formData to specific study design fields
    let studyDesignData = {
      title: title || `Study Design for ${formData.disease || disease || 'Untitled'}`,
      description: description || `${formData.studyPhase || ''} ${formData.studyType || ''} study`.trim(),
      disease: disease || formData.disease || '',

      // Study Parameters
      studyPhase: formData.studyPhase,
      studyType: formData.studyType,
      blinding: formData.blinding,
      randomization: formData.randomization,
      controlGroup: formData.controlGroup,

      // Population
      population: formData.population,
      minAge: formData.minAge ? parseInt(formData.minAge) : null,
      maxAge: formData.maxAge ? parseInt(formData.maxAge) : null,
      targetSampleSize: formData.targetSampleSize ? parseInt(formData.targetSampleSize) : null,
      inclusionCriteria: formData.inclusionCriteria,
      exclusionCriteria: formData.exclusionCriteria,

      // Treatment
      drugName: formData.drugName || formData.treatment,
      drugClass: formData.drugClass,
      mechanism: formData.mechanism,
      routeOfAdmin: formData.routeOfAdmin,
      dosingFrequency: formData.dosingFrequency || formData.dosingRegimen,
      treatmentDuration: formData.treatmentDuration || formData.studyDuration,

      // Endpoints
      primaryEndpoints: formData.primaryEndpoints,
      secondaryEndpoints: formData.secondaryEndpoints,
      safetyMonitoring: formData.safetyMonitoring,

      // CMC and Clinical sections
      cmcFull: cmcSection,
      clinicalFull: clinicalSection,

      // Complete Document
      fullDocument: content,

      // Metadata
      tags: [disease || formData.disease, formData.studyPhase, 'study_design'].filter(Boolean)
    };

    // Check payload size and truncate if necessary (limit to 4MB to prevent 413 errors)
    const payloadSize = JSON.stringify(studyDesignData).length;
    const maxSize = 4 * 1024 * 1024; // 4MB conservative limit

    if (payloadSize > maxSize) {
      console.warn(`Study design payload (${Math.round(payloadSize / 1024 / 1024 * 100) / 100}MB) exceeds limit. Truncating content...`);

      // Truncate large fields proportionally
      const maxContentLength = Math.floor(maxSize * 0.2); // 20% for each major field
      if (studyDesignData.fullDocument && studyDesignData.fullDocument.length > maxContentLength) {
        studyDesignData.fullDocument = studyDesignData.fullDocument.substring(0, maxContentLength) + '\n\n[CONTENT TRUNCATED DUE TO SIZE LIMIT]';
      }
      if (studyDesignData.cmcFull && studyDesignData.cmcFull.length > maxContentLength) {
        studyDesignData.cmcFull = studyDesignData.cmcFull.substring(0, maxContentLength) + '\n\n[CONTENT TRUNCATED DUE TO SIZE LIMIT]';
      }
      if (studyDesignData.clinicalFull && studyDesignData.clinicalFull.length > maxContentLength) {
        studyDesignData.clinicalFull = studyDesignData.clinicalFull.substring(0, maxContentLength) + '\n\n[CONTENT TRUNCATED DUE TO SIZE LIMIT]';
      }
    }

    const response = await axios.post(
      `${API_BASE_URL}/study-designs`,
      studyDesignData,
      {
        ...getAuthHeaders(),
        timeout: 30000,
        maxContentLength: maxSize,
        maxBodyLength: maxSize
      }
    );

    return { success: true, data: response.data };
  } catch (error) {
    console.error('Save study design error:', error);
    return { success: false, error: error.response?.data?.message || error.message };
  }
};

/**
 * Save a regulatory document
 * Maps sections to specific RegulatoryDocument schema fields
 */
export const saveRegulatoryDocument = async ({
  title,
  description,
  disease,
  country,
  region,
  documentType,
  content,
  sections = {},
  cmcSection,
  clinicalSection
}) => {
  try {
    // Map sections to specific regulatory document fields
    let regulatoryData = {
      title: title || `${documentType || 'Regulatory Document'} for ${disease || 'Untitled'}`,
      description: description || `${documentType} submission for ${country}`.trim(),
      documentType: documentType || 'IND',

      // Geographic
      country: country || 'US',
      region: region,

      // Drug Info
      disease: disease,
      drugName: sections.drugName,
      drugClass: sections.drugClass,
      indication: sections.indication,

      // Sections
      executiveSummary: sections.executive_summary || sections.executiveSummary,
      coverLetter: sections.cover_letter || sections.coverLetter,
      formsFDA: sections.forms_fda || sections.formsFDA,
      ctdSummary: sections.ctd_summary || sections.ctdSummary,
      overallSummary: sections.overall_summary || sections.overallSummary,

      // CMC sections
      cmcDrugSubstance: sections.cmc_drug_substance || sections.cmcDrugSubstance,
      cmcDrugProduct: sections.cmc_drug_product || sections.cmcDrugProduct,
      cmcManufacturing: sections.cmc_manufacturing || sections.cmcManufacturing,
      cmcControls: sections.cmc_controls || sections.cmcControls,
      cmcStability: sections.cmc_stability || sections.cmcStability,
      cmcFull: cmcSection || sections.cmc_section || sections.cmcFull,

      // Nonclinical
      nonclinicalPharmacology: sections.nonclinical_pharmacology || sections.nonclinicalPharmacology,
      nonclinicalToxicology: sections.nonclinical_toxicology || sections.nonclinicalToxicology,

      // Clinical
      clinicalOverview: sections.clinical_overview || sections.clinicalOverview,
      clinicalSummary: sections.clinical_summary || sections.clinicalSummary,
      clinicalStudyReports: sections.clinical_study_reports || sections.clinicalStudyReports,
      clinicalEfficacy: sections.clinical_efficacy || sections.clinicalEfficacy,
      clinicalSafety: sections.clinical_safety || sections.clinicalSafety,
      clinicalFull: clinicalSection || sections.clinical_section || sections.clinicalFull,

      // Full document
      fullDocument: content || sections.full_document || sections.fullDocument,

      // Metadata
      tags: [disease, country, documentType].filter(Boolean)
    };

    // Check payload size and truncate if necessary (limit to 4MB to prevent 413 errors)
    const payloadSize = JSON.stringify(regulatoryData).length;
    const maxSize = 4 * 1024 * 1024; // 4MB conservative limit

    if (payloadSize > maxSize) {
      console.warn(`Regulatory document payload (${Math.round(payloadSize / 1024 / 1024 * 100) / 100}MB) exceeds limit. Truncating content...`);

      // Truncate large fields
      const largeFields = [
        'fullDocument', 'cmcFull', 'clinicalFull',
        'executiveSummary', 'coverLetter', 'ctdSummary', 'overallSummary',
        'cmcDrugSubstance', 'cmcDrugProduct', 'cmcManufacturing', 'cmcControls', 'cmcStability',
        'nonclinicalPharmacology', 'nonclinicalToxicology',
        'clinicalOverview', 'clinicalSummary', 'clinicalStudyReports', 'clinicalEfficacy', 'clinicalSafety'
      ];

      const maxFieldLength = Math.floor(maxSize * 0.1); // 10% per field (more aggressive)
      largeFields.forEach(field => {
        if (regulatoryData[field] && regulatoryData[field].length > maxFieldLength) {
          regulatoryData[field] = regulatoryData[field].substring(0, maxFieldLength) + '\n\n[CONTENT TRUNCATED DUE TO SIZE LIMIT]';
        }
      });
    }

    const response = await axios.post(
      `${API_BASE_URL}/regulatory-documents`,
      regulatoryData,
      {
        ...getAuthHeaders(),
        timeout: 30000,
        maxContentLength: maxSize,
        maxBodyLength: maxSize
      }
    );

    return { success: true, data: response.data };
  } catch (error) {
    console.error('Save regulatory document error:', error);
    return { success: false, error: error.response?.data?.message || error.message };
  }
};

/**
 * Save a conversation (Ask Lumina)
 */
export const saveConversation = async ({
  title,
  description,
  messages,
  tags = []
}) => {
  try {
    const response = await axios.post(
      `${API_BASE_URL}/my-conversations`,
      {
        title,
        description,
        messages,
        tags
      },
      getAuthHeaders()
    );

    return { success: true, data: response.data };
  } catch (error) {
    console.error('Save conversation error:', error);
    return { success: false, error: error.message };
  }
};

/**
 * Get user's documents
 */
export const getMyDocuments = async (type = null, starred = false) => {
  try {
    let url = `${API_BASE_URL}/my-documents`;
    const params = new URLSearchParams();

    if (type) params.append('type', type);
    if (starred) params.append('starred', 'true');

    if (params.toString()) {
      url += `?${params.toString()}`;
    }

    const response = await axios.get(url, getAuthHeaders());
    return { success: true, data: response.data };
  } catch (error) {
    console.error('Get documents error:', error);
    return { success: false, error: error.message };
  }
};

/**
 * Get user's conversations
 */
export const getMyConversations = async (starred = false) => {
  try {
    let url = `${API_BASE_URL}/my-conversations`;
    if (starred) url += '?starred=true';

    const response = await axios.get(url, getAuthHeaders());
    return { success: true, data: response.data };
  } catch (error) {
    console.error('Get conversations error:', error);
    return { success: false, error: error.message };
  }
};

/**
 * Toggle star status
 */
export const toggleDocumentStar = async (documentId, starred, isConversation = false) => {
  try {
    const endpoint = isConversation
      ? `/my-conversations/${documentId}/star`
      : `/my-documents/${documentId}/star`;

    const response = await axios.patch(
      `${API_BASE_URL}${endpoint}`,
      { starred },
      getAuthHeaders()
    );

    return { success: true, data: response.data };
  } catch (error) {
    console.error('Toggle star error:', error);
    return { success: false, error: error.message };
  }
};

export default {
  saveProtocol,
  saveStudyDesign,
  saveRegulatoryDocument,
  saveConversation,
  getMyDocuments,
  getMyConversations,
  toggleDocumentStar
};
