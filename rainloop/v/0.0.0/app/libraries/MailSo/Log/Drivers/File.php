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

	/**
	 * @access protected
	 *
	 * @param string $sLoggerFileName
	 * @param string $sNewLine = "\r\n"
	 */
	protected function __construct($sLoggerFileName, $sNewLine = "\r\n")
	{
		parent::__construct();

		$this->sLoggerFileName = $sLoggerFileName;
		$this->sNewLine = $sNewLine;
	}

	/**
	 * @param string $sLoggerFileName
	 */
	public function SetLoggerFileName($sLoggerFileName)
	{
		$this->sLoggerFileName = $sLoggerFileName;
	}

	/**
	 * @param string $sLoggerFileName
	 * @param string $sNewLine = "\r\n"
	 *
	 * @return \MailSo\Log\Drivers\File
	 */
	public static function NewInstance($sLoggerFileName, $sNewLine = "\r\n")
	{
		return new self($sLoggerFileName, $sNewLine);
	}

	/**
	 * @param string|array $mDesc
	 *
	 * @return bool
	 */
	protected function writeImplementation($mDesc)
	{
		return $this->writeToLogFile($mDesc);
	}

	/**
	 * @return bool
	 */
	protected function clearImplementation()
	{
		return \unlink($this->sLoggerFileName);
	}

	/**
	 * @param string|array $mDesc
	 *
	 * @return bool
	 */
	private function writeToLogFile($mDesc)
	{
		if (\is_array($mDesc))
		{
			$mDesc = \implode($this->sNewLine, $mDesc);
		}

		return \error_log($mDesc.$this->sNewLine, 3, $this->sLoggerFileName);
	}
}
