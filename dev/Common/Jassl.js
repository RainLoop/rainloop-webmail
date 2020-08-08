import window from 'window';

// let rainloopCaches = window.caches && window.caches.open ? window.caches : null;

/**
 * @param {src} src
 * @param {boolean} async = false
 * @returns {Promise}
 */
export function jassl(src, async = false) {
	if (!src) {
		throw new Error('src should not be empty.');
	}

	return new window.Promise((resolve, reject) => {
		const doc = window.document,
			element = doc.createElement('script');

		element.onload = () => {
			resolve(src);
		};

		element.onerror = () => {
			reject(new Error(src));
		};

		element.async = !!async;
		element.src = src;

		doc.body.appendChild(element);
	}) /* .then((s) => {

		const found = s && rainloopCaches ? s.match(/rainloop\/v\/([^\/]+)\/static\//) : null;
		if (found && found[1])
		{
			rainloopCaches.open('rainloop-offline-' + found[1]).then(
				(cache) => cache.add(s)
			).catch(() => {
				rainloopCaches = null;
			});
		}

		return s;
	})*/;
}
