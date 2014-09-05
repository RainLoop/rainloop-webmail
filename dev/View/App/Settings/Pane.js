
(function () {

	'use strict';

	var
		_ = require('_'),
		key = require('key'),

		Enums = require('Common/Enums'),
		LinkBuilder = require('Common/LinkBuilder'),

		Data = require('Storage/App/Data'),

		kn = require('Knoin/Knoin'),
		AbstractView = require('Knoin/AbstractView')
	;

	/**
	 * @constructor
	 * @extends AbstractView
	 */
	function PaneSettingsAppView()
	{
		AbstractView.call(this, 'Right', 'SettingsPane');

		kn.constructorEnd(this);
	}

	kn.extendAsViewModel(['View/App/Settings/Pane', 'SettingsPaneViewModel'], PaneSettingsAppView);
	_.extend(PaneSettingsAppView.prototype, AbstractView.prototype);

	PaneSettingsAppView.prototype.onBuild = function ()
	{
		var self = this;
		key('esc', Enums.KeyState.Settings, function () {
			self.backToMailBoxClick();
		});
	};

	PaneSettingsAppView.prototype.onShow = function ()
	{
		Data.message(null);
	};

	PaneSettingsAppView.prototype.backToMailBoxClick = function ()
	{
		kn.setHash(LinkBuilder.inbox());
	};

	module.exports = PaneSettingsAppView;

}());