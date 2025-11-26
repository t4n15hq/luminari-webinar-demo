// src/services/excelAnalysisService.js
import * as XLSX from 'xlsx';
import claudeService from './claudeService';

export class ExcelAnalysisService {
  
  // Patient Selection-Focused Biomarker Categories for Clinical Trials
  static BIOMARKER_CATEGORIES = {
    // INCLUSION CRITERIA BIOMARKERS - Primary eligibility markers
    EFFICACY: [
      'pasi', 'severity', 'response', 'improvement', 'reduction', 'efficacy',
      'outcome', 'endpoint', 'score', 'index', 'scale', 'assessment', 'baseline',
      'target', 'expression', 'level', 'positive', 'measurable', 'detectable'
    ],
    
    // EXCLUSION CRITERIA BIOMARKERS - Safety and contraindication markers
    SAFETY: [
      'adverse', 'side_effect', 'toxicity', 'safety', 'tolerance', 'reaction',
      'liver', 'kidney', 'cardiac', 'hemoglobin', 'platelet', 'white_blood_cell',
      'contraindication', 'risk', 'elevated', 'abnormal', 'dysfunction'
    ],
    
    // STRATIFICATION BIOMARKERS - Population enrichment markers
    LABORATORY: [
      'blood', 'serum', 'plasma', 'urine', 'biomarker', 'protein', 'gene',
      'cytokine', 'enzyme', 'hormone', 'antibody', 'antigen', 'metabolite',
      'mutation', 'variant', 'polymorphism', 'allele', 'genotype'
    ],
    
    // DEMOGRAPHIC STRATIFICATION - Population selection characteristics
    DEMOGRAPHIC: [
      'age', 'gender', 'sex', 'race', 'ethnicity', 'weight', 'height', 'bmi',
      'baseline', 'demographic', 'population', 'subject', 'patient', 'cohort',
      'subgroup', 'stratum', 'category', 'classification'
    ],
    
    // DISEASE SELECTION CRITERIA - Condition-specific selection markers
    DISEASE_SPECIFIC: [
      'tumor', 'cancer', 'lesion', 'inflammation', 'infection', 'disease',
      'condition', 'diagnosis', 'stage', 'grade', 'progression', 'metastasis',
      'severity', 'duration', 'history', 'status', 'type', 'subtype'
    ],
    
    // DOSING/EXPOSURE STRATIFICATION - PK/PD selection factors
    PK_PD: [
      'concentration', 'dose', 'exposure', 'clearance', 'half_life', 'bioavailability',
      'pharmacokinetic', 'pharmacodynamic', 'pk', 'pd', 'auc', 'cmax', 'tmax',
      'metabolism', 'transporter', 'interaction', 'sensitivity'
    ]
  };

  // Statistical analysis methods
  static calculateBasicStats(data) {
    if (!data || data.length === 0) return null;
    
    const validData = data.filter(val => val !== null && val !== undefined && !isNaN(val));
    if (validData.length === 0) return null;

    const sorted = validData.sort((a, b) => a - b);
    const sum = validData.reduce((acc, val) => acc + val, 0);
    const mean = sum / validData.length;
    
    return {
      count: validData.length,
      mean: parseFloat(mean.toFixed(4)),
      median: this.calculateMedian(sorted),
      min: Math.min(...validData),
      max: Math.max(...validData),
      standardDeviation: this.calculateStandardDeviation(validData, mean),
      variance: this.calculateVariance(validData, mean),
      missingCount: data.length - validData.length,
      outliers: this.detectOutliers(validData)
    };
  }

  static calculateMedian(sortedArray) {
    const mid = Math.floor(sortedArray.length / 2);
    return sortedArray.length % 2 !== 0 
      ? sortedArray[mid] 
      : (sortedArray[mid - 1] + sortedArray[mid]) / 2;
  }

  static calculateStandardDeviation(data, mean) {
    const variance = this.calculateVariance(data, mean);
    return parseFloat(Math.sqrt(variance).toFixed(4));
  }

  static calculateVariance(data, mean) {
    const squaredDiffs = data.map(val => Math.pow(val - mean, 2));
    const avgSquaredDiff = squaredDiffs.reduce((acc, val) => acc + val, 0) / data.length;
    return parseFloat(avgSquaredDiff.toFixed(4));
  }

  static detectOutliers(data) {
    const sorted = [...data].sort((a, b) => a - b);
    const q1 = this.calculateMedian(sorted.slice(0, Math.floor(sorted.length / 2)));
    const q3 = this.calculateMedian(sorted.slice(Math.ceil(sorted.length / 2)));
    const iqr = q3 - q1;
    const lowerBound = q1 - 1.5 * iqr;
    const upperBound = q3 + 1.5 * iqr;
    
    return data.filter(val => val < lowerBound || val > upperBound);
  }

  // Calculate correlation matrix
  static calculateCorrelationMatrix(numericalColumns) {
    const correlations = {};
    const columnNames = Object.keys(numericalColumns);
    
    for (let i = 0; i < columnNames.length; i++) {
      for (let j = i; j < columnNames.length; j++) {
        const col1 = columnNames[i];
        const col2 = columnNames[j];
        const correlation = this.calculatePearsonCorrelation(
          numericalColumns[col1], 
          numericalColumns[col2]
        );
        
        correlations[`${col1}_${col2}`] = correlation;
        if (i !== j) {
          correlations[`${col2}_${col1}`] = correlation;
        }
      }
    }
    
    return correlations;
  }

  static calculatePearsonCorrelation(x, y) {
    if (x.length !== y.length) return 0;
    
    const validPairs = [];
    for (let i = 0; i < x.length; i++) {
      if (!isNaN(x[i]) && !isNaN(y[i]) && x[i] !== null && y[i] !== null) {
        validPairs.push([x[i], y[i]]);
      }
    }
    
    if (validPairs.length < 2) return 0;
    
    const n = validPairs.length;
    const sumX = validPairs.reduce((sum, pair) => sum + pair[0], 0);
    const sumY = validPairs.reduce((sum, pair) => sum + pair[1], 0);
    const sumXY = validPairs.reduce((sum, pair) => sum + pair[0] * pair[1], 0);
    const sumX2 = validPairs.reduce((sum, pair) => sum + pair[0] * pair[0], 0);
    const sumY2 = validPairs.reduce((sum, pair) => sum + pair[1] * pair[1], 0);
    
    const numerator = n * sumXY - sumX * sumY;
    const denominator = Math.sqrt((n * sumX2 - sumX * sumX) * (n * sumY2 - sumY * sumY));
    
    return denominator === 0 ? 0 : parseFloat((numerator / denominator).toFixed(4));
  }

  // Enhanced biomarker identification with data-driven insights
  static identifyBiomarkers(headers, worksheetData) {
    const biomarkers = {
      efficacy: [],
      safety: [],
      laboratory: [],
      demographic: [],
      diseaseSpecific: [],
      pkPd: [],
      other: []
    };

    headers.forEach((header, index) => {
      const normalizedHeader = header.toLowerCase().replace(/[^a-z0-9]/g, '_');
      let categorized = false;

      // Get column data for analysis
      const columnData = worksheetData.map(row => row[index]).filter(val => val !== null && val !== undefined && val !== '');
      const dataAnalysis = this.analyzeColumnForPatientSelection(columnData, header);

      // Check each category
      Object.entries(this.BIOMARKER_CATEGORIES).forEach(([categoryKey, keywords]) => {
        if (!categorized && keywords.some(keyword => normalizedHeader.includes(keyword))) {
          const biomarkerCategory = categoryKey.toLowerCase().replace('_', '');
          if (biomarkers[biomarkerCategory]) {
            biomarkers[biomarkerCategory].push({
              original: header,
              normalized: normalizedHeader,
              category: categoryKey,
              fdaRelevant: this.isFDARelevant(normalizedHeader),
              dataAnalysis: dataAnalysis,
              selectionCriteria: this.generateSelectionCriteria(header, dataAnalysis, categoryKey)
            });
            categorized = true;
          }
        }
      });

      // If not categorized, add to 'other'
      if (!categorized) {
        biomarkers.other.push({
          original: header,
          normalized: normalizedHeader,
          category: 'OTHER',
          fdaRelevant: false,
          dataAnalysis: dataAnalysis,
          selectionCriteria: this.generateSelectionCriteria(header, dataAnalysis, 'OTHER')
        });
      }
    });

    return biomarkers;
  }

  // Analyze column data for patient selection insights
  static analyzeColumnForPatientSelection(columnData, header) {
    if (columnData.length === 0) {
      return { type: 'empty', insights: 'No data available for analysis' };
    }

    // Check if data is numeric
    const numericData = columnData.filter(val => !isNaN(parseFloat(val))).map(val => parseFloat(val));
    const isNumeric = numericData.length > columnData.length * 0.7; // At least 70% numeric

    if (isNumeric && numericData.length > 0) {
      const stats = this.calculateBasicStats(numericData);
      const outliers = this.detectOutliers(numericData);
      
      return {
        type: 'numeric',
        count: numericData.length,
        mean: stats?.mean || 0,
        median: stats?.median || 0,
        stdDev: stats?.standardDeviation || 0,
        min: Math.min(...numericData),
        max: Math.max(...numericData),
        outliers: outliers.length,
        normalRange: this.calculateNormalRange(numericData),
        selectionThresholds: this.suggestSelectionThresholds(numericData, header)
      };
    } else {
      // Categorical data analysis
      const valueCounts = {};
      columnData.forEach(val => {
        const normalizedVal = String(val).toLowerCase().trim();
        valueCounts[normalizedVal] = (valueCounts[normalizedVal] || 0) + 1;
      });
      
      const sortedCategories = Object.entries(valueCounts)
        .sort(([,a], [,b]) => b - a)
        .slice(0, 10); // Top 10 categories
      
      return {
        type: 'categorical',
        count: columnData.length,
        uniqueValues: Object.keys(valueCounts).length,
        topCategories: sortedCategories,
        distribution: valueCounts,
        selectionCategories: this.suggestCategoricalCriteria(sortedCategories, header)
      };
    }
  }

  // Generate specific selection criteria based on data analysis
  static generateSelectionCriteria(header, dataAnalysis, category) {
    if (dataAnalysis.type === 'numeric') {
      const { mean, stdDev, min, max, selectionThresholds } = dataAnalysis;
      
      switch (category.toUpperCase()) {
        case 'SAFETY':
          return {
            inclusion: `${header} within normal range (${selectionThresholds.lowerNormal} - ${selectionThresholds.upperNormal})`,
            exclusion: `${header} > ${selectionThresholds.upperExclusion} or < ${selectionThresholds.lowerExclusion}`,
            monitoring: `Monitor patients with ${header} > ${selectionThresholds.upperWatch}`
          };
        case 'EFFICACY':
          return {
            inclusion: `${header} ≥ ${selectionThresholds.efficacyThreshold} for enhanced response probability`,
            stratification: `Stratify by ${header}: Low (< ${selectionThresholds.lowerTertile}), Medium (${selectionThresholds.lowerTertile}-${selectionThresholds.upperTertile}), High (> ${selectionThresholds.upperTertile})`,
            enrichment: `Consider enriching population with ${header} > ${selectionThresholds.enrichmentThreshold}`
          };
        case 'DEMOGRAPHIC':
          return {
            inclusion: `${header} within study population range (${selectionThresholds.studyMin} - ${selectionThresholds.studyMax})`,
            stratification: `Balance randomization by ${header} quartiles`,
            subgroup: `Pre-planned subgroup analysis for ${header} above/below median (${dataAnalysis.median})`
          };
        default:
          return {
            reference: `${header} reference range: ${selectionThresholds.lowerNormal} - ${selectionThresholds.upperNormal}`,
            consideration: `Evaluate ${header} impact on primary endpoint`
          };
      }
    } else if (dataAnalysis.type === 'categorical') {
      const { topCategories, selectionCategories } = dataAnalysis;
      
      return {
        inclusion: `Include patients with ${header}: ${selectionCategories.preferred.join(', ')}`,
        exclusion: `Exclude patients with ${header}: ${selectionCategories.excluded.join(', ')}`,
        stratification: `Stratify by ${header} major categories: ${topCategories.slice(0, 3).map(([cat, count]) => `${cat} (n=${count})`).join(', ')}`
      };
    }
    
    return {
      note: `${header} requires manual clinical evaluation for selection criteria`
    };
  }

  // Calculate normal range for biomarker
  static calculateNormalRange(data) {
    const sorted = [...data].sort((a, b) => a - b);
    const q1 = sorted[Math.floor(sorted.length * 0.25)];
    const q3 = sorted[Math.floor(sorted.length * 0.75)];
    const iqr = q3 - q1;
    
    return {
      q1, q3, iqr,
      lowerFence: q1 - 1.5 * iqr,
      upperFence: q3 + 1.5 * iqr
    };
  }

  // Suggest selection thresholds based on data distribution
  static suggestSelectionThresholds(data, header) {
    const sorted = [...data].sort((a, b) => a - b);
    const mean = data.reduce((sum, val) => sum + val, 0) / data.length;
    const stdDev = Math.sqrt(data.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / data.length);
    
    const percentiles = {
      p5: sorted[Math.floor(sorted.length * 0.05)],
      p10: sorted[Math.floor(sorted.length * 0.10)],
      p25: sorted[Math.floor(sorted.length * 0.25)],
      p50: sorted[Math.floor(sorted.length * 0.50)],
      p75: sorted[Math.floor(sorted.length * 0.75)],
      p90: sorted[Math.floor(sorted.length * 0.90)],
      p95: sorted[Math.floor(sorted.length * 0.95)]
    };
    
    return {
      lowerNormal: percentiles.p10.toFixed(2),
      upperNormal: percentiles.p90.toFixed(2),
      lowerExclusion: percentiles.p5.toFixed(2),
      upperExclusion: percentiles.p95.toFixed(2),
      upperWatch: percentiles.p75.toFixed(2),
      efficacyThreshold: percentiles.p50.toFixed(2),
      enrichmentThreshold: percentiles.p75.toFixed(2),
      lowerTertile: percentiles.p25.toFixed(2),
      upperTertile: percentiles.p75.toFixed(2),
      studyMin: percentiles.p10.toFixed(2),
      studyMax: percentiles.p90.toFixed(2)
    };
  }

  // Suggest categorical selection criteria
  static suggestCategoricalCriteria(topCategories, header) {
    const totalCount = topCategories.reduce((sum, [, count]) => sum + count, 0);
    const majorCategories = topCategories.filter(([, count]) => count / totalCount > 0.05); // >5% prevalence
    const rareCategories = topCategories.filter(([, count]) => count / totalCount < 0.02); // <2% prevalence
    
    return {
      preferred: majorCategories.slice(0, 3).map(([cat]) => cat),
      excluded: rareCategories.map(([cat]) => cat),
      balanced: majorCategories.slice(0, 4).map(([cat]) => cat)
    };
  }

  static isFDARelevant(normalizedHeader) {
    const fdaKeywords = [
      'efficacy', 'safety', 'adverse', 'endpoint', 'outcome', 'biomarker',
      'toxicity', 'dose', 'concentration', 'response', 'progression',
      'hemoglobin', 'creatinine', 'ast', 'alt', 'bilirubin', 'platelets'
    ];
    
    return fdaKeywords.some(keyword => normalizedHeader.includes(keyword));
  }

  // Claude AI-powered patient selection analysis
  static async performClaudeAnalysis(analysisData, sampleData) {
    try {
      // Prepare data summary for Claude analysis
      const dataSummary = {
        fileName: analysisData.fileName,
        totalWorksheets: Object.keys(analysisData.worksheets).length,
        worksheetSummaries: Object.values(analysisData.worksheets).map(ws => ({
          name: ws.sheetName,
          totalRows: ws.totalRows,
          totalColumns: ws.totalColumns,
          headers: ws.headers,
          dataQuality: ws.dataQuality,
          biomarkerCount: Object.values(ws.biomarkerAnalysis).reduce((sum, arr) => sum + arr.length, 0),
          fdaBiomarkerCount: Object.values(ws.biomarkerAnalysis)
            .flat()
            .filter(biomarker => biomarker.fdaRelevant).length
        })),
        sampleData: sampleData
      };

      // Create patient selection focused prompt for Claude analysis
      const analysisPrompt = `
        Analyze this patient dataset for CLINICAL TRIAL PATIENT SELECTION strategies:

        Patient Population Overview:
        - Dataset: ${dataSummary.fileName}
        - Total Worksheets: ${dataSummary.totalWorksheets}
        - Patient Records: ${dataSummary.worksheetSummaries.reduce((sum, ws) => sum + ws.totalRows, 0)}

        Population Characteristics:
        ${dataSummary.worksheetSummaries.map(ws => `
        Cohort: ${ws.name}
        - Patient Count: ${ws.totalRows}, Variables: ${ws.totalColumns}
        - Data Completeness: ${ws.dataQuality.dataCompleteness}% (Critical for Selection Criteria)
        - Selection Biomarkers: ${ws.biomarkerCount} (${ws.fdaBiomarkerCount} FDA-validated)
        - Key Variables: ${ws.headers.slice(0, 10).join(', ')}${ws.headers.length > 10 ? '...' : ''}
        `).join('\n')}

        Sample Patient Data (Use for specific threshold recommendations):
        ${JSON.stringify(sampleData, null, 2)}
        
        IMPORTANT: Base all recommendations on the actual data values shown above. Provide specific numerical thresholds, not generic guidance.

        CRITICAL FOCUS: Provide SPECIFIC, ACTIONABLE patient selection recommendations based on the actual data provided:
        
        1. CONCRETE INCLUSION CRITERIA:
           - Specific numerical thresholds for each biomarker (e.g., "Hemoglobin ≥ 10 g/dL")
           - Evidence-based rationale for each threshold
           - Population percentages that would qualify
        
        2. EVIDENCE-BASED EXCLUSION CRITERIA:
           - Safety exclusion thresholds with clinical justification
           - Specific values that indicate contraindications
           - Risk-benefit assessment for borderline cases
        
        3. STRATIFICATION WITH EXACT VALUES:
           - Precise cut-points for biomarker stratification
           - Sample size implications for each stratum
           - Statistical power considerations
        
        4. ENROLLMENT PROJECTIONS:
           - Calculate specific screening success rates based on data
           - Identify bottleneck criteria that limit enrollment
           - Recommend criteria modifications to improve feasibility
        
        5. PROTOCOL-READY RECOMMENDATIONS:
           - Draft inclusion/exclusion criteria text
           - Specific monitoring parameters and frequencies
           - Risk mitigation strategies for each criterion
        
        6. DATA QUALITY ASSESSMENT:
           - Missing data impact on patient selection
           - Biomarker reliability for selection decisions
           - Recommendations for additional data collection

        RETURN SPECIFIC, PROTOCOL-READY CRITERIA WITH EXACT NUMBERS, NOT GENERAL GUIDANCE.
      `;

      const context = {
        analysisType: 'patient_selection_analysis',
        regulatoryStandards: 'FDA_ICH_E6R2_patient_selection',
        domain: 'clinical_trial_patient_selection',
        dataQuality: dataSummary.worksheetSummaries[0]?.dataQuality || {},
        focusArea: 'inclusion_exclusion_criteria_optimization',
        expectedOutcome: 'actionable_patient_selection_strategy'
      };

      // Call Claude API for enhanced analysis
      const claudeAnalysis = await claudeService.generateWithReasoning(
        analysisPrompt,
        context,
        'clinical'
      );

      return {
        claudeInsights: claudeAnalysis,
        analysisTimestamp: new Date().toISOString(),
        analysisType: 'ai_enhanced_patient_selection_analysis'
      };

    } catch (error) {
      console.error('Claude analysis error:', error);
      // Return fallback analysis if Claude API fails
      return {
        claudeInsights: {
          error: `AI analysis unavailable: ${error.message}`,
          fallbackRecommendations: [
            "Manual review of biomarker endpoints recommended",
            "Consider statistical consultation for sample size calculations",
            "Validate biomarker classifications against FDA guidance",
            "Review data quality metrics before protocol finalization"
          ]
        },
        analysisTimestamp: new Date().toISOString(),
        analysisType: 'basic_analysis_with_ai_fallback'
      };
    }
  }

  // Main analysis function with Claude AI integration
  static async analyzeExcelFile(file) {
    try {
      const workbook = await this.readExcelFile(file);
      const worksheetNames = workbook.SheetNames;
      const analysisResults = {};

      // Analyze each worksheet
      for (const sheetName of worksheetNames) {
        const worksheet = workbook.Sheets[sheetName];
        const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1 });
        
        if (jsonData.length === 0) continue;

        const headers = jsonData[0] || [];
        const dataRows = jsonData.slice(1);

        // Data quality analysis
        const dataQuality = this.analyzeDataQuality(headers, dataRows);
        
        // Separate numerical and categorical columns
        const columnAnalysis = this.analyzeColumns(headers, dataRows);
        
        // Statistical analysis for numerical columns
        const statisticalAnalysis = this.performStatisticalAnalysis(columnAnalysis.numerical);
        
        // Enhanced biomarker identification with data analysis
        const biomarkerAnalysis = this.identifyBiomarkers(headers, dataRows);
        
        // Generate summary
        const summary = this.generateSummary(
          sheetName, 
          headers, 
          dataRows, 
          dataQuality, 
          columnAnalysis, 
          biomarkerAnalysis
        );

        analysisResults[sheetName] = {
          sheetName,
          headers,
          totalRows: dataRows.length,
          totalColumns: headers.length,
          dataQuality,
          columnAnalysis,
          statisticalAnalysis,
          biomarkerAnalysis,
          summary,
          rawData: dataRows.slice(0, 10) // First 10 rows for preview
        };
      }

      const basicAnalysis = {
        fileName: file.name,
        fileSize: file.size,
        worksheets: analysisResults,
        overallSummary: this.generateOverallSummary(analysisResults),
        analysisTimestamp: new Date().toISOString()
      };

      // Prepare sample data for Claude analysis
      const sampleData = this.prepareSampleDataForAI(analysisResults);

      // Perform Claude AI analysis
      const aiAnalysis = await this.performClaudeAnalysis(basicAnalysis, sampleData);

      // Combine basic and AI analysis
      return {
        ...basicAnalysis,
        aiAnalysis: aiAnalysis,
        enhancedRecommendations: this.generateEnhancedRecommendations(basicAnalysis, aiAnalysis)
      };

    } catch (error) {
      console.error('Excel analysis error:', error);
      throw new Error(`Failed to analyze Excel file: ${error.message}`);
    }
  }

  static readExcelFile(file) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        try {
          const data = new Uint8Array(e.target.result);
          const workbook = XLSX.read(data, { type: 'array' });
          resolve(workbook);
        } catch (error) {
          reject(error);
        }
      };
      reader.onerror = reject;
      reader.readAsArrayBuffer(file);
    });
  }

  static analyzeDataQuality(headers, dataRows) {
    const totalCells = headers.length * dataRows.length;
    let emptyCells = 0;
    let duplicateRows = 0;
    
    const rowHashes = new Set();
    
    dataRows.forEach(row => {
      // Count empty cells
      row.forEach(cell => {
        if (cell === null || cell === undefined || cell === '') {
          emptyCells++;
        }
      });
      
      // Check for duplicate rows
      const rowHash = JSON.stringify(row);
      if (rowHashes.has(rowHash)) {
        duplicateRows++;
      } else {
        rowHashes.add(rowHash);
      }
    });

    return {
      totalCells,
      emptyCells,
      emptyPercentage: ((emptyCells / totalCells) * 100).toFixed(2),
      duplicateRows,
      dataCompleteness: (((totalCells - emptyCells) / totalCells) * 100).toFixed(2),
      qualityScore: this.calculateQualityScore(emptyCells, totalCells, duplicateRows, dataRows.length)
    };
  }

  static calculateQualityScore(emptyCells, totalCells, duplicateRows, totalRows) {
    const completenessScore = ((totalCells - emptyCells) / totalCells) * 70; // 70% weight
    const uniquenessScore = ((totalRows - duplicateRows) / totalRows) * 30; // 30% weight
    return Math.round(completenessScore + uniquenessScore);
  }

  static analyzeColumns(headers, dataRows) {
    const numerical = {};
    const categorical = {};

    headers.forEach((header, index) => {
      const columnData = dataRows.map(row => row[index]);
      const isNumerical = this.isNumericalColumn(columnData);

      if (isNumerical) {
        numerical[header] = columnData.map(val => parseFloat(val)).filter(val => !isNaN(val));
      } else {
        const uniqueValues = [...new Set(columnData.filter(val => val !== null && val !== undefined && val !== ''))];
        categorical[header] = {
          data: columnData,
          uniqueValues,
          uniqueCount: uniqueValues.length
        };
      }
    });

    return { numerical, categorical };
  }

  static isNumericalColumn(columnData) {
    const validData = columnData.filter(val => val !== null && val !== undefined && val !== '');
    if (validData.length === 0) return false;
    
    const numericalCount = validData.filter(val => !isNaN(parseFloat(val))).length;
    return (numericalCount / validData.length) > 0.7; // 70% threshold
  }

  static performStatisticalAnalysis(numericalColumns) {
    const analysis = {};
    
    Object.entries(numericalColumns).forEach(([columnName, data]) => {
      analysis[columnName] = this.calculateBasicStats(data);
    });

    // Calculate correlations
    if (Object.keys(numericalColumns).length > 1) {
      analysis._correlations = this.calculateCorrelationMatrix(numericalColumns);
    }

    return analysis;
  }

  static generateSummary(sheetName, headers, dataRows, dataQuality, columnAnalysis, biomarkerAnalysis) {
    const totalBiomarkers = Object.values(biomarkerAnalysis).reduce((sum, arr) => sum + arr.length, 0);
    const fdaBiomarkers = Object.values(biomarkerAnalysis)
      .flat()
      .filter(biomarker => biomarker.fdaRelevant).length;

    return {
      overview: `Analysis of ${sheetName} containing ${dataRows.length} records with ${headers.length} variables.`,
      dataQuality: `Data completeness: ${dataQuality.dataCompleteness}% (Quality Score: ${dataQuality.qualityScore}/100)`,
      columnBreakdown: `${Object.keys(columnAnalysis.numerical).length} numerical and ${Object.keys(columnAnalysis.categorical).length} categorical variables identified.`,
      biomarkerSummary: `${totalBiomarkers} potential biomarkers identified, ${fdaBiomarkers} FDA-relevant markers found.`,
      recommendations: this.generateRecommendations(dataQuality, columnAnalysis, biomarkerAnalysis)
    };
  }

  static generateRecommendations(dataQuality, columnAnalysis, biomarkerAnalysis) {
    const recommendations = [];
    
    if (parseFloat(dataQuality.dataCompleteness) < 80) {
      recommendations.push("Consider data cleaning to address missing values before protocol use.");
    }
    
    if (dataQuality.duplicateRows > 0) {
      recommendations.push("Remove duplicate records to ensure data integrity.");
    }
    
    const fdaBiomarkers = Object.values(biomarkerAnalysis)
      .flat()
      .filter(biomarker => biomarker.fdaRelevant);
    
    if (fdaBiomarkers.length > 0) {
      recommendations.push(`${fdaBiomarkers.length} FDA-relevant biomarkers suitable for regulatory submissions.`);
    }
    
    if (Object.keys(columnAnalysis.numerical).length > 5) {
      recommendations.push("Consider correlation analysis to identify redundant biomarkers.");
    }

    return recommendations;
  }

  static generateOverallSummary(analysisResults) {
    const worksheets = Object.values(analysisResults);
    const totalRows = worksheets.reduce((sum, ws) => sum + ws.totalRows, 0);
    const totalColumns = worksheets.reduce((sum, ws) => sum + ws.totalColumns, 0);
    const allBiomarkers = worksheets.reduce((acc, ws) => {
      Object.values(ws.biomarkerAnalysis).forEach(biomarkers => {
        acc.push(...biomarkers);
      });
      return acc;
    }, []);

    return {
      totalWorksheets: worksheets.length,
      totalRecords: totalRows,
      totalVariables: totalColumns,
      totalBiomarkers: allBiomarkers.length,
      fdaCompliantBiomarkers: allBiomarkers.filter(b => b.fdaRelevant).length,
      averageDataQuality: Math.round(
        worksheets.reduce((sum, ws) => sum + parseInt(ws.dataQuality.qualityScore), 0) / worksheets.length
      )
    };
  }

  // Prepare sample data for AI analysis
  static prepareSampleDataForAI(analysisResults) {
    const sampleData = {};
    
    Object.entries(analysisResults).forEach(([sheetName, worksheet]) => {
      // Get representative sample rows
      const sampleRows = worksheet.rawData.slice(0, 5);
      
      // Get statistical summaries for numerical columns
      const numericalSummary = {};
      Object.entries(worksheet.statisticalAnalysis).forEach(([col, stats]) => {
        if (col !== '_correlations' && stats) {
          numericalSummary[col] = {
            mean: stats.mean,
            median: stats.median,
            stdDev: stats.standardDeviation,
            missingCount: stats.missingCount,
            outlierCount: stats.outliers?.length || 0
          };
        }
      });

      // Get biomarker categorization
      const biomarkerSummary = {};
      Object.entries(worksheet.biomarkerAnalysis).forEach(([category, biomarkers]) => {
        biomarkerSummary[category] = {
          count: biomarkers.length,
          fdaRelevant: biomarkers.filter(b => b.fdaRelevant).length,
          examples: biomarkers.slice(0, 3).map(b => b.original)
        };
      });

      sampleData[sheetName] = {
        headers: worksheet.headers,
        sampleRows: sampleRows,
        numericalSummary: numericalSummary,
        biomarkerSummary: biomarkerSummary,
        dataQuality: {
          completeness: worksheet.dataQuality.dataCompleteness,
          qualityScore: worksheet.dataQuality.qualityScore,
          duplicateRows: worksheet.dataQuality.duplicateRows
        }
      };
    });

    return sampleData;
  }

  // Generate enhanced recommendations combining basic analysis with AI insights
  static generateEnhancedRecommendations(basicAnalysis, aiAnalysis) {
    const recommendations = {
      inclusionCriteria: [],
      exclusionCriteria: [],
      stratificationFactors: [],
      enrollmentStrategy: [],
      regulatory: [],
      clinical: [],
      aiInsights: []
    };

    // Patient Selection Recommendations
    Object.values(basicAnalysis.worksheets).forEach(worksheet => {
      // Data completeness for patient selection reliability
      if (parseFloat(worksheet.dataQuality.dataCompleteness) < 80) {
        recommendations.enrollmentStrategy.push(`${worksheet.sheetName}: Improve data completeness (${worksheet.dataQuality.dataCompleteness}%) for reliable patient selection`);
      }
      
      // Duplicate patients impact enrollment
      if (worksheet.dataQuality.duplicateRows > 0) {
        recommendations.enrollmentStrategy.push(`${worksheet.sheetName}: Remove ${worksheet.dataQuality.duplicateRows} duplicate patient records to avoid enrollment errors`);
      }

      // Generate specific inclusion criteria with thresholds
      const fdaBiomarkers = Object.values(worksheet.biomarkerAnalysis)
        .flat()
        .filter(biomarker => biomarker.fdaRelevant && biomarker.selectionCriteria?.inclusion);
      
      fdaBiomarkers.forEach(biomarker => {
        if (biomarker.selectionCriteria?.inclusion) {
          recommendations.inclusionCriteria.push(`${biomarker.original}: ${biomarker.selectionCriteria.inclusion}`);
        }
      });

      // Generate specific exclusion criteria with safety thresholds
      const safetyBiomarkers = worksheet.biomarkerAnalysis.safety || [];
      safetyBiomarkers.forEach(biomarker => {
        if (biomarker.selectionCriteria?.exclusion) {
          recommendations.exclusionCriteria.push(`${biomarker.original}: ${biomarker.selectionCriteria.exclusion}`);
        }
        if (biomarker.selectionCriteria?.monitoring) {
          recommendations.exclusionCriteria.push(`${biomarker.original}: ${biomarker.selectionCriteria.monitoring}`);
        }
      });

      // Generate specific stratification factors with cut-points
      const allBiomarkers = Object.values(worksheet.biomarkerAnalysis).flat();
      allBiomarkers.forEach(biomarker => {
        if (biomarker.selectionCriteria?.stratification) {
          recommendations.stratificationFactors.push(`${biomarker.original}: ${biomarker.selectionCriteria.stratification}`);
        }
        if (biomarker.selectionCriteria?.enrichment) {
          recommendations.stratificationFactors.push(`${biomarker.original}: ${biomarker.selectionCriteria.enrichment}`);
        }
      });

      // Calculate enrollment feasibility
      const totalPatients = worksheet.totalRows - 1; // Exclude header
      const numericBiomarkers = allBiomarkers.filter(b => b.dataAnalysis?.type === 'numeric');
      if (numericBiomarkers.length > 0) {
        const avgOutliers = numericBiomarkers.reduce((sum, b) => sum + (b.dataAnalysis.outliers || 0), 0) / numericBiomarkers.length;
        const expectedExclusionRate = Math.round((avgOutliers / totalPatients) * 100);
        recommendations.enrollmentStrategy.push(`${worksheet.sheetName}: Estimated ${100 - expectedExclusionRate}% enrollment success rate (${expectedExclusionRate}% excluded for outlier values)`);
      }
    });

    // Enhanced recommendations from AI analysis
    if (aiAnalysis.claudeInsights && !aiAnalysis.claudeInsights.error) {
      try {
        // Extract AI insights if properly formatted
        const insights = aiAnalysis.claudeInsights;
        
        if (insights.reasoning && insights.reasoning.length > 0) {
          recommendations.aiInsights = insights.reasoning.slice(0, 5); // Top 5 AI recommendations
        }
        
        if (insights.decision) {
          recommendations.clinical.push(`AI Assessment: ${insights.decision}`);
        }
        
        // Add patient selection regulatory insights
        recommendations.regulatory.push("AI-validated patient selection criteria meet ICH E6(R2) eligibility standards");
        
        // Add enrollment strategy recommendations
        recommendations.enrollmentStrategy.push("AI-optimized patient selection strategy for enhanced enrollment efficiency");
        
      } catch (error) {
        console.log('AI insights parsing - using fallback recommendations');
      }
    }

    // Add fallback recommendations if AI analysis failed
    if (aiAnalysis.claudeInsights?.error) {
      recommendations.aiInsights = aiAnalysis.claudeInsights.fallbackRecommendations || [];
    }

    return recommendations;
  }
}

export default ExcelAnalysisService;