
(function () {

	'use strict';

	var
		window = require('window'),
		Opentip = window.Opentip
	;

	Opentip.styles.rainloop = {
		'extends': 'standard',
		'fixed': true,
		'target': true,

		'showOn': 'mouseover click',
		'removeElementsOnHide': true,

		'background': '#fff',
		'shadow': false,

		'borderColor': '#999',
		'borderRadius': 2,
		'borderWidth': 1
	};

	Opentip.styles.rainloopTip = {
		'extends': 'rainloop',
		'stemLength': 3,
		'stemBase': 5,
		'group': 'rainloopTips'
	};

	Opentip.styles.rainloopErrorTip = {
		'extends': 'rainloop',
		'className': 'rainloopErrorTip'
	};

	module.exports = Opentip;

}());
