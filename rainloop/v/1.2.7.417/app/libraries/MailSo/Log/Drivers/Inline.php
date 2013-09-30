<?php

namespace MailSo\Log\Drivers;

/**
 * @category MailSo
 * @package Log
 * @subpackage Drivers
 */
class Inline extends \MailSo\Log\Driver
{
	/**
	 * @var string
	 */
	private $sNewLine;

	/**
	 * @var bool
	 */
	private $bHtmlEncodeSpecialChars;

	/**
	 * @access protected
	 *
	 * @param string $sNewLine = "\r\n"
	 * @param bool $bHtmlEncodeSpecialChars = false
	 */
	protected function __construct($sNewLine = "\r\n", $bHtmlEncodeSpecialChars = false)
	{
		parent::__construct();

		$this->sNewLine = $sNewLine;
		$this->bHtmlEncodeSpecialChars = $bHtmlEncodeSpecialChars;
	}

	/**
	 * @param string $sNewLine = "\r\n"
	 * @param bool $bHtmlEncodeSpecialChars = false
	 *
	 * @return \MailSo\Log\Drivers\Inline
	 */
	public static function NewInstance($sNewLine = "\r\n", $bHtmlEncodeSpecialChars = false)
	{
		return new self($sNewLine, $bHtmlEncodeSpecialChars);
	}

	/**
	 * @param string $mDesc
	 *
	 * @return bool
	 */
	protected function writeImplementation($mDesc)
	{
		if (is_array($mDesc))
		{
			if ($this->bHtmlEncodeSpecialChars)
			{
				$mDesc = array_map(function ($sItem) {
					$sItem = \htmlspecialchars($mDesc);
				}, $mDesc);
			}

			$mDesc = \implode($this->sNewLine, $mDesc);
		}
		else
		{
			echo ($this->bHtmlEncodeSpecialChars) ? \htmlspecialchars($mDesc).$this->sNewLine : $mDesc.$this->sNewLine;
		}

		return true;
	}
	
	/**
	 * @return bool
	 */
	protected function clearImplementation()
	{
		if (\defined('PHP_SAPI') && 'cli' === PHP_SAPI)
		{
			\system('clear');
		}

		return true;
	}
}
