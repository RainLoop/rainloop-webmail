/* RainLoop Webmail (c) RainLoop Team | Licensed under CC BY-NC-SA 3.0 */

/**
 * @constructor
 */
function Knoin()
{
	this.sDefaultScreenName = '';
	this.oScreens = {};
	this.oBoot = null;
	this.oCurrentScreen = null;

	this.popupVisibility = ko.observable(false);
	
	this.popupVisibility.subscribe(function (bValue) {
		if (RL)
		{
			RL.popupVisibility(bValue);
		}
	});
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

Knoin.prototype.routeOff = function ()
{
	hasher.changed.active = false;
};

Knoin.prototype.routeOn = function ()
{
	hasher.changed.active = true;
};

/**
 * @param {Object} oBoot
 * @return {Knoin}
 */
Knoin.prototype.setBoot = function (oBoot)
{
	if (Utils.isNormal(oBoot))
	{
		this.oBoot = oBoot;
	}

	return this;
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
		oViewModel.data = RL.data();
		
		oViewModel.viewModelName = ViewModelClass.__name;

		if (oViewModelPlace && 1 === oViewModelPlace.length)
		{
			oViewModelDom = $('<div>').addClass('rl-view-model').addClass('RL-' + oViewModel.viewModelTemplate()).hide().attr('data-bind',
				'template: {name: "' + oViewModel.viewModelTemplate() + '"}, i18nInit: true');

			oViewModelDom.appendTo(oViewModelPlace);
			oViewModel.viewModelDom = oViewModelDom;
			ViewModelClass.__dom = oViewModelDom;

			if ('Popups' === sPosition)
			{
				oViewModel.cancelCommand = oViewModel.closeCommand = Utils.createCommand(oViewModel, function () {
					kn.hideScreenPopup(ViewModelClass);
				});
			}
		
			Plugins.runHook('view-model-pre-build', [ViewModelClass.__name, oViewModel, oViewModelDom]);

			ko.applyBindings(oViewModel, oViewModelDom[0]);
			Utils.delegateRun(oViewModel, 'onBuild', [oViewModelDom]);
			if (oViewModel && 'Popups' === sPosition && !oViewModel.bDisabeCloseOnEsc)
			{
				oViewModel.registerPopupEscapeKey();
			}
			
			Plugins.runHook('view-model-post-build', [ViewModelClass.__name, oViewModel, oViewModelDom]);
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
		Utils.delegateRun(ViewModelClassToHide.__vm, 'onHide');
		this.popupVisibility(false);

		Plugins.runHook('view-model-on-hide', [ViewModelClassToHide.__name, ViewModelClassToHide.__vm]);
		
		_.delay(function () {
			ViewModelClassToHide.__dom.hide();
		}, 300);
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
			ViewModelClassToShow.__dom.show();
			ViewModelClassToShow.__vm.modalVisibility(true);
			Utils.delegateRun(ViewModelClassToShow.__vm, 'onShow', aParameters || []);
			this.popupVisibility(true);
			
			Plugins.runHook('view-model-on-show', [ViewModelClassToShow.__name, ViewModelClassToShow.__vm, aParameters || []]);

			Utils.delegateRun(ViewModelClassToShow.__vm, 'onFocus', [], 500);
		}
	}
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

					Plugins.runHook('screen-on-show', [self.oCurrentScreen.screenName(), self.oCurrentScreen]);

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

								Plugins.runHook('view-model-on-show', [ViewModelClass.__name, ViewModelClass.__vm]);
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
Knoin.prototype.bootstart = function ()
{
	if (this.oBoot && this.oBoot.bootstart)
	{
		this.oBoot.bootstart();
	}

	return this;
};

kn = new Knoin();
