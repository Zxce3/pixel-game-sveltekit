<script lang="ts">
	import '../app.css';
	let { children } = $props();
	const baseUrl = "https://sve-pixgame.netlify.app";
</script>
<svelte:head>
	<title>Simple Pixel Game - Explore and Conquer</title>
	<meta name="description" content="Play the Simple Pixel Game, a fun and engaging pixel art game where you explore various terrains and overcome challenges.">
	<meta property="og:title" content="Simple Pixel Game - Explore and Conquer">
	<meta property="og:description" content="Play the Simple Pixel Game, a fun and engaging pixel art game where you explore various terrains and overcome challenges.">
	<meta property="og:image" content="{baseUrl}/game-ss.png">
	<meta property="og:url" content="{baseUrl}">
	<meta property="og:type" content="website">
	<meta property="og:site_name" content="Simple Pixel Game">
	<meta name="twitter:card" content="summary_large_image">
	<meta name="twitter:title" content="Simple Pixel Game - Explore and Conquer">
	<meta name="twitter:description" content="Play the Simple Pixel Game, a fun and engaging pixel art game where you explore various terrains and overcome challenges.">
	<meta name="twitter:image" content="{baseUrl}/game-ss.png">
	<script type="application/ld+json">
		{
			"@context": "https://schema.org",
			"@type": "WebSite",
			"name": "Simple Pixel Game",
			"url": "{baseUrl}",
			"image": "{baseUrl}/game-ss.png",
			"description": "Play the Simple Pixel Game, a fun and engaging pixel art game where you explore various terrains and overcome challenges."
		}
	</script>
</svelte:head>
{@render children()}
