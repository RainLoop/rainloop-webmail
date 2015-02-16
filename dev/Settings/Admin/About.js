
(function () {

	'use strict';

	var
		ko = require('ko'),

		Settings = require('Storage/Settings'),
		CoreStore = require('Stores/Admin/Core')
	;

	/**
	 * @constructor
	 */
	function AboutAdminSettings()
	{
		this.version = ko.observable(Settings.settingsGet('Version'));
		this.access = ko.observable(!!Settings.settingsGet('CoreAccess'));
		this.errorDesc = ko.observable('');

		this.coreReal = CoreStore.coreReal;
		this.coreChannel = CoreStore.coreChannel;
		this.coreType = CoreStore.coreType;
		this.coreUpdatable = CoreStore.coreUpdatable;
		this.coreAccess = CoreStore.coreAccess;
		this.coreChecking = CoreStore.coreChecking;
		this.coreUpdating = CoreStore.coreUpdating;
		this.coreWarning = CoreStore.coreWarning;
		this.coreVersion = CoreStore.coreVersion;
		this.coreRemoteVersion = CoreStore.coreRemoteVersion;
		this.coreRemoteRelease = CoreStore.coreRemoteRelease;
		this.coreVersionCompare = CoreStore.coreVersionCompare;

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

	AboutAdminSettings.prototype.onBuild = function ()
	{
		if (this.access())
		{
			require('App/Admin').reloadCoreData();
		}
	};

	AboutAdminSettings.prototype.updateCoreData = function ()
	{
		if (!this.coreUpdating())
		{
			require('App/Admin').updateCoreData();
		}
	};

	module.exports = AboutAdminSettings;

}());