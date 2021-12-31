<script lang="ts">
    import TimelineProjection from './lib/TimelineProjection.svelte';
</script>

<main>
  <TimelineProjection
    events={[1, 2, 3, 4]}
    any_sprint_bounary={new Date(2021, 12, 22)}
  />
  <TimelineProjection
    events={[1, 2]}
    any_sprint_bounary={new Date(2021, 12, 22)}
  />
</main>

<style lang="sass">
  :root
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, 'Open Sans', 'Helvetica Neue', sans-serif

  main
      position: absolute
      left: 0
      top: 0
      right: 0
      bottom: 0

      padding: 10px
      margin: 0px
</style>
