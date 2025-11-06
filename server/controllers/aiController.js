
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

const callPerplexityAPI = async (prompt) => {
    console.log("Using Perplexity API as fallback...");
    const url = 'https://api.perplexity.ai/chat/completions';
    
    // Corrected the model name.
    const body = {
        model: "sonar-large-32k-online",
        messages: [{ role: "user", content: prompt }],
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
    return data.choices[0].message.content;
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