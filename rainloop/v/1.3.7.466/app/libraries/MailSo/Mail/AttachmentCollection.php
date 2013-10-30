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
}
