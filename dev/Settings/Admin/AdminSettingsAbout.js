/* RainLoop Webmail (c) RainLoop Team | Licensed under CC BY-NC-SA 3.0 */

(function (module, require) {

	'use strict';
	
	var
		ko = require('ko')
	;

	/**
	 * @constructor
	 */
	function AdminSettingsAbout()
	{
		var
			Settings = require('Storage:Settings'),
			Data = require('Storage:Admin:Data')
		;

		this.version = ko.observable(Settings.settingsGet('Version'));
		this.access = ko.observable(!!Settings.settingsGet('CoreAccess'));
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
			require('App:Admin').reloadCoreData();
		}
	};

	AdminSettingsAbout.prototype.updateCoreData = function ()
	{
		if (!this.coreUpdating())
		{
			require('App:Admin').updateCoreData();
		}
	};

	module.exports = AdminSettingsAbout;

}(module, require));