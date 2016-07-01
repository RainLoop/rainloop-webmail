
var Utils = require('Common/Utils');

/**
 * @constructor
 * @param {string=} sEmail
 * @param {string=} sName
 * @param {string=} sDkimStatus
 * @param {string=} sDkimValue
 */
function EmailModel(sEmail, sName, sDkimStatus, sDkimValue)
{
	this.email = sEmail || '';
	this.name = sName || '';
	this.dkimStatus = sDkimStatus || 'none';
	this.dkimValue = sDkimValue || '';

	this.clearDuplicateName();
}

/**
 * @static
 * @param {AjaxJsonEmail} oJsonEmail
 * @returns {?EmailModel}
 */
EmailModel.newInstanceFromJson = function(oJsonEmail)
{
	var oEmailModel = new EmailModel();
	return oEmailModel.initByJson(oJsonEmail) ? oEmailModel : null;
};

/**
 * @static
 * @param {string} sLine
 * @param {string=} sDelimiter = ';'
 * @returns {Array}
 */
EmailModel.splitHelper = function(sLine, sDelimiter)
{
	sDelimiter = sDelimiter || ';';

	sLine = sLine.replace(/[\r\n]+/g, '; ').replace(/[\s]+/g, ' ');

	var
		iIndex = 0,
		iLen = sLine.length,
		bAt = false,
		sChar = '',
		sResult = '';

	for (; iIndex < iLen; iIndex++)
	{
		sChar = sLine.charAt(iIndex);
		switch (sChar)
		{
			case '@':
				bAt = true;
				break;
			case ' ':
				if (bAt)
				{
					bAt = false;
					sResult += sDelimiter;
				}
				break;
			// no default
		}

		sResult += sChar;
	}

	return sResult.split(sDelimiter);
};

/**
 * @type {string}
 */
EmailModel.prototype.name = '';

/**
 * @type {string}
 */
EmailModel.prototype.email = '';

/**
 * @type {string}
 */
EmailModel.prototype.dkimStatus = 'none';

/**
 * @type {string}
 */
EmailModel.prototype.dkimValue = '';

EmailModel.prototype.clear = function()
{
	this.email = '';
	this.name = '';

	this.dkimStatus = 'none';
	this.dkimValue = '';
};

/**
 * @returns {boolean}
 */
EmailModel.prototype.validate = function()
{
	return '' !== this.name || '' !== this.email;
};

/**
 * @param {boolean} bWithoutName = false
 * @returns {string}
 */
EmailModel.prototype.hash = function(bWithoutName)
{
	return '#' + (bWithoutName ? '' : this.name) + '#' + this.email + '#';
};

EmailModel.prototype.clearDuplicateName = function()
{
	if (this.name === this.email)
	{
		this.name = '';
	}
};

/**
 * @param {string} sQuery
 * @returns {boolean}
 */
EmailModel.prototype.search = function(sQuery)
{
	return -1 < (this.name + ' ' + this.email).toLowerCase().indexOf(sQuery.toLowerCase());
};

/**
 * @param {string} sString
 */
EmailModel.prototype.parse = function(sString)
{
	this.clear();

	sString = Utils.trim(sString);

	var
		mRegex = /(?:"([^"]+)")? ?[<]?(.*?@[^>,]+)>?,? ?/g,
		mMatch = mRegex.exec(sString);

	if (mMatch)
	{
		this.name = mMatch[1] || '';
		this.email = mMatch[2] || '';

		this.clearDuplicateName();
	}
	else if ((/^[^@]+@[^@]+$/).test(sString))
	{
		this.name = '';
		this.email = sString;
	}
};

/**
 * @param {AjaxJsonEmail} oJsonEmail
 * @returns {boolean}
 */
EmailModel.prototype.initByJson = function(oJsonEmail)
{
	var bResult = false;
	if (oJsonEmail && 'Object/Email' === oJsonEmail['@Object'])
	{
		this.name = Utils.trim(oJsonEmail.Name);
		this.email = Utils.trim(oJsonEmail.Email);
		this.dkimStatus = Utils.trim(oJsonEmail.DkimStatus || '');
		this.dkimValue = Utils.trim(oJsonEmail.DkimValue || '');

		bResult = '' !== this.email;
		this.clearDuplicateName();
	}

	return bResult;
};

/**
 * @param {boolean} bFriendlyView
 * @param {boolean=} bWrapWithLink = false
 * @param {boolean=} bEncodeHtml = false
 * @returns {string}
 */
EmailModel.prototype.toLine = function(bFriendlyView, bWrapWithLink, bEncodeHtml)
{
	var sResult = '';
	if ('' !== this.email)
	{
		bWrapWithLink = Utils.isUnd(bWrapWithLink) ? false : !!bWrapWithLink;
		bEncodeHtml = Utils.isUnd(bEncodeHtml) ? false : !!bEncodeHtml;

		if (bFriendlyView && '' !== this.name)
		{
			sResult = bWrapWithLink ? '<a href="mailto:' + Utils.encodeHtml('"' + this.name + '" <' + this.email + '>') +
				'" target="_blank" tabindex="-1">' + Utils.encodeHtml(this.name) + '</a>' :
					(bEncodeHtml ? Utils.encodeHtml(this.name) : this.name);
		}
		else
		{
			sResult = this.email;
			if ('' !== this.name)
			{
				if (bWrapWithLink)
				{
					sResult = Utils.encodeHtml('"' + this.name + '" <') + '<a href="mailto:' +
						Utils.encodeHtml('"' + this.name + '" <' + this.email + '>') +
						'" target="_blank" tabindex="-1">' +
						Utils.encodeHtml(sResult) +
						'</a>' +
						Utils.encodeHtml('>');
				}
				else
				{
					sResult = '"' + this.name + '" <' + sResult + '>';
					if (bEncodeHtml)
					{
						sResult = Utils.encodeHtml(sResult);
					}
				}
			}
			else if (bWrapWithLink)
			{
				sResult = '<a href="mailto:' + Utils.encodeHtml(this.email) + '" target="_blank" tabindex="-1">' + Utils.encodeHtml(this.email) + '</a>';
			}
		}
	}

	return sResult;
};

/**
 * @param {string} $sEmailAddress
 * @returns {boolean}
 */
EmailModel.prototype.mailsoParse = function($sEmailAddress)
{
	$sEmailAddress = Utils.trim($sEmailAddress);
	if ('' === $sEmailAddress)
	{
		return false;
	}

	var
		substr = function(str, start, len) {
			str = Utils.pString(str);
			var	end = str.length;

			if (0 > start)
			{
				start += end;
			}

			end = 'undefined' === typeof len ? end : (0 > len ? len + end : len + start);

			return start >= str.length || 0 > start || start > end ? false : str.slice(start, end);
		},

		substrReplace = function(str, replace, start, length) {
			str = Utils.pString(str);
			if (0 > start)
			{
				start += str.length;
			}

			length = 'undefined' !== typeof length ? length : str.length;
			if (0 > length)
			{
				length = length + str.length - start;
			}
			return str.slice(0, start) + replace.substr(0, length) + replace.slice(length) + str.slice(start + length);
		},

		$sName = '',
		$sEmail = '',
		$sComment = '',

		$bInName = false,
		$bInAddress = false,
		$bInComment = false,

		$aRegs = null,

		$iStartIndex = 0,
		$iEndIndex = 0,
		$iCurrentIndex = 0;

	while ($iCurrentIndex < $sEmailAddress.length)
	{
		switch ($sEmailAddress.substr($iCurrentIndex, 1))
		{
			case '"':
				if ((!$bInName) && (!$bInAddress) && (!$bInComment))
				{
					$bInName = true;
					$iStartIndex = $iCurrentIndex;
				}
				else if ((!$bInAddress) && (!$bInComment))
				{
					$iEndIndex = $iCurrentIndex;
					$sName = substr($sEmailAddress, $iStartIndex + 1, $iEndIndex - $iStartIndex - 1);
					$sEmailAddress = substrReplace($sEmailAddress, '', $iStartIndex, $iEndIndex - $iStartIndex + 1);
					$iEndIndex = 0;
					$iCurrentIndex = 0;
					$iStartIndex = 0;
					$bInName = false;
				}
				break;
			case '<':
				if ((!$bInName) && (!$bInAddress) && (!$bInComment))
				{
					if (0 < $iCurrentIndex && 0 === $sName.length)
					{
						$sName = substr($sEmailAddress, 0, $iCurrentIndex);
					}

					$bInAddress = true;
					$iStartIndex = $iCurrentIndex;
				}
				break;
			case '>':
				if ($bInAddress)
				{
					$iEndIndex = $iCurrentIndex;
					$sEmail = substr($sEmailAddress, $iStartIndex + 1, $iEndIndex - $iStartIndex - 1);
					$sEmailAddress = substrReplace($sEmailAddress, '', $iStartIndex, $iEndIndex - $iStartIndex + 1);
					$iEndIndex = 0;
					$iCurrentIndex = 0;
					$iStartIndex = 0;
					$bInAddress = false;
				}
				break;
			case '(':
				if ((!$bInName) && (!$bInAddress) && (!$bInComment))
				{
					$bInComment = true;
					$iStartIndex = $iCurrentIndex;
				}
				break;
			case ')':
				if ($bInComment)
				{
					$iEndIndex = $iCurrentIndex;
					$sComment = substr($sEmailAddress, $iStartIndex + 1, $iEndIndex - $iStartIndex - 1);
					$sEmailAddress = substrReplace($sEmailAddress, '', $iStartIndex, $iEndIndex - $iStartIndex + 1);
					$iEndIndex = 0;
					$iCurrentIndex = 0;
					$iStartIndex = 0;
					$bInComment = false;
				}
				break;
			case '\\':
				$iCurrentIndex += 1;
				break;
			// no default
		}

		$iCurrentIndex += 1;
	}

	if (0 === $sEmail.length)
	{
		$aRegs = $sEmailAddress.match(/[^@\s]+@\S+/i);
		if ($aRegs && $aRegs[0])
		{
			$sEmail = $aRegs[0];
		}
		else
		{
			$sName = $sEmailAddress;
		}
	}

	if (0 < $sEmail.length && 0 === $sName.length && 0 === $sComment.length)
	{
		$sName = $sEmailAddress.replace($sEmail, '');
	}

	$sEmail = Utils.trim($sEmail).replace(/^[<]+/, '').replace(/[>]+$/, '');
	$sName = Utils.trim($sName).replace(/^["']+/, '').replace(/["']+$/, '');
	$sComment = Utils.trim($sComment).replace(/^[(]+/, '').replace(/[)]+$/, '');

	// Remove backslash
	$sName = $sName.replace(/\\\\(.)/g, '$1');
	$sComment = $sComment.replace(/\\\\(.)/g, '$1');

	this.name = $sName;
	this.email = $sEmail;

	this.clearDuplicateName();
	return true;
};

module.exports = EmailModel;
