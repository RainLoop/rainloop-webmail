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
	protected function __construct()
	{
		parent::__construct();
	}

	public static function NewInstance() : self
	{
		return new self();
	}

	public function InlineCount() : int
	{
		$aList = $this->FilterList(function ($oAttachment) {
			return $oAttachment && $oAttachment->IsInline();
		});

		return \is_array($aList) ? \count($aList) : 0;
	}

	public function NonInlineCount() : int
	{
		$aList = $this->FilterList(function ($oAttachment) {
			return $oAttachment && !$oAttachment->IsInline();
		});

		return \is_array($aList) ? \count($aList) : 0;
	}

	public function SpecData() : array
	{
		return $this->MapList(function ($oAttachment) {
			if ($oAttachment)
			{
				return array($oAttachment->FileName(true), $oAttachment->MimeType());
			}

			return null;
		});
	}
}
