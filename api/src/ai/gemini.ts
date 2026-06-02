import type { GenerateContentResult } from '@google/generative-ai'

/**
 * Wrapper for Gemini API calls. Handles response extraction and error logging.
 * @param taskName - Task identifier for debugging
 * @param generateFn - Async function that returns GenerateContentResult
 * @returns The text content from the Gemini response
 */
export async function generateGeminiText(
  taskName: string,
  generateFn: () => Promise<GenerateContentResult>,
): Promise<string> {
  try {
    const result = await generateFn()
    const text = result.response.text()
    if (!text) {
      throw new Error(`Empty response from Gemini for task: ${taskName}`)
    }
    return text
  } catch (error) {
    console.error(`Gemini API error in task "${taskName}":`, error)
    throw error
  }
}
