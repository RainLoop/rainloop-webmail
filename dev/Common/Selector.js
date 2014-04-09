/* RainLoop Webmail (c) RainLoop Team | Licensed under CC BY-NC-SA 3.0 */

/**
 * @constructor
 * @param {koProperty} oKoList
 * @param {koProperty} oKoSelectedItem
 * @param {string} sItemSelector
 * @param {string} sItemSelectedSelector
 * @param {string} sItemCheckedSelector
 * @param {string} sItemFocusedSelector
 */
function Selector(oKoList, oKoSelectedItem,
	sItemSelector, sItemSelectedSelector, sItemCheckedSelector, sItemFocusedSelector)
{
	this.list = oKoList;
	
	this.listChecked = ko.computed(function () {
		return _.filter(this.list(), function (oItem) {
			return oItem.checked();
		});
	}, this);

	this.isListChecked = ko.computed(function () {
		return 0 < this.listChecked().length;
	}, this);
	
	this.lastSelectedItem = ko.observable(null);
	this.focusedItem = ko.observable(null);
	this.selectedItem = oKoSelectedItem;

	this.listChecked.subscribe(function (aItems) {
		if (0 < aItems.length)
		{
			this.selectedItem(null);
		}
		else if (this.bAutoSelect && this.lastSelectedItem())
		{
			this.selectedItem(this.lastSelectedItem());
		}
	}, this);
	
	this.selectedItem.subscribe(function (oItem) {

		if (oItem)
		{
			if (this.bAutoSelect)
			{
				this.lastSelectedItem(oItem);
			}
			
			if (this.isListChecked())
			{
				_.each(this.listChecked(), function (oSubItem) {
					oSubItem.checked(false);
				});
			}
		}

	}, this);

	this.selectedItem.extend({'toggleSubscribe': [null,
		function (oPrev) {
			if (oPrev)
			{
				oPrev.selected(false);
			}
		}, function (oNext) {
			if (oNext)
			{
				oNext.selected(true);
			}
		}
	]});

	this.focusedItem.extend({'toggleSubscribe': [null,
		function (oPrev) {
			if (oPrev)
			{
				oPrev.focused(false);
			}
		}, function (oNext) {
			if (oNext)
			{
				oNext.focused(true);
			}
		}
	]});

	this.oContentVisible = null;
	this.oContentScrollable = null;
	
	this.sItemSelector = sItemSelector;
	this.sItemSelectedSelector = sItemSelectedSelector;
	this.sItemCheckedSelector = sItemCheckedSelector;
	this.sItemFocusedSelector = sItemFocusedSelector;
	
	this.sLastUid = '';
	this.oCallbacks = {};
	this.iSelectTimer = 0;

	this.bUseKeyboard = true;
	this.bAutoSelect = true;

	this.emptyFunction = function () {};

	this.useItemSelectCallback = true;

	this.selectedItem.subscribe(function (oItem) {

		if (oItem)
		{
			this.sLastUid = this.getItemUid(oItem);
			this.focusedItem(oItem);
		}

		if (this.useItemSelectCallback)
		{
			if (oItem)
			{
				this.selectItemCallbacks(oItem);
			}
			else
			{
				this.selectItemCallbacks(null);
			}
		}

	}, this);

	this.focusedItem.subscribe(function (oItem) {
		if (oItem)
		{
			this.sLastUid = this.getItemUid(oItem);
		}
	}, this);

	var
		aCheckedCache = [],
		mFocused = null,
		mSelected = null
	;
	
	this.list.subscribe(function () {

		var self = this, aItems = this.list();
		if (Utils.isArray(aItems))
		{
			_.each(aItems, function (oItem) {

				if (oItem.checked())
				{
					aCheckedCache.push(self.getItemUid(oItem));
				}
				
				if (null === mFocused && oItem.focused())
				{
					mFocused = self.getItemUid(oItem);
				}

				if (null === mSelected && oItem.selected())
				{
					mSelected = self.getItemUid(oItem);
				}

			});
		}
	}, this, 'beforeChange');
	
	this.list.subscribe(function (aItems) {
		
		this.useItemSelectCallback = false;

		var
			self = this,
			bChecked = false,
			iLen = 0
		;
		
		this.focusedItem(null);
		this.selectedItem(null);

		if (Utils.isArray(aItems))
		{
			iLen = aCheckedCache.length;

			_.each(aItems, function (oItem) {
				
				var sUid = self.getItemUid(oItem);
				
				if (0 < iLen && -1 < Utils.inArray(sUid, aCheckedCache))
				{
					bChecked = true;
					oItem.checked(true);
					iLen--;
				}

				if (null !== mFocused && mFocused === sUid)
				{
					self.focusedItem(oItem);
					mFocused = null;
				}

				if (!bChecked && null !== mSelected && mSelected === sUid)
				{
					self.selectedItem(oItem);
					mSelected = null;
				}
			});
		}

		this.useItemSelectCallback = true;
		
		aCheckedCache = [];
		mFocused = null;
		mSelected = null;
		
	}, this);

	this.selectItemCallbacksThrottle = _.debounce(this.selectItemCallbacks, 300);
}

Selector.prototype.selectItemCallbacks = function (oItem)
{
	(this.oCallbacks['onItemSelect'] || this.emptyFunction)(oItem);
};

Selector.prototype.goDown = function (bForceSelect)
{
	this.newSelectPosition(Enums.EventKeyCode.Down, false, bForceSelect);
};

Selector.prototype.goUp = function (bForceSelect)
{
	this.newSelectPosition(Enums.EventKeyCode.Up, false, bForceSelect);
};

Selector.prototype.init = function (oContentVisible, oContentScrollable, sKeyScope)
{
	this.oContentVisible = oContentVisible;
	this.oContentScrollable = oContentScrollable;

	sKeyScope = sKeyScope || 'all';
	
	if (this.oContentVisible && this.oContentScrollable)
	{
		var 
			self = this
		;
		
		$(this.oContentVisible)
			.on('selectstart', function (oEvent) {
				if (oEvent && oEvent.preventDefault)
				{
					oEvent.preventDefault();
				}
			})
			.on('click', this.sItemSelector, function (oEvent) {
				self.actionClick(ko.dataFor(this), oEvent, true);
			})
			.on('click', this.sItemCheckedSelector, function (oEvent) {
				var oItem = ko.dataFor(this);
				if (oItem)
				{
					if (oEvent && oEvent.shiftKey)
					{
						self.actionClick(oItem, oEvent);
					}
					else
					{
						self.sLastUid = self.getItemUid(oItem);
						oItem.checked(!oItem.checked());
					}
				}
			})
		;

		key('enter', sKeyScope, function () {
			if (!self.bAutoSelect)
			{
				if (self.focusedItem())
				{
					self.actionClick(self.focusedItem());
				}

				return false;
			}
		});

		key('ctrl+up, command+up, ctrl+down, command+down', sKeyScope, function () {
			return false;
		});

		key('up, shift+up, down, shift+down, home, end, pageup, pagedown, insert, space', sKeyScope, function (event, handler) {
			if (event && handler && handler.shortcut)
			{
				// TODO
				var iKey = 0;
				switch (handler.shortcut)
				{
					case 'up':
					case 'shift+up':
						iKey = Enums.EventKeyCode.Up;
						break;
					case 'down':
					case 'shift+down':
						iKey = Enums.EventKeyCode.Down;
						break;
					case 'insert':
						iKey = Enums.EventKeyCode.Insert;
						break;
					case 'space':
						iKey = Enums.EventKeyCode.Space;
						break;
					case 'home':
						iKey = Enums.EventKeyCode.Home;
						break;
					case 'end':
						iKey = Enums.EventKeyCode.End;
						break;
					case 'pageup':
						iKey = Enums.EventKeyCode.PageUp;
						break;
					case 'pagedown':
						iKey = Enums.EventKeyCode.PageDown;
						break;
				}

				if (0 < iKey)
				{
					self.newSelectPosition(iKey, key.shift);
					return false;
				}
			}
		});
	}
};

Selector.prototype.useKeyboard = function (bValue)
{
	this.bUseKeyboard = !!bValue;
};

Selector.prototype.autoSelect = function (bValue)
{
	this.bAutoSelect = !!bValue;
};

/**
 * @param {Object} oItem
 * @returns {string}
 */
Selector.prototype.getItemUid = function (oItem)
{
	var
		sUid = '',
		fGetItemUidCallback = this.oCallbacks['onItemGetUid'] || null
	;

	if (fGetItemUidCallback && oItem)
	{
		sUid = fGetItemUidCallback(oItem);
	}

	return sUid.toString();
};

/**
 * @param {number} iEventKeyCode
 * @param {boolean} bShiftKey
 * @param {boolean=} bForceSelect = false
 */
Selector.prototype.newSelectPosition = function (iEventKeyCode, bShiftKey, bForceSelect)
{
	var
		self = this,
		iIndex = 0,
		iPageStep = 10,
		bNext = false,
		bStop = false,
		oResult = null,
		aList = this.list(),
		iListLen = aList ? aList.length : 0,
		oFocused = this.focusedItem()
	;

	if (0 < iListLen)
	{
		if (!oFocused)
		{
			if (Enums.EventKeyCode.Down === iEventKeyCode || Enums.EventKeyCode.Insert === iEventKeyCode || Enums.EventKeyCode.Space === iEventKeyCode || Enums.EventKeyCode.Home === iEventKeyCode || Enums.EventKeyCode.PageUp === iEventKeyCode)
			{
				oResult = aList[0];
			}
			else if (Enums.EventKeyCode.Up === iEventKeyCode || Enums.EventKeyCode.End === iEventKeyCode || Enums.EventKeyCode.PageDown === iEventKeyCode)
			{
				oResult = aList[aList.length - 1];
			}
		}
		else if (oFocused)
		{
			if (Enums.EventKeyCode.Down === iEventKeyCode || Enums.EventKeyCode.Up === iEventKeyCode ||  Enums.EventKeyCode.Insert === iEventKeyCode || Enums.EventKeyCode.Space === iEventKeyCode)
			{
				_.each(aList, function (oItem) {
					if (!bStop)
					{
						switch (iEventKeyCode) {
						case Enums.EventKeyCode.Up:
							if (oFocused === oItem)
							{
								bStop = true;
							}
							else
							{
								oResult = oItem;
							}
							break;
						case Enums.EventKeyCode.Down:
						case Enums.EventKeyCode.Insert:
//						case Enums.EventKeyCode.Space:
							if (bNext)
							{
								oResult = oItem;
								bStop = true;
							}
							else if (oFocused === oItem)
							{
								bNext = true;
							}
							break;
						}
					}
				});
			}
			else if (Enums.EventKeyCode.Home === iEventKeyCode || Enums.EventKeyCode.End === iEventKeyCode)
			{
				if (Enums.EventKeyCode.Home === iEventKeyCode)
				{
					oResult = aList[0];
				}
				else if (Enums.EventKeyCode.End === iEventKeyCode)
				{
					oResult = aList[aList.length - 1];
				}
			}
			else if (Enums.EventKeyCode.PageDown === iEventKeyCode)
			{
				for (; iIndex < iListLen; iIndex++)
				{
					if (oFocused === aList[iIndex])
					{
						iIndex += iPageStep;
						iIndex = iListLen - 1 < iIndex ? iListLen - 1 : iIndex;
						oResult = aList[iIndex];
						break;
					}
				}
			}
			else if (Enums.EventKeyCode.PageUp === iEventKeyCode)
			{
				for (iIndex = iListLen; iIndex >= 0; iIndex--)
				{
					if (oFocused === aList[iIndex])
					{
						iIndex -= iPageStep;
						iIndex = 0 > iIndex ? 0 : iIndex;
						oResult = aList[iIndex];
						break;
					}
				}
			}
		}
	}

	if (oResult)
	{
		if (oFocused)
		{
			if (bShiftKey)
			{
				if (Enums.EventKeyCode.Up === iEventKeyCode || Enums.EventKeyCode.Down === iEventKeyCode)
				{
					oFocused.checked(!oFocused.checked());
				}
			}
			else if (Enums.EventKeyCode.Insert === iEventKeyCode || Enums.EventKeyCode.Space === iEventKeyCode)
			{
				oFocused.checked(!oFocused.checked());
			}
		}

		this.focusedItem(oResult);

		if ((this.bAutoSelect || !!bForceSelect) && !this.isListChecked() && Enums.EventKeyCode.Space !== iEventKeyCode)
		{
			window.clearTimeout(this.iSelectTimer);
			this.iSelectTimer = window.setTimeout(function () {
				self.iSelectTimer = 0;
				self.actionClick(oResult);
			}, 300);
		}

		this.scrollToFocused();
	}
	else if (oFocused)
	{
		if (bShiftKey && (Enums.EventKeyCode.Up === iEventKeyCode || Enums.EventKeyCode.Down === iEventKeyCode))
		{
			oFocused.checked(!oFocused.checked());
		}
		else if (Enums.EventKeyCode.Insert === iEventKeyCode || Enums.EventKeyCode.Space === iEventKeyCode)
		{
			oFocused.checked(!oFocused.checked());
		}
	}
};

/**
 * @return {boolean}
 */
Selector.prototype.scrollToFocused = function ()
{
	if (!this.oContentVisible || !this.oContentScrollable)
	{
		return false;
	}

	var
		iOffset = 20,
		oFocused = $(this.sItemFocusedSelector, this.oContentScrollable),
		oPos = oFocused.position(),
		iVisibleHeight = this.oContentVisible.height(),
		iFocusedHeight = oFocused.outerHeight()
	;

	if (oPos && (oPos.top < 0 || oPos.top + iFocusedHeight > iVisibleHeight))
	{
		if (oPos.top < 0)
		{
			this.oContentScrollable.scrollTop(this.oContentScrollable.scrollTop() + oPos.top - iOffset);
		}
		else
		{
			this.oContentScrollable.scrollTop(this.oContentScrollable.scrollTop() + oPos.top - iVisibleHeight + iFocusedHeight + iOffset);
		}

		return true;
	}

	return false;
};

Selector.prototype.eventClickFunction = function (oItem, oEvent)
{
	var
		sUid = this.getItemUid(oItem),
		iIndex = 0,
		iLength = 0,
		oListItem = null,
		sLineUid = '',
		bChangeRange = false,
		bIsInRange = false,
		aList = [],
		bChecked = false
	;

	if (oEvent && oEvent.shiftKey)
	{
		if ('' !== sUid && '' !== this.sLastUid && sUid !== this.sLastUid)
		{
			aList = this.list();
			bChecked = oItem.checked();

			for (iIndex = 0, iLength = aList.length; iIndex < iLength; iIndex++)
			{
				oListItem = aList[iIndex];
				sLineUid = this.getItemUid(oListItem);

				bChangeRange = false;
				if (sLineUid === this.sLastUid || sLineUid === sUid)
				{
					bChangeRange = true;
				}

				if (bChangeRange)
				{
					bIsInRange = !bIsInRange;
				}

				if (bIsInRange || bChangeRange)
				{
					oListItem.checked(bChecked);
				}
			}
		}
	}

	this.sLastUid = '' === sUid ? '' : sUid;
};

/**
 * @param {Object} oItem
 * @param {Object=} oEvent
 */
Selector.prototype.actionClick = function (oItem, oEvent)
{
	if (oItem)
	{
		var
			bClick = true,
			sUid = this.getItemUid(oItem)
		;
		
		if (oEvent)
		{
			if (oEvent.shiftKey)
			{
				bClick = false;
				if ('' === this.sLastUid)
				{
					this.sLastUid = sUid;
				}

				oItem.checked(!oItem.checked());
				this.eventClickFunction(oItem, oEvent);
			}
			else if (oEvent.ctrlKey)
			{
				bClick = false;
				this.sLastUid = sUid;

				oItem.checked(!oItem.checked());
			}
		}

		if (bClick)
		{
			this.selectedItem(oItem);
		}
	}
};

Selector.prototype.on = function (sEventName, fCallback)
{
	this.oCallbacks[sEventName] = fCallback;
};
