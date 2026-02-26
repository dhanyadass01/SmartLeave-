import { GoogleGenAI } from "@google/genai";

const generateLeaveLetter = async (data: any): Promise<string> => {
  const apiKey = process.env.API_KEY;
  if (!apiKey) {
    console.warn("API Key not found, using template fallback.");
    return fallbackTemplate(data);
  }

  try {
    const ai = new GoogleGenAI({ apiKey: apiKey });
    
    let durationStr = `${data.fromDate} to ${data.toDate}`;
    if (data.dayType === 'Half Day') {
        durationStr = `${data.fromDate}`;
        if (data.time) durationStr += ` at ${data.time}`;
        if (data.sectionsStr) durationStr += ` (${data.sectionsStr})`;
    }

    const prompt = `
      Write a professional and formal leave application letter for a college/institution setting.
      
      Details:
      - Applicant Name: ${data.name}
      - Role: ${data.isTeachingStaff ? 'Teaching Staff' : 'Non-Teaching Staff'}
      - Department: ${data.department || 'N/A'}
      - Duration: ${durationStr}
      - Type: ${data.dayType}
      - Reason Category: ${data.purpose}
      ${data.description ? `- Specific Details/Purpose: ${data.description}` : ''}
      - Work Delegated To (Acting Staff): ${data.actingStaff}
      
      Instructions:
      - Format as a formal letter.
      - If the purpose is "On Duty", you MUST include the specific details provided in the description (like event name, venue, or duty type) in the body of the letter.
      - Ensure the letter is polite and concise.
      - Use professional salutations ("To The Principal", "Respected Sir/Madam").
      - If medical leave is selected, mention a medical certificate is being submitted.
    `;

    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: prompt,
    });

    return response.text || fallbackTemplate(data);
  } catch (error) {
    console.error("Gemini API Error:", error);
    return fallbackTemplate(data);
  }
};

const fallbackTemplate = (data: any) => {
  let durationStr = `${data.fromDate} to ${data.toDate}`;
  if (data.dayType === 'Half Day') {
      durationStr = `${data.fromDate}`;
      if (data.sectionsStr) durationStr += ` (${data.sectionsStr})`;
  }

  return `To The Authority,

Subject: Leave Application for ${data.purpose}

Respected Sir/Madam,

I am writing to request a ${data.dayType.toLowerCase()} leave for ${durationStr}.
Reason: ${data.purpose}${data.description ? ` - ${data.description}` : ''}.

I have arranged for the following staff members to handle my duties: ${data.actingStaff}.
${data.purpose === 'Medical Leave' ? 'My medical certificate is attached for your review.' : ''}

I kindly request you to grant me permission.

Sincerely,
${data.name}
${data.department ? `Dept: ${data.department}` : ''}`;
};

export { generateLeaveLetter };