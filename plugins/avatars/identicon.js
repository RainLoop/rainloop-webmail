
(()=>{

const size = 50,
	margin = 0.08;

window.identiconSvg = (hash, txt, font) => {
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
		txt = `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}" version="1.1">
			<circle fill="${color}" width="${size}" height="${size}" cx="${size/2}" cy="${size/2}" r="${size/2}"/>
			<text x="${size}%" y="${size}%" style="color:#FFF" alignment-baseline="middle" text-anchor="middle"
				 font-weight="bold" font-size="${Math.round(size*0.5)}" font-family="${font.replace(/"/g, "'")}"
				 dy=".1em" dominant-baseline="middle" fill="#FFF">${txt}</text>
			</svg>`;
	} else {
		txt = `<path fill="${color}" d="m 404.4267,343.325 c -5.439,-16.32 -15.298,-32.782 -29.839,-42.362 -27.979,-18.572 -60.578,-28.479 -92.099,-39.085 -7.604,-2.664 -15.33,-5.568 -22.279,-9.7 -6.204,-3.686 -8.533,-11.246 -9.974,-17.886 -0.636,-3.512 -1.026,-7.116 -1.228,-10.661 22.857,-31.267 38.019,-82.295 38.019,-124.136 0,-65.298 -36.896,-83.495 -82.402,-83.495 -45.515,0 -82.403,18.17 -82.403,83.468 0,43.338 16.255,96.5 40.489,127.383 -0.221,2.438 -0.511,4.876 -0.95,7.303 -1.444,6.639 -3.77,14.058 -9.97,17.743 -6.957,4.133 -14.682,6.756 -22.287,9.42 -31.520996,10.605 -64.118996,19.957 -92.090996,38.529 -14.549,9.58 -24.403,27.159 -29.838,43.479 -5.597,16.938 -7.88600003,37.917 -7.54100003,54.917 H 205.9917 411.9657 c 0.348,-16.999 -1.946,-37.978 -7.539,-54.917 z"/>`;

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
