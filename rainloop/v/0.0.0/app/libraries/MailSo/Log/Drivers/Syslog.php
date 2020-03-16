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

	protected function __construct()
	{
		parent::__construct();

		$this->iLogLevel = \defined('LOG_INFO') ? LOG_INFO : 6;

		if (\function_exists('openlog') && \function_exists('closelog') && \defined('LOG_ODELAY') && \defined('LOG_USER'))
		{
			\openlog('rainloop', LOG_ODELAY, LOG_USER);

			\register_shutdown_function(function () {
				@\closelog();
			});
		}
		else
		{
			$this->iLogLevel = null;
		}
	}

	public static function NewInstance() : \MailSo\Log\Drivers\Syslog
	{
		return new self();
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

		return \syslog($this->iLogLevel, $mDesc);
	}

	protected function clearImplementation() : bool
	{
		return true;
	}
}
