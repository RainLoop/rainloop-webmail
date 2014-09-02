
(function (module, require) {

	'use strict';

	var
		_ = require('_'),
		ko = require('ko'),

		Enums = require('Enums'),
		Utils = require('Utils'),

		Settings = require('Storage:Settings'),
		Data = require('Storage:Admin:Data'),
		Remote = require('Storage:Admin:Remote'),

		kn = require('App:Knoin'),
		KnoinAbstractViewModel = require('Knoin:AbstractViewModel')
	;

	/**
	 * @constructor
	 * @extends KnoinAbstractViewModel
	 */
	function PopupsActivateViewModel()
	{
		KnoinAbstractViewModel.call(this, 'Popups', 'PopupsActivate');

		var self = this;

		this.domain = ko.observable('');
		this.key = ko.observable('');
		this.key.focus = ko.observable(false);
		this.activationSuccessed = ko.observable(false);

		this.licenseTrigger = Data.licenseTrigger;

		this.activateProcess = ko.observable(false);
		this.activateText = ko.observable('');
		this.activateText.isError = ko.observable(false);

		this.key.subscribe(function () {
			this.activateText('');
			this.activateText.isError(false);
		}, this);

		this.activationSuccessed.subscribe(function (bValue) {
			if (bValue)
			{
				this.licenseTrigger(!this.licenseTrigger());
			}
		}, this);

		this.activateCommand = Utils.createCommand(this, function () {

			this.activateProcess(true);
			if (this.validateSubscriptionKey())
			{
				Remote.licensingActivate(function (sResult, oData) {

					self.activateProcess(false);
					if (Enums.StorageResultType.Success === sResult && oData.Result)
					{
						if (true === oData.Result)
						{
							self.activationSuccessed(true);
							self.activateText('Subscription Key Activated Successfully');
							self.activateText.isError(false);
						}
						else
						{
							self.activateText(oData.Result);
							self.activateText.isError(true);
							self.key.focus(true);
						}
					}
					else if (oData.ErrorCode)
					{
						self.activateText(Utils.getNotification(oData.ErrorCode));
						self.activateText.isError(true);
						self.key.focus(true);
					}
					else
					{
						self.activateText(Utils.getNotification(Enums.Notification.UnknownError));
						self.activateText.isError(true);
						self.key.focus(true);
					}

				}, this.domain(), this.key());
			}
			else
			{
				this.activateProcess(false);
				this.activateText('Invalid Subscription Key');
				this.activateText.isError(true);
				this.key.focus(true);
			}

		}, function () {
			return !this.activateProcess() && '' !== this.domain() && '' !== this.key() && !this.activationSuccessed();
		});

		kn.constructorEnd(this);
	}

	kn.extendAsViewModel(['View:Popup:Activate', 'PopupsActivateViewModel'], PopupsActivateViewModel);
	_.extend(PopupsActivateViewModel.prototype, KnoinAbstractViewModel.prototype);

	PopupsActivateViewModel.prototype.onShow = function ()
	{
		this.domain(Settings.settingsGet('AdminDomain'));
		if (!this.activateProcess())
		{
			this.key('');
			this.activateText('');
			this.activateText.isError(false);
			this.activationSuccessed(false);
		}
	};

	PopupsActivateViewModel.prototype.onFocus = function ()
	{
		if (!this.activateProcess())
		{
			this.key.focus(true);
		}
	};

	/**
	 * @returns {boolean}
	 */
	PopupsActivateViewModel.prototype.validateSubscriptionKey = function ()
	{
		var sValue = this.key();
		return '' === sValue || !!/^RL[\d]+-[A-Z0-9\-]+Z$/.test(Utils.trim(sValue));
	};

	module.exports = PopupsActivateViewModel;

}(module, require));