<?php

namespace SabreForRainLoop\CardDAV;

use SabreForRainLoop\DAV;
use SabreForRainLoop\DAVACL;

/**
 * The AddressBook class represents a CardDAV addressbook, owned by a specific user
 *
 * The AddressBook can contain multiple vcards
 *
 * @copyright Copyright (C) 2007-2013 fruux GmbH (https://fruux.com/).
 * @author Evert Pot (http://evertpot.com/)
 * @license http://code.google.com/p/sabredav/wiki/License Modified BSD License
 */
class AddressBook extends DAV\Collection implements IAddressBook, DAV\IProperties, DAVACL\IACL {

    /**
     * This is an array with addressbook information
     *
     * @var array
     */
    protected $addressBookInfo;

    /**
     * CardDAV backend
     *
     * @var Backend\BackendInterface
     */
    protected $carddavBackend;

    /**
     * Constructor
     *
     * @param Backend\BackendInterface $carddavBackend
     * @param array $addressBookInfo
     */
    public function __construct(Backend\BackendInterface $carddavBackend, array $addressBookInfo) {

        $this->carddavBackend = $carddavBackend;
        $this->addressBookInfo = $addressBookInfo;

    }

    /**
     * Returns the name of the addressbook
     *
     * @return string
     */
    public function getName() {

        return $this->addressBookInfo['uri'];

    }

    /**
     * Returns a card
     *
     * @param string $name
     * @return \ICard
     */
    public function getChild($name) {

        $obj = $this->carddavBackend->getCard($this->addressBookInfo['id'],$name);
        if (!$obj) throw new DAV\Exception\NotFound('Card not found');
        return new Card($this->carddavBackend,$this->addressBookInfo,$obj);

    }

    /**
     * Returns the full list of cards
     *
     * @return array
     */
    public function getChildren() {

        $objs = $this->carddavBackend->getCards($this->addressBookInfo['id']);
        $children = array();
        foreach($objs as $obj) {
            $children[] = new Card($this->carddavBackend,$this->addressBookInfo,$obj);
        }
        return $children;

    }

    /**
     * Creates a new directory
     *
     * We actually block this, as subdirectories are not allowed in addressbooks.
     *
     * @param string $name
     * @return void
     */
    public function createDirectory($name) {

        throw new DAV\Exception\MethodNotAllowed('Creating collections in addressbooks is not allowed');

    }

    /**
     * Creates a new file
     *
     * The contents of the new file must be a valid VCARD.
     *
     * This method may return an ETag.
     *
     * @param string $name
     * @param resource $vcardData
     * @return string|null
     */
    public function createFile($name,$vcardData = null) {

        if (is_resource($vcardData)) {
            $vcardData = stream_get_contents($vcardData);
        }
        // Converting to UTF-8, if needed
        $vcardData = DAV\StringUtil::ensureUTF8($vcardData);

        return $this->carddavBackend->createCard($this->addressBookInfo['id'],$name,$vcardData);

    }

    /**
     * Deletes the entire addressbook.
     *
     * @return void
     */
    public function delete() {

        $this->carddavBackend->deleteAddressBook($this->addressBookInfo['id']);

    }

    /**
     * Renames the addressbook
     *
     * @param string $newName
     * @return void
     */
    public function setName($newName) {

        throw new DAV\Exception\MethodNotAllowed('Renaming addressbooks is not yet supported');

    }

    /**
     * Returns the last modification date as a unix timestamp.
     *
     * @return void
     */
    public function getLastModified() {

        return null;

    }

    /**
     * Updates properties on this node,
     *
     * The properties array uses the propertyName in clark-notation as key,
     * and the array value for the property value. In the case a property
     * should be deleted, the property value will be null.
     *
     * This method must be atomic. If one property cannot be changed, the
     * entire operation must fail.
     *
     * If the operation was successful, true can be returned.
     * If the operation failed, false can be returned.
     *
     * Deletion of a non-existent property is always successful.
     *
     * Lastly, it is optional to return detailed information about any
     * failures. In this case an array should be returned with the following
     * structure:
     *
     * array(
     *   403 => array(
     *      '{DAV:}displayname' => null,
     *   ),
     *   424 => array(
     *      '{DAV:}owner' => null,
     *   )
     * )
     *
     * In this example it was forbidden to update {DAV:}displayname.
     * (403 Forbidden), which in turn also caused {DAV:}owner to fail
     * (424 Failed Dependency) because the request needs to be atomic.
     *
     * @param array $mutations
     * @return bool|array
     */
    public function updateProperties($mutations) {

        return $this->carddavBackend->updateAddressBook($this->addressBookInfo['id'], $mutations);

    }

    /**
     * Returns a list of properties for this nodes.
     *
     * The properties list is a list of propertynames the client requested,
     * encoded in clark-notation {xmlnamespace}tagname
     *
     * If the array is empty, it means 'all properties' were requested.
     *
     * @param array $properties
     * @return array
     */
    public function getProperties($properties) {

        $response = array();
        foreach($properties as $propertyName) {

            if (isset($this->addressBookInfo[$propertyName])) {

                $response[$propertyName] = $this->addressBookInfo[$propertyName];

            }

        }

        return $response;

    }

    /**
     * Returns the owner principal
     *
     * This must be a url to a principal, or null if there's no owner
     *
     * @return string|null
     */
    public function getOwner() {

        return $this->addressBookInfo['principaluri'];

    }

    /**
     * Returns a group principal
     *
     * This must be a url to a principal, or null if there's no owner
     *
     * @return string|null
     */
    public function getGroup() {

        return null;

    }

    /**
     * Returns a list of ACE's for this node.
     *
     * Each ACE has the following properties:
     *   * 'privilege', a string such as {DAV:}read or {DAV:}write. These are
     *     currently the only supported privileges
     *   * 'principal', a url to the principal who owns the node
     *   * 'protected' (optional), indicating that this ACE is not allowed to
     *      be updated.
     *
     * @return array
     */
    public function getACL() {

        return array(
            array(
                'privilege' => '{DAV:}read',
                'principal' => $this->addressBookInfo['principaluri'],
                'protected' => true,
            ),
            array(
                'privilege' => '{DAV:}write',
                'principal' => $this->addressBookInfo['principaluri'],
                'protected' => true,
            ),

        );

    }

    /**
     * Updates the ACL
     *
     * This method will receive a list of new ACE's.
     *
     * @param array $acl
     * @return void
     */
    public function setACL(array $acl) {

        throw new DAV\Exception\MethodNotAllowed('Changing ACL is not yet supported');

    }

    /**
     * Returns the list of supported privileges for this node.
     *
     * The returned data structure is a list of nested privileges.
     * See SabreForRainLoop\DAVACL\Plugin::getDefaultSupportedPrivilegeSet for a simple
     * standard structure.
     *
     * If null is returned from this method, the default privilege set is used,
     * which is fine for most common usecases.
     *
     * @return array|null
     */
    public function getSupportedPrivilegeSet() {

        return null;

    }

}
