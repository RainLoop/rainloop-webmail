/* RainLoop Webmail (c) RainLoop Team | Licensed under CC BY-NC-SA 3.0 */

(function (module) {

	'use strict';

	var
		$ = require('../External/jquery.js'),
		_ = require('../External/underscore.js'),
		ko = require('../External/ko.js'),
		hasher = require('../External/hasher.js'),
		crossroads = require('../External/crossroads.js'),
		$html = require('../External/$html.js'),
		Utils = require('../Common/Utils.js'),
		Globals = require('../Common/Globals.js'),
		Enums = require('../Common/Enums.js')
	;

	/**
	 * @constructor
	 */
	function Knoin()
	{
		this.sDefaultScreenName = '';
		this.oScreens = {};
		this.oBoot = null;
		this.oCurrentScreen = null;
	}

	/**
	 * @param {Object} thisObject
	 */
	Knoin.constructorEnd = function (thisObject)
	{
		if (Utils.isFunc(thisObject['__constructor_end']))
		{
			thisObject['__constructor_end'].call(thisObject);
		}
	};

	Knoin.prototype.sDefaultScreenName = '';
	Knoin.prototype.oScreens = {};
	Knoin.prototype.oBoot = null;
	Knoin.prototype.oCurrentScreen = null;

	Knoin.prototype.hideLoading = function ()
	{
		$('#rl-loading').hide();
	};

	Knoin.prototype.rl = function ()
	{
		return this.oBoot;
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
				oViewModel = new ViewModelClass(oScreen),
				sPosition = oViewModel.viewModelPosition(),
				oViewModelPlace = $('#rl-content #rl-' + sPosition.toLowerCase()),
				oViewModelDom = null
			;

			ViewModelClass.__builded = true;
			ViewModelClass.__vm = oViewModel;
			oViewModel.data = RL.data(); // TODO cjs

			oViewModel.viewModelName = ViewModelClass.__name;

			if (oViewModelPlace && 1 === oViewModelPlace.length)
			{
				oViewModelDom = $('<div></div>').addClass('rl-view-model').addClass('RL-' + oViewModel.viewModelTemplate()).hide();
				oViewModelDom.appendTo(oViewModelPlace);

				oViewModel.viewModelDom = oViewModelDom;
				ViewModelClass.__dom = oViewModelDom;

				if ('Popups' === sPosition)
				{
					oViewModel.cancelCommand = oViewModel.closeCommand = Utils.createCommand(oViewModel, function () {
						kn.hideScreenPopup(ViewModelClass); // TODO cjs
					});

					oViewModel.modalVisibility.subscribe(function (bValue) {

						var self = this;
						if (bValue)
						{
							this.viewModelDom.show();
							this.storeAndSetKeyScope();

							RL.popupVisibilityNames.push(this.viewModelName); // TODO cjs
							oViewModel.viewModelDom.css('z-index', 3000 + RL.popupVisibilityNames().length + 10); // TODO cjs

							Utils.delegateRun(this, 'onFocus', [], 500);
						}
						else
						{
							Utils.delegateRun(this, 'onHide');
							this.restoreKeyScope();

							RL.popupVisibilityNames.remove(this.viewModelName); // TODO cjs
							oViewModel.viewModelDom.css('z-index', 2000);

							Globals.tooltipTrigger(!Globals.tooltipTrigger());

							_.delay(function () {
								self.viewModelDom.hide();
							}, 300);
						}

					}, oViewModel);
				}

				Plugins.runHook('view-model-pre-build', [ViewModelClass.__name, oViewModel, oViewModelDom]); // TODO cjs

				ko.applyBindingAccessorsToNode(oViewModelDom[0], {
					'i18nInit': true,
					'template': function () { return {'name': oViewModel.viewModelTemplate()};}
				}, oViewModel);

				Utils.delegateRun(oViewModel, 'onBuild', [oViewModelDom]);
				if (oViewModel && 'Popups' === sPosition)
				{
					oViewModel.registerPopupKeyDown();
				}

				Plugins.runHook('view-model-post-build', [ViewModelClass.__name, oViewModel, oViewModelDom]); // TODO cjs
			}
			else
			{
				Utils.log('Cannot find view model position: ' + sPosition);
			}
		}

		return ViewModelClass ? ViewModelClass.__vm : null;
	};

	/**
	 * @param {Object} oViewModel
	 * @param {Object} oViewModelDom
	 */
	Knoin.prototype.applyExternal = function (oViewModel, oViewModelDom)
	{
		if (oViewModel && oViewModelDom)
		{
			ko.applyBindings(oViewModel, oViewModelDom);
		}
	};

	/**
	 * @param {Function} ViewModelClassToHide
	 */
	Knoin.prototype.hideScreenPopup = function (ViewModelClassToHide)
	{
		if (ViewModelClassToHide && ViewModelClassToHide.__vm && ViewModelClassToHide.__dom)
		{
			ViewModelClassToHide.__vm.modalVisibility(false);
			Plugins.runHook('view-model-on-hide', [ViewModelClassToHide.__name, ViewModelClassToHide.__vm]); // TODO cjs
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
				ViewModelClassToShow.__vm.modalVisibility(true);
				Utils.delegateRun(ViewModelClassToShow.__vm, 'onShow', aParameters || []);
				Plugins.runHook('view-model-on-show', [ViewModelClassToShow.__name, ViewModelClassToShow.__vm, aParameters || []]); // TODO cjs
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
					if (self.oCurrentScreen)
					{
						Utils.delegateRun(self.oCurrentScreen, 'onHide');

						if (Utils.isNonEmptyArray(self.oCurrentScreen.viewModels()))
						{
							_.each(self.oCurrentScreen.viewModels(), function (ViewModelClass) {

								if (ViewModelClass.__vm && ViewModelClass.__dom &&
									'Popups' !== ViewModelClass.__vm.viewModelPosition())
								{
									ViewModelClass.__dom.hide();
									ViewModelClass.__vm.viewModelVisibility(false);
									Utils.delegateRun(ViewModelClass.__vm, 'onHide');
								}

							});
						}
					}
					// --

					self.oCurrentScreen = oScreen;

					// show screen
					if (self.oCurrentScreen)
					{
						Utils.delegateRun(self.oCurrentScreen, 'onShow');

						Plugins.runHook('screen-on-show', [self.oCurrentScreen.screenName(), self.oCurrentScreen]); // TODO cjs

						if (Utils.isNonEmptyArray(self.oCurrentScreen.viewModels()))
						{
							_.each(self.oCurrentScreen.viewModels(), function (ViewModelClass) {

								if (ViewModelClass.__vm && ViewModelClass.__dom &&
									'Popups' !== ViewModelClass.__vm.viewModelPosition())
								{
									ViewModelClass.__dom.show();
									ViewModelClass.__vm.viewModelVisibility(true);
									Utils.delegateRun(ViewModelClass.__vm, 'onShow');
									Utils.delegateRun(ViewModelClass.__vm, 'onFocus', [], 200);

									Plugins.runHook('view-model-on-show', [ViewModelClass.__name, ViewModelClass.__vm]); // TODO cjs
								}

							}, self);
						}
					}
					// --

					oCross = oScreen.__cross();
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

			}, this);


		_.each(this.oScreens, function (oScreen) {
			if (oScreen && !oScreen.__started && oScreen.__start)
			{
				oScreen.__started = true;
				oScreen.__start();

				Plugins.runHook('screen-pre-start', [oScreen.screenName(), oScreen]); // TODO cjs
				Utils.delegateRun(oScreen, 'onStart');
				Plugins.runHook('screen-post-start', [oScreen.screenName(), oScreen]); // TODO cjs
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
			$html.removeClass('rl-started-trigger').addClass('rl-started');
		}, 50);
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

	/**
	 * @return {Knoin}
	 */
	Knoin.prototype.bootstart = function (RL)
	{
		this.oBoot = RL;
		
		var
			window = require('../External/window.js'),
			$window = require('../External/$window.js'),
			$html = require('../External/$html.js'),
			Plugins = require('../Common/Plugins.js'),
			EmailModel = require('../Models/EmailModel.js')
		;
	
		$html.addClass(Globals.bMobileDevice ? 'mobile' : 'no-mobile');

		$window.keydown(Utils.killCtrlAandS).keyup(Utils.killCtrlAandS);
		$window.unload(function () {
			Globals.bUnload = true;
		});

		$html.on('click.dropdown.data-api', function () {
			Utils.detectDropdownVisibility();
		});

		// export
		window['rl'] = window['rl'] || {};
		window['rl']['addHook'] = Plugins.addHook;
		window['rl']['settingsGet'] = Plugins.mainSettingsGet;
		window['rl']['remoteRequest'] = Plugins.remoteRequest;
		window['rl']['pluginSettingsGet'] = Plugins.settingsGet;
		window['rl']['addSettingsViewModel'] = Utils.addSettingsViewModel;
		window['rl']['createCommand'] = Utils.createCommand;

		window['rl']['EmailModel'] = EmailModel;
		window['rl']['Enums'] = Enums;

		window['__RLBOOT'] = function (fCall) {

			// boot
			$(function () {

				if (window['rainloopTEMPLATES'] && window['rainloopTEMPLATES'][0])
				{
					$('#rl-templates').html(window['rainloopTEMPLATES'][0]);

					_.delay(function () {
						
						RL.bootstart();

						$html.removeClass('no-js rl-booted-trigger').addClass('rl-booted');
					}, 50);
				}
				else
				{
					fCall(false);
				}

				window['__RLBOOT'] = null;
			});
		};
	};

	module.exports = new Knoin();

}(module));