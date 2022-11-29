/**
 * Jdenticon 3.2.0
 * http://jdenticon.com
 *
 * Built: 2022-08-07T11:23:11.640Z
 *
 * MIT License
 *
 * Copyright (c) 2014-2021 Daniel Mester Pirttijärvi
 *
 * Permission is hereby granted, free of charge, to any person obtaining a copy
 * of this software and associated documentation files (the "Software"), to deal
 * in the Software without restriction, including without limitation the rights
 * to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
 * copies of the Software, and to permit persons to whom the Software is
 * furnished to do so, subject to the following conditions:
 *
 * The above copyright notice and this permission notice shall be included in all
 * copies or substantial portions of the Software.
 *
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
 * IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
 * FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
 * AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
 * LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
 * OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
 * SOFTWARE.
 */

(()=>{
/**
 * Parses a substring of the hash as a number.
 * @param {number} startPosition
 * @param {number=} octets
 */

class HSLColor
{
	constructor(h, s, l)
	{
		this.h = h;
		this.s = s;
		this.l = l;
//		this.a = a;
	}

	toString()
	{
		const h = this.h, s = this.s, l = this.l/*, a = this.a*/,
			hex = v => {
				v = Math.max(0, Math.min(255, v * 255)).toString(16);
				return v.slice(0,2).padStart(2, "0");
			};
		let r=l, g=l, b=l;
		if (0 != s) {
			let q=l<0.5?l*(s+1):l+s-l*s,
				p=l*2-q,
				hue2rgb = h => {
					h += h<0 ? 1 : (h>1 ? -1 : 0);
					return (h*6<1) ? (p+(q-p)*h*6) : ((h*2<1) ? q : ((h*3<2) ? p+(q-p)*(2/3-h)*6 : p));
				};
			r = hue2rgb(h+1/3);
			g = hue2rgb(h);
			b = hue2rgb(h-1/3);
		}
		return '#' + hex(r) + hex(g) + hex(b) // isNaN(a)?100:a*100);
	}
}

const
	parseHex = (hash, startPosition, octets) => parseInt(hash.substr(startPosition, octets), 16),

	/**
	 * Converts an HSL color to a hexadecimal RGB color. This function will correct the lightness for the "dark" hues
	 * @param {number} hue  Hue in range [0, 1]
	 * @param {number} saturation  Saturation in range [0, 1]
	 * @param {number} lightness  Lightness in range [0, 1]
	 * @returns {string}
	 */
	correctedHsl = (hue, saturation, lightness) => {
		// The corrector specifies the perceived middle lightness for each hue
		var correctors = [ 0.55, 0.5, 0.5, 0.46, 0.6, 0.55, 0.55 ],
			  corrector = correctors[(hue * 6 + 0.5) | 0];

		// Adjust the input lightness relative to the corrector
		lightness = lightness < 0.5 ? lightness * corrector * 2 : corrector + (lightness - 0.5) * (1 - corrector) * 2;

		return new HSLColor(hue, saturation, lightness).toString();
	},

	/**
	 * Gets the normalized current Jdenticon color configuration. Missing fields have default values.
	 * @param {Object|number|undefined} paddingOrLocalConfig - Configuration passed to the called API method. A
	 *    local configuration overrides the global configuration in it entirety. This parameter can for backward
	 *    compatibility also contain a padding value. A padding value only overrides the global padding, not the
	 *    entire global configuration.
	 * @param {number} defaultPadding - Padding used if no padding is specified in neither the configuration nor
	 *    explicitly to the API method.
	 * @returns {ParsedConfiguration}
	 */
	getConfiguration = (paddingOrLocalConfig, defaultPadding) => {
		const configObject =
				typeof paddingOrLocalConfig == "object" && paddingOrLocalConfig ||
				{ },

			lightnessConfig = configObject["lightness"] || { },

			// In versions < 2.1.0 there was no grayscale saturation -
			// saturation was the color saturation.
			saturation = configObject["saturation"] || { },
			colorSaturation = "color" in saturation ? saturation["color"] : saturation,
			grayscaleSaturation = saturation["grayscale"],

			padding = configObject["padding"],

			/**
			 * Creates a lightness range.
			 */
			lightness = (configName, defaultRange) => {
				var range = lightnessConfig[configName];

				// Check if the lightness range is an array-like object. This way we ensure the
				// array contain two values at the same time.
				if (!(range && range.length > 1)) {
					range = defaultRange;
				}

				/**
				 * Gets a lightness relative the specified value in the specified lightness range.
				 */
				return function (value) {
					value = range[0] + value * (range[1] - range[0]);
					return value < 0 ? 0 : value > 1 ? 1 : value;
				};
			};

		return {
			/**
			 * Gets a hue allowed by the configured hue restriction,
			 * provided the originally computed hue.
			 */
			X/*hue*/: originalHue => {
				var hueConfig = configObject["hues"];
				var hue;

				// Check if 'hues' is an array-like object. This way we also ensure that
				// the array is not empty, which would mean no hue restriction.
				if (hueConfig && hueConfig.length > 0) {
					// originalHue is in the range [0, 1]
					// Multiply with 0.999 to change the range to [0, 1) and then truncate the index.
					hue = hueConfig[0 | (0.999 * originalHue * hueConfig.length)];
				}

				return typeof hue == "number" ?

					// A hue was specified. We need to convert the hue from
					// degrees on any turn - e.g. 746° is a perfectly valid hue -
					// to turns in the range [0, 1).
					((((hue / 360) % 1) + 1) % 1) :

					// No hue configured => use original hue
					originalHue;
			},

			p/*colorSaturation*/: typeof colorSaturation == "number" ? colorSaturation : 0.5,
			H/*grayscaleSaturation*/: typeof grayscaleSaturation == "number" ? grayscaleSaturation : 0,
			q/*colorLightness*/: lightness("color", [0.4, 0.8]),
			I/*grayscaleLightness*/: lightness("grayscale", [0.3, 0.9]),
			Y/*iconPadding*/:
				typeof paddingOrLocalConfig == "number" ? paddingOrLocalConfig :
				typeof padding == "number" ? padding :
				defaultPadding
		}
	};

/**
 * Represents a point.
 */
function Point(x, y) {
	this.x = x;
	this.y = y;
}

/**
 * Translates and rotates a point before being passed on to the canvas context. This was previously done by the canvas context itself,
 * but this caused a rendering issue in Chrome on sizes > 256 where the rotation transformation of inverted paths was not done properly.
 */
class Transform
{
	constructor(x, y, size, rotation) {
		this.u/*_x*/ = x;
		this.v/*_y*/ = y;
		this.K/*_size*/ = size;
		this.Z/*_rotation*/ = rotation;
	}

	/**
	 * Transforms the specified point based on the translation and rotation specification for this Transform.
	 * @param {number} x x-coordinate
	 * @param {number} y y-coordinate
	 * @param {number=} w The width of the transformed rectangle. If greater than 0, this will ensure the returned point is of the upper left corner of the transformed rectangle.
	 * @param {number=} h The height of the transformed rectangle. If greater than 0, this will ensure the returned point is of the upper left corner of the transformed rectangle.
	 */
	L/*transformIconPoint*/(x, y, w, h) {
		var right = this.u/*_x*/ + this.K/*_size*/,
			bottom = this.v/*_y*/ + this.K/*_size*/,
			rotation = this.Z/*_rotation*/;
		return rotation === 1 ? new Point(right - y - (h || 0), this.v/*_y*/ + x) :
			   rotation === 2 ? new Point(right - x - (w || 0), bottom - y - (h || 0)) :
			   rotation === 3 ? new Point(this.u/*_x*/ + y, bottom - x - (w || 0)) :
			   new Point(this.u/*_x*/ + x, this.v/*_y*/ + y);
	}
}

var NO_TRANSFORM = new Transform(0, 0, 0, 0);

/**
 * Provides helper functions for rendering common basic shapes.
 */
class Graphics
{
	constructor(renderer) {
		/**
		 * @type {Renderer}
		 * @private
		 */
		this.M/*_renderer*/ = renderer;

		/**
		 * @type {Transform}
		 */
		this.A/*currentTransform*/ = NO_TRANSFORM;
	}

	/**
	 * Adds a polygon to the underlying renderer.
	 * @param {Array<number>} points The points of the polygon clockwise on the format [ x0, y0, x1, y1, ..., xn, yn ]
	 * @param {boolean=} invert Specifies if the polygon will be inverted.
	 */
	g/*addPolygon*/(points, invert) {
			var this$1 = this;

		var di = invert ? -2 : 2,
			  transformedPoints = [];

		for (var i = invert ? points.length - 2 : 0; i < points.length && i >= 0; i += di) {
			transformedPoints.push(this$1.A/*currentTransform*/.L/*transformIconPoint*/(points[i], points[i + 1]));
		}

		this.M/*_renderer*/.g/*addPolygon*/(transformedPoints);
	}

	/**
	 * Adds a polygon to the underlying renderer.
	 * Source: http://stackoverflow.com/a/2173084
	 * @param {number} x The x-coordinate of the upper left corner of the rectangle holding the entire ellipse.
	 * @param {number} y The y-coordinate of the upper left corner of the rectangle holding the entire ellipse.
	 * @param {number} size The size of the ellipse.
	 * @param {boolean=} invert Specifies if the ellipse will be inverted.
	 */
	h/*addCircle*/(x, y, size, invert) {
		var p = this.A/*currentTransform*/.L/*transformIconPoint*/(x, y, size, size);
		this.M/*_renderer*/.h/*addCircle*/(p, size, invert);
	}

	/**
	 * Adds a rectangle to the underlying renderer.
	 * @param {number} x The x-coordinate of the upper left corner of the rectangle.
	 * @param {number} y The y-coordinate of the upper left corner of the rectangle.
	 * @param {number} w The width of the rectangle.
	 * @param {number} h The height of the rectangle.
	 * @param {boolean=} invert Specifies if the rectangle will be inverted.
	 */
	i/*addRectangle*/(x, y, w, h, invert) {
		this.g/*addPolygon*/([
			x, y,
			x + w, y,
			x + w, y + h,
			x, y + h
		], invert);
	}

	/**
	 * Adds a right triangle to the underlying renderer.
	 * @param {number} x The x-coordinate of the upper left corner of the rectangle holding the triangle.
	 * @param {number} y The y-coordinate of the upper left corner of the rectangle holding the triangle.
	 * @param {number} w The width of the triangle.
	 * @param {number} h The height of the triangle.
	 * @param {number} r The rotation of the triangle (clockwise). 0 = right corner of the triangle in the lower left corner of the bounding rectangle.
	 * @param {boolean=} invert Specifies if the triangle will be inverted.
	 */
	j/*addTriangle*/(x, y, w, h, r, invert) {
		var points = [
			x + w, y,
			x + w, y + h,
			x, y + h,
			x, y
		];
		points.splice(((r || 0) % 4) * 2, 2);
		this.g/*addPolygon*/(points, invert);
	}

	/**
	 * Adds a rhombus to the underlying renderer.
	 * @param {number} x The x-coordinate of the upper left corner of the rectangle holding the rhombus.
	 * @param {number} y The y-coordinate of the upper left corner of the rectangle holding the rhombus.
	 * @param {number} w The width of the rhombus.
	 * @param {number} h The height of the rhombus.
	 * @param {boolean=} invert Specifies if the rhombus will be inverted.
	 */
	N/*addRhombus*/(x, y, w, h, invert) {
		this.g/*addPolygon*/([
			x + w / 2, y,
			x + w, y + h / 2,
			x + w / 2, y + h,
			x, y + h / 2
		], invert);
	}
}

/**
 * @param {number} index
 * @param {Graphics} g
 * @param {number} cell
 * @param {number} positionIndex
 */
function centerShape(index, g, cell, positionIndex) {
	index = index % 14;

	var k, m, w, h, inner, outer;

	!index ? (
		k = cell * 0.42,
		g.g/*addPolygon*/([
			0, 0,
			cell, 0,
			cell, cell - k * 2,
			cell - k, cell,
			0, cell
		])) :

	index == 1 ? (
		w = 0 | (cell * 0.5),
		h = 0 | (cell * 0.8),

		g.j/*addTriangle*/(cell - w, 0, w, h, 2)) :

	index == 2 ? (
		w = 0 | (cell / 3),
		g.i/*addRectangle*/(w, w, cell - w, cell - w)) :

	index == 3 ? (
		inner = cell * 0.1,
		// Use fixed outer border widths in small icons to ensure the border is drawn
		outer =
			cell < 6 ? 1 :
			cell < 8 ? 2 :
			(0 | (cell * 0.25)),

		inner =
			inner > 1 ? (0 | inner) : // large icon => truncate decimals
			inner > 0.5 ? 1 :         // medium size icon => fixed width
			inner,                    // small icon => anti-aliased border

		g.i/*addRectangle*/(outer, outer, cell - inner - outer, cell - inner - outer)) :

	index == 4 ? (
		m = 0 | (cell * 0.15),
		w = 0 | (cell * 0.5),
		g.h/*addCircle*/(cell - w - m, cell - w - m, w)) :

	index == 5 ? (
		inner = cell * 0.1,
		outer = inner * 4,

		// Align edge to nearest pixel in large icons
		outer > 3 && (outer = 0 | outer),

		g.i/*addRectangle*/(0, 0, cell, cell),
		g.g/*addPolygon*/([
			outer, outer,
			cell - inner, outer,
			outer + (cell - outer - inner) / 2, cell - inner
		], true)) :

	index == 6 ?
		g.g/*addPolygon*/([
			0, 0,
			cell, 0,
			cell, cell * 0.7,
			cell * 0.4, cell * 0.4,
			cell * 0.7, cell,
			0, cell
		]) :

	index == 7 ?
		g.j/*addTriangle*/(cell / 2, cell / 2, cell / 2, cell / 2, 3) :

	index == 8 ? (
		g.i/*addRectangle*/(0, 0, cell, cell / 2),
		g.i/*addRectangle*/(0, cell / 2, cell / 2, cell / 2),
		g.j/*addTriangle*/(cell / 2, cell / 2, cell / 2, cell / 2, 1)) :

	index == 9 ? (
		inner = cell * 0.14,
		// Use fixed outer border widths in small icons to ensure the border is drawn
		outer =
			cell < 4 ? 1 :
			cell < 6 ? 2 :
			(0 | (cell * 0.35)),

		inner =
			cell < 8 ? inner : // small icon => anti-aliased border
			(0 | inner),       // large icon => truncate decimals

		g.i/*addRectangle*/(0, 0, cell, cell),
		g.i/*addRectangle*/(outer, outer, cell - outer - inner, cell - outer - inner, true)) :

	index == 10 ? (
		inner = cell * 0.12,
		outer = inner * 3,

		g.i/*addRectangle*/(0, 0, cell, cell),
		g.h/*addCircle*/(outer, outer, cell - inner - outer, true)) :

	index == 11 ?
		g.j/*addTriangle*/(cell / 2, cell / 2, cell / 2, cell / 2, 3) :

	index == 12 ? (
		m = cell * 0.25,
		g.i/*addRectangle*/(0, 0, cell, cell),
		g.N/*addRhombus*/(m, m, cell - m, cell - m, true)) :

	// 13
	(
		!positionIndex && (
			m = cell * 0.4, w = cell * 1.2,
			g.h/*addCircle*/(m, m, w)
		)
	);
}

/**
 * @param {number} index
 * @param {Graphics} g
 * @param {number} cell
 */
function outerShape(index, g, cell) {
	index = index % 4;

	var m;

	!index ?
		g.j/*addTriangle*/(0, 0, cell, cell, 0) :

	index == 1 ?
		g.j/*addTriangle*/(0, cell / 2, cell, cell / 2, 0) :

	index == 2 ?
		g.N/*addRhombus*/(0, 0, cell, cell) :

	// 3
	(
		m = cell / 6,
		g.h/*addCircle*/(m, m, cell - 2 * m)
	);
}

/**
 * Gets a set of identicon color candidates for a specified hue and config.
 * @param {number} hue
 * @param {ParsedConfiguration} config
 */
function colorTheme(hue, config) {
	hue = config.X/*hue*/(hue);
	return [
		// Dark gray
		correctedHsl(hue, config.H/*grayscaleSaturation*/, config.I/*grayscaleLightness*/(0)),
		// Mid color
		correctedHsl(hue, config.p/*colorSaturation*/, config.q/*colorLightness*/(0.5)),
		// Light gray
		correctedHsl(hue, config.H/*grayscaleSaturation*/, config.I/*grayscaleLightness*/(1)),
		// Light color
		correctedHsl(hue, config.p/*colorSaturation*/, config.q/*colorLightness*/(1)),
		// Dark color
		correctedHsl(hue, config.p/*colorSaturation*/, config.q/*colorLightness*/(0))
	];
}

/**
 * Draws an identicon to a specified renderer.
 * @param {Renderer} renderer
 * @param {string} hash
 * @param {Object|number=} config
 */
function iconGenerator(renderer, hash, config) {
	var parsedConfig = getConfiguration(config, 0.08);

	// Calculate padding and round to nearest integer
	var size = renderer.k/*iconSize*/;
	var padding = (0.5 + size * parsedConfig.Y/*iconPadding*/) | 0;
	size -= padding * 2;

	var graphics = new Graphics(renderer);

	// Calculate cell size and ensure it is an integer
	var cell = 0 | (size / 4);

	// Since the cell size is integer based, the actual icon will be slightly smaller than specified => center icon
	var x = 0 | (padding + size / 2 - cell * 2);
	var y = 0 | (padding + size / 2 - cell * 2);

	function renderShape(colorIndex, shapes, index, rotationIndex, positions) {
		var shapeIndex = parseHex(hash, index, 1);
		var r = rotationIndex ? parseHex(hash, rotationIndex, 1) : 0;

		renderer.O/*beginShape*/(availableColors[selectedColorIndexes[colorIndex]]);

		for (var i = 0; i < positions.length; i++) {
			graphics.A/*currentTransform*/
				= new Transform(x + positions[i][0] * cell, y + positions[i][1] * cell, cell, r++ % 4);
			shapes(shapeIndex, graphics, cell, i);
		}

		renderer.P/*endShape*/();
	}

	// AVAILABLE COLORS
	var hue = parseHex(hash, -7) / 0xfffffff,

		  // Available colors for this icon
		  availableColors = colorTheme(hue, parsedConfig),

		  // The index of the selected colors
		  selectedColorIndexes = [];

	var index;

	function isDuplicate(values) {
		if (values.indexOf(index) >= 0) {
			for (var i = 0; i < values.length; i++) {
				if (selectedColorIndexes.indexOf(values[i]) >= 0) {
					return true;
				}
			}
		}
	}

	for (var i = 0; i < 3; i++) {
		index = parseHex(hash, 8 + i, 1) % availableColors.length;
		if (isDuplicate([0, 4]) || // Disallow dark gray and dark color combo
			isDuplicate([2, 3])) { // Disallow light gray and light color combo
			index = 1;
		}
		selectedColorIndexes.push(index);
	}

	// ACTUAL RENDERING
	// Sides
	renderShape(0, outerShape, 2, 3, [[1, 0], [2, 0], [2, 3], [1, 3], [0, 1], [3, 1], [3, 2], [0, 2]]);
	// Corners
	renderShape(1, outerShape, 4, 5, [[0, 0], [3, 0], [3, 3], [0, 3]]);
	// Center
	renderShape(2, centerShape, 1, null, [[1, 1], [2, 1], [2, 2], [1, 2]]);

	renderer.finish();
}

/**
 * Computes a SHA1 hash for any value and returns it as a hexadecimal string.
 *
 * This function is optimized for minimal code size and rather short messages.
 *
 * @param {string} message
 */
async function computeHash(message) {
	const hashArray = Array.from(new Uint8Array(
//		await crypto.subtle.digest('SHA-256', (new TextEncoder()).encode(message))
		await crypto.subtle.digest('SHA-1', (new TextEncoder()).encode(message))
	));
	return hashArray.map(b => b.toString(16).padStart(2, '0')).join(''); // convert bytes to hex string
}

/**
 * Prepares a measure to be used as a measure in an SVG path, by
 * rounding the measure to a single decimal. This reduces the file
 * size of the generated SVG with more than 50% in some cases.
 */
function svgValue(value) {
	return ((value * 10 + 0.5) | 0) / 10;
}

/**
 * Represents an SVG path element.
 */
class SvgPath
{
	constructor() {
		/**
		 * This property holds the data string (path.d) of the SVG path.
		 * @type {string}
		 */
		this.B/*dataString*/ = "";
	}

	/**
	 * Adds a polygon with the current fill color to the SVG path.
	 * @param points An array of Point objects.
	 */
	g/*addPolygon*/(points) {
		var dataString = "";
		for (var i = 0; i < points.length; i++) {
			dataString += (i ? "L" : "M") + svgValue(points[i].x) + " " + svgValue(points[i].y);
		}
		this.B/*dataString*/ += dataString + "Z";
	}

	/**
	 * Adds a circle with the current fill color to the SVG path.
	 * @param {Point} point The upper left corner of the circle bounding box.
	 * @param {number} diameter The diameter of the circle.
	 * @param {boolean} counterClockwise True if the circle is drawn counter-clockwise (will result in a hole if rendered on a clockwise path).
	 */
	h/*addCircle*/(point, diameter, counterClockwise) {
		var sweepFlag = counterClockwise ? 0 : 1,
			  svgRadius = svgValue(diameter / 2),
			  svgDiameter = svgValue(diameter),
			  svgArc = "a" + svgRadius + "," + svgRadius + " 0 1," + sweepFlag + " ";

		this.B/*dataString*/ +=
			"M" + svgValue(point.x) + " " + svgValue(point.y + diameter / 2) +
			svgArc + svgDiameter + ",0" +
			svgArc + (-svgDiameter) + ",0";
	}
}


/**
 * Renderer producing SVG output.
 * @implements {Renderer}
 */
class SvgRenderer
{
	constructor(target) {
		/**
		 * @type {SvgPath}
		 * @private
		 */
		this.C/*_path*/;

		/**
		 * @type {Object.<string,SvgPath>}
		 * @private
		 */
		this.D/*_pathsByColor*/ = { };

		/**
		 * @type {SvgElement|SvgWriter}
		 * @private
		 */
		this.R/*_target*/ = target;

		/**
		 * @type {number}
		 */
		this.k/*iconSize*/ = target.k/*iconSize*/;
	}

	/**
	 * Fills the background with the specified color.
	 * @param {string} fillColor  Fill color on the format #rrggbb[aa].
	 */
	m/*setBackground*/(fillColor) {
		var match = /^(#......)(..)?/.exec(fillColor),
			  opacity = match[2] ? parseHex(match[2], 0) / 255 : 1;
		this.R/*_target*/.m/*setBackground*/(match[1], opacity);
	}

	/**
	 * Marks the beginning of a new shape of the specified color. Should be ended with a call to endShape.
	 * @param {string} color Fill color on format #xxxxxx.
	 */
	O/*beginShape*/(color) {
		this.C/*_path*/ = this.D/*_pathsByColor*/[color] || (this.D/*_pathsByColor*/[color] = new SvgPath());
	}

	/**
	 * Marks the end of the currently drawn shape.
	 */
	P/*endShape*/() { }

	/**
	 * Adds a polygon with the current fill color to the SVG.
	 * @param points An array of Point objects.
	 */
	g/*addPolygon*/(points) {
		this.C/*_path*/.g/*addPolygon*/(points);
	}

	/**
	 * Adds a circle with the current fill color to the SVG.
	 * @param {Point} point The upper left corner of the circle bounding box.
	 * @param {number} diameter The diameter of the circle.
	 * @param {boolean} counterClockwise True if the circle is drawn counter-clockwise (will result in a hole if rendered on a clockwise path).
	 */
	h/*addCircle*/(point, diameter, counterClockwise) {
		this.C/*_path*/.h/*addCircle*/(point, diameter, counterClockwise);
	}

	/**
	 * Called when the icon has been completely drawn.
	 */
	finish() {
		var pathsByColor = this.D/*_pathsByColor*/;
		for (var color in pathsByColor) {
			// hasOwnProperty cannot be shadowed in pathsByColor
			// eslint-disable-next-line no-prototype-builtins
			if (pathsByColor.hasOwnProperty(color)) {
				this.R/*_target*/.S/*appendPath*/(color, pathsByColor[color].B/*dataString*/);
			}
		}
	}
}

/**
 * Renderer producing SVG output.
 */
class SvgWriter
{
	constructor(iconSize) {
		/**
		 * @type {number}
		 */
		this.k/*iconSize*/ = iconSize;

		/**
		 * @type {string}
		 * @private
		 */
		this.F =
			'<svg xmlns="http://www.w3.org/2000/svg" width="' +
			iconSize + '" height="' + iconSize + '" viewBox="0 0 ' +
			iconSize + ' ' + iconSize + '">';
	}

	/**
	 * Fills the background with the specified color.
	 * @param {string} fillColor  Fill color on the format #rrggbb.
	 * @param {number} opacity  Opacity in the range [0.0, 1.0].
	 */
	m/*setBackground*/(fillColor, opacity) {
		if (opacity) {
			this.F += '<rect width="100%" height="100%" fill="' +
				fillColor + '" opacity="' + opacity.toFixed(2) + '"/>';
		}
	}

	/**
	 * Writes a path to the SVG string.
	 * @param {string} color Fill color on format #rrggbb.
	 * @param {string} dataString The SVG path data string.
	 */
	S/*appendPath*/(color, dataString) {
		this.F += '<path fill="' + color + '" d="' + dataString + '"/>';
	}

	/**
	 * Gets the rendered image as an SVG string.
	 */
	toString() {
		return this.F + "</svg>";
	}
}

/**
 * Draws an identicon as an SVG string.
 * @param {*} hashOrValue - A hexadecimal hash string or any value that will be hashed by Jdenticon.
 * @param {number} size - Icon size in pixels.
 * @param {Object|number=} config - Optional configuration. If specified, this configuration object overrides any
 *    global configuration in its entirety. For backward compatibility a padding value in the range [0.0, 0.5) can be
 *    specified in place of a configuration object.
 * @returns {string} SVG string
 */
window.identiconSvg = async (hashOrValue, config) => {
	var writer = new SvgWriter(50);
	iconGenerator(new SvgRenderer(writer),
		(/^[0-9a-f]{11,}$/i.test(hashOrValue) && hashOrValue)
			|| await computeHash(hashOrValue == null ? "" : "" + hashOrValue),
		config);
	return writer.toString();
};

})();
