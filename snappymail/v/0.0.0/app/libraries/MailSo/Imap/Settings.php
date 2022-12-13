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
		$timeout = 300;

	public bool
		$disable_list_status = false,
		$disable_metadata = false,
		$disable_move = false,
		$disable_sort = false,
		$disable_thread = false,
		$expunge_all_on_delete = false,
		$fast_simple_search = true,
		$fetch_new_messages = true,
		$force_select = false,
		$message_all_headers = false;

	public int
//		$body_text_limit = 555000,
		$message_list_limit = 0,
		$folder_list_limit = 200,
		$thread_limit = 50;

	public string
		$search_filter = '';

	#[\ReturnTypeWillChange]
	public function jsonSerialize()
	{
		return \array_merge(
			parent::jsonSerialize(),
			[
//				'@Object' => 'Object/ImapSettings',
				'disable_list_status' => $this->disable_list_status,
				'disable_metadata' => $this->disable_metadata,
				'disable_move' => $this->disable_move,
				'disable_sort' => $this->disable_sort,
				'disable_thread' => $this->disable_thread,
				'use_expunge_all_on_delete' => $this->expunge_all_on_delete,
//				'body_text_limit' => $this->body_text_limit,
				'fast_simple_search' => $this->fast_simple_search,
				'folder_list_limit' => $this->folder_list_limit,
				'force_select' => $this->force_select,
				'message_all_headers' => $this->message_all_headers,
				'message_list_limit' => $this->message_list_limit,
				'search_filter' => $this->message_list_filter,
				'timeout' => $this->timeout
			]
		);
	}
}
