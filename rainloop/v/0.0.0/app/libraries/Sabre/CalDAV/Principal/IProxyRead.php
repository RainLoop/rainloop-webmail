<?php

namespace Sabre\CalDAV\Principal;

use Sabre\DAVACL;

/**
 * ProxyRead principal interface
 *
 * Any principal node implementing this interface will be picked up as a 'proxy
 * principal group'.
 *
 * @copyright Copyright (C) 2007-2013 fruux GmbH (https://fruux.com/).
 * @author Evert Pot (http://evertpot.com/)
 * @license http://code.google.com/p/sabredav/wiki/License Modified BSD License
 */
interface IProxyRead extends DAVACL\IPrincipal {

}
