<?php

/*
 * This file is part of MailSo.
 *
 * (c) 2023 DJMaze
 *
 * For the full copyright and license information, please view the LICENSE
 * file that was distributed with this source code.
 */

namespace MailSo\Log\Drivers;

/**
 * @category MailSo
 * @package Log
 * @subpackage Drivers
 */
class StderrStream extends \MailSo\Log\Driver
{
	protected function writeImplementation($mDesc) : bool
	{
		if (!\defined('STDERR')) {
			\define('STDERR', \fopen('php://stderr', 'wb'));
		}
		return 0 < \fwrite(STDERR, $mDesc . "\n");
	}

	protected function clearImplementation() : bool
	{
		return true;
	}
}
