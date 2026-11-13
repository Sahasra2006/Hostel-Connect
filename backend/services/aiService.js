const { GoogleGenerativeAI } = require('@google/generative-ai');

/**
 * AI Diagnostic Service for HostelConnect
 * Integrates Google Gemini API with high-fidelity local keyword parser fallback.
 */
class AIService {
  constructor() {
    this.apiKey = process.env.GEMINI_API_KEY || '';
    this.genAI = this.apiKey ? new GoogleGenerativeAI(this.apiKey) : null;
  }

  /**
   * Scans a complaint description and title, automatically diagnosing:
   * 1. Urgency/Priority level (High, Medium, Low)
   * 2. Category recommendation
   * 3. AI Suggested Resolution Action
   */
  async analyzeComplaint(title, description) {
    const textToAnalyze = `${title}\n${description}`;

    if (this.genAI) {
      try {
        console.log('✨ Querying Gemini API for ticket diagnostics...');
        const model = this.genAI.getGenerativeModel({ model: 'gemini-2.5-flash' });
        
        const prompt = `
          You are an expert Hostel Maintenance AI Warden. Analyze the following hostel service request ticket:
          Title: "${title}"
          Description: "${description}"

          Provide a diagnostic assessment strictly as a JSON object with the following fields:
          1. "priority": Determine urgency level. Must be exactly one of: "Low", "Medium", "High".
             - "High": Extreme safety hazard, flood risk, fire risk, live wires, primary power outages, major pipe leaks.
             - "Medium": Wi-Fi issues, minor cleaning requests, simple lighting, standard fan repairs.
             - "Low": Faint wall cracks, non-urgent carpentry, simple fixtures.
          2. "category": Must be exactly one of: "Plumbing", "Electrical", "Cleaning", "Wi-Fi", "Other".
          3. "suggestedAction": A brief (1-2 sentences) actionable guideline for the warden/student. E.g., for flooding: "Instruct resident to locate the toilet wall valve, close it immediately, and deploy dry sand until the plumber arrives within 15 minutes."

          Output JSON only:
        `;

        const response = await model.generateContent({
          contents: [{ role: 'user', parts: [{ text: prompt }] }],
          generationConfig: { responseMimeType: "application/json" }
        });

        const resultText = response.response.text();
        const parsedResult = JSON.parse(resultText);

        return {
          priority: parsedResult.priority || 'Low',
          aiCategory: parsedResult.category || 'Other',
          aiSuggestedAction: parsedResult.suggestedAction || 'Please inspect the issue on-site and coordinate repairs.'
        };
      } catch (err) {
        console.error('⚠️ Gemini AI Call Failed, falling back to local NLP engine:', err.message);
        return this.localNLPAnalyze(title, description);
      }
    } else {
      console.log('🔌 No Gemini API key found. Launching Offline NLP diagnostic engine...');
      return this.localNLPAnalyze(title, description);
    }
  }

  /**
   * Robust local rule-based NLP Classifier (High-fidelity local fallback)
   */
  localNLPAnalyze(title, description) {
    const text = (title + ' ' + description).toLowerCase();
    
    // Critical hazard terms
    const highHazards = ['fire', 'smoke', 'spark', 'shock', 'flood', 'burst', 'broken pipe', 'leak', 'water logging', 'short circuit', 'emergency', 'danger'];
    // Medium annoyance terms
    const medHazards = ['wifi', 'wi-fi', 'internet', 'network', 'dirty', 'clean', 'smell', 'mosquito', 'fan', 'light', 'bulb', 'ac', 'cooler'];

    let priority = 'Low';
    let aiCategory = 'Other';
    let aiSuggestedAction = 'Please inspect the request on-site and schedule standard maintenance.';

    // 1. Diagnose Priority & Category
    if (highHazards.some(k => text.includes(k))) {
      priority = 'High';
      if (text.includes('leak') || text.includes('water') || text.includes('flood') || text.includes('burst') || text.includes('pipe')) {
        aiCategory = 'Plumbing';
        aiSuggestedAction = '⚡ AI Recommendation: Instruct the resident to shut off the main section water valve immediately. Dispatch the emergency plumber to avoid corridor flooding.';
      } else if (text.includes('spark') || text.includes('shock') || text.includes('circuit') || text.includes('fire') || text.includes('wire')) {
        aiCategory = 'Electrical';
        aiSuggestedAction = '🚨 AI Alert: Instruct the student to stay clear of the outlet. Wardens must isolate the section circuit breaker and dispatch an electrician immediately.';
      } else {
        aiCategory = 'Other';
        aiSuggestedAction = '⚠️ AI Warning: High-severity hazard detected. Dispatch warden to verify resident safety and request immediate emergency contractor support.';
      }
    } else if (medHazards.some(k => text.includes(k))) {
      priority = 'Medium';
      if (text.includes('wifi') || text.includes('wi-fi') || text.includes('internet') || text.includes('network')) {
        aiCategory = 'Wi-Fi';
        aiSuggestedAction = '📶 AI Recommendation: Instruct the resident to restart their local access point. Warden should verify Block switch diagnostics and log router uptime.';
      } else if (text.includes('clean') || text.includes('smell') || text.includes('dirty') || text.includes('litter')) {
        aiCategory = 'Cleaning';
        aiSuggestedAction = '🧹 AI Recommendation: Log ticket in the morning janitorial rota. Request corridors sweeps and disinfection of local bin areas.';
      } else if (text.includes('light') || text.includes('bulb') || text.includes('fan') || text.includes('ac')) {
        aiCategory = 'Electrical';
        aiSuggestedAction = '💡 AI Recommendation: Warden should retrieve a replacement component from the maintenance store cupboard and dispatch the handyman on normal shifts.';
      }
    } else {
      priority = 'Low';
      aiSuggestedAction = '📝 AI Assessment: Low-severity request. Log in standard warden queue. Handy-staff will resolve during next general building rounds.';
    }

    return {
      priority,
      aiCategory,
      aiSuggestedAction
    };
  }

  /**
   * Moderates message or post content to check if it contains inappropriate content.
   * Returns an object { isInappropriate: boolean, reason: string }
   */
  async moderateContent(text) {
    if (!text || !text.trim()) {
      return { isInappropriate: false, reason: '' };
    }

    if (this.genAI) {
      try {
        console.log('✨ Querying Gemini API for content moderation...');
        const model = this.genAI.getGenerativeModel({ model: 'gemini-2.5-flash' });
        
        const prompt = `
          You are a professional Hostel Community Social Moderator. Analyze the following post or message content:
          "${text}"

          Determine if it violates standard community guidelines (e.g., contains severe profanity, explicit harassment, cyberbullying, hate speech, direct threats, graphical violence, or personal abuse).

          Provide a diagnostic assessment strictly as a JSON object with the following fields:
          1. "isInappropriate": A boolean (true or false). Set to true only if it clearly violates guidelines.
          2. "reason": A very brief category of violation (e.g., "Harassment", "Profanity", "Threats", "Hate Speech") or empty string "" if false.

          Output JSON only:
        `;

        const response = await model.generateContent({
          contents: [{ role: 'user', parts: [{ text: prompt }] }],
          generationConfig: { responseMimeType: "application/json" }
        });

        const resultText = response.response.text();
        const parsedResult = JSON.parse(resultText);

        return {
          isInappropriate: parsedResult.isInappropriate === true || parsedResult.isInappropriate === 'true',
          reason: parsedResult.reason || ''
        };
      } catch (err) {
        console.error('⚠️ Gemini Moderation Failed, falling back to local profanity checker:', err.message);
        return this.localNLPModerate(text);
      }
    } else {
      return this.localNLPModerate(text);
    }
  }

  /**
   * Simple local fallback profanity and threat checker
   */
  localNLPModerate(text) {
    const cleaned = text.toLowerCase();
    // Standard generic blocked words / profanities
    const blockedWords = ['abuse', 'harass', 'idiot', 'jerk', 'stupid', 'hate', 'kill', 'threat'];
    
    const foundWord = blockedWords.find(word => cleaned.includes(word));
    if (foundWord) {
      return {
        isInappropriate: true,
        reason: 'Flagged Word / Potential Harassment'
      };
    }
    
    return {
      isInappropriate: false,
      reason: ''
    };
  }

  /**
   * Generates an AI summary of student feedbacks on weekly mess meals.
   */
  async summarizeMessFeedback(feedbacks, menu) {
    if (!this.genAI) {
      return {
        sentiment: "Offline Mode: AI key is not configured.",
        highlights: ["Local feedback records exist but AI is deactivated."],
        complaints: ["Cannot process summaries without API credentials."],
        recommendations: ["Ensure portion sizes are adequate.", "Keep dining areas sanitized."]
      };
    }
    try {
      console.log('✨ Querying Gemini API for mess feedback summarization...');
      const model = this.genAI.getGenerativeModel({ model: 'gemini-2.5-flash' });
      
      const feedbackTexts = feedbacks
        .filter(f => f.comment)
        .map(f => `[${f.mealType.toUpperCase()} - Rating ${f.rating}/5]: "${f.comment}"`)
        .slice(0, 50)
        .join('\n');

      const menuText = JSON.stringify(menu);

      const prompt = `
        You are an expert Hostel Mess Quality Auditor. Analyze the following student meal feedback comments and the current weekly menu schedule:
        
        Current Menu:
        ${menuText}

        Student Feedbacks:
        ${feedbackTexts}

        Provide a diagnostic food quality assessment strictly as a JSON object with the following fields:
        1. "sentiment": A summary statement of overall student satisfaction (1-2 sentences).
        2. "highlights": An array of strings representing positive highlights.
        3. "complaints": An array of strings representing common complaints.
        4. "recommendations": An array of 3 actionable menu recommendation changes based on feedback.

        Output JSON only:
      `;

      const response = await model.generateContent({
        contents: [{ role: 'user', parts: [{ text: prompt }] }],
        generationConfig: { responseMimeType: "application/json" }
      });

      return JSON.parse(response.response.text());
    } catch (err) {
      console.error('Error generating mess AI summary:', err);
      return {
        sentiment: "Failed to generate AI summary. Please check logs.",
        highlights: [],
        complaints: [],
        recommendations: ["Ensure portion sizes are adequate.", "Keep dining areas sanitized."]
      };
    }
  }

  /**
   * Provides responses as a resident assistant chatbot.
   */
  async chatResidentAssistant(message, history = [], latestPosts = []) {
    if (!this.genAI) {
      return {
        reply: "Hello! I am HostelConnect Warden AI, but I'm currently in offline mode since the Gemini API key is missing. Please contact your administrator."
      };
    }
    try {
      console.log('✨ Querying Gemini API for resident assistant chat...');
      let contents = history.map(h => ({
        role: h.role === 'user' ? 'user' : 'model',
        parts: [{ text: h.text }]
      }));

      // Ensure the history starts with a 'user' message as required by the Gemini SDK
      const firstUserIndex = contents.findIndex(c => c.role === 'user');
      if (firstUserIndex > -1) {
        contents = contents.slice(firstUserIndex);
      } else {
        contents = [];
      }

      // Format latest posts for Gemini context
      const postsContext = latestPosts && latestPosts.length > 0
        ? latestPosts.map(p => {
            const author = p.isAnonymous ? 'Anonymous Student' : (p.user?.name || 'Student');
            return `- [Post by ${author}]: "${p.content}" (Likes: ${p.likes?.length || 0}, Comments: ${p.comments?.length || 0})`;
          }).join('\n')
        : 'No trending posts currently.';

      const model = this.genAI.getGenerativeModel({ 
        model: 'gemini-2.5-flash',
        systemInstruction: {
          parts: [{
            text: `You are the HostelConnect Resident Assistant (RA) Chatbot. Your name is "HostelConnect Warden AI". 
You help students with common hostel issues, timing questions, and general guidelines:
- Mess Timings: Breakfast: 7:30 AM - 9:30 AM, Lunch: 12:30 PM - 2:30 PM, Snacks: 5:00 PM - 6:30 PM, Dinner: 7:30 PM - 9:30 PM.
- Gate Timings: In-time for hostel is 10:00 PM. Out-time opens at 6:00 AM.
- Laundry / Washing: Do NOT mention laundry, washing, or washing machines schedules anywhere. If a resident asks about laundry, reply politely that laundry facilities are handled independently by outside vendors and are not managed by the hostel system.
- Complaints: Residents can register complaints in the Service Requests tab. 

Here are the trending posts in the Community Lounge:
${postsContext}

If a user asks about what is trending, what is happening in the community, or what students are talking about, refer to the trending posts listed above.
Provide extremely helpful, friendly, and concise responses. Do not make up facts. Format with bullet points if helpful.`
          }]
        }
      });
      
      const chat = model.startChat({
        history: contents
      });

      const result = await chat.sendMessage(message);
      return {
        reply: result.response.text()
      };
    } catch (err) {
      console.error('Error in resident assistant chat:', err);
      return {
        reply: "I am having trouble connecting to the brain center right now. Please try again in a moment."
      };
    }
  }

  /**
   * Moderates an uploaded image to verify it matches community guidelines.
   * Accepts a base64 image data string and returns { isInappropriate: boolean, reason: string }
   */
  async moderateImage(base64Image) {
    if (!base64Image) {
      return { isInappropriate: false, reason: '' };
    }

    if (!this.genAI) {
      // Offline mode fallback: allow image
      return { isInappropriate: false, reason: '' };
    }

    try {
      console.log('✨ Querying Gemini API for image content moderation...');
      const model = this.genAI.getGenerativeModel({ model: 'gemini-2.5-flash' });

      // Extract raw data and mime type from Base64 string
      const matches = base64Image.match(/^data:([A-Za-z-+\/]+);base64,(.+)$/);
      if (!matches || matches.length !== 3) {
        return { isInappropriate: true, reason: 'Invalid Image Format' };
      }

      const imagePart = {
        inlineData: {
          data: matches[2],
          mimeType: matches[1]
        }
      };

      const prompt = `
        You are a professional Hostel Community Social Moderator. Analyze the following uploaded image.
        Determine if it violates standard community guidelines (e.g., contains explicit adult content, severe violence, graphical gore, hate symbols, weapons, self-harm, harassment, or illegal substances).

        Provide a diagnostic assessment strictly as a JSON object with the following fields:
        1. "isInappropriate": A boolean (true or false). Set to true only if the image clearly violates guidelines.
        2. "reason": A very brief category of violation (e.g., "Explicit Content", "Violence", "Drugs", "Hate Symbol") or empty string "" if false.

        Output JSON only:
      `;

      const response = await model.generateContent([prompt, imagePart]);
      const resultText = response.response.text();
      // Clean potential JSON markdown wrapper
      const cleanJson = resultText.replace(/```json/g, '').replace(/```/g, '').trim();
      const parsedResult = JSON.parse(cleanJson);

      return {
        isInappropriate: parsedResult.isInappropriate === true || parsedResult.isInappropriate === 'true',
        reason: parsedResult.reason || ''
      };
    } catch (err) {
      console.error('⚠️ Gemini Image Moderation Failed:', err.message);
      // Fallback: allow the image on connection error
      return { isInappropriate: false, reason: '' };
    }
  }
}

module.exports = new AIService();
