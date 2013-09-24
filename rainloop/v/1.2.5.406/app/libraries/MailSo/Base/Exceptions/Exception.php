<?php

namespace MailSo\Base\Exceptions;

/**
 * @category MailSo
 * @package Base
 * @subpackage Exceptions
 */
class Exception extends \Exception
{
	/**
	 * @param string $sMessage
	 * @param int $iCode
	 * @param \Exception|null $oPrevious
	 */
	public function __construct($sMessage = '', $iCode = 0, $oPrevious = null)
	{
		$sMessage = 0 === strlen($sMessage) ? str_replace('\\', '-', get_class($this)).' ('.
			basename($this->getFile()).' ~ '.$this->getLine().')' : $sMessage;

		parent::__construct($sMessage, $iCode, $oPrevious);
	}
}
