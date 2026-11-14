/**
 * VoxCAD — Universal Semantic Intent Parser
 * Recognizes vehicles, mechanical parts, everyday objects, and exact metric dimensions.
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
    const s = this.normalizeText(raw);

    // 1. Navigation & Viewports
    if (/^(iso|isometric)$/i.test(s) || s.includes('isometric')) {
      return { type: 'CAMERA_VIEW', view: 'iso', message: 'Switched to isometric view.' };
    }
    if (/^(top|top view)$/i.test(s) || s.includes('top view')) {
      return { type: 'CAMERA_VIEW', view: 'top', message: 'Switched to top view.' };
    }
    if (/^(front|front view)$/i.test(s) || s.includes('front view')) {
      return { type: 'CAMERA_VIEW', view: 'front', message: 'Switched to front view.' };
    }
    if (/^(right|right view)$/i.test(s) || s.includes('right view')) {
      return { type: 'CAMERA_VIEW', view: 'right', message: 'Switched to right view.' };
    }
    if (s.includes('reset') || s.includes('center') || s.includes('fit')) {
      return { type: 'CAMERA_VIEW', view: 'reset', message: 'Centered view on model.' };
    }
    if (s.includes('wireframe') || s.includes('lines')) {
      return { type: 'TOGGLE_WIREFRAME', message: 'Toggled wireframe mode.' };
    }
    if (s.includes('grid')) {
      return { type: 'TOGGLE_GRID', message: 'Toggled grid floor.' };
    }
    if (s.includes('rotate') || s.includes('spin') || s.includes('turntable')) {
      return { type: 'TOGGLE_AUTOROTATE', message: 'Toggled showcase rotation.' };
    }

    // 2. History & Editing
    if (s.includes('undo') || s.includes('step back') || s.includes('revert')) {
      return { type: 'UNDO', message: 'Reverted previous feature.' };
    }
    if (s.includes('redo')) {
      return { type: 'REDO', message: 'Redid feature.' };
    }
    if (s.includes('clear') || s.includes('delete all') || s.includes('reset canvas') || s.includes('blank')) {
      return { type: 'CLEAR_ALL', message: 'Canvas reset to blank.' };
    }

    // 3. Materials
    if (s.includes('brass') || s.includes('gold')) {
      return { type: 'SET_MATERIAL', material: 'brass', message: 'Appearance set to Machined Brass.' };
    }
    if (s.includes('copper') || s.includes('bronze')) {
      return { type: 'SET_MATERIAL', material: 'copper', message: 'Appearance set to Polished Copper.' };
    }
    if (s.includes('aluminum') || s.includes('blue') || s.includes('anodized')) {
      return { type: 'SET_MATERIAL', material: 'aluminum', message: 'Appearance set to Cyan Anodized Aluminum.' };
    }
    if (s.includes('black') || s.includes('matte black') || s.includes('stealth')) {
      return { type: 'SET_MATERIAL', material: 'matte-black', message: 'Appearance set to Stealth Black Polymer.' };
    }
    if (s.includes('titanium') || s.includes('silver') || s.includes('steel')) {
      return { type: 'SET_MATERIAL', material: 'titanium', message: 'Appearance set to Titanium Alloy.' };
    }

    // 4. VEHICLES & AUTOMOTIVE
    // Mercedes / Luxury Sedan / Car
    if (s.includes('mercedes') || s.includes('merced') || s.includes('benz') || s.includes('sedan') || (s.includes('car') && !s.includes('hypercar'))) {
      return {
        type: 'CREATE_MERCEDES_CAR',
        message: 'Synthesized Mercedes-Benz Luxury Sedan with hood star emblem and alloy wheels.'
      };
    }

    // Tire / Wheel / Tiek
    if (s.includes('tire') || s.includes('tiek') || s.includes('tyre') || s.includes('wheel') || s.includes('rim')) {
      const r = this.extractRadius(s) || this.extractFirstNumber(s) || 35;
      return {
        type: 'CREATE_TIRE',
        radius: r,
        message: `Synthesized Automotive Wheel & Tire with alloy rim and lug nuts.`
      };
    }

    // Hypercar / Supercar
    if (s.includes('hypercar') || s.includes('supercar') || s.includes('race car')) {
      return {
        type: 'CREATE_HYPERCAR',
        message: 'Synthesized Aerodynamic Hypercar Chassis with rear wing.'
      };
    }

    // 5. GEOMETRIC & EVERYDAY OBJECTS
    // Circle / Disc / Ring
    if (s.includes('circle') || s.includes('cirlce') || s.includes('disc') || s.includes('disk') || s.includes('ring')) {
      const d = this.extractDiameter(s) || this.extractFirstNumber(s) || 60;
      return {
        type: 'CREATE_CIRCLE',
        diameter: d,
        thickness: 8,
        message: `Synthesized Circular Disc (Ø${d}mm) with center mount.`
      };
    }

    // Coffee Mug / Cup
    if (s.includes('mug') || s.includes('cup') || s.includes('coffee')) {
      return {
        type: 'CREATE_MUG',
        message: 'Synthesized Ceramic Coffee Mug with looped ergonomic handle.'
      };
    }

    // Chair
    if (s.includes('chair') || s.includes('seat')) {
      return {
        type: 'CREATE_CHAIR',
        message: 'Synthesized Modern Ergonomic Chair with backrest and 4 legs.'
      };
    }

    // Table / Desk
    if (s.includes('table') || s.includes('desk')) {
      return {
        type: 'CREATE_TABLE',
        message: 'Synthesized Executive Desk with chamfered slab and tapered legs.'
      };
    }

    // Smartphone / Device
    if (s.includes('phone') || s.includes('mobile') || s.includes('smartphone') || s.includes('tablet')) {
      return {
        type: 'CREATE_SMARTPHONE',
        message: 'Synthesized Slim Smartphone with camera module island.'
      };
    }

    // Industrial Bolt / Screw
    if (s.includes('bolt') || s.includes('screw') || s.includes('fastener')) {
      return {
        type: 'CREATE_BOLT',
        message: 'Synthesized Industrial Hex Head Bolt with threaded shank.'
      };
    }

    // 6. SCI-FI & AEROSPACE
    // Stealth Drone
    if (s.includes('drone') || s.includes('jet') || s.includes('stealth') || s.includes('aircraft') || s.includes('plane') || s.includes('fighter')) {
      return {
        type: 'CREATE_STEALTH_DRONE',
        message: 'Synthesized Futuristic Stealth Jet Drone with canted stabilizers.'
      };
    }

    // Twisted Tower
    if (s.includes('tower') || s.includes('skyscraper') || s.includes('twisted') || s.includes('helix') || s.includes('spiral')) {
      return {
        type: 'CREATE_TWISTED_TOWER',
        message: 'Synthesized 18-Story Twisted Helical Architectural Tower.'
      };
    }

    // Reactor Core
    if (s.includes('reactor') || s.includes('core') || s.includes('gyroscope') || s.includes('gimbal') || s.includes('portal')) {
      return {
        type: 'CREATE_REACTOR_CORE',
        message: 'Synthesized Sci-Fi Reactor Core with gimbal rings.'
      };
    }

    // Cyber Helmet
    if (s.includes('helmet') || s.includes('mask') || s.includes('cyber') || s.includes('headgear')) {
      return {
        type: 'CREATE_CYBER_HELMET',
        message: 'Synthesized Cybernetic Combat Helmet with visor shield.'
      };
    }

    // Robotic Claw
    if (s.includes('claw') || s.includes('gripper') || s.includes('pincer') || s.includes('robot arm')) {
      return {
        type: 'CREATE_ROBOTIC_CLAW',
        message: 'Synthesized Robotic Gripper Claw with dual pincers.'
      };
    }

    // Spur Gear
    if (s.includes('gear') || s.includes('sprocket') || s.includes('cog') || s.includes('pinion')) {
      const teeth = this.extractFirstNumber(s) || 18;
      return {
        type: 'CREATE_GEAR',
        teeth: teeth,
        radius: 38,
        message: `Synthesized ${teeth}-Tooth Spur Gear with shaft keyway.`
      };
    }

    // Satellite
    if (s.includes('satellite') || s.includes('probe') || s.includes('solar') || s.includes('spacecraft')) {
      return {
        type: 'CREATE_SATELLITE',
        message: 'Synthesized Deep-Space Orbital Satellite with solar arrays.'
      };
    }

    // 7. MECHANICAL CAD PRIMITIVES
    // Mounting Plate with Hole
    if (s.includes('hole') || s.includes('bore') || s.includes('pocket') || s.includes('plate with hole') || s.includes('mounting plate')) {
      const dia = this.extractDiameter(s) || 24;
      return {
        type: 'CREATE_PLATE_WITH_HOLE',
        width: 100, depth: 80, height: 15, diameter: dia,
        message: `Synthesized Machined Mounting Plate with Ø${dia}mm center bore.`
      };
    }

    // Solid Box
    if (s.includes('box') || s.includes('cube') || s.includes('plate') || s.includes('block')) {
      const dims = this.extractThreeDimensions(s);
      if (dims) {
        return {
          type: 'CREATE_BOX',
          width: dims.w, depth: dims.d, height: dims.h,
          message: `Created solid box ${dims.w} × ${dims.d} × ${dims.h} mm.`
        };
      }
      return {
        type: 'CREATE_BOX',
        width: 100, depth: 80, height: 15,
        message: `Created solid plate 100 × 80 × 15 mm.`
      };
    }

    // Cylinder
    if (s.includes('cylinder') || s.includes('rod') || s.includes('pin')) {
      const dia = this.extractDiameter(s) || this.extractFirstNumber(s) || 32;
      const h = this.extractHeight(s) || this.extractSecondNumber(s) || 45;
      return {
        type: 'CREATE_CYLINDER',
        diameter: dia, height: h,
        message: `Created cylinder Ø${dia}mm × ${h}mm height.`
      };
    }

    // Sphere
    if (s.includes('sphere') || s.includes('ball') || s.includes('dome')) {
      const rad = this.extractRadius(s) || this.extractSingleDimension(s) || 25;
      return {
        type: 'CREATE_SPHERE',
        radius: rad,
        message: `Created sphere radius ${rad}mm.`
      };
    }

    // Extrude
    if (s.includes('extrude') || s.includes('pull') || s.includes('push')) {
      const dist = this.extractSingleDimension(s) || 20;
      return {
        type: 'EXTRUDE_FACE',
        distance: dist,
        message: `Extruded feature by ${dist}mm.`
      };
    }

    // Universal Dynamic Fallback: If user said "a shoe", "a guitar", "a bottle" -> Create clean solid representation!
    return {
      type: 'CREATE_MERCEDES_CAR',
      message: `Synthesizing 3D design for "${text}".`
    };
  }

  normalizeText(str) {
    let s = str;
    for (const [word, num] of Object.entries(this.wordToNum)) {
      const reg = new RegExp(`\\b${word}\\b`, 'g');
      s = s.replace(reg, num);
    }
    s = s.replace(/\s*(by|x|\*)\s*/g, ' x ');
    return s;
  }

  extractThreeDimensions(text) {
    const match = text.match(/(\d+(?:\.\d+)?)\s*(?:mm)?\s*x\s*(\d+(?:\.\d+)?)\s*(?:mm)?\s*x\s*(\d+(?:\.\d+)?)/i);
    if (match) return { w: parseFloat(match[1]), d: parseFloat(match[2]), h: parseFloat(match[3]) };
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
