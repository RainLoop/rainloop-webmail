/* RainLoop Webmail (c) RainLoop Team | MIT */
(doc => {
	const
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

				[...aItems].forEach(oItem => {
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

		addEventListeners = (element, obj) =>
			Object.entries(obj).forEach(([key, value]) => element.addEventListener(key, value)),

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
			try {
				return oEvent.dataTransfer.types.includes('Files');
			} catch (e) {
				return false;
			}
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
		 */
		uploadTask(sUid, oFileInfo)
		{
			if (false === this.oUids[sUid] || !oFileInfo || !oFileInfo['File'])
			{
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
					}
					else
					{
						if (4 === oXhr.readyState)
						{
							fCompleteFunction(sUid, false, null);
						}
					}
				};

				fStartFunction && fStartFunction(sUid);

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
				console.error(oError)
			}

			return false;
		}

		generateNewInput(oClickElement)
		{
			if (oClickElement)
			{
				const self = this,
					oInput = doc.createElement('input'),
					onClick = ()=>oInput.click();

				oInput.type = 'file';
				oInput.tabIndex = -1;
				oInput.style.display = 'none';
				oInput.multiple = !self.oOptions.disableMultiple;

				oClickElement.addEventListener('click', onClick);

				oInput.addEventListener('input', () => {
					const fFileCallback = oFile => {
						self.oJua.addNewFile(oFile);
						setTimeout(() => {
							oInput.remove();
							oClickElement.removeEventListener('click', onClick);
							self.generateNewInput(oClickElement);
						}, 10);
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
					this.oXhrs[sUid].abort && this.oXhrs[sUid].abort();
				}
				catch (oError)
				{
					console.error(oError);
				}

				this.oXhrs[sUid] = null;
			}
		}
	}

	class Queue extends Array
	{
		constructor(limit) {
			super();
			this.limit = parseInt(limit || 0, 10);
		}
		push(fn, ...args) {
			if (this.limit > this.length) {
				super.push([fn, args]);
				this.call();
			}
		}
		call() {
			if (!this.running) {
				this.running = true;
				let f;
				while ((f = this.shift())) f[0](...f[1]);
				this.running = false;
			}
		}
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

			self.oQueue = new Queue(oOptions.queueSize);

			self.oDriver = new AjaxDriver(self, oOptions);

			let el = oOptions.clickElement;
			if (el) {
				el.style.position = 'relative';
				el.style.overflow = 'hidden';
				if ('inline' === el.style.display) {
					el.style.display = 'inline-block';
				}

				self.oDriver.generateNewInput(el);
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
							catch (oExc) {
								console.error(oExc);
							}
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
							}
							catch (oExc) {
								console.error(oExc);
							}
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
				fakeMd5 = '';

			while (iLen--)
				fakeMd5 += '0123456789abcdefghijklmnopqrstuvwxyz'.substr(Math.round(Math.random() * 36), 1);

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
				this.oQueue.push((...args) => this.oDriver.uploadTask(...args), sUid, oFileInfo);
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

	this.Jua = Jua;

})(document);
