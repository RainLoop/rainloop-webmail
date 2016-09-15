
import window from 'window';
import $ from '$';
import _ from '_';
import ko from 'ko';
import {$body} from 'Common/Globals';
import {EventKeyCode, Magics} from 'Common/Enums';
import {trim, inArray, changeTheme} from 'Common/Utils';
import {reload as translatorReload} from 'Common/Translator';

import * as Settings from 'Storage/Settings';

import ThemeStore from 'Stores/Theme';
import LanguageStore from 'Stores/Language';

let
	cmdDom = null,
	contoller = null;

/**
 * @params {string} cmd
 * @returns {string}
 */
function cmdError(cmd) {
	return require('Html/Cmds/Error.html').replace('{{ cmd }}', cmd);
}

/**
 * @returns {string}
 */
function cmdClear(dom) {
	dom.find('.rl-cmd-history-data').empty();
	return '';
}

/**
 * @returns {string}
 */
function cmdHelp(cmds) {
	return require('Html/Cmds/Help.html').replace('{{ commands }}', cmds.join(' '));
}

/**
 * @returns {string}
 */
function cmdTheme(param, themes) {
	if (param && -1 < inArray(param, themes))
	{
		changeTheme(param);
		return '';
	}
	return require('Html/Cmds/ThemeEmpty.html').replace('{{ themes }}', themes.join(', '));
}

/**
 * @returns {string}
 */
function cmdLang(param, isAdmin, langs) {
	if (param && -1 < inArray(param, langs))
	{
		translatorReload(isAdmin, param);
		return '';
	}
	return require('Html/Cmds/LangEmpty.html').replace('{{ langs }}', langs.join(', '));
}

/**
 * @returns {string}
 */
function cmdVersion() {
	return require('Html/Cmds/Version.html').replace('{{ version }}',
		Settings.appSettingsGet('version') + ' (' + Settings.appSettingsGet('appVersionType') + ')');
}

class CmdContoller
{
	dom = null;

	opened = ko.observable(false);
	cmd = ko.observable('');
	focused = ko.observable(false);

	themes = ThemeStore.themes;

	cmdHistory = [];
	cmdHistoryShift = 0;

	cmdHelper = ko.observable('');

	cmds = ['help', 'version', 'clear', 'theme', 'lang'];
	cmdsWithParameters = ['theme', 'lang'];

	isAdmin = false;

	constructor(dom)
	{
		this.dom = dom;
		this.isAdmin = !!Settings.appSettingsGet('admin');
	}

	runCmd(cmd, params, isTab) {

		let
			result = '',
			values = null;

		this.cmdHelper('');

		if (isTab)
		{
			switch (cmd) {
				case 'lang':
					values = (this.isAdmin ? LanguageStore.languagesAdmin() : LanguageStore.languages())
						.filter((line) => 0 === line.lastIndexOf(params, 0));
					break;
				case 'theme':
					values = ThemeStore.themes().filter((line) => 0 === line.lastIndexOf(params, 0));
					break;
				default:
					break;
			}

			if (cmd && values)
			{
				if (1 === values.length && values[0])
				{
					this.cmd(cmd + ' ' + values[0]);
				}
				else if (1 < values.length && values[0] && values[1])
				{
					let
						sub = '',
						index = 0;

					const
						list = values[0].split(''),
						len = list.length;

					for (; index < len; index++)
					{
						if (values[1][index] === list[index])
						{
							sub += list[index];
						}
						else
						{
							break;
						}
					}

					if (sub)
					{
						this.cmdHelper('[' + values.join(', ') + ']');
						this.cmd(cmd + ' ' + sub);
					}
				}
			}

			return '';
		}

		switch (cmd) {
			case 'hi':
				result = 'hello';
				break;
			case '?':
			case 'ls':
			case 'help':
				result = cmdHelp(this.cmds);
				break;
			case 'v':
			case 'version':
				result = cmdVersion();
				break;
			case 'clear':
				result = cmdClear(this.dom);
				break;
			case 'theme':
				result = cmdTheme(params, ThemeStore.themes());
				break;
			case 'lang':
				result = cmdLang(params, this.isAdmin, this.isAdmin ? LanguageStore.languagesAdmin() : LanguageStore.languages());
				break;
			default:
				result = cmdError(cmd);
				break;
		}

		return result;
	}

	onCmd(isTab) {
		const
			cmdLine = this.cmd().replace(/[\s]+/, ' '),
			cmdParts = trim(cmdLine).replace().split(/[\s]+/),
			cmd = cmdParts.shift();

		if ('' === trim(cmdLine))
		{
			return false;
		}

		if (isTab)
		{
			if (-1 < inArray(cmd, this.cmds))
			{
				const result = this.runCmd(cmd, cmdParts.join(' '), true);
				if (result)
				{
					this.cmd(result);
				}
			}
			else
			{
				const values = this.cmds.filter((line) => line !== cmd && 0 === line.lastIndexOf(cmd, 0));
				if (1 === values.length && values[0])
				{
					this.cmd(values[0] + (-1 < inArray(values[0], this.cmdsWithParameters) ? ' ' : ''));
				}
			}
		}
		else
		{
			this.cmdHistory.unshift(cmdLine);
			this.cmdHistory = _.uniq(this.cmdHistory);
			this.cmdHistoryShift = 0;

			const
				result = this.runCmd(cmd, cmdParts.join(' '), false),
				h = this.dom.find('.rl-cmd-history-data');

			if (h && h[0])
			{
				h.append($('<div></div>').html(require('Html/Cmds/Main.html').replace('{{ cmd }}', cmdLine)));
				if (result)
				{
					h.append($('<div></div>').html(result));
				}

				_.delay(() => {
					this.dom.find('.rl-cmd-history').scrollTop(h.height());
				}, 50);
			}
		}

		return true;
	}

	onEsc() {
		this.opened(false);
		return false;
	}

	onTab() {
		this.onCmd(true);
		return false;
	}

	onEnter() {
		this.onCmd(false);
		this.cmd('');
		return false;
	}

	onKeyDown(event) {
		if (event && event.keyCode &&
			!event.metaKey && !event.ctrlKey && !event.shiftKey && 0 < this.cmdHistory.length)
		{
			const code = window.parseInt(event.keyCode, 10);
			if (EventKeyCode.Up === code || EventKeyCode.Down === code)
			{
				if (this.cmdHistory[this.cmdHistoryShift])
				{
					this.cmd(this.cmdHistory[this.cmdHistoryShift]);
					if (EventKeyCode.Up === code)
					{
						this.cmdHistoryShift += 1;
					}
					else if (EventKeyCode.Down === code)
					{
						this.cmdHistoryShift -= 1;
					}
				}
				else
				{
					this.cmdHistoryShift = 0;
				}

				return false;
			}
		}

		return true;
	}
}

/**
 * @returns {void}
 */
export function bind(dom)
{
	if (!contoller)
	{
		contoller = new CmdContoller(dom);

		ko.applyBindingAccessorsToNode(dom[0], {
			translatorInit: true,
			template: () => ({name: 'Cmd'})
		}, contoller);
	}
}

/**
 * @returns {void}
 */
function init()
{
	if (null === cmdDom)
	{
		cmdDom = $('<div></div>');
		cmdDom.appendTo($body);

		bind(cmdDom);
	}
}

/**
 * @returns {void}
 */
export function toggle()
{
	if (Settings.appSettingsGet('allowCmdInterface'))
	{
		init();

		_.delay(() => {
			if (contoller)
			{
				contoller.opened(!contoller.opened());
				if (contoller.opened())
				{
					_.delay(() => {
						if (contoller && contoller.focused)
						{
							contoller.focused(true);
						}
					}, Magics.Time50ms);
				}
			}
		}, Magics.Time50ms);
	}
}
