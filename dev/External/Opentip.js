
(function () {

	'use strict';

	var
		window = require('window'),
		Opentip = window.Opentip
	;

	Opentip.styles.rainloop = {
		'extends': 'standard',
		'group': 'rainloopTips',
		'fixed': true,
		'target': true,

		'removeElementsOnHide': true,

		'background': '#fff',
		'shadow': false,

		'borderColor': '#999',
		'borderRadius': 2,
		'borderWidth': 1
	};

	Opentip.styles.rainloopTip = {
		'extends': 'rainloop',
		'group': 'rainloopTips'
	};

	Opentip.styles.rainloopTestTip = {
		'extends': 'rainloop'
	};

	module.exports = Opentip;

}());
