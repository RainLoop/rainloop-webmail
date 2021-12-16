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
	public function append($oAttachment, bool $bToTop = false) : void
	{
		assert($oAttachment instanceof Attachment);
		parent::append($oAttachment, $bToTop);
	}

	public function SpecData() : array
	{
		$aResult = array();
		foreach ($this as $oAttachment) {
			$aResult[] = array(
				'@Object' => 'Object/Attachment',
				'FileName' => $oAttachment->FileName(),
				'MimeType' => $oAttachment->MimeType(),
				'IsInline' => $oAttachment->IsInline()
			);
		}
		return array(
			'@Object' => 'Collection/AttachmentCollection',
			'@Collection' => $aResult
		);
	}
}
