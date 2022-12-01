
(()=>{

const size = 50,
	margin = 0.08;

window.identiconSvg = (hash, txt) => {
	// color defaults to last 7 chars as hue at 70% saturation, 50% brightness
	// hsl2rgb adapted from: https://gist.github.com/aemkei/1325937
	let h = (parseInt(hash.substr(-7), 16) / 0xfffffff) * 6, s = 0.7, l = 0.5,
		v = [
			l += s *= l < .5 ? l : 1 - l,
			l - h % 1 * s * 2,
			l -= s *= 2,
			l,
			l + h % 1 * s,
			l + s
		],
		m = txt ? 128 : 255,
		color = 'rgb(' + [
			v[ ~~h % 6 ] * m, // red
			v[ (h | 16) % 6 ] * m, // green
			v[ (h |  8) % 6 ] * m // blue
		].map(Math.round).join(',') + ')';

	if (txt) {
		txt = `<svg xmlns="http://www.w3.org/2000/svg" width="${size}px" height="${size}px" viewBox="0 0 ${size} ${size}" version="1.1">
			<circle fill="${color}" width="${size}" height="${size}" cx="${size/2}" cy="${size/2}" r="${size/2}"/>
			<text x="${size}%" y="${size}%" style="color:#FFF" alignment-baseline="middle" text-anchor="middle"
				 font-weight="bold" font-size="${Math.round(size*0.5)}"
				 dy=".1em" dominant-baseline="middle" fill="#FFF">${txt}</text>
			</svg>`;
	} else {
		const cell = Math.floor((size - ((Math.floor(size * margin)) * 2)) / 5),
			imargin = Math.floor((size - cell * 5) / 2),
			rectangles = [],
			add = (x, y) => rectangles.push("<rect x='" + (x * cell + imargin)
				+ "' y='" + (y * cell + imargin)
				+ "' width='" + cell + "' height='" + cell + "'/>");
		// the first 15 characters of the hash control the pixels (even/odd)
		// they are drawn down the middle first, then mirrored outwards
		for (let i = 0; i < 15; ++i) {
			if (!(parseInt(hash.charAt(i), 16) % 2)) {
				if (i < 5) {
					add(2, i);
				} else if (i < 10) {
					add(1, (i - 5));
					add(3, (i - 5));
				} else {
					add(0, (i - 10));
					add(4, (i - 10));
				}
			}
		}
		txt = "<g style='fill:" + color + "; stroke:" + color + "; stroke-width:" + (size * 0.005) + ";'>"
			+ rectangles.join('')
			+ "</g>";
	}
	return "<svg xmlns='http://www.w3.org/2000/svg' width='" + size + "' height='" + size + "'>" + txt + "</svg>";
};

})();
