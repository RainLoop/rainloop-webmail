
import window from 'window';
import Promise from 'Promise';

// let rainloopCaches = window.caches && window.caches.open ? window.caches : null;

/**
 * @param {src} src
 * @param {boolean} async = false
 * @returns {Promise}
 */
export function jassl(src, async = false) {

	if (!Promise || !Promise.all)
	{
		throw new Error('Promises are not available your environment.');
	}

	if (!src)
	{
		throw new Error('src should not be empty.');
	}

	return new Promise((resolve, reject) => {

		const element = window.document.createElement('script');

		element.onload = () => {
			resolve(src);
		};

		element.onerror = () => {
			reject(new Error(src));
		};

		element.async = true === async;
		element.src = src;

		window.document.body.appendChild(element);
	})/* .then((s) => {

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
