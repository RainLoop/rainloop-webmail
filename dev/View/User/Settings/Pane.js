
(function () {

	'use strict';

	var
		_ = require('_'),

		Globals = require('Common/Globals'),

		Settings = require('Storage/Settings'),

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

		this.mobile = Settings.appSettingsGet('mobile');

		this.leftPanelDisabled = Globals.leftPanelDisabled;

		kn.constructorEnd(this);
	}

	kn.extendAsViewModel(['View/User/Settings/Pane', 'View/App/Settings/Pane', 'SettingsPaneViewModel'], PaneSettingsUserView);
	_.extend(PaneSettingsUserView.prototype, AbstractView.prototype);

	PaneSettingsUserView.prototype.onShow = function ()
	{
		require('Stores/User/Message').message(null);
	};

	PaneSettingsUserView.prototype.hideLeft = function (oItem, oEvent)
	{
		oEvent.preventDefault();
		oEvent.stopPropagation();

		Globals.leftPanelDisabled(true);
	};

	PaneSettingsUserView.prototype.showLeft = function (oItem, oEvent)
	{
		oEvent.preventDefault();
		oEvent.stopPropagation();

		Globals.leftPanelDisabled(false);
	};

	PaneSettingsUserView.prototype.onBuild = function (oDom)
	{
		if (this.mobile)
		{
			oDom
				.on('click', function () {
					Globals.leftPanelDisabled(true);
				})
			;
		}
	};

	PaneSettingsUserView.prototype.backToMailBoxClick = function ()
	{
		kn.setHash(require('Common/Links').inbox(
			require('Common/Cache').getFolderInboxName()));
	};

	module.exports = PaneSettingsUserView;

}());