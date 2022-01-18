<!--
----------------------------------------------------------------------
|
|  Graph.svelte
|
|  David Brownell <db@DavidBrownell.com>
|      2022-01-09 10:36:12
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
        StatsInfo,
    } from './SharedTypes';

    import {
        CompareDates,
        TimelineOutputEvent,
    } from './TimelineProjections';

    import * as d3 from 'd3';
    import { createEventDispatcher, onMount } from 'svelte';
import { map } from 'd3';

    // ----------------------------------------------------------------------
    // |  Properties
    // ----------------------------------------------------------------------
    export let events: TimelineOutputEvent[] | undefined;
    export let date: Date | undefined;          // Display events that fall before this date
    export let debug_mode: boolean = false;

    // Events:
    //
    //  - display_stats
    //       {event: TimelineOutputEvent}

    // ----------------------------------------------------------------------
    // |  State Management
    // ----------------------------------------------------------------------
    const _unique_id = (Math.random() * 100000).toFixed(0);

    const _debug_colors = new Colors();

    let _svg_element: SVGElement;

    let _is_map_hidden: boolean = false;
    let _events: TimelineOutputEvent[] | undefined = undefined;

    let _highlighted_event: TimelineOutputEvent | undefined = undefined;

    let _content_width: number;
    let _content_height: number;

    // ----------------------------------------------------------------------
    // ----------------------------------------------------------------------
    // ----------------------------------------------------------------------
    let _init_async;
    let _mounted = false;
    let _is_initialized = false;

    let graph: d3.Selection<SVGElement, unknown, null, undefined>;

    onMount(
        () => {
            // ----------------------------------------------------------------------
            async function InitAsync() {
            }

            _init_async = InitAsync();
            _mounted = true;
        }
    );

    const dispatch = createEventDispatcher<
        {
            display_stats: {event:TimelineOutputEvent},
        }
    >();

    // Initiation
    $: {
        if(!_is_initialized) {
            const initialized = (
                _svg_element !== undefined
                && _content_width !== undefined
                && _content_height !== undefined
            );

            if(initialized)
                graph = d3.select(_svg_element);

            _is_initialized = initialized;
        }
    }

    // Initialization
    $: {
        if(_mounted) {
            const is_valid_date_func = (
                () => {
                    if(date === undefined)
                        return (event) => true;

                    return (event) => CompareDates(event.date, date) <= 0;
                }
            )();

            _events = events.filter(is_valid_date_func);

            dispatch("display_stats", { event: _events[_events.length - 1] });
        }
    }

    // Graph size
    const axis_padding = 15;

    let prev_events: TimelineOutputEvent[] | undefined = undefined;
    let prev_content_height: number | undefined = undefined;
    let prev_content_width: number | undefined = undefined;

    let details_content_height: number;
    let map_content_height: number;
    let content_width: number;

    let details_y_velocity_scaler: d3.ScaleLinear<number, number>;
    let details_y_story_points_scaler: d3.ScaleLinear<number, number>;
    let original_details_y_story_points_scaler: d3.ScaleLinear<number, number>;
    let details_x_scaler: d3.ScaleTime<number, number>;
    let original_details_x_scaler: d3.ScaleTime<number, number>;

    let map_x_scaler: d3.ScaleTime<number, number>;
    let map_y_story_points_scaler: d3.ScaleLinear<number, number>;

    let scaled_x_domain: [Date, Date] | undefined = undefined;

    $: {
        if(_is_initialized) {
            const min_map_height = 100;

            const margin_bottom = 30;
            const margin_left = 60;
            const margin_right = 60;
            const margin_top = 10;
            const padding = 35;
            const scalers_scaler = 1.1;

            if(
                prev_events !== events
                || prev_content_height !== _content_height
                || prev_content_width !== _content_width
            ) {
                prev_events = events;
                prev_content_height = _content_height;
                prev_content_width = _content_width;

                _is_map_hidden = (_content_height <= ((min_map_height + margin_top + margin_bottom + padding) * 2));

                map_content_height = _is_map_hidden ? 0 : min_map_height;
                details_content_height = _content_height - map_content_height - margin_top - padding - margin_bottom;
                content_width = _content_width - margin_left - margin_right;

                const min_display_date = events[0].date;
                const max_display_date = d3.max(
                    events,
                    (event) => d3.max(
                        [
                            event.date,
                            event.estimated_dates !== undefined ? event.estimated_dates.max : undefined,
                            event.remaining_dates !== undefined ? event.remaining_dates.max : undefined,
                        ],
                    ),
                );

                // Update the scalers
                details_y_velocity_scaler = d3.scaleLinear()
                    .domain(
                        [
                            0,
                            d3.max(
                                events,
                                (event) => d3.max(
                                    [
                                        event.average_velocities !== undefined ? event.average_velocities.max : undefined,
                                        event.velocity_overrides !== undefined ? event.velocity_overrides.max : undefined,
                                    ],
                                ),
                            ) * scalers_scaler,
                        ]
                    )
                    .range([details_content_height, 0]);

                details_y_story_points_scaler = d3.scaleLinear()
                    .domain([0, d3.max(events, (event) => event.total_points) * scalers_scaler])
                    .range([details_content_height, 0]);

                original_details_y_story_points_scaler = details_y_story_points_scaler.copy();

                details_x_scaler = details_x_scaler = d3.scaleTime()
                    .domain([min_display_date, max_display_date])
                    .range([0, content_width])
                    .nice();

                original_details_x_scaler = details_x_scaler.copy();

                if(!_is_map_hidden) {
                    map_y_story_points_scaler = d3.scaleLinear()
                        .domain(original_details_y_story_points_scaler.domain())
                        .range([map_content_height, 0]);

                    map_x_scaler = original_details_x_scaler.copy();
                }

                if(scaled_x_domain !== undefined) {
                    if(
                        CompareDates(scaled_x_domain[0], map_x_scaler.domain()[1]) > 0
                        || CompareDates(scaled_x_domain[1], map_x_scaler.domain()[1]) > 0
                    ) {
                        scaled_x_domain = undefined;
                    }
                    else
                        details_x_scaler.domain(scaled_x_domain);
                }

                // Update the elements
                const details_graph = graph.select("g.details");
                const map_graph = graph.select("g.map");

                graph
                    .style("height", _content_height)
                    .style("width", _content_width);

                // details
                graph.select(`#clip-path-details-${_unique_id} rect`)
                    .attr("height", details_content_height)
                    .attr("width", content_width);

                details_graph
                    .attr("transform", `translate(${margin_left}, ${margin_top})`)
                    .call(
                        (graph) => {
                            graph.select(".yStoryPointsAxis")
                                .call(
                                    // @ts-ignore
                                    d3.axisLeft(details_y_story_points_scaler)
                                        .tickSize(-content_width)
                                        .tickPadding(axis_padding)
                                );
                        }
                    )
                    .call(
                        (graph) => {
                            graph.select(".yVelocityAxis")
                                .attr("transform", `translate(${content_width}, 0)`)
                                .call(
                                    // @ts-ignore
                                    d3.axisRight(details_y_velocity_scaler)
                                );
                        }
                    )
                    .call(
                        (graph) => {
                            graph.select(".xAxis")
                                .attr("transform", `translate(0, ${details_content_height})`)
                                .call(
                                    // @ts-ignore
                                    d3.axisBottom(details_x_scaler)
                                        .tickSize(-details_content_height)
                                        .tickPadding(axis_padding)
                                );
                        }
                    );

                graph.selectAll("text.yStoryPointsAxisLabel")
                    .data([undefined])
                    .join(
                        // @ts-ignore
                        (enter: any) => {
                            enter
                                .append("text")
                                    .attr("class", "yStoryPointsAxisLabel")
                                    .attr("transform", "rotate(-90)")
                                    .attr("y", 0)
                                    .attr("x", 0 - (details_content_height / 2))
                                    .attr("dy", "1em")
                                    .style("text-anchor", "middle")
                                    .text("Story Points");
                        },
                        (update: any) => {
                            update
                                .attr("x", 0 - (details_content_height / 2))
                                .transition();
                        },
                        (exit: any) => {
                            exit
                                .transition()
                                .style("opacity", 0)
                                .remove();
                        },
                    );

                // graph
                //     .selectAll("text.yVelocityAxisLabel")
                //     .data([undefined])
                //     .join(
                //         // @ts-ignore
                //         (enter: any) => {
                //             enter
                //                 .append("text")
                //                     .attr("class", "yVelocityAxisLabel")
                //                     .attr("transform", "rotate(-90)")
                //                     .attr("y", working_width) 0 - working_width)
                //                     .attr("x", -(details_working_height / 2))
                //                     //.attr("dy", "1em")
                //                     .style("text-anchor", "middle")
                //                     .text("Velocities");
                //         },
                //         (update: any) => {
                //             update
                //                 .attr("x", 0 - (details_working_height / 2))
                //                 .transition();
                //         },
                //         (exit: any) => {
                //             exit
                //                 .transition()
                //                 .style("opacity", 0)
                //                 .remove();
                //         },
                //     );

                if(!_is_map_hidden) {
                    graph.select(`#clip-path-map-${_unique_id} rect`)
                        .attr("height", map_content_height)
                        .attr("width", content_width);

                    map_graph
                        .attr("transform", `translate(${margin_left}, ${margin_top + details_content_height + padding})`)
                        .call(
                            (graph) => {
                                graph.select(".yStoryPointsAxis")
                                    .call(
                                        // @ts-ignore
                                        d3.axisLeft(map_y_story_points_scaler)
                                            .tickSize(-content_width)
                                            .tickPadding(axis_padding)
                                    );
                            }
                        )
                        .call(
                            (graph) => {
                                graph.select(".xAxis")
                                    .attr("transform", `translate(0, ${map_content_height})`)
                                    .call(
                                        // @ts-ignore
                                        d3.axisBottom(map_x_scaler)
                                            .tickSize(-map_content_height)
                                            .tickPadding(axis_padding)
                                    );
                            }
                        );

                    // Take any scaled dates into account
                    if(scaled_x_domain !== undefined) {
                        const first = map_x_scaler(scaled_x_domain[0]);
                        const second = map_x_scaler(scaled_x_domain[1]);

                        map_graph.select(".brush .selection")
                            .attr("x", first)
                            .attr("width", second - first);
                    }
                    else
                        map_graph.select(".brush .selection")
                            .attr("width", 0);
                }
            }
        }
    }

    // Display content
    const fill_groups = {
        "points-completed": "total_points_completed",
        "points-active": "total_points_active",
        "points-pending": "total_points_pending",
        "points-estimated": "total_points_estimated",
        "points-unestimated": "total_points_unestimated",
    };

    const stacked_data_factory = d3.stack()
        .keys(Object.keys(fill_groups))
        .value((event, key) => event[fill_groups[key]]);

    $: {
        if(_is_initialized) {
            for(
                let graph_info of [
                    {
                        cls: "details",
                        x_scaler: details_x_scaler,
                        y_story_points_scaler: details_y_story_points_scaler,
                        y_velocity_scaler: details_y_velocity_scaler,
                    },
                    {
                        cls: "map",
                        x_scaler: map_x_scaler,
                        y_story_points_scaler: map_y_story_points_scaler,
                        y_velocity_scaler: undefined,
                    },
                ]
            ) {
                const this_graph = graph.select(`g.${graph_info.cls}`);

                // Stacked
                const area_calc = d3.area()
                    .x((event: any) => graph_info.x_scaler(event.data.date))
                    .y0((event: any) => graph_info.y_story_points_scaler(event[0]))
                    .y1((event: any) => graph_info.y_story_points_scaler(event[1]));

                this_graph
                    .selectAll("path.stacked")
                    // @ts-ignore
                    .data(stacked_data_factory(_events))
                    .join(
                        // @ts-ignore
                        (enter: any) => {
                            enter.append("path")
                                .attr("class", (event: any, key: number) => `stacked ${Object.keys(fill_groups)[key]}`)
                                .attr("clip-path", `url(#clip-path-${graph_info.cls}-${_unique_id})`)
                                .attr("d", area_calc);
                        },
                        (update: any) => {
                            update
                                .transition()
                                .attr("d", area_calc);
                        },
                        (exit: any) => {
                            exit
                                .transition()
                                .style("opacity", 0)
                                .remove();
                        }
                    );

                // Various lines
                for(
                    let data of [
                        // Accents
                        {
                            cls: "points-completed",
                            category: "accent",
                            y_func: (event) => event.total_points_completed,
                            defined_func: (event) => event.total_points_completed !== 0,
                            scaler: graph_info.y_story_points_scaler,
                        },
                        {
                            cls: "points-active",
                            category: "accent",
                            y_func: (event) => event.total_points_completed + event.total_points_active,
                            defined_func: (event) => event.total_points_active !== 0,
                            scaler: graph_info.y_story_points_scaler,
                        },
                        {
                            cls: "points-pending",
                            category: "accent",
                            y_func: (event) => event.total_points_completed + event.total_points_active + event.total_points_pending,
                            defined_func: (event) => event.total_points_pending !== 0,
                            scaler: graph_info.y_story_points_scaler,
                        },
                        {
                            cls: "points-estimated",
                            category: "accent",
                            y_func: (event) => event.total_points_completed + event.total_points_active + event.total_points_pending + event.total_points_estimated,
                            defined_func: (event) => event.total_points_estimated !== 0,
                            scaler: graph_info.y_story_points_scaler,
                        },
                        {
                            cls: "points-unestimated",
                            category: "accent",
                            y_func: (event) => event.total_points_completed + event.total_points_active + event.total_points_pending + event.total_points_estimated + event.total_points_unestimated,
                            defined_func: (event) => event.total_points_unestimated !== 0,
                            scaler: graph_info.y_story_points_scaler,
                        },

                        // Velocities
                        {
                            cls: "min-velocity",
                            category: "velocity",
                            y_func: (event) => (event.velocity_overrides || event.average_velocities).min,
                            defined_func: (event) => event.velocity_overrides || event.average_velocities,
                            scaler: graph_info.y_velocity_scaler,
                        },
                        {
                            cls: "average-velocity",
                            category: "velocity",
                            y_func: (event) => (event.velocity_overrides || event.average_velocities).average,
                            defined_func: (event) => event.velocity_overrides || event.average_velocities,
                            scaler: graph_info.y_velocity_scaler,
                        },
                        {
                            cls: "max-velocity",
                            category: "velocity",
                            y_func: (event) => (event.velocity_overrides || event.average_velocities).max,
                            defined_func: (event) => event.velocity_overrides || event.average_velocities,
                            scaler: graph_info.y_velocity_scaler,
                        },
                    ]
                ) {
                    if(data.scaler === undefined)
                        continue;

                    const calc = d3.line()
                        .x((event: any) => graph_info.x_scaler(event.date))
                        .y((event: any) => data.scaler(data.y_func(event)))
                        .defined((event: any) => data.defined_func(event));

                    this_graph
                        .selectAll(`path.${data.cls}.${data.category}`)
                        .data([_events])
                        .join(
                            // @ts-ignore
                            (enter: any) => {
                                enter.append("path")
                                    .attr("class", `${data.cls} ${data.category}`)
                                    .attr("clip-path", `url(#clip-path-${graph_info.cls}-${_unique_id}`)
                                    .attr("d", calc);
                            },
                            (update: any) => {
                                update
                                    .transition()
                                    .attr("d", calc);
                            },
                            (exit: any) => {
                                exit
                                    .transition()
                                    .style("opacity", 0)
                                    .remove();
                            },
                        );
                }
            }

            // Projections

            // ----------------------------------------------------------------------
            function DisplayProjection(
                is_background: boolean,
                this_date: Date,
                cls: string,
                dates: StatsInfo<Date> | undefined,
                starting_points: number,
                ending_points: number,
            ) {
                for(
                    let graph_info of [
                        {
                            cls: "details",
                            x_scaler: details_x_scaler,
                            y_scaler: details_y_story_points_scaler,
                        },
                        {
                            cls: "map",
                            x_scaler: map_x_scaler,
                            y_scaler: map_y_story_points_scaler,
                        },
                    ]
                ) {
                    if(is_background && graph_info.cls === "map")
                        continue;

                    const this_graph = graph.select(`g.${graph_info.cls}`);

                    // Projection
                    let projection_commands: string[];

                    if(dates !== undefined) {
                        projection_commands = [
                            `M ${graph_info.x_scaler(this_date)} ${graph_info.y_scaler(ending_points)}`,
                            `L ${graph_info.x_scaler(dates.max)} ${graph_info.y_scaler(0)}`,
                            `L ${graph_info.x_scaler(dates.min)} ${graph_info.y_scaler(0)}`,
                            `L ${graph_info.x_scaler(this_date)} ${graph_info.y_scaler(starting_points)}`,
                            `L ${graph_info.x_scaler(this_date)} ${graph_info.y_scaler(ending_points)}`,
                            "Z",
                        ];
                    }
                    else {
                        projection_commands = [
                            `M ${graph_info.x_scaler(this_date)} ${graph_info.y_scaler(starting_points)}`,
                            `L ${graph_info.x_scaler(this_date)} ${graph_info.y_scaler(starting_points)}`
                        ];
                    }

                    const projection_commands_str = projection_commands.join(" ");

                    this_graph
                        .selectAll(`path.projection.${cls}${is_background ? ".background" : ""}`)
                        .data([projection_commands_str])
                        .join(
                            // @ts-ignore
                            (enter: any) => {
                                enter
                                    .append("path")
                                        .attr("class", `projection ${cls} ${is_background ? "background" : ""}`)
                                        .attr("clip-path", `url(#clip-path-${graph_info.cls}-${_unique_id}`)
                                        .attr("d", projection_commands_str);
                            },
                            (update: any) => {
                                update
                                    .transition()
                                    .attr("d", projection_commands_str);
                            },
                            (exit: any) => {
                                exit
                                    .transition()
                                    .style("opacity", 0)
                                    .remove();
                            },
                        );

                    if(graph_info.cls !== "details")
                        continue;

                    // Accent lines
                    for(
                        let accent_info of [
                            {
                                cls: "projection-average-date",
                                start: [
                                    graph_info.x_scaler(this_date),
                                    (graph_info.y_scaler(starting_points) + graph_info.y_scaler(ending_points)) / 2,
                                ],
                                end: [
                                    graph_info.x_scaler(dates ? dates.average : 0),
                                    graph_info.y_scaler(0),
                                ],
                            },
                            {
                                cls: "projection-highlight-min",
                                start: [
                                    graph_info.x_scaler(this_date),
                                    graph_info.y_scaler(starting_points),
                                ],
                                end: [
                                    graph_info.x_scaler(dates ? dates.min : 0),
                                    graph_info.y_scaler(0),
                                ],
                            },
                            {
                                cls: "projection-highlight-max",
                                start: [
                                    graph_info.x_scaler(this_date),
                                    graph_info.y_scaler(ending_points),
                                ],
                                end: [
                                    graph_info.x_scaler(dates ? dates.max : 0),
                                    graph_info.y_scaler(0),
                                ],
                            },
                        ]
                    ) {
                        let commands: string[];

                        if(starting_points !== ending_points) {
                            commands = [
                                `M ${accent_info.start[0]} ${accent_info.start[1]}`,
                                `L ${accent_info.end[0]} ${accent_info.end[1]}`,
                            ];
                        }
                        else {
                            commands = [
                                `M ${graph_info.x_scaler(this_date)} ${graph_info.y_scaler(starting_points)}`,
                                `L ${graph_info.x_scaler(this_date)} ${graph_info.y_scaler(ending_points)}`,
                            ];
                        }

                        const commands_str = commands.join(" ");

                        this_graph
                            .selectAll(`path.accent.${accent_info.cls}.${cls}${is_background ? ".background" : ""}`)
                                .data([commands_str])
                                .join(
                                    // @ts-ignore
                                    (enter: any) => {
                                        enter
                                            .append("path")
                                                .attr("class", `accent ${accent_info.cls} ${cls} ${is_background ? "background" : ""}`)
                                                .attr("clip-path", `url(#clip-path-${graph_info.cls}-${_unique_id}`)
                                                .attr("d", commands_str);
                                    },
                                    (update: any) => {
                                        update
                                            .transition()
                                            .attr("d", commands_str);
                                    },
                                    (exit: any) => {
                                        exit
                                            .transition()
                                            .style("opacity", 0)
                                            .remove();
                                    },
                                );
                    }
                }
            }

            // ----------------------------------------------------------------------
            function DisplayVelocityExtensions(
                is_background: boolean,
                this_date: Date,
                velocities: StatsInfo<number> | undefined
            ) {
                const this_graph = graph.select("g.details");

                // Velocity extensions
                for(
                    let extension_info of [
                        {
                            cls: "min-velocity",
                            y_value: velocities ? velocities.min : undefined,
                        },
                        {
                            cls: "average-velocity",
                            y_value: velocities ? velocities.average : undefined,
                        },
                        {
                            cls: "max-velocity",
                            y_value: velocities ? velocities.max : undefined,
                        },
                    ]
                ) {
                    const y_pos = details_y_velocity_scaler(extension_info.y_value || 0);

                    const calc = d3.line()
                        // @ts-ignore
                        .x(details_x_scaler)
                        .y(y_pos);

                    this_graph
                        .selectAll(`path.extension.${extension_info.cls}${is_background ? ".background" : ""}`)
                        .data(
                            [
                                [this_date, details_x_scaler.domain()[1]]
                            ]
                        )
                        .join(
                            // @ts-ignore
                            (enter: any) => {
                                enter.append("path")
                                    .attr("class", `extension ${extension_info.cls} ${is_background ? "background" : ""}`)
                                    .attr("clip-path", `url(#clip-path-details-${_unique_id}`)
                                    .attr("d", calc);
                            },
                            (update: any) => {
                                update
                                    .transition()
                                    .attr("d", calc);
                            },
                            (exit: any) => {
                                exit
                                    .transition()
                                    .style("opacity", 0)
                                    .remove();
                            },
                        );
                }
            }

            // ----------------------------------------------------------------------

            const this_event = _events[_events.length - 1];
            const is_background = _highlighted_event !== undefined;

            DisplayProjection(
                is_background,
                this_event.date,
                "estimated-projection",
                this_event.estimated_dates,
                this_event.total_points_completed + this_event.total_points_active + this_event.total_points_pending,
                this_event.total_points_completed + this_event.total_points_active + this_event.total_points_pending + this_event.total_points_estimated,
            );

            DisplayProjection(
                is_background,
                this_event.date,
                "unestimated-projection",
                this_event.remaining_dates,
                this_event.total_points_completed + this_event.total_points_active + this_event.total_points_pending + this_event.total_points_estimated,
                this_event.total_points_completed + this_event.total_points_active + this_event.total_points_pending + this_event.total_points_estimated + this_event.total_points_unestimated,
            );

            DisplayVelocityExtensions(
                is_background,
                this_event.date,
                this_event.velocity_overrides || this_event.average_velocities,
            );

            if(_highlighted_event !== undefined) {
                DisplayProjection(
                    false,
                    _highlighted_event.date,
                    "estimated-projection",
                    _highlighted_event.estimated_dates,
                    _highlighted_event.total_points_completed + _highlighted_event.total_points_active + _highlighted_event.total_points_pending,
                    _highlighted_event.total_points_completed + _highlighted_event.total_points_active + _highlighted_event.total_points_pending + _highlighted_event.total_points_estimated,
                );

                DisplayProjection(
                    false,
                    _highlighted_event.date,
                    "unestimated-projection",
                    _highlighted_event.remaining_dates,
                    _highlighted_event.total_points_completed + _highlighted_event.total_points_active + _highlighted_event.total_points_pending + _highlighted_event.total_points_estimated,
                    _highlighted_event.total_points_completed + _highlighted_event.total_points_active + _highlighted_event.total_points_pending + _highlighted_event.total_points_estimated + _highlighted_event.total_points_unestimated,
                );

                DisplayVelocityExtensions(
                    false,
                    _highlighted_event.date,
                    _highlighted_event.velocity_overrides || _highlighted_event.average_velocities,
                );
            }
        }
    }

    // Add the events
    // ----------------------------------------------------------------------
    function OnZoom(event: any) {
        if(event.type !== "zoom")
            return;

        const rescaled = event.transform.rescaleY(original_details_y_story_points_scaler);

        if(rescaled.domain()[0] >= 0) {
            details_y_story_points_scaler = rescaled;
        }
        else {
            details_y_story_points_scaler = original_details_y_story_points_scaler.copy();
            details_y_story_points_scaler.domain([0, rescaled.domain()[1] - rescaled.domain()[0]]);
        }

        const this_graph = graph.select(".details");

        this_graph.select(".yStoryPointsAxis")
            .call(
                // @ts-ignore
                d3.axisLeft(details_y_story_points_scaler)
                    .tickSize(-content_width)
                    .tickPadding(axis_padding)
            );
    }

    // ----------------------------------------------------------------------
    function OnMouse(event: any) {
        console.log(`BugBug: OnMouse`);
    }

    // ----------------------------------------------------------------------
    function OnBrush(event: any) {
        if(event.type !== "end")
            return;

        if(!event.selection) {
            scaled_x_domain = undefined;

            details_x_scaler = original_details_x_scaler;
        }
        else {
            scaled_x_domain = [
                map_x_scaler.invert(event.selection[0]),
                map_x_scaler.invert(event.selection[1]),
            ];

            details_x_scaler = original_details_x_scaler.copy();
            details_x_scaler.domain(scaled_x_domain);
        }

        const this_graph = graph.select(".details");

        this_graph.select(".xAxis")
            .call(
                // @ts-ignore
                d3.axisBottom(details_x_scaler)
                    .tickSize(-details_content_height)
                    .tickPadding(axis_padding)
            );
    }

    // ----------------------------------------------------------------------

    // Note that the content must fall after the graph is drawn, as these maps must
    // be on the top so that they can respond to the necessary events.
    $: {
        if(_is_initialized) {
            // Zoom for details
            graph.select(".details")
                .selectAll("rect.mouse-and-zoom")
                .data([undefined])
                .join(
                    // @ts-ignore
                    (enter: any) => {
                        enter
                            .append("rect")
                                .attr("class", "mouse-and-zoom")
                                .attr("width", content_width)
                                .attr("height", details_content_height)
                                .attr("cursor", "move")
                                .style("fill", "none")
                                .style("pointer-events", "all")
                                .call(d3.zoom().on("zoom", OnZoom))
                                .on("mouseover mousemove mouseout", OnMouse);
                    },
                    (update: any) => {
                        update
                            .attr("width", content_width)
                            .attr("height", details_content_height);
                    },
                    (exit: any) => {
                        exit.remove();
                    },
                );

            // Brush for map
            graph.select(".map")
                .selectAll("g.brush")
                .data([undefined])
                .join(
                    // @ts-ignore
                    (enter: any) => {
                        enter
                            .append("g")
                                .attr("class", "brush")
                                .call(
                                    d3.brushX()
                                        .extent([
                                            [0, 0],
                                            [content_width, map_content_height],
                                        ])
                                        .on("brush end", OnBrush)
                                )
                                .selectAll("rect")
                                    .attr("width", content_width)
                                    .attr("height", map_content_height);
                    },
                    (update: any) => {
                        update
                            .call(
                                d3.brushX()
                                    .extent([
                                        [0, 0],
                                        [content_width, map_content_height],
                                    ])
                                    .on("brush end", OnBrush)
                            )
                            .selectAll("rect")
                                .attr("width", content_width)
                                .attr("height", map_content_height);
                    },
                    (exit: any) => {
                        exit.remove();
                    },
                );
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
{#if _mounted}
    {#await _init_async then data}
        <div
            class=graph
            style={debug_mode ? _debug_colors.Border() : ""}
            bind:clientHeight={_content_height}
            bind:clientWidth={_content_width}
        >
            <svg
                bind:this={_svg_element}
            >
                <defs>
                    {#each [
                        "details",
                        "map",
                    ] as type}
                        <clipPath id={`clip-path-${type}-${_unique_id}`}>
                            <rect />
                        </clipPath>
                    {/each}
                </defs>

                <g class=details>
                    <g class=xAxis />
                    <g class=yStoryPointsAxis />
                    <g class=yVelocityAxis />
                </g>

                {#if !_is_map_hidden}
                    <g class=map>
                        <g class=xAxis />
                        <g class=yStoryPointsAxis />
                    </g>
                {/if}
            </svg>
        </div>
    {/await}
{/if}

<!--
----------------------------------------------------------------------
|
|  Style
|
----------------------------------------------------------------------
-->
<style lang=sass>
    .graph
        @import './Variables.sass'

        height: 100%
        width: 100%

        min-height: $graph-min-height
        min-width: $graph-min-width

        svg
            :global(g.xAxis .tick line),
            :global(g.yStoryPointsAxis .tick line)
                stroke-opacity: 0.25
                stroke-dasharray: 2 2

            :global(.details)
                :global(.stacked)
                    opacity: .5

                :global(path.accent)
                    fill: none
                    stroke-width: 1px

                :global(.projection)
                    opacity: .5
                    stroke-width: 1px
</style>
