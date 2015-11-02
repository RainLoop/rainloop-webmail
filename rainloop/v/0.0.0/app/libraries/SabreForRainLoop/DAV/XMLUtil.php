<?php

namespace SabreForRainLoop\DAV;

/**
 * XML utilities for WebDAV
 *
 * @copyright Copyright (C) 2007-2013 fruux GmbH (https://fruux.com/).
 * @author Evert Pot (http://evertpot.com/)
 * @license http://code.google.com/p/sabredav/wiki/License Modified BSD License
 */
class XMLUtil {

    /**
     * Returns the 'clark notation' for an element.
     *
     * For example, and element encoded as:
     * <b:myelem xmlns:b="http://www.example.org/" />
     * will be returned as:
     * {http://www.example.org}myelem
     *
     * This format is used throughout the SabreDAV sourcecode.
     * Elements encoded with the urn:DAV namespace will
     * be returned as if they were in the DAV: namespace. This is to avoid
     * compatibility problems.
     *
     * This function will return null if a nodetype other than an Element is passed.
     *
     * @param \DOMNode $dom
     * @return string
     */
    static function toClarkNotation(\DOMNode $dom) {

        if ($dom->nodeType !== XML_ELEMENT_NODE) return null;

        // Mapping back to the real namespace, in case it was dav
        if ($dom->namespaceURI=='urn:DAV') $ns = 'DAV:'; else $ns = $dom->namespaceURI;

        // Mapping to clark notation
        return '{' . $ns . '}' . $dom->localName;

    }

    /**
     * Parses a clark-notation string, and returns the namespace and element
     * name components.
     *
     * If the string was invalid, it will throw an InvalidArgumentException.
     *
     * @param string $str
     * @throws InvalidArgumentException
     * @return array
     */
    static function parseClarkNotation($str) {

        if (!preg_match('/^{([^}]*)}(.*)$/',$str,$matches)) {
            throw new \InvalidArgumentException('\'' . $str . '\' is not a valid clark-notation formatted string');
        }

        return array(
            $matches[1],
            $matches[2]
        );

    }

    /**
     * This method takes an XML document (as string) and converts all instances of the
     * DAV: namespace to urn:DAV
     *
     * This is unfortunately needed, because the DAV: namespace violates the xml namespaces
     * spec, and causes the DOM to throw errors
     *
     * @param string $xmlDocument
     * @return array|string|null
     */
    static function convertDAVNamespace($xmlDocument) {

        // This is used to map the DAV: namespace to urn:DAV. This is needed, because the DAV:
        // namespace is actually a violation of the XML namespaces specification, and will cause errors
        return preg_replace("/xmlns(:[A-Za-z0-9_]*)?=(\"|\')DAV:(\\2)/","xmlns\\1=\\2urn:DAV\\2",$xmlDocument);

    }

    /**
     * This method provides a generic way to load a DOMDocument for WebDAV use.
     *
     * This method throws a SabreForRainLoop\DAV\Exception\BadRequest exception for any xml errors.
     * It does not preserve whitespace, and it converts the DAV: namespace to urn:DAV.
     *
     * @param string $xml
     * @throws SabreForRainLoop\DAV\Exception\BadRequest
     * @return DOMDocument
     */
    static function loadDOMDocument($xml) {

        if (empty($xml))
            throw new Exception\BadRequest('Empty XML document sent');

        // The BitKinex client sends xml documents as UTF-16. PHP 5.3.1 (and presumably lower)
        // does not support this, so we must intercept this and convert to UTF-8.
        if (substr($xml,0,12) === "\x3c\x00\x3f\x00\x78\x00\x6d\x00\x6c\x00\x20\x00") {

            // Note: the preceeding byte sequence is "<?xml" encoded as UTF_16, without the BOM.
            $xml = iconv('UTF-16LE','UTF-8',$xml);

            // Because the xml header might specify the encoding, we must also change this.
            // This regex looks for the string encoding="UTF-16" and replaces it with
            // encoding="UTF-8".
            $xml = preg_replace('|<\?xml([^>]*)encoding="UTF-16"([^>]*)>|u','<?xml\1encoding="UTF-8"\2>',$xml);

        }

        // Retaining old error setting
        $oldErrorSetting =  libxml_use_internal_errors(true);

        // Clearing any previous errors
        libxml_clear_errors();

        $dom = new \DOMDocument();

        // We don't generally care about any whitespace
        $dom->preserveWhiteSpace = false;
        
        $dom->loadXML(self::convertDAVNamespace($xml),LIBXML_NOWARNING | LIBXML_NOERROR);

        if ($error = libxml_get_last_error()) {
            libxml_clear_errors();
            throw new Exception\BadRequest('The request body had an invalid XML body. (message: ' . $error->message . ', errorcode: ' . $error->code . ', line: ' . $error->line . ')');
        }

        // Restoring old mechanism for error handling
        if ($oldErrorSetting===false) libxml_use_internal_errors(false);

        return $dom;

    }

    /**
     * Parses all WebDAV properties out of a DOM Element
     *
     * Generally WebDAV properties are enclosed in {DAV:}prop elements. This
     * method helps by going through all these and pulling out the actual
     * propertynames, making them array keys and making the property values,
     * well.. the array values.
     *
     * If no value was given (self-closing element) null will be used as the
     * value. This is used in for example PROPFIND requests.
     *
     * Complex values are supported through the propertyMap argument. The
     * propertyMap should have the clark-notation properties as it's keys, and
     * classnames as values.
     *
     * When any of these properties are found, the unserialize() method will be
     * (statically) called. The result of this method is used as the value.
     *
     * @param \DOMElement $parentNode
     * @param array $propertyMap
     * @return array
     */
    static function parseProperties(\DOMElement $parentNode, array $propertyMap = array()) {

        $propList = array();
        foreach($parentNode->childNodes as $propNode) {

            if (self::toClarkNotation($propNode)!=='{DAV:}prop') continue;

            foreach($propNode->childNodes as $propNodeData) {

                /* If there are no elements in here, we actually get 1 text node, this special case is dedicated to netdrive */
                if ($propNodeData->nodeType != XML_ELEMENT_NODE) continue;

                $propertyName = self::toClarkNotation($propNodeData);
                if (isset($propertyMap[$propertyName])) {
                    $propList[$propertyName] = call_user_func(array($propertyMap[$propertyName],'unserialize'),$propNodeData);
                } else {
                    $propList[$propertyName] = $propNodeData->textContent;
                }
            }


        }
        return $propList;

    }

}
