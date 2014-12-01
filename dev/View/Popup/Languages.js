
(function () {

	'use strict';

	var
		_ = require('_'),
		ko = require('ko'),

		Utils = require('Common/Utils'),
		Globals = require('Common/Globals'),

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

		this.Data = Globals.__APP__.data(); // TODO

		this.exp = ko.observable(false);

		this.languages = ko.computed(function () {
			return _.map(this.Data.languages(), function (sLanguage) {
				return {
					'key': sLanguage,
					'selected': ko.observable(false),
					'fullName': Utils.convertLangName(sLanguage)
				};
			});
		}, this);

		this.Data.mainLanguage.subscribe(function () {
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
		var sCurrent = this.Data.mainLanguage();
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
		this.Data.mainLanguage(sLang);
		this.cancelCommand();
	};

	module.exports = LanguagesPopupView;

}());