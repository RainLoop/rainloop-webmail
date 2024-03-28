/**
 * https://tools.ietf.org/html/rfc5228#section-8.2
 */

import {
	QUOTED_TEXT,
	HASH_COMMENT,
	MULTILINE_LITERAL,
	MULTILINE_DOTSTART
} from 'Sieve/RegEx';

import { arrayToString, getMatchTypes } from 'Sieve/Utils';

/**
 * abstract
 */
export class GrammarString /*extends String*/
{
	constructor(value = '')
	{
		this._value = value;
	}

	toString()
	{
		return this._value;
	}

	get value()
	{
		return this._value;
	}

	set value(value)
	{
		this._value = value;
	}

	get length()
	{
		return this._value.length;
	}
}

/**
 * abstract
 */
export class GrammarComment extends GrammarString
{
}

/**
 * https://tools.ietf.org/html/rfc5228#section-2.9
 */
export class GrammarCommand
{
	constructor(identifier)
	{
		this.identifier = identifier || this.constructor.name.toLowerCase().replace(/(test|command|action)$/, '');
		this.arguments = [];
		this.commands = new GrammarCommands;
	}

	toString()
	{
		let result = this.identifier;
		if (this.arguments.length) {
			result += ' ' + arrayToString(this.arguments, ' ');
		}
		return result + (
			this.commands.length ? ' ' + this.commands : ';'
		);
	}

	getComparators()
	{
		return ['i;ascii-casemap'];
	}

	getMatchTypes()
	{
		return [':is', ':contains', ':matches'];
	}

	pushArguments(args)
	{
		this.arguments = args;
	}
}

export class GrammarCommands extends Array
{
	toString()
	{
		return this.length
			? '{\r\n\t' + arrayToString(this, '\r\n\t') + '\r\n}'
			: '{}';
	}

	push(value)
	{
		if (value instanceof GrammarCommand || value instanceof GrammarComment) {
			super.push(value);
		}
	}
}

/**
 * https://tools.ietf.org/html/rfc5228#section-3
 */
export class ControlCommand extends GrammarCommand
{
	constructor(identifier)
	{
		super(identifier);
		this.commands = new GrammarCommands;
	}

	toString()
	{
		let result = this.identifier;
		if (this.arguments.length) {
			result += ' ' + arrayToString(this.arguments, ' ');
		}
		return result + (
			this.commands.length ? ' ' + this.commands : ';'
		);
	}

	getComparators()
	{
		return ['i;ascii-casemap'];
	}

	getMatchTypes()
	{
		return [':is', ':contains', ':matches'];
	}
}

/**
 * https://tools.ietf.org/html/rfc5228#section-4
 */
export class ActionCommand extends GrammarCommand
{
	constructor(identifier)
	{
		super(identifier);
	}

	toString()
	{
		let result = this.identifier;
		if (this.arguments.length) {
			result += ' ' + arrayToString(this.arguments, ' ');
		}
		return result + ';'
	}
}

/**
 * https://tools.ietf.org/html/rfc5228#section-5
 */
export class TestCommand extends GrammarCommand
{
	constructor(identifier)
	{
		super(identifier);
		// Almost every test has a comparator and match_type, so define them here
		this.comparator = '';
		this.match_type = ':is';
	}

	toString()
	{
		// https://datatracker.ietf.org/doc/html/rfc6134#section-2.3
		if (!getMatchTypes().includes(this.match_type)) {
			throw 'Unsupported match-type ' + this.match_type;
		}
		return (this.identifier
			+ (this.comparator ? ' :comparator ' + this.comparator : '')
			+ (this.match_type ? ' ' + this.match_type : '')
			+ ' ' + arrayToString(this.arguments, ' ')).trim();
	}
}

/**
 * https://tools.ietf.org/html/rfc5228#section-5.2
 * https://tools.ietf.org/html/rfc5228#section-5.3
 */
export class GrammarTestList extends Array
{
	toString()
	{
		if (1 < this.length) {
//			return '(\r\n\t' + arrayToString(this, ',\r\n\t') + '\r\n)';
			return '(' + this.join(', ') + ')';
		}
		return this.length ? this[0].toString() : '';
	}

	push(value)
	{
		if (!(value instanceof TestCommand)) {
			throw 'Not an instanceof Test';
		}
		super.push(value);
	}
}

export class GrammarBracketComment extends GrammarComment
{
	toString()
	{
		return '/* ' + super.toString() + ' */';
	}
}

export class GrammarHashComment extends GrammarComment
{
	toString()
	{
		return '# ' + super.toString();
	}
}

export class GrammarNumber /*extends Number*/
{
	constructor(value = '0')
	{
		this._value = value;
	}

	toString()
	{
		return this._value;
	}

	get value()
	{
		return this._value;
	}

	set value(value)
	{
		this._value = value;
	}
}

export class GrammarStringList extends Array
{
	toString()
	{
		if (1 < this.length) {
			return '[' + this.join(',') + ']';
		}
		return this.length ? this[0].toString() : '';
	}

	push(value)
	{
		if (!(value instanceof GrammarString)) {
			value = new GrammarQuotedString(value);
		}
		super.push(value);
	}
}

const StringListRegEx = RegExp('(?:^\\s*|\\s*,\\s*)(?:"(' + QUOTED_TEXT + ')"|text:[ \\t]*('
	+ HASH_COMMENT + ')?\\r\\n'
	+ '((?:' + MULTILINE_LITERAL + '|' + MULTILINE_DOTSTART + ')*)'
	+ '\\.\\r\\n)', 'gm');
GrammarStringList.fromString = list => {
	let string,
		obj = new GrammarStringList;
	list = list.replace(/^[\r\n\t[]+/, '');
	while ((string = StringListRegEx.exec(list))) {
		if (string[3]) {
			obj.push(new GrammarMultiLine(string[3], string[2]));
		} else {
			obj.push(new GrammarQuotedString(string[1]));
		}
	}
	return obj;
}

export class GrammarQuotedString extends GrammarString
{
	toString()
	{
		return '"' + this._value.replace(/[\\"]/g, '\\$&') + '"';
//		return '"' + super.toString().replace(/[\\"]/g, '\\$&') + '"';
	}
}

/**
 * https://tools.ietf.org/html/rfc5228#section-8.1
 */
export class GrammarMultiLine extends GrammarString
{
	constructor(value, comment = '')
	{
		super();
		this.value = value;
		this.comment = comment;
	}

	toString()
	{
		return 'text:'
			+ (this.comment ? '# ' + this.comment : '') + "\r\n"
			+ this.value
			+ "\r\n.\r\n";
	}
}

const MultiLineRegEx = RegExp('text:[ \\t]*(' + HASH_COMMENT + ')?\\r\\n'
	+ '((?:' + MULTILINE_LITERAL + '|' + MULTILINE_DOTSTART + ')*)'
	+ '\\.\\r\\n', 'm');
GrammarMultiLine.fromString = string => {
	string = string.match(MultiLineRegEx);
	if (string[2]) {
		return new GrammarMultiLine(string[2].replace(/\r\n$/, ''), string[1]);
	}
	return new GrammarMultiLine();
}
