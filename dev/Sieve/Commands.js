
import { capa } from 'Sieve/Utils';

import {
	ActionCommand,
	ControlCommand,
	TestCommand
} from 'Sieve/Grammar';

import {
	DiscardCommand,
	FileIntoCommand,
	KeepCommand,
	RedirectCommand
} from 'Sieve/Commands/Actions';

import {
	ConditionalCommand,
	ElsIfCommand,
	ElseCommand,
	IfCommand,
	RequireCommand,
	StopCommand
} from 'Sieve/Commands/Controls';

import {
	AddressTest,
	AllOfTest,
	AnyOfTest,
	EnvelopeTest,
	ExistsTest,
	FalseTest,
	HeaderTest,
	NotTest,
	SizeTest,
	TrueTest
} from 'Sieve/Commands/Tests';

import { BodyTest } from 'Sieve/Extensions/rfc5173';
import { EnvironmentTest } from 'Sieve/Extensions/rfc5183';
import { SetCommand, StringTest } from 'Sieve/Extensions/rfc5229';
import { VacationCommand } from 'Sieve/Extensions/rfc5230';
import { SetFlagCommand, AddFlagCommand, RemoveFlagCommand, HasFlagTest } from 'Sieve/Extensions/rfc5232';
import { SpamTestTest, VirusTestTest } from 'Sieve/Extensions/rfc5235';
import { DateTest, CurrentDateTest } from 'Sieve/Extensions/rfc5260';
import { AddHeaderCommand, DeleteHeaderCommand } from 'Sieve/Extensions/rfc5293';
import { ErejectCommand, RejectCommand } from 'Sieve/Extensions/rfc5429';
import { NotifyCommand, ValidNotifyMethodTest, NotifyMethodCapabilityTest } from 'Sieve/Extensions/rfc5435';
import { IHaveTest, ErrorCommand } from 'Sieve/Extensions/rfc5463';
import { MailboxExistsTest, MetadataTest, MetadataExistsTest } from 'Sieve/Extensions/rfc5490';
import { ForEveryPartCommand, BreakCommand, ReplaceCommand, EncloseCommand, ExtractTextCommand } from 'Sieve/Extensions/rfc5703';
import { IncludeCommand, ReturnCommand, GlobalCommand } from 'Sieve/Extensions/rfc6609';

export const
	getIdentifier = (cmd, type) => {
		const obj = new cmd, requires = obj.require;
		return (
			(!type || obj instanceof type)
			&& (!requires || (Array.isArray(requires) ? requires : [requires]).every(string => capa.includes(string)))
		)
			? obj.identifier
			: null;
	},

	AllCommands = [
		// Control commands
		IfCommand,
		ElsIfCommand,
		ElseCommand,
		ConditionalCommand,
		RequireCommand,
		StopCommand,
		// Action commands
		DiscardCommand,
		FileIntoCommand,
		KeepCommand,
		RedirectCommand,
		// Test commands
		AddressTest,
		AllOfTest,
		AnyOfTest,
		EnvelopeTest,
		ExistsTest,
		FalseTest,
		HeaderTest,
		NotTest,
		SizeTest,
		TrueTest,
		// rfc5173
		BodyTest,
		// rfc5183
		EnvironmentTest,
		// rfc5229
		SetCommand,
		StringTest,
		// rfc5230
		VacationCommand,
		// rfc5232
		SetFlagCommand,
		AddFlagCommand,
		RemoveFlagCommand,
		HasFlagTest,
		// rfc5235
		SpamTestTest,
		VirusTestTest,
		// rfc5260
		DateTest,
		CurrentDateTest,
		// rfc5293
		AddHeaderCommand,
		DeleteHeaderCommand,
		// rfc5429
		ErejectCommand,
		RejectCommand,
		// rfc5435
		NotifyCommand,
		ValidNotifyMethodTest,
		NotifyMethodCapabilityTest,
		// rfc5463
		IHaveTest,
		ErrorCommand,
		// rfc5490
		MailboxExistsTest,
		MetadataTest,
		MetadataExistsTest,
		// rfc5703
		ForEveryPartCommand,
		BreakCommand,
		ReplaceCommand,
		EncloseCommand,
		ExtractTextCommand,
		// rfc6609
		IncludeCommand,
		ReturnCommand,
		GlobalCommand
	],

	availableCommands = () => {
		let commands = {}, id;
		AllCommands.forEach(cmd => {
			id = getIdentifier(cmd);
			if (id) {
				commands[id] = cmd;
			}
		});
		return commands;
	},

	availableActions = () => {
		let actions = {}, id;
		AllCommands.forEach(cmd => {
			id = getIdentifier(cmd, ActionCommand);
			if (id) {
				actions[id] = cmd;
			}
		});
		return actions;
	},

	availableControls = () => {
		let controls = {}, id;
		AllCommands.forEach(cmd => {
			id = getIdentifier(cmd, ControlCommand);
			if (id) {
				controls[id] = cmd;
			}
		});
		return controls;
	},

	availableTests = () => {
		let tests = {}, id;
		AllCommands.forEach(cmd => {
			id = getIdentifier(cmd, TestCommand);
			if (id) {
				tests[id] = cmd;
			}
		});
		return tests;
	};

