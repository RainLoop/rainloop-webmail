<?php

/*
 * This file is part of MailSo.
 *
 * (c) 2014 Usenko Timur
 *
 * For the full copyright and license information, please view the LICENSE
 * file that was distributed with this source code.
 */

namespace MailSo\Mime;

/**
 * @category MailSo
 * @package Mime
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

	public function append($oAttachment, bool $bToTop = false) : void
	{
		assert($oAttachment instanceof Attachment);
		parent::append($oAttachment, $bToTop);
	}

	public function LinkedAttachments() : array
	{
		$aResult = array();
		foreach ($this as $oAttachment) {
			if ($oAttachment->IsLinked()) {
				$aResult[] = $oAttachment;
			}
		}
		return $aResult;
	}

	public function UnlinkedAttachments() : array
	{
		$aResult = array();
		foreach ($this as $oAttachment) {
			if (!$oAttachment->IsLinked()) {
				$aResult[] = $oAttachment;
			}
		}
		return $aResult;
	}

	public function SizeOfAttachments() : int
	{
		$iResult = 0;
		foreach ($this as $oAttachment) {
			$iResult += $oAttachment->FileSize();
		}
		return $iResult;
	}
}
