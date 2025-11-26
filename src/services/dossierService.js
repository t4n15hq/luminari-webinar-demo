import jsPDF from 'jspdf';
import PDFMerger from 'pdf-merger-js/browser';

const dossierService = {
  compileDossier: async (dossierType, documents) => {
    try {
      // Declare and initialize variables for TOC and page tracking
      let tocData = [];
      let currentPage = 2; // Cover page is 1, TOC will be 2
      // Validate inputs
      if (!dossierType) {
        throw new Error('Dossier type is required');
      }

      if (!documents || documents.length === 0) {
        throw new Error('No documents provided');
      }

      // Dossier type full names
      const dossierNames = {
        'impd': 'Investigational Medicinal Product Dossier',
        'ind': 'Investigational New Drug Application',
        'ctd': 'Common Technical Document',
        'ectd': 'Electronic Common Technical Document'
      };

      // Category full names
      const categoryNames = {
        'protocol': 'Protocol',
        'ib': "Investigator's Brochure",
        'quality': 'Quality Information',
        'nonclinical': 'Non-clinical Data',
        'clinical': 'Clinical Data',
        'application': 'Application Form',
        'other': 'Other Documents'
      };

      // Group documents by category
      const groupedDocs = documents.reduce((acc, doc) => {
        if (!doc.category) {
          doc.category = 'other';
        }
        if (!acc[doc.category]) {
          acc[doc.category] = [];
        }
        acc[doc.category].push(doc);
        return acc;
      }, {});

      // Create a PDF merger
      const merger = new PDFMerger();
      
      // Create cover page
      const coverPdf = new jsPDF();
      coverPdf.setFontSize(24);
      coverPdf.text(dossierNames[dossierType] || 'Clinical Dossier', 105, 50, { align: 'center' });
      
      coverPdf.setFontSize(16);
      coverPdf.text('Compiled Clinical Trial Documentation', 105, 70, { align: 'center' });
      
      coverPdf.setFontSize(12);
      coverPdf.text(`Generated: ${new Date().toLocaleDateString()}`, 105, 100, { align: 'center' });
      coverPdf.text(`Total Documents: ${documents.length}`, 105, 110, { align: 'center' });
      
      // Add Luminari branding
      coverPdf.setFontSize(10);
      coverPdf.text('Prepared by LumiPath™', 105, 280, { align: 'center' });
      coverPdf.text('Page 1', 195, 285, { align: 'right' });
      
      const coverBlob = coverPdf.output('blob');
      await merger.add(coverBlob);

      // Process documents and track pages
      const categoryOrder = ['protocol', 'ib', 'quality', 'nonclinical', 'clinical', 'application', 'other'];
      
      for (const category of categoryOrder) {
        if (!groupedDocs[category]) continue;
        
        const docs = groupedDocs[category];
        
        // Track category page
        tocData.push({
          type: 'category',
          name: categoryNames[category] || category,
          page: currentPage,
          documents: []
        });
        
        // Create category separator
        const categoryPdf = new jsPDF();
        categoryPdf.setFontSize(24);
        categoryPdf.setFont(undefined, 'bold');
        categoryPdf.text(categoryNames[category] || category, 105, 120, { align: 'center' });
        
        categoryPdf.setFontSize(16);
        categoryPdf.setFont(undefined, 'normal');
        categoryPdf.text(`${docs.length} Document${docs.length > 1 ? 's' : ''}`, 105, 140, { align: 'center' });
        
        categoryPdf.setFontSize(10);
        categoryPdf.text('Prepared by LumiPath™', 105, 280, { align: 'center' });
        categoryPdf.text(`Page ${currentPage}`, 195, 285, { align: 'right' });
        
        const categoryBlob = categoryPdf.output('blob');
        await merger.add(categoryBlob);
        currentPage++;
        
        // Process each document
        for (const doc of docs) {
          
          const docStartPage = currentPage;
          
          if (doc.file && doc.file.type === 'application/pdf') {
            try {
              // Create a cover page for the PDF
              const docCoverPdf = new jsPDF();
              docCoverPdf.setFontSize(16);
              docCoverPdf.setFont(undefined, 'bold');
              docCoverPdf.text(categoryNames[category] || category, 20, 40);
              
              docCoverPdf.setFontSize(14);
              docCoverPdf.setFont(undefined, 'normal');
              docCoverPdf.text(`Document: ${doc.name}`, 20, 60);
              
              docCoverPdf.setFontSize(12);
              docCoverPdf.text(`Size: ${(doc.size / 1024 / 1024).toFixed(2)} MB`, 20, 75);
              docCoverPdf.text(`Type: PDF Document`, 20, 85);
              
              docCoverPdf.setFontSize(11);
              docCoverPdf.text('The following pages contain the original document.', 20, 105);
              
              docCoverPdf.setFontSize(10);
              docCoverPdf.text('Prepared by LumiPath™', 105, 280, { align: 'center' });
              docCoverPdf.text(`Page ${currentPage}`, 195, 285, { align: 'right' });
              
              const docCoverBlob = docCoverPdf.output('blob');
              await merger.add(docCoverBlob);
              currentPage++;
              
              await merger.add(doc.file);
              
              // Estimate pages based on a heuristic
              const estimatedPages = Math.max(1, Math.ceil(doc.size / (100 * 1024))); // Rough estimate: 100KB per page
              currentPage += estimatedPages;
              
            } catch (error) {
              console.error(`Error merging PDF ${doc.name}:`, error);
              
              // Add error page if PDF merge fails
              const errorPdf = new jsPDF();
              errorPdf.setFontSize(14);
              errorPdf.text('Error Processing Document', 105, 100, { align: 'center' });
              errorPdf.setFontSize(12);
              errorPdf.text(`File: ${doc.name}`, 105, 120, { align: 'center' });
              errorPdf.text('Could not merge this PDF file.', 105, 140, { align: 'center' });
              errorPdf.setFontSize(10);
              errorPdf.text(`Page ${currentPage}`, 195, 285, { align: 'right' });
              
              const errorBlob = errorPdf.output('blob');
              await merger.add(errorBlob);
              currentPage++;
            }
          } else {
            // For non-PDF files, create a reference page
            const refPdf = new jsPDF();
            refPdf.setFontSize(16);
            refPdf.setFont(undefined, 'bold');
            refPdf.text(categoryNames[category] || category, 20, 40);
            
            refPdf.setFontSize(14);
            refPdf.setFont(undefined, 'normal');
            refPdf.text(`File: ${doc.name}`, 20, 60);
            
            refPdf.setFontSize(12);
            refPdf.text(`Size: ${(doc.size / 1024 / 1024).toFixed(2)} MB`, 20, 75);
            refPdf.text(`Type: ${doc.file?.type || 'Unknown'}`, 20, 85);
            refPdf.text(`Category: ${categoryNames[doc.category] || doc.category}`, 20, 95);
            
            refPdf.setFontSize(11);
            refPdf.text('[Document Reference]', 20, 115);
            
            const infoText = `This document "${doc.name}" is included by reference. In a clinical dossier, non-PDF documents are typically converted to PDF before inclusion.`;
            const lines = refPdf.splitTextToSize(infoText, 170);
            let currentY = 135;
            
            lines.forEach(line => {
              refPdf.text(line, 20, currentY);
              currentY += 6;
            });
            
            refPdf.setFontSize(10);
            refPdf.text('Prepared by LumiPath™', 105, 280, { align: 'center' });
            refPdf.text(`Page ${currentPage}`, 195, 285, { align: 'right' });
            
            const refBlob = refPdf.output('blob');
            await merger.add(refBlob);
            currentPage++;
          }
          
          // Add document to TOC data
          tocData[tocData.length - 1].documents.push({
            name: doc.name,
            page: docStartPage
          });
        }
      }
      
      // Add final summary page
      const summaryPdf = new jsPDF();
      summaryPdf.setFontSize(18);
      summaryPdf.text('Document Summary', 20, 30);
      
      summaryPdf.setFontSize(12);
      summaryPdf.text(`Dossier Type: ${dossierNames[dossierType] || dossierType}`, 20, 50);
      summaryPdf.text(`Total Documents: ${documents.length}`, 20, 60);
      summaryPdf.text(`Generated: ${new Date().toLocaleString()}`, 20, 70);
      
      summaryPdf.text('Document Count by Category:', 20, 90);
      
      let summaryY = 100;
      Object.entries(groupedDocs).forEach(([category, docs]) => {
        summaryPdf.text(`• ${categoryNames[category] || category}: ${docs.length}`, 25, summaryY);
        summaryY += 8;
      });
      
      // Add disclaimer
      summaryPdf.setFontSize(10);
      const disclaimer = 'This dossier has been automatically compiled by LumiPath™. Please review all content carefully before submission to regulatory authorities.';
      const disclaimerLines = summaryPdf.splitTextToSize(disclaimer, 170);
      summaryY += 20;
      disclaimerLines.forEach(line => {
        summaryPdf.text(line, 20, summaryY);
        summaryY += 5;
      });
      
      summaryPdf.text('Prepared by LumiPath™', 105, 280, { align: 'center' });
      summaryPdf.text(`Page ${currentPage}`, 195, 285, { align: 'right' });
      
      const summaryBlob = summaryPdf.output('blob');
      await merger.add(summaryBlob);
      
      // Now create the TOC with accurate page numbers
      const tocPdf = new jsPDF();
      let yPosition = 30;
      
      tocPdf.setFontSize(18);
      tocPdf.text('Table of Contents', 20, yPosition);
      yPosition += 20;
      
      tocPdf.setFontSize(12);
      let sectionNumber = 1;
      
      tocData.forEach(category => {
        // Category header
        tocPdf.setFont(undefined, 'bold');
        const categoryText = `${sectionNumber}. ${category.name}`;
        tocPdf.text(categoryText, 20, yPosition);
        tocPdf.text(`Page ${category.page}`, 190, yPosition, { align: 'right' });
        yPosition += 10;
        
        // Documents in category
        tocPdf.setFont(undefined, 'normal');
        category.documents.forEach((doc, index) => {
          const truncatedName = doc.name.length > 40 ? doc.name.substring(0, 37) + '...' : doc.name;
          tocPdf.text(`   ${sectionNumber}.${index + 1} ${truncatedName}`, 25, yPosition);
          tocPdf.text(`Page ${doc.page}`, 190, yPosition, { align: 'right' });
          yPosition += 8;
          
          if (yPosition > 250) {
            tocPdf.addPage();
            yPosition = 30;
          }
        });
        
        yPosition += 5;
        sectionNumber++;
      });
      
      tocPdf.setFontSize(10);
      tocPdf.text('Prepared by LumiPath™', 105, 280, { align: 'center' });
      tocPdf.text('Page 2', 195, 285, { align: 'right' });
      
      const tocBlob = tocPdf.output('blob');
      
      const finalMerger = new PDFMerger();
      
      await finalMerger.add(coverBlob);
      await finalMerger.add(tocBlob);
      
      const mergedContentBlob = await merger.saveAsBlob();
      await finalMerger.add(mergedContentBlob);
      
      const finalPdf = await finalMerger.saveAsBlob();
      const fileName = `${dossierType}_dossier_${Date.now()}.pdf`;
      
      const url = URL.createObjectURL(finalPdf);
      const a = document.createElement('a');
      a.href = url;
      a.download = fileName;
      a.click();
      URL.revokeObjectURL(url);
      
      return { 
        success: true, 
        fileName,
        message: `Dossier compiled successfully! Downloaded as: ${fileName}`,
        documentCount: documents.length,
        dossierType: dossierNames[dossierType]
      };
    } catch (error) {
      console.error('Error in dossierService.compileDossier:', error);
      throw error;
    }
  }
};

export default dossierService;
