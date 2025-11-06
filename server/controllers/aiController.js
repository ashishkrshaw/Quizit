
import { GoogleGenAI, Type } from '@google/genai';
import fetch from 'node-fetch';

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

// Helper to reliably extract JSON from a string, even if it's wrapped in a markdown code block.
const parseJsonFromMarkdown = (text) => {
    const match = text.match(/```(json)?\s*([\s\S]*?)\s*```/);
    if (match && match[2]) {
        return match[2].trim();
    }
    return text.trim();
};

// Call Perplexity (preferred / primary if PERPLEXITY_API_KEY is set)
const callPerplexityAPI = async (prompt) => {
    const url = 'https://api.perplexity.ai/chat/completions';
    const modelName = process.env.PERPLEXITY_MODEL || 'perplexity-v1';
    console.log(`Calling Perplexity model=${modelName}...`);

    const body = {
        model: modelName,
        messages: [{ role: 'user', content: prompt }],
    };

    const response = await fetch(url, {
        method: 'POST',
        headers: {
            'Authorization': `Bearer ${process.env.PERPLEXITY_API_KEY}`,
            'Content-Type': 'application/json',
            'Accept': 'application/json',
        },
        body: JSON.stringify(body),
    });

    if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Perplexity API Error: ${response.statusText} - ${errorText}`);
    }

    const data = await response.json();
    // Perplexity returns content in choices[0].message.content (matches previous code)
    return data.choices?.[0]?.message?.content || data.choices?.[0] || '';
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
        // Additional strict constraints to avoid formatting tokens and ensure consistency:
        prompt += `\nRequirements (strict):`;
        prompt += `\n1) Every question object must include exactly one string field 'questionText', one string field 'correctAnswer', and (for MCQ) an 'options' array of strings.`;
        prompt += `\n2) The 'correctAnswer' value MUST match exactly one of the strings present in 'options' (case insensitive match is acceptable on the server, but send the exact option text).`;
        prompt += `\n3) Option strings must be plain text only: do NOT include Markdown, HTML tags, emphasis characters (like '*', '**', '_', '__'), backticks, or parenthetical correctness markers such as '(correct)'.`;
        prompt += `\n4) Do not add numbering, letters (A., B., etc.) or extra prefixes to options. Return only the option text.`;
        prompt += `\n5) Trim whitespace inside strings and avoid newline characters inside option strings.`;
        prompt += `\n6) If you cannot produce the requested number of valid questions from the source, return fewer questions but still a valid JSON object.`;
    
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
        // Note: some runtime environments may not accept the 'config' field
        // inline; pass only the core fields here. The geminiRequestConfig
        // will be used by the SDK automatically if supported.
        const geminiResponse = await ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: prompt,
        });
        
        const groundingMetadata = geminiResponse.candidates?.[0]?.groundingMetadata;
        const sources = groundingMetadata?.groundingChunks?.map(chunk => chunk.web) || null;

        // Clean and parse the response text to handle markdown wrappers.
        const cleanedJsonString = parseJsonFromMarkdown(geminiResponse.text);
        let parsedQuiz = JSON.parse(cleanedJsonString);

        // Sanitize strings coming from the AI to avoid leftover markdown/HTML
        // or surprising whitespace that can affect UI rendering.
        const sanitizeString = (s) => {
            if (typeof s !== 'string') return s;
            let out = s.trim();
            // Remove surrounding backticks or quotes
            out = out.replace(/^\s*[`"']+|[`"']+\s*$/g, '');
            // Remove HTML tags
            out = out.replace(/<[^>]*>/g, '');
            // Remove common markdown emphasis characters (simple heuristic)
            out = out.replace(/\*\*|\*|__|_/g, '');
            // Collapse multiple spaces/newlines into single space
            out = out.replace(/\s+/g, ' ');
            // Remove trailing markers like (correct) or [correct]
            out = out.replace(/\(correct\)|\[correct\]/ig, '');
            // Remove leading labels like 'A. ', '1) ', 'a) '
            out = out.replace(/^\s*[A-Za-z0-9]+[\.|\)]\s*/, '');
            return out.trim();
        };

        const sanitizeQuestion = (q) => {
            const cleanQ = {
                questionText: sanitizeString(q.questionText || ''),
                correctAnswer: sanitizeString(q.correctAnswer || ''),
            };
            if (Array.isArray(q.options)) {
                cleanQ.options = q.options.map(o => sanitizeString(o)).filter(Boolean);
            }
            return cleanQ;
        };

        const safeQuestions = (parsedQuiz.questions || []).map(sanitizeQuestion);

        res.status(200).json({ questions: safeQuestions, sources });

    } catch (geminiError) {
        console.error("Gemini API Error:", geminiError.message);
        try {
            // --- 2. Fallback to Perplexity API ---
            const perplexityResult = await callPerplexityAPI(prompt);
            
            // Clean and parse the fallback response as well for robustness.
            const cleanedJsonString = parseJsonFromMarkdown(perplexityResult);
            let parsedQuiz = JSON.parse(cleanedJsonString);

            // Sanitize fallback response as well
            const sanitizeString = (s) => {
                if (typeof s !== 'string') return s;
                let out = s.trim();
                out = out.replace(/^\s*[`"']+|[`"']+\s*$/g, '');
                out = out.replace(/<[^>]*>/g, '');
                out = out.replace(/\*\*|\*|__|_/g, '');
                out = out.replace(/\s+/g, ' ');
                return out.trim();
            };

            const sanitizeQuestion = (q) => {
                const cleanQ = {
                    questionText: sanitizeString(q.questionText || ''),
                    correctAnswer: sanitizeString(q.correctAnswer || ''),
                };
                if (Array.isArray(q.options)) {
                    cleanQ.options = q.options.map(o => sanitizeString(o)).filter(Boolean);
                }
                return cleanQ;
            };

            const safeQuestions = (parsedQuiz.questions || []).map(sanitizeQuestion);

            // Perplexity doesn't provide grounding sources, so return null
            res.status(200).json({ questions: safeQuestions, sources: null });

        } catch (fallbackError) {
            console.error("Fallback API Error:", fallbackError.message);
            res.status(500).json({ message: "Both AI services failed. Please try again later." });
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