<?php

/*
 * This file is part of MailSo.
 *
 * (c) 2014 Usenko Timur
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
class Syslog extends \MailSo\Log\Driver
{
	private int $iLogLevel = 0;

	function __construct()
	{
		parent::__construct();

		if (\is_callable('openlog')) {
			$this->iLogLevel = \defined('LOG_INFO') ? LOG_INFO : 6;
		}
	}

	protected function writeImplementation($mDesc) : bool
	{
		$result = false;
		if ($this->iLogLevel && \openlog('snappymail', LOG_ODELAY, LOG_USER)) {
			$result = \syslog($this->iLogLevel, \is_array($mDesc) ? \implode(PHP_EOL, $mDesc) : $mDesc);
			\closelog();
		}
		return $result;
	}

	protected function clearImplementation() : bool
	{
		return true;
	}
}
