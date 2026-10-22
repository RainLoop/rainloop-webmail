<?php

class SearchFiltersPlugin extends \RainLoop\Plugins\AbstractPlugin
{
        public const
                NAME = 'Search Filters',
                AUTHOR = 'AbdoBnHesham',
                URL    = 'https://github.com/the-djmaze/snappymail/pull/1673',
                VERSION = '0.2',
                RELEASE = '2024-06-28',
                REQUIRED = '2.36.3',
                CATEGORY = 'General',
                LICENSE = 'MIT',
                DESCRIPTION = 'Add filters to search queries';

        public function Init(): void
        {
                $this->UseLangs(true);

                $this->addHook('imap.after-login', 'ApplyFilters');

                $this->addTemplate('templates/STabSearchFilters.html');

                $this->addTemplate('templates/PopupsSearchFilters.html');
                $this->addTemplate('templates/PopupsSTabAdvancedSearch.html');
                $this->addJs('js/SearchFilters.js');

                $this->addJsonHook('SGetFilters', 'GetFilters');
                $this->addJsonHook('SAddEditFilter', 'AddEditFilter');
                $this->addJsonHook('SUpdateSearchQ', 'UpdateSearchQ');
                $this->addJsonHook('SDeleteFilter', 'DeleteFilter');
        }

public function ApplyFilters(
    \RainLoop\Model\Account $oAccount,
    \MailSo\Imap\ImapClient $oImapClient,
    bool $bSuccess,
    \MailSo\Imap\Settings $oSettings
) {
    if (!$bSuccess) {
        return;
    }

    $aSettings = $this->getUserSettings();
    if (empty($aSettings['SFilters'])) {
        $aSettings['SFilters'] = [];
        $this->saveUserSettings($aSettings);
        return;
    }

    $Filters = $aSettings['SFilters'];

    foreach ($Filters as $filter) {
        $this->Manager()->logWrite(json_encode(['filter' => $filter]), LOG_WARNING);

        $searchQ = $filter['searchQ'];

        // obsługa keyword (multi-folder)
        if (stripos($searchQ, 'keyword=') !== false) {
            $oMailClient = $this->Manager()->Actions()->MailClient();

            // Pobieramy wszystkie foldery top-level
            $folders = $oMailClient->Folders('', false, '');
            foreach ($folders as $f) {
                $folder = $f->FullName ?? null;
                if (!$folder) continue;

                $uids = $this->searchMessages($oImapClient, $searchQ, $folder);
                if (!empty($uids)) {
                    $this->applyActions($oImapClient, $filter, $uids, $folder);
                }
            }

            continue; // przechodzimy do następnego filtra
        }

        // normalny search w INBOX
        $uids = $this->searchMessages($oImapClient, $searchQ, 'INBOX');
        if (!empty($uids)) {
            $this->applyActions($oImapClient, $filter, $uids, 'INBOX');
        }
    }
}

private function searchMessages(
    \MailSo\Imap\ImapClient $imapClient,
    string $search,
    string $folder = "INBOX"
): array {
    try {
        $bUseCache = false;
        $oSearchCriterias = \MailSo\Imap\SearchCriterias::fromString(
            $imapClient,
            $folder,
            $search,
            true,
            $bUseCache
        );

        $imapClient->FolderSelect($folder);
        return $imapClient->MessageSearch($oSearchCriterias, true);

    } catch (\Throwable $e) {
        $this->Manager()->logWrite(
            'SearchFilters IMAP error in folder "' . $folder .
            '" for search "' . $search . '": ' . $e->getMessage(),
            LOG_ERR
        );
        return [];
    }
}

private function applyActions(
    \MailSo\Imap\ImapClient $imapClient,
    array $filter,
    array $uids,
    string $folder
) {
    // Mark as read/seen
    if (!empty($filter['fSeen'])) {
        foreach ($uids as $uid) {
            $oRange = new \MailSo\Imap\SequenceSet([$uid]);
            $this->Manager()->Actions()->MailClient()->MessageSetFlag(
                $folder,
                $oRange,
                \MailSo\Imap\Enumerations\MessageFlag::SEEN
            );
        }
    }

    // Flag/Star message
    if (!empty($filter['fFlag'])) {
        foreach ($uids as $uid) {
            $oRange = new \MailSo\Imap\SequenceSet([$uid]);
            $this->Manager()->Actions()->MailClient()->MessageSetFlag(
                $folder,
                $oRange,
                \MailSo\Imap\Enumerations\MessageFlag::FLAGGED
            );
        }
    }

    // Move to folder
    if (!empty($filter['fFolder']) && $filter['fFolder'] !== -1) {
        foreach ($uids as $uid) {
            $oRange = new \MailSo\Imap\SequenceSet([$uid]);
            $imapClient->MessageMove('INBOX', $filter['fFolder'], $oRange);
        }
    }
}



        public function GetFilters()
        {
                $aSettings = $this->getUserSettings();
                $Filters = $aSettings['SFilters'] ?? [];

                $Search = $this->jsonParam('SSearchQ');
                if (!$Search) {
                        return $this->jsonResponse(__FUNCTION__, ['SFilters' => $Filters]);
                }

                $Filter = null;
                foreach ($aSettings['SFilters'] as $filter) {
                        if ($filter['searchQ'] == $Search) {
                                $Filter = $filter;
                        }
                }

                return $this->jsonResponse(__FUNCTION__, ['SFilter' => $Filter]);
        }

        public function AddEditFilter()
        {
                $SFilter = $this->jsonParam('SFilter');
                $newFilter = [
                        'searchQ' => $SFilter['searchQ'],
                        'priority' => $SFilter['priority'] ?? 1,
                        'fFolder' => $SFilter['fFolder'],
                        'fSeen' => $SFilter['fSeen'],
                        'fFlag' => $SFilter['fFlag'],
                ];

                $aSettings = $this->getUserSettings();
                $aSettings['SFilters'] = $aSettings['SFilters'] ?? [];

                $foundIndex = null;
                foreach ($aSettings['SFilters'] as $index => $filter) {
                        if ($filter['searchQ'] == $SFilter['searchQ']) {
                                if ($filter['priority'] != $SFilter['priority']) {
                                        array_splice($aSettings['SFilters'], $index, 1);
                                } else {
                                        $foundIndex = $index;
                                }
                        }
                }

                if ($foundIndex === null) {
                        $insertIndex = 0;
                        foreach ($aSettings['SFilters'] as $index => $filter)
                                if ($filter['priority'] >= $newFilter['priority'])
                                        $insertIndex = $index + 1;
                                else
                                        break;

                        array_splice($aSettings['SFilters'], $insertIndex, 0, [$newFilter]);
                } else {
                        $aSettings['SFilters'][$foundIndex] = $newFilter;
                }
                return $this->jsonResponse(__FUNCTION__, $this->saveUserSettings($aSettings));
        }

        public function UpdateSearchQ()
        {
                $SFilter = $this->jsonParam('SFilter');

                $aSettings = $this->getUserSettings();
                $aSettings['SFilters'] = $aSettings['SFilters'] ?? [];

                foreach ($aSettings['SFilters'] as $index => $filter) {
                        if ($filter['searchQ'] == $SFilter['oldSearchQ']) {
                                $filter['searchQ'] = $SFilter['searchQ'];
                                $aSettings['SFilters'][$index] = $filter;
                                break;
                        }
                }

                return $this->jsonResponse(__FUNCTION__, $this->saveUserSettings($aSettings));
        }

        public function DeleteFilter()
        {
                $Search = $this->jsonParam('SSearchQ');

                $aSettings = $this->getUserSettings();
                $aSettings['SFilters'] = $aSettings['SFilters'] ?? [];

                foreach ($aSettings['SFilters'] as $index => $filter) {
                        if ($filter['searchQ'] == $Search) {
                                array_splice($aSettings['SFilters'], $index, 1);
                        }
                }

                return $this->jsonResponse(__FUNCTION__, $this->saveUserSettings($aSettings));
        }
}
?>
