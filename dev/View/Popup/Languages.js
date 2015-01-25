
(function () {

	'use strict';

	var
		_ = require('_'),
		ko = require('ko'),

		Utils = require('Common/Utils'),

		kn = require('Knoin/Knoin'),
		AbstractView = require('Knoin/AbstractView')
	;

	/**
	 * @constructor
	 * @extends AbstractView
	 */
	function LanguagesPopupView()
	{
		AbstractView.call(this, 'Popups', 'PopupsLanguages');

		this.UserSettingsStore = require('Stores/UserSettings');

		this.exp = ko.observable(false);

		this.languages = ko.computed(function () {
			return _.map(this.UserSettingsStore.languages(), function (sLanguage) {
				return {
					'key': sLanguage,
					'selected': ko.observable(false),
					'fullName': Utils.convertLangName(sLanguage)
				};
			});
		}, this);

		this.UserSettingsStore.language.subscribe(function () {
			this.resetMainLanguage();
		}, this);

		kn.constructorEnd(this);
	}

	kn.extendAsViewModel(['View/Popup/Languages', 'PopupsLanguagesViewModel'], LanguagesPopupView);
	_.extend(LanguagesPopupView.prototype, AbstractView.prototype);

	LanguagesPopupView.prototype.languageEnName = function (sLanguage)
	{
		var sResult = Utils.convertLangName(sLanguage, true);
		return 'English' === sResult ? '' : sResult;
	};

	LanguagesPopupView.prototype.resetMainLanguage = function ()
	{
		var sCurrent = this.UserSettingsStore.language();
		_.each(this.languages(), function (oItem) {
			oItem['selected'](oItem['key'] === sCurrent);
		});
	};

	LanguagesPopupView.prototype.onShow = function ()
	{
		this.exp(true);

		this.resetMainLanguage();
	};

	LanguagesPopupView.prototype.onHide = function ()
	{
		this.exp(false);
	};

	LanguagesPopupView.prototype.changeLanguage = function (sLang)
	{
		this.UserSettingsStore.language(sLang);
		this.cancelCommand();
	};

	module.exports = LanguagesPopupView;

}());