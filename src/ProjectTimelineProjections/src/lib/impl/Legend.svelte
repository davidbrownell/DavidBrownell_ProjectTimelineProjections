<!--
----------------------------------------------------------------------
|
|  Legend.svelte
|
|  David Brownell <db@DavidBrownell.com>
|      2022-01-13 17:43:57
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

    // ----------------------------------------------------------------------
    // |  Properties
    // ----------------------------------------------------------------------
    export let debug_mode: boolean = false;

    // ----------------------------------------------------------------------
    // |  State Management
    // ----------------------------------------------------------------------
    const _debug_colors = new Colors();

    // ----------------------------------------------------------------------
    // ----------------------------------------------------------------------
    // ----------------------------------------------------------------------
    const _legend_item_size_num = 20;
</script>

<!--
----------------------------------------------------------------------
|
|  Elements
|
----------------------------------------------------------------------
-->
<div
    class=legend
    style={debug_mode ? _debug_colors.Border() : ""}
>
    <div class=cols>
        {#each [
            {cls: "points-completed", label: "Completed:"},
            {cls: "points-active", label: "Active:"},
            {cls: "points-pending", label: "Pending:"},
            {cls: "points-estimated", label: "Estimated:"},
            {cls: "points-unestimated", label: "Unestimated:"},
            {cls: "estimated-projection", label: "Estimated Projection:"},
            {cls: "unestimated-projection", label: "Remaining Projection:"},
        ] as item }
            <div class=label>{item.label}</div>
            <svg class={item.cls} width={_legend_item_size_num} height={_legend_item_size_num}>
                <rect width={_legend_item_size_num} height={_legend_item_size_num} />
            </svg>
        {/each}

        {#each [
            {cls: "projection-average-date", label: "Average Date:"},
            {cls: "average-velocity", label: "Average Velocity:"},
            {cls: "min-velocity", label: "Min Velocity:"},
            {cls: "max-velocity", label: "Max Velocity:"},
        ] as item }
            <div class=label>{item.label}</div>
            <svg class={item.cls} width={_legend_item_size_num} height={_legend_item_size_num}>
                <line x1=0 y1={_legend_item_size_num / 2} x2={_legend_item_size_num} y2={_legend_item_size_num / 2} />
            </svg>
        {/each}

        {#each [
            {cls: "sprint-boundary", label: "Sprint Boundary:"},
        ] as item }
            <div class=label>{item.label}</div>
            <svg class={item.cls} width={_legend_item_size_num} height={_legend_item_size_num}>
                <line x1={_legend_item_size_num / 2} y1=0 x2={_legend_item_size_num / 2} y2={_legend_item_size_num} />
            </svg>
        {/each}
    </div>
</div>

<!--
----------------------------------------------------------------------
|
|  Style
|
----------------------------------------------------------------------
-->
<style lang=sass>
    .legend
        @import './Variables.sass'

        @include content-info-mixin

        .cols
            @include content-info-grid-mixin(116px 25px 116px 25px)

            svg rect
                opacity: 0.8

            .min-velocity
                stroke-dashoffset: 0

            .average-velocity
                stroke-dashoffset: 0

            .max-velocity
                stroke-dashoffset: 0
</style>
