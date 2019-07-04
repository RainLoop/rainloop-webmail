import window from 'window';

const Opentip = window.Opentip || {};

Opentip.styles = Opentip.styles || {};

Opentip.styles.rainloop = {
	'extends': 'standard',

	'fixed': true,
	'target': true,

	'delay': 0.2,
	'hideDelay': 0,

	'hideEffect': 'fade',
	'hideEffectDuration': 0.2,

	'showEffect': 'fade',
	'showEffectDuration': 0.2,

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
	'delay': 0.4,
	'group': 'rainloopTips'
};

Opentip.styles.rainloopErrorTip = {
	'extends': 'rainloop',
	'className': 'rainloopErrorTip'
};

export { Opentip, Opentip as default };
