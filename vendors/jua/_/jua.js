(function(){function a(a){function l(){if(g&&d<a){var b=g,c=b[0],f=Array.prototype.slice.call(b,1),m=b.index;g===h?g=h=null:g=g.next,++d,f.push(function(a,b){--d;if(i)return;a?e&&k(i=a,e=j=g=h=null):(j[m]=b,--e?l():k(null,j))}),c.apply(null,f)}}var c={},d=0,e=0,f=-1,g,h,i=null,j=[],k=b;return arguments.length<1&&(a=Infinity),c.defer=function(){if(!i){var a=arguments;a.index=++f,h?(h.next=a,h=h.next):g=h=a,++e,l()}return c},c.await=function(a){return k=a,e||k(i,j),c},c}function b(){}typeof module=="undefined"?self.queue=a:module.exports=a,a.version="0.0.2"})();(function ($, window, queue) {

	'use strict';
	
	/**
	 * @param {*} mValue
	 * @return {boolean}
	 */
	function isUndefined(mValue)
	{
		return 'undefined' === typeof mValue;
	}
	
	/**
	 * @param {Object} mObjectFirst
	 * @param {Object=} mObjectSecond
	 * @return {Object}
	 */
	function extend(mObjectFirst, mObjectSecond)
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
	}
	
	/**
	 * @param {*} oParent
	 * @param {*} oDescendant
	 *
	 * @return {boolean}
	 */
	function contains(oParent, oDescendant)
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
	}
	
	function mainClearTimeout(iTimer)
	{
		if (0 < iTimer)
		{
			clearTimeout(iTimer);
		}
		
		iTimer = 0;
	}
	
	/**
	 * @param {Event} oEvent
	 * @return {?Event}
	 */
	function getEvent(oEvent)
	{
		oEvent = (oEvent && (oEvent.originalEvent ?
			oEvent.originalEvent : oEvent)) || window.event;
	
		return oEvent.dataTransfer ? oEvent : null;
	}
	
	/**
	 * @param {Object} oValues
	 * @param {string} sKey
	 * @param {?} mDefault
	 * @return {?}
	 */
	function getValue(oValues, sKey, mDefault)
	{
		return (!oValues || !sKey || isUndefined(oValues[sKey])) ? mDefault : oValues[sKey];
	}
	
	/**
	 * @param {Object} oOwner
	 * @param {string} sPublicName
	 * @param {*} mObject
	 */
	function setValue(oOwner, sPublicName, mObject)
	{
		oOwner[sPublicName] = mObject;
	}
	
	/**
	 * @param {*} aData
	 * @return {boolean}
	 */
	function isNonEmptyArray(aData)
	{
		return aData && aData.length && 0 < aData.length ? true : false;
	}
	
	/**
	 * @param {*} mValue
	 * @return {number}
	 */
	function pInt(mValue)
	{
		return parseInt(mValue || 0, 10);
	}
	
	/**
	 * @param {Function} fFunction
	 * @param {Object=} oScope
	 * @return {Function}
	 */
	function scopeBind(fFunction, oScope)
	{
		return function () {
			return fFunction.apply(isUndefined(oScope) ? null : oScope,
				Array.prototype.slice.call(arguments));
		};
	}
	
	/**
	 * @param {number=} iLen
	 * @return {string}
	 */
	function fakeMd5(iLen)
	{
		var
			sResult = '',
			sLine = '0123456789abcdefghijklmnopqrstuvwxyz'
		;
	
		iLen = isUndefined(iLen) ? 32 : pInt(iLen);
	
		while (sResult.length < iLen)
		{
			sResult += sLine.substr(Math.round(Math.random() * sLine.length), 1);
		}
	
		return sResult;
	}
	
	/**
	 * @return {string}
	 */
	function getNewUid()
	{
		return 'jua-uid-' + fakeMd5(16) + '-' + (new Date()).getTime().toString();
	}
	
	/**
	 * @param {*} oFile
	 * @param {string=} sPath
	 * @return {Object}
	 */
	function getDataFromFile(oFile, sPath)
	{
		var
			sFileName = isUndefined(oFile.fileName) ? (isUndefined(oFile.name) ? null : oFile.name) : oFile.fileName,
			iSize = isUndefined(oFile.fileSize) ? (isUndefined(oFile.size) ? null : oFile.size) : oFile.fileSize,
			sType = isUndefined(oFile.type) ? null : oFile.type
		;
	
		return {
			'FileName': sFileName,
			'Size': iSize,
			'Type': sType,
			'Folder': isUndefined(sPath) ? '' : sPath,
			'File' : oFile
		};
	}
	
	/**
	 * @param {*} aItems
	 * @param {Function} fFileCallback
	 * @param {boolean=} bEntry = false
	 * @param {boolean=} bAllowFolderDragAndDrop = true
	 * @param {number=} iLimit = 20
	 * @param {Function=} fLimitCallback
	 */
	function getDataFromFiles(aItems, fFileCallback, bEntry, bAllowFolderDragAndDrop, iLimit, fLimitCallback)
	{
		var
			iInputLimit = 0,
			iLen = 0,
			iIndex = 0,
			oItem = null,
			oEntry = null,
			bUseLimit = false,
			bCallLimit = false,
			fTraverseFileTree = function (oItem, sPath, fCallback, fLimitCallbackProxy) {
	
				if (oItem && !isUndefined(oItem['name']))
				{
					sPath = sPath || '';
					if (oItem['isFile'])
					{
						oItem.file(function (oFile) {
							if (!bUseLimit || 0 <= --iLimit)
							{
								fCallback(getDataFromFile(oFile, sPath));
							}
							else if (bUseLimit && !bCallLimit)
							{
								if (0 > iLimit && fLimitCallback)
								{
									bCallLimit = true;
									fLimitCallback(iInputLimit);
								}
							}
						});
					}
					else if (bAllowFolderDragAndDrop && oItem['isDirectory'] && oItem['createReader'])
					{
						var
							oDirReader = oItem['createReader'](),
							iIndex = 0,
							iLen = 0
						;
	
						if (oDirReader && oDirReader['readEntries'])
						{
							oDirReader['readEntries'](function (aEntries) {
								if (aEntries && isNonEmptyArray(aEntries))
								{
									for (iIndex = 0, iLen = aEntries.length; iIndex < iLen; iIndex++)
									{
										fTraverseFileTree(aEntries[iIndex], sPath + oItem['name'] + '/', fCallback, fLimitCallbackProxy);
									}
								}
							});
						}
					}
				}
			}
		;
	
		bAllowFolderDragAndDrop = isUndefined(bAllowFolderDragAndDrop) ? true : !!bAllowFolderDragAndDrop;
	
		bEntry = isUndefined(bEntry) ? false : !!bEntry;
		iLimit = isUndefined(iLimit) ? Jua.iDefLimit : pInt(iLimit);
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
					if (bEntry)
					{
						if ('file' === oItem['kind'] && oItem['webkitGetAsEntry'])
						{
							oEntry = oItem['webkitGetAsEntry']();
							if (oEntry)
							{
								fTraverseFileTree(oEntry, '', fFileCallback, fLimitCallback);
							}
						}
					}
					else
					{
						if (!bUseLimit || 0 <= --iLimit)
						{
							fFileCallback(getDataFromFile(oItem));
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
		}
	}
	
	/**
	 * @param {*} oInput
	 * @param {Function} fFileCallback
	 * @param {number=} iLimit = 20
	 * @param {Function=} fLimitCallback
	 */
	function getDataFromInput(oInput, fFileCallback, iLimit, fLimitCallback)
	{
		var aFiles = oInput && oInput.files && 0 < oInput.files.length ? oInput.files : null;
		if (aFiles)
		{
			getDataFromFiles(aFiles, fFileCallback, false, false, iLimit, fLimitCallback);
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
	}
	
	function eventContainsFiles(oEvent)
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
	}
	
	/**
	 * @param {Event} oEvent
	 * @param {Function} fFileCallback
	 * @param {number=} iLimit = 20
	 * @param {Function=} fLimitCallback
	 * @param {boolean=} bAllowFolderDragAndDrop = true
	 */
	function getDataFromDragEvent(oEvent, fFileCallback, iLimit, fLimitCallback, bAllowFolderDragAndDrop)
	{
		var
			aItems = null,
			aFiles = null
		;
	
		oEvent = getEvent(oEvent);
		if (oEvent)
		{
			aItems = (oEvent.dataTransfer ? getValue(oEvent.dataTransfer, 'items', null) : null) || getValue(oEvent, 'items', null);
			if (aItems && 0 < aItems.length && aItems[0] && aItems[0]['webkitGetAsEntry'])
			{
				getDataFromFiles(aItems, fFileCallback, true, bAllowFolderDragAndDrop, iLimit, fLimitCallback);
			}
			else if (eventContainsFiles(oEvent))
			{
				aFiles = (getValue(oEvent, 'files', null) || (oEvent.dataTransfer ?
					getValue(oEvent.dataTransfer, 'files', null) : null));
	
				if (aFiles && 0 < aFiles.length)
				{
					getDataFromFiles(aFiles, fFileCallback, false, false, iLimit, fLimitCallback);
				}
			}
		}
	}
	
	function createNextLabel()
	{
		return $('<label style="' +
	'position: absolute; background-color:#fff; right: 0px; top: 0px; left: 0px; bottom: 0px; margin: 0px; padding: 0px; cursor: pointer;' +
		'"></label>').css({
			'opacity': 0
		});
	}
	
	function createNextInput()
	{
		return $('<input type="file" tabindex="-1" hidefocus="hidefocus" style="position: absolute; left: -9999px;" />');
	}
	
	/**
	 * @param {string=} sName
	 * @param {boolean=} bMultiple = true
	 * @return {?Object}
	 */
	function getNewInput(sName, bMultiple)
	{
		sName = isUndefined(sName) ? '' : sName.toString();
	
		var oLocal = createNextInput();
		if (0 < sName.length)
		{
			oLocal.attr('name', sName);
		}
	
		if (isUndefined(bMultiple) ? true : bMultiple)
		{
			oLocal.prop('multiple', true);
		}
	
		return oLocal;
	}
	
	/**
	 * @param {?} mStringOrFunction
	 * @param {Array=} aFunctionParams
	 * @return {string}
	 */
	function getStringOrCallFunction(mStringOrFunction, aFunctionParams)
	{
		return $.isFunction(mStringOrFunction) ? 
			mStringOrFunction.apply(null, $.isArray(aFunctionParams) ? aFunctionParams : []).toString() :
			mStringOrFunction.toString();
	}
	
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
				sAction = getValue(this.oOptions, 'action', ''),
				aHidden = getValue(this.oOptions, 'hidden', {}),
				fStartFunction = this.oJua.getEvent('onStart'),
				fCompleteFunction = this.oJua.getEvent('onComplete'),
				fProgressFunction = this.oJua.getEvent('onProgress')
			;
	
			oXhr.open('POST', sAction, true);
	
			if (fProgressFunction && oXhr.upload)
			{
				oXhr.upload.onprogress = function (oEvent) {
					if (oEvent && oEvent.lengthComputable && !isUndefined(oEvent.loaded) && !isUndefined(oEvent.total))
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
	
					if (!isUndefined(self.oXhrs[sUid]))
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
			oFormData.append(getValue(this.oOptions, 'name', 'juaFile'), oFileInfo['File']);
			$.each(aHidden, function (sKey, sValue) {
				oFormData.append(sKey, getStringOrCallFunction(sValue, [oFileInfo]));
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
			oInput = getNewInput('', !getValue(this.oOptions, 'disableMultiple', false));
			oLabel = createNextLabel();
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
					getDataFromInput(this, function (oFile) {
							self.oJua.addNewFile(oFile);
							self.generateNewInput(oClickElement);
	
							setTimeout(function () {
								oLabel.remove();
							}, 10);
						},
						getValue(self.oOptions, 'multipleSizeLimit', Jua.iDefLimit),
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
			aHidden = getValue(this.oOptions, 'hidden', {}),
			fStartFunction = this.oJua.getEvent('onStart'),
			fCompleteFunction = this.oJua.getEvent('onComplete')
		;
	
		if (oForm)
		{
			oForm.append($('<input type="hidden" />').attr('name', 'jua-post-type').val('iframe'));
			$.each(aHidden, function (sKey, sValue) {
				oForm.append($('<input type="hidden" />').attr('name', sKey).val(getStringOrCallFunction(sValue, [oFileInfo])));
			});
	
			oForm.trigger('submit');
			if (fStartFunction)
			{
				fStartFunction(sUid);
			}
	
			oForm.find('iframe').on('load', function (oEvent) {
	
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
			sAction = getValue(this.oOptions, 'action', ''),
			oForm = null
		;
	
		if (oClickElement)
		{
			sUid = getNewUid();
			
			oInput = getNewInput(getValue(this.oOptions, 'name', 'juaFile'), !getValue(this.oOptions, 'disableMultiple', false));
	
			oForm = $('<form action="' + sAction + '" target="iframe-' + sUid + '" ' +
	' method="POST" enctype="multipart/form-data" style="display: block; cursor: pointer;"></form>');
	
			oIframe = $('<iframe name="iframe-' + sUid + '" tabindex="-1" src="javascript:void(0);" ' +
	' style="position: absolute; top: -1000px; left: -1000px; cursor: pointer;" />').css({'opacity': 0});
	
			oForm.append(createNextLabel().append(oInput)).append(oIframe);
	
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
					getDataFromInput(this, function (oFile) {
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
						getValue(self.oOptions, 'multipleSizeLimit', Jua.iDefLimit),
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
	
	/**
	 * @constructor
	 * @param {Object=} oOptions
	 */
	function Jua(oOptions)
	{
		oOptions = isUndefined(oOptions) ? {} : oOptions;
	
		var self = this;
	
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
		
		self.oOptions = extend({
			'action': '',
			'name': '',
			'hidden': {},
			'queueSize': 10,
			'clickElement': false,
			'dragAndDropElement': false,
			'dragAndDropBodyElement': false,
			'disableAjaxUpload': false,
			'disableFolderDragAndDrop': true,
			'disableDragAndDrop': false,
			'disableMultiple': false,
			'disableDocumentDropPrevent': false,
			'multipleSizeLimit': 50
		}, oOptions);
	
		self.oQueue = queue(pInt(getValue(self.oOptions, 'queueSize', 10)));
		if (self.runEvent('onCompleteAll'))
		{
			self.oQueue.await(function () {
				self.runEvent('onCompleteAll');
			});
		}
	
		self.oDriver = self.isAjaxUploaderSupported() && !getValue(self.oOptions, 'disableAjaxUpload', false) ?
			new AjaxDriver(self, self.oOptions) : new IframeDriver(self, self.oOptions);
	
		self.oClickElement = getValue(self.oOptions, 'clickElement', null);
	
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
	
		if (this.oDriver.isDragAndDropSupported() && getValue(this.oOptions, 'dragAndDropElement', false) &&
			!getValue(this.oOptions, 'disableAjaxUpload', false))
		{
			(function (self) {
				var
					$doc = $(document),
					oBigDropZone = $(getValue(self.oOptions, 'dragAndDropBodyElement', false) || $doc),
					oDragAndDropElement = getValue(self.oOptions, 'dragAndDropElement', false),
					fHandleDragOver = function (oEvent) {
						if (self.bEnableDnD && oEvent)
						{
							oEvent = getEvent(oEvent);
							if (oEvent && eventContainsFiles(oEvent))
							{
								mainClearTimeout(self.iDocTimer);
	
								var sEffect = oEvent.dataTransfer.effectAllowed;
								oEvent.dataTransfer.dropEffect = (sEffect === 'move' || sEffect === 'linkMove') ? 'move' : 'copy';
	
								oEvent.stopPropagation();
								oEvent.preventDefault();
	
								oBigDropZone.trigger('dragover', oEvent);
							}
						}
					},
					fHandleDrop = function (oEvent) {
						if (self.bEnableDnD && oEvent)
						{
							oEvent = getEvent(oEvent);
							if (oEvent && eventContainsFiles(oEvent))
							{
								oEvent.preventDefault();
	
								getDataFromDragEvent(oEvent, function (oFile) {
										if (oFile)
										{
											self.runEvent('onDrop', [oFile, oEvent]);
											self.addNewFile(oFile);
											mainClearTimeout(self.iDocTimer);
										}
									},
									getValue(self.oOptions, 'multipleSizeLimit', Jua.iDefLimit),
									self.getEvent('onLimitReached'),
									!getValue(self.oOptions, 'disableFolderDragAndDrop', true)
								);
							}
						}
	
						self.runEvent('onDragLeave', [oEvent]);
					},
					fHandleDragEnter = function (oEvent) {
						if (self.bEnableDnD && oEvent)
						{
							oEvent = getEvent(oEvent);
							if (oEvent && eventContainsFiles(oEvent))
							{
								mainClearTimeout(self.iDocTimer);
	
								oEvent.preventDefault();
								self.runEvent('onDragEnter', [oDragAndDropElement, oEvent]);
							}
						}
					},
					fHandleDragLeave = function (oEvent) {
						if (self.bEnableDnD && oEvent)
						{
							oEvent = getEvent(oEvent);
							if (oEvent)
							{
								var oRelatedTarget = document['elementFromPoint'] ? document['elementFromPoint'](oEvent['clientX'], oEvent['clientY']) : null;
								if (oRelatedTarget && contains(this, oRelatedTarget))
								{
									return;
								}
	
								mainClearTimeout(self.iDocTimer);
								self.runEvent('onDragLeave', [oDragAndDropElement, oEvent]);
							}
	
							return;
						}
					}
				;
	
				if (oDragAndDropElement)
				{
					if (!getValue(self.oOptions, 'disableDocumentDropPrevent', false))
					{
						$doc.on('dragover', function (oEvent) {
							if (self.bEnableDnD && oEvent)
							{
								oEvent = getEvent(oEvent);
								if (oEvent && eventContainsFiles(oEvent))
								{
									oEvent.dataTransfer.dropEffect = 'none';
									oEvent.preventDefault();
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
									mainClearTimeout(self.iDocTimer);
								}
							})
							.on('dragenter', function (oEvent) {
								if (self.bEnableDnD && oEvent)
								{
									oEvent = getEvent(oEvent);
									if (oEvent && eventContainsFiles(oEvent))
									{
										mainClearTimeout(self.iDocTimer);
										oEvent.preventDefault();
	
										self.runEvent('onBodyDragEnter', [oEvent]);
									}
								}
							})
							.on('dragleave', function (oEvent) {
								if (self.bEnableDnD && oEvent)
								{
									oEvent = getEvent(oEvent);
									if (oEvent)
									{
										mainClearTimeout(self.iDocTimer);
										self.iDocTimer = setTimeout(function () {
											self.runEvent('onBodyDragLeave', [oEvent]);
										}, 200);
									}
								}
							})
							.on('drop', function (oEvent) {
								if (self.bEnableDnD && oEvent)
								{
									oEvent = getEvent(oEvent);
									if (oEvent)
									{
										var bFiles = eventContainsFiles(oEvent);
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
	
		setValue(self, 'on', self.on);
		setValue(self, 'cancel', self.cancel);
		setValue(self, 'isDragAndDropSupported', self.isDragAndDropSupported);
		setValue(self, 'isAjaxUploaderSupported', self.isAjaxUploaderSupported);
		setValue(self, 'setDragAndDropEnabledStatus', self.setDragAndDropEnabledStatus);
	}
	
	/**
	 * @type {Function}
	 */
	Jua.fEmptyFunction = function () {};
	
	/**
	 * @type {number}
	 */
	Jua.iDefLimit = 20;
	
	/**
	 * @type {boolean}
	 */
	Jua.isAjaxUploaderSupported = (function () {
		var oInput = document.createElement('input');
		oInput.type = 'file';
		return !!('XMLHttpRequest' in window && 'multiple' in oInput && 'FormData' in window && (new XMLHttpRequest()).upload && true);
	}());
	
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
		return Jua.isAjaxUploaderSupported;
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
		this.addFile(getNewUid(), oFileInfo);
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
			this.oQueue.defer(scopeBind(this.oDriver.uploadTask, this.oDriver), sUid, oFileInfo);
		}
		else
		{
			this.oDriver.cancel(sUid);
		}
	};
	
	/**
	 * @type {Jua}
	 */
	window['Jua'] = Jua;
	
}(jQuery, window, queue));