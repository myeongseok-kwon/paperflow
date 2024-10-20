import OpenAI from "openai";

// Initialize OpenAI instance with the public API key
const openai = new OpenAI({
  apiKey: process.env.NEXT_PUBLIC_OPENAI_API_KEY, // Access the public key here
  dangerouslyAllowBrowser: true
});

/**
 * Function to send a request to OpenAI API with customizable parameters.
 * @param {string} model - The model to use (e.g., "gpt-4").
 * @param {string} systemPrompt - The system-level instruction for the model.
 * @param {string} userPrompt - The user-level instruction or prompt.
 * @returns {Promise<string>} - The response from OpenAI.
 */
export const getCompletion = async (model, systemPrompt, userPrompt) => {
  try {
    const completion = await openai.chat.completions.create({
      model: model,
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt },
      ],
    });

    // Return the first message from the response
    return completion.choices[0].message.content;
  } catch (error) {
    console.error("Error with OpenAI API:", error);
    throw error;
  }
};