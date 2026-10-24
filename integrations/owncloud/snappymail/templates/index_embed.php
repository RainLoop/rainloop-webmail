<style id="app-boot-css"><?php echo $_['BaseAppBootCss']; ?></style>
<style id="app-theme-style" data-href="<?php echo $_['BaseAppThemeCssLink']; ?>"><?php echo $_['BaseAppThemeCss']; ?></style>
<div id="rl-app" data-admin="<?php echo $_['Admin']; ?>" spellcheck="false">
	<div id="rl-loading">
		<div id="rl-loading-desc"><?php echo $_['LoadingDescriptionEsc']; ?></div>
		<i class="icon-spinner"></i>
	</div>
	<div id="rl-loading-error" hidden="">An error occurred.<br>Please refresh the page and try again.</div>
	<div id="rl-content" hidden="">
		<div id="rl-left"></div>
		<div id="rl-right"></div>
	</div>
	<div id="rl-popups"></div>
	<?php echo $_['BaseTemplates']; ?>
</div>
<?php
echo '
	<script nonce="'.$_['BaseAppBootScriptNonce'].'" type="text/javascript">'.$_['BaseAppBootScript'].$_['BaseLanguage'].'</script>
';
