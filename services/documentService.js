class DocumentService {
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

    if (resumeData.type === 'text/plain') {
      return resumeData.content;
    } else if (resumeData.type === 'application/pdf' || resumeData.type.includes('word')) {
      return `[Resume: ${resumeData.filename} (${this.formatFileSize(resumeData.size)})]`;
    }

    return '';
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