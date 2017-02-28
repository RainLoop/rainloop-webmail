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
 * Class GraphUser
 *
 * @package Facebook
 */
class GraphUser extends GraphNode
{
    /**
     * @var array Maps object key names to Graph object types.
     */
    protected static $graphObjectMap = [
        'hometown' => '\Facebook\GraphNodes\GraphPage',
        'location' => '\Facebook\GraphNodes\GraphPage',
        'significant_other' => '\Facebook\GraphNodes\GraphUser',
        'picture' => '\Facebook\GraphNodes\GraphPicture',
    ];

    /**
     * Returns the ID for the user as a string if present.
     *
     * @return string|null
     */
    public function getId()
    {
        return $this->getField('id');
    }

    /**
     * Returns the name for the user as a string if present.
     *
     * @return string|null
     */
    public function getName()
    {
        return $this->getField('name');
    }

    /**
     * Returns the first name for the user as a string if present.
     *
     * @return string|null
     */
    public function getFirstName()
    {
        return $this->getField('first_name');
    }

    /**
     * Returns the middle name for the user as a string if present.
     *
     * @return string|null
     */
    public function getMiddleName()
    {
        return $this->getField('middle_name');
    }

    /**
     * Returns the last name for the user as a string if present.
     *
     * @return string|null
     */
    public function getLastName()
    {
        return $this->getField('last_name');
    }

    /**
     * Returns the gender for the user as a string if present.
     *
     * @return string|null
     */
    public function getGender()
    {
        return $this->getField('gender');
    }

    /**
     * Returns the Facebook URL for the user as a string if available.
     *
     * @return string|null
     */
    public function getLink()
    {
        return $this->getField('link');
    }

    /**
     * Returns the users birthday, if available.
     *
     * @return \DateTime|null
     */
    public function getBirthday()
    {
        return $this->getField('birthday');
    }

    /**
     * Returns the current location of the user as a GraphPage.
     *
     * @return GraphPage|null
     */
    public function getLocation()
    {
        return $this->getField('location');
    }

    /**
     * Returns the current location of the user as a GraphPage.
     *
     * @return GraphPage|null
     */
    public function getHometown()
    {
        return $this->getField('hometown');
    }

    /**
     * Returns the current location of the user as a GraphUser.
     *
     * @return GraphUser|null
     */
    public function getSignificantOther()
    {
        return $this->getField('significant_other');
    }

    /**
     * Returns the picture of the user as a GraphPicture
     *
     * @return GraphPicture|null
     */
    public function getPicture()
    {
        return $this->getField('picture');
    }
}
