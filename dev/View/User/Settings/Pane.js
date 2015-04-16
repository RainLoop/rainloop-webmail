
(function () {

	'use strict';

	var
		_ = require('_'),

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

	PaneSettingsUserView.prototype.onShow = function ()
	{
		require('Stores/User/Message').message(null);
	};

	PaneSettingsUserView.prototype.backToMailBoxClick = function ()
	{
		kn.setHash(require('Common/Links').inbox(
			require('Common/Cache').getFolderInboxName()));
	};

	module.exports = PaneSettingsUserView;

}());