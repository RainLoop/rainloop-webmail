
(function () {

	'use strict';

	var
		_ = require('_'),
		key = require('key'),

		Enums = require('Common/Enums'),
		Links = require('Common/Links'),

		Data = require('Storage/User/Data'),
		Cache = require('Storage/User/Cache'),

		kn = require('Knoin/Knoin'),
		AbstractView = require('Knoin/AbstractView')
	;

	/**
	 * @constructor
	 * @extends AbstractView
	 */
	function PaneSettingsUserView()
	{
		AbstractView.call(this, 'Right', 'SettingsPane');

		kn.constructorEnd(this);
	}

	kn.extendAsViewModel(['View/User/Settings/Pane', 'View/App/Settings/Pane', 'SettingsPaneViewModel'], PaneSettingsUserView);
	_.extend(PaneSettingsUserView.prototype, AbstractView.prototype);

	PaneSettingsUserView.prototype.onBuild = function ()
	{
		var self = this;
		key('esc', Enums.KeyState.Settings, function () {
			self.backToMailBoxClick();
		});
	};

	PaneSettingsUserView.prototype.onShow = function ()
	{
		Data.message(null);
	};

	PaneSettingsUserView.prototype.backToMailBoxClick = function ()
	{
		kn.setHash(Links.inbox(Cache.getFolderInboxName()));
	};

	module.exports = PaneSettingsUserView;

}());