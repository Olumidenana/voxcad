/**
 * VoxCAD — Gemini Generative 3D Synthesizer
 * Uses Gemini Multimodal API to compile spoken concepts OR uploaded images
 * into rich, production-grade 3D procedural models with both INTERIOR and EXTERIOR structures.
 */

import * as THREE from 'three';

export class GeminiSynthesizer {
  constructor(cadEngine) {
    this.cadEngine = cadEngine;
    // Load key from localStorage, window.LOCAL_CONFIG, or local gitignored config
    this.apiKey = (typeof localStorage !== 'undefined' ? localStorage.getItem('voxcad_gemini_api_key') : '') 
      || (typeof window !== 'undefined' ? window.LOCAL_CONFIG?.geminiApiKey : '') 
      || '';
    this.modelCandidates = ['gemini-3.5-flash', 'gemini-3.5-flash-lite', 'gemini-3.6-flash', 'gemini-3.8-flash'];
    this.activeModel = 'gemini-3.5-flash';

    this.initLocalConfig();
  }

  async initLocalConfig() {
    try {
      const mod = await import('../config.local.js').catch(() => null);
      if (mod?.LOCAL_CONFIG?.geminiApiKey) {
        this.apiKey = mod.LOCAL_CONFIG.geminiApiKey;
        if (typeof localStorage !== 'undefined') {
          localStorage.setItem('voxcad_gemini_api_key', this.apiKey);
        }
      }
    } catch (_) {}
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
    
    let lastErr = null;
    for (const model of this.modelCandidates) {
      try {
        const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${model}?key=${key}`;
        const response = await fetch(endpoint);
        if (response.ok) {
          this.activeModel = model;
          return true;
        }
        const errData = await response.json().catch(() => ({}));
        lastErr = errData.error?.message || response.statusText;
      } catch (err) {
        lastErr = err.message;
      }
    }
    throw new Error(`Google AI Error: ${lastErr || 'Could not connect to Gemini models.'}`);
  }

  /**
   * Prompts Gemini to synthesize a complete Three.js procedural 3D model (Text or Multimodal Image)
   */
  async synthesizeConcept(promptText, imageObj = null) {
    if (!this.hasApiKey()) {
      throw new Error('MISSING_KEY');
    }

    const systemPrompt = `You are the world's most brilliant procedural 3D CAD sculptor and reverse-engineering specialist.
Your mission is to transform user descriptions OR reference images into production-quality, highly detailed 3D Three.js models.

CRITICAL ARCHITECTURE REQUIREMENT — BOTH INTERIOR & EXTERIOR:
You MUST construct BOTH the outer shell (EXTERIOR) and internal structures/mechanisms (INTERIOR)!
1. EXTERIOR COMPONENTS:
   - Outer body, aerodynamic panels, chassis, hull, casing, wings, headlights, wheels/treads, or skin.
   - For every exterior mesh, set: \`mesh.userData.isExterior = true;\`
2. INTERIOR COMPONENTS:
   - Internal cabin, seating, steering console, dashboard, battery/engine block, structural ribs, internal gear trains, cylinders, or core chambers.
   - For every interior mesh, set: \`mesh.userData.isInterior = true;\`
   - Use contrasting materials or colors (e.g. metallic silver for engine block, dark slate for seats, cyan/amber for circuits/core) so the interior looks phenomenal when cutaway or in X-ray mode!

OUTPUT RULES:
1. Return ONLY valid JSON with this exact schema:
{
  "title": "Short descriptive name (e.g. Mercedes Concept Coupe with Full Interior)",
  "summary": "One sentence summary detailing exterior body and interior cabin/mechanisms",
  "code": "JavaScript function body that builds and returns a THREE.Group"
}

2. CODE EXECUTION ENVIRONMENT:
Your code will run inside: (THREE, mat)
- 'THREE' is the Three.js library.
- 'mat' is the active scene MeshStandardMaterial.
- You can create custom materials for specific parts:
  * e.g. const darkMat = new THREE.MeshStandardMaterial({ color: 0x1e293b, roughness: 0.6 });
  * e.g. const engineMat = new THREE.MeshStandardMaterial({ color: 0x94a3b8, metalness: 0.9, roughness: 0.2 });
  * e.g. const glowMat = new THREE.MeshStandardMaterial({ color: 0x38bdf8, emissive: 0x0284c7, emissiveIntensity: 0.5 });
- You MUST instantiate 'const group = new THREE.Group();'
- Add 8 to 25 detailed sub-components with proper spatial translation, rotation, and scale!
- Use a rich combination of:
  * Extruded shapes: THREE.Shape and THREE.ExtrudeGeometry
  * Primitives: BoxGeometry, CylinderGeometry, SphereGeometry, ConeGeometry, TorusGeometry, LatheGeometry, TubeGeometry
  * Symmetrical cloning for left/right pairs
- Sit on or above the ground (Y >= 0). Typical bounding dimensions around 60mm to 160mm.
- Return the group at the end: 'return group;'

3. Do not include markdown code fences (\`\`\`json) outside the JSON. Return pure raw JSON string only.`;

    const parts = [];

    // If an image is provided, add multimodal inline data
    if (imageObj && imageObj.data) {
      parts.push({
        inlineData: {
          mimeType: imageObj.mimeType || 'image/png',
          data: imageObj.data
        }
      });
      parts.push({
        text: `${systemPrompt}\n\nUSER PROMPT WITH ATTACHED IMAGE: "${promptText || 'Replicate this image into an exact 3D model with detailed exterior shell and full internal interior mechanisms.'}"`
      });
    } else {
      parts.push({
        text: `${systemPrompt}\n\nUSER PROMPT: "${promptText}"`
      });
    }

    const requestBody = {
      contents: [{ role: "user", parts }],
      generationConfig: {
        temperature: 0.35,
        maxOutputTokens: 3500
      }
    };

    let lastError = null;

    // Try candidate models with fallback
    for (const model of this.modelCandidates) {
      try {
        const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${this.apiKey}`;
        const response = await fetch(endpoint, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(requestBody)
        });

        if (!response.ok) {
          const errData = await response.json().catch(() => ({}));
          const msg = errData.error?.message || response.statusText;
          lastError = new Error(`Gemini (${model}): ${msg}`);
          continue; // Try next candidate
        }

        const data = await response.json();
        const rawOutput = data.candidates?.[0]?.content?.parts?.[0]?.text;

        if (!rawOutput) {
          lastError = new Error(`Gemini (${model}) returned an empty response.`);
          continue;
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
          title: parsed.title || promptText || 'Generated 3D Model',
          summary: parsed.summary || 'Custom generative 3D model with interior and exterior structures',
          group: generatedGroup
        };
      } catch (err) {
        lastError = err;
      }
    }

    throw lastError || new Error('Failed to generate 3D model from Gemini API.');
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
