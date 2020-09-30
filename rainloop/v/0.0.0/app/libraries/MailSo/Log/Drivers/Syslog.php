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
	private $iLogLevel;

	function __construct()
	{
		parent::__construct();

		if (\function_exists('openlog') && \function_exists('closelog') && \defined('LOG_ODELAY') && \defined('LOG_USER'))
		{
			$this->iLogLevel = \defined('LOG_INFO') ? LOG_INFO : 6;
		}
		else
		{
			$this->iLogLevel = null;
		}
	}

	protected function writeImplementation($mDesc) : bool
	{
		if (null === $this->iLogLevel)
		{
			return false;
		}

		if (\is_array($mDesc))
		{
			$mDesc = \implode($this->sNewLine, $mDesc);
		}

		\openlog('snappymail', LOG_ODELAY, LOG_USER);
		$result = \syslog($this->iLogLevel, $mDesc);
		\closelog();
		return $result;
	}

	protected function clearImplementation() : bool
	{
		return true;
	}
}
