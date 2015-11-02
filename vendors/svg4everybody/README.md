# SVG for Everybody

[SVG for Everybody] is a script that adds [external spritemaps] support to otherwise [SVG-capable browsers].

To use **svg4everybody**, include the script in your document.

```html
<script src="/path/to/svg4everybody.js"></script>
```

To support IE6-8 as well, include the legacy script instead.

```html
<script src="/path/to/svg4everybody.legacy.js"></script>
```

The IE6-8 script needs to be included in the `<head>` in order to shiv the **svg** and **use** elements.

If running the standard script in IE9-11, be sure to set [X-UA-Compatible] higher than IE8. This can be done with a response header or the following meta tag.

```html
<meta http-equiv="X-UA-Compatible" content="IE=Edge">
```

## Usage

**spritemap.svg:**
```html
<svg xmlns="http://www.w3.org/2000/svg">
	<symbol id="codepen" viewBox="0 0 64 64"><title>CodePen</title><path etc.../></symbol>
	<symbol id="youtube" viewBox="0 0 64 64"><title>YouTube</title><path etc.../></symbol>
	<symbol id="twitter" viewBox="0 0 64 64"><title>Twitter</title><path etc.../></symbol>
</svg>
```

This spritemap works fine in **Chrome**, **Firefox**, and **Opera**. [SVG for Everybody] polyfills the experience in **IE9-11**.

```html
<svg role="img" title="CodePen"><use xlink:href="spritemap.svg#codepen"></use></svg>
<svg role="img" title="YouTube"><use xlink:href="spritemap.svg#youtube"></use></svg>
<svg role="img" title="Twitter"><use xlink:href="spritemap.svg#twitter"></use></svg>
```

![3 SVG logos](http://i.imgur.com/87Npdzn.png)

Older browsers falls back to PNG images.

```html
<svg role="img" title="CodePen"><img src="spritemap.svg.codepen.png"></svg>
<svg role="img" title="YouTube"><img src="spritemap.svg.youtube.png"></svg>
<svg role="img" title="Twitter"><img src="spritemap.svg.twitter.png"></svg>
```

Fallback PNGs point to the same location as their corresponding SVGs, only with the `#` hash replaced by a `.` dot, and with an appended `.png` extension.

## Readability and accessibility

Within your spritemap, each sprite may use a `<title>` element to identify itself.

```html
<symbol id="codepen"><title>CodePen</title><path etc.../></symbol>
```

When this sprite is used, its title will be read aloud in [JAWS](http://www.freedomscientific.com/products/fs/JAWS-product-page.asp) and [NVDA](http://www.nvaccess.org/). Then, within your document, each sprite may use a `title` attribute to identify itself.

```html
<svg title="CodePen"><use xlink:href="spritemap.svg#codepen"></use></svg>
```

This title will be read aloud in [VoiceOver](http://www.apple.com/accessibility/osx/voiceover/) and [NVDA](http://www.nvaccess.org/). At present, the `title` attribute is the only way to properly read aloud an SVG in VoiceOver.

For maximum compatibility, both the `title` attribute in the document and the `title` element in the SVG should be used.

ARIA roles may be used to provide even more accessibility. `role="presentation"` should be used when a sprite decorates other content.

```html
<a href="//twitter.com/jon_neal"><svg role="presentation"><use xlink:href="sprite.svg#twitter"></svg> Find me on Twitter</a>
```

Alternatively, `role="img"` should be used when a sprite necessitates its own description.

```html
<a href="//twitter.com/jon_neal"><svg title="Find me on Twitter" role="img"><use xlink:href="sprite.svg#twitter"></svg></a>
```

### Futher reading

- [Tips for creating accessible SVG](https://www.sitepoint.com/tips-accessible-svg/)
- [Using ARIA to enhance SVG accessibility](http://blog.paciellogroup.com/2013/12/using-aria-enhance-svg-accessibility/)
- [SVG symbol a good choice for icons](http://css-tricks.com/svg-symbol-good-choice-icons/)
- [Implementing inline SVG Icons](https://kartikprabhu.com/article/inline-svg-icons)

## Smaller SVGs

SVG files, especially exported from various editors, usually contains a lot of redundant and useless information such as editor metadata, comments, hidden elements, default or non-optimal values and other stuff that can be safely removed or converted without affecting SVG rendering result.

Use a tool like [SVGO](https://github.com/svg/svgo) to optimize SVG spritemaps.

```sh
$ [sudo] npm install -g svgo
$ svgo spritemap.svg
```

[external spritemaps]: http://css-tricks.com/svg-sprites-use-better-icon-fonts/##Browser+Support
[SVG-capable browsers]: http://caniuse.com/svg
[SVG for Everybody]: https://github.com/jonathantneal/svg4everybody
[X-UA-Compatible]: http://www.modern.ie/en-us/performance/how-to-use-x-ua-compatible
