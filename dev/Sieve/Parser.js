/**
 * https://tools.ietf.org/html/rfc5228#section-8
 */

(Sieve => {

const
	RegEx = Sieve.RegEx,
	Grammar = Sieve.Grammar,
	Commands = Sieve.Commands,

	T_UNKNOWN           = 0,
	T_STRING_LIST       = 1,
	T_QUOTED_STRING     = 2,
	T_MULTILINE_STRING  = 3,
	T_HASH_COMMENT      = 4,
	T_BRACKET_COMMENT   = 5,
	T_BLOCK_START       = 6,
	T_BLOCK_END         = 7,
	T_LEFT_PARENTHESIS  = 8,
	T_RIGHT_PARENTHESIS = 9,
	T_COMMA             = 10,
	T_SEMICOLON         = 11,
	T_TAG               = 12,
	T_IDENTIFIER        = 13,
	T_NUMBER            = 14,
	T_WHITESPACE        = 15,

	TokensRegEx = '(' + [
		/* T_STRING_LIST       */ RegEx.STRING_LIST,
		/* T_QUOTED_STRING     */ RegEx.QUOTED_STRING,
		/* T_MULTILINE_STRING  */ RegEx.MULTI_LINE,
		/* T_HASH_COMMENT      */ RegEx.HASH_COMMENT,
		/* T_BRACKET_COMMENT   */ RegEx.BRACKET_COMMENT,
		/* T_BLOCK_START       */ '\\{',
		/* T_BLOCK_END         */ '\\}',
		/* T_LEFT_PARENTHESIS  */ '\\(', // anyof / allof
		/* T_RIGHT_PARENTHESIS */ '\\)', // anyof / allof
		/* T_COMMA             */ ',',
		/* T_SEMICOLON         */ ';',
		/* T_TAG               */ RegEx.TAG,
		/* T_IDENTIFIER        */ RegEx.IDENTIFIER,
		/* T_NUMBER            */ RegEx.NUMBER,
		/* T_WHITESPACE        */ '(?: |\\r\\n|\\t)+',
		/* T_UNKNOWN           */ '[^ \\r\\n\\t]+'
	].join(')|(') + ')';

Sieve.parseScript = (script, name = 'script.sieve') => {
	let match,
		line = 1,
		tree = [],

		// Create one regex to find the tokens
		// Use exec() to forward since lastIndex
		regex = RegExp(TokensRegEx, 'gm'),

		levels = [],
		command = null,
		requires = [],
		args = [];

	const
		error = message => {
//			throw new SyntaxError(message + ' at ' + regex.lastIndex + ' line ' + line, name, line)
			throw new SyntaxError(message + ' on line ' + line
				+ ' around: ' + script.substr(regex.lastIndex - 10, 20).replace(/\r\n/gm, '\\r\\n'), name, line)
		},
		pushArg = arg => {
			command || error('Argument not part of command');
			let prev_arg = args[args.length-1];
			if (':is' === arg || ':contains' === arg || ':matches' === arg) {
				command.match_type = arg;
			} else if (':value' === prev_arg || ':count' === prev_arg) {
				// Sieve relational [RFC5231] match types
				/^(gt|ge|lt|le|eq|ne)$/.test(arg.value) || error('Invalid relational match-type ' + arg);
				command.match_type = prev_arg + ' ' + arg;
				--args.length;
//				requires.push('relational');
			} else if (':comparator' === prev_arg) {
				command.comparator = arg;
				--args.length;
			} else {
				args.push(arg);
			}
		},
		pushArgs = () => {
			if (args.length) {
				command && command.pushArguments(args);
				args = [];
			}
		};

	levels.last = () => levels[levels.length - 1];

	while ((match = regex.exec(script))) {
		// the last element in match will contain the matched value and the key will be the type
		let type = match.findIndex((v,i) => 0 < i && undefined !== v),
			value = match[type];

		// create the part
		switch (type)
		{
		case T_IDENTIFIER: {
			pushArgs();
			value = value.toLowerCase();
			let new_command;
			if ('if' === value) {
				new_command = new Commands.conditional(value);
			} else if ('elsif' === value || 'else' === value) {
//				(prev_command instanceof Commands.conditional) || error('Not after IF condition');
				new_command = new Commands.conditional(value);
			} else if (Commands[value]) {
				if ('allof' === value || 'anyof' === value) {
//					(command instanceof Commands.conditional || command instanceof Commands.not) || error('Test-list not in conditional');
				}
				new_command = new Commands[value]();
			} else {
				console.error('Unknown command: ' + value);
				if (command && (
				    command instanceof Commands.conditional
				 || command instanceof Commands.not
				 || command.tests instanceof Grammar.TestList)) {
					new_command = new Grammar.Test(value);
				} else {
					new_command = new Grammar.Command(value);
				}
			}

			if (new_command instanceof Grammar.Test) {
				if (command instanceof Commands.conditional || command instanceof Commands.not) {
					// if/elsif/else new_command
					// not new_command
					command.test = new_command;
				} else if (command.tests instanceof Grammar.TestList) {
					// allof/anyof .tests[] new_command
					command.tests.push(new_command);
				} else {
					error('Test "' + value + '" not allowed in "' + command.identifier + '" command');
				}
			} else if (command) {
				if (command.commands) {
					command.commands.push(new_command);
				} else {
					error('commands not allowed in "' + command.identifier + '" command');
				}
			} else {
				tree.push(new_command);
			}
			levels.push(new_command);
			command = new_command;
			if (command.require) {
				(Array.isArray(command.require) ? command.require : [command.require])
					.forEach(string => requires.push(string));
			}
			if (command.comparator) {
				requires.push('comparator-' + this.comparator);
			}
			break; }

		// Arguments
		case T_TAG:
			pushArg(value.toLowerCase());
			break;
		case T_STRING_LIST:
			pushArg(Grammar.StringList.fromString(value));
			break;
		case T_MULTILINE_STRING:
			pushArg(Grammar.MultiLine.fromString(value));
			break;
		case T_QUOTED_STRING:
			pushArg(new Grammar.QuotedString(value.substr(1,value.length-2)));
			break;
		case T_NUMBER:
			pushArg(new Grammar.Number(value));
			break;

		// Comments
		case T_BRACKET_COMMENT:
		case T_HASH_COMMENT: {
			let obj = (T_HASH_COMMENT == type)
				? new Grammar.HashComment(value.substr(1).trim())
				: new Grammar.BracketComment(value.substr(2, value.length-4));
			if (command) {
				if (!command.comments) {
					command.comments = [];
				}
				(command.commands || command.comments).push(obj);
			} else {
				tree.push(obj);
			}
			break; }

		case T_WHITESPACE:
//			(command ? command.commands : tree).push(value.trim());
			command || tree.push(value.trim());
			break;

		// Command end
		case T_SEMICOLON:
			command || error('Semicolon not at end of command');
			pushArgs();
			if (command instanceof Commands.require) {
				command.capabilities.forEach(string => requires.push(string.value));
			}
			levels.pop();
			command = levels.last();
			break;

		// Command block
		case T_BLOCK_START:
			pushArgs();
			// https://tools.ietf.org/html/rfc5228#section-2.9
			// Action commands do not take tests or blocks
			while (command && !(command instanceof Commands.conditional)) {
				levels.pop();
				command = levels.last();
			}
			command || error('Block start not part of control command');
			break;
		case T_BLOCK_END:
			(command instanceof Commands.conditional) || error('Block end has no matching block start');
			levels.pop();
//			prev_command = command;
			command = levels.last();
			break;

		// anyof / allof ( ... , ... )
		case T_LEFT_PARENTHESIS:
			pushArgs();
			while (command && !(command.tests instanceof Grammar.TestList)) {
				levels.pop();
				command = levels.last();
			}
			command || error('Test start not part of anyof/allof test');
			break;
		case T_RIGHT_PARENTHESIS:
			pushArgs();
			levels.pop();
			command = levels.last();
			(command.tests instanceof Grammar.TestList) || error('Test end not part of test-list');
			break;
		case T_COMMA:
			pushArgs();
			// Must be inside PARENTHESIS aka test-list
			while (command && !(command.tests instanceof Grammar.TestList)) {
				levels.pop();
				command = levels.last();
			}
			command || error('Comma not part of test-list');
			break;

		case T_UNKNOWN:
			error('Invalid token ' + value);
		}

		// Set current script position
		line += (value.split('\n').length - 1); // (value.match(/\n/g) || []).length;
	}

	tree.requires = requires;
	return tree;
};

})(this.Sieve);
