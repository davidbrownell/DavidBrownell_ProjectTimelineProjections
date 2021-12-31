<!--
----------------------------------------------------------------------
|
|  TimelineProjection.svelte
|
|  David Brownell <db@DavidBrownell.com>
|      2021-12-30 16:35:14
|
----------------------------------------------------------------------
|
|  Copyright David Brownell 2021
|  Distributed under the Boost Software License, Version 1.0. See
|  accompanying file LICENSE_1_0.txt or copy at
|  http://www.boost.org/LICENSE_1_0.txt.
|
----------------------------------------------------------------------
-->

<script lang="ts">
    //import * as d3 from 'd3';

    import {
        CreateTimelines,
        TimelineInputEvent,
        TimelineOutputEvent
    } from './TimelineProjections.ts';

    /** @type {TimelineInputEvent[]} Input events used to generate timeline projections */
    export let events: TimelineInputEvent[];

    export let height: number = 300;
    export let width: number | undefined = undefined;

    export let any_sprint_bounary: Date;
    export let days_in_sprint: number = 14;
    export let limit_velocity_calculations: number | undefined = undefined;
    export let default_velocities: [number, number] | undefined = undefined;

    /* BugBug
    export let min_date: Date;
    export let max_date: Date;

    export let view_min_date: Date | undefined = undefined;
    export let view_max_date: Date | undefined = undefined;
    export let view_current_date: Date | undefined = undefined;

    export let enable_controls = true;
    */

    let dynamic_height: number;
    let dynamic_width: number;

    let timelines: TimelineOutputEvent[];

    //console.log(`BugBug  ${element}`);

    // Convert input events into timeline events
    $: {
        if(events === undefined)
            timelines = undefined;
        else
            timelines = CreateTimelines(
                events,
                days_in_sprint,
                any_sprint_bounary,
                limit_velocity_calculations,
                default_velocities,
            );

        console.log(`BugBug3333: ${events}`);
    }

</script>

<style lang="sass">
    *
        height: 100%

</style>

<div
    class="parent"
    class:fullscreen="{height === undefined}"
    style="{`${height !== undefined ? `height:${height}px;` : ''}` + `${width !== undefined ? `width:${width}px;` : ''}`}"

>
    <p
    bind:clientHeight={dynamic_height}
    bind:clientWidth={dynamic_width}
    >
        Height: {dynamic_height}
        Width: {dynamic_width}
        Num Events: {events.length}
    </p>
</div>
