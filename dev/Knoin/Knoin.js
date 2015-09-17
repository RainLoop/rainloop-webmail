
(function () {

	'use strict';

	var
		_ = require('_'),
		$ = require('$'),
		ko = require('ko'),
		hasher = require('hasher'),
		crossroads = require('crossroads'),

		Globals = require('Common/Globals'),
		Plugins = require('Common/Plugins'),
		Utils = require('Common/Utils')
	;

	/**
	 * @constructor
	 */
	function Knoin()
	{
		this.oScreens = {};
		this.sDefaultScreenName = '';
		this.oCurrentScreen = null;
	}

	Knoin.prototype.oScreens = {};
	Knoin.prototype.sDefaultScreenName = '';
	Knoin.prototype.oCurrentScreen = null;

	Knoin.prototype.hideLoading = function ()
	{
		$('#rl-content').show();
		$('#rl-loading').hide().remove();
	};

	/**
	 * @param {Object} thisObject
	 */
	Knoin.prototype.constructorEnd = function (thisObject)
	{
		if (Utils.isFunc(thisObject['__constructor_end']))
		{
			thisObject['__constructor_end'].call(thisObject);
		}
	};

	/**
	 * @param {string|Array} mName
	 * @param {Function} ViewModelClass
	 */
	Knoin.prototype.extendAsViewModel = function (mName, ViewModelClass)
	{
		if (ViewModelClass)
		{
			if (Utils.isArray(mName))
			{
				ViewModelClass.__names = mName;
			}
			else
			{
				ViewModelClass.__names = [mName];
			}

			ViewModelClass.__name = ViewModelClass.__names[0];
		}
	};

	/**
	 * @param {Function} SettingsViewModelClass
	 * @param {string} sLabelName
	 * @param {string} sTemplate
	 * @param {string} sRoute
	 * @param {boolean=} bDefault
	 */
	Knoin.prototype.addSettingsViewModel = function (SettingsViewModelClass, sTemplate, sLabelName, sRoute, bDefault)
	{
		SettingsViewModelClass.__rlSettingsData = {
			'Label':  sLabelName,
			'Template':  sTemplate,
			'Route':  sRoute,
			'IsDefault':  !!bDefault
		};

		Globals.aViewModels['settings'].push(SettingsViewModelClass);
	};

	/**
	 * @param {Function} SettingsViewModelClass
	 */
	Knoin.prototype.removeSettingsViewModel = function (SettingsViewModelClass)
	{
		Globals.aViewModels['settings-removed'].push(SettingsViewModelClass);
	};

	/**
	 * @param {Function} SettingsViewModelClass
	 */
	Knoin.prototype.disableSettingsViewModel = function (SettingsViewModelClass)
	{
		Globals.aViewModels['settings-disabled'].push(SettingsViewModelClass);
	};

	Knoin.prototype.routeOff = function ()
	{
		hasher.changed.active = false;
	};

	Knoin.prototype.routeOn = function ()
	{
		hasher.changed.active = true;
	};

	/**
	 * @param {string} sScreenName
	 * @return {?Object}
	 */
	Knoin.prototype.screen = function (sScreenName)
	{
		return ('' !== sScreenName && !Utils.isUnd(this.oScreens[sScreenName])) ? this.oScreens[sScreenName] : null;
	};

	/**
	 * @param {Function} ViewModelClass
	 * @param {Object=} oScreen
	 */
	Knoin.prototype.buildViewModel = function (ViewModelClass, oScreen)
	{
		if (ViewModelClass && !ViewModelClass.__builded)
		{
			var
				kn = this,
				oViewModel = new ViewModelClass(oScreen),
				sPosition = oViewModel.viewModelPosition(),
				oViewModelPlace = $('#rl-content #rl-' + sPosition.toLowerCase()),
				oViewModelDom = null
			;

			ViewModelClass.__builded = true;
			ViewModelClass.__vm = oViewModel;

			oViewModel.onShowTrigger = ko.observable(false);
			oViewModel.onHideTrigger = ko.observable(false);

			oViewModel.viewModelName = ViewModelClass.__name;
			oViewModel.viewModelNames = ViewModelClass.__names;

			if (oViewModelPlace && 1 === oViewModelPlace.length)
			{
				oViewModelDom = $('<div></div>').addClass('rl-view-model').addClass('RL-' + oViewModel.viewModelTemplate()).hide();
				oViewModelDom.appendTo(oViewModelPlace);

				oViewModel.viewModelDom = oViewModelDom;
				ViewModelClass.__dom = oViewModelDom;

				if ('Popups' === sPosition)
				{
					oViewModel.cancelCommand = oViewModel.closeCommand = Utils.createCommand(oViewModel, function () {
						kn.hideScreenPopup(ViewModelClass);
					});

					oViewModel.modalVisibility.subscribe(function (bValue) {

						var self = this;
						if (bValue)
						{
							this.viewModelDom.show();
							this.storeAndSetKeyScope();

							Globals.popupVisibilityNames.push(this.viewModelName);
							oViewModel.viewModelDom.css('z-index', 3000 + Globals.popupVisibilityNames().length + 10);

							if (this.onShowTrigger)
							{
								this.onShowTrigger(!this.onShowTrigger());
							}

							Utils.delegateRun(this, 'onShowWithDelay', [], 500);
						}
						else
						{
							Utils.delegateRun(this, 'onHide');
							Utils.delegateRun(this, 'onHideWithDelay', [], 500);

							if (this.onHideTrigger)
							{
								this.onHideTrigger(!this.onHideTrigger());
							}

							this.restoreKeyScope();

							_.each(this.viewModelNames, function (sName) {
								Plugins.runHook('view-model-on-hide', [sName, self]);
							});

							Globals.popupVisibilityNames.remove(this.viewModelName);
							oViewModel.viewModelDom.css('z-index', 2000);

							_.delay(function () {
								self.viewModelDom.hide();
							}, 300);
						}

					}, oViewModel);
				}

				_.each(ViewModelClass.__names, function (sName) {
					Plugins.runHook('view-model-pre-build', [sName, oViewModel, oViewModelDom]);
				});

				ko.applyBindingAccessorsToNode(oViewModelDom[0], {
					'translatorInit': true,
					'template': function () { return {'name': oViewModel.viewModelTemplate()};}
				}, oViewModel);

				Utils.delegateRun(oViewModel, 'onBuild', [oViewModelDom]);
				if (oViewModel && 'Popups' === sPosition)
				{
					oViewModel.registerPopupKeyDown();
				}

				_.each(ViewModelClass.__names, function (sName) {
					Plugins.runHook('view-model-post-build', [sName, oViewModel, oViewModelDom]);
				});
			}
			else
			{
				Utils.log('Cannot find view model position: ' + sPosition);
			}
		}

		return ViewModelClass ? ViewModelClass.__vm : null;
	};

	/**
	 * @param {Function} ViewModelClassToHide
	 */
	Knoin.prototype.hideScreenPopup = function (ViewModelClassToHide)
	{
		if (ViewModelClassToHide && ViewModelClassToHide.__vm && ViewModelClassToHide.__dom)
		{
			ViewModelClassToHide.__vm.modalVisibility(false);
		}
	};

	/**
	 * @param {Function} ViewModelClassToShow
	 * @param {Array=} aParameters
	 */
	Knoin.prototype.showScreenPopup = function (ViewModelClassToShow, aParameters)
	{
		if (ViewModelClassToShow)
		{
			this.buildViewModel(ViewModelClassToShow);

			if (ViewModelClassToShow.__vm && ViewModelClassToShow.__dom)
			{
				Utils.delegateRun(ViewModelClassToShow.__vm, 'onBeforeShow', aParameters || []);

				ViewModelClassToShow.__vm.modalVisibility(true);

				Utils.delegateRun(ViewModelClassToShow.__vm, 'onShow', aParameters || []);

				_.each(ViewModelClassToShow.__names, function (sName) {
					Plugins.runHook('view-model-on-show', [sName, ViewModelClassToShow.__vm, aParameters || []]);
				});
			}
		}
	};

	/**
	 * @param {Function} ViewModelClassToShow
	 * @return {boolean}
	 */
	Knoin.prototype.isPopupVisible = function (ViewModelClassToShow)
	{
		return ViewModelClassToShow && ViewModelClassToShow.__vm ? ViewModelClassToShow.__vm.modalVisibility() : false;
	};

	/**
	 * @param {string} sScreenName
	 * @param {string} sSubPart
	 */
	Knoin.prototype.screenOnRoute = function (sScreenName, sSubPart)
	{
		var
			self = this,
			oScreen = null,
			bSameScreen= false,
			oCross = null
		;

		if ('' === Utils.pString(sScreenName))
		{
			sScreenName = this.sDefaultScreenName;
		}

		if ('' !== sScreenName)
		{
			oScreen = this.screen(sScreenName);
			if (!oScreen)
			{
				oScreen = this.screen(this.sDefaultScreenName);
				if (oScreen)
				{
					sSubPart = sScreenName + '/' + sSubPart;
					sScreenName = this.sDefaultScreenName;
				}
			}

			if (oScreen && oScreen.__started)
			{
				bSameScreen = this.oCurrentScreen && oScreen === this.oCurrentScreen;

				if (!oScreen.__builded)
				{
					oScreen.__builded = true;

					if (Utils.isNonEmptyArray(oScreen.viewModels()))
					{
						_.each(oScreen.viewModels(), function (ViewModelClass) {
							this.buildViewModel(ViewModelClass, oScreen);
						}, this);
					}

					Utils.delegateRun(oScreen, 'onBuild');
				}

				_.defer(function () {

					// hide screen
					if (self.oCurrentScreen && !bSameScreen)
					{
						Utils.delegateRun(self.oCurrentScreen, 'onHide');
						Utils.delegateRun(self.oCurrentScreen, 'onHideWithDelay', [], 500);

						if (self.oCurrentScreen.onHideTrigger)
						{
							self.oCurrentScreen.onHideTrigger(!self.oCurrentScreen.onHideTrigger());
						}

						if (Utils.isNonEmptyArray(self.oCurrentScreen.viewModels()))
						{
							_.each(self.oCurrentScreen.viewModels(), function (ViewModelClass) {

								if (ViewModelClass.__vm && ViewModelClass.__dom &&
									'Popups' !== ViewModelClass.__vm.viewModelPosition())
								{
									ViewModelClass.__dom.hide();
									ViewModelClass.__vm.viewModelVisibility(false);

									Utils.delegateRun(ViewModelClass.__vm, 'onHide');
									Utils.delegateRun(ViewModelClass.__vm, 'onHideWithDelay', [], 500);

									if (ViewModelClass.__vm.onHideTrigger)
									{
										ViewModelClass.__vm.onHideTrigger(!ViewModelClass.__vm.onHideTrigger());
									}
								}

							});
						}
					}
					// --

					self.oCurrentScreen = oScreen;

					// show screen
					if (self.oCurrentScreen && !bSameScreen)
					{
						Utils.delegateRun(self.oCurrentScreen, 'onShow');
						if (self.oCurrentScreen.onShowTrigger)
						{
							self.oCurrentScreen.onShowTrigger(!self.oCurrentScreen.onShowTrigger());
						}

						Plugins.runHook('screen-on-show', [self.oCurrentScreen.screenName(), self.oCurrentScreen]);

						if (Utils.isNonEmptyArray(self.oCurrentScreen.viewModels()))
						{
							_.each(self.oCurrentScreen.viewModels(), function (ViewModelClass) {

								if (ViewModelClass.__vm && ViewModelClass.__dom &&
									'Popups' !== ViewModelClass.__vm.viewModelPosition())
								{
									Utils.delegateRun(ViewModelClass.__vm, 'onBeforeShow');

									ViewModelClass.__dom.show();
									ViewModelClass.__vm.viewModelVisibility(true);

									Utils.delegateRun(ViewModelClass.__vm, 'onShow');
									if (ViewModelClass.__vm.onShowTrigger)
									{
										ViewModelClass.__vm.onShowTrigger(!ViewModelClass.__vm.onShowTrigger());
									}

									Utils.delegateRun(ViewModelClass.__vm, 'onShowWithDelay', [], 200);

									_.each(ViewModelClass.__names, function (sName) {
										Plugins.runHook('view-model-on-show', [sName, ViewModelClass.__vm]);
									});
								}

							}, self);
						}
					}
					// --

					oCross = oScreen.__cross ? oScreen.__cross() : null;
					if (oCross)
					{
						oCross.parse(sSubPart);
					}
				});
			}
		}
	};

	/**
	 * @param {Array} aScreensClasses
	 */
	Knoin.prototype.startScreens = function (aScreensClasses)
	{
		$('#rl-content').css({
			'visibility': 'hidden'
		});

		_.each(aScreensClasses, function (CScreen) {

				if (CScreen)
				{
					var
						oScreen = new CScreen(),
						sScreenName = oScreen ? oScreen.screenName() : ''
					;

					if (oScreen && '' !== sScreenName)
					{
						if ('' === this.sDefaultScreenName)
						{
							this.sDefaultScreenName = sScreenName;
						}

						this.oScreens[sScreenName] = oScreen;
					}
				}

			}, this);


		_.each(this.oScreens, function (oScreen) {
			if (oScreen && !oScreen.__started && oScreen.__start)
			{
				oScreen.__started = true;
				oScreen.__start();

				Plugins.runHook('screen-pre-start', [oScreen.screenName(), oScreen]);
				Utils.delegateRun(oScreen, 'onStart');
				Plugins.runHook('screen-post-start', [oScreen.screenName(), oScreen]);
			}
		}, this);

		var oCross = crossroads.create();
		oCross.addRoute(/^([a-zA-Z0-9\-]*)\/?(.*)$/, _.bind(this.screenOnRoute, this));

		hasher.initialized.add(oCross.parse, oCross);
		hasher.changed.add(oCross.parse, oCross);
		hasher.init();

		$('#rl-content').css({
			'visibility': 'visible'
		});

		_.delay(function () {
			Globals.$html.removeClass('rl-started-trigger').addClass('rl-started');
		}, 100);

		_.delay(function () {
			Globals.$html.addClass('rl-started-delay');
		}, 200);
	};

	/**
	 * @param {string} sHash
	 * @param {boolean=} bSilence = false
	 * @param {boolean=} bReplace = false
	 */
	Knoin.prototype.setHash = function (sHash, bSilence, bReplace)
	{
		sHash = '#' === sHash.substr(0, 1) ? sHash.substr(1) : sHash;
		sHash = '/' === sHash.substr(0, 1) ? sHash.substr(1) : sHash;

		bReplace = Utils.isUnd(bReplace) ? false : !!bReplace;

		if (Utils.isUnd(bSilence) ? false : !!bSilence)
		{
			hasher.changed.active = false;
			hasher[bReplace ? 'replaceHash' : 'setHash'](sHash);
			hasher.changed.active = true;
		}
		else
		{
			hasher.changed.active = true;
			hasher[bReplace ? 'replaceHash' : 'setHash'](sHash);
			hasher.setHash(sHash);
		}
	};

	module.exports = new Knoin();

}());