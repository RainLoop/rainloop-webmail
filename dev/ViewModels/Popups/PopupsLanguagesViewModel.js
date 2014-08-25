/* RainLoop Webmail (c) RainLoop Team | Licensed under CC BY-NC-SA 3.0 */

(function (module, require) {

	'use strict';

	var
		_ = require('_'),
		ko = require('ko'),

		Utils = require('Utils'),

		Data = require('../../Storages/WebMailDataStorage.js'),

		kn = require('kn'),
		KnoinAbstractViewModel = require('KnoinAbstractViewModel')
	;

	/**
	 * @constructor
	 * @extends KnoinAbstractViewModel
	 */
	function PopupsLanguagesViewModel()
	{
		KnoinAbstractViewModel.call(this, 'Popups', 'PopupsLanguages');

		this.exp = ko.observable(false);

		this.languages = ko.computed(function () {
			return _.map(Data.languages(), function (sLanguage) {
				return {
					'key': sLanguage,
					'selected': ko.observable(false),
					'fullName': Utils.convertLangName(sLanguage)
				};
			});
		});

		Data.mainLanguage.subscribe(function () {
			this.resetMainLanguage();
		}, this);

		kn.constructorEnd(this);
	}

	kn.extendAsViewModel('PopupsLanguagesViewModel', PopupsLanguagesViewModel);

	PopupsLanguagesViewModel.prototype.languageEnName = function (sLanguage)
	{
		return Utils.convertLangName(sLanguage, true);
	};

	PopupsLanguagesViewModel.prototype.resetMainLanguage = function ()
	{
		var sCurrent = Data.mainLanguage();
		_.each(this.languages(), function (oItem) {
			oItem['selected'](oItem['key'] === sCurrent);
		});
	};

	PopupsLanguagesViewModel.prototype.onShow = function ()
	{
		this.exp(true);

		this.resetMainLanguage();
	};

	PopupsLanguagesViewModel.prototype.onHide = function ()
	{
		this.exp(false);
	};

	PopupsLanguagesViewModel.prototype.changeLanguage = function (sLang)
	{
		Data.mainLanguage(sLang);
		this.cancelCommand();
	};

	module.exports = PopupsLanguagesViewModel;

}(module, require));