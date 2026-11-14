/**
 * VoxCAD — Precision Intent & Dimensional Geometry Parser
 * Translates Natural Spoken CAD Commands into Exact Structured Geometry Operations
 */

export class IntentParser {
  constructor() {
    // Number text to digit mappings
    this.wordToNum = {
      'zero': 0, 'one': 1, 'two': 2, 'three': 3, 'four': 4,
      'five': 5, 'six': 6, 'seven': 7, 'eight': 8, 'nine': 9,
      'ten': 10, 'eleven': 11, 'twelve': 12, 'thirteen': 13,
      'fourteen': 14, 'fifteen': 15, 'sixteen': 16, 'seventeen': 17,
      'eighteen': 18, 'nineteen': 19, 'twenty': 20, 'thirty': 30,
      'forty': 40, 'fifty': 50, 'sixty': 60, 'seventy': 70,
      'eighty': 80, 'ninety': 90, 'hundred': 100
    };
  }

  /**
   * Main Parsing Entrypoint
   * @param {string} text Spoken transcript
   * @param {object|null} selectedFace Active clicked face from Raycaster
   * @param {Array} featureHistory Current list of operations
   */
  parse(text, selectedFace = null, featureHistory = []) {
    if (!text || typeof text !== 'string') return null;

    const clean = text.toLowerCase().trim();
    const normalized = this.normalizeNumbersAndUnits(clean);

    // 1. Navigation & Viewport Commands
    if (/^(iso|isometric|isometric view)$/i.test(normalized) || normalized.includes('isometric')) {
      return { type: 'CAMERA_VIEW', view: 'iso', message: 'Switching to isometric view.' };
    }
    if (/^(top|top view)$/i.test(normalized) || normalized.includes('top view')) {
      return { type: 'CAMERA_VIEW', view: 'top', message: 'Switching to top view.' };
    }
    if (/^(front|front view)$/i.test(normalized) || normalized.includes('front view')) {
      return { type: 'CAMERA_VIEW', view: 'front', message: 'Switching to front view.' };
    }
    if (/^(right|right view)$/i.test(normalized) || normalized.includes('right view')) {
      return { type: 'CAMERA_VIEW', view: 'right', message: 'Switching to right view.' };
    }
    if (normalized.includes('reset camera') || normalized.includes('fit to view') || normalized.includes('center view')) {
      return { type: 'CAMERA_VIEW', view: 'reset', message: 'Camera centered on model.' };
    }
    if (normalized.includes('wireframe') || normalized.includes('lines only')) {
      return { type: 'TOGGLE_WIREFRAME', message: 'Toggling wireframe mode.' };
    }
    if (normalized.includes('grid')) {
      return { type: 'TOGGLE_GRID', message: 'Toggling ground grid.' };
    }

    // 2. History & Editing Commands
    if (normalized.includes('undo') || normalized.includes('step back') || normalized.includes('remove last')) {
      return { type: 'UNDO', message: 'Reverted last operation.' };
    }
    if (normalized.includes('redo')) {
      return { type: 'REDO', message: 'Redoing operation.' };
    }
    if (normalized.includes('clear all') || normalized.includes('clear scene') || normalized.includes('reset all') || normalized.includes('delete everything')) {
      return { type: 'CLEAR_ALL', message: 'Cleared all operations.' };
    }

    // 3. Material & Appearance Commands
    if (normalized.includes('brass') || normalized.includes('gold')) {
      return { type: 'SET_MATERIAL', material: 'brass', message: 'Appearance set to Machined Brass.' };
    }
    if (normalized.includes('copper') || normalized.includes('orange')) {
      return { type: 'SET_MATERIAL', material: 'copper', message: 'Appearance set to Polished Copper.' };
    }
    if (normalized.includes('aluminum') || normalized.includes('blue') || normalized.includes('anodized')) {
      return { type: 'SET_MATERIAL', material: 'aluminum', message: 'Appearance set to Anodized Blue.' };
    }
    if (normalized.includes('black') || normalized.includes('matte black') || normalized.includes('polymer')) {
      return { type: 'SET_MATERIAL', material: 'matte-black', message: 'Appearance set to Matte Black Polymer.' };
    }
    if (normalized.includes('titanium') || normalized.includes('silver') || normalized.includes('steel') || normalized.includes('metal')) {
      return { type: 'SET_MATERIAL', material: 'titanium', message: 'Appearance set to Titanium Alloy.' };
    }

    // 4. "Point & Speak" Contextual Face Extrusion
    if (normalized.includes('extrude') || normalized.includes('pull') || normalized.includes('push')) {
      const dist = this.extractSingleDimension(normalized);
      if (!selectedFace) {
        return {
          type: 'AMBIGUITY',
          question: 'Please click on a face first to tell me which direction to extrude.',
          message: 'Ambiguity: Click a face first before extruding.'
        };
      }
      if (!dist) {
        return {
          type: 'AMBIGUITY',
          question: 'By how many millimeters should I extrude this face?',
          message: 'Ambiguity: Specify extrusion distance in millimeters.'
        };
      }
      return {
        type: 'EXTRUDE_FACE',
        distance: dist,
        face: selectedFace,
        message: `Extruding ${selectedFace.name} by ${dist}mm.`
      };
    }

    // 5. Cut Hole / Hollow Out Operation
    if (normalized.includes('cut') || normalized.includes('hole') || normalized.includes('bore') || normalized.includes('pocket') || normalized.includes('hollow')) {
      const diameter = this.extractDiameter(normalized) || this.extractSingleDimension(normalized);
      if (!diameter) {
        return {
          type: 'AMBIGUITY',
          question: 'What diameter should the cut hole be in millimeters?',
          message: 'Ambiguity: Missing hole diameter.'
        };
      }
      return {
        type: 'CUT_HOLE',
        diameter: diameter,
        throughAll: true,
        face: selectedFace,
        message: `Cutting ${diameter}mm hole through center.`
      };
    }

    // 6. Chamfer & Fillet Operations
    if (normalized.includes('chamfer') || normalized.includes('bevel')) {
      const size = this.extractSingleDimension(normalized) || 2;
      return {
        type: 'CHAMFER',
        distance: size,
        message: `Applying ${size}mm chamfer to edges.`
      };
    }
    if (normalized.includes('fillet') || normalized.includes('round edge')) {
      const rad = this.extractSingleDimension(normalized) || 3;
      return {
        type: 'FILLET',
        radius: rad,
        message: `Applying ${rad}mm fillet to edges.`
      };
    }

    // 7. Primitive Creations
    // A. Box / Plate / Block / Enclosure
    if (normalized.includes('box') || normalized.includes('plate') || normalized.includes('cube') || normalized.includes('block') || normalized.includes('enclosure')) {
      const dims = this.extractThreeDimensions(normalized);
      if (dims) {
        return {
          type: 'CREATE_BOX',
          width: dims.w,
          depth: dims.d,
          height: dims.h,
          message: `Created base plate ${dims.w} × ${dims.d} × ${dims.h} mm.`
        };
      }
      // Single dimension cube
      const single = this.extractSingleDimension(normalized);
      if (single) {
        return {
          type: 'CREATE_BOX',
          width: single,
          depth: single,
          height: single,
          message: `Created cube ${single} × ${single} × ${single} mm.`
        };
      }
      return {
        type: 'AMBIGUITY',
        question: 'What are the width, depth, and height of the plate in millimeters? (e.g. "100 by 80 by 20")',
        message: 'Ambiguity: Specify dimensions (Width × Depth × Height).'
      };
    }

    // B. Cylinder / Rod / Pin / Boss
    if (normalized.includes('cylinder') || normalized.includes('rod') || normalized.includes('pin') || normalized.includes('boss')) {
      const diameter = this.extractDiameter(normalized);
      const height = this.extractHeight(normalized);

      const d = diameter || this.extractFirstNumber(normalized) || 30;
      const h = height || this.extractSecondNumber(normalized) || 40;

      return {
        type: 'CREATE_CYLINDER',
        diameter: d,
        height: h,
        onSelectedFace: !!selectedFace,
        face: selectedFace,
        message: `Created cylinder Ø${d}mm × ${h}mm height.`
      };
    }

    // C. Sphere
    if (normalized.includes('sphere') || normalized.includes('ball')) {
      const rad = this.extractRadius(normalized) || this.extractSingleDimension(normalized) || 25;
      return {
        type: 'CREATE_SPHERE',
        radius: rad,
        message: `Created sphere radius ${rad}mm.`
      };
    }

    // 8. Fallback / Unrecognized command
    return {
      type: 'UNKNOWN',
      rawText: text,
      message: `Heard: "${text}". Try: "Plate 100 by 80 by 20mm" or "Cut 20mm hole".`
    };
  }

  /**
   * Normalizes spoken phrase text, converting written words to digits
   * and handling fractional terms ("half an inch" -> "12.7mm")
   */
  normalizeNumbersAndUnits(str) {
    let s = str;

    // Fractions & conversational values
    s = s.replace(/half an inch/g, '12.7 mm');
    s = s.replace(/an inch/g, '25.4 mm');
    s = s.replace(/quarter of an inch/g, '6.35 mm');
    s = s.replace(/half a (mil|millimeter)/g, '0.5 mm');

    // Number word replacements
    for (const [word, num] of Object.entries(this.wordToNum)) {
      const regex = new RegExp(`\\b${word}\\b`, 'g');
      s = s.replace(regex, num);
    }

    // Composite numbers like "twenty five" -> 25
    s = s.replace(/\b(\d+)\s+(\d+)\b/g, (match, p1, p2) => {
      const n1 = parseInt(p1);
      const n2 = parseInt(p2);
      if (n1 >= 20 && n1 <= 90 && n2 >= 1 && n2 <= 9) {
        return (n1 + n2).toString();
      }
      return match;
    });

    // Cleanup dimensional separators: "100 x 80 x 20" or "100 by 80 by 20"
    s = s.replace(/\s*(by|x|\*)\s*/g, ' x ');

    return s;
  }

  extractThreeDimensions(text) {
    // Matches "100 x 80 x 20", "100 by 80 by 20", "width 100 depth 80 height 20"
    const regex = /(\d+(?:\.\d+)?)\s*(?:mm|mils?)?\s*x\s*(\d+(?:\.\d+)?)\s*(?:mm|mils?)?\s*x\s*(\d+(?:\.\d+)?)/i;
    const match = text.match(regex);
    if (match) {
      return {
        w: parseFloat(match[1]),
        d: parseFloat(match[2]),
        h: parseFloat(match[3])
      };
    }

    // Secondary scan: search for three separate floating numbers
    const numbers = text.match(/\b\d+(?:\.\d+)?\b/g);
    if (numbers && numbers.length >= 3) {
      return {
        w: parseFloat(numbers[0]),
        d: parseFloat(numbers[1]),
        h: parseFloat(numbers[2])
      };
    }
    return null;
  }

  extractDiameter(text) {
    const match = text.match(/(?:diameter|dia|diam|hole(?: of)?)\s*(\d+(?:\.\d+)?)/i);
    return match ? parseFloat(match[1]) : null;
  }

  extractRadius(text) {
    const match = text.match(/(?:radius|rad)\s*(\d+(?:\.\d+)?)/i);
    return match ? parseFloat(match[1]) : null;
  }

  extractHeight(text) {
    const match = text.match(/(?:height|tall|long|length)\s*(?:of\s*)?(\d+(?:\.\d+)?)/i);
    return match ? parseFloat(match[1]) : null;
  }

  extractSingleDimension(text) {
    const match = text.match(/\b(\d+(?:\.\d+)?)\s*(?:mm|millimeters?|cm|mils?)?\b/);
    return match ? parseFloat(match[1]) : null;
  }

  extractFirstNumber(text) {
    const numbers = text.match(/\b\d+(?:\.\d+)?\b/g);
    return numbers && numbers.length > 0 ? parseFloat(numbers[0]) : null;
  }

  extractSecondNumber(text) {
    const numbers = text.match(/\b\d+(?:\.\d+)?\b/g);
    return numbers && numbers.length > 1 ? parseFloat(numbers[1]) : null;
  }
}
