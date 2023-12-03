<?php

/*
 * This file is part of MailSo.
 *
 * (c) 2022 DJMaze
 *
 * For the full copyright and license information, please view the LICENSE
 * file that was distributed with this source code.
 */

namespace MailSo\Imap;

/**
 * @category MailSo
 * @package Net
 */
class Settings extends \MailSo\Net\ConnectSettings
{
	public int
		$port = 143,
		$timeout = 300,
		$body_text_limit = 0,
//		$folder_list_limit = 200,
		$message_list_limit = 0,
		$thread_limit = 50;

	public bool
		$expunge_all_on_delete = false,
		$fast_simple_search = true,
		$fetch_new_messages = true,
		$force_select = false,
		$message_all_headers = false;

	public string
		$search_filter = '';

	public array
		$disabled_capabilities = [];

	public static function fromArray(array $aSettings) : self
	{
		$object = parent::fromArray($aSettings);
		$options = [
			'expunge_all_on_delete',
			'fast_simple_search',
			'fetch_new_messages',
			'force_select',
			'message_all_headers'
		];
		foreach ($options as $option) {
			if (isset($aSettings[$option])) {
				$object->$option = !empty($aSettings[$option]);
			}
		}
		$options = [
//			'body_text_limit',
//			'folder_list_limit',
			'message_list_limit',
//			'thread_limit',
		];
		foreach ($options as $option) {
			if (isset($aSettings[$option])) {
				$object->$option = \intval($aSettings[$option]);
			}
		}

		if (!empty($aSettings['disabled_capabilities']) && \is_array($aSettings['disabled_capabilities'])) {
			$object->disabled_capabilities = $aSettings['disabled_capabilities'];
		}
		// Convert old disable_* settings
		if (!empty($aSettings['disable_list_status'])) {
			$object->disabled_capabilities[] = 'list-status';
		}
		if (!empty($aSettings['disable_metadata'])) {
			// Issue #365: Many folders on Cyrus IMAP breaks login
			$object->disabled_capabilities[] = 'METADATA';
		}
		if (!empty($aSettings['disable_move'])) {
			$object->disabled_capabilities[] = 'MOVE';
		}
		if (!empty($aSettings['disable_sort'])) {
			$object->disabled_capabilities[] = 'SORT';
		}
		if (!empty($aSettings['disable_thread'])) {
			$object->disabled_capabilities[] = 'THREAD';
		}
		if (!empty($aSettings['disable_binary'])) {
			$object->disabled_capabilities[] = 'BINARY';
		}
		if (!empty($aSettings['disable_status_size'])) {
			// STATUS SIZE can take a significant amount of time, therefore not active by default
			$object->disabled_capabilities[] = 'STATUS=SIZE';
		}
		if (!empty($aSettings['disable_preview'])) {
			// RFC 8970
			$object->disabled_capabilities[] = 'PREVIEW';
		}
		if (\in_array('SORT', $object->disabled_capabilities)) {
			$object->disabled_capabilities[] = 'ESORT';
		}
		$object->disabled_capabilities = \array_values(\array_unique($object->disabled_capabilities));

		return $object;
	}

	#[\ReturnTypeWillChange]
	public function jsonSerialize()
	{
		if (\in_array('SORT', $this->disabled_capabilities)) {
			$this->disabled_capabilities[] = 'ESORT';
		}
		return \array_merge(
			parent::jsonSerialize(),
			[
//				'@Object' => 'Object/ImapSettings',
				'use_expunge_all_on_delete' => $this->expunge_all_on_delete,
//				'body_text_limit' => $this->body_text_limit,
				'fast_simple_search' => $this->fast_simple_search,
//				'folder_list_limit' => $this->folder_list_limit,
				'force_select' => $this->force_select,
				'message_all_headers' => $this->message_all_headers,
				'message_list_limit' => $this->message_list_limit,
				'search_filter' => $this->search_filter,
//				'thread_limit' => $this->thread_limit
				'disabled_capabilities' => \array_values(\array_unique($this->disabled_capabilities))
			]
		);
	}
}
