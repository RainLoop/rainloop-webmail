/**
 * https://tools.ietf.org/html/rfc5228#section-8.2
 */

import {
	QUOTED_TEXT,
	HASH_COMMENT,
	MULTILINE_LITERAL,
	MULTILINE_DOTSTART
} from 'Sieve/RegEx';

import { arrayToString, getMatchTypes, getComparators } from 'Sieve/Utils';

/**
 * abstract
 */
export class GrammarString /*extends String*/
{
	constructor(value = '')
	{
		this._value = value.toString ? value.toString() : value;
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
export /*abstract*/ class GrammarComment extends GrammarString
{
/*
	constructor()
	{
		if (this.constructor == GrammarComment) {
			throw Error("Abstract class can't be instantiated.");
		}
	}
*/
}

/**
 * https://tools.ietf.org/html/rfc5228#section-2.9
 */
const cmdNameSuffix = /(test|command|action)$/;
export /*abstract*/ class GrammarCommand
{
	constructor(identifier)
	{
/*
		if (this.constructor == GrammarCommand) {
			throw Error("Abstract class can't be instantiated.");
		}
*/
		this.identifier = identifier || this.constructor.name.toLowerCase().replace(cmdNameSuffix, '');
	}

	toString()
	{
		let result = this.identifier;
		if (this.arguments?.length) {
			result += ' ' + arrayToString(this.arguments, ' ');
		}
		return result + ';';
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
export /*abstract*/ class ControlCommand extends GrammarCommand
{
/*
	constructor(identifier)
	{
		if (this.constructor == ControlCommand) {
			throw Error("Abstract class can't be instantiated.");
		}
		super(identifier);
	}
*/
}

/**
 * https://tools.ietf.org/html/rfc5228#section-4
 */
export /*abstract*/ class ActionCommand extends GrammarCommand
{
/*
	constructor(identifier)
	{
		if (this.constructor == ActionCommand) {
			throw Error("Abstract class can't be instantiated.");
		}
		super(identifier);
	}
*/
}

/**
 * https://tools.ietf.org/html/rfc5228#section-5
 */
export /*abstract*/ class TestCommand extends GrammarCommand
{
	constructor(identifier)
	{
/*
		if (this.constructor == TestCommand) {
			throw Error("Abstract class can't be instantiated.");
		}
*/
		super(identifier);
		// Almost every test has a comparator and match_type, so define them here
		this._comparator = '';
		this._match_type = '';
		this.relational_match = ''; // GrammarQuotedString DQUOTE ( "gt" / "ge" / "lt" / "le" / "eq" / "ne" ) DQUOTE
	}

	get require() { return /:value|:count/.test(this._match_type) ? 'relational' : ''; }

	get match_type()
	{
		return this._match_type;
	}
	set match_type(value)
	{
		// default?
		if (':is' == value) {
			value = '';
		}
		if (value.length && !getMatchTypes(0).includes(value)) {
			throw 'Unsupported match-type ' + value;
		}
		if (':list' == value) {
			this._comparator = '';
		}
		if (':count' != value && ':value' != value) {
			this.relational_match = '';
		}
		this._match_type = value;
	}

	get comparator()
	{
		return this._comparator;
	}
	set comparator(value)
	{
		if (!(value instanceof GrammarQuotedString)) {
			value = new GrammarQuotedString(value);
		}
		// default?
		if (value.length && 'i;ascii-casemap' != value.value) {
			if (':list' == this._match_type) {
				throw 'Comparator not allowed when using :list';
			}
			if (!getComparators().includes(value.value)) {
				throw 'Unsupported comparator ' + value;
			}
			this._comparator = value;
		} else {
			this._comparator = '';
		}
	}

	toString()
	{
		return (this.identifier
			+ (this._comparator ? ' :comparator ' + this._comparator : '')
			+ (this._match_type ? ' ' + this._match_type : '')
			+ (this.relational_match ? ' ' + this.relational_match : '')
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
		// if there is only a single string, the brackets are optional
		if (1 < this.length) {
			return '[' + this.join(',') + ']';
		}
		return this.length ? this[0].toString() : '';
	}

	push(value)
	{
		if (!(value instanceof GrammarQuotedString)) {
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
	constructor(value = '')
	{
		super(value instanceof GrammarQuotedString ? value.value : value);
	}

	toString()
	{
		return '"' + this._value.replace(/[\\"]/g, '\\$&') + '"';
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

export class UnknownCommand extends GrammarCommand
{
	constructor(identifier)
	{
		super(identifier);
		this.commands = new GrammarCommands;
	}

	toString()
	{
		let result = this.identifier;
		if (this.arguments?.length) {
			result += ' ' + arrayToString(this.arguments, ' ');
		}
		return result + (
			this.commands?.length ? ' ' + this.commands : ';'
		);
	}
}
