# ComposeEdge 🚀
<p align="center">
  <a href="https://www.youtube.com/watch?v=TP8pJYEworg" target="_blank">
    <img src="https://img.youtube.com/vi/TP8pJYEworg/maxresdefault.jpg" 
         alt="ComposeEdge Demo – Chrome Dev Fest 2025" width="80%" style="border-radius: 10px;"/>
  </a>
  <br/>
  <em>🎥 Click the image above to watch the full ComposeEdge demo on YouTube</em>
</p>

**Intelligent AI-Powered Writing Assistant for Chrome**

TonePilot is a sophisticated Chrome extension that transforms your writing experience using Chrome's Built-in AI. It combines advanced semantic routing, contextual understanding, and personalized document templates to help you communicate more effectively across any website or platform.

---

## ✨ Key Features

### 🎯 **Intelligent Text Processing**
- **Smart Intent Detection**: Automatically detects what you want to do (rewrite, write, proofread, summarize, translate)
- **Output Format Recognition**: Understands desired formats (email, letter, social post, document, list, etc.)
- **Tone Analysis**: Detects and applies appropriate tones (formal, casual, diplomatic, urgent, etc.)
- **Context-Aware Processing**: Adapts responses based on the detected context and format

### 📝 **Advanced Writing Capabilities**
- **Multi-Modal Content Creation**: Write emails, cover letters, social posts, documents, announcements, tutorials, and more
- **Professional Email Generation**: Includes subject lines, proper greetings, structured body, and appropriate closings
- **Formal Letter Writing**: Complete letterhead format, date, recipient address, salutation, and professional structure
- **Social Media Content**: Engaging, platform-appropriate posts with attention-grabbing elements
- **Step-by-Step Guides**: Numbered instructions with helpful tips and warnings

### 🧠 **Smart Document Context**
- **Resume Integration**: Upload and parse PDF/DOCX resumes for automatic inclusion in career-related content
- **Email Template System**: Store and automatically apply your preferred email styles and subjects
- **Context-Aware Suggestions**: Intelligently includes relevant personal information when appropriate
- **Career Content Optimization**: Enhanced cover letters, job applications, and professional outreach

### 🔄 **Multiple AI Services**
- **Chrome Built-in AI**: Primary processing using Gemini Nano (fully on-device)
- **Specialized Services**: Dedicated proofreader, rewriter, writer, summarizer, and translator APIs
- **Smart Fallbacks**: Automatic fallback to language model when specialized services are unavailable
- **Translation Support**: 30+ languages with automatic language detection

### 🎨 **Preset Tone System**
- **⚡ Concise**: Clear and direct communication (≤2 sentences)
- **🤝 Diplomatic**: Polite and considerate tone for sensitive communications
- **📊 Executive**: Professional summaries with bullets and clear action items
- **😊 Friendly**: Warm and approachable for casual interactions
- **🎓 Academic**: Formal and scholarly for educational or research contexts

---

## 🚀 Getting Started

### Prerequisites
- **Chrome 121+** with Built-in AI enabled
- **Developer Mode** enabled in Chrome extensions
- **Experimental AI Features** activated in Chrome settings

### Installation

1. **Download or Clone** the TonePilot repository
2. **Open Chrome** and navigate to `chrome://extensions/`
3. **Enable Developer Mode** in the top-right corner
4. **Click "Load unpacked"** and select the TonePilot directory
5. **Pin the extension** to your toolbar for easy access

### Quick Setup
1. **Add your logo** (optional): Place a 128x128px PNG file as `logo.png` in the root directory
2. **Open the side panel** by clicking the TonePilot icon
3. **Upload your resume** via the document upload popup for enhanced career-related content
4. **Set email templates** to automatically apply your preferred email style

---

## 📖 How to Use

### **Basic Text Processing**
1. **Select text** on any webpage
2. **Right-click** and choose "TonePilot: Rewrite..." or use the side panel
3. **The AI automatically detects** your intent and desired format
4. **Review results** and use "Replace Selection" to update the original text

### **Side Panel Interface**
1. **Open the side panel** by clicking the TonePilot icon
2. **Type your request** in natural language:
   - "Write a professional email to..."
   - "Create a formal cover letter for..."
   - "Make this into bullet points"
   - "Translate this to Spanish"
3. **AI processes** and provides contextually appropriate responses
4. **Copy or use** the generated content

### **Document Management**
1. **Click the document icon** in the side panel header
2. **Upload your resume** (PDF or DOCX) - content is parsed and stored locally
3. **Add email templates** - subject lines and body styles for consistent communication
4. **Save settings** - templates are automatically applied to relevant requests

---

## 🔧 Advanced Features

### **Semantic Routing Engine**
TonePilot uses advanced pattern recognition to understand complex user requests:

```
"Write a formal email to apply for the software engineer position"
↓
Intent: WRITE
Format: EMAIL
Tone: FORMAL
Context: JOB APPLICATION → Includes resume data
```

### **Smart Context Integration**
- **Career Queries**: Automatically includes resume information for job-related content
- **Email Requests**: Applies stored email templates and preferred subjects
- **Platform Awareness**: Adapts content based on the website you're using
- **Multi-Language**: Detects target languages and translates content as needed

### **On-Device Processing**
- **Complete Privacy**: All AI processing happens locally using Chrome's Built-in AI
- **No External Servers**: Your data never leaves your device
- **Instant Response**: No network delays for AI processing
- **Offline Capable**: Works without internet connection (after initial setup)

---

## 🛠️ Technical Architecture

### **Core Components**
- **Background Service Worker**: Handles context menus and message routing
- **Content Scripts**: Text selection detection and replacement on web pages
- **Side Panel Interface**: Main UI with conversation-style interactions
- **AI Services Layer**: Manages multiple Chrome AI APIs with intelligent fallbacks
- **Document Processing**: PDF/DOCX parsing with Mammoth.js and PDF.js

### **AI Service Stack**
- **Semantic Router**: Intent and format detection engine
- **Writer Service**: Content creation with format-specific templates
- **Rewriter Service**: Text improvement with tone control
- **Proofreader Service**: Grammar and spelling correction
- **Summarizer Service**: Key points extraction and condensation
- **Translation Service**: Multi-language support with auto-detection

### **Data Storage**
- **Local Storage**: Chrome's local storage for settings and templates
- **Resume Parsing**: Extracted text content stored securely on-device
- **History Management**: Optional conversation history (user-configurable)
- **Settings Persistence**: User preferences and customizations

---

## 🎯 Use Cases

### **Professional Communication**
- **Email Outreach**: Cold emails, follow-ups, professional inquiries
- **Cover Letters**: Job applications with automatic resume integration
- **Business Documents**: Reports, proposals, memos with proper formatting
- **LinkedIn Posts**: Professional social media content

### **Academic Writing**
- **Research Papers**: Formal academic tone and structure
- **Email to Professors**: Appropriate academic communication
- **Grant Applications**: Professional proposal writing
- **Thesis Summaries**: Concise academic summaries

### **Content Creation**
- **Blog Posts**: Engaging content with proper structure
- **Social Media**: Platform-specific posts with optimal engagement
- **Documentation**: Step-by-step guides and tutorials
- **Announcements**: Clear, actionable communications

### **International Communication**
- **Translation**: 30+ supported languages with context preservation
- **Cultural Adaptation**: Tone adjustment for different cultural contexts
- **Multi-language Email**: Automatic translation of email templates

---

## ⚙️ Settings & Configuration

### **AI Service Settings**
- **Max Characters**: Control output length (50-1000 characters)
- **Formality Level**: Toggle between casual and formal default tones
- **Translation Language**: Set preferred target language for translations
- **Service Preferences**: Choose between AI services or use automatic selection

### **Privacy Controls**
- **History Management**: Enable/disable conversation history
- **Auto-save**: Control automatic saving of interactions
- **Data Retention**: Configure how long data is stored locally
- **Format Preservation**: Maintain original formatting in rewrites

### **Document Templates**
- **Resume Upload**: PDF/DOCX support with automatic text extraction
- **Email Templates**: Customizable subject lines and body styles
- **Template Application**: Automatic context-aware template usage
- **Template Management**: Edit, update, or remove stored templates

---

## 🔐 Privacy & Security

### **Complete On-Device Processing**
- **Zero External APIs**: All AI processing uses Chrome's Built-in AI
- **Local Data Storage**: Documents and templates stored only on your device
- **No Network Transmission**: Your content never leaves your browser
- **Private by Design**: No user tracking or analytics

### **Data Handling**
- **Encrypted Storage**: Chrome's secure local storage system
- **User Control**: Full control over data retention and deletion
- **Transparent Processing**: Clear logging of all AI operations
- **Optional Features**: All data collection features are opt-in

---

## 🚧 Requirements & Compatibility

### **Browser Requirements**
- **Chrome 121+**: Required for side panel and Built-in AI support
- **Experimental AI**: Chrome's AI features must be enabled
- **Developer Mode**: Required for extension installation
- **Modern JavaScript**: ES2020+ support required

### **AI Feature Availability**
- **Geographic Restrictions**: Chrome Built-in AI availability varies by region
- **Feature Flags**: Some AI features require experimental flag activation
- **Model Downloads**: Initial setup may require Gemini Nano model download
- **Performance**: Better performance on devices with sufficient RAM (8GB+)

---

## 🤝 Development & Contributing

### **Development Setup**
```bash
# Clone the repository
git clone [repository-url]
cd TonePilot

# Install development dependencies (if any)
# No build process required - pure JavaScript

# Load in Chrome
# chrome://extensions/ > Developer mode > Load unpacked
```

### **Architecture Overview**
- **Modular Design**: Separate managers for UI, AI services, state, and settings
- **Event-Driven**: Clean separation between UI interactions and AI processing
- **Extensible**: Easy to add new AI services or output formats
- **Testing Ready**: Structured for unit and integration testing

---

## 📊 Performance & Analytics

### **Processing Speed**
- **On-Device AI**: Near-instant response times (< 2 seconds typical)
- **Smart Caching**: Repeated requests processed faster
- **Efficient Parsing**: Optimized document processing
- **Background Processing**: Non-blocking UI interactions

### **Resource Usage**
- **Minimal Memory**: Efficient Chrome extension architecture
- **Local Storage**: Minimal storage footprint
- **CPU Optimization**: Smart processing only when needed
- **Battery Efficient**: Optimized for laptop and mobile device usage

---

## 🆘 Troubleshooting

### **Common Issues**
- **AI Not Available**: Check Chrome version and experimental features
- **Extension Not Loading**: Verify Developer mode is enabled
- **Document Upload Failing**: Ensure file is PDF or DOCX under 10MB
- **Translation Not Working**: Check if language is supported

### **Performance Optimization**
- **Clear Cache**: Reset extension data if performance degrades
- **Reduce History**: Limit conversation history for better performance
- **File Size**: Keep document uploads under 5MB for best performance
- **Browser Resources**: Close unnecessary tabs for optimal AI processing

---

## 📈 Roadmap & Future Features

### **Planned Enhancements**
- **Voice Input**: Speech-to-text for hands-free operation
- **Advanced Templates**: Industry-specific document templates
- **Team Collaboration**: Shared templates and settings
- **API Integration**: Optional external AI service support

### **Extended AI Capabilities**
- **Image Analysis**: OCR and image-based content generation
- **Advanced Summarization**: Multi-document summarization
- **Style Learning**: Personal writing style adaptation
- **Context Memory**: Long-term conversation context

---

## 📄 License & Credits

### **Open Source**
TonePilot is built with modern web technologies and Chrome's Built-in AI platform.

### **Dependencies**
- **PDF.js**: PDF parsing and text extraction
- **Mammoth.js**: DOCX document processing
- **Chrome Built-in AI**: Core AI processing capabilities
- **Modern Web APIs**: File API, Storage API, Extension APIs

---

**🌟 Transform your writing with intelligent AI assistance - completely private, incredibly fast, and contextually aware.**

*Built with ❤️ for the Chrome extension ecosystem*
