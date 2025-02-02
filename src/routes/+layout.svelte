<script lang="ts">
	import '../app.css';
	let { children } = $props();
</script>
<svelte:head>
	<title>Simple Pixel Game</title>
</svelte:head>
{@render children()}
