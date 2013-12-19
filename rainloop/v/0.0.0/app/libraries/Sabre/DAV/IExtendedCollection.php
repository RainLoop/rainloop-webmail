<?php

namespace Sabre\DAV;

/**
 * The IExtendedCollection interface.
 *
 * This interface can be used to create special-type of collection-resources
 * as defined by RFC 5689.
 *
 * @copyright Copyright (C) 2007-2013 fruux GmbH (https://fruux.com/).
 * @author Evert Pot (http://evertpot.com/)
 * @license http://code.google.com/p/sabredav/wiki/License Modified BSD License
 */
interface IExtendedCollection extends ICollection {

    /**
     * Creates a new collection
     *
     * @param string $name
     * @param array $resourceType
     * @param array $properties
     * @return void
     */
    function createExtendedCollection($name, array $resourceType, array $properties);

}

