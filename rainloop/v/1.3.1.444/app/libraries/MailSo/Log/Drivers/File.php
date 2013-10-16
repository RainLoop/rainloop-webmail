<?php

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
	 * @var string
	 */
	private $sCrLf;
	
	/**
	 * @access protected
	 *
	 * @param string $sLoggerFileName
	 * @param string $sCrLf = "\r\n"
	 */
	protected function __construct($sLoggerFileName, $sCrLf = "\r\n")
	{
		parent::__construct();

		$this->sLoggerFileName = $sLoggerFileName;
		$this->sCrLf = $sCrLf;
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
	 * @param string $sCrLf = "\r\n"
	 *
	 * @return \MailSo\Log\Drivers\File
	 */
	public static function NewInstance($sLoggerFileName, $sCrLf = "\r\n")
	{
		return new self($sLoggerFileName, $sCrLf);
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
		if (is_array($mDesc))
		{
			$mDesc = \implode($this->sCrLf, $mDesc);
		}
		
		return \error_log($mDesc.$this->sCrLf, 3, $this->sLoggerFileName);
	}
}
