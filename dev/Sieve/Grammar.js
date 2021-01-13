/**
 * https://tools.ietf.org/html/rfc5228#section-8.2
 */

(Sieve => {

/**
 * abstract
 */
class StringType /*extends String*/
{
	constructor(value = '')
	{
		this._value = value;
	}

//	abstract function toString();

	get value()
	{
		return this._value;
	}

	set value(value)
	{
		this._value = value;
	}

	length()
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
	constructor(identifier, text = null)
	{
		this.identifier = identifier;
		this.arguments = [];
		if (text) {
			this.text = text;
		}
	}

	toString()
	{
		let result = this.identifier;
		if ('anyof' === result || 'allof' === result) {
			let tests = [];
			this.commands.forEach(cmd => tests.push(cmd.toString().replace(/;$/, '')));
			result += ' (\r\n\t' + tests.join(',\r\n\t') + '\r\n)';
		} else {
			this.arguments.forEach(arg => {
				if (Array.isArray(arg)) {
					result += ' [' + arg.join(',') + ']';
				} else {
					result += ' ' + arg;
				}
			});
			if (this.commands) {
				result += ' {\r\n';
				this.commands.forEach(cmd => result += '\t' + cmd + '\r\n');
				result += '}';
			} else {
				result += ';';
			}
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

class BracketComment extends Comment
{
	toString()
	{
		return '/* ' + super() + ' */';
	}
}

class HashComment extends Comment
{
	toString()
	{
		return '# ' + super();
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
		super(value);
	}
}

StringList.fromString = list => {
	let string,
		obj = new StringList,
		regex = RegExp('(?:^\\s*|\\s*,\\s*)(' + Sieve.RegEx.STRING + ')', 'g');
	list = list.replace(/^[\r\n\t[]+/, '');
	while ((string = regex.exec(list))) {
		if (string[4]) {
			obj.push(new MultiLine(string[4], string[3]));
		} else {
			obj.push(new QuotedString(string[2]));
		}
	}
	return obj;
}

class QuotedString extends StringType
{
	toString()
	{
		return '"' + this._value.replace(/[\\"]/g, '\\$&') + '"';
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
			+ (this.comment ? "#${this.comment}" : '') + "\r\n"
//			+ \rtrim(this.value, "\r\n")
			+ "\r\n.\r\n";
	}
}


/**
 * https://tools.ietf.org/html/rfc5228#section-2.9
 */
class Test
{
	constructor(identifier)
	{
		this.identifier = identifier;
		this.arguments = [];
	}

	toString()
	{
		return (this.identifier + ' ' + this.arguments.join(' ')).trim();
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
	constructor(identifier)
	{
		super();
		this.identifier = identifier; // allof / anyof
	}

	toString()
	{
		if (1 < this.length) {
			return '(' + this.join(', ') + ')';
		}
		return this.length ? this[0] : '';
	}

	push(value)
	{
/*
		if (!(value instanceof Command)) {
			value = new Command($value);
		}
*/
		super(value);
	}
}

TestList.fromString = list => {
	let test,
		obj = new TestList,
		regex = RegExp('(?:^\\s*|\\s*,\\s*)(' + Sieve.RegEx.IDENTIFIER + ')((?:\\s+' + Sieve.RegEx.ARGUMENT + ')*)', 'g');
	list = list.replace(/^[\r\n\t(]+/, '');
	while ((test = regex.exec(list))) {
		let command = new Sieve.Commands.Command(test[1]);
		obj.push(command);
/*
		if (\preg_match_all('@\\s+(' . Sieve.RegEx.ARGUMENT . ')@', $test[2], $args, PREG_SET_ORDER)) {
			foreach ($args as $arg) {
				$command->arguments[] = $arg;
			}
		}
*/
	}
	return obj;
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
