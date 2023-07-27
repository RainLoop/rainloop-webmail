<?php

/*
 * This file is part of MailSo.
 *
 * (c) 2014 Usenko Timur
 *
 * For the full copyright and license information, please view the LICENSE
 * file that was distributed with this source code.
 */

namespace MailSo\Log;

/**
 * @category MailSo
 * @package Log
 */
trait Inherit
{
	protected ?Logger $oLogger = null;

	public function Logger(): ?Logger
	{
		return $this->oLogger;
	}

	public function SetLogger(?Logger $oLogger): void
	{
		$this->oLogger = $oLogger;
	}

	public function logWrite(string $sDesc, int $iType = \LOG_INFO,
		string $sName = '', bool $bSearchSecretWords = true, bool $bDiplayCrLf = false): bool
	{
		return $this->oLogger && $this->oLogger->Write($sDesc, $iType, $sName, $bSearchSecretWords, $bDiplayCrLf);
	}

	public function logException(\Throwable $oException, int $iType = \LOG_NOTICE, string $sName = ''): void
	{
		$this->oLogger && $this->oLogger->WriteException($oException, $iType, $sName);
	}

	public function logMask(string $sWord): void
	{
		$this->oLogger && $this->oLogger->AddSecret($sWord);
	}

/*
	public function logWriteDump($mValue, int $iType = \LOG_INFO, string $sName = '') : bool
	public function logWriteExceptionShort(\Throwable $oException, int $iType = \LOG_NOTICE, string $sName = '') : void
*/
}
