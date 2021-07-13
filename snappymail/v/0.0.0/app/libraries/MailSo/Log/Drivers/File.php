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
class File extends \MailSo\Log\Driver
{
	/**
	 * @var string
	 */
	private $sLoggerFileName;

	function __construct(string $sLoggerFileName, string $sNewLine = "\r\n")
	{
		parent::__construct();

		$this->sLoggerFileName = $sLoggerFileName;
		$this->sNewLine = $sNewLine;
	}

	public function SetLoggerFileName(string $sLoggerFileName)
	{
		$this->sLoggerFileName = $sLoggerFileName;
	}

	protected function writeImplementation($mDesc) : bool
	{
		return $this->writeToLogFile($mDesc);
	}

	protected function clearImplementation() : bool
	{
		return \unlink($this->sLoggerFileName);
	}

	private function writeToLogFile($mDesc) : bool
	{
		if (\is_array($mDesc))
		{
			$mDesc = \implode($this->sNewLine, $mDesc);
		}

		return \error_log($mDesc.$this->sNewLine, 3, $this->sLoggerFileName);
	}
}
