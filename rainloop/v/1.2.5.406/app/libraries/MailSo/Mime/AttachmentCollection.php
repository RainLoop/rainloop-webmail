<?php

namespace MailSo\Mime;

/**
 * @category MailSo
 * @package Mime
 */
class AttachmentCollection extends \MailSo\Base\Collection
{
	/**
	 * @access protected
	 */
	protected function __construct()
	{
		parent::__construct();
	}

	/**
	 * @return \MailSo\Mime\AttachmentCollection
	 */
	public static function NewInstance()
	{
		return new self();
	}

	/**
	 * @return array
	 */
	public function LinkedAttachments()
	{
		return $this->FilterList(function ($oItem) {
			return $oItem && $oItem->IsLinked();
		});
	}

	/**
	 * @return array
	 */
	public function UnlinkedAttachments()
	{
		return $this->FilterList(function ($oItem) {
			return $oItem && !$oItem->IsLinked();
		});
	}

	/**
	 * @return int
	 */
	public function SizeOfAttachments()
	{
		$iResult = 0;
		$this->ForeachList(function ($oItem) use (&$iResult) {
			if ($oItem)
			{
				$iResult += $oItem->FileSize();
			}
		});

		return $iResult;
	}
}
