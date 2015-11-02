<?php

namespace SabreForRainLoop\VObject\Component;

use
    SabreForRainLoop\VObject;

/**
 * The VCard component
 *
 * This component represents the BEGIN:VCARD and END:VCARD found in every
 * vcard.
 *
 * @copyright Copyright (C) 2007-2013 fruux GmbH (https://fruux.com/).
 * @author Evert Pot (http://evertpot.com/)
 * @license http://code.google.com/p/sabredav/wiki/License Modified BSD License
 */
class VCard extends VObject\Document {

    /**
     * The default name for this component.
     *
     * This should be 'VCALENDAR' or 'VCARD'.
     *
     * @var string
     */
    static public $defaultName = 'VCARD';

    /**
     * Caching the version number
     *
     * @var int
     */
    private $version = null;

    /**
     * List of value-types, and which classes they map to.
     *
     * @var array
     */
    static public $valueMap = array(
        'BINARY'           => 'SabreForRainLoop\\VObject\\Property\\Binary',
        'BOOLEAN'          => 'SabreForRainLoop\\VObject\\Property\\Boolean',
        'CONTENT-ID'       => 'SabreForRainLoop\\VObject\\Property\\FlatText',   // vCard 2.1 only
        'DATE'             => 'SabreForRainLoop\\VObject\\Property\\VCard\\Date',
        'DATE-TIME'        => 'SabreForRainLoop\\VObject\\Property\\VCard\\DateTime',
        'DATE-AND-OR-TIME' => 'SabreForRainLoop\\VObject\\Property\\VCard\\DateAndOrTime', // vCard only
        'FLOAT'            => 'SabreForRainLoop\\VObject\\Property\\Float',
        'INTEGER'          => 'SabreForRainLoop\\VObject\\Property\\Integer',
        'LANGUAGE-TAG'     => 'SabreForRainLoop\\VObject\\Property\\VCard\\LanguageTag',
        'TIMESTAMP'        => 'SabreForRainLoop\\VObject\\Property\\VCard\\TimeStamp',
        'TEXT'             => 'SabreForRainLoop\\VObject\\Property\\Text',
        'TIME'             => 'SabreForRainLoop\\VObject\\Property\\Time',
        'UNKNOWN'          => 'SabreForRainLoop\\VObject\\Property\\Unknown', // jCard / jCal-only.
        'URI'              => 'SabreForRainLoop\\VObject\\Property\\Uri',
        'URL'              => 'SabreForRainLoop\\VObject\\Property\\Uri', // vCard 2.1 only
        'UTC-OFFSET'       => 'SabreForRainLoop\\VObject\\Property\\UtcOffset',
    );

    /**
     * List of properties, and which classes they map to.
     *
     * @var array
     */
    static public $propertyMap = array(

        // vCard 2.1 properties and up
        'N'       => 'SabreForRainLoop\\VObject\\Property\\Text',
        'FN'      => 'SabreForRainLoop\\VObject\\Property\\FlatText',
        'PHOTO'   => 'SabreForRainLoop\\VObject\\Property\\Binary', // Todo: we should add a class for Binary values.
        'BDAY'    => 'SabreForRainLoop\\VObject\\Property\\VCard\\DateAndOrTime',
        'ADR'     => 'SabreForRainLoop\\VObject\\Property\\Text',
        'LABEL'   => 'SabreForRainLoop\\VObject\\Property\\FlatText', // Removed in vCard 4.0
        'TEL'     => 'SabreForRainLoop\\VObject\\Property\\FlatText',
        'EMAIL'   => 'SabreForRainLoop\\VObject\\Property\\FlatText',
        'MAILER'  => 'SabreForRainLoop\\VObject\\Property\\FlatText', // Removed in vCard 4.0
        'GEO'     => 'SabreForRainLoop\\VObject\\Property\\FlatText',
        'TITLE'   => 'SabreForRainLoop\\VObject\\Property\\FlatText',
        'ROLE'    => 'SabreForRainLoop\\VObject\\Property\\FlatText',
        'LOGO'    => 'SabreForRainLoop\\VObject\\Property\\Binary',
        // 'AGENT'   => 'SabreForRainLoop\\VObject\\Property\\',      // Todo: is an embedded vCard. Probably rare, so
                                 // not supported at the moment
        'ORG'     => 'SabreForRainLoop\\VObject\\Property\\Text',
        'NOTE'    => 'SabreForRainLoop\\VObject\\Property\\FlatText',
        'REV'     => 'SabreForRainLoop\\VObject\\Property\\VCard\\TimeStamp',
        'SOUND'   => 'SabreForRainLoop\\VObject\\Property\\FlatText',
        'URL'     => 'SabreForRainLoop\\VObject\\Property\\Uri',
        'UID'     => 'SabreForRainLoop\\VObject\\Property\\FlatText',
        'VERSION' => 'SabreForRainLoop\\VObject\\Property\\FlatText',
        'KEY'     => 'SabreForRainLoop\\VObject\\Property\\FlatText',
        'TZ'      => 'SabreForRainLoop\\VObject\\Property\\Text',

        // vCard 3.0 properties
        'CATEGORIES'  => 'SabreForRainLoop\\VObject\\Property\\Text',
        'SORT-STRING' => 'SabreForRainLoop\\VObject\\Property\\FlatText',
        'PRODID'      => 'SabreForRainLoop\\VObject\\Property\\FlatText',
        'NICKNAME'    => 'SabreForRainLoop\\VObject\\Property\\Text',
        'CLASS'       => 'SabreForRainLoop\\VObject\\Property\\FlatText', // Removed in vCard 4.0

        // rfc2739 properties
        'FBURL'        => 'SabreForRainLoop\\VObject\\Property\\Uri',
        'CAPURI'       => 'SabreForRainLoop\\VObject\\Property\\Uri',
        'CALURI'       => 'SabreForRainLoop\\VObject\\Property\\Uri',

        // rfc4770 properties
        'IMPP'         => 'SabreForRainLoop\\VObject\\Property\\Uri',

        // vCard 4.0 properties
        'XML'          => 'SabreForRainLoop\\VObject\\Property\\FlatText',
        'ANNIVERSARY'  => 'SabreForRainLoop\\VObject\\Property\\VCard\\DateAndOrTime',
        'CLIENTPIDMAP' => 'SabreForRainLoop\\VObject\\Property\\Text',
        'LANG'         => 'SabreForRainLoop\\VObject\\Property\\VCard\\LanguageTag',
        'GENDER'       => 'SabreForRainLoop\\VObject\\Property\\Text',
        'KIND'         => 'SabreForRainLoop\\VObject\\Property\\FlatText',

    );

    /**
     * Returns the current document type.
     *
     * @return void
     */
    public function getDocumentType() {

        if (!$this->version) {
            $version = (string)$this->VERSION;
            switch($version) {
                case '2.1' :
                    $this->version = self::VCARD21;
                    break;
                case '3.0' :
                    $this->version = self::VCARD30;
                    break;
                case '4.0' :
                    $this->version = self::VCARD40;
                    break;
                default :
                    $this->version = self::UNKNOWN;
                    break;

            }
        }

        return $this->version;

    }

    /**
     * Converts the document to a different vcard version.
     *
     * Use one of the VCARD constants for the target. This method will return
     * a copy of the vcard in the new version.
     *
     * At the moment the only supported conversion is from 3.0 to 4.0.
     *
     * If input and output version are identical, a clone is returned.
     *
     * @param int $target
     * @return VCard
     */
    public function convert($target) {

        $converter = new VObject\VCardConverter();
        return $converter->convert($this, $target);

    }

    /**
     * VCards with version 2.1, 3.0 and 4.0 are found.
     *
     * If the VCARD doesn't know its version, 2.1 is assumed.
     */
    const DEFAULT_VERSION = self::VCARD21;



    /**
     * Validates the node for correctness.
     *
     * The following options are supported:
     *   - Node::REPAIR - If something is broken, and automatic repair may
     *                    be attempted.
     *
     * An array is returned with warnings.
     *
     * Every item in the array has the following properties:
     *    * level - (number between 1 and 3 with severity information)
     *    * message - (human readable message)
     *    * node - (reference to the offending node)
     *
     * @param int $options
     * @return array
     */
    public function validate($options = 0) {

        $warnings = array();

        $versionMap = array(
            self::VCARD21 => '2.1',
            self::VCARD30 => '3.0',
            self::VCARD40 => '4.0',
        );

        $version = $this->select('VERSION');
        if (count($version)!==1) {
            $warnings[] = array(
                'level' => 1,
                'message' => 'The VERSION property must appear in the VCARD component exactly 1 time',
                'node' => $this,
            );
            if ($options & self::REPAIR) {
                $this->VERSION = $versionMap[self::DEFAULT_VERSION];
            }
        } else {
            $version = (string)$this->VERSION;
            if ($version!=='2.1' && $version!=='3.0' && $version!=='4.0') {
                $warnings[] = array(
                    'level' => 1,
                    'message' => 'Only vcard version 4.0 (RFC6350), version 3.0 (RFC2426) or version 2.1 (icm-vcard-2.1) are supported.',
                    'node' => $this,
                );
                if ($options & self::REPAIR) {
                    $this->VERSION = $versionMap[self::DEFAULT_VERSION];
                }
            }

        }
        $fn = $this->select('FN');
        if (count($fn)!==1) {
            $warnings[] = array(
                'level' => 1,
                'message' => 'The FN property must appear in the VCARD component exactly 1 time',
                'node' => $this,
            );
            if (($options & self::REPAIR) && count($fn) === 0) {
                // We're going to try to see if we can use the contents of the
                // N property.
                if (isset($this->N)) {
                    $value = explode(';', (string)$this->N);
                    if (isset($value[1]) && $value[1]) {
                        $this->FN = $value[1] . ' ' . $value[0];
                    } else {
                        $this->FN = $value[0];
                    }

                // Otherwise, the ORG property may work
                } elseif (isset($this->ORG)) {
                    $this->FN = (string)$this->ORG;
                }

            }
        }

        return array_merge(
            parent::validate($options),
            $warnings
        );

    }

    /**
     * Returns a preferred field.
     *
     * VCards can indicate wether a field such as ADR, TEL or EMAIL is
     * preferred by specifying TYPE=PREF (vcard 2.1, 3) or PREF=x (vcard 4, x
     * being a number between 1 and 100).
     *
     * If neither of those parameters are specified, the first is returned, if
     * a field with that name does not exist, null is returned.
     *
     * @param string $fieldName
     * @return VObject\Property|null
     */
    public function preferred($propertyName) {

        $preferred = null;
        $lastPref = 101;
        foreach($this->select($propertyName) as $field) {

            $pref = 101;
            if (isset($field['TYPE']) && $field['TYPE']->has('PREF')) {
                $pref = 1;
            } elseif (isset($field['PREF'])) {
                $pref = $field['PREF']->getValue();
            }

            if ($pref < $lastPref || is_null($preferred)) {
                $preferred = $field;
                $lastPref = $pref;
            }

        }
        return $preferred;

    }

    /**
     * This method should return a list of default property values.
     *
     * @return array
     */
    protected function getDefaults() {

        return array(
            'VERSION' => '3.0',
            'PRODID' => '-//Sabre//Sabre VObject ' . VObject\Version::VERSION . '//EN',
        );

    }

    /**
     * This method returns an array, with the representation as it should be
     * encoded in json. This is used to create jCard or jCal documents.
     *
     * @return array
     */
    public function jsonSerialize() {

        // A vcard does not have sub-components, so we're overriding this
        // method to remove that array element.
        $properties = array();

        foreach($this->children as $child) {
            $properties[] = $child->jsonSerialize();
        }

        return array(
            strtolower($this->name),
            $properties,
        );

    }

    /**
     * Returns the default class for a property name.
     *
     * @param string $propertyName
     * @return string
     */
    public function getClassNameForPropertyName($propertyName) {

        $className = parent::getClassNameForPropertyName($propertyName);
        // In vCard 4, BINARY no longer exists, and we need URI instead.

        if ($className == 'SabreForRainLoop\\VObject\\Property\\Binary' && $this->getDocumentType()===self::VCARD40) {
            return 'SabreForRainLoop\\VObject\\Property\\Uri';
        }
        return $className;

    }

}

