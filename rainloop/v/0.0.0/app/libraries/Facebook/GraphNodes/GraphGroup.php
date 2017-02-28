<?php
/**
 * Copyright 2014 Facebook, Inc.
 *
 * You are hereby granted a non-exclusive, worldwide, royalty-free license to
 * use, copy, modify, and distribute this software in source code or binary
 * form for use in connection with the web services and APIs provided by
 * Facebook.
 *
 * As with any software that integrates with the Facebook platform, your use
 * of this software is subject to the Facebook Developer Principles and
 * Policies [http://developers.facebook.com/policy/]. This copyright notice
 * shall be included in all copies or substantial portions of the software.
 *
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
 * IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
 * FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL
 * THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
 * LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING
 * FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER
 * DEALINGS IN THE SOFTWARE.
 *
 */
namespace Facebook\GraphNodes;

/**
 * Class GraphGroup
 *
 * @package Facebook
 */
class GraphGroup extends GraphNode
{
    /**
     * @var array Maps object key names to GraphNode types.
     */
    protected static $graphObjectMap = [
        'cover' => '\Facebook\GraphNodes\GraphCoverPhoto',
        'venue' => '\Facebook\GraphNodes\GraphLocation',
    ];

    /**
     * Returns the `id` (The Group ID) as string if present.
     *
     * @return string|null
     */
    public function getId()
    {
        return $this->getField('id');
    }

    /**
     * Returns the `cover` (The cover photo of the Group) as GraphCoverPhoto if present.
     *
     * @return GraphCoverPhoto|null
     */
    public function getCover()
    {
        return $this->getField('cover');
    }

    /**
     * Returns the `description` (A brief description of the Group) as string if present.
     *
     * @return string|null
     */
    public function getDescription()
    {
        return $this->getField('description');
    }

    /**
     * Returns the `email` (The email address to upload content to the Group. Only current members of the Group can use this) as string if present.
     *
     * @return string|null
     */
    public function getEmail()
    {
        return $this->getField('email');
    }

    /**
     * Returns the `icon` (The URL for the Group's icon) as string if present.
     *
     * @return string|null
     */
    public function getIcon()
    {
        return $this->getField('icon');
    }

    /**
     * Returns the `link` (The Group's website) as string if present.
     *
     * @return string|null
     */
    public function getLink()
    {
        return $this->getField('link');
    }

    /**
     * Returns the `name` (The name of the Group) as string if present.
     *
     * @return string|null
     */
    public function getName()
    {
        return $this->getField('name');
    }

    /**
     * Returns the `member_request_count` (Number of people asking to join the group.) as int if present.
     *
     * @return int|null
     */
    public function getMemberRequestCount()
    {
        return $this->getField('member_request_count');
    }

    /**
     * Returns the `owner` (The profile that created this Group) as GraphNode if present.
     *
     * @return GraphNode|null
     */
    public function getOwner()
    {
        return $this->getField('owner');
    }

    /**
     * Returns the `parent` (The parent Group of this Group, if it exists) as GraphNode if present.
     *
     * @return GraphNode|null
     */
    public function getParent()
    {
        return $this->getField('parent');
    }

    /**
     * Returns the `privacy` (The privacy setting of the Group) as string if present.
     *
     * @return string|null
     */
    public function getPrivacy()
    {
        return $this->getField('privacy');
    }

    /**
     * Returns the `updated_time` (The last time the Group was updated (this includes changes in the Group's properties and changes in posts and comments if user can see them)) as \DateTime if present.
     *
     * @return \DateTime|null
     */
    public function getUpdatedTime()
    {
        return $this->getField('updated_time');
    }

    /**
     * Returns the `venue` (The location for the Group) as GraphLocation if present.
     *
     * @return GraphLocation|null
     */
    public function getVenue()
    {
        return $this->getField('venue');
    }

}
