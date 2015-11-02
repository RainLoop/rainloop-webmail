
(function () {

	'use strict';

	var
		$ = require('$'),
		sUrl = null,
		getUtl = function () {
			if (!sUrl)
			{
				sUrl = 'rainloop/v/' + ($('#rlAppVersion').attr('content') || '0.0.0')	+ '/static/css/svg/icons.svg';
			}

			return sUrl;
		}
	;

	module.exports = {
		viewModel: {
			createViewModel: function(oParams, oComponentInfo) {
				var icon = oParams.icon || 'null';
				if (oComponentInfo.element && oComponentInfo.element)
				{
					$(oComponentInfo.element).replaceWith(
'<svg class="svg-icon svg-icon-' + icon + '"><use xlink:href="' + getUtl() + '#svg-icon-' + icon + '"></use></svg>');
				}
			}
		},
		'template': '<b></b>'
	};

}());


