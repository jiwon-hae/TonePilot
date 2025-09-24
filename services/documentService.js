class DocumentService {
  static async saveResumeData(file) {
    try {
      console.log('📄 Parsing resume file:', file.name, file.type);

      let parsedContent = '';

      if (file.type === 'application/pdf') {
        parsedContent = await this.parsePDF(file);
      } else if (file.type.includes('word') || file.name.endsWith('.docx')) {
        parsedContent = await this.parseDOCX(file);
      } else {
        throw new Error('Unsupported file type');
      }

      const resumeData = {
        filename: file.name,
        type: file.type,
        size: file.size,
        content: parsedContent,
        uploadedAt: new Date().toISOString()
      };

      await chrome.storage.local.set({ resumeData });
      console.log('✅ Resume data saved to local storage');
      return resumeData;
    } catch (error) {
      console.error('Failed to parse and save resume:', error);
      throw error;
    }
  }

  static async parsePDF(file) {
    try {
      // For PDF parsing, we'll use PDF.js library
      const arrayBuffer = await file.arrayBuffer();

      // Note: This requires pdf.js to be loaded
      if (typeof pdfjsLib === 'undefined') {
        console.warn('PDF.js not available, storing file metadata only');
        return `[PDF Resume: ${file.name} - Content parsing requires PDF.js library]`;
      }

      const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
      let fullText = '';

      for (let i = 1; i <= pdf.numPages; i++) {
        const page = await pdf.getPage(i);
        const textContent = await page.getTextContent();
        const pageText = textContent.items.map(item => item.str).join(' ');
        fullText += pageText + '\n';
      }

      return fullText.trim();
    } catch (error) {
      console.error('PDF parsing failed:', error);
      return `[PDF Resume: ${file.name} - Parsing failed: ${error.message}]`;
    }
  }

  static async parseDOCX(file) {
    try {
      // For DOCX parsing, we'll use mammoth.js library
      const arrayBuffer = await file.arrayBuffer();

      // Note: This requires mammoth.js to be loaded
      if (typeof mammoth === 'undefined') {
        console.warn('Mammoth.js not available, storing file metadata only');
        return `[DOCX Resume: ${file.name} - Content parsing requires Mammoth.js library]`;
      }

      const result = await mammoth.extractRawText({ arrayBuffer });
      return result.value.trim();
    } catch (error) {
      console.error('DOCX parsing failed:', error);
      return `[DOCX Resume: ${file.name} - Parsing failed: ${error.message}]`;
    }
  }

  static async getResumeData() {
    try {
      const data = await chrome.storage.local.get(['resumeData']);
      return data.resumeData || null;
    } catch (error) {
      console.error('Failed to get resume data:', error);
      return null;
    }
  }

  static async getEmailSubject() {
    try {
      const data = await chrome.storage.local.get(['emailSubject']);
      return data.emailSubject || '';
    } catch (error) {
      console.error('Failed to get email subject:', error);
      return '';
    }
  }

  static async getColdEmailTemplate() {
    try {
      const data = await chrome.storage.local.get(['coldEmailTemplate']);
      return data.coldEmailTemplate || '';
    } catch (error) {
      console.error('Failed to get cold email template:', error);
      return '';
    }
  }

  static async getResumeText() {
    const resumeData = await this.getResumeData();
    if (!resumeData) return '';

    // Return the parsed content directly
    return resumeData.content || `[Resume: ${resumeData.filename} (${this.formatFileSize(resumeData.size)})]`;
  }

  static async buildColdEmailContext() {
    const resumeText = await this.getResumeText();
    const emailSubject = await this.getEmailSubject();
    const template = await this.getColdEmailTemplate();

    if (!resumeText && !emailSubject && !template) return null;

    let context = '';

    if (resumeText) {
      context += `Resume/CV:\n${resumeText}\n\n`;
    }

    if (emailSubject) {
      context += `Email Subject: ${emailSubject}\n\n`;
    }

    if (template) {
      context += `Cold Email Template:\n${template}`;
    }

    return context;
  }

  static async buildEmailContext() {
    const emailSubject = await this.getEmailSubject();
    const template = await this.getColdEmailTemplate();

    if (!emailSubject && !template) return null;

    let context = '';

    if (emailSubject) {
      context += `Preferred Email Subject: ${emailSubject}\n\n`;
    }

    if (template) {
      context += `Email Template Style:\n${template}`;
    }

    return context;
  }

  static formatFileSize(bytes) {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
  }
}

if (typeof window !== 'undefined') {
  window.DocumentService = DocumentService;
  console.log('✅ DocumentService exported to window');
}