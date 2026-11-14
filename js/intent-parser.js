/**
 * VoxCAD — Universal Intent & Geometry Parser
 * Understands both Visionary Procedural Concepts and Exact Mechanical Parametrics.
 */

export class IntentParser {
  constructor() {
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

  parse(text, selectedFace = null, featureHistory = []) {
    if (!text || typeof text !== 'string') return null;

    const raw = text.toLowerCase().trim();
    const normalized = this.normalizeText(raw);

    // 1. Navigation & Viewport
    if (/^(iso|isometric)$/i.test(normalized) || normalized.includes('isometric')) {
      return { type: 'CAMERA_VIEW', view: 'iso', message: 'Switched to isometric view.' };
    }
    if (/^(top|top view)$/i.test(normalized) || normalized.includes('top view')) {
      return { type: 'CAMERA_VIEW', view: 'top', message: 'Switched to top view.' };
    }
    if (/^(front|front view)$/i.test(normalized) || normalized.includes('front view')) {
      return { type: 'CAMERA_VIEW', view: 'front', message: 'Switched to front view.' };
    }
    if (/^(right|right view)$/i.test(normalized) || normalized.includes('right view')) {
      return { type: 'CAMERA_VIEW', view: 'right', message: 'Switched to right view.' };
    }
    if (normalized.includes('reset') || normalized.includes('center') || normalized.includes('fit')) {
      return { type: 'CAMERA_VIEW', view: 'reset', message: 'Centered view on model.' };
    }
    if (normalized.includes('wireframe') || normalized.includes('lines')) {
      return { type: 'TOGGLE_WIREFRAME', message: 'Toggled wireframe rendering.' };
    }
    if (normalized.includes('grid')) {
      return { type: 'TOGGLE_GRID', message: 'Toggled grid floor.' };
    }

    // 2. History & Editing
    if (normalized.includes('undo') || normalized.includes('step back') || normalized.includes('revert')) {
      return { type: 'UNDO', message: 'Reverted previous feature.' };
    }
    if (normalized.includes('redo')) {
      return { type: 'REDO', message: 'Redid feature.' };
    }
    if (normalized.includes('clear') || normalized.includes('delete all') || normalized.includes('reset canvas')) {
      return { type: 'CLEAR_ALL', message: 'Canvas cleared.' };
    }

    // 3. Materials & Shading
    if (normalized.includes('brass') || normalized.includes('gold')) {
      return { type: 'SET_MATERIAL', material: 'brass', message: 'Appearance set to Machined Brass.' };
    }
    if (normalized.includes('copper') || normalized.includes('bronze')) {
      return { type: 'SET_MATERIAL', material: 'copper', message: 'Appearance set to Polished Copper.' };
    }
    if (normalized.includes('aluminum') || normalized.includes('blue') || normalized.includes('anodized')) {
      return { type: 'SET_MATERIAL', material: 'aluminum', message: 'Appearance set to Cyan Anodized Aluminum.' };
    }
    if (normalized.includes('black') || normalized.includes('matte black') || normalized.includes('stealth')) {
      return { type: 'SET_MATERIAL', material: 'matte-black', message: 'Appearance set to Stealth Black Polymer.' };
    }
    if (normalized.includes('titanium') || normalized.includes('silver') || normalized.includes('steel')) {
      return { type: 'SET_MATERIAL', material: 'titanium', message: 'Appearance set to Titanium Alloy.' };
    }

    // 4. VISIONARY PROCEDURAL CONCEPTS ("Designs the world has never seen")
    // A. Stealth Drone / Jet / Fighter / Aircraft
    if (normalized.includes('drone') || normalized.includes('jet') || normalized.includes('stealth') || normalized.includes('aircraft') || normalized.includes('plane') || normalized.includes('spaceship') || normalized.includes('starship')) {
      return {
        type: 'CREATE_STEALTH_DRONE',
        scale: 1.0,
        message: 'Synthesized Futuristic Stealth Jet Drone with faceted fuselage and canted stabilizers.'
      };
    }

    // B. Twisted Helical Skyscraper / Tower
    if (normalized.includes('tower') || normalized.includes('skyscraper') || normalized.includes('twisted') || normalized.includes('helix') || normalized.includes('spiral')) {
      return {
        type: 'CREATE_TWISTED_TOWER',
        floors: 18,
        height: 140,
        message: 'Synthesized 18-Story Twisted Helical Architectural Tower with spire.'
      };
    }

    // C. Sci-Fi Reactor Core / Concentric Gimbal Rings
    if (normalized.includes('reactor') || normalized.includes('core') || normalized.includes('gyroscope') || normalized.includes('gimbal') || normalized.includes('portal') || normalized.includes('tokamak')) {
      return {
        type: 'CREATE_REACTOR_CORE',
        radius: 38,
        message: 'Synthesized Sci-Fi Reactor Core with tri-axial concentric gimbal rings.'
      };
    }

    // D. Cybernetic Combat Helmet / Mask
    if (normalized.includes('helmet') || normalized.includes('mask') || normalized.includes('cyber') || normalized.includes('headgear')) {
      return {
        type: 'CREATE_CYBER_HELMET',
        message: 'Synthesized Cybernetic Combat Helmet with faceted dome and visor shield.'
      };
    }

    // E. Articulated Robotic Gripper / Claw
    if (normalized.includes('claw') || normalized.includes('gripper') || normalized.includes('pincer') || normalized.includes('robot arm') || normalized.includes('mechanical hand')) {
      return {
        type: 'CREATE_ROBOTIC_CLAW',
        message: 'Synthesized Articulated Robotic Gripper Claw with dual serrated pincers.'
      };
    }

    // F. Precision Spur Gear
    if (normalized.includes('gear') || normalized.includes('sprocket') || normalized.includes('cog') || normalized.includes('pinion')) {
      const teeth = this.extractFirstNumber(normalized) || 18;
      return {
        type: 'CREATE_GEAR',
        teeth: teeth,
        radius: 38,
        message: `Synthesized ${teeth}-Tooth Precision Spur Gear with shaft keyway.`
      };
    }

    // 5. Point & Speak Contextual Extrusion
    if (normalized.includes('extrude') || normalized.includes('pull') || normalized.includes('push')) {
      const dist = this.extractSingleDimension(normalized);
      if (!selectedFace) {
        return {
          type: 'AMBIGUITY',
          question: 'Please click on a face first to tell me which direction to extrude.',
          message: 'Click a surface in the canvas first.'
        };
      }
      if (!dist) {
        return {
          type: 'AMBIGUITY',
          question: 'By how many millimeters should I extrude this face?',
          message: 'Specify extrusion distance in mm.'
        };
      }
      return {
        type: 'EXTRUDE_FACE',
        distance: dist,
        face: selectedFace,
        message: `Extruded ${selectedFace.name} by ${dist}mm.`
      };
    }

    // 6. Cut Hole / Hollow Center
    if (normalized.includes('cut') || normalized.includes('hole') || normalized.includes('bore') || normalized.includes('hollow') || normalized.includes('pocket')) {
      const dia = this.extractDiameter(normalized) || this.extractSingleDimension(normalized) || 25;
      return {
        type: 'CUT_HOLE',
        diameter: dia,
        throughAll: true,
        face: selectedFace,
        message: `Cut Ø${dia}mm hole through center.`
      };
    }

    // 7. Base Box / Plate / Enclosure
    if (normalized.includes('box') || normalized.includes('plate') || normalized.includes('cube') || normalized.includes('block') || normalized.includes('enclosure')) {
      const dims = this.extractThreeDimensions(normalized);
      if (dims) {
        return {
          type: 'CREATE_BOX',
          width: dims.w,
          depth: dims.d,
          height: dims.h,
          message: `Created plate ${dims.w} × ${dims.d} × ${dims.h} mm.`
        };
      }
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
        type: 'CREATE_BOX',
        width: 100,
        depth: 80,
        height: 15,
        message: `Created base plate 100 × 80 × 15 mm.`
      };
    }

    // 8. Cylinder / Rod
    if (normalized.includes('cylinder') || normalized.includes('rod') || normalized.includes('pin') || normalized.includes('boss')) {
      const dia = this.extractDiameter(normalized) || this.extractFirstNumber(normalized) || 30;
      const h = this.extractHeight(normalized) || this.extractSecondNumber(normalized) || 40;
      return {
        type: 'CREATE_CYLINDER',
        diameter: dia,
        height: h,
        onSelectedFace: !!selectedFace,
        face: selectedFace,
        message: `Created cylinder Ø${dia}mm × ${h}mm height.`
      };
    }

    // 9. Sphere
    if (normalized.includes('sphere') || normalized.includes('ball') || normalized.includes('dome')) {
      const rad = this.extractRadius(normalized) || this.extractSingleDimension(normalized) || 25;
      return {
        type: 'CREATE_SPHERE',
        radius: rad,
        message: `Created sphere radius ${rad}mm.`
      };
    }

    // Fallback: Default to creative drone concept if phrase is unknown
    return {
      type: 'CREATE_STEALTH_DRONE',
      scale: 1.0,
      message: `Interpreting "${text}": Generated custom stealth concept design.`
    };
  }

  normalizeText(str) {
    let s = str;
    s = s.replace(/half an inch/g, '12.7 mm');
    s = s.replace(/an inch/g, '25.4 mm');

    for (const [word, num] of Object.entries(this.wordToNum)) {
      const reg = new RegExp(`\\b${word}\\b`, 'g');
      s = s.replace(reg, num);
    }

    s = s.replace(/\s*(by|x|\*)\s*/g, ' x ');
    return s;
  }

  extractThreeDimensions(text) {
    const match = text.match(/(\d+(?:\.\d+)?)\s*(?:mm)?\s*x\s*(\d+(?:\.\d+)?)\s*(?:mm)?\s*x\s*(\d+(?:\.\d+)?)/i);
    if (match) {
      return { w: parseFloat(match[1]), d: parseFloat(match[2]), h: parseFloat(match[3]) };
    }
    const numbers = text.match(/\b\d+(?:\.\d+)?\b/g);
    if (numbers && numbers.length >= 3) {
      return { w: parseFloat(numbers[0]), d: parseFloat(numbers[1]), h: parseFloat(numbers[2]) };
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
    const match = text.match(/(?:height|tall|length)\s*(?:of\s*)?(\d+(?:\.\d+)?)/i);
    return match ? parseFloat(match[1]) : null;
  }

  extractSingleDimension(text) {
    const match = text.match(/\b(\d+(?:\.\d+)?)\s*(?:mm|cm)?\b/);
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
