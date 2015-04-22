
(function () {

	'use strict';

	var
		_ = require('_'),
		$ = require('$'),
		ko = require('ko'),

		Globals = require('Common/Globals'),
		Utils = require('Common/Utils'),
		Links = require('Common/Links'),

		kn = require('Knoin/Knoin'),
		AbstractScreen = require('Knoin/AbstractScreen')
	;

	/**
	 * @constructor
	 * @param {Array} aViewModels
	 * @extends AbstractScreen
	 */
	function AbstractSettingsScreen(aViewModels)
	{
		AbstractScreen.call(this, 'settings', aViewModels);

		this.menu = ko.observableArray([]);

		this.oCurrentSubScreen = null;
		this.oViewModelPlace = null;

		this.setupSettings();
	}

	_.extend(AbstractSettingsScreen.prototype, AbstractScreen.prototype);

	/**
	 * @param {Function=} fCallback
	 */
	AbstractSettingsScreen.prototype.setupSettings = function (fCallback)
	{
		if (fCallback)
		{
			fCallback();
		}
	};

	AbstractSettingsScreen.prototype.onRoute = function (sSubName)
	{
		var
			self = this,
			oSettingsScreen = null,
			RoutedSettingsViewModel = null,
			oViewModelPlace = null,
			oViewModelDom = null
		;

		RoutedSettingsViewModel = _.find(Globals.aViewModels['settings'], function (SettingsViewModel) {
			return SettingsViewModel && SettingsViewModel.__rlSettingsData &&
				sSubName === SettingsViewModel.__rlSettingsData.Route;
		});

		if (RoutedSettingsViewModel)
		{
			if (_.find(Globals.aViewModels['settings-removed'], function (DisabledSettingsViewModel) {
				return DisabledSettingsViewModel && DisabledSettingsViewModel === RoutedSettingsViewModel;
			}))
			{
				RoutedSettingsViewModel = null;
			}

			if (RoutedSettingsViewModel && _.find(Globals.aViewModels['settings-disabled'], function (DisabledSettingsViewModel) {
				return DisabledSettingsViewModel && DisabledSettingsViewModel === RoutedSettingsViewModel;
			}))
			{
				RoutedSettingsViewModel = null;
			}
		}

		if (RoutedSettingsViewModel)
		{
			if (RoutedSettingsViewModel.__builded && RoutedSettingsViewModel.__vm)
			{
				oSettingsScreen = RoutedSettingsViewModel.__vm;
			}
			else
			{
				oViewModelPlace = this.oViewModelPlace;
				if (oViewModelPlace && 1 === oViewModelPlace.length)
				{
					oSettingsScreen = new RoutedSettingsViewModel();

					oViewModelDom = $('<div></div>').addClass('rl-settings-view-model').hide();
					oViewModelDom.appendTo(oViewModelPlace);

					oSettingsScreen.viewModelDom = oViewModelDom;

					oSettingsScreen.__rlSettingsData = RoutedSettingsViewModel.__rlSettingsData;

					RoutedSettingsViewModel.__dom = oViewModelDom;
					RoutedSettingsViewModel.__builded = true;
					RoutedSettingsViewModel.__vm = oSettingsScreen;

					ko.applyBindingAccessorsToNode(oViewModelDom[0], {
						'translatorInit': true,
						'template': function () { return {'name': RoutedSettingsViewModel.__rlSettingsData.Template}; }
					}, oSettingsScreen);

					Utils.delegateRun(oSettingsScreen, 'onBuild', [oViewModelDom]);
				}
				else
				{
					Utils.log('Cannot find sub settings view model position: SettingsSubScreen');
				}
			}

			if (oSettingsScreen)
			{
				_.defer(function () {
					// hide
					if (self.oCurrentSubScreen)
					{
						Utils.delegateRun(self.oCurrentSubScreen, 'onHide');
						self.oCurrentSubScreen.viewModelDom.hide();
					}
					// --

					self.oCurrentSubScreen = oSettingsScreen;

					// show
					if (self.oCurrentSubScreen)
					{
						Utils.delegateRun(self.oCurrentSubScreen, 'onBeforeShow');
						self.oCurrentSubScreen.viewModelDom.show();
						Utils.delegateRun(self.oCurrentSubScreen, 'onShow');
						Utils.delegateRun(self.oCurrentSubScreen, 'onShowWithDelay', [], 200);

						_.each(self.menu(), function (oItem) {
							oItem.selected(oSettingsScreen && oSettingsScreen.__rlSettingsData && oItem.route === oSettingsScreen.__rlSettingsData.Route);
						});

						$('#rl-content .b-settings .b-content .content').scrollTop(0);
					}
					// --

					Utils.windowResize();
				});
			}
		}
		else
		{
			kn.setHash(Links.settings(), false, true);
		}
	};

	AbstractSettingsScreen.prototype.onHide = function ()
	{
		if (this.oCurrentSubScreen && this.oCurrentSubScreen.viewModelDom)
		{
			Utils.delegateRun(this.oCurrentSubScreen, 'onHide');
			this.oCurrentSubScreen.viewModelDom.hide();
		}
	};

	AbstractSettingsScreen.prototype.onBuild = function ()
	{
		_.each(Globals.aViewModels['settings'], function (SettingsViewModel) {
			if (SettingsViewModel && SettingsViewModel.__rlSettingsData &&
				!_.find(Globals.aViewModels['settings-removed'], function (RemoveSettingsViewModel) {
					return RemoveSettingsViewModel && RemoveSettingsViewModel === SettingsViewModel;
				}))
			{
				this.menu.push({
					'route': SettingsViewModel.__rlSettingsData.Route,
					'label': SettingsViewModel.__rlSettingsData.Label,
					'selected': ko.observable(false),
					'disabled': !!_.find(Globals.aViewModels['settings-disabled'], function (DisabledSettingsViewModel) {
						return DisabledSettingsViewModel && DisabledSettingsViewModel === SettingsViewModel;
					})
				});
			}
		}, this);

		this.oViewModelPlace = $('#rl-content #rl-settings-subscreen');
	};

	AbstractSettingsScreen.prototype.routes = function ()
	{
		var
			DefaultViewModel = _.find(Globals.aViewModels['settings'], function (SettingsViewModel) {
				return SettingsViewModel && SettingsViewModel.__rlSettingsData && SettingsViewModel.__rlSettingsData['IsDefault'];
			}),
			sDefaultRoute = DefaultViewModel ? DefaultViewModel.__rlSettingsData['Route'] : 'general',
			oRules = {
				'subname': /^(.*)$/,
				'normalize_': function (oRequest, oVals) {
					oVals.subname = Utils.isUnd(oVals.subname) ? sDefaultRoute : Utils.pString(oVals.subname);
					return [oVals.subname];
				}
			}
		;

		return [
			['{subname}/', oRules],
			['{subname}', oRules],
			['', oRules]
		];
	};

	module.exports = AbstractSettingsScreen;

}());