
import _ from '_';
import $ from '$';
import ko from 'ko';

import {aViewModels as VIEW_MODELS} from 'Common/Globals';
import {delegateRun, windowResize, log, isUnd, pString} from 'Common/Utils';
import {settings} from 'Common/Links';

import kn from 'Knoin/Knoin';
import {AbstractScreen} from 'Knoin/AbstractScreen';

class AbstractSettingsScreen extends AbstractScreen
{
	/**
	 * @param {Array} viewModels
	 */
	constructor(viewModels)
	{
		super('settings', viewModels);

		this.menu = ko.observableArray([]);

		this.oCurrentSubScreen = null;
		this.oViewModelPlace = null;

		this.setupSettings();
	}

	/**
	 * @param {Function=} fCallback
	 */
	setupSettings(fCallback = null) {
		if (fCallback)
		{
			fCallback();
		}
	}

	onRoute(sSubName) {
		var
			self = this,
			oSettingsScreen = null,
			RoutedSettingsViewModel = null,
			oViewModelPlace = null,
			oViewModelDom = null;

		RoutedSettingsViewModel = _.find(VIEW_MODELS.settings,
			(SettingsViewModel) => SettingsViewModel && SettingsViewModel.__rlSettingsData && sSubName === SettingsViewModel.__rlSettingsData.Route
		);

		if (RoutedSettingsViewModel)
		{
			if (_.find(VIEW_MODELS['settings-removed'], (DisabledSettingsViewModel) => DisabledSettingsViewModel && DisabledSettingsViewModel === RoutedSettingsViewModel))
			{
				RoutedSettingsViewModel = null;
			}

			if (RoutedSettingsViewModel && _.find(VIEW_MODELS['settings-disabled'],
				(DisabledSettingsViewModel) => DisabledSettingsViewModel && DisabledSettingsViewModel === RoutedSettingsViewModel))
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
						translatorInit: true,
						template: () => ({name: RoutedSettingsViewModel.__rlSettingsData.Template})
					}, oSettingsScreen);

					delegateRun(oSettingsScreen, 'onBuild', [oViewModelDom]);
				}
				else
				{
					log('Cannot find sub settings view model position: SettingsSubScreen');
				}
			}

			if (oSettingsScreen)
			{
				_.defer(function() {
					// hide
					if (self.oCurrentSubScreen)
					{
						delegateRun(self.oCurrentSubScreen, 'onHide');
						self.oCurrentSubScreen.viewModelDom.hide();
					}
					// --

					self.oCurrentSubScreen = oSettingsScreen;

					// show
					if (self.oCurrentSubScreen)
					{
						delegateRun(self.oCurrentSubScreen, 'onBeforeShow');
						self.oCurrentSubScreen.viewModelDom.show();
						delegateRun(self.oCurrentSubScreen, 'onShow');
						delegateRun(self.oCurrentSubScreen, 'onShowWithDelay', [], 200);

						_.each(self.menu(), (oItem) => {
							oItem.selected(oSettingsScreen && oSettingsScreen.__rlSettingsData && oItem.route === oSettingsScreen.__rlSettingsData.Route);
						});

						$('#rl-content .b-settings .b-content .content').scrollTop(0);
					}
					// --

					windowResize();
				});
			}
		}
		else
		{
			kn.setHash(settings(), false, true);
		}
	}

	onHide() {
		if (this.oCurrentSubScreen && this.oCurrentSubScreen.viewModelDom)
		{
			delegateRun(this.oCurrentSubScreen, 'onHide');
			this.oCurrentSubScreen.viewModelDom.hide();
		}
	}

	onBuild() {
		_.each(VIEW_MODELS.settings, (SettingsViewModel) => {
			if (SettingsViewModel && SettingsViewModel.__rlSettingsData && !_.find(VIEW_MODELS['settings-removed'],
				(RemoveSettingsViewModel) => RemoveSettingsViewModel && RemoveSettingsViewModel === SettingsViewModel))
			{
				this.menu.push({
					route: SettingsViewModel.__rlSettingsData.Route,
					label: SettingsViewModel.__rlSettingsData.Label,
					selected: ko.observable(false),
					disabled: !!_.find(VIEW_MODELS['settings-disabled'],
						(DisabledSettingsViewModel) => DisabledSettingsViewModel && DisabledSettingsViewModel === SettingsViewModel)
				});
			}
		});

		this.oViewModelPlace = $('#rl-content #rl-settings-subscreen');
	}

	routes() {
		var
			DefaultViewModel = _.find(VIEW_MODELS.settings,
				(SettingsViewModel) => SettingsViewModel && SettingsViewModel.__rlSettingsData && SettingsViewModel.__rlSettingsData.IsDefault),
			defaultRoute = DefaultViewModel && DefaultViewModel.__rlSettingsData ? DefaultViewModel.__rlSettingsData.Route : 'general',
			oRules = {
				subname: /^(.*)$/,
				normalize_: (oRequest, oVals) => {
					oVals.subname = isUnd(oVals.subname) ? defaultRoute : pString(oVals.subname);
					return [oVals.subname];
				}
			};

		return [
			['{subname}/', oRules],
			['{subname}', oRules],
			['', oRules]
		];
	}
}

export {AbstractSettingsScreen, AbstractSettingsScreen as default};
