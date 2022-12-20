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
	private string $sLoggerFileName;

	function __construct(string $sLoggerFileName)
	{
		parent::__construct();
		$this->SetLoggerFileName($sLoggerFileName);
	}

	public function SetLoggerFileName(string $sLoggerFileName)
	{
		$sLogFileDir = \dirname($sLoggerFileName);
		if (!\is_dir($sLogFileDir)) {
			\mkdir($sLogFileDir, 0755, true);
		}
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
		if (\is_array($mDesc)) {
			$mDesc = \implode("\n\t", $mDesc);
		}
		return \error_log($mDesc . "\n", 3, $this->sLoggerFileName);
	}
}
