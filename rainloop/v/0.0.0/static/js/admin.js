/* RainLoop Webmail (c) RainLoop Team | Licensed under CC BY-NC-SA 3.0 */
webpackJsonp([2],{

/***/ 0:
/*!**********************!*\
  !*** ./dev/Admin.js ***!
  \**********************/
/***/ function(module, exports, __webpack_require__) {

	var require;(function (require) {
		'use strict';
		__webpack_require__(/*! App:Boot */ 35)(__webpack_require__(/*! App:Admin */ 16));
	}(require));

/***/ },

/***/ 15:
/*!********************************************!*\
  !*** ./dev/Storages/AdminRemoteStorage.js ***!
  \********************************************/
/***/ function(module, exports, __webpack_require__) {

	/* RainLoop Webmail (c) RainLoop Team | Licensed under CC BY-NC-SA 3.0 */

	(function () {
		
		'use strict';

		var
			_ = __webpack_require__(/*! _ */ 2),

			AbstractRemoteStorage = __webpack_require__(/*! Storage:Abstract:Remote */ 40)
		;

		/**
		 * @constructor
		 * @extends AbstractRemoteStorage
		 */
		function AdminRemoteStorage()
		{
			AbstractRemoteStorage.call(this);

			this.oRequests = {};
		}

		_.extend(AdminRemoteStorage.prototype, AbstractRemoteStorage.prototype);

		/**
		 * @param {?Function} fCallback
		 * @param {string} sLogin
		 * @param {string} sPassword
		 */
		AdminRemoteStorage.prototype.adminLogin = function (fCallback, sLogin, sPassword)
		{
			this.defaultRequest(fCallback, 'AdminLogin', {
				'Login': sLogin,
				'Password': sPassword
			});
		};

		/**
		 * @param {?Function} fCallback
		 */
		AdminRemoteStorage.prototype.adminLogout = function (fCallback)
		{
			this.defaultRequest(fCallback, 'AdminLogout');
		};

		/**
		 * @param {?Function} fCallback
		 * @param {?} oData
		 */
		AdminRemoteStorage.prototype.saveAdminConfig = function (fCallback, oData)
		{
			this.defaultRequest(fCallback, 'AdminSettingsUpdate', oData);
		};

		/**
		 * @param {?Function} fCallback
		 */
		AdminRemoteStorage.prototype.domainList = function (fCallback)
		{
			this.defaultRequest(fCallback, 'AdminDomainList');
		};

		/**
		 * @param {?Function} fCallback
		 */
		AdminRemoteStorage.prototype.pluginList = function (fCallback)
		{
			this.defaultRequest(fCallback, 'AdminPluginList');
		};

		/**
		 * @param {?Function} fCallback
		 */
		AdminRemoteStorage.prototype.packagesList = function (fCallback)
		{
			this.defaultRequest(fCallback, 'AdminPackagesList');
		};

		/**
		 * @param {?Function} fCallback
		 */
		AdminRemoteStorage.prototype.coreData = function (fCallback)
		{
			this.defaultRequest(fCallback, 'AdminCoreData');
		};

		/**
		 * @param {?Function} fCallback
		 */
		AdminRemoteStorage.prototype.updateCoreData = function (fCallback)
		{
			this.defaultRequest(fCallback, 'AdminUpdateCoreData', {}, 90000);
		};

		/**
		 * @param {?Function} fCallback
		 * @param {Object} oPackage
		 */
		AdminRemoteStorage.prototype.packageInstall = function (fCallback, oPackage)
		{
			this.defaultRequest(fCallback, 'AdminPackageInstall', {
				'Id': oPackage.id,
				'Type': oPackage.type,
				'File': oPackage.file
			}, 60000);
		};

		/**
		 * @param {?Function} fCallback
		 * @param {Object} oPackage
		 */
		AdminRemoteStorage.prototype.packageDelete = function (fCallback, oPackage)
		{
			this.defaultRequest(fCallback, 'AdminPackageDelete', {
				'Id': oPackage.id
			});
		};

		/**
		 * @param {?Function} fCallback
		 * @param {string} sName
		 */
		AdminRemoteStorage.prototype.domain = function (fCallback, sName)
		{
			this.defaultRequest(fCallback, 'AdminDomainLoad', {
				'Name': sName
			});
		};

		/**
		 * @param {?Function} fCallback
		 * @param {string} sName
		 */
		AdminRemoteStorage.prototype.plugin = function (fCallback, sName)
		{
			this.defaultRequest(fCallback, 'AdminPluginLoad', {
				'Name': sName
			});
		};

		/**
		 * @param {?Function} fCallback
		 * @param {string} sName
		 */
		AdminRemoteStorage.prototype.domainDelete = function (fCallback, sName)
		{
			this.defaultRequest(fCallback, 'AdminDomainDelete', {
				'Name': sName
			});
		};

		/**
		 * @param {?Function} fCallback
		 * @param {string} sName
		 * @param {boolean} bDisabled
		 */
		AdminRemoteStorage.prototype.domainDisable = function (fCallback, sName, bDisabled)
		{
			return this.defaultRequest(fCallback, 'AdminDomainDisable', {
				'Name': sName,
				'Disabled': !!bDisabled ? '1' : '0'
			});
		};

		/**
		 * @param {?Function} fCallback
		 * @param {Object} oConfig
		 */
		AdminRemoteStorage.prototype.pluginSettingsUpdate = function (fCallback, oConfig)
		{
			return this.defaultRequest(fCallback, 'AdminPluginSettingsUpdate', oConfig);
		};

		/**
		 * @param {?Function} fCallback
		 * @param {boolean} bForce
		 */
		AdminRemoteStorage.prototype.licensing = function (fCallback, bForce)
		{
			return this.defaultRequest(fCallback, 'AdminLicensing', {
				'Force' : bForce ? '1' : '0'
			});
		};

		/**
		 * @param {?Function} fCallback
		 * @param {string} sDomain
		 * @param {string} sKey
		 */
		AdminRemoteStorage.prototype.licensingActivate = function (fCallback, sDomain, sKey)
		{
			return this.defaultRequest(fCallback, 'AdminLicensingActivate', {
				'Domain' : sDomain,
				'Key' : sKey
			});
		};

		/**
		 * @param {?Function} fCallback
		 * @param {string} sName
		 * @param {boolean} bDisabled
		 */
		AdminRemoteStorage.prototype.pluginDisable = function (fCallback, sName, bDisabled)
		{
			return this.defaultRequest(fCallback, 'AdminPluginDisable', {
				'Name': sName,
				'Disabled': !!bDisabled ? '1' : '0'
			});
		};

		AdminRemoteStorage.prototype.createOrUpdateDomain = function (fCallback,
			bCreate, sName, sIncHost, iIncPort, sIncSecure, bIncShortLogin,
			sOutHost, iOutPort, sOutSecure, bOutShortLogin, bOutAuth, sWhiteList)
		{
			this.defaultRequest(fCallback, 'AdminDomainSave', {
				'Create': bCreate ? '1' : '0',
				'Name': sName,
				'IncHost': sIncHost,
				'IncPort': iIncPort,
				'IncSecure': sIncSecure,
				'IncShortLogin': bIncShortLogin ? '1' : '0',
				'OutHost': sOutHost,
				'OutPort': iOutPort,
				'OutSecure': sOutSecure,
				'OutShortLogin': bOutShortLogin ? '1' : '0',
				'OutAuth': bOutAuth ? '1' : '0',
				'WhiteList': sWhiteList
			});
		};

		AdminRemoteStorage.prototype.testConnectionForDomain = function (fCallback, sName,
			sIncHost, iIncPort, sIncSecure,
			sOutHost, iOutPort, sOutSecure, bOutAuth)
		{
			this.defaultRequest(fCallback, 'AdminDomainTest', {
				'Name': sName,
				'IncHost': sIncHost,
				'IncPort': iIncPort,
				'IncSecure': sIncSecure,
				'OutHost': sOutHost,
				'OutPort': iOutPort,
				'OutSecure': sOutSecure,
				'OutAuth': bOutAuth ? '1' : '0'
			});
		};

		/**
		 * @param {?Function} fCallback
		 * @param {?} oData
		 */
		AdminRemoteStorage.prototype.testContacts = function (fCallback, oData)
		{
			this.defaultRequest(fCallback, 'AdminContactsTest', oData);
		};

		/**
		 * @param {?Function} fCallback
		 * @param {?} oData
		 */
		AdminRemoteStorage.prototype.saveNewAdminPassword = function (fCallback, oData)
		{
			this.defaultRequest(fCallback, 'AdminPasswordUpdate', oData);
		};

		/**
		 * @param {?Function} fCallback
		 */
		AdminRemoteStorage.prototype.adminPing = function (fCallback)
		{
			this.defaultRequest(fCallback, 'AdminPing');
		};

		module.exports = new AdminRemoteStorage();

	}());

/***/ },

/***/ 16:
/*!******************************!*\
  !*** ./dev/Apps/AdminApp.js ***!
  \******************************/
/***/ function(module, exports, __webpack_require__) {

	
	(function () {

		'use strict';

		var
			window = __webpack_require__(/*! window */ 12),
			_ = __webpack_require__(/*! _ */ 2),
			ko = __webpack_require__(/*! ko */ 3),

			Enums = __webpack_require__(/*! Common/Enums */ 6),
			Utils = __webpack_require__(/*! Common/Utils */ 1),
			LinkBuilder = __webpack_require__(/*! Common/LinkBuilder */ 11),

			Settings = __webpack_require__(/*! Storage:Settings */ 10),
			Data = __webpack_require__(/*! Storage:Admin:Data */ 18),
			Remote = __webpack_require__(/*! Storage:Admin:Remote */ 15),

			AdminSettingsScreen = __webpack_require__(/*! Screen:Admin:Settings */ 63),
			AdminLoginScreen = __webpack_require__(/*! Screen:Admin:Login */ 62),

			kn = __webpack_require__(/*! App:Knoin */ 5),
			AbstractApp = __webpack_require__(/*! App:Abstract */ 34)
		;

		/**
		 * @constructor
		 * @extends AbstractApp
		 */
		function AdminApp()
		{
			AbstractApp.call(this, Remote);
		}

		_.extend(AdminApp.prototype, AbstractApp.prototype);

		AdminApp.prototype.remote = function ()
		{
			return Remote;
		};

		AdminApp.prototype.data = function ()
		{
			return Data;
		};

		AdminApp.prototype.reloadDomainList = function ()
		{
			Data.domainsLoading(true);

			Remote.domainList(function (sResult, oData) {
				Data.domainsLoading(false);
				if (Enums.StorageResultType.Success === sResult && oData && oData.Result)
				{
					var aList = _.map(oData.Result, function (bEnabled, sName) {
						return {
							'name': sName,
							'disabled': ko.observable(!bEnabled),
							'deleteAccess': ko.observable(false)
						};
					}, this);

					Data.domains(aList);
				}
			});
		};

		AdminApp.prototype.reloadPluginList = function ()
		{
			Data.pluginsLoading(true);
			Remote.pluginList(function (sResult, oData) {

				Data.pluginsLoading(false);

				if (Enums.StorageResultType.Success === sResult && oData && oData.Result)
				{
					var aList = _.map(oData.Result, function (oItem) {
						return {
							'name': oItem['Name'],
							'disabled': ko.observable(!oItem['Enabled']),
							'configured': ko.observable(!!oItem['Configured'])
						};
					}, this);

					Data.plugins(aList);
				}
			});
		};

		AdminApp.prototype.reloadPackagesList = function ()
		{
			Data.packagesLoading(true);
			Data.packagesReal(true);

			Remote.packagesList(function (sResult, oData) {

				Data.packagesLoading(false);

				if (Enums.StorageResultType.Success === sResult && oData && oData.Result)
				{
					Data.packagesReal(!!oData.Result.Real);
					Data.packagesMainUpdatable(!!oData.Result.MainUpdatable);

					var
						aList = [],
						aLoading = {}
					;

					_.each(Data.packages(), function (oItem) {
						if (oItem && oItem['loading']())
						{
							aLoading[oItem['file']] = oItem;
						}
					});

					if (Utils.isArray(oData.Result.List))
					{
						aList = _.compact(_.map(oData.Result.List, function (oItem) {
							if (oItem)
							{
								oItem['loading'] = ko.observable(!Utils.isUnd(aLoading[oItem['file']]));
								return 'core' === oItem['type'] && !oItem['canBeInstalled'] ? null : oItem;
							}
							return null;
						}));
					}

					Data.packages(aList);
				}
				else
				{
					Data.packagesReal(false);
				}
			});
		};

		AdminApp.prototype.updateCoreData = function ()
		{
			Data.coreUpdating(true);
			Remote.updateCoreData(function (sResult, oData) {

				Data.coreUpdating(false);
				Data.coreRemoteVersion('');
				Data.coreRemoteRelease('');
				Data.coreVersionCompare(-2);

				if (Enums.StorageResultType.Success === sResult && oData && oData.Result)
				{
					Data.coreReal(true);
					window.location.reload();
				}
				else
				{
					Data.coreReal(false);
				}
			});

		};

		AdminApp.prototype.reloadCoreData = function ()
		{
			Data.coreChecking(true);
			Data.coreReal(true);

			Remote.coreData(function (sResult, oData) {

				Data.coreChecking(false);

				if (Enums.StorageResultType.Success === sResult && oData && oData.Result)
				{
					Data.coreReal(!!oData.Result.Real);
					Data.coreUpdatable(!!oData.Result.Updatable);
					Data.coreAccess(!!oData.Result.Access);
					Data.coreRemoteVersion(oData.Result.RemoteVersion || '');
					Data.coreRemoteRelease(oData.Result.RemoteRelease || '');
					Data.coreVersionCompare(Utils.pInt(oData.Result.VersionCompare));
				}
				else
				{
					Data.coreReal(false);
					Data.coreRemoteVersion('');
					Data.coreRemoteRelease('');
					Data.coreVersionCompare(-2);
				}
			});
		};

		/**
		 *
		 * @param {boolean=} bForce = false
		 */
		AdminApp.prototype.reloadLicensing = function (bForce)
		{
			bForce = Utils.isUnd(bForce) ? false : !!bForce;

			Data.licensingProcess(true);
			Data.licenseError('');

			Remote.licensing(function (sResult, oData) {
				Data.licensingProcess(false);
				if (Enums.StorageResultType.Success === sResult && oData && oData.Result && Utils.isNormal(oData.Result['Expired']))
				{
					Data.licenseValid(true);
					Data.licenseExpired(Utils.pInt(oData.Result['Expired']));
					Data.licenseError('');

					Data.licensing(true);
				}
				else
				{
					if (oData && oData.ErrorCode && -1 < Utils.inArray(Utils.pInt(oData.ErrorCode), [
						Enums.Notification.LicensingServerIsUnavailable,
						Enums.Notification.LicensingExpired
					]))
					{
						Data.licenseError(Utils.getNotification(Utils.pInt(oData.ErrorCode)));
						Data.licensing(true);
					}
					else
					{
						if (Enums.StorageResultType.Abort === sResult)
						{
							Data.licenseError(Utils.getNotification(Enums.Notification.LicensingServerIsUnavailable));
							Data.licensing(true);
						}
						else
						{
							Data.licensing(false);
						}
					}
				}
			}, bForce);
		};

		AdminApp.prototype.bootstart = function ()
		{
			AbstractApp.prototype.bootstart.call(this);

			Data.populateDataOnStart();

			kn.hideLoading();

			if (!Settings.settingsGet('AllowAdminPanel'))
			{
				kn.routeOff();
				kn.setHash(LinkBuilder.root(), true);
				kn.routeOff();

				_.defer(function () {
					window.location.href = '/';
				});
			}
			else
			{
				if (!!Settings.settingsGet('Auth'))
				{
					kn.startScreens([AdminSettingsScreen]);
				}
				else
				{
					kn.startScreens([AdminLoginScreen]);
				}
			}

			if (window.SimplePace)
			{
				window.SimplePace.set(100);
			}
		};

		module.exports = new AdminApp();

	}());

/***/ },

/***/ 18:
/*!******************************************!*\
  !*** ./dev/Storages/AdminDataStorage.js ***!
  \******************************************/
/***/ function(module, exports, __webpack_require__) {

	/* RainLoop Webmail (c) RainLoop Team | Licensed under CC BY-NC-SA 3.0 */

	(function () {

		'use strict';

		var
			_ = __webpack_require__(/*! _ */ 2),
			ko = __webpack_require__(/*! ko */ 3),

			AbstractData = __webpack_require__(/*! Storage:Abstract:Data */ 39)
		;

		/**
		 * @constructor
		 * @extends AbstractData
		 */
		function AdminDataStorage()
		{
			AbstractData.call(this);

			this.domainsLoading = ko.observable(false).extend({'throttle': 100});
			this.domains = ko.observableArray([]);

			this.pluginsLoading = ko.observable(false).extend({'throttle': 100});
			this.plugins = ko.observableArray([]);

			this.packagesReal = ko.observable(true);
			this.packagesMainUpdatable = ko.observable(true);
			this.packagesLoading = ko.observable(false).extend({'throttle': 100});
			this.packages = ko.observableArray([]);

			this.coreReal = ko.observable(true);
			this.coreUpdatable = ko.observable(true);
			this.coreAccess = ko.observable(true);
			this.coreChecking = ko.observable(false).extend({'throttle': 100});
			this.coreUpdating = ko.observable(false).extend({'throttle': 100});
			this.coreRemoteVersion = ko.observable('');
			this.coreRemoteRelease = ko.observable('');
			this.coreVersionCompare = ko.observable(-2);

			this.licensing = ko.observable(false);
			this.licensingProcess = ko.observable(false);
			this.licenseValid = ko.observable(false);
			this.licenseExpired = ko.observable(0);
			this.licenseError = ko.observable('');

			this.licenseTrigger = ko.observable(false);

			this.adminManLoading = ko.computed(function () {
				return '000' !== [this.domainsLoading() ? '1' : '0', this.pluginsLoading() ? '1' : '0', this.packagesLoading() ? '1' : '0'].join('');
			}, this);

			this.adminManLoadingVisibility = ko.computed(function () {
				return this.adminManLoading() ? 'visible' : 'hidden';
			}, this).extend({'rateLimit': 300});
		}

		_.extend(AdminDataStorage.prototype, AbstractData.prototype);

		AdminDataStorage.prototype.populateDataOnStart = function()
		{
			AbstractData.prototype.populateDataOnStart.call(this);
		};

		module.exports = new AdminDataStorage();

	}());

/***/ },

/***/ 29:
/*!***********************************************!*\
  !*** ./dev/Screens/AbstractSettingsScreen.js ***!
  \***********************************************/
/***/ function(module, exports, __webpack_require__) {

	
	(function () {

		'use strict';

		var
			_ = __webpack_require__(/*! _ */ 2),
			$ = __webpack_require__(/*! $ */ 14),
			ko = __webpack_require__(/*! ko */ 3),

			Globals = __webpack_require__(/*! Common/Globals */ 7),
			Utils = __webpack_require__(/*! Common/Utils */ 1),
			LinkBuilder = __webpack_require__(/*! Common/LinkBuilder */ 11),

			kn = __webpack_require__(/*! App:Knoin */ 5),
			KnoinAbstractScreen = __webpack_require__(/*! Knoin:AbstractScreen */ 24)
		;

		/**
		 * @constructor
		 * @param {Array} aViewModels
		 * @extends KnoinAbstractScreen
		 */
		function AbstractSettingsScreen(aViewModels)
		{
			KnoinAbstractScreen.call(this, 'settings', aViewModels);

			this.menu = ko.observableArray([]);

			this.oCurrentSubScreen = null;
			this.oViewModelPlace = null;

			this.setupSettings();
		}

		_.extend(AbstractSettingsScreen.prototype, KnoinAbstractScreen.prototype);

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
							'i18nInit': true,
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
				kn.setHash(LinkBuilder.settings(), false, true);
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

/***/ },

/***/ 62:
/*!*****************************************!*\
  !*** ./dev/Screens/AdminLoginScreen.js ***!
  \*****************************************/
/***/ function(module, exports, __webpack_require__) {

	
	(function () {

		'use strict';

		var
			_ = __webpack_require__(/*! _ */ 2),

			KnoinAbstractScreen = __webpack_require__(/*! Knoin:AbstractScreen */ 24)
		;

		/**
		 * @constructor
		 * @extends KnoinAbstractScreen
		 */
		function AdminLoginScreen()
		{
			KnoinAbstractScreen.call(this, 'login', [
				__webpack_require__(/*! View:Admin:Login */ 93)
			]);
		}

		_.extend(AdminLoginScreen.prototype, KnoinAbstractScreen.prototype);

		AdminLoginScreen.prototype.onShow = function ()
		{
			__webpack_require__(/*! App:Admin */ 16).setTitle('');
		};

		module.exports = AdminLoginScreen;

	}());

/***/ },

/***/ 63:
/*!********************************************!*\
  !*** ./dev/Screens/AdminSettingsScreen.js ***!
  \********************************************/
/***/ function(module, exports, __webpack_require__) {

	
	(function () {

		'use strict';

		var
			_ = __webpack_require__(/*! _ */ 2),

			kn = __webpack_require__(/*! App:Knoin */ 5),

			AbstractSettings = __webpack_require__(/*! Screen:AbstractSettings */ 29)
		;

		/**
		 * @constructor
		 * @extends AbstractSettings
		 */
		function AdminSettingsScreen()
		{
			AbstractSettings.call(this, [
				__webpack_require__(/*! View:Admin:SettingsMenu */ 94),
				__webpack_require__(/*! View:Admin:SettingsPane */ 95)
			]);
		}

		_.extend(AdminSettingsScreen.prototype, AbstractSettings.prototype);

		/**
		 * @param {Function=} fCallback
		 */
		AdminSettingsScreen.prototype.setupSettings = function (fCallback)
		{
			kn.addSettingsViewModel(__webpack_require__(/*! Settings:Admin:General */ 71),
				'AdminSettingsGeneral', 'General', 'general', true);

			kn.addSettingsViewModel(__webpack_require__(/*! Settings:Admin:Login */ 73),
				'AdminSettingsLogin', 'Login', 'login');

			kn.addSettingsViewModel(__webpack_require__(/*! Settings:Admin:Branding */ 68),
				'AdminSettingsBranding', 'Branding', 'branding');

			kn.addSettingsViewModel(__webpack_require__(/*! Settings:Admin:Contacts */ 69),
				'AdminSettingsContacts', 'Contacts', 'contacts');

			kn.addSettingsViewModel(__webpack_require__(/*! Settings:Admin:Domains */ 70),
				'AdminSettingsDomains', 'Domains', 'domains');

			kn.addSettingsViewModel(__webpack_require__(/*! Settings:Admin:Security */ 76),
				'AdminSettingsSecurity', 'Security', 'security');

			kn.addSettingsViewModel(__webpack_require__(/*! Settings:Admin:Social */ 77),
				'AdminSettingsSocial', 'Social', 'social');

			kn.addSettingsViewModel(__webpack_require__(/*! Settings:Admin:Plugins */ 75),
				'AdminSettingsPlugins', 'Plugins', 'plugins');

			kn.addSettingsViewModel(__webpack_require__(/*! Settings:Admin:Packages */ 74),
				'AdminSettingsPackages', 'Packages', 'packages');

			kn.addSettingsViewModel(__webpack_require__(/*! Settings:Admin:Licensing */ 72),
				'AdminSettingsLicensing', 'Licensing', 'licensing');

			kn.addSettingsViewModel(__webpack_require__(/*! Settings:Admin:About */ 67),
				'AdminSettingsAbout', 'About', 'about');

			if (fCallback)
			{
				fCallback();
			}
		};

		AdminSettingsScreen.prototype.onShow = function ()
		{
			__webpack_require__(/*! App:Admin */ 16).setTitle('');
		};

		module.exports = AdminSettingsScreen;

	}());

/***/ },

/***/ 67:
/*!**************************************************!*\
  !*** ./dev/Settings/Admin/AdminSettingsAbout.js ***!
  \**************************************************/
/***/ function(module, exports, __webpack_require__) {

	
	(function () {

		'use strict';

		var
			ko = __webpack_require__(/*! ko */ 3)
		;

		/**
		 * @constructor
		 */
		function AdminSettingsAbout()
		{
			var
				Settings = __webpack_require__(/*! Storage:Settings */ 10),
				Data = __webpack_require__(/*! Storage:Admin:Data */ 18)
			;

			this.version = ko.observable(Settings.settingsGet('Version'));
			this.access = ko.observable(!!Settings.settingsGet('CoreAccess'));
			this.errorDesc = ko.observable('');

			this.coreReal = Data.coreReal;
			this.coreUpdatable = Data.coreUpdatable;
			this.coreAccess = Data.coreAccess;
			this.coreChecking = Data.coreChecking;
			this.coreUpdating = Data.coreUpdating;
			this.coreRemoteVersion = Data.coreRemoteVersion;
			this.coreRemoteRelease = Data.coreRemoteRelease;
			this.coreVersionCompare = Data.coreVersionCompare;

			this.statusType = ko.computed(function () {

				var
					sType = '',
					iVersionCompare = this.coreVersionCompare(),
					bChecking = this.coreChecking(),
					bUpdating = this.coreUpdating(),
					bReal = this.coreReal()
				;

				if (bChecking)
				{
					sType = 'checking';
				}
				else if (bUpdating)
				{
					sType = 'updating';
				}
				else if (bReal && 0 === iVersionCompare)
				{
					sType = 'up-to-date';
				}
				else if (bReal && -1 === iVersionCompare)
				{
					sType = 'available';
				}
				else if (!bReal)
				{
					sType = 'error';
					this.errorDesc('Cannot access the repository at the moment.');
				}

				return sType;

			}, this);
		}

		AdminSettingsAbout.prototype.onBuild = function ()
		{
			if (this.access())
			{
				__webpack_require__(/*! App:Admin */ 16).reloadCoreData();
			}
		};

		AdminSettingsAbout.prototype.updateCoreData = function ()
		{
			if (!this.coreUpdating())
			{
				__webpack_require__(/*! App:Admin */ 16).updateCoreData();
			}
		};

		module.exports = AdminSettingsAbout;

	}());

/***/ },

/***/ 68:
/*!*****************************************************!*\
  !*** ./dev/Settings/Admin/AdminSettingsBranding.js ***!
  \*****************************************************/
/***/ function(module, exports, __webpack_require__) {

	
	(function () {

		'use strict';

		var
			_ = __webpack_require__(/*! _ */ 2),
			ko = __webpack_require__(/*! ko */ 3),

			Utils = __webpack_require__(/*! Common/Utils */ 1)
		;

		/**
		 * @constructor
		 */
		function AdminSettingsBranding()
		{
			var
				Enums = __webpack_require__(/*! Common/Enums */ 6),
				Settings = __webpack_require__(/*! Storage:Settings */ 10)
			;

			this.title = ko.observable(Settings.settingsGet('Title'));
			this.title.trigger = ko.observable(Enums.SaveSettingsStep.Idle);

			this.loadingDesc = ko.observable(Settings.settingsGet('LoadingDescription'));
			this.loadingDesc.trigger = ko.observable(Enums.SaveSettingsStep.Idle);

			this.loginLogo = ko.observable(Settings.settingsGet('LoginLogo'));
			this.loginLogo.trigger = ko.observable(Enums.SaveSettingsStep.Idle);

			this.loginDescription = ko.observable(Settings.settingsGet('LoginDescription'));
			this.loginDescription.trigger = ko.observable(Enums.SaveSettingsStep.Idle);

			this.loginCss = ko.observable(Settings.settingsGet('LoginCss'));
			this.loginCss.trigger = ko.observable(Enums.SaveSettingsStep.Idle);
		}

		AdminSettingsBranding.prototype.onBuild = function ()
		{
			var
				self = this,
				Remote = __webpack_require__(/*! Storage:Admin:Remote */ 15)
			;

			_.delay(function () {

				var
					f1 = Utils.settingsSaveHelperSimpleFunction(self.title.trigger, self),
					f2 = Utils.settingsSaveHelperSimpleFunction(self.loadingDesc.trigger, self),
					f3 = Utils.settingsSaveHelperSimpleFunction(self.loginLogo.trigger, self),
					f4 = Utils.settingsSaveHelperSimpleFunction(self.loginDescription.trigger, self),
					f5 = Utils.settingsSaveHelperSimpleFunction(self.loginCss.trigger, self)
				;

				self.title.subscribe(function (sValue) {
					Remote.saveAdminConfig(f1, {
						'Title': Utils.trim(sValue)
					});
				});

				self.loadingDesc.subscribe(function (sValue) {
					Remote.saveAdminConfig(f2, {
						'LoadingDescription': Utils.trim(sValue)
					});
				});

				self.loginLogo.subscribe(function (sValue) {
					Remote.saveAdminConfig(f3, {
						'LoginLogo': Utils.trim(sValue)
					});
				});

				self.loginDescription.subscribe(function (sValue) {
					Remote.saveAdminConfig(f4, {
						'LoginDescription': Utils.trim(sValue)
					});
				});

				self.loginCss.subscribe(function (sValue) {
					Remote.saveAdminConfig(f5, {
						'LoginCss': Utils.trim(sValue)
					});
				});

			}, 50);
		};

		module.exports = AdminSettingsBranding;

	}());

/***/ },

/***/ 69:
/*!*****************************************************!*\
  !*** ./dev/Settings/Admin/AdminSettingsContacts.js ***!
  \*****************************************************/
/***/ function(module, exports, __webpack_require__) {

	
	(function () {

		'use strict';

		var
			_ = __webpack_require__(/*! _ */ 2),
			ko = __webpack_require__(/*! ko */ 3),

			Enums = __webpack_require__(/*! Common/Enums */ 6),
			Utils = __webpack_require__(/*! Common/Utils */ 1),

			Settings = __webpack_require__(/*! Storage:Settings */ 10)
		;

		/**
		 * @constructor
		 */
		function AdminSettingsContacts()
		{
			var
				Remote = __webpack_require__(/*! Storage:Admin:Remote */ 15)
			;

			this.defautOptionsAfterRender = Utils.defautOptionsAfterRender;
			this.enableContacts = ko.observable(!!Settings.settingsGet('ContactsEnable'));
			this.contactsSharing = ko.observable(!!Settings.settingsGet('ContactsSharing'));
			this.contactsSync = ko.observable(!!Settings.settingsGet('ContactsSync'));

			var
				aTypes = ['sqlite', 'mysql', 'pgsql'],
				aSupportedTypes = [],
				getTypeName = function(sName) {
					switch (sName)
					{
						case 'sqlite':
							sName = 'SQLite';
							break;
						case 'mysql':
							sName = 'MySQL';
							break;
						case 'pgsql':
							sName = 'PostgreSQL';
							break;
					}

					return sName;
				}
			;

			if (!!Settings.settingsGet('SQLiteIsSupported'))
			{
				aSupportedTypes.push('sqlite');
			}
			if (!!Settings.settingsGet('MySqlIsSupported'))
			{
				aSupportedTypes.push('mysql');
			}
			if (!!Settings.settingsGet('PostgreSqlIsSupported'))
			{
				aSupportedTypes.push('pgsql');
			}

			this.contactsSupported = 0 < aSupportedTypes.length;

			this.contactsTypes = ko.observableArray([]);
			this.contactsTypesOptions = this.contactsTypes.map(function (sValue) {
				var bDisabled = -1 === Utils.inArray(sValue, aSupportedTypes);
				return {
					'id': sValue,
					'name': getTypeName(sValue) + (bDisabled ? ' (not supported)' : ''),
					'disabled': bDisabled
				};
			});

			this.contactsTypes(aTypes);
			this.contactsType = ko.observable('');

			this.mainContactsType = ko.computed({
				'owner': this,
				'read': this.contactsType,
				'write': function (sValue) {
					if (sValue !== this.contactsType())
					{
						if (-1 < Utils.inArray(sValue, aSupportedTypes))
						{
							this.contactsType(sValue);
						}
						else if (0 < aSupportedTypes.length)
						{
							this.contactsType('');
						}
					}
					else
					{
						this.contactsType.valueHasMutated();
					}
				}
			});

			this.contactsType.subscribe(function () {
				this.testContactsSuccess(false);
				this.testContactsError(false);
				this.testContactsErrorMessage('');
			}, this);

			this.pdoDsn = ko.observable(Settings.settingsGet('ContactsPdoDsn'));
			this.pdoUser = ko.observable(Settings.settingsGet('ContactsPdoUser'));
			this.pdoPassword = ko.observable(Settings.settingsGet('ContactsPdoPassword'));

			this.pdoDsnTrigger = ko.observable(Enums.SaveSettingsStep.Idle);
			this.pdoUserTrigger = ko.observable(Enums.SaveSettingsStep.Idle);
			this.pdoPasswordTrigger = ko.observable(Enums.SaveSettingsStep.Idle);
			this.contactsTypeTrigger = ko.observable(Enums.SaveSettingsStep.Idle);

			this.testing = ko.observable(false);
			this.testContactsSuccess = ko.observable(false);
			this.testContactsError = ko.observable(false);
			this.testContactsErrorMessage = ko.observable('');

			this.testContactsCommand = Utils.createCommand(this, function () {

				this.testContactsSuccess(false);
				this.testContactsError(false);
				this.testContactsErrorMessage('');
				this.testing(true);

				Remote.testContacts(this.onTestContactsResponse, {
					'ContactsPdoType': this.contactsType(),
					'ContactsPdoDsn': this.pdoDsn(),
					'ContactsPdoUser': this.pdoUser(),
					'ContactsPdoPassword': this.pdoPassword()
				});

			}, function () {
				return '' !== this.pdoDsn() && '' !== this.pdoUser();
			});

			this.contactsType(Settings.settingsGet('ContactsPdoType'));

			this.onTestContactsResponse = _.bind(this.onTestContactsResponse, this);
		}

		AdminSettingsContacts.prototype.onTestContactsResponse = function (sResult, oData)
		{
			this.testContactsSuccess(false);
			this.testContactsError(false);
			this.testContactsErrorMessage('');

			if (Enums.StorageResultType.Success === sResult && oData && oData.Result && oData.Result.Result)
			{
				this.testContactsSuccess(true);
			}
			else
			{
				this.testContactsError(true);
				if (oData && oData.Result)
				{
					this.testContactsErrorMessage(oData.Result.Message || '');
				}
				else
				{
					this.testContactsErrorMessage('');
				}
			}

			this.testing(false);
		};

		AdminSettingsContacts.prototype.onShow = function ()
		{
			this.testContactsSuccess(false);
			this.testContactsError(false);
			this.testContactsErrorMessage('');
		};

		AdminSettingsContacts.prototype.onBuild = function ()
		{
			var
				self = this,
				Remote = __webpack_require__(/*! Storage:Admin:Remote */ 15)
			;

			_.delay(function () {

				var
					f1 = Utils.settingsSaveHelperSimpleFunction(self.pdoDsnTrigger, self),
					f3 = Utils.settingsSaveHelperSimpleFunction(self.pdoUserTrigger, self),
					f4 = Utils.settingsSaveHelperSimpleFunction(self.pdoPasswordTrigger, self),
					f5 = Utils.settingsSaveHelperSimpleFunction(self.contactsTypeTrigger, self)
				;

				self.enableContacts.subscribe(function (bValue) {
					Remote.saveAdminConfig(null, {
						'ContactsEnable': bValue ? '1' : '0'
					});
				});

				self.contactsSharing.subscribe(function (bValue) {
					Remote.saveAdminConfig(null, {
						'ContactsSharing': bValue ? '1' : '0'
					});
				});

				self.contactsSync.subscribe(function (bValue) {
					Remote.saveAdminConfig(null, {
						'ContactsSync': bValue ? '1' : '0'
					});
				});

				self.contactsType.subscribe(function (sValue) {
					Remote.saveAdminConfig(f5, {
						'ContactsPdoType': sValue
					});
				});

				self.pdoDsn.subscribe(function (sValue) {
					Remote.saveAdminConfig(f1, {
						'ContactsPdoDsn': Utils.trim(sValue)
					});
				});

				self.pdoUser.subscribe(function (sValue) {
					Remote.saveAdminConfig(f3, {
						'ContactsPdoUser': Utils.trim(sValue)
					});
				});

				self.pdoPassword.subscribe(function (sValue) {
					Remote.saveAdminConfig(f4, {
						'ContactsPdoPassword': Utils.trim(sValue)
					});
				});

				self.contactsType(Settings.settingsGet('ContactsPdoType'));

			}, 50);
		};

		module.exports = AdminSettingsContacts;

	}());

/***/ },

/***/ 70:
/*!****************************************************!*\
  !*** ./dev/Settings/Admin/AdminSettingsDomains.js ***!
  \****************************************************/
/***/ function(module, exports, __webpack_require__) {

	
	(function () {

		'use strict';

		var
			window = __webpack_require__(/*! window */ 12),
			_ = __webpack_require__(/*! _ */ 2),
			ko = __webpack_require__(/*! ko */ 3),

			Enums = __webpack_require__(/*! Common/Enums */ 6),

			PopupsDomainViewModel = __webpack_require__(/*! View:Popup:Domain */ 105),

			Data = __webpack_require__(/*! Storage:Admin:Data */ 18),
			Remote = __webpack_require__(/*! Storage:Admin:Remote */ 15)
		;

		/**
		 * @constructor
		 */
		function AdminSettingsDomains()
		{
			this.domains = Data.domains;
			this.domainsLoading = Data.domainsLoading;

			this.iDomainForDeletionTimeout = 0;

			this.visibility = ko.computed(function () {
				return Data.domainsLoading() ? 'visible' : 'hidden';
			}, this);

			this.domainForDeletion = ko.observable(null).extend({'toggleSubscribe': [this,
				function (oPrev) {
					if (oPrev)
					{
						oPrev.deleteAccess(false);
					}
				}, function (oNext) {
					if (oNext)
					{
						oNext.deleteAccess(true);
						this.startDomainForDeletionTimeout();
					}
				}
			]});
		}

		AdminSettingsDomains.prototype.startDomainForDeletionTimeout = function ()
		{
			var self = this;
			window.clearInterval(this.iDomainForDeletionTimeout);
			this.iDomainForDeletionTimeout = window.setTimeout(function () {
				self.domainForDeletion(null);
			}, 1000 * 3);
		};

		AdminSettingsDomains.prototype.createDomain = function ()
		{
			__webpack_require__(/*! App:Knoin */ 5).showScreenPopup(PopupsDomainViewModel);
		};

		AdminSettingsDomains.prototype.deleteDomain = function (oDomain)
		{
			this.domains.remove(oDomain);
			Remote.domainDelete(_.bind(this.onDomainListChangeRequest, this), oDomain.name);
		};

		AdminSettingsDomains.prototype.disableDomain = function (oDomain)
		{
			oDomain.disabled(!oDomain.disabled());
			Remote.domainDisable(_.bind(this.onDomainListChangeRequest, this), oDomain.name, oDomain.disabled());
		};

		AdminSettingsDomains.prototype.onBuild = function (oDom)
		{
			var self = this;
			oDom
				.on('click', '.b-admin-domains-list-table .e-item .e-action', function () {
					var oDomainItem = ko.dataFor(this);
					if (oDomainItem)
					{
						Remote.domain(_.bind(self.onDomainLoadRequest, self), oDomainItem.name);
					}
				})
			;

			__webpack_require__(/*! App:Admin */ 16).reloadDomainList();
		};

		AdminSettingsDomains.prototype.onDomainLoadRequest = function (sResult, oData)
		{
			if (Enums.StorageResultType.Success === sResult && oData && oData.Result)
			{
				__webpack_require__(/*! App:Knoin */ 5).showScreenPopup(PopupsDomainViewModel, [oData.Result]);
			}
		};

		AdminSettingsDomains.prototype.onDomainListChangeRequest = function ()
		{
			__webpack_require__(/*! App:Admin */ 16).reloadDomainList();
		};

		module.exports = AdminSettingsDomains;

	}());

/***/ },

/***/ 71:
/*!****************************************************!*\
  !*** ./dev/Settings/Admin/AdminSettingsGeneral.js ***!
  \****************************************************/
/***/ function(module, exports, __webpack_require__) {

	
	(function () {

		'use strict';

		var
			_ = __webpack_require__(/*! _ */ 2),
			ko = __webpack_require__(/*! ko */ 3),

			Enums = __webpack_require__(/*! Common/Enums */ 6),
			Utils = __webpack_require__(/*! Common/Utils */ 1),
			LinkBuilder = __webpack_require__(/*! Common/LinkBuilder */ 11),

			Settings = __webpack_require__(/*! Storage:Settings */ 10),
			Data = __webpack_require__(/*! Storage:Admin:Data */ 18)
		;

		/**
		 * @constructor
		 */
		function AdminSettingsGeneral()
		{
			this.mainLanguage = Data.mainLanguage;
			this.mainTheme = Data.mainTheme;

			this.language = Data.language;
			this.theme = Data.theme;

			this.allowLanguagesOnSettings = Data.allowLanguagesOnSettings;
			this.capaThemes = Data.capaThemes;
			this.capaGravatar = Data.capaGravatar;
			this.capaAdditionalAccounts = Data.capaAdditionalAccounts;
			this.capaAdditionalIdentities = Data.capaAdditionalIdentities;

			this.mainAttachmentLimit = ko.observable(Utils.pInt(Settings.settingsGet('AttachmentLimit')) / (1024 * 1024)).extend({'posInterer': 25});
			this.uploadData = Settings.settingsGet('PhpUploadSizes');
			this.uploadDataDesc = this.uploadData && (this.uploadData['upload_max_filesize'] || this.uploadData['post_max_size']) ?
				[
					this.uploadData['upload_max_filesize'] ? 'upload_max_filesize = ' + this.uploadData['upload_max_filesize'] + '; ' : '',
					this.uploadData['post_max_size'] ? 'post_max_size = ' + this.uploadData['post_max_size'] : ''
				].join('')
					: '';

			this.themesOptions = ko.computed(function () {
				return _.map(Data.themes(), function (sTheme) {
					return {
						'optValue': sTheme,
						'optText': Utils.convertThemeName(sTheme)
					};
				});
			});

			this.mainLanguageFullName = ko.computed(function () {
				return Utils.convertLangName(this.mainLanguage());
			}, this);

			this.weakPassword = !!Settings.settingsGet('WeakPassword');

			this.attachmentLimitTrigger = ko.observable(Enums.SaveSettingsStep.Idle);
			this.languageTrigger = ko.observable(Enums.SaveSettingsStep.Idle);
			this.themeTrigger = ko.observable(Enums.SaveSettingsStep.Idle);
		}

		AdminSettingsGeneral.prototype.onBuild = function ()
		{
			var
				self = this,
				Remote = __webpack_require__(/*! Storage:Admin:Remote */ 15)
			;

			_.delay(function () {

				var
					f1 = Utils.settingsSaveHelperSimpleFunction(self.attachmentLimitTrigger, self),
					f2 = Utils.settingsSaveHelperSimpleFunction(self.languageTrigger, self),
					f3 = Utils.settingsSaveHelperSimpleFunction(self.themeTrigger, self)
				;

				self.mainAttachmentLimit.subscribe(function (sValue) {
					Remote.saveAdminConfig(f1, {
						'AttachmentLimit': Utils.pInt(sValue)
					});
				});

				self.language.subscribe(function (sValue) {
					Remote.saveAdminConfig(f2, {
						'Language': Utils.trim(sValue)
					});
				});

				self.theme.subscribe(function (sValue) {
					Remote.saveAdminConfig(f3, {
						'Theme': Utils.trim(sValue)
					});
				});

				self.capaAdditionalAccounts.subscribe(function (bValue) {
					Remote.saveAdminConfig(null, {
						'CapaAdditionalAccounts': bValue ? '1' : '0'
					});
				});

				self.capaAdditionalIdentities.subscribe(function (bValue) {
					Remote.saveAdminConfig(null, {
						'CapaAdditionalIdentities': bValue ? '1' : '0'
					});
				});

				self.capaGravatar.subscribe(function (bValue) {
					Remote.saveAdminConfig(null, {
						'CapaGravatar': bValue ? '1' : '0'
					});
				});

				self.capaThemes.subscribe(function (bValue) {
					Remote.saveAdminConfig(null, {
						'CapaThemes': bValue ? '1' : '0'
					});
				});

				self.allowLanguagesOnSettings.subscribe(function (bValue) {
					Remote.saveAdminConfig(null, {
						'AllowLanguagesOnSettings': bValue ? '1' : '0'
					});
				});

			}, 50);
		};

		AdminSettingsGeneral.prototype.selectLanguage = function ()
		{
			__webpack_require__(/*! App:Knoin */ 5).showScreenPopup(__webpack_require__(/*! View:Popup:Languages */ 32));
		};

		/**
		 * @return {string}
		 */
		AdminSettingsGeneral.prototype.phpInfoLink = function ()
		{
			return LinkBuilder.phpInfo();
		};

		module.exports = AdminSettingsGeneral;

	}());

/***/ },

/***/ 72:
/*!******************************************************!*\
  !*** ./dev/Settings/Admin/AdminSettingsLicensing.js ***!
  \******************************************************/
/***/ function(module, exports, __webpack_require__) {

	
	(function () {

		'use strict';

		var
			ko = __webpack_require__(/*! ko */ 3),
			moment = __webpack_require__(/*! moment */ 25),

			Settings = __webpack_require__(/*! Storage:Settings */ 10),
			Data = __webpack_require__(/*! Storage:Admin:Data */ 18)
		;

		/**
		 * @constructor
		 */
		function AdminSettingsLicensing()
		{
			this.licensing = Data.licensing;
			this.licensingProcess = Data.licensingProcess;
			this.licenseValid = Data.licenseValid;
			this.licenseExpired = Data.licenseExpired;
			this.licenseError = Data.licenseError;
			this.licenseTrigger = Data.licenseTrigger;

			this.adminDomain = ko.observable('');
			this.subscriptionEnabled = ko.observable(!!Settings.settingsGet('SubscriptionEnabled'));

			this.licenseTrigger.subscribe(function () {
				if (this.subscriptionEnabled())
				{
					__webpack_require__(/*! App:Admin */ 16).reloadLicensing(true);
				}
			}, this);
		}

		AdminSettingsLicensing.prototype.onBuild = function ()
		{
			if (this.subscriptionEnabled())
			{
				__webpack_require__(/*! App:Admin */ 16).reloadLicensing(false);
			}
		};

		AdminSettingsLicensing.prototype.onShow = function ()
		{
			this.adminDomain(Settings.settingsGet('AdminDomain'));
		};

		AdminSettingsLicensing.prototype.showActivationForm = function ()
		{
			__webpack_require__(/*! App:Knoin */ 5).showScreenPopup(__webpack_require__(/*! View:Popup:Activate */ 101));
		};

		/**
		 * @returns {string}
		 */
		AdminSettingsLicensing.prototype.licenseExpiredMomentValue = function ()
		{
			var
				iTime = this.licenseExpired(),
				oDate = moment.unix(iTime)
			;

			return iTime && 1898625600 === iTime ? 'Never' : (oDate.format('LL') + ' (' + oDate.from(moment()) + ')');
		};

		module.exports = AdminSettingsLicensing;

	}());

/***/ },

/***/ 73:
/*!**************************************************!*\
  !*** ./dev/Settings/Admin/AdminSettingsLogin.js ***!
  \**************************************************/
/***/ function(module, exports, __webpack_require__) {

	
	(function () {

		'use strict';

		var
			_ = __webpack_require__(/*! _ */ 2),
			ko = __webpack_require__(/*! ko */ 3),

			Enums = __webpack_require__(/*! Common/Enums */ 6),
			Utils = __webpack_require__(/*! Common/Utils */ 1),

			Settings = __webpack_require__(/*! Storage:Settings */ 10),
			Data = __webpack_require__(/*! Storage:Admin:Data */ 18)
		;

		/**
		 * @constructor
		 */
		function AdminSettingsLogin()
		{
			this.determineUserLanguage = Data.determineUserLanguage;
			this.determineUserDomain = Data.determineUserDomain;

			this.defaultDomain = ko.observable(Settings.settingsGet('LoginDefaultDomain'));

			this.allowLanguagesOnLogin = Data.allowLanguagesOnLogin;
			this.defaultDomainTrigger = ko.observable(Enums.SaveSettingsStep.Idle);
		}

		AdminSettingsLogin.prototype.onBuild = function ()
		{
			var
				self = this,
				Remote = __webpack_require__(/*! Storage:Admin:Remote */ 15)
			;

			_.delay(function () {

				var f1 = Utils.settingsSaveHelperSimpleFunction(self.defaultDomainTrigger, self);

				self.determineUserLanguage.subscribe(function (bValue) {
					Remote.saveAdminConfig(null, {
						'DetermineUserLanguage': bValue ? '1' : '0'
					});
				});

				self.determineUserDomain.subscribe(function (bValue) {
					Remote.saveAdminConfig(null, {
						'DetermineUserDomain': bValue ? '1' : '0'
					});
				});

				self.allowLanguagesOnLogin.subscribe(function (bValue) {
					Remote.saveAdminConfig(null, {
						'AllowLanguagesOnLogin': bValue ? '1' : '0'
					});
				});

				self.defaultDomain.subscribe(function (sValue) {
					Remote.saveAdminConfig(f1, {
						'LoginDefaultDomain': Utils.trim(sValue)
					});
				});

			}, 50);
		};

		module.exports = AdminSettingsLogin;

	}());

/***/ },

/***/ 74:
/*!*****************************************************!*\
  !*** ./dev/Settings/Admin/AdminSettingsPackages.js ***!
  \*****************************************************/
/***/ function(module, exports, __webpack_require__) {

	
	(function () {

		'use strict';

		var
			window = __webpack_require__(/*! window */ 12),
			ko = __webpack_require__(/*! ko */ 3),

			Enums = __webpack_require__(/*! Common/Enums */ 6),
			Utils = __webpack_require__(/*! Common/Utils */ 1),

			Data = __webpack_require__(/*! Storage:Admin:Data */ 18),
			Remote = __webpack_require__(/*! Storage:Admin:Remote */ 15)
		;

		/**
		 * @constructor
		 */
		function AdminSettingsPackages()
		{
			this.packagesError = ko.observable('');

			this.packages = Data.packages;
			this.packagesLoading = Data.packagesLoading;
			this.packagesReal = Data.packagesReal;
			this.packagesMainUpdatable = Data.packagesMainUpdatable;

			this.packagesCurrent = this.packages.filter(function (oItem) {
				return oItem && '' !== oItem['installed'] && !oItem['compare'];
			});

			this.packagesAvailableForUpdate = this.packages.filter(function (oItem) {
				return oItem && '' !== oItem['installed'] && !!oItem['compare'];
			});

			this.packagesAvailableForInstallation = this.packages.filter(function (oItem) {
				return oItem && '' === oItem['installed'];
			});

			this.visibility = ko.computed(function () {
				return Data.packagesLoading() ? 'visible' : 'hidden';
			}, this);
		}

		AdminSettingsPackages.prototype.onShow = function ()
		{
			this.packagesError('');
		};

		AdminSettingsPackages.prototype.onBuild = function ()
		{
			__webpack_require__(/*! App:Admin */ 16).reloadPackagesList();
		};

		AdminSettingsPackages.prototype.requestHelper = function (oPackage, bInstall)
		{
			var self = this;
			return function (sResult, oData) {

				if (Enums.StorageResultType.Success !== sResult || !oData || !oData.Result)
				{
					if (oData && oData.ErrorCode)
					{
						self.packagesError(Utils.getNotification(oData.ErrorCode));
					}
					else
					{
						self.packagesError(Utils.getNotification(
							bInstall ? Enums.Notification.CantInstallPackage : Enums.Notification.CantDeletePackage));
					}
				}

				_.each(Data.packages(), function (oItem) {
					if (oItem && oPackage && oItem['loading']() && oPackage['file'] === oItem['file'])
					{
						oPackage['loading'](false);
						oItem['loading'](false);
					}
				});

				if (Enums.StorageResultType.Success === sResult && oData && oData.Result && oData.Result['Reload'])
				{
					window.location.reload();
				}
				else
				{
					__webpack_require__(/*! App:Admin */ 16).reloadPackagesList();
				}
			};
		};

		AdminSettingsPackages.prototype.deletePackage = function (oPackage)
		{
			if (oPackage)
			{
				oPackage['loading'](true);
				Remote.packageDelete(this.requestHelper(oPackage, false), oPackage);
			}
		};

		AdminSettingsPackages.prototype.installPackage = function (oPackage)
		{
			if (oPackage)
			{
				oPackage['loading'](true);
				Remote.packageInstall(this.requestHelper(oPackage, true), oPackage);
			}
		};

		module.exports = AdminSettingsPackages;

	}());

/***/ },

/***/ 75:
/*!****************************************************!*\
  !*** ./dev/Settings/Admin/AdminSettingsPlugins.js ***!
  \****************************************************/
/***/ function(module, exports, __webpack_require__) {

	
	(function () {

		'use strict';

		var
			_ = __webpack_require__(/*! _ */ 2),
			ko = __webpack_require__(/*! ko */ 3),

			Enums = __webpack_require__(/*! Common/Enums */ 6),
			Utils = __webpack_require__(/*! Common/Utils */ 1),

			Settings = __webpack_require__(/*! Storage:Settings */ 10),
			Data = __webpack_require__(/*! Storage:Admin:Data */ 18),
			Remote = __webpack_require__(/*! Storage:Admin:Remote */ 15)
		;

		/**
		 * @constructor
		 */
		function AdminSettingsPlugins()
		{
			this.enabledPlugins = ko.observable(!!Settings.settingsGet('EnabledPlugins'));

			this.pluginsError = ko.observable('');

			this.plugins = Data.plugins;
			this.pluginsLoading = Data.pluginsLoading;

			this.visibility = ko.computed(function () {
				return Data.pluginsLoading() ? 'visible' : 'hidden';
			}, this);

			this.onPluginLoadRequest = _.bind(this.onPluginLoadRequest, this);
			this.onPluginDisableRequest = _.bind(this.onPluginDisableRequest, this);
		}

		AdminSettingsPlugins.prototype.disablePlugin = function (oPlugin)
		{
			oPlugin.disabled(!oPlugin.disabled());
			Remote.pluginDisable(this.onPluginDisableRequest, oPlugin.name, oPlugin.disabled());
		};

		AdminSettingsPlugins.prototype.configurePlugin = function (oPlugin)
		{
			Remote.plugin(this.onPluginLoadRequest, oPlugin.name);
		};

		AdminSettingsPlugins.prototype.onBuild = function (oDom)
		{
			var self = this;

			oDom
				.on('click', '.e-item .configure-plugin-action', function () {
					var oPlugin = ko.dataFor(this);
					if (oPlugin)
					{
						self.configurePlugin(oPlugin);
					}
				})
				.on('click', '.e-item .disabled-plugin', function () {
					var oPlugin = ko.dataFor(this);
					if (oPlugin)
					{
						self.disablePlugin(oPlugin);
					}
				})
			;

			this.enabledPlugins.subscribe(function (bValue) {
				Remote.saveAdminConfig(Utils.emptyFunction, {
					'EnabledPlugins': bValue ? '1' : '0'
				});
			});
		};

		AdminSettingsPlugins.prototype.onShow = function ()
		{
			this.pluginsError('');
			__webpack_require__(/*! App:Admin */ 16).reloadPluginList();
		};

		AdminSettingsPlugins.prototype.onPluginLoadRequest = function (sResult, oData)
		{
			if (Enums.StorageResultType.Success === sResult && oData && oData.Result)
			{
				__webpack_require__(/*! App:Knoin */ 5).showScreenPopup(__webpack_require__(/*! View:Popup:Plugin */ 109), [oData.Result]);
			}
		};

		AdminSettingsPlugins.prototype.onPluginDisableRequest = function (sResult, oData)
		{
			if (Enums.StorageResultType.Success === sResult && oData)
			{
				if (!oData.Result && oData.ErrorCode)
				{
					if (Enums.Notification.UnsupportedPluginPackage === oData.ErrorCode && oData.ErrorMessage && '' !== oData.ErrorMessage)
					{
						this.pluginsError(oData.ErrorMessage);
					}
					else
					{
						this.pluginsError(Utils.getNotification(oData.ErrorCode));
					}
				}
			}

			__webpack_require__(/*! App:Admin */ 16).reloadPluginList();
		};

		module.exports = AdminSettingsPlugins;

	}());

/***/ },

/***/ 76:
/*!*****************************************************!*\
  !*** ./dev/Settings/Admin/AdminSettingsSecurity.js ***!
  \*****************************************************/
/***/ function(module, exports, __webpack_require__) {

	
	(function () {

		'use strict';

		var
			_ = __webpack_require__(/*! _ */ 2),
			ko = __webpack_require__(/*! ko */ 3),

			Enums = __webpack_require__(/*! Common/Enums */ 6),
			Utils = __webpack_require__(/*! Common/Utils */ 1),
			LinkBuilder = __webpack_require__(/*! Common/LinkBuilder */ 11),

			Settings = __webpack_require__(/*! Storage:Settings */ 10),
			Data = __webpack_require__(/*! Storage:Admin:Data */ 18),
			Remote = __webpack_require__(/*! Storage:Admin:Remote */ 15)
		;

		/**
		 * @constructor
		 */
		function AdminSettingsSecurity()
		{
			this.useLocalProxyForExternalImages = Data.useLocalProxyForExternalImages;

			this.capaOpenPGP = ko.observable(Settings.capa(Enums.Capa.OpenPGP));
			this.capaTwoFactorAuth = ko.observable(Settings.capa(Enums.Capa.TwoFactor));

			this.adminLogin = ko.observable(Settings.settingsGet('AdminLogin'));
			this.adminPassword = ko.observable('');
			this.adminPasswordNew = ko.observable('');
			this.adminPasswordNew2 = ko.observable('');
			this.adminPasswordNewError = ko.observable(false);

			this.adminPasswordUpdateError = ko.observable(false);
			this.adminPasswordUpdateSuccess = ko.observable(false);

			this.adminPassword.subscribe(function () {
				this.adminPasswordUpdateError(false);
				this.adminPasswordUpdateSuccess(false);
			}, this);

			this.adminPasswordNew.subscribe(function () {
				this.adminPasswordUpdateError(false);
				this.adminPasswordUpdateSuccess(false);
				this.adminPasswordNewError(false);
			}, this);

			this.adminPasswordNew2.subscribe(function () {
				this.adminPasswordUpdateError(false);
				this.adminPasswordUpdateSuccess(false);
				this.adminPasswordNewError(false);
			}, this);

			this.saveNewAdminPasswordCommand = Utils.createCommand(this, function () {

				if (this.adminPasswordNew() !== this.adminPasswordNew2())
				{
					this.adminPasswordNewError(true);
					return false;
				}

				this.adminPasswordUpdateError(false);
				this.adminPasswordUpdateSuccess(false);

				Remote.saveNewAdminPassword(this.onNewAdminPasswordResponse, {
					'Password': this.adminPassword(),
					'NewPassword': this.adminPasswordNew()
				});

			}, function () {
				return '' !== this.adminPassword() && '' !== this.adminPasswordNew() && '' !== this.adminPasswordNew2();
			});

			this.onNewAdminPasswordResponse = _.bind(this.onNewAdminPasswordResponse, this);
		}

		AdminSettingsSecurity.prototype.onNewAdminPasswordResponse = function (sResult, oData)
		{
			if (Enums.StorageResultType.Success === sResult && oData && oData.Result)
			{
				this.adminPassword('');
				this.adminPasswordNew('');
				this.adminPasswordNew2('');

				this.adminPasswordUpdateSuccess(true);
			}
			else
			{
				this.adminPasswordUpdateError(true);
			}
		};

		AdminSettingsSecurity.prototype.onBuild = function ()
		{
			var
				Remote = __webpack_require__(/*! Storage:Admin:Remote */ 15)
			;

			this.capaOpenPGP.subscribe(function (bValue) {
				Remote.saveAdminConfig(Utils.emptyFunction, {
					'CapaOpenPGP': bValue ? '1' : '0'
				});
			});

			this.capaTwoFactorAuth.subscribe(function (bValue) {
				Remote.saveAdminConfig(Utils.emptyFunction, {
					'CapaTwoFactorAuth': bValue ? '1' : '0'
				});
			});

			this.useLocalProxyForExternalImages.subscribe(function (bValue) {
				Remote.saveAdminConfig(null, {
					'UseLocalProxyForExternalImages': bValue ? '1' : '0'
				});
			});
		};

		AdminSettingsSecurity.prototype.onHide = function ()
		{
			this.adminPassword('');
			this.adminPasswordNew('');
			this.adminPasswordNew2('');
		};

		/**
		 * @return {string}
		 */
		AdminSettingsSecurity.prototype.phpInfoLink = function ()
		{
			return LinkBuilder.phpInfo();
		};

		module.exports = AdminSettingsSecurity;

	}());


/***/ },

/***/ 77:
/*!***************************************************!*\
  !*** ./dev/Settings/Admin/AdminSettingsSocial.js ***!
  \***************************************************/
/***/ function(module, exports, __webpack_require__) {

	
	(function () {

		'use strict';

		var
			_ = __webpack_require__(/*! _ */ 2),
			ko = __webpack_require__(/*! ko */ 3),

			Enums = __webpack_require__(/*! Common/Enums */ 6),
			Utils = __webpack_require__(/*! Common/Utils */ 1)
		;

		/**
		 * @constructor
		 */
		function AdminSettingsSocial()
		{
			var Data = __webpack_require__(/*! Storage:Admin:Data */ 18);

			this.googleEnable = Data.googleEnable;
			this.googleClientID = Data.googleClientID;
			this.googleApiKey = Data.googleApiKey;
			this.googleClientSecret = Data.googleClientSecret;
			this.googleTrigger1 = ko.observable(Enums.SaveSettingsStep.Idle);
			this.googleTrigger2 = ko.observable(Enums.SaveSettingsStep.Idle);
			this.googleTrigger3 = ko.observable(Enums.SaveSettingsStep.Idle);

			this.facebookSupported = Data.facebookSupported;
			this.facebookEnable = Data.facebookEnable;
			this.facebookAppID = Data.facebookAppID;
			this.facebookAppSecret = Data.facebookAppSecret;
			this.facebookTrigger1 = ko.observable(Enums.SaveSettingsStep.Idle);
			this.facebookTrigger2 = ko.observable(Enums.SaveSettingsStep.Idle);

			this.twitterEnable = Data.twitterEnable;
			this.twitterConsumerKey = Data.twitterConsumerKey;
			this.twitterConsumerSecret = Data.twitterConsumerSecret;
			this.twitterTrigger1 = ko.observable(Enums.SaveSettingsStep.Idle);
			this.twitterTrigger2 = ko.observable(Enums.SaveSettingsStep.Idle);

			this.dropboxEnable = Data.dropboxEnable;
			this.dropboxApiKey = Data.dropboxApiKey;
			this.dropboxTrigger1 = ko.observable(Enums.SaveSettingsStep.Idle);
		}

		AdminSettingsSocial.prototype.onBuild = function ()
		{
			var
				self = this,
				Remote = __webpack_require__(/*! Storage:Admin:Remote */ 15)
			;

			_.delay(function () {

				var
					f1 = Utils.settingsSaveHelperSimpleFunction(self.facebookTrigger1, self),
					f2 = Utils.settingsSaveHelperSimpleFunction(self.facebookTrigger2, self),
					f3 = Utils.settingsSaveHelperSimpleFunction(self.twitterTrigger1, self),
					f4 = Utils.settingsSaveHelperSimpleFunction(self.twitterTrigger2, self),
					f5 = Utils.settingsSaveHelperSimpleFunction(self.googleTrigger1, self),
					f6 = Utils.settingsSaveHelperSimpleFunction(self.googleTrigger2, self),
					f7 = Utils.settingsSaveHelperSimpleFunction(self.googleTrigger3, self),
					f8 = Utils.settingsSaveHelperSimpleFunction(self.dropboxTrigger1, self)
				;

				self.facebookEnable.subscribe(function (bValue) {
					if (self.facebookSupported())
					{
						Remote.saveAdminConfig(Utils.emptyFunction, {
							'FacebookEnable': bValue ? '1' : '0'
						});
					}
				});

				self.facebookAppID.subscribe(function (sValue) {
					if (self.facebookSupported())
					{
						Remote.saveAdminConfig(f1, {
							'FacebookAppID': Utils.trim(sValue)
						});
					}
				});

				self.facebookAppSecret.subscribe(function (sValue) {
					if (self.facebookSupported())
					{
						Remote.saveAdminConfig(f2, {
							'FacebookAppSecret': Utils.trim(sValue)
						});
					}
				});

				self.twitterEnable.subscribe(function (bValue) {
					Remote.saveAdminConfig(Utils.emptyFunction, {
						'TwitterEnable': bValue ? '1' : '0'
					});
				});

				self.twitterConsumerKey.subscribe(function (sValue) {
					Remote.saveAdminConfig(f3, {
						'TwitterConsumerKey': Utils.trim(sValue)
					});
				});

				self.twitterConsumerSecret.subscribe(function (sValue) {
					Remote.saveAdminConfig(f4, {
						'TwitterConsumerSecret': Utils.trim(sValue)
					});
				});

				self.googleEnable.subscribe(function (bValue) {
					Remote.saveAdminConfig(Utils.emptyFunction, {
						'GoogleEnable': bValue ? '1' : '0'
					});
				});

				self.googleClientID.subscribe(function (sValue) {
					Remote.saveAdminConfig(f5, {
						'GoogleClientID': Utils.trim(sValue)
					});
				});

				self.googleClientSecret.subscribe(function (sValue) {
					Remote.saveAdminConfig(f6, {
						'GoogleClientSecret': Utils.trim(sValue)
					});
				});

				self.googleApiKey.subscribe(function (sValue) {
					Remote.saveAdminConfig(f7, {
						'GoogleApiKey': Utils.trim(sValue)
					});
				});

				self.dropboxEnable.subscribe(function (bValue) {
					Remote.saveAdminConfig(Utils.emptyFunction, {
						'DropboxEnable': bValue ? '1' : '0'
					});
				});

				self.dropboxApiKey.subscribe(function (sValue) {
					Remote.saveAdminConfig(f8, {
						'DropboxApiKey': Utils.trim(sValue)
					});
				});

			}, 50);
		};

		module.exports = AdminSettingsSocial;

	}());

/***/ },

/***/ 93:
/*!***********************************************!*\
  !*** ./dev/ViewModels/AdminLoginViewModel.js ***!
  \***********************************************/
/***/ function(module, exports, __webpack_require__) {

	
	(function () {

		'use strict';

		var
			_ = __webpack_require__(/*! _ */ 2),
			ko = __webpack_require__(/*! ko */ 3),

			Enums = __webpack_require__(/*! Common/Enums */ 6),
			Utils = __webpack_require__(/*! Common/Utils */ 1),

			Remote = __webpack_require__(/*! Storage:Admin:Remote */ 15),

			kn = __webpack_require__(/*! App:Knoin */ 5),
			KnoinAbstractViewModel = __webpack_require__(/*! Knoin:AbstractViewModel */ 9)
		;

		/**
		 * @constructor
		 * @extends KnoinAbstractViewModel
		 */
		function AdminLoginViewModel()
		{
			KnoinAbstractViewModel.call(this, 'Center', 'AdminLogin');

			this.login = ko.observable('');
			this.password = ko.observable('');

			this.loginError = ko.observable(false);
			this.passwordError = ko.observable(false);

			this.loginFocus = ko.observable(false);

			this.login.subscribe(function () {
				this.loginError(false);
			}, this);

			this.password.subscribe(function () {
				this.passwordError(false);
			}, this);

			this.submitRequest = ko.observable(false);
			this.submitError = ko.observable('');

			this.submitCommand = Utils.createCommand(this, function () {

				Utils.triggerAutocompleteInputChange();

				this.loginError('' === Utils.trim(this.login()));
				this.passwordError('' === Utils.trim(this.password()));

				if (this.loginError() || this.passwordError())
				{
					return false;
				}

				this.submitRequest(true);

				Remote.adminLogin(_.bind(function (sResult, oData) {

					if (Enums.StorageResultType.Success === sResult && oData && 'AdminLogin' === oData.Action)
					{
						if (oData.Result)
						{
							__webpack_require__(/*! App:Admin */ 16).loginAndLogoutReload();
						}
						else if (oData.ErrorCode)
						{
							this.submitRequest(false);
							this.submitError(Utils.getNotification(oData.ErrorCode));
						}
					}
					else
					{
						this.submitRequest(false);
						this.submitError(Utils.getNotification(Enums.Notification.UnknownError));
					}

				}, this), this.login(), this.password());

				return true;

			}, function () {
				return !this.submitRequest();
			});

			kn.constructorEnd(this);
		}

		kn.extendAsViewModel(['View:Admin:Login', 'AdminLoginViewModel'], AdminLoginViewModel);
		_.extend(AdminLoginViewModel.prototype, KnoinAbstractViewModel.prototype);

		AdminLoginViewModel.prototype.onShow = function ()
		{
			kn.routeOff();

			_.delay(_.bind(function () {
				this.loginFocus(true);
			}, this), 100);

		};

		AdminLoginViewModel.prototype.onHide = function ()
		{
			this.loginFocus(false);
		};

		AdminLoginViewModel.prototype.onBuild = function ()
		{
			Utils.triggerAutocompleteInputChange(true);
		};

		AdminLoginViewModel.prototype.submitForm = function ()
		{
			this.submitCommand();
		};

		module.exports = AdminLoginViewModel;

	}());

/***/ },

/***/ 94:
/*!******************************************************!*\
  !*** ./dev/ViewModels/AdminSettingsMenuViewModel.js ***!
  \******************************************************/
/***/ function(module, exports, __webpack_require__) {

	
	(function () {

		'use strict';

		var
			_ = __webpack_require__(/*! _ */ 2),
			
			Globals = __webpack_require__(/*! Common/Globals */ 7),

			kn = __webpack_require__(/*! App:Knoin */ 5),
			KnoinAbstractViewModel = __webpack_require__(/*! Knoin:AbstractViewModel */ 9)
		;

		/**
		 * @param {?} oScreen
		 *
		 * @constructor
		 * @extends KnoinAbstractViewModel
		 */
		function AdminSettingsMenuViewModel(oScreen)
		{
			KnoinAbstractViewModel.call(this, 'Left', 'AdminMenu');

			this.leftPanelDisabled = Globals.leftPanelDisabled;

			this.menu = oScreen.menu;

			kn.constructorEnd(this);
		}

		kn.extendAsViewModel(['View:Admin:SettingsMenu', 'AdminSettingsMenuViewModel'], AdminSettingsMenuViewModel);
		_.extend(AdminSettingsMenuViewModel.prototype, KnoinAbstractViewModel.prototype);

		AdminSettingsMenuViewModel.prototype.link = function (sRoute)
		{
			return '#/' + sRoute;
		};

		module.exports = AdminSettingsMenuViewModel;

	}());


/***/ },

/***/ 95:
/*!******************************************************!*\
  !*** ./dev/ViewModels/AdminSettingsPaneViewModel.js ***!
  \******************************************************/
/***/ function(module, exports, __webpack_require__) {

	
	(function () {

		'use strict';

		var
			_ = __webpack_require__(/*! _ */ 2),
			ko = __webpack_require__(/*! ko */ 3),

			Settings = __webpack_require__(/*! Storage:Settings */ 10),
			Data = __webpack_require__(/*! Storage:Admin:Data */ 18),
			Remote = __webpack_require__(/*! Storage:Admin:Remote */ 15),

			kn = __webpack_require__(/*! App:Knoin */ 5),
			KnoinAbstractViewModel = __webpack_require__(/*! Knoin:AbstractViewModel */ 9)
		;

		/**
		 * @constructor
		 * @extends KnoinAbstractViewModel
		 */
		function AdminSettingsPaneViewModel()
		{
			KnoinAbstractViewModel.call(this, 'Right', 'AdminPane');

			this.adminDomain = ko.observable(Settings.settingsGet('AdminDomain'));
			this.version = ko.observable(Settings.settingsGet('Version'));

			this.adminManLoadingVisibility = Data.adminManLoadingVisibility;

			kn.constructorEnd(this);
		}

		kn.extendAsViewModel(['View:Admin:SettingsPane', 'AdminSettingsPaneViewModel'], AdminSettingsPaneViewModel);
		_.extend(AdminSettingsPaneViewModel.prototype, KnoinAbstractViewModel.prototype);

		AdminSettingsPaneViewModel.prototype.logoutClick = function ()
		{
			Remote.adminLogout(function () {
				__webpack_require__(/*! App:Admin */ 16).loginAndLogoutReload();
			});
		};

		module.exports = AdminSettingsPaneViewModel;

	}());

/***/ },

/***/ 101:
/*!**********************************************************!*\
  !*** ./dev/ViewModels/Popups/PopupsActivateViewModel.js ***!
  \**********************************************************/
/***/ function(module, exports, __webpack_require__) {

	
	(function () {

		'use strict';

		var
			_ = __webpack_require__(/*! _ */ 2),
			ko = __webpack_require__(/*! ko */ 3),

			Enums = __webpack_require__(/*! Common/Enums */ 6),
			Utils = __webpack_require__(/*! Common/Utils */ 1),

			Settings = __webpack_require__(/*! Storage:Settings */ 10),
			Data = __webpack_require__(/*! Storage:Admin:Data */ 18),
			Remote = __webpack_require__(/*! Storage:Admin:Remote */ 15),

			kn = __webpack_require__(/*! App:Knoin */ 5),
			KnoinAbstractViewModel = __webpack_require__(/*! Knoin:AbstractViewModel */ 9)
		;

		/**
		 * @constructor
		 * @extends KnoinAbstractViewModel
		 */
		function PopupsActivateViewModel()
		{
			KnoinAbstractViewModel.call(this, 'Popups', 'PopupsActivate');

			var self = this;

			this.domain = ko.observable('');
			this.key = ko.observable('');
			this.key.focus = ko.observable(false);
			this.activationSuccessed = ko.observable(false);

			this.licenseTrigger = Data.licenseTrigger;

			this.activateProcess = ko.observable(false);
			this.activateText = ko.observable('');
			this.activateText.isError = ko.observable(false);

			this.key.subscribe(function () {
				this.activateText('');
				this.activateText.isError(false);
			}, this);

			this.activationSuccessed.subscribe(function (bValue) {
				if (bValue)
				{
					this.licenseTrigger(!this.licenseTrigger());
				}
			}, this);

			this.activateCommand = Utils.createCommand(this, function () {

				this.activateProcess(true);
				if (this.validateSubscriptionKey())
				{
					Remote.licensingActivate(function (sResult, oData) {

						self.activateProcess(false);
						if (Enums.StorageResultType.Success === sResult && oData.Result)
						{
							if (true === oData.Result)
							{
								self.activationSuccessed(true);
								self.activateText('Subscription Key Activated Successfully');
								self.activateText.isError(false);
							}
							else
							{
								self.activateText(oData.Result);
								self.activateText.isError(true);
								self.key.focus(true);
							}
						}
						else if (oData.ErrorCode)
						{
							self.activateText(Utils.getNotification(oData.ErrorCode));
							self.activateText.isError(true);
							self.key.focus(true);
						}
						else
						{
							self.activateText(Utils.getNotification(Enums.Notification.UnknownError));
							self.activateText.isError(true);
							self.key.focus(true);
						}

					}, this.domain(), this.key());
				}
				else
				{
					this.activateProcess(false);
					this.activateText('Invalid Subscription Key');
					this.activateText.isError(true);
					this.key.focus(true);
				}

			}, function () {
				return !this.activateProcess() && '' !== this.domain() && '' !== this.key() && !this.activationSuccessed();
			});

			kn.constructorEnd(this);
		}

		kn.extendAsViewModel(['View:Popup:Activate', 'PopupsActivateViewModel'], PopupsActivateViewModel);
		_.extend(PopupsActivateViewModel.prototype, KnoinAbstractViewModel.prototype);

		PopupsActivateViewModel.prototype.onShow = function ()
		{
			this.domain(Settings.settingsGet('AdminDomain'));
			if (!this.activateProcess())
			{
				this.key('');
				this.activateText('');
				this.activateText.isError(false);
				this.activationSuccessed(false);
			}
		};

		PopupsActivateViewModel.prototype.onFocus = function ()
		{
			if (!this.activateProcess())
			{
				this.key.focus(true);
			}
		};

		/**
		 * @returns {boolean}
		 */
		PopupsActivateViewModel.prototype.validateSubscriptionKey = function ()
		{
			var sValue = this.key();
			return '' === sValue || !!/^RL[\d]+-[A-Z0-9\-]+Z$/.test(Utils.trim(sValue));
		};

		module.exports = PopupsActivateViewModel;

	}());

/***/ },

/***/ 105:
/*!********************************************************!*\
  !*** ./dev/ViewModels/Popups/PopupsDomainViewModel.js ***!
  \********************************************************/
/***/ function(module, exports, __webpack_require__) {

	
	(function () {

		'use strict';

		var
			_ = __webpack_require__(/*! _ */ 2),
			ko = __webpack_require__(/*! ko */ 3),

			Enums = __webpack_require__(/*! Common/Enums */ 6),
			Consts = __webpack_require__(/*! Common/Consts */ 17),
			Utils = __webpack_require__(/*! Common/Utils */ 1),

			Remote = __webpack_require__(/*! Storage:Admin:Remote */ 15),

			kn = __webpack_require__(/*! App:Knoin */ 5),
			KnoinAbstractViewModel = __webpack_require__(/*! Knoin:AbstractViewModel */ 9)
		;

		/**
		 * @constructor
		 * @extends KnoinAbstractViewModel
		 */
		function PopupsDomainViewModel()
		{
			KnoinAbstractViewModel.call(this, 'Popups', 'PopupsDomain');

			this.edit = ko.observable(false);
			this.saving = ko.observable(false);
			this.savingError = ko.observable('');
			this.whiteListPage = ko.observable(false);

			this.testing = ko.observable(false);
			this.testingDone = ko.observable(false);
			this.testingImapError = ko.observable(false);
			this.testingSmtpError = ko.observable(false);
			this.testingImapErrorDesc = ko.observable('');
			this.testingSmtpErrorDesc = ko.observable('');

			this.testingImapError.subscribe(function (bValue) {
				if (!bValue)
				{
					this.testingImapErrorDesc('');
				}
			}, this);

			this.testingSmtpError.subscribe(function (bValue) {
				if (!bValue)
				{
					this.testingSmtpErrorDesc('');
				}
			}, this);

			this.testingImapErrorDesc = ko.observable('');
			this.testingSmtpErrorDesc = ko.observable('');

			this.imapServerFocus = ko.observable(false);
			this.smtpServerFocus = ko.observable(false);

			this.name = ko.observable('');
			this.name.focused = ko.observable(false);

			this.imapServer = ko.observable('');
			this.imapPort = ko.observable('' + Consts.Values.ImapDefaulPort);
			this.imapSecure = ko.observable(Enums.ServerSecure.None);
			this.imapShortLogin = ko.observable(false);
			this.smtpServer = ko.observable('');
			this.smtpPort = ko.observable('' + Consts.Values.SmtpDefaulPort);
			this.smtpSecure = ko.observable(Enums.ServerSecure.None);
			this.smtpShortLogin = ko.observable(false);
			this.smtpAuth = ko.observable(true);
			this.whiteList = ko.observable('');

			this.headerText = ko.computed(function () {
				var sName = this.name();
				return this.edit() ? 'Edit Domain "' + sName + '"' :
					'Add Domain' + ('' === sName ? '' : ' "' + sName + '"');
			}, this);

			this.domainIsComputed = ko.computed(function () {
				return '' !== this.name() &&
					'' !== this.imapServer() &&
					'' !== this.imapPort() &&
					'' !== this.smtpServer() &&
					'' !== this.smtpPort();
			}, this);

			this.canBeTested = ko.computed(function () {
				return !this.testing() && this.domainIsComputed();
			}, this);

			this.canBeSaved = ko.computed(function () {
				return !this.saving() && this.domainIsComputed();
			}, this);

			this.createOrAddCommand = Utils.createCommand(this, function () {
				this.saving(true);
				Remote.createOrUpdateDomain(
					_.bind(this.onDomainCreateOrSaveResponse, this),
					!this.edit(),
					this.name(),
					this.imapServer(),
					Utils.pInt(this.imapPort()),
					this.imapSecure(),
					this.imapShortLogin(),
					this.smtpServer(),
					Utils.pInt(this.smtpPort()),
					this.smtpSecure(),
					this.smtpShortLogin(),
					this.smtpAuth(),
					this.whiteList()
				);
			}, this.canBeSaved);

			this.testConnectionCommand = Utils.createCommand(this, function () {
				this.whiteListPage(false);
				this.testingDone(false);
				this.testingImapError(false);
				this.testingSmtpError(false);
				this.testing(true);
				Remote.testConnectionForDomain(
					_.bind(this.onTestConnectionResponse, this),
					this.name(),
					this.imapServer(),
					Utils.pInt(this.imapPort()),
					this.imapSecure(),
					this.smtpServer(),
					Utils.pInt(this.smtpPort()),
					this.smtpSecure(),
					this.smtpAuth()
				);
			}, this.canBeTested);

			this.whiteListCommand = Utils.createCommand(this, function () {
				this.whiteListPage(!this.whiteListPage());
			});

			// smart form improvements
			this.imapServerFocus.subscribe(function (bValue) {
				if (bValue && '' !== this.name() && '' === this.imapServer())
				{
					this.imapServer(this.name().replace(/[.]?[*][.]?/g, ''));
				}
			}, this);

			this.smtpServerFocus.subscribe(function (bValue) {
				if (bValue && '' !== this.imapServer() && '' === this.smtpServer())
				{
					this.smtpServer(this.imapServer().replace(/imap/ig, 'smtp'));
				}
			}, this);

			this.imapSecure.subscribe(function (sValue) {
				var iPort = Utils.pInt(this.imapPort());
				sValue = Utils.pString(sValue);
				switch (sValue)
				{
					case '0':
						if (993 === iPort)
						{
							this.imapPort('143');
						}
						break;
					case '1':
						if (143 === iPort)
						{
							this.imapPort('993');
						}
						break;
				}
			}, this);

			this.smtpSecure.subscribe(function (sValue) {
				var iPort = Utils.pInt(this.smtpPort());
				sValue = Utils.pString(sValue);
				switch (sValue)
				{
					case '0':
						if (465 === iPort || 587 === iPort)
						{
							this.smtpPort('25');
						}
						break;
					case '1':
						if (25 === iPort || 587 === iPort)
						{
							this.smtpPort('465');
						}
						break;
					case '2':
						if (25 === iPort || 465 === iPort)
						{
							this.smtpPort('587');
						}
						break;
				}
			}, this);

			kn.constructorEnd(this);
		}

		kn.extendAsViewModel(['View:Popup:Domain', 'PopupsDomainViewModel'], PopupsDomainViewModel);
		_.extend(PopupsDomainViewModel.prototype, KnoinAbstractViewModel.prototype);

		PopupsDomainViewModel.prototype.onTestConnectionResponse = function (sResult, oData)
		{
			this.testing(false);
			if (Enums.StorageResultType.Success === sResult && oData.Result)
			{
				this.testingDone(true);
				this.testingImapError(true !== oData.Result.Imap);
				this.testingSmtpError(true !== oData.Result.Smtp);

				if (this.testingImapError() && oData.Result.Imap)
				{
					this.testingImapErrorDesc(oData.Result.Imap);
				}

				if (this.testingSmtpError() && oData.Result.Smtp)
				{
					this.testingSmtpErrorDesc(oData.Result.Smtp);
				}
			}
			else
			{
				this.testingImapError(true);
				this.testingSmtpError(true);
			}
		};

		PopupsDomainViewModel.prototype.onDomainCreateOrSaveResponse = function (sResult, oData)
		{
			this.saving(false);
			if (Enums.StorageResultType.Success === sResult && oData)
			{
				if (oData.Result)
				{
					__webpack_require__(/*! App:Admin */ 16).reloadDomainList();
					this.closeCommand();
				}
				else if (Enums.Notification.DomainAlreadyExists === oData.ErrorCode)
				{
					this.savingError('Domain already exists');
				}
			}
			else
			{
				this.savingError('Unknown error');
			}
		};

		PopupsDomainViewModel.prototype.onHide = function ()
		{
			this.whiteListPage(false);
		};

		PopupsDomainViewModel.prototype.onShow = function (oDomain)
		{
			this.saving(false);
			this.whiteListPage(false);

			this.testing(false);
			this.testingDone(false);
			this.testingImapError(false);
			this.testingSmtpError(false);

			this.clearForm();
			if (oDomain)
			{
				this.edit(true);

				this.name(Utils.trim(oDomain.Name));
				this.imapServer(Utils.trim(oDomain.IncHost));
				this.imapPort('' + Utils.pInt(oDomain.IncPort));
				this.imapSecure(Utils.trim(oDomain.IncSecure));
				this.imapShortLogin(!!oDomain.IncShortLogin);
				this.smtpServer(Utils.trim(oDomain.OutHost));
				this.smtpPort('' + Utils.pInt(oDomain.OutPort));
				this.smtpSecure(Utils.trim(oDomain.OutSecure));
				this.smtpShortLogin(!!oDomain.OutShortLogin);
				this.smtpAuth(!!oDomain.OutAuth);
				this.whiteList(Utils.trim(oDomain.WhiteList));
			}
		};

		PopupsDomainViewModel.prototype.onFocus = function ()
		{
			if ('' === this.name())
			{
				this.name.focused(true);
			}
		};

		PopupsDomainViewModel.prototype.clearForm = function ()
		{
			this.edit(false);
			this.whiteListPage(false);

			this.savingError('');

			this.name('');
			this.name.focused(false);

			this.imapServer('');
			this.imapPort('' + Consts.Values.ImapDefaulPort);
			this.imapSecure(Enums.ServerSecure.None);
			this.imapShortLogin(false);
			this.smtpServer('');
			this.smtpPort('' + Consts.Values.SmtpDefaulPort);
			this.smtpSecure(Enums.ServerSecure.None);
			this.smtpShortLogin(false);
			this.smtpAuth(true);
			this.whiteList('');
		};

		module.exports = PopupsDomainViewModel;

	}());

/***/ },

/***/ 109:
/*!********************************************************!*\
  !*** ./dev/ViewModels/Popups/PopupsPluginViewModel.js ***!
  \********************************************************/
/***/ function(module, exports, __webpack_require__) {

	
	(function () {

		'use strict';

		var
			_ = __webpack_require__(/*! _ */ 2),
			ko = __webpack_require__(/*! ko */ 3),
			key = __webpack_require__(/*! key */ 19),

			Enums = __webpack_require__(/*! Common/Enums */ 6),
			Utils = __webpack_require__(/*! Common/Utils */ 1),

			Remote = __webpack_require__(/*! Storage:Admin:Remote */ 15),

			kn = __webpack_require__(/*! App:Knoin */ 5),
			KnoinAbstractViewModel = __webpack_require__(/*! Knoin:AbstractViewModel */ 9)
		;

		/**
		 * @constructor
		 * @extends KnoinAbstractViewModel
		 */
		function PopupsPluginViewModel()
		{
			KnoinAbstractViewModel.call(this, 'Popups', 'PopupsPlugin');

			var self = this;

			this.onPluginSettingsUpdateResponse = _.bind(this.onPluginSettingsUpdateResponse, this);

			this.saveError = ko.observable('');

			this.name = ko.observable('');
			this.readme = ko.observable('');

			this.configures = ko.observableArray([]);

			this.hasReadme = ko.computed(function () {
				return '' !== this.readme();
			}, this);

			this.hasConfiguration = ko.computed(function () {
				return 0 < this.configures().length;
			}, this);

			this.readmePopoverConf = {
				'placement': 'top',
				'trigger': 'hover',
				'title': 'About',
				'content': function () {
					return self.readme();
				}
			};

			this.saveCommand = Utils.createCommand(this, function () {

				var oList = {};

				oList['Name'] = this.name();

				_.each(this.configures(), function (oItem) {

					var mValue = oItem.value();
					if (false === mValue || true === mValue)
					{
						mValue = mValue ? '1' : '0';
					}

					oList['_' + oItem['Name']] = mValue;

				}, this);

				this.saveError('');
				Remote.pluginSettingsUpdate(this.onPluginSettingsUpdateResponse, oList);

			}, this.hasConfiguration);

			this.bDisabeCloseOnEsc = true;
			this.sDefaultKeyScope = Enums.KeyState.All;

			this.tryToClosePopup = _.debounce(_.bind(this.tryToClosePopup, this), 200);

			kn.constructorEnd(this);
		}

		kn.extendAsViewModel(['View:Popup:Plugin', 'PopupsPluginViewModel'], PopupsPluginViewModel);
		_.extend(PopupsPluginViewModel.prototype, KnoinAbstractViewModel.prototype);

		PopupsPluginViewModel.prototype.onPluginSettingsUpdateResponse = function (sResult, oData)
		{
			if (Enums.StorageResultType.Success === sResult && oData && oData.Result)
			{
				this.cancelCommand();
			}
			else
			{
				this.saveError('');
				if (oData && oData.ErrorCode)
				{
					this.saveError(Utils.getNotification(oData.ErrorCode));
				}
				else
				{
					this.saveError(Utils.getNotification(Enums.Notification.CantSavePluginSettings));
				}
			}
		};

		PopupsPluginViewModel.prototype.onShow = function (oPlugin)
		{
			this.name();
			this.readme();
			this.configures([]);

			if (oPlugin)
			{
				this.name(oPlugin['Name']);
				this.readme(oPlugin['Readme']);

				var aConfig = oPlugin['Config'];
				if (Utils.isNonEmptyArray(aConfig))
				{
					this.configures(_.map(aConfig, function (aItem) {
						return {
							'value': ko.observable(aItem[0]),
							'Name': aItem[1],
							'Type': aItem[2],
							'Label': aItem[3],
							'Default': aItem[4],
							'Desc': aItem[5]
						};
					}));
				}
			}
		};

		PopupsPluginViewModel.prototype.tryToClosePopup = function ()
		{
			var
				self = this,
				PopupsAskViewModel = __webpack_require__(/*! View:Popup:Ask */ 31)
			;

			if (!kn.isPopupVisible(PopupsAskViewModel))
			{
				kn.showScreenPopup(PopupsAskViewModel, [Utils.i18n('POPUPS_ASK/DESC_WANT_CLOSE_THIS_WINDOW'), function () {
					if (self.modalVisibility())
					{
						Utils.delegateRun(self, 'cancelCommand');
					}
				}]);
			}
		};

		PopupsPluginViewModel.prototype.onBuild = function ()
		{
			key('esc', Enums.KeyState.All, _.bind(function () {
				if (this.modalVisibility())
				{
					this.tryToClosePopup();
				}
				return false;
			}, this));
		};

		module.exports = PopupsPluginViewModel;

	}());

/***/ }

});