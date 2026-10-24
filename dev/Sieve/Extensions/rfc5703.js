/**
 * https://tools.ietf.org/html/rfc5703
 */

import {
	ActionCommand,
	ControlCommand,
	GrammarCommands,
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
		this.name = new GrammarString;
		this.commands = new GrammarCommands;
	}

	get require() { return 'foreverypart'; }

	toString()
	{
		let result = 'foreverypart';
		if (this.name.length) {
			result += ' :name ' + this.name;
		}
		return result + ' ' + this.commands;
	}

	pushArguments(args)
	{
		args.forEach((arg, i) => {
			if (':name' === arg) {
				this.name.value = args[i+1].value;
			}
		});
	}
}

/**
 * Must be inside foreverypart
 */
export class BreakCommand extends ForEveryPartCommand
{
	toString()
	{
		let result = 'break';
		if (this.name.length) {
			result += ' :name ' + this.name;
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
		this.mime         = false;
		this._subject     = new GrammarQuotedString;
		this._from        = new GrammarQuotedString;
		this._replacement = new GrammarQuotedString;
	}

	get require() { return 'replace'; }

	get subject()     { return this._subject.value; }
	set subject(str)  { this._subject.value = str; }

	get from()        { return this._from.value; }
	set from(str)     { this._from.value = str; }

	get replacement()    { return this._replacement.value; }
	set replacement(str) { this._replacement.value = str; }

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
		}
		return result + this._replacement + ';';
	}

	pushArguments(args)
	{
		this._replacement = args.pop();
		args.forEach((arg, i) => {
			if (':mime' === arg) {
				this.mime = true;
			} else if (i && ':' === args[i-1][0]) {
				// :subject, :from
				let p = args[i-1].replace(':','_');
				this[p] ? (this[p].value = arg.value) : console.log('Unknown VacationCommand :' + p);
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

	get subject()  { return this._subject.value; }
	set subject(v) { this._subject.value = v; }

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
				let p = args[i-1].replace(':','_');
				this[p] ? (this[p].value = arg.value) : console.log('Unknown VacationCommand :' + p);
			}
		});
	}
}

/**
 * https://datatracker.ietf.org/doc/html/rfc5703#section-7
 * Should be inside foreverypart, else empty and flagged as a compilation error
 */
export class ExtractTextCommand extends ActionCommand
{
	constructor()
	{
		super();
		this.modifiers = [];
		this._first    = new GrammarNumber;
		this._varname  = new GrammarQuotedString;
	}

	get varname()  { return this._varname.value; }
	set varname(v) { this._varname.value = v; }

	get require() { return 'extracttext'; }

	toString()
	{
		let result = 'extracttext '
			+ this.modifiers.join(' ');
		if (0 < this._first.value) {
			result += ' :first ' + this._first;
		}
		return result + ' ' + this._varname + ';';
	}

	pushArguments(args)
	{
		this._varname = args.pop();
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
