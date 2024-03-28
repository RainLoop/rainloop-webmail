<?php

/*
 * This file is part of MailSo.
 *
 * (c) 2014 Usenko Timur
 *
 * For the full copyright and license information, please view the LICENSE
 * file that was distributed with this source code.
 */

namespace MailSo;

/**
 * @category MailSo
 */
class RuntimeException extends \RuntimeException
{
/*
	public function __construct(string $sMessage = '', int $iCode = 0, ?\Throwable $oPrevious = null)
	{
		$sMessage = \strlen($sMessage) ? $sMessage
			: \str_replace('\\', '-', \get_class($this)).' ('.\basename($this->getFile()).'#'.$this->getLine().')';

		parent::__construct($sMessage, $iCode, $oPrevious);
	}
*/
}
