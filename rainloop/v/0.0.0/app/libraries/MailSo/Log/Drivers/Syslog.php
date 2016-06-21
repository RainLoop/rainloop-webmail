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

	/**
	 * @access protected
	 */
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

	/**
	 * @return \MailSo\Log\Drivers\Syslog
	 */
	public static function NewInstance()
	{
		return new self();
	}

	/**
	 * @param string|array $mDesc
	 *
	 * @return bool
	 */
	protected function writeImplementation($mDesc)
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

	/**
	 * @return bool
	 */
	protected function clearImplementation()
	{
		return true;
	}
}
