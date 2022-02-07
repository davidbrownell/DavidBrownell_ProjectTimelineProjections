<!--
----------------------------------------------------------------------
|
|  TimelineProjections.svelte
|
|  David Brownell <db@DavidBrownell.com>
|      2022-01-10 10:19:57
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

    import {
        Colors,
        default_days_in_sprint,
        default_points_per_unestimated_item,
        default_unestimated_velocity_factors,
        StatsInfo,
        Configuration as ConfigurationType,
    } from './impl/SharedTypes';

    import {
        CreateTimelineEvents,
        NextSprintBoundary,
        TimelineInputEvent,
        TimelineOutputEvent,
    } from './impl/TimelineProjections';

    import Configuration from './impl/Configuration.svelte';
    import DateControl from './impl/DateControl.svelte';
    import Graph from './impl/Graph.svelte';
    import Legend from './impl/Legend.svelte';
    import Settings from './impl/Settings.svelte';
    import Stats from './impl/Stats.svelte';
    import Teams from './impl/Teams.svelte';

    import { onMount } from 'svelte';

    import Fa from 'svelte-fa/src/fa.svelte';
    import {
        faChevronCircleRight,
        faCompress,
        faExpand,

    } from '@fortawesome/free-solid-svg-icons';

    import { Accordion, AccordionItem } from 'svelte-collapsible'

    // ----------------------------------------------------------------------
    // |  Properties
    // ----------------------------------------------------------------------
    export let title: string;
    export let description: string | undefined = undefined;

    export let events: TimelineInputEvent[];
    export let date: Date | undefined = undefined;

    export let any_sprint_boundary: Date;   // Doesn't matter which one we use
    export let days_in_sprint: number = default_days_in_sprint;
    export let points_per_unestimated_item: number = default_points_per_unestimated_item;
    export let use_previous_n_sprints_for_average_velocity: number | undefined = undefined; // When calcualting velocity, limit calculations to the last N sprints; all sprints are used if the value is undefined.
    export let unestimated_velocity_factors: [number, number] = default_unestimated_velocity_factors;
    export let velocity_overrides: StatsInfo<number> | undefined = undefined;

    export let display_point_projections: boolean = true;
    export let display_velocity_extensions: boolean = true;
    export let frame_milliseconds: number = 200;

    export let height: number | string = "700px";
    export let width: number | string = "100%";

    export let debug_mode: boolean = false;

    export let allow_toggle_fullscreen: boolean = true;
    export let allow_date_navigation: boolean = true;

    export let is_fullscreen: boolean = false;

    // ----------------------------------------------------------------------
    // |  State Management
    // ----------------------------------------------------------------------
    let _date: Date = date;

    let _initialized_events: TimelineOutputEvent[];
    let _initialized_min_date: Date;
    let _initialized_max_date: Date;

    let _configuration: ConfigurationType;

    const _debug_colors = new Colors();
    let _debug_borders = debug_mode;

    let _timeline_projections_element: HTMLElement;
    let _content_element: HTMLElement;

    // Measured height and width of the element
    let _is_full_height: boolean = false;
    let _is_full_width: boolean = false;

    let _content_offset_height: number;
    let _content_offset_width: number;

    let _content_width: number;
    let _is_content_info_visible: boolean;

    let _current_event: TimelineOutputEvent;

    const _content_info_width = 100;

    // ----------------------------------------------------------------------
    // ----------------------------------------------------------------------
    // ----------------------------------------------------------------------
    let _init_async;
    let _mounted = false;
    let _is_initialized = false;

    onMount(
        () => {
            // ----------------------------------------------------------------------
            async function InitAsync() {
                date = date || new Date();
                date.setHours(0, 0, 0, 0);

                _date = date;
                _configuration = new ConfigurationType(
                    any_sprint_boundary,
                    days_in_sprint,
                    points_per_unestimated_item,
                    use_previous_n_sprints_for_average_velocity,
                    unestimated_velocity_factors,
                    velocity_overrides,
                );
            }

            // ----------------------------------------------------------------------

            _init_async = InitAsync();
            _mounted = true;
        }
    );

    $: {
        if(_mounted) {
            let these_events = CreateTimelineEvents(
                events,
                _configuration.days_in_sprint,
                _configuration.any_sprint_boundary,
                _configuration.points_per_unestimated_item,
                _configuration.use_previous_n_sprints_for_average_velocity,
            );

            const last_event = these_events[these_events.length - 1];

            these_events.forEach(
                (event) => {
                    event.ProjectDates(
                        NextSprintBoundary(
                            _configuration.any_sprint_boundary,
                            _configuration.days_in_sprint,
                            event.date,
                        ),
                        _configuration.days_in_sprint,
                        _configuration.unestimated_velocity_factors,
                        (_configuration.use_velocity_overrides_for_all_dates || event === last_event) ? _configuration.velocity_overrides : undefined,
                    );
                }
            );

            _initialized_events = these_events;
            _initialized_min_date = these_events[0].date;
            _initialized_max_date = these_events[these_events.length - 1].date;
        }
    }

    $: {
        if(_mounted) {
            if(
                !_is_initialized
                && _timeline_projections_element !== undefined
                && _content_element !== undefined
            ) {
                height = (typeof height === "string" ? height : height + "px");
                width = (typeof width === "string" ? width : width + "px");

                _is_full_height = (height === "100%");
                _is_full_width = (width === "100%");

                _content_offset_height = _content_element.offsetHeight;
                _content_offset_width = _content_element.offsetWidth;

                _is_initialized = true;
            }

            _is_content_info_visible = _content_width > (_content_info_width * 2);
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
    class=timeline-projections
    style={
        (_debug_borders ? _debug_colors.Border() : "") +
        `height: ${_is_initialized ? (is_fullscreen ? "100%" : height) : (typeof height === "string" ? height : height + "px")};` +
        `width: ${_is_initialized ? (is_fullscreen ? "100%" : width) : (typeof width === "string" ? width : width + "px")};`
    }
    bind:this={_timeline_projections_element}
>
    {#if _mounted}
        {#await _init_async then data}
            <!--
            ----------------------------------------------------------------------
            |  Header
            -->
            <div
                class=header
                style={_debug_borders ? _debug_colors.Border() : ""}
            >
                {#if debug_mode}
                    <div class=debug-mode-warning>
                        <h2>*** DEBUG MODE IS ENABLED ***</h2>
                        <div>
                            <lable>
                                <input type=checkbox bind:checked={_debug_borders} />
                                Display Borders
                            </lable>
                        </div>
                        <h2>*******</h2>
                    </div>
                {/if}

                <div
                    class=title
                    style={_debug_borders ? _debug_colors.Border() : ""}
                >
                    {@html title}
                </div>

                {#if description}
                    <div
                        class=description
                        style={_debug_borders ? _debug_colors.Border() : ""}
                    >
                        {@html description}
                    </div>
                {/if}
            </div>

            <!--
            ----------------------------------------------------------------------
            |  Content
            -->
            <div
                class=content
                style={
                    (_debug_borders ? _debug_colors.Border() : "") +
                    // It shouldn't be necessary to explicity set the height and width, but it seems
                    // to be required to ensure that restoring from full screen works as expected.
                    (_is_initialized && !is_fullscreen && !_is_full_height ? `height: ${_content_offset_height}px;` : "") +
                    (_is_initialized && !is_fullscreen && !_is_full_width ? `width: ${_content_offset_width}px;` : "")
                }
                bind:this={_content_element}
                bind:clientWidth={_content_width}
            >
                <!-- Graph -->
                <div
                    class=content-graph
                >
                    <Graph
                        events={_initialized_events}
                        days_in_sprint={days_in_sprint}
                        any_sprint_boundary={any_sprint_boundary}
                        date={_date}
                        display_point_projections={display_point_projections}
                        display_velocity_extensions={display_velocity_extensions}
                        debug_mode={debug_mode}
                        on:display_stats={(event) => { _current_event = event.detail.event; }}
                    />
                </div>

                <!-- Info --->
                {#if _is_content_info_visible}
                    <div
                        class=content-info
                        style={_debug_borders ? _debug_colors.Border() : ""}
                    >
                        <Accordion
                            key={"stats"}
                        >
                            <AccordionItem key=stats>
                                <div slot=header>
                                    <Fa icon={faChevronCircleRight} />
                                    <div class=title>Stats</div>
                                </div>
                                <p slot=body>
                                    <Stats
                                        event={_current_event}
                                        debug_mode={debug_mode}
                                    />
                                </p>
                            </AccordionItem>

                            <AccordionItem key=legend>
                                <div slot=header>
                                    <Fa icon={faChevronCircleRight} />
                                    <div class=title>Legend</div>
                                </div>
                                <p slot=body>
                                    <Legend />
                                </p>
                            </AccordionItem>

                            <AccordionItem key=configuration>
                                <div slot=header>
                                    <Fa icon={faChevronCircleRight} />
                                    <div class=title>Configuration</div>
                                </div>
                                <p slot=body>
                                    <Configuration
                                        config={_configuration}
                                        debug_mode={debug_mode}
                                        on:config_change={
                                            (event) => {
                                                _configuration = event.detail.config;
                                                _initialized_events = _initialized_events;
                                            }
                                        }
                                    />
                                </p>
                            </AccordionItem>

                            <AccordionItem key=settings>
                                <div slot=header>
                                    <Fa icon={faChevronCircleRight} />
                                    <div class=title>Settings</div>
                                </div>
                                <p slot=body>
                                    <Settings
                                        bind:display_point_projections={display_point_projections}
                                        bind:display_velocity_extensions={display_velocity_extensions}
                                        bind:frame_milliseconds={frame_milliseconds}
                                        debug_mode={debug_mode}
                                    />
                                </p>
                            </AccordionItem>

                            <AccordionItem key=teams>
                                <div slot=header>
                                    <Fa icon={faChevronCircleRight} />
                                    <div class=title>Teams</div>
                                </div>
                                <p slot=body>
                                    <Teams
                                        debug_mode={debug_mode}
                                    />
                                </p>
                            </AccordionItem>
                        </Accordion>
                    </div>
                {/if}
            </div>

            <!--
            ----------------------------------------------------------------------
            |  Tools
            -->
            <div
                class=tools
                style={_debug_borders ? _debug_colors.Border() : ""}
            >
                {#if allow_date_navigation}
                    <DateControl
                        date={date}
                        min_date={_initialized_min_date}
                        max_date={_initialized_max_date}
                        play_speed_milliseconds={frame_milliseconds}
                        debug_mode={debug_mode}
                        on:date_change={(event) => { _date = event.detail.date; }}
                    />
                {/if}

                {#if allow_toggle_fullscreen}
                    <div
                        class=fullscreen
                        style={_debug_borders ? _debug_colors.Border() : ""}
                    >
                        <button on:click={ () => { is_fullscreen = !is_fullscreen; }}>
                            <Fa icon={is_fullscreen ? faCompress : faExpand} />
                        </button>
                    </div>
                {/if}
            </div>
        {/await}
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
    @import './impl/Variables.sass'

    $button-padding: 5px
    $button-margin: 3px

    $content-info-indentation: 15px

    :global(.timeline-projections)
        min-height: max($graph-min-height, $content-info-min-height)
        min-width: $graph-min-width + $content-info-min-width

        position: relative

        display: flex
        flex-direction: column

        .header
            flex: 0

            .title
                font-size: 3em
                font-weight: bold

            .description
                padding-left: 1em

        :global(.content)
            flex: 1
            height: 100%
            width: 100%

            display: flex
            flex-direction: row

            .content-graph
                flex: 1
                height: 100%
                width: 100%

                padding-right: 1em

            :global(.content-info)
                flex: 0
                min-width: $content-info-min-width + $content-info-indentation
                max-width: $content-info-min-width + $content-info-indentation

                :global(.accordion)
                    :global(li)
                        padding-bottom: 10px

                        :global(.accordion-item-header)
                            .title
                                display: inline-block
                                font-size: 1.25em

                :global([aria-expanded="true"])
                    :global(.accordion-item-header)
                        :global(svg)
                            transform: rotate(90deg)

        .tools
            flex: 0

            .fullscreen
                position: absolute
                top: 0
                right: 0

                button
                    padding: $button-padding
                    margin: $button-margin

            :global(div.date-navigation)
                position: absolute
                top: 0
                right: 0
                padding-right: calc(1em + 25px)

</style>
