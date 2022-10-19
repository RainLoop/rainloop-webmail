/**
 * https://tools.ietf.org/html/rfc5228#section-8
 */

import { getMatchTypes } from 'Sieve/Utils';

import {
	BRACKET_COMMENT,
	HASH_COMMENT,
	IDENTIFIER,
	MULTI_LINE,
	NUMBER,
	QUOTED_STRING,
	STRING_LIST,
	TAG
} from 'Sieve/RegEx';

import {
	GrammarBracketComment,
	GrammarCommand,
	GrammarHashComment,
	GrammarMultiLine,
	GrammarNumber,
	GrammarQuotedString,
	GrammarStringList,
	TestCommand,
	GrammarTestList
} from 'Sieve/Grammar';

import { availableCommands } from 'Sieve/Commands';
import { ConditionalCommand, RequireCommand } from 'Sieve/Commands/Controls';
import { NotTest } from 'Sieve/Commands/Tests';

const
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
		/* T_STRING_LIST       */ STRING_LIST,
		/* T_QUOTED_STRING     */ QUOTED_STRING,
		/* T_MULTILINE_STRING  */ MULTI_LINE,
		/* T_HASH_COMMENT      */ HASH_COMMENT,
		/* T_BRACKET_COMMENT   */ BRACKET_COMMENT,
		/* T_BLOCK_START       */ '\\{',
		/* T_BLOCK_END         */ '\\}',
		/* T_LEFT_PARENTHESIS  */ '\\(', // anyof / allof
		/* T_RIGHT_PARENTHESIS */ '\\)', // anyof / allof
		/* T_COMMA             */ ',',
		/* T_SEMICOLON         */ ';',
		/* T_TAG               */ TAG,
		/* T_IDENTIFIER        */ IDENTIFIER,
		/* T_NUMBER            */ NUMBER,
		/* T_WHITESPACE        */ '(?: |\\r\\n|\\t)+',
		/* T_UNKNOWN           */ '[^ \\r\\n\\t]+'
	].join(')|(') + ')',

	TokenError = [
		/* T_STRING_LIST       */ '',
		/* T_QUOTED_STRING     */ '',
		/* T_MULTILINE_STRING  */ '',
		/* T_HASH_COMMENT      */ '',
		/* T_BRACKET_COMMENT   */ '',
		/* T_BLOCK_START       */ 'Block start not part of control command',
		/* T_BLOCK_END         */ 'Block end has no matching block start',
		/* T_LEFT_PARENTHESIS  */ 'Test start not part of anyof/allof test',
		/* T_RIGHT_PARENTHESIS */ 'Test end not part of test-list',
		/* T_COMMA             */ 'Comma not part of test-list',
		/* T_SEMICOLON         */ 'Semicolon not at end of command',
		/* T_TAG               */ '',
		/* T_IDENTIFIER        */ '',
		/* T_NUMBER            */ '',
		/* T_WHITESPACE        */ '',
		/* T_UNKNOWN           */ ''
	];

export const parseScript = (script, name = 'script.sieve') => {
	script = script.replace(/\r?\n/g, '\r\n');

	// Only activate available commands
	const Commands = availableCommands();

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
				+ ' around:\n\n' + script.slice(regex.lastIndex - 20, regex.lastIndex + 10), name, line)
		},
		pushArg = arg => {
			command || error('Argument not part of command');
			let prev_arg = args[args.length-1];
			if (getMatchTypes(0).includes(arg)) {
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

	levels.up = () => {
		levels.pop();
		return levels[levels.length - 1];
	};

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
				new_command = new ConditionalCommand(value);
			} else if ('elsif' === value || 'else' === value) {
//				(prev_command instanceof ConditionalCommand) || error('Not after IF condition');
				new_command = new ConditionalCommand(value);
			} else if (Commands[value]) {
				if ('allof' === value || 'anyof' === value) {
//					(command instanceof ConditionalCommand || command instanceof NotTest) || error('Test-list not in conditional');
				}
				new_command = new Commands[value]();
			} else {
				if (command && (
				    command instanceof ConditionalCommand
				 || command instanceof NotTest
				 || command.tests instanceof GrammarTestList)) {
					console.error('Unknown test: ' + value);
					new_command = new TestCommand(value);
				} else {
					console.error('Unknown command: ' + value);
					new_command = new GrammarCommand(value);
				}
			}

			if (new_command instanceof TestCommand) {
				if (command instanceof ConditionalCommand || command instanceof NotTest) {
					// if/elsif/else new_command
					// not new_command
					command.test = new_command;
				} else if (command.tests instanceof GrammarTestList) {
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
				requires.push('comparator-' + command.comparator);
			}
			break; }

		// Arguments
		case T_TAG:
			pushArg(value.toLowerCase());
			break;
		case T_STRING_LIST:
			pushArg(GrammarStringList.fromString(value));
			break;
		case T_MULTILINE_STRING:
			pushArg(GrammarMultiLine.fromString(value));
			break;
		case T_QUOTED_STRING:
			pushArg(new GrammarQuotedString(value.slice(1,-1)));
			break;
		case T_NUMBER:
			pushArg(new GrammarNumber(value));
			break;

		// Comments
		case T_BRACKET_COMMENT:
		case T_HASH_COMMENT: {
			let obj = (T_HASH_COMMENT == type)
				? new GrammarHashComment(value.slice(1).trim())
				: new GrammarBracketComment(value.slice(2, -2));
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
			command || error(TokenError[type]);
			pushArgs();
			if (command instanceof RequireCommand) {
				command.capabilities.forEach(string => requires.push(string.value));
			}
			command = levels.up();
			break;

		// Command block
		case T_BLOCK_START:
			pushArgs();
			// https://tools.ietf.org/html/rfc5228#section-2.9
			// Action commands do not take tests or blocks
			while (command && !(command instanceof ConditionalCommand)) {
				command = levels.up();
			}
			command || error(TokenError[type]);
			break;
		case T_BLOCK_END:
			(command instanceof ConditionalCommand) || error(TokenError[type]);
//			prev_command = command;
			command = levels.up();
			break;

		// anyof / allof ( ... , ... )
		case T_LEFT_PARENTHESIS:
		case T_RIGHT_PARENTHESIS:
		case T_COMMA:
			pushArgs();
			// Must be inside PARENTHESIS aka test-list
			while (command && !(command.tests instanceof GrammarTestList)) {
				command = levels.up();
			}
			command || error(TokenError[type]);
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
