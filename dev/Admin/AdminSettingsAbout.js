/* RainLoop Webmail (c) RainLoop Team | Licensed under CC BY-NC-SA 3.0 */
'use strict';

(function (module) {

	var
		ko = require('../External/ko.js')
	;

	/**
	 * @constructor
	 */
	function AdminSettingsAbout()
	{
		var
			AppSettings = require('../Storages/AppSettings.js'),
			Data = require('../Storages/AdminDataStorage.js')
		;

		this.version = ko.observable(AppSettings.settingsGet('Version'));
		this.access = ko.observable(!!AppSettings.settingsGet('CoreAccess'));
		this.errorDesc = ko.observable('');

		this.coreReal = Data.coreReal;
		this.coreUpdatable = Data.coreUpdatable;
		this.coreAccess = Data.coreAccess;
		this.coreChecking = Data.coreChecking;
		this.coreUpdating = Data.coreUpdating;
		this.coreRemoteVersion = Data.coreRemoteVersion;
		this.coreRemoteRelease = Data.coreRemoteRelease;
		this.coreVersionCompare = Data.coreVersionCompare;

		this.statusType = ko.computed(function () {

			var
				sType = '',
				iVersionCompare = this.coreVersionCompare(),
				bChecking = this.coreChecking(),
				bUpdating = this.coreUpdating(),
				bReal = this.coreReal()
			;

			if (bChecking)
			{
				sType = 'checking';
			}
			else if (bUpdating)
			{
				sType = 'updating';
			}
			else if (bReal && 0 === iVersionCompare)
			{
				sType = 'up-to-date';
			}
			else if (bReal && -1 === iVersionCompare)
			{
				sType = 'available';
			}
			else if (!bReal)
			{
				sType = 'error';
				this.errorDesc('Cannot access the repository at the moment.');
			}

			return sType;

		}, this);
	}

	AdminSettingsAbout.prototype.onBuild = function ()
	{
		if (this.access())
		{
			require('../Boots/AdminApp.js').reloadCoreData();
		}
	};

	AdminSettingsAbout.prototype.updateCoreData = function ()
	{
		if (!this.coreUpdating())
		{
			require('../Boots/AdminApp.js').updateCoreData();
		}
	};

	module.exports = AdminSettingsAbout;

}(module));