/**
 * https://tools.ietf.org/html/rfc5703
 */

import {
	ActionCommand,
	ControlCommand,
	GrammarNumber,
	GrammarQuotedString,
	GrammarString,
	GrammarStringList
} from 'Sieve/Grammar';

/**
 * https://datatracker.ietf.org/doc/html/rfc5703#section-3
 */
export class ForEveryPartCommand extends ControlCommand
{
	constructor()
	{
		super();
		this._name = new GrammarString;
	}

	get require() { return 'foreverypart'; }

	toString()
	{
		let result = 'foreverypart';
		if (this._subject.length) {
			result += ' :name ' + this._name;
		}
		return result + ' ' + this.commands;
	}

	pushArguments(args)
	{
		args.forEach((arg, i) => {
			if (':name' === arg) {
				this._name.value = args[i+1].value;
			}
		});
	}
}

export class BreakCommand extends ForEveryPartCommand
{
	toString()
	{
		let result = 'break';
		if (this._subject.length) {
			result += ' :name ' + this._name;
		}
		return result + ';';
	}
}

/**
 * https://datatracker.ietf.org/doc/html/rfc5703#section-5
 */
export class ReplaceCommand extends ActionCommand
{
	constructor()
	{
		super();
		this.mime        = false;
		this._subject    = new GrammarQuotedString;
		this._from       = new GrammarQuotedString;
		this.replacement = new GrammarQuotedString;
	}

	get require() { return 'replace'; }

	toString()
	{
		let result = 'replace';
		if (this.mime) {
			result += ' :mime';
		}
		if (this._subject.length) {
			result += ' :subject ' + this._subject;
		}
		if (this._from.length) {
			result += ' :from ' + this._from;
//			result += ' :from ' + this.arguments[':from'];
		}
		return result + this.replacement + ';';
	}

	pushArguments(args)
	{
		this.replacement = args.pop();
		args.forEach((arg, i) => {
			if (':mime' === arg) {
				this.mime = true;
			} else if (i && ':' === args[i-1][0]) {
				// :subject, :from
				this[args[i-1].replace(':','_')].value = arg.value;
			}
		});
	}
}

/**
 * https://datatracker.ietf.org/doc/html/rfc5703#section-6
 */
export class EncloseCommand extends ActionCommand
{
	constructor()
	{
		super();
		this._subject    = new GrammarQuotedString;
		this.headers     = new GrammarStringList;
	}

	get require() { return 'enclose'; }

	toString()
	{
		let result = 'enclose';
		if (this._subject.length) {
			result += ' :subject ' + this._subject;
		}
		if (this.headers.length) {
			result += ' :headers ' + this.headers;
		}
		return result + ' :text;';
	}

	pushArguments(args)
	{
		args.forEach((arg, i) => {
			if (i && ':' === args[i-1][0]) {
				// :subject, :headers
				this[args[i-1].replace(':','_')].value = arg.value;
			}
		});
	}
}

/**
 * https://datatracker.ietf.org/doc/html/rfc5703#section-7
 */
export class ExtractTextCommand extends ActionCommand
{
	constructor()
	{
		super();
		this.modifiers = [];
		this._first    = new GrammarNumber;
		this.varname   = new GrammarQuotedString;
	}

	get require() { return 'extracttext'; }

	toString()
	{
		let result = 'extracttext '
			+ this.modifiers.join(' ');
		if (0 < this._first.value) {
			result += ' :first ' + this._first;
		}
		return result + ' ' + this.varname + ';';
	}

	pushArguments(args)
	{
		this.varname = args.pop();
		[':lower', ':upper', ':lowerfirst', ':upperfirst', ':quotewildcard', ':length'].forEach(modifier => {
			args.includes(modifier) && this.modifiers.push(modifier);
		});
		args.forEach((arg, i) => {
			if (i && ':' === args[i-1][0]) {
				// :first
				this[args[i-1].replace(':','_')].value = arg.value;
			}
		});
	}
}
