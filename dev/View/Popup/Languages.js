
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

		this.LanguageStore = require('Stores/Language');

		this.exp = ko.observable(false);

		this.languages = ko.computed(function () {
			return _.map(this.LanguageStore.languages(), function (sLanguage) {
				return {
					'key': sLanguage,
					'selected': ko.observable(false),
					'fullName': Utils.convertLangName(sLanguage)
				};
			});
		}, this);

		this.languagesTop = ko.computed(function () {

			var
				aTop = this.LanguageStore.languagesTop(),
				aLangs = this.languages()
			;

			return 0 < aTop.length ? _.compact(_.map(aTop, function (sLang) {
				return _.find(aLangs, function (aItem) {
					return aItem && sLang === aItem.key;
				});
			})) : [];
		}, this);

		this.languagesBottom = ko.computed(function () {

			var
				aTop = this.languagesTop(),
				aLangs = this.languages()
			;

			if (0 < aTop.length)
			{
				return _.filter(aLangs, function (aItem) {
					return -1 === Utils.inArray(aItem, aTop);
				});
			}

			return aLangs;

		}, this);

		this.LanguageStore.language.subscribe(function () {
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
		var sCurrent = this.LanguageStore.language();
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
		this.LanguageStore.language(sLang);
		this.cancelCommand();
	};

	module.exports = LanguagesPopupView;

}());