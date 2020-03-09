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
	 * @var array
	 */
	private $aCustomContentTypeParams;

	/**
	 * @var string
	 */
	private $sContentLocation;

	/**
	 * @access private
	 */
	private function __construct($rResource, $sFileName, $iFileSize, $bIsInline, $bIsLinked, $sCID,
		$aCustomContentTypeParams = array(), $sContentLocation = '')
	{
		$this->rResource = $rResource;
		$this->sFileName = $sFileName;
		$this->iFileSize = $iFileSize;
		$this->bIsInline = $bIsInline;
		$this->bIsLinked = $bIsLinked;
		$this->sCID = $sCID;
		$this->aCustomContentTypeParams = $aCustomContentTypeParams;
		$this->sContentLocation = $sContentLocation;
	}

	/**
	 * @param resource $rResource
	 * @param string $sFileName = ''
	 * @param int $iFileSize = 0
	 * @param bool $bIsInline = false
	 * @param bool $bIsLinked = false
	 * @param string $sCID = ''
	 * @param array $aCustomContentTypeParams = array()
	 * @param string $sContentLocation = ''
	 *
	 * @return \MailSo\Mime\Attachment
	 */
	public static function NewInstance($rResource, $sFileName = '', $iFileSize = 0, $bIsInline = false,
		$bIsLinked = false, $sCID = '', $aCustomContentTypeParams = array(), $sContentLocation = '')
	{
		return new self($rResource, $sFileName, $iFileSize, $bIsInline, $bIsLinked, $sCID, $aCustomContentTypeParams, $sContentLocation);
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
	 * @return array
	 */
	public function CustomContentTypeParams()
	{
		return $this->aCustomContentTypeParams;
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
	public function ContentLocation()
	{
		return $this->sContentLocation;
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
	public function IsImage()
	{
		return 'image' === \MailSo\Base\Utils::ContentTypeType($this->ContentType(), $this->FileName());
	}

	/**
	 * @return bool
	 */
	public function IsArchive()
	{
		return 'archive' === \MailSo\Base\Utils::ContentTypeType($this->ContentType(), $this->FileName());
	}

	/**
	 * @return bool
	 */
	public function IsPdf()
	{
		return 'pdf' === \MailSo\Base\Utils::ContentTypeType($this->ContentType(), $this->FileName());
	}

	/**
	 * @return bool
	 */
	public function IsDoc()
	{
		return 'doc' === \MailSo\Base\Utils::ContentTypeType($this->ContentType(), $this->FileName());
	}

	/**
	 * @return bool
	 */
	public function IsLinked()
	{
		return $this->bIsLinked && 0 < \strlen($this->sCID);
	}
}