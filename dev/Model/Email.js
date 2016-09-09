
import {trim, pString, encodeHtml} from 'Common/Utils';

class EmailModel
{
	email = '';
	name = '';
	dkimStatus = '';
	dkimValue = '';

	/**
	 * @param {string=} email = ''
	 * @param {string=} name = ''
	 * @param {string=} dkimStatus = 'none'
	 * @param {string=} dkimValue = ''
	 */
	constructor(email = '', name = '', dkimStatus = 'none', dkimValue = '')
	{
		this.email = email;
		this.name = name;
		this.dkimStatus = dkimStatus;
		this.dkimValue = dkimValue;

		this.clearDuplicateName();
	}

	/**
	 * @static
	 * @param {AjaxJsonEmail} json
	 * @returns {?EmailModel}
	 */
	static newInstanceFromJson(json) {
		const email = new EmailModel();
		return email.initByJson(json) ? email : null;
	}

	/**
	 * @static
	 * @param {string} line
	 * @param {string=} delimiter = ';'
	 * @returns {Array}
	 */
	static splitHelper(line, delimiter = ';') {
		line = line.replace(/[\r\n]+/g, '; ').replace(/[\s]+/g, ' ');

		let
			index = 0,
			len = 0,
			at = false,
			char = '',
			result = '';

		for (len = line.length; index < len; index++)
		{
			char = line.charAt(index);
			switch (char)
			{
				case '@':
					at = true;
					break;
				case ' ':
					if (at)
					{
						at = false;
						result += delimiter;
					}
					break;
				// no default
			}

			result += char;
		}

		return result.split(delimiter);
	}

	/**
	 * @returns {void}
	 */
	clear() {
		this.email = '';
		this.name = '';

		this.dkimStatus = 'none';
		this.dkimValue = '';
	}

	/**
	 * @returns {boolean}
	 */
	validate() {
		return '' !== this.name || '' !== this.email;
	}

	/**
	 * @param {boolean} withoutName = false
	 * @returns {string}
	 */
	hash(withoutName = false) {
		return '#' + (withoutName ? '' : this.name) + '#' + this.email + '#';
	}

	/**
	 * @returns {void}
	 */
	clearDuplicateName() {
		if (this.name === this.email)
		{
			this.name = '';
		}
	}

	/**
	 * @param {string} query
	 * @returns {boolean}
	 */
	search(query) {
		return -1 < (this.name + ' ' + this.email).toLowerCase().indexOf(query.toLowerCase());
	}

	/**
	 * @param {string} str
	 */
	parse(str) {
		this.clear();

		str = trim(str);

		const
			regex = /(?:"([^"]+)")? ?[<]?(.*?@[^>,]+)>?,? ?/g,
			match = regex.exec(str);

		if (match)
		{
			this.name = match[1] || '';
			this.email = match[2] || '';

			this.clearDuplicateName();
		}
		else if ((/^[^@]+@[^@]+$/).test(str))
		{
			this.name = '';
			this.email = str;
		}
	}

	/**
	 * @param {AjaxJsonEmail} oJsonEmail
	 * @returns {boolean}
	 */
	initByJson(json) {
		let result = false;
		if (json && 'Object/Email' === json['@Object'])
		{
			this.name = trim(json.Name);
			this.email = trim(json.Email);
			this.dkimStatus = trim(json.DkimStatus || '');
			this.dkimValue = trim(json.DkimValue || '');

			result = '' !== this.email;
			this.clearDuplicateName();
		}

		return result;
	}

	/**
	 * @param {boolean} friendlyView
	 * @param {boolean=} wrapWithLink = false
	 * @param {boolean=} useEncodeHtml = false
	 * @returns {string}
	 */
	toLine(friendlyView, wrapWithLink = false, useEncodeHtml = false) {
		let result = '';
		if ('' !== this.email)
		{
			if (friendlyView && '' !== this.name)
			{
				result = wrapWithLink ? '<a href="mailto:' + encodeHtml('"' + this.name + '" <' + this.email + '>') +
					'" target="_blank" tabindex="-1">' + encodeHtml(this.name) + '</a>' : (useEncodeHtml ? encodeHtml(this.name) : this.name);
			}
			else
			{
				result = this.email;
				if ('' !== this.name)
				{
					if (wrapWithLink)
					{
						result = encodeHtml('"' + this.name + '" <') + '<a href="mailto:' +
							encodeHtml('"' + this.name + '" <' + this.email + '>') +
							'" target="_blank" tabindex="-1">' +
							encodeHtml(result) +
							'</a>' +
							encodeHtml('>');
					}
					else
					{
						result = '"' + this.name + '" <' + result + '>';
						if (useEncodeHtml)
						{
							result = encodeHtml(result);
						}
					}
				}
				else if (wrapWithLink)
				{
					result = '<a href="mailto:' + encodeHtml(this.email) + '" target="_blank" tabindex="-1">' + encodeHtml(this.email) + '</a>';
				}
			}
		}

		return result;
	}

	/**
	 * @param {string} $sEmailAddress
	 * @returns {boolean}
	 */
	mailsoParse($sEmailAddress) {
		$sEmailAddress = trim($sEmailAddress);
		if ('' === $sEmailAddress)
		{
			return false;
		}

		const
			substr = (str, start, len) => {
				str = pString(str);
				let	end = str.length;

				if (0 > start)
				{
					start += end;
				}

				end = 'undefined' === typeof len ? end : (0 > len ? len + end : len + start);

				return start >= str.length || 0 > start || start > end ? false : str.slice(start, end);
			},

			substrReplace = (str, replace, start, length) => {
				str = pString(str);
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
			};

		let
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

		$sEmail = trim($sEmail).replace(/^[<]+/, '').replace(/[>]+$/, '');
		$sName = trim($sName).replace(/^["']+/, '').replace(/["']+$/, '');
		$sComment = trim($sComment).replace(/^[(]+/, '').replace(/[)]+$/, '');

		// Remove backslash
		$sName = $sName.replace(/\\\\(.)/g, '$1');
		$sComment = $sComment.replace(/\\\\(.)/g, '$1');

		this.name = $sName;
		this.email = $sEmail;

		this.clearDuplicateName();
		return true;
	}
}

export {EmailModel, EmailModel as default};
