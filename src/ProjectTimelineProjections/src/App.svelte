<script lang="ts">
    import TimelineProjections from './lib/TimelineProjections.svelte';
    import TimelineProjectionsGlobal from './lib/TimelineProjectionsGlobal.svelte';
    import sample_input from './assets/sample_input.json'
</script>

<main>
  <TimelineProjectionsGlobal />

  <TimelineProjections
    title="One"
    description="With desc"
    events={sample_input}
    any_sprint_boundary={new Date("2022-1-5")}
    debug_mode={false}
  />
  <!--
  <TimelineProjections
    title="Two"
    events={sample_input}
    any_sprint_boundary={new Date(2022, 0, 5)}
    debug_mode={false}
  />-->
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
