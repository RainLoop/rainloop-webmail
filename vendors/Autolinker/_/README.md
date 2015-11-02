# Autolinker.js

Because I had so much trouble finding a good autolinking implementation out in the wild, I decided to roll my own. It 
seemed that everything I found out there was either an implementation that didn't cover every case, or was just limited 
in one way or another. 

So, this utility attempts to handle everything. It:

- Autolinks URLs, whether or not they start with the protocol (i.e. 'http://'). In other words, it will automatically link the 
  text "google.com", as well as "http://google.com".
- Will properly handle URLs with special characters
- Will properly handle URLs with query parameters or a named anchor (i.e. hash)
- Will autolink email addresses.
- Will autolink Twitter handles.
- Will properly handle HTML input. The utility will not change the `href` attribute inside anchor (&lt;a&gt;) tags (or any other 
  tag/attribute for that matter), and will not accidentally wrap the inner text of an anchor tag with a new one (which would cause 
  doubly-nested anchor tags).

Hope that this utility helps you as well!


## Installation

#### Download

Simply clone or download the zip of the project, and link to either `dist/Autolinker.js` or `dist/Autolinker.min.js` with a script tag:

```html
<script src="path/to/Autolinker.min.js"></script>
```

#### Using with the [Bower](http://bower.io) package manager:

Command line:

```shell
bower install Autolinker.js --save
```

#### Using with [Node.js](http://nodejs.org) via [npm](https://www.npmjs.org/):

Command Line:

```shell
npm install autolinker --save
```

JavaScript:

```javascript
var Autolinker = require( 'autolinker' );
// note: npm wants an all-lowercase package name, but the utility is a class and should be 
// aliased with a captial letter
```


## Usage

Using the static `link()` method:

```javascript
var linkedText = Autolinker.link( textToAutolink[, options] );
```

Using as a class:

```javascript
var autolinker = new Autolinker( [ options ] );

var linkedText = autolinker.link( textToAutoLink );
```

Note: if using the same options to autolink multiple pieces of html/text, it is slightly more efficient to create a single
Autolinker instance, and run the `link()` method repeatedly (i.e. use the "class" form above).

	
#### Example:

```javascript
var linkedText = Autolinker.link( "Check out google.com", { className: "myLink" } );
// Produces: "Check out <a class="myLink myLink-url" href="http://google.com" target="_blank">google.com</a>"
```

## Options

These are the options which may be specified for linking. These are specified by providing an Object as the second parameter to `Autolinker.link()`. These include:

- **newWindow** : Boolean<br />
  `true` to have the links should open in a new window when clicked, `false` otherwise. Defaults to `true`.<br /><br />
- **stripPrefix** : Boolean<br />
  `true` to have the 'http://' or 'https://' and/or the 'www.' stripped from the beginning of links, `false` otherwise. Defaults to `true`.<br /><br />
- **truncate** : Number<br />
  A number for how many characters long URLs/emails/twitter handles should be truncated to inside the text of a link. If the URL/email/twitter is over the number of characters, it will be truncated to this length by replacing the end of the string with a two period ellipsis ('..').<br /><br />
  Example: a url like 'http://www.yahoo.com/some/long/path/to/a/file' truncated to 25 characters may look like this: 'yahoo.com/some/long/pat..'<br />
- **className** : String<br />
  A CSS class name to add to the generated anchor tags. This class will be added to all links, as well as this class
  plus "url"/"email"/"twitter" suffixes for styling url/email/twitter links differently.
  
  For example, if this config is provided as "myLink", then:
  
  1) URL links will have the CSS classes: "myLink myLink-url"<br />
  2) Email links will have the CSS classes: "myLink myLink-email", and<br />
  3) Twitter links will have the CSS classes: "myLink myLink-twitter"<br />
  
- **urls** : Boolean<br />
  `true` to have URLs auto-linked, `false` to skip auto-linking of URLs. Defaults to `true`.<br />
- **email** : Boolean<br />
  `true` to have email addresses auto-linked, `false` to skip auto-linking of email addresses. Defaults to `true`.<br /><br />
- **twitter** : Boolean<br />
  `true` to have Twitter handles auto-linked, `false` to skip auto-linking of Twitter handles. Defaults to `true`.
- **replaceFn** : Function<br />
  A function to use to programmatically make replacements of matches in the input string, one at a time. See the section 
  <a href="#custom-replacement-function">Custom Replacement Function</a> for more details.


For example, if you wanted to disable links from opening in new windows, you could do:

```javascript
var linkedText = Autolinker.link( "Check out google.com", { newWindow: false } );
// Produces: "Check out <a href="http://google.com">google.com</a>"
```

And if you wanted to truncate the length of URLs (while also not opening in a new window), you could do:

```javascript
var linkedText = Autolinker.link( "http://www.yahoo.com/some/long/path/to/a/file", { truncate: 25, newWindow: false } );
// Produces: "<a href="http://www.yahoo.com/some/long/path/to/a/file">yahoo.com/some/long/pat..</a>"
```

## More Examples
One could update an entire DOM element that has unlinked text to auto-link them as such:

```javascript
var myTextEl = document.getElementById( 'text' );
myTextEl.innerHTML = Autolinker.link( myTextEl.innerHTML );
```

Using the same pre-configured Autolinker instance in multiple locations of a codebase (usually by dependency injection):

```javascript
var autolinker = new Autolinker( { newWindow: false, truncate: 25 } );

//...

autolinker.link( "Check out http://www.yahoo.com/some/long/path/to/a/file" );
// Produces: "Check out <a href="http://www.yahoo.com/some/long/path/to/a/file">yahoo.com/some/long/pat..</a>"

//...

autolinker.link( "Go to www.google.com" );
// Produces: "Go to <a href="http://www.google.com">google.com</a>"

```


## Custom Replacement Function

A custom replacement function (`replaceFn`) may be provided to replace url/email/twitter matches on an individual basis, based
on the return from this function.

Full example, for purposes of documenting the API:

```javascript
var input = "...";  // string with URLs, Email Addresses, and Twitter Handles

var linkedText = Autolinker.link( input, {
    replaceFn : function( autolinker, match ) {
    	console.log( "href = ", match.getAnchorHref() );
    	console.log( "text = ", match.getAnchorText() );
    
        switch( match.getType() ) {
        	case 'url' : 
        		console.log( "url: ", match.getUrl() );
        		
        		if( match.getUrl().indexOf( 'mysite.com' ) === -1 ) {
        			var tag = autolinker.getTagBuilder().build( match );  // returns an `Autolinker.HtmlTag` instance, which provides mutator methods for easy changes
        			tag.setAttr( 'rel', 'nofollow' );
        			tag.addClass( 'external-link' );
        			
        			return tag;
        			
        		} else {
        			return true;  // let Autolinker perform its normal anchor tag replacement
        		}
        		
        	case 'email' :
        		var email = match.getEmail();
        		console.log( "email: ", email );
        		
        		if( email === "my@own.address" ) {
        			return false;  // don't auto-link this particular email address; leave as-is
        		} else {
        			return;  // no return value will have Autolinker perform its normal anchor tag replacement (same as returning `true`)
        		}
        	
        	case 'twitter' :
        		var twitterHandle = match.getTwitterHandle();
        		console.log( twitterHandle );
        		
        		return '<a href="http://newplace.to.link.twitter.handles.to/">' + twitterHandle + '</a>';
        }
    }
} );
```


The function is provided two arguments:

1. The Autolinker instance that is performing replacements. This can be used to query the options that the Autolinker
   instance is configured with, or to retrieve its TagBuilder instance (via `autolinker.getTagBuilder()`).
2. An `Autolinker.match.Match` object which details the match that is to be replaced.


A replacement of the match is made based on the return value of the function. The following return values may be provided:
 
- No return value (`undefined`), or `true` (Boolean): Delegate back to Autolinker to replace the match as it normally would.
- `false` (Boolean): Do not replace the current match at all - leave as-is.
- Any String: If a string is returned from the function, the string will be used directly as the replacement HTML for
  the match.
- An `Autolinker.HtmlTag` instance, which can be used to build/modify an HTML tag before writing out its HTML text.


## Full API Docs

The full API docs for Autolinker may be referenced at: [http://gregjacobs.github.io/Autolinker.js/docs/](http://gregjacobs.github.io/Autolinker.js/docs/#!/api/Autolinker)


## Changelog:

### 0.12.3

- Add `Autolinker.match.Match#getMatchedText` method

### 0.12.2

- Add documentation generation, and update inline documentation.

### 0.12.1

- Expose the `Autolinker.HtmlTag` class, and allow it to be used in the `replaceFn`

### 0.12.0

- Add `replaceFn` option

### 0.11.0

- Allow Autolinker to link fully-capitalized URLs/Emails/Twitter handles.

### 0.10.1

- Added fix to not autolink strings like "version:1.0", which were accidentally being interpreted as a protocol:domain string.

### 0.10.0

- Added support for protocol-relative URLs (ex: `//google.com`, which will effectively either have the `http://` or `https://` 
  protocol depending on the protocol that is hosting the website)

### 0.9.4

- Fixed an issue where a string in the form of `abc:def` would be autolinked as a protocol and domain name URL. Autolinker now
  requires the domain name to have at least one period in it to be considered.

### 0.9.3

- Fixed an issue where Twitter handles wouldn't be autolinked if they existed as the sole entity within parenthesis or brackets
  (thanks [@busticated](https://github.com/busticated) for pointing this out and providing unit tests)

### 0.9.2

- Fixed an issue with nested tags within an existing &lt;a&gt; tag, where the nested tags' inner text would be accidentally
  removed from the output (thanks [@mjsabin01](https://github.com/mjsabin01))

### 0.9.1

- Added a patch to attempt to better handle extraneous &lt;/a&gt; tags in the input string if any exist. This is for when the
  input may have some invalid markup (for instance, on sites which allow user comments, blog posts, etc.).

### 0.9.0

- Added better support for the processing of existing HTML in the input string. Now handles namespaced tags, and attribute names 
  with dashes or any other Unicode character (thanks [@aziraphale](https://github.com/aziraphale))

### 0.8.0

- Added `className` option for easily styling produced links (thanks [@busticated](https://github.com/busticated))
- Refactored into a JS class. Autolinker can now be instantiated using:

```javascript
var autolinker = new Autolinker( { newWindow: false, truncate: 25 } );

autolinker.link( "Check out http://www.yahoo.com/some/long/path/to/a/file" );
// Produces: "Check out <a href="http://www.yahoo.com/some/long/path/to/a/file">yahoo.com/some/long/pat..</a>"
```

This allows options to be set on a single instance, and used throughout a codebase by injecting the `autolinker` instance as a dependency to the modules/classes that use it. (Note: Autolinker may still be used with the static `Autolinker.link()` method as was previously available as well.)

### 0.7.0

- Changed build system to Grunt.
- Added AMD and CommonJS module loading support (ex: RequireJS, and Node.js's module loader).
- Added command line Jasmine test runner (`grunt test`)
- Upgraded Jasmine from 1.3.1 to 2.0
- Added license header to dist files.

(Thanks to [@busticated](https://github.com/busticated)!)

### 0.6.1

- Added LICENSE file to repository.

### 0.6.0

- Added options for granular control of which types are linked (urls, email addresses, and/or twitter handles). 
  (thanks [@aziraphale](https://github.com/aziraphale))

### 0.5.0

- Simplified the path / query string / hash processing into a single regular expression instead of 3 separate ones.
- Added support for parenthesis in URLs, such as: `en.wikipedia.org/wiki/IANA_(disambiguation)` (thanks [@dandv](https://github.com/dandv))
- Add all known top-level domains (TLDs) (thanks [@wouter0100](https://github.com/wouter0100))

### 0.4.0

Merged pull requests from [@afeld](https://github.com/afeld):

- strip protocol and 'www.' by default - fixes #1
- truncate URLs from the end
- make simpler regex for detecting prefix
- remove trailing slashes from URLs, and handle periods at the end of paths
- re-use domain+TLD regexes for email matching
- add .me and .io to list of TLDs

Thanks Aidan :)

### 0.3.1

- Fixed an issue with handling nested HTML tags within anchor tags.

### 0.3

- Implemented the `truncate` option.

### 0.2

- Implemented autolinking Twitter handles.

### 0.1

* Initial implementation, which autolinks URLs and email addresses. Working on linking Twitter handles.
