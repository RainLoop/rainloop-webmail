
import window from 'window';
import {Promise} from 'es6-promise-polyfill/promise.js';

window.Promise = window.Promise || Promise;

export default (url) => {
	return new window.Promise((resolve, reject) => {

		const element = document.createElement('script');

		element.onload = () => {
			resolve(url);
		};

		element.onerror = () => {
			reject(new Error(url));
		};

		element.async = true;
		element.src = url;

		document.body.appendChild(element);
	});
};
