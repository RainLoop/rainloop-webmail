
import window from 'window';

import {Promise} from 'es6-promise-polyfill/promise.js';
import {jassl} from 'jassl';
import {progressJs} from '../vendors/progress.js/src/progress.js';

window.Promise = window.Promise || Promise;
window.progressJs = window.progressJs || progressJs();
window.jassl = jassl;

window.progressJs.onbeforeend(() => {
	const _$ = window.$;
	if (_$)
	{
		_$('.progressjs-container').hide();
		window.setTimeout(() => {
			_$('.progressjs-container').remove();
		}, 200);
	}
});

require('../vendors/json2/json2.js');
require('../vendors/modernizr/modernizr-custom.js');

require('Common/Booter.jsx');

if (window.__runBoot)
{
	window.__runBoot();
}
