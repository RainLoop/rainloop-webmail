import window from 'window';
import { progressJs } from '../vendors/Progress.js/src/progress.js';

window.progressJs = window.progressJs || progressJs();

window.progressJs.onbeforeend(() => {
	const div = window.document.querySelector('.progressjs-container');
	if (div) {
		try {
			div.hidden = true;
			window.setTimeout(() => {
				div.remove();
			}, 200); // eslint-disable-line no-magic-numbers
		} catch (e) {} // eslint-disable-line no-empty
	}
});

require('Common/Booter');

if (window.__runBoot) {
	window.__runBoot();
}
