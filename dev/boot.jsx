
import window from 'window';
import {Promise} from 'es6-promise-polyfill/promise.js';
import {progressJs} from 'progress.js/src/progress.js';
import jassl from 'jassl';

window.Promise = window.Promise || Promise;
window.progressJs = window.progressJs || progressJs();
window.jassl = jassl;

window.progressJs.onbeforeend(() => {
	if (window.$)
	{
		window.$('.progressjs-container').hide();
		window.setTimeout(() => {
			window.$('.progressjs-container').remove();
		}, 100);
	}
});

require('json2/json2.js');
require('modernizr/modernizr-custom.js');

require('Common/Booter.jsx');

if (window.__runBoot)
{
	window.__runBoot();
}
