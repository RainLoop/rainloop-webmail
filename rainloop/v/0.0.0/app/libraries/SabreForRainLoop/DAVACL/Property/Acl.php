<?php

namespace SabreForRainLoop\DAVACL\Property;

use SabreForRainLoop\DAV;

/**
 * This class represents the {DAV:}acl property
 *
 * @copyright Copyright (C) 2007-2013 fruux GmbH (https://fruux.com/).
 * @author Evert Pot (http://evertpot.com/)
 * @license http://code.google.com/p/sabredav/wiki/License Modified BSD License
 */
class Acl extends DAV\Property {

    /**
     * List of privileges
     *
     * @var array
     */
    private $privileges;

    /**
     * Whether or not the server base url is required to be prefixed when
     * serializing the property.
     *
     * @var boolean
     */
    private $prefixBaseUrl;

    /**
     * Constructor
     *
     * This object requires a structure similar to the return value from
     * SabreForRainLoop\DAVACL\Plugin::getACL().
     *
     * Each privilege is a an array with at least a 'privilege' property, and a
     * 'principal' property. A privilege may have a 'protected' property as
     * well.
     *
     * The prefixBaseUrl should be set to false, if the supplied principal urls
     * are already full urls. If this is kept to true, the servers base url
     * will automatically be prefixed.
     *
     * @param bool $prefixBaseUrl
     * @param array $privileges
     */
    public function __construct(array $privileges, $prefixBaseUrl = true) {

        $this->privileges = $privileges;
        $this->prefixBaseUrl = $prefixBaseUrl;

    }

    /**
     * Returns the list of privileges for this property
     *
     * @return array
     */
    public function getPrivileges() {

        return $this->privileges;

    }

    /**
     * Serializes the property into a DOMElement
     *
     * @param DAV\Server $server
     * @param \DOMElement $node
     * @return void
     */
    public function serialize(DAV\Server $server,\DOMElement $node) {

        $doc = $node->ownerDocument;
        foreach($this->privileges as $ace) {

            $this->serializeAce($doc, $node, $ace, $server);

        }

    }

    /**
     * Unserializes the {DAV:}acl xml element.
     *
     * @param \DOMElement $dom
     * @return Acl
     */
    static public function unserialize(\DOMElement $dom) {

        $privileges = array();
        $xaces = $dom->getElementsByTagNameNS('urn:DAV','ace');
        for($ii=0; $ii < $xaces->length; $ii++) {

            $xace = $xaces->item($ii);
            $principal = $xace->getElementsByTagNameNS('urn:DAV','principal');
            if ($principal->length !== 1) {
                throw new DAV\Exception\BadRequest('Each {DAV:}ace element must have one {DAV:}principal element');
            }
            $principal = Principal::unserialize($principal->item(0));

            switch($principal->getType()) {
                case Principal::HREF :
                    $principal = $principal->getHref();
                    break;
                case Principal::AUTHENTICATED :
                    $principal = '{DAV:}authenticated';
                    break;
                case Principal::UNAUTHENTICATED :
                    $principal = '{DAV:}unauthenticated';
                    break;
                case Principal::ALL :
                    $principal = '{DAV:}all';
                    break;

            }

            $protected = false;

            if ($xace->getElementsByTagNameNS('urn:DAV','protected')->length > 0) {
                $protected = true;
            }

            $grants = $xace->getElementsByTagNameNS('urn:DAV','grant');
            if ($grants->length < 1) {
                throw new DAV\Exception\NotImplemented('Every {DAV:}ace element must have a {DAV:}grant element. {DAV:}deny is not yet supported');
            }
            $grant = $grants->item(0);

            $xprivs = $grant->getElementsByTagNameNS('urn:DAV','privilege');
            for($jj=0; $jj<$xprivs->length; $jj++) {

                $xpriv = $xprivs->item($jj);

                $privilegeName = null;

                for ($kk=0;$kk<$xpriv->childNodes->length;$kk++) {

                    $childNode = $xpriv->childNodes->item($kk);
                    if ($t = DAV\XMLUtil::toClarkNotation($childNode)) {
                        $privilegeName = $t;
                        break;
                    }
                }
                if (is_null($privilegeName)) {
                    throw new DAV\Exception\BadRequest('{DAV:}privilege elements must have a privilege element contained within them.');
                }

                $privileges[] = array(
                    'principal' => $principal,
                    'protected' => $protected,
                    'privilege' => $privilegeName,
                );

            }

        }

        return new self($privileges);

    }

    /**
     * Serializes a single access control entry.
     *
     * @param \DOMDocument $doc
     * @param \DOMElement $node
     * @param array $ace
     * @param DAV\Server $server
     * @return void
     */
    private function serializeAce($doc,$node,$ace, DAV\Server $server) {

        $xace  = $doc->createElementNS('DAV:','d:ace');
        $node->appendChild($xace);

        $principal = $doc->createElementNS('DAV:','d:principal');
        $xace->appendChild($principal);
        switch($ace['principal']) {
            case '{DAV:}authenticated' :
                $principal->appendChild($doc->createElementNS('DAV:','d:authenticated'));
                break;
            case '{DAV:}unauthenticated' :
                $principal->appendChild($doc->createElementNS('DAV:','d:unauthenticated'));
                break;
            case '{DAV:}all' :
                $principal->appendChild($doc->createElementNS('DAV:','d:all'));
                break;
            default:
                $principal->appendChild($doc->createElementNS('DAV:','d:href',($this->prefixBaseUrl?$server->getBaseUri():'') . $ace['principal'] . '/'));
        }

        $grant = $doc->createElementNS('DAV:','d:grant');
        $xace->appendChild($grant);

        $privParts = null;

        preg_match('/^{([^}]*)}(.*)$/',$ace['privilege'],$privParts);

        $xprivilege = $doc->createElementNS('DAV:','d:privilege');
        $grant->appendChild($xprivilege);

        $xprivilege->appendChild($doc->createElementNS($privParts[1],'d:'.$privParts[2]));

        if (isset($ace['protected']) && $ace['protected'])
            $xace->appendChild($doc->createElement('d:protected'));

    }

}
