<script lang="ts">
    import TimelineProjection from './lib/TimelineProjection.svelte';
    import sample_input from './assets/sample_input.json'
</script>

<main>
  <TimelineProjection
    title="One"
    events={sample_input}
    any_sprint_bounary={new Date("2022-1-5")}
  />
  <!--
    <TimelineProjection
    title="Two"
    events={[]}
    any_sprint_bounary={new Date(2022, 1, 5)}
  />
  -->
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
