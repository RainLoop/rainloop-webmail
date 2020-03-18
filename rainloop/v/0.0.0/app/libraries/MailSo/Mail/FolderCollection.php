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
	public $Namespace;

	/**
	 * @var string
	 */
	public $FoldersHash;

	/**
	 * @var bool
	 */
	public $IsThreadsSupported;

	/**
	 * @var bool
	 */
	public $Optimized;

	/**
	 * @var array
	 */
	public $SystemFolders;

	protected function __construct()
	{
		parent::__construct();

		$this->Namespace = '';
		$this->FoldersHash = '';
		$this->SystemFolders = array();
		$this->IsThreadsSupported = false;
		$this->Optimized = false;
	}

	public static function NewInstance() : self
	{
		return new self();
	}

	public function GetByFullNameRaw(string $sFullNameRaw) : ?\MailSo\Mail\Folder
	{
		$mResult = null;
		foreach ($this as /* @var $oFolder \MailSo\Mail\Folder */ $oFolder)
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
				else
				{
					$mResult = null;
				}
			}
		}

		return $mResult;
	}

	public function CountRec() : int
	{
		$iResult = $this->Count();
		foreach ($this as /* @var $oFolder \MailSo\Mail\Folder */ $oFolder)
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

		if ($oFolder)
		{
			$sDelimiter = $oFolder->Delimiter();
		}

		return $sDelimiter;
	}

	public function SetNamespace(string $sNamespace) : self
	{
		$this->Namespace = $sNamespace;

		return $this;
	}

	public function InitByUnsortedMailFolderArray(array $aUnsortedMailFolders) : void
	{
		$this->Clear();

		$aSortedByLenImapFolders = array();
		foreach ($aUnsortedMailFolders as /* @var $oMailFolder \MailSo\Mail\Folder */ $oMailFolder)
		{
			$aSortedByLenImapFolders[$oMailFolder->FullNameRaw()] =& $oMailFolder;
			unset($oMailFolder);
		}
		unset($aUnsortedMailFolders);

		$aAddedFolders = array();
		foreach ($aSortedByLenImapFolders as /* @var $oMailFolder \MailSo\Mail\Folder */ $oMailFolder)
		{
			$sDelimiter = $oMailFolder->Delimiter();
			$aFolderExplode = \explode($sDelimiter, $oMailFolder->FullNameRaw());

			if (1 < \count($aFolderExplode))
			{
				\array_pop($aFolderExplode);

				$sNonExistenFolderFullNameRaw = '';
				foreach ($aFolderExplode as $sFolderExplodeItem)
				{
					$sNonExistenFolderFullNameRaw .= (0 < \strlen($sNonExistenFolderFullNameRaw))
						? $sDelimiter.$sFolderExplodeItem : $sFolderExplodeItem;

					if (!isset($aSortedByLenImapFolders[$sNonExistenFolderFullNameRaw]))
					{
						try
						{
							$aAddedFolders[$sNonExistenFolderFullNameRaw] =
								Folder::NewNonExistenInstance($sNonExistenFolderFullNameRaw, $sDelimiter);
						}
						catch (\Throwable $oExc)
						{
							unset($oExc);
						}
					}
				}
			}
		}

		$aSortedByLenImapFolders = \array_merge($aSortedByLenImapFolders, $aAddedFolders);
		unset($aAddedFolders);

		\uasort($aSortedByLenImapFolders, function ($oFolderA, $oFolderB) {
			return \strnatcmp($oFolderA->FullNameRaw(), $oFolderB->FullNameRaw());
		});

		foreach ($aSortedByLenImapFolders as /* @var $oMailFolder \MailSo\Mail\Folder */ $oMailFolder)
		{
			$this->AddWithPositionSearch($oMailFolder);
			unset($oMailFolder);
		}

		unset($aSortedByLenImapFolders);
	}

	public function AddWithPositionSearch(\MailSo\Mail\Folder $oMailFolder) : bool
	{
		$oItemFolder = null;
		$bIsAdded = false;

		foreach ($this as /* @var $oItemFolder \MailSo\Mail\Folder */ $oItemFolder)
		{
			if ($oMailFolder instanceof \MailSo\Mail\Folder &&
				0 === \strpos($oMailFolder->FullNameRaw(), $oItemFolder->FullNameRaw().$oItemFolder->Delimiter()))
			{
				if ($oItemFolder->SubFolders(true)->AddWithPositionSearch($oMailFolder))
				{
					$bIsAdded = true;
				}

				break;
			}
		}

		if (!$bIsAdded && $oMailFolder instanceof \MailSo\Mail\Folder)
		{
			$bIsAdded = true;
			$this->append($oMailFolder);
		}

		return $bIsAdded;
	}

	public function SortByCallback(callable $fCallback) : void
	{
		if (\is_callable($fCallback))
		{
			$aList = $this->getArrayCopy();

			\usort($aList, $fCallback);

			foreach ($aList as $oItemFolder)
			{
				if ($oItemFolder->HasSubFolders())
				{
					$oItemFolder->SubFolders()->SortByCallback($fCallback);
				}
			}
		}
	}
}
