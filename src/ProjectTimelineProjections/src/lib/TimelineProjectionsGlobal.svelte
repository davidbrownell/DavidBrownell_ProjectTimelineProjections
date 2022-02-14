<!--
----------------------------------------------------------------------
|
|  TimelineProjectionsGlobal.svelte
|
|  David Brownell <db@DavidBrownell.com>
|      2022-01-04 07:48:31
|
----------------------------------------------------------------------
|
|  Copyright David Brownell 2022-22
|  Distributed under the Boost Software License, Version 1.0. See
|  accompanying file LICENSE_1_0.txt or copy at
|  http://www.boost.org/LICENSE_1_0.txt.
|
----------------------------------------------------------------------

Global content that can only be defined once.
-->

<!--
----------------------------------------------------------------------
|
|  Code
|
----------------------------------------------------------------------
-->
<script lang=ts>
    export let estimated_projection_start_color = "purple";
    export let estimated_projection_stop_color = "#EFAFED";

    export let unestimated_projection_start_color = "black";
    export let unestimated_projection_stop_color = "#EEEEEE";
</script>

<!--
----------------------------------------------------------------------
|
|  Style
|
----------------------------------------------------------------------
-->
<style lang=sass>
    $completed-color: blue
    $active-color: green
    $pending-color: gold
    $estimated-color: gray
    $unestimated-color: lightgray
    $min-velocity-color: green
    $average-velocity-color: blue
    $max-velocity-color: red
    $estimated-projection-color: #BDB76B
    $unestimated-projection-color: #F0E68C

    $velocity-width: 3px
    $velocity-dash-size: 5px

    :global(.points-completed)
        fill: $completed-color
        stroke: $completed-color

    :global(.points-active)
        fill: $active-color
        stroke: $active-color

    :global(.points-pending)
        fill: $pending-color
        stroke: $pending-color

    :global(.points-estimated)
        fill: $estimated-color
        stroke: $estimated-color

    :global(.points-unestimated)
        fill: $unestimated-color
        stroke: $unestimated-color

    :global(.estimated-projection)
        fill: $estimated-projection-color
        stroke: $estimated-projection-color

    :global(.unestimated-projection)
        fill: $unestimated-projection-color
        stroke: $unestimated-projection-color

    :global(.min-velocity)
        fill: none
        stroke: $min-velocity-color
        stroke-dasharray: $velocity-dash-size $velocity-dash-size * 2
        stroke-dashoffset: $velocity-dash-size * 0
        stroke-width: $velocity-width

    :global(.average-velocity)
        fill: none
        stroke: $average-velocity-color
        stroke-dasharray: $velocity-dash-size $velocity-dash-size * 2
        stroke-dashoffset: $velocity-dash-size * 1
        stroke-width: $velocity-width

    :global(.max-velocity)
        fill: none
        stroke: $max-velocity-color
        stroke-dasharray: $velocity-dash-size $velocity-dash-size * 2
        stroke-dashoffset: $velocity-dash-size * 2
        stroke-width: $velocity-width

    :global(.projection-average-date)
        fill: none
        stroke: red
        stroke-dasharray: 3 3
        stroke-width: 2px
        opacity: 0.25

    :global(.sprint-boundary)
        fill: none
        stroke: black
        stroke-width: 1px
        opacity: 0.20

    :global(.extension)
        opacity: 0.5
        stroke-width: $velocity-width - 2
</style>

<!--
----------------------------------------------------------------------
|
|  Elements
|
----------------------------------------------------------------------
-->
<svg
    id=timeline-projections-gradients
    height=0
    width=0
>
    <defs>
        <linearGradient id=estimated-projection x1=0 x2=0 y1=0 y2=1>
            <stop offset=0% stop-color={estimated_projection_start_color} />
            <stop offset=100% stop-color={estimated_projection_stop_color} />
        </linearGradient>

        <linearGradient id=unestimated-projection x1=0 x2=0 y1=0 y2=1>
            <stop offset=0% stop-color={unestimated_projection_start_color} />
            <stop offset=100% stop-color={unestimated_projection_stop_color} />
        </linearGradient>
    </defs>
</svg>
