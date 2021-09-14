/* RainLoop Webmail (c) RainLoop Team | MIT */
(doc => {
	const
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
				iSize = oFile.size || 0,
				sType = oFile.type || ''
			;

			return (sType && iSize)
			? {
				FileName: (oFile.name || '').replace(/^.*\/([^/]*)$/, '$1'),
				Size: iSize,
				Type: sType,
				Folder: '',
				File : oFile
			}
			: null; // Folder
		},

		eventContainsFiles = oEvent =>
		{
			try {
				return oEvent.dataTransfer.types.includes('Files');
			} catch (e) {
				return false;
			}
		};

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
	 * @param {Object=} options
	 */
	class Jua
	{
		constructor(options)
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

			self.oXhrs = {};
			self.oUids = {};
			self.options = Object.assign({
					action: '',
					name: 'uploader',
					hidden: {},
					limit: 0
				}, options || {});
			self.oQueue = new Queue(1 == options.limit ? 1 : 2);

			let el = options.clickElement;
			if (el) {
				el.style.position = 'relative';
				el.style.overflow = 'hidden';
				if ('inline' === el.style.display) {
					el.style.display = 'inline-block';
				}

				self.generateNewInput(el);
			}

			el = options.dragAndDropElement;
			if (el)
			{
				let oBigDropZone = options.dragAndDropBodyElement || doc;

				if (!options.disableDocumentDropPrevent)
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
								self.options.limit,
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
			this.oEvents[sName] && this.oEvents[sName].apply(null, aArgs || []);
		}

		/**
		 * @param {string} sName
		 */
		getEvent(sName)
		{
			return this.oEvents[sName] || null;
		}

		/**
		 * @param {Object} oFileInfo
		 */
		addNewFile(oFileInfo)
		{
			this.addFile('jua-uid-' + Jua.randomId(16) + '-' + (Date.now().toString()), oFileInfo);
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
				this.oUids[sUid] = true;
				this.oQueue.push((...args) => this.uploadTask(...args), sUid, oFileInfo);
			}
			else
			{
				this.cancel(sUid);
			}
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
					sAction = this.options.action,
					aHidden = this.options.hidden,
					fStartFunction = this.getEvent('onStart'),
					fProgressFunction = this.getEvent('onProgress')
				;

				oXhr.open('POST', sAction, true);

				if (fProgressFunction && oXhr.upload)
				{
					oXhr.upload.onprogress = oEvent => {
						if (oEvent && oEvent.lengthComputable && defined(oEvent.loaded) && defined(oEvent.total))
						{
							fProgressFunction(sUid, oEvent.loaded, oEvent.total);
						}
					};
				}

				oXhr.onreadystatechange = () => {
					if (4 === oXhr.readyState)
					{
						delete self.oXhrs[sUid];
						let bResult = false,
							oResult = null;
						if (200 === oXhr.status)
						{
							try
							{
								oResult = JSON.parse(oXhr.responseText);
								bResult = true;
							}
							catch (e)
							{
								console.error(e);
							}
						}
						this.getEvent('onComplete')(sUid, bResult, oResult);
					}
				};

				fStartFunction && fStartFunction(sUid);

				oFormData.append(this.options.name, oFileInfo['File']);
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
					limit = self.options.limit,
					oInput = doc.createElement('input'),
					onClick = ()=>oInput.click();

				oInput.type = 'file';
				oInput.tabIndex = -1;
				oInput.style.display = 'none';
				oInput.multiple = 1 < limit;

				oClickElement.addEventListener('click', onClick);

				oInput.addEventListener('input', () => {
					const fFileCallback = oFile => {
						self.addNewFile(oFile);
						setTimeout(() => {
							oInput.remove();
							oClickElement.removeEventListener('click', onClick);
							self.generateNewInput(oClickElement);
						}, 10);
					};
					if (oInput.files && oInput.files.length) {
						getDataFromFiles(oInput.files, fFileCallback,
							limit,
							self.getEvent('onLimitReached')
						);
					} else {
						fFileCallback({
							FileName: oInput.value.split(/\\\//).pop(),
							Size: null,
							Type: null,
							Folder: '',
							File : null
						});
					}
				});
			}
		}

		/**
		 * @param {string} sUid
		 */
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

				delete this.oXhrs[sUid];
			}
		}
	}

	Jua.randomId = len => {
		let arr = new Uint8Array((len || 32) / 2);
		crypto.getRandomValues(arr);
		return arr.map(dec => dec.toString(16).padStart(2,'0')).join('');
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
