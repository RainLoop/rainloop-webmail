/* RainLoop Webmail (c) RainLoop Team | MIT */
(()=>{
	'use strict';

	const
		doc = document,
		iDefLimit = 20,
		defined = v => undefined !== v,
		/**
		 * @param {*} aItems
		 * @param {Function} fFileCallback
		 * @param {number=} iLimit = 20
		 * @param {Function=} fLimitCallback
		 */
		getDataFromFiles = (aItems, fFileCallback, iLimit, fLimitCallback) =>
		{
			if (aItems && aItems.length)
			{
				iLimit = defined(iLimit) ? parseInt(iLimit || 0, 10) : iDefLimit;
				let
					iInputLimit = iLimit,
					oFile = null,
					bUseLimit = 0 < iLimit,
					bCallLimit = false
				;

				Array.from(aItems).forEach(oItem => {
					if (oItem)
					{
						if (!bUseLimit || 0 <= --iLimit)
						{
							oFile = getDataFromFile(oItem);
							oFile && fFileCallback(oFile);
						}
						else if (bUseLimit && !bCallLimit && 0 > iLimit && fLimitCallback)
						{
							bCallLimit = true;
							fLimitCallback(iInputLimit);
						}
					}
				});
			}
		},

		addEventListeners = (element, obj) => {
			Object.entries(obj).forEach(([key, value]) => element.addEventListener(key, value));
		},

		/**
		 * @param {*} oFile
		 * @return {Object}
		 */
		getDataFromFile = oFile =>
		{
			let
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

		eventContainsFiles = oEvent =>
		{
			if (oEvent.dataTransfer && oEvent.dataTransfer.types && oEvent.dataTransfer.types.length) {
				let index = oEvent.dataTransfer.types.length;
				while (index--) {
					if (oEvent.dataTransfer.types[index].toLowerCase() === 'files') {
						return true;
					}
				}
			}
			return false;
		};


	/**
	 * @constructor
	 * @param {Jua} oJua
	 * @param {Object} oOptions
	 */
	class AjaxDriver
	{
		constructor(oJua, oOptions)
		{
			this.oXhrs = {};
			this.oUids = {};
			this.oJua = oJua;
			this.oOptions = Object.assign({
				action: '',
				name: 'juaFile',
				hidden: {},
				disableMultiple: false
			}, oOptions);
		}

		/**
		 * @param {string} sUid
		 */
		regTaskUid(sUid)
		{
			this.oUids[sUid] = true;
		}

		/**
		 * @param {string} sUid
		 * @param {?} oFileInfo
		 * @param {Function} fCallback
		 */
		uploadTask(sUid, oFileInfo, fCallback)
		{
			if (false === this.oUids[sUid] || !oFileInfo || !oFileInfo['File'])
			{
				fCallback(null, sUid);
				return false;
			}

			try
			{
				const
					self = this,
					oXhr = new XMLHttpRequest(),
					oFormData = new FormData(),
					sAction = this.oOptions.action,
					aHidden = this.oOptions.hidden,
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
							let
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
				oFormData.append(this.oOptions.name, oFileInfo['File']);
				Object.entries(aHidden).forEach(([key, value]) =>
					oFormData.append(key, (typeof value === "function" ? value(oFileInfo) : value).toString())
				);

				oXhr.send(oFormData);

				this.oXhrs[sUid] = oXhr;
				return true;
			}
			catch (oError)
			{
			}

			fCallback(null, sUid);
			return false;
		}

		generateNewInput(oClickElement)
		{
			if (oClickElement)
			{
				const self = this,
					oLabel = doc.createElement('label'),
					oInput = oLabel.appendChild(doc.createElement('input'));

				oInput.type = 'file';
				oInput.tabIndex = -1;
				oInput.style.cssText = 'position:absolute;left:-9999px;';
				oInput.multiple = !self.oOptions.disableMultiple;

				oLabel.style.cssText = 'position:absolute;background-color:#fff;right:0;top:0;left:0;bottom:0;margin:0;padding:0;cursor:pointer;opacity:0';

				oClickElement.append(oLabel);

				oInput.addEventListener('input', () => {
					const fFileCallback = oFile => {
						self.oJua.addNewFile(oFile);
						self.generateNewInput(oClickElement);

						setTimeout(() => oLabel.remove(), 10);
					};
					if (oInput.files && oInput.files.length) {
						getDataFromFiles(oInput.files, fFileCallback,
							self.oOptions.multipleSizeLimit,
							self.oJua.getEvent('onLimitReached')
						);
					} else {
						fFileCallback({
							'FileName': oInput.value.split('\\').pop().split('/').pop(),
							'Size': null,
							'Type': null,
							'Folder': '',
							'File' : null
						});
					}
				});
			}
		}

		cancel(sUid)
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
		}
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


	function queue(a) {
		function l() {
			if (g && d < a) {
				let b = g,
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
		let c = {},
			d = 0,
			e = 0,
			f = -1,
			g, h, i = null,
			j = [],
			k = ()=>{};
		return arguments.length < 1 && (a = Infinity), c.defer = function () {
			if (!i) {
				let a = arguments;
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
	class Jua
	{
		constructor(oOptions)
		{
			const self = this;

			self.oEvents = {
				onSelect: null,
				onStart: null,
				onComplete: null,
				onProgress: null,
				onDragEnter: null,
				onDragLeave: null,
				onBodyDragEnter: null,
				onBodyDragLeave: null,
				onLimitReached: null
			};

			oOptions = Object.assign({
				queueSize: 10,
				clickElement: null,
				dragAndDropElement: null,
				dragAndDropBodyElement: null,
				disableDocumentDropPrevent: false,
				multipleSizeLimit: iDefLimit
			}, oOptions || {});

			self.oQueue = queue(parseInt(oOptions.queueSize || 0, 10));

			self.oDriver = new AjaxDriver(self, oOptions);

			let el = oOptions.clickElement;
			if (el) {
				el.style.position = 'relative';
				el.style.overflow = 'hidden';
				if ('inline' === el.style.display) {
					el.style.display = 'inline-block';
				}

				this.oDriver.generateNewInput(el);
			}

			el = oOptions.dragAndDropElement;
			if (el)
			{
				let oBigDropZone = oOptions.dragAndDropBodyElement || doc;

				if (!oOptions.disableDocumentDropPrevent)
				{
					doc.addEventListener('dragover', oEvent => {
						if (eventContainsFiles(oEvent))
						{
							try
							{
								oEvent.dataTransfer.dropEffect = 'none';
								oEvent.preventDefault();
							}
							catch (oExc) {}
						}
					});
				}

				if (oBigDropZone)
				{
					addEventListeners(oBigDropZone, {
						dragover: () => self.docTimer.clear(),
						dragenter: oEvent => {
							if (eventContainsFiles(oEvent))
							{
								self.docTimer.clear();
								oEvent.preventDefault();

								self.runEvent('onBodyDragEnter', [oEvent]);
							}
						},
						dragleave: oEvent =>
							oEvent.dataTransfer && self.docTimer.start(() => self.runEvent('onBodyDragLeave', [oEvent])),
						drop: oEvent => {
							if (oEvent.dataTransfer) {
								let bFiles = eventContainsFiles(oEvent);
								bFiles && oEvent.preventDefault();

								self.runEvent('onBodyDragLeave', [oEvent]);

								return !bFiles;
							}

							return false;
						}
					});
				}

				addEventListeners(el, {
					dragenter: oEvent => {
						if (eventContainsFiles(oEvent)) {
							self.docTimer.clear();

							oEvent.preventDefault();
							self.runEvent('onDragEnter', [el, oEvent]);
						}
					},
					dragover: oEvent => {
						if (eventContainsFiles(oEvent)) {
							try
							{
								let sEffect = oEvent.dataTransfer.effectAllowed;

								self.docTimer.clear();

								oEvent.dataTransfer.dropEffect = (sEffect === 'move' || sEffect === 'linkMove') ? 'move' : 'copy';

								oEvent.stopPropagation();
								oEvent.preventDefault();

								oBigDropZone && oBigDropZone.dispatchEvent(oEvent);
							}
							catch (oExc) {}
						}
					},
					dragleave: oEvent => {
						if (oEvent.dataTransfer) {
							let oRelatedTarget = doc.elementFromPoint(oEvent.clientX, oEvent.clientY);
							if (!oRelatedTarget || !el.contains(oRelatedTarget)) {
								self.docTimer.clear();
								self.runEvent('onDragLeave', [el, oEvent]);
							}
						}
					},
					drop: oEvent => {
						if (eventContainsFiles(oEvent)) {
							oEvent.preventDefault();

							getDataFromFiles(
								oEvent.files || oEvent.dataTransfer.files,
								oFile => {
									if (oFile) {
										self.addNewFile(oFile);
										self.docTimer.clear();
									}
								},
								oOptions.multipleSizeLimit,
								self.getEvent('onLimitReached')
							);
						}

						self.runEvent('onDragLeave', [oEvent]);
					}
				});
			}
		}

		/**
		 * @param {string} sName
		 * @param {Function} fFunc
		 */
		on(sName, fFunc)
		{
			this.oEvents[sName] = fFunc;
			return this;
		}

		/**
		 * @param {string} sName
		 * @param {string=} aArgs
		 */
		runEvent(sName, aArgs)
		{
			if (this.oEvents[sName])
			{
				this.oEvents[sName].apply(null, aArgs || []);
			}
		}

		/**
		 * @param {string} sName
		 */
		getEvent(sName)
		{
			return this.oEvents[sName] || null;
		}

		/**
		 * @param {string} sUid
		 */
		cancel(sUid)
		{
			this.oDriver.cancel(sUid);
		}

		/**
		 * @param {Object} oFileInfo
		 */
		addNewFile(oFileInfo)
		{
			let iLen = 16,
				fakeMd5 = '',
				sLine = '0123456789abcdefghijklmnopqrstuvwxyz';

			while (iLen--)
				fakeMd5 += sLine.substr(Math.round(Math.random() * 36), 1);

			this.addFile('jua-uid-' + fakeMd5 + '-' + (new Date()).getTime().toString(), oFileInfo);
		}

		/**
		 * @param {string} sUid
		 * @param {Object} oFileInfo
		 */
		addFile(sUid, oFileInfo)
		{
			const fOnSelect = this.getEvent('onSelect');
			if (oFileInfo && (!fOnSelect || (false !== fOnSelect(sUid, oFileInfo))))
			{
				this.oDriver.regTaskUid(sUid);
				this.oQueue.defer((...args) => this.oDriver.uploadTask(...args), sUid, oFileInfo);
			}
			else
			{
				this.oDriver.cancel(sUid);
			}
		}
	}

	/**
	 * @type {number}
	 */
	Jua.prototype.docTimer = {
		start: function(fn){
			this.clear();
			this.timer = setTimeout(fn, 200);
		},
		clear: function(){
			this.timer && clearTimeout(this.timer);
			this.timer = 0;
		}
	};

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

	window.Jua = Jua;

})();
