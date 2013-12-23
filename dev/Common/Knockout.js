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

							if (oEvent.pageY >= oOffset.top && oEvent.pageY <= oOffset.top + iTriggerZone)
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
				return fValueAccessor()(oEvent && oEvent.target ? ko.dataFor(oEvent.target) : null, !!oEvent.shiftKey);
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

ko.bindingHandlers.saveTrigger = {
	'init': function (oElement) {

		var $oEl = $(oElement);

		$oEl.data('save-trigger-type', $oEl.is('input[type=text],input[type=email],input[type=password],select,textarea') ? 'input' : 'custom');

		if ('custom' === $oEl.data('save-trigger-type'))
		{
			$oEl.append(
				'&nbsp;&nbsp;<i class="icon-spinner animated"></i><i class="icon-remove error"></i><i class="icon-ok success"></i>'
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

ko.bindingHandlers.emailsTags = {
    'init': function(oElement, fValueAccessor) {
		var
			$oEl = $(oElement),
			fValue = fValueAccessor()
		;

		$oEl.inputosaurus({
			'parseOnBlur': true,
			'inputDelimiters': [',', ';'],
			'autoCompleteSource': function (oData, fResponse) {
				RL.getAutocomplete(oData.term, function (aData) {
					fResponse(_.map(aData, function (oEmailItem) {
						return oEmailItem.toLine(false);
					}));
				});
			},
			'parseHook': function (aInput) {
				return _.map(aInput, function (sInputValue) {
					
					var sValue = Utils.trim(sInputValue), oEmail = null;
					if ('' !== sValue)
					{
						oEmail = new EmailModel();
						oEmail.mailsoParse(sValue);
						oEmail.clearDuplicateName();

//						sValue = oEmail.toLine(false);
//						return sValue;
						return [oEmail.toLine(false), oEmail];
					}

					return [sValue, null];

				});
			},
			'change': _.bind(function (oEvent) {
				$oEl.data('EmailsTagsValue', oEvent.target.value);
				fValue(oEvent.target.value);
			}, this)
		});

		fValue.subscribe(function (sValue) {
			if ($oEl.data('EmailsTagsValue') !== sValue)
			{
				$oEl.val(sValue);
				$oEl.inputosaurus('refresh');
			}
		});

		if (fValue.focusTrigger)
		{
			fValue.focusTrigger.subscribe(function () {
				$oEl.inputosaurus('focus');
			});
		}
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

		jqElement.toggleClass('command-disabled disable disabled', !bResult).toggleClass('no-disabled', !!bResult);

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

ko.observable.fn.validateNone = function ()
{
	this.hasError = ko.observable(false);
	return this;
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

