
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

		var self = this;

		this.fLang = null;
		this.userLanguage = ko.observable('');

		this.langs = ko.observableArray([]);

		this.languages = ko.computed(function () {
			var sUserLanguage = self.userLanguage();
			return _.map(self.langs(), function (sLanguage) {
				return {
					'key': sLanguage,
					'user': sLanguage === sUserLanguage,
					'selected': ko.observable(false),
					'fullName': Utils.convertLangName(sLanguage)
				};
			});
		});

		this.langs.subscribe(function () {
			this.setLanguageSelection();
		}, this);

		kn.constructorEnd(this);
	}

	kn.extendAsViewModel(['View/Popup/Languages', 'PopupsLanguagesViewModel'], LanguagesPopupView);
	_.extend(LanguagesPopupView.prototype, AbstractView.prototype);

	LanguagesPopupView.prototype.languageTooltipName = function (sLanguage)
	{
		var sResult = Utils.convertLangName(sLanguage, true);
		return Utils.convertLangName(sLanguage, false) === sResult ? '' : sResult;
	};

	LanguagesPopupView.prototype.setLanguageSelection = function ()
	{
		var sCurrent = this.fLang ? ko.unwrap(this.fLang) : '';
		_.each(this.languages(), function (oItem) {
			oItem['selected'](oItem['key'] === sCurrent);
		});
	};

	LanguagesPopupView.prototype.onBeforeShow = function ()
	{
		this.fLang = null;
		this.userLanguage('');

		this.langs([]);
	};

	LanguagesPopupView.prototype.onShow = function (fLanguage, aLangs, sUserLanguage)
	{
		this.fLang = fLanguage;
		this.userLanguage(sUserLanguage || '');

		this.langs(aLangs);
	};

	LanguagesPopupView.prototype.changeLanguage = function (sLang)
	{
		if (this.fLang)
		{
			this.fLang(sLang);
		}

		this.cancelCommand();
	};

	module.exports = LanguagesPopupView;

}());