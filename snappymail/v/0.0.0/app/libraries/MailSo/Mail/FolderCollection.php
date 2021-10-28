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
class FolderCollection extends \MailSo\Base\Collection
{
	/**
	 * @var string
	 */
	public $Namespace = '';

	/**
	 * @var string
	 */
	public $FoldersHash = '';

	/**
	 * @var bool
	 */
	public $IsMetadataSupported = false;

	/**
	 * @var bool
	 */
	public $IsThreadsSupported = false;

	/**
	 * @var bool
	 */
	public $IsSortSupported = false;

	/**
	 * @var bool
	 */
	public $IsListStatusSupported = false;

	/**
	 * @var bool
	 */
	public $Optimized = false;

	/**
	 * @var array
	 */
	public $SystemFolders = array();

	public function append($oFolder, bool $bToTop = false) : void
	{
		assert($oFolder instanceof Folder);
		parent::append($oFolder, $bToTop);
	}

	public function GetByFullNameRaw(string $sFullNameRaw) : ?Folder
	{
		$mResult = null;
		foreach ($this as $oFolder)
		{
			if ($oFolder->FullNameRaw() === $sFullNameRaw)
			{
				$mResult = $oFolder;
				break;
			}
			else if ($oFolder->HasSubFolders())
			{
				$mResult = $oFolder->SubFolders(true)->GetByFullNameRaw($sFullNameRaw);
				if ($mResult)
				{
					break;
				}
			}
		}

		return $mResult;
	}

	public function CountRec() : int
	{
		$iResult = $this->Count();
		foreach ($this as $oFolder)
		{
			if ($oFolder)
			{
				$oSub = $oFolder->SubFolders();
				$iResult += $oSub ? $oSub->CountRec() : 0;
			}
		}

		return $iResult;
	}

	public function GetNamespace() : string
	{
		return $this->Namespace;
	}

	public function FindDelimiter() : string
	{
		$sDelimiter = '/';

		$oFolder = $this->GetByFullNameRaw('INBOX');
		if (!$oFolder && isset($this[0]))
		{
			$oFolder = $this[0];
		}

		return $oFolder ? $oFolder->Delimiter() : '/';
	}

	public function SetNamespace(string $sNamespace) : self
	{
		$this->Namespace = $sNamespace;

		return $this;
	}

	public function AddWithPositionSearch(Folder $oMailFolder) : void
	{
		foreach ($this as $oItemFolder)
		{
			if (0 === \strpos($oMailFolder->FullNameRaw(), $oItemFolder->FullNameRaw().$oItemFolder->Delimiter()))
			{
				$oItemFolder->SubFolders(true)->AddWithPositionSearch($oMailFolder);
				return;
			}
		}

		$this->append($oMailFolder);
	}

	public function jsonSerialize()
	{
		return \array_merge(parent::jsonSerialize(), array(
			'Namespace' => $this->GetNamespace(),
			'FoldersHash' => $this->FoldersHash ?: '',
			'IsMetadataSupported' => $this->IsMetadataSupported,
			'IsThreadsSupported' => $this->IsThreadsSupported,
			'IsSortSupported' => $this->IsSortSupported,
			'IsListStatusSupported' => $this->IsListStatusSupported,
			'Optimized' => $this->Optimized,
			'CountRec' => $this->CountRec(),
			'SystemFolders' => empty($this->SystemFolders) ? null : $this->SystemFolders
		));
	}
}
