
import window from 'window';
import jsloader from 'Common/Loader';
import {progressJs} from 'progress.js/src/progress.js';

window.jsloader = jsloader;
window.progressJs = window.progressJs || progressJs();

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
