/* RainLoop Webmail (c) RainLoop Team | Licensed under CC BY-NC-SA 3.0 */

ko.bindingHandlers.tooltip = {
	'init': function (oElement, fValueAccessor) {
		if (!Globals.bMobileDevice)
		{
			var
				sClass = $(oElement).data('tooltip-class') || '',
				sPlacement = $(oElement).data('tooltip-placement') || 'top'
			;
			
			$(oElement).tooltip({
				'delay': {
					'show': 500,
					'hide': 100
				},
				'html': true,
				'placement': sPlacement,
				'trigger': 'hover',
				'title': function () {
					return '<span class="tooltip-class ' + sClass + '">' +
						Utils.i18n(ko.utils.unwrapObservable(fValueAccessor())) + '</span>';
				}
			});
		}
	}
};

ko.bindingHandlers.tooltip2 = {
	'init': function (oElement, fValueAccessor) {
		var
			sClass = $(oElement).data('tooltip-class') || '',
			sPlacement = $(oElement).data('tooltip-placement') || 'top'
		;
		$(oElement).tooltip({
			'delay': {
				'show': 500,
				'hide': 100
			},
			'html': true,
			'placement': sPlacement,
			'title': function () {
				return '<span class="tooltip-class ' + sClass + '">' + fValueAccessor()() + '</span>';
			}
		});
	}
};

ko.bindingHandlers.dropdown = {
	'init': function (oElement) {
		$(oElement).closest('.dropdown').on('click', '.e-item', function () {
			$(oElement).dropdown('toggle');
		});
	}
};

ko.bindingHandlers.popover = {
	'init': function (oElement, fValueAccessor) {
		$(oElement).popover(ko.utils.unwrapObservable(fValueAccessor()));
	}
};

ko.bindingHandlers.resizecrop = {
	'init': function (oElement) {
		$(oElement).addClass('resizecrop').resizecrop({
			'width': '100',
			'height': '100',
			'wrapperCSS': {
				'border-radius': '10px'
			}
		});
	},
	'update': function (oElement, fValueAccessor) {
		fValueAccessor()();
		$(oElement).resizecrop({
			'width': '100',
			'height': '100'
		});
	}
};

ko.bindingHandlers.onEnter = {
	'init': function (oElement, fValueAccessor, fAllBindingsAccessor, oViewModel) {
		$(oElement).on('keypress',  function (oEvent) {
			if (oEvent && 13 === window.parseInt(oEvent.keyCode, 10))
			{
				$(oElement).trigger('change');
				fValueAccessor().call(oViewModel);
			}
		});
	}
};

ko.bindingHandlers.onEsc = {
	'init': function (oElement, fValueAccessor, fAllBindingsAccessor, oViewModel) {
		$(oElement).on('keypress', function (oEvent) {
			if (oEvent && 27 === window.parseInt(oEvent.keyCode, 10))
			{
				$(oElement).trigger('change');
				fValueAccessor().call(oViewModel);
			}
		});
	}
};

ko.bindingHandlers.modal = {
	'init': function (oElement, fValueAccessor) {
		$(oElement).modal({
			'keyboard': false,
			'show': ko.utils.unwrapObservable(fValueAccessor())
		}).on('hidden', function () {
			fValueAccessor()(false);
		});
	},
	'update': function (oElement, fValueAccessor) {
		var bValue = ko.utils.unwrapObservable(fValueAccessor());
		$(oElement).modal(bValue ? 'show' : 'hide');

		_.delay(function () {
			$(oElement).toggleClass('popup-active', bValue);
		}, 1);
	}
};

ko.bindingHandlers.i18nInit = {
	'init': function (oElement) {
		Utils.i18nToNode(oElement);
	}
};

ko.bindingHandlers.i18nUpdate = {
	'update': function (oElement, fValueAccessor) {
		ko.utils.unwrapObservable(fValueAccessor());
		Utils.i18nToNode(oElement);
	}
};

ko.bindingHandlers.link = {
	'update': function (oElement, fValueAccessor) {
		$(oElement).attr('href', ko.utils.unwrapObservable(fValueAccessor()));
	}
};

ko.bindingHandlers.title = {
	'update': function (oElement, fValueAccessor) {
		$(oElement).attr('title', ko.utils.unwrapObservable(fValueAccessor()));
	}
};

ko.bindingHandlers.textF = {
	'init': function (oElement, fValueAccessor) {
		$(oElement).text(ko.utils.unwrapObservable(fValueAccessor()));
	}
};

ko.bindingHandlers.initDom = {
	'init': function (oElement, fValueAccessor) {
		fValueAccessor()(oElement);
	}
};

ko.bindingHandlers.initResizeTrigger = {
	'init': function (oElement, fValueAccessor) {
		var aValues = ko.utils.unwrapObservable(fValueAccessor());
		$(oElement).css({
			'height': aValues[1],
			'min-height': aValues[1]
		});
	},
	'update': function (oElement, fValueAccessor) {
		var
			aValues = ko.utils.unwrapObservable(fValueAccessor()),
			iValue = Utils.pInt(aValues[1]),
			iSize = 0,
			iOffset = $(oElement).offset().top
		;

		if (0 < iOffset)
		{
			iOffset += Utils.pInt(aValues[2]);
			iSize = $window.height() - iOffset;

			if (iValue < iSize)
			{
				iValue = iSize;
			}

			$(oElement).css({
				'height': iValue,
				'min-height': iValue
			});
		}
	}
};

ko.bindingHandlers.appendDom = {
	'update': function (oElement, fValueAccessor) {
		$(oElement).hide().empty().append(ko.utils.unwrapObservable(fValueAccessor())).show();
	}
};

ko.bindingHandlers.draggable = {
	'init': function (oElement, fValueAccessor, fAllBindingsAccessor) {

		if (!Globals.bMobileDevice)
		{
			var
				iTriggerZone = 100,
				iScrollSpeed = 3,
				fAllValueFunc = fAllBindingsAccessor(),
				sDroppableSelector = fAllValueFunc && fAllValueFunc['droppableSelector'] ? fAllValueFunc['droppableSelector'] : '',
				oConf = {
					'distance': 20,
					'handle': '.dragHandle',
					'cursorAt': {'top': 22, 'left': 3},
					'refreshPositions': true,
					'scroll': true
				}
			;

			if (sDroppableSelector)
			{
				oConf['drag'] = function (oEvent) {

					$(sDroppableSelector).each(function () {
						var
							moveUp = null,
							moveDown = null,
							$this = $(this),
							oOffset = $this.offset(),
							bottomPos = oOffset.top + $this.height()
						;

						window.clearInterval($this.data('timerScroll'));
						$this.data('timerScroll', false);

						if (oEvent.pageX >= oOffset.left && oEvent.pageX <= oOffset.left + $this.width())
						{
							if (oEvent.pageY >= bottomPos - iTriggerZone && oEvent.pageY <= bottomPos)
							{
								moveUp = function() {
									$this.scrollTop($this.scrollTop() + iScrollSpeed);
									Utils.windowResize();
								};

								$this.data('timerScroll', window.setInterval(moveUp, 10));
								moveUp();
							}

							if(oEvent.pageY >= oOffset.top && oEvent.pageY <= oOffset.top + iTriggerZone)
							{
								moveDown = function() {
									$this.scrollTop($this.scrollTop() - iScrollSpeed);
									Utils.windowResize();
								};

								$this.data('timerScroll', window.setInterval(moveDown, 10));
								moveDown();
							}
						}
				   });
				};

				oConf['stop'] =	function() {
					$(sDroppableSelector).each(function () {
						window.clearInterval($(this).data('timerScroll'));
						$(this).data('timerScroll', false);
					});
				};
			}

			oConf['helper'] = function (oEvent) {
				return fValueAccessor()(oEvent && oEvent.target ? ko.dataFor(oEvent.target) : null);
			};

			$(oElement).draggable(oConf).on('mousedown', function () {
				Utils.removeInFocus();
			});
		}
	}
};

ko.bindingHandlers.droppable = {
	'init': function (oElement, fValueAccessor, fAllBindingsAccessor) {

		if (!Globals.bMobileDevice)
		{
			var
				fValueFunc = fValueAccessor(),
				fAllValueFunc = fAllBindingsAccessor(),
				fOverCallback = fAllValueFunc && fAllValueFunc['droppableOver'] ? fAllValueFunc['droppableOver'] : null,
				fOutCallback = fAllValueFunc && fAllValueFunc['droppableOut'] ? fAllValueFunc['droppableOut'] : null,
				oConf = {
					'tolerance': 'pointer',
					'hoverClass': 'droppableHover'
				}
			;

			if (fValueFunc)
			{
				oConf['drop'] = function (oEvent, oUi) {
					fValueFunc(oEvent, oUi);
				};

				if (fOverCallback)
				{
					oConf['over'] = function (oEvent, oUi) {
						fOverCallback(oEvent, oUi);
					};
				}

				if (fOutCallback)
				{
					oConf['out'] = function (oEvent, oUi) {
						fOutCallback(oEvent, oUi);
					};
				}

				$(oElement).droppable(oConf);
			}
		}
	}
};

ko.bindingHandlers.nano = {
	'init': function (oElement) {
		if (!Globals.bDisableNanoScroll)
		{
			$(oElement)
				.addClass('nano')
				.nanoScroller({
					'iOSNativeScrolling': false,
					'preventPageScrolling': true
				})
			;
		}
	}
};

ko.bindingHandlers.saveTrigger1 = {
	'init': function (oElement) {

		var $oEl = $(oElement);

		$oEl.data('save-trigger-type', $oEl.is('input[type=text]') ? 'input' : 'custom');

		if ('custom' === $oEl.data('save-trigger-type'))
		{
			$oEl.append(
				'&nbsp;&nbsp;<i class="icon-spinner-2 animated"></i><i class="icon-remove error"></i><i class="icon-ok success"></i>'
			).addClass('settings-saved-trigger');
		}
		else
		{
			$oEl.addClass('settings-saved-trigger-input');
		}
	},
	'update': function (oElement, fValueAccessor) {
		var
			mValue = ko.utils.unwrapObservable(fValueAccessor()),
			$oEl = $(oElement),
			bCustom = 'custom' === $oEl.data('save-trigger-type'),
			sSuffix = bCustom ? '' : '-input'
		;

		switch (mValue.toString())
		{
			case '1':
				$oEl
					.find('.sst-animated' + sSuffix + ',.sst-error' + sSuffix).hide().removeClass('sst-visible' + sSuffix)
					.end()
					.find('.sst-success' + sSuffix).show().addClass('sst-visible' + sSuffix)
				;
				break;
			case '0':
				$oEl
					.find('.sst-animated' + sSuffix + ',.sst-success' + sSuffix).hide().removeClass('sst-visible' + sSuffix)
					.end()
					.find('.sst-error' + sSuffix).show().addClass('sst-visible' + sSuffix)
				;
				break;
			case '-2':
				$oEl
					.find('.sst-error' + sSuffix + ',.sst-success' + sSuffix).hide().removeClass('sst-visible' + sSuffix)
					.end()
					.find('.sst-animated' + sSuffix).show().addClass('sst-visible' + sSuffix)
				;
				break;
			default:
				$oEl
					.find('.sst-animated' + sSuffix).hide()
					.end()
					.find('.sst-error' + sSuffix + ',.sst-success' + sSuffix).removeClass('sst-visible' + sSuffix)
				;
				break;
		}
	}
};

ko.bindingHandlers.saveTrigger = {
	'init': function (oElement) {

		var $oEl = $(oElement);

		$oEl.data('save-trigger-type', $oEl.is('input[type=text],select,textarea') ? 'input' : 'custom');

		if ('custom' === $oEl.data('save-trigger-type'))
		{
			$oEl.append(
				'&nbsp;&nbsp;<i class="icon-spinner-2 animated"></i><i class="icon-remove error"></i><i class="icon-ok success"></i>'
			).addClass('settings-saved-trigger');
		}
		else
		{
			$oEl.addClass('settings-saved-trigger-input');
		}
	},
	'update': function (oElement, fValueAccessor) {
		var
			mValue = ko.utils.unwrapObservable(fValueAccessor()),
			$oEl = $(oElement)
		;

		if ('custom' === $oEl.data('save-trigger-type'))
		{
			switch (mValue.toString())
			{
				case '1':
					$oEl
						.find('.animated,.error').hide().removeClass('visible')
						.end()
						.find('.success').show().addClass('visible')
					;
					break;
				case '0':
					$oEl
						.find('.animated,.success').hide().removeClass('visible')
						.end()
						.find('.error').show().addClass('visible')
					;
					break;
				case '-2':
					$oEl
						.find('.error,.success').hide().removeClass('visible')
						.end()
						.find('.animated').show().addClass('visible')
					;
					break;
				default:
					$oEl
						.find('.animated').hide()
						.end()
						.find('.error,.success').removeClass('visible')
					;
					break;
			}
		}
		else
		{
			switch (mValue.toString())
			{
				case '1':
					$oEl.addClass('success').removeClass('error');
					break;
				case '0':
					$oEl.addClass('error').removeClass('success');
					break;
				case '-2':
//					$oEl;
					break;
				default:
					$oEl.removeClass('error success');
					break;
			}
		}
	}
};

ko.bindingHandlers.select2 = {
    'init': function(oElement, fValueAccessor) {

		var
			iTimer = 0,
			iTimeout = 100,
			oMatch = null,
			oReg = new window.RegExp(/[a-zA-Z0-9\.\-_]+@[a-zA-Z0-9\.\-_]+/),
			oReg2 = new window.RegExp(/(.+) [<]?([^\s<@]+@[a-zA-Z0-9\.\-_]+)[>]?/),
			sEmptyTranslateFunction = function () {
				return '';
			},
			/**
			 * @param {{term:string, callback:Function, matcher:Function}} oCall
			 */
			fLazyAutocomplete = function (oCall) {

				RL.getAutocomplete(oCall['term'], oCall['page'], function (aData, bMore) {
					oCall.callback({
						'more': !!bMore,
						'results': _.map(aData, function (oEmailItem) {
							var sName = oEmailItem.toLine(false);
							return {
								'id': sName,
								'text': sName,
								'c': oEmailItem
							};
						})
					});
				});
			}
		;

		$(oElement).addClass('ko-select2').select2({

			/**
			 * @param {{term:string, callback:Function, matcher:Function}} oCall
			 */
			'query': function (oCall) {
				if (!oCall)
				{
					return;
				}
				
//				if (RL.isLocalAutocomplete && false)
//				{
//					fLazyAutocomplete(oCall);
//				}
//				else
//				{
					if (0 === iTimer)
					{
						fLazyAutocomplete(oCall);
						iTimer = window.setTimeout(Utils.emptyFunction, iTimeout);
					}
					else
					{
						window.clearInterval(iTimer);
						iTimer = window.setTimeout(function () {
							fLazyAutocomplete(oCall);
						}, iTimeout);
					}
//				}
			},
			'formatSelection': function (oItem, oContainer) {
				var sR = oItem && oItem.c ? oItem.c.select2Selection(oContainer) : oItem.text;
				if (null !== sR)
				{
					return sR;
				}
			},
			'formatResult': function (oItem, oContainer, oQuery, fEscapeMarkup) {
				var sR = oItem && oItem.c ? oItem.c.select2Result(oContainer) : '';
				return '' === sR ? fEscapeMarkup(oItem.text) : sR;
			},
			'createSearchChoice': function (sTerm, aList) {
				return 0 === aList.length && oReg.test(sTerm) ?  {
					'id': sTerm,
					'text': sTerm
				} : null;
			},
			'formatNoMatches': sEmptyTranslateFunction,
			'formatSearching': function () {
				return Utils.i18n('SUGGESTIONS/SEARCHING_DESC');
			},
			'formatInputTooShort': sEmptyTranslateFunction,
			'formatSelectionTooBig': sEmptyTranslateFunction,
			'multiple': true,
			'tokenSeparators': [',', ';'],
			'minimumInputLength': 2,
			'selectOnBlur': false,
			'closeOnSelect': true,
			'openOnEnter': false
		});

		ko.utils.domNodeDisposal.addDisposeCallback(oElement, function() {
			$(oElement).select2('destroy');
		});

		$(oElement).on('change', function () {

			var
				aTags = $(this).select2('data'),
				iIndex = 0,
				iLen = aTags.length,
				oItem = null,
				aResult = []
			;

			for (; iIndex < iLen; iIndex++)
			{
				oItem = aTags[iIndex];
				if (oItem && oItem.id)
				{
					if (!oItem.c)
					{
						oItem.c = new EmailModel();
						oMatch = oReg2.exec(Utils.trim(oItem.id));
						if (oMatch && !Utils.isUnd(oMatch[2]))
						{
							oItem.c.name = oMatch[1];
							oItem.c.email = oMatch[2];
						}
						else
						{
							oItem.c.email = oItem.id;
						}
					}

					aResult.push(oItem.c);
				}
			}

			fValueAccessor()(aResult);
		});
    },

	'update': function (oElement, fValueAccessor) {

		var
			aTags = ko.utils.unwrapObservable(fValueAccessor()),
			iIndex = 0,
			iLen = aTags.length,
			oItem = null,
			sName = '',
			aResult = []
		;

		for (; iIndex < iLen; iIndex++)
		{
			oItem = aTags[iIndex];
			sName = oItem.toLine(false);

			aResult.push({
				'id': sName,
				'text': sName,
				'c': oItem
			});
		}

		$(oElement).select2('data', aResult);
	}
};

ko.bindingHandlers.command = {
	'init': function (oElement, fValueAccessor, fAllBindingsAccessor, oViewModel) {
		var
			jqElement = $(oElement),
			oCommand = fValueAccessor()
		;

		if (!oCommand || !oCommand.enabled || !oCommand.canExecute)
		{
			throw new Error('You are not using command function');
		}

		jqElement.addClass('command');
		ko.bindingHandlers[jqElement.is('form') ? 'submit' : 'click'].init.apply(oViewModel, arguments);
	},

	'update': function (oElement, fValueAccessor) {

		var
			bResult = true,
			jqElement = $(oElement),
			oCommand = fValueAccessor()
		;

		bResult = oCommand.enabled();
		jqElement.toggleClass('command-not-enabled', !bResult);

		if (bResult)
		{
			bResult = oCommand.canExecute();
			jqElement.toggleClass('command-can-not-be-execute', !bResult);
		}

		jqElement.toggleClass('command-disabled disable disabled', !bResult);

		if (jqElement.is('input') || jqElement.is('button'))
		{
			jqElement.prop('disabled', !bResult);
		}
	}
};

ko.extenders.trimmer = function (oTarget)
{
	var oResult = ko.computed({
		'read': oTarget,
		'write': function (sNewValue) {
			oTarget(Utils.trim(sNewValue.toString()));
		},
		'owner': this
	});

	oResult(oTarget());
	return oResult;
};

ko.extenders.reversible = function (oTarget)
{
	var mValue = oTarget();

	oTarget.commit = function ()
	{
		mValue = oTarget();
	};

	oTarget.reverse = function ()
	{
		oTarget(mValue);
	};

	oTarget.commitedValue = function ()
	{
		return mValue;
	};

	return oTarget;
};

ko.extenders.toggleSubscribe = function (oTarget, oOptions)
{
	oTarget.subscribe(oOptions[1], oOptions[0], 'beforeChange');
	oTarget.subscribe(oOptions[2], oOptions[0]);

	return oTarget;
};

ko.extenders.falseTimeout = function (oTarget, iOption)
{
	oTarget.iTimeout = 0;
	oTarget.subscribe(function (bValue) {
		if (bValue)
		{
			window.clearTimeout(oTarget.iTimeout);
			oTarget.iTimeout = window.setTimeout(function () {
				oTarget(false);
				oTarget.iTimeout = 0;
			}, Utils.pInt(iOption));
		}
	});

	return oTarget;
};

ko.observable.fn.validateEmail = function ()
{
	this.hasError = ko.observable(false);

	this.subscribe(function (sValue) {
		sValue = Utils.trim(sValue);
		this.hasError('' !== sValue && !(/^[^@\s]+@[^@\s]+$/.test(sValue)));
	}, this);

	this.valueHasMutated();
	return this;
};

ko.observable.fn.validateSimpleEmail = function ()
{
	this.hasError = ko.observable(false);

	this.subscribe(function (sValue) {
		sValue = Utils.trim(sValue);
		this.hasError('' !== sValue && !(/^.+@.+$/.test(sValue)));
	}, this);

	this.valueHasMutated();
	return this;
};

ko.observable.fn.validateFunc = function (fFunc)
{
	this.hasFuncError = ko.observable(false);

	if (Utils.isFunc(fFunc))
	{
		this.subscribe(function (sValue) {
			this.hasFuncError(!fFunc(sValue));
		}, this);
		
		this.valueHasMutated();
	}

	return this;
};

