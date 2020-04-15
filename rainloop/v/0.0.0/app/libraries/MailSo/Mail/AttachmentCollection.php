<?php

/*
 * This file is part of MailSo.
 *
 * (c) 2014 Usenko Timur
 *
 * For the full copyright and license information, please view the LICENSE
 * file that was distributed with this source code.
 */

namespace MailSo\Mail;

/**
 * @category MailSo
 * @package Mail
 */
class AttachmentCollection extends \MailSo\Base\Collection
{
	public static function NewInstance() : self
	{
		return new self();
	}

	public function append($oAttachment, bool $bToTop = false) : void
	{
		assert($oAttachment instanceof Attachment);
		parent::append($oAttachment, $bToTop);
	}

	public function InlineCount() : int
	{
		$iCount = 0;
		foreach ($this as $oAttachment) {
			if ($oAttachment && $oAttachment->IsInline()) {
				++$iCount;
			}
		}
		return $iCount;
	}

	public function NonInlineCount() : int
	{
		$iCount = 0;
		foreach ($this as $oAttachment) {
			if ($oAttachment && !$oAttachment->IsInline()) {
				++$iCount;
			}
		}
		return $iCount;
	}

	public function SpecData() : array
	{
		$aResult = array();
		foreach ($this as $oAttachment) {
			$aResult[] = $oAttachment
				? array($oAttachment->FileName(true), $oAttachment->MimeType())
				: null;
		}
		return $aResult;
	}
}
