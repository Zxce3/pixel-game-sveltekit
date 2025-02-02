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
<footer class="text-center p-4 bg-gray-100 border-t border-gray-300">
	<p>
		<a href="https://github.com/Zxce3/pixel-game-sveltekit" target="_blank" rel="noopener noreferrer" class="text-blue-500 hover:underline font-bold">
			View on GitHub
		</a>
	</p>
	<p class="text-sm text-gray-600">
		&copy; {new Date().getFullYear()} Simple Pixel Game. All rights reserved.
	</p>
</footer>
