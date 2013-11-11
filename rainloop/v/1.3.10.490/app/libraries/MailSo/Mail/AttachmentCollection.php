<?php

namespace MailSo\Mail;

/**
 * @category MailSo
 * @package Mail
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
	 * @return \MailSo\Mail\AttachmentCollection
	 */
	public static function NewInstance()
	{
		return new self();
	}

	/**
	 * @return int
	 */
	public function InlineCount()
	{
		$aList = $this->FilterList(function ($oAttachment) {
			return $oAttachment && $oAttachment->IsInline();
		});

		return \is_array($aList) ? \count($aList) : 0;
	}

	/**
	 * @return int
	 */
	public function NonInlineCount()
	{
		$aList = $this->FilterList(function ($oAttachment) {
			return $oAttachment && !$oAttachment->IsInline();
		});

		return \is_array($aList) ? \count($aList) : 0;
	}

	/**
	 * @return int
	 */
	public function ImageCount()
	{
		$aList = $this->FilterList(function ($oAttachment) {
			return $oAttachment && $oAttachment->IsImage();
		});

		return \is_array($aList) ? \count($aList) : 0;
	}

	/**
	 * @return int
	 */
	public function ArchiveCount()
	{
		$aList = $this->FilterList(function ($oAttachment) {
			return $oAttachment && $oAttachment->IsArchive();
		});

		return \is_array($aList) ? \count($aList) : 0;
	}

	/**
	 * @return int
	 */
	public function PdfCount()
	{
		$aList = $this->FilterList(function ($oAttachment) {
			return $oAttachment && $oAttachment->IsPdf();
		});

		return \is_array($aList) ? \count($aList) : 0;
	}

	/**
	 * @return int
	 */
	public function DocCount()
	{
		$aList = $this->FilterList(function ($oAttachment) {
			return $oAttachment && $oAttachment->IsDoc();
		});

		return \is_array($aList) ? \count($aList) : 0;
	}
}
