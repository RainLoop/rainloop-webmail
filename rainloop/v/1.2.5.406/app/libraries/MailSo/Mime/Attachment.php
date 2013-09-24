<?php

namespace MailSo\Mime;

/**
 * @category MailSo
 * @package Mime
 */
class Attachment
{
	/**
	 * @var resource
	 */
	private $rResource;

	/**
	 * @var string
	 */
	private $sFileName;

	/**
	 * @var int
	 */
	private $iFileSize;

	/**
	 * @var string
	 */
	private $sCID;

	/**
	 * @var bool
	 */
	private $bIsInline;

	/**
	 * @var bool
	 */
	private $bIsLinked;

	/**
	 * @access private
	 */
	private function __construct($rResource, $sFileName, $iFileSize, $bIsInline, $bIsLinked, $sCID)
	{
		$this->rResource = $rResource;
		$this->sFileName = $sFileName;
		$this->iFileSize = $iFileSize;
		$this->bIsInline = $bIsInline;
		$this->bIsLinked = $bIsLinked;
		$this->sCID = $sCID;
	}

	/**
	 * @param resource $rResource
	 * @param string $sFileName = ''
	 * @param int $iFileSize = 0
	 * @param bool $bIsInline = false
	 * @param bool $bIsLinked = false
	 * @param string $sCID = ''
	 *
	 * @return \MailSo\Mime\Attachment
	 */
	public static function NewInstance($rResource, $sFileName = '', $iFileSize = 0, $bIsInline = false, $bIsLinked = false, $sCID = '')
	{
		return new self($rResource, $sFileName, $iFileSize, $bIsInline, $bIsLinked, $sCID);
	}

	/**
	 * @return resource
	 */
	public function Resource()
	{
		return $this->rResource;
	}

	/**
	 * @return string
	 */
	public function ContentType()
	{
		return \MailSo\Base\Utils::MimeContentType($this->sFileName);
	}

	/**
	 * @return string
	 */
	public function CID()
	{
		return $this->sCID;
	}

	/**
	 * @return string
	 */
	public function FileName()
	{
		return $this->sFileName;
	}

	/**
	 * @return int
	 */
	public function FileSize()
	{
		return $this->iFileSize;
	}

	/**
	 * @return bool
	 */
	public function IsInline()
	{
		return $this->bIsInline;
	}

	/**
	 * @return bool
	 */
	public function IsLinked()
	{
		return $this->bIsLinked && 0 < \strlen($this->sCID);
	}
}