// src/services/api.js - UPDATED TO EXPOSE ALL OPENAI FUNCTIONS

import openaiService from './openaiService';
import dossierService from './dossierService';
import axios from 'axios';

// Backend API URL (update for production as needed)
const DOCUMENTS_API_URL = process.env.REACT_APP_DOCUMENTS_API_URL || 'http://localhost:4000';

// --- Backend Document API Integration ---

/**
 * Save a generated document to the backend database.
 * @param {Object} documentData - The document object matching your Prisma schema.
 * @returns {Promise<Object>} - The saved document from the backend.
 */
export async function saveDocument(documentData) {
  const token = localStorage.getItem('authToken');
  
  if (!token) {
    console.error('No auth token found. Please log in first.');
    throw new Error('Authentication required. Please log in to save documents.');
  }
  
  // Check document size before sending (limit to 10MB JSON)
  const documentSize = JSON.stringify(documentData).length;
  const maxSize = 10 * 1024 * 1024; // 10MB
  
  if (documentSize > maxSize) {
    console.warn(`Document size (${Math.round(documentSize / 1024 / 1024 * 100) / 100}MB) exceeds limit. Truncating content...`);
    
    // Truncate content if too large
    const truncatedData = { ...documentData };
    if (truncatedData.content && typeof truncatedData.content === 'string') {
      const maxContentLength = Math.floor(maxSize * 0.8); // Use 80% of limit for content
      if (truncatedData.content.length > maxContentLength) {
        truncatedData.content = truncatedData.content.substring(0, maxContentLength) + '\n\n[CONTENT TRUNCATED DUE TO SIZE LIMIT]';
      }
    }
    documentData = truncatedData;
  }
  
  const headers = { 
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json'
  };
  
  try {
    const response = await axios.post(`${DOCUMENTS_API_URL}/documents`, documentData, {
      headers,
      timeout: 30000, // 30 second timeout for large documents
      maxContentLength: maxSize,
      maxBodyLength: maxSize
    });
    return response.data;
  } catch (error) {
    console.error('Document save error:', error.response?.data || error.message);
    
    if (error.response?.status === 401) {
      console.error('Authentication failed. Token may be expired.');
      throw new Error('Session expired. Please log in again.');
    } else if (error.response?.status === 403) {
      console.error('Access forbidden. User may not have permission to save documents.');
      throw new Error('Access denied. You may not have permission to save documents. Please check your account privileges.');
    } else if (error.response?.status === 413) {
      console.error('Document too large for server.');
      throw new Error('Document is too large to save. Please try generating a shorter protocol or contact support.');
    } else if (error.response?.status === 429) {
      console.error('Rate limit exceeded.');
      throw new Error('Too many requests. Please wait a moment before trying again.');
    } else if (error.code === 'ECONNABORTED') {
      console.error('Request timeout.');
      throw new Error('Request timeout. The document may be too large or the server is slow. Please try again.');
    }
    
    throw error;
  }
}

/**
 * Fetch all documents from the backend database.
 * @returns {Promise<Array>} - Array of documents from the backend.
 */
export async function fetchDocuments() {
  const token = localStorage.getItem('authToken');
  
  if (!token) {
    console.error('No auth token found. Please log in first.');
    throw new Error('Authentication required. Please log in to view documents.');
  }
  
  const headers = { Authorization: `Bearer ${token}` };
  
  try {
    const response = await axios.get(`${DOCUMENTS_API_URL}/documents`, {
      headers
    });
    return response.data;
  } catch (error) {
    if (error.response?.status === 401) {
      console.error('Authentication failed. Token may be expired.');
      throw new Error('Session expired. Please log in again.');
    }
    throw error;
  }
}
// Backend prediction endpoints
const LUNG_CANCER_API_URL = process.env.REACT_APP_LUNG_CANCER_API_URL || 'https://lung-cancer-backend-n84h.onrender.com';

// In-memory protocol storage for listProtocols
const protocolHistory = [];

const apiService = {
  // Existing methods
  generateProtocol: async (diseaseData) => {
    try {
      const result = await openaiService.generateProtocol(diseaseData);
      protocolHistory.push({
        protocol_id: result.protocol_id,
        disease_name: diseaseData.disease_name,
        generation_date: new Date().toISOString(),
        protocol_type: "Phase 2"
      });
      return result;
    } catch (error) {
      console.error('Error generating protocol:', error);
      throw error;
    }
  },

  // ENHANCED COMPREHENSIVE ROUTING FOR ALL REGULATORY DOCUMENTS
  generateIndModule: async (data) => {
    try {
      const documentTypeName = data.additional_parameters?.document_type || "IND (Investigational New Drug)";
      const country = data.additional_parameters?.country;
      const lowerDocName = documentTypeName.toLowerCase();

      // =============================================================================
      // UNITED STATES DOCUMENTS
      // =============================================================================
      if (documentTypeName === "IND (Investigational New Drug)" || 
          (lowerDocName.includes("ind") && (!country || country.toLowerCase() === 'united states' || country.toLowerCase() === 'usa'))) {
        return await openaiService.generateSectionBasedDocument('ind', data);
      }
      
      if (documentTypeName === "NDA (New Drug Application)" || 
          (lowerDocName.includes("nda") && (!country || country.toLowerCase() === 'united states' || country.toLowerCase() === 'usa'))) {
        return await openaiService.generateSectionBasedDocument('nda', data);
      }
      
      if (documentTypeName === "BLA (Biologics License Application)") {
        return await openaiService.generateSectionBasedDocument('bla', data);
      }

      // =============================================================================
      // CANADA DOCUMENTS
      // =============================================================================
      if (documentTypeName === "Clinical Trial Application (Health Canada)" || 
          (lowerDocName.includes("cta") && country?.toLowerCase() === 'canada')) {
        return await openaiService.generateSectionBasedDocument('cta_ca', data);
      }
      
      if (documentTypeName === "New Drug Submission (NDS)") {
        return await openaiService.generateSectionBasedDocument('nds', data);
      }
      
      if (documentTypeName === "Notice of Compliance (NOC)") {
        return await openaiService.generateNOC(data);
      }

      // =============================================================================
      // MEXICO DOCUMENTS
      // =============================================================================
      if (documentTypeName === "COFEPRIS Clinical Trial Authorization") {
        return await openaiService.generateCOFEPRIS_CTA(data);
      }
      
      if (documentTypeName === "COFEPRIS New Drug Registration") {
        return await openaiService.generateCOFEPRIS_NDA(data);
      }

      // =============================================================================
      // EUROPEAN UNION DOCUMENTS
      // =============================================================================
      if (documentTypeName === "CTA (Clinical Trial Application)" || 
          (lowerDocName.includes("cta") && (country?.toLowerCase() === 'european union' || country?.toLowerCase() === 'eu'))) {
        return await openaiService.generateSectionBasedDocument('cta', data);
      }
      
      if (documentTypeName === "MAA (Marketing Authorization Application)") {
        return await openaiService.generateSectionBasedDocument('maa', data);
      }
      
      if (documentTypeName === "IMPD (Investigational Medicinal Product Dossier)") {
        return await openaiService.generateSectionBasedDocument('impd', data);
      }

      // =============================================================================
      // UNITED KINGDOM DOCUMENTS
      // =============================================================================
      if (documentTypeName === "Clinical Trial Authorisation (UK)" || 
          (lowerDocName.includes("cta") && country?.toLowerCase() === 'united kingdom')) {
        return await openaiService.generateSectionBasedDocument('cta_uk', data);
      }
      
      if (documentTypeName === "Marketing Authorisation (UK)") {
        return await openaiService.generateSectionBasedDocument('ma_uk', data);
      }
      
      if (documentTypeName === "Voluntary Scheme for Branded Medicines Pricing") {
        return await openaiService.generateVIE(data);
      }

      // =============================================================================
      // SWITZERLAND DOCUMENTS
      // =============================================================================
      if (documentTypeName === "Clinical Trial Authorisation (Swissmedic)" || 
          (lowerDocName.includes("cta") && country?.toLowerCase() === 'switzerland')) {
        return await openaiService.generateCTA_CH(data);
      }
      
      if (documentTypeName === "Marketing Authorisation (Switzerland)") {
        return await openaiService.generateSectionBasedDocument('ma_ch', data);
      }

      // =============================================================================
      // RUSSIA DOCUMENTS
      // =============================================================================
      if (documentTypeName === "Clinical Trial Permit (Roszdravnadzor)" || 
          (lowerDocName.includes("cta") && country?.toLowerCase() === 'russia')) {
        return await openaiService.generateSectionBasedDocument('cta_ru', data);
      }
      
      if (documentTypeName === "Registration Dossier (Russia)") {
        return await openaiService.generateRD_RU(data);
      }
      
      if (documentTypeName === "Russian GMP Certificate") {
        return await openaiService.generateGMP_RU(data);
      }

      // =============================================================================
      // JAPAN DOCUMENTS
      // =============================================================================
      if (documentTypeName === "Clinical Trial Notification (CTN)" && country?.toLowerCase() === 'japan') {
        return await openaiService.generateCTN_JP(data);
      }
      
      if (documentTypeName === "J-NDA (New Drug Application)") {
        return await openaiService.generateSectionBasedDocument('jnda', data);
      }
      
      if (documentTypeName === "PMDA Scientific Advice") {
        return await openaiService.generatePMDA_CONSULTATION(data);
      }

      // =============================================================================
      // CHINA DOCUMENTS
      // =============================================================================
      if (documentTypeName === "IND (China)" || 
          (lowerDocName.includes("ind") && country?.toLowerCase() === 'china')) {
        return await openaiService.generateSectionBasedDocument('ind_ch', data);
      }
      
      if (documentTypeName === "NDA (China)" || 
          (lowerDocName.includes("nda") && country?.toLowerCase() === 'china')) {
        return await openaiService.generateSectionBasedDocument('nda_ch', data);
      }
      
      if (documentTypeName === "Drug Registration Certificate") {
        return await openaiService.generateDRUG_LICENSE_CH(data);
      }

      // =============================================================================
      // SOUTH KOREA DOCUMENTS
      // =============================================================================
      if (documentTypeName === "IND (Korea)" || 
          (lowerDocName.includes("ind") && country?.toLowerCase() === 'south korea')) {
        return await openaiService.generateSectionBasedDocument('ind_kr', data);
      }
      
      if (documentTypeName === "NDA (Korea)" || 
          (lowerDocName.includes("nda") && country?.toLowerCase() === 'south korea')) {
        return await openaiService.generateSectionBasedDocument('nda_kr', data);
      }
      
      if (documentTypeName === "Korean GMP Certificate") {
        return await openaiService.generateKGMP(data);
      }

      // =============================================================================
      // AUSTRALIA DOCUMENTS
      // =============================================================================
      if (documentTypeName === "CTN (Clinical Trial Notification)" && country?.toLowerCase() === 'australia') {
        return await openaiService.generateCTN_AU(data);
      }
      
      if (documentTypeName === "AUS (Australian Submission)") {
        return await openaiService.generateSectionBasedDocument('aus', data);
      }
      
      if (documentTypeName === "TGA GMP Certificate") {
        return await openaiService.generateTGA_GMP(data);
      }

      // =============================================================================
      // SINGAPORE DOCUMENTS
      // =============================================================================
      if (documentTypeName === "Clinical Trial Certificate (HSA)" || 
          (lowerDocName.includes("cta") && country?.toLowerCase() === 'singapore')) {
        return await openaiService.generateCTA_SG(data);
      }
      
      if (documentTypeName === "Product License (Singapore)") {
        return await openaiService.generatePRODUCT_LICENSE_SG(data);
      }

      // =============================================================================
      // INDIA DOCUMENTS
      // =============================================================================
      if (documentTypeName === "Clinical Trial Permission (CDSCO)" || 
          (lowerDocName.includes("cta") && country?.toLowerCase() === 'india')) {
        return await openaiService.generateCTA_IN(data);
      }
      
      if (documentTypeName === "New Drug Application (India)" || 
          (lowerDocName.includes("nda") && country?.toLowerCase() === 'india')) {
        return await openaiService.generateSectionBasedDocument('nda_in', data);
      }
      
      if (documentTypeName === "Import License") {
        return await openaiService.generateIMPORT_LICENSE_IN(data);
      }

      // =============================================================================
      // TAIWAN DOCUMENTS
      // =============================================================================
      if (documentTypeName === "IND (Taiwan)" || 
          (lowerDocName.includes("ind") && country?.toLowerCase() === 'taiwan')) {
        return await openaiService.generateIND_TW(data);
      }
      
      if (documentTypeName === "NDA (Taiwan)" || 
          (lowerDocName.includes("nda") && country?.toLowerCase() === 'taiwan')) {
        return await openaiService.generateNDA_TW(data);
      }

      // =============================================================================
      // LATIN AMERICA DOCUMENTS
      // =============================================================================
      if (documentTypeName === "ANVISA Clinical Trial Authorization") {
        return await openaiService.generateANVISA_CTA(data);
      }
      
      if (documentTypeName === "ANVISA Registration Dossier") {
        return await openaiService.generateANVISA_NDA(data);
      }
      
      if (documentTypeName === "ANVISA GMP Certificate") {
        return await openaiService.generateANVISA_GMP(data);
      }
      
      if (documentTypeName === "ANMAT Clinical Trial Authorization") {
        return await openaiService.generateANMAT_CTA(data);
      }
      
      if (documentTypeName === "ANMAT Drug Registration") {
        return await openaiService.generateANMAT_NDA(data);
      }

      if (documentTypeName === "INVIMA Clinical Trial Permit") {
        return await openaiService.generateINVIMA_CTA(data);
      }
      
      if (documentTypeName === "INVIMA Drug Registration") {
        return await openaiService.generateINVIMA_NDA(data);
      }

      if (documentTypeName === "ISP Clinical Trial Authorization") {
        return await openaiService.generateISP_CTA(data);
      }
      
      if (documentTypeName === "ISP Drug Registration") {
        return await openaiService.generateISP_NDA(data);
      }

      // =============================================================================
      // AFRICA & MIDDLE EAST DOCUMENTS
      // =============================================================================
      if (documentTypeName === "SAHPRA Clinical Trial Authorization") {
        return await openaiService.generateSAHPRA_CTA(data);
      }

      if (documentTypeName === "SAHPRA Medicine Registration") {
        return await openaiService.generateSAHPRA_NDA(data);
      }

      if (documentTypeName === "Israeli MOH Clinical Trial Permit") {
        return await openaiService.generateMOH_ISRAEL_CTA(data);
      }
      
      if (documentTypeName === "Israeli Drug Registration") {
        return await openaiService.generateMOH_ISRAEL_NDA(data);
      }

      if (documentTypeName === "SFDA Clinical Trial Authorization") {
        return await openaiService.generateSFDA_CTA(data);
      }
      
      if (documentTypeName === "SFDA Drug Registration") {
        return await openaiService.generateSFDA_NDA(data);
      }

      if (documentTypeName === "DHA Clinical Trial Permit") {
        return await openaiService.generateDHA_CTA(data);
      }
      
      if (documentTypeName === "UAE Drug Registration") {
        return await openaiService.generateMOH_UAE_NDA(data);
      }

      // =============================================================================
      // FALLBACK LOGIC FOR GENERIC NAMES
      // =============================================================================
      
      // Generic IND routing
      if (lowerDocName.includes("ind")) {
        if (country?.toLowerCase() === 'china') {
          return await openaiService.generateSectionBasedDocument('ind_ch', data);
        } else if (country?.toLowerCase() === 'south korea') {
          return await openaiService.generateSectionBasedDocument('ind_kr', data);
        } else if (country?.toLowerCase() === 'taiwan') {
          return await openaiService.generateIND_TW(data);
        }
        return await openaiService.generateSectionBasedDocument('ind', data); // Default to US IND structure
      }
      
      // Generic NDA routing
      if (lowerDocName.includes("nda")) {
        if (country?.toLowerCase() === 'china') {
          return await openaiService.generateSectionBasedDocument('nda_ch', data);
        } else if (country?.toLowerCase() === 'japan') {
          return await openaiService.generateSectionBasedDocument('jnda', data);
        } else if (country?.toLowerCase() === 'south korea') {
          return await openaiService.generateSectionBasedDocument('nda_kr', data);
        } else if (country?.toLowerCase() === 'taiwan') {
          return await openaiService.generateNDA_TW(data);
        } else if (country?.toLowerCase() === 'india') {
          return await openaiService.generateSectionBasedDocument('nda_in', data);
        }
        return await openaiService.generateSectionBasedDocument('nda', data); // Default to US NDA structure
      }
      
      // Generic CTA routing
      if (lowerDocName.includes("cta") || lowerDocName.includes("clinical trial")) {
        if (country?.toLowerCase() === 'canada') {
          return await openaiService.generateSectionBasedDocument('cta_ca', data);
        } else if (country?.toLowerCase() === 'united kingdom' || country?.toLowerCase() === 'uk') {
          return await openaiService.generateSectionBasedDocument('cta_uk', data);
        } else if (country?.toLowerCase() === 'switzerland') {
          return await openaiService.generateCTA_CH(data);
        } else if (country?.toLowerCase() === 'russia') {
          return await openaiService.generateSectionBasedDocument('cta_ru', data);
        } else if (country?.toLowerCase() === 'singapore') {
          return await openaiService.generateCTA_SG(data);
        } else if (country?.toLowerCase() === 'india') {
          return await openaiService.generateCTA_IN(data);
        }
        return await openaiService.generateSectionBasedDocument('cta', data); // Default to EU CTA structure
      }

      // Generic CTN routing
      if (lowerDocName.includes("ctn") || lowerDocName.includes("notification")) {
        if (country?.toLowerCase() === 'japan') {
          return await openaiService.generateCTN_JP(data);
        } else if (country?.toLowerCase() === 'australia') {
          return await openaiService.generateCTN_AU(data);
        }
      }

      // Generic MAA routing
      if (lowerDocName.includes("maa") || lowerDocName.includes("marketing authorization") || lowerDocName.includes("marketing authorisation")) {
        if (country?.toLowerCase() === 'united kingdom' || country?.toLowerCase() === 'uk') {
          return await openaiService.generateSectionBasedDocument('ma_uk', data);
        } else if (country?.toLowerCase() === 'switzerland') {
          return await openaiService.generateSectionBasedDocument('ma_ch', data);
        }
        return await openaiService.generateSectionBasedDocument('maa', data); // Default to EU MAA structure
      }

      // =============================================================================
      // FINAL FALLBACK
      // =============================================================================
      return await openaiService.generateIndModule(data);
      
    } catch (error) {
      console.error('Error in API routing for regulatory document:', error);
      throw error;
    }
  },

  // This specific function might become redundant if generateIndModule handles all routing.
  // Kept for now if there's a direct call path, but ideally consolidate.
  generateRegulatoryDocument: async (data) => {
    // This function can delegate to the enhanced generateIndModule which now handles routing
    return await apiService.generateIndModule({
        disease_name: data.disease,
        additional_parameters: {
            drug_class: data.drugClass || undefined,
            mechanism: data.mechanism || undefined,
            country: data.country || undefined,
            document_type: data.documentType || undefined
        }
    });
  },

  // =============================================================================
  // EXPOSE ALL OPENAI SERVICE FUNCTIONS FOR BATCH PROCESSING
  // =============================================================================
  
  // United States
  generateNDA: openaiService.generateNDA,
  generateBLA: openaiService.generateBLA,
  
  // Canada  
  generateCTA_CA: openaiService.generateCTA_CA,
  generateNDS: openaiService.generateNDS,
  generateNOC: openaiService.generateNOC,
  
  // Mexico
  generateCOFEPRIS_CTA: openaiService.generateCOFEPRIS_CTA,
  generateCOFEPRIS_NDA: openaiService.generateCOFEPRIS_NDA,
  
  // Europe
  generateCTA: openaiService.generateCTA,
  generateMAA: openaiService.generateMAA,
  generateIMPD: openaiService.generateIMPD,
  
  // United Kingdom
  generateCTA_UK: openaiService.generateCTA_UK,
  generateMA_UK: openaiService.generateMA_UK,
  generateVIE: openaiService.generateVIE,
  
  // Switzerland
  generateCTA_CH: openaiService.generateCTA_CH,
  generateMA_CH: openaiService.generateMA_CH,
  
  // Russia
  generateCTA_RU: openaiService.generateCTA_RU,
  generateRD_RU: openaiService.generateRD_RU,
  generateGMP_RU: openaiService.generateGMP_RU,
  
  // Japan
  generateCTN_JP: openaiService.generateCTN_JP,
  generateJNDA: openaiService.generateJNDA,
  generatePMDA_CONSULTATION: openaiService.generatePMDA_CONSULTATION,
  
  // China
  generateIND_CH: openaiService.generateIND_CH,
  generateNDA_CH: openaiService.generateNDA_CH,
  generateDRUG_LICENSE_CH: openaiService.generateDRUG_LICENSE_CH,
  
  // South Korea
  generateIND_KR: openaiService.generateIND_KR,
  generateNDA_KR: openaiService.generateNDA_KR,
  generateKGMP: openaiService.generateKGMP,
  
  // Australia
  generateCTN_AU: openaiService.generateCTN_AU,
  generateAUS: openaiService.generateAUS,
  generateTGA_GMP: openaiService.generateTGA_GMP,
  
  // Singapore
  generateCTA_SG: openaiService.generateCTA_SG,
  generatePRODUCT_LICENSE_SG: openaiService.generatePRODUCT_LICENSE_SG,
  
  // India
  generateCTA_IN: openaiService.generateCTA_IN,
  generateNDA_IN: openaiService.generateNDA_IN,
  generateIMPORT_LICENSE_IN: openaiService.generateIMPORT_LICENSE_IN,
  
  // Taiwan
  generateIND_TW: openaiService.generateIND_TW,
  generateNDA_TW: openaiService.generateNDA_TW,
  
  // Latin America
  generateANVISA_CTA: openaiService.generateANVISA_CTA,
  generateANVISA_NDA: openaiService.generateANVISA_NDA,
  generateANVISA_GMP: openaiService.generateANVISA_GMP,
  generateANMAT_CTA: openaiService.generateANMAT_CTA,
  generateANMAT_NDA: openaiService.generateANMAT_NDA,
  generateINVIMA_CTA: openaiService.generateINVIMA_CTA,
  generateINVIMA_NDA: openaiService.generateINVIMA_NDA,
  generateISP_CTA: openaiService.generateISP_CTA,
  generateISP_NDA: openaiService.generateISP_NDA,
  
  // Africa & Middle East
  generateSAHPRA_CTA: openaiService.generateSAHPRA_CTA,
  generateSAHPRA_NDA: openaiService.generateSAHPRA_NDA,
  generateMOH_ISRAEL_CTA: openaiService.generateMOH_ISRAEL_CTA,
  generateMOH_ISRAEL_NDA: openaiService.generateMOH_ISRAEL_NDA,
  generateSFDA_CTA: openaiService.generateSFDA_CTA,
  generateSFDA_NDA: openaiService.generateSFDA_NDA,
  generateDHA_CTA: openaiService.generateDHA_CTA,
  generateMOH_UAE_NDA: openaiService.generateMOH_UAE_NDA,

  // Pass through methods from openaiService
  queryAssistant: openaiService.queryAssistant,
  diagnoseConversation: openaiService.diagnoseConversation,
  transcribeAudio: openaiService.transcribeAudio,
  validateDocumentContent: openaiService.validateDocumentContent,
  chatWithResults: openaiService.chatWithResults,

  // List saved protocols
  listProtocols: async () => {
    return protocolHistory;
  },

  // SKIN DISEASE PREDICTION METHODS
  
  // Predict skin disease from image
  predictSkinDisease: async (formData) => {
    try {
      const response = await axios.post(`${DOCUMENTS_API_URL}/predict/`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      return response.data;
    } catch (error) {
      console.error('Prediction API error:', error);
      throw error;
    }
  },

  // LUNG CANCER PREDICTION METHODS
  
  // Predict lung cancer risk from clinical data
  predictLungCancerClinical: async (clinicalData) => {
    try {
      
      const response = await axios.post(`${LUNG_CANCER_API_URL}/predict`, clinicalData, {
        headers: { 'Content-Type': 'application/json' },
        timeout: 60000 // 60 second timeout for cold starts
      });
      
      return response.data;
    } catch (error) {
      console.error('Lung cancer clinical prediction API error:', error);
      if (error.response) {
        console.error('Response data:', error.response.data);
        console.error('Response status:', error.response.status);
      }
      throw error;
    }
  },

  // Predict lung cancer risk from text
  predictLungCancerText: async (textData) => {
    try {
      
      const response = await axios.post(`${LUNG_CANCER_API_URL}/predict_text`, textData, {
        headers: { 'Content-Type': 'application/json' },
        timeout: 60000 // 60 second timeout for cold starts
      });
      
      return response.data;
    } catch (error) {
      console.error('Lung cancer text prediction API error:', error);
      if (error.response) {
        console.error('Response data:', error.response.data);
        console.error('Response status:', error.response.status);
      }
      throw error;
    }
  },

  // Check lung cancer API health
  checkLungCancerApiHealth: async () => {
    try {
      const response = await axios.get(`${LUNG_CANCER_API_URL}/health`, {
        timeout: 30000 // 30 second timeout
      });
      return response.data;
    } catch (error) {
      console.error('Lung cancer API health check failed:', error);
      throw error;
    }
  },

  // Get lung cancer API model status
  getLungCancerModelStatus: async () => {
    try {
      const response = await axios.get(`${LUNG_CANCER_API_URL}/model/status`, {
        timeout: 30000 // 30 second timeout
      });
      return response.data;
    } catch (error) {
      console.error('Lung cancer model status check failed:', error);
      throw error;
    }
  },

  // UTILITY METHODS
  
  // Test all API connections
  testApiConnections: async () => {
    const results = {
      skinDisease: false,
      lungCancer: false,
      timestamp: new Date().toISOString()
    };

    // Test skin disease API
    try {
      await axios.get(`${DOCUMENTS_API_URL}/`, { timeout: 10000 });
      results.skinDisease = true;
    } catch (error) {
      console.warn('Skin disease API not available:', error.message);
    }

    // Test lung cancer API
    try {
      await apiService.checkLungCancerApiHealth();
      results.lungCancer = true;
    } catch (error) {
      console.warn('Lung cancer API not available:', error.message);
    }

    return results;
  },

  // Compile clinical dossier
  compileDossier: dossierService.compileDossier
};

export default apiService;