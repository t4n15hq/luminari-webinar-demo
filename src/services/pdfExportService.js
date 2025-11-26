// src/services/pdfExportService.js
import jsPDF from 'jspdf';

export class PDFExportService {
  
  static generateAnalysisReport(analysisData) {
    const doc = new jsPDF();
    const margin = 20;
    let yPosition = margin;

    // Title
    doc.setFontSize(20);
    doc.setFont('helvetica', 'bold');
    doc.text('Excel Biomarker Analysis Report', margin, yPosition);
    yPosition += 15;

    // Subtitle
    doc.setFontSize(12);
    doc.setFont('helvetica', 'normal');
    doc.text(`File: ${analysisData.fileName}`, margin, yPosition);
    yPosition += 8;
    doc.text(`Generated: ${new Date(analysisData.analysisTimestamp).toLocaleString()}`, margin, yPosition);
    yPosition += 15;

    // Overall Summary
    this.addSection(doc, 'Overall Summary', yPosition);
    yPosition += 10;
    
    const summary = analysisData.overallSummary;
    const summaryText = [
      `Total Worksheets: ${summary.totalWorksheets}`,
      `Total Records: ${summary.totalRecords}`,
      `Total Variables: ${summary.totalVariables}`,
      `Total Biomarkers Identified: ${summary.totalBiomarkers}`,
      `FDA-Compliant Biomarkers: ${summary.fdaCompliantBiomarkers}`,
      `Average Data Quality: ${summary.averageDataQuality}/100`
    ];

    summaryText.forEach(text => {
      doc.text(text, margin, yPosition);
      yPosition += 6;
    });
    yPosition += 10;

    // Process each worksheet
    Object.values(analysisData.worksheets).forEach((worksheet, index) => {
      if (yPosition > 250) {
        doc.addPage();
        yPosition = margin;
      }

      // Worksheet header
      this.addSection(doc, `Worksheet: ${worksheet.sheetName}`, yPosition);
      yPosition += 10;

      // Data quality info
      doc.setFontSize(10);
      doc.text(`Rows: ${worksheet.totalRows} | Columns: ${worksheet.totalColumns}`, margin, yPosition);
      yPosition += 6;
      doc.text(`Data Completeness: ${worksheet.dataQuality.dataCompleteness}%`, margin, yPosition);
      yPosition += 6;
      doc.text(`Quality Score: ${worksheet.dataQuality.qualityScore}/100`, margin, yPosition);
      yPosition += 10;

      // Biomarkers table
      if (yPosition > 200) {
        doc.addPage();
        yPosition = margin;
      }

      yPosition = this.addBiomarkersTable(doc, worksheet.biomarkerAnalysis, yPosition);

      // Statistical summary
      if (Object.keys(worksheet.statisticalAnalysis).length > 0) {
        if (yPosition > 200) {
          doc.addPage();
          yPosition = margin;
        }
        
        yPosition = this.addStatisticalSummary(doc, worksheet.statisticalAnalysis, yPosition);
      }
    });

    // AI Analysis Section
    if (analysisData.aiAnalysis && yPosition > 200) {
      doc.addPage();
      yPosition = margin;
    }

    if (analysisData.aiAnalysis) {
      yPosition = this.addAIAnalysis(doc, analysisData.aiAnalysis, yPosition);
    }

    // Recommendations
    if (yPosition > 220) {
      doc.addPage();
      yPosition = margin;
    }

    this.addRecommendations(doc, analysisData, yPosition);

    return doc;
  }

  static addSection(doc, title, yPosition) {
    doc.setFontSize(14);
    doc.setFont('helvetica', 'bold');
    doc.text(title, 20, yPosition);
    doc.setFont('helvetica', 'normal');
  }

  static addBiomarkersTable(doc, biomarkerAnalysis, startY) {
    const biomarkerData = [];
    
    Object.entries(biomarkerAnalysis).forEach(([category, biomarkers]) => {
      if (biomarkers.length > 0) {
        biomarkers.forEach(biomarker => {
          biomarkerData.push([
            biomarker.original,
            category.toUpperCase(),
            biomarker.fdaRelevant ? 'Yes' : 'No'
          ]);
        });
      }
    });

    let currentY = startY;

    if (biomarkerData.length > 0) {
      // Table header
      doc.setFontSize(10);
      doc.setFont('helvetica', 'bold');
      doc.setFillColor(104, 61, 148);
      doc.setTextColor(255, 255, 255);
      
      const colWidths = [80, 50, 30];
      const startX = 20;
      
      // Draw header
      doc.rect(startX, currentY, colWidths[0], 8, 'F');
      doc.rect(startX + colWidths[0], currentY, colWidths[1], 8, 'F');
      doc.rect(startX + colWidths[0] + colWidths[1], currentY, colWidths[2], 8, 'F');
      
      doc.text('Biomarker', startX + 2, currentY + 5);
      doc.text('Category', startX + colWidths[0] + 2, currentY + 5);
      doc.text('FDA', startX + colWidths[0] + colWidths[1] + 2, currentY + 5);
      
      currentY += 8;
      
      // Draw data rows
      doc.setTextColor(0, 0, 0);
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(8);
      
      biomarkerData.forEach((row, index) => {
        if (currentY > 270) {
          doc.addPage();
          currentY = 20;
        }
        
        // Alternate row colors
        if (index % 2 === 1) {
          doc.setFillColor(248, 249, 250);
          doc.rect(startX, currentY, colWidths[0] + colWidths[1] + colWidths[2], 6, 'F');
        }
        
        // Draw borders
        doc.setDrawColor(200, 200, 200);
        doc.rect(startX, currentY, colWidths[0], 6);
        doc.rect(startX + colWidths[0], currentY, colWidths[1], 6);
        doc.rect(startX + colWidths[0] + colWidths[1], currentY, colWidths[2], 6);
        
        // Add text
        const biomarkerText = row[0].length > 35 ? row[0].substring(0, 32) + '...' : row[0];
        doc.text(biomarkerText, startX + 1, currentY + 4);
        doc.text(row[1], startX + colWidths[0] + 1, currentY + 4);
        doc.text(row[2], startX + colWidths[0] + colWidths[1] + 1, currentY + 4);
        
        currentY += 6;
      });
      
      currentY += 10;
    }
    
    return currentY;
  }

  static addStatisticalSummary(doc, statisticalAnalysis, startY) {
    const statsData = [];
    
    Object.entries(statisticalAnalysis).forEach(([column, stats]) => {
      if (column !== '_correlations' && stats) {
        statsData.push([
          column,
          stats.count.toString(),
          stats.mean?.toFixed(2) || 'N/A',
          stats.median?.toFixed(2) || 'N/A',
          stats.standardDeviation?.toFixed(2) || 'N/A',
          stats.missingCount.toString()
        ]);
      }
    });

    let currentY = startY;

    if (statsData.length > 0) {
      doc.setFontSize(12);
      doc.setFont('helvetica', 'bold');
      doc.text('Statistical Summary', 20, currentY);
      currentY += 15;
      
      // Table header
      doc.setFontSize(8);
      doc.setFont('helvetica', 'bold');
      doc.setFillColor(104, 61, 148);
      doc.setTextColor(255, 255, 255);
      
      const colWidths = [35, 20, 20, 20, 20, 20];
      const startX = 20;
      
      // Draw header
      colWidths.forEach((width, i) => {
        const x = startX + colWidths.slice(0, i).reduce((sum, w) => sum + w, 0);
        doc.rect(x, currentY, width, 8, 'F');
      });
      
      doc.text('Column', startX + 2, currentY + 5);
      doc.text('Count', startX + 37, currentY + 5);
      doc.text('Mean', startX + 57, currentY + 5);
      doc.text('Median', startX + 77, currentY + 5);
      doc.text('Std Dev', startX + 97, currentY + 5);
      doc.text('Missing', startX + 117, currentY + 5);
      
      currentY += 8;
      
      // Draw data rows
      doc.setTextColor(0, 0, 0);
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(7);
      
      statsData.forEach((row, index) => {
        if (currentY > 270) {
          doc.addPage();
          currentY = 20;
        }
        
        // Alternate row colors
        if (index % 2 === 1) {
          doc.setFillColor(248, 249, 250);
          doc.rect(startX, currentY, colWidths.reduce((sum, w) => sum + w, 0), 6, 'F');
        }
        
        // Draw borders and text
        doc.setDrawColor(200, 200, 200);
        row.forEach((cell, i) => {
          const x = startX + colWidths.slice(0, i).reduce((sum, w) => sum + w, 0);
          doc.rect(x, currentY, colWidths[i], 6);
          
          const cellText = cell.length > 12 ? cell.substring(0, 9) + '...' : cell;
          doc.text(cellText, x + 1, currentY + 4);
        });
        
        currentY += 6;
      });
      
      currentY += 10;
    }
    
    return currentY;
  }

  static addAIAnalysis(doc, aiAnalysis, startY) {
    this.addSection(doc, 'AI-Powered Clinical Analysis', startY);
    
    doc.setFontSize(10);
    let currentY = startY + 10;
    
    // Analysis type and timestamp
    doc.setFont('helvetica', 'bold');
    doc.text(`Analysis Type: ${aiAnalysis.analysisType}`, 20, currentY);
    currentY += 6;
    
    doc.setFont('helvetica', 'normal');
    doc.text(`Generated: ${new Date(aiAnalysis.analysisTimestamp).toLocaleString()}`, 20, currentY);
    currentY += 10;
    
    // AI Insights
    if (aiAnalysis.claudeInsights) {
      if (aiAnalysis.claudeInsights.error) {
        doc.setFont('helvetica', 'bold');
        doc.text('AI Analysis Status:', 20, currentY);
        currentY += 6;
        
        doc.setFont('helvetica', 'normal');
        const errorText = doc.splitTextToSize(aiAnalysis.claudeInsights.error, 170);
        doc.text(errorText, 20, currentY);
        currentY += errorText.length * 6 + 10;
        
        // Add fallback recommendations if available
        if (aiAnalysis.claudeInsights.fallbackRecommendations) {
          doc.setFont('helvetica', 'bold');
          doc.text('Fallback Recommendations:', 20, currentY);
          currentY += 6;
          
          doc.setFont('helvetica', 'normal');
          aiAnalysis.claudeInsights.fallbackRecommendations.forEach((rec, index) => {
            if (currentY > 270) {
              doc.addPage();
              currentY = 20;
            }
            const recText = doc.splitTextToSize(`${index + 1}. ${rec}`, 170);
            doc.text(recText, 20, currentY);
            currentY += recText.length * 6 + 2;
          });
        }
      } else {
        // Successful AI analysis - handle structured response
        if (aiAnalysis.claudeInsights.summary) {
          doc.setFont('helvetica', 'bold');
          doc.text('Summary:', 20, currentY);
          currentY += 6;
          
          doc.setFont('helvetica', 'normal');
          const summaryText = typeof aiAnalysis.claudeInsights.summary === 'string' 
            ? aiAnalysis.claudeInsights.summary 
            : JSON.stringify(aiAnalysis.claudeInsights.summary);
          const splitSummary = doc.splitTextToSize(summaryText, 170);
          doc.text(splitSummary, 20, currentY);
          currentY += splitSummary.length * 6 + 8;
        }
        
        if (aiAnalysis.claudeInsights.decision) {
          doc.setFont('helvetica', 'bold');
          doc.text('Clinical Decision:', 20, currentY);
          currentY += 6;
          
          doc.setFont('helvetica', 'normal');
          const decisionText = typeof aiAnalysis.claudeInsights.decision === 'string' 
            ? aiAnalysis.claudeInsights.decision 
            : JSON.stringify(aiAnalysis.claudeInsights.decision);
          const splitDecision = doc.splitTextToSize(decisionText, 170);
          doc.text(splitDecision, 20, currentY);
          currentY += splitDecision.length * 6 + 8;
        }
        
        if (aiAnalysis.claudeInsights.rationale) {
          doc.setFont('helvetica', 'bold');
          doc.text('Rationale:', 20, currentY);
          currentY += 6;
          
          doc.setFont('helvetica', 'normal');
          const rationaleText = typeof aiAnalysis.claudeInsights.rationale === 'string' 
            ? aiAnalysis.claudeInsights.rationale 
            : JSON.stringify(aiAnalysis.claudeInsights.rationale);
          const splitRationale = doc.splitTextToSize(rationaleText, 170);
          doc.text(splitRationale, 20, currentY);
          currentY += splitRationale.length * 6 + 8;
        }
        
        if (aiAnalysis.claudeInsights.reasoning) {
          doc.setFont('helvetica', 'bold');
          doc.text('AI Reasoning:', 20, currentY);
          currentY += 6;
          
          doc.setFont('helvetica', 'normal');
          const reasoning = Array.isArray(aiAnalysis.claudeInsights.reasoning) 
            ? aiAnalysis.claudeInsights.reasoning 
            : [aiAnalysis.claudeInsights.reasoning];
          
          reasoning.forEach((reason, index) => {
            if (currentY > 270) {
              doc.addPage();
              currentY = 20;
            }
            const reasonText = typeof reason === 'string' ? reason : JSON.stringify(reason);
            const splitReason = doc.splitTextToSize(`${index + 1}. ${reasonText}`, 170);
            doc.text(splitReason, 20, currentY);
            currentY += splitReason.length * 6 + 2;
          });
          currentY += 6;
        }
        
        if (aiAnalysis.claudeInsights.evidence) {
          if (currentY > 250) {
            doc.addPage();
            currentY = 20;
          }
          
          doc.setFont('helvetica', 'bold');
          doc.text('Evidence:', 20, currentY);
          currentY += 6;
          
          doc.setFont('helvetica', 'normal');
          const evidence = Array.isArray(aiAnalysis.claudeInsights.evidence) 
            ? aiAnalysis.claudeInsights.evidence 
            : [aiAnalysis.claudeInsights.evidence];
          
          evidence.forEach((item, index) => {
            if (currentY > 270) {
              doc.addPage();
              currentY = 20;
            }
            const evidenceText = typeof item === 'string' ? item : JSON.stringify(item);
            const splitEvidence = doc.splitTextToSize(`• ${evidenceText}`, 165);
            doc.text(splitEvidence, 25, currentY);
            currentY += splitEvidence.length * 6 + 2;
          });
          currentY += 6;
        }
        
        if (aiAnalysis.claudeInsights.confidence) {
          if (currentY > 260) {
            doc.addPage();
            currentY = 20;
          }
          
          doc.setFont('helvetica', 'bold');
          doc.text('Confidence Level:', 20, currentY);
          currentY += 6;
          
          doc.setFont('helvetica', 'normal');
          const confidenceText = typeof aiAnalysis.claudeInsights.confidence === 'string' 
            ? aiAnalysis.claudeInsights.confidence 
            : JSON.stringify(aiAnalysis.claudeInsights.confidence);
          const splitConfidence = doc.splitTextToSize(confidenceText, 170);
          doc.text(splitConfidence, 20, currentY);
          currentY += splitConfidence.length * 6 + 8;
        }
      }
    }
    
    return currentY;
  }

  static addRecommendations(doc, analysisData, startY) {
    this.addSection(doc, 'Recommendations for Protocol Generation', startY);
    
    let currentY = startY + 10;
    
    // Enhanced recommendations if available
    if (analysisData.enhancedRecommendations) {
      doc.setFont('helvetica', 'bold');
      doc.text('Enhanced AI-Generated Recommendations:', 20, currentY);
      currentY += 8;
      
      doc.setFont('helvetica', 'normal');
      Object.entries(analysisData.enhancedRecommendations).forEach(([category, recommendations]) => {
        if (recommendations.length > 0) {
          if (currentY > 250) {
            doc.addPage();
            currentY = 20;
          }
          
          doc.setFont('helvetica', 'bold');
          doc.text(`${category.charAt(0).toUpperCase() + category.slice(1)}:`, 20, currentY);
          currentY += 6;
          
          doc.setFont('helvetica', 'normal');
          recommendations.forEach(rec => {
            if (currentY > 270) {
              doc.addPage();
              currentY = 20;
            }
            const recText = doc.splitTextToSize(`• ${rec}`, 165);
            doc.text(recText, 25, currentY);
            currentY += recText.length * 6 + 2;
          });
          currentY += 4;
        }
      });
      
      currentY += 10;
    }
    
    // Standard recommendations
    const allRecommendations = [];
    Object.values(analysisData.worksheets).forEach(worksheet => {
      if (worksheet.summary.recommendations) {
        allRecommendations.push(...worksheet.summary.recommendations);
      }
    });

    // Remove duplicates
    const uniqueRecommendations = [...new Set(allRecommendations)];
    
    if (uniqueRecommendations.length > 0) {
      if (currentY > 250) {
        doc.addPage();
        currentY = 20;
      }
      
      doc.setFont('helvetica', 'bold');
      doc.text('Standard Analysis Recommendations:', 20, currentY);
      currentY += 8;
      
      doc.setFontSize(10);
      doc.setFont('helvetica', 'normal');
      
      uniqueRecommendations.forEach((recommendation, index) => {
        if (currentY > 270) {
          doc.addPage();
          currentY = 20;
        }
        
        const recText = doc.splitTextToSize(`${index + 1}. ${recommendation}`, 170);
        doc.text(recText, 20, currentY);
        currentY += recText.length * 6 + 2;
      });
    }

    // FDA compliance note
    currentY += 10;
    if (currentY > 250) {
      doc.addPage();
      currentY = 20;
    }
    
    doc.setFont('helvetica', 'bold');
    doc.text('FDA Compliance Note:', 20, currentY);
    currentY += 6;
    
    doc.setFont('helvetica', 'normal');
    const complianceText = 'This analysis identifies biomarkers based on FDA guidance for biomarker qualification. ' +
                          'FDA-relevant biomarkers are suitable for regulatory submissions and clinical protocol generation. ' +
                          'Please validate biomarkers according to ICH E6(R2) Good Clinical Practice guidelines.';
    
    const splitText = doc.splitTextToSize(complianceText, 170);
    doc.text(splitText, 20, currentY);
  }

  static generateSimplePDF(analysisData) {
    const doc = new jsPDF();
    const margin = 20;
    let yPosition = margin;

    // Title
    doc.setFontSize(20);
    doc.setFont('helvetica', 'bold');
    doc.text('Excel Biomarker Analysis Report', margin, yPosition);
    yPosition += 15;

    // Basic info
    doc.setFontSize(12);
    doc.setFont('helvetica', 'normal');
    doc.text(`File: ${analysisData.fileName}`, margin, yPosition);
    yPosition += 8;
    doc.text(`Generated: ${new Date(analysisData.analysisTimestamp).toLocaleString()}`, margin, yPosition);
    yPosition += 15;

    // Overall Summary
    doc.setFontSize(14);
    doc.setFont('helvetica', 'bold');
    doc.text('Overall Summary', margin, yPosition);
    yPosition += 10;
    
    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    const summary = analysisData.overallSummary;
    const summaryText = [
      `Total Worksheets: ${summary.totalWorksheets}`,
      `Total Records: ${summary.totalRecords}`,
      `Total Variables: ${summary.totalVariables}`,
      `Total Biomarkers Identified: ${summary.totalBiomarkers}`,
      `FDA-Compliant Biomarkers: ${summary.fdaCompliantBiomarkers}`,
      `Average Data Quality: ${summary.averageDataQuality}/100`
    ];

    summaryText.forEach(text => {
      if (yPosition > 270) {
        doc.addPage();
        yPosition = margin;
      }
      doc.text(text, margin, yPosition);
      yPosition += 6;
    });

    // AI Analysis Summary (if available)
    if (analysisData.aiAnalysis) {
      yPosition += 10;
      if (yPosition > 250) {
        doc.addPage();
        yPosition = margin;
      }
      
      doc.setFontSize(14);
      doc.setFont('helvetica', 'bold');
      doc.text('AI Analysis Summary', margin, yPosition);
      yPosition += 10;
      
      doc.setFontSize(10);
      doc.setFont('helvetica', 'normal');
      doc.text(`Analysis Type: ${analysisData.aiAnalysis.analysisType}`, margin, yPosition);
      yPosition += 6;
      doc.text(`Status: ${analysisData.aiAnalysis.claudeInsights?.error ? 'Error occurred' : 'Completed successfully'}`, margin, yPosition);
      yPosition += 10;
    }

    // Note about table limitation
    yPosition += 10;
    if (yPosition > 250) {
      doc.addPage();
      yPosition = margin;
    }
    
    doc.setFontSize(12);
    doc.setFont('helvetica', 'bold');
    doc.text('Note:', margin, yPosition);
    yPosition += 6;
    
    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    const noteText = 'This is a simplified PDF report. For detailed biomarker tables and statistical analysis, ' +
                    'please ensure jsPDF autoTable is properly configured.';
    const splitText = doc.splitTextToSize(noteText, 170);
    doc.text(splitText, margin, yPosition);

    return doc;
  }

  static downloadPDF(analysisData, filename) {
    const doc = this.generateAnalysisReport(analysisData);
    doc.save(filename || `Biomarker_Analysis_Report_${Date.now()}.pdf`);
  }
}

export default PDFExportService;