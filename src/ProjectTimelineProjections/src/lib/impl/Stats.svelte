<!--
----------------------------------------------------------------------
|
|  Stats.svelte
|
|  David Brownell <db@DavidBrownell.com>
|      2022-01-09 00:06:38
|
----------------------------------------------------------------------
|
|  Copyright David Brownell 2022-22
|  Distributed under the Boost Software License, Version 1.0. See
|  accompanying file LICENSE_1_0.txt or copy at
|  http://www.boost.org/LICENSE_1_0.txt.
|
----------------------------------------------------------------------
-->

<!--
----------------------------------------------------------------------
|
|  Code
|
----------------------------------------------------------------------
-->
<script lang=ts>
    import { Colors } from './SharedTypes';

    import type {
        TimelineOutputEvent,
    } from './TimelineProjections';

    // ----------------------------------------------------------------------
    // |  Properties
    // ----------------------------------------------------------------------
    export let event: TimelineOutputEvent;
    export let debug_mode: boolean = false;

    // ----------------------------------------------------------------------
    // |  State Management
    // ----------------------------------------------------------------------
    const _debug_colors = new Colors();

    let _initialized = false;

    // ----------------------------------------------------------------------
    // ----------------------------------------------------------------------
    // ----------------------------------------------------------------------
    function _ToDateString(date: Date | undefined): string {
        if(date === undefined)
            return "";

        return date.toISOString().split('T')[0];
    }

    // ----------------------------------------------------------------------

    // Initiation
    $: {
        if(!_initialized) {
            const initialized = event !== undefined;

            _initialized = initialized;
        }
    }
</script>

<!--
----------------------------------------------------------------------
|
|  Elements
|
----------------------------------------------------------------------
-->
<div
    class=stats
    style={debug_mode ? _debug_colors.Border() : ""}
>
    {#if _initialized}
        {#each [
            {
                cls: "misc",
                label: "",
                items: [
                    {cls: "date", label: "Date:", value: _ToDateString(event.date)},
                    {cls: "unestimated_items", label: "Unestimated Items:", value: event.total_num_unestimated_items},
                ],
            },
            {
                cls: "points",
                label: "Story Points",
                items: [
                    {cls: "total", label: "Total:", value: event.total_points},
                    {cls: "completed", label: "Completed:", value: event.total_points_completed},
                    {cls: "active", label: "Active:", value: event.total_points_active},
                    {cls: "pending", label: "Pending:", value: event.total_points_pending},
                    {cls: "estimated", label: "Estimated:", value: event.total_points_estimated},
                    {cls: "unestimated", label: "Unestimated:", value: event.total_points_unestimated},
                ],
            },
            {
                cls: "velocities",
                label: "Calculated Velocities",
                items: [
                    {cls: "min", label: "Min:", value: event.average_velocities !== undefined ? event.average_velocities.min || "" : ""},
                    {cls: "average", label: "Avg:", value: event.average_velocities !== undefined ? event.average_velocities.average || "" : ""},
                    {cls: "max", label: "Max:", value: event.average_velocities !== undefined ? event.average_velocities.max || "" : ""},
                ],
            },
            {
                cls: "estimated",
                label: "Date Projections for Estimated Points",
                items: [
                    {cls: "min", label: "Min:", value: event.estimated_dates ? _ToDateString(event.estimated_dates.min) : ""},
                    {cls: "average", label: "Avg:", value: event.estimated_dates ? _ToDateString(event.estimated_dates.average) : ""},
                    {cls: "max", label: "Max:", value: event.estimated_dates ? _ToDateString(event.estimated_dates.max) : ""},
                ],
            },
            {
                cls: "unestimated",
                label: "Date Projections for Remaining Points",
                items: [
                    {cls: "min", label: "Min:", value: event.remaining_dates ? _ToDateString(event.remaining_dates.min) : ""},
                    {cls: "average", label: "Avg:", value: event.remaining_dates ? _ToDateString(event.remaining_dates.average) : ""},
                    {cls: "max", label: "Max:", value: event.remaining_dates ? _ToDateString(event.remaining_dates.max) : ""},
                ],
            },
        ] as item}
            <div class={item.cls}>
                <div class=section-header>{item.label}</div>

                <div class=cols>
                    {#each item.items as item}
                        <div class="label">{item.label}</div>
                        <input disabled type=text class="value" value={item.value} />
                    {/each}
                </div>
            </div>
        {/each}
    {/if}
</div>

<!--
----------------------------------------------------------------------
|
|  Style
|
----------------------------------------------------------------------
-->
<style lang=sass>
    .stats
        @import './Variables.sass'

        @include content-info-mixin

        .section-header
            font-weight: bold
            margin-bottom: 4px
            margin-top: 4px
            white-space: nowrap

        &>div:not(.header)
            .section-header
                grid-column: 1 / span 4

            .cols
                @include content-info-grid-mixin(66px 75px 66px 75px)

                input
                    text-align: center
                    font-size: $content-info-font-size
</style>
