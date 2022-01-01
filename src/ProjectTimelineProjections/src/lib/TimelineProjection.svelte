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
    import * as d3 from 'd3';
import { schemeDark2 } from 'd3';

    import {
        CreateTimelineEvents,
        TimelineInputEvent,
        TimelineOutputEvent
    } from './TimelineProjections.ts';

    export let title: string;

    export let events: TimelineInputEvent[];

    export let any_sprint_bounary: Date;    // Doesn't matter which one we use
    export let days_in_sprint: number = 14;

    export let limit_velocity_calculations: number | undefined = undefined;     // When calcualting velocity, limit calculations to the last N sprints; all sprints are used if the value is undefined.
    export let default_velocities: [number, number] | undefined = undefined;

    export let height: number | string | undefined = undefined;
    export let width: number | string | undefined = undefined;

    export let allow_toggle_fullscreen = true;
    export let allow_overrides = true;

    export let view_min_date: Date | undefined = undefined;
    export let view_max_date: Date | undefined = undefined;

    /* BugBug
    export let view_min_date: Date | undefined = undefined;
    export let view_max_date: Date | undefined = undefined;
    export let view_current_date: Date | undefined = undefined;

    export let enable_controls = true;
    */

    let _is_fullscreen: boolean = false;
    let _is_map_hidden: boolean = false;

    let _dynamic_height: number;
    let _dynamic_width: number;

    let _timeline_events: TimelineOutputEvent[];

    let _default_velocity_min: number = undefined;
    let _default_velocity_max: number = undefined;

    // ----------------------------------------------------------------------
    function _DefaultVelocitiesInError(): boolean {
        if(_default_velocity_min === undefined && _default_velocity_max === undefined)
            return false;

        if(_default_velocity_min === undefined || _default_velocity_max === undefined)
            return true;

        return _default_velocity_min <= _default_velocity_max;
    }

    // ----------------------------------------------------------------------

    if(height === undefined) {
        height = "400px";
        _is_fullscreen = true;
    }
    else if(typeof height === "number")
        height = `${height}px`;

    if(width === undefined)
        width = "100%";

    // Convert input events into timeline events
    if(events === undefined)
        _timeline_events = [];
    else {
        try {
            _timeline_events = CreateTimelineEvents(
                events,
                days_in_sprint,
                any_sprint_bounary,
                limit_velocity_calculations,
                default_velocities,
            );
        }
        catch (ex) {
            ex.message = `${title}: ${ex.message}`;
            throw ex;
        }
    }

    export const min_date = _timeline_events.length !== 0 ? _timeline_events[0].date : undefined;
    export const max_date = _timeline_events.length !== 0 ? _timeline_events[_timeline_events.length - 1].date : undefined;

    if(view_min_date === undefined)
        view_min_date = min_date;
    if(view_max_date === undefined)
        view_max_date = max_date;

    // Default Velocities
    $: {
        if(!_DefaultVelocitiesInError() && _default_velocity_min !== undefined && _default_velocity_max !== undefined)
            default_velocities = [_default_velocity_min, _default_velocity_max];
    }

    // Timeline Projections
    const today = new Date();

    today.setHours(0, 0, 0, 0);

    $: {
        const get_velocity_overrides_func = (date) => {
            if(default_velocities === undefined)
                return undefined;

            if(date < today)
                return undefined;

            return [
                (default_velocities[0] + default_velocities[1]) / 2,
                default_velocities[0],
                default_velocities[1],
            ];
        };

        _timeline_events.forEach(
            (event) => {
                const velocity_overrides = get_velocity_overrides_func(event.date);

                let result: [Date, Date, Date] | undefined;
                let average_d: Date | undefined;
                let min_d: Date | undefined;
                let max_d: Date | undefined;

                // Pending
                result = event.ProjectPendingDates(any_sprint_bounary, days_in_sprint, velocity_overrides);

                if(result === undefined) {
                    average_d = undefined;
                    min_d = undefined;
                    max_d = undefined;
                }
                else {
                    average_d = result[0];
                    min_d = result[1];
                    max_d = result[2];
                }

                event.pending_average_date = average_d;
                event.pending_min_date = min_d;
                event.pending_max_date = max_d;

                // Unestimated
                result = event.ProjectUnestimatedDates(any_sprint_bounary, days_in_sprint, velocity_overrides);

                if(result === undefined) {
                    average_d = undefined;
                    min_d = undefined;
                    max_d = undefined;
                }
                else {
                    average_d = result[0];
                    min_d = result[1];
                    max_d = result[2];
                }

                event.unestimated_average_date = average_d;
                event.unestimated_min_date = min_d;
                event.unestimated_max_date = max_d;
            }
        );
    }

    // The Graph
    let _svg_element: SVGElement;

    type Dimensions = Record<string, number>;

    const map_size = 100;
    const axis_size = 15;
    const margins: Dimensions = {
        top: 10,
        right: 20,
        bottom: 30,
        left: 60
    };

    $: {
        // Calculate the new dimentions
        const map_graph_height = (
            () => {
                if(_dynamic_height <= 2 * map_size) {
                    _is_map_hidden = true;
                    return 0;
                }

                _is_map_hidden = false;
                return map_size;
            }
        )();
        const details_graph_height = _dynamic_height - map_graph_height;

        const details_margins: Dimensions = {
            top: margins.top,
            right: margins.right,
            bottom: map_graph_height + margins.bottom,
            left: margins.left,
        };
        const map_margins: Dimensions = {
            top: margins.top + details_graph_height,
            right: margins.right,
            bottom: margins.bottom,
            left: margins.left,
        };

        const details_dimensions: Dimensions = {
            height: _dynamic_height -  details_margins.top - details_margins.bottom,
            width: _dynamic_width - details_margins.left - details_margins.right,
        };

        const map_dimensions: Dimensions = {
            height: _dynamic_height - map_margins.top - map_margins.bottom,
            width: _dynamic_width - map_margins.left - map_margins.right,
        };

        // Scalers
        let details_x_scaler: d3.ScaleTime<number, number>;
        let details_y_scaler: d3.ScaleLinear<number, number>;

        let map_x_scaler: d3.ScaleTime<number, number>;
        let map_y_scaler: d3.ScaleLinear<number, number>;

        details_x_scaler = d3.scaleTime()
            .domain([min_date, max_date])
            .range([0, details_dimensions.width])
            .nice();

        details_y_scaler = d3.scaleLinear()
            .domain([0, d3.max(_timeline_events, (event) => event.total_points)])
            .range([details_dimensions.height, 0])
            .nice();

        map_x_scaler = d3.scaleTime()
            .domain(details_x_scaler.domain())
            .range([0, map_dimensions.width])
            .nice();

        map_y_scaler = d3.scaleLinear()
            .domain(details_y_scaler.domain())
            .range([map_dimensions.height, 0])
            .nice();

        // D3 Graph
        const graph = d3.select(_svg_element);

        for(
            let graph_info of [
                {
                    name: "details",
                    margins: details_margins,
                    dimensions: details_dimensions,
                    x_scaler: details_x_scaler,
                    y_scaler: details_y_scaler,
                },
                {
                    name: "map",
                    margins: map_margins,
                    dimensions: map_dimensions,
                    x_scaler: map_x_scaler,
                    y_scaler: map_y_scaler,
                },
            ]
        ) {
            graph
                .select(`g.${graph_info.name}`)
                    .attr("transform", `translate(${graph_info.margins.left}, ${graph_info.margins.top})`)
                    .call(
                        (child_graph) => {
                            child_graph
                                .select(".xAxis")
                                    .attr("transform", `translate(0, ${graph_info.dimensions.height})`)
                                    .call(
                                        // @ts-ignore
                                        d3.axisBottom(graph_info.x_scaler)
                                            .tickSize(-graph_info.dimensions.height)
                                            .tickPadding(axis_size)
                                    )
                                ;

                            child_graph
                                .select(".yAxis")
                                    .call(
                                        // @ts-ignore
                                        d3.axisLeft(graph_info.y_scaler)
                                            .tickSize(-graph_info.dimensions.width)
                                            .tickPadding(axis_size)
                                    )
                                ;
                        }
                    )
                ;
        }
    }
</script>

<div
    class="parent"
    class:fullscreen="{_is_fullscreen}"
    style="width:${width};{`${!_is_fullscreen ? `height:${height};` : ''}`}"
>
    <div class="header">{title}</div>

    <div class="content">
        <div
            class="graph"
            bind:clientHeight={_dynamic_height}
            bind:clientWidth={_dynamic_width}
        >
            <svg
                class="timeline-projection"
                bind:this={_svg_element}
            >
                <defs>
                    <clipPath>
                        <rect>
                            <height>{_dynamic_height}</height>
                            <width>{_dynamic_width}</width>
                        </rect>
                    </clipPath>
                </defs>

                <g class="details">
                    <g class="xAxis"></g>
                    <g class="yAxis"></g>
                </g>

                <g
                    class="map"
                    class:hidden={_is_map_hidden}
                >
                    <g class="xAxis"></g>
                    <g class="yAxis"></g>
                </g>
            </svg>
        </div>
        <div class="info">Info (BugBug)</div>
    </div>

    <div class="tools">
        {#if allow_toggle_fullscreen && !_is_map_hidden}
            <button on:click={() => { _is_fullscreen = !_is_fullscreen; }}>
                {#if _is_fullscreen}
                    Exit Fullscreen ({title})
                {:else}
                    Enter Fullscreen ({title})
                {/if}
            </button>
        {/if}

        {#if allow_overrides}
            <div
                class="overrides"
                class:error="{_DefaultVelocitiesInError()}"
            >
                <label class="velocity_calculations">
                    Limit velocity calculations:
                    <input type=number value={limit_velocity_calculations} min=1>
                </label>

                <!-- BugBug:
                    - Not updating
                    - Not showing error decoration
                -->
                <label class="default_velocities">
                    Default velocities:
                    <input type=number value={_default_velocity_min} min=1>
                    <input type=number value={_default_velocity_max} min=1>
                </label>
            </div>
        {/if}
    </div>
</div>

<style lang="sass">
    .error
        background-color: red

    .parent
        border: 1px solid green // BugBug

        display: flex
        flex-flow: column

        *
            width: 100%
            height: 100%

        .header
            height: fit-content
            width: 100%

            color: white
            background: linear-gradient(147deg, rgba(2,0,36,1) 0%, rgba(9,9,121,1) 7%, rgba(0,212,255,1) 100%)

            font-size: 1.5em

            margin: 0
            padding: 10px

        .content
            display: flex
            flex-flow: row

            border: 1px solid red // BugBug

            &>.graph
                height: 100%
                width: 100%

                flex: 4

                svg
                    padding: 0
                    margin: 0

                    //height: 100%
                    //width: 100%

                    &.timeline-projection
                        :global(g.xAxis .tick line),
                        :global(g.yAxis .tick line)
                            stroke-opacity: 0.25
                            stroke-dasharray: 2 2

                        .details
                            color: blue // BugBug

                        .map.hidden
                            display: none

            &>.info
                flex: 1
                background-color: green // BugBug

        .tools
            height: fit-content
            width: fit-content

            *
                height: fit-content
                width: fit-content

    .fullscreen
        height: 100%

</style>
