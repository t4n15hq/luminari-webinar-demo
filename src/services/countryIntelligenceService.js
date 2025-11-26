// Country Selection Intelligence Service
// Provides smart recommendations and analysis for country selection

import openaiService from './openaiService';

class CountryIntelligenceService {
  constructor() {
    // Analysis cache to avoid repeated API calls
    this.analysisCache = new Map();
  }

  // Analyze countries based on study parameters
  async analyzeCountryRecommendations(studyParams, availableCountries) {
    const cacheKey = this.generateCacheKey(studyParams, availableCountries);
    
    if (this.analysisCache.has(cacheKey)) {
      return this.analysisCache.get(cacheKey);
    }

    try {
      const analysis = await this.performCountryAnalysis(studyParams, availableCountries);
      this.analysisCache.set(cacheKey, analysis);
      return analysis;
    } catch (error) {
      console.warn('Country intelligence analysis failed, using fallback:', error);
      return this.getFallbackAnalysis(availableCountries);
    }
  }

  async performCountryAnalysis(studyParams, countries) {
    const { disease, trialPhase, targetSampleSize, documentType } = studyParams;
    
    const prompt = `
      Analyze regulatory feasibility for clinical trial country selection:
      
      STUDY PARAMETERS:
      - Disease/Condition: ${disease || 'Not specified'}
      - Trial Phase: ${trialPhase || 'Not specified'}  
      - Target Sample Size: ${targetSampleSize || 'Not specified'}
      - Document Type: ${documentType || 'Not specified'}
      
      COUNTRIES TO ANALYZE: ${countries.map(c => c.name).join(', ')}
      
      For each country, provide a feasibility assessment considering:
      1. Regulatory pathway complexity and timeline
      2. Competition saturation in this therapeutic area
      3. Infrastructure and site availability
      4. Cost-effectiveness and enrollment potential
      
      Return JSON format:
      {
        "recommendations": [
          {
            "country": "CountryName",
            "score": 0.85,
            "priority": "high|medium|low", 
            "reasoning": "Brief explanation",
            "risks": "Key risk factors",
            "timeline": "Expected timeline",
            "advantages": "Key advantages"
          }
        ]
      }
      
      Be realistic about challenges and focus on actionable insights.
    `;

    // Use openaiService to get AI analysis
    try {
      console.log('Attempting AI analysis for countries:', countries.map(c => c.name));
      console.log('Prompt being sent:', prompt.substring(0, 200) + '...');
      
      const response = await openaiService.queryAssistant({ question: prompt });
      console.log('AI response received:', response);
      
      return this.parseAnalysisResponse(response, countries);
    } catch (error) {
      console.warn('AI analysis failed, using fallback:', error);
      return this.getFallbackAnalysis(countries);
    }
  }

  parseAnalysisResponse(response, countries) {
    try {
      // Handle response object with 'answer' property
      const responseText = response?.answer || response;
      
      // Try to parse JSON response
      const parsed = JSON.parse(responseText);
      if (parsed.recommendations) {
        console.log('Parsed AI recommendations:', parsed.recommendations);
        return this.validateAndFormatRecommendations(parsed.recommendations, countries);
      }
    } catch (error) {
      console.warn('Failed to parse AI response as JSON, using text analysis');
    }

    // Fallback: extract insights from text response
    const responseText = response?.answer || response;
    return this.extractInsightsFromText(responseText, countries);
  }

  validateAndFormatRecommendations(recommendations, countries) {
    const validRecommendations = {};
    
    recommendations.forEach(rec => {
      const country = countries.find(c => c.name === rec.country);
      if (country) {
        validRecommendations[country.name] = {
          score: Math.max(0, Math.min(1, rec.score || 0.5)),
          priority: ['high', 'medium', 'low'].includes(rec.priority) ? rec.priority : 'medium',
          reasoning: rec.reasoning || 'Standard regulatory pathway',
          risks: rec.risks || 'Standard regulatory risks',
          timeline: rec.timeline || 'Standard timeline',
          advantages: rec.advantages || 'Established regulatory framework',
          hasAnalysis: true
        };
      }
    });

    return validRecommendations;
  }

  extractInsightsFromText(response, countries) {
    const recommendations = {};
    
    countries.forEach(country => {
      const countryText = this.extractCountrySection(response, country.name);
      recommendations[country.name] = {
        score: this.extractScore(countryText),
        priority: this.extractPriority(countryText),
        reasoning: this.extractReasoning(countryText) || 'AI analysis available',
        risks: this.extractRisks(countryText) || 'Standard considerations apply',
        timeline: this.extractTimeline(countryText) || 'Varies by study type',
        advantages: this.extractAdvantages(countryText) || 'Established market access',
        hasAnalysis: true
      };
    });

    return recommendations;
  }

  getFallbackAnalysis(countries) {
    const recommendations = {};
    
    // Basic scoring based on common knowledge
    const countryScores = {
      'United States': { score: 0.9, priority: 'high', reasoning: 'Strong FDA pathway and infrastructure' },
      'Germany': { score: 0.85, priority: 'high', reasoning: 'EMA centralized procedure access' },
      'United Kingdom': { score: 0.8, priority: 'high', reasoning: 'MHRA expertise and patient access' },
      'Canada': { score: 0.75, priority: 'medium', reasoning: 'Health Canada regulatory pathway' },
      'Australia': { score: 0.8, priority: 'medium', reasoning: 'TGA fast-track options available' },
      'Japan': { score: 0.7, priority: 'medium', reasoning: 'PMDA consultation system' },
      'France': { score: 0.75, priority: 'medium', reasoning: 'ANSM regulatory pathway' },
      'Italy': { score: 0.7, priority: 'medium', reasoning: 'AIFA assessment process' },
      'Spain': { score: 0.7, priority: 'medium', reasoning: 'AEMPS regulatory framework' }
    };

    countries.forEach(country => {
      const fallback = countryScores[country.name] || { 
        score: 0.6, 
        priority: 'medium', 
        reasoning: 'Standard regulatory pathway available' 
      };
      
      recommendations[country.name] = {
        ...fallback,
        risks: 'Standard regulatory considerations',
        timeline: 'Varies by document type and study complexity', 
        advantages: 'Established healthcare infrastructure',
        hasAnalysis: false // Indicates this is fallback data
      };
    });

    return recommendations;
  }

  // Helper methods for text extraction
  extractCountrySection(text, countryName) {
    const regex = new RegExp(`${countryName}[\\s\\S]*?(?=\\n\\n|${countryName}|$)`, 'i');
    const match = text.match(regex);
    return match ? match[0] : '';
  }

  extractScore(text) {
    const scoreRegex = /score[:\s]*(\d*\.?\d+)/i;
    const match = text.match(scoreRegex);
    return match ? Math.max(0, Math.min(1, parseFloat(match[1]))) : 0.6;
  }

  extractPriority(text) {
    if (/high.*priority|highly.*recommend|excellent|strong/i.test(text)) return 'high';
    if (/low.*priority|not.*recommend|challenging|difficult/i.test(text)) return 'low';
    return 'medium';
  }

  extractReasoning(text) {
    const reasoningPatterns = [
      /because\s+(.*?)[\.\n]/i,
      /due to\s+(.*?)[\.\n]/i,
      /as\s+(.*?)[\.\n]/i
    ];
    
    for (const pattern of reasoningPatterns) {
      const match = text.match(pattern);
      if (match && match[1]) {
        return match[1].trim();
      }
    }
    return null;
  }

  extractRisks(text) {
    const riskPatterns = [
      /risk[s]?\s*:?\s*(.*?)[\.\n]/i,
      /challenge[s]?\s*:?\s*(.*?)[\.\n]/i,
      /concern[s]?\s*:?\s*(.*?)[\.\n]/i
    ];
    
    for (const pattern of riskPatterns) {
      const match = text.match(pattern);
      if (match && match[1]) {
        return match[1].trim();
      }
    }
    return null;
  }

  extractTimeline(text) {
    const timelinePatterns = [
      /timeline\s*:?\s*(.*?)[\.\n]/i,
      /(\d+\s*(?:month|week|year)s?)/i
    ];
    
    for (const pattern of timelinePatterns) {
      const match = text.match(pattern);
      if (match && match[1]) {
        return match[1].trim();
      }
    }
    return null;
  }

  extractAdvantages(text) {
    const advantagePatterns = [
      /advantage[s]?\s*:?\s*(.*?)[\.\n]/i,
      /benefit[s]?\s*:?\s*(.*?)[\.\n]/i,
      /strength[s]?\s*:?\s*(.*?)[\.\n]/i
    ];
    
    for (const pattern of advantagePatterns) {
      const match = text.match(pattern);
      if (match && match[1]) {
        return match[1].trim();
      }
    }
    return null;
  }

  generateCacheKey(studyParams, countries) {
    const paramString = JSON.stringify(studyParams);
    const countryString = countries.map(c => c.name).sort().join(',');
    return `${paramString}-${countryString}`;
  }

  // Get priority icon for display
  getPriorityIcon(priority) {
    switch (priority) {
      case 'high': return '🟢';
      case 'medium': return '🟡';
      case 'low': return '🔴';
      default: return '⚪';
    }
  }

  // Get priority color for styling
  getPriorityColor(priority) {
    switch (priority) {
      case 'high': return '#10b981';
      case 'medium': return '#f59e0b';
      case 'low': return '#ef4444';
      default: return '#6b7280';
    }
  }
}

// Export singleton instance
export default new CountryIntelligenceService();