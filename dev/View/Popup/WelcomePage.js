
(function () {

	'use strict';

	var
		_ = require('_'),
		ko = require('ko'),

		Promises = require('Promises/User/Ajax'),

		kn = require('Knoin/Knoin'),
		AbstractView = require('Knoin/AbstractView')
	;

	/**
	 * @constructor
	 * @extends AbstractView
	 */
	function WelcomePagePopupView()
	{
		AbstractView.call(this, 'Popups', 'PopupsWelcomePage');

		this.welcomePageURL = ko.observable('');

		this.closeFocused = ko.observable(false);

		kn.constructorEnd(this);
	}

	kn.extendAsViewModel(['View/Popup/WelcomePage', 'WelcomePagePopupViewModel'], WelcomePagePopupView);
	_.extend(WelcomePagePopupView.prototype, AbstractView.prototype);

	WelcomePagePopupView.prototype.clearPopup = function ()
	{
		this.welcomePageURL('');
		this.closeFocused(false);
	};

	/**
	 * @param {string} sUrl
	 */
	WelcomePagePopupView.prototype.onShow = function (sUrl)
	{
		this.clearPopup();

		this.welcomePageURL(sUrl);
	};

	WelcomePagePopupView.prototype.onShowWithDelay = function ()
	{
		this.closeFocused(true);
	};

	WelcomePagePopupView.prototype.onHide = function ()
	{
		Promises.welcomeClose();
	};

	module.exports = WelcomePagePopupView;

}());