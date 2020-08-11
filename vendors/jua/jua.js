/* RainLoop Webmail (c) RainLoop Team | MIT */
(()=>{
	'use strict';

	var
		iDefLimit = 20,
		$ = jQuery;

	const
		defined = v => undefined !== v;

	var Utils = {
		/**
		 * @param {*} oParent
		 * @param {*} oDescendant
		 *
		 * @return {boolean}
		 */
		contains : (oParent, oDescendant) =>
		{
			if (oParent && oDescendant)
			{
				if (oParent === oDescendant)
				{
					return true;
				}
				if (oParent.contains)
				{
					return oParent.contains(oDescendant);
				}
				/*jshint bitwise: false*/
				return oDescendant.compareDocumentPosition ?
					!!(oDescendant.compareDocumentPosition(oParent) & 8) : false;
				/*jshint bitwise: true*/
			}

			return false;
		},

		mainClearTimeout : iTimer =>
		{
			if (0 < iTimer)
			{
				clearTimeout(iTimer);
			}

			iTimer = 0;
		},

		/**
		 * @param {Event} oEvent
		 * @return {?Event}
		 */
		getEvent : oEvent =>
		{
			oEvent = (oEvent && (oEvent.originalEvent ?
				oEvent.originalEvent : oEvent)) || window.event;

			return oEvent.dataTransfer ? oEvent : null;
		},

		/**
		 * @param {Object} oValues
		 * @param {string} sKey
		 * @param {?} mDefault
		 * @return {?}
		 */
		getValue : (oValues, sKey, mDefault) => (!oValues || !sKey || !defined(oValues[sKey])) ? mDefault : oValues[sKey],

		/**
		 * @param {Function} fFunction
		 * @param {Object=} oScope
		 * @return {Function}
		 */
		scopeBind : (fFunction, oScope) => (...args) => {
			return fFunction.apply(defined(oScope) ? oScope : null,
				Array.prototype.slice.call(args));
		},

		/**
		 * @param {number=} iLen
		 * @return {string}
		 */
		fakeMd5 : iLen =>
		{
			var
				sResult = '',
				sLine = '0123456789abcdefghijklmnopqrstuvwxyz'
			;

			iLen = defined(iLen) ? parseInt(iLen || 0, 10) : 32;

			while (sResult.length < iLen)
			{
				sResult += sLine.substr(Math.round(Math.random() * sLine.length), 1);
			}

			return sResult;
		},

		/**
		 * @return {string}
		 */
		getNewUid : () => 'jua-uid-' + Utils.fakeMd5(16) + '-' + (new Date()).getTime().toString(),

		/**
		 * @param {*} oFile
		 * @return {Object}
		 */
		getDataFromFile : oFile =>
		{
			var
				sFileName = defined(oFile.fileName) ? oFile.fileName : (defined(oFile.name) ? oFile.name : null),
				iSize = defined(oFile.fileSize) ? oFile.fileSize : (defined(oFile.size) ? oFile.size : null),
				sType = defined(oFile.type) ? oFile.type : null
			;

			if (sFileName.charAt(0) === '/')
			{
				sFileName = sFileName.substr(1);
			}

			if (!sType && 0 === iSize)
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
		},

		/**
		 * @param {*} aItems
		 * @param {Function} fFileCallback
		 * @param {number=} iLimit = 20
		 * @param {Function=} fLimitCallback
		 */
		getDataFromFiles : (aItems, fFileCallback, iLimit, fLimitCallback) =>
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

			iLimit = defined(iLimit) ? parseInt(iLimit || 0, 10) : iDefLimit;
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
		},

		/**
		 * @param {*} oInput
		 * @param {Function} fFileCallback
		 * @param {number=} iLimit = 20
		 * @param {Function=} fLimitCallback
		 */
		getDataFromInput : (oInput, fFileCallback, iLimit, fLimitCallback) =>
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
		},

		eventContainsFiles : oEvent =>
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
		},

		/**
		 * @param {Event} oEvent
		 * @param {Function} fFileCallback
		 * @param {number=} iLimit = 20
		 * @param {Function=} fLimitCallback
		 */
		getDataFromDragEvent : (oEvent, fFileCallback, iLimit, fLimitCallback) =>
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
		},

		createNextLabel : () =>
		{
			return $('<label style="' +
		'position: absolute; background-color:#fff; right: 0px; top: 0px; left: 0px; bottom: 0px; margin: 0px; padding: 0px; cursor: pointer;' +
			'"></label>').css({
				'opacity': 0
			});
		},

		createNextInput : () => $('<input type="file" tabindex="-1" hidefocus="hidefocus" style="position: absolute; left: -9999px;" />'),

		/**
		 * @param {string=} sName
		 * @param {boolean=} bMultiple = true
		 * @return {?Object}
		 */
		getNewInput : (sName, bMultiple) =>
		{
			sName = defined(sName) ? sName.toString() : '';

			var oLocal = Utils.createNextInput();
			if (0 < sName.length)
			{
				oLocal.attr('name', sName);
			}

			if (defined(bMultiple) ? bMultiple : true)
			{
				oLocal.prop('multiple', true);
			}

			return oLocal;
		},

		/**
		 * @param {?} mStringOrFunction
		 * @param {Array=} aFunctionParams
		 * @return {string}
		 */
		getStringOrCallFunction : (mStringOrFunction, aFunctionParams) => $.isFunction(mStringOrFunction) ?
				mStringOrFunction.apply(null, Array.isArray(aFunctionParams) ? aFunctionParams : []).toString() :
				mStringOrFunction.toString()
	};


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
	AjaxDriver.prototype.isDragAndDropSupported = () => true;

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
					if (oEvent && oEvent.lengthComputable && defined(oEvent.loaded) && defined(oEvent.total))
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
							oResult = JSON.parse(oXhr.responseText);
							bResult = true;
						}
						catch (oException)
						{
							oResult = null;
						}

						fCompleteFunction(sUid, bResult, oResult);
					}

					if (defined(self.oXhrs[sUid]))
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
						Utils.getValue(self.oOptions, 'multipleSizeLimit', iDefLimit),
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

	function queue(a) {
		function l() {
			if (g && d < a) {
				var b = g,
					c = b[0],
					f = Array.prototype.slice.call(b, 1),
					m = b.index;
				g === h ? g = h = null : g = g.next, ++d, f.push(function (a, b) {
					--d;
					if (i) return;
					a ? e && k(i = a, e = j = g = h = null) : (j[m] = b, --e ? l() : k(null, j))
				}),
				c.apply(null, f)
			}
		}
		var c = {},
			d = 0,
			e = 0,
			f = -1,
			g, h, i = null,
			j = [],
			k = ()=>{};
		return arguments.length < 1 && (a = Infinity), c.defer = function () {
			if (!i) {
				var a = arguments;
				a.index = ++f, h ? (h.next = a, h = h.next) : g = h = a, ++e, l()
			}
			return c
		}, c.await = function (a) {
			return k = a, e || k(i, j), c
		}, c
	}

	/**
	 * @constructor
	 * @param {Object=} oOptions
	 */
	function Jua(oOptions)
	{
		oOptions = defined(oOptions) ? oOptions : {};

		var
			self = this,

			$ = jQuery
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

		self.oOptions = {
			'action': '',
			'name': '',
			'hidden': {},
			'queueSize': 10,
			'clickElement': false,
			'dragAndDropElement': false,
			'dragAndDropBodyElement': false,
			'disableDragAndDrop': false,
			'disableMultiple': false,
			'disableDocumentDropPrevent': false,
			'multipleSizeLimit': 50
		};
		Object.entries(oOptions).forEach(([key, value])=>self.oOptions[key]=value);

		self.oQueue = queue(parseInt(Utils.getValue(self.oOptions, 'queueSize', 10) || 0, 10));
		if (self.runEvent('onCompleteAll'))
		{
			self.oQueue.await(function () {
				self.runEvent('onCompleteAll');
			});
		}

		self.oDriver = new AjaxDriver(self, self.oOptions);

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

		if (this.oDriver.isDragAndDropSupported() && Utils.getValue(this.oOptions, 'dragAndDropElement', false))
		{
			(function (self) {
				var
					$doc = $(document),
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
									Utils.getValue(self.oOptions, 'multipleSizeLimit', iDefLimit),
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
								var oRelatedTarget = document['elementFromPoint'] ? document['elementFromPoint'](oEvent['clientX'], oEvent['clientY']) : null;
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
						.on('dragenter', fHandleDragEnter)
						.on('dragover', fHandleDragOver)
						.on('dragleave', fHandleDragLeave)
						.on('drop', fHandleDrop)
					;
				}

			}(self));
		}
		else
		{
			self.bEnableDnD = false;
		}
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

	window.Jua = Jua;

})();
