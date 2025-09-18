const TONE_PRESETS = {
  concise: {
    name: 'Concise',
    description: 'Clear and direct, ≤2 sentences',
    icon: '⚡',
    constraints: {
      sentenceMax: 2,
      formality: 'neutral',
      bullets: false,
      avoid: ['hedging', 'apologies', 'unnecessary_qualifiers'],
      wordLimit: 50,
      style: 'direct'
    },
    systemPrompt: 'Rewrite the text to be concise and direct. Maximum 2 sentences. Remove hedging language and unnecessary words.'
  },
  
  diplomatic: {
    name: 'Diplomatic',
    description: 'Polite and considerate tone',
    icon: '🤝',
    constraints: {
      formality: 'polite',
      softenCritiques: true,
      includeThanks: true,
      hedging: 'moderate',
      tone: 'respectful'
    },
    systemPrompt: 'Rewrite the text with a diplomatic, polite tone. Soften any criticism and include appropriate courtesy phrases.'
  },
  
  executive: {
    name: 'Executive',
    description: 'Summary + bullets + clear ask',
    icon: '📊',
    constraints: {
      structure: '1-line summary + 2 bullets + explicit ask',
      numbersPreferred: true,
      formality: 'professional',
      includeActionItems: true,
      tone: 'authoritative'
    },
    systemPrompt: 'Rewrite in executive format: Start with a 1-line summary, follow with 2 bullet points, end with a clear ask or next step.'
  },
  
  friendly: {
    name: 'Friendly',
    description: 'Warm and approachable',
    icon: '😊',
    constraints: {
      warmth: 'high',
      contractions: true,
      emojis: '<=1',
      tone: 'casual',
      formality: 'informal'
    },
    systemPrompt: 'Rewrite with a friendly, warm tone. Use contractions and approachable language. Add one emoji if appropriate.'
  },
  
  academic: {
    name: 'Academic',
    description: 'Formal and scholarly',
    icon: '🎓',
    constraints: {
      formality: 'high',
      passiveVoiceLimit: 'low',
      hedging: 'allowed',
      tone: 'scholarly',
      vocabulary: 'formal',
      citations: 'preserve'
    },
    systemPrompt: 'Rewrite in academic style. Use formal vocabulary, minimize passive voice, and maintain scholarly tone.'
  }
};

const DOMAIN_ADAPTATIONS = {
  'gmail.com': {
    defaultPreset: 'diplomatic',
    context: 'email',
    adaptations: {
      addSubjectSuggestion: true,
      emailEtiquette: true
    }
  },
  'linkedin.com': {
    defaultPreset: 'diplomatic',
    context: 'professional',
    adaptations: {
      professionalTone: true,
      networkingFocus: true
    }
  },
  'github.com': {
    defaultPreset: 'concise',
    context: 'technical',
    adaptations: {
      technicalAccuracy: true,
      codeContext: true
    }
  },
  'notion.so': {
    defaultPreset: 'executive',
    context: 'documentation',
    adaptations: {
      structuredOutput: true,
      clarity: true
    }
  }
};

function getPresetByName(name) {
  return TONE_PRESETS[name] || null;
}

function getAllPresets() {
  return Object.keys(TONE_PRESETS).map(key => ({
    key,
    ...TONE_PRESETS[key]
  }));
}

function getDomainAdaptation(domain) {
  for (const [domainKey, adaptation] of Object.entries(DOMAIN_ADAPTATIONS)) {
    if (domain.includes(domainKey)) {
      return adaptation;
    }
  }
  return null;
}

function buildPrompt(preset, originalText, domainContext = null) {
  let systemPrompt = preset.systemPrompt;
  
  if (domainContext) {
    const adaptation = getDomainAdaptation(domainContext);
    if (adaptation) {
      systemPrompt += ` Context: ${adaptation.context}`;
    }
  }
  
  return {
    system: systemPrompt,
    constraints: preset.constraints,
    originalText: originalText
  };
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    TONE_PRESETS,
    DOMAIN_ADAPTATIONS,
    getPresetByName,
    getAllPresets,
    getDomainAdaptation,
    buildPrompt
  };
}