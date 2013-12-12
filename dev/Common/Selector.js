/* RainLoop Webmail (c) RainLoop Team | Licensed under CC BY-NC-SA 3.0 */

/**
 * @constructor
 * @param {koProperty} oKoList
 * @param {koProperty} oKoSelectedItem
 * @param {string} sItemSelector
 * @param {string} sItemSelectedSelector
 * @param {string} sItemCheckedSelector
 */
function Selector(oKoList, oKoSelectedItem, sItemSelector, sItemSelectedSelector, sItemCheckedSelector)
{
	this.list = oKoList;
	this.selectedItem = oKoSelectedItem;

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

	this.oContentVisible = null;
	this.oContentScrollable = null;
	
	this.sItemSelector = sItemSelector;
	this.sItemSelectedSelector = sItemSelectedSelector;
	this.sItemCheckedSelector = sItemCheckedSelector;
	
	this.sLastUid = '';
	this.oCallbacks = {};
	this.iSelectTimer = 0;
	this.bUseKeyboard = true;

	this.emptyFunction = function () {};

	this.useItemSelectCallback = true;
	this.throttleSelection = false;

	this.selectedItem.subscribe(function (oItem) {
		if (this.useItemSelectCallback)
		{
			if (this.throttleSelection)
			{
				this.throttleSelection = false;
				this.selectItemCallbacksThrottle(oItem);
			}
			else
			{
				this.selectItemCallbacks(oItem);
			}
		}
	}, this);

	var
		self = this,
		aCheckedCache = [],
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
				
				if (null === mSelected && oItem.selected())
				{
					mSelected = self.getItemUid(oItem);
				}
			});
		}
	}, this, 'beforeChange');
	
	this.list.subscribe(function (aItems) {
		
		this.useItemSelectCallback = false;
		
		this.selectedItem(null);

		if (Utils.isArray(aItems))
		{
			var self = this, iLen = aCheckedCache.length;
			_.each(aItems, function (oItem) {
				if (0 < iLen && -1 < Utils.inArray(self.getItemUid(oItem), aCheckedCache))
				{
					oItem.checked(true);
					iLen--;
				}

				if (null !== mSelected && mSelected === self.getItemUid(oItem))
				{
					oItem.selected(true);
					mSelected = null;
					
					self.selectedItem(oItem);
				}
			});
		}

		this.useItemSelectCallback = true;
		
		aCheckedCache = [];
		mSelected = null;
	}, this);

	this.list.setSelectedByUid = function (sUid) {
		self.selectByUid(sUid, false);
	};

	this.selectItemCallbacksThrottle = _.debounce(this.selectItemCallbacks, 300);
}

Selector.prototype.selectItemCallbacks = function (oItem)
{
	(this.oCallbacks['onItemSelect'] || this.emptyFunction)(oItem);
};

Selector.prototype.goDown = function ()
{
	this.newSelectPosition(Enums.EventKeyCode.Down, false);
};

Selector.prototype.goUp = function ()
{
	this.newSelectPosition(Enums.EventKeyCode.Up, false);
};

Selector.prototype.init = function (oContentVisible, oContentScrollable)
{
	this.oContentVisible = oContentVisible;
	this.oContentScrollable = oContentScrollable;
	
	if (this.oContentVisible && this.oContentScrollable)
	{
		var 
			self = this
		;
		
		$(this.oContentVisible)
			.on('click', this.sItemSelector, function (oEvent) {
				self.actionClick(ko.dataFor(this), oEvent);
			}).on('click', this.sItemCheckedSelector, function (oEvent) {
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
						if (oItem.selected())
						{
							oItem.checked(false);
							self.selectedItem(null);
						}
						else
						{
							oItem.checked(!oItem.checked());
						}
					}
				}
			})
		;

		$(window.document).on('keydown', function (oEvent) {
			var bResult = true;
			if (oEvent && self.bUseKeyboard && !Utils.inFocus())
			{
				if (-1 < Utils.inArray(oEvent.keyCode, [Enums.EventKeyCode.Up, Enums.EventKeyCode.Down, Enums.EventKeyCode.Insert,
					Enums.EventKeyCode.Home, Enums.EventKeyCode.End, Enums.EventKeyCode.PageUp, Enums.EventKeyCode.PageDown]))
				{
					self.newSelectPosition(oEvent.keyCode, oEvent.shiftKey);
					bResult = false;
				}
				else if (Enums.EventKeyCode.Delete === oEvent.keyCode && !oEvent.ctrlKey && !oEvent.shiftKey)
				{
					if (self.oCallbacks['onDelete'])
					{
						self.oCallbacks['onDelete']();
					}
					
					bResult = false;
				}
			}
			return bResult;
		});
	}
};

Selector.prototype.selectByUid = function (mUid, bUseCallback)
{
	bUseCallback = Utils.isUnd(bUseCallback) ? true : !!bUseCallback;
	this.useItemSelectCallback = bUseCallback;

	var 
		oItem = _.find(this.list(), function (oItem) {
			return mUid === this.getItemUid(oItem);
		}, this)
	;

	if (oItem)
	{
		this.selectedItem(oItem);
	}

	this.useItemSelectCallback = true;
};

Selector.prototype.useKeyboard = function (bValue)
{
	this.bUseKeyboard = !!bValue;
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
 */
Selector.prototype.newSelectPosition = function (iEventKeyCode, bShiftKey)
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
		oSelected = this.selectedItem()
	;

	if (0 < iListLen)
	{
		if (!oSelected)
		{
			if (Enums.EventKeyCode.Down === iEventKeyCode || Enums.EventKeyCode.Insert === iEventKeyCode || Enums.EventKeyCode.Home === iEventKeyCode || Enums.EventKeyCode.PageUp === iEventKeyCode)
			{
				oResult = aList[0];
			}
			else if (Enums.EventKeyCode.Up === iEventKeyCode || Enums.EventKeyCode.End === iEventKeyCode || Enums.EventKeyCode.PageDown === iEventKeyCode)
			{
				oResult = aList[aList.length - 1];
			}
		}
		else if (oSelected)
		{
			if (Enums.EventKeyCode.Down === iEventKeyCode || Enums.EventKeyCode.Up === iEventKeyCode ||  Enums.EventKeyCode.Insert === iEventKeyCode)
			{
				_.each(aList, function (oItem) {
					if (!bStop)
					{
						switch (iEventKeyCode) {
						case Enums.EventKeyCode.Up:
							if (oSelected === oItem)
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
							if (bNext)
							{
								oResult = oItem;
								bStop = true;
							}
							else if (oSelected === oItem)
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
					if (oSelected === aList[iIndex])
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
					if (oSelected === aList[iIndex])
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
		if (oSelected)
		{
			if (bShiftKey)
			{
				if (Enums.EventKeyCode.Up === iEventKeyCode || Enums.EventKeyCode.Down === iEventKeyCode)
				{
					oSelected.checked(!oSelected.checked());
				}
			}
			else if (Enums.EventKeyCode.Insert === iEventKeyCode)
			{
				oSelected.checked(!oSelected.checked());
			}
		}

		this.throttleSelection = true;
		this.selectedItem(oResult);
		this.throttleSelection = true;

		if (0 !== this.iSelectTimer)
		{
			window.clearTimeout(this.iSelectTimer);
			this.iSelectTimer = window.setTimeout(function () {
				self.iSelectTimer = 0;
				self.actionClick(oResult);
			}, 1000);
		}
		else
		{
			this.iSelectTimer = window.setTimeout(function () {
				self.iSelectTimer = 0;
			}, 200);

			this.actionClick(oResult);
		}

		this.scrollToSelected();
	}
	else if (oSelected)
	{
		if (bShiftKey && (Enums.EventKeyCode.Up === iEventKeyCode || Enums.EventKeyCode.Down === iEventKeyCode))
		{
			oSelected.checked(!oSelected.checked());
		}
		else if (Enums.EventKeyCode.Insert === iEventKeyCode)
		{
			oSelected.checked(!oSelected.checked());
		}
	}
};

/**
 * @return {boolean}
 */
Selector.prototype.scrollToSelected = function ()
{
	if (!this.oContentVisible || !this.oContentScrollable)
	{
		return false;
	}

	var
		iOffset = 20,
		oSelected = $(this.sItemSelectedSelector, this.oContentScrollable),
		oPos = oSelected.position(),
		iVisibleHeight = this.oContentVisible.height(),
		iSelectedHeight = oSelected.outerHeight()
	;

	if (oPos && (oPos.top < 0 || oPos.top + iSelectedHeight > iVisibleHeight))
	{
		if (oPos.top < 0)
		{
			this.oContentScrollable.scrollTop(this.oContentScrollable.scrollTop() + oPos.top - iOffset);
		}
		else
		{
			this.oContentScrollable.scrollTop(this.oContentScrollable.scrollTop() + oPos.top - iVisibleHeight + iSelectedHeight + iOffset);
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
 *
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
			this.sLastUid = sUid;
		}
	}
};

Selector.prototype.on = function (sEventName, fCallback)
{
	this.oCallbacks[sEventName] = fCallback;
};
