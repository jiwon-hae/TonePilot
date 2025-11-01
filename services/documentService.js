class DocumentService {
  static async saveResumeData(file) {
    try {
      console.log('📄 Starting resume processing:', file.name, file.type);
      const overallStart = performance.now();

      let parsedContent = '';

      if (file.type === 'application/pdf') {
        parsedContent = await this.parsePDF(file);
      } else if (file.type.includes('word') || file.name.endsWith('.docx')) {
        parsedContent = await this.parseDOCX(file);
      } else {
        throw new Error('Unsupported file type');
      }

      console.log('⏱️ Parsing complete:', (performance.now() - overallStart).toFixed(2), 'ms');

      // Convert file to base64 for storage (to display original file later)
      const base64Start = performance.now();
      const base64Data = await this.fileToBase64(file);
      console.log('⏱️ Base64 conversion:', (performance.now() - base64Start).toFixed(2), 'ms');

      const resumeData = {
        filename: file.name,
        type: file.type,
        size: file.size,
        content: parsedContent,
        fileData: base64Data, // Store original file as base64
        uploadedAt: new Date().toISOString()
      };

      const storageStart = performance.now();
      await chrome.storage.local.set({ resumeData });
      console.log('⏱️ Storage save:', (performance.now() - storageStart).toFixed(2), 'ms');

      console.log('✅ Resume processing complete:', (performance.now() - overallStart).toFixed(2), 'ms total');
      return resumeData;
    } catch (error) {
      console.error('❌ Failed to parse and save resume:', error);
      throw error;
    }
  }

  static async fileToBase64(file) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result);
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  }

  static async parsePDF(file) {
    try {
      console.log('📄 Starting PDF parsing:', file.name, 'Size:', (file.size / 1024).toFixed(2), 'KB');
      const startTime = performance.now();

      // For PDF parsing, we'll use PDF.js library
      const arrayBuffer = await file.arrayBuffer();
      console.log('⏱️ ArrayBuffer created:', (performance.now() - startTime).toFixed(2), 'ms');

      // Note: This requires pdf.js to be loaded
      if (typeof pdfjsLib === 'undefined') {
        console.warn('PDF.js not available, storing file metadata only');
        return `[PDF Resume: ${file.name} - Content parsing requires PDF.js library]`;
      }

      const loadingTask = pdfjsLib.getDocument({ data: arrayBuffer });
      const pdf = await loadingTask.promise;
      console.log('⏱️ PDF loaded:', (performance.now() - startTime).toFixed(2), 'ms', '- Pages:', pdf.numPages);

      let fullText = '';

      // Parse all pages in parallel for better performance
      const pagePromises = [];
      for (let i = 1; i <= pdf.numPages; i++) {
        pagePromises.push(
          pdf.getPage(i).then(page =>
            page.getTextContent().then(textContent =>
              textContent.items.map(item => item.str).join(' ')
            )
          )
        );
      }

      const pageTexts = await Promise.all(pagePromises);
      fullText = pageTexts.join('\n');

      const endTime = performance.now();
      console.log('✅ PDF parsed successfully:', (endTime - startTime).toFixed(2), 'ms', '- Text length:', fullText.length, 'chars');

      return fullText.trim();
    } catch (error) {
      console.error('❌ PDF parsing failed:', error);
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