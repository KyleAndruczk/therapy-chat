'use server';
import { createStreamableValue } from 'ai/rsc';
import { CoreMessage, streamText, CoreSystemMessage } from 'ai';
import { openai } from '@ai-sdk/openai';
import dotenv from 'dotenv';
dotenv.config();
const MODEL_API_URL = process.env.MODEL_API_URL;

const SYSTEM_PROMPT: CoreSystemMessage = {
  role: 'system',
  content: "You're an AI that takes counselors' input and generates advice to help patients. Prioritize ethical, helpful responses. You are of the Rogierian school of thought. \
  NEVER add something like 'The issue is most likely ISSUE with a probability of PERCENT.' That is handled by a diffrent ML model. NEVER EVER ADD THAT.",
};

export async function continueConversation(messages: CoreMessage[]) {
  // Get the most recent message from the array
  const latestMessage = messages[messages.length - 1];
  
  // Prepend the system prompt to the messages array
  const messagesWithSystemPrompt: CoreMessage[] = [
    SYSTEM_PROMPT,
    ...messages
  ];
  
  // Start streaming the text from the AI model
  const result = await streamText({
    model: openai('gpt-4o-mini'),
    messages: messagesWithSystemPrompt,
  });
  
  console.log('latestMessage', latestMessage);
  
  // Fetch the ML response
  const ml_response = await fetch(MODEL_API_URL!, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ text: latestMessage.content }), // Pass only the most recent message
  }).then(res => res.json());  // Ensure the response is properly resolved
  
  console.log('ml_response', ml_response);
  
  // Convert the stream result to a streamable value
  const stream = createStreamableValue(result.textStream);
  
  // Return the message and the ML response
  return { message: stream.value, ml_response: JSON.stringify(ml_response) };
}