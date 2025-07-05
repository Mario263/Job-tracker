// PDF export functionality

const PDFExporter = {
  async exportToPDF() {
    try {
      // Check if jsPDF library is loaded properly
      if (typeof window.jspdf === 'undefined' || typeof window.jspdf.jsPDF === 'undefined') {
        showMessage('PDF library not loaded. Please refresh the page.', 'error');
        return;
      }

      const { jsPDF } = window.jspdf;
      const doc = new jsPDF();

      // Get data
      const currentApplications = window.jobTracker?.applications || window.applications || [];
      const currentContacts = window.jobTracker?.contacts || window.contacts || [];
      
      if (currentApplications.length === 0 && currentContacts.length === 0) {
        showMessage('No data to export. Please add some applications or contacts first.', 'error');
        return;
      }

      const stats = calculateProfessionalStats(currentApplications, currentContacts);
      
      // Professional PDF styling
      this.addHeader(doc);
      let yPosition = this.addExecutiveSummary(doc, stats, 40);
      yPosition = this.addKeyMetrics(doc, stats, yPosition + 20);
      yPosition = this.addApplicationsTable(doc, currentApplications, yPosition + 15);
      
      if (currentContacts.length > 0) {
        yPosition = this.addContactsTable(doc, currentContacts, yPosition + 15);
      }
      
      this.addFooter(doc);

      // Save file
      const fileName = `JobTracker_Professional_Report_${new Date().toISOString().split('T')[0]}.pdf`;
      doc.save(fileName);
      
      showMessage('✅ Professional PDF report exported successfully!', 'success');
      
    } catch (error) {
      console.error('PDF export failed:', error);
      showMessage('❌ Failed to export PDF file', 'error');
    }
  },

  addHeader(doc) {
    // Header with company branding
    doc.setFillColor(52, 73, 94);
    doc.rect(0, 0, 210, 25, 'F');
    
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(18);
    doc.setFont('helvetica', 'bold');
    doc.text('Job Search Performance Report', 15, 16);
    
    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    doc.text(`Generated on ${new Date().toLocaleDateString()}`, 160, 16);
    
    // Reset colors
    doc.setTextColor(0, 0, 0);
  },

  addExecutiveSummary(doc, stats, yPos) {
    doc.setFontSize(14);
    doc.setFont('helvetica', 'bold');
    doc.text('Executive Summary', 15, yPos);
    
    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    
    const summaryText = [
      `This report provides a comprehensive analysis of your job search activities.`,
      `You have submitted ${stats.totalApplications} applications with a ${stats.responseRate}% response rate.`,
      `Your interview conversion rate is ${stats.interviewRate}%, with ${stats.activeApplications} applications currently active.`,
      `Professional network includes ${stats.totalContacts} contacts, with ${stats.highValueContacts} high-value connections.`
    ];
    
    let currentY = yPos + 8;
    summaryText.forEach(line => {
      const splitText = doc.splitTextToSize(line, 180);
      doc.text(splitText, 15, currentY);
      currentY += splitText.length * 5;
    });
    
    return currentY;
  },

  addKeyMetrics(doc, stats, yPos) {
    doc.setFontSize(14);
    doc.setFont('helvetica', 'bold');
    doc.text('Key Performance Metrics', 15, yPos);
    
    // Metrics boxes
    const metrics = [
      { label: 'Total Applications', value: stats.totalApplications, x: 15, y: yPos + 10 },
      { label: 'Response Rate', value: `${stats.responseRate}%`, x: 65, y: yPos + 10 },
      { label: 'Interview Rate', value: `${stats.interviewRate}%`, x: 115, y: yPos + 10 },
      { label: 'Active Pipeline', value: stats.activeApplications, x: 165, y: yPos + 10 }
    ];
    
    metrics.forEach(metric => {
      // Box
      doc.setDrawColor(52, 73, 94);
      doc.setLineWidth(0.5);
      doc.rect(metric.x, metric.y, 40, 20);
      
      // Value
      doc.setFontSize(16);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(52, 73, 94);
      doc.text(metric.value.toString(), metric.x + 20, metric.y + 10, { align: 'center' });
      
      // Label
      doc.setFontSize(8);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(100, 100, 100);
      doc.text(metric.label, metric.x + 20, metric.y + 17, { align: 'center' });
    });
    
    doc.setTextColor(0, 0, 0);
    return yPos + 35;
  },

  addApplicationsTable(doc, applications, yPos) {
    if (applications.length === 0) return yPos;
    
    // Check if we need a new page
    if (yPos > 200) {
      doc.addPage();
      yPos = 20;
    }
    
    doc.setFontSize(14);
    doc.setFont('helvetica', 'bold');
    doc.text('Recent Applications', 15, yPos);
    
    // Table headers
    const headers = ['Date', 'Company', 'Position', 'Status'];
    const colWidths = [30, 50, 60, 40];
    let xPos = 15;
    
    doc.setFontSize(10);
    doc.setFont('helvetica', 'bold');
    doc.setFillColor(240, 240, 240);
    
    // Header row
    headers.forEach((header, i) => {
      doc.rect(xPos, yPos + 8, colWidths[i], 8, 'F');
      doc.text(header, xPos + 2, yPos + 13);
      xPos += colWidths[i];
    });
    
    // Data rows
    doc.setFont('helvetica', 'normal');
    let currentY = yPos + 16;
    
    applications.slice(0, 15).forEach((app, index) => {
      if (currentY > 270) {
        doc.addPage();
        currentY = 20;
      }
      
      xPos = 15;
      const rowData = [
        new Date(app.applicationDate || app.dateAdded).toLocaleDateString(),
        app.company || '',
        app.jobTitle || '',
        app.status || 'Applied'
      ];
      
      // Alternate row colors
      if (index % 2 === 0) {
        doc.setFillColor(250, 250, 250);
        doc.rect(15, currentY, 180, 6, 'F');
      }
      
      rowData.forEach((data, i) => {
        const truncatedData = doc.splitTextToSize(data, colWidths[i] - 4)[0] || '';
        doc.text(truncatedData, xPos + 2, currentY + 4);
        xPos += colWidths[i];
      });
      
      currentY += 6;
    });
    
    return currentY;
  },

  addContactsTable(doc, contacts, yPos) {
    if (contacts.length === 0) return yPos;
    
    // Check if we need a new page
    if (yPos > 200) {
      doc.addPage();
      yPos = 20;
    }
    
    doc.setFontSize(14);
    doc.setFont('helvetica', 'bold');
    doc.text('Professional Contacts', 15, yPos);
    
    // Contact summary
    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    const highValueContacts = contacts.filter(c => 
      ['Recruiter', 'Hiring Manager'].includes(c.relationship)
    ).length;
    
    doc.text(`Total: ${contacts.length} contacts | High-value: ${highValueContacts}`, 15, yPos + 8);
    
    return yPos + 15;
  },

  addFooter(doc) {
    const pageCount = doc.internal.getNumberOfPages();
    
    for (let i = 1; i <= pageCount; i++) {
      doc.setPage(i);
      doc.setFontSize(8);
      doc.setTextColor(128, 128, 128);
      doc.text(`Generated by Job Tracker System | Page ${i} of ${pageCount}`, 15, 290);
      doc.text('Confidential - For Personal Use Only', 160, 290);
    }
  }
};

// Global export function
function exportToPDF() {
  PDFExporter.exportToPDF();
}

window.PDFExporter = PDFExporter;