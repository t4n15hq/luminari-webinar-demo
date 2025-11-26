// Role-based access control configuration

export const ROLES = {
  ADMIN: 'admin',
  FULL_ACCESS: 'full_access',
  PROTOCOL_ONLY: 'protocol_only',
  REGULATORY_ONLY: 'regulatory_only',
  QUERY_ONLY: 'query_only',
  DIAGNOSIS_ONLY: 'diagnosis_only',
  CUSTOM: 'custom'
};

export const MODULES = {
  HOME: 'home',
  PROTOCOL: 'protocol',
  REGULATORY: 'regulatory',
  DIAGNOSIS: 'diagnosis',
  QUERY: 'query',
  ENHANCED_ANALYSIS: 'enhanced_analysis',
  EXCEL_ANALYSIS: 'excel_analysis',
  CLINICAL_DOSSIER: 'clinical_dossier'
};

// Define what each role can access
export const ROLE_PERMISSIONS = {
  [ROLES.ADMIN]: Object.values(MODULES), // Full access to everything

  [ROLES.FULL_ACCESS]: Object.values(MODULES),

  [ROLES.PROTOCOL_ONLY]: [
    MODULES.HOME,
    MODULES.PROTOCOL
  ],

  [ROLES.REGULATORY_ONLY]: [
    MODULES.HOME,
    MODULES.REGULATORY
  ],

  [ROLES.QUERY_ONLY]: [
    MODULES.HOME,
    MODULES.QUERY
  ],

  [ROLES.DIAGNOSIS_ONLY]: [
    MODULES.HOME,
    MODULES.DIAGNOSIS
  ],

  // For custom roles, permissions will be defined per user
  [ROLES.CUSTOM]: []
};

// Helper function to check if user has access to a module
export const hasAccess = (userRole, userPermissions, module) => {
  // Admin always has access
  if (userRole === ROLES.ADMIN) {
    return true;
  }

  // For custom roles, check user-specific permissions
  if (userRole === ROLES.CUSTOM && userPermissions) {
    return userPermissions.includes(module);
  }

  // For predefined roles, check role permissions
  const rolePermissions = ROLE_PERMISSIONS[userRole] || [];
  return rolePermissions.includes(module);
};

// Route to module mapping
export const ROUTE_MODULE_MAP = {
  '/': MODULES.HOME,
  '/protocol': MODULES.PROTOCOL,
  '/unified-regulatory': MODULES.REGULATORY,
  '/diagnosis': MODULES.DIAGNOSIS,
  '/diagnosis/dermatology': MODULES.DIAGNOSIS,
  '/diagnosis/pulmonology': MODULES.DIAGNOSIS,
  '/query': MODULES.QUERY,
  '/enhanced-analysis': MODULES.ENHANCED_ANALYSIS,
  '/excel-analysis': MODULES.EXCEL_ANALYSIS,
  '/clinical-dossier': MODULES.CLINICAL_DOSSIER
};
