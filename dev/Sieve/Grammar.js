/**
 * https://tools.ietf.org/html/rfc5228#section-8.2
 */

(Sieve => {

const RegEx = Sieve.RegEx;

/**
 * abstract
 */
class StringType /*extends String*/
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
class Comment extends StringType
{
}

/**
 * https://tools.ietf.org/html/rfc5228#section-2.9
 */
class Command
{
	constructor(identifier)
	{
		this.identifier = identifier;
		this.arguments = [];
		this.commands = new Commands;
	}

	toString()
	{
		let result = this.identifier;
		if (this.arguments.length) {
			result += Sieve.arrayToString(this.arguments, ' ');
		}
		if (this.commands.length) {
			result += ' ' + this.commands.toString();
		} else {
			result += ';';
		}
		return result;
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

class Commands extends Array
{
	toString()
	{
		return this.length
			? '{\r\n\t' + Sieve.arrayToString(this, '\r\n\t') + '\r\n}'
			: '{}';
	}

	push(value)
	{
		if (value instanceof Command || value instanceof Comment) {
			super.push(value);
		}
	}
}

class BracketComment extends Comment
{
	toString()
	{
		return '/* ' + super.toString() + ' */';
	}
}

class HashComment extends Comment
{
	toString()
	{
		return '# ' + super.toString();
	}
}

class NumberType /*extends Number*/
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

class StringList extends Array
{
	toString()
	{
		if (1 < this.length) {
			return '[' + this.join(',') + ']';
		}
		return this.length ? this[0] : '';
	}

	push(value)
	{
		if (!(value instanceof StringType)) {
			value = new QuotedString(value);
		}
		super.push(value);
	}
}

StringList.fromString = list => {
	let string,
		obj = new StringList,
		regex = RegExp('(?:^\\s*|\\s*,\\s*)(?:"(' + RegEx.QUOTED_TEXT + ')"|text:[ \\t]*('
			+ RegEx.HASH_COMMENT + ')?\\r\\n'
			+ '((?:' + RegEx.MULTILINE_LITERAL + '|' + RegEx.MULTILINE_DOTSTART + ')*)'
			+ '\\.\\r\\n)', 'gm');
	list = list.replace(/^[\r\n\t[]+/, '');
	while ((string = regex.exec(list))) {
		if (string[3]) {
			obj.push(new MultiLine(string[3], string[2]));
		} else {
			obj.push(new QuotedString(string[1]));
		}
	}
	return obj;
}

class QuotedString extends StringType
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
class MultiLine extends StringType
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

let MultiLineRegEx = RegExp('text:[ \\t]*(' + RegEx.HASH_COMMENT + ')?\\r\\n'
	+ '((?:' + RegEx.MULTILINE_LITERAL + '|' + RegEx.MULTILINE_DOTSTART + ')*)'
	+ '\\.\\r\\n', 'm');
MultiLine.fromString = string => {
	string = string.match(MultiLineRegEx);
	if (string[2]) {
		return new MultiLine(string[2].replace(/\r\n$/, ''), string[1]);
	}
	return new MultiLine();
}

/**
 * https://tools.ietf.org/html/rfc5228#section-5
 */
class Test
{
	constructor(identifier)
	{
		this.identifier = identifier;
		// Almost every test has a comparator and match_type, so define them here
		this.comparator = '',
		this.match_type = ':is',
		this.arguments = [];
	}

	toString()
	{
		return (this.identifier
			+ (this.comparator ? ' :comparator ' + this.comparator : '')
			+ (this.match_type ? ' ' + this.match_type : '')
			+ ' ' + Sieve.arrayToString(this.arguments, ' ')).trim();
	}

	pushArguments(args)
	{
		this.arguments = args;
	}
}

/**
 * https://tools.ietf.org/html/rfc5228#section-5.2
 * https://tools.ietf.org/html/rfc5228#section-5.3
 */
class TestList extends Array
{
	constructor()
	{
		super();
	}

	toString()
	{
		if (1 < this.length) {
//			return '(\r\n\t' + Sieve.arrayToString(this, ',\r\n\t') + '\r\n)';
			return '(' + this.join(', ') + ')';
		}
		return this.length ? this[0] : '';
	}

	push(value)
	{
		if (!(value instanceof Test)) {
			throw 'Not an instanceof Test';
		}
		super.push(value);
	}
}

Sieve.Grammar = {
	Command: Command,
	BracketComment: BracketComment,
	HashComment: HashComment,
	MultiLine: MultiLine,
	Number: NumberType,
	QuotedString: QuotedString,
	StringList: StringList,
	StringType: StringType,
	Test: Test,
	TestList: TestList
};

})(this.Sieve);
