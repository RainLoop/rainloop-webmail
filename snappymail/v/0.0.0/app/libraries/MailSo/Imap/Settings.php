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
	public int $port = 143;

/*
	#[\ReturnTypeWillChange]
	public function jsonSerialize()
	{
		return \array_merge(
			parent::jsonSerialize(),
			[
//				'@Object' => 'Object/ImapSettings',
			]
		);
	}
*/
}
