/* RainLoop Webmail (c) RainLoop Team | MIT */
(function(){function a(a){function l(){if(g&&d<a){var b=g,c=b[0],f=Array.prototype.slice.call(b,1),m=b.index;g===h?g=h=null:g=g.next,++d,f.push(function(a,b){--d;if(i)return;a?e&&k(i=a,e=j=g=h=null):(j[m]=b,--e?l():k(null,j))}),c.apply(null,f)}}var c={},d=0,e=0,f=-1,g,h,i=null,j=[],k=b;return arguments.length<1&&(a=Infinity),c.defer=function(){if(!i){var a=arguments;a.index=++f,h?(h.next=a,h=h.next):g=h=a,++e,l()}return c},c.await=function(a){return k=a,e||k(i,j),c},c}function b(){}typeof module=="undefined"?self.queue=a:module.exports=a,a.version="0.0.2"})();
/******/ (function(modules) { // webpackBootstrap
/******/ 	// The module cache
/******/ 	var installedModules = {};

/******/ 	// The require function
/******/ 	function __webpack_require__(moduleId) {

/******/ 		// Check if module is in cache
/******/ 		if(installedModules[moduleId])
/******/ 			return installedModules[moduleId].exports;

/******/ 		// Create a new module (and put it into the cache)
/******/ 		var module = installedModules[moduleId] = {
/******/ 			exports: {},
/******/ 			id: moduleId,
/******/ 			loaded: false
/******/ 		};

/******/ 		// Execute the module function
/******/ 		modules[moduleId].call(module.exports, module, module.exports, __webpack_require__);

/******/ 		// Flag the module as loaded
/******/ 		module.loaded = true;

/******/ 		// Return the exports of the module
/******/ 		return module.exports;
/******/ 	}


/******/ 	// expose the modules object (__webpack_modules__)
/******/ 	__webpack_require__.m = modules;

/******/ 	// expose the module cache
/******/ 	__webpack_require__.c = installedModules;

/******/ 	// __webpack_public_path__
/******/ 	__webpack_require__.p = "";

/******/ 	// Load entry module and return exports
/******/ 	return __webpack_require__(0);
/******/ })
/************************************************************************/
/******/ ([
/* 0 */
/***/ function(module, exports, __webpack_require__) {

	(function () {
		'use strict';
		__webpack_require__(1).Jua = __webpack_require__(7);
	}());

/***/ },
/* 1 */
/***/ function(module, exports, __webpack_require__) {

	module.exports = window;

/***/ },
/* 2 */
/***/ function(module, exports, __webpack_require__) {

	
	(function () {

		'use strict';

		var Globals = {};

		Globals.iDefLimit = 20;

		Globals.bIsAjaxUploaderSupported = (function () {

			var
				window = __webpack_require__(1),
				oInput = window.document.createElement('input')
			;

			oInput.type = 'file';
			return !!('XMLHttpRequest' in window && 'multiple' in oInput && 'FormData' in window && (new window.XMLHttpRequest()).upload && true);
		}());

		module.exports = Globals;

	}());

/***/ },
/* 3 */
/***/ function(module, exports, __webpack_require__) {

	module.exports = jQuery;

/***/ },
/* 4 */
/***/ function(module, exports, __webpack_require__) {

	
	(function () {

		'use strict';

		var
			Utils = {},

			window = __webpack_require__(1),
			$ = __webpack_require__(3),

			Globals = __webpack_require__(2)
		;

		/**
		 * @param {*} mValue
		 * @return {boolean}
		 */
		Utils.isUndefined = function (mValue)
		{
			return 'undefined' === typeof mValue;
		};

		/**
		 * @param {Object} mObjectFirst
		 * @param {Object=} mObjectSecond
		 * @return {Object}
		 */
		Utils.extend = function (mObjectFirst, mObjectSecond)
		{
			if (mObjectSecond)
			{
				for (var sProp in mObjectSecond)
				{
					if (mObjectSecond.hasOwnProperty(sProp))
					{
						mObjectFirst[sProp] = mObjectSecond[sProp];
					}
				}
			}

			return mObjectFirst;
		};

		/**
		 * @param {*} oParent
		 * @param {*} oDescendant
		 *
		 * @return {boolean}
		 */
		Utils.contains = function (oParent, oDescendant)
		{
			var bResult = false;
			if (oParent && oDescendant)
			{
				if (oParent === oDescendant)
				{
					bResult = true;
				}
				else if (oParent.contains)
				{
					bResult = oParent.contains(oDescendant);
				}
				else
				{
					/*jshint bitwise: false*/
					bResult = oDescendant.compareDocumentPosition ?
						!!(oDescendant.compareDocumentPosition(oParent) & 8) : false;
					/*jshint bitwise: true*/
				}
			}

			return bResult;
		};

		Utils.mainClearTimeout = function(iTimer)
		{
			if (0 < iTimer)
			{
				clearTimeout(iTimer);
			}

			iTimer = 0;
		};

		/**
		 * @param {Event} oEvent
		 * @return {?Event}
		 */
		Utils.getEvent = function(oEvent)
		{
			oEvent = (oEvent && (oEvent.originalEvent ?
				oEvent.originalEvent : oEvent)) || window.event;

			return oEvent.dataTransfer ? oEvent : null;
		};

		/**
		 * @param {Object} oValues
		 * @param {string} sKey
		 * @param {?} mDefault
		 * @return {?}
		 */
		Utils.getValue = function (oValues, sKey, mDefault)
		{
			return (!oValues || !sKey || Utils.isUndefined(oValues[sKey])) ? mDefault : oValues[sKey];
		};

		/**
		 * @param {Object} oOwner
		 * @param {string} sPublicName
		 * @param {*} mObject
		 */
		Utils.setValue = function(oOwner, sPublicName, mObject)
		{
			oOwner[sPublicName] = mObject;
		};

		/**
		 * @param {*} aData
		 * @return {boolean}
		 */
		Utils.isNonEmptyArray = function (aData)
		{
			return aData && aData.length && 0 < aData.length ? true : false;
		};

		/**
		 * @param {*} mValue
		 * @return {number}
		 */
		Utils.pInt = function (mValue)
		{
			return parseInt(mValue || 0, 10);
		};

		/**
		 * @param {Function} fFunction
		 * @param {Object=} oScope
		 * @return {Function}
		 */
		Utils.scopeBind = function (fFunction, oScope)
		{
			return function () {
				return fFunction.apply(Utils.isUndefined(oScope) ? null : oScope,
					Array.prototype.slice.call(arguments));
			};
		};

		/**
		 * @param {number=} iLen
		 * @return {string}
		 */
		Utils.fakeMd5 = function (iLen)
		{
			var
				sResult = '',
				sLine = '0123456789abcdefghijklmnopqrstuvwxyz'
			;

			iLen = Utils.isUndefined(iLen) ? 32 : Utils.pInt(iLen);

			while (sResult.length < iLen)
			{
				sResult += sLine.substr(window.Math.round(window.Math.random() * sLine.length), 1);
			}

			return sResult;
		};

		/**
		 * @return {string}
		 */
		Utils.getNewUid = function ()
		{
			return 'jua-uid-' + Utils.fakeMd5(16) + '-' + (new window.Date()).getTime().toString();
		};

		/**
		 * @param {*} oFile
		 * @return {Object}
		 */
		Utils.getDataFromFile = function (oFile)
		{
			var
				sFileName = Utils.isUndefined(oFile.fileName) ? (Utils.isUndefined(oFile.name) ? null : oFile.name) : oFile.fileName,
				iSize = Utils.isUndefined(oFile.fileSize) ? (Utils.isUndefined(oFile.size) ? null : oFile.size) : oFile.fileSize,
				sType = Utils.isUndefined(oFile.type) ? null : oFile.type
			;

			if (sFileName.charAt(0) === '/')
			{
				sFileName = sFileName.substr(1);
			}

			if ('' === sType && 0 === iSize)
			{
				return null; // Folder
			}

			return {
				'FileName': sFileName,
				'Size': iSize,
				'Type': sType,
				'Folder': '',
				'File' : oFile
			};
		};

		/**
		 * @param {*} aItems
		 * @param {Function} fFileCallback
		 * @param {number=} iLimit = 20
		 * @param {Function=} fLimitCallback
		 */
		Utils.getDataFromFiles = function (aItems, fFileCallback, iLimit, fLimitCallback)
		{
			var
				iInputLimit = 0,
				iLen = 0,
				iIndex = 0,
				oItem = null,
				oFile = null,
				bUseLimit = false,
				bCallLimit = false
			;

			iLimit = Utils.isUndefined(iLimit) ? Globals.iDefLimit : Utils.pInt(iLimit);
			iInputLimit = iLimit;
			bUseLimit = 0 < iLimit;

			aItems = aItems && 0 < aItems.length ? aItems : null;
			if (aItems)
			{
				for (iIndex = 0, iLen = aItems.length; iIndex < iLen; iIndex++)
				{
					oItem = aItems[iIndex];
					if (oItem)
					{
						if (!bUseLimit || 0 <= --iLimit)
						{
							oFile = Utils.getDataFromFile(oItem);
							if (oFile)
							{
								fFileCallback(oFile);
							}
						}
						else if (bUseLimit && !bCallLimit)
						{
							if (0 > iLimit && fLimitCallback)
							{
								bCallLimit = true;
								fLimitCallback(iInputLimit);
							}
						}
					}
				}
			}
		};

		/**
		 * @param {*} oInput
		 * @param {Function} fFileCallback
		 * @param {number=} iLimit = 20
		 * @param {Function=} fLimitCallback
		 */
		Utils.getDataFromInput = function (oInput, fFileCallback, iLimit, fLimitCallback)
		{
			var aFiles = oInput && oInput.files && 0 < oInput.files.length ? oInput.files : null;
			if (aFiles)
			{
				Utils.getDataFromFiles(aFiles, fFileCallback, iLimit, fLimitCallback);
			}
			else
			{
				fFileCallback({
					'FileName': oInput.value.split('\\').pop().split('/').pop(),
					'Size': null,
					'Type': null,
					'Folder': '',
					'File' : null
				});
			}
		};

		Utils.eventContainsFiles = function (oEvent)
		{
			var bResult = false;
			if (oEvent && oEvent.dataTransfer && oEvent.dataTransfer.types && oEvent.dataTransfer.types.length)
			{
				var
					iIindex = 0,
					iLen = oEvent.dataTransfer.types.length
				;

				for (; iIindex < iLen; iIindex++)
				{
					if (oEvent.dataTransfer.types[iIindex].toLowerCase() === 'files')
					{
						bResult = true;
						break;
					}
				}
			}

			return bResult;
		};

		/**
		 * @param {Event} oEvent
		 * @param {Function} fFileCallback
		 * @param {number=} iLimit = 20
		 * @param {Function=} fLimitCallback
		 */
		Utils.getDataFromDragEvent = function (oEvent, fFileCallback, iLimit, fLimitCallback)
		{
			var aFiles = null;

			oEvent = Utils.getEvent(oEvent);
			if (oEvent && Utils.eventContainsFiles(oEvent))
			{
				aFiles = (Utils.getValue(oEvent, 'files', null) || (oEvent.dataTransfer ?
					Utils.getValue(oEvent.dataTransfer, 'files', null) : null));

				if (aFiles && 0 < aFiles.length)
				{
					Utils.getDataFromFiles(aFiles, fFileCallback, iLimit, fLimitCallback);
				}
			}
		};

		Utils.createNextLabel = function ()
		{
			return $('<label style="' +
		'position: absolute; background-color:#fff; right: 0px; top: 0px; left: 0px; bottom: 0px; margin: 0px; padding: 0px; cursor: pointer;' +
			'"></label>').css({
				'opacity': 0
			});
		};

		Utils.createNextInput = function ()
		{
			return $('<input type="file" tabindex="-1" hidefocus="hidefocus" style="position: absolute; left: -9999px;" />');
		};

		/**
		 * @param {string=} sName
		 * @param {boolean=} bMultiple = true
		 * @return {?Object}
		 */
		Utils.getNewInput = function (sName, bMultiple)
		{
			sName = Utils.isUndefined(sName) ? '' : sName.toString();

			var oLocal = Utils.createNextInput();
			if (0 < sName.length)
			{
				oLocal.attr('name', sName);
			}

			if (Utils.isUndefined(bMultiple) ? true : bMultiple)
			{
				oLocal.prop('multiple', true);
			}

			return oLocal;
		};

		/**
		 * @param {?} mStringOrFunction
		 * @param {Array=} aFunctionParams
		 * @return {string}
		 */
		Utils.getStringOrCallFunction = function (mStringOrFunction, aFunctionParams)
		{
			return $.isFunction(mStringOrFunction) ?
				mStringOrFunction.apply(null, $.isArray(aFunctionParams) ? aFunctionParams : []).toString() :
				mStringOrFunction.toString();
		};

		module.exports = Utils;

	}());

/***/ },
/* 5 */
/***/ function(module, exports, __webpack_require__) {

	
	(function () {

		'use strict';

		var
			$ = __webpack_require__(3),

			Globals = __webpack_require__(2),
			Utils = __webpack_require__(4)
		;

		/**
		 * @constructor
		 * @param {Jua} oJua
		 * @param {Object} oOptions
		 */
		function AjaxDriver(oJua, oOptions)
		{
			this.oXhrs = {};
			this.oUids = {};
			this.oJua = oJua;
			this.oOptions = oOptions;
		}

		/**
		 * @type {Object}
		 */
		AjaxDriver.prototype.oXhrs = {};

		/**
		 * @type {Object}
		 */
		AjaxDriver.prototype.oUids = {};

		/**
		 * @type {?Jua}
		 */
		AjaxDriver.prototype.oJua = null;

		/**
		 * @type {Object}
		 */
		AjaxDriver.prototype.oOptions = {};

		/**
		 * @return {boolean}
		 */
		AjaxDriver.prototype.isDragAndDropSupported = function ()
		{
			return true;
		};

		/**
		 * @param {string} sUid
		 */
		AjaxDriver.prototype.regTaskUid = function (sUid)
		{
			this.oUids[sUid] = true;
		};

		/**
		 * @param {string} sUid
		 * @param {?} oFileInfo
		 * @param {Function} fCallback
		 */
		AjaxDriver.prototype.uploadTask = function (sUid, oFileInfo, fCallback)
		{
			if (false === this.oUids[sUid] || !oFileInfo || !oFileInfo['File'])
			{
				fCallback(null, sUid);
				return false;
			}

			try
			{
				var
					self = this,
					oXhr = new XMLHttpRequest(),
					oFormData = new FormData(),
					sAction = Utils.getValue(this.oOptions, 'action', ''),
					aHidden = Utils.getValue(this.oOptions, 'hidden', {}),
					fStartFunction = this.oJua.getEvent('onStart'),
					fCompleteFunction = this.oJua.getEvent('onComplete'),
					fProgressFunction = this.oJua.getEvent('onProgress')
				;

				oXhr.open('POST', sAction, true);

				if (fProgressFunction && oXhr.upload)
				{
					oXhr.upload.onprogress = function (oEvent) {
						if (oEvent && oEvent.lengthComputable && !Utils.isUndefined(oEvent.loaded) && !Utils.isUndefined(oEvent.total))
						{
							fProgressFunction(sUid, oEvent.loaded, oEvent.total);
						}
					};
				}

				oXhr.onreadystatechange = function () {
					if (4 === oXhr.readyState && 200 === oXhr.status)
					{
						if (fCompleteFunction)
						{
							var
								bResult = false,
								oResult = null
							;

							try
							{
								oResult = $.parseJSON(oXhr.responseText);
								bResult = true;
							}
							catch (oException)
							{
								oResult = null;
							}

							fCompleteFunction(sUid, bResult, oResult);
						}

						if (!Utils.isUndefined(self.oXhrs[sUid]))
						{
							self.oXhrs[sUid] = null;
						}

						fCallback(null, sUid);
					}
					else
					{
						if (4 === oXhr.readyState)
						{
							fCompleteFunction(sUid, false, null);
							fCallback(null, sUid);
						}
					}
				};

				if (fStartFunction)
				{
					fStartFunction(sUid);
				}

				oFormData.append('jua-post-type', 'ajax');
				oFormData.append(Utils.getValue(this.oOptions, 'name', 'juaFile'), oFileInfo['File']);
				$.each(aHidden, function (sKey, sValue) {
					oFormData.append(sKey, Utils.getStringOrCallFunction(sValue, [oFileInfo]));
				});

				oXhr.send(oFormData);

				this.oXhrs[sUid] = oXhr;
				return true;
			}
			catch (oError)
			{
			}

			fCallback(null, sUid);
			return false;
		};

		AjaxDriver.prototype.generateNewInput = function (oClickElement)
		{
			var
				self = this,
				oLabel = null,
				oInput = null
			;

			if (oClickElement)
			{
				oInput = Utils.getNewInput('', !Utils.getValue(this.oOptions, 'disableMultiple', false));
				oLabel = Utils.createNextLabel();
				oLabel.append(oInput);

				$(oClickElement).append(oLabel);

				oInput
					.on('click', function () {
						var fOn = self.oJua.getEvent('onDialog');
						if (fOn)
						{
							fOn();
						}
					})
					.on('change', function () {
						Utils.getDataFromInput(this, function (oFile) {
								self.oJua.addNewFile(oFile);
								self.generateNewInput(oClickElement);

								setTimeout(function () {
									oLabel.remove();
								}, 10);
							},
							Utils.getValue(self.oOptions, 'multipleSizeLimit', Globals.iDefLimit),
							self.oJua.getEvent('onLimitReached')
						);
					})
				;
			}
		};

		AjaxDriver.prototype.cancel = function (sUid)
		{
			this.oUids[sUid] = false;
			if (this.oXhrs[sUid])
			{
				try
				{
					if (this.oXhrs[sUid].abort)
					{
						this.oXhrs[sUid].abort();
					}
				}
				catch (oError)
				{
				}

				this.oXhrs[sUid] = null;
			}
		};

		module.exports = AjaxDriver;

	}());


/***/ },
/* 6 */
/***/ function(module, exports, __webpack_require__) {

	
	(function () {

		'use strict';

		var
			window = __webpack_require__(1),
			$ = __webpack_require__(3),

			Globals = __webpack_require__(2),
			Utils = __webpack_require__(4)
		;
		
		/**
		 * @constructor
		 * @param {Jua} oJua
		 * @param {Object} oOptions
		 */
		function IframeDriver(oJua, oOptions)
		{
			this.oUids = {};
			this.oForms = {};
			this.oJua = oJua;
			this.oOptions = oOptions;
		}

		/**
		 * @type {Object}
		 */
		IframeDriver.prototype.oUids = {};

		/**
		 * @type {Object}
		 */
		IframeDriver.prototype.oForms = {};

		/**
		 * @type {?Jua}
		 */
		IframeDriver.prototype.oJua = null;

		/**
		 * @type {Object}
		 */
		IframeDriver.prototype.oOptions = {};

		/**
		 * @return {boolean}
		 */
		IframeDriver.prototype.isDragAndDropSupported = function ()
		{
			return false;
		};

		/**
		 * @param {string} sUid
		 */
		IframeDriver.prototype.regTaskUid = function (sUid)
		{
			this.oUids[sUid] = true;
		};

		/**
		 * @param {string} sUid
		 * @param {?} oFileInfo
		 * @param {Function} fCallback
		 */
		IframeDriver.prototype.uploadTask = function (sUid, oFileInfo, fCallback)
		{
			if (false === this.oUids[sUid])
			{
				fCallback(null, sUid);
				return false;
			}

			var
				oForm = this.oForms[sUid],
				aHidden = Utils.getValue(this.oOptions, 'hidden', {}),
				fStartFunction = this.oJua.getEvent('onStart'),
				fCompleteFunction = this.oJua.getEvent('onComplete')
			;

			if (oForm)
			{
				oForm.append($('<input type="hidden" />').attr('name', 'jua-post-type').val('iframe'));
				$.each(aHidden, function (sKey, sValue) {
					oForm.append($('<input type="hidden" />').attr('name', sKey).val(Utils.getStringOrCallFunction(sValue, [oFileInfo])));
				});

				oForm.trigger('submit');
				if (fStartFunction)
				{
					fStartFunction(sUid);
				}

				oForm.find('iframe').on('load', function () {

					var
						bResult = false,
						oIframeDoc = null,
						oResult = {}
					;

					if (fCompleteFunction)
					{
						try
						{
							oIframeDoc = this.contentDocument ? this.contentDocument: this.contentWindow.document;
							oResult = $.parseJSON(oIframeDoc.body.innerHTML);
							bResult = true;
						}
						catch (oErr)
						{
							oResult = {};
						}

						fCompleteFunction(sUid, bResult, oResult);
					}

					fCallback(null, sUid);

					window.setTimeout(function () {
						oForm.remove();
					}, 100);
				});
			}
			else
			{
				fCallback(null, sUid);
			}

			return true;
		};

		IframeDriver.prototype.generateNewInput = function (oClickElement)
		{
			var
				self = this,
				sUid = '',
				oInput = null,
				oIframe = null,
				sAction = Utils.getValue(this.oOptions, 'action', ''),
				oForm = null
			;

			if (oClickElement)
			{
				sUid = Utils.getNewUid();

				oInput = Utils.getNewInput(Utils.getValue(this.oOptions, 'name', 'juaFile'), !Utils.getValue(this.oOptions, 'disableMultiple', false));

				oForm = $('<form action="' + sAction + '" target="iframe-' + sUid + '" ' +
		' method="POST" enctype="multipart/form-data" style="display: block; cursor: pointer;"></form>');

				oIframe = $('<iframe name="iframe-' + sUid + '" tabindex="-1" src="javascript:void(0);" ' +
		' style="position: absolute; top: -1000px; left: -1000px; cursor: pointer;" />').css({'opacity': 0});

				oForm.append(Utils.createNextLabel().append(oInput)).append(oIframe);

				$(oClickElement).append(oForm);

				this.oForms[sUid] = oForm;

				oInput
					.on('click', function () {
						var fOn = self.oJua.getEvent('onDialog');
						if (fOn)
						{
							fOn();
						}
					})
					.on('change', function () {
						Utils.getDataFromInput(this, function (oFile) {
								if (oFile)
								{
									oForm.css({
										'position': 'absolute',
										'top': -1000,
										'left': -1000
									});

									self.oJua.addFile(sUid, oFile);
									self.generateNewInput(oClickElement);
								}

							},
							Utils.getValue(self.oOptions, 'multipleSizeLimit', Globals.iDefLimit),
							self.oJua.getEvent('onLimitReached')
						);
					})
				;
			}
		};

		IframeDriver.prototype.cancel = function (sUid)
		{
			this.oUids[sUid] = false;
			if (this.oForms[sUid])
			{
				this.oForms[sUid].remove();
				this.oForms[sUid] = false;
			}
		};

		module.exports = IframeDriver;

	}());

/***/ },
/* 7 */
/***/ function(module, exports, __webpack_require__) {

	
	(function () {

		'use strict';

		var
			Utils = __webpack_require__(4),
			Globals = __webpack_require__(2)
		;

		/**
		 * @constructor
		 * @param {Object=} oOptions
		 */
		function Jua(oOptions)
		{
			oOptions = Utils.isUndefined(oOptions) ? {} : oOptions;

			var
				self = this,

				Driver = null,

				window = __webpack_require__(1),
				$ = __webpack_require__(3),

				queue = __webpack_require__(8)
			;

			self.bEnableDnD = true;

			self.oEvents = {
				'onDialog': null,
				'onSelect': null,
				'onStart': null,
				'onComplete': null,
				'onCompleteAll': null,
				'onProgress': null,
				'onDragEnter': null,
				'onDragLeave': null,
				'onDrop': null,
				'onBodyDragEnter': null,
				'onBodyDragLeave': null,
				'onLimitReached': null
			};

			self.oOptions = Utils.extend({
				'action': '',
				'name': '',
				'hidden': {},
				'queueSize': 10,
				'clickElement': false,
				'dragAndDropElement': false,
				'dragAndDropBodyElement': false,
				'disableAjaxUpload': false,
				'disableDragAndDrop': false,
				'disableMultiple': false,
				'disableDocumentDropPrevent': false,
				'multipleSizeLimit': 50
			}, oOptions);

			self.oQueue = queue(Utils.pInt(Utils.getValue(self.oOptions, 'queueSize', 10)));
			if (self.runEvent('onCompleteAll'))
			{
				self.oQueue.await(function () {
					self.runEvent('onCompleteAll');
				});
			}

			Driver = (self.isAjaxUploaderSupported() && !Utils.getValue(self.oOptions, 'disableAjaxUpload', false) ?
				__webpack_require__(5) : __webpack_require__(6));

			self.oDriver = new Driver(self, self.oOptions);

			self.oClickElement = Utils.getValue(self.oOptions, 'clickElement', null);

			if (self.oClickElement)
			{
				$(self.oClickElement).css({
					'position': 'relative',
					'overflow': 'hidden'
				});

				if ('inline' === $(this.oClickElement).css('display'))
				{
					$(this.oClickElement).css('display', 'inline-block');
				}

				this.oDriver.generateNewInput(this.oClickElement);
			}

			if (this.oDriver.isDragAndDropSupported() && Utils.getValue(this.oOptions, 'dragAndDropElement', false) &&
				!Utils.getValue(this.oOptions, 'disableAjaxUpload', false))
			{
				(function (self) {
					var
						$doc = $(window.document),
						oBigDropZone = $(Utils.getValue(self.oOptions, 'dragAndDropBodyElement', false) || $doc),
						oDragAndDropElement = Utils.getValue(self.oOptions, 'dragAndDropElement', false),
						fHandleDragOver = function (oEvent) {
							if (self.bEnableDnD && oEvent)
							{
								oEvent = Utils.getEvent(oEvent);
								if (oEvent && oEvent.dataTransfer && Utils.eventContainsFiles(oEvent))
								{
									try
									{
										var sEffect = oEvent.dataTransfer.effectAllowed;

										Utils.mainClearTimeout(self.iDocTimer);

										oEvent.dataTransfer.dropEffect = (sEffect === 'move' || sEffect === 'linkMove') ? 'move' : 'copy';

										oEvent.stopPropagation();
										oEvent.preventDefault();

										oBigDropZone.trigger('dragover', oEvent);
									}
									catch (oExc) {}
								}
							}
						},
						fHandleDrop = function (oEvent) {
							if (self.bEnableDnD && oEvent)
							{
								oEvent = Utils.getEvent(oEvent);
								if (oEvent && Utils.eventContainsFiles(oEvent))
								{
									oEvent.preventDefault();

									Utils.getDataFromDragEvent(oEvent, function (oFile) {
											if (oFile)
											{
												self.runEvent('onDrop', [oFile, oEvent]);
												self.addNewFile(oFile);
												Utils.mainClearTimeout(self.iDocTimer);
											}
										},
										Utils.getValue(self.oOptions, 'multipleSizeLimit', Globals.iDefLimit),
										self.getEvent('onLimitReached')
									);
								}
							}

							self.runEvent('onDragLeave', [oEvent]);
						},
						fHandleDragEnter = function (oEvent) {
							if (self.bEnableDnD && oEvent)
							{
								oEvent = Utils.getEvent(oEvent);
								if (oEvent && Utils.eventContainsFiles(oEvent))
								{
									Utils.mainClearTimeout(self.iDocTimer);

									oEvent.preventDefault();
									self.runEvent('onDragEnter', [oDragAndDropElement, oEvent]);
								}
							}
						},
						fHandleDragLeave = function (oEvent) {
							if (self.bEnableDnD && oEvent)
							{
								oEvent = Utils.getEvent(oEvent);
								if (oEvent)
								{
									var oRelatedTarget = window.document['elementFromPoint'] ? window.document['elementFromPoint'](oEvent['clientX'], oEvent['clientY']) : null;
									if (oRelatedTarget && Utils.contains(this, oRelatedTarget))
									{
										return;
									}

									Utils.mainClearTimeout(self.iDocTimer);
									self.runEvent('onDragLeave', [oDragAndDropElement, oEvent]);
								}

								return;
							}
						}
					;

					if (oDragAndDropElement)
					{
						if (!Utils.getValue(self.oOptions, 'disableDocumentDropPrevent', false))
						{
							$doc.on('dragover', function (oEvent) {
								if (self.bEnableDnD && oEvent)
								{
									oEvent = Utils.getEvent(oEvent);
									if (oEvent && oEvent.dataTransfer && Utils.eventContainsFiles(oEvent))
									{
										try
										{
											oEvent.dataTransfer.dropEffect = 'none';
											oEvent.preventDefault();
										}
										catch (oExc) {}
									}
								}
							});
						}

						if (oBigDropZone && oBigDropZone[0])
						{
							oBigDropZone
								.on('dragover', function (oEvent) {
									if (self.bEnableDnD && oEvent)
									{
										Utils.mainClearTimeout(self.iDocTimer);
									}
								})
								.on('dragenter', function (oEvent) {
									if (self.bEnableDnD && oEvent)
									{
										oEvent = Utils.getEvent(oEvent);
										if (oEvent && Utils.eventContainsFiles(oEvent))
										{
											Utils.mainClearTimeout(self.iDocTimer);
											oEvent.preventDefault();

											self.runEvent('onBodyDragEnter', [oEvent]);
										}
									}
								})
								.on('dragleave', function (oEvent) {
									if (self.bEnableDnD && oEvent)
									{
										oEvent = Utils.getEvent(oEvent);
										if (oEvent)
										{
											Utils.mainClearTimeout(self.iDocTimer);
											self.iDocTimer = setTimeout(function () {
												self.runEvent('onBodyDragLeave', [oEvent]);
											}, 200);
										}
									}
								})
								.on('drop', function (oEvent) {
									if (self.bEnableDnD && oEvent)
									{
										oEvent = Utils.getEvent(oEvent);
										if (oEvent)
										{
											var bFiles = Utils.eventContainsFiles(oEvent);
											if (bFiles)
											{
												oEvent.preventDefault();
											}

											self.runEvent('onBodyDragLeave', [oEvent]);

											return !bFiles;
										}
									}

									return false;
								})
							;
						}

						$(oDragAndDropElement)
							.bind('dragenter', fHandleDragEnter)
							.bind('dragover', fHandleDragOver)
							.bind('dragleave', fHandleDragLeave)
							.bind('drop', fHandleDrop)
						;
					}

				}(self));
			}
			else
			{
				self.bEnableDnD = false;
			}

			Utils.setValue(self, 'on', self.on);
			Utils.setValue(self, 'cancel', self.cancel);
			Utils.setValue(self, 'isDragAndDropSupported', self.isDragAndDropSupported);
			Utils.setValue(self, 'isAjaxUploaderSupported', self.isAjaxUploaderSupported);
			Utils.setValue(self, 'setDragAndDropEnabledStatus', self.setDragAndDropEnabledStatus);
		}

		/**
		 * @type {boolean}
		 */
		Jua.prototype.bEnableDnD = true;

		/**
		 * @type {number}
		 */
		Jua.prototype.iDocTimer = 0;

		/**
		 * @type {Object}
		 */
		Jua.prototype.oOptions = {};

		/**
		 * @type {Object}
		 */
		Jua.prototype.oEvents = {};

		/**
		 * @type {?Object}
		 */
		Jua.prototype.oQueue = null;

		/**
		 * @type {?Object}
		 */
		Jua.prototype.oDriver = null;

		/**
		 * @param {string} sName
		 * @param {Function} fFunc
		 */
		Jua.prototype.on = function (sName, fFunc)
		{
			this.oEvents[sName] = fFunc;
			return this;
		};

		/**
		 * @param {string} sName
		 * @param {string=} aArgs
		 */
		Jua.prototype.runEvent = function (sName, aArgs)
		{
			if (this.oEvents[sName])
			{
				this.oEvents[sName].apply(null, aArgs || []);
			}
		};

		/**
		 * @param {string} sName
		 */
		Jua.prototype.getEvent = function (sName)
		{
			return this.oEvents[sName] || null;
		};

		/**
		 * @param {string} sUid
		 */
		Jua.prototype.cancel = function (sUid)
		{
			this.oDriver.cancel(sUid);
		};

		/**
		 * @return {boolean}
		 */
		Jua.prototype.isAjaxUploaderSupported = function ()
		{
			return Globals.bIsAjaxUploaderSupported;
		};

		/**
		 * @param {boolean} bEnabled
		 */
		Jua.prototype.setDragAndDropEnabledStatus = function (bEnabled)
		{
			this.bEnableDnD = !!bEnabled;
		};

		/**
		 * @return {boolean}
		 */
		Jua.prototype.isDragAndDropSupported = function ()
		{
			return this.oDriver.isDragAndDropSupported();
		};

		/**
		 * @param {Object} oFileInfo
		 */
		Jua.prototype.addNewFile = function (oFileInfo)
		{
			this.addFile(Utils.getNewUid(), oFileInfo);
		};

		/**
		 * @param {string} sUid
		 * @param {Object} oFileInfo
		 */
		Jua.prototype.addFile = function (sUid, oFileInfo)
		{
			var fOnSelect = this.getEvent('onSelect');
			if (oFileInfo && (!fOnSelect || (false !== fOnSelect(sUid, oFileInfo))))
			{
				this.oDriver.regTaskUid(sUid);
				this.oQueue.defer(Utils.scopeBind(this.oDriver.uploadTask, this.oDriver), sUid, oFileInfo);
			}
			else
			{
				this.oDriver.cancel(sUid);
			}
		};

		module.exports = Jua;

	}());


/***/ },
/* 8 */
/***/ function(module, exports, __webpack_require__) {

	module.exports = queue;

/***/ }
/******/ ]);