/* RainLoop Webmail (c) RainLoop Team | Licensed under CC BY-NC-SA 3.0 */

/**
 * @param {Array} aViewModels
 * @constructor
 * @extends KnoinAbstractScreen
 */
function AbstractSettings(aViewModels)
{
	KnoinAbstractScreen.call(this, 'settings', aViewModels);
	
	this.menu = ko.observableArray([]);

	this.oCurrentSubScreen = null;
	this.oViewModelPlace = null;
}

_.extend(AbstractSettings.prototype, KnoinAbstractScreen.prototype);

AbstractSettings.prototype.onRoute = function (sSubName)
{
	var
		self = this,
		oSettingsScreen = null,
		RoutedSettingsViewModel = null,
		oViewModelPlace = null,
		oViewModelDom = null
	;

	RoutedSettingsViewModel = _.find(ViewModels['settings'], function (SettingsViewModel) {
		return SettingsViewModel && SettingsViewModel.__rlSettingsData &&
			sSubName === SettingsViewModel.__rlSettingsData.Route;
	});

	if (RoutedSettingsViewModel)
	{
		if (_.find(ViewModels['settings-removed'], function (DisabledSettingsViewModel) {
			return DisabledSettingsViewModel && DisabledSettingsViewModel === RoutedSettingsViewModel;
		}))
		{
			RoutedSettingsViewModel = null;
		}
		
		if (RoutedSettingsViewModel && _.find(ViewModels['settings-disabled'], function (DisabledSettingsViewModel) {
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
				RoutedSettingsViewModel = /** @type {?Function} */ RoutedSettingsViewModel;
				oSettingsScreen = new RoutedSettingsViewModel();

				oViewModelDom = $('<div></div>').addClass('rl-settings-view-model').hide().attr('data-bind',
					'template: {name: "' + RoutedSettingsViewModel.__rlSettingsData.Template + '"}, i18nInit: true');

				oViewModelDom.appendTo(oViewModelPlace);
				
				oSettingsScreen.data = RL.data();
				oSettingsScreen.viewModelDom = oViewModelDom;
				
				oSettingsScreen.__rlSettingsData = RoutedSettingsViewModel.__rlSettingsData;
				
				RoutedSettingsViewModel.__dom = oViewModelDom;
				RoutedSettingsViewModel.__builded = true;
				RoutedSettingsViewModel.__vm = oSettingsScreen;
				
				ko.applyBindings(oSettingsScreen, oViewModelDom[0]);
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
					self.oCurrentSubScreen.viewModelDom.show();
					Utils.delegateRun(self.oCurrentSubScreen, 'onShow');
					Utils.delegateRun(self.oCurrentSubScreen, 'onFocus', [], 200);

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
		kn.setHash(RL.link().settings(), false, true);
	}
};

AbstractSettings.prototype.onHide = function ()
{
	if (this.oCurrentSubScreen && this.oCurrentSubScreen.viewModelDom)
	{
		Utils.delegateRun(this.oCurrentSubScreen, 'onHide');
		this.oCurrentSubScreen.viewModelDom.hide();
	}
};

AbstractSettings.prototype.onBuild = function ()
{
	_.each(ViewModels['settings'], function (SettingsViewModel) {
		if (SettingsViewModel && SettingsViewModel.__rlSettingsData &&
			!_.find(ViewModels['settings-removed'], function (RemoveSettingsViewModel) {
				return RemoveSettingsViewModel && RemoveSettingsViewModel === SettingsViewModel;
			}))
		{
			this.menu.push({
				'route': SettingsViewModel.__rlSettingsData.Route,
				'label': SettingsViewModel.__rlSettingsData.Label,
				'selected': ko.observable(false),
				'disabled': !!_.find(ViewModels['settings-disabled'], function (DisabledSettingsViewModel) {
					return DisabledSettingsViewModel && DisabledSettingsViewModel === SettingsViewModel;
				})
			});
		}
	}, this);

	this.oViewModelPlace = $('#rl-content #rl-settings-subscreen');
};

AbstractSettings.prototype.routes = function ()
{
	var
		DefaultViewModel = _.find(ViewModels['settings'], function (SettingsViewModel) {
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
