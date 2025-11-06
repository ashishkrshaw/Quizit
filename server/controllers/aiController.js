
import { GoogleGenAI, Type } from '@google/genai';
import fetch from 'node-fetch';

// Try multiple environment variable names to be robust across deployments.
const genaiKey = process.env.GENAI_API_KEY || process.env.GOOGLE_API_KEY || process.env.API_KEY || process.env.GOOGLE_APIKEY;
if (!genaiKey) {
    console.warn('Warning: No Google GenAI API key found in env (checked GENAI_API_KEY, GOOGLE_API_KEY, API_KEY). Gemini calls will likely fail unless credentials are provided.');
}
const ai = new GoogleGenAI({ apiKey: genaiKey });
// Optional local fallback toggle. Set LOCAL_FALLBACK=true in server .env to enable deterministic local questions
const LOCAL_FALLBACK = process.env.LOCAL_FALLBACK === 'true';

// Helper to reliably extract JSON from a string, even if it's wrapped in a markdown code block.
const parseJsonFromMarkdown = (text) => {
    const match = text.match(/```(json)?\s*([\s\S]*?)\s*```/);
    if (match && match[2]) {
        return match[2].trim();
    }
    return text.trim();
};

const callPerplexityAPI = async (prompt) => {
    console.log("Using Perplexity API as fallback...");
    const url = 'https://api.perplexity.ai/chat/completions';

    const apiKey = process.env.PERPLEXITY_API_KEY;
    if (!apiKey) {
        throw new Error('Perplexity API key not configured. Set PERPLEXITY_API_KEY in environment.');
    }

    // Try a couple of request shapes. Prefer the request without an explicit model first
    // because many Perplexity accounts reject custom model names; if that fails, try
    // including the previously used model string.
    const candidateBodies = [
        { messages: [{ role: "user", content: prompt }] },
        { model: "sonar-large-32k-online", messages: [{ role: "user", content: prompt }] },
    ];

    let lastError = null;
    for (const body of candidateBodies) {
        try {
            const response = await fetch(url, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${apiKey}`,
                    'Content-Type': 'application/json',
                    'Accept': 'application/json',
                },
                body: JSON.stringify(body),
            });

            if (!response.ok) {
                const errorText = await response.text().catch(() => '<<no body>>');
                // Surface the status/text but continue to retry next body if available
                lastError = new Error(`Perplexity API Error: ${response.status} ${response.statusText} - ${errorText}`);
                // Log the full response text for easier debugging in logs
                console.warn('Perplexity request failed:', lastError.message);
                continue;
            }

            const data = await response.json();
            // Defensive checks: Perplexity may return different shapes; try to extract text robustly.
            if (data?.choices?.[0]?.message?.content) {
                return data.choices[0].message.content;
            }
            if (data?.result?.content) {
                return data.result.content;
            }
            // Otherwise return the whole payload as a string for debugging
            return JSON.stringify(data);
        } catch (err) {
            lastError = err;
            console.warn('Perplexity fetch error:', err && err.message ? err.message : err);
            continue;
        }
    }

    // If we exhausted retries, throw the last error
    throw lastError || new Error('Perplexity API failed for unknown reasons');
};

// @desc    Generate a quiz
// @route   POST /api/quiz/generate
// @access  Private
export const generateQuiz = async (req, res) => {
    const config = req.body;
    const hasValidSourceFile = config.sourceFileContent && config.sourceFileContent.trim() !== '';

    // 1. Construct the prompt
    let prompt = `Generate a quiz based on the following criteria.
    Topic: "${config.topic}"
    Number of questions: ${config.rounds}
    Question format: ${config.quizType}.
    `;

    if (config.quizType === 'Multiple Choice') {
        prompt += ` Each question should have ${config.mcqOptions} options.`;
    }
    
    if (hasValidSourceFile) {
        prompt += `\nStrictly use the following text as the source for all questions and answers:\n---\n${config.sourceFileContent}\n---`;
    }
    
    if (config.customPrompt) {
        prompt += `\nAdditional instructions: "${config.customPrompt}"`;
    }

    prompt += `\nYour response MUST be a single, valid JSON object only. Do not include any text, explanations, or markdown formatting (like \`\`\`json) before or after the JSON object. The required structure is: { "questions": [ { "questionText": "...", "correctAnswer": "...", "options": ["..."] } ] }.`;
    
    const questionSchema = {
        type: Type.OBJECT,
        properties: {
            questionText: { type: Type.STRING },
            correctAnswer: { type: Type.STRING },
            ...(config.quizType === 'Multiple Choice' && {
                options: { type: Type.ARRAY, items: { type: Type.STRING } }
            })
        }
    };

    const quizSchema = {
        type: Type.OBJECT,
        properties: {
            questions: { type: Type.ARRAY, items: questionSchema }
        }
    };
    
    const useGoogleSearch = !hasValidSourceFile;
    
    // Conditionally build the Gemini config to avoid conflicts
    const geminiRequestConfig = {};
    if (useGoogleSearch) {
        // When using tools like Google Search, we cannot use responseMimeType.
        geminiRequestConfig.tools = [{ googleSearch: {} }];
    } else {
        // When not using tools, we can enforce a JSON schema.
        geminiRequestConfig.responseMimeType = "application/json";
        geminiRequestConfig.responseSchema = quizSchema;
    }


    try {
        // --- 1. Try Gemini API ---
        const geminiResponse = await ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: prompt,
            config: geminiRequestConfig,
        });
        
        const groundingMetadata = geminiResponse.candidates?.[0]?.groundingMetadata;
        const sources = groundingMetadata?.groundingChunks?.map(chunk => chunk.web) || null;

        // Clean and parse the response text to handle markdown wrappers.
        const cleanedJsonString = parseJsonFromMarkdown(geminiResponse.text);
        let parsedQuiz = JSON.parse(cleanedJsonString);

        res.status(200).json({ questions: parsedQuiz.questions, sources });

    } catch (geminiError) {
        console.error("Gemini API Error:", geminiError.message);
        try {
            // --- 2. Fallback to Perplexity API ---
            const perplexityResult = await callPerplexityAPI(prompt);
            
            // Clean and parse the fallback response as well for robustness.
            const cleanedJsonString = parseJsonFromMarkdown(perplexityResult);
            let parsedQuiz = JSON.parse(cleanedJsonString);

            // Perplexity doesn't provide grounding sources, so return null
            res.status(200).json({ questions: parsedQuiz.questions, sources: null });

        } catch (fallbackError) {
            console.error("Fallback API Error:", fallbackError && fallbackError.message ? fallbackError.message : fallbackError);
            // If the server owner opted into a local fallback, use it; otherwise preserve original behavior and return 500
            if (!LOCAL_FALLBACK) {
                return res.status(500).json({ message: "Both AI services failed. Please try again later." });
            }

            // LOCAL_FALLBACK=true -> generate deterministic local placeholder questions so quiz flow remains functional
            try {
                console.warn('Using local fallback generator for quiz due to AI failures.');
                const rounds = Number(config.rounds) || 5;
                const mcqOptions = Number(config.mcqOptions) || 4;
                const source = config.sourceFileContent ? String(config.sourceFileContent) : '';

                // Split source into simple sentences for lightweight question generation
                const sentences = source ? source.split(/[.?!]\s+/).filter(s => s.trim()) : [];

                const questions = [];
                for (let i = 0; i < rounds; i++) {
                    const base = sentences[i] || `${config.topic} - question ${i + 1}`;
                    const questionText = base.length > 220 ? base.slice(0, 217) + '...' : base;
                    const correctAnswer = base.split(/\s+/).slice(0, 5).join(' ').replace(/[.?!]$/, '') || `Answer ${i + 1}`;

                    if (config.quizType === 'Multiple Choice') {
                        const options = [correctAnswer];
                        // generate simple distractors
                        for (let j = 1; j < mcqOptions; j++) {
                            options.push(`${correctAnswer} (${j + 1})`);
                        }
                        // shuffle options
                        for (let k = options.length - 1; k > 0; k--) {
                            const r = Math.floor(Math.random() * (k + 1));
                            [options[k], options[r]] = [options[r], options[k]];
                        }
                        questions.push({ questionText, correctAnswer, options });
                    } else {
                        questions.push({ questionText, correctAnswer });
                    }
                }

                return res.status(200).json({ questions, sources: null, fallback: true, message: 'AI services unavailable; returned local fallback questions.' });
            } catch (localErr) {
                console.error('Local fallback failed:', localErr && localErr.message ? localErr.message : localErr);
                return res.status(500).json({ message: 'Both AI services failed and local fallback failed. Please try again later.' });
            }
        }
    }
};

// @desc    Generate personal insights
// @route   POST /api/insights/generate
// @access  Private
export const generatePersonalInsights = async (req, res) => {
    const { history, user } = req.body;

    const prompt = `
    Act as a friendly and encouraging personal AI learning coach.
    Analyze the user's profile and quiz history to provide personalized insights and recommendations.
    User Profile:
    - Name: ${user.name}
    - Role: ${user.profession || 'Learner'}
    - Goals: "${user.goals || 'General improvement'}"

    Quiz History (last 10 quizzes):
    ${history.slice(0, 10).map(h => 
        `- Topic: "${h.quizTopic}", Score: ${h.score}, Rank: ${h.rank}/${h.playerCount}`
    ).join('\n')}

    Based on this data, provide a concise, actionable, and motivational analysis. Address the user by name.
    - Identify strengths and potential weaknesses.
    - Suggest specific topics or strategies for improvement.
    - Keep the tone positive and supportive.
    - Format the output with markdown-style headers (e.g., '### Key Strengths').
    `;

    try {
         // --- 1. Try Gemini API ---
        const geminiResponse = await ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: prompt,
        });
        res.status(200).json({ insights: geminiResponse.text });
    } catch (geminiError) {
        console.error("Gemini API Error for Insights:", geminiError.message);
        try {
            // --- 2. Fallback to Perplexity API ---
            const perplexityResult = await callPerplexityAPI(prompt);
            res.status(200).json({ insights: perplexityResult });
        } catch (fallbackError) {
            console.error("Fallback API Error for Insights:", fallbackError.message);
            res.status(500).json({ message: "Both AI services failed. Please try again later." });
        }
    }
};

// @desc    Chat assistant endpoint (simple conversational helper)
// @route   POST /api/chat
// @access  Private
export const chatAssistant = async (req, res) => {
    const { message } = req.body;
    if (!message || typeof message !== 'string') {
        return res.status(400).json({ message: 'Message text is required' });
    }

    const prompt = `You are a helpful quiz assistant. Answer concisely and help the user with quiz-related questions. User: ${message}`;

    try {
        const geminiResponse = await ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: prompt,
        });

        const text = geminiResponse.text || '';
        res.status(200).json({ reply: text });
    } catch (geminiError) {
        console.error('Gemini API Error for chat:', geminiError.message);
        try {
            const perplexityResult = await callPerplexityAPI(prompt);
            res.status(200).json({ reply: perplexityResult });
        } catch (fallbackError) {
            console.error('Fallback API Error for chat:', fallbackError.message);
            res.status(500).json({ message: 'AI assistant currently unavailable.' });
        }
    }
};