/**
 * VoxCAD — Gemini Generative 3D Synthesizer
 * Uses Gemini API to compile ANY spoken or typed concept into dynamic Three.js 3D geometry.
 */

import * as THREE from 'three';

export class GeminiSynthesizer {
  constructor(cadEngine) {
    this.cadEngine = cadEngine;
    this.apiKey = localStorage.getItem('voxcad_gemini_api_key') || '';
    this.modelName = 'gemini-1.5-flash';
  }

  setApiKey(key) {
    this.apiKey = (key || '').trim();
    if (this.apiKey) {
      localStorage.setItem('voxcad_gemini_api_key', this.apiKey);
    } else {
      localStorage.removeItem('voxcad_gemini_api_key');
    }
  }

  hasApiKey() {
    return !!this.apiKey;
  }

  /**
   * Tests whether an API key is valid against Google AI Studio
   */
  async testConnection(testKey) {
    const key = (testKey || this.apiKey).trim();
    if (!key) throw new Error('API Key cannot be empty.');
    const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${this.modelName}?key=${key}`;
    const response = await fetch(endpoint);
    if (!response.ok) {
      const errData = await response.json().catch(() => ({}));
      const msg = errData.error?.message || response.statusText;
      throw new Error(`Google AI Error: ${msg}`);
    }
    return true;
  }

  /**
   * Prompts Gemini to synthesize a complete Three.js procedural 3D model
   */
  async synthesizeConcept(promptText) {
    if (!this.hasApiKey()) {
      throw new Error('MISSING_KEY');
    }

    const systemPrompt = `You are the world's most brilliant procedural 3D CAD and generative Three.js sculptor.
Given ANY natural language prompt (no matter how complex, odd, futuristic, organic, surreal, or novel), you must synthesize a rich, highly detailed 3D procedural model using pure Three.js geometry.

RULES:
1. Return ONLY valid JSON with this exact schema:
{
  "title": "Short descriptive name (e.g. Biomechanical Scorpion Drone)",
  "summary": "One sentence summary of the design",
  "code": "JavaScript function body that builds and returns a THREE.Group"
}

2. CODE EXECUTION ENVIRONMENT:
Your code will run inside a function with parameters: (THREE, mat)
- 'THREE' is the Three.js library.
- 'mat' is the active scene MeshStandardMaterial (you can assign child.material = mat or create new THREE.MeshStandardMaterial({ color: 0x..., roughness: 0.3, metalness: 0.8 })).
- You MUST create a 'const group = new THREE.Group();'
- Add multiple detailed sub-components with proper spatial translation, rotation, and scale!
- Use a rich combination of:
  * Extruded shapes: THREE.Shape and THREE.ExtrudeGeometry (for wings, blades, contours, hulls, organic cross-sections)
  * Primitives: BoxGeometry, CylinderGeometry, SphereGeometry, ConeGeometry, TorusGeometry, IcosahedronGeometry, LatheGeometry, TubeGeometry
  * Symmetrical cloning (e.g. left and right wings/legs/wheels)
- Make the object sit on or slightly above the ground (Y >= 0). Typical bounding dimensions around 50mm to 150mm.
- Return the group at the end: 'return group;'

3. Do not include markdown code fences (\`\`\`json) outside the JSON. Return pure raw JSON string only.`;

    const requestBody = {
      contents: [
        {
          role: "user",
          parts: [
            { text: `${systemPrompt}\n\nUSER PROMPT: "${promptText}"` }
          ]
        }
      ],
      generationConfig: {
        temperature: 0.4,
        maxOutputTokens: 2500
      }
    };

    const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${this.modelName}:generateContent?key=${this.apiKey}`;

    const response = await fetch(endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(requestBody)
    });

    if (!response.ok) {
      const errData = await response.json().catch(() => ({}));
      const msg = errData.error?.message || response.statusText;
      throw new Error(`Gemini API Error: ${msg}`);
    }

    const data = await response.json();
    const rawOutput = data.candidates?.[0]?.content?.parts?.[0]?.text;

    if (!rawOutput) {
      throw new Error('Gemini returned an empty response.');
    }

    // Clean JSON response (strip markdown fences if present)
    let cleanJSON = rawOutput.trim();
    if (cleanJSON.startsWith('```')) {
      cleanJSON = cleanJSON.replace(/^```(?:json)?\s*/i, '').replace(/```\s*$/i, '');
    }
    const jsonMatch = cleanJSON.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      cleanJSON = jsonMatch[0];
    }
    const parsed = JSON.parse(cleanJSON);

    // Safely evaluate procedural code
    const generatedGroup = this.executeProceduralCode(parsed.code);

    return {
      title: parsed.title || promptText,
      summary: parsed.summary || 'Custom generative 3D model',
      group: generatedGroup
    };
  }

  executeProceduralCode(codeString) {
    try {
      const builderFn = new Function('THREE', 'mat', codeString);
      const group = builderFn(THREE, this.cadEngine.getMaterial());

      if (!group || !(group instanceof THREE.Object3D)) {
        throw new Error('Generated code did not return a valid Three.js Object3D / Group.');
      }

      return group;
    } catch (err) {
      console.error('Failed to execute generated 3D code:', err);
      throw new Error(`3D Compilation Error: ${err.message}`);
    }
  }
}
